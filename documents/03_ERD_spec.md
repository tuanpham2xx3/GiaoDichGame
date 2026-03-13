# ERD Specification – Database Schema
## Dự án: GIAODICHGAME C2C Marketplace

> **Phiên bản:** 1.0 | **Ngày:** 2026-03-12

---

## 1. Sơ đồ quan hệ (ERD Overview)

```
users ──────────────< listings >──────── games
  │                       │                │
  │                  game_attributes      game_schemas (JSON)
  │
  ├──< user_roles >──── roles >──── role_permissions >──── permissions
  │
  ├──< wallet_transactions
  │
  ├──< orders >──────── listings
  │       │
  │  order_deliveries (thông tin TKGAME mã hoá)
  │
  ├──< dispute_tickets >──< dispute_messages
  │
  ├──< user_vip_subscriptions >──── vip_packages
  │
  └──< listing_pins
```

---

## 2. Chi tiết các bảng

---

### 2.1 `users`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt |
| `username` | VARCHAR(100) | UNIQUE, NOT NULL | |
| `avatar_url` | VARCHAR(500) | NULL | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

> **Lưu ý:** Không có cột `role` tĩnh. Quyền của user được tính động qua bảng `user_roles` + `role_permissions`.

---

### 2.1b `roles` ⭐ (Dynamic RBAC)
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Ví dụ: `USER`, `ADMIN`, `Mod`, `Support` |
| `description` | VARCHAR(255) | NULL | |
| `is_system` | BOOLEAN | DEFAULT FALSE | Nếu TRUE: không thể xóa (`USER`, `ADMIN`) |
| `created_at` | TIMESTAMP | NOT NULL | |

> **Seed data khi khởi tạo hệ thống:**
> - `USER` (is_system=TRUE) — tự động gán khi đăng ký
> - `ADMIN` (is_system=TRUE) — chỉ Admin có toàn quyền

---

### 2.1c `permissions` (Danh sách quyền hạn)
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | |
| `key` | VARCHAR(100) | UNIQUE, NOT NULL | Ví dụ: `game:manage`, `dispute:resolve` |
| `description` | VARCHAR(255) | NULL | |
| `created_at` | TIMESTAMP | NOT NULL | |

> **Seed permissions mặc định:** `game:manage`, `dispute:resolve`, `user:manage`, `user:assign_role`, `role:manage`, `vip:manage`, `pin:manage`, `topup:confirm`, `listing:moderate`, `stats:view`, `profile:edit`

---

### 2.1d `role_permissions` (Gán permission cho role)
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `role_id` | INT | FK → roles, NOT NULL | |
| `permission_id` | INT | FK → permissions, NOT NULL | |
| PRIMARY KEY | (role_id, permission_id) | Composite PK | |

> `ADMIN` role không cần entry trong bảng này — backend check `is_system=TRUE` và `name=ADMIN` thì bypass tất cả.

---

### 2.1e `user_roles` (Gán role cho user)
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `user_id` | BIGINT | FK → users, NOT NULL | |
| `role_id` | INT | FK → roles, NOT NULL | |
| `assigned_by` | BIGINT | FK → users, NULL | Admin đã phong |
| `assigned_at` | TIMESTAMP | NOT NULL | |
| PRIMARY KEY | (user_id, role_id) | Composite PK | |

---

### 2.2 `wallet_transactions` ⭐ (Trái tim hệ thống)
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `user_id` | BIGINT | FK → users.id, NOT NULL | |
| `amount` | DECIMAL(15,2) | NOT NULL | Dương = credit, Âm = debit |
| `type` | ENUM | NOT NULL | `TOPUP`, `WITHDRAW`, `HOLD`, `RELEASE`, `SETTLE`, `INSURANCE_LOCK`, `INSURANCE_UNLOCK`, `VIP_PURCHASE`, `PIN_PURCHASE` |
| `status` | ENUM | NOT NULL | `PENDING`, `SUCCESS`, `FAILED` |
| `reference_id` | BIGINT | NULL | FK linh hoạt (order_id/vip_id...) |
| `reference_type` | VARCHAR(50) | NULL | `ORDER`, `VIP`, `PIN`, `TOPUP_REQUEST` |
| `note` | TEXT | NULL | |
| `created_at` | TIMESTAMP | NOT NULL | |

