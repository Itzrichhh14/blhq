// POST /api/admin/players/[id]/ban
// DELETE /api/admin/players/[id]/ban  (unban)
import { NextRequest } from "next/server";
import { banUser, unbanUser } from "@/src/services/adminService";
import { requireAdmin } from "@/src/lib/session";
import { prisma } from "@/src/lib/prisma";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

async function getUserIdFromPlayerId(playerId: string): Promise<string> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { userId: true },
  });
  if (!player) throw new Error("PLAYER_NOT_FOUND");
  return player.userId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    if (!body.reason) {
      return apiError(ErrorCode.VALIDATION_ERROR, "reason is required to ban a player", 422);
    }
    const userId = await getUserIdFromPlayerId(params.id);
    await banUser(userId, session.user.id, body.reason);
    return apiSuccess({ banned: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const userId = await getUserIdFromPlayerId(params.id);
    await unbanUser(userId, session.user.id);
    return apiSuccess({ unbanned: true });
  } catch (err) {
    return handleApiError(err);
  }
}
