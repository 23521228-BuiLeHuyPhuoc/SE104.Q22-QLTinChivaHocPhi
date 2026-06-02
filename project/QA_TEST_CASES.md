# QA Audit & Test Cases

Ngày tạo: 2026-06-02. Phạm vi: source code trong `project`.

## Bước 1 - Khảo sát project

### Công nghệ sử dụng
- Backend/UI SSR: Node.js, Express 5, Pug, vanilla JavaScript, CSS.
- Database: PostgreSQL qua Prisma Client; schema ở `prisma/schema.prisma`.
- Upload/integration: multer, xlsx, Cloudinary config, nodemailer, JWT, cookie-parser, cors, redis package.
- Test framework: chưa cấu hình test runner; `npm test` hiện chỉ in "Error: no test specified". Có file thủ công `test/n2-test-cases.js`.

### Cấu trúc thư mục chính
- `src/index.js`: khởi tạo Express, static, middleware, mount API và view routes.
- `src/routes`: API routes và SSR view route.
- `src/controllers`: xử lý API/render view.
- `src/views`: Pug layouts, partials, pages auth/admin/student.
- `src/public/js`, `src/public/css`: client JS/CSS.
- `src/utils`, `src/services`, `src/models`: helper, business service, model legacy.
- `prisma/schema.prisma`: database models.

### Tất cả màn hình/page/route SSR
- Public/auth: `/`, `/login`, `/admin/login`, `/forgot-password`, `/admin/forgot-password`, `/reset-password`, `/logout`.
- Admin: dashboard, students, courses, open-courses, classes, rooms, lecturers, semesters, academic-years, periods, prerequisites, registrations, appeals, tuition, payments, reports, users, faculties, majors, curriculum-programs, completed-courses, grades redirect, pricing, beneficiaries, permissions, notifications, settings, trash, profile.
- Student: dashboard, course-registration, my-courses, completed-courses, my-tuition, my-payments, my-schedule, profile, notifications, curriculum.

### API/backend/database liên quan
- API mounted: auth, students, courses, open-courses, classes, registrations, appeals, tuition, payments, semesters, notifications, roles, permissions, faculties, majors, pricing, settings, beneficiaries, completed-courses, dashboard, trash, periods, prerequisites, rooms, lecturers.
- Database chính: `TAIKHOAN`, `NHOMNGUOIDUNG`, `CHUCNANG`, `PHANQUYEN`, `SINHVIEN`, `KHOA`, `NGANHHOC`, `MONHOC`, `CHUONGTRINHHOC`, `DIEUKIENMONHOC`, `MONDAHOC`, `HOCKY`, `NAMHOC`, `LOP`, `LOPMO`, `MONHOCMO`, `LICHHOCLOP`, `TIETHOC`, `PHONGHOC`, `GIANGVIEN`, `PHIEUDANGKY`, `CHITIETDANGKY`, `DONCUUXETDANGKY`, `DONGIATINCHI`, `DOITUONG`, `DOITUONGSINHVIEN`, `PHIEUTHUHOCPHI`, `THAMSO`, `THONGBAO`, `TINH`, `PHUONGXA`, `DANTOC`.

### Role/quyền và business rule
- View guard: `requireViewAuth`, `requireViewAdmin`, `requireViewStudent`. API guard: `authMiddleware`, `adminMiddleware`, `systemAdminMiddleware`.
- Fine-grained config `ROLE_PERMISSIONS` có training/finance/system nhưng chưa mount toàn cục.
- Registration: window đăng ký/cứu xét, không đăng ký hộ sinh viên khác, duplicate, đầy lớp, trùng lịch, vượt tín chỉ, khóa hủy sau thanh toán thành công.
- Semester: chỉ một ongoing, finalize sau hạn và không còn appeal pending, mở học phí sau finalize.
- Payment: chỉ thanh toán khi workflow hợp lệ, amount phải bằng remaining due, student access guard.
- Pricing/curriculum: đủ bốn loại giá theo scope, trigger chặn sửa giá đang dùng, validate prerequisite placement và tính nợ tín chỉ/khóa luận.

## Bước 2 - Phát hiện bất thường

| ID lỗi | File liên quan | Mức độ | Loại lỗi | Mô tả bất thường | Bằng chứng từ code | Cách sửa đề xuất | Có tự sửa không? |
|---|---|---|---|---|---|---|---|
| BUG-001 | courseController.js; courses.js | High | Validation | Course SoTiet/LoaiMon thiếu validation | parseInt/truthy check trước sửa | Validate required, LT/TH, SoTiet nguyên dương | Có |
| BUG-002 | pricingController.js; pricing.js | High | Validation | DonGia/LoaiMon thiếu validation | DonGia parse không kiểm tra >0 | Validate DonGia >0, LoaiMon LT/TH, LoaiHoc hợp lệ | Có |
| BUG-003 | majorController.js; majors.js | High | Validation | Ngành nhận tín chỉ/thời gian âm hoặc NaN | parseInt/parseFloat fallback | Validate số nguyên dương và >0 | Có |
| BUG-004 | registrationController.js | Critical | Permission | Student query available courses bằng MaSv khác | getAvailableCourses tin query MaSv | Non-admin ép MaSv hiện tại, mismatch 403 | Có |
| BUG-005 | classController.js | Critical | Business rule | Trùng lịch giao biên tiết bị bỏ sót | SQL dùng < thay vì inclusive | Dùng start <= end overlap inclusive | Có |
| BUG-006 | beneficiaryController.js; beneficiaries.js | High | Validation | Tỉ lệ giảm/ưu tiên nhận giá trị sai; client chặn 0% | parseFloat/parseInt không range; !TiLeGiamHocPhi | Validate 0..100 và số nguyên dương | Có |
| BUG-007 | beneficiaries.js; beneficiaries.pug | Critical | Security/UI | Modal SV ghép innerHTML/onclick từ dữ liệu API | s.MaSv/HoTen/GhiChu/TenDoiTuong đi thẳng HTML | Escape HTML, dùng data-* | Có |
| BUG-008 | completedCourseController.js; completed-courses.js | High | Validation | LanHoc có thể âm/NaN | parseInt(...) \|\| 1 không chặn âm | Validate LanHoc nguyên dương create/update/import | Có |
| BUG-009 | completedCourseRoutes.js | Medium | Upload/Security | Import nhận mọi file | multer không có fileFilter | Chỉ nhận csv/tsv/txt/xls/xlsx và size <=5MB | Có |
| BUG-010 | auth.js; index.js; routes | Critical | Permission cần xác nhận | ROLE_PERMISSIONS/checkAdminPermission có nhưng chưa mount | rg chỉ thấy định nghĩa | Cần xác nhận trước khi mount | Không |
| BUG-011 | paymentController.js; paymentRoutes.js | Medium | Route cần xác nhận | refundPayment export nhưng không có route | paymentRoutes không map refund | Xác nhận có cần UI/API hoàn tiền | Không |
| BUG-012 | src/config/File tổng hợp trigger.js | Low | Build/check smell | File không phải JS nhưng đuôi .js | node --check fail dòng đầu --FILE | Đổi .sql/.md hoặc exclude lint nếu được phép | Không |
| BUG-013 | studentController.js | Medium | Validation cần xác nhận | Ngày sinh/email/SĐT/CCCD yếu | Controller nhận dữ liệu ít kiểm tra định dạng | Cần xác nhận rule tuổi/format | Không |
| BUG-014 | Nhiều JS form admin | Medium | UX/Concurrency | Nút submit chưa disable khi request đang chạy | save* gọi apiFetch trực tiếp | Thêm pending state theo từng form | Không |

