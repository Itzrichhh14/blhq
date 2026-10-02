// GET /api/admin/stats (staff+)
import { getAdminStats } from "@/src/services/adminService";
import { requireStaff } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
    const stats = await getAdminStats();
    return apiSuccess(stats);
  } catch (err) {
    return handleApiError(err);
  }
}
