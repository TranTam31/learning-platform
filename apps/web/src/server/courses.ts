"use server";

// import slugify from "slugify";
import { headers } from "next/headers";
import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { checkUserInOrg } from "./members";

export async function canCreateCourse() {
  return await auth.api.hasPermission({
    headers: await headers(),
    body: {
      permissions: {
        course: ["create"],
      },
    },
  });
}

export async function createCourse(
  name: string,
  slug: string,
  organizationId: string,
  description?: string
) {
  const isMember = await checkUserInOrg({ orgId: organizationId });

  const permission = await canCreateCourse();

  if (!permission.success || !isMember) throw new Error("Forbidden");

  return prisma.course.create({
    data: {
      organizationId: organizationId,
      name: name,
      slug: slug, // Sử dụng slug truyền từ client vào
      description: description,
      createdBy: isMember?.userId,
    },
  });
}

export async function getCourses(organizationId: string) {
  await checkUserInOrg({ orgId: organizationId });

  return prisma.course.findMany({
    where: {
      organizationId: organizationId,
    },
  });
}

export async function getCourseBySlug(orgSlug: string, slug: string) {
  const isMember = await checkUserInOrg({ orgSlug: orgSlug });
  if (!isMember) throw new Error("Forbidden");

  return prisma.course.findUnique({
    where: {
      // Đây là cách gọi "Compound Unique" trong Prisma
      organizationId_slug: {
        organizationId: isMember?.organization.id,
        slug: slug,
      },
    },
  });
}
