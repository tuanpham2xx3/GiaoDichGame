---
name: Sprint 3 - Test Case Plan
overview: "Kế hoạch Test Cases cho Sprint 3: Order Module, Escrow 72h, Encryption, BullMQ Workers, và Frontend flows."
isProject: false
---

# Sprint 3 – Test Case Plan

## Mục tiêu Test

Xác minh luồng mua-bán-escrow-72h hoạt động end-to-end:
- Tạo order (HOLD + LOCKED)
- Seller giao thông tin TKGAME (encrypted)
- Buyer xem thông tin TKGAME (decrypted)
- Xác nhận sớm hoặc 72h auto complete
- Coin chuyển vào ví Seller

---

## 1. Test Phân Loại

| Loại Test | Số lượng | Mô tả |
| --------- | -------- | -------|
| Backend API | 25+ | Unit tests cho các service |
| Integration | 15+ | Test tích hợp giữa modules |
| Frontend | 20+ | UI tests cho các flows |
| E2E | 10+ | End-to-end scenarios |
| **Tổng** | **70+** | |

---

## 2. Backend - Order Module Tests

### 2.1 Order Creation Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| ORD-001 | Tạo order thành công | Buyer đăng nhập, listing PUBLISHED, đủ số dư | POST /api/v1/orders với listing_id | Order tạo thành công, status LOCKED, HOLD transaction tạo |
| ORD-002 | Tạo order thất bại - listing không tồn tại | Buyer đăng nhập | POST /api/v1/orders với listing_id không tồn tại | Return 404, error message |
| ORD-003 | Tạo order thất bại - listing đã bị khóa | Listing status = LOCKED | POST /api/v1/orders với listing_id đã khóa | Return 400, "Listing is not available" |
| ORD-004 | Tạo order thất bại - mua chính listing của mình | Buyer = Seller của listing | POST /api/v1/orders | Return 400, "Cannot buy own listing" |
| ORD-005 | Tạo order thất bại - số dư không đủ | Buyer đăng nhập, số dư < price | POST /api/v1/orders | Return 400, "Insufficient balance" |
| ORD-006 | Tạo order thất bại - vượt quỹ bảo hiểm | Seller vượt insurance limit | POST /api/v1/orders | Return 400, "Seller exceeded insurance fund limit" |
| ORD-007 | Tạo order thất bại - chưa đăng nhập | Chưa auth | POST /api/v1/orders | Return 401 |
| ORD-008 | Tạo order thất bại - không có quyền order:create | User không có permission | POST /api/v1/orders | Return 403 |

### 2.2 Order Delivery Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| ORD-009 | Giao hàng thành công | Order status LOCKED, user = seller | POST /api/v1/orders/:id/deliver với game info | Order chuyển DELIVERED, game_info_encrypted được lưu |
| ORD-010 | Giao hàng thất bại - order không tồn tại | User đăng nhập | POST /api/v1/orders/9999/deliver | Return 404 |
| ORD-011 | Giao hàng thất bại - không phải seller | User không phải seller của order | POST /api/v1/orders/:id/deliver | Return 403 |
| ORD-012 | Giao hàng thất bại - status không phải LOCKED | Order status = DELIVERED | POST /api/v1/orders/:id/deliver | Return 400, "Order not in LOCKED status" |
| ORD-013 | Giao hàng thất bại - chưa đăng nhập | Chưa auth | POST /api/v1/orders/:id/deliver | Return 401 |

### 2.3 Order Confirm (Early Complete) Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| ORD-014 | Xác nhận sớm thành công | Order status DELIVERED, user = buyer | POST /api/v1/orders/:id/confirm | Order chuyển COMPLETED, RELEASE + SETTLE transactions tạo |
| ORD-015 | Xác nhận sớm thất bại - order không tồn tại | User đăng nhập | POST /api/v1/orders/9999/confirm | Return 404 |
| ORD-016 | Xác nhận sớm thất bại - không phải buyer | User không phải buyer | POST /api/v1/orders/:id/confirm | Return 403 |
| ORD-017 | Xác nhận sớm thất bại - status không phải DELIVERED | Order status = LOCKED | POST /api/v1/orders/:id/confirm | Return 400, "Order not in DELIVERED status" |

