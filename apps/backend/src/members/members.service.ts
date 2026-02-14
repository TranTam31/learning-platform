import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { Role } from '@repo/db';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async checkUserInOrg(userId: string, orgId?: string, orgSlug?: string) {
    return this.prisma.member.findFirst({
      where: {
        userId,
        organization: orgId ? { id: orgId } : { slug: orgSlug },
      },
      select: {
        userId: true,
        role: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async addMember(organizationId: string, userId: string, role: Role) {
    await (this.authService.api as any).addMember({
      body: { userId, organizationId, role },
    });
  }
}
