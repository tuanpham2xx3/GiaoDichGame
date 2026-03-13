# Sprint 2 Test Cases

## Mục tiêu Sprint 2
**Mục tiêu:** Seller đăng bài, Buyer xem và tìm bài.
**Definition of Done:** Seller đăng được bài, Buyer xem được danh sách + filter, Google có thể index trang.

---

## 1. Tài khoản Test

| Vai trò | Email | Password | Quyền |
|---------|-------|----------|-------|
| Admin | admin@giaodich.com | admin123 | Toàn quyền |
| Mod | mod@giaodich.com | mod123 | Quản lý games |
| Seller | seller@giaodich.com | seller123 | Đăng bài |
| Buyer | buyer@giaodich.com | buyer123 | Xem danh sách |
| User | user@giaodich.com | user123 | Người dùng thông thường |

---

## 2. Test Cases - Backend API

### 2.1 Games Module

#### TC-GAME-001: Lấy danh sách games (Public)
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/games` |
| **Auth** | Không yêu cầu |
| **Expected** | Trả về danh sách games đang active (is_active = true) |
| **Status Code** | 200 |
| **Response** | Array chứa id, name, slug, icon_url |

#### TC-GAME-002: Lấy chi tiết game theo slug (Public)
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/games/:slug` |
| **Auth** | Không yêu cầu |
| **Expected** | Trả về chi tiết game bao gồm schema |
| **Status Code** | 200 |
| **Response** | Object chứa id, name, slug, icon_url, schema |

#### TC-GAME-003: Tạo game mới (Mod/Admin)
| Mục | Chi tiết |
|-----|----------|
| **API** | `POST /api/v1/games` |
| **Auth** | Bearer Token |
| **Permission** | `game:manage` |
| **Request Body** | `{"name": "Game Test", "slug": "game-test", "icon_url": "https://..."}` |
| **Expected** | Tạo game thành công |
| **Status Code** | 201 |

#### TC-GAME-004: Tạo game không có quyền
| Mục | Chi tiết |
|-----|----------|
| **API** | `POST /api/v1/games` |
| **Auth** | Bearer Token (Buyer) |
| **Permission** | `game:manage` |
| **Expected** | Từ chối truy cập |
| **Status Code** | 403 |

#### TC-GAME-005: Cập nhật game (Mod/Admin)
| Mục | Chi tiết |
|-----|----------|
| **API** | `PATCH /api/v1/games/:id` |
| **Auth** | Bearer Token |
| **Permission** | `game:manage` |
| **Request Body** | `{"name": "Game Updated"}` |
| **Expected** | Cập nhật thành công |
| **Status Code** | 200 |

#### TC-GAME-006: Xóa game (Mod/Admin)
| Mục | Chi tiết |
|-----|----------|
| **API** | `DELETE /api/v1/games/:id` |
| **Auth** | Bearer Token |
| **Permission** | `game:manage` |
| **Expected** | Ẩn game (is_active = false) |
| **Status Code** | 200 |

#### TC-GAME-007: Cập nhật schema (Mod/Admin)
| Mục | Chi tiết |
|-----|----------|
| **API** | `PUT /api/v1/games/:id/schema` |
| **Auth** | Bearer Token |
| **Permission** | `game:manage` |
| **Request Body** | `[{"field":"rank","label":"Rank","type":"select","required":true,"options":["Đồng","Bạc","Vàng"]}]` |
| **Expected** | Cập nhật schema thành công |
| **Status Code** | 200 |

#### TC-GAME-008: Lấy game không tồn tại
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/games/non-existent` |
| **Expected** | Trả về lỗi |
| **Status Code** | 404 |

---

### 2.2 Listings Module

#### TC-LIST-001: Lấy danh sách listings (Public)
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/listings` |
| **Auth** | Không yêu cầu |
| **Expected** | Trả về danh sách listings đã publish, phân trang |
| **Status Code** | 200 |
| **Response** | Array chứa id, title, price, game_id, seller_id |

#### TC-LIST-002: Lọc listings theo game_id
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/listings?game_id=1` |
| **Expected** | Chỉ trả về listings của game_id = 1 |
| **Status Code** | 200 |

#### TC-LIST-003: Lọc listings theo khoảng giá
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/listings?min_price=100000&max_price=500000` |
| **Expected** | Chỉ trả về listings có price trong khoảng |
| **Status Code** | 200 |

