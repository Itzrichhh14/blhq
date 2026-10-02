// ============================================================
// BLOODLINE — Match Service
//
// Complete flow for a finalized match:
//   1. Validate participants & state
//   2. Calculate new ratings (ratingService)
//   3. Update winner & loser stats in a transaction:
//      - player ratings, wins/losses, streak, peak
//      - per-map stats
//      - season stats
//      - rating history rows
//      - match participants (ratingBefore/After/Delta)
//      - match status → COMPLETED
//   4. Evaluate tier changes (rankService)
//   5. Evaluate achievements (achievementService)
//   6. Emit notifications (notificationService)
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import { MatchStatus, MapType, NotificationType, RankMovement } from "@prisma/client";
import { calculateMatchRatings, updateStreak, updateLongestStreak } from "@/src/services/ratingService";
import { evaluateTierChange, computeTierFromRating } from "@/src/services/rankService";
import { evaluateAndUnlock } from "@/src/services/achievementService";
import { createNotification, createNotificationBulk } from "@/src/services/notificationService";
import type { z } from "zod";
import type { CreateMatchSchema, CompleteMatchSchema } from "@/src/schemas";

// ============================================================
// createMatch
// ============================================================
export async function createMatch(
  data: z.infer<typeof CreateMatchSchema>
) {
  const { player1Id, player2Id, mapType, format, scheduledAt, seasonId } = data;

  if (player1Id === player2Id) {
    throw new AppError(ErrorCode.INVALID_MATCH_RESULT, "A player cannot match against themselves", 400);
  }

  // Validate both players exist and are active
  const [p1, p2] = await Promise.all([
    prisma.player.findUnique({ where: { id: player1Id }, select: { id: true, status: true } }),
    prisma.player.findUnique({ where: { id: player2Id }, select: { id: true, status: true } }),
  ]);

  if (!p1) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player 1 not found", 404);
  if (!p2) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player 2 not found", 404);
  if (p1.status !== "ACTIVE") throw new AppError(ErrorCode.PLAYER_SUSPENDED, "Player 1 is not active", 400);
  if (p2.status !== "ACTIVE") throw new AppError(ErrorCode.PLAYER_SUSPENDED, "Player 2 is not active", 400);

  // Resolve map
  let mapId: string | undefined;
  if (mapType) {
    const map = await prisma.gameMap.findUnique({ where: { type: mapType } });
    if (!map) throw new AppError(ErrorCode.NOT_FOUND, `Map ${mapType} not found`, 404);
    mapId = map.id;
  }

  const match = await prisma.match.create({
    data: {
      mapId,
      format,
      status: MatchStatus.SCHEDULED,
      seasonId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      participants: {
        create: [{ playerId: player1Id }, { playerId: player2Id }],
      },
    },
    include: {
      map: true,
      participants: {
        include: {
          player: { select: { id: true, username: true, displayName: true } },
        },
      },
    },
  });

  return match;
}

