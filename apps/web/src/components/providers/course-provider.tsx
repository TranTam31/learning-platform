"use client";

import { CourseContext } from "./course-context";

export function CourseProvider({
  course,
  children,
}: {
  course: any;
  children: React.ReactNode;
}) {
  return (
    <CourseContext.Provider value={course}>{children}</CourseContext.Provider>
  );
}
