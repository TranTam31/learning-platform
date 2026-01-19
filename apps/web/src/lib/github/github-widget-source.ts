import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT, // PAT có quyền read repo
});

interface GetBuiltHtmlOptions {
  runId: string;
  ref?: string; // default: main
}

/**
 * Lấy nội dung index.html từ widget-builder theo runId
 */
export async function getBuiltWidgetHtml({
  runId,
  ref = "main",
}: GetBuiltHtmlOptions): Promise<string> {
  const path = `${runId}/index.html`;
  const [owner, repo] = process.env.WIDGET_BUILDER_REPO!.split("/");

  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  if (Array.isArray(response.data)) {
    throw new Error("Expected a file but received a directory");
  }

  if (response.data.type !== "file") {
    throw new Error("Path is not a file");
  }

  const { content, encoding } = response.data;

  if (encoding !== "base64") {
    throw new Error(`Unsupported encoding: ${encoding}`);
  }

  // Decode base64 -> UTF-8 string
  const html = Buffer.from(content, "base64").toString("utf-8");

  return html;
}
