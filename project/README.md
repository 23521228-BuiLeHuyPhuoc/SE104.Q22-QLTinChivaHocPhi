# Hệ thống Quản lý Việc Đăng ký Môn học và Thu Học phí

Dự án Hệ thống Quản lý Việc Đăng ký Môn học và Thu Học phí dành cho Sinh viên và Quản trị viên (Admin).
Dự án được xây dựng dựa trên kiến trúc **MVC (Model - View - Controller)** kết hợp **Server-Side Rendering (SSR)**.

## 🚀 Tính năng chính

### 🧑‍🎓 Dành cho Sinh viên (Student)
- **Đăng nhập & Hồ sơ cá nhân**: Quản lý thông tin tài khoản, mật khẩu.
- **Bảng điều khiển (Dashboard)**: Xem tổng quan dữ liệu cá nhân, thông báo mới nhất.
- **Đăng ký học phần (Course Registration)**: Tra cứu và đăng ký học phần/lớp học mở trong học kỳ hiện hành.
- **Thời khóa biểu (My Schedule)**: Lịch học các môn đã đăng ký thành công.
- **Quản lý Học phí (My Tuition)**: Xem tông tiền cần đóng, nợ học phí và lịch sử đã thanh toán.

### 🛡️ Dành cho Quản trị viên (Admin)
- **Bảng điều khiển (Dashboard)**: Thống kê số lượng sinh viên, doanh thu, tổng quan hệ thống.
- **Quản lý Môn học & Lớp học**: Thêm mới, chỉnh sửa, xếp lịch môn học.
- **Quản lý Sinh viên**: Quản lý hồ sơ, chuẩn hóa trạng thái sinh viên.
- **Quản lý Học kỳ**: Mở/đóng học kỳ đăng ký.
- **Quản lý Tài chính**: Tra cứu quá trình nộp học phí, quản lý phiếu thu.
- **Báo cáo Thống kê (Reports)**: Khai xuất doanh thu, đăng ký môn học,...
- **Quản lý Hệ thống (Users/Roles)**: Phân quyền admin/sinh viên.

## 🛠️ Công nghệ sử dụng (Tech Stack)

Hệ thống được phát triển với các công nghệ mũi nhọn & ổn định:
- **Ngôn ngữ**: `JavaScript` (Node.js)
- **Backend framework**: `Express.js`
- **Database**: `PostgreSQL`
- **ORM**: `Prisma` (Phiên bản v5)
- **Template Engine**: `Pug` (Server-Side Rendering)
- **Frontend Assets**: Vaniila Javascript, CSS 

## 📂 Tổ chức mã nguồn (Project Structure)

Dự án tuân thủ chặt chẽ mô hình kiến trúc MVC rõ ràng:

```text
├── prisma/
│   └── schema.prisma        # Cấu hình ORM Prisma & Schema Database
├── src/
│   ├── config/              # Cấu hình kết nối hệ thống (Database, Middleware config)
│   ├── controllers/         # Các Module xử lý nghiệp vụ (Business Logic)
│   ├── middleware/          # Xử lý xác thực Token (Auth), Phân quyền
│   ├── models/              # Định dạng dữ liệu (Format/Type mapper)
│   ├── routes/              # Bộ định tuyến API & View
│   ├── public/              # Tài nguyên tĩnh (CSS, Images, Client-side JS)
│   │   ├── css/
│   │   └── js/              # Chứa kịch bản Client-side bóc tách hoàn toàn khỏi Pug
│   └── views/
│       ├── layouts/         # Khung giao diện dùng chung (Admin/Student Master Layout)
│       ├── pages/           # Giao diện từng trang chức năng cụ thể
│       └── partials/        # Thành phần dùng lại (Header, Sidebar, Pagination...)
└── .env                     # Biến môi trường
```

## ⚙️ Hướng dẫn cài đặt & Khởi chạy dự án

