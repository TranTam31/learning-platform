import { _getUserClassesByUserId } from "@/server/classes";
import { auth } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

    const result = await _getUserClassesByUserId(session.user.id);

    // Mobile app chỉ cần student classes
    return NextResponse.json({
      success: true,
      data: result.student,
    });
  } catch (error) {
    console.error("Error getting classes for mobile:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch classes",
      },
      { status: 401 },
    );
  }
}
