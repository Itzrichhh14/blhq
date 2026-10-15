// POST /api/admin/seasons/[id]/activate
import { NextRequest } from "next/server";
import { activateSeason } from "@/src/services/seasonService";
import { requireAdmin } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin();
    const season = await activateSeason(params.id);
    return apiSuccess(season);
  } catch (err) {
    return handleApiError(err);
  }
}
