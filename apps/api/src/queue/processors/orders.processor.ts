import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { OrdersService } from '../../orders/orders.service';
import { QUEUE_NAMES, JOB_NAMES } from '@giaodich/shared';

@Processor(QUEUE_NAMES.ORDERS)
export class OrdersProcessor {
  constructor(private readonly ordersService: OrdersService) {}

  @Process(JOB_NAMES.AUTO_COMPLETE)
  async handleAutoComplete(job: Job<{ orderId: number }>) {
    const { orderId } = job.data;

    try {
      await this.ordersService.autoCompleteOrder(orderId);
    } catch (error) {
      console.error(`Failed to auto-complete order ${orderId}:`, error);
      throw error; // Let BullMQ handle retry
    }
  }
}
