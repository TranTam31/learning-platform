// server/class-addons.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * ✅ UNIFIED: Load ClassLessonNode cho một LessonNode
 * Dùng chung cho cả lesson_note VÀ homework_imp
 */
export async function loadClassAddons(lessonNodeId: string, classId: string) {
  try {
    const addons = await prisma.classLessonNode.findMany({
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
      data: addons,
    };
  } catch (error) {
    console.error("Error loading class addons:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi load addons",
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
