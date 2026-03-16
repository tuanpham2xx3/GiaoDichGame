# Sprint 6 Plan - Completion & Polish
## GIAODICHGAME C2C Marketplace

> **Ngày tạo:** 2026-03-15  
> **Duration:** 2 tuần (2026-03-16 → 2026-03-30)  
> **Mục tiêu:** Hoàn thành tất cả pending work, sẵn sàng release v1.0

---

## 📋 Tổng Quan Sprint 6

### Mục Tiêu Chính

1. ✅ **Hoàn thành 48 tests còn lại** (từ 67% → 95% pass rate)
2. ✅ **Implement 10 methods còn thiếu** trong services
3. ✅ **Tăng code coverage từ 20% → 80%**
4. ✅ **Run full E2E tests với Playwright**
5. ✅ **Performance optimization & security audit**
6. ✅ **Chuẩn bị release v1.0**

### Definition of Done

- [ ] Tất cả unit tests pass (>95%)
- [ ] Code coverage >80% cho tất cả modules
- [ ] E2E tests pass (>90%)
- [ ] Performance tests đạt yêu cầu
- [ ] Security audit hoàn thành
- [ ] Documentation đầy đủ
- [ ] Sẵn sàng deploy production

---

## 🎯 Backlog Items

### Phase 1: Fix Remaining Tests (3-4 ngày)

#### 1.1 Admin Service - 15 tests fail ❌

**Missing Methods cần implement:**

```typescript
// File: apps/api/src/admin/admin.service.ts

// Method 1: getUserRoles
async getUserRoles(userId: number) {
  return this.db.query.userRoles.findMany({
    where: eq(schema.userRoles.userId, userId),
    with: {
      role: true,
    },
  });
}

// Method 2: assignRole
async assignRole(userId: number, roleId: number, adminId: number) {
  const user = await this.db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });
  if (!user) {
    throw new NotFoundException('User not found');
  }

  const [userRole] = await this.db.insert(schema.userRoles).values({
    userId,
    roleId,
    assignedBy: adminId,
  }).returning();
  
  return userRole;
}

// Method 3: removeRole
async removeRole(userId: number, roleId: number) {
  await this.db.delete(schema.userRoles)
    .where(
      and(
        eq(schema.userRoles.userId, userId),
        eq(schema.userRoles.roleId, roleId)
      )
    );
}

// Method 4: getPendingTopups
async getPendingTopups() {
  return this.db.query.topupRequests.findMany({
    where: eq(schema.topupRequests.status, 'PENDING'),
    orderBy: [desc(schema.topupRequests.createdAt)],
  });
}

// Method 5: confirmTopup
async confirmTopup(id: number, adminId: number) {
  const topup = await this.db.query.topupRequests.findFirst({
    where: eq(schema.topupRequests.id, id),
  });
  if (!topup) {
    throw new NotFoundException('Topup request not found');
  }

  return this.db.transaction(async (tx) => {
    // Update topup status
    await tx.update(schema.topupRequests)
      .set({ 
        status: 'SUCCESS',
        confirmedBy: adminId,
      })
      .where(eq(schema.topupRequests.id, id));

    // Credit user wallet
    await tx.insert(schema.walletTransactions).values({
      userId: topup.userId,
      amount: topup.amountCoin,
      type: 'TOPUP',
      status: 'SUCCESS',
      referenceId: id,
      referenceType: 'topup_request',
    });

    return { success: true };
  });
}
```

**Tests cần fix:**
- ADM-001, ADM-002: Fix mock chain cho `db.select().from().where()`
- ADM-003,004,005: Fix mock chain
- ADM-006: Fix `innerJoin` mock
- ADM-008,009,010,011: Fix mock return values
- ADM-012,013,014,015: Implement methods + fix tests
- ADM-016,017,018: Implement methods + fix tests

**Estimated time:** 4-5 giờ

---

#### 1.2 Disputes Service - 14 tests fail ❌

**Missing Methods cần implement:**

