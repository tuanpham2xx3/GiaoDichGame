# BRD – Business Requirements Document
## Dự án: GIAODICHGAME C2C Marketplace

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-12 | **Người soạn:** BA Team

---

## 1. Bối cảnh & Mục tiêu kinh doanh

### 1.1 Vấn đề hiện tại
Thị trường mua bán tài khoản game Việt Nam đang diễn ra phân tán trên các group Facebook, diễn đàn cá nhân — thiếu cơ chế bảo vệ tài chính, dễ bị lừa đảo, không có dispute resolution chuẩn hóa.

### 1.2 Mục tiêu kinh doanh
1. Xây dựng nền tảng C2C tin cậy cho thị trường Việt Nam với cơ chế Escrow tự động.
2. Tạo doanh thu thông qua VIP, Pin bài và quảng cáo — **không thu phí giao dịch**.
3. Mở rộng lên 1.000 người dùng trong giai đoạn đầu.

---

## 2. Các bên liên quan (Stakeholders)

| Stakeholder | Mô tả |
|---|---|
| **User** | Role mặc định khi đăng ký — có thể mua/bán ngay |
| **Admin** | Role hệ thống duy nhất được tạo sẵn — toàn quyền |
| **Mod / Support / ...** | Các role tùy chỉnh do Admin tạo ra và cấp quyền linh hoạt |
| Platform Owner | Vận hành, theo dõi doanh thu |

---

## 3. Yêu cầu nghiệp vụ (Business Requirements)

### BR-01: Hệ thống tài khoản người dùng & Dynamic RBAC
- Người dùng đăng ký bằng email/password → mặc định có role **USER**.
- Bất kỳ ai cũng có thể mua hàng và đăng bài bán ngay sau khi đăng ký.
- Uy tín Seller được thể hiện qua **số dư Quỹ Bảo Hiểm** đã nạp.

**Hệ thống phân quyền Dynamic RBAC:**
- Hệ thống có 2 role mặc định không thể xóa: **USER** và **ADMIN**.
- **Admin** có thể tạo thêm các role tùy chỉnh (ví dụ: Mod, Support, Content Manager,...).
- Admin gán **Permissions** (quyền hạn cụ thể) cho từng role.
- Admin **phong role** cho user — một user có thể có **nhiều role** cùng lúc.
- Quyền của user = **hợp (union)** của tất cả permissions từ tất cả role đang có.
- Admin có thể thu hồi role bất kỳ lúc nào.

**Danh sách Permissions hệ thống (seed mặc định):**

| Permission Key | Mô tả |
|---|---|
| `game:manage` | Thêm/sửa/xóa game và schema thuộc tính |
| `dispute:resolve` | Xem và ra phán quyết tranh chấp |
| `user:manage` | Xem/sửa/block user |
| `user:assign_role` | Phong role cho user |
| `role:manage` | Tạo/sửa/xóa role và permissions |
| `vip:manage` | Cấu hình gói VIP |
| `pin:manage` | Cấu hình giá Pin bài |
| `topup:confirm` | Xác nhận nạp tiền thủ công |
| `listing:moderate` | Ẩn/xóa bài đăng vi phạm |
| `stats:view` | Xem thống kê hệ thống |
| `profile:edit` | Chỉnh sửa avatar và tên hiển thị (username) |

### BR-02: Hệ thống Coin nội bộ
- Đơn vị: **Coin**, tỉ lệ cố định **1 Coin = 1 VNĐ**.
- Nạp Coin: cổng thanh toán tự động (MoMo/VNPay/ZaloPay) + chuyển khoản ngân hàng thủ công (admin xác nhận).
- Rút Coin: tự động qua thông tin ngân hàng đã đăng ký (Coin → VNĐ chuyển khoản).
- Mọi biến động số dư đều ghi vào **Ledger** (sổ cái bất biến).

### BR-03: Đăng bài bán tài khoản game
- Mỗi bài đăng = **1 tài khoản game duy nhất**.
- Seller chọn game từ danh sách do **Mod** quản lý.
- Thuộc tính của từng game (Rank, AR, Server,...) được **Mod cấu hình** thông qua công cụ do Dev xây dựng.
- Bài đăng hiển thị theo thứ tự: **Pinned → Bảo hiểm cao → Mới nhất**.

