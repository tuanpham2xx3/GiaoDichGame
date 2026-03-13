# Sprint 1 – Test Plan: Auth & Wallet
## Dự án: GIAODICHGAME C2C Marketplace

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-13
> Sprint 1 tập trung kiểm thử xác thực người dùng (Auth), hệ thống Ví Coin (Ledger), và các luồng nạp/rút tiền.

---

## Phạm vi kiểm thử

| Module | Loại test |
|--------|-----------|
| Auth (register, login, refresh, logout, getMe) | Unit + E2E |
| Users (profile, permissions, transactions) | Unit + E2E |
| Wallet Ledger (balance, debit, credit) | Unit + E2E |
| Topup (bank request, gateway mock, webhook, admin confirm) | E2E + Manual |
| Withdraw (create request, balance check, mock bank) | E2E + Manual |
| Insurance (deposit, withdraw, conditions) | Unit + Manual |
| PermissionsGuard (RBAC, cache Redis) | Unit |
| Rate Limiting (throttle login) | Manual |
| Frontend pages (Register, Login, Wallet, Profile, Admin) | Manual |

---

## PHẦN 1: UNIT TESTS (Jest)

### TC-1-01: `auth.service.spec.ts` – Register tạo user + gán role USER

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Unit |
| **File** | `apps/api/src/auth/auth.service.spec.ts` |

**Test case:**
```typescript
it('should create user with hashed password and assign USER role', async () => {
  const dto = { email: 'user@test.com', password: 'Test1234!', username: 'user1' };
  const result = await authService.register(dto);
  expect(result.email).toBe(dto.email);
  expect(result.passwordHash).not.toBe(dto.password); // bcrypt hashed
  // Kiểm tra role USER được gán
  const roles = await usersService.getRoles(result.id);
  expect(roles).toContain('USER');
});
```

**Kết quả mong đợi:**
- User được tạo thành công
- `passwordHash` khác với plain password (bcrypt)
- Role `USER` được gán vào bảng `user_roles`

---

### TC-1-02: `auth.service.spec.ts` – Login sai password → UnauthorizedException

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Unit |

**Test case:**
```typescript
it('should throw UnauthorizedException on wrong password', async () => {
  await expect(
    authService.login({ email: 'user@test.com', password: 'WrongPass' })
  ).rejects.toThrow(UnauthorizedException);
});
```

**Kết quả mong đợi:** `UnauthorizedException` được throw

---

### TC-1-03: `auth.service.spec.ts` – Refresh token bị revoke → UnauthorizedException

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Unit |

**Test case:**
```typescript
it('should throw UnauthorizedException when refresh token is revoked', async () => {
  const { refresh_token } = await authService.login({ email: 'user@test.com', password: 'Test1234!' });
  await authService.logout(userId);
  await expect(
    authService.refreshToken(userId, refresh_token)
  ).rejects.toThrow(UnauthorizedException);
});
```

**Kết quả mong đợi:** `UnauthorizedException` sau khi token đã bị revoke

---

### TC-1-04: `wallet.service.spec.ts` – getBalance tính đúng số dư

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Unit |
| **File** | `apps/api/src/wallet/wallet.service.spec.ts` |

**Test case:**
```typescript
it('should calculate correct balance: 3 TOPUPs + 1 WITHDRAW', async () => {
  // Seed: +100000, +50000, +50000, -30000 (tất cả status=SUCCESS)
  await walletService.credit(userId, 100000, 'TOPUP');
  await walletService.credit(userId, 50000, 'TOPUP');
  await walletService.credit(userId, 50000, 'TOPUP');
  await walletService.debit(userId, 30000, 'WITHDRAW');

  const balance = await walletService.getBalance(userId);
  expect(balance.available).toBe(170000);
});
```

**Kết quả mong đợi:** `balance.available = 170000`

---

### TC-1-05: `wallet.service.spec.ts` – Debit khi số dư không đủ → BadRequestException

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Unit |

