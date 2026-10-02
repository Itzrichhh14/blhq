// ============================================================
// BLOODLINE — Player Service
// All player profile reads, updates, and comparisons.
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import { getRankProgress } from "@/src/services/rankService";
import type {
  UpdatePlayerSchema,
} from "@/src/schemas";
import type { z } from "zod";
import type { PlayerComparisonResult } from "@/src/types";
import { MapType } from "@prisma/client";

// ============================================================
// Select shapes — keep consistent across all player queries
// ============================================================
export const PLAYER_PUBLIC_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  bio: true,
  region: true,
  tier: true,
  rating: true,
  peakRating: true,
  wins: true,
  losses: true,
  totalMatches: true,
  currentStreak: true,
  longestStreak: true,
  tournamentWins: true,
  mvpCount: true,
  mainMap: true,
  specialty: true,
  status: true,
  joinDate: true,
  team: {
    select: { id: true, name: true, slug: true, color: true },
  },
} as const;

// ============================================================
// Helpers
// ============================================================
function winRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100 * 10) / 10; // 1dp
}

// ============================================================
// getPlayerById
// ============================================================
export async function getPlayerById(id: string) {
  const player = await prisma.player.findUnique({
    where: { id },
    select: PLAYER_PUBLIC_SELECT,
  });
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  return {
    ...player,
    winRate: winRate(player.wins, player.totalMatches),
    rankProgress: getRankProgress(player.tier, player.rating),
  };
}

// ============================================================
// getPlayerByUsername
// ============================================================
export async function getPlayerByUsername(username: string) {
  const player = await prisma.player.findUnique({
    where: { username },
    select: PLAYER_PUBLIC_SELECT,
  });
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  return {
    ...player,
    winRate: winRate(player.wins, player.totalMatches),
    rankProgress: getRankProgress(player.tier, player.rating),
  };
}

// ============================================================
// getPlayerByUserId (for /api/me routes)
// ============================================================
export async function getPlayerByUserId(userId: string) {
  const player = await prisma.player.findUnique({
    where: { userId },
    select: PLAYER_PUBLIC_SELECT,
  });
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  return {
    ...player,
    winRate: winRate(player.wins, player.totalMatches),
    rankProgress: getRankProgress(player.tier, player.rating),
  };
}

// ============================================================
// listPlayers — paginated
// ============================================================
export async function listPlayers(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
  region?: string;
  tier?: string;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.search
      ? {
          OR: [
            { username: { contains: opts.search, mode: "insensitive" as const } },
            { displayName: { contains: opts.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(opts.region ? { region: opts.region as any } : {}),
    ...(opts.tier ? { tier: opts.tier as any } : {}),
    status: "ACTIVE" as const,
  };

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where,
      select: PLAYER_PUBLIC_SELECT,
      skip,
      take: pageSize,
      orderBy: { rating: "desc" },
    }),
    prisma.player.count({ where }),
  ]);

  return {
    items: players.map((p) => ({
      ...p,
      winRate: winRate(p.wins, p.totalMatches),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ============================================================
// updatePlayer
// ============================================================
export async function updatePlayer(
  playerId: string,
  data: z.infer<typeof UpdatePlayerSchema>
) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: {
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.avatar !== undefined && { avatar: data.avatar }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.region !== undefined && { region: data.region }),
      ...(data.mainMap !== undefined && { mainMap: data.mainMap }),
      ...(data.specialty !== undefined && { specialty: data.specialty }),
    },
    select: PLAYER_PUBLIC_SELECT,
  });

  return {
    ...updated,
    winRate: winRate(updated.wins, updated.totalMatches),
    rankProgress: getRankProgress(updated.tier, updated.rating),
  };
}

// ============================================================
// getPlayerMapStats
// ============================================================
export async function getPlayerMapStats(playerId: string) {
  const stats = await prisma.playerMapStats.findMany({
    where: { playerId },
    include: { map: true },
  });

  return stats.map((s) => ({
    mapType: s.map.type,
    mapName: s.map.name,
    matches: s.matches,
    wins: s.wins,
    losses: s.losses,
    winRate: winRate(s.wins, s.matches),
    rating: s.rating,
    bestStreak: s.bestStreak,
  }));
}

