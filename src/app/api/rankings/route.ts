// GET /api/rankings
import { NextRequest } from "next/server";
import { getRankings } from "@/src/services/rankingService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";
import { Region, RankTier, MapType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const result = await getRankings({
      region: (searchParams.get("region") as Region) ?? undefined,
      tier: (searchParams.get("tier") as RankTier) ?? undefined,
      seasonId: searchParams.get("seasonId") ?? undefined,
      mapType: (searchParams.get("mapType") as MapType) ?? undefined,
      sortBy: (searchParams.get("sortBy") as any) ?? "rating",
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 50),
    });

    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
