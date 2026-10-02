// ============================================================
// BLOODLINE — Challenge Service
//
// State machine:
//   PENDING → ACCEPTED → COMPLETED (match created & finalized)
//                      ↘ CANCELLED
//           ↘ DECLINED
//           ↘ EXPIRED   (set by a cleanup job or on-read)
//           ↘ CANCELLED (by challenger before response)
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import { ChallengeStatus, NotificationType } from "@prisma/client";
import { createMatch } from "@/src/services/matchService";
import { createNotification } from "@/src/services/notificationService";
import type { z } from "zod";
import type { CreateChallengeSchema, RespondChallengeSchema } from "@/src/schemas";

const CHALLENGE_EXPIRY_HOURS = 48;

// ============================================================
// createChallenge
// ============================================================
export async function createChallenge(
  challengerId: string, // player id of the challenger
  data: z.infer<typeof CreateChallengeSchema>
) {
  if (challengerId === data.challengedId) {
    throw new AppError(ErrorCode.SELF_CHALLENGE, "You cannot challenge yourself", 400);
  }

  // Validate both players exist
  const [challenger, challenged] = await Promise.all([
    prisma.player.findUnique({
      where: { id: challengerId },
      select: { id: true, userId: true, displayName: true, status: true },
    }),
    prisma.player.findUnique({
      where: { id: data.challengedId },
      select: { id: true, userId: true, displayName: true, status: true },
    }),
  ]);

  if (!challenger) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Challenger not found", 404);
  if (!challenged) throw new AppError(ErrorCode.PLAYER_NOT_FOUND, "Challenged player not found", 404);
  if (challenger.status !== "ACTIVE")
    throw new AppError(ErrorCode.PLAYER_SUSPENDED, "Your account is not active", 400);
  if (challenged.status !== "ACTIVE")
    throw new AppError(ErrorCode.CHALLENGE_NOT_ALLOWED, "That player is not active", 400);

  // Prevent duplicate pending challenges between the same pair
  const existing = await prisma.challenge.findFirst({
    where: {
      challengerId,
      challengedId: data.challengedId,
      status: ChallengeStatus.PENDING,
    },
  });
  if (existing) {
    throw new AppError(
      ErrorCode.PENDING_CHALLENGE_EXISTS,
      "You already have a pending challenge against this player",
      409
    );
  }

  const expiresAt = new Date(
    Date.now() + CHALLENGE_EXPIRY_HOURS * 60 * 60 * 1000
  );

  const challenge = await prisma.challenge.create({
    data: {
      challengerId,
      challengedId: data.challengedId,
      mapType: data.mapType,
      format: data.format,
      message: data.message,
      proposedDate: data.proposedDate ? new Date(data.proposedDate) : null,
      status: ChallengeStatus.PENDING,
      expiresAt,
    },
  });

  // Notify challenged player
  await createNotification({
    userId: challenged.userId,
    type: NotificationType.CHALLENGE_RECEIVED,
    title: "New Challenge!",
    message: `${challenger.displayName} has challenged you to a match${data.mapType ? ` on ${data.mapType}` : ""}.`,
    metadata: {
      challengeId: challenge.id,
      challengerId,
      challengerDisplayName: challenger.displayName,
      mapType: data.mapType ?? null,
    },
  });

  return challenge;
}

