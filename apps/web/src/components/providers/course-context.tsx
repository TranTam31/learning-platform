"use client";

import { CourseUI } from "@/types/course";
import { createContext, useContext } from "react";

export const CourseContext = createContext<CourseUI | null>(null);

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error("useCourse must be used within CourseProvider");
  }
  return ctx;
}