// ============================================================
// getPlayerMatchHistory — paginated
// ============================================================
export async function getPlayerMatchHistory(
  playerId: string,
  opts: {
    page?: number;
    pageSize?: number;
    mapType?: MapType;
    result?: "WIN" | "LOSS";
    seasonId?: string;
  }
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where = {
    participants: { some: { playerId } },
    status: "COMPLETED" as const,
    ...(opts.mapType
      ? { map: { type: opts.mapType } }
      : {}),
    ...(opts.result
      ? {
          ...(opts.result === "WIN"
            ? { winnerPlayerId: playerId }
            : { loserPlayerId: playerId }),
        }
      : {}),
    ...(opts.seasonId ? { seasonId: opts.seasonId } : {}),
  };

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: {
        map: true,
        participants: {
          include: {
            player: {
              select: { id: true, username: true, displayName: true, avatar: true },
            },
          },
        },
        season: { select: { id: true, name: true } },
      },
      skip,
      take: pageSize,
      orderBy: { completedAt: "desc" },
    }),
    prisma.match.count({ where }),
  ]);

  const formatted = matches.map((m) => {
    const me = m.participants.find((p) => p.playerId === playerId);
    const opponent = m.participants.find((p) => p.playerId !== playerId);
    return {
      id: m.id,
      mapType: m.map?.type ?? null,
      mapName: m.map?.name ?? null,
      format: m.format,
      result: m.winnerPlayerId === playerId ? "WIN" : "LOSS",
      myScore: me?.score ?? null,
      opponentScore: opponent?.score ?? null,
      ratingDelta: me?.ratingDelta ?? null,
      ratingAfter: me?.ratingAfter ?? null,
      opponent: opponent?.player ?? null,
      season: m.season,
      completedAt: m.completedAt,
      scheduledAt: m.scheduledAt,
    };
  });

  return {
    items: formatted,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ============================================================
// comparePlayers — head-to-head
// ============================================================
export async function comparePlayers(
  playerIdA: string,
  playerIdB: string
): Promise<PlayerComparisonResult> {
  const [a, b] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerIdA },
      include: {
        playerMapStats: { include: { map: true } },
        achievements: true,
        team: { select: { name: true } },
      },
    }),
    prisma.player.findUnique({
      where: { id: playerIdB },
      include: {
        playerMapStats: { include: { map: true } },
        achievements: true,
        team: { select: { name: true } },
      },
    }),
  ]);

  if (!a) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player A not found", 404);
  if (!b) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player B not found", 404);

  // Head-to-head matches
  const h2hMatches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      AND: [
        { participants: { some: { playerId: playerIdA } } },
        { participants: { some: { playerId: playerIdB } } },
      ],
    },
    select: { id: true, winnerPlayerId: true },
  });

  const h2hAWins = h2hMatches.filter((m) => m.winnerPlayerId === playerIdA).length;
  const h2hBWins = h2hMatches.filter((m) => m.winnerPlayerId === playerIdB).length;

  function buildSide(p: NonNullable<typeof a>) {
    return {
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      avatar: p.avatar,
      tier: p.tier,
      rating: p.rating,
      peakRating: p.peakRating,
      wins: p.wins,
      losses: p.losses,
      winRate: winRate(p.wins, p.totalMatches),
      currentStreak: p.currentStreak,
      longestStreak: p.longestStreak,
      tournamentWins: p.tournamentWins,
      mvpCount: p.mvpCount,
      mapStats: p.playerMapStats.map((s) => ({
        mapType: s.map.type,
        wins: s.wins,
        losses: s.losses,
        winRate: winRate(s.wins, s.matches),
        rating: s.rating,
      })),
      achievementCount: p.achievements.length,
    };
  }

  return {
    playerA: buildSide(a),
    playerB: buildSide(b),
    headToHead: {
      matchesPlayed: h2hMatches.length,
      playerAWins: h2hAWins,
      playerBWins: h2hBWins,
    },
  };
}

// ============================================================
// getRatingHistory
// ============================================================
export async function getPlayerRatingHistory(
  playerId: string,
  limit = 50
) {
  return prisma.ratingHistory.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      rating: true,
      delta: true,
      reason: true,
      matchId: true,
      createdAt: true,
    },
  });
}

// ============================================================
// getPlayerAchievements
// ============================================================
export async function getPlayerAchievements(playerId: string) {
  const all = await prisma.achievement.findMany({
    where: { active: true },
    include: {
      players: {
        where: { playerId },
        select: { unlockedAt: true },
      },
    },
  });

  return all.map((a) => ({
    id: a.id,
    key: a.key,
    name: a.name,
    description: a.description,
    rarity: a.rarity,
    iconKey: a.iconKey,
    unlocked: a.players.length > 0,
    unlockedAt: a.players[0]?.unlockedAt ?? null,
  }));
}