#### TC-LIST-004: Phân trang listings
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/listings?page=1&limit=10` |
| **Expected** | Trả về 10 items, có metadata phân trang |
| **Status Code** | 200 |
| **Response** | Bao gồm page, limit, total, totalPages |

#### TC-LIST-005: Sort listings
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/listings?sort=created_at&order=desc` |
| **Expected** | Sắp xếp theo created_at giảm dần |
| **Status Code** | 200 |

#### TC-LIST-006: Lấy chi tiết listing (Public)
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/listings/:id` |
| **Auth** | Không yêu cầu |
| **Expected** | Trả về chi tiết listing bao gồm game_attributes |
| **Status Code** | 200 |

#### TC-LIST-007: Tạo listing mới (Seller)
| Mục | Chi tiết |
|-----|----------|
| **API** | `POST /api/v1/listings` |
| **Auth** | Bearer Token |
| **Permission** | `listing:create` |
| **Request Body** | `{"game_id":1,"title":"Bán acc","price":500000,"game_attributes":{"rank":"Vàng"}}` |
| **Expected** | Tạo listing thành công |
| **Status Code** | 201 |

#### TC-LIST-008: Tạo listing không đủ thuộc tính schema
| Mục | Chi tiết |
|-----|----------|
| **API** | `POST /api/v1/listings` |
| **Auth** | Bearer Token |
| **Permission** | `listing:create` |
| **Request Body** | `{"game_id":1,"title":"Bán acc","price":500000}` (thiếu rank - required) |
| **Expected** | Validation error |
| **Status Code** | 400 |

#### TC-LIST-009: Tạo listing không có quyền
| Mục | Chi tiết |
|-----|----------|
| **API** | `POST /api/v1/listings` |
| **Auth** | Bearer Token (Buyer không có quyền) |
| **Expected** | Từ chối truy cập |
| **Status Code** | 403 |

#### TC-LIST-010: Cập nhật listing (Seller chủ bài)
| Mục | Chi tiết |
|-----|----------|
| **API** | `PATCH /api/v1/listings/:id` |
| **Auth** | Bearer Token |
| **Permission** | `listing:edit` |
| **Request Body** | `{"price": 600000}` |
| **Expected** | Cập nhật thành công |
| **Status Code** | 200 |

#### TC-LIST-011: Cập nhật listing của người khác
| Mục | Chi tiết |
|-----|----------|
| **API** | `PATCH /api/v1/listings/:id` |
| **Auth** | Bearer Token (Seller khác) |
| **Permission** | `listing:edit` |
| **Expected** | Từ chối truy cập |
| **Status Code** | 403 |

#### TC-LIST-012: Xóa listing (Seller chủ bài)
| Mục | Chi tiết |
|-----|----------|
| **API** | `DELETE /api/v1/listings/:id` |
| **Auth** | Bearer Token |
| **Permission** | `listing:delete` |
| **Expected** | Xóa thành công |
| **Status Code** | 200 |

#### TC-LIST-013: Lấy danh sách listing của mình
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/listings/my` |
| **Auth** | Bearer Token |
| **Permission** | `listing:view` |
| **Expected** | Trả về danh sách listings của user đăng nhập |
| **Status Code** | 200 |

#### TC-LIST-014: Listing không tồn tại
| Mục | Chi tiết |
|-----|----------|
| **API** | `GET /api/v1/listings/99999` |
| **Expected** | Trả về lỗi |
| **Status Code** | 404 |

---

### 2.3 Upload Module

#### TC-UPLOAD-001: Upload ảnh thành công
| Mục | Chi tiết |
|-----|----------|
| **API** | `POST /api/v1/uploads/images` |
| **Auth** | Bearer Token |
| **Permission** | `listing:create` |
| **Content-Type** | multipart/form-data |
| **Field** | files (multiple) |
| **Expected** | Upload thành công, trả về array URL |
| **Status Code** | 200 |
| **Response** | `{"urls": ["/uploads/listings/xxx.jpg"]}` |

