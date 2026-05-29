# SmartLocker MVP

MVP frontend cho dự án tủ đồ thông minh. App mô phỏng đúng 2 workflow chính trong mockup:

- Cư dân: đăng nhập, xem tủ đồ, xem chi tiết đơn, mở tủ, xác nhận nhận hàng.
- Shipper: đăng nhập, quét QR trạm tủ, khai báo đơn, quét vận đơn, chọn ngăn, xác nhận gửi hàng.

## Chạy local

Mở `index.html` trực tiếp trong trình duyệt, hoặc chạy server tĩnh:

```powershell
python -m http.server 5173
```

Sau đó mở `http://localhost:5173`.

Nếu chưa cấu hình Supabase, app tự chạy bằng demo localStorage để nhóm pitch được ngay.

## Backend, database, Gmail login

Hướng miễn phí đề xuất:

- Frontend: Netlify Free, Vercel Hobby, hoặc GitHub Pages.
- Backend/database/auth: Supabase Free với Postgres, API tự sinh, Row Level Security và Social OAuth.

Các bước:

1. Tạo project Supabase.
2. Vào SQL Editor, chạy file `supabase/schema.sql`.
3. Vào Authentication > Providers > Google, bật Google OAuth.
4. Tạo OAuth Client trong Google Cloud Console, thêm callback URL của Supabase.
5. Copy `config.example.js` thành `config.js`, điền `url` và `anonKey`.
6. Deploy thư mục này lên Netlify/Vercel/GitHub Pages.

## Gợi ý deploy miễn phí

Netlify là lựa chọn nhẹ nhất cho bản thi vì kéo thả được thư mục và có SSL sẵn. Supabase Free hiện có Postgres 500 MB, Social OAuth và 50,000 monthly active users, đủ cho demo/pilot nhỏ. Lưu ý project Supabase Free có thể bị pause sau 1 tuần không hoạt động.

## Cấu trúc

- `index.html`: khung app mobile.
- `styles.css`: UI theo mockup.
- `app.js`: workflow cư dân/shipper, demo data, Supabase integration.
- `config.js`: cấu hình Supabase local.
- `supabase/schema.sql`: database schema, RLS policies, seed locker/ngăn tủ.
