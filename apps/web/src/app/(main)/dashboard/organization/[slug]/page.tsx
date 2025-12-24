"use client";

import { canCreateCourse, getCourses } from "@/server/courses";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateCourseForm } from "@/components/forms/create-course-form";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useOrganization } from "@/components/providers/org-context";

export default function OrganizationPage() {
  const organization = useOrganization();
  const [hasPermission, setHasPermission] = useState(false);
  const {
    data: courses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["courses"],
    queryFn: () => getCourses(),
  });

  useEffect(() => {
    async function check() {
      const result = await canCreateCourse();
      setHasPermission(result.success);
    }
    check();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">Courses</h1>
      {hasPermission && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Create Course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Course</DialogTitle>
              <DialogDescription>
                Create a new course to get started.
              </DialogDescription>
            </DialogHeader>
            <CreateCourseForm />
          </DialogContent>
        </Dialog>
      )}
      {courses?.map((course) => (
        <Button asChild key={course.id} variant="outline">
          <Link href={`/dashboard/course/${organization?.slug}/${course.slug}`}>
            {course.name}
          </Link>
        </Button>
      ))}
    </div>
  );
}
