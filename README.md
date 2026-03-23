# HỆ THỐNG QUẢN LÝ VIỆC ĐĂNG KÝ MÔN HỌC VÀ THU HỌC PHÍ CỦA SINH VIÊN

Đề tài SE104.Q22 - Hệ thống quản lý đăng ký môn học và thu học phí sinh viên.

## 📋 Mô tả dự án

Hệ thống web application quản lý việc đăng ký môn học và thu học phí của sinh viên, được phát triển bằng:
- **Frontend**: Pug (server-side rendering), CSS, Vanilla JS
- **Backend**: NodeJS (Express) - Pug view engine
- **Database**: PostgreSQL

## ✨ Tính năng

### 👨‍💼 Quản trị viên (Admin)
- Quản lý sinh viên (CRUD)
- Quản lý môn học (CRUD)
- Quản lý học kỳ và năm học
- **Quản lý tiết học và lịch học** (Thứ 2-7, Tiết 1-10, Buổi tối)
- Xem danh sách đăng ký môn học
- Quản lý học phí và theo dõi công nợ
- Ghi nhận thanh toán học phí
- **Nhập và quản lý điểm sinh viên**
- **Cấu hình quy định đăng ký** (số tín chỉ tối đa, GPA vượt...)
- Xem báo cáo thống kê

### 👨‍🎓 Sinh viên
- Đăng ký môn học theo học kỳ
- **Kiểm tra giới hạn tín chỉ** (max 24 TC, vượt cần GPA >= 8.5)
- **Xem thời khóa biểu cá nhân**
- Xem danh sách môn học đã đăng ký
- **Xem bảng điểm và GPA tích lũy**
- Xem thông tin học phí
- Xem lịch sử thanh toán

### 📊 Quy định đăng ký môn học
- Số tín chỉ tối đa mỗi học kỳ: **24 tín chỉ**
- Điều kiện vượt tín chỉ: GPA tích lũy >= **8.5**
- Số tín chỉ tối đa khi vượt: **30 tín chỉ**
- Điểm đậu môn học: >= **5.0** (dưới 5.0 = Rớt, cần học lại)

### 📅 Khung giờ học
| Tiết | Thời gian |
|------|-----------|
| Tiết 1 | 07:30 - 08:15 |
| Tiết 2 | 08:15 - 09:00 |
| Tiết 3 | 09:00 - 09:45 |
| Tiết 4 | 09:45 - 10:30 |
| Tiết 5 | 10:45 - 11:30 |
| Tiết 6 | 13:00 - 13:45 |
| Tiết 7 | 13:45 - 14:30 |
| Tiết 8 | 14:30 - 15:15 |
| Tiết 9 | 15:30 - 16:15 |
| Tiết 10 | 16:15 - 17:00 |
| Buổi tối | 17:45 - 20:45 |

## 🚀 Cài đặt và Chạy

### Yêu cầu hệ thống
- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm hoặc yarn

### 1. Cài đặt Database

#### Cách 1: Sử dụng Terminal (psql)

```bash
# Chạy toàn bộ script từ terminal (tạo database + khởi tạo dữ liệu)
psql -U postgres -f backend/src/config/init.sql
```

#### Cách 2: Sử dụng pgAdmin 4 hoặc GUI tools khác

Do file `init.sql` chứa lệnh `\connect` (chỉ hoạt động trong psql), bạn cần sử dụng 2 file riêng biệt:

**Bước 1: Tạo database**
1. Mở pgAdmin 4
2. Kết nối đến server PostgreSQL
3. Mở Query Tool (chọn database `postgres` hoặc bất kỳ database nào)
4. Mở file `backend/src/config/create_database.sql`
5. Chạy script (F5 hoặc nút Execute)

**Bước 2: Khởi tạo schema và dữ liệu**
1. Refresh danh sách Databases
2. Kết nối vào database `ql_dangky_hocphi` (Click phải -> Query Tool)
3. Mở file `backend/src/config/init_schema.sql`
4. Chạy script (F5 hoặc nút Execute)

### 2. Cài đặt và Chạy Backend (bao gồm cả Frontend SSR)

