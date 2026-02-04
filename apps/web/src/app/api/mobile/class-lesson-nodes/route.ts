import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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

    const { action, classId, lessonNodeId, classLessonNodeId, type, content } =
      await request.json();

    if (!action || !classId) {
      return NextResponse.json(
        { success: false, error: "action and classId are required" },
        { status: 400 },
      );
    }

    // Check membership
    const membership = await prisma.classMember.findUnique({
      where: {
        classId_userId: {
          classId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const isTeacher =
      membership.role === "teacher" || membership.role === "owner";

    // ADD CLASS LESSON NODE
    if (action === "add") {
      if (!lessonNodeId || !type) {
        return NextResponse.json(
          { success: false, error: "lessonNodeId and type are required" },
          { status: 400 },
        );
      }

      if (!isTeacher) {
        return NextResponse.json(
          { success: false, error: "Only teachers can add notes" },
          { status: 403 },
        );
      }

      const newNode = await prisma.classLessonNode.create({
        data: {
          lessonNodeId,
          classId,
          type,
          content,
        },
      });

      return NextResponse.json({
        success: true,
        data: newNode,
      });
    }

    // DELETE CLASS LESSON NODE
    if (action === "delete") {
      if (!classLessonNodeId) {
        return NextResponse.json(
          { success: false, error: "classLessonNodeId is required" },
          { status: 400 },
        );
      }

      if (!isTeacher) {
        return NextResponse.json(
          { success: false, error: "Only teachers can delete notes" },
          { status: 403 },
        );
      }

      const node = await prisma.classLessonNode.findUnique({
        where: { id: classLessonNodeId },
        select: { classId: true },
      });

      if (!node || node.classId !== classId) {
        return NextResponse.json(
          { success: false, error: "Node not found or unauthorized" },
          { status: 404 },
        );
      }

      await prisma.classLessonNode.delete({
        where: { id: classLessonNodeId },
      });

      return NextResponse.json({
        success: true,
        data: { deletedId: classLessonNodeId },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error managing class lesson nodes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process",
      },
      { status: 500 },
    );
  }
}
