"use server";

import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";
import { checkUserInOrg } from "./members";
import prisma from "@/lib/prisma";
import { ClassRole } from "@repo/db";
import {
  ClassAddonType,
  CreateClassLessonNodeInput,
  DeleteClassLessonNodeInput,
} from "@/types/class";
import { revalidatePath } from "next/cache";

export async function checkUserInClass(classId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  return await prisma.classMember.findUnique({
    where: {
      classId_userId: { classId, userId: session?.user.id },
    },
    select: {
      userId: true,
      role: true,
    },
  });
}

export async function canCreateClass(orgId: string) {
  return await auth.api.hasPermission({
    headers: await headers(),
    body: {
      organizationId: orgId,
      permissions: {
        class: ["create"],
      },
    },
  });
}

export async function createClass(
  name: string,
  courseId: string,
  organizationId: string
) {
  const isMember = await checkUserInOrg({ orgId: organizationId });
  //   const permission = await canCreateClass(organizationId);

  if (
    // !permission.success ||
    !isMember
  )
    throw new Error("Forbidden");

  return await prisma.$transaction(async (tx) => {
    const newClass = await tx.class.create({
      data: {
        name: name,
        courseId: courseId,
      },
    });

    await tx.classMember.create({
      data: {
        classId: newClass.id,
        userId: isMember.userId,
        role: ClassRole.owner,
      },
    });
  });
}

export async function getClass(classId: string) {
  const isMember = await checkUserInClass(classId);
  if (!isMember) throw new Error("Forbidden");
  return await prisma.class.findUnique({
    where: {
      id: classId,
    },
    include: {
      course: true,
      members: true,
    },
  });
}

export async function createClassLessonNode(input: CreateClassLessonNodeInput) {
  try {
    const { classId, lessonNodeId, type, content } = input;

    // Validate lessonNode phải là type LESSON
    const lessonNode = await prisma.lessonNode.findUnique({
      where: { id: lessonNodeId },
      select: { id: true, type: true, courseId: true },
    });

    if (!lessonNode) {
      return {
        success: false,
        error: "Lesson node không tồn tại",
      };
    }

    if (lessonNode.type !== "lesson") {
      return {
        success: false,
        error: "Chỉ có thể thêm vào Lesson node",
      };
    }

    // Validate class tồn tại và thuộc về course
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, courseId: true },
    });

    if (!classData) {
      return {
        success: false,
        error: "Class không tồn tại",
      };
    }

    if (classData.courseId !== lessonNode.courseId) {
      return {
        success: false,
        error: "Lesson node không thuộc về course của class này",
      };
    }

    // Nếu là homework, kiểm tra có homework gốc từ LessonNode không
    if (type === ClassAddonType.homework) {
      const originalHomework = await prisma.lessonNode.findFirst({
        where: {
          parentId: lessonNodeId,
          type: "homework",
        },
      });

      if (!originalHomework) {
        return {
          success: false,
          error: "Lesson này chưa có homework template từ course",
        };
      }
    }

    // Tạo ClassLessonNode
    const newNode = await prisma.classLessonNode.create({
      data: {
        classId,
        lessonNodeId,
        type,
        content: content || {},
      },
      select: {
        id: true,
        type: true,
        content: true,
        lessonNodeId: true,
        classId: true,
        createdAt: true,
      },
    });

    revalidatePath(`/classes/${classId}`);

    return {
      success: true,
      data: newNode,
    };
  } catch (error) {
    console.error("Error creating class lesson node:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi tạo node",
    };
  }
}

/**
 * Xóa ClassLessonNode
 */
export async function deleteClassLessonNode(input: DeleteClassLessonNodeInput) {
  try {
    const { nodeId, classId } = input;

    const node = await prisma.classLessonNode.findUnique({
      where: { id: nodeId },
      select: { id: true, classId: true },
    });

    if (!node) {
      return {
        success: false,
        error: "Node không tồn tại",
      };
    }

    if (node.classId !== classId) {
      return {
        success: false,
        error: "Node không thuộc về class này",
      };
    }

    await prisma.classLessonNode.delete({
      where: { id: nodeId },
    });

    revalidatePath(`/classes/${classId}`);

    return {
      success: true,
      data: { deletedId: nodeId },
    };
  } catch (error) {
    console.error("Error deleting class lesson node:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi xóa node",
    };
  }
}

/**
 * Load tất cả ClassLessonNode của một lesson trong class
 */
export async function loadClassLessonNodes(
  classId: string,
  lessonNodeId: string
) {
  try {
    const nodes = await prisma.classLessonNode.findMany({
      where: {
        classId,
        lessonNodeId,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        content: true,
        lessonNodeId: true,
        classId: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: nodes,
    };
  } catch (error) {
    console.error("Error loading class lesson nodes:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi load nodes",
    };
  }
}

/**
 * Lấy homework template từ Course (LessonNode type homework)
 */
export async function getLessonHomeworkTemplate(lessonNodeId: string) {
  try {
    const homework = await prisma.lessonNode.findFirst({
      where: {
        parentId: lessonNodeId,
        type: "homework",
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
    });

    return {
      success: true,
      data: homework,
    };
  } catch (error) {
    console.error("Error loading homework template:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra",
    };
  }
}
