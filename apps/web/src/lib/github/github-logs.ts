import { Octokit } from "@octokit/rest";

export interface GitHubStep {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface ParsedStep {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration: number | null;
  logs: LogSection[];
}

export interface LogSection {
  type: "group" | "line";
  title?: string;
  lines: string[];
  collapsed?: boolean;
}

export async function fetchJobSteps(runId: string): Promise<GitHubStep[]> {
  const octokit = new Octokit({
    auth: process.env.GITHUB_PAT,
  });

  const [owner, repo] = process.env.WIDGET_BUILDER_REPO!.split("/");

  try {
    const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: parseInt(runId),
    });

    if (!jobs.jobs.length) {
      throw new Error("No jobs found for this run");
    }

    const job = jobs.jobs[0];

    if (!job.steps) {
      throw new Error("Job has no steps");
    }

    console.log(`Found ${job.steps.length} steps`); // Debug

    return job.steps.map((step) => ({
      number: step.number,
      name: step.name,
      status: step.status,
      conclusion: step.conclusion,
      started_at: step.started_at ?? null,
      completed_at: step.completed_at ?? null,
    }));
  } catch (error: any) {
    console.error("Fetch job steps error:", error);
    throw new Error(`Failed to fetch job steps: ${error.message}`);
  }
}

export async function fetchRawLogs(runId: string): Promise<string> {
  const octokit = new Octokit({
    auth: process.env.GITHUB_PAT,
  });

  const [owner, repo] = process.env.WIDGET_BUILDER_REPO!.split("/");

  try {
    const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: parseInt(runId),
    });

    if (!jobs.jobs.length) {
      throw new Error("No jobs found");
    }

    const job = jobs.jobs[0];

    console.log(`Fetching logs for job ${job.id}`); // Debug

    // ✅ FIX: Get the download URL
    const response = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
      owner,
      repo,
      job_id: job.id,
    });

    // response.url contains the redirect URL to download logs
    const logsUrl = response.url;

    console.log("Logs URL:", logsUrl); // Debug

    // Fetch the actual logs content
    const logsResponse = await fetch(logsUrl);

    if (!logsResponse.ok) {
      throw new Error(`Failed to download logs: ${logsResponse.statusText}`);
    }

    const logsText = await logsResponse.text();

    console.log("Logs fetched, length:", logsText.length); // Debug

    if (logsText.length === 0) {
      console.warn("Warning: Logs are empty!");
    }

    return logsText;
  } catch (error: any) {
    console.error("Fetch raw logs error:", error);
    throw new Error(`Failed to fetch logs: ${error.message}`);
  }
}

interface ParsedLogLine {
  timestamp: Date;
  content: string;
  rawLine: string;
}

function parseLogLine(line: string): ParsedLogLine | null {
  // GitHub Actions log format can be:
  // 2026-01-18T10:17:18.0538786Z content
  // OR with line number:
  // 12026-01-18T10:17:18.0538786Z content

  // Try with line number first
  let match = line.match(/^(\d+)?(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s*(.*)$/);

  if (match) {
    return {
      timestamp: new Date(match[2]),
      content: match[3],
      rawLine: line,
    };
  }

  return null;
}

function parseLogsIntoSections(logs: string): LogSection[] {
  const lines = logs.split("\n");
  const sections: LogSection[] = [];
  let currentGroup: LogSection | null = null;

  for (const line of lines) {
    const parsed = parseLogLine(line);
    if (!parsed) continue;

    const { content } = parsed;

    if (content.startsWith("##[group]")) {
      if (currentGroup) {
        sections.push(currentGroup);
      }

      const title = content.replace("##[group]", "").trim();
      currentGroup = {
        type: "group",
        title: title || "Log Group",
        lines: [],
        collapsed: false,
      };
    } else if (content.startsWith("##[endgroup]")) {
      if (currentGroup) {
        sections.push(currentGroup);
        currentGroup = null;
      }
    } else if (content.startsWith("##[")) {
      // Skip other GitHub Actions commands
      continue;
    } else {
      if (currentGroup) {
        currentGroup.lines.push(content);
      } else {
        sections.push({
          type: "line",
          lines: [content],
        });
      }
    }
  }

  if (currentGroup) {
    sections.push(currentGroup);
  }

  return sections;
}

export function mapLogsToSteps(
  steps: GitHubStep[],
  rawLogs: string,
): ParsedStep[] {
  console.log("Mapping logs to steps...");
  console.log("Total steps:", steps.length);
  console.log("Raw logs length:", rawLogs.length);

  const logLines = rawLogs
    .split("\n")
    .map(parseLogLine)
    .filter((line): line is ParsedLogLine => line !== null);

  console.log("Parsed log lines:", logLines.length);

  return steps.map((step, index) => {
    const stepStart = step.started_at ? new Date(step.started_at) : null;
    const stepEnd = step.completed_at ? new Date(step.completed_at) : null;

    let duration: number | null = null;
    if (stepStart && stepEnd) {
      duration = Math.floor((stepEnd.getTime() - stepStart.getTime()) / 1000);
    }

    if (!stepStart) {
      console.log(`Step ${step.number} (${step.name}) has no start time`);
      return {
        ...step,
        duration,
        logs: [],
      };
    }

    let endBoundary: Date;
    if (stepEnd) {
      endBoundary = stepEnd;
    } else if (steps[index + 1]?.started_at) {
      endBoundary = new Date(steps[index + 1].started_at!);
    } else {
      endBoundary = new Date();
    }

    const stepLogLines = logLines.filter(
      (log) => log.timestamp >= stepStart && log.timestamp < endBoundary,
    );

    console.log(
      `Step ${step.number} (${step.name}): ${stepLogLines.length} log lines`,
    );

    const stepRawLogs = stepLogLines.map((l) => l.rawLine).join("\n");
    const sections = parseLogsIntoSections(stepRawLogs);

    console.log(`  → ${sections.length} sections`);

    return {
      ...step,
      duration,
      logs: sections,
    };
  });
}

export async function getBuildLogsWithSteps(
  runId: string,
): Promise<ParsedStep[]> {
  console.log("Getting build logs for run:", runId);

  const [steps, rawLogs] = await Promise.all([
    fetchJobSteps(runId),
    fetchRawLogs(runId),
  ]);

  return mapLogsToSteps(steps, rawLogs);
}
