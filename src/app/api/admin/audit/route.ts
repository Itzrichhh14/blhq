// GET /api/admin/audit (admin+)
import { NextRequest } from "next/server";
import { getAuditLogs } from "@/src/services/adminService";
import { requireAdmin } from "@/src/lib/session";
import { apiSuccess, handleApiError } from "@/src/utils/errors";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;
    const result = await getAuditLogs({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 50),
      action: (searchParams.get("action") as AuditAction) ?? undefined,
      performedById: searchParams.get("performedById") ?? undefined,
      targetUserId: searchParams.get("targetUserId") ?? undefined,
    });
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
