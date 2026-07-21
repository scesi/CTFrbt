import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 2000;

// POST /api/admin/announcements — Create announcement
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, content } = body;

    if (
      typeof title !== "string" ||
      typeof content !== "string" ||
      !title.trim() ||
      !content.trim()
    ) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 },
      );
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `Title cannot exceed ${MAX_TITLE_LENGTH} characters` },
        { status: 400 },
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content cannot exceed ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 },
      );
    }

    const announcement = await prisma.announcement.create({
      data: { title: title.trim(), content: content.trim() },
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("Announcement creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
