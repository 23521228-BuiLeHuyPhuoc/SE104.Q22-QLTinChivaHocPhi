# Phân công sửa giao diện

## Người 1 - Khung chung, xác thực và hệ thống

- Giao diện 1: Khung layout chung
  - URL/route: `/admin/*`, `/student/*`, các trang auth
  - Trang/file cần sửa: `project/src/views/layouts/admin.pug`, `project/src/views/layouts/student.pug`, `project/src/views/layouts/auth.pug`, `project/src/views/partials/header.pug`, `project/src/views/partials/footer.pug`, `project/src/views/partials/pagination.pug`, `project/src/views/partials/sidebar-admin.pug`, `project/src/views/partials/sidebar-student.pug`, `project/src/public/css/theme.css`, `project/src/public/css/layout.css`, `project/src/public/js/main.js`

- Giao diện 2: Đăng nhập và đăng xuất
  - URL/route: `/`, `/login`, `/admin/login`, `/logout`
  - Trang/file cần sửa: `project/src/views/pages/login.pug`, `project/src/public/js/login.js`

- Giao diện 3: Quên mật khẩu và đặt lại mật khẩu
  - URL/route: `/forgot-password`, `/admin/forgot-password`, `/reset-password`
  - Trang/file cần sửa: `project/src/views/pages/forgot-password.pug`, `project/src/views/pages/reset-password.pug`, `project/src/public/js/login.js`

- Giao diện 4: Dashboard và hồ sơ cá nhân
  - URL/route: `/admin/dashboard`, `/student/dashboard`, `/admin/profile`, `/student/profile`
  - Trang/file cần sửa: `project/src/views/pages/admin/dashboard.pug`, `project/src/views/pages/student/dashboard.pug`, `project/src/views/pages/admin/profile.pug`, `project/src/views/pages/student/profile.pug`, `project/src/public/js/admin/dashboard.js`, `project/src/public/js/student/dashboard.js`, `project/src/public/js/admin/profile.js`, `project/src/public/js/student/profile.js`

- Giao diện 5: Tài khoản, phân quyền, thông báo, cấu hình
  - URL/route: `/admin/users`, `/admin/permissions`, `/admin/notifications`, `/student/notifications`, `/admin/settings`, `/admin/trash`
  - Trang/file cần sửa: `project/src/views/pages/admin/users.pug`, `project/src/views/pages/admin/permissions.pug`, `project/src/views/pages/admin/notifications.pug`, `project/src/views/pages/student/notifications.pug`, `project/src/views/pages/admin/settings.pug`, `project/src/views/pages/admin/trash.pug`, `project/src/public/js/admin/users.js`, `project/src/public/js/admin/permissions.js`, `project/src/public/js/admin/notifications.js`, `project/src/public/js/student/notifications.js`, `project/src/public/js/admin/settings.js`, `project/src/public/js/admin/trash.js`


## Người 2 - Danh mục đào tạo và chương trình học

- Giao diện 1: Quản lý sinh viên
  - URL/route: `/admin/students`
  - Trang/file cần sửa: `project/src/views/pages/admin/students.pug`, `project/src/public/js/admin/students.js`

- Giao diện 2: Khoa và ngành học
  - URL/route: `/admin/faculties`, `/admin/majors`
  - Trang/file cần sửa: `project/src/views/pages/admin/faculties.pug`, `project/src/views/pages/admin/majors.pug`, `project/src/public/js/admin/faculties.js`, `project/src/public/js/admin/majors.js`

- Giao diện 3: Môn học và ràng buộc môn học
  - URL/route: `/admin/courses`, `/admin/prerequisites`
  - Trang/file cần sửa: `project/src/views/pages/admin/courses.pug`, `project/src/views/pages/admin/prerequisites.pug`, `project/src/public/js/admin/courses.js`, `project/src/public/js/admin/prerequisites.js`, `project/src/public/css/admin/course-tools.css`

- Giao diện 4: Chương trình học
  - URL/route: `/admin/curriculum-programs`, `/student/curriculum`
  - Trang/file cần sửa: `project/src/views/pages/admin/curriculum-programs.pug`, `project/src/views/pages/student/curriculum.pug`, `project/src/public/js/admin/curriculum-programs.js`, `project/src/public/js/student/curriculum.js`, `project/src/public/css/admin/curriculum-programs.css`, `project/src/public/css/admin/course-tools.css`

- Giao diện 5: Môn đã học và điểm
  - URL/route: `/admin/completed-courses`, `/admin/grades`, `/student/completed-courses`
  - Trang/file cần sửa: `project/src/views/pages/admin/completed-courses.pug`, `project/src/views/pages/student/completed-courses.pug`, `project/src/public/js/admin/completed-courses.js`, `project/src/public/js/student/completed-courses.js`, `project/src/public/css/admin/course-tools.css`