// ============================================================
// completeMatch — the core transaction
// ============================================================
export async function completeMatch(
  matchId: string,
  data: z.infer<typeof CompleteMatchSchema>
) {
  const { winnerId, loserId, scoreWinner, scoreLoser, mvpPlayerId, notes } = data;

  if (winnerId === loserId) {
    throw new AppError(ErrorCode.INVALID_MATCH_RESULT, "Winner and loser cannot be the same player", 400);
  }

  // Load match with full context
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      map: true,
      participants: { include: { player: true } },
      season: true,
    },
  });

  if (!match) throw new AppError(ErrorCode.MATCH_NOT_FOUND, "Match not found", 404);
  if (match.status === MatchStatus.COMPLETED) {
    throw new AppError(ErrorCode.MATCH_ALREADY_COMPLETED, "Match is already completed", 409);
  }
  if (match.status === MatchStatus.CANCELLED) {
    throw new AppError(ErrorCode.MATCH_NOT_COMPLETABLE, "Cannot complete a cancelled match", 400);
  }

  // Validate participants
  const participantIds = match.participants.map((p) => p.playerId);
  if (!participantIds.includes(winnerId)) {
    throw new AppError(ErrorCode.INVALID_MATCH_RESULT, "Winner is not a participant in this match", 400);
  }
  if (!participantIds.includes(loserId)) {
    throw new AppError(ErrorCode.INVALID_MATCH_RESULT, "Loser is not a participant in this match", 400);
  }

  const winner = match.participants.find((p) => p.playerId === winnerId)!.player;
  const loser = match.participants.find((p) => p.playerId === loserId)!.player;

  // ── Rating calculation ────────────────────────────────────
  const ratings = calculateMatchRatings(
    winner.rating,
    loser.rating,
    match.format,
    winner.totalMatches,
    loser.totalMatches,
    winner.tier,
    loser.tier
  );

  const newWinnerRating = ratings.winnerNewRating;
  const newLoserRating = ratings.loserNewRating;

  // ── Streak calculations ───────────────────────────────────
  const winnerNewStreak = updateStreak(winner.currentStreak, true);
  const loserNewStreak = updateStreak(loser.currentStreak, false);
  const winnerNewLongest = updateLongestStreak(winner.longestStreak, winnerNewStreak);
  const loserNewLongest = updateLongestStreak(loser.longestStreak, Math.abs(loserNewStreak));

  // ── Tier evaluations ──────────────────────────────────────
  const winnerTierChange = evaluateTierChange(winner.tier, newWinnerRating);
  const loserTierChange = evaluateTierChange(loser.tier, newLoserRating);

  // ── Transaction ───────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. Update match record
    await tx.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.COMPLETED,
        winnerPlayerId: winnerId,
        loserPlayerId: loserId,
        mvpPlayerId: mvpPlayerId ?? null,
        scoreWinner: scoreWinner ?? null,
        scoreLoser: scoreLoser ?? null,
        notes: notes ?? null,
        completedAt: now,
      },
    });

    // 2. Update match participants
    await tx.matchParticipant.update({
      where: { matchId_playerId: { matchId, playerId: winnerId } },
      data: {
        isWinner: true,
        score: scoreWinner ?? null,
        ratingBefore: winner.rating,
        ratingAfter: newWinnerRating,
        ratingDelta: ratings.winnerDelta,
      },
    });
    await tx.matchParticipant.update({
      where: { matchId_playerId: { matchId, playerId: loserId } },
      data: {
        isWinner: false,
        score: scoreLoser ?? null,
        ratingBefore: loser.rating,
        ratingAfter: newLoserRating,
        ratingDelta: ratings.loserDelta,
      },
    });

    // 3. Update winner player stats
    await tx.player.update({
      where: { id: winnerId },
      data: {
        rating: newWinnerRating,
        peakRating: Math.max(winner.peakRating, newWinnerRating),
        wins: { increment: 1 },
        totalMatches: { increment: 1 },
        currentStreak: winnerNewStreak,
        longestStreak: winnerNewLongest,
        ...(mvpPlayerId === winnerId ? { mvpCount: { increment: 1 } } : {}),
        ...(winnerTierChange.changed ? { tier: winnerTierChange.toTier } : {}),
      },
    });

    // 4. Update loser player stats
    await tx.player.update({
      where: { id: loserId },
      data: {
        rating: newLoserRating,
        losses: { increment: 1 },
        totalMatches: { increment: 1 },
        currentStreak: loserNewStreak,
        longestStreak: loserNewLongest,
        ...(mvpPlayerId === loserId ? { mvpCount: { increment: 1 } } : {}),
        ...(loserTierChange.changed ? { tier: loserTierChange.toTier } : {}),
      },
    });

    // 5. Rating history rows
    await tx.ratingHistory.createMany({
      data: [
        {
          playerId: winnerId,
          rating: newWinnerRating,
          delta: ratings.winnerDelta,
          reason: "MATCH_WIN",
          matchId,
        },
        {
          playerId: loserId,
          rating: newLoserRating,
          delta: ratings.loserDelta,
          reason: "MATCH_LOSS",
          matchId,
        },
      ],
    });

    // 6. Rank history rows (if tier changed)
    if (winnerTierChange.changed) {
      await tx.rankHistory.create({
        data: {
          playerId: winnerId,
          fromTier: winnerTierChange.fromTier,
          toTier: winnerTierChange.toTier,
          reason: `Match ${matchId} — ${winnerTierChange.promoted ? "promoted" : "demoted"}`,
        },
      });
    }
    if (loserTierChange.changed) {
      await tx.rankHistory.create({
        data: {
          playerId: loserId,
          fromTier: loserTierChange.fromTier,
          toTier: loserTierChange.toTier,
          reason: `Match ${matchId} — ${loserTierChange.promoted ? "promoted" : "demoted"}`,
        },
      });
    }

    // 7. Per-map stats (upsert)
    if (match.mapId) {
      await upsertMapStats(tx, winnerId, match.mapId, true);
      await upsertMapStats(tx, loserId, match.mapId, false);
    }

    // 8. Season stats (upsert)
    if (match.seasonId) {
      await upsertSeasonStats(tx, winnerId, match.seasonId, true, mvpPlayerId);
      await upsertSeasonStats(tx, loserId, match.seasonId, false, mvpPlayerId);
    }
  });

  // ── Post-transaction: achievements + notifications ────────
  // These run outside the transaction to avoid extending its lock time.
  // Partial failure here is acceptable and won't roll back the match result.

  const [winnerUnlocked, loserUnlocked] = await Promise.all([
    evaluateAndUnlock(winnerId),
    evaluateAndUnlock(loserId),
  ]);

  // Load user IDs for notifications
  const [winnerPlayer, loserPlayer] = await Promise.all([
    prisma.player.findUnique({ where: { id: winnerId }, select: { userId: true, displayName: true } }),
    prisma.player.findUnique({ where: { id: loserId }, select: { userId: true, displayName: true } }),
  ]);

  const notifications = [];

  // Match result notifications
  if (winnerPlayer) {
    notifications.push({
      userId: winnerPlayer.userId,
      type: NotificationType.MATCH_RESULT,
      title: "Match Won!",
      message: `You defeated ${loserPlayer?.displayName ?? "your opponent"}. +${ratings.winnerDelta} rating.`,
      metadata: { matchId, delta: ratings.winnerDelta, newRating: newWinnerRating },
    });
  }
  if (loserPlayer) {
    notifications.push({
      userId: loserPlayer.userId,
      type: NotificationType.MATCH_RESULT,
      title: "Match Result",
      message: `You lost to ${winnerPlayer?.displayName ?? "your opponent"}. ${ratings.loserDelta} rating.`,
      metadata: { matchId, delta: ratings.loserDelta, newRating: newLoserRating },
    });
  }

  // Rank change notifications
  if (winnerTierChange.changed && winnerPlayer) {
    const verb = winnerTierChange.promoted ? "Promoted to" : "Demoted to";
    notifications.push({
      userId: winnerPlayer.userId,
      type: NotificationType.RANK_CHANGE,
      title: `${verb} ${winnerTierChange.toTier}`,
      message: `Your rank has changed from ${winnerTierChange.fromTier} to ${winnerTierChange.toTier}.`,
      metadata: { fromTier: winnerTierChange.fromTier, toTier: winnerTierChange.toTier },
    });
  }
  if (loserTierChange.changed && loserPlayer) {
    const verb = loserTierChange.promoted ? "Promoted to" : "Demoted to";
    notifications.push({
      userId: loserPlayer.userId,
      type: NotificationType.RANK_CHANGE,
      title: `${verb} ${loserTierChange.toTier}`,
      message: `Your rank has changed from ${loserTierChange.fromTier} to ${loserTierChange.toTier}.`,
      metadata: { fromTier: loserTierChange.fromTier, toTier: loserTierChange.toTier },
    });
  }

  // Achievement notifications
  for (const key of winnerUnlocked) {
    if (winnerPlayer) {
      notifications.push({
        userId: winnerPlayer.userId,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        title: "Achievement Unlocked!",
        message: `You unlocked: ${key.replace(/_/g, " ")}`,
        metadata: { achievementKey: key },
      });
    }
  }
  for (const key of loserUnlocked) {
    if (loserPlayer) {
      notifications.push({
        userId: loserPlayer.userId,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        title: "Achievement Unlocked!",
        message: `You unlocked: ${key.replace(/_/g, " ")}`,
        metadata: { achievementKey: key },
      });
    }
  }

  await createNotificationBulk(notifications);

  // Return enriched result for API response
  return {
    matchId,
    winner: {
      id: winnerId,
      ratingBefore: winner.rating,
      ratingAfter: newWinnerRating,
      ratingDelta: ratings.winnerDelta,
      tierChanged: winnerTierChange.changed,
      newTier: winnerTierChange.changed ? winnerTierChange.toTier : null,
      achievementsUnlocked: winnerUnlocked,
    },
    loser: {
      id: loserId,
      ratingBefore: loser.rating,
      ratingAfter: newLoserRating,
      ratingDelta: ratings.loserDelta,
      tierChanged: loserTierChange.changed,
      newTier: loserTierChange.changed ? loserTierChange.toTier : null,
      achievementsUnlocked: loserUnlocked,
    },
  };
}

