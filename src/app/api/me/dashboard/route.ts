// GET /api/me/dashboard
// Returns everything needed to render the authenticated player's dashboard
// in a single request.
import { requireAuth } from "@/src/lib/session";
import { prisma } from "@/src/lib/prisma";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";
import { getRankProgress } from "@/src/services/rankService";
import { getPlayerRank } from "@/src/services/rankingService";
import { getUnreadCount } from "@/src/services/notificationService";
import { ChallengeStatus, ParticipantStatus, TournamentStatus } from "@prisma/client";
import type { DashboardData } from "@/src/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();
    const playerId = session.user.playerId;

    if (!playerId) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "No player profile linked to this account", 400);
    }

    // ── Fetch everything in parallel ──────────────────────
    const [
      player,
      recentMatchParticipations,
      unlockedAchievements,
      totalAchievements,
      activeChallengesRaw,
      activeTournamentParticipations,
      currentSeasonStats,
      unreadCount,
      rankData,
    ] = await Promise.all([
      // Full player profile
      prisma.player.findUnique({
        where: { id: playerId },
        include: { team: { select: { name: true } } },
      }),

      // Last 5 completed matches
      prisma.matchParticipant.findMany({
        where: {
          playerId,
          match: { status: "COMPLETED" },
        },
        include: {
          match: {
            include: {
              map: { select: { type: true } },
              participants: {
                include: {
                  player: {
                    select: { id: true, username: true, displayName: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { match: { completedAt: "desc" } },
        take: 5,
      }),

      // Unlocked achievements
      prisma.playerAchievement.findMany({
        where: { playerId },
        include: {
          achievement: {
            select: {
              key: true,
              name: true,
              rarity: true,
              iconKey: true,
            },
          },
        },
        orderBy: { unlockedAt: "desc" },
        take: 10,
      }),

      // Total available achievements
      prisma.achievement.count({ where: { active: true } }),

      // Active challenges (pending or accepted)
      prisma.challenge.findMany({
        where: {
          OR: [{ challengerId: playerId }, { challengedId: playerId }],
          status: { in: [ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED] },
        },
        include: {
          challenger: { select: { username: true, displayName: true } },
          challenged: { select: { username: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Active tournament participations
      prisma.tournamentParticipant.findMany({
        where: {
          playerId,
          status: { in: [ParticipantStatus.REGISTERED, ParticipantStatus.ACTIVE] },
          tournament: {
            status: {
              in: [TournamentStatus.REGISTRATION, TournamentStatus.UPCOMING, TournamentStatus.LIVE],
            },
          },
        },
        include: {
          tournament: { select: { id: true, name: true, slug: true, status: true } },
        },
      }),

      // Current season stats
      prisma.season
        .findFirst({ where: { status: "ACTIVE" } })
        .then((season) => {
          if (!season) return null;
          return prisma.seasonPlayerStats.findUnique({
            where: { seasonId_playerId: { seasonId: season.id, playerId } },
            include: { season: { select: { name: true } } },
          });
        }),

      // Unread notifications
      getUnreadCount(session.user.id),

      // Ranking position + movement
      getPlayerRank(playerId),
    ]);

    if (!player) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);
    }

    // ── Shape the response ────────────────────────────────

    const totalMatches = player.totalMatches;
    const winRate =
      totalMatches > 0
        ? Math.round((player.wins / totalMatches) * 1000) / 10
        : 0;

    const recentMatches = recentMatchParticipations.map((mp) => {
      const opponent = mp.match.participants.find((p) => p.playerId !== playerId);
      return {
        id: mp.match.id,
        mapType: mp.match.map?.type ?? null,
        format: mp.match.format,
        result: mp.isWinner ? ("WIN" as const) : ("LOSS" as const),
        opponentUsername: opponent?.player.username ?? "Unknown",
        opponentDisplayName: opponent?.player.displayName ?? "Unknown",
        ratingDelta: mp.ratingDelta ?? null,
        completedAt: mp.match.completedAt,
      };
    });

    const achievements = {
      unlocked: unlockedAchievements.map((ua) => ({
        key: ua.achievement.key,
        name: ua.achievement.name,
        rarity: ua.achievement.rarity,
        iconKey: ua.achievement.iconKey,
        unlockedAt: ua.unlockedAt,
      })),
      totalUnlocked: unlockedAchievements.length,
      totalAvailable: totalAchievements,
    };

    const activeChallenges = activeChallengesRaw.map((c) => ({
      id: c.id,
      opponentUsername:
        c.challengerId === playerId
          ? c.challenged.username
          : c.challenger.username,
      opponentDisplayName:
        c.challengerId === playerId
          ? c.challenged.displayName
          : c.challenger.displayName,
      mapType: c.mapType,
      status: c.status,
      isChallenger: c.challengerId === playerId,
      createdAt: c.createdAt,
    }));

    const activeTournaments = activeTournamentParticipations.map((tp) => ({
      id: tp.tournament.id,
      name: tp.tournament.name,
      slug: tp.tournament.slug,
      status: tp.tournament.status,
      participantStatus: tp.status,
    }));

    const seasonStats = currentSeasonStats
      ? {
          seasonName: currentSeasonStats.season.name,
          rating: currentSeasonStats.rating,
          peakRating: currentSeasonStats.peakRating,
          wins: currentSeasonStats.wins,
          losses: currentSeasonStats.losses,
          tournamentWins: currentSeasonStats.tournamentWins,
          mvpCount: currentSeasonStats.mvpCount,
        }
      : null;

    const dashboard: DashboardData = {
      profile: {
        id: player.id,
        username: player.username,
        displayName: player.displayName,
        avatar: player.avatar,
        bio: player.bio,
        region: player.region,
        tier: player.tier,
        rating: player.rating,
        peakRating: player.peakRating,
        wins: player.wins,
        losses: player.losses,
        totalMatches,
        winRate,
        currentStreak: player.currentStreak,
        longestStreak: player.longestStreak,
        mvpCount: player.mvpCount,
        tournamentWins: player.tournamentWins,
        joinDate: player.joinDate,
        teamName: player.team?.name ?? null,
      },
      rankProgress: getRankProgress(player.tier, player.rating),
      recentMatches,
      achievements,
      activeChallenges,
      unreadNotifications: unreadCount,
      activeTournaments,
      currentSeasonStats: seasonStats,
      rankMovement: rankData.movement,
      currentRank: rankData.rank,
    };

    return apiSuccess(dashboard);
  } catch (err) {
    return handleApiError(err);
  }
}
