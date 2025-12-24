"use server";

import { auth } from "@/lib/auth-server";
import { Role } from "@repo/db";

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
