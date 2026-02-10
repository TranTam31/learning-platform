import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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
    const homeworkNodeId = request.nextUrl.searchParams.get("homeworkNodeId");

    if (!classId || !homeworkNodeId) {
      return NextResponse.json(
        { success: false, error: "classId and homeworkNodeId are required" },
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

    // Get all ClassLessonNodes (assignments) for this homework
    const assignments = await prisma.classLessonNode.findMany({
      where: {
        lessonNodeId: homeworkNodeId,
        classId,
        type: "homework_imp",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Get student's submission status for each assignment
    const submissionStatus = await prisma.studentAssignment.findMany({
      where: {
        studentId: session.user.id,
        assignmentId: { in: assignments.map((a) => a.id) },
      },
      select: {
        assignmentId: true,
        submissionData: true,
        submittedAt: true,
      },
    });

    // Build submission map
    const submissionMap = new Map(
      submissionStatus.map((s) => [s.assignmentId, s]),
    );

    // Format assignments with submission status
    const formattedAssignments = assignments.map((assignment) => {
      const submission = submissionMap.get(assignment.id);
      const submissionData = submission?.submissionData as any;

      return {
        id: assignment.id,
        title: assignment.content?.title || "Assignment",
        description: assignment.content?.description || "",
        hasSubmitted: submission ? submission.submissionData !== null : false,
        submittedAt: submission?.submittedAt
          ? submission.submittedAt.toISOString()
          : null,
        evaluation: submissionData?.evaluation || null,
        content: assignment.content,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedAssignments,
    });
  } catch (error) {
    console.error("Error getting assignments:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch assignments",
      },
      { status: 500 },
    );
  }
}
