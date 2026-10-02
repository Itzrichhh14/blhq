// GET /api/news/[slug]
import { NextRequest } from "next/server";
import { getNewsArticleBySlug } from "@/src/services/adminService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const article = await getNewsArticleBySlug(params.slug);
    return apiSuccess(article);
  } catch (err) {
    return handleApiError(err);
  }
}
