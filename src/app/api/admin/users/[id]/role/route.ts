// POST /api/admin/users/[id]/role  (owner only)
import { NextRequest } from "next/server";
import { changeUserRole } from "@/src/services/adminService";
import { requireOwner } from "@/src/lib/session";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";
import { UserRole } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireOwner();
    const body = await req.json();
    const role = body.role as UserRole;
    if (!Object.values(UserRole).includes(role)) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid role", 422);
    }
    await changeUserRole(params.id, session.user.id, role, body.note);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
