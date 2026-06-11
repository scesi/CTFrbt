import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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

        const user = await prisma.user.findUnique({
          where: { alias: credentials.alias },
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          return null;
        }

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
