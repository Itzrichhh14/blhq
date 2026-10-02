// GET /api/maps
import { listMaps } from "@/src/services/mapService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const maps = await listMaps();
    return apiSuccess(maps);
  } catch (err) {
    return handleApiError(err);
  }
}
