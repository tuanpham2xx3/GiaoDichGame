# Sprint Plan & Roadmap
## Dự án: GIAODICHGAME C2C Marketplace

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-12
> Mỗi Sprint: 2 tuần | Tech: Monorepo (Next.js + NestJS) + PostgreSQL + Redis/BullMQ + Docker

---

## Tổng quan Roadmap

```
Sprint 0  →  Sprint 1  →  Sprint 2  →  Sprint 3  →  Sprint 4  →  Sprint 5
[Setup]    [Auth+Wallet]  [Market]   [Order+BullMQ] [Dispute]  [VIP+Pin+UAT]
```

---

## Sprint 0 – Setup & Architecture (1 tuần)

**Mục tiêu:** Nền tảng kỹ thuật sẵn sàng, mọi thành viên dev có thể chạy được local.

### Tasks:
- [ ] Khởi tạo Monorepo (Nx hoặc Turborepo)
- [ ] Setup Next.js (App Router, TypeScript, ESLint, Prettier)
- [ ] Setup NestJS (TypeScript, modules cơ bản)
- [ ] Cấu hình Docker Compose: PostgreSQL, Redis, Nginx
- [ ] Kết nối ORM (Drizzle ORM) → PostgreSQL
- [ ] Setup BullMQ + Redis connection
- [ ] CI/CD pipeline cơ bản (GitHub Actions: lint + build check)
- [ ] Tạo database migration đầu tiên (bảng `users`)
- [ ] Cấu hình shared types/interfaces giữa FE và BE

**Definition of Done:** `docker-compose up` → tất cả service healthy, `npm run dev` chạy được.

---

## Sprint 1 – Auth & Wallet (2 tuần)

**Mục tiêu:** Người dùng đăng ký, đăng nhập, nạp/rút tiền hoạt động.

### Backend:
- [ ] Module Auth: register, login (JWT + Refresh Token), logout
- [ ] Middleware xác thực, RBAC Guard
- [ ] Module Wallet: Ledger pattern, bảng `wallet_transactions`
- [ ] API nạp Coin thủ công (tạo request, Admin confirm)
- [ ] API nạp Coin gateway (tích hợp mock/webhook cơ bản)
- [ ] API rút Coin (tự động, mock bank API)
- [ ] API Quỹ Bảo Hiểm (deposit, kiểm tra điều kiện rút)
- [ ] Unit test: Ledger SUM, HOLD logic, lock fund

### Frontend:
- [ ] Trang Đăng ký / Đăng nhập
- [ ] Layout chính (Header, Footer, Nav)
- [ ] Trang Profile + Dashboard Ví Coin
- [ ] Form nạp Coin (2 phương thức)
- [ ] Form rút Coin

**Definition of Done:** Register → Login → Nạp coin (confirm thủ công) → Số dư hiển thị đúng.

---

## Sprint 2 – Marketplace (2 tuần)

**Mục tiêu:** Seller đăng bài, Buyer xem và tìm bài.

### Backend:
- [ ] Module Games: CRUD game (Mod), API public danh sách
- [ ] Schema Builder API: Mod tạo/sửa JSON schema thuộc tính game
- [ ] Module Listings: đăng bài (validate dynamic attributes), sửa, xóa
- [ ] API danh sách listing: filter, sort (Pin → BH cao → mới), phân trang
- [ ] API chi tiết listing
- [ ] Upload ảnh (local disk S3-compatible)

### Frontend:
- [ ] Trang chủ: danh sách listing (SSR, SEO meta tags)
- [ ] Trang chi tiết listing (SSR)
- [ ] Form đăng bài: chọn game → render form động theo schema
- [ ] Trang quản lý bài đăng (Seller)
- [ ] Admin Panel: Schema Builder UI cho Mod
- [ ] Bộ lọc bên trái (filter by game attributes)

**Definition of Done:** Seller đăng được bài, Buyer xem được danh sách + filter, Google có thể index trang.

---

## Sprint 3 – Order & Escrow (2 tuần)

**Mục tiêu:** Luồng mua-bán-escrow-72h hoạt động end-to-end.