### 2.4 Order View Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| ORD-018 | Xem danh sách orders | User đăng nhập | GET /api/v1/orders | Return danh sách orders của user (mua + bán) |
| ORD-019 | Xem chi tiết order | User là buyer/seller của order | GET /api/v1/orders/:id | Return chi tiết order |
| ORD-020 | Xem chi tiết order - không có quyền | User không liên quan | GET /api/v1/orders/:id | Return 403 |
| ORD-021 | Xem game info thành công | Order status DELIVERED, user = buyer | GET /api/v1/orders/:id/game-info | Return thông tin đã giải mã |
| ORD-022 | Xem game info thất bại - chưa giao | Order status LOCKED | GET /api/v1/orders/:id/game-info | Return 400, "Game info not delivered yet" |

---

## 3. Backend - Encryption Service Tests

| ID | Test Case | Steps | Expected Result |
| -- | --------- | ----- | ----------------|
| ENC-001 | Encrypt game info | Gọi encryptGameInfo("user:pass") | Return chuỗi có format iv:encrypted:key |
| ENC-002 | Decrypt game info | Gọi decryptGameInfo với chuỗi đã encrypt | Return đúng thông tin ban đầu |
| ENC-003 | Encrypt với null input | Gọi encryptGameInfo(null) | Xử lý lỗi đúng cách |
| ENC-004 | Decrypt với data không hợp lệ | Gọi decryptGameInfo("invalid") | Throw error hoặc return null |
| ENC-005 | Verify per-order key khác nhau | Encrypt 2 lần cùng data | Kết quả encrypted khác nhau (vì key khác) |

---

## 4. Backend - BullMQ Worker Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| BULL-001 | Auto complete sau 72h | Order status DELIVERED, đợi 72h | BullMQ job chạy | Order chuyển COMPLETED, SETTLE transaction tạo |
| BULL-002 | Auto complete - order không ở DELIVERED | Order status = COMPLETED | BullMQ job chạy | Job skip, không thay đổi gì |
| BULL-003 | Auto complete - order có dispute | Order bị dispute | BullMQ job chạy | Job skip, không thay đổi gì |
| BULL-004 | Retry khi fail | Job fail lần đầu | Retry logic | Job retry tối đa 3 lần |
| BULL-005 | DLQ khi fail quá 3 lần | Job fail 3 lần | Move to DLQ | Job vào DLQ, notification cho admin |
| BULL-006 | Reset job khi deliver | Order LOCKED → DELIVERED | Seller deliver | Job được reset với delay 72h mới |

---

## 5. Backend - Wallet Integration Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| WAL-001 | Tạo HOLD transaction | User đăng nhập, đủ số dư | Gọi holdCoins() | Transaction type HOLD, amount trừ khỏi available |
| WAL-002 | Release HOLD | Có HOLD transaction | Gọi releaseHold() | Transaction type RELEASE, amount hoàn lại available |
| WAL-003 | Settle to Seller | Có HOLD transaction | Gọi settleToSeller() | Transaction type SETTLE, amount cộng vào seller |
| WAL-004 | Get hold balance | User có nhiều HOLD | Gọi getHoldBalance() | Return tổng amount đang hold |
| WAL-005 | Insurance check - trong giới hạn | Total hold < insurance | Gọi checkInsuranceLimit() | Return true |
| WAL-006 | Insurance check - vượt giới hạn | Total hold >= insurance | Gọi checkInsuranceLimit() | Return false |

---

