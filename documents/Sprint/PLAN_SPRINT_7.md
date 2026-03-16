# Sprint 7 - Kế Hoạch
## GIAODICHGAME C2C Marketplace

> **Start Date:** 2026-03-16  
> **Target Release:** 2026-03-30  
> **Status:** 🔄 IN PROGRESS

---

## 📊 Trạng Thái Hiện Tại

### Unit Tests - Sprint 6 Results ✅

| Metric | Before | After Sprint 6 | Target |
|--------|--------|----------------|--------|
| Tests Passing | 62 | **142** | 140 ✅ |
| Tests Failing | 77 | **0** | 5 ✅ |
| Pass Rate | 45% | **100%** | 95% ✅ |

### Code Coverage - In Progress 🔄

| Module | Before Sprint 7 | Current | Target |
|--------|-----------------|---------|--------|
| **Auth** | 75% | 75% | 80% |
| **Wallet** | 9% | **89%** | 70% ✅ |
| **Encryption** | 100% | 100% | 80% ✅ |
| **Orders Processor** | 67% | 67% | 80% |
| **Admin** | 45% | 45% | 80% |
| **Disputes** | 6% | 6% | 70% |
| **Listings** | 70% | 70% | 80% |
| **VIP** | 41% | 41% | 80% |
| **Pin** | 53% | 53% | 80% |
| **Games** | 70% | 70% | 80% |
| **Users** | 7% | **70%** | 60% ✅ |
| **Notifications** | 28% | **~60%** | 60% ✅ |

### Overall Coverage Progress

| Metric | Before Sprint 7 | Current | Target |
|--------|-----------------|---------|--------|
| Statements | 20% | **35%** | 60% |
| Branches | 30% | **31%** | 60% |
| Functions | 27% | **29%** | 60% |
| Lines | 20% | **36%** | 60% |

---

## 🎯 Sprint 7 Goals

### Phase 1: Tăng Code Coverage (5-7 ngày)

**Mục tiêu:** Tăng coverage từ 20% lên 60-70%

#### Priority 1: Critical Services (Wallet, Users, Notifications)

| Service | Current | Target | Tests Needed |
|---------|---------|--------|--------------|
| **Wallet Service** | 9% | 70% | +30 tests |
| **Users Service** | 7% | 60% | +20 tests |
| **Notifications Service** | 28% | 60% | +15 tests |

**Actions:**
- [ ] Test all wallet methods (topup, withdraw, transfer)
- [ ] Test all user methods (CRUD, profile)
- [ ] Test notification sending logic

#### Priority 2: Low Coverage Services

| Service | Current | Target | Tests Needed |
|---------|---------|--------|--------------|
| **Disputes Service** | 6% | 70% | +25 tests |
| **VIP Service** | 41% | 80% | +15 tests |
| **Pin Service** | 53% | 80% | +10 tests |

**Actions:**
- [ ] Test dispute resolution flows
- [ ] Test VIP purchase and benefits
- [ ] Test PIN purchase and expiry

#### Priority 3: Controller Tests

| Controller | Current | Target |
|------------|---------|--------|
| Orders | 0% | 60% |
| Listings | 0% | 60% |
| VIP | 0% | 60% |
| Pin | 0% | 60% |
| Admin | 0% | 60% |
| Users | 0% | 60% |

---

### Phase 2: E2E Tests (3-4 ngày)

#### Existing E2E Tests

| Test File | Status | Notes |
|-----------|--------|-------|
| `full-flow.spec.ts` | ✅ Created | 8 test cases |
| `purchase-flow.spec.ts` | ✅ Created | 5 test cases |
| `buyer-view.spec.ts` | ✅ Created | 4 test cases |
| `seller-delivery.spec.ts` | ✅ Created | 5 test cases |
| `order-detail.spec.ts` | ✅ Created | 4 test cases |
| `vip-flow.spec.ts` | ✅ Created | New |
| `pin-flow.spec.ts` | ✅ Created | New |
| `admin-flow.spec.ts` | ✅ Created | New |
| `dispute-flow.spec.ts` | ✅ Created | New |

#### Actions:

- [ ] Setup Playwright test environment
- [ ] Configure base URL and test data
- [ ] Run existing E2E tests
- [ ] Fix any failing tests
- [ ] Add missing test cases

---

### Phase 3: Performance & Security (2-3 ngày)

#### Performance

