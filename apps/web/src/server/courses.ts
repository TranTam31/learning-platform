"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { checkUserInOrg } from "./members";
import { revalidatePath } from "next/cache";
import {
  AddNodeInput,
  DeleteNodeInput,
  HomeworkContent,
  LessonContent,
  LessonNodeContent,
} from "@/types/course";
import { LessonNodeType } from "@repo/db";

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

export async function createCourse(
  name: string,
  slug: string,
  organizationId: string,
  description?: string,
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
        type: LessonNodeType.course,
        title: name,
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

export async function addLessonNode(input: AddNodeInput) {
  try {
    const { courseId, parentId, type, title, content } = input;

    const parentNode = await prisma.lessonNode.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        type: true,
        _count: {
          select: { children: true },
        },
      },
    });

    if (!parentNode) {
      return {
        success: false,
        error: "Parent node không tồn tại",
      };
    }

    // Validation logic
    if (type === LessonNodeType.homework) {
      // HOMEWORK chỉ thêm vào LESSON
      if (parentNode.type !== LessonNodeType.lesson) {
        return {
          success: false,
          error: "Chỉ có thể thêm Homework vào Lesson",
        };
      }
    } else {
      // MODULE/LESSON không thêm vào LESSON
      if (parentNode.type === LessonNodeType.lesson) {
        return {
          success: false,
          error: "Không thể thêm node vào Lesson",
        };
      }
    }

    const order = parentNode._count.children;
    const finalContent = content ?? getDefaultContent(type);

    const newNode = await prisma.lessonNode.create({
      data: {
        title,
        type,
        courseId,
        parentId,
        order,
        content: finalContent,
      },
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

    revalidatePath(`/courses/${courseId}`);

    return {
      success: true,
      data: newNode,
    };
  } catch (error) {
    console.error("Error adding lesson node:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi thêm node",
    };
  }
}

function getDefaultContent(type: LessonNodeType): LessonNodeContent {
  switch (type) {
    case LessonNodeType.lesson:
      return { content: "" } as LessonContent;

    case LessonNodeType.homework:
      return { widgetId: "", widgetVersion: "" } as HomeworkContent;

    case LessonNodeType.module:
      return { content: "" } as LessonContent;
    default:
      return {};
  }
}

export async function updateLessonNode(input: {
  nodeId: string;
  courseId: string;
  title?: string;
  content?: any;
}) {
  try {
    const { nodeId, courseId, title, content } = input;

    // Verify node exists and belongs to course
    const node = await prisma.lessonNode.findUnique({
      where: { id: nodeId },
      select: { courseId: true, type: true },
    });

    if (!node || node.courseId !== courseId) {
      return {
        success: false,
        error: "Node không tồn tại hoặc không thuộc course này",
      };
    }

    // Prevent updating root course node title
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { rootLessonNodeId: true },
    });

    if (course?.rootLessonNodeId === nodeId && title !== undefined) {
      return { success: false, error: "Không thể đổi tên root course node" };
    }

    // Update node
    const updated = await prisma.lessonNode.update({
      where: { id: nodeId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      },
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

    revalidatePath(`/courses/${courseId}`);

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Error updating lesson node:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi cập nhật node",
    };
  }
}

// Function load homework
export async function loadLessonHomeworks(lessonId: string) {
  try {
    const homeworks = await prisma.lessonNode.findMany({
      where: {
        parentId: lessonId,
        type: LessonNodeType.homework,
      },
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
      },
    });

    return {
      success: true,
      data: homeworks,
    };
  } catch (error) {
    console.error("Error loading lesson homeworks:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi load homework",
    };
  }
}

export async function deleteLessonNode(input: DeleteNodeInput) {
  try {
    const { nodeId, courseId } = input;

    // Kiểm tra xem node có phải là root node không
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { rootLessonNodeId: true },
    });

    if (!course) {
      return {
        success: false,
        error: "Course không tồn tại",
      };
    }

    if (course.rootLessonNodeId === nodeId) {
      return {
        success: false,
        error: "Không thể xóa root node của course",
      };
    }

    // Check node tồn tại
    const nodeToDelete = await prisma.lessonNode.findUnique({
      where: { id: nodeId },
    });

    if (!nodeToDelete) {
      return {
        success: false,
        error: "Node không tồn tại",
      };
    }

    // Xóa node (Prisma sẽ cascade delete children nếu có onDelete: Cascade)
    const deleted = await prisma.lessonNode.delete({
      where: { id: nodeId },
    });

    revalidatePath(`/courses/${courseId}`);

    return {
      success: true,
      data: {
        deletedId: deleted.id,
      },
    };
  } catch (error) {
    console.error("Error deleting lesson node:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi xóa node",
    };
  }
}

