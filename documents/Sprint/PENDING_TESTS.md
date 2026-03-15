# Danh sách Test Cases Chưa Thực Hiện
## Dự án: GIAODICHGAME C2C Marketplace

> **Cập nhật lần cuối:** 2026-03-15
> **Nguồn:** RESULT_TEST_0n1.md – các test SKIP + TEST_1.md – các test chưa implement
> **Trạng thái:** Đã thực hiện 35 unit tests, 4 manual test scripts
> **Tổng số:** 8 test cases / nhóm còn pending

---

## Tóm tắt

| ID | Loại | Mức độ | Trạng thái | Sprint |
|----|------|--------|------------|--------|
| TC-0-06 | Infrastructure | Medium | ⏳ Pending | 0 |
| TC-0-12 | CI/CD | Medium | ⏳ Pending | 0 |
| TC-1-07 | Unit (Jest) | High | ⏳ Pending | 1 |
| TC-1-08 | Unit (Jest) | High | ⏳ Pending | 1 |
| TC-1-09 | E2E (Supertest) | Critical | ⏳ Pending | 1 |
| TC-1-10 | E2E (Supertest) | Critical | ⏳ Pending | 1 |
| TC-1-16 | Manual API | Medium | ✅ Script Ready | 1 |
| TC-1-25 | Manual API | High | ⏳ Pending | 1 |

---

## Completed Tests (2026-03-15)

### Unit Tests ✅
- **35 tests passed** across 4 test suites
- Encryption Service: 9 tests (100% coverage)
- Wallet Service: 12 tests (40% coverage)
- Auth Service: 8 tests (62% coverage)
- Orders Processor: 6 tests (21% coverage)

### Manual API Scripts ✅
- `scripts/test-rate-limit.ps1` (TC-1-16)
- `scripts/test-vip-flow.ps1` (Sprint 5)
- `scripts/test-pin-flow.ps1` (Sprint 5)
- `scripts/test-admin-stats.ps1` (Sprint 5)

---

## SPRINT 0 – Infrastructure

---

### TC-0-06: Nginx Reverse Proxy Routing

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Medium |
| **Loại** | Infrastructure |
| **Lý do SKIP** | Nginx không có trong `docker-compose.yml` hiện tại |
| **Thực hiện khi** | Sprint triển khai production / staging |

**Điều kiện cần trước:**
- Thêm service `nginx` vào `docker-compose.yml`
- Tạo file cấu hình `nginx/nginx.conf`

**Checklist khi thực hiện:**
- [ ] `http://localhost/api/...` → forward tới NestJS API `:3001`
- [ ] `http://localhost/` → forward tới Next.js Frontend `:3000`
- [ ] Nginx trả đúng header `X-Forwarded-For`
- [ ] HTTPS (nếu có cert) hoạt động đúng

**Cấu hình mẫu cần thêm vào `docker-compose.yml`:**
```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  depends_on:
    - api
    - web
```

---

### TC-0-12: GitHub Actions CI Pipeline

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Medium |
| **Loại** | CI/CD |
| **Lý do SKIP** | Chưa push code lên remote repository |
| **Thực hiện khi** | Push lên GitHub lần đầu |

**Điều kiện cần trước:**
- File `.github/workflows/ci.yml` đã tồn tại (cần kiểm tra)
- Push branch lên remote

**Checklist khi thực hiện:**
- [ ] Workflow trigger khi push / PR
- [ ] Step `npm ci` cài dependencies thành công
- [ ] Step `npm run build` build API + Web thành công
- [ ] Step `npm run test` chạy unit tests, pass tất cả
- [ ] Coverage report được upload (nếu cấu hình)
- [ ] Badge CI hiển thị trên README

**Lệnh kiểm tra trước khi push:**
```bash
# Chạy thử toàn bộ pipeline locally
cd apps/api && npm ci && npm run build && npm run test
cd apps/web && npm ci && npm run build
```

---

## SPRINT 1 – Auth & Wallet

---

### TC-1-07: Unit – `PermissionsGuard` ADMIN bypass tất cả permissions

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | High |
| **Loại** | Unit (Jest) |
| **File cần tạo** | `apps/api/src/common/guards/permissions.guard.spec.ts` |
| **Lý do chưa thực hiện** | File spec chưa được tạo |

