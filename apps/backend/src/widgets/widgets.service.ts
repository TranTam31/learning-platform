import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WidgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllWidgets() {
    return this.prisma.widget.findMany({
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        builds: {
          orderBy: { version: 'desc' },
          take: 1,
          where: { status: 'success' },
        },
        _count: {
          select: { builds: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
