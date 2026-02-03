import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;

    const widgets = await prisma.widget.findMany({
      where: { userId },
      include: {
        builds: {
          orderBy: { version: "desc" },
          take: 1,
          where: { status: "success" },
        },
        _count: {
          select: { builds: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(widgets);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch widgets" },
      { status: 500 },
    );
  }
}
