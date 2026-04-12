# Hệ thống Quản lý Tín chỉ và Học phí

Dự án Hệ thống Quản lý Đăng ký Tín chỉ và Đóng Học phí dành cho Sinh viên và Quản trị viên (Admin).
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
- **Báo cáo Thống kê (Reports)**: Khai xuất doanh thu, đăng ký tín chỉ,...
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

## ⚙️ Hướng dẫn cài đặt & Chạy trên máy cá nhân

### Yêu cầu tiên quyết (Prerequisites)
- [Node.js](https://nodejs.org/en/) (>= phiên bản 18.x)
- [PostgreSQL](https://www.postgresql.org/download/) (>= phiên bản 14)
- Yarn package manager (`npm install -g yarn`)

### Các bước cài đặt

**1. Clone dự án và cài đặt dependencies**
```bash
git clone https://github.com/23521228-BuiLeHuyPhuoc/SE104.Q22-QLTinChivaHocPhi.git
cd SE104.Q22-QLTinChivaHocPhi/project
yarn install
```

**2. Cấu hình biến môi trường (`.env`)**
Tạo file `.env` ở thư mục gốc (hoặc sửa đổi cấu hình trong `.env.example` thành `.env`) với nội dung:
```dotenv
PORT=5000
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<database_name>?schema=public"
JWT_SECRET="YOUR_SECRET_KEY"
```

**3. Khởi tạo Database (Prisma)**
Trích xuất database xuống Schema Prisma:
```bash
npx prisma db pull
npx prisma generate
```

**4. Chạy dự án**
```bash
# Chạy ở chế độ dành cho nhà phát triển (Development Mode)
yarn dev

# Hoặc chế độ khởi động tiêu chuẩn
yarn start
```

Dự án sẽ khởi chạy tại: `http://localhost:5000`

## 👥 Tác giả
- Nhóm sinh viên thực hiện đồ án môn học SE104.
- Đóng góp: **Bui Le Huy Phuoc** và các thành viên nhóm.
