# 📋 PHÂN CHIA MODULE VÀ FILES LIÊN QUAN

## Hệ thống Quản lý Đăng ký Môn học và Thu Học phí

---

## 📌 TỔNG QUAN

Tài liệu này mô tả cấu trúc module của hệ thống và liệt kê các file liên quan đến từng module, đảm bảo đáp ứng đầy đủ các yêu cầu BM1-BM7 và QĐ1-QĐ7.

> **Kiến trúc:** Server-Side Rendering (SSR) bằng Pug template engine. Frontend được render phía server, không dùng React/Vite. CSS và client JS nằm trong `backend/src/public/`.

---

## 🗂️ MODULE 1: QUẢN LÝ ĐỊA DANH (QĐ1)

### Mô tả:
Quản lý danh sách Tỉnh/Thành phố và Phường/Xã. Phân loại khu vực ưu tiên (KV1, KV2, KV2-NT, KV3) để áp dụng chính sách miễn giảm học phí. Dữ liệu từ file ITExpressLocation.sql.

### Bảng Database:
- `tinh` - Tỉnh/Thành phố (từ ITExpressLocation.sql - 34 tỉnh)
- `phuong_xa` - Phường/Xã (từ ITExpressLocation.sql - 3319 phường/xã, có cột `khu_vuc`)
- `dan_toc` - Dân tộc (54 dân tộc, có cột `la_dan_toc_thieu_so`)

> ⚠️ **Lưu ý:** Đối tượng "vùng sâu vùng xa" = KV3 + dân tộc thiểu số

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `tinh`, `phuong_xa`, `dan_toc`, dữ liệu mẫu |
| **Backend** | `backend/src/controllers/locationController.js` | API CRUD Tỉnh/Phường xã/Dân tộc |
| **Backend** | `backend/src/routes/locationRoutes.js` | Routes cho địa danh |
| **Frontend** | `backend/src/views/pages/admin/locations.pug` | Giao diện quản lý |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/locations/provinces          - Lấy danh sách tỉnh
GET    /api/locations/provinces/:id      - Chi tiết tỉnh
POST   /api/locations/provinces          - Thêm tỉnh
PUT    /api/locations/provinces/:id      - Sửa tỉnh
DELETE /api/locations/provinces/:id      - Xóa tỉnh
GET    /api/locations/wards              - Lấy danh sách phường/xã
GET    /api/locations/wards/:id          - Chi tiết phường/xã
GET    /api/locations/wards/province/:id - Phường/xã theo tỉnh
POST   /api/locations/wards              - Thêm phường/xã
PUT    /api/locations/wards/:id          - Sửa phường/xã (khu vực ưu tiên)
DELETE /api/locations/wards/:id          - Xóa phường/xã
GET    /api/ethnicities                  - Lấy danh sách dân tộc
GET    /api/ethnicities/:id              - Chi tiết dân tộc
```

---

## 🗂️ MODULE 2: QUẢN LÝ ĐỐI TƯỢNG ƯU TIÊN (QĐ1)

### Mô tả:
Quản lý các đối tượng ưu tiên (con liệt sĩ, thương binh, vùng sâu...) và tỷ lệ giảm học phí tương ứng. Gán đối tượng cho sinh viên.

### Bảng Database:
- `doi_tuong` - Danh sách đối tượng ưu tiên
- `doi_tuong_sinh_vien` - Liên kết SV với đối tượng

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `doi_tuong`, `doi_tuong_sinh_vien` |
| **Backend** | `backend/src/controllers/priorityObjectController.js` | API CRUD đối tượng |
| **Backend** | `backend/src/routes/priorityObjectRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/priority-objects.pug` | Giao diện quản lý |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/priority-objects             - Lấy danh sách đối tượng
GET    /api/priority-objects/:id         - Chi tiết đối tượng
POST   /api/priority-objects             - Thêm đối tượng
PUT    /api/priority-objects/:id         - Sửa đối tượng
DELETE /api/priority-objects/:id         - Xóa đối tượng
GET    /api/priority-objects/student/:id - Đối tượng của sinh viên
POST   /api/priority-objects/assign      - Gán đối tượng cho SV
DELETE /api/priority-objects/student/:sv_id/:obj_id - Xóa gán
```

