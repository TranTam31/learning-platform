"use server";

// import slugify from "slugify";
import { headers } from "next/headers";
import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

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
  description?: string
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  if (!session?.session.activeOrganizationId)
    throw new Error("Organization not found");

  const permission = await canCreateCourse();

  if (!permission.success) throw new Error("Forbidden");

  return prisma.course.create({
    data: {
      organizationId: session.session.activeOrganizationId,
      name: name,
      slug: slug, // Sử dụng slug truyền từ client vào
      description: description,
      createdBy: session.user.id,
    },
  });
}

export async function getCourses() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  if (!session?.session.activeOrganizationId)
    throw new Error("Organization not found");

  return prisma.course.findMany({
    where: {
      organizationId: session.session.activeOrganizationId,
    },
  });
}

export async function getCourseBySlug(slug: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const orgId = session?.session.activeOrganizationId;

  if (!orgId) throw new Error("Organization not found");

  return prisma.course.findUnique({
    where: {
      // Đây là cách gọi "Compound Unique" trong Prisma
      organizationId_slug: {
        organizationId: orgId,
        slug: slug,
      },
    },
  });
}
