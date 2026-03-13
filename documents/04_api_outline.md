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
| GET | `/auth/me` | Thông tin user + permissions + roles | User |

---

## Module 2: Users & Profile

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/users/:id` | Xem profile công khai | Public |
| PATCH | `/users/me` | Cập nhật profile | `profile:edit` |
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
| GET | `/wallet/insurance` | Số dư quỹ bảo hiểm | `insurance:manage` |
| POST | `/wallet/insurance/deposit` | Nạp vào quỹ bảo hiểm | `insurance:manage` |
| POST | `/wallet/insurance/withdraw` | Rút quỹ bảo hiểm | `insurance:manage` |

### Admin Wallet
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/admin/topup-requests` | Danh sách yêu cầu nạp TK | `topup:confirm` |
| PATCH | `/admin/topup-requests/:id/confirm` | Xác nhận nạp thủ công | `topup:confirm` |
| GET | `/admin/withdraw-requests` | Danh sách yêu cầu rút | `withdraw:approve` |
| PATCH | `/admin/withdraw-requests/:id/approve` | Duyệt rút tiền | `withdraw:approve` |

---

## Module 4: Games & Schema

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/games` | Danh sách game active | Public |
| GET | `/games/:slug` | Chi tiết game + schema | Public |
| POST | `/games` | Thêm game mới | `game:manage` |
| PATCH | `/games/:id` | Sửa game | `game:manage` |
| DELETE | `/games/:id` | Ẩn/xóa game | `game:manage` |
| PUT | `/games/:id/schema` | Cập nhật schema thuộc tính | `game:manage` |

---

## Module 5: Listings (Bài đăng)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/listings` | Danh sách listings (filter, paginate) | Public |
| GET | `/listings/:id` | Chi tiết listing | Public |
| POST | `/listings` | Đăng bài bán | `listing:create` |
| PATCH | `/listings/:id` | Sửa bài (chỉ khi PUBLISHED) | `listing:edit` |
| DELETE | `/listings/:id` | Xóa/ẩn bài | `listing:delete` |
| POST | `/listings/:id/pin` | Mua Pin cho bài | `listing:pin` |

---

## Module 6: Orders

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/orders` | Tạo đơn mua hàng | `order:buy` |
| GET | `/orders/:id` | Chi tiết đơn hàng | Buyer/Seller (chủ đơn) |
| POST | `/orders/:id/deliver` | Seller giao thông tin | `order:deliver` |
| POST | `/orders/:id/confirm` | Buyer xác nhận nhận hàng | `order:buy` |
| GET | `/orders/:id/delivery` | Xem thông tin tài khoản game | Buyer (chỉ buyer đơn đó) |

---

## Module 7: Dispute

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/disputes` | Tạo ticket khiếu nại | Buyer (chỉ buyer của đơn) |
| GET | `/disputes/:id` | Chi tiết ticket | Buyer/Seller (liên quan) |
| POST | `/disputes/:id/evidence` | Seller gửi bằng chứng | Seller (liên quan) |
| POST | `/disputes/:id/messages` | Gửi tin nhắn chat | Buyer/Seller (liên quan) |
| GET | `/disputes/:id/messages` | Lấy lịch sử chat | Buyer/Seller (liên quan) |
| PATCH | `/disputes/:id/resolve` | Mod/Admin ra phán quyết | `dispute:resolve` |
| GET | `/admin/disputes` | Danh sách tất cả disputes | `dispute:resolve` |

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
| GET | `/admin/vip-packages` | Quản lý gói VIP | `vip:manage` |
| POST | `/admin/vip-packages` | Tạo gói VIP | `vip:manage` |
| PATCH | `/admin/vip-packages/:id` | Sửa gói VIP | `vip:manage` |
| DELETE | `/admin/vip-packages/:id` | Xóa/ẩn gói VIP | `vip:manage` |
| PUT | `/admin/pin-config` | Cấu hình giá Pin | `pin:manage` |

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

---

## Phụ lục: Default Permissions cho USER Role

| Permission | Mô tả | Gán mặc định |
|------------|-------|---------------|
| `profile:edit` | Chỉnh sửa profile cá nhân | ✅ Có |
| `order:buy` | Mua hàng | ✅ Có |
| `order:view_own` | Xem đơn hàng của mình | ✅ Có |
| `listing:create` | Đăng bài bán | ❌ Cần admin gán SELLER role |
| `listing:edit` | Sửa bài đăng | ❌ Cần admin gán SELLER role |
| `listing:delete` | Xóa bài đăng | ❌ Cần admin gán SELLER role |
| `listing:pin` | Mua pin cho bài | ❌ Cần admin gán SELLER role |
| `order:deliver` | Giao thông tin tài khoản game | ❌ Cần admin gán SELLER role |
| `insurance:manage` | Quản lý quỹ bảo hiểm | ❌ Cần admin gán SELLER role |

> **Lưu ý:** Khi đăng ký, user mới chỉ có quyền cơ bản (`profile:edit`, `order:buy`). Để có quyền bán hàng, admin cần gán role `SELLER` cho user qua API `/admin/users/:id/roles`
