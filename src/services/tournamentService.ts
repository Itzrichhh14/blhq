// ============================================================
// BLOODLINE — Tournament Service
//
// Supports DOUBLE_ELIMINATION (primary), SINGLE_ELIMINATION,
// ROUND_ROBIN as format options. Bracket data is stored as
// structured JSON in the Bracket table so the frontend can
// render it without any server-side bracket logic.
//
// Flow:
//   createTournament → (REGISTRATION)
//   registerPlayer   → adds TournamentParticipant
//   startTournament  → seeds & generates bracket → (LIVE)
//   recordResult     → advances bracket → if final: COMPLETED
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import {
  TournamentStatus,
  ParticipantStatus,
  MatchStatus,
  NotificationType,
} from "@prisma/client";
import { createNotificationBulk } from "@/src/services/notificationService";
import type { z } from "zod";
import type { CreateTournamentSchema } from "@/src/schemas";
import type { BracketData, BracketNode, BracketRound } from "@/src/types";

// ============================================================
// createTournament
// ============================================================
export async function createTournament(
  data: z.infer<typeof CreateTournamentSchema>,
  createdByUserId: string
) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  // Ensure unique slug
  const existing = await prisma.tournament.findUnique({ where: { slug } });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  return prisma.tournament.create({
    data: {
      name: data.name,
      slug: finalSlug,
      description: data.description,
      format: data.format,
      maxPlayers: data.maxPlayers,
      mapType: data.mapType,
      seasonId: data.seasonId,
      startDate: data.startDate ? new Date(data.startDate) : null,
      prizeInfo: data.prizeInfo,
      createdBy: createdByUserId,
      status: TournamentStatus.REGISTRATION,
    },
  });
}

// ============================================================
// getTournamentById
// ============================================================
export async function getTournamentById(id: string) {
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          player: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              tier: true,
              rating: true,
            },
          },
        },
        orderBy: { seed: "asc" },
      },
      matches: { orderBy: [{ round: "asc" }, { position: "asc" }] },
      bracket: true,
      season: { select: { id: true, name: true } },
      _count: { select: { participants: true } },
    },
  });
  if (!t) throw new AppError(ErrorCode.TOURNAMENT_NOT_FOUND, "Tournament not found", 404);
  return t;
}

// ============================================================
// listTournaments
// ============================================================
export async function listTournaments(opts: {
  status?: TournamentStatus;
  seasonId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, opts.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.seasonId ? { seasonId: opts.seasonId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      include: {
        _count: { select: { participants: true } },
        season: { select: { id: true, name: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.tournament.count({ where }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ============================================================
// registerPlayer
// ============================================================
export async function registerPlayer(
  tournamentId: string,
  playerId: string
) {
  const [tournament, player] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { participants: true } } },
    }),
    prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, userId: true, status: true },
    }),
  ]);

  if (!tournament)
    throw new AppError(ErrorCode.TOURNAMENT_NOT_FOUND, "Tournament not found", 404);
  if (!player)
    throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Player not found", 404);
  if (tournament.status !== TournamentStatus.REGISTRATION)
    throw new AppError(ErrorCode.REGISTRATION_CLOSED, "Registration is not open", 400);
  if (tournament._count.participants >= tournament.maxPlayers)
    throw new AppError(ErrorCode.TOURNAMENT_FULL, "Tournament is full", 409);

  const already = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId } },
  });
  if (already)
    throw new AppError(ErrorCode.ALREADY_REGISTERED, "Already registered", 409);

  return prisma.tournamentParticipant.create({
    data: { tournamentId, playerId, status: ParticipantStatus.REGISTERED },
  });
}

// ============================================================
// removePlayer (before tournament starts)
// ============================================================
export async function removePlayer(tournamentId: string, playerId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });
  if (!tournament)
    throw new AppError(ErrorCode.TOURNAMENT_NOT_FOUND, "Tournament not found", 404);
  if (tournament.status === TournamentStatus.LIVE || tournament.status === TournamentStatus.COMPLETED)
    throw new AppError(ErrorCode.INVALID_TOURNAMENT_STATE, "Cannot remove a player from a live tournament", 400);

  await prisma.tournamentParticipant.deleteMany({
    where: { tournamentId, playerId },
  });
}

