---
name: Sprint 3 - Order & Escrow Implementation Plan
overview: "Triển khai Sprint 3: Order Module, Escrow 72h, BullMQ Workers, và Frontend flows. Bao gồm tạo đơn (HOLD + LOCKED), giao/nhận thông tin TKGAME, auto-complete 72h, và tích hợp Wallet."
todos:
  - id: order-backend
    content: "Tạo Orders Module: DB migration, service, controller, DTOs"
    status: pending
  - id: escrow-flow
    content: "Implement Escrow flow: HOLD → LOCKED → DELIVERED → COMPLETED"
    status: pending
  - id: encryption
    content: "Implement AES encryption for game account info delivery"
    status: pending
  - id: bullmq-worker
    content: "Implement BullMQ: AUTO_COMPLETE (72h), retry logic, dead-letter"
    status: pending
  - id: wallet-settle
    content: "Implement Wallet integration: SETTLE when order COMPLETED"
    status: pending
  - id: insurance-check
    content: "Implement Insurance Fund check: block if exceeds limit"
    status: pending
  - id: fe-order-flow
    content: "Frontend: Purchase flow (confirm modal → deposit Coin)"
    status: pending
  - id: fe-order-detail
    content: "Frontend: Order detail page with timeline"
    status: pending
  - id: fe-seller-delivery
    content: "Frontend: Seller delivery form (enter game account info)"
    status: pending
  - id: fe-buyer-view
    content: "Frontend: Buyer view game account info"
    status: pending
  - id: e2e-testing
    content: "E2E testing và bug fixes"
    status: pending
isProject: false
---

# Sprint 3 – Order & Escrow Implementation Plan

## Mục tiêu Sprint 3

**Mục tiêu:** Luồng mua-bán-escrow-72h hoạt động end-to-end.

**Permissions:**
- **Mặc định:** Tất cả USER đều là **BUYER** và **SELLER** — có thể mua và bán ngay sau khi đăng ký.
- **Tương lai:** Admin có thể custom permissions riêng cho từng user nếu cần (ví dụ: chỉ cho phép mua, hoặc chỉ cho phép bán).

**Definition of Done:** End-to-end mua hàng → giao hàng → 72h tự động hoàn tất → Coin vào ví Seller.

---

## 1. Backend – Orders Module (`apps/api/src/orders/`)

### Tạo mới files:

- `orders.module.ts` - Import DatabaseModule, WalletModule, Providers
- `orders.service.ts` - CRUD: createOrder, getOrders, getOrderById, deliverOrder, confirmReceipt, autoComplete
- `orders.controller.ts` - Endpoints theo API Outline
- `dto/order.dto.ts` - CreateOrderDto, DeliverOrderDto, ConfirmReceiptDto

### Endpoints:


| Method | Endpoint                        | Guard             | Mô tả                                 |
| ------ | ------------------------------- | ----------------- | -------------------------------------- |
| GET    | `/api/v1/orders`                | `order:view`      | Danh sách orders của user             |
| GET    | `/api/v1/orders/:id`            | `order:view`      | Chi tiết order                        |
| POST   | `/api/v1/orders`                | `order:create`    | Tạo order (HOLD + LOCKED)             |
| POST   | `/api/v1/orders/:id/deliver`    | `order:deliver`   | Seller giao thông tin TKGAME          |
| POST   | `/api/v1/orders/:id/confirm`    | `order:confirm`   | Buyer xác nhận nhận hàng (sớm)       |
| GET    | `/api/v1/orders/:id/game-info`  | `order:view`      | Buyer xem thông tin TKGAME (giải mã)  |


### DB Migration:

- Tạo bảng `orders` (buyer_id, seller_id, listing_id, price, status, game_info_encrypted, hold_transaction_id, settle_transaction_id, created_at, delivered_at, completed_at, expires_at)
- Tạo bảng `order_timeline` (order_id, status, note, created_at)

### Seed Data - Permissions:

Thêm permissions cho Orders trong seed data (tất cả USER có mặc định):

| Permission Key | Mô tả |
|---|---|
| `order:create` | Tạo order (mua hàng) |
| `order:deliver` | Giao thông tin TKGAME (bán hàng) |
| `order:confirm` | Xác nhận đã nhận hàng |
| `order:view` | Xem order của mình |

**Note:** Admin có thể revoke quyền này khỏi user cụ thể nếu muốn giới hạn.

```
PENDING → LOCKED (Buyer đặt cọc thành công)
         → DELIVERED (Seller đã giao thông tin)
         → COMPLETED (Buyer xác nhận hoặc 72h hết hạn)
         
PENDING → DISPUTED (Buyer tạo dispute - Sprint 4)
```

### Logic đặc biệt:

