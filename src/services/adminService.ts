// ============================================================
// BLOODLINE — Admin Service
// All privileged operations that mutate core data.
// Every function here requires the caller to have verified
// permissions BEFORE calling (done in the API route layer).
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import { UserStatus, UserRole, AuditAction, RankTier } from "@prisma/client";
import { computeTierFromRating } from "@/src/services/rankService";

// ============================================================
// Audit log helper
// ============================================================
async function audit(
  performedById: string,
  action: AuditAction,
  opts: {
    targetUserId?: string;
    targetEntityId?: string;
    targetType?: string;
    before?: unknown;
    after?: unknown;
    note?: string;
  }
) {
  await prisma.auditLog.create({
    data: {
      action,
      performedById,
      targetUserId: opts.targetUserId,
      targetEntityId: opts.targetEntityId,
      targetType: opts.targetType,
      before: opts.before as any,
      after: opts.after as any,
      note: opts.note,
    },
  });
}

// ============================================================
// USER MANAGEMENT
// ============================================================

export async function banUser(
  targetUserId: string,
  adminUserId: string,
  reason: string
) {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND, "User not found", 404);

  const before = { status: user.status };
  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.BANNED },
    }),
    prisma.player.updateMany({
      where: { userId: targetUserId },
      data: { status: UserStatus.BANNED },
    }),
  ]);

  await audit(adminUserId, AuditAction.PLAYER_BAN, {
    targetUserId,
    before,
    after: { status: UserStatus.BANNED },
    note: reason,
  });
}

export async function unbanUser(targetUserId: string, adminUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND, "User not found", 404);

  const before = { status: user.status };
  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.ACTIVE },
    }),
    prisma.player.updateMany({
      where: { userId: targetUserId },
      data: { status: UserStatus.ACTIVE },
    }),
  ]);

  await audit(adminUserId, AuditAction.PLAYER_UNBAN, {
    targetUserId,
    before,
    after: { status: UserStatus.ACTIVE },
  });
}

export async function changeUserRole(
  targetUserId: string,
  adminUserId: string,
  newRole: UserRole,
  note?: string
) {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND, "User not found", 404);

  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  await audit(adminUserId, AuditAction.USER_ROLE_CHANGE, {
    targetUserId,
    before: { role: user.role },
    after: { role: newRole },
    note,
  });
}

// ============================================================
// RANK / RATING MANAGEMENT
// ============================================================

export async function adminSetRank(
  playerId: string,
  adminUserId: string,
  newTier: RankTier,
  reason: string
) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  await prisma.$transaction([
    prisma.player.update({ where: { id: playerId }, data: { tier: newTier } }),
    prisma.rankHistory.create({
      data: {
        playerId,
        fromTier: player.tier,
        toTier: newTier,
        reason: `Admin override by ${adminUserId}: ${reason}`,
      },
    }),
  ]);

  await audit(adminUserId, AuditAction.RANK_CHANGE, {
    targetEntityId: playerId,
    targetType: "Player",
    before: { tier: player.tier },
    after: { tier: newTier },
    note: reason,
  });
}

export async function adminSetRating(
  playerId: string,
  adminUserId: string,
  newRating: number,
  reason: string
) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  const newTier = computeTierFromRating(newRating);
  const delta = newRating - player.rating;

  await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: {
        rating: newRating,
        peakRating: Math.max(player.peakRating, newRating),
        tier: newTier,
      },
    }),
    prisma.ratingHistory.create({
      data: {
        playerId,
        rating: newRating,
        delta,
        reason: `MANUAL_ADJUSTMENT: ${reason}`,
      },
    }),
  ]);

  await audit(adminUserId, AuditAction.MANUAL_RATING_CHANGE, {
    targetEntityId: playerId,
    targetType: "Player",
    before: { rating: player.rating, tier: player.tier },
    after: { rating: newRating, tier: newTier },
    note: reason,
  });
}

// ============================================================
// KAGE SYSTEM
// ============================================================

export async function appointKage(
  playerId: string,
  adminUserId: string,
  opts: { specialty?: string; quote?: string }
) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { user: { select: { id: true } } },
  });
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  // Demote current Kage
  await prisma.kage.updateMany({
    where: { isCurrent: true },
    data: { isCurrent: false, endDate: new Date() },
  });

  const kage = await prisma.kage.create({
    data: {
      playerId,
      userId: player.user.id,
      isCurrent: true,
      appointedBy: adminUserId,
      specialty: opts.specialty,
      quote: opts.quote,
    },
  });

  await audit(adminUserId, AuditAction.KAGE_ASSIGNMENT, {
    targetEntityId: playerId,
    targetType: "Player",
    after: { playerId, specialty: opts.specialty },
  });

  return kage;
}