**Điều kiện cần trước:**
- Hiểu cách `PermissionsGuard` đọc role ADMIN từ DB hoặc từ user context

**Test case cần implement:**
```typescript
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  // Setup mock Reflector, mock UsersService / DB

  it('TC-1-07: should allow ADMIN to access any protected endpoint', async () => {
    // Mock: user có role ADMIN
    // Mock Reflector trả về ['topup:confirm'] (required permissions)
    const context = createMockExecutionContext({ userId: adminId, roles: ['ADMIN'] });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
```

**Kết quả mong đợi:** `canActivate()` trả `true` dù endpoint yêu cầu bất kỳ permission nào

---

### TC-1-08: Unit – `PermissionsGuard` User không có permission → ForbiddenException

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | High |
| **Loại** | Unit (Jest) |
| **File cần tạo** | `apps/api/src/common/guards/permissions.guard.spec.ts` |
| **Lý do chưa thực hiện** | File spec chưa được tạo |

**Test case cần implement:**
```typescript
  it('TC-1-08: should deny access when user lacks required permission', async () => {
    // Mock: user có role USER (chỉ có 'profile:edit')
    // Mock Reflector trả về ['topup:confirm']
    const context = createMockExecutionContext({ userId: regularUserId });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    // hoặc: expect(result).toBe(false) tuỳ implement
  });
```

**Kết quả mong đợi:** ForbiddenException hoặc `false` → HTTP 403

**Lưu ý khi tạo file:**
```bash
# Tạo file spec rồi chạy:
cd apps/api
npx jest permissions.guard.spec.ts --coverage
# Target: coverage ≥ 80% cho permissions.guard.ts
```

---

### TC-1-09: E2E – Luồng Register → Login → GetMe

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | E2E (Supertest) |
| **File cần tạo** | `apps/api/test/auth.e2e-spec.ts` |
| **Lý do chưa thực hiện** | E2E test infrastructure chưa được setup |

**Setup cần thực hiện trước:**
1. Kiểm tra `apps/api/test/jest-e2e.json` tồn tại
2. Cần database riêng cho E2E (hoặc rollback sau mỗi test)
3. Chạy `npm run test:e2e` từ `apps/api`

**Flow test:**
```typescript
// apps/api/test/auth.e2e-spec.ts
import * as request from 'supertest';

describe('Auth (e2e)', () => {
  it('TC-1-09: Register → Login → GetMe', async () => {
    // 1. Register
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'e2e@test.com', password: 'Test1234!', username: 'e2eUser' })
      .expect(201);

    expect(registerRes.body).toMatchObject({ email: 'e2e@test.com' });
    expect(registerRes.body).not.toHaveProperty('passwordHash');

    // 2. Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@test.com', password: 'Test1234!' })
      .expect(200);

    const { accessToken } = loginRes.body;
    expect(accessToken).toBeDefined();

    // 3. GetMe
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body).toMatchObject({ email: 'e2e@test.com' });
    expect(meRes.body.permissions).toContain('profile:edit');
  });
});
```

**Kết quả mong đợi:**
- Register: 201, không có `passwordHash`
- Login: 200, có `accessToken` + `refreshToken`
- GetMe: 200, `permissions: ["profile:edit"]`

---

### TC-1-10: E2E – Topup bank request → Admin confirm → Balance tăng

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | E2E (Supertest) |
| **File cần tạo** | `apps/api/test/wallet.e2e-spec.ts` |
| **Lý do chưa thực hiện** | E2E test infrastructure chưa được setup |

**Flow test:**
```typescript
// apps/api/test/wallet.e2e-spec.ts
describe('Wallet (e2e)', () => {
  it('TC-1-10: Topup bank → Admin confirm → Balance updated', async () => {
    // 1. Đăng nhập user thường
    const { accessToken: userToken } = await loginAs('user@e2e.com', 'Test1234!');

    // 2. Tạo topup request
    const topupRes = await request(app.getHttpServer())
      .post('/api/v1/wallet/topup/bank')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount_coin: 100000 })
      .expect(201);

    const topupId = topupRes.body.id;
    expect(topupRes.body.reference).toMatch(/^GDG-/);

    // 3. Admin confirm
    const { accessToken: adminToken } = await loginAs('admin@giaodichgame.com', 'Admin1234!');
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/topup-requests/${topupId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 4. Kiểm tra balance
    const balanceRes = await request(app.getHttpServer())
      .get('/api/v1/wallet/balance')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(balanceRes.body.available).toBe(100000);
  });
});
```

