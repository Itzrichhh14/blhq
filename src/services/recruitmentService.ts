// ============================================================
// BLOODLINE — Recruitment / Application Service
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { AppError, ErrorCode } from "@/src/utils/errors";
import { ApplicationStatus } from "@prisma/client";
import type { z } from "zod";
import type {
  CreateApplicationSchema,
  ReviewApplicationSchema,
} from "@/src/schemas";

// ============================================================
// submitApplication — public, no auth required
// ============================================================
export async function submitApplication(
  data: z.infer<typeof CreateApplicationSchema>,
  userId?: string
) {
  // One application per user (if logged in)
  if (userId) {
    const existing = await prisma.application.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new AppError(
        ErrorCode.APPLICATION_ALREADY_EXISTS,
        "You already have an application on file",
        409
      );
    }
  }

  return prisma.application.create({
    data: {
      userId: userId ?? null,
      username: data.username,
      discordTag: data.discordTag,
      region: data.region,
      ageBracket: data.ageBracket,
      mainMap: data.mainMap,
      experience: data.experience,
      currentRank: data.currentRank,
      competitiveHistory: data.competitiveHistory,
      whyBloodline: data.whyBloodline,
      clips: data.clips,
      status: ApplicationStatus.PENDING,
    },
  });
}

// ============================================================
// getApplicationById — staff only (includes private notes)
// ============================================================
export async function getApplicationById(id: string) {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app)
    throw new AppError(ErrorCode.APPLICATION_NOT_FOUND, "Application not found", 404);
  return app;
}

// ============================================================
// listApplications — staff only
// ============================================================
export async function listApplications(opts: {
  status?: ApplicationStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, opts.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  const where = opts.status ? { status: opts.status } : {};

  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      // Exclude private notes from list view — reviewers see them in detail
      select: {
        id: true,
        username: true,
        discordTag: true,
        region: true,
        ageBracket: true,
        mainMap: true,
        currentRank: true,
        status: true,
        reviewerId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.application.count({ where }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ============================================================
// reviewApplication — staff/admin only
// ============================================================
export async function reviewApplication(
  applicationId: string,
  reviewerUserId: string,
  data: z.infer<typeof ReviewApplicationSchema>
) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!app)
    throw new AppError(ErrorCode.APPLICATION_NOT_FOUND, "Application not found", 404);
  if (
    app.status === ApplicationStatus.ACCEPTED ||
    app.status === ApplicationStatus.DECLINED
  ) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Application is already finalized",
      409
    );
  }

  return prisma.application.update({
    where: { id: applicationId },
    data: {
      status: data.status as ApplicationStatus,
      reviewerId: reviewerUserId,
      notes: data.notes ?? null,
    },
  });
}

// ============================================================
// getMyApplication — for authenticated applicant
// Returns only non-sensitive fields to the applicant
// ============================================================
export async function getMyApplication(userId: string) {
  const app = await prisma.application.findUnique({
    where: { userId },
    select: {
      id: true,
      username: true,
      discordTag: true,
      region: true,
      ageBracket: true,
      mainMap: true,
      currentRank: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      // Deliberately exclude: notes, reviewerId
    },
  });
  if (!app)
    throw new AppError(ErrorCode.APPLICATION_NOT_FOUND, "No application found", 404);
  return app;
}
