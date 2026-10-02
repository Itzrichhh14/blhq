// GET /api/players/[id]
// PATCH /api/players/[id] — update own profile (auth required)
import { NextRequest } from "next/server";
import { getPlayerById, updatePlayer } from "@/src/services/playerService";
import { getPlayerMapStats, getPlayerMatchHistory, getPlayerRatingHistory, getPlayerAchievements } from "@/src/services/playerService";
import { requireAuth } from "@/src/lib/session";
import { UpdatePlayerSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = req.nextUrl;
    const include = searchParams.get("include")?.split(",") ?? [];

    const player = await getPlayerById(params.id);
    const extras: Record<string, unknown> = {};

    if (include.includes("mapStats")) {
      extras.mapStats = await getPlayerMapStats(params.id);
    }
    if (include.includes("ratingHistory")) {
      extras.ratingHistory = await getPlayerRatingHistory(params.id);
    }
    if (include.includes("achievements")) {
      extras.achievements = await getPlayerAchievements(params.id);
    }
    if (include.includes("matchHistory")) {
      extras.matchHistory = await getPlayerMatchHistory(params.id, {
        page: Number(searchParams.get("page") ?? 1),
        pageSize: Number(searchParams.get("pageSize") ?? 10),
      });
    }

    return apiSuccess({ ...player, ...extras });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    // Must be own profile or staff+
    const player = await getPlayerById(params.id);
    const isOwner = session.user.playerId === params.id;
    const isStaff = ["STAFF", "ADMIN", "OWNER"].includes(session.user.role);
    if (!isOwner && !isStaff) {
      return apiError(ErrorCode.FORBIDDEN, "Cannot edit another player's profile", 403);
    }

    const body = await req.json();
    const parsed = UpdatePlayerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid data", 422, parsed.error.flatten());
    }

    const updated = await updatePlayer(params.id, parsed.data);
    return apiSuccess(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
