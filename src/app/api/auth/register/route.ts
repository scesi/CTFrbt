import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { withBcryptSlot, BcryptBusyError } from "@/lib/bcrypt-limit";

const ALIAS_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { alias, name, password } = body;

    if (
      typeof alias !== "string" ||
      typeof name !== "string" ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { error: "Alias, name, and password are required" },
        { status: 400 },
      );
    }

    const trimmedAlias = alias.trim();
    const trimmedName = name.trim();

    if (!trimmedAlias || !trimmedName || !password) {
      return NextResponse.json(
        { error: "Alias, name, and password are required" },
        { status: 400 },
      );
    }

    if (!ALIAS_REGEX.test(trimmedAlias)) {
      return NextResponse.json(
        {
          error:
            "Alias must be 3-32 characters: letters, numbers, underscore, dot, or dash",
        },
        { status: 400 },
      );
    }

    if (trimmedName.length > 48) {
      return NextResponse.json(
        { error: "Name must be 48 characters or less" },
        { status: 400 },
      );
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must be between 6 and 128 characters" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { alias: trimmedAlias },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Alias is already taken" },
        { status: 409 },
      );
    }

    const hashedPassword = await withBcryptSlot(() =>
      bcrypt.hash(password, 12),
    );

    const user = await prisma.user.create({
      data: {
        alias: trimmedAlias,
        name: trimmedName,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: { id: user.id, alias: user.alias, name: user.name },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Alias is already taken" },
        { status: 409 },
      );
    }
    if (error instanceof BcryptBusyError) {
      return NextResponse.json(
        { error: "Server busy, please try again shortly" },
        { status: 503 },
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