1. **Create Order (Atomic):**
   - Kiểm tra listing tồn tại + status = PUBLISHED
   - Kiểm tra seller != buyer
   - Kiểm tra Quỹ Bảo Hiểm: `Tổng giá trị Hold + Dispute > Số dư Quỹ BH` → chặn
   - Tạo HOLD transaction trong wallet (type: `HOLD`)
   - Cập nhật listing status → LOCKED
   - Tạo order với status LOCKED
   - Tạo BullMQ job `AUTO_COMPLETE` với delay 72h

2. **Deliver Order:**
   - Validate order status = LOCKED
   - Encrypt game info (AES-256-CBC với per-order key)
   - Lưu encrypted vào `game_info_encrypted`
   - Cập nhật order status → DELIVERED
   - Cập nhật `delivered_at`, gia hạn `expires_at` = delivered_at + 72h

3. **Confirm Receipt (Early):**
   - Validate order status = DELIVERED
   - RELEASE HOLD transaction (tạo transaction type: `RELEASE`)
   - SETTLE to seller (tạo transaction type: `SETTLE`)
   - Cập nhật order status → COMPLETED
   - Cập nhật `completed_at`
   - Cancel BullMQ job

4. **Auto Complete (BullMQ Worker):**
   - Job chạy sau 72h từ DELIVERED
   - Kiểm tra order status = DELIVERED (không có dispute)
   - RELEASE HOLD + SETTLE to seller
   - Cập nhật status → COMPLETED

---

## 2. Backend – Encryption Service (`apps/api/src/common/`)

### Tạo mới:

- `encryption.service.ts` - AES-256-CBC encrypt/decrypt
- Sử dụng per-order key được lưu trong order record

### Logic:

```typescript
// Encrypt khi seller deliver
encryptGameInfo(info: string, orderId: number): string {
  const key = this.generateKey(); // 32 bytes
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(info, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}:${key.toString('hex')}`;
}

