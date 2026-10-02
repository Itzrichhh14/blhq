// POST /api/admin/news (staff+)
import { NextRequest } from "next/server";
import { createNewsArticle } from "@/src/services/adminService";
import { requireStaff } from "@/src/lib/session";
import { CreateNewsSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff();
    const body = await req.json();
    const parsed = CreateNewsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(ErrorCode.VALIDATION_ERROR, "Invalid article data", 422, parsed.error.flatten());
    }
    const article = await createNewsArticle(parsed.data, session.user.id);
    return apiSuccess(article, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