### BR-04: Quy trình mua hàng & Escrow
1. Buyer chọn bài, bấm Mua → Coin bị **Hold khỏi ví Buyer** ngay lập tức.
2. Bài đăng chuyển sang trạng thái **LOCKED** (không ai mua được nữa).
3. Seller giao thông tin tài khoản game cho Buyer trong hệ thống.
4. Bài đăng chuyển sang **DELIVERED**, đồng hồ đếm ngược **72 giờ** bắt đầu.
5. Nếu hết 72h không có khiếu nại → hệ thống tự động **COMPLETED**, Coin cộng vào ví Seller.
6. Nếu có khiếu nại → chuyển sang trạng thái **DISPUTED**.

### BR-05: Quỹ Bảo Hiểm Seller
- Seller chủ động nạp Coin vào **Quỹ Bảo Hiểm** để tăng uy tín.
- Hệ thống **chặn** giao dịch mới nếu: `Tổng giá trị đơn Hold + Dispute > Số dư Quỹ Bảo Hiểm`.
- Rút Quỹ Bảo Hiểm: phải chờ **30 ngày** kể từ lần nạp cuối **VÀ** không có giao dịch nào trong **14 ngày**.

### BR-06: Hệ thống Dispute (Tranh chấp)
- Buyer tạo ticket khiếu nại trong **thời gian quy định** (cần xác nhận: đề xuất 72h sau giao hàng).
- Seller nhận thông báo và phải **phản hồi bằng chứng** trong thời gian quy định (đề xuất: 48h).
- Nếu Seller **không phản hồi** đúng hạn → hệ thống tự động **hoàn tiền** cho Buyer.
- Nếu Seller **có bằng chứng** → Mod/Admin vào xem xét và ra phán quyết cuối cùng.
- Mod/Admin có thể: Hoàn tiền Buyer / Giải phóng tiền cho Seller / Chia tỉ lệ (nếu cần).

### BR-07: Danh mục Game & Thuộc tính động
- **Mod** thêm/sửa/xóa danh sách game thông qua Admin Panel.
- **Mod** cấu hình schema thuộc tính riêng cho từng game (tên field, kiểu dữ liệu, bắt buộc/không).
- Dev xây dựng giao diện Schema Builder cho Mod dùng.

### BR-08: Hệ thống VIP & Pin bài
- **Admin** tự tạo và chỉnh sửa các **gói VIP** (tên, giá, thời hạn, quyền lợi: màu tên, avatar frame, hiệu ứng).
- **Admin** cấu hình **giá Pin bài** (Coin/ngày hoặc Coin/tuần).
- Dev xây dựng công cụ Admin Panel để Admin quản lý mà không cần deploy lại.

### BR-09: Monetization (Doanh thu)
- Bán gói VIP bằng Coin từ ví người dùng.
- Bán Pin bài bằng Coin theo thời gian.
- Quảng cáo từ bên ngoài (giai đoạn sau, ngoài scope hiện tại).

---

## 4. Yêu cầu phi chức năng ở cấp nghiệp vụ

| Yêu cầu | Mô tả |
|---|---|
| Tính toàn vẹn tài chính | Không bao giờ mất/thừa Coin do lỗi hệ thống |
| Minh bạch | Mọi biến động Coin đều có lịch sử đầy đủ |
| Tốc độ | Trang bán hàng tải nhanh, SEO-friendly |
| Khả năng mở rộng | Thêm game mới, tier VIP mới mà không release code |
| Bảo mật | Dữ liệu tài khoản game được mã hóa khi giao cho Buyer |

---

## 5. Phạm vi dự án (Scope)

### In Scope ✅
- Đăng ký/Đăng nhập Email
- Ví Coin (Nạp/Rút/Ledger)
- Quỹ Bảo Hiểm Seller
- Đăng bài / Tìm kiếm / Lọc
- Quy trình mua-bán-Escrow-72h
- Hệ thống Dispute 3 bên
- BullMQ Worker (72h auto-complete, VIP/Pin expiry)
- VIP & Pin (Admin cấu hình)
- Schema Builder cho Mod
- Admin Panel cơ bản

### Out of Scope ❌ (Giai đoạn 1)
- Đăng nhập OAuth (Google/Facebook)
- Quảng cáo banner
- App Mobile
- Thị trường quốc tế / đa tiền tệ
- KYC/Verify CCCD
