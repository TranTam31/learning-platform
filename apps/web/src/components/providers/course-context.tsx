"use client";

import { CourseUI } from "@/types/course";
import { createContext, useContext } from "react";

export type CourseContextValue = {
  course: CourseUI;
  role: "org_admin" | "org_member";
};

export const CourseContext = createContext<CourseContextValue | null>(null);

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error("useCourse must be used within CourseProvider");
  }
  return ctx;
}
