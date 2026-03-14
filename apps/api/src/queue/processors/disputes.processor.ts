import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DisputesService } from '../../disputes/disputes.service';
import { QUEUE_NAMES, JOB_NAMES } from '@giaodich/shared';

@Processor(QUEUE_NAMES.DISPUTES)
export class DisputesProcessor {
  constructor(private readonly disputesService: DisputesService) {}

  // Handle auto-refund job
  async handleAutoRefund(job: Job<{ disputeId: number }>) {
    const { disputeId } = job.data;

    try {
      await this.disputesService.autoRefundDispute(disputeId);
    } catch (error) {
      console.error(`Failed to auto-refund dispute ${disputeId}:`, error);
      throw error;
    }
  }

  // Handle reminder job
  async handleReminder(job: Job<{ disputeId: number }>) {
    const { disputeId } = job.data;

    try {
      // The reminder logic can be implemented here
      // For now, it just logs - notifications are handled in createDispute
      console.log(`Reminder for dispute ${disputeId}`);
    } catch (error) {
      console.error(`Failed to send reminder for dispute ${disputeId}:`, error);
      throw error;
    }
  }
}
