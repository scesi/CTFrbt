import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rules — Get rules from site config
export async function GET() {
  const config = await prisma.siteConfig.findUnique({
    where: { key: "rules" },
  });

  return NextResponse.json({
    rules: config?.value || "No rules have been configured yet.",
  });
}
