"use server";

import prisma from "@/lib/prisma";

export const findUserByEmailAction = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  return user;
};