#### TC-UPLOAD-002: Upload ảnh sai định dạng
| Mục | Chi tiết |
|-----|----------|
| **API** | `POST /api/v1/uploads/images` |
| **Auth** | Bearer Token |
| **File** | .exe hoặc .svg |
| **Expected** | Validation error |
| **Status Code** | 400 |

#### TC-UPLOAD-003: Upload ảnh quá lớn
| Mục | Chi tiết |
|-----|----------|
| **API** | `POST /api/v1/uploads/images` |
| **Auth** | Bearer Token |
| **File** | > 5MB |
| **Expected** | File too large error |
| **Status Code** | 413 |

#### TC-UPLOAD-004: Upload không có quyền
| Mục | Chi tiết |
|-----|----------|
| **API** | `POST /api/v1/uploads/images` |
| **Auth** | Bearer Token (Buyer) |
| **Expected** | Từ chối truy cập |
| **Status Code** | 403 |

---

## 3. Test Cases - Frontend

### 3.1 Trang chủ (Homepage)

#### TC-FE-001: Hiển thị danh sách listings
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/` |
| **Expected** | Hiển thị grid các listing cards |
| **Verify** | Có ít nhất 1 listing hiển thị |

#### TC-FE-002: Hiển thị filter sidebar
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/` |
| **Expected** | Có sidebar filter bên trái/phải |
| **Verify** | Có filter theo game, khoảng giá |

#### TC-FE-003: Filter listings trên frontend
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/` |
| **Action** | Chọn game từ filter |
| **Expected** | Danh sách listings được lọc theo game |

#### TC-FE-004: Phân trang
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/` |
| **Action** | Click trang tiếp theo |
| **Expected** | Chuyển sang trang mới, hiển thị đúng items |

---

### 3.2 Trang Games

#### TC-FE-005: Hiển thị danh sách games
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/games` |
| **Expected** | Hiển thị danh sách tất cả games active |
| **Verify** | Có icon và tên game |

#### TC-FE-006: Click vào game xem chi tiết
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/games` |
| **Action** | Click vào một game |
| **Expected** | Chuyển đến `/games/[slug]` |

#### TC-FE-007: Chi tiết game + schema
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/games/[slug]` |
| **Expected** | Hiển thị thông tin game và schema |
| **Verify** | Hiển thị các trường: rank, level, skin... |

---

### 3.3 Trang Chi tiết Listing

#### TC-FE-008: Hiển thị chi tiết listing
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/listings/[id]` |
| **Expected** | Hiển thị title, description, price, game_attributes |
| **Verify** | Hiển thị hình ảnh (nếu có) |

#### TC-FE-009: Hiển thị thông tin người bán
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/listings/[id]` |
| **Expected** | Hiển thị tên/email người bán |
| **Verify** | Có nút "Mua ngay" |

#### TC-FE-010: Listing không tồn tại
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/listings/99999` |
| **Expected** | Hiển thị trang lỗi hoặc redirect |
| **Verify** | Không crash |

---

### 3.4 Trang Đăng bài (Sell)

#### TC-FE-011: Chuyển hướng khi chưa đăng nhập
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/sell` |
| **Auth** | Chưa đăng nhập |
| **Expected** | Redirect đến trang đăng nhập |

#### TC-FE-012: Chuyển hướng khi không có quyền
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/sell` |
| **Auth** | Buyer (không có quyền listing:create) |
| **Expected** | Hiển thị thông báo không có quyền |

#### TC-FE-013: Hiển thị form đăng bài
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/sell` |
| **Auth** | Seller |
| **Expected** | Hiển thị form với các trường |

#### TC-FE-014: Chọn game hiển thị schema động
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/sell` |
| **Action** | Chọn game từ dropdown |
| **Expected** | Hiển thị các trường theo schema của game |

#### TC-FE-015: Validate required fields
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/sell` |
| **Action** | Submit form để trống các trường required |
| **Expected** | Hiển thị thông báo lỗi validation |

#### TC-FE-016: Upload ảnh
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/sell` |
| **Action** | Upload ảnh |
| **Expected** | Hiển thị preview ảnh đã upload |

