import { CourseNav } from "@/components/course/course-nav";
import { CourseProvider } from "@/components/providers/course-provider";
import { getCourseWithFullTreeBySlug } from "@/server/courses";
import { redirect } from "next/navigation";
import { buildTreeFromFlatList } from "@/components/course-structure/utils/course-structure-utiles";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    courseSlug: string;
  }>;
  children?: React.ReactNode;
}

export default async function CourseLayout({ children, params }: PageProps) {
  const { orgSlug, courseSlug } = await params;

  // Load course với FULL TREE một lần duy nhất
  let result;
  try {
    result = await getCourseWithFullTreeBySlug(orgSlug, courseSlug);
  } catch (error) {
    console.error("Error loading course:", error);
    redirect("/dashboard");
  }

  if (!result.success || !result.data) {
    redirect("/dashboard");
  }

  const { course, nodes } = result.data;
  const role = result.role === "member" ? "org_member" : "org_admin";

  // Build tree từ flat nodes
  const rootNode = buildTreeFromFlatList(nodes);

  if (!rootNode) {
    console.error("Failed to build tree");
    redirect("/dashboard");
  }

  // Tạo CourseUI object
  const courseUI = {
    ...course,
    rootLessonNode: rootNode,
  };
  // console.log("course info: ", courseUI);

  return (
    <CourseProvider course={courseUI} role={role}>
      <div className="">
        {/* <h1 className="font-bold text-2xl">{course.name}</h1>
        <CourseNav /> */}
        <div className="mt-2">{children}</div>
      </div>
    </CourseProvider>
  );
}
