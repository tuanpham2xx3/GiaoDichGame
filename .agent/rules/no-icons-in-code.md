---
description: Quy tắc dùng icon trong dự án
---

# Quy tắc: Không dùng icon/emoji trong code dự án

## Quy tắc

- **KHÔNG** dùng emoji hoặc icon trong code của dự án: `.tsx`, `.ts`, `.jsx`, `.js`, `.css`, `.html`, v.v.
- **ĐƯỢC PHÉP** dùng emoji/icon trong các file tài liệu `.md` (Markdown).

## Ví dụ ĐÚng

```tsx
// ✅ Đúng – không emoji trong JSX/TSX
<button>Dang nhap</button>
<span>So du: 1,000 Coin</span>
```

```md
## ✅ Đúng – emoji trong .md file

- 🎮 GiaoDichGame
- 💰 Nạp Coin
```

## Ví dụ SAI

```tsx
// ❌ Sai – không được dùng emoji trong code
<button>🔑 Đăng nhập</button>
<span>💰 1,000 Coin</span>
<h1>🎮 GiaoDichGame</h1>
```

## Phạm vi áp dụng

- Tất cả file trong `apps/`, `packages/`, `libs/`
- Bao gồm: nội dung JSX, string literals, placeholder, label, comment code
- **Ngoại lệ duy nhất**: file `.md` trong thư mục `documents/`, `README.md`, `walkthrough.md`, `PLAN_*.md`, `WT_*.md`
