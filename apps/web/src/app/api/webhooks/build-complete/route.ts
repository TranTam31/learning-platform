// app/api/webhooks/build-complete/route.ts

import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse payload
    const body = await request.json();
    const { build_id, status, run_id } = body;

    console.log("Build webhook received:", { build_id, status, run_id });

    // Get build to calculate duration
    const build = await prisma.widgetBuild.findUnique({
      where: { id: build_id },
    });

    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    // Calculate duration
    let duration = null;
    if (build.startedAt) {
      duration = Math.floor(
        (new Date().getTime() - build.startedAt.getTime()) / 1000,
      );
    }

    // Update build
    await prisma.widgetBuild.update({
      where: { id: build_id },
      data: {
        status: status,
        completedAt: new Date(),
        duration: duration,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }
}
