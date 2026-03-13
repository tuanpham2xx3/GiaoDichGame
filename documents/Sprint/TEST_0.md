# Sprint 0 – Test Plan: Setup & Architecture
## Dự án: GIAODICHGAME C2C Marketplace

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-13
> Sprint 0 tập trung kiểm thử môi trường, cơ sở hạ tầng, và database schema.

---

## Phạm vi kiểm thử

Sprint 0 không có business logic nên toàn bộ test tập trung vào:
- Infrastructure (Docker, PostgreSQL, Redis, Nginx)
- Database schema (bảng, cột, ràng buộc, seed data)
- API health check
- CI/CD pipeline

---

## TC-0-01: Docker Compose – Tất cả service khởi động thành công

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Integration |
| **Điều kiện tiên quyết** | Docker Desktop đang chạy; `.env` đã copy từ `.env.example` |

**Bước thực hiện:**
```bash
cp .env.example .env
docker-compose up -d
docker-compose ps
```

**Kết quả mong đợi:**
- Tất cả container (`postgres`, `redis`, `nginx`) hiển thị status `healthy`
- Không có container nào ở trạng thái `Exit` hoặc `Restarting`

---

## TC-0-02: PostgreSQL – Kết nối thành công

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Integration |
| **Điều kiện tiên quyết** | TC-0-01 passed |

**Bước thực hiện:**
```bash
psql -h 127.0.0.1 -U app -d giaodichgame -c "\conninfo"
```
hoặc qua Docker:
```bash
docker exec -it giaodichgame-postgres-1 psql -U app -d giaodichgame -c "SELECT version();"
```

**Kết quả mong đợi:**
- Kết nối thành công, không có lỗi authentication
- In ra version PostgreSQL 16.x

---

## TC-0-03: Redis – Ping thành công

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | High |
| **Loại** | Integration |
| **Điều kiện tiên quyết** | TC-0-01 passed |

**Bước thực hiện:**
```bash
docker exec -it giaodichgame-redis-1 redis-cli ping
```

**Kết quả mong đợi:**
```
PONG
```

---

## TC-0-04: NestJS API – Health Endpoint

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Integration |
| **Điều kiện tiên quyết** | NestJS đang chạy (`npm run dev` hoặc `npm run start:dev` trong `apps/api`) |

**Bước thực hiện:**
```bash
curl http://localhost:3001/api/health
```

**Kết quả mong đợi:**
```json
{ "status": "ok" }
```
- HTTP status code: `200 OK`

---

## TC-0-05: Next.js Frontend – Trang chủ placeholder

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Medium |
| **Loại** | Manual |
| **Điều kiện tiên quyết** | Next.js đang chạy (`npm run dev` trong `apps/web`) |

**Bước thực hiện:**
1. Mở trình duyệt → `http://localhost:3000`

**Kết quả mong đợi:**
- Trang Coming Soon / placeholder hiển thị thành công
- Không có console error về missing modules
- HTTP status: `200 OK`

---

## TC-0-06: Nginx Reverse Proxy – Routing đúng

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | High |
| **Loại** | Integration |
| **Điều kiện tiên quyết** | TC-0-01 passed; web + api đang chạy |

**Bước thực hiện:**
```bash
# Proxy tới web (port 3000)
curl http://localhost/

# Proxy tới api (port 3001)
curl http://localhost/api/health
```

**Kết quả mong đợi:**
- `http://localhost/` → trả về HTML của Next.js
- `http://localhost/api/health` → `{ "status": "ok" }`

---

## TC-0-07: Database Migration – Schema đúng cấu trúc

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Database |
| **Điều kiện tiên quyết** | PostgreSQL healthy; migration đã chạy (`npm run db:migrate`) |

**Bước thực hiện:**
```bash
cd apps/api
npm run db:generate
npm run db:migrate

# Kiểm tra danh sách bảng
docker exec -it giaodichgame-postgres-1 psql -U app -d giaodichgame -c "\dt"
```

**Kết quả mong đợi – Các bảng phải tồn tại:**

| Bảng | Bắt buộc |
|------|---------|
| `users` | ✅ |
| `roles` | ✅ |
| `permissions` | ✅ |
| `role_permissions` | ✅ |
| `user_roles` | ✅ |
| `wallet_transactions` | ✅ |
| `topup_requests` | ✅ |
| `withdraw_requests` | ✅ |
| `games` | ✅ |
| `listings` | ✅ |
| `orders` | ✅ |

---

## TC-0-08: Database Migration – Cấu trúc bảng `users`

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Database |
| **Điều kiện tiên quyết** | TC-0-07 passed |

**Bước thực hiện:**
```bash
docker exec -it giaodichgame-postgres-1 psql -U app -d giaodichgame \
  -c "\d users"
```

**Kết quả mong đợi – Các cột phải tồn tại:**

| Cột | Type | Ràng buộc |
|-----|------|-----------|
| `id` | bigserial | PRIMARY KEY |
| `email` | varchar(255) | NOT NULL, UNIQUE |
| `password_hash` | varchar(255) | NOT NULL |
| `username` | varchar(100) | NOT NULL, UNIQUE |
| `avatar_url` | varchar(500) | nullable |
| `is_active` | boolean | DEFAULT true |
| `created_at` | timestamp | NOT NULL, DEFAULT now() |
| `updated_at` | timestamp | NOT NULL, DEFAULT now() |

