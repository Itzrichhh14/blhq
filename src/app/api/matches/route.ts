// GET /api/matches — list matches
// POST /api/matches — create match (staff+)
import { NextRequest } from "next/server";
import { listMatches, createMatch } from "@/src/services/matchService";
import { requireStaff } from "@/src/lib/session";
import { CreateMatchSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";
import { MatchStatus, MapType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await listMatches({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
      status: (searchParams.get("status") as MatchStatus) ?? undefined,
      seasonId: searchParams.get("seasonId") ?? undefined,
      mapType: (searchParams.get("mapType") as MapType) ?? undefined,
    });
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff();
    const body = await req.json();
    const parsed = CreateMatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid match data", 422, parsed.error.flatten());
    }
    const match = await createMatch(parsed.data);
    return apiSuccess(match, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
