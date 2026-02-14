import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassRole } from '@repo/db';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async checkUserInClass(classId: string, userId: string) {
    return this.prisma.classMember.findUnique({
      where: {
        classId_userId: { classId, userId },
      },
      select: {
        userId: true,
        role: true,
      },
    });
  }

  async getUserClasses(userId: string) {
    const classMembers = await this.prisma.classMember.findMany({
      where: { userId },
      include: {
        class: {
          include: {
            course: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return {
      owner: classMembers
        .filter((cm) => cm.role === ClassRole.owner)
        .map((cm) => ({ ...cm.class, role: cm.role, joinedAt: cm.joinedAt })),
      teacher: classMembers
        .filter((cm) => cm.role === ClassRole.teacher)
        .map((cm) => ({ ...cm.class, role: cm.role, joinedAt: cm.joinedAt })),
      student: classMembers
        .filter((cm) => cm.role === ClassRole.student)
        .map((cm) => ({ ...cm.class, role: cm.role, joinedAt: cm.joinedAt })),
    };
  }

  async getClassWithCourse(classId: string, userId: string) {
    const isMember = await this.checkUserInClass(classId, userId);
    if (!isMember) throw new Error('Forbidden');

    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        groups: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            classGroupMembers: {
              select: {
                id: true,
                userId: true,
                joinedAt: true,
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
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

    if (!classData) throw new Error('Class not found');

    const allNodes = await this.prisma.lessonNode.findMany({
      where: { courseId: classData.course.id },
      orderBy: { order: 'asc' },
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
        _count: { select: { children: true } },
      },
    });

    return {
      success: true,
      data: { classData, nodes: allNodes },
      role: isMember.role,
    };
  }

  async createClass(
    name: string,
    courseId: string,
    organizationId: string,
    userId: string,
  ) {
    // Check membership in the org
    const isMember = await this.prisma.member.findFirst({
      where: {
        userId,
        organization: { id: organizationId },
      },
      select: { userId: true },
    });

    if (!isMember) throw new Error('Forbidden');

    return this.prisma.$transaction(async (tx) => {
      const newClass = await tx.class.create({
        data: { name, courseId },
      });

      await tx.classMember.create({
        data: {
          classId: newClass.id,
          userId: isMember.userId,
          role: ClassRole.owner,
        },
      });
    });
  }

  async addClassMember(classId: string, userId: string, role: ClassRole) {
    return this.prisma.classMember.create({
      data: { classId, userId, role },
    });
  }

  async getClassStudents(classId: string, requesterId: string) {
    const membership = await this.prisma.classMember.findUnique({
      where: {
        classId_userId: { classId, userId: requesterId },
      },
      select: { role: true },
    });

    if (!membership || !['teacher', 'owner'].includes(membership.role)) {
      throw new Error('Forbidden');
    }

    const students = await this.prisma.classMember.findMany({
      where: { classId, role: 'student' },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return students.map((s) => ({
      id: s.userId,
      name: s.user.name || 'Unknown',
      email: s.user.email,
      image: s.user.image,
    }));
  }

  async getStudentPendingAssignments(classId: string, userId: string) {
    try {
      const membership = await this.prisma.classMember.findUnique({
        where: { classId_userId: { classId, userId } },
        select: { role: true },
      });

      if (!membership || membership.role !== 'student') {
        return { success: true, data: { pending: 0, total: 0 } };
      }

      const studentAssignments = await this.prisma.studentAssignment.findMany({
        where: {
          studentId: userId,
          assignment: { classId, type: 'homework_imp' },
        },
        select: { id: true, submissionData: true },
      });

      const pendingCount = studentAssignments.filter(
        (sa) => sa.submissionData === null,
      ).length;

      return {
        success: true,
        data: { pending: pendingCount, total: studentAssignments.length },
      };
    } catch (error) {
      console.error('Error getting student pending assignments:', error);
      return { success: false, error: 'Có lỗi xảy ra' };
    }
  }

  async getPendingAssignmentsBatch(classIds: string[], userId: string) {
    try {
      const studentAssignments = await this.prisma.studentAssignment.findMany({
        where: {
          studentId: userId,
          assignment: { classId: { in: classIds }, type: 'homework_imp' },
        },
        select: {
          id: true,
          submissionData: true,
          assignment: { select: { classId: true } },
        },
      });

      const result: Record<string, { pending: number; total: number }> = {};
      classIds.forEach((classId) => {
        result[classId] = { pending: 0, total: 0 };
      });

      studentAssignments.forEach((sa) => {
        const classId = sa.assignment.classId;
        result[classId].total++;
        if (sa.submissionData === null) {
          result[classId].pending++;
        }
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting pending assignments batch:', error);
      return { success: false, error: 'Có lỗi xảy ra' };
    }
  }
}
