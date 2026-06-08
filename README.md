# Hệ thống Quản lý Tín chỉ và Học phí

> `project/src/config/init.sql` là file chứa database khởi tạo và dữ liệu demo. Đây là file cô có thể xem ngay ở đầu repo.

## Tech Stack

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white">
  <img alt="Pug" src="https://img.shields.io/badge/Pug-A86454?logo=pug&logoColor=white">
  <img alt="Redis" src="https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white">
  <img alt="Cloudinary" src="https://img.shields.io/badge/Cloudinary-3448C5?logo=cloudinary&logoColor=white">
</p>

## Clone code

```bash
git clone https://github.com/23521228-BuiLeHuyPhuoc/SE104.Q22-QLTinChivaHocPhi.git
cd SE104.Q22-QLTinChivaHocPhi/project
```

## Chuẩn bị trước khi chạy

1. Tạo file `project/.env`.
2. Dán nguyên nội dung file `.env` online của nhóm vào `project/.env`.
3. Cài dependencies:

```bash
yarn install
```

4. Sinh Prisma client:

```bash
npx prisma generate
```

> Project đang dùng database online qua `.env`, nên không cần dựng database local.

## Tài khoản demo

| Vai trò | Tài khoản | Mật khẩu | Ghi chú |
| --- | --- | --- | --- |
| Admin demo | `admin` | `admin123` | Tài khoản quản trị viên mẫu trong `init.sql` |
| Sinh viên demo chính | `student` | `student123` | Tài khoản sinh viên demo chính |
| Sinh viên mẫu thêm | `22520001` đến `22520005` | `student123` | Các tài khoản sinh viên seed sẵn trong `init.sql` |

## Chạy project

```bash
yarn start
```

Sau khi chạy xong, mở trình duyệt tại:

```text
http://localhost:5000
```

## Ghi chú

- `init.sql` nằm tại `project/src/config/init.sql`.
- Nếu đã có file `.env` chuẩn của nhóm, chỉ cần dán đúng nội dung đó vào `project/.env`.
- Khi thay đổi schema Prisma, chỉ cần chạy lại `npx prisma generate`.