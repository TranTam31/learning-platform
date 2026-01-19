import BuildDetailsView from "@/components/dev/BuildDetailsView";
import prisma from "@/lib/prisma";
import { getBuiltWidgetHtml } from "@/lib/github/github-widget-source";
import { redirect } from "next/navigation";

export default async function BuildDetailsPage({
  params,
}: {
  params: Promise<{ id: string; buildId: string }>;
}) {
  const { id, buildId } = await params;

  const build = await prisma.widgetBuild.findUnique({
    where: { id: buildId },
    include: { widget: true },
  });

  if (!build || build.widgetId !== id) {
    redirect("/dev/dashboard");
  }

  const widgetHtml = build.buildRunId
    ? await getBuiltWidgetHtml({ runId: build.buildRunId })
    : null;

  return (
    <BuildDetailsView
      widget={build.widget}
      build={build}
      widgetHtml={widgetHtml}
    />
  );
}