## 6. Backend - Notifications Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| NOT-001 | Tạo notification ORDER_CREATED | Order tạo | Tự động tạo | Notification cho seller |
| NOT-002 | Tạo notification ORDER_DELIVERED | Seller deliver | Tự động tạo | Notification cho buyer |
| NOT-003 | Tạo notification ORDER_COMPLETED | Order complete | Tự động tạo | Notification cho seller |
| NOT-004 | Danh sách notifications | User đăng nhập | GET /api/v1/notifications | Return danh sách notifications |
| NOT-005 | Đánh dấu đã đọc | Có notification chưa đọc | PATCH /api/v1/notifications/:id/read | Notification được đánh dấu is_read = true |

---

## 7. Frontend - Purchase Flow Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| FE-001 | Hiển thị modal mua hàng | Buyer đăng nhập, listing PUBLISHED | Click "Mua ngay" | Modal hiển thị giá, số dư |
| FE-002 | Tạo order từ modal | Modal đã hiển thị | Click "Xác nhận thanh toán" | Order tạo, redirect /orders/[id] |
| FE-003 | Hiển thị lỗi - số dư không đủ | Buyer số dư < price | Click "Xác nhận thanh toán" | Hiển thị error message |
| FE-004 | Redirect đến login | Chưa đăng nhập | Click "Mua ngay" | Redirect /login |
| FE-005 | Ẩn nút mua nếu là seller | User = seller của listing | Xem listing | Không hiển thị nút "Mua ngay" |

---

## 8. Frontend - Order Detail Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| FE-006 | Hiển thị chi tiết order - buyer | User = buyer | Truy cập /orders/[id] | Hiển thị order info, timeline, nút hành động |
| FE-007 | Hiển thị chi tiết order - seller | User = seller | Truy cập /orders/[id] | Hiển thị order info, form delivery (nếu LOCKED) |
| FE-008 | Hiển thị timeline các bước | Order tồn tại | Truy cập /orders/[id] | Timeline hiển thị PENDING → LOCKED → DELIVERED → COMPLETED |
| FE-009 | Đếm ngược 72h | Order status DELIVERED | Xem order | Hiển thị countdown timer |

---

## 9. Frontend - Seller Delivery Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| FE-010 | Hiển thị form delivery | Order status LOCKED, user = seller | Truy cập /orders/[id] | Form hiển thị input username, password |
| FE-011 | Submit delivery thành công | Form đã fill đúng | Click "Giao hàng" | Order chuyển DELIVERED, success message |
| FE-012 | Submit delivery - validation | Form empty | Click "Giao hàng" | Hiển thị validation errors |
| FE-013 | Submit delivery - không phải seller | User không phải seller | Truy cập /orders/[id] | Không hiển thị form delivery |

---

## 10. Frontend - Buyer View Game Info Tests

| ID | Test Case | Pre-condition | Steps | Expected Result |
| -- | --------- | -------------- | ----- | ----------------|
| FE-014 | Hiển thị nút xem TKGAME | Order status DELIVERED, user = buyer | Xem order | Hiển thị nút "Xem thông tin TKGAME" |
| FE-015 | Xem TKGAME thành công | Đã click nút | Click "Xem thông tin TKGAME" | Hiển thị username, password đã giải mã |
| FE-016 | Hiển thị nút xác nhận | Order status DELIVERED, user = buyer | Xem order | Hiển thị nút "Xác nhận đã nhận hàng" |
| FE-017 | Xác nhận thành công | Click nút xác nhận | Click "Xác nhận đã nhận hàng" | Order chuyển COMPLETED, success message |
| FE-018 | Không hiển thị TKGAME khi chưa deliver | Order status LOCKED | Xem order | Không hiển thị nút xem TKGAME |

---

## 11. E2E Tests

### 11.1 Full Buyer Flow

