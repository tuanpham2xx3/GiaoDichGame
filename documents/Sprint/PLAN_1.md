# Sprint 1 – Auth & Wallet
## Dự án: GIAODICHGAME C2C Marketplace

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-13
> Sprint 1 xây dựng nền tảng **xác thực người dùng** và **hệ thống ví Coin** (Ledger pattern).
> Thời gian: **2 tuần** (14 ngày).

---

## Tổng quan mục tiêu

Kết thúc Sprint 1, hệ thống đạt được flow hoàn chỉnh:

```
Register → Login → Nạp Coin (thủ công, Admin confirm) → Số dư hiển thị đúng
```

Đây là prerequisite bắt buộc trước Sprint 2 (Marketplace) vì mọi thao tác đều cần xác thực và Coin.

---

## Proposed Changes

---

### 1. Backend – Auth Module (`apps/api/src/auth/`)

#### [NEW] `auth.module.ts`
- Import `JwtModule.registerAsync()` (secret từ `ConfigService`, expires 15m)
- Import `PassportModule`
- Import `UsersModule` (để truy vấn user theo email)
- Providers: `AuthService`, `JwtStrategy`, `RefreshTokenStrategy`, `LocalStrategy`

#### [NEW] `auth.controller.ts`
Endpoints theo API Outline:

| Method | Endpoint | Guard | Mô tả |
|--------|----------|-------|-------|
| POST | `/api/v1/auth/register` | Public | Đăng ký |
| POST | `/api/v1/auth/login` | LocalGuard | Login → JWT |
| POST | `/api/v1/auth/refresh` | RefreshTokenGuard | Lấy access token mới |
| POST | `/api/v1/auth/logout` | JwtGuard | Vô hiệu hóa refresh token |
| GET | `/api/v1/auth/me` | JwtGuard | User info + permissions |

#### [NEW] `auth.service.ts`
- `register(dto)` – hash password (bcrypt, cost=12), tạo User, gán role `USER`, ghi `user_roles`
- `login(email, pass)` – verify password, trả `{ access_token, refresh_token }`
- `refreshToken(userId, refreshToken)` – verify + rotate refresh token
- `logout(userId)` – xóa refresh token hash khỏi DB/Redis
- `getMe(userId)` – trả user + union permissions từ tất cả roles

#### [NEW] `auth.dto.ts`
- `RegisterDto`: `email`, `password` (min 8), `username`
- `LoginDto`: `email`, `password`

#### [NEW] `strategies/jwt.strategy.ts`
- Validate `JwtPayload { sub, email }`
- Trả `{ userId, email }` vào `request.user`

#### [NEW] `strategies/refresh-token.strategy.ts`
- Đọc `Authorization: Bearer <refresh_token>`
- Verify và so sánh hash trong DB

#### [NEW] `strategies/local.strategy.ts`
- `validate(email, password)` → gọi `AuthService.validateUser()`

#### [NEW] `guards/jwt-auth.guard.ts`
- Global guard mặc định cho tất cả route có `@UseGuards(JwtAuthGuard)`

#### [NEW] `guards/permissions.guard.ts`
- `@RequirePermissions('permission:key')` decorator
- Guard pull permissions từ DB theo `userId` — **KHÔNG** đọc từ JWT payload
- Admin system role bypass tất cả permissions
- Cache permissions per userId trong Redis (TTL 60s) để tối ưu hiệu năng

#### [NEW] `decorators/require-permissions.decorator.ts`
- `@RequirePermissions(...perms: string[])` → gắn vào metadata

---

### 2. Backend – Users Module (`apps/api/src/users/`)

#### [NEW] `users.module.ts`
- Export `UsersService` để `AuthModule` import

#### [NEW] `users.service.ts`
- `create(data)` – tạo user record
- `findByEmail(email)` – tìm user (kèm password hash)
- `findById(id)` – tìm user (không kèm password hash)
- `updateProfile(id, dto)` – cập nhật `username`, `avatar_url`
- `getPermissions(userId)` – JOIN `user_roles → role_permissions → permissions`, cache Redis

