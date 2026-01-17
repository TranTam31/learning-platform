// app/build/[id]/page.tsx

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import BuildInterface from "@/components/dev/BuildInterface";

export default async function BuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const widget = await prisma.widget.findUnique({
    where: { id },
  });

  if (!widget) {
    redirect("/dashboard");
  }

  return <BuildInterface widget={widget} />;
}
