// server/class-lesson-node.ts
"use server";

import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { Prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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
        orderBy: { createdAt: "desc" },
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
        orderBy: { createdAt: "desc" },
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

      // Phân loại theo type
      const homeworkNodes = allClassLessonNodes.filter(
        (node) => node.type === "homework_imp",
      );
      const noteNodes = allClassLessonNodes.filter(
        (node) => node.type === "lesson_note",
      );

      // Check homework_imp trong StudentAssignment
      const assignedHomeworkIds = new Set<string>();
      if (homeworkNodes.length > 0) {
        const studentAssignments = await prisma.studentAssignment.findMany({
          where: {
            studentId: userId,
            assignmentId: {
              in: homeworkNodes.map((node) => node.id),
            },
          },
          select: {
            assignmentId: true,
          },
        });

        studentAssignments.forEach((sa) =>
          assignedHomeworkIds.add(sa.assignmentId),
        );
      }

      // Check lesson_note trong StudentNote
      const assignedNoteIds = new Set<string>();
      if (noteNodes.length > 0) {
        const studentNotes = await prisma.studentNote.findMany({
          where: {
            studentId: userId,
            noteId: {
              in: noteNodes.map((node) => node.id),
            },
          },
          select: {
            noteId: true,
          },
        });

        studentNotes.forEach((sn) => assignedNoteIds.add(sn.noteId));
      }

      // Filter: Chỉ giữ lại những node đã được giao
      const assignedClassLessonNodes = allClassLessonNodes.filter((node) => {
        if (node.type === "homework_imp") {
          return assignedHomeworkIds.has(node.id);
        } else if (node.type === "lesson_note") {
          return assignedNoteIds.has(node.id);
        }
        return false; // Type khác → không hiển thị
      });

      // Build a set of submitted homework IDs for sorting
      const submittedHomeworkIds = new Set<string>();
      if (homeworkNodes.length > 0) {
        const submittedAssignments = await prisma.studentAssignment.findMany({
          where: {
            studentId: userId,
            assignmentId: { in: homeworkNodes.map((node) => node.id) },
            submissionData: { not: Prisma.DbNull },
          },
          select: { assignmentId: true },
        });
        submittedAssignments.forEach((sa) =>
          submittedHomeworkIds.add(sa.assignmentId),
        );
      }

      // Sort: incomplete first, then by original order (newest first)
      assignedClassLessonNodes.sort((a, b) => {
        if (a.type === "homework_imp" && b.type === "homework_imp") {
          const aSubmitted = submittedHomeworkIds.has(a.id);
          const bSubmitted = submittedHomeworkIds.has(b.id);
          if (aSubmitted === bSubmitted) return 0;
          return aSubmitted ? 1 : -1;
        }
        return 0;
      });

      // console.log(
      //   `✅ Student has ${assignedClassLessonNodes.length}/${allClassLessonNodes.length} items (homework: ${assignedHomeworkIds.size}/${homeworkNodes.length}, notes: ${assignedNoteIds.size}/${noteNodes.length})`,
      // );

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

export async function getClassLessonNodeCounts(
  lessonNodeIds: string[],
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

    // 3️⃣ Initialize result structure
    const result: Record<
      string,
      { lesson_note: number; homework_imp: number }
    > = {};

    lessonNodeIds.forEach((nodeId) => {
      result[nodeId] = { lesson_note: 0, homework_imp: 0 };
    });

    // 4️⃣ LOGIC KHÁC NHAU DỰA TRÊN ROLE

    if (isTeacher) {
      // 🎓 TEACHER: Đếm TẤT CẢ ClassLessonNode
      const counts = await prisma.classLessonNode.groupBy({
        by: ["lessonNodeId", "type"],
        where: {
          lessonNodeId: { in: lessonNodeIds },
          classId,
        },
        _count: { id: true },
      });

      counts.forEach((item) => {
        result[item.lessonNodeId][item.type] = item._count.id;
      });

      return {
        success: true,
        data: result,
      };
    } else if (isStudent) {
      // 🎒 STUDENT: Chỉ đếm những item đã được giao

      // Lấy tất cả ClassLessonNode
      const allClassLessonNodes = await prisma.classLessonNode.findMany({
        where: {
          lessonNodeId: { in: lessonNodeIds },
          classId,
        },
        select: {
          id: true,
          lessonNodeId: true,
          type: true,
        },
      });

      if (allClassLessonNodes.length === 0) {
        return {
          success: true,
          data: result,
        };
      }

      // Phân loại theo type
      const homeworkNodes = allClassLessonNodes.filter(
        (node) => node.type === "homework_imp",
      );
      const noteNodes = allClassLessonNodes.filter(
        (node) => node.type === "lesson_note",
      );

      // 📝 Check homework_imp trong StudentAssignment
      const assignedHomeworkIds = new Set<string>();
      if (homeworkNodes.length > 0) {
        const studentAssignments = await prisma.studentAssignment.findMany({
          where: {
            studentId: userId,
            assignmentId: {
              in: homeworkNodes.map((node) => node.id),
            },
          },
          select: {
            assignmentId: true,
          },
        });

        studentAssignments.forEach((sa) =>
          assignedHomeworkIds.add(sa.assignmentId),
        );
      }

      // 📔 Check lesson_note trong StudentNote
      const assignedNoteIds = new Set<string>();
      if (noteNodes.length > 0) {
        const studentNotes = await prisma.studentNote.findMany({
          where: {
            studentId: userId,
            noteId: {
              in: noteNodes.map((node) => node.id),
            },
          },
          select: {
            noteId: true,
          },
        });

        studentNotes.forEach((sn) => assignedNoteIds.add(sn.noteId));
      }

      // Đếm số lượng đã được giao cho từng lessonNodeId
      allClassLessonNodes.forEach((node) => {
        const isAssigned =
          (node.type === "homework_imp" && assignedHomeworkIds.has(node.id)) ||
          (node.type === "lesson_note" && assignedNoteIds.has(node.id));

        if (isAssigned) {
          result[node.lessonNodeId][node.type]++;
        }
      });

      console.log(
        `✅ Student counts: homework ${assignedHomeworkIds.size}/${homeworkNodes.length}, notes ${assignedNoteIds.size}/${noteNodes.length}`,
      );

      return {
        success: true,
        data: result,
      };
    } else {
      return {
        success: false,
        error: "Invalid role",
      };
    }
  } catch (error) {
    console.error("Error getting class lesson node counts:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra",
    };
  }
}

export async function addClassLessonNode(input: {
  lessonNodeId: string;
  classId: string;
  type: "lesson_note" | "homework_imp";
  content: any;
}) {
  try {
    const { lessonNodeId, classId, type, content } = input;

    // Validate lessonNode type matches class lesson node type
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

    const classLessonNode = await prisma.classLessonNode.create({
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
      data: classLessonNode,
    };
  } catch (error) {
    console.error("Error adding class lesson node:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi thêm class lesson node",
    };
  }
}

export async function deleteClassLessonNode(input: {
  classLessonNodeId: string;
  classId: string;
}) {
  try {
    const { classLessonNodeId: classLessonNodeId, classId } = input;

    // Verify ownership
    const classLessonNode = await prisma.classLessonNode.findUnique({
      where: { id: classLessonNodeId },
      select: { classId: true },
    });

    if (!classLessonNode || classLessonNode.classId !== classId) {
      return { success: false, error: "Không có quyền xóa" };
    }

    await prisma.classLessonNode.delete({
      where: { id: classLessonNodeId },
    });

    revalidatePath(`/classes/${classId}`);

    return {
      success: true,
      data: { deletedId: classLessonNodeId },
    };
  } catch (error) {
    console.error("Error deleting class lesson node:", error);
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