---

## 🗂️ MODULE 3: QUẢN LÝ SINH VIÊN (BM1, QĐ1)

### Mô tả:
Lập và quản lý hồ sơ sinh viên bao gồm: họ tên, ngày sinh, giới tính, quê quán (huyện/tỉnh), đối tượng ưu tiên, ngành học.

### Bảng Database:
- `sinh_vien` - Thông tin sinh viên
- `tai_khoan` - Tài khoản đăng nhập

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `sinh_vien`, `tai_khoan`, function `fn_lay_ti_le_giam_hoc_phi` |
| **Backend** | `backend/src/controllers/studentController.js` | API CRUD sinh viên |
| **Backend** | `backend/src/routes/studentRoutes.js` | Routes |
| **Backend** | `backend/src/controllers/authController.js` | API xác thực |
| **Backend** | `backend/src/routes/authRoutes.js` | Routes xác thực |
| **Backend** | `backend/src/middleware/authMiddleware.js` | Middleware xác thực |
| **Frontend** | `backend/src/views/pages/admin/students.pug` | Giao diện quản lý SV |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/routes/viewRoutes.js` (auth middleware) | Context xác thực |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | **Tạo mới** - API service sinh viên |

### API Endpoints:
```
GET    /api/students                     - Lấy danh sách sinh viên
GET    /api/students/:id                 - Chi tiết sinh viên
POST   /api/students                     - Thêm sinh viên (BM1)
PUT    /api/students/:id                 - Sửa sinh viên
DELETE /api/students/:id                 - Xóa sinh viên
GET    /api/students/:id/discount-rate   - Lấy tỷ lệ giảm HP (QĐ1)
POST   /api/students/:id/avatar          - Upload ảnh đại diện
```

---

## 🗂️ MODULE 4: QUẢN LÝ KHOA & NGÀNH HỌC (QĐ1)

### Mô tả:
Quản lý danh sách Khoa và Ngành học. Mỗi Khoa có nhiều Ngành, mỗi sinh viên học một Ngành.

### Bảng Database:
- `khoa` - Danh sách Khoa
- `nganh_hoc` - Danh sách Ngành học

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `khoa`, `nganh_hoc` |
| **Backend** | `backend/src/controllers/departmentController.js` | API CRUD Khoa/Ngành |
| **Backend** | `backend/src/routes/departmentRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/departments.pug` | Giao diện quản lý |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/departments                  - Lấy danh sách khoa
GET    /api/departments/:id              - Chi tiết khoa
POST   /api/departments                  - Thêm khoa
PUT    /api/departments/:id              - Sửa khoa
DELETE /api/departments/:id              - Xóa khoa
GET    /api/majors                       - Lấy danh sách ngành
GET    /api/majors/:id                   - Chi tiết ngành
GET    /api/majors/department/:id        - Ngành theo khoa
POST   /api/majors                       - Thêm ngành
PUT    /api/majors/:id                   - Sửa ngành
DELETE /api/majors/:id                   - Xóa ngành
```

---

## 🗂️ MODULE 5: QUẢN LÝ MÔN HỌC (BM2, QĐ2)

### Mô tả:
Quản lý danh sách môn học với: mã môn, tên môn, loại môn (LT/TH), số tiết. Số tín chỉ tự động tính theo QĐ2.

### Bảng Database:
- `mon_hoc` - Danh sách môn học (có cột computed `so_tin_chi`)
- `dieu_kien_mon_hoc` - Điều kiện tiên quyết/học trước

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `mon_hoc`, `dieu_kien_mon_hoc` |
| **Backend** | `backend/src/controllers/courseController.js` | API CRUD môn học |
| **Backend** | `backend/src/routes/courseRoutes.js` | Routes |
| **Backend** | `backend/src/controllers/prerequisiteController.js` | API điều kiện môn |
| **Backend** | `backend/src/routes/prerequisiteRoutes.js` | Routes điều kiện |
| **Frontend** | `backend/src/views/pages/admin/courses.pug` | Giao diện quản lý môn |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | **Tạo mới** - API service môn học |

