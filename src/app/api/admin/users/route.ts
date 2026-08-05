import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withBcryptSlot, BcryptBusyError } from "@/lib/bcrypt-limit";
import { validateNewUserCredentials } from "@/lib/credentials-validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        alias: true,
        name: true,
        isAdmin: true,
        isTeamLeader: true,
        createdAt: true,
        updatedAt: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            scores: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { alias, name, password, isAdmin, isTeamLeader } = body;

    const validation = validateNewUserCredentials({ alias, name, password });
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status },
      );
    }

    const trimmedAlias = (alias as string).trim();
    const trimmedName = (name as string).trim();

    const existingUser = await prisma.user.findUnique({
      where: { alias: trimmedAlias },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Alias already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await withBcryptSlot(() =>
      bcrypt.hash(password as string, 12),
    );

    const user = await prisma.user.create({
      data: {
        alias: trimmedAlias,
        name: trimmedName,
        password: hashedPassword,
        isAdmin: isAdmin || false,
        isTeamLeader: isTeamLeader || false,
      },
      select: {
        id: true,
        alias: true,
        name: true,
        isAdmin: true,
        isTeamLeader: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof BcryptBusyError) {
      return NextResponse.json(
        { error: "Server busy, please try again shortly" },
        { status: 503 },
      );
    }
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
