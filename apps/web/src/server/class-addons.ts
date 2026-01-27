// server/class-addons.ts
"use server";

import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

/**
 * ✅ UNIFIED: Load ClassLessonNode cho một LessonNode
 * Dùng chung cho cả lesson_note VÀ homework_imp
 */
// export async function loadClassLessonNode(
//   lessonNodeId: string,
//   classId: string,
// ) {
//   try {
//     const classLessonNodes = await prisma.classLessonNode.findMany({
//       where: {
//         lessonNodeId,
//         classId,
//       },
//       orderBy: { createdAt: "asc" },
//       select: {
//         id: true,
//         type: true,
//         content: true,
//         createdAt: true,
//       },
//     });

//     return {
//       success: true,
//       data: classLessonNodes,
//     };
//   } catch (error) {
//     console.error("Error loading class lesson node:", error);
//     return {
//       success: false,
//       error: "Có lỗi xảy ra khi load class lesson node",
//     };
//   }
// }

export async function loadClassLessonNode(
  lessonNodeId: string,
  classId: string,
) {
  try {
    // 1️⃣ Lấy session và userId
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Unauthorized");

    const userId = session.user.id;

    // 2️⃣ Kiểm tra membership và role
    const membership = await prisma.classMember.findUnique({
      where: {
        classId_userId: {
          classId: classId,
          userId: userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      return {
        success: false,
        error: "Forbidden: Not a member of this class",
      };
    }

    const isTeacher =
      membership.role === "teacher" || membership.role === "owner";
    const isStudent = membership.role === "student";

    // 3️⃣ LOGIC KHÁC NHAU DỰA TRÊN ROLE

    if (isTeacher) {
      const classLessonNodes = await prisma.classLessonNode.findMany({
        where: {
          lessonNodeId,
          classId,
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          content: true,
          createdAt: true,
        },
      });

      return {
        success: true,
        data: classLessonNodes,
      };
    } else if (isStudent) {
      // Lấy tất cả ClassLessonNode của lessonNode này trong class
      const allClassLessonNodes = await prisma.classLessonNode.findMany({
        where: {
          lessonNodeId,
          classId,
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          content: true,
          createdAt: true,
        },
      });

      if (allClassLessonNodes.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // Lấy các assignmentId của student này
      const studentAssignments = await prisma.studentAssignment.findMany({
        where: {
          studentId: userId,
          assignmentId: {
            in: allClassLessonNodes.map((node) => node.id),
          },
        },
        select: {
          assignmentId: true,
        },
      });

      // Tạo Set các assignmentId đã được giao
      const assignedIds = new Set(
        studentAssignments.map((sa) => sa.assignmentId),
      );

      // Filter: Chỉ giữ lại ClassLessonNode đã được giao
      const assignedClassLessonNodes = allClassLessonNodes.filter((node) =>
        assignedIds.has(node.id),
      );

      console.log(
        `✅ Student has ${assignedClassLessonNodes.length}/${allClassLessonNodes.length} assignments`,
      );

      return {
        success: true,
        data: assignedClassLessonNodes,
      };
    } else {
      // Role không hợp lệ
      return {
        success: false,
        error: "Invalid role",
      };
    }
  } catch (error) {
    console.error("Error loading class lesson node:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi load class lesson node",
    };
  }
}

/**
 * ✅ UNIFIED: Get counts cho nhiều nodes
 * Trả về grouped by nodeId và type
 */
export async function getClassAddonCounts(nodeIds: string[], classId: string) {
  try {
    const counts = await prisma.classLessonNode.groupBy({
      by: ["lessonNodeId", "type"],
      where: {
        lessonNodeId: { in: nodeIds },
        classId,
      },
      _count: { id: true },
    });

    // Transform: { nodeId: { lesson_note: N, homework_imp: M } }
    const result: Record<
      string,
      { lesson_note: number; homework_imp: number }
    > = {};

    nodeIds.forEach((nodeId) => {
      result[nodeId] = { lesson_note: 0, homework_imp: 0 };
    });

    counts.forEach((item) => {
      result[item.lessonNodeId][item.type] = item._count.id;
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error getting class addon counts:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra",
    };
  }
}

/**
 * ✅ UNIFIED: Add ClassLessonNode
 * Type validation ở đây
 */
export async function addClassAddon(input: {
  lessonNodeId: string;
  classId: string;
  type: "lesson_note" | "homework_imp";
  content: any;
}) {
  try {
    const { lessonNodeId, classId, type, content } = input;

    // Validate lessonNode type matches addon type
    const lessonNode = await prisma.lessonNode.findUnique({
      where: { id: lessonNodeId },
      select: { id: true, type: true },
    });

    if (!lessonNode) {
      return { success: false, error: "LessonNode không tồn tại" };
    }

    // Validation: lesson_note → lesson, homework_imp → homework
    if (type === "lesson_note" && lessonNode.type !== "lesson") {
      return { success: false, error: "lesson_note chỉ dành cho Lesson" };
    }

    if (type === "homework_imp" && lessonNode.type !== "homework") {
      return { success: false, error: "homework_imp chỉ dành cho Homework" };
    }

    const addon = await prisma.classLessonNode.create({
      data: {
        lessonNodeId,
        classId,
        type,
        content,
      },
      select: {
        id: true,
        type: true,
        content: true,
        createdAt: true,
      },
    });

    revalidatePath(`/classes/${classId}`);

    return {
      success: true,
      data: addon,
    };
  } catch (error) {
    console.error("Error adding class addon:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi thêm addon",
    };
  }
}

/**
 * ✅ UNIFIED: Delete ClassLessonNode
 */
export async function deleteClassAddon(input: {
  addonId: string;
  classId: string;
}) {
  try {
    const { addonId, classId } = input;

    // Verify ownership
    const addon = await prisma.classLessonNode.findUnique({
      where: { id: addonId },
      select: { classId: true },
    });

    if (!addon || addon.classId !== classId) {
      return { success: false, error: "Không có quyền xóa" };
    }

    await prisma.classLessonNode.delete({
      where: { id: addonId },
    });

    revalidatePath(`/classes/${classId}`);

    return {
      success: true,
      data: { deletedId: addonId },
    };
  } catch (error) {
    console.error("Error deleting class addon:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi xóa",
    };
  }
}

export async function getBuildRunIdFromLessonNode(
  lessonNodeId: string,
): Promise<{
  widgetId: string | null;
  buildRunId: string | null;
}> {
  // 1. Lấy content của LessonNode
  const lessonNode = await prisma.lessonNode.findUnique({
    where: { id: lessonNodeId },
    select: {
      content: true,
    },
  });

  if (!lessonNode?.content) {
    return {
      widgetId: null,
      buildRunId: null,
    };
  }

  const content = lessonNode.content as {
    widgetId?: string;
    widgetBuildId?: string;
  };

  const widgetId = content.widgetId ?? null;

  // Nếu không có widgetBuildId thì vẫn trả widgetId
  if (!content.widgetBuildId) {
    return {
      widgetId,
      buildRunId: null,
    };
  }

  // 2. Lấy buildRunId từ WidgetBuild
  const widgetBuild = await prisma.widgetBuild.findUnique({
    where: {
      id: content.widgetBuildId,
    },
    select: {
      buildRunId: true,
    },
  });

  return {
    widgetId,
    buildRunId: widgetBuild?.buildRunId ?? null,
  };
}
