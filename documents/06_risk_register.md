# Risk Register
## Dự án: GIAODICHGAME C2C Marketplace

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-12
> **Mức độ:** 🔴 Cao | 🟠 Trung bình | 🟡 Thấp

---

## 1. Risk Matrix

| Khả năng xảy ra \ Tác động | Thấp | Trung bình | Cao |
|---|---|---|---|
| **Cao** | 🟡 | 🟠 | 🔴 |
| **Trung bình** | 🟡 | 🟠 | 🟠 |
| **Thấp** | 🟡 | 🟡 | 🟠 |

---

## 2. Rủi ro Kỹ thuật

### RISK-T01 🔴 Race Condition khi mua hàng
- **Mô tả:** 2 Buyer cùng bấm mua 1 listing cùng lúc → cả 2 đều HOLD Coin nhưng 1 người mất tiền
- **Khả năng:** Cao
- **Tác động:** Cao (mất tiền user, mất uy tín nền tảng)
- **Giảm thiểu:**
  1. Sử dụng `SELECT ... FOR UPDATE` (Pessimistic Lock) trên `listings` khi đổi status
  2. Kiểm tra `status = PUBLISHED` trong cùng transaction với HOLD Coin
  3. Viết integration test concurrency (2 request song song)

---

### RISK-T02 🔴 Mất job BullMQ khi server restart
- **Mô tả:** Server restart đột ngột → job 72h tự động hoàn tất bị mất → Seller không nhận được tiền
- **Khả năng:** Trung bình
- **Tác động:** Cao
- **Giảm thiểu:**
  1. BullMQ persistence trên Redis (AOF/RDB enabled)
  2. Khi khởi động app: scan orders DELIVERED > 72h chưa COMPLETED → requeue
  3. Dead-letter queue cho failed jobs + cảnh báo Admin

---

### RISK-T03 🟠 Ledger bị lỗi tính toán số dư
- **Mô tả:** Bug trong code tính SUM → hiển thị số dư sai → user hoặc hệ thống thực hiện giao dịch không hợp lệ
- **Khả năng:** Thấp
- **Tác động:** Cao
- **Giảm thiểu:**
  1. Unit test đầy đủ cho hàm tính số dư
  2. Tuyệt đối không dùng cache số dư — luôn tính từ Ledger
  3. Định kỳ chạy reconciliation job kiểm tra tính nhất quán

---

### RISK-T04 🟠 Lộ thông tin tài khoản game
- **Mô tả:** Database bị truy cập trái phép → thông tin username/password tài khoản game của tất cả đơn hàng bị lộ
- **Khả năng:** Thấp
- **Tác động:** Cao (ảnh hưởng toàn bộ user đã giao dịch)
- **Giảm thiểu:**
  1. Mã hóa AES-256 tất cả dữ liệu trong `order_deliveries`
  2. Key AES lưu trong environment variable, không trong DB
  3. Giải mã chỉ tại runtime, không lưu plaintext ở cache

---

### RISK-T05 🟠 Cổng thanh toán webhook thất bại/giả mạo
- **Mô tả:** Webhook nạp tiền không đến (timeout) hoặc bị giả mạo → user nạp tiền không được cộng Coin / hệ thống bị cộng Coin fake
- **Khả năng:** Trung bình
- **Tác động:** Trung bình
- **Giảm thiểu:**
  1. Verify chữ ký webhook (HMAC signature từ cổng TT)
  2. Idempotency key: mỗi gateway_ref chỉ được xử lý 1 lần
  3. Retry webhook: nếu callback thất bại, cổng TT sẽ retry - handle idempotent

---

### RISK-T06 🟡 Schema dynamic mất tương thích ngược
- **Mô tả:** Mod thay đổi schema game → các bài đăng cũ có attributes không khớp schema mới
- **Khả năng:** Cao
- **Tác động:** Thấp (chỉ hiển thị sai, không mất tiền)
- **Giảm thiểu:**
  1. Lưu `schema_version` trong mỗi listing
  2. Render dựa trên schema tại thời điểm đăng bài
  3. Mod chỉ được sửa schema khi không có listing PUBLISHED với game đó (hoặc allow với cảnh báo)

---

## 3. Rủi ro Nghiệp vụ

