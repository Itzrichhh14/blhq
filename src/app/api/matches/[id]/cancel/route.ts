// POST /api/matches/[id]/cancel
import { NextRequest } from "next/server";
import { cancelMatch } from "@/src/services/matchService";
import { requireStaff } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireStaff();
    const body = await req.json().catch(() => ({}));
    const result = await cancelMatch(params.id, body.reason);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
