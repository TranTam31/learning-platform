// app/api/widgets/[id]/logs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // 👈 params là Promise
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) throw new Error("Unauthorized");

    // 1. Get widget
    const widget = await prisma.widget.findUnique({
      where: { id },
    });

    if (!widget || widget.userId !== session.user.id) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }

    // 2. Check if we have run_id stored
    if (!widget.buildRunId) {
      return NextResponse.json({
        logs: [],
        status: widget.buildStatus,
        message: "No build run found",
      });
    }

    // 3. Get logs from GitHub
    const octokit = new Octokit({
      auth: process.env.GITHUB_PAT,
    });

    const [owner, repo] = process.env.WIDGET_BUILDER_REPO!.split("/");

    try {
      // Get workflow run details
      const { data: run } = await octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id: Number(widget.buildRunId),
      });

      // Get jobs for this run
      const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: Number(widget.buildRunId),
      });

      const job = jobs.jobs[0];

      if (!job) {
        return NextResponse.json({
          logs: [],
          status: run.status,
          conclusion: run.conclusion,
        });
      }

      // Download logs
      const { data: logsData } =
        await octokit.rest.actions.downloadJobLogsForWorkflowRun({
          owner,
          repo,
          job_id: job.id,
        });

      let logsText = "";

      if (typeof logsData === "string") {
        logsText = logsData;
      } else {
        const logsResponse = await fetch(logsData as any);
        logsText = await logsResponse.text();
      }

      const logLines = logsText.split("\n").filter((line) => line.trim());

      return NextResponse.json({
        logs: logLines,
        status: run.status,
        conclusion: run.conclusion,
        jobName: job.name,
        startedAt: job.started_at,
        completedAt: job.completed_at,
      });
    } catch (error: any) {
      console.error("GitHub API error:", error);

      if (error.status === 404) {
        return NextResponse.json({
          logs: ["⏳ Waiting for build to start..."],
          status: "queued",
        });
      }

      throw error;
    }
  } catch (error: any) {
    console.error("Get logs error:", error);
    return NextResponse.json(
      {
        error: error.message,
        logs: [`❌ Error fetching logs: ${error.message}`],
      },
      { status: 500 },
    );
  }
}
