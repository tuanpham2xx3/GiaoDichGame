# GIAODICHGAME – Project Overview

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-12 | **Trạng thái:** Kickoff

---

## 1. Tóm tắt dự án

**GIAODICHGAME** là nền tảng C2C (Customer-to-Customer) mua bán tài khoản game trực tuyến tại thị trường Việt Nam. Mô hình lai giữa Forum (EpicNPC-style) và E-commerce, trong đó nền tảng đóng vai trò **trung gian tài chính** thông qua hệ thống Coin nội bộ và cơ chế Escrow tự động.

---

## 2. Thông tin cơ bản

| Hạng mục | Chi tiết |
|---|---|
| Mô hình | C2C Marketplace |
| Thị trường | Việt Nam |
| Quy mô ban đầu | ~1.000 người dùng |
| Đồng tiền nội bộ | Coin (1 Coin = 1 VNĐ) |
| Nạp tiền | Cổng thanh toán tự động + chuyển khoản ngân hàng |
| Rút tiền | Tự động |
| Đăng nhập | Email / Password |

---

## 3. Các bên liên quan (Stakeholders)

| Role | Mô tả |
|---|---|
| **Buyer** | Người mua tài khoản game |
| **Seller** | Người bán tài khoản game (đăng bài ngay, uy tín qua quỹ bảo hiểm) |
| **Mod** | Quản lý danh mục game, thuộc tính game, xét duyệt tranh chấp |
| **Admin** | Toàn quyền hệ thống, cấu hình VIP/Pin, quản lý user |
| **Dev** | Xây dựng công cụ quản trị cho Mod/Admin |

---

## 4. Tính năng cốt lõi

```
[Escrow System]  →  Giam 72h, tự động hoàn tiền nếu không có khiếu nại
[Seller Fund]    →  Quỹ bảo hiểm: chặn giao dịch khi vượt hạn mức
[Dispute]        →  Buyer tạo ticket → Seller cung cấp bằng chứng → Mod/Admin phán quyết
[Marketplace]    →  Đăng bài ngay, 1 tài khoản/bài, thuộc tính game do Mod cấu hình
[Wallet]         →  Ledger pattern, ACID, Pessimistic Lock
[VIP & Pin]      →  Admin cấu hình tier VIP & giá Pin linh hoạt
```

---

## 5. Doanh thu nền tảng

- **Bán gói VIP:** đổi màu tên, avatar, hiệu ứng
- **Bán gói Pin bài:** ghim bài lên Top trang chủ
- **Quảng cáo:** từ các shop bên ngoài (giai đoạn sau)
- **Không thu phí giao dịch**

---

## 6. Tech Stack tóm tắt

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js (SSR, SEO) |
| Backend | NestJS (Monorepo) |
| Database | PostgreSQL (JSONB, ACID) |
| Queue | Redis + BullMQ |
| Deployment | Docker + Nginx |

---

## 7. Danh sách tài liệu dự án

| File | Nội dung |
|---|---|
| `01_BRD.md` | Business Requirements Document |
| `02_SRS.md` | Software Requirements Specification |
| `03_ERD_spec.md` | Database Schema & ERD |
| `04_api_outline.md` | API Module Outline |
| `05_sprint_plan.md` | Sprint Plan & Roadmap |
| `06_risk_register.md` | Risk Register |
