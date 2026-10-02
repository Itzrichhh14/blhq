// GET  /api/teams
// POST /api/teams (admin+)
import { NextRequest } from "next/server";
import { listTeams, createTeam } from "@/src/services/teamService";
import { requireAdmin } from "@/src/lib/session";
import { CreateTeamSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function GET() {
  try {
    const teams = await listTeams();
    return apiSuccess(teams);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = CreateTeamSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid team data", 422, parsed.error.flatten());
    }
    const team = await createTeam(parsed.data);
    return apiSuccess(team, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
