// POST /api/tournaments/[id]/result — record a tournament match result (staff+)
import { NextRequest } from "next/server";
import { recordTournamentMatchResult } from "@/src/services/tournamentService";
import { requireStaff } from "@/src/lib/session";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireStaff();
    const body = await req.json();
    const { tournamentMatchId, winnerId, loserId, scoreWinner, scoreLoser } = body;

    if (!tournamentMatchId || !winnerId || !loserId) {
      return apiError(ErrorCode.VALIDATION_ERROR, "tournamentMatchId, winnerId, and loserId are required", 422);
    }

    const result = await recordTournamentMatchResult(
      params.id,
      tournamentMatchId,
      winnerId,
      loserId,
      scoreWinner,
      scoreLoser
    );
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