> **Index:** `(user_id, status)`, `(user_id, type)`
> **Tính số dư:** `SELECT SUM(amount) FROM wallet_transactions WHERE user_id = ? AND status = 'SUCCESS'`

---

### 2.3 `topup_requests`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `user_id` | BIGINT | FK → users | |
| `amount_coin` | DECIMAL(15,2) | NOT NULL | |
| `amount_vnd` | DECIMAL(15,2) | NOT NULL | = amount_coin × 1 (1 Coin = 1 VNĐ) |
| `method` | ENUM | NOT NULL | `BANK_TRANSFER`, `MOMO`, `VNPAY`, `ZALOPAY` |
| `status` | ENUM | NOT NULL | `PENDING`, `SUCCESS`, `FAILED` |
| `gateway_ref` | VARCHAR(255) | NULL | Ref từ cổng TT |
| `confirmed_by` | BIGINT | FK → users, NULL | Admin ID nếu thủ công |
| `created_at` | TIMESTAMP | | |

---

### 2.4 `withdraw_requests`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `user_id` | BIGINT | FK → users | |
| `amount_coin` | DECIMAL(15,2) | NOT NULL | |
| `bank_name` | VARCHAR(100) | NOT NULL | |
| `bank_account` | VARCHAR(50) | NOT NULL | |
| `bank_holder` | VARCHAR(100) | NOT NULL | |
| `status` | ENUM | NOT NULL | `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED` |
| `gateway_ref` | VARCHAR(255) | NULL | |
| `created_at` | TIMESTAMP | | |

---

### 2.5 `games`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | INT | PK | |
| `name` | VARCHAR(100) | NOT NULL | |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | URL-friendly |
| `icon_url` | VARCHAR(500) | NULL | |
| `schema` | JSON | NOT NULL | Schema thuộc tính do Mod định nghĩa |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `created_by` | BIGINT | FK → users | Mod đã tạo |
| `created_at` | TIMESTAMP | | |

> **Ví dụ `schema` JSON:**
> ```json
> [
>   {"field": "rank", "label": "Rank", "type": "select", "required": true,
>    "options": ["Sắt", "Đồng", "Bạc", "Vàng", "Bạch Kim", "Kim Cương", "Cao Thủ", "Thách Đấu"]},
>   {"field": "server", "label": "Server", "type": "select", "required": true, "options": ["VN", "PBE"]},
>   {"field": "blue_essence", "label": "Blue Essence", "type": "number", "required": false}
> ]
> ```

---

### 2.6 `listings`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `seller_id` | BIGINT | FK → users | |
| `game_id` | INT | FK → games | |
| `title` | VARCHAR(255) | NOT NULL | |
| `description` | TEXT | NULL | |
| `price` | DECIMAL(15,2) | NOT NULL | Đơn vị: Coin |
| `game_attributes` | JSON | NOT NULL | Giá trị thuộc tính theo schema game |
| `status` | ENUM | NOT NULL | `PUBLISHED`, `LOCKED`, `DELIVERED`, `COMPLETED`, `DISPUTED`, `DELETED` |
| `is_pinned` | BOOLEAN | DEFAULT FALSE | |
| `pin_expires_at` | TIMESTAMP | NULL | |
| `view_count` | INT | DEFAULT 0 | |
| `created_at` | TIMESTAMP | | |
| `updated_at` | TIMESTAMP | | |

> **Index:** `(game_id, status)`, `(seller_id)`, `(is_pinned, created_at)` (composite cho sorting)

---

### 2.7 `listing_images`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `listing_id` | BIGINT | FK → listings | |
| `url` | VARCHAR(500) | NOT NULL | |
| `order` | INT | DEFAULT 0 | Thứ tự hiển thị |
| `created_at` | TIMESTAMP | | |

---

### 2.8 `orders`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `listing_id` | BIGINT | FK → listings | |
| `buyer_id` | BIGINT | FK → users | |
| `seller_id` | BIGINT | FK → users | |
| `amount` | DECIMAL(15,2) | NOT NULL | Coin tại thời điểm mua |
| `status` | ENUM | NOT NULL | `PENDING`, `DELIVERED`, `COMPLETED`, `DISPUTED`, `REFUNDED` |
| `delivered_at` | TIMESTAMP | NULL | Mốc bắt đầu đếm 72h |
| `auto_complete_at` | TIMESTAMP | NULL | = delivered_at + 72h |
| `completed_at` | TIMESTAMP | NULL | |
| `bullmq_job_id` | VARCHAR(100) | NULL | Để cancel job nếu cần |
| `created_at` | TIMESTAMP | | |

