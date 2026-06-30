"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { TerminalProvider } from "@/lib/terminal/TerminalContext";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <TerminalProvider>{children}</TerminalProvider>
    </SessionProvider>
  );
}
