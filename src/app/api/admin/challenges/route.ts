import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidate, CACHE_KEYS } from "@/lib/cache";
import { isValidChallengeLink, isValidPoints } from "@/lib/validation";
import { writeFile, mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import {
  MAX_UPLOAD_BYTES,
  sanitizeUploadName,
  uploadDirFor,
} from "@/lib/uploads";

// GET /api/admin/challenges — List all challenges (admin)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const challenges = await prisma.challenge.findMany({
    include: {
      flags: true,
      files: true,
      hints: true,
      unlockConditions: true,
      _count: {
        select: { submissions: { where: { isCorrect: true } } },
      },
    },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ challenges });
}

interface ChallengeCreateInput {
  title?: string;
  description?: string;
  points?: number;
  flag?: string;
  multipleFlags?: boolean;
  category?: string;
  difficulty?: string;
  isActive?: boolean;
  isLocked?: boolean;
  link?: string;
  solveExplanation?: string;
  flags?: Array<{ flag: string; points: number }>;
  hints?: Array<{ content: string; cost: number }>;
}

// POST /api/admin/challenges — Create a new challenge
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let body: ChallengeCreateInput;
    let upload: File | null = null;

    if (isMultipart) {
      const form = await request.formData();
      const field = (k: string): string | undefined => {
        const v = form.get(k);
        return typeof v === "string" && v.length > 0 ? v : undefined;
      };
      const pointsRaw = field("points");
      body = {
        title: field("title"),
        description: field("description"),
        points: pointsRaw !== undefined ? Number(pointsRaw) : undefined,
        flag: field("flag"),
        category: field("category"),
        difficulty: field("difficulty"),
        link: field("link"),
      };
      const f = form.get("file");
      if (f instanceof File) upload = f;
    } else {
      body = (await request.json()) as ChallengeCreateInput;
    }

    const {
      title,
      description,
      points,
      flag,
      multipleFlags,
      category,
      difficulty,
      isActive,
      isLocked,
      link,
      solveExplanation,
      flags,
      hints,
    } = body;

    if (
      !title ||
      !description ||
      points === undefined ||
      !category ||
      !difficulty
    ) {
      return NextResponse.json(
        {
          error:
            "title, description, points, category, and difficulty are required",
        },
        { status: 400 },
      );
    }

    if (!isValidPoints(points)) {
      return NextResponse.json(
        { error: "points must be a non-negative integer" },
        { status: 400 },
      );
    }

    if (
      (flags?.length &&
        !flags.every((f: { points: unknown }) => isValidPoints(f.points))) ||
      (hints?.length &&
        !hints.every((h: { cost: unknown }) => isValidPoints(h.cost)))
    ) {
      return NextResponse.json(
        { error: "flag points and hint costs must be non-negative integers" },
        { status: 400 },
      );
    }

    if (!isValidChallengeLink(link)) {
      return NextResponse.json(
        { error: "link must be an http(s) URL" },
        { status: 400 },
      );
    }

    const challenge = await prisma.challenge.create({
      data: {
        title,
        description,
        points: Number(points),
        flag: multipleFlags ? null : flag,
        multipleFlags: Boolean(multipleFlags),
        category,
        difficulty,
        isActive: isActive !== false,
        isLocked: Boolean(isLocked),
        link: link || null,
        solveExplanation: solveExplanation || null,
        flags:
          multipleFlags && flags?.length
            ? {
                create: flags.map((f: { flag: string; points: number }) => ({
                  flag: f.flag,
                  points: Number(f.points),
                })),
              }
            : undefined,
        hints: hints?.length
          ? {
              create: hints.map((h: { content: string; cost: number }) => ({
                content: h.content,
                cost: Number(h.cost),
              })),
            }
          : undefined,
      },
      include: { flags: true, hints: true },
    });

    if (upload) {
      if (upload.size > MAX_UPLOAD_BYTES) {
        await prisma.challenge.delete({ where: { id: challenge.id } });
        return NextResponse.json(
          { error: "File is too large (max 25 MB)" },
          { status: 400 },
        );
      }

      const dir = uploadDirFor(challenge.id);
      const cleanName = sanitizeUploadName(upload.name);
      let storedName = cleanName;
      const ext = path.extname(cleanName);
      const base = path.basename(cleanName, ext);
      let counter = 2;
      while (existsSync(path.join(dir, storedName))) {
        storedName = `${base}-${counter}${ext}`;
        counter += 1;
      }

      try {
        await mkdir(dir, { recursive: true });
        await writeFile(
          path.join(dir, storedName),
          Buffer.from(await upload.arrayBuffer()),
        );
        await prisma.challengeFile.create({
          data: {
            name: upload.name,
            path: `uploads/${challenge.id}/${storedName}`,
            size: upload.size,
            challengeId: challenge.id,
          },
        });
      } catch (uploadError) {
        await prisma.challenge
          .delete({ where: { id: challenge.id } })
          .catch(() => {});
        await rm(uploadDirFor(challenge.id), {
          recursive: true,
          force: true,
        }).catch(() => {});
        console.error("Challenge file upload error:", uploadError);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    }

    invalidate(CACHE_KEYS.CHALLENGES);
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error("Challenge creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