**Kết quả mong đợi:**
- Topup: 201, `reference` format `GDG-XXXXXX`
- Confirm: 200, status SUCCESS
- Balance: `available = 100000`

---

### TC-1-16: Manual – Rate Limiting (5 sai password → 429)

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Medium |
| **Loại** | Manual API |
| **Lý do SKIP** | Cần gửi 5+ request liên tiếp thủ công; không tiện tự động hoá trong session |

**Cách thực hiện (PowerShell):**
```powershell
# Gửi 6 lần login sai trong 60s
1..6 | ForEach-Object {
  $res = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"test@example.com","password":"wrongpassword"}' `
    -ErrorAction SilentlyContinue
  Write-Host "Lần $_`: HTTP $($res.StatusCode)"
}
```

**Kết quả mong đợi:**
| Lần | HTTP Status |
|-----|-------------|
| 1–5 | `401 Unauthorized` |
| 6 | `429 Too Many Requests` |

**Lưu ý:**
- Throttle config hiện tại: `5 req / 60s` (kiểm tra `apps/api/src/app.module.ts`)
- Sau 60 giây reset, có thể thử lại
- Nếu đang dùng admin account có thể không bị throttle tuỳ config

---

### TC-1-25: Manual – Gateway Topup (Mock) + Webhook

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | High |
| **Loại** | Manual API |
| **Lý do SKIP** | Mock gateway URL (`mockcoingateway.dev`) chưa cấu hình trong môi trường local |

**Điều kiện cần trước:**
1. Thêm vào `.env`:
   ```env
   COIN_GATEWAY_URL=http://localhost:9999
   COIN_GATEWAY_SECRET=mock_secret_key
   ```
2. Hoặc dùng công cụ như [mockoon](https://mockoon.com/) / [webhook.site](https://webhook.site) để mock endpoint

**Flow test sau khi setup:**
```powershell
# Bước 1: Tạo gateway topup request
$token = "<access_token>"
$res = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/wallet/topup/gateway" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"amount_coin": 50000, "method": "MOMO"}'

$reference = $res.reference
Write-Host "Reference: $reference"
# Kỳ vọng: redirect_url trả về

# Bước 2: Giả lập webhook callback từ gateway
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/wallet/topup/webhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body "{`"reference`": `"$reference`", `"status`": `"SUCCESS`", `"signature`": `"mock_sig`"}"
# Kỳ vọng: 200 OK

# Bước 3: Kiểm tra balance tăng
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/wallet/balance" `
  -Headers @{ Authorization = "Bearer $token" }
# Kỳ vọng: available tăng thêm 50000
```

**Kết quả mong đợi:**
- Bước 1: 201, `{ redirect_url: "https://mockcoingateway.dev?ref=..." }`
- Bước 2: 200 OK (webhook xử lý thành công)
- Bước 3: `available` tăng đúng 50,000

---

## Hướng dẫn thực hiện theo thứ tự ưu tiên

```
Priority 1 (Unit – có thể làm ngay):
  TC-1-07 + TC-1-08  →  Tạo permissions.guard.spec.ts
  Lệnh: cd apps/api && npx jest permissions.guard --coverage

Priority 2 (E2E – cần setup):
  TC-1-09 + TC-1-10  →  Tạo apps/api/test/*.e2e-spec.ts
  Lệnh: cd apps/api && npm run test:e2e

Priority 3 (Manual – cần môi trường):
  TC-1-16  →  Chạy PowerShell script gửi 6 request liên tiếp
  TC-1-25  →  Setup mock gateway (mockoon hoặc env var)

Priority 4 (Infrastructure – cần sprint riêng):
  TC-0-06  →  Thêm Nginx vào docker-compose
  TC-0-12  →  Push code lên GitHub, verify CI workflow
```
