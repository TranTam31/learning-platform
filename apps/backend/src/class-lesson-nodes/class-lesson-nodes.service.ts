import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@repo/db';

@Injectable()
export class ClassLessonNodesService {
  constructor(private readonly prisma: PrismaService) {}

  async loadClassLessonNode(
    lessonNodeId: string,
    classId: string,
    userId: string,
  ) {
    try {
      const membership = await this.prisma.classMember.findUnique({
        where: { classId_userId: { classId, userId } },
        select: { role: true },
      });

      if (!membership) {
        return {
          success: false,
          error: 'Forbidden: Not a member of this class',
        };
      }

      const isTeacher =
        membership.role === 'teacher' || membership.role === 'owner';
      const isStudent = membership.role === 'student';

      if (isTeacher) {
        const classLessonNodes = await this.prisma.classLessonNode.findMany({
          where: { lessonNodeId, classId },
          orderBy: { createdAt: 'desc' },
          select: { id: true, type: true, content: true, createdAt: true },
        });

        return { success: true, data: classLessonNodes };
      } else if (isStudent) {
        const allClassLessonNodes = await this.prisma.classLessonNode.findMany({
          where: { lessonNodeId, classId },
          orderBy: { createdAt: 'desc' },
          select: { id: true, type: true, content: true, createdAt: true },
        });

        if (allClassLessonNodes.length === 0) {
          return { success: true, data: [] };
        }

        const homeworkNodes = allClassLessonNodes.filter(
          (node) => node.type === 'homework_imp',
        );
        const noteNodes = allClassLessonNodes.filter(
          (node) => node.type === 'lesson_note',
        );

        const assignedHomeworkIds = new Set<string>();
        if (homeworkNodes.length > 0) {
          const studentAssignments =
            await this.prisma.studentAssignment.findMany({
              where: {
                studentId: userId,
                assignmentId: { in: homeworkNodes.map((node) => node.id) },
              },
              select: { assignmentId: true },
            });
          studentAssignments.forEach((sa) =>
            assignedHomeworkIds.add(sa.assignmentId),
          );
        }

        const assignedNoteIds = new Set<string>();
        if (noteNodes.length > 0) {
          const studentNotes = await this.prisma.studentNote.findMany({
            where: {
              studentId: userId,
              noteId: { in: noteNodes.map((node) => node.id) },
            },
            select: { noteId: true },
          });
          studentNotes.forEach((sn) => assignedNoteIds.add(sn.noteId));
        }

        const assignedClassLessonNodes = allClassLessonNodes.filter((node) => {
          if (node.type === 'homework_imp')
            return assignedHomeworkIds.has(node.id);
          if (node.type === 'lesson_note') return assignedNoteIds.has(node.id);
          return false;
        });

        // Sort: incomplete homework first
        const submittedHomeworkIds = new Set<string>();
        if (homeworkNodes.length > 0) {
          const submittedAssignments =
            await this.prisma.studentAssignment.findMany({
              where: {
                studentId: userId,
                assignmentId: { in: homeworkNodes.map((node) => node.id) },
                submissionData: { not: Prisma.DbNull },
              },
              select: { assignmentId: true },
            });
          submittedAssignments.forEach((sa) =>
            submittedHomeworkIds.add(sa.assignmentId),
          );
        }

        assignedClassLessonNodes.sort((a, b) => {
          if (a.type === 'homework_imp' && b.type === 'homework_imp') {
            const aSubmitted = submittedHomeworkIds.has(a.id);
            const bSubmitted = submittedHomeworkIds.has(b.id);
            if (aSubmitted === bSubmitted) return 0;
            return aSubmitted ? 1 : -1;
          }
          return 0;
        });

        return { success: true, data: assignedClassLessonNodes };
      } else {
        return { success: false, error: 'Invalid role' };
      }
    } catch (error) {
      console.error('Error loading class lesson node:', error);
      return {
        success: false,
        error: 'Có lỗi xảy ra khi load class lesson node',
      };
    }
  }

  async getClassLessonNodeCounts(
    lessonNodeIds: string[],
    classId: string,
    userId: string,
  ) {
    try {
      const membership = await this.prisma.classMember.findUnique({
        where: { classId_userId: { classId, userId } },
        select: { role: true },
      });

      if (!membership) {
        return {
          success: false,
          error: 'Forbidden: Not a member of this class',
        };
      }

      const isTeacher =
        membership.role === 'teacher' || membership.role === 'owner';
      const isStudent = membership.role === 'student';

      const result: Record<
        string,
        { lesson_note: number; homework_imp: number }
      > = {};

      lessonNodeIds.forEach((nodeId) => {
        result[nodeId] = { lesson_note: 0, homework_imp: 0 };
      });

      if (isTeacher) {
        const counts = await this.prisma.classLessonNode.groupBy({
          by: ['lessonNodeId', 'type'],
          where: { lessonNodeId: { in: lessonNodeIds }, classId },
          _count: { id: true },
        });

        counts.forEach((item) => {
          result[item.lessonNodeId][item.type] = item._count.id;
        });

        return { success: true, data: result };
      } else if (isStudent) {
        const allClassLessonNodes = await this.prisma.classLessonNode.findMany({
          where: { lessonNodeId: { in: lessonNodeIds }, classId },
          select: { id: true, lessonNodeId: true, type: true },
        });

        if (allClassLessonNodes.length === 0) {
          return { success: true, data: result };
        }

        const homeworkNodes = allClassLessonNodes.filter(
          (node) => node.type === 'homework_imp',
        );
        const noteNodes = allClassLessonNodes.filter(
          (node) => node.type === 'lesson_note',
        );

        const assignedHomeworkIds = new Set<string>();
        if (homeworkNodes.length > 0) {
          const studentAssignments =
            await this.prisma.studentAssignment.findMany({
              where: {
                studentId: userId,
                assignmentId: { in: homeworkNodes.map((node) => node.id) },
              },
              select: { assignmentId: true },
            });
          studentAssignments.forEach((sa) =>
            assignedHomeworkIds.add(sa.assignmentId),
          );
        }

        const assignedNoteIds = new Set<string>();
        if (noteNodes.length > 0) {
          const studentNotes = await this.prisma.studentNote.findMany({
            where: {
              studentId: userId,
              noteId: { in: noteNodes.map((node) => node.id) },
            },
            select: { noteId: true },
          });
          studentNotes.forEach((sn) => assignedNoteIds.add(sn.noteId));
        }

        allClassLessonNodes.forEach((node) => {
          const isAssigned =
            (node.type === 'homework_imp' &&
              assignedHomeworkIds.has(node.id)) ||
            (node.type === 'lesson_note' && assignedNoteIds.has(node.id));

          if (isAssigned) {
            result[node.lessonNodeId][node.type]++;
          }
        });

        return { success: true, data: result };
      } else {
        return { success: false, error: 'Invalid role' };
      }
    } catch (error) {
      console.error('Error getting class lesson node counts:', error);
      return { success: false, error: 'Có lỗi xảy ra' };
    }
  }

