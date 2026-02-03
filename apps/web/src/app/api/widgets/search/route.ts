import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    const widgets = await prisma.widget.findMany({
      where: query
        ? {
            name: {
              contains: query,
              mode: "insensitive",
            },
          }
        : undefined,
      include: {
        user: { select: { id: true, name: true, image: true } },
        builds: {
          orderBy: { version: "desc" },
          take: 1,
          where: { status: "success" },
        },
        _count: { select: { builds: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(widgets);
  } catch (e) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
