"use server";

import prisma from "@/lib/prisma";
import { checkUserInClass } from "./classes";
import { revalidatePath } from "next/cache";

async function assertTeacherOrOwner(classId: string) {
  const member = await checkUserInClass(classId);
  if (!member) throw new Error("Forbidden");
  if (member.role !== "owner" && member.role !== "teacher") {
    throw new Error("Only teachers and owners can manage groups");
  }
  return member;
}

export async function createClassGroup(
  classId: string,
  name: string,
  description?: string,
) {
  await assertTeacherOrOwner(classId);

  const group = await prisma.classGroup.create({
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
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  revalidatePath(`/dashboard/class/${classId}`);
  return group;
}

export async function deleteClassGroup(classId: string, groupId: string) {
  await assertTeacherOrOwner(classId);

  await prisma.classGroup.delete({
    where: { id: groupId },
  });

  revalidatePath(`/dashboard/class/${classId}`);
}

export async function updateClassGroup(
  classId: string,
  groupId: string,
  name: string,
  description?: string,
) {
  await assertTeacherOrOwner(classId);

  const group = await prisma.classGroup.update({
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
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  revalidatePath(`/dashboard/class/${classId}`);
  return group;
}

export async function addMemberToGroup(
  classId: string,
  groupId: string,
  userId: string,
) {
  await assertTeacherOrOwner(classId);

  const member = await prisma.classGroupMember.create({
    data: {
      classGroupId: groupId,
      userId,
    },
    select: {
      id: true,
      userId: true,
      joinedAt: true,
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

  revalidatePath(`/dashboard/class/${classId}`);
  return member;
}

export async function removeMemberFromGroup(
  classId: string,
  groupId: string,
  userId: string,
) {
  await assertTeacherOrOwner(classId);

  await prisma.classGroupMember.delete({
    where: {
      classGroupId_userId: {
        classGroupId: groupId,
        userId,
      },
    },
  });

  revalidatePath(`/dashboard/class/${classId}`);
}
