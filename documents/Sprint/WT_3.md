---
name: Sprint 3 Workthrough
overview: "Hướng dẫn sử dụng các tính năng Sprint 3: Order Module, Escrow 72h, Encryption, BullMQ Workers, và Frontend flows."
isProject: false
---

# Sprint 3 – Workthrough & Hướng Dẫn Sử Dụng

## Mục tiêu Sprint 3

**Mục tiêu:** Luồng mua-bán-escrow-72h hoạt động end-to-end.

**Definition of Done:** End-to-end mua hàng → giao hàng → 72h tự động hoàn tất → Coin vào ví Seller.

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

## 2. Order Status Flow

```
PENDING → LOCKED (Buyer đặt cọc thành công)
        → DELIVERED (Seller đã giao thông tin)
        → COMPLETED (Buyer xác nhận hoặc 72h hết hạn)
        
PENDING → DISPUTED (Buyer tạo dispute - Sprint 4)
```

---

## 3. API Endpoints

### Orders

| Method | Endpoint                        | Guard             | Mô tả                                 |
| ------ | ------------------------------- | ----------------- | -------------------------------------- |
| GET    | `/api/v1/orders`                | `order:view`      | Danh sách orders của user             |
| GET    | `/api/v1/orders/:id`            | `order:view`      | Chi tiết order                        |
| POST   | `/api/v1/orders`                | `order:create`    | Tạo order (HOLD + LOCKED)             |
| POST   | `/api/v1/orders/:id/deliver`    | `order:deliver`   | Seller giao thông tin TKGAME          |
| POST   | `/api/v1/orders/:id/confirm`    | `order:confirm`   | Buyer xác nhận nhận hàng (sớm)       |
| GET    | `/api/v1/orders/:id/game-info`  | `order:view`      | Buyer xem thông tin TKGAME (giải mã)  |

### Notifications

| Method | Endpoint                    | Guard        | Mô tả                    |
| ------ | --------------------------- | ------------ | ------------------------ |
| GET    | `/api/v1/notifications`    | Auth         | Danh sách notifications |
| PATCH  | `/api/v1/notifications/:id/read` | Auth | Đánh dấu đã đọc        |

---

## 4. Luồng Mua Hàng (Buyer)

### Bước 1: Xem Listing và Mua ngay

```
1. Buyer truy cập trang chủ `/` hoặc `/listings/[id]`
2. Click "Mua ngay" 
3. Hiện Modal xác nhận:
   - Giá tiền
   - Số dư khả dụng
   - Nút "Xác nhận thanh toán"
4. Click → API POST /orders
5. Thành công → Redirect /orders/[id]
6. Thất bại → Hiện lỗi (số dư không đủ, BH không đủ,...)
```

### Bước 2: Xem Chi tiết Order

```
1. Buyer truy cập /orders/[id]
2. Xem thông tin:
   - Order ID, số tiền
   - Trạng thái hiện tại
   - Timeline các bước
   - Thông tin người bán
```

### Bước 3: Xem Thông tin TKGAME (khi Seller đã giao)

```
1. Buyer vào /orders/[id]
2. Nếu status = DELIVERED → Hiển thị nút "Xem thông tin TKGAME"
3. Click → API GET /orders/:id/game-info
4. Hiển thị thông tin đã giải mã (username, password)
5. Nút "Xác nhận đã nhận hàng" (early complete)
```

### Bước 4: Xác nhận đã nhận hàng (Early Complete)

```
1. Click nút "Xác nhận đã nhận hàng"
2. API POST /orders/:id/confirm
3. Order chuyển COMPLETED
4. Coin được chuyển vào ví Seller
5. Cả hai bên nhận notification
```

---

## 5. Luồng Bán Hàng (Seller)

### Bước 1: Nhận Order mới

```
1. Seller nhận notification "Đơn hàng mới"
2. Truy cập /orders/[id]
3. Xem thông tin order (buyer, số tiền)
```

### Bước 2: Giao hàng (Delivery)

```
1. Seller vào /orders/[id] (role seller)
2. Thấy form nhập thông tin TKGAME
3. Nhập:
   - Username tài khoản game
   - Password tài khoản game
   - Các thông tin khác (nếu có)
4. Click "Giao hàng" → API POST /orders/:id/deliver
5. Thông tin được MÃ HÓA AES-256-CBC trước khi lưu
6. Order chuyển DELIVERED, 72h countdown reset
7. Buyer được notify
```

