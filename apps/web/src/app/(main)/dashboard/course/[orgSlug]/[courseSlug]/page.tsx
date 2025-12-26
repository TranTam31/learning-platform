"use client";

import { useCourse } from "@/components/providers/course-context";
import CourseStructureManager from "./_component/course-structure";

export default function CoursePage() {
  const course = useCourse();
  // console.log(course);
  return <CourseStructureManager initialCourse={course} />;
}