### API Endpoints:
```
GET    /api/courses                      - Lấy danh sách môn học
GET    /api/courses/:id                  - Chi tiết môn học
POST   /api/courses                      - Thêm môn học (BM2)
PUT    /api/courses/:id                  - Sửa môn học
DELETE /api/courses/:id                  - Xóa môn học
GET    /api/courses/:id/prerequisites    - Lấy điều kiện tiên quyết
POST   /api/courses/:id/prerequisites    - Thêm điều kiện
DELETE /api/courses/:id/prerequisites/:prereq_id - Xóa điều kiện
```

---

## 🗂️ MODULE 6: QUẢN LÝ LỚP HỌC

### Mô tả:
Quản lý các lớp học của môn học. Mỗi môn có thể có nhiều lớp với giảng viên, lịch học, phòng học khác nhau.

### Bảng Database:
- `lop` - Danh sách lớp học

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `lop` |
| **Backend** | `backend/src/controllers/classController.js` | API CRUD lớp |
| **Backend** | `backend/src/routes/classRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/classes.pug` | Giao diện quản lý |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |

### API Endpoints:
```
GET    /api/classes                      - Lấy danh sách lớp
GET    /api/classes/:id                  - Chi tiết lớp
GET    /api/classes/course/:id           - Lớp theo môn học
POST   /api/classes                      - Thêm lớp
PUT    /api/classes/:id                  - Sửa lớp
DELETE /api/classes/:id                  - Xóa lớp
```

---

## 🗂️ MODULE 7: CHƯƠNG TRÌNH HỌC (BM3, QĐ3)

### Mô tả:
Quản lý chương trình đào tạo theo ngành học. Mỗi ngành có danh sách môn học theo học kỳ dự kiến.

### Bảng Database:
- `chuong_trinh_hoc` - Chương trình học theo ngành

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `chuong_trinh_hoc` |
| **Backend** | `backend/src/controllers/curriculumController.js` | API CRUD chương trình |
| **Backend** | `backend/src/routes/curriculumRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/curriculum.pug` | Giao diện quản lý |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/curriculum                   - Lấy danh sách CTĐT
GET    /api/curriculum/major/:id         - CTĐT theo ngành (BM3)
POST   /api/curriculum                   - Thêm môn vào CTĐT
PUT    /api/curriculum/:id               - Sửa
DELETE /api/curriculum/:id               - Xóa
```

---

## 🗂️ MODULE 8: NĂM HỌC & HỌC KỲ (BM4, QĐ4)

### Mô tả:
Quản lý năm học và học kỳ. Có 2 loại học kỳ: Chính (HK I, HK II) và Hè.

### Bảng Database:
- `nam_hoc` - Năm học
- `hoc_ky` - Học kỳ (có cột `loai_hoc_ky`, `han_dong_hoc_phi`)

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `nam_hoc`, `hoc_ky` |
| **Backend** | `backend/src/controllers/academicYearController.js` | API năm học |
| **Backend** | `backend/src/routes/academicYearRoutes.js` | Routes năm học |
| **Backend** | `backend/src/controllers/semesterController.js` | API học kỳ |
| **Backend** | `backend/src/routes/semesterRoutes.js` | Routes học kỳ |
| **Frontend** | `backend/src/views/pages/admin/semesters.pug` | Giao diện quản lý |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |

### API Endpoints:
```
GET    /api/academic-years               - Lấy danh sách năm học
POST   /api/academic-years               - Thêm năm học
GET    /api/semesters                    - Lấy danh sách học kỳ
GET    /api/semesters/active             - Học kỳ đang diễn ra
GET    /api/semesters/:id                - Chi tiết học kỳ
POST   /api/semesters                    - Thêm học kỳ
PUT    /api/semesters/:id                - Sửa học kỳ
DELETE /api/semesters/:id                - Xóa học kỳ
```

---

## 🗂️ MODULE 9: LỚP MỞ TRONG HỌC KỲ (BM4, QĐ4)

### Mô tả:
Quản lý danh sách lớp mở trong từng học kỳ. Dựa trên chương trình học để mở lớp.

### Bảng Database:
- `lop_mo` - Lớp mở trong học kỳ

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `lop_mo` |
| **Backend** | `backend/src/controllers/openClassController.js` | API lớp mở |
| **Backend** | `backend/src/routes/openClassRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/open-classes.pug` | Giao diện quản lý |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/open-classes                 - Lấy danh sách lớp mở
GET    /api/open-classes/semester/:id    - Lớp mở theo học kỳ (BM4)
POST   /api/open-classes                 - Mở lớp trong học kỳ
PUT    /api/open-classes/:id             - Sửa
DELETE /api/open-classes/:id             - Đóng lớp
```

