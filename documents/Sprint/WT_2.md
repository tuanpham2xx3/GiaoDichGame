---
name: Sprint 2 Workthrough
overview: "Hướng dẫn sử dụng các tính năng Sprint 2: Marketplace với Games, Listings, và Upload ảnh."
isProject: false
---

# Sprint 2 – Workthrough & Hướng Dẫn Sử Dụng

## Mục tiêu Sprint 2

**Mục tiêu:** Seller đăng bài, Buyer xem và tìm bài.

**Definition of Done:** Seller đăng được bài, Buyer xem được danh sách + filter, Google có thể index trang.

---

## 1. Tài khoản Test

Sau khi chạy `npm run db:seed`, hệ thống sẽ tạo các tài khoản test sau:

| Vai trò   | Email              | Password   | Quyền                                      |
| --------- | ------------------ | ---------- | ------------------------------------------ |
| Admin     | admin@giaodich.com | admin123   | Toàn quyền                                 |
| Mod       | mod@giaodich.com   | mod123     | Quản lý games, giải quyết tranh chấp      |
| Seller    | seller@giaodich.com| seller123  | Đăng bài, quản lý bài của mình             |
| Buyer     | buyer@giaodich.com | buyer123   | Xem danh sách, mua hàng                    |
| User      | user@giaodich.com  | user123    | Người dùng thông thường                    |

---

## 2. Danh sách Games (Public)

### API Endpoint

```bash
GET /api/v1/games
GET /api/v1/games/:slug
```

### Frontend

- **URL:** `/games`
- **Mô tả:** Hiển thị danh sách tất cả games đang active.
- **Tính năng:**
  - Click vào game để xem chi tiết + schema
  - Hiển thị icon game

---

## 3. Chi tiết Game + Schema (Public)

### API Endpoint

```bash
GET /api/v1/games/:slug
```

### Frontend

- **URL:** `/games/[slug]`
- **Mô tả:** Xem thông tin game và schema động.
- **Tính năng:**
  - Hiển thị tên, icon game
  - Hiển thị danh sách các trường schema (rank, skin, level...)
  - Link đến trang đăng bài cho game này

---

## 4. Danh sách Listings (Public)

### API Endpoint

```bash
GET /api/v1/listings
```

### Query Parameters

| Param      | Type    | Mô tả                    |
| ---------- | ------- | ------------------------ |
| game_id    | number  | Lọc theo game            |
| min_price  | number  | Giá tối thiểu            |
| max_price  | number  | Giá tối đa               |
| page       | number  | Số trang (default: 1)    |
| limit      | number  | Số item/trang (default: 20) |
| sort       | string  | sort by: created_at, price |
| order      | string  | asc hoặc desc            |

### Frontend

- **URL:** `/` (Trang chủ)
- **Mô tả:** Hiển thị danh sách listings với bộ lọc.
- **Tính năng:**
  - Grid hiển thị listing cards
  - Sidebar lọc theo game, khoảng giá
  - Phân trang

---

## 5. Chi tiết Listing (Public)

### API Endpoint

```bash
GET /api/v1/listings/:id
```

### Frontend

- **URL:** `/listings/[id]`
- **Mô tả:** Xem chi tiết một bài đăng.
- **Tính năng:**
  - Hiển thị title, mô tả, giá
  - Hiển thị thuộc tính động (rank, skin, level...)
  - Hiển thị hình ảnh
  - Thông tin người bán
  - Nút "Mua ngay"

---

## 6. Đăng bài (Seller)

### API Endpoint

```bash
POST /api/v1/listings
```

### Yêu cầu

- **Authentication:** Bearer Token
- **Permission:** `listing:create`

### Request Body

```json
{
  "game_id": 1,
  "title": "Bán acc Liên Quân rank Vàng",
  "description": "Acc đẹp, nhiều skin hiếm",
  "price": 500000,
  "images": ["url1.jpg", "url2.jpg"],
  "game_attributes": {
    "rank": "Vàng",
    "level": 50,
    "skin_count": 25
  }
}
```

### Frontend

- **URL:** `/sell`
- **Điều kiện:** Đăng nhập với vai trò Seller hoặc có quyền `listing:create`
- **Tính năng:**
  - Chọn game
  - Form động hiển thị các trường theo schema của game
  - Upload ảnh
  - Nhập giá, mô tả
  - Submit đăng bài

---

## 7. Quản lý bài đăng (Seller)

### API Endpoint

```bash
GET /api/v1/listings/my
PATCH /api/v1/listings/:id
DELETE /api/v1/listings/:id
```

### Frontend

- **URL:** `/my-listings`
- **Điều kiện:** Đăng nhập
- **Tính năng:**
  - Xem danh sách bài đăng của mình
  - Xem số lượt xem
  - Xóa bài đăng

---

## 8. Upload Ảnh

### API Endpoint

```bash
POST /api/v1/uploads/images
```

### Request

- **Content-Type:** `multipart/form-data`
- **Field:** `files` (multiple)

### Response

