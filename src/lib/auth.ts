import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import crypto from "crypto";

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  if (!forwarded) {
    console.error("X-Forwarded-For header missing — check Nginx config");
    return `unknown-${crypto.randomUUID()}`;
  }
  return forwarded.split(",")[0].trim();
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        alias: { label: "Alias", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.alias || !credentials?.password) {
          return null;
        }

        const ip = await getClientIp();
        const minutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        // 1. IP Hard Lockout check
        const failedAttemptsByIp = await prisma.loginAttempt.count({
          where: {
            ip,
            success: false,
            createdAt: { gte: minutesAgo },
          },
        });

        if (failedAttemptsByIp >= 5) {
          throw new Error("Invalid credentials or too many attempts. Try again shortly.");
        }

        // 2. Alias Backoff check
        // Find last successful login for the alias
        const lastSuccess = await prisma.loginAttempt.findFirst({
          where: { alias: credentials.alias, success: true },
          orderBy: { createdAt: "desc" },
        });

        // Count failed attempts since the last success (or last 15 mins)
        const sinceDate =
          lastSuccess && lastSuccess.createdAt > minutesAgo
            ? lastSuccess.createdAt
            : minutesAgo;

        const failedAttemptsByAlias = await prisma.loginAttempt.count({
          where: {
            alias: credentials.alias,
            success: false,
            createdAt: { gte: sinceDate },
          },
        });

        // If backoff is active, check time since last failure
        if (failedAttemptsByAlias >= 3) {
          const lastFailed = await prisma.loginAttempt.findFirst({
            where: { alias: credentials.alias, success: false },
            orderBy: { createdAt: "desc" },
          });

          if (lastFailed) {
            const secondsPassed =
              (Date.now() - new Date(lastFailed.createdAt).getTime()) / 1000;
            let requiredDelay = 0;
            if (failedAttemptsByAlias === 3) requiredDelay = 5;
            else if (failedAttemptsByAlias === 4) requiredDelay = 30;
            else if (failedAttemptsByAlias >= 5) requiredDelay = 120;

            if (secondsPassed < requiredDelay) {
              throw new Error("Invalid credentials or too many attempts. Try again shortly.");
            }
          }
        }

        // 3. User verification
        const user = await prisma.user.findUnique({
          where: { alias: credentials.alias },
        });

        // Helper to run pruning probabilistically (2% chance)
        const runProbabilisticPruning = () => {
          if (Math.random() < 0.02) {
            prisma.loginAttempt
              .deleteMany({
                where: {
                  createdAt: {
                    lt: new Date(Date.now() - 48 * 60 * 60 * 1000),
                  },
                },
              })
              .catch((err) => console.error("Pruning attempts failed:", err));
          }
        };

        if (!user) {
          await prisma.loginAttempt.create({
            data: { ip, alias: credentials.alias, success: false },
          });
          runProbabilisticPruning();
          throw new Error("Invalid credentials or too many attempts. Try again shortly.");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          await prisma.loginAttempt.create({
            data: { ip, alias: credentials.alias, success: false },
          });
          runProbabilisticPruning();
          throw new Error("Invalid credentials or too many attempts. Try again shortly.");
        }

        // Log successful login
        await prisma.loginAttempt.create({
          data: { ip, alias: credentials.alias, success: true },
        });
        runProbabilisticPruning();

        return {
          id: user.id,
          alias: user.alias,
          name: user.name,
          isAdmin: user.isAdmin,
          teamId: user.teamId || undefined,
          isTeamLeader: user.isTeamLeader,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.alias = user.alias;
        token.isAdmin = user.isAdmin;
        token.teamId = user.teamId;
        token.isTeamLeader = user.isTeamLeader;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.alias = token.alias as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.teamId = token.teamId as string | undefined;
        session.user.isTeamLeader = token.isTeamLeader as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours — typical CTF duration
  },
};