// ============================================================
// getMatch
// ============================================================
export async function getMatch(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      map: true,
      participants: {
        include: {
          player: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              tier: true,
              rating: true,
            },
          },
        },
      },
      season: { select: { id: true, name: true, number: true } },
    },
  });
  if (!match) throw new AppError(ErrorCode.MATCH_NOT_FOUND, "Match not found", 404);
  return match;
}

// ============================================================
// listMatches — paginated
// ============================================================
export async function listMatches(opts: {
  page?: number;
  pageSize?: number;
  status?: MatchStatus;
  seasonId?: string;
  mapType?: MapType;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.seasonId ? { seasonId: opts.seasonId } : {}),
    ...(opts.mapType ? { map: { type: opts.mapType } } : {}),
  };

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: {
        map: { select: { type: true, name: true } },
        participants: {
          include: {
            player: { select: { id: true, username: true, displayName: true } },
          },
        },
        season: { select: { id: true, name: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.match.count({ where }),
  ]);

  return {
    items: matches,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ============================================================
// cancelMatch
// ============================================================
export async function cancelMatch(matchId: string, reason?: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, status: true },
  });
  if (!match) throw new AppError(ErrorCode.MATCH_NOT_FOUND, "Match not found", 404);
  if (match.status === MatchStatus.COMPLETED) {
    throw new AppError(ErrorCode.MATCH_ALREADY_COMPLETED, "Cannot cancel a completed match", 409);
  }

  return prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.CANCELLED, notes: reason ?? null },
  });
}

