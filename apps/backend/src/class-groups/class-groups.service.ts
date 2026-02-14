import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertTeacherOrOwner(classId: string, userId: string) {
    const member = await this.prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId } },
      select: { userId: true, role: true },
    });
    if (!member) throw new Error('Forbidden');
    if (member.role !== 'owner' && member.role !== 'teacher') {
      throw new Error('Only teachers and owners can manage groups');
    }
    return member;
  }

  async createClassGroup(
    classId: string,
    name: string,
    userId: string,
    description?: string,
  ) {
    await this.assertTeacherOrOwner(classId, userId);

    return this.prisma.classGroup.create({
      data: {
        classId,
        name,
        description: description || null,
      },
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
    });
  }

  async updateClassGroup(
    classId: string,
    groupId: string,
    name: string,
    userId: string,
    description?: string,
  ) {
    await this.assertTeacherOrOwner(classId, userId);

    return this.prisma.classGroup.update({
      where: { id: groupId },
      data: {
        name,
        description: description || null,
      },
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
    });
  }

  async deleteClassGroup(classId: string, groupId: string, userId: string) {
    await this.assertTeacherOrOwner(classId, userId);

    await this.prisma.classGroup.delete({
      where: { id: groupId },
    });
  }

  async addMemberToGroup(
    classId: string,
    groupId: string,
    memberUserId: string,
    requesterId: string,
  ) {
    await this.assertTeacherOrOwner(classId, requesterId);

    return this.prisma.classGroupMember.create({
      data: {
        classGroupId: groupId,
        userId: memberUserId,
      },
      select: {
        id: true,
        userId: true,
        joinedAt: true,
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  async removeMemberFromGroup(
    classId: string,
    groupId: string,
    memberUserId: string,
    requesterId: string,
  ) {
    await this.assertTeacherOrOwner(classId, requesterId);

    await this.prisma.classGroupMember.delete({
      where: {
        classGroupId_userId: {
          classGroupId: groupId,
          userId: memberUserId,
        },
      },
    });
  }
}
