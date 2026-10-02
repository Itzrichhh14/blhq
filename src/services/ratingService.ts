// ============================================================
// BLOODLINE — Centralized Rating System
//
// Algorithm: Modified ELO with K-factor scaling.
// Designed to be swapped out without touching any other service —
// only matchService calls into here.
// ============================================================
import { MatchFormat, RankTier } from "@prisma/client";
import { getTierDefinition } from "@/src/services/rankService";

// ============================================================
// Configuration — tune these without changing call sites
// ============================================================
const CONFIG = {
  // Base K-factor: max rating change per match for equally rated players
  BASE_K: 32,

  // K-factor adjustments by match format
  FORMAT_K_MULTIPLIER: {
    STANDARD: 1.0,
    CHALLENGE: 0.8,    // challenges are slightly lower stakes
    BO3: 1.2,
    BO5: 1.4,
    TOURNAMENT: 1.5,   // tournament matches matter more
    EXAM: 1.0,
    TRIAL: 0.5,        // trial results affect rating minimally
  } satisfies Record<MatchFormat, number>,

  // Minimum/maximum rating delta per match
  MIN_DELTA: 4,
  MAX_DELTA: 64,

  // Floor — rating cannot drop below this
  RATING_FLOOR: 100,

  // Provisional games: higher K until a player has this many matches
  PROVISIONAL_MATCH_THRESHOLD: 20,
  PROVISIONAL_K_MULTIPLIER: 1.8,
};

// ============================================================
// ELO Core
// ============================================================

/**
 * Calculate expected win probability for player A against player B.
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate K-factor for a player based on their current state.
 */
export function getKFactor(
  format: MatchFormat,
  totalMatches: number,
  tier: RankTier
): number {
  let k = CONFIG.BASE_K;

  // Format multiplier
  k *= CONFIG.FORMAT_K_MULTIPLIER[format] ?? 1.0;

  // Provisional multiplier for new players
  if (totalMatches < CONFIG.PROVISIONAL_MATCH_THRESHOLD) {
    k *= CONFIG.PROVISIONAL_K_MULTIPLIER;
  }

  // Higher tiers get slightly lower K (ratings are more stable at the top)
  const tierDef = getTierDefinition(tier);
  if (tierDef.order >= 4) {
    k *= 0.8; // KAGE and BLOODLINE_LEGEND
  } else if (tierDef.order >= 3) {
    k *= 0.9; // JONIN
  }

  return k;
}

// ============================================================
// Match Rating Result
// ============================================================

export interface RatingCalculationResult {
  winnerNewRating: number;
  loserNewRating: number;
  winnerDelta: number;
  loserDelta: number;
  winnerExpected: number; // probability 0-1
  loserExpected: number;
}

/**
 * Calculate new ratings after a completed match.
 *
 * @param winnerRating   Current rating of the winner
 * @param loserRating    Current rating of the loser
 * @param format         Match format (affects K)
 * @param winnerMatches  Total career matches for winner (provisional check)
 * @param loserMatches   Total career matches for loser
 * @param winnerTier     Current tier of winner (affects K)
 * @param loserTier      Current tier of loser
 */
export function calculateMatchRatings(
  winnerRating: number,
  loserRating: number,
  format: MatchFormat,
  winnerMatches: number,
  loserMatches: number,
  winnerTier: RankTier,
  loserTier: RankTier
): RatingCalculationResult {
  const winnerExpected = expectedScore(winnerRating, loserRating);
  const loserExpected = 1 - winnerExpected;

  const kWinner = getKFactor(format, winnerMatches, winnerTier);
  const kLoser = getKFactor(format, loserMatches, loserTier);

  // Winner score = 1, Loser score = 0
  let winnerDelta = Math.round(kWinner * (1 - winnerExpected));
  let loserDelta = Math.round(kLoser * (0 - loserExpected)); // negative

  // Clamp to configured bounds
  winnerDelta = Math.max(CONFIG.MIN_DELTA, Math.min(CONFIG.MAX_DELTA, winnerDelta));
  loserDelta = Math.max(-CONFIG.MAX_DELTA, Math.min(-CONFIG.MIN_DELTA, loserDelta));

  const winnerNewRating = winnerRating + winnerDelta;
  const loserNewRating = Math.max(CONFIG.RATING_FLOOR, loserRating + loserDelta);

  // Adjust actual loser delta after floor clamping
  const actualLoserDelta = loserNewRating - loserRating;

  return {
    winnerNewRating,
    loserNewRating,
    winnerDelta,
    loserDelta: actualLoserDelta,
    winnerExpected,
    loserExpected,
  };
}

// ============================================================
// Streak helpers
// ============================================================

/**
 * Update streak value after a match.
 * Positive = win streak, negative = loss streak.
 */
export function updateStreak(currentStreak: number, won: boolean): number {
  if (won) {
    return currentStreak >= 0 ? currentStreak + 1 : 1;
  } else {
    return currentStreak <= 0 ? currentStreak - 1 : -1;
  }
}

/**
 * Return the new longestStreak value.
 */
export function updateLongestStreak(
  currentLongest: number,
  newStreak: number
): number {
  return Math.max(currentLongest, newStreak);
}

// ============================================================
// Utility: display-friendly delta string
// ============================================================
export function formatDelta(delta: number): string {
  return delta >= 0 ? `+${delta}` : `${delta}`;
}

export { CONFIG as RATING_CONFIG };
