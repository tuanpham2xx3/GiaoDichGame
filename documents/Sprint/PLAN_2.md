---
name: Sprint 2 - Marketplace Implementation Plan
overview: "Triển khai Sprint 2: Marketplace với Games Module, Listings Module, và Frontend pages. Bao gồm CRUD games, schema builder, đăng bài, lọc/phân trang, và upload ảnh."
todos:
  - id: games-backend
    content: "Tạo Games Module: DB migration, service, controller, DTOs"
    status: completed
  - id: listings-backend
    content: "Tạo Listings Module: DB migration, service, controller, DTOs"
    status: completed
  - id: upload-middleware
    content: Implement image upload middleware
    status: completed
  - id: seed-data
    content: "Seed data: sample games và listings"
    status: completed
  - id: fe-homepage
    content: "Frontend: Homepage với listing grid và filter"
    status: completed
  - id: fe-listing-detail
    content: "Frontend: Listing detail page"
    status: completed
  - id: fe-sell-form
    content: "Frontend: Sell form với dynamic schema"
    status: completed
  - id: fe-admin-games
    content: "Frontend: Admin games management"
    status: completed
  - id: e2e-testing
    content: E2E testing và bug fixes
    status: completed
isProject: false
---

# Sprint 2 – Marketplace Implementation Plan

## Mục tiêu Sprint 2

**Mục tiêu:** Seller đăng bài, Buyer xem và tìm bài.

**Definition of Done:** Seller đăng được bài, Buyer xem được danh sách + filter, Google có thể index trang.

---

## 1. Backend – Games Module (`apps/api/src/games/`)

### Tạo mới files:

- `games.module.ts` - Import DatabaseModule, Providers
- `games.service.ts` - CRUD: createGame, getGames, getGameBySlug, updateGame, deleteGame, updateSchema
- `games.controller.ts` - Endpoints theo API Outline
- `dto/game.dto.ts` - CreateGameDto, UpdateGameDto, UpdateSchemaDto

### Endpoints:


| Method | Endpoint                   | Guard         | Mô tả                  |
| ------ | -------------------------- | ------------- | ---------------------- |
| GET    | `/api/v1/games`            | Public        | Danh sách game active  |
| GET    | `/api/v1/games/:slug`      | Public        | Chi tiết game + schema |
| POST   | `/api/v1/games`            | `game:manage` | Thêm game mới          |
| PATCH  | `/api/v1/games/:id`        | `game:manage` | Sửa game               |
| DELETE | `/api/v1/games/:id`        | `game:manage` | Ẩn/xóa game            |
| PUT    | `/api/v1/games/:id/schema` | `game:manage` | Cập nhật schema        |


### DB Migration:

- Tạo bảng `games` (id, name, slug, icon_url, schema JSON, is_active, created_by, created_at)

---

## 2. Backend – Listings Module (`apps/api/src/listings/`)

### Tạo mới files:

- `listings.module.ts`
- `listings.service.ts` - CRUD + filter/sort/pagination + validate dynamic attributes
- `listings.controller.ts`
- `dto/listing.dto.ts` - CreateListingDto, UpdateListingDto, QueryListingDto

### Endpoints:


| Method | Endpoint                   | Guard            | Mô tả                                |
| ------ | -------------------------- | ---------------- | ------------------------------------ |
| GET    | `/api/v1/listings`         | Public           | Danh sách + filter + sort + paginate |
| GET    | `/api/v1/listings/:id`     | Public           | Chi tiết listing                     |
| POST   | `/api/v1/listings`         | `listing:create` | Đăng bài                             |
| PATCH  | `/api/v1/listings/:id`     | `listing:edit`   | Sửa bài                              |
| DELETE | `/api/v1/listings/:id`     | `listing:delete` | Xóa/ẩn bài                           |
| POST   | `/api/v1/listings/:id/pin` | `listing:pin`    | Mua Pin                              |


### DB Migration:

- Tạo bảng `listings` (seller_id, game_id, title, description, price, game_attributes JSON, status, is_pinned, pin_expires_at, view_count, timestamps)
- Tạo bảng `listing_images` (listing_id, url, order)

### Logic đặc biệt:

- Validate `game_attributes` theo schema của game (dynamic)
- Filter: game_id, min_price, max_price, status=PUBLISHED
- Sort: Pin → created_at DESC (ưu tiên BH cao)
- Pagination: page, limit

---

## 3. Backend – Listing Images (`apps/api/src/common/`)

