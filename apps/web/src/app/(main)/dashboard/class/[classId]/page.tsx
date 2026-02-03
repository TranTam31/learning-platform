"use client";

import CourseStructureManager from "@/components/course-structure/course-structure-manager";
import { useClass } from "@/components/providers/class-context";

export default function ClassPage() {
  const { classCourse, role } = useClass();
  // console.log(classCourse);
  return (
    <CourseStructureManager
      initialCourse={classCourse.courseUI}
      userRole={role}
      classId={classCourse.id}
    />
  );
}
