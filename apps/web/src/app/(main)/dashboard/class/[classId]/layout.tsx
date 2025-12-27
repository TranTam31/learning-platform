import { ClassProvider } from "@/components/providers/class-provider";
import { checkUserInClass, getClass } from "@/server/classes";
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
    await checkUserInClass(classId);
    classCourse = await getClass(classId);
  } catch {
    redirect("/dashboard");
  }

  if (!classCourse) redirect("/dashboard");

  return (
    <ClassProvider classCourse={classCourse}>
      <div className="">
        <div className="mt-2">{children}</div>
      </div>
    </ClassProvider>
  );
}
