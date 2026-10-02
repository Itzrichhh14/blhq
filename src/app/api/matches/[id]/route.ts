// GET  /api/matches/[id]
// POST /api/matches/[id]/complete — complete a match (staff+)
// POST /api/matches/[id]/cancel  — cancel (staff+)
import { NextRequest } from "next/server";
import { getMatch, completeMatch, cancelMatch } from "@/src/services/matchService";
import { requireStaff } from "@/src/lib/session";
import { CompleteMatchSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const match = await getMatch(params.id);
    return apiSuccess(match);
  } catch (err) {
    return handleApiError(err);
  }
}
