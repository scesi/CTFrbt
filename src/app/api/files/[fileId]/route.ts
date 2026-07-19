import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isChallengeUnlockedForTeam } from "@/lib/unlock";
import { readFile } from "fs/promises";
import path from "path";

// Keep only characters that are safe inside a quoted Content-Disposition
// filename — strips quotes, CR/LF, and other header-breaking bytes.
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._ -]/g, "_");
  return cleaned || "download";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;

  const file = await prisma.challengeFile.findUnique({
    where: { id: fileId },
    include: { challenge: true },
  });

  if (!file || !file.challenge.isActive) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const isAdmin = session.user.isAdmin === true;

  // Enforce challenge lock state (admin exempt)
  if (!isAdmin) {
    const unlocked = await isChallengeUnlockedForTeam(
      file.challenge.id,
      file.challenge.isLocked,
      session.user.teamId,
    );

    if (!unlocked) {
      return NextResponse.json(
        { error: "Challenge is locked" },
        { status: 403 },
      );
    }
  }

  try {
    // Resolve the public directory and the requested file path
    const publicDir = path.resolve(process.cwd(), "public");
    const filePath = path.resolve(publicDir, file.path);

    // Guard against path traversal: ensure the resolved path stays within public/
    if (!filePath.startsWith(publicDir + path.sep)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(file.name)}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not accessible" }, { status: 500 });
  }
}
