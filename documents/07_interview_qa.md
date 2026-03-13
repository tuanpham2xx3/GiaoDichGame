# 07 – Lý do chọn công nghệ & Hỏi đáp phỏng vấn
## Dự án: GIAODICHGAME C2C Marketplace

> Tài liệu này giải thích **tại sao** chọn từng công nghệ/thuật toán, dùng để ôn tập phỏng vấn.

---

## PHẦN 1: LÝ DO CHỌN CÔNG NGHỆ (Tech Decision Log)

### 1.1 Next.js (Frontend)

**❓ Tại sao không dùng React thuần / Vue / Angular?**

> Dự án có yêu cầu **SEO bắt buộc** — các bài đăng tài khoản game phải được Google index để traffic organic. React thuần (SPA) render phía client → bot Google thấy trang rỗng → không index được. Next.js hỗ trợ **SSR (Server-Side Rendering)** và **SSG**, giải quyết hoàn toàn vấn đề này chỉ với 1 framework.

**❓ Chọn App Router hay Pages Router?**

> App Router (Next.js 13+) vì hỗ trợ **React Server Components** giúp giảm JS bundle size, streaming HTML, và layout nesting rõ ràng hơn.

---

### 1.2 NestJS (Backend)

**❓ Tại sao không dùng Express.js thuần?**

> Dự án có nhiều module nghiệp vụ phức tạp (Wallet, Order, Dispute, VIP...). Express.js không có cấu trúc quy chuẩn → dự án lớn dễ trở thành "mì spaghetti". NestJS cung cấp **kiến trúc module hóa** (DI, Decorator, Guard, Interceptor) giúp tách biệt concern rõ ràng, dễ test, dễ scale team.

**❓ Tại sao không dùng Fastify hay Hono?**

> NestJS có ecosystem phong phú tích hợp sẵn với BullMQ, Passport, TypeORM/Drizzle, Swagger... và team quen thuộc. Với 1.000 user ban đầu, overhead của NestJS không đáng kể.

---

### 1.3 Monorepo (Turborepo/Nx)

**❓ Tại sao dùng Monorepo?**

> Frontend (Next.js) và Backend (NestJS) chia sẻ chung **TypeScript types/interfaces** (ví dụ: `OrderStatus`, `ListingDTO`). Nếu tách 2 repo riêng → phải publish package hoặc copy-paste type → dễ lệch nhau. Monorepo cho phép `import { OrderStatus } from '@giaodichgame/shared'` trực tiếp.

---

### 1.4 PostgreSQL (Database chính)

**❓ Tại sao không dùng MongoDB (NoSQL)?**

> Hệ thống tài chính (Wallet, Ledger) **bắt buộc ACID** — nếu ghi nạp tiền thành công nhưng cộng số dư thất bại ở giữa chừng, phải rollback hoàn toàn. MongoDB không hỗ trợ multi-document transaction tốt như RDBMS. PostgreSQL có **transaction ACID đầy đủ** và **row-level locking** cần thiết cho Pessimistic Lock.

**❓ Tại sao chọn PostgreSQL thay vì MySQL?**

> Dự án này chọn **PostgreSQL** vì 3 lý do chính:
> 1. **JSONB** — kiểu dữ liệu nhị phân (binary) có thể **index trực tiếp** vào field con của `game_attributes` — tối quan trọng cho query filter thả thuộc tính game ở Sprint 2.
> 2. **SERIALIZABLE isolation** mạnh hơn — phù hợp hệ thống tài chính đòi hỏi correctness cao.
> 3. **`ON CONFLICT DO NOTHING`** — upsert chuẩn hơn MySQL, hữu ích khi seed data và xử lý race condition.

---

### 1.5 Redis + BullMQ (Queue)

**❓ Tại sao cần Queue? Sao không dùng cron job đơn giản?**

> Cron job chạy theo lịch cố định (ví dụ: mỗi phút) — không đủ chính xác cho Escrow 72h và sẽ scan toàn bộ bảng Orders mỗi phút → tốn tài nguyên. BullMQ cho phép **schedule chính xác đến từng giây** cho từng đơn hàng riêng biệt, có built-in **retry**, **dead-letter queue**, và **job monitoring** (Bull Board).

