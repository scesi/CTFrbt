import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rules - Public endpoint to get competition rules
export async function GET() {
  try {
    const rulesConfig = await prisma.siteConfig.findUnique({
      where: { key: "rules" },
    });

    return NextResponse.json({
      rules: rulesConfig?.value || "",
    });
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
