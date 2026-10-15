// GET /api/tournaments/[id]/bracket
import { NextRequest } from "next/server";
import { getBracket } from "@/src/services/tournamentService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const bracket = await getBracket(params.id);
    return apiSuccess(bracket);
  } catch (err) {
    return handleApiError(err);
  }
}
