// POST /api/notifications/[id]/read
import { NextRequest } from "next/server";
import { markRead } from "@/src/services/notificationService";
import { requireAuth } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await requireAuth();
    await markRead(params.id, session.user.id);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
