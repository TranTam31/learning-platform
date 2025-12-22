"use server";

import prisma from "@/lib/prisma";
import { isAdmin } from "./permissions";
import { auth } from "@/lib/auth-server";
import { Role } from "@repo/db";
import { headers } from "next/headers";

export const addMember = async (
  organizationId: string,
  userId: string,
  role: Role
) => {
  // Không cần try-catch ở đây nếu bạn muốn component xử lý lỗi hoàn toàn
  await auth.api.addMember({
    body: { userId, organizationId, role },
  });
};

export const removeMember = async (memberId: string) => {
  // const admin = await isAdmin();

  // if (!admin) {
  //   return {
  //     success: false,
  //     error: "You are not authorized to remove members.",
  //   };
  // }

  // try {
  //   await prisma.member.delete({
  //     where: {
  //       id: memberId,
  //     },
  //   });

  //   return {
  //     success: true,
  //     error: null,
  //   };
  // } catch (error) {
  //   console.error(error);
  //   return {
  //     success: false,
  //     error: "Failed to remove member.",
  //   };
  // }
  const data = await auth.api.removeMember({
    body: {
      memberIdOrEmail: memberId, // required
    },
    // This endpoint requires session cookies.
    headers: await headers(),
  });
  console.log("removeMember data:", data);
};
