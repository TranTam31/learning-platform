import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";
import { getBuildLogsWithSteps } from "@/lib/github/github-logs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) throw new Error("Unauthorized");

    const build = await prisma.widgetBuild.findUnique({
      where: { id: id },
      include: {
        widget: true,
      },
    });

    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    // Check ownership
    if (build.widget.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if build has run ID
    if (!build.buildRunId) {
      return NextResponse.json({
        error: "Build has not started yet",
        steps: [],
      });
    }

    // Fetch and parse logs
    const steps = await getBuildLogsWithSteps(build.buildRunId);

    return NextResponse.json({
      success: true,
      steps,
      build: {
        id: build.id,
        version: build.version,
        status: build.status,
        startedAt: build.startedAt,
        completedAt: build.completedAt,
        duration: build.duration,
      },
    });
  } catch (error: any) {
    console.error("Get build logs error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch logs",
        steps: [],
      },
      { status: 500 },
    );
  }
}