#### [NEW] `users.controller.ts`

| Method | Endpoint | Guard | Mô tả |
|--------|----------|-------|-------|
| GET | `/api/v1/users/:id` | Public | Profile công khai |
| PATCH | `/api/v1/users/me` | JwtGuard + `profile:edit` permission | Cập nhật avatar, username |
| GET | `/api/v1/users/me/transactions` | JwtGuard | Lịch sử giao dịch Coin |

---

### 3. Backend – Wallet Module (`apps/api/src/wallet/`)

#### [NEW] `wallet.module.ts`
- Import `DatabaseModule`
- Providers: `WalletService`, `TopupService`, `WithdrawService`

#### [NEW] `wallet.service.ts` ⭐ (Core Ledger)
- `getBalance(userId)`:
  ```sql
  SELECT SUM(amount) FROM wallet_transactions
  WHERE user_id = ? AND status = 'SUCCESS'
  ```
- `getInsuranceBalance(userId)`:
  ```sql
  SELECT SUM(amount) FROM wallet_transactions
  WHERE user_id = ? AND status = 'SUCCESS'
  AND type IN ('INSURANCE_LOCK', 'INSURANCE_UNLOCK')
  ```
- `debit/credit(tx, trxClient)` – ghi record vào `wallet_transactions` trong transaction, dùng **Pessimistic Lock** (`SELECT ... FOR UPDATE`)

#### [NEW] `topup.service.ts`
- `createBankRequest(userId, dto)`:
  - Tạo `topup_requests` (method=`BANK_TRANSFER`, status=`PENDING`)
  - Trả về thông tin tài khoản ngân hàng + mã giao dịch (reference)
- `confirmTopup(requestId, adminId)` – perm: `topup:confirm`:
  - Kiểm tra request tồn tại + đang PENDING
  - Ghi `wallet_transactions` (type=`TOPUP`, amount=+N, status=`SUCCESS`)
  - Cập nhật `topup_requests.status` → `SUCCESS`
  - Toàn bộ trong **DB transaction**

- `initGatewayTopup(userId, dto)` – mock flow:
  - Tạo `topup_requests` (method=`MOMO`/`VNPAY`, status=`PENDING`)
  - Trả về redirect URL (mock: `https://mockcoingateway.dev?ref=<id>`)
- `handleWebhook(body)` – xác thực signature (mock), ghi Ledger

#### [NEW] `withdraw.service.ts`
- `createWithdrawRequest(userId, dto)`:
  - Kiểm tra số dư khả dụng ≥ số rút (dùng `getBalance`)
  - Ghi `wallet_transactions` (type=`WITHDRAW`, status=`PENDING`)
  - Tạo `withdraw_requests`
  - Gọi mock bank API → nếu success → update status `SUCCESS`; nếu fail → ghi thêm record `RELEASE` để hoàn Coin

#### [NEW] `insurance.service.ts`
- `deposit(userId, amount)` – ghi `INSURANCE_LOCK`
- `getBalance(userId)` – như trên
- `withdraw(userId, amount)` – kiểm tra điều kiện 30 ngày + 14 ngày không có đơn → ghi `INSURANCE_UNLOCK`

#### [NEW] `wallet.controller.ts`

| Method | Endpoint | Guard | Mô tả |
|--------|----------|-------|-------|
| GET | `/api/v1/wallet/balance` | JwtGuard | Số dư Coin |
| POST | `/api/v1/wallet/topup/bank` | JwtGuard | Tạo request nạp chuyển khoản |
| POST | `/api/v1/wallet/topup/gateway` | JwtGuard | Nạp qua cổng TT (mock) |
| POST | `/api/v1/wallet/topup/webhook` | SystemKey | Webhook callback |
| POST | `/api/v1/wallet/withdraw` | JwtGuard | Tạo request rút |
| GET | `/api/v1/wallet/insurance` | JwtGuard | Số dư quỹ BH |
| POST | `/api/v1/wallet/insurance/deposit` | JwtGuard | Nạp quỹ BH |
| POST | `/api/v1/wallet/insurance/withdraw` | JwtGuard | Rút quỹ BH |

