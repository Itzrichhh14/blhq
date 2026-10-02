// GET  /api/challenges — list challenges for the authenticated player
// POST /api/challenges — create challenge
import { NextRequest } from "next/server";
import { listChallengesForPlayer, createChallenge } from "@/src/services/challengeService";
import { requireAuth } from "@/src/lib/session";
import { CreateChallengeSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";
import { ChallengeStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.user.playerId) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "No player profile found", 400);
    }
    const { searchParams } = req.nextUrl;
    const result = await listChallengesForPlayer(session.user.playerId, {
      status: (searchParams.get("status") as ChallengeStatus) ?? undefined,
      direction: (searchParams.get("direction") as any) ?? "all",
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
    });
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.user.playerId) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "No player profile found", 400);
    }
    const body = await req.json();
    const parsed = CreateChallengeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid challenge data", 422, parsed.error.flatten());
    }
    const challenge = await createChallenge(session.user.playerId, parsed.data);
    return apiSuccess(challenge, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
