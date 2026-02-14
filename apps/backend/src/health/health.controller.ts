import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@repo/api-contract';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller()
export class HealthController {
  @AllowAnonymous()
  @TsRestHandler(contract.health)
  async handler() {
    return tsRestHandler(contract.health, {
      check: async () => ({
        status: 200,
        body: { status: 'ok' as const, timestamp: new Date().toISOString() },
      }),
    });
  }
}