---

## TC-0-09: Database Seed – Roles & Permissions

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Critical |
| **Loại** | Database |
| **Điều kiện tiên quyết** | TC-0-07 passed; seed đã chạy (`npm run db:seed`) |

**Bước thực hiện:**
```bash
cd apps/api
npm run db:seed

# Kiểm tra roles
docker exec -it giaodichgame-postgres-1 psql -U app -d giaodichgame \
  -c "SELECT id, name, is_system FROM roles ORDER BY id;"

# Kiểm tra permissions
docker exec -it giaodichgame-postgres-1 psql -U app -d giaodichgame \
  -c "SELECT key FROM permissions ORDER BY key;"

# Kiểm tra role_permissions (ADMIN phải có tất cả)
docker exec -it giaodichgame-postgres-1 psql -U app -d giaodichgame \
  -c "SELECT r.name, COUNT(rp.permission_id) as perm_count
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      GROUP BY r.name;"
```

**Kết quả mong đợi:**

Roles (3 records):
| id | name | is_system |
|----|------|-----------|
| 1 | USER | true |
| 2 | ADMIN | true |
| 3 | Mod | false |

Permissions (tối thiểu 11 keys):
`game:manage`, `dispute:resolve`, `user:manage`, `user:assign_role`, `role:manage`, `vip:manage`, `pin:manage`, `topup:confirm`, `listing:moderate`, `stats:view`, `profile:edit`

---

## TC-0-10: BullMQ – Kết nối Redis Queue thành công

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | High |
| **Loại** | Integration |
| **Điều kiện tiên quyết** | Redis healthy; NestJS đang khởi động |

**Bước thực hiện:**
- Khởi động NestJS (`npm run start:dev` trong `apps/api`)
- Quan sát log: không có lỗi `Error connecting to Redis` hoặc `ECONNREFUSED`

**Kết quả mong đợi:**
- Log NestJS cho thấy `BullMQ connected` hoặc không có lỗi Redis
- Queue `orders`, `disputes`, `premium` được đăng ký thành công

---

## TC-0-11: Shared Package – Import đúng

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Medium |
| **Loại** | Unit / Build |
| **Điều kiện tiên quyết** | `npm install` đã chạy thành công ở root |

**Bước thực hiện:**
```bash
# Build shared package
cd packages/shared && npm run build 2>/dev/null || tsc --noEmit

# Build toàn bộ
cd ../.. && npm run build
```

**Kết quả mong đợi:**
- Không có TypeScript compile error
- `@giaodich/shared` được resolve đúng trong cả `apps/api` và `apps/web`

---

## TC-0-12: CI/CD – GitHub Actions pipeline pass

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | High |
| **Loại** | CI |
| **Điều kiện tiên quyết** | Code đã push lên branch `develop` hoặc `main` |

**Bước thực hiện:**
1. Push một commit lên branch `develop`
2. Vào GitHub → Actions tab → kiểm tra workflow `CI`

**Kết quả mong đợi:**
- Job `lint-and-build` pass (màu xanh)
- Các bước: `npm ci` → `npm run lint` → `npm run build` đều thành công

---

## TC-0-13: Environment Variables – `.env.example` đầy đủ

| Trường | Giá trị |
|--------|---------|
| **Mức độ** | Medium |
| **Loại** | Manual |
| **Điều kiện tiên quyết** | File `.env.example` tồn tại ở root |

**Bước thực hiện:**
- Mở file `.env.example` và xác nhận các biến sau tồn tại:

**Kết quả mong đợi:**

| Biến | Bắt buộc |
|------|---------|
| `DB_HOST` | ✅ |
| `DB_PORT` | ✅ |
| `DB_NAME` | ✅ |
| `DB_USER` | ✅ |
| `DB_PASS` | ✅ |
| `REDIS_HOST` | ✅ |
| `REDIS_PORT` | ✅ |
| `JWT_SECRET` | ✅ |
| `JWT_EXPIRES_IN` | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | ✅ |
| `NEXT_PUBLIC_API_URL` | ✅ |

---

## Tổng kết – Definition of Done

| Test Case | Mô tả | Pass? |
|-----------|-------|-------|
| TC-0-01 | Docker Compose – tất cả service healthy | [ ] |
| TC-0-02 | PostgreSQL kết nối thành công | [ ] |
| TC-0-03 | Redis PING → PONG | [ ] |
| TC-0-04 | NestJS health endpoint → `{ "status": "ok" }` | [ ] |
| TC-0-05 | Next.js trang chủ placeholder hiển thị | [ ] |
| TC-0-06 | Nginx proxy routing đúng | [ ] |
| TC-0-07 | DB migration – tất cả bảng tồn tại | [ ] |
| TC-0-08 | Bảng `users` – cấu trúc đúng | [ ] |
| TC-0-09 | Seed data – Roles + Permissions đúng | [ ] |
| TC-0-10 | BullMQ kết nối Redis thành công | [ ] |
| TC-0-11 | Shared package import đúng, build pass | [ ] |
| TC-0-12 | GitHub Actions CI pass | [ ] |
| TC-0-13 | `.env.example` có đủ biến môi trường | [ ] |

> **Sprint 0 DONE** khi tất cả test case trên đều Pass.
