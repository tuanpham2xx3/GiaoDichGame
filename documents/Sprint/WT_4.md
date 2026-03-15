---
name: Sprint 4 Workthrough
overview: "Hướng dẫn sử dụng các tính năng Sprint 4: Dispute System, Evidence Upload, Chat, và Admin Resolution."
isProject: false
---

# Sprint 4 – Workthrough & Hướng Dẫn Sử Dụng

## Mục tiêu Sprint 4

**Mục tiêu:** Hệ thống tranh chấp hoạt động đầy đủ.

**Definition of Done:** Buyer mở dispute → Seller phản hồi đúng hạn → Mod phán quyết → Coin settle đúng.

---

## 1. Tài khoản Test

Sau khi chạy `npm run db:seed`, hệ thống sẽ tạo các tài khoản test sau:

| Vai trò   | Email              | Password   | Quyền                                      |
| --------- | ------------------ | ---------- | ------------------------------------------ |
| Admin     | admin@giaodich.com | admin123   | Toàn quyền, giải quyết tranh chấp          |
| Mod       | mod@giaodich.com   | mod123     | Quản lý games, giải quyết tranh chấp       |
| Seller    | seller@giaodich.com| seller123  | Đăng bài, quản lý bài của mình             |
| Buyer     | buyer@giaodich.com | buyer123   | Xem danh sách, mua hàng, mở tranh chấp     |
| User      | user@giaodich.com  | user123    | Người dùng thông thường                    |

---

## 2. Dispute Status Flow

```
OPEN → Seller phản hồi (có evidence)
     → Mod xem xét
     → RESOLVED (REFUND hoặc RELEASE)

OPEN → Seller không phản hồi sau X giờ
     → AUTO_REFUND cho Buyer

OPEN → Buyer rút tranh chấp
     → WITHDRAWN
```

---

## 3. API Endpoints

### Disputes (Buyer/Seller)

| Method | Endpoint                        | Guard             | Mô tả                                 |
| ------ | ------------------------------- | ----------------- | -------------------------------------- |
| POST   | `/api/v1/disputes`              | `dispute:create`  | Buyer tạo dispute ticket              |
| GET    | `/api/v1/disputes`              | Auth              | Danh sách disputes của user           |
| GET    | `/api/v1/disputes/:id`          | Auth              | Chi tiết dispute + messages           |
| POST   | `/api/v1/disputes/:id/messages` | Auth              | Gửi tin nhắn trong dispute            |
| GET    | `/api/v1/disputes/:id/messages` | Auth              | Lấy lịch sử chat                      |
| POST   | `/api/v1/disputes/:id/evidence` | Auth              | Seller upload bằng chứng              |
| GET    | `/api/v1/disputes/:id/evidence` | Auth              | Lấy danh sách evidence                |
| PATCH  | `/api/v1/disputes/:id/withdraw` | `dispute:withdraw`| Buyer rút tranh chấp                  |

### Disputes Admin (Mod/Admin)

| Method | Endpoint                        | Guard             | Mô tả                                 |
| ------ | ------------------------------- | ----------------- | -------------------------------------- |
| GET    | `/api/v1/admin/disputes`        | `dispute:resolve` | Danh sách tất cả disputes             |
| GET    | `/api/v1/admin/disputes/:id`    | `dispute:resolve` | Chi tiết dispute (admin view)         |
| PATCH  | `/api/v1/admin/disputes/:id/resolve` | `dispute:resolve` | Mod phán quyết (REFUND/RELEASE)  |
| GET    | `/api/v1/admin/disputes/stats`  | `dispute:resolve` | Thống kê disputes                     |
| GET    | `/api/v1/admin/disputes/settings` | `dispute:resolve` | Lấy cấu hình auto_refund_hours   |
| PUT    | `/api/v1/admin/disputes/settings` | `dispute:resolve` | Cập nhật cấu hình                   |

---

