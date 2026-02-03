"use client";

import { createContext, useContext } from "react";

export type ClassContextValue = {
  classCourse: any;
  role: "class_teacher" | "class_student" | "class_owner";
};

export const ClassContext = createContext<ClassContextValue | null>(null);

export function useClass() {
  const ctx = useContext(ClassContext);
  if (!ctx) {
    throw new Error("Class must be used within ClassProvider");
  }
  return ctx;
}
