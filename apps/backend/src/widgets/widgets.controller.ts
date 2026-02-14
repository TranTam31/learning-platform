import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@repo/api-contract';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { WidgetsService } from './widgets.service';

@Controller()
export class WidgetsController {
  constructor(private readonly widgetsService: WidgetsService) {}

  @AllowAnonymous()
  @TsRestHandler(contract.widgets)
  async handler() {
    return tsRestHandler(contract.widgets, {
      getAllWidgets: async () => {
        const widgets = await this.widgetsService.getAllWidgets();
        return { status: 200, body: widgets };
      },
    });
  }
}
