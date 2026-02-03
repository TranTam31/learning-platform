// app/api/repos/route.ts

import { NextResponse } from "next/server";
import { getUserRepositories } from "@/lib/github/github";
import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) throw new Error("Unauthorized");

    const githubAccounts = await prisma.gitHubAccount.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!githubAccounts) {
      return NextResponse.json(
        { error: "You have not connected your GitHub account" },
        { status: 401 },
      );
    }

    // Get repos from first GitHub account (có thể mở rộng cho nhiều accounts)
    const githubAccount = githubAccounts;
    const repos = await getUserRepositories(githubAccount.installationId);

    // Format response
    const formattedRepos = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      private: repo.private,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
    }));

    return NextResponse.json({ repos: formattedRepos });
  } catch (error) {
    console.error("Get repos error:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 },
    );
  }
}
