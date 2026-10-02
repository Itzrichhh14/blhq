// ============================================================
// BLOODLINE — Application Error Codes & Helpers
// ============================================================

export const ErrorCode = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // User / Player
  USER_NOT_FOUND: "USER_NOT_FOUND",
  PLAYER_NOT_FOUND: "PLAYER_NOT_FOUND",
  USERNAME_TAKEN: "USERNAME_TAKEN",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  PLAYER_SUSPENDED: "PLAYER_SUSPENDED",

  // Match
  MATCH_NOT_FOUND: "MATCH_NOT_FOUND",
  INVALID_MATCH_RESULT: "INVALID_MATCH_RESULT",
  MATCH_ALREADY_COMPLETED: "MATCH_ALREADY_COMPLETED",
  MATCH_NOT_COMPLETABLE: "MATCH_NOT_COMPLETABLE",
  DUPLICATE_PARTICIPANT: "DUPLICATE_PARTICIPANT",

  // Ranking
  RANKING_NOT_FOUND: "RANKING_NOT_FOUND",
  INVALID_RANK_OPERATION: "INVALID_RANK_OPERATION",
  INSUFFICIENT_RANK: "INSUFFICIENT_RANK",

  // Tournament
  TOURNAMENT_NOT_FOUND: "TOURNAMENT_NOT_FOUND",
  INVALID_TOURNAMENT_STATE: "INVALID_TOURNAMENT_STATE",
  ALREADY_REGISTERED: "ALREADY_REGISTERED",
  REGISTRATION_CLOSED: "REGISTRATION_CLOSED",
  TOURNAMENT_FULL: "TOURNAMENT_FULL",
  BRACKET_NOT_GENERATED: "BRACKET_NOT_GENERATED",

  // Challenge
  CHALLENGE_NOT_FOUND: "CHALLENGE_NOT_FOUND",
  CHALLENGE_NOT_ALLOWED: "CHALLENGE_NOT_ALLOWED",
  CHALLENGE_ALREADY_RESPONDED: "CHALLENGE_ALREADY_RESPONDED",
  SELF_CHALLENGE: "SELF_CHALLENGE",
  PENDING_CHALLENGE_EXISTS: "PENDING_CHALLENGE_EXISTS",

  // Achievement
  ACHIEVEMENT_NOT_FOUND: "ACHIEVEMENT_NOT_FOUND",
  ACHIEVEMENT_ALREADY_UNLOCKED: "ACHIEVEMENT_ALREADY_UNLOCKED",

  // Season
  SEASON_NOT_FOUND: "SEASON_NOT_FOUND",
  NO_ACTIVE_SEASON: "NO_ACTIVE_SEASON",

  // Team
  TEAM_NOT_FOUND: "TEAM_NOT_FOUND",
  ALREADY_IN_TEAM: "ALREADY_IN_TEAM",

  // Application
  APPLICATION_NOT_FOUND: "APPLICATION_NOT_FOUND",
  APPLICATION_ALREADY_EXISTS: "APPLICATION_ALREADY_EXISTS",

  // Trial / Exam
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  TRIAL_NOT_FOUND: "TRIAL_NOT_FOUND",
  EXAM_NOT_FOUND: "EXAM_NOT_FOUND",

  // Kage
  KAGE_NOT_FOUND: "KAGE_NOT_FOUND",

  // Search
  SEARCH_QUERY_TOO_SHORT: "SEARCH_QUERY_TOO_SHORT",

  // General
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  public readonly code: ErrorCodeValue;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: ErrorCodeValue,
    message: string,
    statusCode: number = 400,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }

  static notFound(resource: string) {
    return new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, 404);
  }

  static validation(message: string, details?: unknown) {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 422, details);
  }

  static internal(message = "An unexpected error occurred") {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500);
  }
}

// ============================================================
// API response helpers
// ============================================================

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/src/types";

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status }
  );
}

export function handleApiError(err: unknown): NextResponse<ApiResponse<never>> {
  if (err instanceof AppError) {
    return apiError(err.code, err.message, err.statusCode, err.details);
  }
  console.error("[BLOODLINE API ERROR]", err);
  return apiError(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred", 500);
}
