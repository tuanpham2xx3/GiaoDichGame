# Sprint 4 – Dispute System

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| Sprint | **Sprint 4 - Dispute System** |
| Thời gian | 2 tuần (2026-03-14 → 2026-03-28) |
| Mục tiêu | Hệ thống tranh chấp hoạt động đầy đủ |
| Prerequisites | Sprint 3 hoàn thành (Order + Escrow) |

---

## Mục tiêu (Objectives)

Buyer và Seller có thể mở tranh chấp khi giao dịch không thành công. Mod/Admin có thể xem xét và phán quyết. Hệ thống tự động refund sau 48h nếu Seller không phản hồi.

---

## Backend Tasks

### 1. Module Dispute - Core

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-BE-001 | Tạo bảng `disputes` (id, order_id, buyer_id, seller_id, reason, status, created_at, resolved_at) | P0 |
| DIS-BE-002 | API tạo dispute ticket (chỉ Buyer, trong 72h sau DELIVERED) | P0 |
| DIS-BE-003 | API lấy danh sách disputes (filter by status, buyer, seller) | P0 |
| DIS-BE-004 | API chi tiết dispute | P0 |
| DIS-BE-005 | Validate: chỉ mở dispute khi order status = DELIVERED và trong 72h | P0 |
| DIS-BE-006 | API cập nhật status dispute (PENDING → UNDER_REVIEW → RESOLVED) | P1 |

### 2. BullMQ - Auto Refund

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-BE-007 | Tạo bảng `dispute_settings` (admin config: auto_refund_hours, default: 6) | P0 |
| DIS-BE-008 | API Admin cập nhật thời gian auto refund (get/set config) | P0 |
| DIS-BE-009 | Tạo BullMQ job `AUTO_REFUND` - tự động refund sau X giờ (mặc định 6h) nếu Seller không reply | P0 |
| DIS-BE-010 | Retry logic (3 lần) nếu job fail | P0 |
| DIS-BE-011 | Dead-letter queue xử lý job fail quá 3 lần | P1 |
| DIS-BE-012 | API hủy dispute (Buyer withdraw trước khi Mod xem xét) | P1 |

### 3. Evidence Upload

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-BE-011 | API upload files (Buyer/Seller gửi bằng chứng) | P0 |
| DIS-BE-012 | Lưu files vào local disk/S3 (evidence_{dispute_id}/{buyer,seller}/) | P0 |
| DIS-BE-013 | API xem danh sách files trong dispute | P1 |
| DIS-BE-014 | Validate: file type (jpg, png, pdf), max 5MB/file, max 10 files/dispute | P1 |

### 4. Chat/Communication

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-BE-015 | API gửi message (Buyer, Seller, Mod đều gửi được) | P0 |
| DIS-BE-016 | API lấy messages (polling mỗi 5s hoặc SSE) | P0 |
| DIS-BE-017 | Validate: chỉ participants mới xem được | P0 |
| DIS-BE-018 | Tạo bảng `dispute_messages` (id, dispute_id, sender_id, content, created_at) | P0 |

### 5. Mod/Admin Judgment

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-BE-019 | API Mod phán quyết (RESOLVED: REFUND hoặc RELEASE) | P0 |
| DIS-BE-020 | Validate: chỉ Mod/Admin mới có quyền judge | P0 |
| DIS-BE-021 | API lấy danh sách disputes cho Mod/Admin (filter, sort, phân trang) | P0 |
| DIS-BE-022 | API thống kê disputes (total, by status, by game) | P1 |

### 6. Wallet Integration

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-BE-023 | REFUND: Release Escrow → Buyer (khi Mod quyết định refund) | P0 |
| DIS-BE-024 | RELEASE: Settle Escrow → Seller (khi Mod quyết định release) | P0 |
| DIS-BE-025 | Tạo bảng `dispute_resolutions` (id, dispute_id, decision, note, admin_id) | P0 |

### 7. Notifications

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-BE-026 | In-app notification khi có dispute mới (cho Seller + Mod) | P1 |
| DIS-BE-027 | In-app notification khi có message mới trong dispute | P1 |
| DIS-BE-028 | In-app notification khi có phán quyết (Buyer + Seller) | P1 |

---

## Frontend Tasks

### 1. Buyer - Create Dispute

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-FE-001 | Button "Mở tranh chấp" trong Order Detail (chỉ hiện khi đủ điều kiện) | P0 |
| DIS-FE-002 | Form tạo dispute: chọn lý do (dropdown), nhập mô tả | P0 |
| DIS-FE-003 | Form upload bằng chứng (drag & drop, preview) | P0 |
| DIS-FE-004 | Validation: mô tả tối thiểu 20 ký tự | P0 |
| DIS-FE-005 | Toast/Alert xác nhận tạo dispute thành công | P1 |

### 2. Buyer/Seller - Dispute Detail

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-FE-006 | Trang chi tiết dispute (route: /disputes/:id) | P0 |
| DIS-FE-007 | Hiển thị: order info, lý do, status, timeline | P0 |
| DIS-FE-008 | Chat panel: danh sách messages, input gửi message | P0 |
| DIS-FE-009 | Hiển thị files đã upload (của Buyer và Seller) | P0 |
| DIS-FE-010 | Countdown: thời gian còn lại để Mod phán quyết | P1 |