// ============================================================
// startTournament — seeds players and generates bracket
// ============================================================
export async function startTournament(tournamentId: string) {
  const tournament = await getTournamentById(tournamentId);

  if (tournament.status !== TournamentStatus.REGISTRATION && tournament.status !== TournamentStatus.UPCOMING)
    throw new AppError(
      ErrorCode.INVALID_TOURNAMENT_STATE,
      "Tournament cannot be started in its current state",
      400
    );

  const participants = tournament.participants;
  if (participants.length < 2)
    throw new AppError(
      ErrorCode.INVALID_TOURNAMENT_STATE,
      "Need at least 2 participants to start",
      400
    );

  // Seed by rating (highest = seed 1)
  const sorted = [...participants].sort(
    (a, b) => (b.player.rating ?? 0) - (a.player.rating ?? 0)
  );

  // Assign seeds
  await Promise.all(
    sorted.map((p, i) =>
      prisma.tournamentParticipant.update({
        where: { id: p.id },
        data: { seed: i + 1, status: ParticipantStatus.ACTIVE },
      })
    )
  );

  // Generate bracket matches
  const playerIds = sorted.map((p) => p.playerId);
  let bracketData: BracketData;
  let tournamentMatches: Omit<
    Parameters<typeof prisma.tournamentMatch.create>[0]["data"],
    "id"
  >[];

  if (tournament.format === "DOUBLE_ELIMINATION") {
    ({ bracketData, tournamentMatches } = generateDoubleElimination(
      tournamentId,
      playerIds
    ));
  } else if (tournament.format === "ROUND_ROBIN") {
    ({ bracketData, tournamentMatches } = generateRoundRobin(
      tournamentId,
      playerIds
    ));
  } else {
    // SINGLE_ELIMINATION (default fallback)
    ({ bracketData, tournamentMatches } = generateSingleElimination(
      tournamentId,
      playerIds
    ));
  }

  await prisma.$transaction(async (tx) => {
    // Save all tournament matches
    for (const m of tournamentMatches) {
      await tx.tournamentMatch.create({ data: m as any });
    }

    // Save bracket snapshot
    await tx.bracket.upsert({
      where: { tournamentId },
      create: { tournamentId, data: bracketData as any },
      update: { data: bracketData as any, updatedAt: new Date() },
    });

    // Set tournament to LIVE
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.LIVE },
    });
  });

  // Notify all participants
  const userIds = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { userId: true },
  });
  await createNotificationBulk(
    userIds.map((u) => ({
      userId: u.userId,
      type: NotificationType.TOURNAMENT_UPDATE,
      title: "Tournament Started!",
      message: `${tournament.name} has started. Check your bracket!`,
      metadata: { tournamentId },
    }))
  );

  return getTournamentById(tournamentId);
}

