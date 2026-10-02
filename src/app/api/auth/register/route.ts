// POST /api/auth/register
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/prisma";
import { RegisterSchema } from "@/src/schemas";
import { apiSuccess, apiError, handleApiError, ErrorCode } from "@/src/utils/errors";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "Invalid registration data",
        422,
        parsed.error.flatten()
      );
    }

    const { username, email, password, displayName } = parsed.data;
    const emailNorm = email.toLowerCase().trim();

    // Check uniqueness
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email: emailNorm } }),
      prisma.user.findUnique({ where: { username } }),
    ]);

    if (existingEmail) {
      return apiError(ErrorCode.EMAIL_TAKEN, "Email is already in use", 409);
    }
    if (existingUsername) {
      return apiError(ErrorCode.USERNAME_TAKEN, "Username is already taken", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + player in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email: emailNorm,
          passwordHash,
          role: UserRole.PLAYER,
        },
      });

      const player = await tx.player.create({
        data: {
          userId: user.id,
          username,
          displayName: displayName ?? username,
        },
      });

      return { user, player };
    });

    return apiSuccess(
      {
        userId: result.user.id,
        playerId: result.player.id,
        username: result.user.username,
        email: result.user.email,
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