---

## 🗂️ MODULE 10: ĐƠN GIÁ TÍN CHỈ (QĐ5)

### Mô tả:
Quản lý đơn giá tín chỉ theo loại môn (LT/TH) và loại học (học mới, học lại, học cải thiện, học hè).

### Bảng Database:
- `don_gia_tin_chi` - Đơn giá tín chỉ

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `don_gia_tin_chi`, function `fn_lay_don_gia` |
| **Backend** | `backend/src/controllers/priceController.js` | API đơn giá |
| **Backend** | `backend/src/routes/priceRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/unit-prices.pug` | Giao diện quản lý |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/unit-prices                  - Lấy danh sách đơn giá
GET    /api/unit-prices/:id              - Chi tiết đơn giá
POST   /api/unit-prices                  - Thêm đơn giá
PUT    /api/unit-prices/:id              - Sửa đơn giá
DELETE /api/unit-prices/:id              - Xóa đơn giá
GET    /api/unit-prices/calculate        - Tính giá theo loại môn, loại học
```

---

## 🗂️ MODULE 11: ĐĂNG KÝ HỌC PHẦN (BM5, QĐ5)

### Mô tả:
Quản lý phiếu đăng ký học phần của sinh viên. SV chỉ được đăng ký lớp có mở trong học kỳ.

### Bảng Database:
- `phieu_dang_ky` - Phiếu đăng ký học phần
- `chi_tiet_dang_ky` - Chi tiết lớp đăng ký

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `phieu_dang_ky`, `chi_tiet_dang_ky`, function `sp_dang_ky_lop` |
| **Backend** | `backend/src/controllers/registrationController.js` | API đăng ký |
| **Backend** | `backend/src/routes/registrationRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/registrations.pug` | Giao diện admin |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/views/pages/student/course-registration.pug` | Giao diện SV đăng ký |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/views/pages/student/my-courses.pug` | Môn học đã đăng ký |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |

### API Endpoints:
```
GET    /api/registrations                - Lấy danh sách phiếu ĐK
GET    /api/registrations/:id            - Chi tiết phiếu
GET    /api/registrations/student/:id    - Phiếu ĐK của SV
GET    /api/registrations/available      - Lớp có thể đăng ký
POST   /api/registrations                - Đăng ký lớp (BM5)
PUT    /api/registrations/:id/cancel     - Hủy đăng ký
```

---

## 🗂️ MODULE 12: THU HỌC PHÍ (BM6, QĐ6)

### Mô tả:
Quản lý phiếu thu học phí. SV có thể đóng nhiều lần cho một phiếu đăng ký.

### Bảng Database:
- `phieu_thu_hoc_phi` - Phiếu thu học phí

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `phieu_thu_hoc_phi`, function `sp_thu_hoc_phi` |
| **Backend** | `backend/src/controllers/paymentController.js` | API phiếu thu |
| **Backend** | `backend/src/routes/paymentRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/payments.pug` | Giao diện admin |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/views/pages/student/my-payments.pug` | Lịch sử thanh toán SV |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |

### API Endpoints:
```
GET    /api/payments                     - Lấy danh sách phiếu thu
GET    /api/payments/:id                 - Chi tiết phiếu thu
GET    /api/payments/student/:id         - Phiếu thu của SV
POST   /api/payments                     - Lập phiếu thu (BM6)
PUT    /api/payments/:id                 - Sửa phiếu thu
DELETE /api/payments/:id                 - Hủy phiếu thu
```

---

## 🗂️ MODULE 13: HỌC PHÍ & MIỄN GIẢM (QĐ6, QĐ7)

### Mô tả:
Quản lý học phí: tính tiền đăng ký, tiền miễn giảm (theo đối tượng), tiền phải đóng, tiền đã đóng, tiền còn lại.

