"use client";
import ClassNav from "@/components/class/ClassNav";
import { useClass } from "@/components/providers/class-context";

export default function ClassDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { classCourse, role } = useClass();
  return (
    <div className="flex flex-col gap-4 py-6 px-4 max-w-4xl mx-auto w-full">
      <h1 className="font-bold text-2xl">{classCourse.name}</h1>
      <ClassNav />
      <div className="mt-2">{children}</div>
    </div>
  );
}
