// GET /api/me/application
import { getMyApplication } from "@/src/services/recruitmentService";
import { requireAuth } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();
    const application = await getMyApplication(session.user.id);
    return apiSuccess(application);
  } catch (err) {
    return handleApiError(err);
  }
}
