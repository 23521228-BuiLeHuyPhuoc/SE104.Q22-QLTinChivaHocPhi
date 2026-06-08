# Hệ thống Quản lý Tín chỉ và Học phí

README này hướng dẫn chạy project trong thư mục `project` và vị trí file SQL khởi tạo cơ sở dữ liệu.

## 1. Yêu cầu môi trường

Cài sẵn các phần mềm sau:

- Node.js 18 trở lên
- npm
- PostgreSQL
- Redis, nếu muốn dùng chức năng OTP/quên mật khẩu

## 2. Cấu trúc cần chú ý

```text
SE104.Q22-QLTinChivaHocPhi/
├── README.md
├── Nhom5QLTCVTHP.docx
├── outputs/
│   └── excel-templates/
└── project/
    ├── .env.example
    ├── package.json
    ├── package-lock.json
    ├── prisma/
    └── src/
        ├── index.js
        └── config/
            └── init.sql
```

Vị trí file SQL khởi tạo database:

```text
project/src/config/init.sql
```

Đường dẫn tuyệt đối trên máy hiện tại:

```text
E:\baitap\NMCNPM\DOAN\SE104.Q22-QLTinChivaHocPhi\SE104.Q22-QLTinChivaHocPhi\project\src\config\init.sql
```

## 3. Tạo database PostgreSQL

Mở pgAdmin hoặc psql, tạo database theo tên trong `.env.example`:

```sql
CREATE DATABASE ql_tin_chi_hoc_phi_db;
```

Sau đó import file:

```text
project/src/config/init.sql
```

Ví dụ dùng `psql`:

```bash
psql -U postgres -d ql_tin_chi_hoc_phi_db -f project/src/config/init.sql
```

Nếu chạy lệnh từ trong thư mục `project`, dùng:

```bash
psql -U postgres -d ql_tin_chi_hoc_phi_db -f src/config/init.sql
```

## 4. Cấu hình biến môi trường

Chuyển vào thư mục `project`:

```bash
cd project
```

Tạo file `.env` từ file mẫu:

```bash
copy .env.example .env
```

Trên macOS/Linux:

```bash
cp .env.example .env
```

Mở file `.env` và chỉnh các giá trị PostgreSQL cho đúng máy của bạn:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ql_tin_chi_hoc_phi_db
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ql_tin_chi_hoc_phi_db?sslmode=disable"
PORT=5000
```

Các cấu hình Cloudinary, SMTP, VNPay, ZaloPay có thể để giá trị demo nếu chỉ chạy luồng cơ bản. Những chức năng liên quan upload ảnh, gửi email hoặc thanh toán sẽ cần cấu hình thật.

## 5. Cài dependencies

Trong thư mục `project`, chạy:

```bash
npm install
```

## 6. Kiểm tra Prisma

Sau khi cấu hình `DATABASE_URL`, có thể kiểm tra schema Prisma:

```bash
npx prisma validate
```

Nếu cần generate Prisma Client:

```bash
npx prisma generate
```

## 7. Chạy project

Trong thư mục `project`, chạy:

```bash
npm start
```

Hoặc:

```bash
npm run dev
```

Nếu chạy thành công, terminal sẽ hiển thị server đang lắng nghe ở cổng trong `.env`, mặc định là:

```text
http://localhost:5000
```

Trang health check:

```text
http://localhost:5000/api/health
```

## 8. Lệnh nhanh

Chạy từ thư mục gốc repo:

```bash
cd project
copy .env.example .env
npm install
npx prisma validate
npm start
```

Import database từ thư mục gốc repo:

```bash
psql -U postgres -d ql_tin_chi_hoc_phi_db -f project/src/config/init.sql
```

## 9. Ghi chú

- File `.env` phải nằm trong thư mục `project`, cùng cấp với `project/package.json`.
- File `init.sql` nằm tại `project/src/config/init.sql`.
- Project dùng `npm` và `package-lock.json`; không cần `yarn`.
- Nếu đã xóa `node_modules`, chỉ cần chạy lại `npm install` trong `project`.
