import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { Prisma } from "@repo/db";
import { NextRequest, NextResponse } from "next/server";

// Get all pending (not submitted) assignments for a class
export async function GET(request: NextRequest) {
  try {
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

    // Get all homework assignments for this class that student has been assigned
    const studentAssignments = await prisma.studentAssignment.findMany({
      where: {
        studentId: session.user.id,
        assignment: {
          classId,
          type: "homework_imp",
        },
        // Only get pending (not submitted)
        submissionData: { equals: Prisma.DbNull },
      },
      include: {
        assignment: {
          include: {
            lessonNode: {
              select: {
                id: true,
                title: true,
                parent: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Format the response
    const pendingAssignments = studentAssignments.map((sa, index) => ({
      assignmentId: sa.assignmentId,
      studentAssignmentId: sa.id,
      title: `Assignment ${index + 1}`,
      homeworkTitle:
        sa.assignment.lessonNode?.parent?.title ||
        sa.assignment.lessonNode?.title ||
        "Homework",
    }));

    return NextResponse.json({
      success: true,
      data: pendingAssignments,
    });
  } catch (error) {
    console.error("Error getting pending assignments:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch pending assignments",
      },
      { status: 500 },
    );
  }
}
