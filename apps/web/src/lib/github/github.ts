// lib/github.ts

import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

const appId = process.env.GITHUB_APP_ID!;
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n");
const clientId = process.env.GITHUB_APP_CLIENT_ID!;
const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET!;

// GitHub App instance
export const githubApp = new App({
  appId,
  privateKey,
  oauth: {
    clientId,
    clientSecret,
  },
});

// Get Octokit instance for a specific installation
export async function getInstallationOctokit(installationId: string) {
  const octokit = await githubApp.getInstallationOctokit(
    parseInt(installationId)
  );
  return octokit;
}

// Get user's accessible repositories
export async function getUserRepositories(installationId: string) {
  const octokit = await getInstallationOctokit(installationId);

  const { data } = await octokit.request("GET /installation/repositories", {
    per_page: 100,
  });

  return data.repositories;
}
