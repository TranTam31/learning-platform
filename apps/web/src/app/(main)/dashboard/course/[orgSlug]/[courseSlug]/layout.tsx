import { CourseNav } from "@/components/course/course-nav";
import { CourseProvider } from "@/components/providers/course-provider";
import { getCourseBySlug } from "@/server/courses";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    courseSlug: string;
  }>;
  children?: React.ReactNode;
}

export default async function CourseLayout({ children, params }: PageProps) {
  const { orgSlug, courseSlug } = await params;

  let course;
  try {
    course = await getCourseBySlug(orgSlug, courseSlug);
  } catch {
    redirect("/dashboard");
  }

  if (!course) redirect("/dashboard");
  return (
    <CourseProvider course={course}>
      <div className="flex flex-col gap-4 py-6 px-4 max-w-4xl mx-auto w-full">
        <h1 className="font-bold text-2xl">{course.name}</h1>
        <CourseNav />
        <div className="mt-2">{children}</div>
      </div>
    </CourseProvider>
  );
}
