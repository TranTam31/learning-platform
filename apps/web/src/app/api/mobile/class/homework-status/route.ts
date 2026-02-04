import { auth } from "@/lib/auth-server";
import { _getStudentHomeworkStatusByClassInternal } from "@/server/courses";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const classId = request.nextUrl.searchParams.get("classId");
    const courseId = request.nextUrl.searchParams.get("courseId");

    if (!classId || !courseId) {
      return NextResponse.json(
        { success: false, error: "classId and courseId are required" },
        { status: 400 },
      );
    }

    const result = await _getStudentHomeworkStatusByClassInternal(
      session.user.id,
      courseId,
      classId,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting homework status:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch status",
      },
      { status: 500 },
    );
  }
}
