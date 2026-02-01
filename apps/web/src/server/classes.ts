"use server";

import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";
import { checkUserInOrg } from "./members";
import prisma from "@/lib/prisma";
import { ClassRole } from "@repo/db";
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
  organizationId: string,
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

export async function getClassWithCourse(classId: string) {
  const isMember = await checkUserInClass(classId);
  if (!isMember) throw new Error("Forbidden");

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true, // nếu có
            },
          },
        },
      },
      course: {
        select: {
          id: true,
          name: true,
          rootLessonNodeId: true,
          rootLessonNode: {
            include: {
              children: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  type: true,
                  content: true,
                  order: true,
                  parentId: true,
                  courseId: true,
                  createdAt: true,
                  updatedAt: true,
                  _count: {
                    select: { children: true },
                  },
                },
              },
              _count: {
                select: { children: true },
              },
            },
          },
        },
      },
    },
  });

  if (!classData) throw new Error("Class not found");

  return {
    data: classData,
    role: isMember.role,
  };
}

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

export async function addClassMember(
  classId: string,
  userId: string,
  role: ClassRole,
) {
  return await prisma.classMember.create({
    data: {
      classId,
      userId,
      role,
    },
  });
}

export async function getUserClasses() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  const classMembers = await prisma.classMember.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      class: {
        include: {
          course: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  // Nhóm classes theo role
  const groupedClasses = {
    owner: classMembers
      .filter((cm) => cm.role === ClassRole.owner)
      .map((cm) => ({
        ...cm.class,
        role: cm.role,
        joinedAt: cm.joinedAt,
      })),
    teacher: classMembers
      .filter((cm) => cm.role === ClassRole.teacher)
      .map((cm) => ({
        ...cm.class,
        role: cm.role,
        joinedAt: cm.joinedAt,
      })),
    student: classMembers
      .filter((cm) => cm.role === ClassRole.student)
      .map((cm) => ({
        ...cm.class,
        role: cm.role,
        joinedAt: cm.joinedAt,
      })),
  };

  return groupedClasses;
}

export async function getStudentPendingAssignments(classId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Unauthorized");

    const userId = session.user.id;

    // 1️⃣ Kiểm tra user có phải student của class này không
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

    // Nếu không phải student, return 0
    if (!membership || membership.role !== "student") {
      return {
        success: true,
        data: {
          pending: 0,
          total: 0,
        },
      };
    }

    // 2️⃣ Lấy tất cả assignments đã được giao cho student này
    const studentAssignments = await prisma.studentAssignment.findMany({
      where: {
        studentId: userId,
        assignment: {
          classId: classId,
          type: "homework_imp", // Chỉ đếm homework
        },
      },
      select: {
        id: true,
        submissionData: true,
      },
    });

    // 3️⃣ Đếm số lượng chưa làm (submissionData = null)
    const pendingCount = studentAssignments.filter(
      (sa) => sa.submissionData === null,
    ).length;

    const totalCount = studentAssignments.length;

    return {
      success: true,
      data: {
        pending: pendingCount,
        total: totalCount,
      },
    };
  } catch (error) {
    console.error("Error getting student pending assignments:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra",
    };
  }
}

export async function getStudentPendingAssignmentsForClasses(
  classIds: string[],
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Unauthorized");

    const userId = session.user.id;

    // 1️⃣ Lấy tất cả StudentAssignments của user trong các classes này
    const studentAssignments = await prisma.studentAssignment.findMany({
      where: {
        studentId: userId,
        assignment: {
          classId: { in: classIds },
          type: "homework_imp",
        },
      },
      select: {
        id: true,
        submissionData: true,
        assignment: {
          select: {
            classId: true,
          },
        },
      },
    });

    // 2️⃣ Group by classId và đếm
    const result: Record<string, { pending: number; total: number }> = {};

    // Initialize all classes
    classIds.forEach((classId) => {
      result[classId] = { pending: 0, total: 0 };
    });

    // Count assignments per class
    studentAssignments.forEach((sa) => {
      const classId = sa.assignment.classId;
      result[classId].total++;
      if (sa.submissionData === null) {
        result[classId].pending++;
      }
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      "Error getting student pending assignments for classes:",
      error,
    );
    return {
      success: false,
      error: "Có lỗi xảy ra",
    };
  }
}
