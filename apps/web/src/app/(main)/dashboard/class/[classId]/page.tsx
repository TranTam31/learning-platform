"use client";

import CourseStructureManager from "@/components/course-structure/course-structure-manager";
import { useClass } from "@/components/providers/class-context";
import React from "react";

export default function ClassPage() {
  const classCourse = useClass();
  console.log(classCourse);
  return (
    // <CourseStructureManager
    //   initialCourse={course}
    //   userRole="class_student"
    //   classId={classCourse.}
    // />
    <div>Class</div>
  );
}