// ============================================================
// Internal helpers
// ============================================================

async function upsertMapStats(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  playerId: string,
  mapId: string,
  won: boolean
) {
  const existing = await tx.playerMapStats.findUnique({
    where: { playerId_mapId: { playerId, mapId } },
  });

  if (existing) {
    const newWins = won ? existing.wins + 1 : existing.wins;
    const newLosses = won ? existing.losses : existing.losses + 1;
    const newMatches = existing.matches + 1;
    const streak = won
      ? existing.bestStreak > 0
        ? existing.bestStreak + 1
        : 1
      : 0;

    await tx.playerMapStats.update({
      where: { playerId_mapId: { playerId, mapId } },
      data: {
        wins: newWins,
        losses: newLosses,
        matches: newMatches,
        bestStreak: Math.max(existing.bestStreak, streak),
      },
    });
  } else {
    await tx.playerMapStats.create({
      data: {
        playerId,
        mapId,
        matches: 1,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        bestStreak: won ? 1 : 0,
      },
    });
  }
}

async function upsertSeasonStats(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  playerId: string,
  seasonId: string,
  won: boolean,
  mvpPlayerId?: string
) {
  const player = await tx.player.findUnique({
    where: { id: playerId },
    select: { rating: true, peakRating: true },
  });
  if (!player) return;

  const existing = await tx.seasonPlayerStats.findUnique({
    where: { seasonId_playerId: { seasonId, playerId } },
  });

  const mvpIncrement = mvpPlayerId === playerId ? 1 : 0;

  if (existing) {
    await tx.seasonPlayerStats.update({
      where: { seasonId_playerId: { seasonId, playerId } },
      data: {
        rating: player.rating,
        peakRating: Math.max(existing.peakRating, player.rating),
        wins: won ? { increment: 1 } : undefined,
        losses: !won ? { increment: 1 } : undefined,
        mvpCount: mvpIncrement > 0 ? { increment: mvpIncrement } : undefined,
      },
    });
  } else {
    await tx.seasonPlayerStats.create({
      data: {
        seasonId,
        playerId,
        rating: player.rating,
        peakRating: player.peakRating,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        mvpCount: mvpIncrement,
      },
    });
  }
}
