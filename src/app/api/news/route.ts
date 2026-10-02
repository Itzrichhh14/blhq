// GET /api/news
import { NextRequest } from "next/server";
import { listNewsArticles } from "@/src/services/adminService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const result = await listNewsArticles({
      category: searchParams.get("category") ?? undefined,
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
    });
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
