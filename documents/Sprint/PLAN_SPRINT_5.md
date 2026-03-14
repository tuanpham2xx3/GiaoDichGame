# Sprint 5 - VIP, Pin & UAT

## 1. Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Sprint | Sprint 5 - VIP, Pin & UAT |
| Thời gian | 2 tuần (2026-03-14 → 2026-03-28) |
| Mục tiêu | Monetization hoàn thiện, Admin Panel, system test đầy đủ, sẵn sàng launch v1.0 |
| Trạng thái | IN PROGRESS |

---

## 2. Backend Implementation

### 2.1. VIP Module (✅ Hoàn thành)

| File | Mô tả |
|------|-------|
| `apps/api/src/vip/vip.module.ts` | VIP NestJS module |
| `apps/api/src/vip/vip.service.ts` | VIP business logic |
| `apps/api/src/vip/vip.controller.ts` | VIP REST API endpoints |
| `apps/api/src/queue/processors/premium.processor.ts` | BullMQ processor cho VIP_EXPIRY |

**API Endpoints:**
- `GET /vip/packages` - Lấy danh sách gói VIP
- `GET /vip/my-vip` - Lấy thông tin VIP của user
- `POST /vip/purchase` - Mua VIP
- `POST /vip/admin/packages` - Tạo gói VIP (Admin)
- `PUT /vip/admin/packages/:id` - Cập nhật gói VIP (Admin)
- `DELETE /vip/admin/packages/:id` - Xóa gói VIP (Admin)

### 2.2. Pin Module (✅ Hoàn thành)

| File | Mô tả |
|------|-------|
| `apps/api/src/pin/pin.module.ts` | Pin NestJS module |
| `apps/api/src/pin/pin.service.ts` | Pin business logic |
| `apps/api/src/pin/pin.controller.ts` | Pin REST API endpoints |

**API Endpoints:**
- `GET /pin/calculate-price` - Tính giá Pin
- `POST /pin/purchase` - Mua Pin cho listing
- `GET /pin/my-pins` - Lấy danh sách Pin của user
- `GET /pin/admin/config` - Lấy cấu hình Pin (Admin)
- `PUT /pin/admin/config` - Cập nhật cấu hình Pin (Admin)

### 2.3. User Profiles (✅ Hoàn thành)

| File | Mô tả |
|------|-------|
| `apps/api/src/users/users.service.ts` | Thêm methods: getProfile, createOrUpdateProfile |
| `apps/api/src/users/users.controller.ts` | Thêm endpoints: GET /me/vip-profile, PATCH /me/vip-profile |

### 2.4. Admin Panel (✅ Hoàn thành)

| File | Mô tả |
|------|-------|
| `apps/api/src/admin/admin.module.ts` | Admin NestJS module |
| `apps/api/src/admin/admin.service.ts` | Admin business logic |
| `apps/api/src/admin/admin.controller.ts` | Admin REST API endpoints |

**API Endpoints:**
- `GET /v1/admin/stats` - Lấy thống kê hệ thống
- `GET /v1/admin/users` - Lấy danh sách users
- `GET /v1/admin/users/:id` - Lấy chi tiết user
- `PATCH /v1/admin/users/:id/ban` - Khóa user
- `PATCH /v1/admin/users/:id/unban` - Mở khóa user

### 2.5. Database Schema (✅ Hoàn thành)

Đã thêm vào `apps/api/src/database/schema.ts`:
- Bảng `user_profiles` - Lưu trữ thông tin VIP profile (displayName, nameColor, bio)
- Relations cho VIP packages, subscriptions, profiles

---

## 3. Frontend Implementation

### 3.1. VIP Pages (✅ Hoàn thành)

| File | Mô tả |
|------|-------|
| `apps/web/src/app/vip/page.tsx` | Trang mua VIP |
| `apps/web/src/app/profile/vip/page.tsx` | Trang chỉnh sửa VIP profile |

### 3.2. Pin Pages (✅ Hoàn thành)

| File | Mô tả |
|------|-------|
| `apps/web/src/app/sell/pin/page.tsx` | Trang mua Pin cho listing |

### 3.3. Admin Pages (✅ Hoàn thành)

| File | Mô tả |
|------|-------|
| `apps/web/src/app/admin/users/page.tsx` | Quản lý users |
| `apps/web/src/app/admin/stats/page.tsx` | Thống kê hệ thống |

### 3.4. Navigation (✅ Hoàn thành)

Đã cập nhật `apps/web/src/components/Header.tsx`:
- Thêm link "VIP" cho tất cả users
- Thêm link "Admin" cho users có quyền admin

---

## 4. Testing Plan

### 4.1. Unit Tests (Chưa chạy)

| Module | Test Cases | Status |
|--------|------------|--------|
| VIP Service | Purchase, Expiry, Benefits | Pending |
| Pin Service | Purchase, Expiry, Config | Pending |
| Admin Service | Stats, User Management | Pending |

### 4.2. Integration Tests (Chưa chạy)

| Flow | Description | Status |
|------|-------------|--------|
| VIP Purchase Flow | Register → Login → Topup → Buy VIP | Pending |
| Pin Purchase Flow | Register → Login → Create Listing → Buy Pin | Pending |
| Admin User Management | Login as Admin → View Users → Ban/Unban | Pending |

### 4.3. E2E Tests (Chưa chạy)

| Scenario | Steps | Status |
|----------|-------|--------|
| Full VIP Flow | Register → Login → Nạp Coin → Mua VIP → Đổi username/avatar | Pending |
| Full Pin Flow | Register → Login → Đăng bài → Mua Pin → Kiểm tra hiển thị | Pending |
| Admin Dashboard | Login as Admin → View Stats → Manage Users | Pending |

### 4.4. Security Tests (Chưa chạy)

| Test | Description | Status |
|------|-------------|--------|
| XSS | Test input validation | Pending |
| SQL Injection | Test parameterized queries | Pending |
| JWT Tampering | Test JWT validation | Pending |
| RBAC | Test permission guards | Pending |

---

## 5. Definition of Done

- [x] User mua được VIP, hiển thị badge
- [x] Seller mua được Pin cho listing
- [x] Admin quản lý được users, stats
- [ ] Tất cả E2E flows hoạt động
- [ ] Security & Performance đạt yêu cầu
- [ ] Sẵn sàng release v1.0

---

## 6. Notes

- VIP và Pin đã tích hợp với BullMQ cho auto-expiry
- VIP users có thể đổi displayName, avatar, nameColor, bio
- Pin prices có thể được giảm theo % discount của VIP
- Admin có full CRUD trên users (bao gồm ban/unban)

---

**Created**: 2026-03-14
**Last Updated**: 2026-03-14
