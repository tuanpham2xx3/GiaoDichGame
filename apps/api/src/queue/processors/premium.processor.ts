import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { VipService } from '../../vip/vip.service';
import { PinService } from '../../pin/pin.service';
import { QUEUE_NAMES, JOB_NAMES } from '@giaodich/shared';

@Processor(QUEUE_NAMES.PREMIUM)
export class PremiumProcessor {
  constructor(
    private readonly vipService: VipService,
    private readonly pinService: PinService,
  ) {}

  async handleJob(job: Job<any>) {
    const jobName = job.name;

    switch (jobName) {
      case JOB_NAMES.VIP_EXPIRY:
        await this.handleVipExpiry(job);
        break;
      case JOB_NAMES.PIN_EXPIRY:
        await this.handlePinExpiry(job);
        break;
      default:
        console.warn(`Unknown job name: ${jobName}`);
    }
  }

  private async handleVipExpiry(job: Job<{ subscriptionId: number }>) {
    const { subscriptionId } = job.data;
    console.log(`Processing VIP_EXPIRY for subscription ${subscriptionId}`);

    try {
      await this.vipService.expireVip(subscriptionId);
    } catch (error) {
      console.error(`Failed to expire VIP subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  private async handlePinExpiry(job: Job<{ pinId: number }>) {
    const { pinId } = job.data;
    console.log(`Processing PIN_EXPIRY for pin ${pinId}`);

    try {
      await this.pinService.expirePin(pinId);
    } catch (error) {
      console.error(`Failed to expire Pin ${pinId}:`, error);
      throw error;
    }
  }
}
