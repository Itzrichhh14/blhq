// ============================================================
// BLOODLINE — Ranking Service
// Builds, stores and retrieves leaderboard data.
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { RankMovement, RankTier, Region, MapType } from "@prisma/client";
import type { RankedPlayer, RankingsFilter } from "@/src/types";

// ============================================================
// Helpers
// ============================================================
function winRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 1000) / 10;
}

// ============================================================
// getRankings — main leaderboard query
// ============================================================
export async function getRankings(filter: RankingsFilter): Promise<{
  items: RankedPlayer[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (filter.region) where.region = filter.region;
  if (filter.tier) where.tier = filter.tier;

  // Map-specific filter: join through playerMapStats
  let mapWhereClause: Record<string, unknown> | undefined;
  if (filter.mapType) {
    mapWhereClause = {
      playerMapStats: {
        some: { map: { type: filter.mapType }, matches: { gt: 0 } },
      },
    };
  }

  const finalWhere = { ...where, ...mapWhereClause };

  // Determine orderBy
  type OrderField = "rating" | "wins" | "currentStreak" | "totalMatches";
  const sortMap: Record<string, OrderField> = {
    rating: "rating",
    wins: "wins",
    streak: "currentStreak",
    matches: "totalMatches",
  };
  // winRate requires computed sort — handled post-query
  const needsComputedSort = filter.sortBy === "winRate";
  const dbSort = needsComputedSort
    ? "rating"
    : (sortMap[filter.sortBy ?? "rating"] ?? "rating");

  // Fetch a larger batch if we need computed sort
  const fetchLimit = needsComputedSort ? undefined : pageSize;
  const fetchSkip = needsComputedSort ? 0 : skip;

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where: finalWhere,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        region: true,
        tier: true,
        rating: true,
        peakRating: true,
        wins: true,
        losses: true,
        totalMatches: true,
        currentStreak: true,
        longestStreak: true,
        mvpCount: true,
        team: { select: { name: true } },
      },
      orderBy: { [dbSort]: "desc" },
      skip: fetchSkip,
      take: fetchLimit,
    }),
    prisma.player.count({ where: finalWhere }),
  ]);

  // Apply computed sort if needed
  let sorted = players;
  if (needsComputedSort) {
    sorted = [...players].sort((a, b) => {
      const wrA = a.totalMatches ? a.wins / a.totalMatches : 0;
      const wrB = b.totalMatches ? b.wins / b.totalMatches : 0;
      return wrB - wrA;
    });
    sorted = sorted.slice(skip, skip + pageSize);
  }

  // Load latest ranking snapshots for movement
  const playerIds = sorted.map((p) => p.id);
  const snapshots = await prisma.rankingSnapshot.findMany({
    where: { playerId: { in: playerIds }, seasonId: filter.seasonId ?? null },
    orderBy: { createdAt: "desc" },
    distinct: ["playerId"],
  });
  const snapshotMap = new Map(snapshots.map((s) => [s.playerId, s]));

  const ranked: RankedPlayer[] = sorted.map((p, i) => {
    const globalRank = skip + i + 1;
    const snap = snapshotMap.get(p.id);
    let movement: RankMovement = RankMovement.NEW;
    if (snap) {
      if (snap.position < globalRank) movement = RankMovement.DOWN;
      else if (snap.position > globalRank) movement = RankMovement.UP;
      else movement = RankMovement.SAME;
    }

    return {
      rank: globalRank,
      movement,
      player: {
        id: p.id,
        username: p.username,
        displayName: p.displayName,
        avatar: p.avatar,
        region: p.region,
        tier: p.tier,
        rating: p.rating,
        peakRating: p.peakRating,
        wins: p.wins,
        losses: p.losses,
        winRate: winRate(p.wins, p.totalMatches),
        currentStreak: p.currentStreak,
        longestStreak: p.longestStreak,
        totalMatches: p.totalMatches,
        mvpCount: p.mvpCount,
        teamName: p.team?.name ?? null,
      },
    };
  });

  return {
    items: ranked,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ============================================================
// getPlayerRank — single player's position in the overall rankings
// ============================================================
export async function getPlayerRank(playerId: string): Promise<{
  rank: number | null;
  movement: RankMovement;
}> {
  // Count how many active players have a higher rating
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { rating: true },
  });
  if (!player) return { rank: null, movement: RankMovement.NEW };

  const higherRated = await prisma.player.count({
    where: { rating: { gt: player.rating }, status: "ACTIVE" },
  });
  const rank = higherRated + 1;

  // Check previous snapshot
  const snap = await prisma.rankingSnapshot.findFirst({
    where: { playerId },
    orderBy: { createdAt: "desc" },
  });

  let movement: RankMovement = RankMovement.NEW;
  if (snap) {
    if (snap.position < rank) movement = RankMovement.DOWN;
    else if (snap.position > rank) movement = RankMovement.UP;
    else movement = RankMovement.SAME;
  }

  return { rank, movement };
}