```bash
cd backend

# Cài đặt dependencies
npm install

# Copy file cấu hình môi trường
cp .env.example .env

# Chỉnh sửa .env với thông tin database của bạn

# Chạy server
npm start
```

Server sẽ chạy tại: http://localhost:5000

> **Lưu ý:** Giao diện frontend được render bởi server (SSR) qua Pug template engine. Truy cập http://localhost:5000/ để sử dụng.

## 🔐 Tài khoản mặc định

### Admin
- Username: `admin`
- Password: `admin123`

### Sinh viên
- Tạo sinh viên mới qua giao diện Admin
- Username: Mã sinh viên
- Password mặc định: `student123`

## 📁 Cấu trúc dự án

```
├── backend/
│   ├── src/
│   │   ├── config/         # Cấu hình database và SQL init
│   │   ├── controllers/    # Controllers xử lý logic API
│   │   ├── middleware/     # Middleware xác thực
│   │   ├── routes/         # API routes + SSR view routes
│   │   ├── views/          # Pug templates (SSR frontend)
│   │   │   ├── layouts/    # Base layouts (admin, student, auth)
│   │   │   ├── pages/      # Page templates
│   │   │   │   ├── admin/  # Admin pages
│   │   │   │   └── student/# Student pages
│   │   │   └── partials/   # Reusable partials (header, footer, sidebar)
│   │   ├── public/         # Static files
│   │   │   ├── css/        # CSS stylesheets
│   │   │   └── js/         # Client-side JavaScript
│   │   └── index.js        # Entry point
│   ├── .env.example
│   └── package.json
│
└── README.md
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký (Admin only)
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Students
- `GET /api/students` - Danh sách sinh viên
- `GET /api/students/:id` - Chi tiết sinh viên
- `POST /api/students` - Thêm sinh viên
- `PUT /api/students/:id` - Cập nhật sinh viên
- `DELETE /api/students/:id` - Xóa sinh viên

### Courses
- `GET /api/courses` - Danh sách môn học
- `GET /api/courses/:id` - Chi tiết môn học
- `POST /api/courses` - Thêm môn học
- `PUT /api/courses/:id` - Cập nhật môn học
- `DELETE /api/courses/:id` - Xóa môn học

### Course Registrations
- `GET /api/registrations` - Danh sách đăng ký
- `POST /api/registrations` - Đăng ký môn học
- `PUT /api/registrations/:id/cancel` - Hủy đăng ký
- `GET /api/registrations/student/:student_id` - Môn học của sinh viên
- `GET /api/registrations/available` - Môn học có thể đăng ký

### Tuition Fees
- `GET /api/tuition` - Danh sách học phí
- `GET /api/tuition/:id` - Chi tiết học phí
- `GET /api/tuition/student/:student_id` - Học phí của sinh viên
- `POST /api/tuition/calculate` - Tính học phí

### Payments
- `GET /api/payments` - Danh sách thanh toán
- `POST /api/payments` - Ghi nhận thanh toán
- `GET /api/payments/student/:student_id` - Lịch sử thanh toán của sinh viên

### Semesters
- `GET /api/semesters` - Danh sách học kỳ
- `GET /api/semesters/active` - Học kỳ hiện tại
- `POST /api/semesters` - Thêm học kỳ
- `PUT /api/semesters/:id` - Cập nhật học kỳ
- `DELETE /api/semesters/:id` - Xóa học kỳ

## 📸 Screenshots

Giao diện hệ thống bao gồm:
- Trang đăng nhập
- Dashboard tổng quan
- Quản lý sinh viên
- Quản lý môn học
- Đăng ký môn học
- Quản lý học phí
- Ghi nhận thanh toán
- Quản lý học kỳ

## 🛠️ Công nghệ sử dụng

### Frontend (Server-Side Rendering)
- Pug (template engine)
- CSS3 (với CSS Variables cho light/dark theme)
- Vanilla JavaScript (client-side interactions)

### Backend
- Node.js
- Express.js (+ Pug view engine)
- PostgreSQL (pg)
- JWT (jsonwebtoken)
- bcryptjs
- cookie-parser
- CORS
- dotenv

## 📝 License

ISC License

## 👥 Tác giả

- SE104.Q22 - Đồ án môn học
