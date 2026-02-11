// app/api/class/assignment/[assignmentId]/students/route.ts
import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const { assignmentId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) throw new Error("Unauthorized");

    // 1️⃣ Lấy thông tin assignment và classId
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

    // 2️⃣ Kiểm tra quyền (teacher/owner của class)
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
      return NextResponse.json(
        { error: "Forbidden: Not a teacher of this class" },
        { status: 403 },
      );
    }

    // 3️⃣ Lấy tất cả học sinh trong class
    const students = await prisma.classMember.findMany({
      where: {
        classId: assignment.classId,
        role: "student",
      },
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
    });

    // 4️⃣ Lấy StudentAssignments của assignment này
    const studentAssignments = await prisma.studentAssignment.findMany({
      where: {
        assignmentId: assignmentId,
      },
      select: {
        id: true,
        studentId: true,
        submissionData: true, // CÓ THỂ NULL (chưa làm) hoặc có data (đã làm)
        submittedAt: true,
      },
    });

    // console.log("Student assignments:", studentAssignments);

    // 5️⃣ Map StudentAssignments với students
    const assignmentMap = new Map(
      studentAssignments.map((sa) => [sa.studentId, sa]),
    );

    const studentsWithStatus = students.map((student) => {
      const studentAssignment = assignmentMap.get(student.userId);

      // LOGIC MỚI:
      // - Chưa giao bài: studentAssignment = undefined
      // - Đã giao nhưng chưa làm: studentAssignment.submissionData = null
      // - Đã làm: studentAssignment.submissionData != null

      const isAssigned = !!studentAssignment; // Đã được giao bài chưa
      const hasSubmitted = !!studentAssignment?.submissionData; // Đã làm bài chưa

      return {
        id: student.userId,
        name: student.user.name,
        email: student.user.email,
        imageUrl: student.user.image,
        isAssigned, // Đã giao bài hay chưa
        hasSubmitted, // Đã làm bài hay chưa
        submission:
          hasSubmitted && studentAssignment
            ? {
                id: studentAssignment.id,
                submittedAt: studentAssignment.submittedAt,
                evaluation: (studentAssignment.submissionData as any)
                  .evaluation,
                answer: (studentAssignment.submissionData as any).answer,
              }
            : null,
      };
    });

    // 6️⃣ Sắp xếp: Chưa giao trước, đã giao chưa làm, đã làm cuối
    studentsWithStatus.sort((a, b) => {
      // Chưa giao bài (chưa assign) → lên đầu
      if (!a.isAssigned && b.isAssigned) return -1;
      if (a.isAssigned && !b.isAssigned) return 1;

      // Cả 2 đều đã giao → Chưa làm lên trước đã làm
      if (a.isAssigned && b.isAssigned) {
        if (!a.hasSubmitted && b.hasSubmitted) return -1;
        if (a.hasSubmitted && !b.hasSubmitted) return 1;
      }

      return 0;
    });

    // 7️⃣ Lấy groups của class
    const groups = await prisma.classGroup.findMany({
      where: { classId: assignment.classId },
      select: {
        id: true,
        name: true,
        description: true,
        classGroupMembers: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Map groups với trạng thái assign của từng member
    const groupsWithStatus = groups.map((group) => {
      const memberIds = group.classGroupMembers.map((m) => m.userId);
      const membersStatus = memberIds.map((uid) => {
        const st = studentsWithStatus.find((s) => s.id === uid);
        return {
          userId: uid,
          isAssigned: st?.isAssigned ?? false,
        };
      });
      const totalMembers = memberIds.length;
      const assignedMembers = membersStatus.filter((m) => m.isAssigned).length;
      const allAssigned = totalMembers > 0 && assignedMembers === totalMembers;

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        memberIds,
        totalMembers,
        assignedMembers,
        allAssigned,
      };
    });

    return NextResponse.json({
      students: studentsWithStatus,
      groups: groupsWithStatus,
      stats: {
        total: studentsWithStatus.length,
        assigned: studentsWithStatus.filter((s) => s.isAssigned).length,
        submitted: studentsWithStatus.filter((s) => s.hasSubmitted).length,
        pending: studentsWithStatus.filter(
          (s) => s.isAssigned && !s.hasSubmitted,
        ).length,
      },
    });
  } catch (error) {
    console.error("[GET_ASSIGNMENT_STUDENTS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