**Test case:**
```typescript
it('should throw BadRequestException when balance is insufficient', async () => {
  // balance = 0
  await expect(
    walletService.debit(userId, 100000, 'WITHDRAW')
  ).rejects.toThrow(BadRequestException);
});
```

**Kết quả mong đợi:** `BadRequestException` – không tạo record âm

---

### TC-1-06: `wallet.service.spec.ts` – Race condition: 2 request debit đồng thời

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Unit / Concurrency |

**Mô tả:** Pessimistic Lock (`SELECT ... FOR UPDATE`) phải đảm bảo chỉ 1 trong 2 request debit thành công khi số dư chỉ đủ cho 1.

**Test case:**
```typescript
it('should only allow one debit when two concurrent requests exceed balance', async () => {
  await walletService.credit(userId, 100000, 'TOPUP');

  // Gửi 2 debit 100000 đồng thời
  const results = await Promise.allSettled([
    walletService.debit(userId, 100000, 'WITHDRAW'),
    walletService.debit(userId, 100000, 'WITHDRAW'),
  ]);

  const successes = results.filter(r => r.status === 'fulfilled');
  const failures = results.filter(r => r.status === 'rejected');

  expect(successes.length).toBe(1);
  expect(failures.length).toBe(1);

  const balance = await walletService.getBalance(userId);
  expect(balance.available).toBe(0);
});
```

**Kết quả mong đợi:**
- Đúng 1 thành công, 1 thất bại với `BadRequestException`
- Số dư cuối = 0

---

### TC-1-07: `permissions.guard.spec.ts` – ADMIN bypass tất cả permissions

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | High |
| **Loại** | Unit |

**Test case:**
```typescript
it('should allow ADMIN to access any protected endpoint', async () => {
  const context = createMockExecutionContext({ userId: adminId });
  const result = await permissionsGuard.canActivate(context);
  expect(result).toBe(true);
});
```

---

### TC-1-08: `permissions.guard.spec.ts` – User không có permission → 403

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | High |
| **Loại** | Unit |

**Test case:**
```typescript
it('should deny access when user lacks required permission', async () => {
  // User chỉ có role USER, không có 'topup:confirm'
  const context = createMockExecutionContext({ userId: regularUserId }, ['topup:confirm']);
  const result = await permissionsGuard.canActivate(context);
  expect(result).toBe(false);
});
```

**Kết quả mong đợi:** `false` → HTTP 403 Forbidden

---

### Chạy toàn bộ unit tests:

```bash
cd apps/api
npm run test          # tất cả unit tests
npm run test:cov      # kèm coverage report
```

**Coverage mong đợi tối thiểu:**
- `auth.service`: 80%+
- `wallet.service`: 90%+
- `permissions.guard`: 80%+

---

## PHẦN 2: E2E TESTS (Supertest)

```bash
cd apps/api
npm run test:e2e
```

### TC-1-09: E2E – Luồng Register → Login → GetMe

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | E2E |

**Flow:**
1. POST `/api/v1/auth/register` → 201
2. POST `/api/v1/auth/login` → 200, nhận `access_token`
3. GET `/api/v1/auth/me` (Bearer token) → 200, trả user + permissions

**Assertions:**
- Register: `{ id, email, username }`, không có `passwordHash` trong response
- Login: `{ access_token: "...", refresh_token: "..." }`
- GetMe: `{ id, email, username, permissions: ["profile:edit"] }`

---

### TC-1-10: E2E – Topup bank request → Admin confirm → Balance tăng

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | E2E |

**Flow:**
1. Đăng nhập user thường → lấy `user_token`
2. POST `/api/v1/wallet/topup/bank` → 201, `{ id, bank_info, reference: "GDG-XXXXXX" }`
3. Đăng nhập Admin → lấy `admin_token`
4. PATCH `/api/v1/admin/topup-requests/:id/confirm` → 200, `{ status: "SUCCESS" }`
5. GET `/api/v1/wallet/balance` (user_token) → `{ available: 100000, insurance: 0 }`

