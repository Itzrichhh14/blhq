// GET  /api/applications (staff+)
// POST /api/applications (public)
import { NextRequest } from "next/server";
import { listApplications, submitApplication } from "@/src/services/recruitmentService";
import { requireStaff, getSession } from "@/src/lib/session";
import { CreateApplicationSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";
import { ApplicationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
    const { searchParams } = req.nextUrl;
    const result = await listApplications({
      status: (searchParams.get("status") as ApplicationStatus) ?? undefined,
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
    });
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid application data", 422, parsed.error.flatten());
    }
    // Optionally link to logged-in user
    const session = await getSession();
    const application = await submitApplication(parsed.data, session?.user.id);
    return apiSuccess(application, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
