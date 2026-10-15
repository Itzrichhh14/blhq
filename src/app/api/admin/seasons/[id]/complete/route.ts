// POST /api/admin/seasons/[id]/complete
import { NextRequest } from "next/server";
import { completeSeason } from "@/src/services/seasonService";
import { requireAdmin } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin();
    const season = await completeSeason(params.id);
    return apiSuccess(season);
  } catch (err) {
    return handleApiError(err);
  }
}
