// app/api/auth/github/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { githubApp } from "@/lib/github";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationId = searchParams.get("installation_id");

  if (!installationId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dev/dashboard?error=no_installation`
    );
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) throw new Error("Unauthorized");

    // 2. Lấy thông tin từ GitHub
    const octokit = await githubApp.getInstallationOctokit(
      parseInt(installationId)
    );
    const { data: installation } = await octokit.request(
      "GET /app/installations/{installation_id}",
      {
        installation_id: parseInt(installationId),
      }
    );

    const account = installation.account as {
      login: string;
      type: string;
    } | null;

    if (account) {
      const accountLogin = account.login;
      const accountType = account.type;

      // 3. Liên kết vào User hiện tại (Dùng upsert để tránh tạo trùng account GitHub)
      await prisma.gitHubAccount.upsert({
        where: {
          installationId: installationId,
        },
        update: {
          userId: session.user.id,
          accountLogin,
          accountType,
        },
        create: {
          userId: session.user.id,
          installationId,
          accountLogin,
          accountType,
        },
      });
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dev/dashboard?success=github_connected`
    );
  } catch (error) {
    console.error("GitHub linking error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dev/dashboard?error=link_failed`
    );
  }
}
