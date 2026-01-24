import { getBuildRunIdFromLessonNode } from "@/server/class-addons";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lessonNodeId = searchParams.get("lessonNodeId");

  if (!lessonNodeId) {
    return NextResponse.json(
      { error: "lessonNodeId is required" },
      { status: 400 },
    );
  }

  try {
    const { widgetId, buildRunId } =
      await getBuildRunIdFromLessonNode(lessonNodeId);

    // Không có cả widgetId lẫn buildRunId
    if (!widgetId && !buildRunId) {
      return NextResponse.json(
        {
          widgetId: null,
          buildRunId: null,
          message: "Not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      widgetId,
      buildRunId,
    });
  } catch (error) {
    console.error("[GET_BUILD_RUN_ID_ERROR]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
