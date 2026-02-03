import { buildTreeFromFlatList } from "@/components/course-structure/utils/course-structure-utiles";
import { ClassProvider } from "@/components/providers/class-provider";
import { getClassWithCourse } from "@/server/classes";
import { redirect } from "next/navigation";

type Params = Promise<{ classId: string }>;

export default async function ClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { classId } = await params;
  let result;
  try {
    result = await getClassWithCourse(classId);
  } catch {
    redirect("/dashboard");
  }

  if (!result.success || !result.data) {
    redirect("/dashboard");
  }

  const role = `class_${result.role}` as
    | "class_owner"
    | "class_teacher"
    | "class_student";

  const { classData, nodes } = result.data;
  const rootNode = buildTreeFromFlatList(nodes);

  if (!rootNode) {
    console.error("Failed to build tree");
    redirect("/dashboard");
  }

  const courseUI = {
    ...classData.course,
    rootLessonNode: rootNode,
  };

  const classCourse = {
    ...classData,
    courseUI,
  };

  return (
    <ClassProvider classCourse={classCourse} role={role}>
      <div className="">
        <div className="mt-2">{children}</div>
      </div>
    </ClassProvider>
  );
}
