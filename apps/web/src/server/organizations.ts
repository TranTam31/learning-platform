"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./users";

export async function getOrganizations() {
  const { currentUser } = await getCurrentUser();

  const organizations = await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId: currentUser.id,
        },
      },
    },
  });

  return organizations;
}

export async function getActiveOrganization(userId: string) {
  const memberUser = await prisma.member.findFirst({
    where: {
      userId: userId,
    },
    include: {
      organization: true,
    },
  });

  if (!memberUser) {
    return null;
  }

  return memberUser.organization;
}

export async function getOrganizationBySlug(slug: string) {
  try {
    const organizationBySlug = await prisma.organization.findFirst({
      where: {
        slug: slug,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return organizationBySlug;
  } catch (error) {
    console.error(error);
    return null;
  }
}