// ============================================================
// recordTournamentMatchResult
// ============================================================
export async function recordTournamentMatchResult(
  tournamentId: string,
  tournamentMatchId: string,
  winnerId: string,
  loserId: string,
  scoreWinner?: number,
  scoreLoser?: number
) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true, format: true, name: true },
  });
  if (!tournament)
    throw new AppError(ErrorCode.TOURNAMENT_NOT_FOUND, "Tournament not found", 404);
  if (tournament.status !== TournamentStatus.LIVE)
    throw new AppError(ErrorCode.INVALID_TOURNAMENT_STATE, "Tournament is not live", 400);

  const tmatch = await prisma.tournamentMatch.findUnique({
    where: { id: tournamentMatchId },
  });
  if (!tmatch)
    throw new AppError(ErrorCode.NOT_FOUND, "Tournament match not found", 404);
  if (tmatch.status === MatchStatus.COMPLETED)
    throw new AppError(ErrorCode.MATCH_ALREADY_COMPLETED, "Match already completed", 409);
  if (tmatch.player1Id !== winnerId && tmatch.player2Id !== winnerId)
    throw new AppError(ErrorCode.INVALID_MATCH_RESULT, "Winner is not in this match", 400);

  // Create real Match record
  const { createMatch, completeMatch } = await import("@/src/services/matchService");
  const match = await createMatch({
    player1Id: winnerId,
    player2Id: loserId,
    format: "TOURNAMENT",
  });
  await completeMatch(match.id, { winnerId, loserId, scoreWinner, scoreLoser });

  // Update tournament match
  await prisma.tournamentMatch.update({
    where: { id: tournamentMatchId },
    data: {
      winnerId,
      status: MatchStatus.COMPLETED,
      completedAt: new Date(),
    },
  });

  // Update loser participant status based on format
  if (tournament.format === "SINGLE_ELIMINATION") {
    await prisma.tournamentParticipant.updateMany({
      where: { tournamentId, playerId: loserId },
      data: { status: ParticipantStatus.ELIMINATED },
    });
  } else if (tournament.format === "DOUBLE_ELIMINATION") {
    const loserParticipant = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_playerId: { tournamentId, playerId: loserId } },
    });
    if (loserParticipant?.status === ParticipantStatus.ACTIVE) {
      // First loss — move to losers bracket (stay ACTIVE)
      // Already handled by bracket generation; no status change needed
    } else {
      // Already in losers bracket and lost again — eliminated
      await prisma.tournamentParticipant.updateMany({
        where: { tournamentId, playerId: loserId },
        data: { status: ParticipantStatus.ELIMINATED },
      });
    }
  }

  // Advance bracket and check for tournament completion
  const isComplete = await advanceBracket(tournamentId, tournamentMatchId, winnerId, loserId);

  if (isComplete) {
    // Mark winner
    await prisma.tournamentParticipant.updateMany({
      where: { tournamentId, playerId: winnerId },
      data: { status: ParticipantStatus.WINNER },
    });

    // Update player tournament win count
    await prisma.player.update({
      where: { id: winnerId },
      data: { tournamentWins: { increment: 1 } },
    });

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.COMPLETED, endDate: new Date() },
    });

    // Fire achievement check for winner
    const { evaluateAndUnlock } = await import("@/src/services/achievementService");
    await evaluateAndUnlock(winnerId);

    // Notify winner
    const winnerPlayer = await prisma.player.findUnique({
      where: { id: winnerId },
      select: { userId: true, displayName: true },
    });
    if (winnerPlayer) {
      await createNotificationBulk([{
        userId: winnerPlayer.userId,
        type: NotificationType.TOURNAMENT_UPDATE,
        title: "Tournament Champion!",
        message: `You won ${tournament.name}! Congratulations, Champion.`,
        metadata: { tournamentId },
      }]);
    }
  }

  return { matchId: match.id, tournamentComplete: isComplete };
}

// ============================================================
// getBracket
// ============================================================
export async function getBracket(tournamentId: string): Promise<BracketData> {
  const bracket = await prisma.bracket.findUnique({ where: { tournamentId } });
  if (!bracket)
    throw new AppError(ErrorCode.BRACKET_NOT_GENERATED, "Bracket not yet generated", 404);

  // Enrich with latest match statuses from DB
  const tMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    include: {
      map: { select: { type: true, name: true } },
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });

  const matchMap = new Map(tMatches.map((m) => [m.id, m]));
  const data = bracket.data as unknown as BracketData;

  // Update node statuses from live DB data
  const enriched: BracketData = {
    ...data,
    rounds: data.rounds.map((r) => ({
      ...r,
      matches: r.matches.map((node) => {
        const live = matchMap.get(node.id);
        if (!live) return node;
        return {
          ...node,
          player1Id: live.player1Id,
          player2Id: live.player2Id,
          winnerId: live.winnerId,
          status: live.status,
        };
      }),
    })),
  };

  return enriched;
}

// ============================================================
// cancelTournament
// ============================================================
export async function cancelTournament(tournamentId: string, reason?: string) {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });
  if (!t) throw new AppError(ErrorCode.TOURNAMENT_NOT_FOUND, "Tournament not found", 404);
  if (t.status === TournamentStatus.COMPLETED)
    throw new AppError(ErrorCode.INVALID_TOURNAMENT_STATE, "Cannot cancel a completed tournament", 400);

  return prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: TournamentStatus.CANCELLED,
      ...(reason ? { description: reason } : {}),
    },
  });
}

// ============================================================
// ──────────────────────────────────────────────────────────
// BRACKET GENERATORS
// ──────────────────────────────────────────────────────────
// ============================================================

interface BracketGenResult {
  bracketData: BracketData;
  tournamentMatches: Array<{
    tournamentId: string;
    round: number;
    position: number;
    bracketSide: string;
    player1Id: string | null;
    player2Id: string | null;
    status: MatchStatus;
  }>;
}

// ── Single Elimination ─────────────────────────────────────