**❓ Tại sao BullMQ mà không dùng Agenda, Bee-Queue...?**

> BullMQ là thế hệ kế tiếp của Bull, hỗ trợ TypeScript native, **delayed jobs** (đặt job chạy sau N giây), worker concurrency, và tích hợp tốt với NestJS qua `@nestjs/bull`.

---

### 1.6 Docker + Nginx

**❓ Tại sao containerize với Docker?**

> Đảm bảo môi trường dev = staging = production (no "works on my machine"). Docker Compose cho phép spin up PostgreSQL + Redis + App chỉ với 1 lệnh. Nginx làm **reverse proxy** xử lý SSL termination, load balancing, và serve static files hiệu quả hơn để Node.js trực tiếp.

---

### 1.7 Drizzle ORM (hoặc TypeORM)

**❓ Tại sao dùng ORM thay vì raw SQL?**

> ORM cung cấp **type-safety** (TypeScript biết schema DB), migration tự động, và bảo vệ khỏi SQL Injection. Drizzle ORM được ưu tiên vì **lightweight**, schema-first, và query builder gần với SQL hơn → dễ kiểm soát performance hơn ActiveRecord pattern.

---

## PHẦN 2: LÝ DO CHỌN THUẬT TOÁN / PHƯƠNG THỨC

### 2.1 Ledger Pattern (Sổ cái kép)

**❓ Tại sao không lưu số dư bằng một cột `balance` đơn giản?**

> Cột `balance` tĩnh có vấn đề:
> - Race condition: 2 request đồng thời đọc balance=100, cả 2 trừ 50, kết quả cuối cùng là 50 thay vì 0 → mất tiền.
> - Không có lịch sử: debug impossible.
>
> **Ledger Pattern** lưu mọi giao dịch vào bảng `wallet_transactions` (append-only). Số dư = `SUM(amount)`. Đây là thiết kế chuẩn của các hệ thống tài chính (ngân hàng, Stripe...).

**❓ Vậy mỗi lần xem số dư phải SUM cả nghìn dòng, không chậm sao?**

> Index đúng `(user_id, status)` + `(user_id, type)` thì query cực nhanh. Với 1.000 user và vài nghìn transaction/user, không đáng lo. Scale lớn hơn mới cần materialized view hoặc periodic snapshot.

---

### 2.2 Pessimistic Locking (SELECT ... FOR UPDATE)

**❓ Tại sao dùng Pessimistic Lock thay vì Optimistic Lock?**

> **Optimistic Lock** phù hợp khi conflict xảy ra hiếm. Hệ thống này có thể có nhiều user mua 1 listing hot cùng lúc → conflict xảy ra thường xuyên → Optimistic Lock sẽ retry nhiều lần → chậm hơn.
>
> **Pessimistic Lock** (`SELECT ... FOR UPDATE`) lock row ngay khi đọc, chỉ 1 transaction được vào tại 1 thời điểm → đúng cho bài toán này. Trade-off: tăng latency nhẹ, nhưng đảm bảo correctness.

---

### 2.3 Escrow 72h với BullMQ Delayed Job

**❓ Cơ chế 72h hoạt động chính xác như thế nào?**

> Khi Seller giao hàng (status → DELIVERED):
> ```
> const job = await queue.add('AUTO_COMPLETE', { orderId }, { delay: 72 * 60 * 60 * 1000 });
> order.bullmqJobId = job.id; // lưu để cancel nếu có dispute
> ```
> Nếu Buyer tạo dispute → `await queue.remove(order.bullmqJobId)` → job bị huỷ → tiền không tự chạy sang Seller.

---

### 2.4 AES-256 Encryption cho thông tin tài khoản game

**❓ Tại sao mã hóa AES thay vì hash?**

> Hash (bcrypt, SHA) là **one-way** — không giải mã được, phù hợp cho password. Thông tin tài khoản game cần **Buyer đọc được** sau khi mua → phải **two-way encryption**. AES-256 với IV ngẫu nhiên mỗi lần mã hóa là chuẩn công nghiệp.

