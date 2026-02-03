// app/api/class/assignment/[assignmentId]/assign/route.ts

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
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    // 1️⃣ Lấy thông tin assignment
    const assignment = await prisma.classLessonNode.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        classId: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    // 2️⃣ Kiểm tra quyền teacher
    const membership = await prisma.classMember.findUnique({
      where: {
        classId_userId: {
          classId: assignment.classId,
          userId: session.user.id,
        },
      },
    });

    if (
      !membership ||
      (membership.role !== "teacher" && membership.role !== "owner")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3️⃣ Kiểm tra student có trong class không
    const studentMembership = await prisma.classMember.findUnique({
      where: {
        classId_userId: {
          classId: assignment.classId,
          userId: studentId,
        },
      },
    });

    if (!studentMembership || studentMembership.role !== "student") {
      return NextResponse.json(
        { error: "Student not found in this class" },
        { status: 404 },
      );
    }

    // 4️⃣ Tạo StudentAssignment (nếu chưa có)
    const studentAssignment = await prisma.studentAssignment.upsert({
      where: {
        studentId_assignmentId: {
          studentId: studentId,
          assignmentId: assignmentId,
        },
      },
      create: {
        studentId: studentId,
        assignmentId: assignmentId,
        submissionData: undefined,
        submittedAt: null,
      },
      update: {
        // Không update gì nếu đã tồn tại
      },
    });

    return NextResponse.json({
      success: true,
      studentAssignment: {
        id: studentAssignment.id,
        studentId: studentAssignment.studentId,
        assignmentId: studentAssignment.assignmentId,
      },
    });
  } catch (error) {
    console.error("[ASSIGN_TO_STUDENT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