### Bảng Database:
- Sử dụng các bảng: `phieu_dang_ky`, `phieu_thu_hoc_phi`, `doi_tuong_sinh_vien`

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | View `v_phieu_dang_ky`, `v_bao_cao_sv_chua_dong_hoc_phi` |
| **Backend** | `backend/src/controllers/tuitionController.js` | API học phí |
| **Backend** | `backend/src/routes/tuitionRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/tuition.pug` | Giao diện quản lý |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/views/pages/student/my-tuition.pug` | Xem học phí của SV |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |

### API Endpoints:
```
GET    /api/tuition                      - Lấy danh sách học phí
GET    /api/tuition/:id                  - Chi tiết học phí
GET    /api/tuition/student/:id          - Học phí của SV
POST   /api/tuition/calculate            - Tính học phí
GET    /api/tuition/remaining/:sv_id/:hk_id - Số tiền còn lại (QĐ7)
```

---

## 🗂️ MODULE 14: BÁO CÁO (BM7)

### Mô tả:
Lập báo cáo danh sách SV chưa hoàn thành đóng học phí theo học kỳ.

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | View `v_bao_cao_sv_chua_dong_hoc_phi` |
| **Backend** | `backend/src/controllers/reportController.js` | API báo cáo |
| **Backend** | `backend/src/routes/reportRoutes.js` | Routes |
| **Frontend** | `backend/src/views/pages/admin/reports.pug` | Giao diện báo cáo |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/reports/unpaid-tuition       - Báo cáo SV chưa đóng HP (BM7)
GET    /api/reports/unpaid-tuition/:semester_id - Theo học kỳ
GET    /api/reports/registration-stats   - Thống kê đăng ký
GET    /api/reports/tuition-stats        - Thống kê học phí
GET    /api/reports/export/:type         - Xuất báo cáo Excel/PDF
```

---

## 🗂️ MODULE 15: THÔNG BÁO

### Mô tả:
Quản lý thông báo chung và thông báo cá nhân cho sinh viên.

### Bảng Database:
- `thong_bao` - Thông báo chung
- `thong_bao_ca_nhan` - Thông báo cá nhân

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `thong_bao`, `thong_bao_ca_nhan` |
| **Backend** | `backend/src/controllers/notificationController.js` | API thông báo |
| **Backend** | `backend/src/routes/notificationRoutes.js` | Routes |
| **Frontend** | `backend/src/views/partials/header.pug` (notification display) | Component thông báo |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |

### API Endpoints:
```
GET    /api/notifications                - Lấy thông báo chung
GET    /api/notifications/personal       - Thông báo cá nhân
POST   /api/notifications                - Tạo thông báo
PUT    /api/notifications/:id/read       - Đánh dấu đã đọc
```

---

## 🗂️ MODULE 16: DASHBOARD

