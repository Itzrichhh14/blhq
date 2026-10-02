// GET  /api/admin/kage — history
// POST /api/admin/kage — appoint new Kage (admin+)
import { NextRequest } from "next/server";
import { appointKage, getCurrentKage, getKageHistory } from "@/src/services/adminService";
import { requireAdmin, getSession } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [current, history] = await Promise.all([
      getCurrentKage(),
      getKageHistory(),
    ]);
    return apiSuccess({ current, history });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { playerId, specialty, quote } = await req.json();
    const kage = await appointKage(playerId, session.user.id, { specialty, quote });
    return apiSuccess(kage, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
