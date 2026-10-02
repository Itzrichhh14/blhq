// ============================================================
// BLOODLINE — NextAuth Configuration
// ============================================================
import { type NextAuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/prisma";
import { UserRole, UserStatus } from "@prisma/client";

// ============================================================
// Augment NextAuth session/token types
// ============================================================
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      playerId: string | null;
      status: UserStatus;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: UserRole;
    playerId: string | null;
    status: UserStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    playerId: string | null;
    status: UserStatus;
  }
}

// ============================================================
// Auth Options
// ============================================================
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("INVALID_CREDENTIALS");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { player: { select: { id: true } } },
        });

        if (!user) throw new Error("INVALID_CREDENTIALS");

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!passwordValid) throw new Error("INVALID_CREDENTIALS");

        if (user.status === UserStatus.BANNED) {
          throw new Error("PLAYER_SUSPENDED");
        }
        if (user.status === UserStatus.SUSPENDED) {
          throw new Error("PLAYER_SUSPENDED");
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
          playerId: user.player?.id ?? null,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.playerId = user.playerId;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.playerId = token.playerId;
        session.user.status = token.status;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
