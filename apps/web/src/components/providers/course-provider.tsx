"use client";

import { CourseUI } from "@/types/course";
import { CourseContext } from "./course-context";

export function CourseProvider({
  course,
  role,
  children,
}: {
  course: any;
  role: "org_admin" | "org_member";
  children: React.ReactNode;
}) {
  return (
    <CourseContext.Provider value={{ course, role }}>
      {children}
    </CourseContext.Provider>
  );
}
