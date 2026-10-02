// ============================================================
// BLOODLINE — Global Search Service
// Returns categorized results across players, teams,
// tournaments, matches, and news.
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";

export interface SearchResults {
  query: string;
  players: SearchPlayer[];
  teams: SearchTeam[];
  tournaments: SearchTournament[];
  news: SearchNews[];
}

interface SearchPlayer {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  tier: string;
  rating: number;
}

interface SearchTeam {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface SearchTournament {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface SearchNews {
  id: string;
  title: string;
  slug: string;
  category: string;
  publishedAt: Date | null;
}

export async function search(query: string): Promise<SearchResults> {
  if (!query || query.trim().length < 2) {
    throw new AppError(
      ErrorCode.SEARCH_QUERY_TOO_SHORT,
      "Search query must be at least 2 characters",
      400
    );
  }

  const q = query.trim();

  const [players, teams, tournaments, news] = await Promise.all([
    prisma.player.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        tier: true,
        rating: true,
      },
      take: 10,
      orderBy: { rating: "desc" },
    }),

    prisma.team.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true, color: true },
      take: 5,
    }),

    prisma.tournament.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
        status: { not: "CANCELLED" },
      },
      select: { id: true, name: true, slug: true, status: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),

    prisma.news.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { excerpt: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        publishedAt: true,
      },
      take: 5,
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  return { query: q, players, teams, tournaments, news };
}
