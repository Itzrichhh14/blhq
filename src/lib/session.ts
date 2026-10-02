// ============================================================
// BLOODLINE — Server-side session helpers
// Use in API routes and server components
// ============================================================
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { AppError } from "@/src/utils/errors";
import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

export type AuthSession = NonNullable<Session>;

/**
 * Get the current session. Returns null if unauthenticated.
 */
export async function getSession(): Promise<AuthSession | null> {
  return getServerSession(authOptions) as Promise<AuthSession | null>;
}

/**
 * Require an authenticated session. Throws UNAUTHORIZED if missing.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session?.user) {
    throw AppError.unauthorized();
  }
  return session;
}

/**
 * Require a specific role or higher.
 * Role hierarchy: PLAYER < STAFF < ADMIN < OWNER
 */
const ROLE_ORDER: Record<UserRole, number> = {
  PLAYER: 0,
  STAFF: 1,
  ADMIN: 2,
  OWNER: 3,
};

export async function requireRole(minRole: UserRole): Promise<AuthSession> {
  const session = await requireAuth();
  const userRank = ROLE_ORDER[session.user.role];
  const requiredRank = ROLE_ORDER[minRole];
  if (userRank < requiredRank) {
    throw AppError.forbidden();
  }
  return session;
}

export async function requireStaff(): Promise<AuthSession> {
  return requireRole(UserRole.STAFF);
}

export async function requireAdmin(): Promise<AuthSession> {
  return requireRole(UserRole.ADMIN);
}

export async function requireOwner(): Promise<AuthSession> {
  return requireRole(UserRole.OWNER);
}

/**
 * Require the caller owns the resource OR has staff+ role.
 */
export async function requireOwnerOrStaff(
  ownerId: string
): Promise<AuthSession> {
  const session = await requireAuth();
  const isOwner = session.user.id === ownerId;
  const isStaff = ROLE_ORDER[session.user.role] >= ROLE_ORDER[UserRole.STAFF];
  if (!isOwner && !isStaff) {
    throw AppError.forbidden();
  }
  return session;
}

export function isAtLeast(role: UserRole, minRole: UserRole): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[minRole];
}
