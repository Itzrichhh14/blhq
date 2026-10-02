// GET /api/players — list players (paginated, searchable, filterable)
import { NextRequest } from "next/server";
import { listPlayers } from "@/src/services/playerService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await listPlayers({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
      search: searchParams.get("q") ?? undefined,
      region: searchParams.get("region") ?? undefined,
      tier: searchParams.get("tier") ?? undefined,
    });
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
