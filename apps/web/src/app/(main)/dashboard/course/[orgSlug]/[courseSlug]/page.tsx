import { auth } from "@/lib/auth-server";
import { getCourseBySlug } from "@/server/courses";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    courseSlug: string;
  }>;
}

export default async function CoursePage({ params }: PageProps) {
  const { orgSlug, courseSlug } = await params;

  let course;
  try {
    course = await getCourseBySlug(orgSlug, courseSlug);
  } catch {
    redirect("/dashboard");
  }
  return <div>Course</div>;
}