## Bước 3 - Các lỗi đã tự sửa

| ID lỗi | File đã sửa | Nội dung đã sửa | Lý do sửa | Ảnh hưởng dự kiến | Cần test lại |
|---|---|---|---|---|---|
| BUG-001 | courseController.js; courses.js | Validate course required, LT/TH, SoTiet nguyên dương | Ngăn dữ liệu môn sai | API/UI trả lỗi sớm | TC Admin / Courses regression |
| BUG-002 | pricingController.js; pricing.js | Validate DonGia/LoaiMon/LoaiHoc/ID | Đơn giá ảnh hưởng học phí | Không lưu giá âm/0/NaN | TC Admin / Pricing |
| BUG-003 | majorController.js; majors.js | Validate tín chỉ/thời gian đào tạo | Ngăn ngành dữ liệu vô nghĩa | Không lưu âm/NaN | TC Admin / Majors |
| BUG-004 | registrationController.js | Non-admin không query MaSv khác | Bảo vệ dữ liệu sinh viên | Mismatched MaSv trả 403 | TC Student / Course Registration |
| BUG-005 | classController.js | Sửa overlap lịch inclusive | Chặn trùng lịch theo tiết | Conflict chính xác hơn | TC Admin / Classes |
| BUG-006 | beneficiaryController.js; beneficiaries.js | Validate discount 0..100, priority nguyên dương | Ngăn miễn giảm sai | Dữ liệu DOITUONG sạch | TC Admin / Beneficiaries |
| BUG-007 | beneficiaries.js; beneficiaries.pug | Escape HTML, đổi onclick data-* | Chặn XSS/quote break | Payload HTML không thực thi | TC Modal SV XSS |
| BUG-008 | completedCourseController.js; completed-courses.js | Validate LanHoc và id route | Ngăn MONDAHOC sai | Import/form/API trả 400 | TC Completed Courses |
| BUG-009 | completedCourseRoutes.js | File filter import và lỗi multer 400 | Chặn file sai định dạng/quá lớn | Import an toàn hơn | TC Import file sai |

## Bước 4 - Test case chi tiết

Tổng số test case: 279.