#### [NEW] `admin-wallet.controller.ts` (protected: `topup:confirm`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/v1/admin/topup-requests` | Danh sách PENDING |
| PATCH | `/api/v1/admin/topup-requests/:id/confirm` | Xác nhận nạp |

---

### 4. Backend – Refresh Token Storage

#### [MODIFY] `apps/api/src/database/schema.ts`
Thêm bảng `refresh_tokens`:
```typescript
export const refreshTokens = pgTable('refresh_tokens', {
  id:        bigserial('id', { mode: 'number' }).primaryKey(),
  userId:    bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revokedAt: timestamp('revoked_at'),
});
```

---

### 5. Backend – Login Rate Limiting

#### [NEW] `apps/api/src/common/guards/throttle.guard.ts`
- Sử dụng `@nestjs/throttler` (default: 5 lần/phút cho `/auth/login`)
- Lưu counter trong Redis

---

### 6. Frontend – Auth Pages (`apps/web/src/`)

#### [NEW] `app/(auth)/register/page.tsx`
- Form: email, username, password (confirm password)
- Validation client-side (zod)
- Submit → POST `/api/v1/auth/register` → redirect login

#### [NEW] `app/(auth)/login/page.tsx`
- Form: email, password
- Submit → POST `/api/v1/auth/login` → lưu `access_token` (memory) + `refresh_token` (httpOnly cookie)
- Redirect → dashboard

#### [NEW] `app/(auth)/layout.tsx`
- Centered layout, no-header

#### [NEW] `lib/auth.ts` (client-side auth helpers)
- `useAuth()` hook: trả `{ user, isLoading, logout }`
- Auto-refresh token khi 401

#### [NEW] `contexts/AuthContext.tsx`
- Provider bao bọc toàn bộ app
- Store user state, permissions

---

### 7. Frontend – Layout & Navigation

#### [MODIFY] `app/layout.tsx`
- Wrap `AuthProvider`
- Import global font (Inter từ Google Fonts)

#### [NEW] `components/Header.tsx`
- Logo, Nav links (Trang chủ, Đăng bài, ...)
- Hiển thị số dư Coin nếu đã đăng nhập
- Avatar dropdown (Profile, Đăng xuất)

#### [NEW] `components/Footer.tsx`
- Links, copyright

---

### 8. Frontend – Wallet Dashboard

#### [NEW] `app/(dashboard)/wallet/page.tsx`
- Hiển thị số dư Coin (GET `/wallet/balance`)
- Bảng lịch sử giao dịch (GET `/users/me/transactions`)
  - Columns: Loại, Số Coin, Trạng thái, Thời gian
- Buttons: Nạp Coin, Rút Coin

#### [NEW] `app/(dashboard)/wallet/topup/page.tsx`
- Tab 1: Chuyển khoản ngân hàng
  - Chọn số Coin → hiển thị thông tin TK ngân hàng + mã CK
  - Hướng dẫn chụp ảnh xác nhận
- Tab 2: Cổng thanh toán (mock)
  - Chọn phương thức (MoMo/VNPay), nhập số Coin → redirect mock URL

#### [NEW] `app/(dashboard)/wallet/withdraw/page.tsx`
- Form: số Coin rút, tên ngân hàng, số TK, chủ TK
- Hiển thị số dư khả dụng

#### [NEW] `app/(dashboard)/profile/page.tsx`
- Hiển thị avatar, username, email
- Form chỉnh sửa avatar URL + username (cần perm `profile:edit`)

---

### 9. Frontend – Admin Wallet Panel

