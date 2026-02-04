import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const classId = request.nextUrl.searchParams.get("classId");
    if (!classId) {
      return NextResponse.json(
        { success: false, error: "classId is required" },
        { status: 400 },
      );
    }

    // Check if user is member of this class
    const isMember = await prisma.classMember.findUnique({
      where: {
        classId_userId: { classId, userId: session.user.id },
      },
      select: {
        role: true,
      },
    });

    if (!isMember) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

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
                image: true,
              },
            },
          },
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

    if (!classData) {
      return NextResponse.json(
        { success: false, error: "Class not found" },
        { status: 404 },
      );
    }

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

    return NextResponse.json({
      success: true,
      data: {
        classData,
        nodes: allNodes,
      },
      role: isMember.role,
    });
  } catch (error) {
    console.error("Error getting class:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch class",
      },
      { status: 500 },
    );
  }
}
