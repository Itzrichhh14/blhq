// GET /api/achievements — list all achievements
import { listAchievements } from "@/src/services/achievementService";
import { apiSuccess, handleApiError } from "@/src/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const achievements = await listAchievements();
    return apiSuccess(achievements);
  } catch (err) {
    return handleApiError(err);
  }
}
