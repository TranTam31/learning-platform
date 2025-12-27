"use client";

import { ClassContext } from "./class-context";

export function ClassProvider({
  classCourse,
  children,
}: {
  classCourse: any;
  children: React.ReactNode;
}) {
  return (
    <ClassContext.Provider value={classCourse}>
      {children}
    </ClassContext.Provider>
  );
}
