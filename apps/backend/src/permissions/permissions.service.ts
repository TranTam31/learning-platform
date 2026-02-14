import { Injectable, Inject } from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { Request } from 'express';

@Injectable()
export class PermissionsService {
  constructor(private readonly authService: BetterAuthService) {}

  async isAdmin(req: Request) {
    try {
      const { success, error } = await (
        this.authService.api as any
      ).hasPermission({
        headers: fromNodeHeaders(req.headers),
        body: {
          permissions: {
            organization: ['update', 'delete'],
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: error || 'Failed to check permissions',
        };
      }

      return success;
    } catch (error) {
      console.error(error);
      return { success: false, error: error || 'Failed to check permissions' };
    }
  }
}
