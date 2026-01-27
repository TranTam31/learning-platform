import { CourseNav } from "@/components/course/course-nav";
import { CourseProvider } from "@/components/providers/course-provider";
import { getCourseBySlug, getCourseWithRootNode } from "@/server/courses";
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
    course = await getCourseWithRootNode(orgSlug, courseSlug);
  } catch {
    redirect("/dashboard");
  }

  if (!course) redirect("/dashboard");
  console.log(course);

  const role = course.role === "member" ? "org_member" : "org_admin";

  return (
    <CourseProvider course={course.data} role={role}>
      <div className="">
        {/* <h1 className="font-bold text-2xl">{course.name}</h1>
        <CourseNav /> */}
        <div className="mt-2">{children}</div>
      </div>
    </CourseProvider>
  );
}
