"use client";

import { ClassContext } from "./class-context";

export function ClassProvider({
  classCourse,
  role,
  children,
}: {
  classCourse: any;
  role: "class_teacher" | "class_student" | "class_owner";
  children: React.ReactNode;
}) {
  return (
    <ClassContext.Provider value={{ classCourse, role }}>
      {children}
    </ClassContext.Provider>
  );
}
