import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { LessonNodeType } from "@repo/db";
import {
  LessonContent,
  HomeworkContent,
  LessonNodeContent,
} from "@/types/course";

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

    const { action, courseId, nodeId, parentId, type, title, content } =
      await request.json();

    if (!action) {
      return NextResponse.json(
        { success: false, error: "action is required" },
        { status: 400 },
      );
    }

    // ADD NODE
    if (action === "add") {
      if (!courseId || !parentId || !type || !title) {
        return NextResponse.json(
          {
            success: false,
            error: "courseId, parentId, type, and title are required",
          },
          { status: 400 },
        );
      }

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
        return NextResponse.json(
          { success: false, error: "Parent node not found" },
          { status: 404 },
        );
      }

      // Validation
      if (type === LessonNodeType.homework) {
        if (parentNode.type !== LessonNodeType.lesson) {
          return NextResponse.json(
            {
              success: false,
              error: "Homework can only be added to Lesson",
            },
            { status: 400 },
          );
        }
      } else {
        if (parentNode.type === LessonNodeType.lesson) {
          return NextResponse.json(
            { success: false, error: "Cannot add node to Lesson" },
            { status: 400 },
          );
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

      return NextResponse.json({
        success: true,
        data: newNode,
      });
    }

    // UPDATE NODE
    if (action === "update") {
      if (!courseId || !nodeId) {
        return NextResponse.json(
          { success: false, error: "courseId and nodeId are required" },
          { status: 400 },
        );
      }

      const node = await prisma.lessonNode.findUnique({
        where: { id: nodeId },
        select: { courseId: true },
      });

      if (!node || node.courseId !== courseId) {
        return NextResponse.json(
          { success: false, error: "Node not found or unauthorized" },
          { status: 404 },
        );
      }

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

      return NextResponse.json({
        success: true,
        data: updated,
      });
    }

    // DELETE NODE
    if (action === "delete") {
      if (!courseId || !nodeId) {
        return NextResponse.json(
          { success: false, error: "courseId and nodeId are required" },
          { status: 400 },
        );
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { rootLessonNodeId: true },
      });

      if (!course) {
        return NextResponse.json(
          { success: false, error: "Course not found" },
          { status: 404 },
        );
      }

      if (course.rootLessonNodeId === nodeId) {
        return NextResponse.json(
          { success: false, error: "Cannot delete root node" },
          { status: 400 },
        );
      }

      await prisma.lessonNode.delete({
        where: { id: nodeId },
      });

      return NextResponse.json({
        success: true,
        data: { deletedId: nodeId },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error managing lesson nodes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process",
      },
      { status: 500 },
    );
  }
}
