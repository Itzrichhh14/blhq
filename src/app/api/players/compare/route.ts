// GET /api/players/compare?playerA=<id>&playerB=<id>
import { NextRequest } from "next/server";
import { comparePlayers } from "@/src/services/playerService";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const playerA = searchParams.get("playerA");
    const playerB = searchParams.get("playerB");

    if (!playerA || !playerB) {
      return apiError(ErrorCode.BAD_REQUEST, "playerA and playerB query params are required", 400);
    }
    if (playerA === playerB) {
      return apiError(ErrorCode.BAD_REQUEST, "Cannot compare a player against themselves", 400);
    }

    const result = await comparePlayers(playerA, playerB);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