**❓ Key AES lưu ở đâu?**

> Environment variable (`.env`) hoặc **Secret Manager** (AWS Secrets Manager / HashiCorp Vault). Tuyệt đối không lưu trong DB hay commit vào Git.

---

### 2.5 JWT + Refresh Token Rotation

**❓ Tại sao Access Token chỉ 15 phút?**

> JWT stateless — server không thể thu hồi token bị đánh cắp. Thời hạn ngắn (15 phút) giới hạn thiệt hại. Refresh Token (7 ngày) lưu trong DB → có thể revoke khi cần (logout, đổi password, phát hiện xâm nhập).

**❓ Refresh Token Rotation là gì?**

> Mỗi lần dùng Refresh Token để lấy Access Token mới → đồng thời **invalidate** Refresh Token cũ và cấp Refresh Token mới. Nếu attacker dùng Refresh Token cũ sau khi user đã rotate → hệ thống detect và revoke toàn bộ session.

---

### 2.6 Dynamic RBAC (Role-Based Access Control)

**❓ Tại sao không hardcode role USER/MOD/ADMIN vào code?**

> Hardcode role nghĩa là mỗi khi cần thêm role mới (ví dụ: "ContentManager", "FinanceReviewer") phải deploy lại code. Với Dynamic RBAC, Admin tạo role và gán permission trực tiếp trên UI → **zero deploy**. Backend chỉ check permission key (string), không quan tâm role tên gì.

**❓ Performance: mỗi request phải query DB để check permission, không chậm sao?**

> Cache danh sách permissions của user vào **Redis** (TTL 5 phút). Sau khi Admin thay đổi role của user → invalidate cache key tương ứng. Hầu hết request sẽ hit Redis thay vì DB.

---

### 2.7 SSR (Server-Side Rendering) cho Listing

**❓ Trang listing render ở đâu — server hay client?**

> **Server** — Next.js render HTML đầy đủ trước khi gửi về browser. Lý do:
> 1. **SEO**: Google bot đọc được nội dung ngay, index tốt.
> 2. **First Contentful Paint (FCP)** nhanh hơn → UX tốt hơn.
> 3. Dữ liệu listing không cần realtime, có thể **cache ở CDN** (stale-while-revalidate).

---

### 2.8 Race Condition Handling khi mua hàng

**❓ 2 Buyer cùng bấm mua 1 listing, hệ thống xử lý thế nào?**

> Dùng **database transaction + pessimistic lock**:
> ```sql
> BEGIN TRANSACTION;
>   SELECT * FROM listings WHERE id = ? AND status = 'PUBLISHED' FOR UPDATE;
>   -- Chỉ 1 transaction vào được tại 1 thời điểm
>   UPDATE listings SET status = 'LOCKED' WHERE id = ?;
>   INSERT INTO wallet_transactions (HOLD ...);
>   INSERT INTO orders ...;
> COMMIT;
> ```
> Transaction thứ 2 sẽ bị block tại `SELECT ... FOR UPDATE` cho đến khi transaction 1 commit. Sau đó query lại thấy status = 'LOCKED' → trả về lỗi "Bài đăng đã được mua".

---

## PHẦN 3: CÂU HỎI PHỎNG VẤN KỸ THUẬT THƯỜNG GẶP

### 🔴 Câu hỏi khó (Senior level)

**Q: Làm sao đảm bảo Ledger không bị âm (user không rút nhiều hơn số dư)?**
> A: `SELECT SUM(amount) FOR UPDATE` trong cùng transaction với INSERT giao dịch mới. Nếu balance sau khi tính < 0 → rollback. Lock đảm bảo không có concurrent transaction nào chen vào giữa.

**Q: Nếu server crash giữa chừng khi đang xử lý đơn hàng, chuyện gì xảy ra?**
> A: Nhờ **database transaction ACID** — nếu chưa COMMIT thì tự động ROLLBACK. Coin Buyer không bị mất, listing vẫn PUBLISHED. BullMQ job chưa được enqueue (vì trong transaction) → không có job lơ lửng.

