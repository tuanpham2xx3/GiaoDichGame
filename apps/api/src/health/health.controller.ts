import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Simple liveness ping – more indicators (DB, Redis) added in Sprint 1
      async (): Promise<HealthIndicatorResult> => ({
        api: { status: 'up' },
      }),
    ]);
  }
}