export async function getCurrentKage() {
  return prisma.kage.findFirst({
    where: { isCurrent: true },
    include: {
      player: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          tier: true,
          rating: true,
          wins: true,
          losses: true,
          tournamentWins: true,
        },
      },
    },
  });
}

export async function getKageHistory() {
  return prisma.kage.findMany({
    include: {
      player: {
        select: { id: true, username: true, displayName: true, avatar: true },
      },
    },
    orderBy: { startDate: "desc" },
  });
}

// ============================================================
// MATCH CORRECTIONS
// ============================================================

export async function adminCancelMatch(
  matchId: string,
  adminUserId: string,
  reason: string
) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new AppError(ErrorCode.MATCH_NOT_FOUND, "Match not found", 404);

  const before = { status: match.status };
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "CANCELLED", notes: reason },
  });

  await audit(adminUserId, AuditAction.MATCH_CORRECTION, {
    targetEntityId: matchId,
    targetType: "Match",
    before,
    after: { status: "CANCELLED" },
    note: reason,
  });
}

// ============================================================
// AUDIT LOG QUERIES
// ============================================================

export async function getAuditLogs(opts: {
  page?: number;
  pageSize?: number;
  action?: AuditAction;
  performedById?: string;
  targetUserId?: string;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, opts.pageSize ?? 50);
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.action ? { action: opts.action } : {}),
    ...(opts.performedById ? { performedById: opts.performedById } : {}),
    ...(opts.targetUserId ? { targetUserId: opts.targetUserId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        performedBy: { select: { id: true, username: true, role: true } },
        targetUser: { select: { id: true, username: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ============================================================
// ADMIN STATS OVERVIEW
// ============================================================

export async function getAdminStats() {
  const [
    totalUsers,
    totalPlayers,
    activePlayers,
    bannedUsers,
    totalMatches,
    completedMatches,
    liveTournaments,
    pendingApplications,
    activeSeason,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.player.count(),
    prisma.player.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "BANNED" } }),
    prisma.match.count(),
    prisma.match.count({ where: { status: "COMPLETED" } }),
    prisma.tournament.count({ where: { status: "LIVE" } }),
    prisma.application.count({ where: { status: "PENDING" } }),
    prisma.season.findFirst({ where: { status: "ACTIVE" } }),
  ]);

  return {
    users: { total: totalUsers, players: totalPlayers, active: activePlayers, banned: bannedUsers },
    matches: { total: totalMatches, completed: completedMatches },
    tournaments: { live: liveTournaments },
    applications: { pending: pendingApplications },
    activeSeason: activeSeason ? { id: activeSeason.id, name: activeSeason.name } : null,
  };
}

// ============================================================
// NEWS / ARTICLES (admin creates / publishes)
// ============================================================

export async function createNewsArticle(
  data: {
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    category: string;
    coverImage?: string;
    publishedAt?: string;
  },
  authorUserId: string
) {
  const existing = await prisma.news.findUnique({ where: { slug: data.slug } });
  if (existing)
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Slug already in use", 409);

  return prisma.news.create({
    data: {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      category: data.category as any,
      coverImage: data.coverImage,
      authorId: authorUserId,
      status: data.publishedAt ? "PUBLISHED" : "DRAFT",
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    },
  });
}

export async function publishNewsArticle(slug: string) {
  return prisma.news.update({
    where: { slug },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}

export async function listNewsArticles(opts: {
  status?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, opts.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.status ? { status: opts.status as any } : { status: "PUBLISHED" as any }),
    ...(opts.category ? { category: opts.category as any } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.news.findMany({
      where,
      include: {
        author: { select: { id: true, username: true } },
      },
      skip,
      take: pageSize,
      orderBy: { publishedAt: "desc" },
    }),
    prisma.news.count({ where }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getNewsArticleBySlug(slug: string) {
  const article = await prisma.news.findUnique({
    where: { slug },
    include: { author: { select: { id: true, username: true } } },
  });
  if (!article || article.status !== "PUBLISHED")
    throw new AppError(ErrorCode.NOT_FOUND, "Article not found", 404);
  return article;
}