| ID | Module/Màn hình | Chức năng | Loại test | Tiền điều kiện | Dữ liệu test | Các bước thực hiện | Kết quả mong đợi | Mức độ ưu tiên | Ghi chú automation |
|---|---|---|---|---|---|---|---|---|---|
| TC-001 | Auth / Login | Đăng nhập student thành công | Functional/Auth | Tài khoản student active approved | username/password đúng | Mở /login và submit | Redirect đúng dashboard student, cookie token được set | Critical | Playwright; seed account |
| TC-002 | Auth / Login | Đăng nhập admin thành công | Functional/Auth | Tài khoản admin active approved | username/password đúng | Mở /admin/login và submit | Redirect đúng dashboard admin, cookie token được set | Critical | Playwright; seed account |
| TC-003 | Auth / Login | Sai mật khẩu | Negative/Auth | Có account active | password sai | Submit login | Không redirect, không lưu token, toast lỗi | High | Playwright + Supertest |
| TC-004 | Auth / Login | Tài khoản khóa/chưa duyệt | Permission/Auth | Account TrangThai=false hoặc TrangThaiDuyet!=approved | credentials đúng | Submit login | API từ chối, UI báo lỗi tài khoản | High | Supertest; seed trạng thái account |
| TC-005 | Auth / Login | Required username/password | Validation | Không cần seed | username hoặc password rỗng | Submit form | Form/browser không gửi request hoặc báo thiếu dữ liệu | Medium | Playwright |
| TC-006 | Auth / Login | Toggle password | UI/Usability | Mở login | N/A | Bấm nút hiện/ẩn password | Input đổi type, aria-label/pressed cập nhật | Low | Playwright; selector data-password-toggle |
| TC-007 | Auth / Forgot Password | Gửi OTP | Functional/Auth | Account có email | identifier hợp lệ | Submit forgot password | OTP được tạo/gửi, UI hướng dẫn reset | High | Supertest; mock email/Redis |
| TC-008 | Auth / Forgot Password | Identifier không tồn tại | Negative/Auth | Không có account match | identifier lạ | Submit forgot password | Không lộ dữ liệu nhạy cảm; thông báo nhất quán | Medium | Supertest |
| TC-009 | Auth / Reset Password | Reset thành công | Functional/Auth | OTP hợp lệ | password mới >=6 | Submit reset | Password đổi, OTP bị xóa, login bằng password mới được | Critical | Supertest; mock OTP |
| TC-010 | Auth / Reset Password | Password quá ngắn | Validation | OTP hợp lệ | 1-5 ký tự | Submit reset | API/UI từ chối mật khẩu dưới 6 ký tự | High | Playwright + Supertest |
| TC-011 | Auth / Reset Password | OTP sai/hết hạn | Negative/Auth | OTP invalid/expired | otp sai | Submit reset | Không đổi password, báo lỗi OTP | High | Supertest |
| TC-012 | Auth / Logout | Logout và back browser | Functional/Auth | Đã đăng nhập | /logout | Mở logout, back/refresh private page | Cookie clear, private page redirect login | High | Playwright |
| TC-013 | Auth / API | Token invalid/expired | Permission/API | Token sai/hết hạn | Bearer invalid | Gọi /api/auth/me | Trả 401 token không hợp lệ/hết hạn | High | Supertest |
| TC-014 | Student / Dashboard | Widget tổng quan | UI/Data | Student có đăng ký/học phí | Mở dashboard | Mở dashboard | Widget render số đúng, không NaN | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-015 | Student / Course Registration | Danh sách lớp mở | UI/Functional | Trong thời gian đăng ký, có lớp mở | Mở /student/course-registration | Mở /student/course-registration | Danh sách môn/lớp, còn chỗ, lịch hiển thị đúng | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-016 | Student / Course Registration | Đăng ký thành công | Functional/CRUD | Lớp còn chỗ, không trùng lịch, chưa vượt tín chỉ | Chọn lớp, bấm đăng ký | Chọn lớp, bấm đăng ký | Tạo PHIEUDANGKY/CHITIETDANGKY và cập nhật tổng tiền | Critical | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-017 | Student / Course Registration | Ngoài window đăng ký | Business/Negative | Semester đóng đăng ký | Đăng ký lớp | Đăng ký lớp | API/UI từ chối ngoài thời gian đăng ký | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-018 | Student / Course Registration | Trùng lịch | Business/Negative | Đã có lớp cùng thứ/tiết overlap | Đăng ký lớp overlap | Đăng ký lớp overlap | API từ chối trùng lịch kể cả giao biên tiết | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-019 | Student / Course Registration | Lớp đầy | Boundary/Negative | SoLuongDaDangKy >= SoLuongToiDa | Đăng ký lớp đầy | Đăng ký lớp đầy | API từ chối lớp đầy | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-020 | Student / Course Registration | Đăng ký trùng môn | Negative/Duplicate | Đã có MaMonHoc active | Đăng ký lớp khác cùng môn | Đăng ký lớp khác cùng môn | API từ chối duplicate môn | Critical | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-021 | Student / Course Registration | Vượt giới hạn tín chỉ | Boundary/Business | Tổng tín chỉ gần max | Đăng ký lớp làm vượt max | Đăng ký lớp làm vượt max | API từ chối theo THAMSO/Anh văn | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-022 | Student / Course Registration | Không query MaSv khác | Permission/API | Student A login | GET /api/registrations/available?MaSv=B | GET /api/registrations/available?MaSv=B | Trả 403, không lộ dữ liệu B | Critical | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-023 | Student / Course Registration | Double click submit | Negative/Concurrency | Lớp còn 1 chỗ | Double click đăng ký | Double click đăng ký | Không tạo duplicate; request thứ hai bị từ chối | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-024 | Student / My Courses | Xem phiếu đăng ký | Functional/UI | Có phiếu active | Mở /student/my-courses | Mở /student/my-courses | Hiển thị môn, tín chỉ, tổng tiền, trạng thái | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-025 | Student / My Courses | Hủy học phần | Functional/CRUD | Trong thời gian hủy, chưa thanh toán | Confirm hủy | Confirm hủy | Chi tiết chuyển hủy, tổng tiền/tín chỉ cập nhật | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-026 | Student / My Courses | Hủy sau thanh toán | Business/Negative | Có phiếu thu thành công | Hủy môn | Hủy môn | API từ chối vì thanh toán khóa đăng ký | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-027 | Student / Completed Courses | Xem và lọc môn đã học | Functional/UI | Có MONDAHOC qua/rớt | Search/filter KetQua/MaHocKy | Search/filter KetQua/MaHocKy | Bảng và thống kê passedCredits đúng | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-028 | Student / Tuition | Xem học phí | Functional/UI | Có registration/pricing | Mở my-tuition | Mở my-tuition | Tổng phải đóng, miễn giảm, đã đóng, còn nợ đúng | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-029 | Student / Payments | Checkout thanh toán | Integration/API | Học phí mở, còn nợ | Bấm checkout | Bấm checkout | Tạo payment pending/checkoutUrl đúng provider | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-030 | Student / Payments | Sai amount | Business/Negative | Còn nợ X | Gửi amount khác X | Gửi amount khác X | API từ chối amount không bằng remaining due | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-031 | Student / Schedule | Xem thời khóa biểu | Functional/UI | Có lớp đã đăng ký | Mở my-schedule | Mở my-schedule | Lịch theo thứ/tiết/phòng không overlap UI | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-032 | Student / Profile | Cập nhật hồ sơ | Functional/UI | Student login | Sửa email/SĐT/địa chỉ | Sửa email/SĐT/địa chỉ | Profile cập nhật đúng | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-033 | Student / Profile | Upload avatar sai định dạng | Upload/Security | Student login | File không phải ảnh | File không phải ảnh | API/UI từ chối file sai | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-034 | Student / Notifications | Thông báo theo target | Permission/Functional | Có notification public/personal/faculty/major | Mở notifications | Mở notifications | Chỉ thấy thông báo phù hợp user | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-035 | Student / Notifications | Mark read | Functional/API | Có unread | Bấm đọc/mark read | Bấm đọc/mark read | Unread count giảm, NgayDoc cập nhật | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-036 | Student / Curriculum | Xem CTĐT | Functional/UI | Student có MaNganh | Mở curriculum/filter | Mở curriculum/filter | Môn, học kỳ, điều kiện hiển thị đúng | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-037 | Student / Private routes | Guard tất cả route student | Permission/UI | Chưa login | Mở các /student/* | Mở các /student/* | Redirect /login | High | Playwright + Supertest; seed DB theo tiền điều kiện |
| TC-038 | Admin / Students | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/students | Mở trực tiếp /admin/students | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-039 | Admin / Students | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/students | Gọi API private /api/students | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-040 | Admin / Students | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-041 | Admin / Students | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-042 | Admin / Students | Tạo sinh viên hợp lệ | Functional/CRUD | Admin và dữ liệu khoa/ngành/dân tộc/tỉnh/phường | MaSv, HoTen, NgaySinh, GioiTinh, Cccd, MaPhuongXa, MaDanToc, MaNganh, DiaChiLienHe | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-043 | Admin / Students | Tạo sinh viên thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaSv, HoTen, NgaySinh, GioiTinh, Cccd, MaPhuongXa, MaDanToc, MaNganh, DiaChiLienHe | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-044 | Admin / Students | Tạo sinh viên duplicate | Negative/Duplicate | Đã có sinh viên | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-045 | Admin / Students | Sửa sinh viên | Functional/CRUD | Có sinh viên active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-046 | Admin / Students | Xóa sinh viên - cancel | UI/Confirm | Có sinh viên active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-047 | Admin / Students | Xóa sinh viên - confirm | Functional/CRUD | Có sinh viên active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-048 | Admin / Students | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | search, status, pagination | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-049 | Admin / Courses | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/courses | Mở trực tiếp /admin/courses | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-050 | Admin / Courses | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/courses | Gọi API private /api/courses | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-051 | Admin / Courses | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-052 | Admin / Courses | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-053 | Admin / Courses | Tạo môn học hợp lệ | Functional/CRUD | Admin và khoa active | MaMonHoc, TenMonHoc, MaKhoa, LoaiMon LT/TH, SoTiet | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-054 | Admin / Courses | Tạo môn học thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaMonHoc, TenMonHoc, MaKhoa, LoaiMon LT/TH, SoTiet | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-055 | Admin / Courses | Tạo môn học duplicate | Negative/Duplicate | Đã có môn học | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-056 | Admin / Courses | Sửa môn học | Functional/CRUD | Có môn học active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-057 | Admin / Courses | Xóa môn học - cancel | UI/Confirm | Có môn học active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-058 | Admin / Courses | Xóa môn học - confirm | Functional/CRUD | Có môn học active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-059 | Admin / Courses | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | search, MaKhoa, LoaiMon | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-060 | Admin / Open Courses | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/open-courses | Mở trực tiếp /admin/open-courses | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-061 | Admin / Open Courses | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/open-courses | Gọi API private /api/open-courses | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-062 | Admin / Open Courses | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-063 | Admin / Open Courses | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-064 | Admin / Open Courses | Tạo môn học mở hợp lệ | Functional/CRUD | Admin, học kỳ, môn active | MaHocKy, MaMonHoc, GhiChu, TrangThai | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-065 | Admin / Open Courses | Tạo môn học mở thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaHocKy, MaMonHoc, GhiChu, TrangThai | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-066 | Admin / Open Courses | Tạo môn học mở duplicate | Negative/Duplicate | Đã có môn học mở | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-067 | Admin / Open Courses | Sửa môn học mở | Functional/CRUD | Có môn học mở active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-068 | Admin / Open Courses | Xóa môn học mở - cancel | UI/Confirm | Có môn học mở active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-069 | Admin / Open Courses | Xóa môn học mở - confirm | Functional/CRUD | Có môn học mở active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-070 | Admin / Open Courses | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | semester, course, status | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-071 | Admin / Classes | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/classes | Mở trực tiếp /admin/classes | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-072 | Admin / Classes | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/classes | Gọi API private /api/classes | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-073 | Admin / Classes | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-074 | Admin / Classes | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-075 | Admin / Classes | Tạo lớp hợp lệ | Functional/CRUD | Admin, môn, phòng, giảng viên, tiết học | MaLop, TenLop, MaMonHoc, ThuTrongTuan, MaTietBatDau, MaTietKetThuc, MaPhong, SoLuongToiDa | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-076 | Admin / Classes | Tạo lớp thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaLop, TenLop, MaMonHoc, ThuTrongTuan, MaTietBatDau, MaTietKetThuc, MaPhong, SoLuongToiDa | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-077 | Admin / Classes | Tạo lớp duplicate | Negative/Duplicate | Đã có lớp | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-078 | Admin / Classes | Sửa lớp | Functional/CRUD | Có lớp active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-079 | Admin / Classes | Xóa lớp - cancel | UI/Confirm | Có lớp active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-080 | Admin / Classes | Xóa lớp - confirm | Functional/CRUD | Có lớp active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-081 | Admin / Classes | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | searchScope, course, room, lecturer | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-082 | Admin / Rooms | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/rooms | Mở trực tiếp /admin/rooms | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-083 | Admin / Rooms | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/rooms | Gọi API private /api/rooms | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-084 | Admin / Rooms | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-085 | Admin / Rooms | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-086 | Admin / Rooms | Tạo phòng học hợp lệ | Functional/CRUD | Admin | MaPhong, TenPhong, ToaNha, SucChua, LoaiPhong | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-087 | Admin / Rooms | Tạo phòng học thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaPhong, TenPhong, ToaNha, SucChua, LoaiPhong | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-088 | Admin / Rooms | Tạo phòng học duplicate | Negative/Duplicate | Đã có phòng học | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-089 | Admin / Rooms | Sửa phòng học | Functional/CRUD | Có phòng học active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-090 | Admin / Rooms | Xóa phòng học - cancel | UI/Confirm | Có phòng học active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-091 | Admin / Rooms | Xóa phòng học - confirm | Functional/CRUD | Có phòng học active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-092 | Admin / Rooms | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | list/pagination | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-093 | Admin / Lecturers | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/lecturers | Mở trực tiếp /admin/lecturers | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-094 | Admin / Lecturers | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/lecturers | Gọi API private /api/lecturers | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-095 | Admin / Lecturers | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-096 | Admin / Lecturers | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-097 | Admin / Lecturers | Tạo giảng viên hợp lệ | Functional/CRUD | Admin và khoa active | MaGiangVien, HoTen, MaKhoa, Email, Sdt | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-098 | Admin / Lecturers | Tạo giảng viên thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaGiangVien, HoTen, MaKhoa, Email, Sdt | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-099 | Admin / Lecturers | Tạo giảng viên duplicate | Negative/Duplicate | Đã có giảng viên | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-100 | Admin / Lecturers | Sửa giảng viên | Functional/CRUD | Có giảng viên active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-101 | Admin / Lecturers | Xóa giảng viên - cancel | UI/Confirm | Có giảng viên active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-102 | Admin / Lecturers | Xóa giảng viên - confirm | Functional/CRUD | Có giảng viên active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-103 | Admin / Lecturers | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | search/faculty/status | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-104 | Admin / Semesters | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/semesters | Mở trực tiếp /admin/semesters | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-105 | Admin / Semesters | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/semesters | Gọi API private /api/semesters | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-106 | Admin / Semesters | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-107 | Admin / Semesters | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-108 | Admin / Semesters | Tạo học kỳ hợp lệ | Functional/CRUD | Admin và năm học | MaHocKy, TenHocKy, MaNamHoc, date ranges, registration/appeal windows | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-109 | Admin / Semesters | Tạo học kỳ thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaHocKy, TenHocKy, MaNamHoc, date ranges, registration/appeal windows | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-110 | Admin / Semesters | Tạo học kỳ duplicate | Negative/Duplicate | Đã có học kỳ | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-111 | Admin / Semesters | Sửa học kỳ | Functional/CRUD | Có học kỳ active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-112 | Admin / Semesters | Xóa học kỳ - cancel | UI/Confirm | Có học kỳ active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-113 | Admin / Semesters | Xóa học kỳ - confirm | Functional/CRUD | Có học kỳ active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-114 | Admin / Semesters | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | q, searchScope, semesterKind, status, dateField | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-115 | Admin / Academic Years | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/academic-years | Mở trực tiếp /admin/academic-years | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-116 | Admin / Academic Years | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/semesters/years | Gọi API private /api/semesters/years | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-117 | Admin / Academic Years | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-118 | Admin / Academic Years | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-119 | Admin / Academic Years | Tạo năm học hợp lệ | Functional/CRUD | Admin | MaNamHoc, TenNamHoc, NamBatDau, NamKetThuc, TrangThai | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-120 | Admin / Academic Years | Tạo năm học thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaNamHoc, TenNamHoc, NamBatDau, NamKetThuc, TrangThai | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-121 | Admin / Academic Years | Tạo năm học duplicate | Negative/Duplicate | Đã có năm học | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-122 | Admin / Academic Years | Sửa năm học | Functional/CRUD | Có năm học active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-123 | Admin / Academic Years | Xóa năm học - cancel | UI/Confirm | Có năm học active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-124 | Admin / Academic Years | Xóa năm học - confirm | Functional/CRUD | Có năm học active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-125 | Admin / Academic Years | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | search, status | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-126 | Admin / Periods | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/periods | Mở trực tiếp /admin/periods | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-127 | Admin / Periods | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/periods | Gọi API private /api/periods | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-128 | Admin / Periods | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-129 | Admin / Periods | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-130 | Admin / Periods | Tạo tiết học hợp lệ | Functional/CRUD | Admin | MaTiet, TenTiet, GioBatDau, GioKetThuc, ThuTu | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-131 | Admin / Periods | Tạo tiết học thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaTiet, TenTiet, GioBatDau, GioKetThuc, ThuTu | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-132 | Admin / Periods | Tạo tiết học duplicate | Negative/Duplicate | Đã có tiết học | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-133 | Admin / Periods | Sửa tiết học | Functional/CRUD | Có tiết học active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-134 | Admin / Periods | Xóa tiết học - cancel | UI/Confirm | Có tiết học active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-135 | Admin / Periods | Xóa tiết học - confirm | Functional/CRUD | Có tiết học active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-136 | Admin / Periods | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | list/pagination | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-137 | Admin / Prerequisites | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/prerequisites | Mở trực tiếp /admin/prerequisites | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-138 | Admin / Prerequisites | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/prerequisites | Gọi API private /api/prerequisites | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-139 | Admin / Prerequisites | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-140 | Admin / Prerequisites | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-141 | Admin / Prerequisites | Tạo điều kiện môn học hợp lệ | Functional/CRUD | Admin và môn học active | MaMonHoc, MaMonDieuKien, LoaiDieuKien, MoTa | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-142 | Admin / Prerequisites | Tạo điều kiện môn học thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaMonHoc, MaMonDieuKien, LoaiDieuKien, MoTa | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-143 | Admin / Prerequisites | Tạo điều kiện môn học duplicate | Negative/Duplicate | Đã có điều kiện môn học | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-144 | Admin / Prerequisites | Sửa điều kiện môn học | Functional/CRUD | Có điều kiện môn học active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-145 | Admin / Prerequisites | Xóa điều kiện môn học - cancel | UI/Confirm | Có điều kiện môn học active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-146 | Admin / Prerequisites | Xóa điều kiện môn học - confirm | Functional/CRUD | Có điều kiện môn học active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-147 | Admin / Prerequisites | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | search/course/type/status | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-148 | Admin / Curriculum Programs | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/curriculum-programs | Mở trực tiếp /admin/curriculum-programs | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-149 | Admin / Curriculum Programs | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/majors/curriculum/items | Gọi API private /api/majors/curriculum/items | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-150 | Admin / Curriculum Programs | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-151 | Admin / Curriculum Programs | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-152 | Admin / Curriculum Programs | Tạo chương trình học hợp lệ | Functional/CRUD | Admin, ngành, môn, prerequisite | MaNganh, MaMonHoc, HocKyDuKien, BatBuoc, TrangThai | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-153 | Admin / Curriculum Programs | Tạo chương trình học thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaNganh, MaMonHoc, HocKyDuKien, BatBuoc, TrangThai | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-154 | Admin / Curriculum Programs | Tạo chương trình học duplicate | Negative/Duplicate | Đã có chương trình học | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-155 | Admin / Curriculum Programs | Sửa chương trình học | Functional/CRUD | Có chương trình học active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-156 | Admin / Curriculum Programs | Xóa chương trình học - cancel | UI/Confirm | Có chương trình học active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-157 | Admin / Curriculum Programs | Xóa chương trình học - confirm | Functional/CRUD | Có chương trình học active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-158 | Admin / Curriculum Programs | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | search, major, status | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-159 | Admin / Users | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/users | Mở trực tiếp /admin/users | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-160 | Admin / Users | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/roles/accounts | Gọi API private /api/roles/accounts | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-161 | Admin / Users | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-162 | Admin / Users | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-163 | Admin / Users | Tạo tài khoản hợp lệ | Functional/CRUD | Admin hệ thống, nhóm người dùng | TenDangNhap, MatKhau, Role/MaNhom, MaSv, HoTen, Email | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-164 | Admin / Users | Tạo tài khoản thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: TenDangNhap, MatKhau, Role/MaNhom, MaSv, HoTen, Email | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-165 | Admin / Users | Tạo tài khoản duplicate | Negative/Duplicate | Đã có tài khoản | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-166 | Admin / Users | Sửa tài khoản | Functional/CRUD | Có tài khoản active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-167 | Admin / Users | Xóa tài khoản - cancel | UI/Confirm | Có tài khoản active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-168 | Admin / Users | Xóa tài khoản - confirm | Functional/CRUD | Có tài khoản active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-169 | Admin / Users | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | search, role/group/status | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-170 | Admin / Faculties | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/faculties | Mở trực tiếp /admin/faculties | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-171 | Admin / Faculties | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/faculties | Gọi API private /api/faculties | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-172 | Admin / Faculties | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-173 | Admin / Faculties | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-174 | Admin / Faculties | Tạo khoa hợp lệ | Functional/CRUD | Admin | MaKhoa, TenKhoa, TenVietTat, Email, Sdt | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-175 | Admin / Faculties | Tạo khoa thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaKhoa, TenKhoa, TenVietTat, Email, Sdt | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-176 | Admin / Faculties | Tạo khoa duplicate | Negative/Duplicate | Đã có khoa | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-177 | Admin / Faculties | Sửa khoa | Functional/CRUD | Có khoa active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-178 | Admin / Faculties | Xóa khoa - cancel | UI/Confirm | Có khoa active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-179 | Admin / Faculties | Xóa khoa - confirm | Functional/CRUD | Có khoa active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-180 | Admin / Faculties | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | list/pagination | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-181 | Admin / Majors | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/majors | Mở trực tiếp /admin/majors | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-182 | Admin / Majors | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/majors | Gọi API private /api/majors | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-183 | Admin / Majors | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-184 | Admin / Majors | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-185 | Admin / Majors | Tạo ngành học hợp lệ | Functional/CRUD | Admin và khoa active | MaNganh, TenNganh, MaKhoa, SoTinChiToiThieu, ThoiGianDaoTao | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-186 | Admin / Majors | Tạo ngành học thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaNganh, TenNganh, MaKhoa, SoTinChiToiThieu, ThoiGianDaoTao | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-187 | Admin / Majors | Tạo ngành học duplicate | Negative/Duplicate | Đã có ngành học | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-188 | Admin / Majors | Sửa ngành học | Functional/CRUD | Có ngành học active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-189 | Admin / Majors | Xóa ngành học - cancel | UI/Confirm | Có ngành học active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-190 | Admin / Majors | Xóa ngành học - confirm | Functional/CRUD | Có ngành học active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-191 | Admin / Majors | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | search/faculty/status | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-192 | Admin / Pricing | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/pricing | Mở trực tiếp /admin/pricing | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-193 | Admin / Pricing | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/pricing | Gọi API private /api/pricing | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-194 | Admin / Pricing | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-195 | Admin / Pricing | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-196 | Admin / Pricing | Tạo đơn giá tín chỉ hợp lệ | Functional/CRUD | Admin tài chính, học kỳ active | LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-197 | Admin / Pricing | Tạo đơn giá tín chỉ thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: LoaiMon, LoaiHoc, DonGia, MaHocKy, GhiChu | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-198 | Admin / Pricing | Tạo đơn giá tín chỉ duplicate | Negative/Duplicate | Đã có đơn giá tín chỉ | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-199 | Admin / Pricing | Sửa đơn giá tín chỉ | Functional/CRUD | Có đơn giá tín chỉ active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-200 | Admin / Pricing | Xóa đơn giá tín chỉ - cancel | UI/Confirm | Có đơn giá tín chỉ active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-201 | Admin / Pricing | Xóa đơn giá tín chỉ - confirm | Functional/CRUD | Có đơn giá tín chỉ active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-202 | Admin / Pricing | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | LoaiMon, LoaiHoc, MaHocKy, TrangThai, searchScope | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-203 | Admin / Beneficiaries | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/beneficiaries | Mở trực tiếp /admin/beneficiaries | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-204 | Admin / Beneficiaries | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/beneficiaries | Gọi API private /api/beneficiaries | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-205 | Admin / Beneficiaries | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-206 | Admin / Beneficiaries | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-207 | Admin / Beneficiaries | Tạo đối tượng ưu tiên hợp lệ | Functional/CRUD | Admin tài chính, sinh viên active | MaDoiTuong, TenDoiTuong, TiLeGiamHocPhi, DoUuTien | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-208 | Admin / Beneficiaries | Tạo đối tượng ưu tiên thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaDoiTuong, TenDoiTuong, TiLeGiamHocPhi, DoUuTien | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-209 | Admin / Beneficiaries | Tạo đối tượng ưu tiên duplicate | Negative/Duplicate | Đã có đối tượng ưu tiên | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-210 | Admin / Beneficiaries | Sửa đối tượng ưu tiên | Functional/CRUD | Có đối tượng ưu tiên active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-211 | Admin / Beneficiaries | Xóa đối tượng ưu tiên - cancel | UI/Confirm | Có đối tượng ưu tiên active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-212 | Admin / Beneficiaries | Xóa đối tượng ưu tiên - confirm | Functional/CRUD | Có đối tượng ưu tiên active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-213 | Admin / Beneficiaries | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | pagination/order priority | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-214 | Admin / Completed Courses | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/completed-courses | Mở trực tiếp /admin/completed-courses | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-215 | Admin / Completed Courses | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/completed-courses | Gọi API private /api/completed-courses | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-216 | Admin / Completed Courses | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-217 | Admin / Completed Courses | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-218 | Admin / Completed Courses | Tạo môn đã học hợp lệ | Functional/CRUD | Admin, sinh viên, môn, học kỳ, lớp | MaSv, MaMonHoc, MaHocKy, MaLop, LanHoc, KetQua | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-219 | Admin / Completed Courses | Tạo môn đã học thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: MaSv, MaMonHoc, MaHocKy, MaLop, LanHoc, KetQua | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-220 | Admin / Completed Courses | Tạo môn đã học duplicate | Negative/Duplicate | Đã có môn đã học | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-221 | Admin / Completed Courses | Sửa môn đã học | Functional/CRUD | Có môn đã học active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-222 | Admin / Completed Courses | Xóa môn đã học - cancel | UI/Confirm | Có môn đã học active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-223 | Admin / Completed Courses | Xóa môn đã học - confirm | Functional/CRUD | Có môn đã học active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-224 | Admin / Completed Courses | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | search, MaHocKy, KetQua, MaKhoa, LoaiMon, SoTinChi | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-225 | Admin / Notifications | Guard chưa đăng nhập | Permission/UI | Chưa có cookie token | /admin/notifications | Mở trực tiếp /admin/notifications | Redirect login hoặc API trả 401, không lộ dữ liệu private | Critical | Playwright; không cần mock |
| TC-226 | Admin / Notifications | Guard sai quyền | Permission/API | Student hoặc admin không đúng quyền | /api/notifications | Gọi API private /api/notifications | Trả 403 đúng vai trò, không thay đổi DB | Critical | Supertest; seed token student/admin |
| TC-227 | Admin / Notifications | Danh sách/table | UI/Data state | Admin hợp lệ | Nhiều bản ghi | Mở màn hình, kiểm tra bảng, badge, action, pagination | Cột dữ liệu đúng, không NaN/undefined, phân trang giữ query | High | Playwright; seed >= 2 trang |
| TC-228 | Admin / Notifications | Empty state | UI/Data state | Admin hợp lệ | Không có bản ghi hoặc filter không match | Mở màn hình hoặc filter không kết quả | Hiển thị empty state rõ, không crash | Medium | Playwright; có thể mock API hoặc seed rỗng |
| TC-229 | Admin / Notifications | Tạo thông báo hợp lệ | Functional/CRUD | Admin, user/faculty/major target | TieuDe, NoiDung, Loai, DOITUONG, NgayHetHan | Bấm Thêm, nhập dữ liệu hợp lệ, Lưu | POST thành công, toast thành công, bảng có bản ghi mới | High | Playwright + Supertest; seed FK liên quan |
| TC-230 | Admin / Notifications | Tạo thông báo thiếu required | Validation | Admin hợp lệ | Bỏ trống từng field: TieuDe, NoiDung, Loai, DOITUONG, NgayHetHan | Submit form/API với field rỗng/khoảng trắng | Không tạo bản ghi, trả 400/toast lỗi rõ | High | Playwright + Supertest; từng input |
| TC-231 | Admin / Notifications | Tạo thông báo duplicate | Negative/Duplicate | Đã có thông báo | Mã/key trùng | Submit dữ liệu trùng mã hoặc unique key | API không tạo duplicate, báo lỗi duplicate | High | Supertest; seed bản ghi trùng |
| TC-232 | Admin / Notifications | Sửa thông báo | Functional/CRUD | Có thông báo active | Tên/mô tả/trạng thái mới | Bấm Sửa, đổi dữ liệu hợp lệ, Lưu | PUT thành công, dữ liệu mới hiển thị sau reload | High | Playwright + Supertest |
| TC-233 | Admin / Notifications | Xóa thông báo - cancel | UI/Confirm | Có thông báo active | Cancel confirm | Bấm Xóa rồi chọn Cancel | Không gọi DELETE hoặc DB không đổi | Medium | Playwright dialog spy |
| TC-234 | Admin / Notifications | Xóa thông báo - confirm | Functional/CRUD | Có thông báo active không bị FK chặn | Confirm delete | Bấm Xóa và Confirm | Bản ghi DaXoa=true/chuyển thùng rác hoặc bị chặn FK với lỗi rõ | High | Playwright + Supertest |
| TC-235 | Admin / Notifications | Tìm kiếm/lọc/phân trang | Functional/UI | Có dữ liệu đa dạng | Loai, pagination | Nhập search, đổi filter, chuyển trang, refresh | Query giữ trên URL, dữ liệu đúng, empty state đúng | Medium | Playwright; seed dữ liệu đa dạng |
| TC-236 | Admin / Classes | Validate lịch overlap inclusive | Business rule/Regression | Có phòng/giảng viên/lớp bị overlap | Cùng thứ và tiết giao biên | Tạo/sửa lớp hoặc validate-schedule | API từ chối overlap đúng, regression BUG-005 | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-237 | Admin / Classes | MaTietBatDau > MaTietKetThuc | Boundary/Validation | Admin | start > end | Tạo/sửa lịch | API từ chối khoảng tiết sai | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-238 | Admin / Semesters | Ngày bắt đầu > kết thúc | Boundary/Validation | Admin | NgayBatDau > NgayKetThuc | Tạo/sửa học kỳ | API từ chối date range sai | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-239 | Admin / Semesters | Chỉ một ongoing semester | Business rule | Có học kỳ ongoing | Tạo học kỳ khác ongoing | Lưu học kỳ | API/trigger từ chối | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-240 | Admin / Semesters | Chốt đăng ký còn đơn pending | Business rule | Có appeal pending | finalize registration | Bấm chốt | API từ chối | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-241 | Admin / Semesters | Mở học phí trước finalize | Business rule | Semester chưa finalize | open tuition payment | Bấm mở thu | API từ chối | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-242 | Admin / Appeals | Duyệt đơn thêm | Business workflow | Có đơn thêm chờ duyệt hợp lệ | id appeal | Bấm Duyệt | Thêm lớp, đơn đã duyệt, totals cập nhật | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-243 | Admin / Appeals | Từ chối đơn | Functional/Validation | Có đơn pending | LyDoTuChoi | Bấm Từ chối | Đơn chuyển từ chối; lý do hiển thị | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-244 | Admin / Appeals | Student hủy đơn người khác | Permission/API | Student A | id appeal của B | PUT cancel | 403 hoặc không tác động dữ liệu B | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-245 | Admin / Registrations | Export registrations | Functional/API | Có đăng ký | filter hiện tại | Gọi export | CSV đúng filter/header/BOM | Medium | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-246 | Admin / Tuition | Calculate tuition | Business/API | Có registration/pricing/beneficiary | MaHocKy/SoPhieu | POST calculate | Tổng tiền theo loại học, học hè, miễn giảm đúng | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-247 | Admin / Tuition | Thiếu đơn giá | Negative/API | Registration thiếu DONGIATINCHI | SoPhieu | Calculate | API báo lỗi rõ, không lưu tiền sai | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-248 | Admin / Payments | Create payment amount đúng | Business/API | Còn nợ X | SoTienThu=X | POST payment | Tạo phiếu hợp lệ, trạng thái đúng | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-249 | Admin / Payments | Create payment amount sai | Boundary/Negative | Còn nợ X | SoTienThu khác X | POST payment | API từ chối amount sai | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-250 | Admin / Payments | Confirm payment | Functional/API | Phiếu chờ xác nhận | SoPhieuThu | PUT confirm | Trạng thái thành công, NgayXacNhan cập nhật | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-251 | Admin / Payments | Cancel/fail payment | Functional/API | Phiếu chưa thành công | SoPhieuThu | PUT cancel/fail | Không tính là đã đóng | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-252 | Admin / Payments | Gateway callback invalid signature | Security/Integration | Mock callback | signature sai | Gọi VNPAY/ZaloPay callback | Không xác nhận payment | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-253 | Admin / Payments | Refund controller chưa route | Gap/Need confirm | Có refundPayment export | N/A | Kiểm tra route | Cần xác nhận expose hoàn tiền | Medium | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-254 | Admin / Permissions | System admin only | Permission/API | Admin đào tạo/tài chính | delete/reset/update-role | Gọi API system admin | 403 | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-255 | Admin / Permissions | Fine-grained permission chưa mount | Gap/Permission | Admin đào tạo/tài chính | URL ngoài ROLE_PERMISSIONS | Mở view/API | Cần xác nhận trước khi sửa | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-256 | Admin / Pricing | DonGia invalid | Validation/Regression | Admin | 0, -1, abc | Tạo/sửa giá | Từ chối <=0/NaN, regression BUG-002 | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-257 | Admin / Pricing | Scope đủ bốn loại giá | Business rule | Đã đủ 4 LoaiHoc | Tạo thêm | POST pricing | API từ chối scope đã đủ | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-258 | Admin / Pricing | Sửa giá đang dùng | Business rule | Giá đã được CHITIETDANGKY dùng | Đổi DonGia/TrangThai | PUT pricing | Trigger/API từ chối | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-259 | Admin / Beneficiaries | Tỉ lệ giảm biên | Validation/Regression | Admin | -1,0,100,100.01,abc | Tạo/sửa đối tượng | Chỉ 0..100 hợp lệ, regression BUG-006 | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-260 | Admin / Beneficiaries | Độ ưu tiên invalid | Validation/Regression | Admin | 0,-1,1.5,abc | Tạo/sửa đối tượng | Từ chối không nguyên dương | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-261 | Admin / Beneficiaries | Modal SV XSS | Security/Regression | HoTen/GhiChu có HTML | <script> hoặc onerror | Mở modal SV | Không thực thi script, regression BUG-007 | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-262 | Admin / Completed Courses | LanHoc invalid | Validation/Regression | Admin | 0,-1,1.5,abc | Tạo/sửa/import | Từ chối không nguyên dương, regression BUG-008 | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-263 | Admin / Completed Courses | Import CSV/XLSX hợp lệ | Upload/Functional | File hợp lệ | CSV/TSV/XLS/XLSX | Preview và confirm import | Rows tạo đúng hoặc lỗi từng row rõ | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-264 | Admin / Completed Courses | Import file sai/ quá lớn | Upload/Security/Regression | Admin | .exe hoặc >5MB | POST import | Trả 400, regression BUG-009 | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-265 | Admin / Completed Courses | Nhập theo lớp | Functional/Integration | Có CHITIETDANGKY active | MaLop/MaHocKy | Tải roster và lưu | Tạo MONDAHOC cho roster, duplicate rõ | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-266 | Admin / Settings | Min credit > max credit | Boundary/Need confirm | Admin | min > max | Lưu settings | Nên từ chối rule mâu thuẫn; cần xác nhận | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-267 | Admin / Settings | Credit limits âm/0 | Validation | Admin | -1/0 | Lưu settings | Không lưu tham số vô nghĩa | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-268 | Admin / Trash | Restore item | Functional/CRUD | Có item DaXoa=true | entity/id | Bấm Restore | DaXoa=false, item về màn hình chính | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-269 | Admin / Trash | Purge FK item | Negative/Business | Item có FK | entity/id | Purge | Không mất dữ liệu liên quan; lỗi rõ nếu FK chặn | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-270 | Admin / Dashboard | Stats render | UI/Data | Có dữ liệu | dashboard | Mở dashboard | Cards/chart/recent activity không NaN | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-271 | Admin / Dashboard | API fail state | API/Error state | Mock 500 | /api/dashboard/stats fail | Mở dashboard | UI không crash, có lỗi/empty state | Medium | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-272 | Admin / Reports | Revenue monthly | Functional/API | Có payments nhiều tháng | year/month | Gọi revenue-monthly | Chỉ tính payment thành công | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-273 | Admin / Reports | Students owing | Functional/API | Có unpaid/partial/overdue | filters | Gọi students-owing | Danh sách nợ đúng | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-274 | Responsive / Admin | Mobile table/modal | Responsive/UI | Admin login | 375x812 | Mở màn hình bảng chính | Không overlap, action dùng được | Medium | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-275 | Responsive / Student | Mobile registration/tuition | Responsive/UI | Student login | 375x812 | Mở registration/tuition/schedule | Không tràn chữ, filter/form dùng được | Medium | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-276 | Security Basic | SQL injection-like search | Security/API | Login | ' OR 1=1 -- | Nhập vào search/filter | Không crash, không vượt quyền | High | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-277 | Security Basic | Stored XSS common fields | Security/UI | Admin nhập HTML | <script>alert(1)</script> | Lưu và mở list/detail | Không thực thi script | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-278 | Security Basic | Unauthorized direct URL/API | Permission/Security | Không token/student token | admin/private routes | Truy cập trực tiếp | Redirect login hoặc 401/403 | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |
| TC-279 | Regression | BUG-001..BUG-009 | Regression | Seed liên quan | Payload lỗi và hợp lệ | Chạy các case regression | Không tái xuất hiện lỗi đã sửa | Critical | Supertest + Playwright; seed/mocks theo tiền điều kiện |

## Bước 5 - Ma trận bao phủ

| Module | Chức năng | UI | Functional | Validation | Negative | Permission | API | Boundary | Security | Regression | Đã đủ coverage chưa? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Auth | Login/logout/forgot/reset/profile | Có | Có | Có | Có | Có | Có | Có | Có | Có | Đủ smoke; cần mock OTP/email |
| Student registration | Lớp mở, đăng ký, hủy, conflict, credit limit | Có | Có | Có | Có | Có | Có | Có | Có | Có | Đủ critical path |
| Student tuition/payment | Học phí, checkout, lịch sử | Có | Có | Có | Có | Có | Có | Có | Có | Có | Cần mock gateway |
| Student profile/curriculum/notifications | Hồ sơ, CTĐT, thông báo | Có | Có | Có | Có | Có | Có | Có | Có | Có | Đủ E2E + API |
| Admin catalog CRUD | Students/courses/classes/open/rooms/lecturers/faculties/majors | Có | Có | Có | Có | Có | Có | Có | Có | Có | Đủ; cần seed FK |
| Admin semester workflow | Semesters/years/periods/finalize/open tuition | Có | Có | Có | Có | Có | Có | Có | Có | Có | Đủ business critical |
| Admin finance | Tuition/payments/pricing/beneficiaries | Có | Có | Có | Có | Có | Có | Có | Có | Có | Đủ; gateway cần mock |
| Admin academic records | Completed courses/import/curriculum/prerequisites | Có | Có | Có | Có | Có | Có | Có | Có | Có | Đủ; import multipart |
| Admin roles/permissions | Accounts/groups/functions/system admin | Có | Có | Có | Có | Có | Có | Có | Có | Có | Chưa đủ nếu fine-grained chưa xác nhận |
| Admin reports/settings/trash/dashboard | Reports, settings, trash, stats | Có | Có | Có | Có | Có | Có | Có | Có | Có | Đủ mức hệ thống; settings cần rule xác nhận |

### Test case rủi ro cao cần test trước
1. Auth/session/token: TC-001 đến TC-012.
2. Đăng ký học phần, trùng lịch, vượt tín chỉ, quyền MaSv: nhóm Student / Course Registration.
3. Workflow học kỳ, cứu xét, học phí, thanh toán: nhóm Admin / Semesters, Appeals, Tuition, Payments.
4. Regression BUG-001 đến BUG-009: course, pricing, major, registration privacy, class conflict, beneficiary, completed-course/import.
5. Security: unauthorized URL/API, stored XSS, upload sai định dạng, gateway callback invalid signature.

### Thứ tự test đề xuất
1. Smoke test.
2. Critical path.
3. Auth/Permission.
4. CRUD chính.
5. Validation.
6. Regression.
7. Responsive/UI.
8. Security basic.

### Phần source chưa đủ thông tin để sinh test chính xác tuyệt đối
- Rule tuổi/ngày sinh, định dạng SĐT/CCCD/email sinh viên.
- Có bắt buộc mount fine-grained permission training/finance không.
- Refund payment là chức năng chính thức hay code dự phòng.
- Payment gateway secrets/signature và môi trường callback thật.
- `src/config/File tổng hợp trigger.js` là tài liệu trigger hay file thực thi.
- Seed account chuẩn cho từng role chưa có trong repo.

### Lỗi đã sửa và chưa sửa
- Đã sửa: BUG-001 đến BUG-009.
- Chưa sửa vì cần xác nhận/phạm vi lớn: BUG-010 đến BUG-014.

## Bước 6 - Đề xuất automation

### Công cụ nên dùng
- Playwright cho E2E/UI SSR Pug: route guard, modal, confirm, upload, responsive, network mock.
- Supertest + Jest hoặc Vitest cho API/business rules: registration, payment, pricing, semester, permissions.
- Testing Library không ưu tiên vì project không dùng component framework.

### High Priority nên automation trước
- Auth smoke và private route guard.
- Student course registration, cancel, schedule conflict, credit limit.
- Admin class schedule, semester workflow, pricing/payment/tuition.
- Regression BUG-001 đến BUG-009.

### Vị trí file test
- E2E/UI: `tests/e2e/*.spec.js`.
- API/business: `tests/api/*.spec.js`.
- Seed/helper: `tests/fixtures/seed.js`, `tests/e2e/helpers/auth.js`.

### data-testid nên thêm
- Auth forms/buttons, admin table/modal/action buttons, student register/cancel/checkout buttons, toast/loading/empty states.

### Mock/seed
- Cần test database riêng, không dùng database production/Neon thật.
- Seed system admin, training admin, finance admin, student active/locked, academic catalog, semester windows, pricing, registration, payment, notification.
- Mock email/OTP, Redis, Cloudinary, VNPAY/ZaloPay callback.

### Skeleton automation
- Skeleton Playwright được đề xuất ở `tests/e2e/smoke.spec.js` sau khi cài `@playwright/test`.
