// ============================================================
// BLOODLINE — Map Service
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import { MapType } from "@prisma/client";

export async function listMaps() {
  return prisma.gameMap.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function getMapByType(type: MapType) {
  const map = await prisma.gameMap.findUnique({ where: { type } });
  if (!map) throw new AppError(ErrorCode.NOT_FOUND, `Map ${type} not found`, 404);
  return map;
}

export async function getMapById(id: string) {
  const map = await prisma.gameMap.findUnique({ where: { id } });
  if (!map) throw new AppError(ErrorCode.NOT_FOUND, "Map not found", 404);
  return map;
}

/** Top players for a given map, sorted by wins */
export async function getMapLeaderboard(
  mapType: MapType,
  opts: { page?: number; pageSize?: number; minMatches?: number }
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, opts.pageSize ?? 20);
  const skip = (page - 1) * pageSize;
  const minMatches = opts.minMatches ?? 5;

  const map = await getMapByType(mapType);

  const [stats, total] = await Promise.all([
    prisma.playerMapStats.findMany({
      where: { mapId: map.id, matches: { gte: minMatches } },
      include: {
        player: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            tier: true,
            region: true,
          },
        },
      },
      orderBy: { wins: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.playerMapStats.count({
      where: { mapId: map.id, matches: { gte: minMatches } },
    }),
  ]);

  return {
    map,
    items: stats.map((s, i) => ({
      rank: skip + i + 1,
      player: s.player,
      wins: s.wins,
      losses: s.losses,
      matches: s.matches,
      winRate:
        s.matches > 0 ? Math.round((s.wins / s.matches) * 1000) / 10 : 0,
      rating: s.rating,
      bestStreak: s.bestStreak,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
