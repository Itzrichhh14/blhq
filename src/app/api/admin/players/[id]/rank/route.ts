// POST /api/admin/players/[id]/rank
import { NextRequest } from "next/server";
import { adminSetRank } from "@/src/services/adminService";
import { requireAdmin } from "@/src/lib/session";
import { AdminRankChangeSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const parsed = AdminRankChangeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid rank data", 422, parsed.error.flatten());
    }
    await adminSetRank(params.id, session.user.id, parsed.data.tier, parsed.data.reason);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