### Mô tả:
Trang tổng quan hiển thị thống kê và trạng thái hệ thống.

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **Frontend** | `backend/src/views/pages/admin/dashboard.pug` | Giao diện dashboard |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/views/pages/admin/dashboard.pug` (stat cards inline) | Component thống kê |
| **Frontend** | `backend/src/views/pages/admin/reports.pug` (charts inline) | Component biểu đồ |

---

## 📊 TỔNG HỢP MODULE THEO YÊU CẦU

| Biểu mẫu/Quy định | Module liên quan |
|-------------------|------------------|
| **BM1** - Lập hồ sơ sinh viên | Module 1, 2, 3, 4 |
| **QĐ1** - Quê quán, đối tượng ưu tiên | Module 1, 2 |
| **BM2** - Nhập danh sách môn học | Module 5, 6 |
| **QĐ2** - Loại môn, số tín chỉ | Module 5 |
| **BM3** - Nhập chương trình học | Module 7 |
| **QĐ3** - Kế hoạch đào tạo | Module 7, 9 |
| **BM4** - Môn học mở trong học kỳ | Module 8, 9 |
| **QĐ4** - Học kỳ chính/hè | Module 8 |
| **BM5** - Phiếu đăng ký học phần | Module 11 |
| **QĐ5** - Đơn giá, đăng ký lớp mở | Module 10, 11 |
| **BM6** - Phiếu thu học phí | Module 12 |
| **QĐ6** - Đóng nhiều lần, hạn đóng | Module 12, 13 |
| **BM7** - Báo cáo SV chưa đóng HP | Module 14 |
| **QĐ7** - Miễn giảm theo đối tượng | Module 13 |
| **Quản lý Lịch học** - Tiết học, thời khóa biểu | Module 17 |
| **Quản lý Điểm** - Bảng điểm, đậu/rớt | Module 18 |
| **Cấu hình đăng ký** - Giới hạn tín chỉ, GPA vượt | Module 19 |

---

## 🗂️ MODULE 17: QUẢN LÝ LỊCH HỌC & TIẾT HỌC (MỚI)

### Mô tả:
Quản lý tiết học (Tiết 1-10, Buổi tối), lịch học của các lớp mở. Trường hoạt động từ Thứ 2 đến Thứ 7.

### Bảng Database:
- `tiet_hoc` - Danh sách tiết học (7:30 - 20:45)
- `lich_hoc_lop` - Lịch học chi tiết của lớp mở

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `tiet_hoc`, `lich_hoc_lop`, dữ liệu mẫu |
| **Backend** | `backend/src/controllers/scheduleController.js` | API CRUD lịch học |
| **Backend** | `backend/src/routes/scheduleRoutes.js` | Routes cho lịch học |
| **Frontend** | `backend/src/views/pages/admin/schedule.pug` | Giao diện quản lý lịch học |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/views/pages/student/my-schedule.pug` | Thời khóa biểu sinh viên |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/schedules/periods             - Lấy danh sách tiết học
GET    /api/schedules/class/:lop_mo_id    - Lịch học của lớp mở
POST   /api/schedules/class               - Thêm lịch học cho lớp
PUT    /api/schedules/class/:id           - Sửa lịch học
DELETE /api/schedules/class/:id           - Xóa lịch học
GET    /api/schedules/student/:sv_id      - Thời khóa biểu sinh viên
GET    /api/schedules/semester/:hk_id     - Lịch học theo học kỳ
POST   /api/schedules/check-conflict      - Kiểm tra trùng lịch
```

### Phân công: **THÀNH VIÊN 3**

---

## 🗂️ MODULE 18: QUẢN LÝ ĐIỂM SINH VIÊN (MỚI)

### Mô tả:
Quản lý điểm các môn học của sinh viên. Xác định đậu/rớt (điểm TB < 5.0 = Rớt). Tính điểm GPA tích lũy.

### Bảng Database:
- `diem_sinh_vien` - Điểm các môn học (quá trình, giữa kỳ, cuối kỳ, TB, chữ)

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `diem_sinh_vien`, view `v_diem_tich_luy_sinh_vien` |
| **Backend** | `backend/src/controllers/gradeController.js` | API CRUD điểm |
| **Backend** | `backend/src/routes/gradeRoutes.js` | Routes cho điểm |
| **Frontend** | `backend/src/views/pages/admin/grades.pug` | Giao diện nhập điểm (admin) |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/views/pages/student/my-grades.pug` | Xem bảng điểm (sinh viên) |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/views/pages/student/transcript.pug` | Bảng điểm tích lũy |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/grades/student/:sv_id                     - Tất cả điểm của SV
GET    /api/grades/student/:sv_id/semester/:hk_id     - Điểm theo học kỳ
POST   /api/grades                                     - Nhập điểm
PUT    /api/grades/:id                                 - Sửa điểm
GET    /api/grades/gpa/:sv_id                         - Lấy GPA tích lũy
GET    /api/grades/transcript/:sv_id                  - Bảng điểm toàn khóa
GET    /api/grades/class/:lop_id                      - Điểm của cả lớp
```

### Quy định đậu/rớt:
- **Điểm TB >= 5.0**: Đậu
- **Điểm TB < 5.0**: Rớt (cần học lại)

### Phân công: **THÀNH VIÊN 4**

---

## 🗂️ MODULE 19: CẤU HÌNH ĐĂNG KÝ MÔN HỌC (MỚI)

### Mô tả:
Quản lý các quy định về đăng ký môn học: số tín chỉ tối đa (24), điều kiện vượt tín chỉ (GPA >= 8.5).