function generateSingleElimination(
  tournamentId: string,
  playerIds: string[]
): BracketGenResult {
  const n = nextPowerOf2(playerIds.length);
  const seeded = padWithByes(playerIds, n);
  const rounds: BracketRound[] = [];
  const tournamentMatches: BracketGenResult["tournamentMatches"] = [];

  let currentRound = seeded;
  let roundNum = 1;

  while (currentRound.length > 1) {
    const matches: BracketNode[] = [];
    const nextRound: (string | null)[] = [];

    for (let i = 0; i < currentRound.length; i += 2) {
      const p1 = currentRound[i];
      const p2 = currentRound[i + 1];
      const pos = i / 2;
      const nodeId = `se-r${roundNum}-p${pos}`;

      // Auto-advance byes
      if (p1 === null || p2 === null) {
        const advancing = p1 ?? p2;
        nextRound.push(advancing);
        continue;
      }

      matches.push({
        id: nodeId,
        round: roundNum,
        position: pos,
        bracketSide: "winners",
        player1Id: p1,
        player1Username: null,
        player2Id: p2,
        player2Username: null,
        winnerId: null,
        status: MatchStatus.SCHEDULED,
      });
      tournamentMatches.push({
        tournamentId,
        round: roundNum,
        position: pos,
        bracketSide: "winners",
        player1Id: p1,
        player2Id: p2,
        status: MatchStatus.SCHEDULED,
      });
      nextRound.push(null); // winner TBD
    }

    if (matches.length > 0) {
      rounds.push({ round: roundNum, side: "winners", matches });
    }
    currentRound = nextRound;
    roundNum++;
  }

  return {
    bracketData: { tournamentId, format: "SINGLE_ELIMINATION", rounds },
    tournamentMatches,
  };
}

// ── Double Elimination ────────────────────────────────────

function generateDoubleElimination(
  tournamentId: string,
  playerIds: string[]
): BracketGenResult {
  const n = nextPowerOf2(playerIds.length);
  const seeded = padWithByes(playerIds, n);
  const rounds: BracketRound[] = [];
  const tournamentMatches: BracketGenResult["tournamentMatches"] = [];

  // Winners bracket — identical to single elim first rounds
  let winnersQueue = seeded;
  let wRound = 1;
  const losersFeeder: Array<{ round: number; position: number }> = [];

  while (winnersQueue.length > 1) {
    const matches: BracketNode[] = [];
    const next: (string | null)[] = [];

    for (let i = 0; i < winnersQueue.length; i += 2) {
      const p1 = winnersQueue[i];
      const p2 = winnersQueue[i + 1];
      const pos = i / 2;
      const nodeId = `we-r${wRound}-p${pos}`;

      if (p1 === null || p2 === null) {
        next.push(p1 ?? p2);
        continue;
      }

      matches.push({
        id: nodeId,
        round: wRound,
        position: pos,
        bracketSide: "winners",
        player1Id: p1,
        player1Username: null,
        player2Id: p2,
        player2Username: null,
        winnerId: null,
        status: MatchStatus.SCHEDULED,
      });
      tournamentMatches.push({
        tournamentId,
        round: wRound,
        position: pos,
        bracketSide: "winners",
        player1Id: p1,
        player2Id: p2,
        status: MatchStatus.SCHEDULED,
      });
      losersFeeder.push({ round: wRound, position: pos });
      next.push(null);
    }

    if (matches.length > 0) {
      rounds.push({ round: wRound, side: "winners", matches });
    }
    winnersQueue = next;
    wRound++;
  }

  // Losers bracket — simplified: one round of losers matches per winners round
  const numLosersRounds = Math.max(1, Math.ceil(Math.log2(n)) - 1);
  for (let lr = 1; lr <= numLosersRounds; lr++) {
    const lMatches: BracketNode[] = [];
    const feedersForThisRound = losersFeeder.filter((f) => f.round === lr);

    for (let i = 0; i < feedersForThisRound.length; i += 2) {
      const pos = i / 2;
      const nodeId = `le-r${lr}-p${pos}`;
      lMatches.push({
        id: nodeId,
        round: lr,
        position: pos,
        bracketSide: "losers",
        player1Id: null, // TBD — populated when winners bracket losers are known
        player1Username: null,
        player2Id: null,
        player2Username: null,
        winnerId: null,
        status: MatchStatus.SCHEDULED,
      });
      tournamentMatches.push({
        tournamentId,
        round: lr,
        position: pos,
        bracketSide: "losers",
        player1Id: null,
        player2Id: null,
        status: MatchStatus.SCHEDULED,
      });
    }
    if (lMatches.length > 0) {
      rounds.push({ round: lr, side: "losers", matches: lMatches });
    }
  }

  // Grand Finals
  const gfId = `gf-r1-p0`;
  rounds.push({
    round: 1,
    side: "grand_finals",
    matches: [
      {
        id: gfId,
        round: 1,
        position: 0,
        bracketSide: "grand_finals",
        player1Id: null,
        player1Username: null,
        player2Id: null,
        player2Username: null,
        winnerId: null,
        status: MatchStatus.SCHEDULED,
      },
    ],
  });
  tournamentMatches.push({
    tournamentId,
    round: 1,
    position: 0,
    bracketSide: "grand_finals",
    player1Id: null,
    player2Id: null,
    status: MatchStatus.SCHEDULED,
  });

  return {
    bracketData: { tournamentId, format: "DOUBLE_ELIMINATION", rounds },
    tournamentMatches,
  };
}

