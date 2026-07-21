import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { alias, name, password } = body;

    // Validation
    if (!alias || !name || !password) {
      return NextResponse.json(
        { error: "Alias, name, and password are required" },
        { status: 400 }
      );
    }

    if (alias.length > 32) {
      return NextResponse.json(
        { error: "Alias must be 32 characters or less" },
        { status: 400 }
      );
    }

    if (name.length > 48) {
      return NextResponse.json(
        { error: "Name must be 48 characters or less" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if alias already exists
    const existingUser = await prisma.user.findUnique({
      where: { alias },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Alias is already taken" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        alias,
        name,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: { id: user.id, alias: user.alias, name: user.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