---

## PHẦN 3: MANUAL API TESTS (curl / Postman)

### TC-1-11: Register

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","username":"GamerTest"}'
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `201 Created` |
| Body | `{ "id": 1, "email": "test@example.com", "username": "GamerTest" }` |
| Không có | `passwordHash` trong response |

---

### TC-1-12: Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `200 OK` |
| Body | `{ "access_token": "...", "refresh_token": "..." }` |

---

### TC-1-13: GetMe (Lưu access_token từ TC-1-12)

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `200 OK` |
| Body | `{ "id": 1, "email": "...", "username": "...", "permissions": ["profile:edit"] }` |

---

### TC-1-14: Refresh Token

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Authorization: Bearer <refresh_token>"
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `200 OK` |
| Body | `{ "access_token": "<new_token>", "refresh_token": "<new_refresh>" }` |
| Lưu ý | Refresh token cũ phải bị vô hiệu hóa (rotation) |

---

### TC-1-15: Logout

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

Sau đó thử dùng lại `refresh_token` cũ:
```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Authorization: Bearer <old_refresh_token>"
```

| Kết quả mong đợi | |
|--|--|
| Logout | `200 OK` |
| Refresh sau logout | `401 Unauthorized` – token đã bị revoke |

---

### TC-1-16: Rate Limiting – Sai password 5 lần liên tiếp → 429

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpass"}'
done
```

| Kết quả mong đợi | |
|--|--|
| Lần 1-5 | `401 Unauthorized` |
| Lần 6 | `429 Too Many Requests` |

---

### TC-1-17: Wallet – Tạo topup request (bank)

```bash
curl -X POST http://localhost:3001/api/v1/wallet/topup/bank \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"amount_coin": 100000}'
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `201 Created` |
| Body | `{ "id": 1, "bank_info": { "bank_name": "...", "account_number": "...", "holder": "..." }, "reference": "GDG-000001" }` |

---

### TC-1-18: Wallet – Admin confirm topup

```bash
# Cần đăng nhập bằng tài khoản có quyền topup:confirm
curl -X PATCH http://localhost:3001/api/v1/admin/topup-requests/1/confirm \
  -H "Authorization: Bearer <admin_access_token>"
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `200 OK` |
| Body | `{ "status": "SUCCESS" }` |

---

### TC-1-19: Wallet – Balance sau khi topup

```bash
curl http://localhost:3001/api/v1/wallet/balance \
  -H "Authorization: Bearer <user_access_token>"
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `200 OK` |
| Body | `{ "available": 100000, "insurance": 0 }` |

---

### TC-1-20: Wallet – Withdraw

```bash
curl -X POST http://localhost:3001/api/v1/wallet/withdraw \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_coin": 50000,
    "bank_name": "Vietcombank",
    "account_number": "1234567890",
    "account_holder": "NGUYEN VAN A"
  }'
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `201 Created` |
| Kiểm tra balance | `GET /wallet/balance` → `{ "available": 50000, ... }` |

---

### TC-1-21: Wallet – Withdraw khi số dư không đủ → 400

```bash
# Giả sử balance = 50000, thử rút 100000
curl -X POST http://localhost:3001/api/v1/wallet/withdraw \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"amount_coin": 100000, "bank_name": "VCB", "account_number": "123", "account_holder": "A"}'
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `400 Bad Request` |
| Body | Message lỗi: "Số dư không đủ" hoặc tương đương |

---

### TC-1-22: PermissionsGuard – User thường không có `topup:confirm` → 403

```bash
# Đăng nhập bằng tài khoản thường (role USER)
curl -X PATCH http://localhost:3001/api/v1/admin/topup-requests/1/confirm \
  -H "Authorization: Bearer <regular_user_token>"
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `403 Forbidden` |

---

### TC-1-23: User Profile – Cập nhật username

```bash
curl -X PATCH http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "NewUsername", "avatar_url": "https://example.com/avatar.png"}'
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `200 OK` |
| Body | `{ "username": "NewUsername", "avatar_url": "https://..." }` |

