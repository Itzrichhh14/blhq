// GET /api/teams/[id]
import { NextRequest } from "next/server";
import { getTeamById } from "@/src/services/teamService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const team = await getTeamById(params.id);
    return apiSuccess(team);
  } catch (err) {
    return handleApiError(err);
  }
}
