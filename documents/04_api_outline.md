# API Module Outline
## Dự án: GIAODICHGAME C2C Marketplace

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-12
> Base URL: `/api/v1`

---

## Module 1: Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Đăng ký tài khoản | Public |
| POST | `/auth/login` | Đăng nhập → JWT | Public |
| POST | `/auth/refresh` | Refresh access token | Refresh Token |
| POST | `/auth/logout` | Revoke refresh token | User |
| GET | `/auth/me` | Thông tin user + danh sách permissions hiện có | User |

---

## Module 2: Users & Profile

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/users/:id` | Xem profile công khai | Public |
| PATCH | `/users/me` | Cập nhật profile | User |
| GET | `/users/me/transactions` | Lịch sử Coin | User |
| GET | `/users/me/listings` | Bài đăng của tôi | User |
| GET | `/users/me/orders` | Đơn hàng của tôi | User |

---

## Module 3: Wallet

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/wallet/balance` | Số dư hiện tại | User |
| POST | `/wallet/topup/gateway` | Khởi tạo nạp Coin qua cổng TT | User |
| POST | `/wallet/topup/bank` | Tạo yêu cầu nạp chuyển khoản | User |
| POST | `/wallet/topup/webhook` | Callback từ payment gateway | System |
| POST | `/wallet/withdraw` | Tạo yêu cầu rút Coin | User |
| GET | `/wallet/insurance` | Số dư quỹ bảo hiểm | Seller |
| POST | `/wallet/insurance/deposit` | Nạp vào quỹ bảo hiểm | Seller |
| POST | `/wallet/insurance/withdraw` | Rút quỹ bảo hiểm | Seller |

### Admin Wallet
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/admin/topup-requests` | Danh sách yêu cầu nạp TK | Admin |
| PATCH | `/admin/topup-requests/:id/confirm` | Xác nhận nạp thủ công | Admin |

---

## Module 4: Games & Schema

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/games` | Danh sách game active | Public |
| GET | `/games/:slug` | Chi tiết game + schema | Public |
| POST | `/games` | Thêm game mới | Mod |
| PATCH | `/games/:id` | Sửa game | Mod |
| DELETE | `/games/:id` | Ẩn/xóa game | Mod |
| PUT | `/games/:id/schema` | Cập nhật schema thuộc tính | Mod |

---

## Module 5: Listings (Bài đăng)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/listings` | Danh sách listings (filter, paginate) | Public |
| GET | `/listings/:id` | Chi tiết listing | Public |
| POST | `/listings` | Đăng bài bán | Seller |
| PATCH | `/listings/:id` | Sửa bài (chỉ khi PUBLISHED) | Seller |
| DELETE | `/listings/:id` | Xóa/ẩn bài | Seller |
| POST | `/listings/:id/pin` | Mua Pin cho bài | Seller |

---

## Module 6: Orders

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/orders` | Tạo đơn mua hàng | Buyer |
| GET | `/orders/:id` | Chi tiết đơn hàng | Buyer/Seller |
| POST | `/orders/:id/deliver` | Seller giao thông tin | Seller |
| POST | `/orders/:id/confirm` | Buyer xác nhận nhận hàng | Buyer |
| GET | `/orders/:id/delivery` | Xem thông tin tài khoản game | Buyer |

---

## Module 7: Dispute

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/disputes` | Tạo ticket khiếu nại | Buyer |
| GET | `/disputes/:id` | Chi tiết ticket | Buyer/Seller/Mod |
| POST | `/disputes/:id/evidence` | Seller gửi bằng chứng | Seller |
| POST | `/disputes/:id/messages` | Gửi tin nhắn chat | Buyer/Seller/Mod |
| GET | `/disputes/:id/messages` | Lấy lịch sử chat | Buyer/Seller/Mod |
| PATCH | `/disputes/:id/resolve` | Mod/Admin ra phán quyết | Mod/Admin |
| GET | `/admin/disputes` | Danh sách tất cả disputes | Mod/Admin |

---

## Module 8: VIP & Pin

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/vip/packages` | Danh sách gói VIP | Public |
| POST | `/vip/purchase` | Mua gói VIP | User |
| GET | `/pin/config` | Lấy cấu hình giá Pin | Public |

### Admin VIP/Pin
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/admin/vip-packages` | Quản lý gói VIP | Admin |
| POST | `/admin/vip-packages` | Tạo gói VIP | Admin |
| PATCH | `/admin/vip-packages/:id` | Sửa gói VIP | Admin |
| DELETE | `/admin/vip-packages/:id` | Xóa/ẩn gói VIP | Admin |
| PUT | `/admin/pin-config` | Cập nhật giá Pin | Admin |

---

## Module 9: Admin Panel

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/admin/users` | Danh sách users (search, filter) | `user:manage` |
| GET | `/admin/users/:id` | Chi tiết user + danh sách roles | `user:manage` |
| PATCH | `/admin/users/:id/status` | Block/unblock user | `user:manage` |
| GET | `/admin/users/:id/roles` | Xem roles hiện tại của user | `user:assign_role` |
| POST | `/admin/users/:id/roles` | Phong role cho user | `user:assign_role` |
| DELETE | `/admin/users/:id/roles/:roleId` | Thu hồi role | `user:assign_role` |
| GET | `/admin/stats` | Dashboard thống kê | `stats:view` |

---

## Module 10: Role & Permission Management

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/admin/roles` | Danh sách roles (kèm số user) | `role:manage` |
| POST | `/admin/roles` | Tạo role mới | `role:manage` |
| PATCH | `/admin/roles/:id` | Sửa tên/mô tả role | `role:manage` |
| DELETE | `/admin/roles/:id` | Xóa role (không xóa system role) | `role:manage` |
| GET | `/admin/roles/:id/permissions` | Xem permissions gán cho role | `role:manage` |
| PUT | `/admin/roles/:id/permissions` | Cập nhật danh sách permissions của role | `role:manage` |
| GET | `/admin/permissions` | Danh sách tất cả permissions hệ thống | `role:manage` |

---

## Ghi chú kỹ thuật

- **Auth Header:** `Authorization: Bearer <access_token>`
- **Pagination:** `?page=1&limit=20`
- **Filter listing:** `?game_id=1&min_price=10&max_price=500&rank=Vàng`
- **Upload ảnh:** Dùng `multipart/form-data`, lưu S3/Cloudflare R2
- **Mã hóa giao tiếp:** HTTPS bắt buộc (Nginx TLS termination)
- **Rate limiting:** Áp dụng cho `/auth/login`, `/orders`, `/wallet/withdraw`
