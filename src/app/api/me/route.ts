// GET   /api/me — current player profile
// PATCH /api/me — update own profile
import { NextRequest } from "next/server";
import { getPlayerByUserId, updatePlayer } from "@/src/services/playerService";
import { requireAuth } from "@/src/lib/session";
import { UpdatePlayerSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function GET() {
  try {
    const session = await requireAuth();
    const player = await getPlayerByUserId(session.user.id);
    return apiSuccess(player);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.user.playerId) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "No player profile found", 400);
    }
    const body = await req.json();
    const parsed = UpdatePlayerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid update data", 422, parsed.error.flatten());
    }
    const updated = await updatePlayer(session.user.playerId, parsed.data);
    return apiSuccess(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
