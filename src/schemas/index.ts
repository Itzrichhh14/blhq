// ============================================================
// BLOODLINE — Zod Validation Schemas
// ============================================================
import { z } from "zod";
import {
  Region,
  MapType,
  MatchFormat,
  RankTier,
  TournamentFormat,
  NewsCategory,
  AchievementRarity,
} from "@prisma/client";

// ============================================================
// AUTH
// ============================================================

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must be at most 24 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(32, "Display name must be at most 32 characters")
    .optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ============================================================
// PLAYER
// ============================================================

export const UpdatePlayerSchema = z.object({
  displayName: z.string().min(2).max(32).optional(),
  avatar: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  region: z.nativeEnum(Region).optional(),
  mainMap: z.nativeEnum(MapType).optional().nullable(),
  specialty: z.string().max(100).optional().nullable(),
});

// ============================================================
// MATCH
// ============================================================

export const CreateMatchSchema = z.object({
  player1Id: z.string().cuid(),
  player2Id: z.string().cuid(),
  mapType: z.nativeEnum(MapType).optional(),
  format: z.nativeEnum(MatchFormat).default("STANDARD"),
  scheduledAt: z.string().datetime().optional(),
  seasonId: z.string().cuid().optional(),
});

export const CompleteMatchSchema = z.object({
  winnerId: z.string().cuid(),
  loserId: z.string().cuid(),
  scoreWinner: z.number().int().min(0).max(99).optional(),
  scoreLoser: z.number().int().min(0).max(99).optional(),
  mvpPlayerId: z.string().cuid().optional(),
  notes: z.string().max(500).optional(),
});

// ============================================================
// TOURNAMENT
// ============================================================

export const CreateTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  format: z.nativeEnum(TournamentFormat).default("DOUBLE_ELIMINATION"),
  maxPlayers: z.number().int().min(4).max(128).default(16),
  mapType: z.nativeEnum(MapType).optional(),
  seasonId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  prizeInfo: z.string().max(500).optional(),
});

export const UpdateTournamentStatusSchema = z.object({
  status: z.enum(["REGISTRATION", "UPCOMING", "LIVE", "COMPLETED", "CANCELLED"]),
});

// ============================================================
// CHALLENGE
// ============================================================

export const CreateChallengeSchema = z.object({
  challengedId: z.string().cuid(),
  mapType: z.nativeEnum(MapType).optional(),
  format: z.nativeEnum(MatchFormat).default("CHALLENGE"),
  message: z.string().max(300).optional(),
  proposedDate: z.string().datetime().optional(),
});

export const RespondChallengeSchema = z.object({
  response: z.enum(["ACCEPTED", "DECLINED"]),
});

// ============================================================
// SEASON
// ============================================================

export const CreateSeasonSchema = z.object({
  name: z.string().min(2).max(100),
  number: z.number().int().min(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================
// TEAM
// ============================================================

export const CreateTeamSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")
    .optional(),
});

// ============================================================
// APPLICATION (RECRUITMENT)
// ============================================================

export const CreateApplicationSchema = z.object({
  username: z.string().min(2).max(50),
  discordTag: z.string().min(2).max(50),
  region: z.nativeEnum(Region),
  ageBracket: z.enum(["13-15", "16-17", "18+"]),
  mainMap: z.nativeEnum(MapType).optional(),
  experience: z.string().min(10).max(2000),
  currentRank: z.string().min(2).max(50),
  competitiveHistory: z.string().min(10).max(2000),
  whyBloodline: z.string().min(20).max(3000),
  clips: z.string().max(2000).optional(),
});

export const ReviewApplicationSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "TRIAL", "ACCEPTED", "DECLINED"]),
  notes: z.string().max(2000).optional(),
});

// ============================================================
// NEWS
// ============================================================

export const CreateNewsSchema = z.object({
  title: z.string().min(5).max(200),
  slug: z
    .string()
    .min(3)
    .max(150)
    .regex(/^[a-z0-9-]+$/, "Slug must be URL-safe"),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(10),
  category: z.nativeEnum(NewsCategory),
  coverImage: z.string().url().optional(),
  publishedAt: z.string().datetime().optional(),
});

// ============================================================
// ACHIEVEMENT (admin create)
// ============================================================

export const CreateAchievementSchema = z.object({
  key: z.string().min(2).max(100).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(100),
  description: z.string().max(500),
  rarity: z.nativeEnum(AchievementRarity),
  iconKey: z.string().max(100).optional(),
  requirements: z.record(z.unknown()),
});

// ============================================================
// SEARCH
// ============================================================

export const SearchSchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters").max(100),
});

// ============================================================
// ADMIN: rank change
// ============================================================

export const AdminRankChangeSchema = z.object({
  tier: z.nativeEnum(RankTier),
  reason: z.string().min(5).max(500),
});

export const AdminRatingChangeSchema = z.object({
  rating: z.number().int().min(0).max(9999),
  reason: z.string().min(5).max(500),
});

// ============================================================
// PAGINATION
// ============================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
