"use client";

import ClassMembersTable from "@/components/class/ClassMembersTable";
import ClassSearchUser from "@/components/class/ClassSearchUser";
import { useClass } from "@/components/providers/class-context";

export default function ClassMembersPage() {
  const { classCourse } = useClass();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">Members</h1>
      <ClassMembersTable members={classCourse.members || []} />
      <ClassSearchUser />
    </div>
  );
}