## 4. Luồng Tạo Dispute (Buyer)

### Bước 1: Kiểm tra điều kiện tạo dispute

```
Điều kiện:
1. User là buyer của order
2. Order status = DELIVERED
3. Chưa quá 72h kể từ delivered_at
4. Chưa có dispute nào cho order này
```

### Bước 2: Tạo dispute ticket

```
1. Buyer truy cập /orders/[id]
2. Click "Mở tranh chấp" (chỉ hiển thị nếu thỏa điều kiện)
3. Form hiện ra:
   - Order ID (auto-fill)
   - Reason (dropdown: "Tài khoản không như mô tả", "Không đăng nhập được", etc.)
   - Description (textarea, tối thiểu 20 chars)
4. Click "Gửi tranh chấp"
5. API POST /disputes
6. Dispute created, status = OPEN
7. Order status → DISPUTED
8. Seller nhận notification
9. Mod/Admin nhận notification
```

### Bước 3: Theo dõi dispute

```
1. Buyer truy cập /disputes/[id]
2. Xem thông tin:
   - Order ID, Reason, Status
   - Timeline events
   - Chat messages
3. Gửi tin nhắn cho Seller/Mod
4. Upload bằng chứng (nếu cần)
```

---

## 5. Luồng Phản hồi Dispute (Seller)

### Bước 1: Nhận notification

```
1. Seller nhận notification "Dispute mới cho order #X"
2. Click notification → Redirect /disputes/[id]
```

### Bước 2: Xem chi tiết dispute

```
1. Seller xem thông tin dispute:
   - Buyer's reason
   - Order details
   - Timeline
2. Đọc tin nhắn từ Buyer
```

### Bước 3: Gửi phản hồi + Evidence

```
1. Seller nhập tin nhắn phản hồi
2. Upload bằng chứng (screenshots, logs, etc.)
   - File types: .jpg, .png, .pdf
   - Max size: 5MB/file
   - Max files: 10 files/dispute
3. Click "Gửi phản hồi"
4. API POST /disputes/:id/messages
5. API POST /disputes/:id/evidence
6. Tin nhắn + evidence được lưu
7. Buyer và Mod nhận notification
```

### Lưu ý quan trọng:

**Seller phải phản hồi trong X giờ** (default: 6 giờ) để tránh auto-refund.

---

## 6. Luồng Giải quyết Dispute (Mod/Admin)

### Bước 1: Xem danh sách disputes

```
1. Mod truy cập /admin/disputes
2. Xem danh sách với filters:
   - Status: OPEN, RESOLVED, WITHDRAWN
   - Date range
   - Game
3. Sort by: created_at, deadline
```

### Bước 2: Xem chi tiết dispute

```
1. Click vào dispute ticket
2. Xem đầy đủ thông tin:
   - Order details
   - Buyer's reason & description
   - Seller's response & evidence
   - Chat history (3-way: Buyer, Seller, Mod)
   - Timeline events
```

### Bước 3: Phán quyết

```
1. Mod xem xét bằng chứng từ cả 2 bên
2. Chọn quyết định:
   - REFUND: Hoàn tiền cho Buyer
   - RELEASE: Chuyển tiền cho Seller
3. Nhập ghi chú phán quyết (bắt buộc)
4. Click "Phán quyết"
5. API PATCH /admin/disputes/:id/resolve
6. Dispute status → RESOLVED
7. Wallet transaction được tạo:
   - REFUND: RELEASE hold → Buyer
   - RELEASE: SETTLE → Seller
8. Order status updated
9. Both parties nhận notification
```

---

## 7. Auto Refund Flow

### Cấu hình

```
Default: auto_refund_hours = 6 hours
Admin có thể thay đổi trong /admin/disputes/settings
```

### Hoạt động

