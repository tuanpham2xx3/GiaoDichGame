# GIAODICHGAME - Quick Test Commands
# Các lệnh test nhanh cho Sprint 5

## ✅ Test 1: Unit Tests (Jest)

```bash
# Chạy tất cả unit tests
cd apps/api
npm run test

# Chạy với coverage
npm run test:cov

# Chạy test file cụ thể
npx jest auth.service.spec.ts
npx jest wallet.service.spec.ts
npx jest orders.service.spec.ts
npx jest encryption.service.spec.ts
```

## ✅ Test 2: Playwright E2E Tests

```bash
# Từ root directory
npx playwright test

# Chạy với UI (headed)
npx playwright test --headed

# Chạy test file cụ thể
npx playwright test tests/full-flow.spec.ts
npx playwright test tests/purchase-flow.spec.ts

# Xem báo cáo HTML
npx playwright show-report
```

## ✅ Test 3: Manual API Tests (PowerShell)

```powershell
# Rate Limiting Test
.\scripts\test-rate-limit.ps1

# VIP Flow Test
.\scripts\test-vip-flow.ps1

# Pin Flow Test
.\scripts\test-pin-flow.ps1

# Admin Stats Test
.\scripts\test-admin-stats.ps1

# Run all manual tests
.\scripts\run-all-tests.ps1 -ManualTests
```

## ✅ Test 4: Run All Tests

```powershell
# Run everything
.\scripts\run-all-tests.ps1 -All
```

## 📊 Test Files Overview

### Unit Tests (5 files)
- `apps/api/src/auth/auth.service.spec.ts`
- `apps/api/src/wallet/wallet.service.spec.ts`
- `apps/api/src/orders/orders.service.spec.ts`
- `apps/api/src/queue/processors/orders.processor.spec.ts`
- `apps/api/src/common/encryption.service.spec.ts`

### E2E Tests (5 files)
- `tests/full-flow.spec.ts`
- `tests/purchase-flow.spec.ts`
- `tests/buyer-view.spec.ts`
- `tests/seller-delivery.spec.ts`
- `tests/order-detail.spec.ts`

### Manual API Tests (4 scripts)
- `scripts/test-rate-limit.ps1` (TC-1-16)
- `scripts/test-vip-flow.ps1` (Sprint 5)
- `scripts/test-pin-flow.ps1` (Sprint 5)
- `scripts/test-admin-stats.ps1` (Sprint 5)

## 🎯 Test Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| Auth Service | 80% | ✅ 85% |
| Wallet Service | 80% | ✅ 82% |
| Orders Service | 80% | ✅ 81% |
| Encryption Service | 90% | ✅ 95% |
| Permissions Guard | 80% | ⏳ Pending |

## 📈 Expected Results

### Unit Tests
- Total: ~30 tests
- Pass: >95%
- Coverage: >80%

### E2E Tests
- Total: 5 test files
- Pass: >90%
- Duration: ~5 minutes

### Manual API Tests
- Rate Limiting: 429 after 5 requests
- VIP Flow: Purchase → Active status
- Pin Flow: Purchase → Pinned status
- Admin Stats: All metrics displayed

## 🔧 Troubleshooting

### Services not running?
```bash
# Start Docker services
docker-compose up -d postgres redis

# Start Backend
cd apps/api && npm run dev

# Start Frontend
cd apps/web && npm run dev
```

### Need to seed database?
```bash
npm run db:seed
```

### Port conflicts?
```bash
# Check what's using ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432
netstat -ano | findstr :6379
```

---
**Created**: 2026-03-15
**Last Updated**: 2026-03-15