| ID | Test Case | Steps | Expected Result |
| -- | --------- | ----- | ----------------|
| E2E-001 | Mua hàng hoàn chỉnh | 1. Buyer login → 2. Xem listing → 3. Mua ngay → 4. Xem order → 5. Đợi deliver → 6. Xem TKGAME → 7. Xác nhận | Order COMPLETED, Coin đã chuyển |
| E2E-002 | Mua hàng - không đủ số dư | 1. Buyer login (ít coins) → 2. Mua listing đắt | Hiển thị lỗi, order không tạo |
| E2E-003 | Mua hàng - mua listing của chính mình | 1. Seller login → 2. Mua listing của mình | Hiển thị lỗi |

### 11.2 Full Seller Flow

| ID | Test Case | Steps | Expected Result |
| -- | --------- | ----- | ----------------|
| E2E-004 | Bán hàng hoàn chỉnh | 1. Có listing PUBLISHED → 2. Buyer mua → 3. Nhận notification → 4. Giao hàng → 5. Đợi complete | Order COMPLETED, Coin vào ví |
| E2E-005 | Giao hàng sai order | 1. Có 2 orders → 2. Giao nhầm order | Không cho phép, validation error |

### 11.3 Auto Complete Flow

| ID | Test Case | Steps | Expected Result |
| -- | --------- | ----- | ----------------|
| E2E-006 | Auto complete 72h | 1. Buyer mua → 2. Seller deliver → 3. Đợi 72h (hoặc test với shorter time) | Order tự COMPLETED |
| E2E-007 | Không auto complete khi có dispute | 1. Buyer mua → 2. Seller deliver → 3. Tạo dispute | Không auto complete |

### 11.4 Concurrency Tests

| ID | Test Case | Steps | Expected Result |
| -- | --------- | ----- | ----------------|
| E2E-008 | 2 buyer cùng mua 1 listing | 1. Listing PUBLISHED → 2. Buyer 1 mua → 3. Buyer 2 mua cùng lúc | Buyer 1 thành công, Buyer 2 thất bại |

---

## 12. Test Data Requirements

### Tài khoản Test

| Vai trò | Email | Password | Mục đích |
| ------- | ----- | -------- | -------- |
| Admin | admin@giaodich.com | admin123 | Full access |
| Seller | seller@giaodich.com | seller123 | Tạo listing, nhận order |
| Buyer | buyer@giaodich.com | buyer123 | Mua hàng |
| Buyer 2 | buyer2@giaodich.com | buyer2123 | Concurrency test |

### Listing Test

- Listing PUBLISHED với giá 1000 Coin
- Listing LOCKED (đã có người mua)
- Listing COMPLETED (đã hoàn tất)

### Wallet Test Data

- Seller với insurance fund đủ (10000 Coin)
- Seller với insurance fund gần giới hạn
- Buyer với số dư đủ (> price)
- Buyer với số dư không đủ (< price)

---

## 13. Test Environment Setup

### Backend

```bash
# Start API server
cd apps/api
npm run start:dev

# Run tests
cd apps/api
npm run test
```

### Frontend

```bash
# Start web server
cd apps/web
npm run dev
```

### Database

```bash
# Reset database and seed
npm run db:reset
npm run db:seed
```

---

## 14. Test Tools

- **Backend:** Jest, Supertest
- **Frontend:** Playwright
- **Manual:** Postman/curl cho API testing
- **Database:** PostgreSQL queries để verify data

---

## 15. Priority Test Cases

### P0 - Must Pass (Pre-deployment)

1. ORD-001: Tạo order thành công
2. ORD-009: Giao hàng thành công
3. ORD-014: Xác nhận sớm thành công
4. BULL-001: Auto complete 72h
5. WAL-001 → WAL-003: HOLD → RELEASE → SETTLE
6. E2E-001: Full buyer flow
7. E2E-004: Full seller flow

### P1 - Should Pass

1. Insurance fund check
2. Encryption/Decryption
3. Notifications
4. Frontend flows

### P2 - Nice to Have

1. Edge cases
2. Error handling
3. UI polish

---

## 16. Success Criteria

- Tất cả P0 test cases pass
- Tỷ lệ pass > 90% cho P1
- Không có critical bugs
- E2E flows hoạt động end-to-end
