Đây là bản tổng hợp toàn bộ kế hoạch xây dựng nền tảng C2C mua bán tài khoản game, được thiết kế tối ưu nhất dựa trên các yêu cầu nghiệp vụ và kỹ thuật chúng ta đã chốt:

1. Mô hình kinh doanh & Dòng tiền (Business Logic)
Mô hình: C2C (Customer to Customer), lai giữa Forum (như EpicNPC) và E-commerce. Nền tảng không giữ tài khoản, chỉ đóng vai trò trung gian đảm bảo tài chính.

Đồng tiền sử dụng: 100% giao dịch bằng hệ thống tiền ảo nội bộ (Coin).

Cơ chế Giam tiền (Escrow): Mọi giao dịch đều tự động giam tiền (Hold). Khi Seller giao hàng, hệ thống đếm ngược 72 giờ. Nếu không có khiếu nại, Coin tự động cộng vào ví Seller.

Quỹ bảo hiểm Seller: Seller nạp Coin để tạo uy tín. Hệ thống chặn giao dịch nếu tổng giá trị các đơn hàng đang Hold/Dispute vượt quá số dư bảo hiểm. Rút quỹ cần chờ 30 ngày và không có giao dịch trong 14 ngày.

Doanh thu nền tảng (Monetization):

Không thu phí giao dịch (No platform fee).

Bán gói VIP (Đổi màu tên, avatar, hiệu ứng).

Bán gói Pin (Ghim bài viết lên Top trang chủ).

Doanh thu từ quảng cáo của các shop ngoài.

2. Kiến trúc Kỹ thuật (Tech Stack & Architecture)
Để hệ thống dễ dàng mở rộng, quản lý luồng dữ liệu thời gian thực và xử lý hàng đợi phức tạp (Queue), dưới đây là stack công nghệ tối ưu nhất cho dự án của bạn:

Cấu trúc mã nguồn: Sử dụng mô hình Monorepo để quản lý đồng bộ cả Frontend và Backend, giúp chia sẻ các type/interface dễ dàng.

Frontend: Next.js. Render phía server (SSR) là bắt buộc để các bài đăng bán tài khoản game có thể được Google index (SEO) cực tốt.

Backend: NestJS. Cấu trúc module hóa chặt chẽ của NestJS cực kỳ phù hợp để tách biệt các luồng phức tạp như Wallet, Order, và Marketplace.

Database chính: PostgreSQL. Bắt buộc dùng cơ sở dữ liệu quan hệ để đảm bảo tính ACID cho hệ thống Sổ cái (Ledger) của Ví Coin. Chọn PostgreSQL vì hỗ trợ JSONB (indexable JSON) tốt hơn cho game_attributes.

Queue & Background Jobs: Cực kỳ quan trọng. Sử dụng Redis kết hợp với BullMQ để xử lý hàng đợi. BullMQ sẽ "gánh" các tác vụ như: tự động hoàn tất đơn hàng sau 72h, gỡ thẻ VIP/Pin khi hết hạn đúng đến từng giây mà không làm nghẽn server.

Deployment: Đóng gói toàn bộ các service bằng Docker (kèm Nginx làm reverse proxy) để dễ dàng triển khai lên VPS và đồng bộ môi trường.

3. Thiết kế Cấu trúc Dữ liệu Cốt lõi (Database Schema Highlights)
Hệ thống Ví (Ledger Pattern): Tuyệt đối không lưu số dư bằng một cột tĩnh. Bắt buộc có bảng Transactions (ID, User_ID, Amount, Type, Status). Số dư thực tế là hàm SUM() của bảng này. Áp dụng Pessimistic Locking (SELECT ... FOR UPDATE) khi có biến động số dư.

Sản phẩm động (Dynamic Attributes): Bài đăng mang hình thức Forum nhưng bản chất là Product. Dùng định dạng JSON trong cơ sở dữ liệu (ví dụ trường game_attributes) để lưu linh hoạt thông số của từng loại game (LOL lưu Rank, Genshin lưu AR,...).

Trạng thái Bài đăng (Race Condition Handling): Phải có trạng thái PUBLISHED, LOCKED (đang có người thanh toán), và SOLD (đã bán).

4. Phân chia Module (Backend Services)
Auth & Users Service: Quản lý đăng nhập, RBAC (Role-based access control), thông tin Profile.

Wallet & Ledger Service: "Trái tim" của web. Xử lý nạp/rút, khóa quỹ (lock funds), trừ tiền/cộng tiền với Transaction an toàn tuyệt đối.

Marketplace Service: Quản lý đăng bài, thuộc tính game, bộ lọc tìm kiếm, thuật toán ưu tiên hiển thị (Pin -> Bảo hiểm cao -> Bài mới).

Order & Escrow Service: Quản lý vòng đời đơn hàng (Pending -> Delivered -> 72h Hold -> Completed/Disputed). Giao tiếp liên tục với Wallet Service.

Ticket & Dispute Service: Phòng chat 3 bên (Buyer - Seller - Admin) và xử lý bằng chứng tranh chấp.

Worker Service (BullMQ): Tách riêng một luồng chỉ để chạy các Job ngầm (quét 72h, gỡ VIP).

5. Lộ trình Triển khai (Roadmap)
Bước 1 - Phân tích & Thiết kế (SAD): Vẽ ERD (Sơ đồ thực thể liên kết) cho Database, đặc biệt chốt chặt bảng Users, Wallets, Transactions, và Orders. Vẽ Sequence Diagram cho luồng Thanh toán.

Bước 2 - Setup & Core Backend: Khởi tạo Monorepo, cấu hình Docker, setup NestJS, kết nối PostgreSQL. Viết API cho Auth và hoàn thiện module Wallet (Sổ cái) trước tiên.

Bước 3 - Marketplace & Order: Code luồng đăng bài (Next.js form + JSON DB), hiển thị danh sách bài. Code luồng Order và tích hợp BullMQ để chạy logic 72h.

Bước 4 - Dispute & Admin: Code hệ thống Ticket, Chat và các thao tác giải quyết khiếu nại cho Admin.

Bước 5 - Monetization & Testing: Thêm logic mua VIP, ghim bài. Test kỹ các trường hợp giật lag mạng khi mua hàng (Concurrency Testing).