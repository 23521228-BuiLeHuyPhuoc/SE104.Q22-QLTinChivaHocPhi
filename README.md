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

## ⚙️ Hướng dẫn cài đặt & Chạy trên máy cá nhân

### Yêu cầu tiên quyết (Prerequisites)
- [Node.js](https://nodejs.org/en/) (>= phiên bản 18.x)
- [PostgreSQL](https://www.postgresql.org/download/) (>= phiên bản 14) chạy nền
- npm hoặc yarn package manager

### Các bước cài đặt

**1. Clone dự án và cài đặt dependencies**
```bash
git clone https://github.com/23521228-BuiLeHuyPhuoc/SE104.Q22-QLTinChivaHocPhi.git
cd SE104.Q22-QLTinChivaHocPhi/project
yarn install
```

**2. Cấu hình biến môi trường (`.env`)**
Tạo file `.env` ở thư mục `project/` (hoặc copy từ `.env.example`) với nội dung tương tự sau:
```dotenv
PORT=5000
DATABASE_URL="postgresql://postgres:MAT_KHAU_CUA_BAN@localhost:5432/ql_dangky_hocphi?schema=public"
JWT_SECRET="SE104_SECRET_KEY_DANGKY_HOCPHI"
```

**3. Khởi tạo Database (Prisma)**
Kéo toàn bộ Data models từ DB PostgreSQL đã chuẩn bị (đảm bảo DB rỗng hoặc mới tạo theo tên trong URL) vào môi trường Prisma:
```bash
npx prisma db pull
npx prisma generate
```

**4. Chạy dự án**
```bash
# Chạy ở chế độ dành cho nhà phát triển (Development Mode - Live server reload)
yarn dev

# Hoặc chế độ khởi động tiêu chuẩn
yarn start
```

Sau khi chạy xong, Server sẽ mở cổng tại địa chỉ: `http://localhost:5000`

### 🔐 Thông tin Đăng nhập Mặc định
- Quản trị viên (Admin):
  - Tên đăng nhập: `admin`
  - Mật khẩu: `admin123`
- Đối với sinh viên, vui lòng vào giao diện Admin để tạo tài khoản hoặc sử dụng mã sinh viên có sẵn (VD: Mã SV làm tên đăng nhập, mk: `student123`).

## 📝 Bản quyền & Tác giả
- Đồ án phát triển Hệ thống Môn học (SE104.Q22).
- Tác giả: Nhóm sinh viên thực hiện đồ án (Bui Le Huy Phuoc).
