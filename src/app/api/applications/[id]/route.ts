// GET   /api/applications/[id] (staff+)
// PATCH /api/applications/[id] — review (staff+)
import { NextRequest } from "next/server";
import { getApplicationById, reviewApplication } from "@/src/services/recruitmentService";
import { requireStaff } from "@/src/lib/session";
import { ReviewApplicationSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireStaff();
    const application = await getApplicationById(params.id);
    return apiSuccess(application);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireStaff();
    const body = await req.json();
    const parsed = ReviewApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid review data", 422, parsed.error.flatten());
    }
    const updated = await reviewApplication(params.id, session.user.id, parsed.data);
    return apiSuccess(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