// ── Round Robin ────────────────────────────────────────────

function generateRoundRobin(
  tournamentId: string,
  playerIds: string[]
): BracketGenResult {
  const players = [...playerIds];
  if (players.length % 2 !== 0) players.push(null as any); // bye

  const n = players.length;
  const rounds: BracketRound[] = [];
  const tournamentMatches: BracketGenResult["tournamentMatches"] = [];

  for (let r = 0; r < n - 1; r++) {
    const matches: BracketNode[] = [];
    for (let i = 0; i < n / 2; i++) {
      const p1 = players[i];
      const p2 = players[n - 1 - i];
      if (p1 === null || p2 === null) continue;
      const pos = i;
      const nodeId = `rr-r${r + 1}-p${pos}`;
      matches.push({
        id: nodeId,
        round: r + 1,
        position: pos,
        bracketSide: "round_robin",
        player1Id: p1,
        player1Username: null,
        player2Id: p2,
        player2Username: null,
        winnerId: null,
        status: MatchStatus.SCHEDULED,
      });
      tournamentMatches.push({
        tournamentId,
        round: r + 1,
        position: pos,
        bracketSide: "round_robin",
        player1Id: p1,
        player2Id: p2,
        status: MatchStatus.SCHEDULED,
      });
    }
    if (matches.length > 0) {
      rounds.push({ round: r + 1, side: "round_robin", matches });
    }

    // Rotate players (keep first fixed)
    players.splice(1, 0, players.pop()!);
  }

  return {
    bracketData: { tournamentId, format: "ROUND_ROBIN", rounds },
    tournamentMatches,
  };
}

// ============================================================
// advanceBracket — called after each match result
// Returns true if tournament is now complete
// ============================================================
async function advanceBracket(
  tournamentId: string,
  completedMatchId: string,
  winnerId: string,
  loserId: string
): Promise<boolean> {
  const bracket = await prisma.bracket.findUnique({ where: { tournamentId } });
  if (!bracket) return false;

  const data = bracket.data as unknown as BracketData;
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { format: true },
  });

  // Update node in bracket data
  let updated = false;
  for (const round of data.rounds) {
    for (const node of round.matches) {
      if (
        node.id === completedMatchId ||
        (node.player1Id === winnerId || node.player1Id === loserId) &&
        (node.player2Id === winnerId || node.player2Id === loserId) &&
        node.status !== MatchStatus.COMPLETED
      ) {
        node.winnerId = winnerId;
        node.status = MatchStatus.COMPLETED;
        updated = true;
        break;
      }
    }
    if (updated) break;
  }

  if (updated) {
    await prisma.bracket.update({
      where: { tournamentId },
      data: { data: data as any, updatedAt: new Date() },
    });
  }

  // Check if all non-grand-finals matches are complete
  const pendingMatches = await prisma.tournamentMatch.count({
    where: {
      tournamentId,
      status: { not: MatchStatus.COMPLETED },
      bracketSide: { not: "grand_finals" },
      player1Id: { not: null },
      player2Id: { not: null },
    },
  });

  // Also check grand finals
  const grandFinals = await prisma.tournamentMatch.findFirst({
    where: { tournamentId, bracketSide: "grand_finals" },
  });

  if (tournament?.format === "ROUND_ROBIN") {
    // Round robin is complete when all matches are done
    const remaining = await prisma.tournamentMatch.count({
      where: { tournamentId, status: { not: MatchStatus.COMPLETED } },
    });
    return remaining === 0;
  }

  // For elimination formats: complete when grand finals has a winner
  return grandFinals?.status === MatchStatus.COMPLETED;
}

// ============================================================
// Utility functions
// ============================================================

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function padWithByes(
  players: string[],
  targetSize: number
): (string | null)[] {
  const result: (string | null)[] = [...players];
  while (result.length < targetSize) result.push(null);
  return result;
}
