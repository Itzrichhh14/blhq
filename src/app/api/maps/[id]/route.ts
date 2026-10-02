// GET /api/maps/[id]?include=leaderboard
import { NextRequest } from "next/server";
import { getMapById, getMapLeaderboard } from "@/src/services/mapService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";
import { MapType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = req.nextUrl;
    const include = searchParams.get("include")?.split(",") ?? [];

    const map = await getMapById(params.id);
    const extras: Record<string, unknown> = {};

    if (include.includes("leaderboard")) {
      extras.leaderboard = await getMapLeaderboard(map.type as MapType, {
        page: Number(searchParams.get("page") ?? 1),
        pageSize: Number(searchParams.get("pageSize") ?? 20),
        minMatches: Number(searchParams.get("minMatches") ?? 5),
      });
    }

    return apiSuccess({ ...map, ...extras });
  } catch (err) {
    return handleApiError(err);
  }
}
