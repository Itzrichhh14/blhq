// ============================================================
// BLOODLINE — Achievement Engine
//
// Requirements are stored as JSON on each Achievement row.
// The engine reads those requirements and evaluates them against
// a PlayerSnapshot — no per-achievement hardcoded logic outside
// this file.
//
// Requirement JSON shape (all fields optional):
// {
//   minWins?: number
//   minRating?: number
//   minWinStreak?: number
//   minTournamentWins?: number
//   minMVPs?: number
//   minMatches?: number
//   requireTier?: RankTier
//   requireMap?: MapType
//   minMapWins?: number
//   minMapWinRate?: number   // 0-100
// }
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import { RankTier, MapType } from "@prisma/client";

// ============================================================
// Player snapshot — assembled once per evaluation call
// ============================================================
export interface PlayerSnapshot {
  playerId: string;
  wins: number;
  losses: number;
  totalMatches: number;
  rating: number;
  peakRating: number;
  currentStreak: number;
  longestStreak: number;
  tournamentWins: number;
  mvpCount: number;
  tier: RankTier;
  mapStats: {
    mapType: MapType;
    wins: number;
    losses: number;
    matches: number;
  }[];
}

// ============================================================
// Requirement evaluator
// ============================================================
interface AchievementRequirements {
  minWins?: number;
  minRating?: number;
  minWinStreak?: number;
  minTournamentWins?: number;
  minMVPs?: number;
  minMatches?: number;
  requireTier?: RankTier;
  requireMap?: MapType;
  minMapWins?: number;
  minMapWinRate?: number;
}

function evaluate(
  req: AchievementRequirements,
  snap: PlayerSnapshot
): boolean {
  if (req.minWins !== undefined && snap.wins < req.minWins) return false;
  if (req.minRating !== undefined && snap.rating < req.minRating) return false;
  if (req.minWinStreak !== undefined && snap.longestStreak < req.minWinStreak) return false;
  if (req.minTournamentWins !== undefined && snap.tournamentWins < req.minTournamentWins)
    return false;
  if (req.minMVPs !== undefined && snap.mvpCount < req.minMVPs) return false;
  if (req.minMatches !== undefined && snap.totalMatches < req.minMatches) return false;

  if (req.requireTier !== undefined) {
    const TIER_ORDER: Record<RankTier, number> = {
      ACADEMY: 0,
      GENIN: 1,
      CHUNIN: 2,
      JONIN: 3,
      KAGE: 4,
      BLOODLINE_LEGEND: 5,
    };
    if (TIER_ORDER[snap.tier] < TIER_ORDER[req.requireTier]) return false;
  }

  if (req.requireMap !== undefined) {
    const mapStat = snap.mapStats.find((m) => m.mapType === req.requireMap);
    if (!mapStat) return false;

    if (req.minMapWins !== undefined && mapStat.wins < req.minMapWins) return false;

    if (req.minMapWinRate !== undefined) {
      const rate =
        mapStat.matches > 0 ? (mapStat.wins / mapStat.matches) * 100 : 0;
      if (rate < req.minMapWinRate) return false;
    }
  }

  return true;
}

// ============================================================
// buildPlayerSnapshot — assemble from DB
// ============================================================
export async function buildPlayerSnapshot(
  playerId: string
): Promise<PlayerSnapshot> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      playerMapStats: { include: { map: { select: { type: true } } } },
    },
  });
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  return {
    playerId,
    wins: player.wins,
    losses: player.losses,
    totalMatches: player.totalMatches,
    rating: player.rating,
    peakRating: player.peakRating,
    currentStreak: player.currentStreak,
    longestStreak: player.longestStreak,
    tournamentWins: player.tournamentWins,
    mvpCount: player.mvpCount,
    tier: player.tier,
    mapStats: player.playerMapStats.map((s) => ({
      mapType: s.map.type,
      wins: s.wins,
      losses: s.losses,
      matches: s.matches,
    })),
  };
}

// ============================================================
// evaluateAndUnlock
// Checks all active achievements for a player and unlocks any
// newly-earned ones. Returns the list of newly unlocked keys.
// Must be called AFTER player stats are updated.
// ============================================================
export async function evaluateAndUnlock(
  playerId: string,
  snapshot?: PlayerSnapshot
): Promise<string[]> {
  const snap = snapshot ?? (await buildPlayerSnapshot(playerId));

  // Fetch all active achievements and the ones already unlocked
  const [allAchievements, alreadyUnlocked] = await Promise.all([
    prisma.achievement.findMany({ where: { active: true } }),
    prisma.playerAchievement.findMany({
      where: { playerId },
      select: { achievementId: true },
    }),
  ]);

  const unlockedIds = new Set(alreadyUnlocked.map((u) => u.achievementId));
  const newlyUnlocked: string[] = [];

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue; // already have it

    const requirements = achievement.requirements as AchievementRequirements;
    if (evaluate(requirements, snap)) {
      newlyUnlocked.push(achievement.id);
    }
  }

  if (newlyUnlocked.length === 0) return [];

  // Persist all new unlocks at once
  await prisma.playerAchievement.createMany({
    data: newlyUnlocked.map((achievementId) => ({ playerId, achievementId })),
    skipDuplicates: true,
  });

  // Return the keys (not IDs) so callers can create human-readable notifications
  const unlocked = allAchievements.filter((a) => newlyUnlocked.includes(a.id));
  return unlocked.map((a) => a.key);
}

// ============================================================
// grantAchievement — admin/manual grant
// ============================================================
export async function grantAchievement(
  playerId: string,
  achievementKey: string
): Promise<void> {
  const achievement = await prisma.achievement.findUnique({
    where: { key: achievementKey },
  });
  if (!achievement)
    throw new AppError(ErrorCode.ACHIEVEMENT_NOT_FOUND, "Achievement not found", 404);

  const existing = await prisma.playerAchievement.findUnique({
    where: { playerId_achievementId: { playerId, achievementId: achievement.id } },
  });
  if (existing)
    throw new AppError(
      ErrorCode.ACHIEVEMENT_ALREADY_UNLOCKED,
      "Player already has this achievement",
      409
    );

  await prisma.playerAchievement.create({
    data: { playerId, achievementId: achievement.id },
  });
}

// ============================================================
// revokeAchievement — admin only
// ============================================================
export async function revokeAchievement(
  playerId: string,
  achievementKey: string
): Promise<void> {
  const achievement = await prisma.achievement.findUnique({
    where: { key: achievementKey },
  });
  if (!achievement)
    throw new AppError(ErrorCode.ACHIEVEMENT_NOT_FOUND, "Achievement not found", 404);

  await prisma.playerAchievement.deleteMany({
    where: { playerId, achievementId: achievement.id },
  });
}

// ============================================================
// listAchievements — all achievements (for browsing)
// ============================================================
export async function listAchievements() {
  return prisma.achievement.findMany({
    where: { active: true },
    orderBy: [{ rarity: "asc" }, { name: "asc" }],
  });
}
