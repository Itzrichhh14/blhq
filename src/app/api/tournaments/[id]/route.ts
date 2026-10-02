// GET /api/tournaments/[id]
import { NextRequest } from "next/server";
import { getTournamentById } from "@/src/services/tournamentService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournament = await getTournamentById(params.id);
    return apiSuccess(tournament);
  } catch (err) {
    return handleApiError(err);
  }
}
