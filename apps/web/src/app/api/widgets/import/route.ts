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

    if (!session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { repoFullName, repoUrl, branch = "main", name } = body;

    if (!repoFullName || !repoUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create widget record
    const widget = await prisma.widget.create({
      data: {
        userId: session.user.id,
        name: name || repoFullName.split("/")[1],
        repoFullName,
        repoUrl,
        branch,
        buildStatus: "pending",
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
