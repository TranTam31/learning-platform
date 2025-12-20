"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

export const getCurrentUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Sử dụng prisma.user.findUnique hoặc findFirst
  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  return {
    ...session,
    currentUser,
  };
};

export const getUsers = async (organizationId: string) => {
  try {
    // 1. Lấy danh sách ID của các thành viên đã có trong tổ chức
    const members = await prisma.member.findMany({
      where: {
        organizationId: organizationId,
      },
      select: {
        userId: true,
      },
    });

    const memberUserIds = members.map((m) => m.userId);

    // 2. Lấy những user KHÔNG nằm trong danh sách ID trên (NOT IN)
    const users = await prisma.user.findMany({
      where: {
        id: {
          notIn: memberUserIds,
        },
      },
    });

    return users;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const findUserByEmailAction = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  return user;
};