### Lưu ý bảo mật:

- Thông tin TKGAME được mã hóa AES-256-CBC
- Mỗi order có một key riêng
- Chỉ Buyer mới có thể xem thông tin đã giải mã
- Seller không thể xem lại thông tin đã giao sau khi submit

---

## 6. Auto Complete 72h

### Hoạt động như thế nào:

```
1. Khi Buyer tạo order (status = LOCKED):
   - Hệ thống tạo BullMQ job AUTO_COMPLETE với delay 72h
   
2. Khi Seller giao hàng (status = DELIVERED):
   - Job được reset với delay 72h mới
   
3. Sau 72h (nếu không có dispute):
   - Job chạy tự động
   - Release HOLD + SETTLE to Seller
   - Order chuyển COMPLETED
   - Cả hai bên nhận notification
   
4. Retry Logic:
   - Nếu job fail: retry 3 lần với backoff exponential
   - Sau 3 lần fail: move to DLQ + notify admin
```

---

## 7. Wallet Integration

### Quỹ Bảo Hiểm (Insurance Fund)

Trước khi tạo order, hệ thống kiểm tra:

```
Tổng giá trị Hold + Dispute <= Số dư Quỹ Bảo Hiểm

Nếu vượt quá → chặn tạo order với lỗi:
"Seller has exceeded insurance fund limit"
```

### Các loại Transaction

| Type    | Mô tả                        |
| ------- | ---------------------------- |
| HOLD    | Buyer đặt cọc khi mua hàng   |
| RELEASE | Giải phóng hold (hủy order)  |
| SETTLE  | Chuyển tiền cho Seller      |
| DISPUTE | Chuyển vào tranh chấp       |

### Frontend - Wallet Pages

- **URL:** `/wallet`
- **Tính năng:**
  - Xem số dư khả dụng
  - Xem số dư đang giữ (HOLD)
  - Xem số dư Quỹ Bảo Hiểm
  - Lịch sử giao dịch
  - Nạp tiền (topup)

---

## 8. Notifications

### Loại Notification

| Event                    | Recipient    | Title                           |
| --------------------------|--------------|-------------------------------- |
| ORDER_CREATED            | Seller       | "Có đơn hàng mới #%orderId%"   |
| ORDER_DELIVERED          | Buyer        | "Đơn hàng #%orderId% đã giao" |
| ORDER_COMPLETED          | Seller       | "Đơn hàng #%orderId% hoàn tất" |
| ORDER_AUTO_COMPLETED     | Both         | "Đơn hàng #%orderId% tự động hoàn tất" |

### Frontend

- **URL:** `/notifications`
- **Hiển thị:** Icon chuông ở header với badge số notification chưa đọc

---

## 9. Frontend Pages

| Route                        | Component                      | Mô tả                          |
| ---------------------------- | ------------------------------ | ------------------------------ |
| `/orders`                    | orders/page.tsx               | Danh sách orders (mua/bán)    |
| `/orders/[id]`               | orders/[id]/page.tsx          | Chi tiết order + timeline      |
| `/orders/[id]/delivery`      | orders/[id]/delivery/page.tsx | Seller: giao TKGAME (nếu cần) |
| `/wallet`                    | wallet/page.tsx               | Quản lý ví                    |
| `/notifications`             | notifications/page.tsx        | Danh sách notifications        |

---

## 10. Testing Checklist

### Buyer Flow

- [ ] Đăng nhập với tài khoản Buyer
- [ ] Truy cập trang chủ `/`, xem danh sách listings
- [ ] Click vào listing xem chi tiết
- [ ] Click "Mua ngay" → Tạo order thành công
- [ ] Truy cập /orders/[id], xem chi tiết
- [ ] Đợi Seller giao hàng (hoặc test với Seller account)
- [ ] Xem thông tin TKGAME đã mã hóa
- [ ] Click "Xác nhận đã nhận hàng"
- [ ] Verify Coin đã trừ khỏi Buyer và cộng vào Seller

### Seller Flow

- [ ] Đăng nhập với tài khoản Seller
- [ ] Có listing đang PUBLISHED (tạo nếu chưa có)
- [ ] Nhận notification order mới
- [ ] Truy cập /orders/[id]
- [ ] Nhập thông tin TKGAME → Giao hàng
- [ ] Verify order chuyển DELIVERED

### Auto Complete Flow

