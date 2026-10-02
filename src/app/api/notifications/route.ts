// GET /api/notifications
import { NextRequest } from "next/server";
import { getNotifications } from "@/src/services/notificationService";
import { requireAuth } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = req.nextUrl;
    const result = await getNotifications(session.user.id, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
      unreadOnly: searchParams.get("unreadOnly") === "true",
    });
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
