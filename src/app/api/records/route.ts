// GET /api/records
import { getRecords } from "@/src/services/rankingService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export async function GET() {
  try {
    const records = await getRecords();
    return apiSuccess(records);
  } catch (err) {
    return handleApiError(err);
  }
}
