// ============================================================
// BLOODLINE — Team / Division Service
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import type { z } from "zod";
import type { CreateTeamSchema } from "@/src/schemas";

// ============================================================
// listTeams
// ============================================================
export async function listTeams() {
  const teams = await prisma.team.findMany({
    include: {
      _count: { select: { players: true } },
      achievements: { orderBy: { awardedAt: "desc" }, take: 3 },
    },
    orderBy: { name: "asc" },
  });

  // Compute aggregate team rating from member ratings
  const teamIds = teams.map((t) => t.id);
  const playerStats = await prisma.player.groupBy({
    by: ["teamId"],
    where: { teamId: { in: teamIds }, status: "ACTIVE" },
    _avg: { rating: true },
    _sum: { wins: true, losses: true, tournamentWins: true },
  });
  const statsMap = new Map(
    playerStats.map((s) => [s.teamId, s])
  );

  return teams.map((t) => {
    const stats = statsMap.get(t.id);
    return {
      ...t,
      memberCount: t._count.players,
      avgRating: stats ? Math.round(stats._avg.rating ?? 0) : 0,
      totalWins: stats?._sum.wins ?? 0,
      totalLosses: stats?._sum.losses ?? 0,
      totalTournamentWins: stats?._sum.tournamentWins ?? 0,
    };
  });
}

// ============================================================
// getTeamById
// ============================================================
export async function getTeamById(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      players: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          tier: true,
          rating: true,
          wins: true,
          losses: true,
          totalMatches: true,
          region: true,
        },
        orderBy: { rating: "desc" },
      },
      achievements: { orderBy: { awardedAt: "desc" } },
    },
  });
  if (!team) throw new AppError(ErrorCode.TEAM_NOT_FOUND, "Team not found", 404);

  const totalMatches = team.players.reduce((sum, p) => sum + p.totalMatches, 0);
  const totalWins = team.players.reduce((sum, p) => sum + p.wins, 0);
  const avgRating =
    team.players.length > 0
      ? Math.round(
          team.players.reduce((sum, p) => sum + p.rating, 0) / team.players.length
        )
      : 0;

  return { ...team, totalMatches, totalWins, avgRating };
}

// ============================================================
// getTeamBySlug
// ============================================================
export async function getTeamBySlug(slug: string) {
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) throw new AppError(ErrorCode.TEAM_NOT_FOUND, "Team not found", 404);
  return getTeamById(team.id);
}

// ============================================================
// createTeam  (admin / owner)
// ============================================================
export async function createTeam(data: z.infer<typeof CreateTeamSchema>) {
  const [nameConflict, slugConflict] = await Promise.all([
    prisma.team.findUnique({ where: { name: data.name } }),
    prisma.team.findUnique({ where: { slug: data.slug } }),
  ]);
  if (nameConflict)
    throw new AppError(ErrorCode.VALIDATION_ERROR, "A team with that name already exists", 409);
  if (slugConflict)
    throw new AppError(ErrorCode.VALIDATION_ERROR, "A team with that slug already exists", 409);

  return prisma.team.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      color: data.color,
    },
  });
}

// ============================================================
// assignPlayerToTeam
// ============================================================
export async function assignPlayerToTeam(
  playerId: string,
  teamId: string | null
) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  if (teamId !== null) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new AppError(ErrorCode.TEAM_NOT_FOUND, "Team not found", 404);
  }

  return prisma.player.update({
    where: { id: playerId },
    data: { teamId },
    select: { id: true, username: true, teamId: true },
  });
}

// ============================================================
// setTeamLeader
// ============================================================
export async function setTeamLeader(teamId: string, playerId: string) {
  const [team, player] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.player.findUnique({ where: { id: playerId } }),
  ]);
  if (!team) throw new AppError(ErrorCode.TEAM_NOT_FOUND, "Team not found", 404);
  if (!player) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);

  return prisma.team.update({
    where: { id: teamId },
    data: { leaderId: playerId },
  });
}

// ============================================================
// addTeamAchievement
// ============================================================
export async function addTeamAchievement(
  teamId: string,
  title: string,
  description?: string
) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(ErrorCode.TEAM_NOT_FOUND, "Team not found", 404);

  return prisma.teamAchievement.create({
    data: { teamId, title, description },
  });
}