```typescript
// File: apps/api/src/disputes/disputes.service.ts

// Method 1: resolveDispute
async resolveDispute(
  disputeId: number,
  dto: JudgeDisputeDto,
  adminId: number,
) {
  const dispute = await this.db.query.disputeTickets.findFirst({
    where: eq(disputeTickets.id, disputeId),
    with: {
      order: true,
    },
  });

  if (!dispute) {
    throw new NotFoundException('Dispute not found');
  }

  return this.db.transaction(async (tx) => {
    const order = dispute.order;

    if (dto.resolution === 'REFUND') {
      // Refund to buyer
      await tx.update(schema.walletTransactions)
        .set({ status: 'RELEASE' })
        .where(
          and(
            eq(schema.walletTransactions.type, 'HOLD'),
            eq(schema.walletTransactions.referenceId, order.id)
          )
        );

      await tx.update(schema.orders)
        .set({ status: 'CANCELLED' })
        .where(eq(schema.orders.id, order.id));

    } else if (dto.resolution === 'RELEASE') {
      // Release to seller
      await tx.insert(schema.walletTransactions).values({
        userId: Number(order.sellerId),
        amount: order.amount,
        type: 'SETTLE',
        status: 'SUCCESS',
        referenceId: order.id,
        referenceType: 'order',
      });

      await tx.update(schema.orders)
        .set({ 
          status: 'COMPLETED',
          completedAt: new Date(),
        })
        .where(eq(schema.orders.id, order.id));
    }

    // Update dispute
    await tx.update(schema.disputeTickets)
      .set({
        status: 'RESOLVED',
        resolution: dto.resolution,
        resolutionNote: dto.resolutionNote,
        resolvedAt: new Date(),
        assignedTo: adminId,
      })
      .where(eq(schema.disputeTickets.id, disputeId));

    // Notify both parties
    await this.notificationsService.create({
      userId: Number(dispute.buyerId),
      type: 'DISPUTE_RESOLVED',
      title: `Tranh chấp đã được giải quyết: ${dto.resolution}`,
      content: dto.resolutionNote,
    });

    await this.notificationsService.create({
      userId: Number(dispute.sellerId),
      type: 'DISPUTE_RESOLVED',
      title: 'Tranh chấp đã được giải quyết',
      content: dto.resolutionNote,
    });
  });
}

// Method 2: handleAutoRefund
async handleAutoRefund(ticketId: number) {
  const ticket = await this.db.query.disputeTickets.findFirst({
    where: eq(disputeTickets.id, ticketId),
    with: {
      order: true,
    },
  });

  if (!ticket) {
    throw new NotFoundException('Dispute ticket not found');
  }

  // Check if seller has responded
  const messageCount = await this.db.query.disputeMessages.findMany({
    where: eq(disputeMessages.ticketId, ticketId),
  }).then(msgs => msgs.length);

  if (messageCount > 0) {
    // Seller responded, skip auto refund
    return { skipped: true, reason: 'Seller responded' };
  }

  // Auto refund to buyer
  await this.db.transaction(async (tx) => {
    // Release hold to buyer
    await tx.update(schema.walletTransactions)
      .set({ status: 'RELEASE' })
      .where(
        and(
          eq(schema.walletTransactions.type, 'HOLD'),
          eq(schema.walletTransactions.referenceId, ticket.orderId)
        )
      );

    // Update dispute
    await tx.update(schema.disputeTickets)
      .set({
        status: 'RESOLVED',
        resolution: 'AUTO_REFUND',
        resolutionNote: 'Seller did not respond within deadline',
        resolvedAt: new Date(),
      })
      .where(eq(schema.disputeTickets.id, ticketId));

    // Update order
    await tx.update(schema.orders)
      .set({ status: 'CANCELLED' })
      .where(eq(schema.orders.id, ticket.orderId));

    // Notify both parties
    await this.notificationsService.create({
      userId: Number(ticket.buyerId),
      type: 'DISPUTE_AUTO_REFUND',
      title: 'Bạn đã được hoàn tiền tự động',
      content: 'Seller không phản hồi trong thời hạn',
    });

    await this.notificationsService.create({
      userId: Number(ticket.sellerId),
      type: 'DISPUTE_AUTO_REFUND',
      title: 'Dispute đã được auto-refund',
      content: 'Bạn không phản hồi trong thời hạn',
    });
  });

  return { success: true, refunded: true };
}
```

**Tests cần fix:**
- DSP-001: Fix `innerJoin` mock chain
- DSP-007: Fix mock return value
- DSP-008: Update test expectation (extra fields)
- DSP-011: Fix test data mismatch
- DSP-014: Fix mock return
- DSP-017,018,019: Implement `resolveDispute` + fix tests
- DSP-020,021: Implement `handleAutoRefund` + fix tests
- DSP-023: Fix `onConflictDoUpdate` mock
- DSP-025: Fix test assertion logic

