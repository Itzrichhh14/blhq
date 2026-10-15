// POST /api/tournaments/[id]/result — record a tournament match result (staff+)
import { NextRequest } from "next/server";
import { recordTournamentMatchResult } from "@/src/services/tournamentService";
import { requireStaff } from "@/src/lib/session";
import { TournamentMatchResultSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireStaff();
    const body = await req.json();
    const parsed = TournamentMatchResultSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid tournament result", 422, parsed.error.flatten());
    }

    const result = await recordTournamentMatchResult(
      params.id,
      parsed.data.tournamentMatchId,
      parsed.data.winnerId,
      parsed.data.loserId,
      parsed.data.scoreWinner,
      parsed.data.scoreLoser
    );
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
