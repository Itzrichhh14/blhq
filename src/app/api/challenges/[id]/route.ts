// GET    /api/challenges/[id]
// POST   /api/challenges/[id]/respond
// DELETE /api/challenges/[id]  — cancel (challenger only)
import { NextRequest } from "next/server";
import {
  getChallengeById,
  respondToChallenge,
  cancelChallenge,
} from "@/src/services/challengeService";
import { requireAuth } from "@/src/lib/session";
import { RespondChallengeSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (!session.user.playerId) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "No player profile found", 400);
    }
    const { id } = await props.params;
    const challenge = await getChallengeById(id, session.user.playerId);
    return apiSuccess(challenge);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (!session.user.playerId) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "No player profile found", 400);
    }
    const { id } = await props.params;
    const result = await cancelChallenge(id, session.user.playerId);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