  async addClassLessonNode(input: {
    lessonNodeId: string;
    classId: string;
    type: 'lesson_note' | 'homework_imp';
    content: any;
  }) {
    try {
      const { lessonNodeId, classId, type, content } = input;

      const lessonNode = await this.prisma.lessonNode.findUnique({
        where: { id: lessonNodeId },
        select: { id: true, type: true },
      });

      if (!lessonNode) {
        return { success: false, error: 'LessonNode không tồn tại' };
      }

      if (type === 'lesson_note' && lessonNode.type !== 'lesson') {
        return { success: false, error: 'lesson_note chỉ dành cho Lesson' };
      }

      if (type === 'homework_imp' && lessonNode.type !== 'homework') {
        return { success: false, error: 'homework_imp chỉ dành cho Homework' };
      }

      const classLessonNode = await this.prisma.classLessonNode.create({
        data: { lessonNodeId, classId, type, content },
        select: { id: true, type: true, content: true, createdAt: true },
      });

      return { success: true, data: classLessonNode };
    } catch (error) {
      console.error('Error adding class lesson node:', error);
      return {
        success: false,
        error: 'Có lỗi xảy ra khi thêm class lesson node',
      };
    }
  }

  async deleteClassLessonNode(classLessonNodeId: string, classId: string) {
    try {
      const classLessonNode = await this.prisma.classLessonNode.findUnique({
        where: { id: classLessonNodeId },
        select: { classId: true },
      });

      if (!classLessonNode || classLessonNode.classId !== classId) {
        return { success: false, error: 'Không có quyền xóa' };
      }

      await this.prisma.classLessonNode.delete({
        where: { id: classLessonNodeId },
      });

      return { success: true, data: { deletedId: classLessonNodeId } };
    } catch (error) {
      console.error('Error deleting class lesson node:', error);
      return { success: false, error: 'Có lỗi xảy ra khi xóa' };
    }
  }

  async getBuildRunId(lessonNodeId: string) {
    const lessonNode = await this.prisma.lessonNode.findUnique({
      where: { id: lessonNodeId },
      select: { content: true },
    });

    if (!lessonNode?.content) {
      return { widgetId: null, buildRunId: null };
    }

    const content = lessonNode.content as {
      widgetId?: string;
      widgetBuildId?: string;
    };

    const widgetId = content.widgetId ?? null;

    if (!content.widgetBuildId) {
      return { widgetId, buildRunId: null };
    }

    const widgetBuild = await this.prisma.widgetBuild.findUnique({
      where: { id: content.widgetBuildId },
      select: { buildRunId: true },
    });

    return {
      widgetId,
      buildRunId: widgetBuild?.buildRunId ?? null,
    };
  }

  async getAssignmentStatsBatch(classId: string, userId: string) {
    const membership = await this.prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId } },
      select: { role: true },
    });

    if (
      !membership ||
      (membership.role !== 'teacher' && membership.role !== 'owner')
    ) {
      return { success: false, error: 'Forbidden' };
    }

    try {
      const totalStudents = await this.prisma.classMember.count({
        where: { classId, role: 'student' },
      });

      const classLessonNodes = await this.prisma.classLessonNode.findMany({
        where: { classId, type: 'homework_imp' },
        select: { id: true },
      });

      if (classLessonNodes.length === 0) {
        return { success: true, data: {} };
      }

      const clnIds = classLessonNodes.map((cln) => cln.id);

      const studentAssignments = await this.prisma.studentAssignment.findMany({
        where: { assignmentId: { in: clnIds } },
        select: { assignmentId: true, submissionData: true },
      });

      const statsMap: Record<
        string,
        { total: number; assigned: number; submitted: number }
      > = {};

      clnIds.forEach((id) => {
        statsMap[id] = { total: totalStudents, assigned: 0, submitted: 0 };
      });

      studentAssignments.forEach((sa) => {
        if (statsMap[sa.assignmentId]) {
          statsMap[sa.assignmentId].assigned += 1;
          if (sa.submissionData !== null) {
            statsMap[sa.assignmentId].submitted += 1;
          }
        }
      });

      return { success: true, data: statsMap };
    } catch (error) {
      console.error('Error getting assignment stats batch:', error);
      return { success: false, error: 'Có lỗi xảy ra' };
    }
  }
}
