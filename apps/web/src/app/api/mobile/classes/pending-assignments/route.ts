import { _getStudentPendingAssignmentsForClassesByUserId } from "@/server/classes";
import { auth } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Try to get session - better-auth will check cookies automatically
    // The expoClient from better-auth/expo will send cookies in requests
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Please sign in first",
        },
        { status: 401 },
      );
    }

    const { classIds } = await request.json();

    if (!Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "classIds must be a non-empty array",
        },
        { status: 400 },
      );
    }

    const result = await _getStudentPendingAssignmentsForClassesByUserId(
      session.user.id,
      classIds,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting pending assignments:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch pending assignments",
      },
      { status: 401 },
    );
  }
}
