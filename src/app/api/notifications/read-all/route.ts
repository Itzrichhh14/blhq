// POST /api/notifications/read-all
import { markAllRead } from "@/src/services/notificationService";
import { requireAuth } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function POST() {
  try {
    const session = await requireAuth();
    await markAllRead(session.user.id);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
