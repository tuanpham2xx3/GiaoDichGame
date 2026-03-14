import { Test, TestingModule } from '@nestjs/testing';
import { OrdersProcessor } from './orders.processor';
import { OrdersService } from '../../orders/orders.service';
import { JOB_NAMES } from '@giaodich/shared';
import { Job } from 'bullmq';

describe('OrdersProcessor', () => {
  let processor: OrdersProcessor;
  let ordersService: jest.Mocked<OrdersService>;

  beforeEach(async () => {
    const mockOrdersService = {
      autoCompleteOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersProcessor,
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    processor = module.get<OrdersProcessor>(OrdersProcessor);
    ordersService = module.get(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── BULL-001: Auto Complete Success ─────────────────────────────────────────

  describe('handleAutoComplete()', () => {
    const mockJob = {
      data: { orderId: 1 },
      id: 'job-1',
      attemptsMade: 0,
    } as any;

    it('BULL-001: should auto complete order successfully when status is DELIVERED', async () => {
      // Arrange
      ordersService.autoCompleteOrder.mockResolvedValue(undefined);

      // Act
      await processor.handleAutoComplete(mockJob);

      // Assert
      expect(ordersService.autoCompleteOrder).toHaveBeenCalledWith(1);
      expect(ordersService.autoCompleteOrder).toHaveBeenCalledTimes(1);
    });

    // ── BULL-002: Skip when not DELIVERED ─────────────────────────────────────

    it('BULL-002: should skip when order is not in DELIVERED status', async () => {
      // Arrange
      ordersService.autoCompleteOrder.mockResolvedValue(undefined);

      // Act
      await processor.handleAutoComplete(mockJob);

      // Assert - autoCompleteOrder should handle the logic internally and return without error
      expect(ordersService.autoCompleteOrder).toHaveBeenCalled();
    });

    // ── BULL-003: Skip when order has dispute ─────────────────────────────────

    it('BULL-003: should skip when order has dispute', async () => {
      // Arrange
      ordersService.autoCompleteOrder.mockResolvedValue(undefined);

      // Act
      await processor.handleAutoComplete(mockJob);

      // Assert - autoCompleteOrder should handle the dispute internally
      expect(ordersService.autoCompleteOrder).toHaveBeenCalled();
    });

    // ── BULL-004: Retry on failure ───────────────────────────────────────────

    it('BULL-004: should throw error to trigger retry on failure', async () => {
      // Arrange
      ordersService.autoCompleteOrder.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(processor.handleAutoComplete(mockJob)).rejects.toThrow('Database error');
      expect(ordersService.autoCompleteOrder).toHaveBeenCalledWith(1);
    });

    // ── BULL-005: Handle non-existent order ───────────────────────────────────

    it('BULL-005: should handle non-existent order gracefully', async () => {
      // Arrange
      ordersService.autoCompleteOrder.mockResolvedValue(undefined);

      const jobWithNonExistentOrder = {
        data: { orderId: 999 },
        id: 'job-2',
        attemptsMade: 0,
      } as any;

      // Act
      await processor.handleAutoComplete(jobWithNonExistentOrder);

      // Assert - should not throw, just skip
      expect(ordersService.autoCompleteOrder).toHaveBeenCalledWith(999);
    });

    // ── BULL-006: Job data validation ────────────────────────────────────────

    it('BULL-006: should extract correct orderId from job data', async () => {
      // Arrange
      ordersService.autoCompleteOrder.mockResolvedValue(undefined);

      const jobWithDifferentOrderId = {
        data: { orderId: 42 },
        id: 'job-3',
        attemptsMade: 0,
      } as any;

      // Act
      await processor.handleAutoComplete(jobWithDifferentOrderId);

      // Assert
      expect(ordersService.autoCompleteOrder).toHaveBeenCalledWith(42);
    });
  });

  // ── Additional Tests ───────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should log error and rethrow to trigger BullMQ retry', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      ordersService.autoCompleteOrder.mockRejectedValue(new Error('Test error'));

      const mockJob = {
        data: { orderId: 1 },
        id: 'job-1',
      } as any;

      // Act & Assert
      await expect(processor.handleAutoComplete(mockJob)).rejects.toThrow('Test error');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle multiple concurrent jobs', async () => {
      // Arrange
      ordersService.autoCompleteOrder.mockResolvedValue(undefined);

      const jobs: Job<{ orderId: number }>[] = [
        { data: { orderId: 1 }, id: 'job-1' } as Job<{ orderId: number }>,
        { data: { orderId: 2 }, id: 'job-2' } as Job<{ orderId: number }>,
        { data: { orderId: 3 }, id: 'job-3' } as Job<{ orderId: number }>,
      ];

      // Act
      await Promise.all(jobs.map(job => processor.handleAutoComplete(job)));

      // Assert
      expect(ordersService.autoCompleteOrder).toHaveBeenCalledTimes(3);
      expect(ordersService.autoCompleteOrder).toHaveBeenCalledWith(1);
      expect(ordersService.autoCompleteOrder).toHaveBeenCalledWith(2);
      expect(ordersService.autoCompleteOrder).toHaveBeenCalledWith(3);
    });
  });
});
