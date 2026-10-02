// POST /api/notifications/[id]/read
import { NextRequest } from "next/server";
import { markRead } from "@/src/services/notificationService";
import { requireAuth } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    await markRead(params.id, session.user.id);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
