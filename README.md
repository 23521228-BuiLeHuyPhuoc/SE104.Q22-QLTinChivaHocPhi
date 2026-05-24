# Hệ thống Quản lý Tín chỉ và Học phí

Dự án Hệ thống Quản lý Đăng ký Tín chỉ và Đóng Học phí dành cho Sinh viên và Quản trị viên (Admin).
Dự án được xây dựng dựa trên kiến trúc **MVC (Model - View - Controller)** kết hợp **Server-Side Rendering (SSR)**.

## 🚀 Tính năng chính

### 🧑‍🎓 Dành cho Sinh viên (Student)
- **Đăng nhập & Hồ sơ cá nhân**: Quản lý thông tin tài khoản, mật khẩu.
- **Bảng điều khiển (Dashboard)**: Xem tổng quan dữ liệu cá nhân, thông báo mới nhất.
- **Đăng ký học phần (Course Registration)**: Tra cứu và đăng ký học phần/lớp học mở trong học kỳ hiện hành. Tính toán và cảnh báo quá giới hạn tín chỉ theo quy định.
- **Thời khóa biểu (My Schedule)**: Lịch học các môn đã đăng ký thành công chia theo ngày, tiết học.
- **Quản lý Học phí (My Tuition)**: Xem tông tiền cần đóng, nợ học phí và lịch sử đã thanh toán.

### 🛡️ Dành cho Quản trị viên (Admin)
- **Bảng điều khiển (Dashboard)**: Thống kê số lượng sinh viên, doanh thu, tổng quan hệ thống.
- **Quản lý Môn học & Lớp học**: Bổ sung, chỉnh sửa, xếp lịch và phân công giảng viên.
- **Quản lý Sinh viên**: Quản lý hồ sơ, chuẩn hóa trạng thái sinh viên (đang học, bảo lưu, thôi học).
- **Quản lý Học kỳ**: Mở/đóng học kỳ đăng ký, quy định thời gian.
- **Quản lý Tài chính**: Tra cứu quá trình nộp học phí của sinh viên, lập phiếu thu.
- **Báo cáo Thống kê (Reports)**: Biểu đồ báo cáo trực quan về tình trạng sinh viên, nguồn thu.
- **Quản lý Hệ thống (Users/Roles)**: Phân quyền admin/sinh viên.

## 🛠️ Công nghệ sử dụng (Tech Stack)

Hệ thống được phát triển với các công nghệ mũi nhọn & ổn định:
- **Backend framework**: `Node.js` + `Express.js`
- **Database**: `PostgreSQL`
- **ORM**: `Prisma` (Phiên bản v5 - Tự động Map Data Models)
- **Template Engine**: `Pug` (Server-Side Rendering)
- **Frontend Assets**: Vaniila Javascript, CSS 

## 📂 Tổ chức mã nguồn (Project Structure)

Dự án tuân thủ chặt chẽ mô hình kiến trúc MVC rõ ràng:

```text
├── project/
│   ├── prisma/
│   │   └── schema.prisma        # Cấu hình ORM Prisma & Lược đồ Database
│   ├── src/
│   │   ├── config/              # Cấu hình kết nối hệ thống
│   │   ├── controllers/         # Các Module xử lý nghiệp vụ (Business Logic) giao tiếp DB
│   │   ├── middleware/          # Xử lý xác thực Token (Auth), Phân quyền JWT
│   │   ├── models/              # Định dạng dữ liệu đầu ra/vào cho Controller
│   │   ├── routes/              # Bộ định tuyến API & View
│   │   ├── public/              # Tài nguyên tĩnh (CSS, Images, Client-side JS)
│   │   │   ├── css/
│   │   │   └── js/              # Mã xử lý Client (đã bóc tách hoàn toàn khỏi Pug)
│   │   └── views/
│   │       ├── layouts/         # Khung giao diện dùng chung (Admin/Student Master Layout)
│   │       ├── pages/           # Giao diện từng trang cụ thể
│   │       └── partials/        # Thành phần dùng lại (Header, Sidebar, Pagination...)
│   └── .env                     # Biến môi trường
└── README.md
```

## ⚙️ Hướng dẫn cài đặt & Khởi chạy dự án

### Yêu cầu tiên quyết (Prerequisites)
* [Node.js](https://nodejs.org/en/) (phiên bản khuyến nghị >= 18.x)
* [PostgreSQL](https://www.postgresql.org/download/) (phiên bản >= 14) đã được cài đặt và đang chạy.

---

### Các bước triển khai chi tiết

#### 1. Tải mã nguồn dự án
```bash
git clone https://github.com/23521228-BuiLeHuyPhuoc/SE104.Q22-QLTinChivaHocPhi.git
cd SE104.Q22-QLTinChivaHocPhi
```

#### 2. Khởi tạo Cơ sở dữ liệu (Database Setup)
Hệ thống sử dụng PostgreSQL làm CSDL chính. Hãy thực hiện các bước sau để thiết lập:

* **Bước A**: Đăng nhập vào PostgreSQL (pgAdmin hoặc Command Line) và tạo một cơ sở dữ liệu mới mang tên `ql_dangky_hocphi`:
  ```sql
  CREATE DATABASE ql_dangky_hocphi;
  ```
* **Bước B**: Nạp cấu hình bảng và dữ liệu mẫu ban đầu từ tệp `init.sql`:
  ```bash
  psql -U postgres -d ql_dangky_hocphi -f project/src/config/init.sql
  ```
* **Bước C**: Nạp dữ liệu danh sách Tỉnh/Thành phố/Phường/Xã từ tệp `ITExpressLocation.sql` ở thư mục gốc (bắt buộc để phục vụ tính năng chọn Địa chỉ và đối tượng miễn giảm học phí):
  ```bash
  psql -U postgres -d ql_dangky_hocphi -f ITExpressLocation.sql
  ```
  *(Thay thế `-U postgres` bằng username PostgreSQL của bạn nếu sử dụng tài khoản khác).*

---

#### 3. Cấu hình ứng dụng
Di chuyển vào thư mục `project/` để thiết lập môi trường:
```bash
cd project
```
* Tạo tệp cấu hình môi trường `.env` bằng cách nhân bản từ tệp `.env.example`:
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

#### 4. Cài đặt thư viện & Khởi tạo Prisma Client
Tại thư mục `project/`, chạy các lệnh sau:
```bash
# Cài đặt toàn bộ dependencies của dự án
yarn install
# (Hoặc sử dụng npm: npm install)

# Sinh mã Prisma Client tương ứng với Schema hiện tại
npx prisma generate
```

---

#### 5. Khởi chạy Ứng dụng
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

## 📝 Bản quyền & Đóng góp
* Đồ án phát triển Hệ thống Môn học (SE104.Q22).
* Người đóng góp chính: **Bui Le Huy Phuoc** và các thành viên nhóm.

