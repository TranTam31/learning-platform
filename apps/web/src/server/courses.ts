"use server";

// import slugify from "slugify";
import { headers } from "next/headers";
import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { checkUserInOrg } from "./members";
import { revalidatePath } from "next/cache";
import { AddNodeInput, DeleteNodeInput } from "@/types/course";
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
    const { courseId, parentId, type, title } = input;

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

    const newNode = await prisma.lessonNode.create({
      data: {
        title,
        type,
        courseId,
        parentId,
        order,
        content: {}, // Empty object cho tất cả
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
