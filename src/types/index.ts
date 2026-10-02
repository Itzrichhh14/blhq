// ============================================================
// BLOODLINE — Shared TypeScript Types
// Re-exports Prisma enums + defines API response shapes
// ============================================================

export type {
  User,
  Player,
  GameMap,
  Match,
  MatchParticipant,
  Season,
  Team,
  Achievement,
  PlayerAchievement,
  Tournament,
  TournamentParticipant,
  Challenge,
  Notification,
  Application,
  News,
  RatingHistory,
  RankHistory,
  AuditLog,
  SeasonPlayerStats,
  RankingSnapshot,
  JoninTrial,
  Kage,
  ChuninExam,
} from "@prisma/client";

export {
  UserRole,
  UserStatus,
  RankTier,
  Region,
  MapType,
  MatchStatus,
  MatchFormat,
  TournamentStatus,
  TournamentFormat,
  ParticipantStatus,
  ChallengeStatus,
  NotificationType,
  ApplicationStatus,
  SeasonStatus,
  AchievementRarity,
  TrialStatus,
  NewsStatus,
  NewsCategory,
  RankMovement,
  AuditAction,
} from "@prisma/client";

// ============================================================
// API RESPONSE WRAPPERS
// ============================================================

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ============================================================
// PAGINATION
// ============================================================

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ============================================================
// RANKING
// ============================================================

export interface RankedPlayer {
  rank: number;
  movement: import("@prisma/client").RankMovement;
  player: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    region: import("@prisma/client").Region;
    tier: import("@prisma/client").RankTier;
    rating: number;
    peakRating: number;
    wins: number;
    losses: number;
    winRate: number;
    currentStreak: number;
    longestStreak: number;
    totalMatches: number;
    mvpCount: number;
    teamName: string | null;
  };
}

export interface RankingsFilter {
  region?: import("@prisma/client").Region;
  tier?: import("@prisma/client").RankTier;
  seasonId?: string;
  mapType?: import("@prisma/client").MapType;
  sortBy?: "rating" | "winRate" | "wins" | "streak" | "matches";
  page?: number;
  pageSize?: number;
}

// ============================================================
// PLAYER COMPARISON
// ============================================================

export interface PlayerComparisonResult {
  playerA: PlayerComparisonSide;
  playerB: PlayerComparisonSide;
  headToHead: {
    matchesPlayed: number;
    playerAWins: number;
    playerBWins: number;
  };
}

export interface PlayerComparisonSide {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  tier: import("@prisma/client").RankTier;
  rating: number;
  peakRating: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  longestStreak: number;
  tournamentWins: number;
  mvpCount: number;
  mapStats: {
    mapType: import("@prisma/client").MapType;
    wins: number;
    losses: number;
    winRate: number;
    rating: number;
  }[];
  achievementCount: number;
}

// ============================================================
// RANK PROGRESSION
// ============================================================

export interface RankProgressInfo {
  currentTier: import("@prisma/client").RankTier;
  currentTierName: string;
  nextTier: import("@prisma/client").RankTier | null;
  nextTierName: string | null;
  currentRating: number;
  requiredRating: number | null;
  progressPercent: number;
  tierOrder: number;
  description: string;
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardData {
  profile: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    bio: string | null;
    region: import("@prisma/client").Region;
    tier: import("@prisma/client").RankTier;
    rating: number;
    peakRating: number;
    wins: number;
    losses: number;
    totalMatches: number;
    winRate: number;
    currentStreak: number;
    longestStreak: number;
    mvpCount: number;
    tournamentWins: number;
    joinDate: Date;
    teamName: string | null;
  };
  rankProgress: RankProgressInfo;
  recentMatches: RecentMatchSummary[];
  achievements: {
    unlocked: UnlockedAchievementSummary[];
    totalUnlocked: number;
    totalAvailable: number;
  };
  activeChallenges: ChallengeSummary[];
  unreadNotifications: number;
  activeTournaments: TournamentSummary[];
  currentSeasonStats: CurrentSeasonStats | null;
  rankMovement: import("@prisma/client").RankMovement;
  currentRank: number | null;
}

export interface RecentMatchSummary {
  id: string;
  mapType: import("@prisma/client").MapType | null;
  format: import("@prisma/client").MatchFormat;
  result: "WIN" | "LOSS";
  opponentUsername: string;
  opponentDisplayName: string;
  ratingDelta: number | null;
  completedAt: Date | null;
}

export interface UnlockedAchievementSummary {
  key: string;
  name: string;
  rarity: import("@prisma/client").AchievementRarity;
  iconKey: string | null;
  unlockedAt: Date;
}

export interface ChallengeSummary {
  id: string;
  opponentUsername: string;
  opponentDisplayName: string;
  mapType: import("@prisma/client").MapType | null;
  status: import("@prisma/client").ChallengeStatus;
  isChallenger: boolean;
  createdAt: Date;
}

export interface TournamentSummary {
  id: string;
  name: string;
  slug: string;
  status: import("@prisma/client").TournamentStatus;
  participantStatus: import("@prisma/client").ParticipantStatus;
}

export interface CurrentSeasonStats {
  seasonName: string;
  rating: number;
  peakRating: number;
  wins: number;
  losses: number;
  tournamentWins: number;
  mvpCount: number;
}

// ============================================================
// BRACKET
// ============================================================

export interface BracketNode {
  id: string;
  round: number;
  position: number;
  bracketSide: string;
  player1Id: string | null;
  player1Username: string | null;
  player2Id: string | null;
  player2Username: string | null;
  winnerId: string | null;
  status: import("@prisma/client").MatchStatus;
  nextMatchId?: string | null;
}

export interface BracketData {
  tournamentId: string;
  format: import("@prisma/client").TournamentFormat;
  rounds: BracketRound[];
}

export interface BracketRound {
  round: number;
  side: string;
  matches: BracketNode[];
}
