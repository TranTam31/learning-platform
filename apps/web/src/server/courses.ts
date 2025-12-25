"use server";

// import slugify from "slugify";
import { headers } from "next/headers";
import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { checkUserInOrg } from "./members";

export async function canCreateCourse(orgId: string) {
  return await auth.api.hasPermission({
    headers: await headers(),
    body: {
      organizationId: orgId,
      permissions: {
        course: ["create"],
      },
    },
  });
}

// export async function createCourse(
//   name: string,
//   slug: string,
//   organizationId: string,
//   description?: string
// ) {
//   const isMember = await checkUserInOrg({ orgId: organizationId });

//   const permission = await canCreateCourse(organizationId);

//   if (!permission.success || !isMember) throw new Error("Forbidden");

//   return prisma.course.create({
//     data: {
//       organizationId: organizationId,
//       name: name,
//       slug: slug, // Sử dụng slug truyền từ client vào
//       description: description,
//       createdBy: isMember?.userId,
//     },
//   });
// }

export async function createCourse(
  name: string,
  slug: string,
  organizationId: string,
  description?: string
) {
  const isMember = await checkUserInOrg({ orgId: organizationId });
  const permission = await canCreateCourse(organizationId);

  if (!permission.success || !isMember) throw new Error("Forbidden");

  // Sử dụng Transaction để đảm bảo cả 2 bước đều thành công hoặc cùng thất bại
  return prisma.$transaction(async (tx) => {
    // 1. Tạo Course trước (chưa có rootLessonNodeId)
    const newCourse = await tx.course.create({
      data: {
        organizationId: organizationId,
        name: name,
        slug: slug,
        description: description,
        createdBy: isMember.userId,
      },
    });

    // 2. Tạo LessonNode gốc cho Course đó
    const rootNode = await tx.lessonNode.create({
      data: {
        type: "ROOT",
        content: {},
        courseId: newCourse.id, // Đã có ID từ bước 1
      },
    });

    // 3. Cập nhật lại Course để trỏ vào rootNode vừa tạo
    return await tx.course.update({
      where: { id: newCourse.id },
      data: {
        rootLessonNodeId: rootNode.id,
      },
      include: {
        rootLessonNode: true,
      },
    });
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