// Decrypt khi buyer xem
decryptGameInfo(encryptedData: string): string {
  const [ivHex, encrypted, keyHex] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(keyHex, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 3. Backend – BullMQ Workers (`apps/api/src/queue/`)

### Cập nhật existing queue module:

- Thêm queue `orders` vào BullModule
- Tạo processor cho `AUTO_COMPLETE` job

### Jobs:

| Job Name      | Data                    | Delay        | Retry              | On Failure     |
|---------------|------------------------|--------------|--------------------|----------------|
| `AUTO_COMPLETE` | `{ orderId: number }` | 72h (259200s) | 3 lần, backoff 1m | DLQ + notification |

### Logic:

```typescript
// Processor
async function handleAutoComplete(job: Job) {
  const { orderId } = job.data;
  const order = await ordersService.getOrderById(orderId);
  
  if (order.status === 'DELIVERED' && !order.disputed) {
    await ordersService.settleOrder(orderId);
  }
}

// Retry: 3 lần, mỗi lần sau 1 phút
// Nếu fail sau 3 lần → move to dead-letter queue + notify admin
```

### DLQ Handling:

- Log failed jobs
- Notify admin qua notification system
- Manual intervention required

---

## 4. Backend – Wallet Integration

### Cập nhật `wallet.service.ts`:

- `holdCoins(userId, amount, orderId)` - Tạo HOLD transaction
- `releaseHold(transactionId)` - Release HOLD (chuyển sang RELEASE)
- `settleToSeller(sellerId, amount, orderId)` - Tạo SETTLE transaction cho seller
- `getHoldBalance(userId)` - Tổng HOLD + DISPUTE đang active

### Insurance Fund Check:

```typescript
async checkInsuranceLimit(sellerId: number, additionalAmount: number): Promise<boolean> {
  const insuranceBalance = await this.insuranceService.getBalance(sellerId);
  const currentHoldBalance = await this.getHoldBalance(sellerId);
  const currentDisputeBalance = await this.getDisputeBalance(sellerId);
  
  const totalExposure = currentHoldBalance + currentDisputeBalance + additionalAmount;
  return totalExposure <= insuranceBalance;
}
```

### Cập nhật `topup.service.ts`:

- Thêm `getDisputeBalance(userId)` - Tổng amount đang trong DISPUTE

---

## 5. Backend – Notifications (Basic)

### Tạo mới `apps/api/src/notifications/`:

- `notifications.module.ts`
- `notifications.service.ts` - Store in-app notification
- `notifications.controller.ts`

### DB Migration:

- Tạo bảng `notifications` (user_id, type, title, content, data JSON, is_read, created_at)

### Events:

| Event                    | Recipient    | Title                           |
|--------------------------|--------------|--------------------------------|
| ORDER_CREATED            | Seller       | "Có đơn hàng mới #%orderId%"   |
| ORDER_DELIVERED          | Buyer        | "Đơn hàng #%orderId% đã giao" |
| ORDER_COMPLETED          | Seller       | "Đơn hàng #%orderId% hoàn tất" |
| ORDER_AUTO_COMPLETED     | Both         | "Đơn hàng #%orderId% tự động hoàn tất" |

---

## 6. Frontend – Order Pages (`apps/web/src/`)

### Tạo mới:


| Route                        | Component                      | Mô tả                          |
| ---------------------------- | ------------------------------ | ------------------------------ |
| `/orders`                    | orders/page.tsx               | Danh sách orders (mua/bán)    |
| `/orders/[id]`               | orders/[id]/page.tsx          | Chi tiết order + timeline      |
| `/orders/[id]/delivery`      | orders/[id]/delivery/page.tsx | Seller: giao thông tin TKGAME  |


### Components:

- `OrderCard.tsx` - Card hiển thị order
- `OrderTimeline.tsx` - Timeline các trạng thái
- `PurchaseModal.tsx` - Modal xác nhận mua (từ listing detail)
- `GameInfoDisplay.tsx` - Hiển thị thông tin TKGAME (đã giải mã)
- `CountdownTimer.tsx` - Đồng hồ đếm ngược 72h

### Mua hàng Flow:

```
1. Buyer xem listing → Bấm "Mua ngay"
2. Hiện Modal xác nhận:
   - Giá tiền
   - Số dư khả dụng
   - Nút "Xác nhận thanh toán"
3. Click → API POST /orders
4. Thành công → Redirect /orders/[id]
5. Thất bại → Hiện lỗi (số dư không đủ, BH không đủ,...)
```

### Seller Delivery Flow:

```
1. Seller vào /orders/[id] (role seller)
2. Thấy form nhập thông tin TKGAME
3. Nhập: username, password, các thông tin khác
4. Click "Giao hàng" → API POST /orders/:id/deliver
5. Order chuyển DELIVERED, Buyer được notify
```

### Buyer View Game Info Flow:

```
1. Buyer vào /orders/[id]
2. Nếu status = DELIVERED → Hiển thị nút "Xem thông tin TKGAME"
3. Click → API GET /orders/:id/game-info
4. Hiển thị thông tin đã giải mã
5. Nút "Xác nhận đã nhận hàng" (early complete)
```

---

## 7. Frontend – Update Listing Detail

### Cập nhật `/listings/[id]/page.tsx`:

- Thêm nút "Mua ngay" (nếu chưa đăng nhập → redirect login)
- Ẩn nút nếu user = seller của listing này

### Cập nhật `/my-listings/page.tsx`:

- Thêm cột "Số đơn" / "Đang bán"
- Link đến order liên quan

---

## 8. Frontend – Order Notifications

### Cập nhật Header:

- Hiển thị icon notification (chuông)
- Badge số notification chưa đọc
- Dropdown list notification

### Notification Types (Frontend):

- `ORDER_CREATED` - "Bạn có đơn hàng mới"
- `ORDER_DELIVERED` - "Thông tin TKGAME đã sẵn sàng"
- `ORDER_COMPLETED` - "Đơn hàng đã hoàn tất, Coin đã cộng"

---

## Thứ tự thực hiện (14 ngày)


| Ngày | Backend                              | Frontend                    |
| ---- | ------------------------------------ | --------------------------- |
| D1   | Orders: DB migration + module        | -                           |
| D2   | Orders: CRUD APIs + status logic    | -                           |
| D3   | Encryption service                   | -                           |
| D4   | Wallet: hold/release/settle methods  | -                           |
| D5   | Insurance check logic                 | -                           |
| D6   | BullMQ: AUTO_COMPLETE worker        | -                           |
| D7   | Notifications: module + seed data    | -                           |
| D8   | -                                     | Purchase modal + flow      |
| D9   | -                                     | Order detail + timeline    |
| D10  | -                                     | Seller delivery form       |
| D11  | -                                     | Buyer view game info       |
| D12  | -                                     | Order list page            |
| D13  | E2E test + fixes                     | Polish UI                  |
| D14  | Demo + docs                          | -                           |


---

## Verification Plan

### Backend Tests:

```bash
cd apps/api && npm run test
```

**Test cases:**

- Orders: create, deliver, confirm, auto-complete
- Encryption: encrypt/decrypt game info
- Wallet: HOLD → RELEASE → SETTLE flow
- Insurance: check limit before create order

### Manual API Tests:

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
```

### Frontend Verification:

1. `/listings/1` - Click "Mua ngay" → Modal confirm → Tạo order
2. `/orders/1` - Seller thấy form delivery
3. Seller delivery → Order chuyển DELIVERED
4. Buyer `/orders/1` - Click xem TKGAME → Hiển thị thông tin
5. Buyer click "Xác nhận đã nhận hàng" → COMPLETED
6. Verify Coin đã cộng vào seller wallet

### Concurrency Test:

```bash
# 2 Buyer cùng mua 1 listing
# Buyer 1: Tạo order thành công (listing LOCKED)
# Buyer 2: Tạo order thất bại (listing không còn PUBLISHED)
```