#### TC-FE-017: Submit form thành công
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/sell` |
| **Action** | Điền đầy đủ thông tin và submit |
| **Expected** | Thành công, redirect đến listing hoặc my-listings |

---

### 3.5 Trang Quản lý bài đăng (My Listings)

#### TC-FE-018: Chuyển hướng khi chưa đăng nhập
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/my-listings` |
| **Auth** | Chưa đăng nhập |
| **Expected** | Redirect đến trang đăng nhập |

#### TC-FE-019: Hiển thị danh sách bài đăng của mình
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/my-listings` |
| **Auth** | Seller |
| **Expected** | Hiển thị danh sách listings do mình đăng |

#### TC-FE-020: Xóa bài đăng
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/my-listings` |
| **Action** | Click nút xóa |
| **Expected** | Xóa listing, cập nhật danh sách |

---

### 3.6 Trang Admin Games

#### TC-FE-021: Chuyển hướng khi không có quyền
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/admin/games` |
| **Auth** | Seller/Buyer |
| **Expected** | Hiển thị thông báo không có quyền |

#### TC-FE-022: Hiển thị danh sách games (Admin)
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/admin/games` |
| **Auth** | Mod/Admin |
| **Expected** | Hiển thị danh sách tất cả games (bao gồm inactive) |

#### TC-FE-023: Thêm game mới
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/admin/games` |
| **Action** | Click nút thêm mới, điền thông tin |
| **Expected** | Tạo game thành công |

#### TC-FE-024: Sửa game
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/admin/games` |
| **Action** | Click nút sửa, thay đổi thông tin |
| **Expected** | Cập nhật game thành công |

#### TC-FE-025: Xóa/ẩn game
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/admin/games` |
| **Action** | Click nút xóa |
| **Expected** | Ẩn game, không hiển thị ở trang public |

---

### 3.7 Trang Schema Builder

#### TC-FE-026: Truy cập schema builder
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/admin/schema-builder` |
| **Auth** | Mod/Admin |
| **Expected** | Hiển thị trang schema builder |