| Metric | Current | Target |
|--------|---------|--------|
| API Response Time | TBD | < 200ms |
| Lighthouse Score | TBD | > 80 |
| Bundle Size | TBD | < 500KB |

**Actions:**
- [ ] Profile API endpoints
- [ ] Add database indexes
- [ ] Implement caching
- [ ] Optimize slow queries

#### Security

| Check | Priority | Status |
|-------|----------|--------|
| SQL Injection | High | ⏳ |
| XSS Prevention | High | ⏳ |
| JWT Validation | High | ⏳ |
| RBAC Enforcement | High | ⏳ |
| Rate Limiting | Medium | ⏳ |
| File Upload Validation | Medium | ⏳ |

**Actions:**
- [ ] Review all input validations
- [ ] Test authentication flows
- [ ] Test authorization (roles/permissions)
- [ ] Add rate limiting
- [ ] Security audit report

---

### Phase 4: Release v1.0 (2-3 ngày)

#### Documentation

- [ ] Update README.md
- [ ] API Documentation (Swagger)
- [ ] Deployment Guide
- [ ] User Guide

#### CI/CD

- [ ] GitHub Actions workflow
- [ ] Docker build & push
- [ ] Deploy to staging
- [ ] Deploy to production

#### Release Checklist

- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Code coverage > 60%
- [ ] No critical bugs
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Documentation complete

---

## 📋 Detailed Task List

### Week 1: Code Coverage

| Day | Task | Owner | Hours |
|-----|------|-------|-------|
| Mon | Wallet: topup methods | - | 4h |
| Mon | Wallet: withdraw methods | - | 4h |
| Tue | Users: CRUD operations | - | 4h |
| Tue | Users: profile management | - | 4h |
| Wed | Notifications: sending logic | - | 4h |
| Wed | Disputes: resolution flows | - | 4h |
| Thu | VIP: purchase & benefits | - | 4h |
| Fri | PIN: purchase & expiry | - | 4h |

### Week 2: E2E & Polish

| Day | Task | Owner | Hours |
|-----|------|-------|-------|
| Mon | Setup Playwright | - | 4h |
| Mon | Run existing E2E | - | 4h |
| Tue | Fix E2E failures | - | 4h |
| Tue | Add missing E2E | - | 4h |
| Wed | Performance profiling | - | 4h |
| Wed | Performance optimization | - | 4h |
| Thu | Security audit | - | 4h |
| Fri | Documentation | - | 4h |

### Week 3: Release

| Day | Task | Owner | Hours |
|-----|------|-------|-------|
| Mon | CI/CD setup | - | 4h |
| Mon | Deploy to staging | - | 4h |
| Tue | Bug fixes | - | 4h |
| Tue | Testing staging | - | 4h |
| Wed | Deploy to production | - | 4h |
| Wed | Final verification | - | 4h |
| Thu | Release announcement | - | 2h |
| Fri | Buffer / wrap up | - | 4h |

---

## 🚀 Next Actions

### Immediate (Today):

1. **Increase Wallet Service Coverage** (4h)
   - Test `createTopup()` method
   - Test `confirmTopup()` method
   - Test `createWithdraw()` method
   - Test `confirmWithdraw()` method

2. **Setup E2E Environment** (2h)
   - Install Playwright
   - Configure test settings
   - Create test fixtures

### This Week:

3. **Continue Coverage Expansion**
4. **Run E2E Tests**

---

## 📊 Success Metrics

| Metric | Current | Sprint 7 Target | Final Target |
|--------|---------|----------------|--------------|
| Unit Tests | 142/142 | 200+/220 | 250+ |
| Pass Rate | 100% | 95%+ | 95%+ |
| Code Coverage | 20% | 60% | 80% |
| E2E Tests | 0 | 20+ | 26+ |
| API Response | TBD | < 200ms | < 200ms |
| Critical Bugs | 0 | 0 | 0 |

---

## 📝 Notes

### Dependencies:
- Backend API must be running for E2E tests
- Test database needs to be seeded
- Playwright browsers need to be installed

### Risks:
- E2E tests may be flaky
- Performance optimization may require code changes
- Security audit may reveal issues

### Mitigation:
- Run E2E tests multiple times
- Prioritize critical endpoints
- Fix high-severity issues first

---

**Created:** 2026-03-16  
**Last Updated:** 2026-03-16  
**Sprint Owner:** Development Team  
**Target Release:** 2026-03-30
