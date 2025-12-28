"use client";

// import CourseStructureManager from "@/components/course-structure";
import { useCourse } from "@/components/providers/course-context";
import CourseStructureManager from "./_component/course-structure-opti";

export default function CoursePage() {
  const course = useCourse();
  // console.log(course);
  return (
    <CourseStructureManager
      initialCourse={course}
      userRole="class_student"
      classId="cmjn5vclx00004c5a01sx41vg"
    />
  );
}
