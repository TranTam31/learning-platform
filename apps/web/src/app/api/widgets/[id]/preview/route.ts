import { getBuiltWidgetHtml } from "@/lib/github/github-widget-source";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { widgetId: string } },
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const buildRunId = searchParams.get("buildRunId");

    if (!buildRunId) {
      return NextResponse.json(
        { error: "buildRunId is required" },
        { status: 400 },
      );
    }

    const html = await getBuiltWidgetHtml({ runId: buildRunId });

    return NextResponse.json({ html });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch widget HTML" },
      { status: 500 },
    );
  }
}
