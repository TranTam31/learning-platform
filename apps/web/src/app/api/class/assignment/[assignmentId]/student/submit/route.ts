// app/api/student/assignment/[assignmentId]/submit/route.ts

import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const { assignmentId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) throw new Error("Unauthorized");
    const body = await request.json();

    const { answer, evaluation } = body;

    if (!answer || !evaluation) {
      return NextResponse.json(
        { error: "Missing answer or evaluation" },
        { status: 400 },
      );
    }

    // Validate evaluation structure
    if (
      typeof evaluation.isCorrect !== "boolean" ||
      typeof evaluation.score !== "number" ||
      typeof evaluation.maxScore !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid evaluation format" },
        { status: 400 },
      );
    }

    // Kiểm tra assignment tồn tại
    const assignment = await prisma.classLessonNode.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    // Lưu submission (upsert để tránh duplicate)
    const submission = await prisma.studentAssignment.upsert({
      where: {
        studentId_assignmentId: {
          studentId: session.user.id,
          assignmentId: assignmentId,
        },
      },
      create: {
        studentId: session.user.id,
        assignmentId: assignmentId,
        submissionData: {
          answer,
          evaluation,
        },
        submittedAt: new Date(),
      },
      update: {
        submissionData: {
          answer,
          evaluation,
        },
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    console.error("[SUBMIT_ASSIGNMENT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