---

### TC-1-24: User Transactions – Lịch sử giao dịch

```bash
curl http://localhost:3001/api/v1/users/me/transactions \
  -H "Authorization: Bearer <access_token>"
```

| Kết quả mong đợi | |
|--|--|
| HTTP Status | `200 OK` |
| Body | Array transactions: `[{ type, amount, status, created_at }]` |

---

### TC-1-25: Gateway Topup (Mock) + Webhook

```bash
# Tạo gateway topup request
curl -X POST http://localhost:3001/api/v1/wallet/topup/gateway \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"amount_coin": 50000, "method": "MOMO"}'
# Expected: { "redirect_url": "https://mockcoingateway.dev?ref=..." }

# Giả lập webhook callback
curl -X POST http://localhost:3001/api/v1/wallet/topup/webhook \
  -H "Content-Type: application/json" \
  -d '{"reference": "<ref_from_above>", "status": "SUCCESS", "signature": "mock_sig"}'
# Expected: 200 OK

# Kiểm tra balance
curl http://localhost:3001/api/v1/wallet/balance \
  -H "Authorization: Bearer <access_token>"
# Expected: balance tăng thêm 50000
```

---

## PHẦN 4: MANUAL FRONTEND TESTS

### TC-1-26: Register page

| Bước | Kỳ vọng |
|------|---------|
| Mở `http://localhost:3000/register` | Trang đăng ký hiển thị với 3 trường: email, username, password |
| Điền đúng thông tin → Submit | Redirect về `/login`, không báo lỗi |
| Điền email đã tồn tại → Submit | Hiển thị thông báo lỗi "Email đã được sử dụng" |
| Điền password < 8 ký tự | Client validation lỗi trước khi submit |

---

### TC-1-27: Login page

| Bước | Kỳ vọng |
|------|---------|
| Mở `http://localhost:3000/login` | Trang đăng nhập hiển thị với email + password |
| Đăng nhập đúng | Redirect về dashboard; Header hiển thị username |
| Đăng nhập sai password | Thông báo lỗi "Sai email hoặc mật khẩu" |

---

### TC-1-28: Header – Hiển thị số dư Coin

| Bước | Kỳ vọng |
|------|---------|
| Đăng nhập thành công | Header cố định (glassmorphism) hiển thị username + số dư Coin |
| Số dư Coin = 0 (tài khoản mới) | Header hiển thị "0 Coin" hoặc "0đ" |
| Sau khi được nạp 100000 | Reload trang → Header số dư cập nhật đúng |

---

### TC-1-29: Wallet Dashboard (`/wallet`)

| Bước | Kỳ vọng |
|------|---------|
| Truy cập `/wallet` khi chưa đăng nhập | Redirect về `/login` |
| Truy cập `/wallet` sau khi đăng nhập | Hiển thị balance card (Coin khả dụng, Quỹ BH) |
| Có giao dịch trong DB | Bảng lịch sử hiển thị: Loại, Số Coin, Trạng thái, Thời gian |

---

### TC-1-30: Topup page (`/wallet/topup`)

| Bước | Kỳ vọng |
|------|---------|
| Mở `/wallet/topup` | Hiển thị 2 tab: Chuyển khoản / Cổng thanh toán |
| Tab Chuyển khoản: nhập số Coin → Submit | Hiển thị thông tin STKTK ngân hàng + mã chuyển khoản (reference) |
| Tab Cổng TT: chọn MoMo, nhập số Coin → Submit | Redirect (mock) tới URL `https://mockcoingateway.dev?ref=...` |

---

### TC-1-31: Withdraw page (`/wallet/withdraw`)

