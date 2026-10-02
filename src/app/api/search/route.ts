// GET /api/search?q=<query>
import { NextRequest } from "next/server";
import { search } from "@/src/services/searchService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const results = await search(q);
    return apiSuccess(results);
  } catch (err) {
    return handleApiError(err);
  }
}
