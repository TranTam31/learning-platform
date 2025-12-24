"use server";

import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { Role } from "@repo/db";
import { headers } from "next/headers";

type CheckOrgInput =
  | { orgId: string; orgSlug?: never }
  | { orgSlug: string; orgId?: never };

export async function checkUserInOrg(input: CheckOrgInput) {
  const { orgId, orgSlug } = input;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  return await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organization: orgId ? { id: orgId } : { slug: orgSlug },
    },
    select: {
      userId: true,
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

export const addMember = async (
  organizationId: string,
  userId: string,
  role: Role
) => {
  // Không cần try-catch ở đây nếu bạn muốn component xử lý lỗi hoàn toàn
  await auth.api.addMember({
    body: { userId, organizationId, role },
  });
};