**Estimated time:** 5-6 giờ

---

#### 1.3 Listings Service - 6 tests fail ⚠️

**Missing Methods:**

```typescript
// File: apps/api/src/listings/listings.service.ts

// Method 1: incrementViewCount
async incrementViewCount(id: number) {
  await this.db.update(schema.listings)
    .set({ 
      viewCount: sql`${schema.listings.viewCount} + 1`,
    })
    .where(eq(schema.listings.id, id));
}

// Method 2: getMyListings
async getMyListings(sellerId: number, query: ListingQueryDto) {
  const { page = 1, limit = 20, status } = query;
  const offset = (page - 1) * limit;

  const conditions = [eq(schema.listings.sellerId, sellerId)];
  if (status) {
    conditions.push(eq(schema.listings.status, status));
  }

  const whereClause = and(...conditions);

  const [items, totalResult] = await Promise.all([
    this.db.query.listings.findMany({
      where: whereClause,
      orderBy: [desc(schema.listings.createdAt)],
      limit,
      offset,
      with: {
        game: true,
      },
    }),
    this.db.select({ count: count() })
      .from(schema.listings)
      .where(whereClause),
  ]);

  return {
    items,
    total: totalResult?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((totalResult?.count ?? 0) / limit),
  };
}
```

**Tests cần fix:**
- LST-001: Fix mock data
- LST-007: Fix `$dynamic` mock chain
- LST-009: Fix type assertion (string vs number)
- LST-012: Fix mock verification
- LST-015: Implement `incrementViewCount` + fix test
- LST-016: Implement `getMyListings` + fix test

**Estimated time:** 2-3 giờ

---

#### 1.4 VIP Service - 2 tests fail ⚠️

**Tests cần fix:**
- VIP-008: Fix `db.transaction` mock implementation
- VIP-010,011: Fix test assertions for error cases

**Estimated time:** 1 giờ

---

#### 1.5 Pin Service - 4 tests fail ⚠️

**Tests cần fix:**
- PIN-007: Fix `db.transaction` mock
- PIN-010,011: Fix test assertions
- PIN-013: Fix mock chain

**Estimated time:** 1-2 giờ

---

#### 1.6 Games Service - 2 tests fail ⚠️

**Tests cần fix:**
- GME-013: Fix mock verification for `db.delete`

**Estimated time:** 30 phút

---

### Phase 2: Increase Code Coverage (2 ngày)

#### 2.1 Modules cần tăng coverage

| Module | Current | Target | Actions |
|--------|---------|--------|---------|
| **Admin** | 45% | 80% | Test all 5 new methods |
| **Disputes** | 6% | 80% | Test resolveDispute, handleAutoRefund |
| **Listings** | 59% | 80% | Test new methods |
| **VIP** | 31% | 80% | Test edge cases |
| **Pin** | 10% | 80% | Test edge cases |
| **Users** | 7% | 70% | Add basic tests |
| **Notifications** | 13% | 70% | Add basic tests |
| **Wallet** | 40% | 80% | Test edge cases |

**Estimated time:** 2 ngày

---

### Phase 3: E2E Tests với Playwright (2 ngày)

#### 3.1 Existing E2E Tests cần run

| File | Tests | Status |
|------|-------|--------|
| `tests/full-flow.spec.ts` | 8 scenarios | ⏳ Pending |
| `tests/purchase-flow.spec.ts` | 5 scenarios | ⏳ Pending |
| `tests/buyer-view.spec.ts` | 4 scenarios | ⏳ Pending |
| `tests/seller-delivery.spec.ts` | 5 scenarios | ⏳ Pending |
| `tests/order-detail.spec.ts` | 4 scenarios | ⏳ Pending |

#### 3.2 New E2E Tests cần create

**VIP Flow:**
```typescript
// tests/vip-flow.spec.ts
- Register → Login → Topup → Buy VIP → Check benefits
- VIP profile editing (displayName, nameColor, bio)
- VIP discount on Pin purchase
```

**Pin Flow:**
```typescript
// tests/pin-flow.spec.ts
- Seller creates listing → Buy Pin → Verify pinned
- Pin expiry test
```

**Admin Flow:**
```typescript
// tests/admin-flow.spec.ts
- Admin login → View stats → Manage users
- Ban/Unban user
- Confirm topup request
```

