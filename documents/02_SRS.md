# SRS – Software Requirements Specification
## Dự án: GIAODICHGAME C2C Marketplace

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-12

---

## 1. Tổng quan hệ thống

### 1.1 Mục tiêu
Tài liệu này mô tả chi tiết các yêu cầu chức năng và phi chức năng của hệ thống GIAODICHGAME, phục vụ làm căn cứ phát triển và kiểm thử.

### 1.2 Kiến trúc tổng quan
```
[Next.js Frontend] ←→ [NestJS API Gateway]
                              ↓
          ┌───────────────────┼───────────────────┐
     [Auth Module]    [Wallet Module]    [Marketplace Module]
                              ↓
          ┌───────────────────┼───────────────────┐
     [Order Module]   [Dispute Module]   [VIP/Pin Module]
                              ↓
                      [BullMQ Workers]
                              ↓
                    [PostgreSQL] + [Redis]
```

---

## 2. Yêu cầu chức năng

---

### Module 1: Auth & User (UC-AUTH)

#### UC-AUTH-01: Đăng ký tài khoản
- **Actor:** Visitor
- **Input:** email, password, username
- **Validation:** email chưa tồn tại, password ≥ 8 ký tự
- **Output:** tạo User record, gửi email xác nhận (optional phase 1)
- **Business Rule:** mặc định gán role **USER** (system role), có thể mua/bán ngay

#### UC-AUTH-02: Đăng nhập
- **Actor:** User
- **Input:** email, password
- **Output:** JWT Access Token (15 phút) + Refresh Token (7 ngày)
- **Error:** sai password → 401, block sau 5 lần sai liên tiếp

#### UC-AUTH-03: Quản lý Profile
- Chỉnh sửa được: **avatar** và **tên hiển thị (username)** — cần permission `profile:edit`
- Xem lịch sử giao dịch Coin
- Xem danh sách bài đăng của bản thân

#### UC-AUTH-04: Dynamic RBAC – Quản lý Role
- **Actor:** Admin
- Hệ thống có 2 **System Role** không xóa được: `USER` (mặc định khi đăng ký), `ADMIN`.
- Admin tạo **Custom Role** (ví dụ: `Mod`, `Support`, `Content`).
- Admin gán **Permission** cho Custom Role từ danh sách permissions hệ thống.
- Permissions được check tại backend middleware — không hardcode trong code.
- **Quyền hiệu quả** của một user = union của permissions từ toàn bộ roles đang có.

**Ví dụ cấu hình:**
```
Role "Mod"  → permissions: [game:manage, dispute:resolve, listing:moderate]
Role "Support" → permissions: [dispute:resolve, topup:confirm]
Role "Content" → permissions: [game:manage, listing:moderate]
```

#### UC-AUTH-05: Phong/Thu hồi Role cho User
- **Actor:** Admin
- Admin tìm kiếm user → xem danh sách role hiện tại
- Admin thêm hoặc xóa role cho user
- Role `USER` và `ADMIN` là system role — `USER` không thể thu hồi
- Thay đổi có hiệu lực ngay (JWT không cần reissue — permission check luôn pull từ DB/cache)

#### UC-AUTH-06: Xem quyền của bản thân
- **Actor:** User
- Endpoint `/auth/me` trả về danh sách permissions hiện có
- Frontend dùng để ẩn/hiện menu/button phù hợp

---

### Module 2: Wallet & Ledger (UC-WALLET)

#### UC-WALLET-01: Nạp Coin (Tự động)
- Tích hợp cổng thanh toán: MoMo / VNPay / ZaloPay
- Flow: User chọn số Coin → redirect cổng TT → callback webhook → ghi Ledger → cộng Coin
- Tỉ lệ: 1 VNĐ = 1 Coin
- Trạng thái: PENDING → SUCCESS / FAILED

#### UC-WALLET-02: Nạp Coin (Thủ công - Chuyển khoản)
- User tạo yêu cầu nạp, hệ thống hiển thị số TK ngân hàng + nội dung chuyển khoản (mã giao dịch)
- Admin xác nhận → ghi Ledger → cộng Coin

#### UC-WALLET-03: Rút Coin (Tự động)
- User nhập số Coin muốn rút + chọn tài khoản ngân hàng đã đăng ký
- Hệ thống kiểm tra: số dư Coin khả dụng ≥ số Coin rút
- Ghi Ledger (DEBIT), gọi API chuyển khoản tự động
- Trạng thái: PENDING → SUCCESS / FAILED (hoàn Coin nếu FAILED)

