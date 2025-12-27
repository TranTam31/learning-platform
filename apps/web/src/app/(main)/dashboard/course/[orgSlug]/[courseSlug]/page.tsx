"use client";

// import CourseStructureManager from "@/components/course-structure";
import { useCourse } from "@/components/providers/course-context";
import { UserRole } from "@/types/course-structure";
import CourseStructureManager from "./_component/course-structure-opti";

export default function CoursePage() {
  const course = useCourse();
  // console.log(course);
  return <CourseStructureManager initialCourse={course} />;
}
