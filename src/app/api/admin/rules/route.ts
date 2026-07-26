import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/rules - Get competition rules
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
      { status: 500 }
    );
  }
}

// POST /api/admin/rules - Update competition rules
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { rules } = body;

    if (typeof rules !== "string") {
      return NextResponse.json(
        { error: "Invalid format - rules must be a string" },
        { status: 400 }
      );
    }

    // Upsert the rules in SiteConfig
    const config = await prisma.siteConfig.upsert({
      where: { key: "rules" },
      update: { value: rules },
      create: { key: "rules", value: rules },
    });

    return NextResponse.json({ rules: config.value });
  } catch (error) {
    console.error("Error updating rules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
