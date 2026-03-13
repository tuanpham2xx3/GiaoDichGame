# Sprint 1 – Auth & Wallet: Implementation Walkthrough

## ✅ Backend (NestJS) – Build Passing

### Auth Module
| File | Mô tả |
|---|---|
| [auth/strategies/jwt.strategy.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/auth/strategies/jwt.strategy.ts) | Validate JWT access token, extract `userId` / `email` |
| [auth/strategies/refresh-token.strategy.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/auth/strategies/refresh-token.strategy.ts) | Validate refresh token, extract raw token string |
| [auth/strategies/local.strategy.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/auth/strategies/local.strategy.ts) | Validate email + password với bcrypt |
| [auth/auth.service.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/auth/auth.service.ts) | register, login, refreshTokens (rotation), logout, getMe |
| [auth/auth.controller.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/auth/auth.controller.ts) | POST /v1/auth/register, login (throttle 5/min), refresh, logout; GET /v1/auth/me |
| [auth/auth.module.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/auth/auth.module.ts) | Wire PassportModule, JwtModule, strategies |

### Users Module
| File | Mô tả |
|---|---|
| [users/users.service.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/users/users.service.ts) | create, findByEmail, findById, updateProfile, getPermissions (RBAC), getTransactionHistory, assignDefaultRole |
| [users/users.controller.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/users/users.controller.ts) | GET /v1/users/:id (public), PATCH /v1/users/me, GET /v1/users/me/transactions |
| [users/users.module.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/users/users.module.ts) | Export UsersService cho AuthModule dùng |

### Wallet Module
| File | Mô tả |
|---|---|
| [wallet/wallet.service.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/wallet/wallet.service.ts) | Ledger core: [getBalance()](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/wallet/wallet.controller.ts#36-41) = SUM(amount WHERE status=SUCCESS), [credit()](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/wallet/wallet.service.ts#40-66), [debit()](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/wallet/wallet.service.ts#67-99) với balance check |
| [wallet/topup.service.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/wallet/topup.service.ts) | createBankRequest, confirmTopup (Admin), initGatewayTopup (mock), handleWebhook, getPendingRequests |
| [wallet/withdraw.service.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/wallet/withdraw.service.ts) | createWithdrawRequest: debit + mock bank API + refund on failure |
| [wallet/insurance.service.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/wallet/insurance.service.ts) | deposit/withdraw với điều kiện 30 ngày + 14 ngày |
| [wallet/wallet.controller.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/wallet/wallet.controller.ts) | GET balance, POST topup/bank, topup/gateway, topup/webhook, withdraw, insurance/* |
| [wallet/admin-wallet.controller.ts](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/wallet/admin-wallet.controller.ts) | GET /v1/admin/topup-requests, PATCH confirm (cần quyền `topup:confirm`) |

### Common
- [JwtAuthGuard](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/common/guards/jwt-auth.guard.ts#6-21) – Bypass với `@Public()`, xử lý `override canActivate()`
- [PermissionsGuard](file:///c:/PROJECT/GIAODICHGAME/apps/api/src/common/guards/permissions.guard.ts#18-81) – Dynamic RBAC: ADMIN bypass, user perms từ DB
- Decorators: `@CurrentUser()`, `@Public()`, `@RequirePermissions()`

### Config Changes
- [.env](file:///c:/PROJECT/GIAODICHGAME/.env) thêm `JWT_REFRESH_SECRET`, `BANK_NAME/ACCOUNT/HOLDER`
- [tsconfig.json](file:///c:/PROJECT/GIAODICHGAME/apps/api/tsconfig.json): thêm `esModuleInterop: true`, include shared package
- DB migration [0001_red_martin_li.sql](file:///c:/PROJECT/GIAODICHGAME/apps/api/drizzle/0001_red_martin_li.sql) đã migrate → bảng `refresh_tokens` active

---

## ✅ Frontend (Next.js 14 + Tailwind CSS v3) – Build Passing

### Setup
- Tailwind CSS v3 + `@tailwindcss/forms` + PostCSS
- [tailwind.config.ts](file:///c:/PROJECT/GIAODICHGAME/apps/web/tailwind.config.ts) với dark theme custom colors
- [next.config.ts](file:///c:/PROJECT/GIAODICHGAME/apps/web/next.config.ts) → [next.config.js](file:///c:/PROJECT/GIAODICHGAME/apps/web/next.config.js) (Next 14 requirement)

### Pages & Components
| Route | Component | Mô tả |
|---|---|---|
| `/` | [page.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/app/page.tsx) | Homepage: hero gradient, features grid, stats bar, CTA |
| `/login` | [login/page.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/app/login/page.tsx) | Đăng nhập + Suspense cho useSearchParams |
| `/register` | [register/page.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/app/register/page.tsx) | Đăng ký 3-field form |
| `/wallet` | [wallet/page.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/app/wallet/page.tsx) | Dashboard: balance cards + transaction history table |
| `/wallet/topup` | [wallet/topup/page.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/app/wallet/topup/page.tsx) | Nạp Coin: tabs bank/gateway |
| `/wallet/withdraw` | [wallet/withdraw/page.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/app/wallet/withdraw/page.tsx) | Rút Coin về ngân hàng |
| `/profile` | [profile/page.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/app/profile/page.tsx) | Sửa username + avatarUrl |
| `/admin/topup-requests` | [admin/topup-requests/page.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/app/admin/topup-requests/page.tsx) | Admin duyệt nạp thủ công |

### Infrastructure
- [lib/api.ts](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/lib/api.ts) – Axios với JWT interceptor + auto-refresh on 401
- [contexts/AuthContext.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/contexts/AuthContext.tsx) – user state, login/logout, hasPermission
- [components/Header.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/components/Header.tsx) – Fixed glassmorphism header, balance badge, dropdown
- [components/Footer.tsx](file:///c:/PROJECT/GIAODICHGAME/apps/web/src/components/Footer.tsx) – 3-col footer grid

---

## ▶️ Để chạy local

```bash
# Terminal 1 – Backend
cd apps/api && npm run start:dev

# Terminal 2 – Frontend  
cd apps/web && npm run dev
```

> Đảm bảo PostgreSQL + Redis đang chạy (Docker: `docker compose up -d`)

---

## 🔐 Test nhanh API

```bash
# 1. Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","username":"GamerTest"}'

# 2. Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Wallet balance (cần Bearer token từ login)
curl http://localhost:3001/api/v1/wallet/balance \
  -H "Authorization: Bearer <accessToken>"
```