**Dispute Flow:**
```typescript
// tests/dispute-e2e.spec.ts
- Full dispute flow: Create → Respond → Resolve
- Auto-refund flow
```

**Estimated time:** 2 ngày

---

### Phase 4: Performance & Security (1 ngày)

#### 4.1 Performance Tests

**API Response Times:**
```bash
# Using k6 or artillery
- GET /vip/packages: < 200ms ✅
- POST /vip/purchase: < 200ms ✅
- POST /pin/purchase: < 200ms ✅
- GET /admin/stats: < 500ms ✅
- GET /admin/users: < 300ms ⏳
```

**Frontend Performance:**
```bash
# Lighthouse scores
- VIP page: > 80 ✅
- Admin page: > 80 ✅
- Homepage: > 90 ⏳
- Listing detail: > 85 ⏳
```

**Estimated time:** 3-4 giờ

#### 4.2 Security Audit

**Checklist:**
- [ ] SQL Injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized inputs)
- [ ] JWT validation
- [ ] RBAC enforcement
- [ ] Rate limiting
- [ ] File upload validation
- [ ] Input validation all endpoints

**Estimated time:** 2-3 giờ

---

### Phase 5: Release Preparation (1 ngày)

#### 5.1 Documentation

- [ ] Update README.md với installation guide
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deployment guide
- [ ] User manual
- [ ] Admin guide

#### 5.2 CI/CD Setup

- [ ] GitHub Actions workflow
- [ ] Docker build & push
- [ ] Deploy to staging
- [ ] Deploy to production

#### 5.3 Final Checks

- [ ] All tests passing
- [ ] Coverage reports generated
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation complete

**Estimated time:** 1 ngày

---

## 📅 Sprint 6 Timeline

```
Week 1 (Mar 16-22)
├── Day 1-2: Fix Admin Service tests (15 tests)
├── Day 3-4: Fix Disputes Service tests (14 tests)
├── Day 5: Fix Listings, VIP, Pin, Games tests (14 tests)
└── Weekend: Buffer

Week 2 (Mar 23-30)
├── Day 1-2: Increase code coverage to 80%
├── Day 3-4: E2E tests với Playwright
├── Day 5: Performance & Security audit
└── Day 6-7: Release preparation & v1.0 launch
```

---

## 📊 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Unit Tests Pass** | 97/145 (67%) | 140/145 (95%) | 🎯 |
| **Code Coverage** | 20% | 80% | 🎯 |
| **E2E Tests Pass** | 0/26 | 24/26 (90%) | 🎯 |
| **API Response Time** | < 200ms | < 200ms | ✅ |
| **Frontend Bundle** | 342KB | < 500KB | ✅ |
| **Lighthouse Score** | 85 | > 80 | ✅ |
| **Security Issues** | Unknown | 0 critical | 🎯 |

---

## 🎯 Deliverables

### End of Sprint 6

1. ✅ **140+ unit tests passing** (95%+ pass rate)
2. ✅ **80%+ code coverage** for all modules
3. ✅ **24+ E2E tests passing** (90%+ pass rate)
4. ✅ **Performance benchmarks met**
5. ✅ **Security audit passed**
6. ✅ **Documentation complete**
7. ✅ **v1.0 released** 🚀

---

## 📋 Task Assignment

### Developer 1 (Backend)
- Fix Admin Service tests
- Implement missing Admin methods
- Fix Disputes Service tests
- Implement resolveDispute, handleAutoRefund

### Developer 2 (Backend)
- Fix Listings, VIP, Pin tests
- Implement missing methods
- Increase code coverage
- Security audit

### Developer 3 (Frontend/Full-stack)
- E2E tests với Playwright
- Performance optimization
- Documentation
- CI/CD setup

---

## 🚀 Release Checklist v1.0

- [ ] All Sprint 0-6 tasks completed
- [ ] Unit tests pass rate > 95%
- [ ] Code coverage > 80%
- [ ] E2E tests pass rate > 90%
- [ ] Performance tests passed
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Docker images built
- [ ] Deployed to staging
- [ ] UAT passed
- [ ] Deployed to production
- [ ] Monitoring setup
- [ ] Backup strategy implemented

---

**Created:** 2026-03-15  
**Sprint Start:** 2026-03-16  
**Sprint End:** 2026-03-30  
**Release Date:** 2026-03-30  
**Version:** v1.0.0
