// GET /api/tournaments/[id]/bracket
import { NextRequest } from "next/server";
import { getBracket } from "@/src/services/tournamentService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bracket = await getBracket(params.id);
    return apiSuccess(bracket);
  } catch (err) {
    return handleApiError(err);
  }
}