#### TC-FE-027: Tạo schema cho game
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/admin/schema-builder` |
| **Action** | Chọn game, thêm trường, save |
| **Expected** | Schema được lưu, hiển thị khi đăng bài |

#### TC-FE-028: Các loại trường schema
| Mục | Chi tiết |
|-----|----------|
| **URL** | `/admin/schema-builder` |
| **Action** | Thử các loại trường: text, number, select |
| **Expected** | Render đúng input tương ứng |

---

## 4. Test Cases - User Flows

### 4.1 Buyer Flow

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| BUYER-01 | Đăng nhập với tài khoản Buyer | Đăng nhập thành công |
| BUYER-02 | Truy cập trang chủ `/` | Xem danh sách listings |
| BUYER-03 | Lọc theo game | Chỉ hiển thị listings của game đó |
| BUYER-04 | Lọc theo khoảng giá | Chỉ hiển thị listings trong khoảng giá |
| BUYER-05 | Click vào listing xem chi tiết | Hiển thị chi tiết đầy đủ |
| BUYER-06 | Truy cập `/games` | Xem danh sách games |
| BUYER-07 | Click game xem chi tiết | Hiển thị thông tin game + schema |
| BUYER-08 | Truy cập `/sell` (không có quyền) | Hiển thị thông báo không có quyền |

### 4.2 Seller Flow

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| SELLER-01 | Đăng nhập với tài khoản Seller | Đăng nhập thành công |
| SELLER-02 | Truy cập `/sell` | Hiển thị form đăng bài |
| SELLER-03 | Đăng bài không chọn game | Hiển thị lỗi validation |
| SELLER-04 | Đăng bài thiếu trường required | Hiển thị lỗi validation |
| SELLER-05 | Upload ảnh | Upload thành công, hiển thị preview |
| SELLER-06 | Submit form đăng bài | Tạo listing thành công |
| SELLER-07 | Truy cập `/my-listings` | Xem danh sách bài đã đăng |
| SELLER-08 | Xem số lượt xem | Hiển thị view_count |
| SELLER-09 | Xóa bài đăng | Xóa thành công |
| SELLER-10 | Đăng bài cho game có schema | Hiển thị form theo schema |

### 4.3 Mod/Admin Flow

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| MOD-01 | Đăng nhập với tài khoản Mod | Đăng nhập thành công |
| MOD-02 | Truy cập `/admin/games` | Hiển thị trang quản lý games |
| MOD-03 | Thêm game mới | Tạo game thành công |
| MOD-04 | Sửa thông tin game | Cập nhật thành công |
| MOD-05 | Xóa/ẩn game | Game ẩn khỏi trang public |
| MOD-06 | Truy cập `/admin/schema-builder` | Hiển thị schema builder |
| MOD-07 | Tạo schema cho game | Schema được lưu |
| MOD-08 | Tạo schema với nhiều trường | Tất cả trường được lưu |
| MOD-09 | Xem danh sách listings (admin) | Xem tất cả listings |
| MOD-10 | Xóa bài vi phạm | Xóa thành công |

---

## 5. Test Cases - Validation & Error Handling

### 5.1 Authentication

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| AUTH-01 | Gọi API có token hết hạn | 401 Unauthorized |
| AUTH-02 | Gọi API không có token | 401 Unauthorized |
| AUTH-03 | Token không hợp lệ | 401 Unauthorized |

### 5.2 Authorization

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| PERM-01 | Seller gọi API tạo game | 403 Forbidden |
| PERM-02 | Buyer gọi API đăng bài | 403 Forbidden |
| PERM-03 | Seller sửa listing người khác | 403 Forbidden |

### 5.3 Validation

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| VAL-01 | Tạo listing với price âm | 400 Bad Request |
| VAL-02 | Tạo listing với price = 0 | 400 Bad Request |
| VAL-03 | Tạo listing với title rỗng | 400 Bad Request |
| VAL-04 | Tạo listing với game_id không tồn tại | 400 Bad Request |
| VAL-05 | Upload file không đúng định dạng | 400 Bad Request |

### 5.4 Error Pages

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| ERR-01 | Truy cập URL không tồn tại | Hiển thị 404 page |
| ERR-02 | API trả về 500 | Hiển thị error message (không crash) |

---

## 6. Test Cases - Performance & SEO

### 6.1 Performance

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| PERF-01 | Load trang chủ với 100 listings | Thời gian < 3s |
| PERF-02 | Filter listings | Phản hồi < 1s |
| PERF-03 | Phân trang | Chuyển trang < 1s |

### 6.2 SEO

| TC ID | Mô tả | Expected |
|-------|-------|----------|
| SEO-01 | Trang chi tiết listing có title/description | Meta tags đúng |
| SEO-02 | Trang game có title/description | Meta tags đúng |
| SEO-03 | Hình ảnh có alt text | Thuộc tính alt |

---

## 7. Test Cases - Responsive Design

| TC ID | Device | Expected |
|-------|--------|----------|
| RESP-01 | Mobile (375px) | Hiển thị đúng, không horizontal scroll |
| RESP-02 | Tablet (768px) | Hiển thị đúng |
| RESP-03 | Desktop (1440px) | Hiển thị đúng |

---

## 8. Test Environment Setup

### 8.1 Prerequisites
- [ ] Database đã được seed với test data
- [ ] API server đang chạy (port 3001)
- [ ] Web server đang chạy (port 3000)
- [ ] Các tài khoản test đã được tạo

### 8.2 Test Data cần có
- [ ] Ít nhất 3 games active
- [ ] Mỗi game có schema riêng
- [ ] Ít nhất 10 listings đã publish
- [ ] Listings với various prices, games

---

## 9. Priority Test Cases

### High Priority (Must Test)
1. TC-GAME-001: Lấy danh sách games
2. TC-LIST-001: Lấy danh sách listings
3. TC-LIST-007: Tạo listing mới
4. TC-UPLOAD-001: Upload ảnh
5. TC-FE-001: Hiển thị trang chủ
6. TC-FE-013: Hiển thị form đăng bài
7. BUYER-02, BUYER-05: Buyer flow
8. SELLER-02, SELLER-06: Seller flow

### Medium Priority
1. TC-GAME-007: Cập nhật schema
2. TC-LIST-002, TC-LIST-003: Filter
3. TC-FE-021, TC-FE-025: Admin functions

### Low Priority
1. Performance tests
2. SEO tests
3. Responsive tests