export async function getCourseWithRootNode(orgSlug: string, slug: string) {
  const isMember = await checkUserInOrg({ orgSlug: orgSlug });
  if (!isMember) throw new Error("Forbidden");
  try {
    const course = await prisma.course.findUnique({
      where: {
        organizationId_slug: {
          organizationId: isMember?.organization.id,
          slug: slug,
        },
      },
      include: {
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
    });

    if (!course) {
      return {
        success: false,
        error: "Course không tồn tại",
      };
    }

    return {
      success: true,
      data: course,
      role: isMember.role,
    };
  } catch (error) {
    console.error("Error fetching course with root node:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi lấy dữ liệu course",
    };
  }
}

export async function getCourseWithRootNodeWithCourseId(courseId: string) {
  // const isMember = await checkUserInOrg({ orgSlug: orgSlug });
  // if (!isMember) throw new Error("Forbidden");
  try {
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      include: {
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
    });

    if (!course) {
      return {
        success: false,
        error: "Course không tồn tại",
      };
    }

    return {
      success: true,
      data: course,
    };
  } catch (error) {
    console.error("Error fetching course with root node:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi lấy dữ liệu course",
    };
  }
}

export async function loadNodeChildren(nodeId: string) {
  try {
    const children = await prisma.lessonNode.findMany({
      where: { parentId: nodeId },
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
      data: children,
    };
  } catch (error) {
    console.error("Error loading node children:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi load children",
    };
  }
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

// server/courses.ts - THÊM VÀO FILE HIỆN TẠI

/**
 * Load toàn bộ course structure (chỉ metadata, không có content)
 * để tính homework counts cho student
 */
export async function loadCourseStructureMetadata(courseId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Unauthorized");

    // Load tất cả nodes của course (chỉ metadata)
    const nodes = await prisma.lessonNode.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        order: true,
        parentId: true,
        courseId: true,
        createdAt: true,
        updatedAt: true,
        // KHÔNG lấy content để giảm bandwidth
        _count: {
          select: { children: true },
        },
      },
    });

    return {
      success: true,
      data: nodes,
    };
  } catch (error) {
    console.error("Error loading course structure metadata:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi load structure",
    };
  }
}

/**
 * Load homework counts cho student trong một class
 * Trả về Map: LessonNode.id (homework) → { totalAssigned, pending }
 */
export async function getStudentHomeworkStatusByClass(
  courseId: string,
  classId: string,
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Unauthorized");

    const userId = session.user.id;

    // Verify student in class
    const membership = await prisma.classMember.findUnique({
      where: {
        classId_userId: {
          classId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!membership || membership.role !== "student") {
      return {
        success: false,
        error: "Not a student of this class",
      };
    }

    // 1️⃣ Lấy tất cả ClassLessonNode (homework_imp) của class này
    const classLessonNodes = await prisma.classLessonNode.findMany({
      where: {
        classId: classId,
        type: "homework_imp",
      },
      select: {
        id: true,
        lessonNodeId: true, // LessonNode.id (homework template)
      },
    });

    if (classLessonNodes.length === 0) {
      return {
        success: true,
        data: {
          assignedByLessonNode: {}, // lessonNodeId → count
          submittedByLessonNode: {}, // lessonNodeId → count
        },
      };
    }

    // 2️⃣ Lấy StudentAssignments của student này cho các assignments trên
    const classLessonNodeIds = classLessonNodes.map((cln) => cln.id);

    const studentAssignments = await prisma.studentAssignment.findMany({
      where: {
        studentId: userId,
        assignmentId: {
          in: classLessonNodeIds,
        },
      },
      select: {
        assignmentId: true, // ClassLessonNode.id
        submissionData: true,
      },
    });

    // 3️⃣ Build Maps: ClassLessonNode.id → status
    const assignedSet = new Set(
      studentAssignments.map((sa) => sa.assignmentId),
    );
    const submittedSet = new Set(
      studentAssignments
        .filter((sa) => sa.submissionData !== null)
        .map((sa) => sa.assignmentId),
    );

    // 4️⃣ Group by LessonNode.id
    const assignedByLessonNode: Record<string, number> = {};
    const submittedByLessonNode: Record<string, number> = {};

    classLessonNodes.forEach((cln) => {
      const lessonNodeId = cln.lessonNodeId;
      const classLessonNodeId = cln.id;

      // Chỉ đếm nếu student được giao
      if (assignedSet.has(classLessonNodeId)) {
        assignedByLessonNode[lessonNodeId] =
          (assignedByLessonNode[lessonNodeId] || 0) + 1;

        if (submittedSet.has(classLessonNodeId)) {
          submittedByLessonNode[lessonNodeId] =
            (submittedByLessonNode[lessonNodeId] || 0) + 1;
        }
      }
    });

    console.log("📊 Student homework status:", {
      totalClassLessonNodes: classLessonNodes.length,
      assignedToStudent: assignedSet.size,
      submitted: submittedSet.size,
      byLessonNode: assignedByLessonNode,
    });

    return {
      success: true,
      data: {
        assignedByLessonNode, // { "hw_1": 1, "hw_2": 2 }
        submittedByLessonNode, // { "hw_1": 1 }
      },
    };
  } catch (error) {
    console.error("Error getting student homework status:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra",
    };
  }
}