- [ ] Tạo order với status DELIVERED
- [ ] Đợi 72h (hoặc test với shorter delay)
- [ ] Verify order tự chuyển COMPLETED
- [ ] Verify Coin đã cộng vào Seller

### Insurance Fund Flow

- [ ] Tạo nhiều orders để tăng tổng HOLD
- [ ] Khi vượt quá Quỹ Bảo Hiểm → Verify bị chặn

---

## 11. Manual API Tests

```bash
# 1. Tạo order (Buyer)
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer <buyer_token>" \
  -H "Content-Type: application/json" \
  -d '{"listing_id": 1}'

# 2. Seller giao hàng
curl -X POST http://localhost:3001/api/v1/orders/1/deliver \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"game_user","password":"game_pass"}'

# 3. Buyer xem thông tin TKGAME
curl http://localhost:3001/api/v1/orders/1/game-info \
  -H "Authorization: Bearer <buyer_token>"

# 4. Buyer xác nhận sớm
curl -X POST http://localhost:3001/api/v1/orders/1/confirm \
  -H "Authorization: Bearer <buyer_token>"

# 5. Kiểm tra số dư sau khi hoàn tất
curl http://localhost:3001/api/v1/wallet/balance \
  -H "Authorization: Bearer <seller_token>"

# 6. Xem danh sách orders
curl http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer <token>"

# 7. Xem notifications
curl http://localhost:3001/api/v1/notifications \
  -H "Authorization: Bearer <token>"
```

---

## 12. Concurrency Test

```bash
# 2 Buyer cùng mua 1 listing
# Buyer 1: Tạo order thành công (listing LOCKED)
# Buyer 2: Tạo order thất bại (listing không còn PUBLISHED)
```

---

## 13. Troubleshooting

### Lỗi thường gặp

| Lỗi                          | Nguyên nhân                     | Giải pháp                          |
| ---------------------------- | ------------------------------- | ---------------------------------- |
| 401 Unauthorized             | Chưa đăng nhập hoặc token hết hạn | Đăng nhập lại, lấy token mới      |
| 403 Forbidden               | Không có quyền                  | Kiểm tra role/permission          |
| 404 Not Found               | ID không tồn tại                | Kiểm tra ID                       |
| Listing is not available    | Listing đã bị mua hoặc khóa     | Chọn listing khác                |
| Cannot buy own listing      | Mua chính listing của mình     | Dùng tài khoản khác               |
| Seller exceeded insurance   | Tổng HOLD > Quỹ Bảo Hiểm       | Seller cần nạp thêm vào Quỹ BH   |
| Order not in LOCKED status  | Giao hàng khi chưa có order     | Tạo order trước                   |
| Game info not delivered yet | Seller chưa giao hàng          | Liên hệ Seller                    |

### Kiểm tra Database

```bash
# Kết nối database
psql $DATABASE_URL

# Xem orders
SELECT * FROM orders;

# Xem order timeline
SELECT * FROM order_timeline WHERE order_id = 1;

# Xem transactions
SELECT * FROM wallet_transactions WHERE order_id = 1;

# Xem notifications
SELECT * FROM notifications WHERE user_id = 1;
```

---

## 14. Files Đã Triển Khai

### Backend

- `apps/api/src/orders/orders.module.ts`
- `apps/api/src/orders/orders.service.ts`
- `apps/api/src/orders/orders.controller.ts`
- `apps/api/src/common/encryption.service.ts`
- `apps/api/src/notifications/notifications.module.ts`
- `apps/api/src/notifications/notifications.service.ts`
- `apps/api/src/notifications/notifications.controller.ts`

### Frontend

- `apps/web/src/app/orders/page.tsx`
- `apps/web/src/app/orders/[id]/page.tsx`
- `apps/web/src/app/orders/[id]/delivery/page.tsx` (nếu có)
- `apps/web/src/app/notifications/page.tsx` (nếu có)
- `apps/web/src/app/wallet/page.tsx` (nếu có)

### Database

- Bảng `orders` với các trường: buyer_id, seller_id, listing_id, amount, status, auto_complete_at, bullmq_job_id
- Bảng `order_deliveries` với encrypted_data
- Bảng `order_timeline` để tracking
- Bảng `notifications` cho in-app notifications

---

## 15. Công nghệ Sử Dụng

- **Encryption:** AES-256-CBC với per-order key
- **Queue:** BullMQ với Redis
- **Auto Complete:** 72h delay với retry logic (3 attempts, exponential backoff)
- **Notifications:** In-app notifications với các loại event
