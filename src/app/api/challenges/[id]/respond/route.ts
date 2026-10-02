// POST /api/challenges/[id]/respond
import { NextRequest } from "next/server";
import { respondToChallenge } from "@/src/services/challengeService";
import { requireAuth } from "@/src/lib/session";
import { RespondChallengeSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (!session.user.playerId) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "No player profile found", 400);
    }
    const body = await req.json();
    const parsed = RespondChallengeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid response data", 422, parsed.error.flatten());
    }
    const result = await respondToChallenge(params.id, session.user.playerId, parsed.data);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