```
1. Buyer tạo dispute (status = OPEN)
2. BullMQ job AUTO_REFUND created với delay = X hours
3. Nếu Seller phản hồi trước deadline:
   - Job cancelled
   - Chờ Mod phán quyết
4. Nếu Seller KHÔNG phản hồi sau X hours:
   - Job executes
   - Dispute status → RESOLVED (AUTO_REFUND)
   - Wallet: RELEASE hold → Buyer
   - Order status → CANCELLED
   - Notifications gửi Buyer & Seller
```

---

## 8. Withdraw Dispute (Buyer)

### Điều kiện

```
- Buyer là người tạo dispute
- Dispute status = OPEN (chưa được Mod giải quyết)
```

### Các bước

```
1. Buyer truy cập /disputes/[id]
2. Click "Rút tranh chấp"
3. Confirm action
4. API PATCH /disputes/:id/withdraw
5. Dispute status → WITHDRAWN
6. Order status → DELIVERED (khôi phục)
7. 72h auto-complete tiếp tục đếm
8. Seller nhận notification
```

---

## 9. Chat System

### Features

```
- Real-time messaging (polling every 5s)
- 3 participants: Buyer, Seller, Mod
- Message types:
  - Text message
  - File attachment (images, PDFs)
  - System events (tạo dispute, phán quyết, etc.)
- Message timeline hiển thị theo thứ tự thời gian
```

### API

```bash
# Gửi tin nhắn
POST /api/v1/disputes/:id/messages
Body: { message: string, attachmentUrls?: string[] }

# Lấy lịch sử
GET /api/v1/disputes/:id/messages
Response: [{ id, senderId, message, attachmentUrls, createdAt }]
```

---

## 10. Evidence Upload

### Rules

```
- Allowed types: .jpg, .png, .pdf
- Max file size: 5MB
- Max files per dispute: 10
- Only Seller can upload evidence (trong Sprint 4)
- Files lưu trữ local disk (Sprint 5+: S3/R2)
```

### API

```bash
# Upload
POST /api/v1/disputes/:id/evidence
Content-Type: multipart/form-data
Body: { file: File }

# Lấy danh sách
GET /api/v1/disputes/:id/evidence
Response: [{ id, filePath, fileName, fileType, fileSize, uploadedBy }]
```

---

## 11. Frontend Pages

| Route                        | Component                      | Mô tả                          |
| ---------------------------- | ------------------------------ | ------------------------------ |
| `/disputes`                  | disputes/page.tsx             | Danh sách disputes của user    |
| `/disputes/[id]`             | disputes/[id]/page.tsx        | Chi tiết dispute + chat        |
| `/orders/[id]`               | orders/[id]/page.tsx          | Có button "Mở tranh chấp"      |
| `/admin/disputes`            | admin/disputes/page.tsx       | Admin: danh sách disputes      |
| `/admin/disputes/[id]`       | admin/disputes/[id]/page.tsx  | Admin: chi tiết + phán quyết   |
| `/admin/disputes/settings`   | admin/disputes/settings/page.tsx | Admin: cấu hình auto-refund |

---

## 12. Notifications

### Dispute Events

| Event                    | Recipient    | Title                           |
| ------------------------ | ------------ | -------------------------------- |
| DISPUTE_CREATED          | Seller, Mod  | "Dispute mới cho order #%orderId%" |
| DISPUTE_MESSAGE          | Buyer, Seller, Mod | "Tin nhắn mới trong dispute" |
| DISPUTE_EVIDENCE         | Buyer, Mod   | "Seller gửi bằng chứng"         |
| DISPUTE_RESOLVED         | Buyer, Seller | "Dispute đã được giải quyết"   |
| DISPUTE_AUTO_REFUND      | Buyer, Seller | "Dispute được auto-refund"     |
| DISPUTE_WITHDRAWN        | Seller       | "Buyer rút tranh chấp"          |

### Frontend

- **URL:** `/notifications`
- **Icon chuông** ở Header với badge số unread
- Click notification → Redirect /disputes/[id]

---

## 13. Testing Checklist

### Buyer Flow

