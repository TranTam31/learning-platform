// app/api/webhooks/build-complete/route.ts

import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook secret
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse webhook payload
    const body = await request.json();
    const { widget_id, status, run_id, run_number } = body;

    console.log("Build webhook received:", { widget_id, status, run_id });

    // 3. Update widget status
    await prisma.widget.update({
      where: { id: widget_id },
      data: {
        buildStatus: status, // 'success' or 'failed'
        updatedAt: new Date(),
      },
    });

    // TODO Phase 3: Download artifacts nếu status = success

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