### Bảng Database:
- `cau_hinh_dang_ky` - Các cấu hình đăng ký (max TC, GPA vượt, điểm đậu...)

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **SQL** | `backend/src/config/init.sql` | Bảng `cau_hinh_dang_ky`, dữ liệu mẫu |
| **Backend** | `backend/src/controllers/configController.js` | API cấu hình |
| **Backend** | `backend/src/routes/configRoutes.js` | Routes cấu hình |
| **Frontend** | `backend/src/views/pages/admin/registration-config.pug` | Giao diện cấu hình |
| **Frontend** | `backend/src/public/css/theme.css` (shared) | Styles |
| **Frontend** | `backend/src/public/js/main.js` (shared client JS) | API service |

### API Endpoints:
```
GET    /api/config/registration           - Lấy tất cả cấu hình
GET    /api/config/registration/:key      - Lấy cấu hình theo mã
PUT    /api/config/registration/:key      - Cập nhật cấu hình
GET    /api/config/check-credit-limit     - Kiểm tra giới hạn TC cho SV
```

### Cấu hình mặc định:
| Mã | Tên | Giá trị |
|----|-----|---------|
| MAX_TC_HK | Số tín chỉ tối đa mỗi học kỳ | 24 |
| MIN_GPA_VUOT | GPA tối thiểu để vượt TC | 8.5 |
| MAX_TC_VUOT | Số TC tối đa khi vượt | 30 |
| DIEM_DAU | Điểm đậu tối thiểu | 5.0 |

### Phân công: **THÀNH VIÊN 3**

---

## 🗂️ MODULE 20: PHÂN QUYỀN HỆ THỐNG VÀ QUẢN LÝ TÀI KHOẢN

### Mô tả:
Phân quyền đơn giản theo 2 vai trò: **admin** (Quản trị viên) và **sinh_vien** (Sinh viên). Admin được truy cập toàn bộ trang quản trị, chỉnh sửa dữ liệu, và **thay đổi role** của tài khoản khác (nâng sinh viên lên admin hoặc hạ admin xuống sinh viên). Sinh viên chỉ truy cập được phần dành cho sinh viên, không vào được trang admin. Sử dụng cột `role` có sẵn trong bảng `tai_khoan`, không cần thêm bảng CSDL.

### Bảng Database:
- Sử dụng cột `role` trong bảng `tai_khoan` (đã có sẵn, CHECK: `admin`, `sinh_vien`)
- Không tạo thêm bảng mới

### Files liên quan:

| Loại | File | Mô tả |
|------|------|-------|
| **Backend** | `backend/src/middleware/auth.js` | Middleware `authMiddleware` (xác thực token) và `adminMiddleware` (kiểm tra role admin) |
| **Backend** | `backend/src/controllers/roleController.js` | API xem vai trò, danh sách tài khoản, thay đổi role |
| **Backend** | `backend/src/routes/roleRoutes.js` | Routes cho vai trò và quản lý tài khoản |
| **SSR View** | `backend/src/views/pages/admin/users.pug` | Giao diện quản lý tài khoản, thay đổi role |
| **SSR View** | `backend/src/views/partials/sidebar-admin.pug` | Menu item "Quản lý tài khoản" |
| **SSR Route** | `backend/src/routes/viewRoutes.js` | Route `/admin/users` |
| **Client JS** | `backend/src/public/js/main.js` | Client-side JS gọi API vai trò và tài khoản |

### API Endpoints:
```
GET    /api/roles                    - Lấy danh sách vai trò (admin only)
GET    /api/roles/my-role            - Lấy vai trò hiện tại
GET    /api/roles/accounts           - Lấy danh sách tài khoản (admin only, hỗ trợ search, filter, phân trang)
PUT    /api/roles/accounts/:id/role  - Thay đổi role tài khoản (admin only)
```

### Vai trò:
| Vai trò | Quyền |
|---------|-------|
| **admin** (Quản trị viên) | Truy cập toàn bộ trang quản trị `/admin/*`, CRUD tất cả dữ liệu, thay đổi role tài khoản |
| **sinh_vien** (Sinh viên) | Chỉ truy cập trang sinh viên `/student/*`, xem thông tin, đăng ký môn, xem học phí |