#### UC-WALLET-04: Ledger Pattern
- **Bảng `wallet_transactions`**, KHÔNG có cột `balance` tĩnh
- Số dư thực = `SUM(amount) WHERE user_id = ?`
- Mọi thao tác đọc-ghi số dư phải dùng **Pessimistic Lock** (`SELECT ... FOR UPDATE`)
- Các loại giao dịch (type):
  - `TOPUP` – Nạp tiền
  - `WITHDRAW` – Rút tiền
  - `HOLD` – Khóa tiền mua hàng
  - `RELEASE` – Giải phóng tiền (hoàn trả)
  - `SETTLE` – Chuyển tiền cho Seller (hoàn tất đơn)
  - `INSURANCE_LOCK` – Nạp vào quỹ bảo hiểm
  - `INSURANCE_UNLOCK` – Rút quỹ bảo hiểm
  - `VIP_PURCHASE` – Mua VIP
  - `PIN_PURCHASE` – Mua Pin bài

#### UC-WALLET-05: Quỹ Bảo Hiểm Seller
- Seller nạp Coin vào Quỹ (ghi type = `INSURANCE_LOCK`)
- Hệ thống tự động chặn giao dịch mới nếu: `SUM(giá trị đơn HOLD + DISPUTED) > số dư quỹ`
- Rút quỹ: yêu cầu 30 ngày từ lần nạp cuối **AND** 14 ngày không có đơn nào

---

### Module 3: Marketplace (UC-MARKET)

#### UC-MARKET-01: Đăng bài bán tài khoản
- Seller chọn Game → hệ thống render form thuộc tính động theo schema của game
- Input: tiêu đề, mô tả, giá (Coin), hình ảnh (≤ 5 ảnh), game_attributes (JSON)
- Validate: giá > 0, game tồn tại, thuộc tính required đầy đủ
- Trạng thái ban đầu: `PUBLISHED`

#### UC-MARKET-02: Xem danh sách bài đăng
- Lọc theo: game, giá (min/max), rank, server,...
- Sắp xếp: Pinned → Bảo hiểm cao → Mới nhất
- Phân trang: 20 items/trang
- SSR (Next.js) để SEO

#### UC-MARKET-03: Chi tiết bài đăng
- Hiển thị thông tin tài khoản (trừ pass, thông tin nhạy cảm)
- Hiển thị lịch sử đánh giá của Seller
- Nút "Mua ngay" (chỉ khi trạng thái = PUBLISHED)

#### UC-MARKET-04: Quản lý Game & Schema (Mod)
- Mod thêm/sửa/xóa game (tên, icon, slug)
- Mod dùng **Schema Builder** để định nghĩa thuộc tính:
  - Tên field, label hiển thị, kiểu dữ liệu (text/number/select), bắt buộc (boolean), options (nếu select)
- Lưu schema dạng JSON vào DB

#### UC-MARKET-05: Trạng thái Bài đăng
```
PUBLISHED → (Buyer mua) → LOCKED → (Seller giao) → DELIVERED
    ↓                                    ↓              ↓
(Seller xóa)                      (72h timeout)   (Buyer khiếu nại)
    ↓                                    ↓              ↓
DELETED                            COMPLETED        DISPUTED
```

---

### Module 4: Order & Escrow (UC-ORDER)

#### UC-ORDER-01: Tạo đơn hàng
1. Buyer bấm "Mua ngay"
2. Hệ thống kiểm tra: Buyer đủ Coin? Bài đang PUBLISHED?
3. **Transaction atomically:**
   - Ghi `HOLD` vào Ledger (trừ Coin Buyer)
   - Tạo Order record (status = PENDING)
   - Cập nhật Listing status → LOCKED
4. Thông báo Seller

#### UC-ORDER-02: Seller giao hàng
- Seller vào Order, nhập thông tin tài khoản game (username/password, mã backup,...) — **mã hóa AES trước khi lưu**
- Hệ thống giải mã và hiển thị cho Buyer
- Cập nhật Order status → DELIVERED
- BullMQ enqueue job: `AUTO_COMPLETE` sau 72h

#### UC-ORDER-03: Tự động hoàn tất (BullMQ)
- Job chạy sau 72h kể từ DELIVERED
- Kiểm tra: nếu Order vẫn DELIVERED (không có dispute) → chuyển COMPLETED
- Ghi `SETTLE` vào Wallet Ledger (cộng Coin cho Seller)

#### UC-ORDER-04: Buyer xác nhận sớm
- Buyer có thể bấm "Xác nhận nhận hàng" trước 72h → hoàn tất ngay

---

### Module 5: Dispute & Ticket (UC-DISPUTE)

#### UC-DISPUTE-01: Tạo khiếu nại
- Buyer tạo ticket trong vòng 72h kể từ DELIVERED
- Input: lý do, mô tả, file đính kèm (ảnh/video bằng chứng)
- Order chuyển → DISPUTED, đồng hồ 72h dừng lại

