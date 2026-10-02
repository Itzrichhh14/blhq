// POST /api/tournaments/[id]/participants — register self or player (staff+)
// DELETE /api/tournaments/[id]/participants?playerId= — remove (staff+)
import { NextRequest } from "next/server";
import { registerPlayer, removePlayer } from "@/src/services/tournamentService";
import { requireAuth, requireStaff } from "@/src/lib/session";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await req.json().catch(() => ({}));

    // Staff can register any player; players register themselves
    const isStaff = ["STAFF", "ADMIN", "OWNER"].includes(session.user.role);
    const playerId = isStaff && body.playerId ? body.playerId : session.user.playerId;

    if (!playerId) {
      return apiError(ErrorCode.PLAYER_NOT_FOUND, "No player profile found for this account", 400);
    }

    const participant = await registerPlayer(params.id, playerId);
    return apiSuccess(participant, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireStaff();
    const { searchParams } = req.nextUrl;
    const playerId = searchParams.get("playerId");
    if (!playerId) {
      return apiError(ErrorCode.BAD_REQUEST, "playerId is required", 400);
    }
    await removePlayer(params.id, playerId);
    return apiSuccess({ removed: true });
  } catch (err) {
    return handleApiError(err);
  }
}
