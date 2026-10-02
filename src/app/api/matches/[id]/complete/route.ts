// POST /api/matches/[id]/complete
import { NextRequest } from "next/server";
import { completeMatch } from "@/src/services/matchService";
import { requireStaff } from "@/src/lib/session";
import { CompleteMatchSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireStaff();
    const body = await req.json();
    const parsed = CompleteMatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid match result data", 422, parsed.error.flatten());
    }
    const result = await completeMatch(params.id, parsed.data);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