**Q: Nếu Redis crash, BullMQ jobs bị mất thì sao?**
> A: Redis cần bật **AOF persistence** (`appendonly yes`). Ngoài ra, khi app khởi động có **reconciliation job**: scan tất cả orders ở trạng thái DELIVERED quá 72h chưa COMPLETED → tự động SETTLE. Đây là safety net thứ 2.

**Q: Websocket vs Polling vs SSE cho chat dispute — bạn chọn cái nào?**
> A: Phase 1 dùng **SSE (Server-Sent Events)** — server push one-way, đơn giản hơn WebSocket (không cần maintain bidirectional connection), đủ dùng cho chat dispute vì frequency thấp. Phase 2 upgrade lên WebSocket nếu cần realtime cao hơn.

**Q: Tại sao dùng Composite PK cho `user_roles`, `role_permissions` thay vì ID riêng?**
> A: Composite PK tự động enforce **uniqueness** (1 user không thể có cùng role 2 lần) và tiết kiệm 1 cột. Index trên composite PK đủ để query nhanh theo `user_id` hoặc `role_id`.

---

### 🟠 Câu hỏi trung bình (Mid level)

**Q: Giải thích Escrow là gì và tại sao cần nó?**
> A: Escrow là cơ chế "giam tiền" của bên thứ 3 khi 2 bên giao dịch. Buyer trả tiền vào escrow (không vào thẳng Seller), Seller giao hàng, sau 72h không khiếu nại → escrow giải phóng tiền cho Seller. Mục đích: bảo vệ Buyer khỏi Seller lừa đảo.

**Q: RBAC khác gì ABAC?**
> A: RBAC (Role-Based) phân quyền theo role. ABAC (Attribute-Based) phân quyền theo thuộc tính của subject/object/environment (ví dụ: user chỉ xem order của chính mình). Hệ thống này dùng RBAC cho quản trị (admin actions) và **ABAC đơn giản** cho ownership check (Buyer chỉ xem order của mình).

**Q: Idempotency trong webhook thanh toán là gì?**
> A: Đảm bảo cùng 1 webhook callback xử lý **nhiều lần vẫn cho kết quả như 1 lần**. Implement bằng cách lưu `gateway_ref` (unique ID từ cổng TT) vào DB, mỗi lần nhận webhook → check xem `gateway_ref` đã xử lý chưa → nếu rồi thì skip.

**Q: Index nào quan trọng nhất trong hệ thống này?**
> A: `wallet_transactions(user_id, status)` vì query tính số dư chạy rất thường xuyên. Thứ 2 là `listings(game_id, status, is_pinned, created_at)` cho query danh sách bài đăng với filter + sort.

---

### 🟡 Câu hỏi cơ bản (Junior level)

**Q: JWT là gì? Khác gì Session?**
> A: JWT là token tự chứa thông tin (user_id, role) được ký bằng secret key. Server không cần lưu state → **stateless**, scale horizontal dễ. Session lưu trên server → stateful, cần sticky session hoặc shared store (Redis) khi scale.

**Q: Tại sao cần bcrypt cho password, không dùng MD5/SHA256?**
> A: MD5/SHA256 quá nhanh → attacker có thể brute force hàng tỉ hash/giây. bcrypt có **work factor** (cost) cố ý làm chậm quá trình hash, khiến brute force không khả thi. bcrypt cũng tự thêm **salt** ngẫu nhiên → chống rainbow table attack.

**Q: REST API design: tại sao dùng PATCH thay vì PUT để update?**
> A: PUT thay thế toàn bộ resource. PATCH cập nhật **partial** — chỉ gửi fields cần thay đổi. Phù hợp hơn cho các update nhỏ (đổi username, block user...) vì không cần gửi toàn bộ object.

**Q: N+1 query problem là gì?**
> A: Query listing → với mỗi listing lại query thêm 1 DB call để lấy thông tin seller → 100 listings = 101 queries. Giải pháp: **JOIN** hoặc **eager loading** (`relations` trong ORM), chỉ cần 1-2 queries.