- [ ] Đăng nhập với tài khoản Buyer
- [ ] Tạo order → Đợi Seller deliver → Confirm
- [ ] Trong 72h sau DELIVERED, truy cập /orders/[id]
- [ ] Click "Mở tranh chấp"
- [ ] Điền form: Reason, Description
- [ ] Submit thành công → Redirect /disputes/[id]
- [ ] Gửi tin nhắn trong dispute
- [ ] Xem Seller phản hồi + evidence
- [ ] Rút tranh chấp (optional)

### Seller Flow

- [ ] Nhận notification dispute
- [ ] Truy cập /disputes/[id]
- [ ] Đọc Buyer's reason
- [ ] Gửi tin nhắn phản hồi
- [ ] Upload evidence (screenshot)
- [ ] Đợi Mod phán quyết

### Mod Flow

- [ ] Đăng nhập với tài khoản Mod
- [ ] Truy cập /admin/disputes
- [ ] Filter disputes theo status
- [ ] Click vào dispute OPEN
- [ ] Xem chat history + evidence
- [ ] Phán quyết REFUND
- [ ] Verify Coin hoàn về Buyer
- [ ] Test lại với RELEASE

### Auto Refund Flow

- [ ] Tạo dispute
- [ ] Seller KHÔNG phản hồi
- [ ] Đợi X hours (hoặc mock thời gian)
- [ ] Verify auto-refund executed
- [ ] Verify Coin hoàn về Buyer

---

## 14. Manual API Tests

```bash
# 1. Buyer tạo dispute
curl -X POST http://localhost:3001/api/v1/disputes \
  -H "Authorization: Bearer <buyer_token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "reason": "Tài khoản không như mô tả", "description": "Seller giao thông tin sai"}'

# 2. Lấy danh sách disputes
curl http://localhost:3001/api/v1/disputes \
  -H "Authorization: Bearer <buyer_token>"

# 3. Gửi tin nhắn
curl -X POST http://localhost:3001/api/v1/disputes/1/messages \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tôi sẽ phản hồi ngay"}'

# 4. Seller upload evidence
curl -X POST http://localhost:3001/api/v1/disputes/1/evidence \
  -H "Authorization: Bearer <seller_token>" \
  -F "file=@/path/to/screenshot.png"

# 5. Admin lấy danh sách disputes
curl http://localhost:3001/api/v1/admin/disputes \
  -H "Authorization: Bearer <admin_token>"

# 6. Admin phán quyết REFUND
curl -X PATCH http://localhost:3001/api/v1/admin/disputes/1/resolve \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"resolution": "REFUND", "resolutionNote": "Seller không cung cấp bằng chứng"}'

# 7. Buyer rút dispute
curl -X PATCH http://localhost:3001/api/v1/disputes/1/withdraw \
  -H "Authorization: Bearer <buyer_token>"

# 8. Lấy settings
curl http://localhost:3001/api/v1/admin/disputes/settings \
  -H "Authorization: Bearer <admin_token>"

# 9. Cập nhật settings
curl -X PUT http://localhost:3001/api/v1/admin/disputes/settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"key": "auto_refund_hours", "value": "12"}'
```

---

## 15. Database Schema

### Bảng `dispute_tickets`

```sql
CREATE TABLE dispute_tickets (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id),
  buyer_id BIGINT NOT NULL REFERENCES users(id),
  seller_id BIGINT NOT NULL REFERENCES users(id),
  assigned_to BIGINT REFERENCES users(id), -- Mod được phân công
  reason TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'OPEN', -- OPEN, RESOLVED, WITHDRAWN
  seller_deadline TIMESTAMP NOT NULL,
  resolution VARCHAR(20), -- REFUND, RELEASE, AUTO_REFUND
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### Bảng `dispute_messages`

```sql
CREATE TABLE dispute_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES dispute_tickets(id),
  sender_id BIGINT NOT NULL REFERENCES users(id),
  message TEXT,
  attachment_urls JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Bảng `dispute_evidence`

