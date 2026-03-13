# Sprint 0 – Walkthrough & Completion Report
## GIAODICHGAME C2C Marketplace

---

## ✅ Tất cả đã hoàn thành

### Cấu trúc thư mục đã tạo

```
GIAODICHGAME/
├── .env.example              ← copy lên .env, điền giá trị
├── .gitignore
├── .npmrc                    ← legacy-peer-deps=true
├── .prettierrc
├── eslint.config.mjs
├── package.json              ← Turborepo workspaces
├── turbo.json
├── tsconfig.base.json
├── docker-compose.yml        ← PostgreSQL + Redis + API + Web + Nginx
│
├── docker/
│   └── nginx.conf
│
├── .github/
│   └── workflows/ci.yml      ← lint + build + typecheck
│
├── apps/
│   ├── api/                  ← NestJS Backend
│   │   ├── Dockerfile
│   │   ├── nest-cli.json
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── health/
│   │       │   └── health.controller.ts  → GET /api/health
│   │       ├── database/
│   │       │   ├── database.module.ts    (Global, Drizzle provider)
│   │       │   ├── database.decorators.ts
│   │       │   ├── schema.ts             (Toàn bộ ERD → PostgreSQL)
│   │       │   └── seed.ts               (Roles + Permissions)
│   │       └── queue/
│   │           └── queue.module.ts       (BullMQ: orders, disputes, premium)
│   │
│   └── web/                  ← Next.js Frontend
│       ├── Dockerfile
│       ├── next.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/app/
│           ├── layout.tsx    (SEO metadata)
│           ├── globals.css   (Dark theme, design tokens)
│           ├── page.tsx      (Coming Soon placeholder)
│           └── page.module.css
│
└── packages/
    └── shared/               ← @giaodich/shared
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            ├── types/
            │   ├── user.ts       (JwtPayload, UserProfile)
            │   ├── wallet.ts     (TransactionType, WalletBalance)
            │   ├── listing.ts    (ListingStatus, GameSchema)
            │   └── order.ts      (OrderStatus, DisputeResolution)
            └── constants/
                └── queue.ts      (QUEUE_NAMES, JOB_NAMES, PERMISSIONS)
```

---

## Database Schema (Sprint 0 tạo toàn bộ)

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản người dùng |
| `roles` | RBAC roles (USER, ADMIN, Mod...) |
| `permissions` | Permission keys |
| `role_permissions` | Gán permission → role |
| `user_roles` | Gán role → user |
| `wallet_transactions` | Ledger (trái tim hệ thống) |
| `topup_requests` | Yêu cầu nạp tiền |
| `withdraw_requests` | Yêu cầu rút tiền |
| `games` + `listings` + `listing_images` | Marketplace |
| `orders` + `order_deliveries` | Escrow |
| `dispute_tickets` + `dispute_messages` | Tranh chấp |
| `vip_packages` + `user_vip_subscriptions` | VIP |
| `pin_config` + `listing_pins` | Pin bài |

---

## Hướng dẫn chạy Local

### Bước 1: Chuẩn bị môi trường
```bash
cp .env.example .env
# Chỉnh .env nếu cần (mặc định là localhost)
```

### Bước 2: Docker (PostgreSQL + Redis + Nginx)
```bash
docker-compose up -d postgres redis nginx
# Chờ postgres healthy (~20s)
docker-compose ps
```

### Bước 3: DB Migration + Seed
```bash
cd apps/api

# Generate migration từ schema
npm run db:generate

# Chạy migration
npm run db:migrate

# Seed roles + permissions
npm run db:seed
```

### Bước 4: Chạy Dev
```bash
# Từ root
npm run dev

# → Next.js: http://localhost:3000
# → NestJS:  http://localhost:3001/api/health
```

---

## Definition of Done – Checklist

| Criterion | Status |
|-----------|--------|
| Monorepo root (Turborepo) | ✅ |
| `packages/shared` với types + constants | ✅ |
| NestJS API với health endpoint | ✅ |
| Drizzle schema coverage toàn bộ ERD | ✅ |
| Seed script (roles + permissions) | ✅ |
| BullMQ queues (orders, disputes, premium) | ✅ |
| Next.js App Router + layout + placeholder | ✅ |
| Docker Compose (PostgreSQL + Redis + Nginx) | ✅ |
| Nginx reverse proxy | ✅ |
| GitHub Actions CI (lint + build + typecheck) | ✅ |
| `.env.example` đầy đủ | ✅ |
| npm install thành công | ✅ (654 packages) |