### Tạo mới:

- `upload.middleware.ts` - Xử lý multipart/form-data
- Hoặc dùng `multer` trong controller

### Logic:

- Upload ảnh vào local disk (`/uploads/listings/`) hoặc S3/Cloudflare R2
- Resize ảnh (thumbnail 200x200, full 800x800)
- Trả về URL array

---

## 4. Backend – Seed Data

### Cập nhật `apps/api/src/database/seed.ts`:

- Thêm sample games (Liên Quân, Free Fire, LMHT, Valorant...)
- Thêm sample listings cho mỗi game

---

## 5. Frontend – Marketplace Pages (`apps/web/src/`)

### Tạo mới:


| Route                   | Component                     | Mô tả                        |
| ----------------------- | ----------------------------- | ---------------------------- |
| `/`                     | Trang chủ                     | Listing grid, filter sidebar |
| `/games`                | games/page.tsx                | Danh sách games              |
| `/games/[slug]`         | games/[slug]/page.tsx         | Chi tiết game + schema       |
| `/listings/[id]`        | listings/[id]/page.tsx        | Chi tiết listing             |
| `/sell`                 | sell/page.tsx                 | Form đăng bài                |
| `/my-listings`          | my-listings/page.tsx          | Quản lý bài đăng             |
| `/admin/games`          | admin/games/page.tsx          | Mod quản lý games            |
| `/admin/schema-builder` | admin/schema-builder/page.tsx | UI tạo schema                |


### Components:

- `ListingCard.tsx` - Card hiển thị listing
- `ListingFilter.tsx` - Sidebar filter (game, price, rank...)
- `GameForm.tsx` - Form động render theo schema
- `ImageUploader.tsx` - Upload ảnh drag-drop
- `Pagination.tsx` - Phân trang

---

## 6. Frontend – Auth & RBAC Updates

### Cập nhật:

- `AuthContext.tsx` - Thêm `hasPermission()` helper
- Header - Ẩn/hiện "Đăng bài" tùy permission `listing:create`
- Profile page - Hiển thị permissions

---

## Thứ tự thực hiện (14 ngày)


| Ngày | Backend                              | Frontend                    |
| ---- | ------------------------------------ | --------------------------- |
| D1   | Games: DB migration + module         | -                           |
| D2   | Games: CRUD APIs                     | -                           |
| D3   | Listings: DB migration + module      | -                           |
| D4   | Listings: CRUD APIs + filter/sort    | -                           |
| D5   | Listings: validate schema attributes | -                           |
| D6   | Image upload middleware              | -                           |
| D7   | Seed data: sample games/listings     | -                           |
| D8   | -                                    | Homepage + ListingCard      |
| D9   | -                                    | Listing filter + pagination |
| D10  | -                                    | Listing detail page         |
| D11  | -                                    | Sell form + dynamic schema  |
| D12  | -                                    | My listings + admin games   |
| D13  | E2E test + fixes                     | Polish UI                   |
| D14  | Demo + docs                          | -                           |


---

## Verification Plan

### Backend Tests:

```bash
cd apps/api && npm run test
```

**Test cases:**

- Games: CRUD operations
- Listings: create, filter, sort, pagination
- Listings: validate attributes theo schema

### Manual API Tests:

```bash
# 1. Tạo game (Mod)
curl -X POST http://localhost:3001/api/v1/games \
  -H "Authorization: Bearer <mod_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Liên Quân Mobile","slug":"lien-quan"}'

# 2. Update schema
curl -X PUT http://localhost:3001/api/v1/games/1/schema \
  -H "Authorization: Bearer <mod_token>" \
  -H "Content-Type: application/json" \
  -d '[{"field":"rank","label":"Rank","type":"select","required":true,"options":["Đồng","Bạc","Vàng"]}]'

# 3. Đăng bài (Seller)
curl -X POST http://localhost:3001/api/v1/listings \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{"game_id":1,"title":"Bán acc Liên Quân","price":500000,"game_attributes":{"rank":"Vàng"}}'

# 4. Danh sách listing
curl "http://localhost:3001/api/v1/listings?game_id=1&min_price=100000&max_price=1000000"
```

### Frontend Verification:

1. `/` - Hiển thị danh sách listing + filter
2. `/games` - Hiển thị danh sách games
3. `/listings/1` - Chi tiết listing
4. `/sell` - Form đăng bài với dynamic schema
5. `/my-listings` - Quản lý bài đăng

