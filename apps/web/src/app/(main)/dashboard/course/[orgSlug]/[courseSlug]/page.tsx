"use client";

import { useCourse } from "@/components/providers/course-context";

export default function CoursePage() {
  const course = useCourse();
  return <div>{course.rootLessonNodeId}</div>;
}
