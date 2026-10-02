// GET /api/seasons/[id]
import { NextRequest } from "next/server";
import { getSeasonById, getSeasonLeaderboard } from "@/src/services/seasonService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = req.nextUrl;
    const include = searchParams.get("include")?.split(",") ?? [];

    const season = await getSeasonById(params.id);
    const extras: Record<string, unknown> = {};

    if (include.includes("leaderboard")) {
      extras.leaderboard = await getSeasonLeaderboard(params.id, {
        page: Number(searchParams.get("page") ?? 1),
        pageSize: Number(searchParams.get("pageSize") ?? 50),
      });
    }

    return apiSuccess({ ...season, ...extras });
  } catch (err) {
    return handleApiError(err);
  }
}