#### [NEW] `app/(admin)/topup-requests/page.tsx`
- Bảng danh sách yêu cầu nạp PENDING
- Nút "Xác nhận" → PATCH `/admin/topup-requests/:id/confirm`

---

### 10. Packages – Shared Types Update

#### [MODIFY] `packages/shared/src/types/user.ts`
```typescript
export interface JwtPayload {
  sub: number;        // userId
  email: string;
  iat?: number;
  exp?: number;
}

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  avatarUrl?: string;
  permissions: string[];  // union từ tất cả roles
}
```

#### [MODIFY] `packages/shared/src/types/wallet.ts`
```typescript
export type TransactionType =
  | 'TOPUP' | 'WITHDRAW' | 'HOLD' | 'RELEASE' | 'SETTLE'
  | 'INSURANCE_LOCK' | 'INSURANCE_UNLOCK'
  | 'VIP_PURCHASE' | 'PIN_PURCHASE';

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface WalletBalance {
  available: number;
  insurance: number;
}
```

---

## Thứ tự thực hiện (Day-by-day)

| Ngày | Việc làm |
|------|----------|
| **D1** | Cài deps BE: `@nestjs/passport`, `passport-jwt`, `passport-local`, `bcrypt`, `@nestjs/throttler` |
| **D1** | Tạo `UsersModule` + `UsersService` (create, findByEmail, findById) |
| **D2** | Tạo `AuthModule`: register, login endpoints, JWT strategy, LocalStrategy |
| **D2** | Tạo `RefreshTokenStrategy`, logout, `/auth/me` |
| **D3** | Tạo `PermissionsGuard` + cache Redis, `@RequirePermissions()` decorator |
| **D3** | DB migration: thêm bảng `refresh_tokens` |
| **D4** | Tạo `WalletService` (Ledger core: balance, debit/credit với pessimistic lock) |
| **D4** | Tạo `TopupService`: bank request, admin confirm |
| **D5** | Tạo `WithdrawService`: kiểm tra số dư, ghi Ledger, mock bank API |
| **D5** | Tạo `InsuranceService`: deposit, withdraw (kiểm tra điều kiện) |
| **D6** | API Rate Limiting cho `/auth/login` + `/wallet/withdraw` |
| **D6** | Unit tests: Ledger SUM, HOLD logic, balance calculation |
| **D7** | FE: cài Axios/TanStack Query, AuthContext, auth helpers |
| **D7** | FE: trang Register + Login |
| **D8** | FE: Header (nav + balance display) + Footer |
| **D8** | FE: trang Profile |
| **D9** | FE: Wallet Dashboard (balance + transaction history) |
| **D9** | FE: Form nạp Coin (2 tab) |
| **D10** | FE: Form rút Coin |
| **D10** | FE: Admin Panel – confirm topup requests |
| **D11-12** | E2E test thủ công, fix bugs, polish UI |
| **D13** | Buffer: review code, update docs |
| **D14** | Demo Sprint Review, cập nhật WT_1.md |

---

## Definition of Done

| Criterion | Cách kiểm tra |
|-----------|---------------|
| Register thành công | POST `/auth/register` → 201, DB có record user với role `USER` |
| Login → JWT | POST `/auth/login` → 200, nhận `access_token` + `refresh_token` |
| Refresh token | POST `/auth/refresh` với refresh token cũ → nhận token mới, token cũ vô hiệu |
| Logout | POST `/auth/logout` → refresh token bị revoke |
| Block sau 5 lần sai | Login sai 5 lần liên tiếp → 429 Too Many Requests |
| `/auth/me` trả permissions | GET `/auth/me` → `{ user: {...}, permissions: [...] }` |
| Nạp Coin thủ công | Tạo request → Admin confirm → `GET /wallet/balance` tăng đúng |
| Nạp Coin gateway (mock) | Gọi webhook endpoint → balance tăng |
| Rút Coin | Tạo request rút → balance giảm, `WITHDRAW` record trong Ledger |
| Ledger SUM đúng | Unit test: 3 TOPUP + 1 WITHDRAW → balance chính xác |
| Pessimistic lock | Race condition test: 2 request rút đồng thời → chỉ 1 thành công nếu số dư không đủ cho cả 2 |
| FE Register/Login | Trình duyệt: đăng ký, đăng nhập, redirect đúng |
| FE Balance | Sau confirm topup, reload trang → số dư hiển thị đúng |
| FE Transaction history | Bảng lịch sử hiển thị đúng type/amount/status |
| PermissionsGuard hoạt động | User không có `topup:confirm` → 403 khi gọi admin confirm API |