### Yêu cầu tiên quyết (Prerequisites)
* [Node.js](https://nodejs.org/en/) (phiên bản khuyến nghị >= 18.x)
* [PostgreSQL](https://www.postgresql.org/download/) (phiên bản >= 14) đã được cài đặt và đang chạy.

---

### Các bước triển khai chi tiết

#### 1. Khởi tạo Cơ sở dữ liệu (Database Setup)
Hệ thống sử dụng PostgreSQL làm CSDL chính. Hãy thực hiện các bước sau để thiết lập:

* **Bước A**: Đăng nhập vào PostgreSQL (pgAdmin hoặc Command Line) và tạo một cơ sở dữ liệu mới mang tên `ql_dangky_hocphi`:
  ```sql
  CREATE DATABASE ql_dangky_hocphi;
  ```
* **Bước B**: Nạp cấu hình bảng và dữ liệu mẫu ban đầu từ tệp `init.sql`:
  ```bash
  psql -U postgres -d ql_dangky_hocphi -f src/config/init.sql
  ```
* **Bước C**: Nạp dữ liệu danh sách Tỉnh/Thành phố/Phường/Xã từ tệp `ITExpressLocation.sql` ở thư mục cha:
  ```bash
  psql -U postgres -d ql_dangky_hocphi -f ../ITExpressLocation.sql
  ```
  *(Thay thế `-U postgres` bằng username PostgreSQL của bạn nếu sử dụng tài khoản khác).*

---

#### 2. Cấu hình ứng dụng
Tạo tệp cấu hình môi trường `.env` bằng cách sao chép từ tệp `.env.example`:
```bash
cp .env.example .env
```
* Mở tệp `.env` vừa tạo và cập nhật chính xác thông tin đăng nhập PostgreSQL của bạn tại dòng `DATABASE_URL`:
  ```dotenv
  PORT=5000
  DATABASE_URL="postgresql://postgres:MAT_KHAU_POSTGRES_CUA_BAN@localhost:5432/ql_dangky_hocphi?schema=public"
  JWT_SECRET="builehuyphuoc"
  JWT_EXPIRES_IN="24h"
  ```

---

#### 3. Cài đặt thư viện & Khởi tạo Prisma Client
Chạy các lệnh sau:
```bash
# Cài đặt toàn bộ dependencies của dự án
yarn install
# (Hoặc sử dụng npm: npm install)

# Sinh mã Prisma Client tương ứng với Schema hiện tại
npx prisma generate
```

---

#### 4. Khởi chạy Ứng dụng
```bash
# Khởi chạy chế độ phát triển (Development Mode - Hỗ trợ Hot Reload tự động cập nhật code)
yarn dev
# (Hoặc sử dụng npm: npm run dev)

# Khởi chạy chế độ Production tiêu chuẩn
yarn start
# (Hoặc sử dụng npm: npm start)
```

Sau khi khởi chạy thành công, mở trình duyệt của bạn và truy cập địa chỉ: **[http://localhost:5000](http://localhost:5000)**

---

### 🔐 Thông tin Đăng nhập Mẫu (Mặc định)

Hệ thống đã chèn sẵn các tài khoản mẫu phục vụ quá trình dùng thử và chấm điểm đồ án:

| Vai trò (Role) | Cổng đăng nhập | Tài khoản (Username) | Mật khẩu (Password) | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên** | `/admin/login` | `admin` | `admin123` | Toàn quyền quản trị hệ thống |
| **Sinh viên Mẫu** | `/student/login` | `student` | `student123` | Tài khoản sinh viên liên kết hồ sơ mẫu |
| **Sinh viên 1** | `/student/login` | `22520001` | `student123` | Sinh viên Nguyễn Văn An (Lớp KTPM) |
| **Sinh viên 2** | `/student/login` | `22520002` | `student123` | Sinh viên Trần Thị Bình (Lớp KHMT) |

---

## 👥 Tác giả
* Đồ án phát triển Hệ thống Môn học (SE104.Q22).
* Người đóng góp chính: **Bui Le Huy Phuoc** và các thành viên nhóm.

