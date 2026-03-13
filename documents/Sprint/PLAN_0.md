# Sprint 0 – Setup & Architecture
## Dự án: GIAODICHGAME C2C Marketplace

Sprint 0 là sprint nền tảng — mọi thứ phải **healthy** và **runnable** để các sprint sau không bị block. Thời gian: **1 tuần** (7 ngày).

---

## Tổng quan mục tiêu

Kết thúc Sprint 0, bất kỳ dev nào clone repo về đều có thể:
1. Chạy `docker-compose up` → tất cả service **healthy**
2. Chạy `npm run dev` → Next.js FE + NestJS BE lên thành công
3. DB schema đã có bảng `users` + toàn bộ bảng RBAC (roles, permissions, user_roles, role_permissions) với seed data

---

## Cấu trúc thư mục đề xuất

```
GIAODICHGAME/
├── apps/
│   ├── web/          ← Next.js (App Router)
│   └── api/          ← NestJS
├── packages/
│   └── shared/       ← types, interfaces dùng chung FE+BE
├── docker/
│   ├── nginx.conf
│   └── init.sql      ← optional bootstrap
├── docker-compose.yml
├── turbo.json
├── package.json      ← root (Turborepo)
└── .github/
    └── workflows/
        └── ci.yml
```

---

## Proposed Changes

### 1. Monorepo Scaffold (Turborepo)

#### [NEW] `package.json` (root)
- Cấu hình workspaces: `["apps/*", "packages/*"]`
- Scripts: `dev`, `build`, `lint` chạy qua turbo pipeline
- DevDeps: `turbo`, `typescript`, `eslint`, `prettier`

#### [NEW] `turbo.json`
```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "lint":  {}
  }
}
```

#### [NEW] `packages/shared/`
- `src/types/user.ts` – `UserRole`, `User`, `JwtPayload`
- `src/types/wallet.ts` – `TransactionType`, `TransactionStatus`
- `src/types/listing.ts` – `ListingStatus`
- `src/types/order.ts` – `OrderStatus`
- `src/index.ts` – re-export tất cả
- `package.json` – name: `@giaodich/shared`, main: `src/index.ts`

---

### 2. Next.js Frontend (`apps/web`)

#### [NEW] `apps/web/`
- Init: `npx create-next-app@latest` với flags:
  - `--typescript`, `--eslint`, `--app`, `--no-tailwind`, `--src-dir`
- Thêm `@giaodich/shared` vào dependencies
- Configure `next.config.ts`:
  - `transpilePackages: ['@giaodich/shared']`
  - Envs: `NEXT_PUBLIC_API_URL`
- Tạo placeholder pages:
  - `app/page.tsx` → trang chủ (Coming Soon)
  - `app/layout.tsx` → layout gốc

---

### 3. NestJS Backend (`apps/api`)

#### [NEW] `apps/api/`
- Init: `npx @nestjs/cli new api --skip-git --package-manager npm`
- Cấu trúc modules ban đầu:
  ```
  src/
  ├── app.module.ts
  ├── main.ts           ← port 3001, CORS, global pipes
  ├── config/
  │   ├── database.config.ts
  │   └── redis.config.ts
  └── health/
      └── health.controller.ts  ← GET /health → { status: 'ok' }
  ```
- Dependencies cần cài:
  - `@nestjs/config` – env management
  - `drizzle-orm`, `postgres` – ORM + DB driver (postgres.js)
  - `drizzle-kit` – migration CLI
  - `ioredis`, `bullmq`, `@nestjs/bullmq` – queue
  - `@nestjs/terminus` – health checks
- DevDeps: `@types/node`

---

### 4. Docker Compose

#### [NEW] `docker-compose.yml`
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: giaodichgame
      POSTGRES_USER: app
      POSTGRES_PASSWORD: apppassword
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d giaodichgame"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes: [./docker/nginx.conf:/etc/nginx/conf.d/default.conf]
    depends_on: [web, api]

  web:
    build: ./apps/web
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
    depends_on: [api]

  api:
    build: ./apps/api
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: giaodichgame
      DB_USER: app
      DB_PASS: apppassword
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: change_me_in_production
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }

volumes:
  postgres_data:
```

#### [NEW] `docker/nginx.conf`
```nginx
upstream api  { server api:3001; }
upstream web  { server web:3000; }

server {
  listen 80;
  location /api/ { proxy_pass http://api/; }
  location /     { proxy_pass http://web;  }
}
```

---

### 5. Drizzle ORM + Database Migration

#### [NEW] `apps/api/src/database/schema.ts`

Bảng migration đầu tiên – **Sprint 0 chỉ tạo bảng nền RBAC + users**:

```typescript
import { pgTable, bigserial, varchar, boolean, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';

// users
export const users = pgTable('users', {
  id:           bigserial('id', { mode: 'number' }).primaryKey(),
  email:        varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  username:     varchar('username', { length: 100 }).notNull().unique(),
  avatarUrl:    varchar('avatar_url', { length: 500 }),
  isActive:     boolean('is_active').default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});

// roles
export const roles = pgTable('roles', {
  id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name:        varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  isSystem:    boolean('is_system').default(false),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

// permissions
export const permissions = pgTable('permissions', {
  id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
  key:         varchar('key', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

// role_permissions (composite PK)
export const rolePermissions = pgTable('role_permissions', {
  roleId:       integer('role_id').notNull().references(() => roles.id),
  permissionId: integer('permission_id').notNull().references(() => permissions.id),
}, (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permissionId] }) }));

// user_roles (composite PK)
export const userRoles = pgTable('user_roles', {
  userId:     bigserial('user_id', { mode: 'number' }).notNull().references(() => users.id),
  roleId:     integer('role_id').notNull().references(() => roles.id),
  assignedBy: bigserial('assigned_by', { mode: 'number' }).references(() => users.id),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.roleId] }) }));
