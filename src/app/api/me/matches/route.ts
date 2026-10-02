// GET /api/me/matches — authenticated player's match history
import { NextRequest } from "next/server";
import { getPlayerMatchHistory } from "@/src/services/playerService";
import { requireAuth } from "@/src/lib/session";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";
import { MapType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.user.playerId) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "No player profile found", 400);
    }
    const { searchParams } = req.nextUrl;
    const result = await getPlayerMatchHistory(session.user.playerId, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
      mapType: (searchParams.get("mapType") as MapType) ?? undefined,
      result: (searchParams.get("result") as "WIN" | "LOSS") ?? undefined,
      seasonId: searchParams.get("seasonId") ?? undefined,
    });
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
