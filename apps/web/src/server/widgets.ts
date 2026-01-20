import prisma from "@/lib/prisma";

export async function getAllWidgets() {
  return await prisma.widget.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      builds: {
        orderBy: { version: "desc" },
        take: 1,
        where: {
          status: "success",
        },
      },
      _count: {
        select: { builds: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
