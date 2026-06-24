import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'kuryecrm-backend', version: '1.0.0', phase: 5 };
  }
}