| Bước | Kỳ vọng |
|------|---------|
| Mở `/wallet/withdraw` | Hiển thị số dư khả dụng + form rút tiền |
| Nhập số Coin vượt số dư → Submit | Client/server báo lỗi "Số dư không đủ" |
| Nhập số Coin hợp lệ → Submit | Thành công; reload → số dư giảm |

---

### TC-1-32: Admin Topup Requests (`/admin/topup-requests`)

| Bước | Kỳ vọng |
|------|---------|
| Truy cập bằng tài khoản thường | Redirect về trang lỗi 403 / trang chủ |
| Truy cập bằng Admin | Hiển thị bảng danh sách PENDING topup requests |
| Bấm "Xác nhận" trên 1 request | Status → SUCCESS; request biến mất khỏi danh sách PENDING |
| Quay lại wallet user → reload | Số dư tăng đúng |

---

### TC-1-33: Profile page (`/profile`)

| Bước | Kỳ vọng |
|------|---------|
| Mở `/profile` | Hiển thị avatar, username, email hiện tại |
| Sửa username → Lưu | API call thành công; username mới hiển thị ngay |
| Sửa avatar URL (URL hợp lệ) → Lưu | Avatar cập nhật |

---

## Tổng kết – Definition of Done

### Unit Tests

| Test Case | Mô tả | Pass? |
|-----------|-------|-------|
| TC-1-01 | Register tạo user + gán role USER | [ ] |
| TC-1-02 | Login sai password → UnauthorizedException | [ ] |
| TC-1-03 | Refresh token revoked → UnauthorizedException | [ ] |
| TC-1-04 | getBalance: 3 TOPUP + 1 WITHDRAW = đúng số dư | [ ] |
| TC-1-05 | Debit khi số dư không đủ → BadRequestException | [ ] |
| TC-1-06 | Race condition: 2 debit đồng thời, chỉ 1 thành công | [ ] |
| TC-1-07 | ADMIN bypass permissions | [ ] |
| TC-1-08 | User thiếu permission → 403 | [ ] |

### E2E Tests

| Test Case | Mô tả | Pass? |
|-----------|-------|-------|
| TC-1-09 | Register → Login → GetMe | [ ] |
| TC-1-10 | Topup bank → Admin confirm → Balance tăng | [ ] |

### Manual API Tests

| Test Case | Mô tả | Pass? |
|-----------|-------|-------|
| TC-1-11 | Register → 201 | [ ] |
| TC-1-12 | Login → 200 + tokens | [ ] |
| TC-1-13 | GetMe → user + permissions | [ ] |
| TC-1-14 | Refresh token rotation | [ ] |
| TC-1-15 | Logout → token revoked | [ ] |
| TC-1-16 | Rate limit 5 lần sai → 429 | [ ] |
| TC-1-17 | Tạo topup request bank → 201 | [ ] |
| TC-1-18 | Admin confirm topup → 200 | [ ] |
| TC-1-19 | Balance sau topup đúng | [ ] |
| TC-1-20 | Withdraw → balance giảm | [ ] |
| TC-1-21 | Withdraw vượt số dư → 400 | [ ] |
| TC-1-22 | User thường không có topup:confirm → 403 | [ ] |
| TC-1-23 | Cập nhật profile | [ ] |
| TC-1-24 | Lịch sử giao dịch | [ ] |
| TC-1-25 | Gateway topup mock + webhook | [ ] |

### Manual Frontend Tests

| Test Case | Mô tả | Pass? |
|-----------|-------|-------|
| TC-1-26 | Trang Register | [ ] |
| TC-1-27 | Trang Login | [ ] |
| TC-1-28 | Header hiển thị số dư | [ ] |
| TC-1-29 | Wallet Dashboard | [ ] |
| TC-1-30 | Topup page (2 tabs) | [ ] |
| TC-1-31 | Withdraw page | [ ] |
| TC-1-32 | Admin Topup Requests | [ ] |
| TC-1-33 | Profile page | [ ] |

> **Sprint 1 DONE** khi toàn bộ test case trên đều Pass.
