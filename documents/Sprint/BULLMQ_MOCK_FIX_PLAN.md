# Kế Hoạch Fix BullMQ Mock Tests
## Sprint 5 - VIP, Pin, Disputes Services

> **Ngày tạo:** 2026-03-15  
> **Độ ưu tiên:** High  
> **Estimated time:** 2-3 giờ

---

## 📋 Vấn đề

Các test files sau đang fail do không thể resolve BullMQ queue dependencies:

| File | Tests | Lỗi |
|------|-------|-----|
| `vip.service.spec.ts` | 16 tests | `BullQueue_premium` not available |
| `pin.service.spec.ts` | 15 tests | `BullQueue_premium` not available |
| `disputes.service.spec.ts` | 25 tests | `BullQueue_disputes` not available |

**Tổng:** 56 tests cần fix

---

## 🔍 Nguyên nhân

### 1. Service constructors inject BullMQ Queue

```typescript
// VIP Service
constructor(
  @Inject(DRIZZLE) private db: Db,
  private walletService: WalletService,
  private notificationsService: NotificationsService,
  @InjectQueue(QUEUE_NAMES.PREMIUM) private premiumQueue: Queue, // ❌ Missing mock
) {}

// Pin Service
constructor(
  @Inject(DRIZZLE) private db: Db,
  private walletService: WalletService,
  private notificationsService: NotificationsService,
  private listingsService: ListingsService,
  @InjectQueue(QUEUE_NAMES.PREMIUM) private premiumQueue: Queue, // ❌ Missing mock
) {}

// Disputes Service
constructor(
  @Inject(DRIZZLE) private db: DrizzleDB,
  private walletService: WalletService,
  private notificationsService: NotificationsService,
  @InjectQueue(QUEUE_NAMES.DISPUTES) private disputesQueue: Queue, // ❌ Missing mock
) {}
```

### 2. Mock hiện tại không đúng cách

```typescript
// ❌ SAI: Chỉ mock object thường
const mockQueue = {
  add: jest.fn(),
};

{ provide: QUEUE_NAMES.PREMIUM, useValue: mockQueue },
```

### 3. `@InjectQueue` decorator yêu cầu provider token đặc biệt

---

## ✅ Giải pháp

### Cách 1: Mock Queue đúng cách (Recommended)

**Bước 1:** Tạo mock queue helper function

```typescript
// File: __mocks__/bullmq.ts
import { Queue } from 'bullmq';

export const createMockQueue = (): jest.Mocked<Queue> => ({
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  close: jest.fn().mockResolvedValue(undefined),
  drain: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  getJobs: jest.fn().mockResolvedValue([]),
  getJobCounts: jest.fn().mockResolvedValue({ active: 0, completed: 0 }),
  removeJob: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
  once: jest.fn(),
} as any);
```

**Bước 2:** Update test files với mock đúng

```typescript
// vip.service.spec.ts
import { createMockQueue } from '../../__mocks__/bullmq';
import { QUEUE_NAMES } from '@giaodich/shared';

// ... trong describe block
let premiumQueue: jest.Mocked<Queue>;

beforeEach(async () => {
  premiumQueue = createMockQueue();
  
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VipService,
      { provide: DRIZZLE, useValue: mockDb },
      { provide: WalletService, useValue: mockWalletService },
      { provide: NotificationsService, useValue: mockNotificationsService },
      { provide: QUEUE_NAMES.PREMIUM, useValue: premiumQueue },
    ],
  }).compile();

  service = module.get<VipService>(VipService);
  premiumQueue = module.get(QUEUE_NAMES.PREMIUM);
});
```

---

### Cách 2: Bỏ qua @InjectQueue và inject trực tiếp

**File: vip.service.spec.ts**

```typescript
// Thay vì dùng @InjectQueue decorator
{ provide: QUEUE_NAMES.PREMIUM, useValue: mockQueue },

// Dùng provider string trực tiếp
{ provide: 'BullQueue_premium', useValue: mockQueue },
```

**File: pin.service.spec.ts**

```typescript
{ provide: 'BullQueue_premium', useValue: mockQueue },
```

**File: disputes.service.spec.ts**

```typescript
{ provide: 'BullQueue_disputes', useValue: mockQueue },
```

---

### Cách 3: Tạo custom mock provider helper

**File: test/helpers/queue-mock.helper.ts**

```typescript
import { QUEUE_NAMES } from '@giaodich/shared';

export const getQueueProviders = () => [
  {
    provide: QUEUE_NAMES.PREMIUM,
    useValue: {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      close: jest.fn(),
    },
  },
  {
    provide: QUEUE_NAMES.DISPUTES,
    useValue: {
      add: jest.fn().mockResolvedValue({ id: 'job-2' }),
      close: jest.fn(),
    },
  },
  {
    provide: QUEUE_NAMES.ORDERS,
    useValue: {
      add: jest.fn().mockResolvedValue({ id: 'job-3' }),
      close: jest.fn(),
    },
  },
];
```

**Sử dụng trong tests:**

```typescript
import { getQueueProviders } from '../../test/helpers/queue-mock.helper';

const module: TestingModule = await Test.createTestingModule({
  providers: [
    VipService,
    ...getQueueProviders(), // ✅ Thêm tất cả queue providers
    { provide: DRIZZLE, useValue: mockDb },
    // ... other mocks
  ],
}).compile();
```

---

## 📝行动计划 (Action Plan)

### Phase 1: Chuẩn bị (15 phút)

