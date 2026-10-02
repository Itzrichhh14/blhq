// ============================================================
// BLOODLINE — Centralized Rank / Tier System
// All rank logic lives here. Nothing else should hardcode tiers.
// ============================================================
import { RankTier } from "@prisma/client";
import type { RankProgressInfo } from "@/src/types";

// ============================================================
// Tier Definitions
// ============================================================
export interface TierDefinition {
  tier: RankTier;
  name: string;
  displayName: string;
  order: number;
  minRating: number;        // minimum rating to hold this tier
  promotionRating: number;  // rating required to promote TO next tier
  description: string;
  color: string;            // hex — frontend can consume
  icon: string;             // key for frontend icon resolution
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    tier: RankTier.ACADEMY,
    name: "ACADEMY",
    displayName: "Academy",
    order: 0,
    minRating: 0,
    promotionRating: 900,
    description:
      "New recruits beginning their journey. Study, train, and prove yourself worthy.",
    color: "#6B7280",
    icon: "tier_academy",
  },
  {
    tier: RankTier.GENIN,
    name: "GENIN",
    displayName: "Genin",
    order: 1,
    minRating: 900,
    promotionRating: 1100,
    description:
      "Graduated from Academy. Genin have demonstrated basic competency and earned their rank.",
    color: "#22C55E",
    icon: "tier_genin",
  },
  {
    tier: RankTier.CHUNIN,
    name: "CHUNIN",
    displayName: "Chūnin",
    order: 2,
    minRating: 1100,
    promotionRating: 1400,
    description:
      "Mid-rank competitors who have passed the Chūnin Exams. Respected and battle-tested.",
    color: "#3B82F6",
    icon: "tier_chunin",
  },
  {
    tier: RankTier.JONIN,
    name: "JONIN",
    displayName: "Jōnin",
    order: 3,
    minRating: 1400,
    promotionRating: 1700,
    description:
      "Elite warriors who have survived the Jōnin Trials. The backbone of Bloodline.",
    color: "#A855F7",
    icon: "tier_jonin",
  },
  {
    tier: RankTier.KAGE,
    name: "KAGE",
    displayName: "Kage",
    order: 4,
    minRating: 1700,
    promotionRating: 2000,
    description:
      "Shadow leaders at the pinnacle of competitive play. Appointed by the organization.",
    color: "#EF4444",
    icon: "tier_kage",
  },
  {
    tier: RankTier.BLOODLINE_LEGEND,
    name: "BLOODLINE_LEGEND",
    displayName: "Bloodline Legend",
    order: 5,
    minRating: 2000,
    promotionRating: Infinity,
    description:
      "The highest honor. Legends who have transcended competition itself.",
    color: "#F59E0B",
    icon: "tier_legend",
  },
];

// ============================================================
// Lookup helpers
// ============================================================

const TIER_MAP = new Map<RankTier, TierDefinition>(
  TIER_DEFINITIONS.map((t) => [t.tier, t])
);

export function getTierDefinition(tier: RankTier): TierDefinition {
  const def = TIER_MAP.get(tier);
  if (!def) throw new Error(`Unknown tier: ${tier}`);
  return def;
}

export function getTierByOrder(order: number): TierDefinition | null {
  return TIER_DEFINITIONS.find((t) => t.order === order) ?? null;
}

export function getTierForRating(rating: number): RankTier {
  // Walk from highest to lowest — return first tier the rating qualifies for
  for (let i = TIER_DEFINITIONS.length - 1; i >= 0; i--) {
    if (rating >= TIER_DEFINITIONS[i].minRating) {
      return TIER_DEFINITIONS[i].tier;
    }
  }
  return RankTier.ACADEMY;
}

// ============================================================
// Progression
// ============================================================

export function getRankProgress(
  currentTier: RankTier,
  currentRating: number
): RankProgressInfo {
  const def = getTierDefinition(currentTier);
  const nextDef = getTierByOrder(def.order + 1);

  let progressPercent = 0;
  let requiredRating: number | null = null;

  if (nextDef) {
    requiredRating = nextDef.minRating;
    const rangeSize = nextDef.minRating - def.minRating;
    const progress = currentRating - def.minRating;
    progressPercent = Math.min(100, Math.max(0, Math.round((progress / rangeSize) * 100)));
  } else {
    // Max tier
    progressPercent = 100;
  }

  return {
    currentTier,
    currentTierName: def.displayName,
    nextTier: nextDef?.tier ?? null,
    nextTierName: nextDef?.displayName ?? null,
    currentRating,
    requiredRating,
    progressPercent,
    tierOrder: def.order,
    description: def.description,
  };
}

/**
 * Determine what tier a player SHOULD be at given a rating.
 * Returns null if no change needed.
 */
export function computeTierFromRating(rating: number): RankTier {
  return getTierForRating(rating);
}

/**
 * Given old and new ratings, return whether a tier change occurred.
 */
export interface TierChangeResult {
  changed: boolean;
  fromTier: RankTier;
  toTier: RankTier;
  promoted: boolean;
  demoted: boolean;
}

export function evaluateTierChange(
  currentTier: RankTier,
  newRating: number
): TierChangeResult {
  const newTier = computeTierFromRating(newRating);
  const currentDef = getTierDefinition(currentTier);
  const newDef = getTierDefinition(newTier);

  const changed = newTier !== currentTier;
  const promoted = changed && newDef.order > currentDef.order;
  const demoted = changed && newDef.order < currentDef.order;

  return { changed, fromTier: currentTier, toTier: newTier, promoted, demoted };
}

/**
 * Whether a player is eligible for Chūnin Exam registration.
 * Must be Genin with rating >= 950.
 */
export function isEligibleForChuninExam(tier: RankTier, rating: number): boolean {
  return tier === RankTier.GENIN && rating >= 950;
}

/**
 * Whether a player is eligible for Jōnin Trial application.
 * Must be Chūnin with rating >= 1350.
 */
export function isEligibleForJoninTrial(tier: RankTier, rating: number): boolean {
  return tier === RankTier.CHUNIN && rating >= 1350;
}

/**
 * Whether a player meets the minimum requirements for a given tier.
 */
export function meetsRatingRequirement(tier: RankTier, rating: number): boolean {
  const def = getTierDefinition(tier);
  return rating >= def.minRating;
}

export function getAllTiers(): TierDefinition[] {
  return [...TIER_DEFINITIONS];
}
