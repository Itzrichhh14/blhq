// ============================================================
// BLOODLINE — Season Service
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import { SeasonStatus } from "@prisma/client";
import type { z } from "zod";
import type { CreateSeasonSchema } from "@/src/schemas";

export async function getActiveSeason() {
  return prisma.season.findFirst({
    where: { status: SeasonStatus.ACTIVE },
    orderBy: { number: "desc" },
  });
}

export async function getSeasonById(id: string) {
  const season = await prisma.season.findUnique({
    where: { id },
    include: {
      _count: { select: { matches: true, tournaments: true, playerStats: true } },
    },
  });
  if (!season) throw new AppError(ErrorCode.SEASON_NOT_FOUND, "Season not found", 404);
  return season;
}

export async function listSeasons() {
  return prisma.season.findMany({
    orderBy: { number: "desc" },
    include: {
      _count: { select: { matches: true, tournaments: true, playerStats: true } },
    },
  });
}

export async function createSeason(data: z.infer<typeof CreateSeasonSchema>) {
  // Ensure number is unique
  const existing = await prisma.season.findUnique({ where: { number: data.number } });
  if (existing)
    throw new AppError(ErrorCode.VALIDATION_ERROR, `Season number ${data.number} already exists`, 409);

  return prisma.season.create({
    data: {
      name: data.name,
      number: data.number,
      status: SeasonStatus.UPCOMING,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
}

export async function activateSeason(seasonId: string) {
  // Only one season can be ACTIVE at a time
  const current = await getActiveSeason();
  if (current && current.id !== seasonId) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Season "${current.name}" is already active. Complete it first.`,
      409
    );
  }

  return prisma.season.update({
    where: { id: seasonId },
    data: { status: SeasonStatus.ACTIVE, startDate: new Date() },
  });
}

export async function completeSeason(seasonId: string) {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new AppError(ErrorCode.SEASON_NOT_FOUND, "Season not found", 404);
  if (season.status !== SeasonStatus.ACTIVE)
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Only an active season can be completed", 400);

  // Snapshot final ranks before closing
  const { snapshotRankings } = await import("@/src/services/rankingService");
  await snapshotRankings(seasonId);

  return prisma.season.update({
    where: { id: seasonId },
    data: { status: SeasonStatus.COMPLETED, endDate: new Date() },
  });
}

export async function getSeasonLeaderboard(
  seasonId: string,
  opts: { page?: number; pageSize?: number }
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, opts.pageSize ?? 50);
  const skip = (page - 1) * pageSize;

  const [stats, total] = await Promise.all([
    prisma.seasonPlayerStats.findMany({
      where: { seasonId },
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
      orderBy: { rating: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.seasonPlayerStats.count({ where: { seasonId } }),
  ]);

  return {
    items: stats.map((s, i) => ({ rank: skip + i + 1, ...s })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