// ============================================================
// respondToChallenge
// ============================================================
export async function respondToChallenge(
  challengeId: string,
  respondingPlayerId: string, // must be the challenged player
  data: z.infer<typeof RespondChallengeSchema>
) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      challenger: { select: { id: true, userId: true, displayName: true } },
      challenged: { select: { id: true, userId: true, displayName: true } },
    },
  });

  if (!challenge)
    throw new AppError(ErrorCode.CHALLENGE_NOT_FOUND, "Challenge not found", 404);
  if (challenge.challengedId !== respondingPlayerId)
    throw new AppError(ErrorCode.FORBIDDEN, "Only the challenged player can respond", 403);
  if (challenge.status !== ChallengeStatus.PENDING)
    throw new AppError(
      ErrorCode.CHALLENGE_ALREADY_RESPONDED,
      "This challenge has already been responded to",
      409
    );

  // Check expiry
  if (challenge.expiresAt && challenge.expiresAt < new Date()) {
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: ChallengeStatus.EXPIRED },
    });
    throw new AppError(ErrorCode.CHALLENGE_NOT_FOUND, "This challenge has expired", 410);
  }

  const newStatus =
    data.response === "ACCEPTED"
      ? ChallengeStatus.ACCEPTED
      : ChallengeStatus.DECLINED;

  const updated = await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: newStatus, respondedAt: new Date() },
  });

  // Notify challenger of the decision
  await createNotification({
    userId: challenge.challenger.userId,
    type:
      newStatus === ChallengeStatus.ACCEPTED
        ? NotificationType.CHALLENGE_ACCEPTED
        : NotificationType.CHALLENGE_DECLINED,
    title:
      newStatus === ChallengeStatus.ACCEPTED
        ? "Challenge Accepted!"
        : "Challenge Declined",
    message:
      newStatus === ChallengeStatus.ACCEPTED
        ? `${challenge.challenged.displayName} accepted your challenge.`
        : `${challenge.challenged.displayName} declined your challenge.`,
    metadata: { challengeId },
  });

  // If accepted, automatically create a scheduled match
  let match = null;
  if (newStatus === ChallengeStatus.ACCEPTED) {
    match = await createMatch({
      player1Id: challenge.challengerId,
      player2Id: challenge.challengedId,
      mapType: challenge.mapType ?? undefined,
      format: challenge.format,
      scheduledAt: challenge.proposedDate?.toISOString(),
    });

    // Link match to challenge
    await prisma.match.update({
      where: { id: match.id },
      data: { challengeId },
    });
  }

  return { challenge: updated, match };
}

// ============================================================
// cancelChallenge — challenger can cancel a PENDING challenge
// ============================================================
export async function cancelChallenge(
  challengeId: string,
  requestingPlayerId: string
) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });
  if (!challenge)
    throw new AppError(ErrorCode.CHALLENGE_NOT_FOUND, "Challenge not found", 404);
  if (challenge.challengerId !== requestingPlayerId)
    throw new AppError(ErrorCode.FORBIDDEN, "Only the challenger can cancel", 403);
  if (challenge.status !== ChallengeStatus.PENDING)
    throw new AppError(
      ErrorCode.CHALLENGE_ALREADY_RESPONDED,
      "Challenge cannot be cancelled in its current state",
      409
    );

  return prisma.challenge.update({
    where: { id: challengeId },
    data: { status: ChallengeStatus.CANCELLED },
  });
}

// ============================================================
// getChallengeById
// ============================================================
export async function getChallengeById(id: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      challenger: {
        select: { id: true, username: true, displayName: true, avatar: true, tier: true, rating: true },
      },
      challenged: {
        select: { id: true, username: true, displayName: true, avatar: true, tier: true, rating: true },
      },
      match: { select: { id: true, status: true, completedAt: true } },
    },
  });
  if (!challenge)
    throw new AppError(ErrorCode.CHALLENGE_NOT_FOUND, "Challenge not found", 404);
  return challenge;
}

// ============================================================
// listChallengesForPlayer
// ============================================================
export async function listChallengesForPlayer(
  playerId: string,
  opts: {
    status?: ChallengeStatus;
    direction?: "sent" | "received" | "all";
    page?: number;
    pageSize?: number;
  }
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, opts.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  const directionFilter =
    opts.direction === "sent"
      ? { challengerId: playerId }
      : opts.direction === "received"
      ? { challengedId: playerId }
      : { OR: [{ challengerId: playerId }, { challengedId: playerId }] };

  const where = {
    ...directionFilter,
    ...(opts.status ? { status: opts.status } : {}),
  };

  const [challenges, total] = await Promise.all([
    prisma.challenge.findMany({
      where,
      include: {
        challenger: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        challenged: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        match: { select: { id: true, status: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.challenge.count({ where }),
  ]);

  return {
    items: challenges,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ============================================================
// expireStaleChallenge (utility — call from admin or cron)
// ============================================================
export async function expireStaleChallenges(): Promise<number> {
  const result = await prisma.challenge.updateMany({
    where: {
      status: ChallengeStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    data: { status: ChallengeStatus.EXPIRED },
  });
  return result.count;
}
