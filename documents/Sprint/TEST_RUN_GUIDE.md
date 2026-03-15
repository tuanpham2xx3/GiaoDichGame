# GIAODICHGAME - Test Execution Guide
## Hướng dẫn chạy tests local

> **Cập nhật:** 2026-03-15
> **Node:** >=20.x | **npm:** >=10.x

---

## 📋 Mục lục

1. [Chuẩn bị môi trường](#chuẩn-bị-môi-trường)
2. [Chạy Backend Unit Tests](#chạy-backend-unit-tests)
3. [Chạy Playwright E2E Tests](#chạy-playwright-e2e-tests)
4. [Chạy Manual API Tests](#chạy-manual-api-tests)
5. [Báo cáo kết quả](#báo-cáo-kết-quả)

---

## 🛠️ Chuẩn bị môi trường

### 1. Cài đặt dependencies

```bash
# Từ root directory
npm install

# Hoặc cài đặt riêng cho từng app
cd apps/api && npm install
cd apps/web && npm install
```

### 2. Khởi tạo Database & Redis

```bash
# Sử dụng Docker Compose
docker-compose up -d postgres redis

# Đợi services healthy (khoảng 10-15s)
docker-compose ps

# Chạy migrations
npm run db:migrate

# Chạy seed data
npm run db:seed
```

### 3. Tạo file .env

```bash
# Copy từ .env.example
copy .env.example .env
```

**Kiểm tra .env có các giá trị sau:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=giaodichgame
DB_USER=app
DB_PASS=apppassword

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=test_secret_key_at_least_32_chars_long
JWT_REFRESH_SECRET=test_refresh_secret_at_least_32_chars

NODE_ENV=development
PORT=3001
```

---

## 🧪 Chạy Backend Unit Tests

### Chạy tất cả unit tests

```bash
cd apps/api
npm run test
```

### Chạy với coverage report

```bash
cd apps/api
npm run test:cov
```

### Chạy test file cụ thể

```bash
# Test auth service
cd apps/api
npx jest auth.service.spec.ts

# Test wallet service
npx jest wallet.service.spec.ts

# Test orders service
npx jest orders.service.spec.ts

# Test encryption service
npx jest encryption.service.spec.ts

# Test orders processor
npx jest orders.processor.spec.ts
```

### Chạy test theo pattern

```bash
# Tất cả tests có chữ "service"
npx jest --testNamePattern="service"

# Tất cả tests trong folder common
npx jest common/
```

---

## 🎭 Chạy Playwright E2E Tests

### 1. Khởi động Backend & Frontend

```bash
# Terminal 1 - Backend
cd apps/api
npm run dev

# Terminal 2 - Frontend (đợi backend khởi động xong)
cd apps/web
npm run dev
```

**Đợi đến khi thấy:**
- Backend: `Nest application successfully started`
- Frontend: `Ready in 2xxxms`

### 2. Cài đặt Playwright browsers (lần đầu)

```bash
npx playwright install chromium
```

### 3. Chạy E2E tests

```bash
# Từ root directory
npx playwright test

# Chạy với UI (headed mode)
npx playwright test --headed

# Chạy test file cụ thể
npx playwright test tests/full-flow.spec.ts

# Chạy với reporter html
npx playwright test --reporter=html

# Xem báo cáo HTML
npx playwright show-report
```

### 4. Chạy tests theo project

```bash
# Chromium only
npx playwright test --project=chromium

# Tất cả browsers
npx playwright test --all
```

---

## 📡 Chạy Manual API Tests

### 1. Rate Limiting Test (TC-1-16)

**PowerShell Script:**
```powershell
# File: scripts/test-rate-limit.ps1
Write-Host "Testing Rate Limiting (6 requests in 60s)..." -ForegroundColor Cyan

1..6 | ForEach-Object {
  try {
    $res = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/login" `
      -Method POST `
      -ContentType "application/json" `
      -Body '{"email":"test@example.com","password":"wrongpassword"}' `
      -ErrorAction Stop
    Write-Host "Request $_`: HTTP $($res.StatusCode)" -ForegroundColor Green
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 429) {
      Write-Host "Request $_`: HTTP $status (Rate Limited!)" -ForegroundColor Red
    } else {
      Write-Host "Request $_`: HTTP $status" -ForegroundColor Yellow
    }
  }
}

Write-Host "`nExpected: Requests 1-5 = 401, Request 6 = 429" -ForegroundColor Yellow
```

**Chạy script:**
```powershell
cd scripts
.\test-rate-limit.ps1
```

### 2. VIP Purchase Flow Test

**PowerShell Script:**
```powershell
# File: scripts/test-vip-flow.ps1
$baseUrl = "http://localhost:3001"

# 1. Login
Write-Host "1. Logging in..." -ForegroundColor Cyan
$loginRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"vip@giaodich.com","password":"vip123"}'
$token = $loginRes.accessToken
Write-Host "✓ Logged in successfully" -ForegroundColor Green

# 2. Get VIP packages
Write-Host "2. Fetching VIP packages..." -ForegroundColor Cyan
$packages = Invoke-RestMethod -Uri "$baseUrl/api/v1/vip/packages" `
  -Headers @{ Authorization = "Bearer $token" }
Write-Host "✓ Found $($packages.data.Count) packages" -ForegroundColor Green
$packages.data | ForEach-Object { Write-Host "  - $($_.name): $($_.priceCoin) Coin" }

# 3. Purchase VIP
Write-Host "3. Purchasing VIP..." -ForegroundColor Cyan
try {
  $purchaseRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/vip/purchase" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{"packageId": 2}'
  Write-Host "✓ VIP purchased successfully!" -ForegroundColor Green
} catch {
  $body = $_.ErrorDetails.Message | ConvertFrom-Json
  Write-Host "✗ Purchase failed: $($body.message)" -ForegroundColor Red
}

# 4. Check VIP status
Write-Host "4. Checking VIP status..." -ForegroundColor Cyan
$vipStatus = Invoke-RestMethod -Uri "$baseUrl/api/v1/vip/my-vip" `
  -Headers @{ Authorization = "Bearer $token" }
if ($vipStatus.isVip) {
  Write-Host "✓ VIP status active until $($vipStatus.expiresAt)" -ForegroundColor Green
} else {
  Write-Host "✗ No active VIP" -ForegroundColor Red
}
```

**Chạy script:**
```powershell
cd scripts
.\test-vip-flow.ps1
```

### 3. Pin Purchase Flow Test

**PowerShell Script:**
```powershell
# File: scripts/test-pin-flow.ps1
$baseUrl = "http://localhost:3001"

# 1. Login as seller
Write-Host "1. Logging in as seller..." -ForegroundColor Cyan
$loginRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"seller@giaodich.com","password":"seller123"}'
$token = $loginRes.accessToken
Write-Host "✓ Logged in successfully" -ForegroundColor Green

# 2. Get listings
Write-Host "2. Fetching listings..." -ForegroundColor Cyan
$listings = Invoke-RestMethod -Uri "$baseUrl/api/v1/listings" `
  -Headers @{ Authorization = "Bearer $token" }
if ($listings.data.Count -eq 0) {
  Write-Host "✗ No listings found. Create one first." -ForegroundColor Red
  exit
}
$listingId = $listings.data[0].id
Write-Host "✓ Found listing: $($listings.data[0].title)" -ForegroundColor Green

# 3. Calculate Pin price
Write-Host "3. Calculating Pin price..." -ForegroundColor Cyan
$priceRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/pin/calculate-price?days=7" `
  -Headers @{ Authorization = "Bearer $token" }
Write-Host "✓ 7 days Pin: $($priceRes.finalPrice) Coin" -ForegroundColor Green

# 4. Purchase Pin
Write-Host "4. Purchasing Pin..." -ForegroundColor Cyan
try {
  $purchaseRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/pin/purchase" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body (@{ listingId = $listingId; days = 7 } | ConvertTo-Json)
  Write-Host "✓ Pin purchased successfully!" -ForegroundColor Green
} catch {
  $body = $_.ErrorDetails.Message | ConvertFrom-Json
  Write-Host "✗ Purchase failed: $($body.message)" -ForegroundColor Red
}
```

**Chạy script:**
```powershell
cd scripts
.\test-pin-flow.ps1
```

### 4. Admin Stats Test

**PowerShell Script:**
```powershell
# File: scripts/test-admin-stats.ps1
$baseUrl = "http://localhost:3001"

# 1. Login as admin
Write-Host "1. Logging in as admin..." -ForegroundColor Cyan
$loginRes = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@giaodich.com","password":"admin123"}'
$token = $loginRes.accessToken
Write-Host "✓ Logged in successfully" -ForegroundColor Green

# 2. Get system stats
Write-Host "2. Fetching system stats..." -ForegroundColor Cyan
$stats = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/stats" `
  -Headers @{ Authorization = "Bearer $token" }

Write-Host "`n=== SYSTEM STATISTICS ===" -ForegroundColor Cyan
Write-Host "Total Users:      $($stats.data.totalUsers)" -ForegroundColor White
Write-Host "Total Orders:     $($stats.data.totalOrders)" -ForegroundColor White
Write-Host "Total Disputes:   $($stats.data.totalDisputes)" -ForegroundColor White
Write-Host "Total Revenue:    $($stats.data.totalRevenue) Coin" -ForegroundColor Yellow
Write-Host "Total Listings:   $($stats.data.totalListings)" -ForegroundColor White
Write-Host "Active Listings:  $($stats.data.activeListings)" -ForegroundColor Green
```

**Chạy script:**
```powershell
cd scripts
.\test-admin-stats.ps1
```

---

## 📊 Báo cáo kết quả

### Sau khi chạy tests, kiểm tra:

```bash
# Unit Tests Coverage
cd apps/api
npm run test:cov
# Mở file: coverage/index.html

# Playwright Report
npx playwright show-report
```

### Checklist kết quả:

- [ ] Tất cả unit tests pass (>90%)
- [ ] Coverage >80% cho critical files
- [ ] E2E tests pass (>95%)
- [ ] Performance tests đạt yêu cầu
- [ ] Security tests pass
- [ ] Manual API tests successful

---

## 🔧 Troubleshooting

### Lỗi thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| Database connection failed | PostgreSQL chưa chạy | `docker-compose up -d postgres` |
| Redis connection failed | Redis chưa chạy | `docker-compose up -d redis` |
| 401 Unauthorized | Chưa login | Chạy script login trước |
| Test timeout | Server chậm | Tăng timeout trong playwright.config.ts |
| Port already in use | Port 3000/3001 đang dùng | `netstat -ano \| findstr :3001` |

### Kiểm tra services

```bash
# Docker containers
docker-compose ps

# Logs
docker-compose logs postgres
docker-compose logs redis

# Restart services
docker-compose restart
```

---

## 📈 Test Execution Summary

### Sprint 5 Tests - Quick Run

```bash
# 1. Unit Tests (5 files)
cd apps/api && npm run test

# 2. E2E Tests (5 files)
npx playwright test

# 3. Manual API Tests (4 scripts)
cd scripts
.\test-vip-flow.ps1
.\test-pin-flow.ps1
.\test-admin-stats.ps1
.\test-rate-limit.ps1
```

**Tổng thời gian dự kiến:** 15-20 phút

---

**Created**: 2026-03-15
**Author**: Development Team
