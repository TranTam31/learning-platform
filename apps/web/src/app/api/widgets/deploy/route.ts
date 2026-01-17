// app/api/widgets/build/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) throw new Error("Unauthorized");

    const { widgetId } = await request.json();

    // 1. Get widget from database
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: {
        user: {
          include: {
            githubAccounts: true,
          },
        },
      },
    });

    if (!widget || widget.userId !== session.user.id) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    // 2. Update status to building
    await prisma.widget.update({
      where: { id: widgetId },
      data: { buildStatus: "building" },
    });

    // 3. Trigger GitHub Actions workflow
    const octokit = new Octokit({
      auth: process.env.GITHUB_PAT,
    });

    const [owner, repo] = process.env.WIDGET_BUILDER_REPO!.split("/");
    const installationId = widget.user.githubAccounts[0]?.installationId || "";

    const { data: workflowDispatch } =
      await octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: "build-widget.yml",
        ref: "main", // hoặc branch của repo widget-builder
        inputs: {
          repo_url: widget.repoUrl,
          repo_full_name: widget.repoFullName,
          branch: widget.branch,
          widget_id: widget.id,
          installation_id: installationId,
        },
      });

    console.log("Workflow dispatched:", workflowDispatch);

    return NextResponse.json({
      success: true,
      message: "Build started",
      widgetId: widget.id,
    });
  } catch (error: any) {
    console.error("Build trigger error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to start build",
      },
      { status: 500 },
    );
  }
}
