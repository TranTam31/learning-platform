// app/build/[widgetId]/details/[buildId]/page.tsx

import BuildDetailsView from "@/components/dev/BuildDetailsView";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function BuildDetailsPage({
  params,
}: {
  params: Promise<{ id: string; buildId: string }>;
}) {
  const { id, buildId } = await params;
  const build = await prisma.widgetBuild.findUnique({
    where: { id: buildId },
    include: {
      widget: true,
    },
  });

  if (!build) {
    redirect("/dev/dashboard");
  }

  // Check widget ID matches
  if (build.widgetId !== id) {
    redirect("/dev/dashboard");
  }

  return <BuildDetailsView widget={build.widget} build={build} />;
}