---

## Verification Plan

### Backend Unit Tests

```bash
cd apps/api
npm run test         # Jest unit tests
npm run test:cov     # Coverage report
```

**Các test case cần viết:**
- `wallet.service.spec.ts`:
  - `getBalance()`: 3 TOPUP -1 WITHDRAW → đúng số dư
  - Race condition với mock transaction: chỉ 1 trong 2 request đồng thời được debit nếu số dư không đủ
- `auth.service.spec.ts`:
  - `register()`: tạo user + gán role USER
  - `login()`: sai password → throw UnauthorizedException
  - `refreshToken()`: token revoked → throw UnauthorizedException

### Backend Integration / E2E Tests

```bash
cd apps/api
npm run test:e2e     # NestJS e2e (supertest)
```

**Các flow cần cover:**
- Register → Login → `/auth/me`
- Topup bank request → Admin confirm → balance tăng

### Manual API Test (dùng curl hoặc Postman)

```bash
# 1. Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","username":"testuser"}'
# Expected: 201 { "id": 1, "email": "test@example.com", ... }

# 2. Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
# Expected: 200 { "access_token": "...", "refresh_token": "..." }

# 3. Get Me (thay <token> bằng access_token ở trên)
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
# Expected: 200 { "id": 1, ..., "permissions": [...] }

# 4. Tạo topup request
curl -X POST http://localhost:3001/api/v1/wallet/topup/bank \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount_coin": 100000}'
# Expected: 201 { "id": 1, "bank_info": {...}, "reference": "GDG-000001" }

# 5. Admin confirm (cần login bằng tài khoản có quyền topup:confirm)
curl -X PATCH http://localhost:3001/api/v1/admin/topup-requests/1/confirm \
  -H "Authorization: Bearer <admin_token>"
# Expected: 200 { "status": "SUCCESS" }

# 6. Check balance
curl http://localhost:3001/api/v1/wallet/balance \
  -H "Authorization: Bearer <token>"
# Expected: 200 { "available": 100000, "insurance": 0 }

# 7. Rate limit test – login sai 5 lần
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpass"}'
done
# Expected lần 6: 429 Too Many Requests
```

### Manual Frontend Verification

1. Mở `http://localhost:3000/register` → đăng ký tài khoản mới
2. Redirect đến `/login` → đăng nhập
3. Header hiển thị username + số dư Coin (= 0)
4. Vào `/wallet/topup` → tab Chuyển khoản → tạo request
5. Đăng nhập bằng tài khoản Admin → vào `/admin/topup-requests` → Xác nhận
6. Quay lại tài khoản user → `/wallet` → số dư đã tăng, lịch sử có giao dịch TOPUP
7. Vào `/wallet/withdraw` → rút một phần → số dư giảm
8. Vào `/profile` → đổi username → lưu → hiển thị username mới

---

## Dependencies cần cài thêm

### Backend (`apps/api`)
```bash
npm install @nestjs/passport passport passport-jwt passport-local
npm install @nestjs/jwt
npm install bcrypt
npm install @nestjs/throttler
npm install --save-dev @types/passport-jwt @types/passport-local @types/bcrypt
```

### Frontend (`apps/web`)
```bash
npm install axios
npm install @tanstack/react-query
npm install zod react-hook-form @hookform/resolvers
npm install js-cookie
npm install --save-dev @types/js-cookie
```
