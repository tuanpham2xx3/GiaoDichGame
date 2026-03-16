# E2E Testing Guide - GIAODICHGAME
## Playwright Test Suite

> **Version:** 1.0
> **Last Updated:** 2026-03-15

---

## 📋 Overview

This guide covers how to run and maintain the E2E test suite for GIAODICHGAME using Playwright.

### Test Files

#### Core Flows (`/tests/`)
| File | Tests | Description |
|------|-------|-------------|
| `full-flow.spec.ts` | E2E-001 to E2E-008 | Complete buyer/seller journey |
| `purchase-flow.spec.ts` | 5 tests | Purchase scenarios |
| `buyer-view.spec.ts` | 4 tests | Buyer order viewing |
| `seller-delivery.spec.ts` | 5 tests | Seller delivery process |
| `order-detail.spec.ts` | 4 tests | Order detail page |
| `vip-flow.spec.ts` | E2E-VIP-001 to E2E-VIP-003 | VIP purchase & benefits |
| `pin-flow.spec.ts` | E2E-PIN-001 to E2E-PIN-002 | Pin listing feature |
| `admin-flow.spec.ts` | E2E-ADMIN-001 to E2E-ADMIN-003 | Admin dashboard |
| `dispute-flow.spec.ts` | E2E-DSP-001 to E2E-DSP-003 | Dispute resolution |

#### Web Tests (`/apps/web/tests/`)
| File | Description |
|------|-------------|
| `admin-dispute.spec.ts` | Admin dispute management |
| `dispute-flow.spec.ts` | Dispute flow from web perspective |

---

## 🚀 Setup

### 1. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Or start all services (API, Web, Nginx)
docker-compose up -d
```

### 2. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Key variables:
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
# - REDIS_HOST, REDIS_PORT
# - JWT_SECRET, JWT_REFRESH_SECRET
# - AES_SECRET_KEY
```

### 3. Start Application

```bash
# Terminal 1: Start API
cd apps/api
npm run dev
# API runs on http://localhost:3001

# Terminal 2: Start Web
cd apps/web
npm run dev
# Web runs on http://localhost:3000
```

### 4. Install Playwright Browsers

```bash
# Install browsers (Chrome, Firefox, WebKit)
npx playwright install

# Install only Chrome (for faster setup)
npx playwright install chromium
```

---

## 🧪 Running Tests

### Basic Commands

```bash
# Run all E2E tests
npx playwright test

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test tests/full-flow.spec.ts

# Run specific test by name
npx playwright test -g "E2E-001"

# Run tests in a specific project
npx playwright test --project=chromium
```

### Advanced Options

```bash
# Run tests with custom timeout
npx playwright test --timeout=60000

# Run tests in parallel (default)
npx playwright test --workers=4

# Run tests sequentially
npx playwright test --workers=1

# Run only failed tests
npx playwright test --failed

# Run tests with trace recording
npx playwright test --trace=on

# Generate HTML report
npx playwright test --reporter=html
```

---

## 📊 Test Structure

### Test Organization

```
tests/
├── full-flow.spec.ts          # Core buyer/seller flows
├── purchase-flow.spec.ts      # Purchase scenarios
├── buyer-view.spec.ts         # Buyer viewing orders
├── seller-delivery.spec.ts    # Seller delivery process
├── order-detail.spec.ts       # Order detail pages
├── vip-flow.spec.ts           # VIP features (NEW)
├── pin-flow.spec.ts           # Pin features (NEW)
├── admin-flow.spec.ts         # Admin features (NEW)
└── dispute-flow.spec.ts       # Dispute resolution (NEW)
```

### Test Naming Convention

- `E2E-XXX`: Core flow tests
- `E2E-VIP-XXX`: VIP feature tests
- `E2E-PIN-XXX`: Pin feature tests
- `E2E-ADMIN-XXX`: Admin feature tests
- `E2E-DSP-XXX`: Dispute feature tests

---

## 🔧 Test Data

### Default Test Users

| Role | Email | Password |
|------|-------|----------|
| Buyer | buyer@giaodich.com | buyer123 |
| Seller | seller@giaodich.com | seller123 |
| Admin | admin@giaodich.com | admin123 |
| VIP User | vipuser@giaodich.com | vipuser123 |

### Seeding Test Data

```bash
# Run database seeds
cd apps/api
npm run db:seed
```

---

## 📈 Coverage Goals

### Target Coverage

| Test Type | Target | Current |
|-----------|--------|---------|
| Core Flows | 8 tests | 8 tests ✅ |
| VIP Flows | 3 tests | 3 tests ✅ |
| Pin Flows | 2 tests | 2 tests ✅ |
| Admin Flows | 3 tests | 3 tests ✅ |
| Dispute Flows | 3 tests | 3 tests ✅ |
| **Total** | **19 tests** | **19 tests ✅** |

### Pass Rate Target

- **Target:** >90% pass rate
- **Skipped Tests:** Manual tests (72h wait, insufficient balance scenarios)

---

## 🐛 Debugging

### Common Issues

#### 1. Tests Fail Due to Timeout

```bash
# Increase timeout
npx playwright test --timeout=120000

# Run tests slower
npx playwright test --workers=1
```

#### 2. Tests Fail Due to Missing Data

```bash
# Seed database first
npm run db:seed

# Or run setup script
./scripts/setup-test-data.sh
```

#### 3. Browser Issues

```bash
# Reinstall browsers
npx playwright install --force

# Use different browser
npx playwright test --project=firefox
```

### Debug Mode

```bash
# Run with debug output
DEBUG=pw:api npx playwright test

# Run specific test with debug
DEBUG=pw:api npx playwright test -g "E2E-001"
```

---

## 📝 Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name (E2E-XXX)', () => {
  const USER_EMAIL = 'user@giaodich.com';
  const USER_PASSWORD = 'password123';

  test('E2E-XXX: should complete feature flow', async ({ page }) => {
    // 1. Setup (login, navigate)
    await page.goto('/login');
    await page.fill('input[type="email"]', USER_EMAIL);
    await page.fill('input[type="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 2. Action
    await page.goto('/feature');
    await page.click('button:has-text("Action")');
    
    // 3. Verification
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Wait for elements** before interacting
3. **Skip tests** when prerequisites not met
4. **Clear test data** after tests
5. **Use descriptive test names**

---

## 🎯 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: giaodichgame
          POSTGRES_USER: app
          POSTGRES_PASSWORD: apppassword
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Start application
        run: docker-compose up -d
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📞 Support

For issues or questions:
- Check [Playwright Documentation](https://playwright.dev)
- Review test files for examples
- Contact development team

---

**End of Guide**
