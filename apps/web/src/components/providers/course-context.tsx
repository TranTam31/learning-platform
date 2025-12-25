"use client";

import { Course } from "@repo/db";
import { createContext, useContext } from "react";

export const CourseContext = createContext<Course | null>(null);

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error("useCourse must be used within CourseProvider");
  }
  return ctx;
}
