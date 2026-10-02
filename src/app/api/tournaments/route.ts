// GET  /api/tournaments
// POST /api/tournaments (staff+)
import { NextRequest } from "next/server";
import { listTournaments, createTournament } from "@/src/services/tournamentService";
import { requireStaff, requireAuth } from "@/src/lib/session";
import { CreateTournamentSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";
import { TournamentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await listTournaments({
      status: (searchParams.get("status") as TournamentStatus) ?? undefined,
      seasonId: searchParams.get("seasonId") ?? undefined,
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
    });
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff();
    const body = await req.json();
    const parsed = CreateTournamentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid tournament data", 422, parsed.error.flatten());
    }
    const tournament = await createTournament(parsed.data, session.user.id);
    return apiSuccess(tournament, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
