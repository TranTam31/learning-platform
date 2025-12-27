"use client";

import { createContext, useContext } from "react";

export const ClassContext = createContext<any | null>(null);

export function useClass() {
  const ctx = useContext(ClassContext);
  if (!ctx) {
    throw new Error("Class must be used within ClassProvider");
  }
  return ctx;
}