```json
{
  "urls": [
    "/uploads/listings/image1.jpg",
    "/uploads/listings/image2.jpg"
  ]
}
```

### Validation

- Định dạng: JPEG, PNG, GIF, WEBP
- Dung lượng tối đa: 5MB/file

---

## 9. Quản lý Games (Mod/Admin)

### API Endpoint

```bash
POST /api/v1/games
PATCH /api/v1/games/:id
DELETE /api/v1/games/:id
PUT /api/v1/games/:id/schema
```

### Yêu cầu

- **Permission:** `game:manage`

### Frontend

- **URL:** `/admin/games`
- **Điều kiện:** Đăng nhập với vai trò Mod hoặc Admin
- **Tính năng:**
  - Thêm game mới
  - Sửa thông tin game
  - Xóa/ẩn game
  - Link đến Schema Builder

---

## 10. Schema Builder (Mod/Admin)

### API Endpoint

```bash
PUT /api/v1/games/:id/schema
```

### Request Body

```json
[
  {
    "field": "rank",
    "label": "Rank",
    "type": "select",
    "required": true,
    "options": ["Đồng", "Bạc", "Vàng", "Kim Cương", "Cao Thủ"]
  },
  {
    "field": "level",
    "label": "Cấp độ",
    "type": "number",
    "required": false
  },
  {
    "field": "skin_count",
    "label": "Số skin",
    "type": "number",
    "required": false
  }
]
```

### Frontend

- **URL:** `/admin/schema-builder`
- **Điều kiện:** Đăng nhập với vai trò Mod hoặc Admin
- **Tính năng:**
  - Chọn game để chỉnh schema
  - Thêm/sửa/xóa trường
  - Các loại trường: text, number, select
  - Validate required

---

## 11. Testing Checklist

### Buyer Flow

- [ ] Đăng nhập với tài khoản Buyer
- [ ] Truy cập trang chủ `/`, xem danh sách listings
- [ ] Lọc theo game, khoảng giá
- [ ] Click vào listing xem chi tiết
- [ ] Truy cập `/games`, xem danh sách games

### Seller Flow

- [ ] Đăng nhập với tài khoản Seller
- [ ] Truy cập `/sell`, đăng bài mới
- [ ] Upload ảnh
- [ ] Điền thông tin theo schema
- [ ] Submit thành công
- [ ] Truy cập `/my-listings`, xem bài đã đăng
- [ ] Xóa bài đăng

### Mod/Admin Flow

- [ ] Đăng nhập với tài khoản Mod
- [ ] Truy cập `/admin/games`, thêm game mới
- [ ] Truy cập `/admin/schema-builder`, tạo schema cho game
- [ ] Sửa/xóa game

---

## 12. API Reference Summary

### Games

| Method | Endpoint              | Auth       | Permission     |
| ------ | --------------------- | ---------- | -------------- |
| GET    | `/api/v1/games`       | Public     | -              |
| GET    | `/api/v1/games/:slug` | Public     | -              |
| POST   | `/api/v1/games`       | JWT        | `game:manage`  |
| PATCH  | `/api/v1/games/:id`   | JWT        | `game:manage`  |
| DELETE | `/api/v1/games/:id`   | JWT        | `game:manage`  |
| PUT    | `/api/v1/games/:id/schema` | JWT  | `game:manage`  |

### Listings

| Method | Endpoint              | Auth       | Permission      |
| ------ | --------------------- | ---------- | --------------- |
| GET    | `/api/v1/listings`    | Public     | -               |
| GET    | `/api/v1/listings/:id`| Public     | -               |
| GET    | `/api/v1/listings/my` | JWT        | `listing:view`  |
| POST   | `/api/v1/listings`    | JWT        | `listing:create`|
| PATCH  | `/api/v1/listings/:id`| JWT       | `listing:edit`  |
| DELETE | `/api/v1/listings/:id`| JWT       | `listing:delete`|

### Upload

| Method | Endpoint              | Auth       | Permission     |
| ------ | --------------------- | ---------- | -------------- |
| POST   | `/api/v1/uploads/images` | JWT    | `listing:create`|

---

## 13. Troubleshooting

### Lỗi thường gặp

| Lỗi                          | Nguyên nhân                     | Giải pháp                          |
| ---------------------------- | ------------------------------- | ---------------------------------- |
| 401 Unauthorized             | Chưa đăng nhập hoặc token hết hạn | Đăng nhập lại, lấy token mới      |
| 403 Forbidden               | Không có quyền                  | Kiểm tra role/permission          |
| 404 Not Found               | ID không tồn tại                | Kiểm tra ID                       |
| Upload failed               | File quá lớn hoặc sai định dạng | Kiểm tra file (max 5MB, jpg/png)  |
| Validation error            | Thiếu trường required           | Kiểm tra request body             |

### Kiểm tra Database

```bash
# Kết nối database và kiểm tra
psql $DATABASE_URL

# Xem tables
\dt

# Xem games
SELECT * FROM games;

# Xem listings
SELECT l.*, g.name as game_name FROM listings l JOIN games g ON l.game_id = g.id;
```
