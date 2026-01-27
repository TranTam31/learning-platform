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
  let classCourse;
  try {
    classCourse = await getClassWithCourse(classId);
  } catch {
    redirect("/dashboard");
  }

  if (!classCourse) redirect("/dashboard");

  const role = `class_${classCourse.role}` as
    | "class_owner"
    | "class_teacher"
    | "class_student";

  return (
    <ClassProvider classCourse={classCourse.data} role={role}>
      <div className="">
        <div className="mt-2">{children}</div>
      </div>
    </ClassProvider>
  );
}
