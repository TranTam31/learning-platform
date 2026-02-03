// app/api/widgets/import/route.ts

import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) throw new Error("Unauthorized");

    const body = await request.json();
    const { repoFullName, repoUrl, branch = "main", name } = body;

    if (!repoFullName || !repoUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const existingWidget = await prisma.widget.findFirst({
      where: {
        userId: session.user.id,
        repoFullName,
      },
    });

    if (existingWidget) {
      return NextResponse.json({
        success: true,
        widget: {
          id: existingWidget.id,
          name: existingWidget.name,
          repoFullName: existingWidget.repoFullName,
        },
        message: "Widget already exists for this repository",
      });
    }

    // Create widget
    const widget = await prisma.widget.create({
      data: {
        userId: session.user.id,
        name: name || repoFullName.split("/")[1],
        repoFullName,
        repoUrl,
        branch,
      },
    });

    return NextResponse.json({
      success: true,
      widget: {
        id: widget.id,
        name: widget.name,
        repoFullName: widget.repoFullName,
      },
    });
  } catch (error) {
    console.error("Import widget error:", error);
    return NextResponse.json(
      { error: "Failed to import widget" },
      { status: 500 },
    );
  }
}
