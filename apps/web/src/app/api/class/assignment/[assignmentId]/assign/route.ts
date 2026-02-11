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
    const { studentId, studentIds } = body;

    // Support both single studentId and bulk studentIds
    const idsToAssign: string[] = studentIds
      ? studentIds
      : studentId
        ? [studentId]
        : [];

    if (idsToAssign.length === 0) {
      return NextResponse.json(
        { error: "Missing studentId or studentIds" },
        { status: 400 },
      );
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

    // 3️⃣ Kiểm tra tất cả students có trong class không
    const studentMemberships = await prisma.classMember.findMany({
      where: {
        classId: assignment.classId,
        userId: { in: idsToAssign },
        role: "student",
      },
      select: { userId: true },
    });

    const validStudentIds = studentMemberships.map((m) => m.userId);

    if (validStudentIds.length === 0) {
      return NextResponse.json(
        { error: "No valid students found in this class" },
        { status: 404 },
      );
    }

    // 4️⃣ Lấy danh sách đã được giao rồi để skip
    const existingAssignments = await prisma.studentAssignment.findMany({
      where: {
        assignmentId: assignmentId,
        studentId: { in: validStudentIds },
      },
      select: { studentId: true },
    });

    const alreadyAssignedIds = new Set(
      existingAssignments.map((a) => a.studentId),
    );
    const newStudentIds = validStudentIds.filter(
      (id) => !alreadyAssignedIds.has(id),
    );

    // 5️⃣ Tạo StudentAssignment cho những người chưa được giao
    if (newStudentIds.length > 0) {
      await prisma.studentAssignment.createMany({
        data: newStudentIds.map((sid) => ({
          studentId: sid,
          assignmentId: assignmentId,
          submittedAt: null,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      assigned: newStudentIds.length,
      skipped: alreadyAssignedIds.size,
      total: validStudentIds.length,
    });
  } catch (error) {
    console.error("[ASSIGN_TO_STUDENT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
