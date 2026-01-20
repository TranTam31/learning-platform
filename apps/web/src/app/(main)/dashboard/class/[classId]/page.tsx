"use client";

import { useClass } from "@/components/providers/class-context";
import React from "react";

export default function ClassPage() {
  const classCourse = useClass();
  return <div>Class Page</div>;
}