---

### 2.9 `order_deliveries` (Thông tin tài khoản game - MÃ HÓA)
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `order_id` | BIGINT | FK → orders, UNIQUE | |
| `encrypted_data` | TEXT | NOT NULL | AES-256 encrypted JSON |
| `created_at` | TIMESTAMP | | |

> **Dữ liệu sau giải mã:**
> ```json
> { "username": "abc123", "password": "xyz789", "backup_code": "...", "note": "..." }
> ```

---

### 2.10 `dispute_tickets`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `order_id` | BIGINT | FK → orders, UNIQUE | |
| `buyer_id` | BIGINT | FK → users | |
| `seller_id` | BIGINT | FK → users | |
| `assigned_to` | BIGINT | FK → users, NULL | Mod/Admin phụ trách |
| `reason` | TEXT | NOT NULL | |
| `status` | ENUM | NOT NULL | `OPEN`, `SELLER_RESPONDED`, `AWAITING_DECISION`, `RESOLVED` |
| `seller_deadline` | TIMESTAMP | NOT NULL | = created_at + 48h |
| `resolution` | ENUM | NULL | `REFUND_BUYER`, `RELEASE_SELLER` |
| `resolution_note` | TEXT | NULL | |
| `created_at` | TIMESTAMP | | |
| `resolved_at` | TIMESTAMP | NULL | |

---

### 2.11 `dispute_messages`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `ticket_id` | BIGINT | FK → dispute_tickets | |
| `sender_id` | BIGINT | FK → users | |
| `message` | TEXT | NULL | |
| `attachment_urls` | JSON | NULL | Mảng URL file đính kèm |
| `created_at` | TIMESTAMP | | |

---

### 2.12 `vip_packages`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | INT | PK | |
| `name` | VARCHAR(100) | NOT NULL | |
| `price_coin` | DECIMAL(15,2) | NOT NULL | |
| `duration_days` | INT | NOT NULL | |
| `benefits` | JSON | NOT NULL | config quyền lợi |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `created_at` | TIMESTAMP | | |

> **Ví dụ `benefits` JSON:**
> ```json
> { "name_color": "#FFD700", "avatar_frame": "gold_frame", "badge": "vip_gold", "effect": "sparkle" }
> ```

---

### 2.13 `user_vip_subscriptions`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `user_id` | BIGINT | FK → users | |
| `package_id` | INT | FK → vip_packages | |
| `started_at` | TIMESTAMP | NOT NULL | |
| `expires_at` | TIMESTAMP | NOT NULL | |
| `bullmq_job_id` | VARCHAR(100) | NULL | |
| `is_active` | BOOLEAN | DEFAULT TRUE | |

---

### 2.14 `pin_config`
| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | INT | PK | |
| `price_per_day` | DECIMAL(15,2) | NOT NULL | Coin/ngày |
| `max_active_pins` | INT | NULL | NULL = không giới hạn |
| `updated_at` | TIMESTAMP | | |
| `updated_by` | BIGINT | FK → users | Admin |

---

## 3. Ràng buộc & Index quan trọng

```sql
-- Đảm bảo race condition khi mua hàng
-- Application layer: SELECT ... FOR UPDATE trên listings khi đổi status

-- Index tìm kiếm listing
CREATE INDEX idx_listings_search ON listings(game_id, status, is_pinned, created_at);

-- Index ledger
CREATE INDEX idx_wallet_user_status ON wallet_transactions(user_id, status);

-- Index dispute seller deadline
CREATE INDEX idx_dispute_deadline ON dispute_tickets(seller_deadline, status);
```

---

## 4. Data Flow - Luồng tiền

```
BUYER MUA:
  wallet_transactions(HOLD, -100) ← Buyer

SELLER GIAO:
  orders.status → DELIVERED
  BullMQ: schedule AUTO_COMPLETE job

AUTO-COMPLETE (72h):
  wallet_transactions(SETTLE, +100) → Seller
  orders.status → COMPLETED

DISPUTE → REFUND:
  wallet_transactions(RELEASE, +100) → Buyer
  orders.status → REFUNDED

DISPUTE → RELEASE TO SELLER:
  wallet_transactions(SETTLE, +100) → Seller
  orders.status → COMPLETED
```
