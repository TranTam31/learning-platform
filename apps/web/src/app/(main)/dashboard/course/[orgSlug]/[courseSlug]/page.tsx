"use client";

import CourseStructureManager from "@/components/course-structure/course-structure-manager";
// import CourseStructureManager from "@/components/course-structure";
import { useCourse } from "@/components/providers/course-context";
// import CourseStructureManager from "./_component/course-structure-opti";

export default function CoursePage() {
  const course = useCourse();
  // console.log(course);
  return (
    <CourseStructureManager
      initialCourse={course}
      userRole="class_teacher"
      classId="cmjn5vclx00004c5a01sx41vg"
    />
    // <CourseStructureManager initialCourse={course} userRole="org_admin" />
  );
}
