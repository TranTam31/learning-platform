"use client";

import CourseStructureManager from "@/components/course-structure/course-structure-manager";
import { useClass } from "@/components/providers/class-context";

export default function ClassPage() {
  const { classCourse, role } = useClass();
  return (
    <CourseStructureManager
      initialCourse={classCourse.course}
      userRole={role}
      classId={classCourse.id}
    />
  );
}