### Cách hoạt động:
1. SSR Layout: Admin layout kiểm tra token + role — nếu không phải admin thì redirect về `/login`
2. Backend: `adminMiddleware` kiểm tra `req.user.role === 'admin'` — trả về 403 nếu không phải admin
3. Admin vào trang `/admin/users` để xem tất cả tài khoản và thay đổi role (nâng/hạ)
4. Không cho phép admin tự đổi role chính mình (tránh tự lock out)
5. Không cần bảng quyền phức tạp — chỉ cần kiểm tra role là đủ

### Phân công: **THÀNH VIÊN 4**

---

## 🔐 GHI CHÚ VỀ PHÂN QUYỀN

> **Phân quyền được thực hiện hoàn toàn bằng phần mềm (backend middleware)**, dựa trên cột `role` trong bảng `tai_khoan`. Không cần thêm bảng CSDL hoặc module riêng cho phân quyền.
>
> Mỗi thành viên khi viết API cho module của mình phải sử dụng middleware kiểm tra `role` (admin/sinh_vien) để xác định quyền truy cập. Phân công:
> - **Tất cả thành viên**: Thêm middleware `requireAdmin` / `requireRole` vào các API routes thuộc module của mình.

---

## 📁 SƠ ĐỒ QUAN HỆ MODULE

```
┌─────────────────────────────────────────────────────────────────────┐
│                           HỆ THỐNG                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Module 1   │    │   Module 4   │    │   Module 5   │          │
│  │   Địa danh   │───▶│  Khoa/Ngành  │───▶│   Môn học    │          │
│  └──────────────┘    └──────────────┘    └──────┬───────┘          │
│         │                    │                   │                   │
│         ▼                    ▼                   ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Module 2   │    │   Module 3   │    │   Module 6   │          │
│  │  Đối tượng   │───▶│  Sinh viên   │    │   Lớp học    │          │
│  └──────────────┘    └──────────────┘    └──────┬───────┘          │
│                             │                    │                   │
│                             │            ┌───────┴───────┐          │
│                             │            │               │          │
│                             ▼            ▼               ▼          │
│                      ┌──────────────┐ ┌──────────────┐ ┌──────────┐│
│  ┌──────────────┐   │   Module 7   │ │   Module 8   │ │ Module 9 ││
│  │  Module 10   │───│  CT Học      │─│  Năm/HK      │─│ Lớp mở   ││
│  │   Đơn giá    │   └──────────────┘ └──────────────┘ └────┬─────┘│
│  └──────┬───────┘                                          │       │
│         │                                                  │       │
│         │            ┌─────────────────────────────────────┘       │
│         │            │                                             │
│         ▼            ▼                                             │
│  ┌───────────────────────────┐                                     │
│  │       Module 11           │                                     │
│  │   Đăng ký học phần        │                                     │
│  └───────────┬───────────────┘                                     │
│              │                                                      │
│              ▼                                                      │
│  ┌───────────────────────────┐    ┌──────────────────────┐        │
│  │       Module 12           │    │      Module 13       │        │
│  │   Thu học phí             │───▶│   Học phí & Miễn giảm│        │
│  └───────────┬───────────────┘    └──────────┬───────────┘        │
│              │                               │                      │
│              └───────────────┬───────────────┘                      │
│                              ▼                                      │
│                  ┌───────────────────────┐                         │
│                  │      Module 14        │                         │
│                  │       Báo cáo         │                         │
│                  └───────────────────────┘                         │
│                                                                      │
│  ┌──────────────┐                        ┌──────────────┐          │
│  │   Module 15  │                        │   Module 16  │          │
│  │   Thông báo  │                        │   Dashboard  │          │
│  └──────────────┘                        └──────────────┘          │
│                                                                      │
│  ┌───────────────────────┐                                          │
│  │      Module 20        │                                          │
│  │   Phân quyền (RBAC)  │──── Kiểm soát truy cập tất cả module    │
│  └───────────────────────┘                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📌 LƯU Ý

1. **Dependency**: Các module có thể phụ thuộc lẫn nhau, cần triển khai theo thứ tự
2. **API Prefix**: Sử dụng prefix `/api/` cho các API (có thể nâng cấp lên `/api/v1/` trong tương lai nếu cần versioning)
3. **Error Handling**: Mỗi module cần có xử lý lỗi riêng
4. **Testing**: Viết test cho từng module trước khi tích hợp
5. **Documentation**: Cập nhật API documentation khi thay đổi
