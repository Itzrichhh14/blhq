// POST /api/tournaments/[id]/start (staff+)
import { NextRequest } from "next/server";
import { startTournament } from "@/src/services/tournamentService";
import { requireStaff } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireStaff();
    const tournament = await startTournament(params.id);
    return apiSuccess(tournament);
  } catch (err) {
    return handleApiError(err);
  }
}
