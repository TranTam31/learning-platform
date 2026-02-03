// app/api/widgets/build/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) throw new Error("Unauthorized");

    const { widgetId } = await request.json();

    // Get widget with latest build
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      include: {
        user: {
          include: {
            githubAccounts: true,
          },
        },
        builds: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!widget || widget.userId !== session.user.id) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    // Calculate next version
    const latestBuild = widget.builds[0];
    const nextVersion = latestBuild ? latestBuild.version + 1 : 1;

    // Create new build record
    const build = await prisma.widgetBuild.create({
      data: {
        widgetId: widget.id,
        version: nextVersion,
        status: "building",
        startedAt: new Date(),
      },
    });

    // Trigger GitHub Actions
    const octokit = new Octokit({
      auth: process.env.GITHUB_PAT,
    });

    const [owner, repo] = process.env.WIDGET_BUILDER_REPO!.split("/");
    const installationId = widget.user.githubAccounts[0]?.installationId || "";

    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: "build-widget.yml",
      ref: "main",
      inputs: {
        repo_url: widget.repoUrl,
        repo_full_name: widget.repoFullName,
        branch: widget.branch,
        widget_id: widget.id,
        build_id: build.id,
        version: nextVersion.toString(),
        installation_id: installationId,
      },
    });

    // Wait and get run_id
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const { data: runs } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: "build-widget.yml",
      per_page: 1,
    });

    const latestRun = runs.workflow_runs[0];

    if (latestRun) {
      await prisma.widgetBuild.update({
        where: { id: build.id },
        data: { buildRunId: latestRun.id.toString() },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Build started",
      build: {
        id: build.id,
        version: build.version,
        status: build.status,
      },
      runId: latestRun?.id,
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
