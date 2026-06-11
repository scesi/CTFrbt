import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/announcements — Create announcement
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: { title, content },
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("Announcement creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