### Backend:
- [ ] Module Order: tạo đơn (atomic HOLD + LOCKED)
- [ ] API Seller giao hàng (mã hóa AES thông tin TKGAME)
- [ ] API Buyer xem thông tin TKGAME (giải mã)
- [ ] API Buyer xác nhận nhận hàng sớm
- [ ] BullMQ Worker: job `AUTO_COMPLETE` (72h sau DELIVERED)
- [ ] BullMQ: retry logic (3 lần), dead-letter queue
- [ ] Wallet integration: SETTLE Coin → Seller khi COMPLETED
- [ ] Kiểm tra Quỹ BH: chặn giao dịch nếu vượt hạn mức

### Frontend:
- [ ] Flow mua hàng (confirm modal → đặt cọc Coin)
- [ ] Trang chi tiết đơn hàng (timeline status)
- [ ] Seller: form nhập thông tin TKGAME sau khi có đơn
- [ ] Buyer: xem thông tin TKGAME (sau delivery)
- [ ] Countdown 72h hiển thị trực quan

**Definition of Done:** End-to-end mua hàng → giao hàng → 72h tự động hoàn tất → Coin vào ví Seller.

---

## Sprint 4 – Dispute System (2 tuần)

**Mục tiêu:** Hệ thống tranh chấp hoạt động đầy đủ.

### Backend:
- [ ] Module Dispute: tạo ticket, validate trong 72h sau DELIVERED
- [ ] BullMQ: job `AUTO_REFUND` (48h sau tạo ticket, Seller chưa reply)
- [ ] API Seller gửi bằng chứng (upload files)
- [ ] Chat API: gửi/nhận message (ticket-based polling/SSE)
- [ ] API Mod/Admin phán quyết (REFUND hoặc RELEASE)
- [ ] Wallet integration: RELEASE/SETTLE theo phán quyết
- [ ] Notification: in-app notification khi có dispute mới

### Frontend:
- [ ] Trang tạo ticket (Buyer) + upload bằng chứng
- [ ] Trang dispute detail: chat 3 bên, timeline
- [ ] Seller: giao diện phản hồi + upload bằng chứng
- [ ] Mod/Admin: dashboard danh sách disputes, giao diện phán quyết

**Definition of Done:** Buyer mở dispute → Seller phản hồi đúng hạn → Mod phán quyết → Coin settle đúng.

---

## Sprint 5 – VIP, Pin & UAT (2 tuần)

**Mục tiêu:** Monetization hoàn thiện, system test, sẵn sàng launch.

### Backend:
- [ ] Module VIP: CRUD packages (Admin), mua VIP (deduct Coin)
- [ ] BullMQ: job `VIP_EXPIRY`
- [ ] Module Pin: config giá (Admin), mua Pin (deduct Coin)
- [ ] BullMQ: job `PIN_EXPIRY`
- [ ] Admin Panel APIs: quản lý users, stats dashboard, confirm nạp TK

### Frontend:
- [ ] Trang mua VIP (chọn gói, thanh toán Coin)
- [ ] Hiển thị VIP badge/màu tên trên profile, listing
- [ ] Trang mua Pin bài (Seller)
- [ ] Admin Panel: tạo/sửa gói VIP, sửa giá Pin
- [ ] Trang thống kê Admin (tổng Coin, đơn hàng, dispute)

### Testing & UAT:
- [ ] Concurrency test: 2 Buyer cùng mua 1 listing → chỉ 1 thành công
- [ ] Stress test: BullMQ jobs không miss sau restart server
- [ ] End-to-end flow test: Register → Buy → Dispute → Resolve
- [ ] Security: scan XSS, SQL injection, JWT tampering
- [ ] Performance: Lighthouse score > 80 cho trang listing

**Definition of Done:** Tất cả flow hoạt động, performance đạt yêu cầu, sẵn sàng release v1.0.

---

## Ngoài lề (Backlog – Giai đoạn sau)

| Feature | Ưu tiên | Ghi chú |
|---|---|---|
| Tích hợp quảng cáo banner | Thấp | Giai đoạn 2 |
| Đánh giá Seller (Review) | Trung bình | Sau Sprint 5 |
| Thông báo Email (SendGrid) | Trung bình | Sprint 3-4 |
| Thông báo Real-time (WebSocket) | Trung bình | Thay polling |
| Báo cáo/tố cáo bài đăng | Thấp | |
| API Mobile | Thấp | Xa hơn |