### RISK-B01 🔴 Gian lận tài khoản game (Fraud)
- **Mô tả:** Seller bán tài khoản game rồi lấy lại (đổi email/pass) sau 72h → Buyer mất tài khoản nhưng không có khiếu nại kịp
- **Khả năng:** Cao (đặc thù thị trường)
- **Tác động:** Cao
- **Giảm thiểu:**
  1. Hệ thống 72h holds đủ dài để Buyer kiểm tra
  2. Hướng dẫn Buyer đổi email ngay sau khi nhận tài khoản
  3. Buyer đánh giá Seller sau khi nhận (cảnh báo cộng đồng)
  4. Quỹ Bảo Hiểm của Seller tạo rào cản tài chính cho Seller xấu

---

### RISK-B02 🟠 Rửa tiền qua Coin
- **Mô tả:** User dùng nền tảng để nạp/rút Coin nhằm mục đích rửa tiền
- **Khả năng:** Thấp
- **Tác động:** Cao (pháp lý)
- **Giảm thiểu:**
  1. Lưu KYC bank account khi rút tiền
  2. Giới hạn số tiền rút/ngày (đề xuất: 50 triệu VNĐ/ngày)
  3. Admin review thủ công với giao dịch rút lớn bất thường

---

### RISK-B03 🟠 Seller rút Quỹ Bảo Hiểm trước khi đơn hàng resolve
- **Mô tả:** Seller cố tình rút quỹ bảo hiểm trong khi có dispute → Buyer không có gì bảo đảm
- **Khả năng:** Thấp (đã có rule 14 ngày + 30 ngày)
- **Tác động:** Trung bình
- **Giảm thiểu:**
  1. Kiểm tra cứng: `blocked_insurance = SUM(HOLD + DISPUTED orders)`
  2. Chỉ cho rút phần dư = `insurance_balance - blocked_insurance`

---

### RISK-B04 🟡 Mod lạm quyền trong Dispute
- **Mô tả:** Mod ra phán quyết không công bằng (ưu tiên bạn bè/quen biết)
- **Khả năng:** Thấp
- **Tác động:** Trung bình (uy tín nền tảng)
- **Giảm thiểu:**
  1. Admin có thể override quyết định của Mod
  2. Lưu full audit log mọi action Mod/Admin trong dispute
  3. User có thể escalate lên Admin nếu không đồng ý với Mod

---

## 4. Rủi ro Vận hành

### RISK-O01 🟠 Scale PostgreSQL bị bottleneck
- **Mô tả:** ~1.000 user với nhiều giao dịch đồng thời → PostgreSQL quá tải, đặc biệt SUM() Ledger
- **Khả năng:** Thấp (1.000 user chưa đến mức này)
- **Tác động:** Trung bình
- **Giảm thiểu:**
  1. Index đúng trên `wallet_transactions`
  2. Read replica nếu cần (giai đoạn 2)
  3. Caching số dư với invalidation khi có giao dịch (thận trọng)

---

### RISK-O02 🟡 Redis bị xóa dữ liệu
- **Mô tả:** Redis restart mà không có persistence → mất toàn bộ BullMQ jobs đang pending
- **Khả năng:** Trung bình (config sai)
- **Tác động:** Cao
- **Giảm thiểu:**
  1. Redis config: `appendonly yes` (AOF persistence)
  2. Backup Redis định kỳ
  3. Startup reconciliation (xem RISK-T02)

---

## 5. Tổng hợp Action Items

| Risk | Owner | Thời hạn xử lý |
|---|---|---|
| RISK-T01 (Race condition) | Dev Backend | Sprint 3 |
| RISK-T02 (BullMQ lost) | Dev Backend | Sprint 3 |
| RISK-T03 (Ledger bug) | Dev Backend | Sprint 1 |
| RISK-T04 (Encrypt data) | Dev Backend | Sprint 3 |
| RISK-T05 (Webhook fraud) | Dev Backend | Sprint 1 |
| RISK-B01 (Game fraud) | Product + Mod | Policy, Sprint 4 |
| RISK-B02 (Money launder) | Admin + Legal | Sprint 5 |
| RISK-O02 (Redis config) | DevOps | Sprint 0 |
