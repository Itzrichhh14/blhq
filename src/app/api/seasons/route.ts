// GET  /api/seasons
// POST /api/seasons (admin+)
import { NextRequest } from "next/server";
import { listSeasons, createSeason } from "@/src/services/seasonService";
import { requireAdmin } from "@/src/lib/session";
import { CreateSeasonSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function GET() {
  try {
    const seasons = await listSeasons();
    return apiSuccess(seasons);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = CreateSeasonSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid season data", 422, parsed.error.flatten());
    }
    const season = await createSeason(parsed.data);
    return apiSuccess(season, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