#### UC-DISPUTE-02: Seller phản hồi
- Hệ thống thông báo Seller (in-app + email)
- Seller có **48h** để phản hồi bằng chứng
- Nếu **quá 48h không phản hồi** → hệ thống tự động hoàn tiền Buyer (ghi `RELEASE` Ledger)
- Nếu Seller phản hồi → Mod/Admin được notify để vào xử lý

#### UC-DISPUTE-03: Chat 3 bên
- Giao diện chat **ticket-based** (không cần WebSocket phase 1, dùng polling/SSE)
- 3 bên có thể gửi message + đính kèm file
- Chỉ Mod/Admin thấy toàn bộ lịch sử

#### UC-DISPUTE-04: Phán quyết Mod/Admin
- Mod/Admin xem xét bằng chứng 2 bên
- Hành động có thể: Hoàn tiền Buyer / Giải phóng tiền Seller
- Ghi kết quả vào Ledger tương ứng, đóng ticket

---

### Module 6: VIP & Pin (UC-PREMIUM)

#### UC-PREMIUM-01: Cấu hình VIP (Admin)
- Admin tạo gói VIP: tên, giá Coin, thời hạn (ngày), quyền lợi (màu tên, frame avatar, badge, hiệu ứng)
- Lưu dạng JSON config, không cần deploy lại

#### UC-PREMIUM-02: Mua VIP
- User chọn gói VIP → ghi `VIP_PURCHASE` vào Ledger → tạo `user_vip` record (with expiry)
- BullMQ: enqueue job gỡ VIP khi hết hạn

#### UC-PREMIUM-03: Cấu hình Pin bài (Admin)
- Admin cấu hình giá Pin (Coin/ngày)
- Có thể giới hạn số slot Pin đang hoạt động

#### UC-PREMIUM-04: Mua Pin bài
- Seller chọn bài, chọn số ngày Pin → ghi `PIN_PURCHASE` → đánh dấu Listing `is_pinned = true, pin_expires_at`
- BullMQ: job gỡ pin khi hết hạn

---

### Module 7: Worker Service (UC-WORKER)

| Job | Trigger | Hành động |
|---|---|---|
| `AUTO_COMPLETE` | 72h sau DELIVERED | Hoàn tất đơn, cộng Coin Seller |
| `AUTO_REFUND` | 48h sau Dispute tạo, Seller chưa phản hồi | Hoàn Coin cho Buyer |
| `VIP_EXPIRY` | Thời gian hết hạn VIP | Gỡ VIP user |
| `PIN_EXPIRY` | Thời gian hết hạn Pin | Gỡ pin bài |
| `INSURANCE_UNLOCK` | Sau 30 ngày & 14 ngày không có đơn | Cho phép Seller rút quỹ |

---

## 3. Yêu cầu phi chức năng (Non-Functional Requirements)

| ID | Danh mục | Yêu cầu |
|---|---|---|
| NFR-01 | Hiệu năng | Trang listing tải < 2 giây (SSR cached) |
| NFR-02 | Tính toàn vẹn | Không có race condition khi 2 Buyer cùng mua 1 bài (Pessimistic Lock) |
| NFR-03 | Bảo mật | Thông tin tài khoản game mã hóa AES-256 |
| NFR-04 | Bảo mật | JWT stateless, Refresh Token rotation |
| NFR-05 | Độ tin cậy | BullMQ job phải có retry logic (3 lần) và dead-letter queue |
| NFR-06 | Khả năng mở rộng | Thêm game/VIP tier/giá Pin không cần release code |
| NFR-07 | Kiểm toán | Mọi biến động tài chính có audit trail đầy đủ |
| NFR-08 | SEO | Trang listing server-side rendered, có meta tags đầy đủ |

---

## 4. Màn hình chính (Screen Inventory)

| # | Màn hình | Role | Ghi chú |
|---|---|---|---|
| 1 | Trang chủ / Listing | Public | SSR, SEO |
| 2 | Chi tiết bài đăng | Public | SSR |
| 3 | Đăng ký / Đăng nhập | Visitor | CSR |
| 4 | Profile / Ví Coin | User | CSR |
| 5 | Đăng bài bán | Seller | CSR + Dynamic form |
| 6 | Quản lý bài đăng | Seller | CSR |
| 7 | Chi tiết đơn hàng | Buyer/Seller | CSR |
| 8 | Ticket Dispute | Buyer/Seller/Mod | CSR |
| 9 | Admin Panel | Admin/Mod | CSR |
| 10 | Schema Builder | Mod | CSR |
| 11 | VIP/Pin Config | Admin | CSR |
