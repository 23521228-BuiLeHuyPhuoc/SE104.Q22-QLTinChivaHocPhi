# Hệ thống Quản lý Tín chỉ và Học phí

## Thông tin đồ án

| Mục | Nội dung |
| --- | --- |
| Môn học | Nhập môn Công nghệ phần mềm |
| Lớp | SE104.Q22 |
| Đề tài | Quản lý việc đăng ký môn học và thu học phí |
| Nhóm | 05 |
| Giảng viên hướng dẫn | TS. Đỗ Thị Thanh Tuyền |

### Thành viên nhóm

| Họ và tên | MSSV |
| --- | --- |
| Nguyễn Đăng Minh Quân | 24521437 |
| Phạm Nguyễn Tấn Sang | 23521346 |
| Bùi Lê Huy Phước | 23521228 |
| Đỗ Hoàng Phúc | 23521195 |

> `project/src/config/init.sql` là file chứa database khởi tạo và dữ liệu demo. Đây là file cô có thể nhìn thấy ngay ở đầu repo.

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

## Nội dung file `.env`

Tạo file `project/.env` rồi dán đúng nguyên khối dưới đây vào.

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ql_dangky_hocphi
DB_USER=postgres
DB_PASSWORD=admin

# Prisma Database URL
DATABASE_URL="postgresql://neondb_owner:npg_nALjzB5Clf8m@ep-falling-truth-aoeobg63-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Server Configuration
PORT=5000

# JWT Configuration
JWT_SECRET=builehuyphuoc
JWT_EXPIRES_IN=24h

# Redis OTP storage for password reset
REDIS_URL=redis://127.0.0.1:6379
REDIS_CONNECT_TIMEOUT_MS=5000
RESET_OTP_TTL_MINUTES=10
RESET_OTP_LENGTH=6
RESET_OTP_MAX_ATTEMPTS=5

# Cloudinary avatar uploads
CLOUDINARY_CLOUD_NAME=dcollo5h4
CLOUDINARY_API_KEY=932118844258925
CLOUDINARY_API_SECRET=QWRiEjFODByEPKW-PMJcXrxcWKg
CLOUDINARY_AVATAR_FOLDER=ql-tin-chi/avatars
AVATAR_MAX_SIZE_BYTES=3145728

# App URL used in password reset emails
APP_BASE_URL=http://localhost:5000
PUBLIC_BASE_URL=https://nonproportionally-unwild-albertine.ngrok-free.dev

# Payment gateway configuration
BANK_BIN=970436
BANK_ACCOUNT_NO=0000000000
BANK_ACCOUNT_NAME=TRUONG DAI HOC

VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=ED66H8X4
VNPAY_HASH_SECRET=21EI6CFUVCPFPU05D9G06U7T658US7II
VNPAY_RETURN_URL=
VNPAY_IPN_URL=

ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_QUERY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/query
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz
ZALOPAY_RETURN_URL=
ZALOPAY_CALLBACK_URL=
ZALOPAY_BANK_CODE=zalopayapp
ZALOPAY_MIN_AMOUNT=1000
PAYMENT_GATEWAY_TIMEOUT_MS=15000

# SMTP Configuration for forgot password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=taonekmay09112005@gmail.com
SMTP_PASS=balecskwznzcrqoj
SMTP_FROM="QL Tin Chi <taonekmay09112005@gmail.com>"
NGROK=https://nonproportionally-unwild-albertine.ngrok-free.dev
```
## Chuẩn bị trước khi chạy

1. Đảm bảo đã có file `project/.env`.
2. Cài dependencies:

```bash
yarn install
```

3. Sinh Prisma client:

```bash
npx prisma generate
```

## Tài khoản demo

| Vai trò | Tài khoản | Mật khẩu | Ghi chú |
| --- | --- | --- | --- |
| Admin demo | `admin` | `admin123` | Tài khoản quản trị viên mẫu trong `init.sql` |
| Sinh viên demo chính | `student` | `student123` | Liên kết với MSSV `22520006` trong `init.sql` |
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
- Khi thay đổi schema Prisma, chỉ cần chạy lại `npx prisma generate`.
- Nếu cần reset dữ liệu demo, xem nội dung trong `project/src/config/init.sql`.