### 3. Seller - Response

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-FE-011 | Notification khi có dispute mới | P0 |
| DIS-FE-012 | Form phản hồi + upload bằng chứng | P0 |
| DIS-FE-013 | View messages từ Buyer và Mod | P0 |
| DIS-FE-014 | Button "Rút dispute" (Buyer withdraw) - trước khi Mod xem xét | P1 |

### 4. Mod/Admin - Dashboard

| Task | Mô tả | Ưu tiên |
|------|-------|----------|
| DIS-FE-015 | Trang danh sách disputes (/admin/disputes) | P0 |
| DIS-FE-016 | Filter: by status, by game, by date range | P0 |
| DIS-FE-017 | Sort: mới nhất, cũ nhất, sắp hết hạn | P0 |
| DIS-FE-018 | Phân trang (20 items/trang) | P0 |
| DIS-FE-019 | Trang chi tiết dispute cho Mod (/admin/disputes/:id) | P0 |
| DIS-FE-020 | Form phán quyết: chọn REFUND hoặc RELEASE, nhập ghi chú | P0 |
| DIS-FE-021 | Xem full chat history (3 bên) | P0 |
| DIS-FE-022 | Download files bằng chứng | P1 |
| DIS-FE-023 | Trang thống kê (/admin/disputes/stats) | P1 |
| DIS-FE-024 | Form cấu hình settings: thời gian auto refund (giờ) | P1 |

---

## Database Schema (Dispute Module)

```sql
-- disputes_settings table (Admin config)
CREATE TABLE dispute_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL UNIQUE,
  value VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- disputes table
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(50) NOT NULL, -- 'account_not_received', 'account_invalid', 'other'
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, UNDER_REVIEW, RESOLVED, WITHDRAWN
  decision VARCHAR(20), -- REFUND, RELEASE (null if not resolved)
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- dispute_messages table
CREATE TABLE dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_role VARCHAR(10) NOT NULL, -- buyer, seller, mod
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- dispute_evidence table
CREATE TABLE dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- dispute_resolutions table
CREATE TABLE dispute_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id),
  admin_id UUID NOT NULL REFERENCES users(id),
  decision VARCHAR(20) NOT NULL, -- REFUND, RELEASE
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | /api/disputes | Tạo dispute mới | Buyer |
| GET | /api/disputes | Danh sách disputes của user | User |
| GET | /api/disputes/:id | Chi tiết dispute | Participant |
| POST | /api/disputes/:id/messages | Gửi message | Participant |
| GET | /api/disputes/:id/messages | Lấy messages | Participant |
| POST | /api/disputes/:id/evidence | Upload file | Participant |
| GET | /api/disputes/:id/evidence | Lấy danh sách files | Participant |
| POST | /api/disputes/:id/withdraw | Rút dispute | Buyer |
| POST | /api/disputes/:id/judge | Phán quyết | Mod/Admin |
| GET | /api/admin/disputes | Danh sách (Mod/Admin) | Mod/Admin |
| POST | /api/admin/disputes/settings | Cập nhật settings (auto_refund_hours) | Mod/Admin |
| GET | /api/admin/disputes/stats | Thống kê | Mod/Admin |

---

## BullMQ Jobs

| Job Name | Trigger | Xử lý |
|----------|---------|-------|
| `DISPUTE_AUTO_REFUND` | Tạo dispute | Đợi X giờ (đọc từ dispute_settings, mặc định 6h), nếu Seller chưa reply → refund |
| `DISPUTE_REMINDER` | Tạo dispute | Notify Seller sau X/2 giờ chưa reply |

---

## Definition of Done

- [ ] Buyer mở dispute thành công (trong 72h sau DELIVERED)
- [ ] Seller nhận notification và phản hồi được
- [ ] Chat giữa Buyer-Seller-Mod hoạt động
- [ ] Upload/download files bằng chứng hoạt động
- [ ] Mod xem được danh sách disputes, filter/sort được
- [ ] Mod phán quyết (REFUND/RELEASE) thành công
- [ ] REFUND: Coin hoàn về Buyer
- [ ] RELEASE: Coin chuyển cho Seller
- [ ] Auto refund sau X giờ (mặc định 6h) nếu Seller không phản hồi
- [ ] Admin có thể cấu hình thời gian auto refund
- [ ] In-app notifications hoạt động

---

## Test Cases (TBD)

Xem chi tiết: `documents/Sprint/TESTCASE_4.md`

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Chat real-time performance | Dùng polling 5s trước, sau này upgrade SSE/WebSocket |
| File storage | Local disk phase 1, S3 phase 2 |
| Auto refund timing | Test kỹ BullMQ delay jobs |

---

## Estimated Effort

| Module | Backend (days) | Frontend (days) |
|--------|----------------|-----------------|
| Dispute Core | 3 | 2 |
| Evidence Upload | 2 | 1.5 |
| Chat | 2 | 2 |
| Mod/Admin | 2 | 2 |
| Wallet Integration | 1.5 | 0.5 |
| Notifications | 1 | 0.5 |
| Testing | 2 | 1.5 |
| **Total** | **13.5** | **10** |

---

## Next Sprint

Sprint 5: VIP, Pin & UAT (xem `05_sprint_plan.md`)