## Người 3 - Lớp học, học kỳ và đăng ký học phần

- Giao diện 1: Năm học và học kỳ
  - URL/route: `/admin/academic-years`, `/admin/semesters`
  - Trang/file cần sửa: `project/src/views/pages/admin/academic-years.pug`, `project/src/views/pages/admin/semesters.pug`, `project/src/public/js/admin/academic-years.js`, `project/src/public/js/admin/semesters.js`, `project/src/public/css/admin/semesters.css`

- Giao diện 2: Tiết học, phòng học, giảng viên
  - URL/route: `/admin/periods`, `/admin/rooms`, `/admin/lecturers`
  - Trang/file cần sửa: `project/src/views/pages/admin/periods.pug`, `project/src/views/pages/admin/rooms.pug`, `project/src/views/pages/admin/lecturers.pug`, `project/src/public/js/admin/periods.js`, `project/src/public/js/admin/rooms.js`, `project/src/public/js/admin/lecturers.js`

- Giao diện 3: Lớp học và môn học mở
  - URL/route: `/admin/classes`, `/admin/open-courses`
  - Trang/file cần sửa: `project/src/views/pages/admin/classes.pug`, `project/src/views/pages/admin/open-courses.pug`, `project/src/public/js/admin/classes.js`, `project/src/public/js/admin/open-courses.js`, `project/src/public/css/admin/classes.css`, `project/src/public/css/admin/open-courses.css`, `project/src/public/css/admin/course-tools.css`

- Giao diện 4: Đăng ký học phần
  - URL/route: `/admin/registrations`, `/student/course-registration`, `/student/my-courses`
  - Trang/file cần sửa: `project/src/views/pages/admin/registrations.pug`, `project/src/views/pages/student/course-registration.pug`, `project/src/views/pages/student/my-courses.pug`, `project/src/public/js/admin/registrations.js`, `project/src/public/js/student/course-registration.js`, `project/src/public/js/student/my-courses.js`, `project/src/public/css/admin/registrations.css`, `project/src/public/css/student/course-registration.css`, `project/src/public/css/student/my-courses.css`

- Giao diện 5: Cứu xét đăng ký và thời khóa biểu
  - URL/route: `/admin/appeals`, `/student/my-schedule`
  - Trang/file cần sửa: `project/src/views/pages/admin/appeals.pug`, `project/src/views/pages/student/my-schedule.pug`, `project/src/public/js/admin/appeals.js`, `project/src/public/js/student/my-schedule.js`, `project/src/public/css/admin/registrations.css`


## Người 4 - Học phí, thanh toán, ưu tiên và báo cáo

- Giao diện 1: Đơn giá tín chỉ và đối tượng ưu tiên
  - URL/route: `/admin/pricing`, `/admin/beneficiaries`
  - Trang/file cần sửa: `project/src/views/pages/admin/pricing.pug`, `project/src/views/pages/admin/beneficiaries.pug`, `project/src/public/js/admin/pricing.js`, `project/src/public/js/admin/beneficiaries.js`, `project/src/public/css/admin/pricing.css`

- Giao diện 2: Địa bàn ưu tiên
  - URL/route: `/admin/locations`, `/admin/locations/provinces`, `/admin/locations/wards`
  - Trang/file cần sửa: `project/src/views/pages/admin/locations-provinces.pug`, `project/src/views/pages/admin/locations-wards.pug`, `project/src/public/js/admin/locations.js`, `project/src/public/css/admin/locations.css`

- Giao diện 3: Công nợ học phí
  - URL/route: `/admin/tuition`, `/student/my-tuition`
  - Trang/file cần sửa: `project/src/views/pages/admin/tuition.pug`, `project/src/views/pages/student/my-tuition.pug`, `project/src/public/js/admin/tuition.js`, `project/src/public/js/student/my-tuition.js`

- Giao diện 4: Phiếu thu và lịch sử thanh toán
  - URL/route: `/admin/payments`, `/student/my-payments`
  - Trang/file cần sửa: `project/src/views/pages/admin/payments.pug`, `project/src/views/pages/student/my-payments.pug`, `project/src/public/js/admin/payments.js`, `project/src/public/js/student/my-payments.js`

- Giao diện 5: Báo cáo học phí
  - URL/route: `/admin/reports`, `/admin/reports/incomplete-tuition`
  - Trang/file cần sửa: `project/src/views/pages/admin/reports.pug`, `project/src/views/pages/admin/reports-incomplete-tuition.pug`, `project/src/public/js/admin/reports.js`, `project/src/public/css/admin/registrations.css`