- [ ] Tạo folder `apps/api/src/__mocks__/`
- [ ] Tạo file `apps/api/src/__mocks__/bullmq.ts` với `createMockQueue()`
- [ ] Tạo file `apps/api/src/test/helpers/queue-mock.helper.ts`

### Phase 2: Fix VIP Service Tests (30 phút)

- [ ] Import `createMockQueue` vào `vip.service.spec.ts`
- [ ] Thêm `premiumQueue` variable
- [ ] Update `beforeEach` để tạo mock queue
- [ ] Fix tất cả 16 tests
- [ ] Chạy test: `npx jest vip.service.spec.ts`

### Phase 3: Fix Pin Service Tests (30 phút)

- [ ] Import `createMockQueue` vào `pin.service.spec.ts`
- [ ] Thêm `premiumQueue` variable
- [ ] Update `beforeEach` để tạo mock queue
- [ ] Fix tất cả 15 tests
- [ ] Chạy test: `npx jest pin.service.spec.ts`

### Phase 4: Fix Disputes Service Tests (45 phút)

- [ ] Import `createMockQueue` vào `disputes.service.spec.ts`
- [ ] Thêm `disputesQueue` variable
- [ ] Update `beforeEach` để tạo mock queue
- [ ] Fix tất cả 25 tests
- [ ] Chạy test: `npx jest disputes.service.spec.ts`

### Phase 5: Verify (15 phút)

- [ ] Chạy tất cả tests: `npm run test`
- [ ] Verify coverage: `npm run test:cov`
- [ ] Update TEST_EXECUTION_REPORT_5.md với kết quả mới

---

## 🛠️ Code Samples chi tiết

### Sample 1: Fix vip.service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { VipService } from './vip.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DRIZZLE } from '../database/database.module';
import { QUEUE_NAMES } from '@giaodich/shared';
import { Queue } from 'bullmq';

// Mock queue helper
const createMockQueue = (): jest.Mocked<Queue> => ({
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  close: jest.fn().mockResolvedValue(undefined),
} as any);

// ... mocks khác

describe('VipService', () => {
  let service: VipService;
  let premiumQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VipService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: QUEUE_NAMES.PREMIUM, useValue: createMockQueue() },
      ],
    }).compile();

    service = module.get<VipService>(VipService);
    premiumQueue = module.get(QUEUE_NAMES.PREMIUM);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ... các tests khác
});
```

### Sample 2: Fix pin.service.spec.ts

```typescript
import { QUEUE_NAMES } from '@giaodich/shared';
import { Queue } from 'bullmq';

const createMockQueue = (): jest.Mocked<Queue> => ({
  add: jest.fn().mockResolvedValue({ 
    id: 'pin-job-1',
    updateProgress: jest.fn(),
    log: jest.fn(),
  }),
  close: jest.fn().mockResolvedValue(undefined),
  drain: jest.fn().mockResolvedValue(undefined),
} as any);

describe('PinService', () => {
  let service: PinService;
  let premiumQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ListingsService, useValue: mockListingsService },
        { provide: QUEUE_NAMES.PREMIUM, useValue: createMockQueue() },
      ],
    }).compile();

    service = module.get<PinService>(PinService);
    premiumQueue = module.get(QUEUE_NAMES.PREMIUM);

    jest.clearAllMocks();
  });

  // ... tests
});
```

### Sample 3: Fix disputes.service.spec.ts

```typescript
import { QUEUE_NAMES } from '@giaodich/shared';
import { Queue } from 'bullmq';

const createMockQueue = (): jest.Mocked<Queue> => ({
  add: jest.fn().mockResolvedValue({ 
    id: 'dispute-job-1',
    updateProgress: jest.fn(),
    log: jest.fn(),
  }),
  close: jest.fn().mockResolvedValue(undefined),
  drain: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
} as any);

describe('DisputesService', () => {
  let service: DisputesService;
  let disputesQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: QUEUE_NAMES.DISPUTES, useValue: createMockQueue() },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    disputesQueue = module.get(QUEUE_NAMES.DISPUTES);

    jest.clearAllMocks();
  });

  // ... tests
});
```

---

## ✅ Checklist hoàn thành

### Sau khi fix xong, verify:

- [ ] `npm run test` - Tất cả tests pass
- [ ] `npm run test:cov` - Coverage report generated
- [ ] VIP service coverage > 50%
- [ ] Pin service coverage > 50%
- [ ] Disputes service coverage > 50%
- [ ] Không còn lỗi "Nest can't resolve dependencies"
- [ ] Update SPRINT_5_TEST_SUMMARY.md với kết quả mới

---

## 📊 Kết quả mong đợi

| Metric | Hiện tại | Sau khi fix |
|--------|----------|-------------|
| Tests passing | 62/139 | 118/139 |
| Coverage | 20% | 35%+ |
| VIP tests | 0/16 | 16/16 ✅ |
| Pin tests | 0/15 | 15/15 ✅ |
| Disputes tests | 0/25 | 25/25 ✅ |

---

## 🚀 Hướng dẫn chạy tests sau khi fix

```bash
# Chạy từng file test
cd apps/api
npx jest vip.service.spec.ts
npx jest pin.service.spec.ts
npx jest disputes.service.spec.ts

# Chạy tất cả tests
npm run test

# Chạy với coverage
npm run test:cov

# Xem coverage report
start coverage/index.html
```

---

**Created:** 2026-03-15  
**Author:** Development Team  
**Status:** 📋 Ready to implement
