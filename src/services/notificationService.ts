// ============================================================
// BLOODLINE — Notification Service
// Persistent notifications — one place to create them all.
// ============================================================
import { prisma } from "@/src/lib/prisma";
import { NotificationType, Prisma } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  const metadata = (input.metadata ?? {}) as Prisma.InputJsonValue;

  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata,
    },
  });
}

export async function createNotificationBulk(
  inputs: CreateNotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;

  await prisma.notification.createMany({
    data: inputs.map((i) => ({
      userId: i.userId,
      type: i.type,
      title: i.title,
      message: i.message,
      metadata: (i.metadata ?? {}) as Prisma.InputJsonValue,
    })),
  });
}

export async function getNotifications(
  userId: string,
  opts: { page?: number; pageSize?: number; unreadOnly?: boolean }
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where = {
    userId,
    ...(opts.unreadOnly ? { read: false } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    items: notifications,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
