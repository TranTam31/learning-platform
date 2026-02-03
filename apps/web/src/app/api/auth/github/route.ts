// app/api/auth/github/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GITHUB_APP_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`;

  // GitHub OAuth URL
  const githubAuthUrl = new URL(
    "https://github.com/apps/joy-math/installations/new"
  );

  // Redirect to GitHub App installation page
  return NextResponse.redirect(githubAuthUrl.toString());
}