// ============================================================
// snapshotRankings — called periodically or after big events
// Saves current leaderboard positions for movement tracking
// ============================================================
export async function snapshotRankings(seasonId?: string): Promise<void> {
  const players = await prisma.player.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, rating: true, tier: true },
    orderBy: { rating: "desc" },
  });

  const snapshots = players.map((p, i) => ({
    playerId: p.id,
    seasonId: seasonId ?? null,
    position: i + 1,
    movement: RankMovement.SAME,
    rating: p.rating,
    tier: p.tier,
  }));

  // Bulk create — using createMany for performance
  await prisma.rankingSnapshot.createMany({
    data: snapshots,
    skipDuplicates: false,
  });
}

// ============================================================
// getRecords — derived from actual data
// ============================================================
export async function getRecords() {
  const [
    highestRating,
    longestStreak,
    mostTournamentWins,
    mostMVPs,
    mostMatches,
    bestArena,
    bestTracking,
    bestTimed,
  ] = await Promise.all([
    prisma.player.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { peakRating: "desc" },
      select: { id: true, username: true, displayName: true, peakRating: true },
    }),
    prisma.player.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { longestStreak: "desc" },
      select: { id: true, username: true, displayName: true, longestStreak: true },
    }),
    prisma.player.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { tournamentWins: "desc" },
      select: { id: true, username: true, displayName: true, tournamentWins: true },
    }),
    prisma.player.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { mvpCount: "desc" },
      select: { id: true, username: true, displayName: true, mvpCount: true },
    }),
    prisma.player.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { totalMatches: "desc" },
      select: { id: true, username: true, displayName: true, totalMatches: true },
    }),
    // Best win rate per map (min 10 matches)
    prisma.playerMapStats.findFirst({
      where: { map: { type: MapType.ARENA }, matches: { gte: 10 } },
      orderBy: [{ wins: "desc" }],
      include: {
        player: { select: { id: true, username: true, displayName: true } },
        map: true,
      },
    }),
    prisma.playerMapStats.findFirst({
      where: { map: { type: MapType.TRACKING }, matches: { gte: 10 } },
      orderBy: [{ wins: "desc" }],
      include: {
        player: { select: { id: true, username: true, displayName: true } },
        map: true,
      },
    }),
    prisma.playerMapStats.findFirst({
      where: { map: { type: MapType.TIMED }, matches: { gte: 10 } },
      orderBy: [{ wins: "desc" }],
      include: {
        player: { select: { id: true, username: true, displayName: true } },
        map: true,
      },
    }),
  ]);

  return {
    highestRating: highestRating
      ? { player: highestRating, value: highestRating.peakRating, label: "Highest Peak Rating" }
      : null,
    longestStreak: longestStreak
      ? { player: longestStreak, value: longestStreak.longestStreak, label: "Longest Win Streak" }
      : null,
    mostTournamentWins: mostTournamentWins
      ? { player: mostTournamentWins, value: mostTournamentWins.tournamentWins, label: "Most Tournament Wins" }
      : null,
    mostMVPs: mostMVPs
      ? { player: mostMVPs, value: mostMVPs.mvpCount, label: "Most MVPs" }
      : null,
    mostMatches: mostMatches
      ? { player: mostMatches, value: mostMatches.totalMatches, label: "Most Matches Played" }
      : null,
    bestArena: bestArena
      ? {
          player: bestArena.player,
          value: bestArena.wins,
          winRate: bestArena.matches > 0 ? Math.round((bestArena.wins / bestArena.matches) * 1000) / 10 : 0,
          label: "Best Arena Win Rate",
        }
      : null,
    bestTracking: bestTracking
      ? {
          player: bestTracking.player,
          value: bestTracking.wins,
          winRate: bestTracking.matches > 0 ? Math.round((bestTracking.wins / bestTracking.matches) * 1000) / 10 : 0,
          label: "Best Tracking Win Rate",
        }
      : null,
    bestTimed: bestTimed
      ? {
          player: bestTimed.player,
          value: bestTimed.wins,
          winRate: bestTimed.matches > 0 ? Math.round((bestTimed.wins / bestTimed.matches) * 1000) / 10 : 0,
          label: "Best Timed Win Rate",
        }
      : null,
  };
}