```sql
CREATE TABLE dispute_evidence (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES dispute_tickets(id),
  uploaded_by BIGINT NOT NULL REFERENCES users(id),
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Bảng `dispute_settings`

```sql
CREATE TABLE dispute_settings (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  value VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by BIGINT REFERENCES users(id)
);

-- Seed data
INSERT INTO dispute_settings (key, value, description)
VALUES ('auto_refund_hours', '6', 'Số giờ Seller phải phản hồi trước khi auto-refund');
```

---

## 16. Troubleshooting

### Lỗi thường gặp

| Lỗi                          | Nguyên nhân                     | Giải pháp                          |
| ---------------------------- | ------------------------------- | ---------------------------------- |
| Cannot create dispute      | Order chưa DELIVERED            | Đợi Seller deliver trước          |
| Cannot create dispute      | Đã quá 72h                      | Liên hệ Admin                     |
| Cannot create dispute      | Đã có dispute rồi               | Xem dispute cũ                    |
| Cannot withdraw            | Không phải buyer                | Chỉ buyer mới rút được            |
| Cannot upload evidence     | File type không hợp lệ          | Dùng .jpg, .png, .pdf             |
| Cannot upload evidence     | File > 5MB                      | Nén file lại                      |
| Cannot upload evidence     | Đã đủ 10 files                  | Xóa file cũ hoặc tạo dispute mới  |
| Auto-refund không chạy     | Redis/BullMQ issue              | Kiểm tra queue worker             |

### Kiểm tra Database

```bash
# Kết nối database
psql $DATABASE_URL

# Xem disputes
SELECT * FROM dispute_tickets;

# Xem messages của dispute
SELECT * FROM dispute_messages WHERE ticket_id = 1;

# Xem evidence
SELECT * FROM dispute_evidence WHERE ticket_id = 1;

# Xem settings
SELECT * FROM dispute_settings;

# Xem timeline
SELECT * FROM order_timeline WHERE order_id = 1;
```

---

## 17. Files Đã Triển Khai

### Backend

```
apps/api/src/disputes/
├── disputes.module.ts
├── disputes.service.ts
├── disputes.controller.ts
├── disputes-admin.controller.ts
└── dto/
    ├── create-dispute.dto.ts
    ├── create-message.dto.ts
    └── resolve-dispute.dto.ts
```

### Frontend

```
apps/web/src/app/disputes/
├── page.tsx                    # Danh sách disputes
└── [id]/
    └── page.tsx                # Chi tiết dispute + chat

apps/web/src/app/admin/disputes/
├── page.tsx                    # Admin: danh sách
├── [id]/
│   └── page.tsx                # Admin: phán quyết
└── settings/
    └── page.tsx                # Admin: cấu hình
```

---

## 18. Công nghệ Sử Dụng

- **Queue:** BullMQ với Redis cho AUTO_REFUND job
- **Storage:** Local disk cho evidence files (Sprint 5+: S3/R2)
- **Chat:** Polling-based (5s interval)
- **Encryption:** Files lưu an toàn, access control qua RBAC

---

## 19. Sprint 4 Completion

✅ **Backend:**
- DisputesService với đầy đủ business logic
- DisputesController (Buyer/Seller endpoints)
- DisputesAdminController (Mod/Admin endpoints)
- BullMQ AUTO_REFUND processor
- Evidence upload service

✅ **Frontend:**
- Dispute list page
- Dispute detail page với chat
- Admin dispute management
- Admin settings page

✅ **Database:**
- dispute_tickets
- dispute_messages
- dispute_evidence
- dispute_settings

✅ **Tests:**
- Unit tests cho DisputesService
- E2E tests cho dispute flow
- Security tests (RBAC, validation)

---

**Created**: 2026-03-15
**Updated**: 2026-03-15
**Author**: Development Team
