"use server";

import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";
import { checkUserInOrg } from "./members";
import prisma from "@/lib/prisma";
import { ClassRole } from "@repo/db";

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
      groups: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          classGroupMembers: {
            select: {
              id: true,
              userId: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      course: {
        select: {
          id: true,
          name: true,
          rootLessonNodeId: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!classData) throw new Error("Class not found");
  const courseId = classData.course.id;

  const allNodes = await prisma.lessonNode.findMany({
    where: { courseId },
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
  });

  return {
    success: true,
    data: {
      classData,
      nodes: allNodes,
    },
    role: isMember.role,
  };
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

// Internal version (used by both server and API routes)
export async function _getUserClassesByUserId(userId: string) {
  const classMembers = await prisma.classMember.findMany({
    where: {
      userId,
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

export async function getUserClasses() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  return _getUserClassesByUserId(session.user.id);
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

// Internal version (used by both server and API routes)
export async function _getStudentPendingAssignmentsForClassesByUserId(
  userId: string,
  classIds: string[],
) {
  try {
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

export async function getStudentPendingAssignmentsForClasses(
  classIds: string[],
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  return _getStudentPendingAssignmentsForClassesByUserId(
    session.user.id,
    classIds,
  );
}

/**
 * Get all students in a class (teacher/owner only)
 */
export async function getClassStudents(classId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  const membership = await prisma.classMember.findUnique({
    where: {
      classId_userId: { classId, userId: session.user.id },
    },
    select: { role: true },
  });

  if (!membership || !["teacher", "owner"].includes(membership.role)) {
    throw new Error("Forbidden");
  }

  const students = await prisma.classMember.findMany({
    where: {
      classId,
      role: "student",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });

  return students.map((s) => ({
    id: s.userId,
    name: s.user.name || "Unknown",
    email: s.user.email,
    image: s.user.image,
  }));
}
