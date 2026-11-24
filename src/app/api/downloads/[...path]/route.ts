import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as download } from "@/app/api/files/[fileId]/route";

// Legacy /uploads URLs are rewritten here, never served as anonymous static files.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const file = await prisma.challengeFile.findFirst({
    where: { path: `uploads/${path.join("/")}` },
    select: { id: true },
  });
  if (!file)
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  return download(request, { params: Promise.resolve({ fileId: file.id }) });
}