```

#### [NEW] `apps/api/drizzle.config.ts`
```typescript
export default {
  schema: './src/database/schema.ts',
  out:    './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host:     process.env.DB_HOST ?? 'localhost',
    port:     Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'giaodichgame',
    user:     process.env.DB_USER ?? 'app',
    password: process.env.DB_PASS ?? 'apppassword',
  },
} satisfies Config;
```

#### [NEW] `apps/api/src/database/seed.ts`

Seed data cho RBAC:
- Roles: `USER` (is_system=true), `ADMIN` (is_system=true), `Mod`
- Permissions: `game:manage`, `dispute:resolve`, `user:manage`, `user:assign_role`, `role:manage`, `vip:manage`, `pin:manage`, `topup:confirm`, `listing:moderate`, `stats:view`, `profile:edit`
- Gán tất cả permissions cho role `Mod` (trừ `role:manage`, `user:manage`)

---

### 6. BullMQ + Redis Setup

#### [NEW] `apps/api/src/queue/queue.module.ts`
- Import `BullModule.forRoot({ connection: { host, port } })`
- Export `BullModule.registerQueue({ name: 'orders' })` – placeholder cho Sprint 3
- Queue names được định nghĩa trong `packages/shared/src/constants/queue.ts`

---

### 7. CI/CD – GitHub Actions

#### [NEW] `.github/workflows/ci.yml`
```yaml
name: CI
on:
  push:    { branches: [main, develop] }
  pull_request: { branches: [main, develop] }

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint    # turbo lint
      - run: npm run build   # turbo build
```

---

### 8. Environment Files

#### [NEW] `.env.example` (root)
```env
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=giaodichgame
DB_USER=app
DB_PASS=apppassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

`.env.example` được commit. `.env` được `.gitignore`.

---

## Thứ tự thực hiện (Day-by-day)

| Ngày | Việc làm |
|------|----------|
| **D1** | Init Turborepo root, tạo `packages/shared`, cấu hình TypeScript/ESLint/Prettier |
| **D2** | Init Next.js `apps/web`, connect shared package, placeholder page |
| **D2** | Init NestJS `apps/api`, cấu hình `@nestjs/config`, health endpoint |
| **D3** | Viết Docker Compose (PostgreSQL + Redis + Nginx), test `docker-compose up` |
| **D4** | Setup Drizzle ORM, viết schema, chạy `drizzle-kit generate` + `migrate` |
| **D4** | Viết seed script (roles + permissions), chạy seed |
| **D5** | Setup BullMQ module (placeholder), test Redis connection |
| **D6** | Viết GitHub Actions CI workflow, test trên branch feature |
| **D7** | Buffer: fix issues, document, review DoD |

---

## Definition of Done

| Criterion | Cách kiểm tra |
|-----------|--------------|
| `docker-compose up` → tất cả service healthy | `docker-compose ps` → tất cả `healthy` |
| PostgreSQL accessible | `psql -h 127.0.0.1 -U app -d giaodichgame` → login thành công |
| Redis accessible | `redis-cli ping` → `PONG` |
| NestJS API running | `GET http://localhost:3001/health` → `{ "status": "ok" }` |
| Next.js running | `GET http://localhost:3000` → trang placeholder |
| DB schema đúng | `\dt` trong psql → thấy `users`, `roles`, `permissions`, `role_permissions`, `user_roles` |
| Seed data | `SELECT name, is_system FROM roles;` → 3 rows (USER, ADMIN, Mod) |
| CI passes | GitHub Actions green trên `develop` branch |

---

## Verification Plan

### Automated / CLI Tests

```bash
# 1. Kiểm tra docker services
docker-compose up -d
docker-compose ps                    # tất cả status = healthy

# 2. Kiểm tra health endpoint
curl http://localhost:3001/health    # {"status":"ok"}

# 3. Kiểm tra DB schema
docker exec -it giaodichgame_postgres psql -U app -d giaodichgame \
  -c "\dt; SELECT name, is_system FROM roles;"

# 4. Kiểm tra Redis
docker exec -it giaodichgame_redis redis-cli ping  # PONG

# 5. Lint + Build (CI simulation)
npm run lint
npm run build

# 6. Dev mode
npm run dev
# → http://localhost:3000 (Next.js)
# → http://localhost:3001/health (NestJS)
```

### Manual Verification
1. Clone repo sạch → `cp .env.example .env` → `docker-compose up -d` → confirm tất cả green
2. Mở browser → `http://localhost` (qua Nginx) → thấy trang placeholder Next.js
3. Mở browser → `http://localhost/api/health` (qua Nginx proxy) → `{"status":"ok"}`
