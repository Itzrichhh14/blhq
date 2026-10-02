// POST /api/tournaments/[id]/start (staff+)
import { NextRequest } from "next/server";
import { startTournament } from "@/src/services/tournamentService";
import { requireStaff } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireStaff();
    const tournament = await startTournament(params.id);
    return apiSuccess(tournament);
  } catch (err) {
    return handleApiError(err);
  }
}
