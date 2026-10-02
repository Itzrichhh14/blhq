// POST /api/admin/players/[id]/rating
import { NextRequest } from "next/server";
import { adminSetRating } from "@/src/services/adminService";
import { requireAdmin } from "@/src/lib/session";
import { AdminRatingChangeSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const parsed = AdminRatingChangeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid rating data", 422, parsed.error.flatten());
    }
    await adminSetRating(params.id, session.user.id, parsed.data.rating, parsed.data.reason);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
