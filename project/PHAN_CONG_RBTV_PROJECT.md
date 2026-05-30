# Phân công phát triển dự án theo module

Phân công dựa theo module RBTV đã làm → ai phụ trách RBTV module nào thì code backend/frontend module đó. Công việc = **tất cả giao diện, API, chức năng** của module đó, không chỉ validate.

## Quy ước

- **Không sửa**: `init.sql`, `schema.prisma` → yêu cầu trưởng nhóm.
- **Được sửa**: Controller, Route, Model, View (`.pug`), JS tĩnh (`public/js`), Middleware, Utils.
- Mỗi người commit theo nhánh riêng, PR mô tả rõ chức năng.

## Tổng quan phân công

| Người | Module | Trang admin | Trang sinh viên |
| --- | --- | --- | --- |
| Người 1 | Sinh viên, Đối tượng ưu tiên, Địa giới hành chính | `/admin/students`, `/admin/beneficiaries`, `/admin/provinces`, `/admin/wards` | `/student/profile` |
| Người 2 | Môn học, Điều kiện, Chương trình, Lịch sử học | `/admin/courses`, `/admin/prerequisites`, `/admin/completed-courses` | `/student/curriculum`, `/student/completed-courses` |
| Người 3 | Học kỳ, Lớp, Tiết học, Đơn giá, Đăng ký | `/admin/semesters`, `/admin/classes`, `/admin/periods`, `/admin/pricing`, `/admin/registrations` | `/student/course-registration`, `/student/my-courses`, `/student/my-schedule` |
| Người 4 | Học phí, Thanh toán, Thùng rác, Tài khoản, Thông báo, Báo cáo, Dashboard | `/admin/tuition`, `/admin/payments`, `/admin/trash`, `/admin/users`, `/admin/notifications`, `/admin/reports`, `/admin/dashboard` | `/student/my-tuition`, `/student/my-payments`, `/student/notifications`, `/student/dashboard` |

---

# NGƯỜI 1 — Sinh viên, Đối tượng ưu tiên

## 1.1. Hiện trạng

**Trang Sinh viên (admin/students):**
- ✅ Đã có: CRUD (thêm/sửa/xóa mềm), form modal đầy đủ (MSSV, họ tên, ngày sinh, giới tính, CCCD, dân tộc, phường xã, ngành, trạng thái), load dropdown ngành/dân tộc/tỉnh/phường xã, search + filter trạng thái, phân trang SSR.
- ❌ Chưa có: trang xem chi tiết sinh viên (hiện chỉ có modal sửa, không có trang riêng), lọc theo khoa/ngành, import danh sách SV từ Excel/CSV, export danh sách SV ra Excel, upload ảnh đại diện, hiện đối tượng ưu tiên của SV trên form.

**Trang Đối tượng ưu tiên (admin/beneficiaries):**
- ✅ Đã có: CRUD đối tượng (mã, tên, tỉ lệ giảm, độ ưu tiên, mô tả), modal gán/gỡ SV vào đối tượng, hiện danh sách SV trong đối tượng.
- ❌ Chưa có: search/filter đối tượng, import danh sách SV từ Excel vào đối tượng, hiện tổng số SV thuộc từng đối tượng ngay trên bảng chính, xem SV nào đang được miễn giảm bao nhiêu.

**Trang Tỉnh/Phường xã (admin/provinces, admin/wards):**
- ✅ Đã có: bảng dữ liệu `TINH`, `PHUONGXA`; form sinh viên đã load dropdown tỉnh/phường xã từ API hiện có.
- ❌ Chưa có: trang admin quản lý tỉnh/thành phố, trang admin quản lý phường/xã, CRUD địa giới hành chính, search/filter theo tỉnh/trạng thái/khu vực, kiểm tra ràng buộc khi khóa/xóa địa phương đang được sinh viên sử dụng.

**Trang Hồ sơ SV (student/profile):**
- ✅ Đã có file `student/profile.js` (7.5KB) — form xem/sửa thông tin cá nhân.
- ❌ Cần kiểm tra: upload ảnh đại diện, đổi mật khẩu, hiện đối tượng ưu tiên đang có.

**Backend:**
- ✅ `studentController.js` — CRUD, stats, load dropdown ngành/tỉnh/phường xã/dân tộc.
- ✅ `beneficiaryController.js` — CRUD + gán/gỡ SV.
- ❌ Chưa có: API import/export SV, API upload ảnh, endpoint lấy đối tượng ưu tiên theo SV.

## 1.2. Công việc cần làm

### Giao diện Admin — Trang Sinh viên

1. **Thêm bộ lọc theo khoa/ngành**: Thêm 2 dropdown "Lọc theo khoa" → "Lọc theo ngành" (cascade) cạnh dropdown trạng thái hiện có. Gọi API kèm query `MaKhoa`, `MaNganh`.

2. **Thêm trang chi tiết sinh viên**: Khi click vào 1 SV → mở modal hoặc panel chi tiết hiện tab: Thông tin chung | Đối tượng ưu tiên | Lịch sử ĐK | Học phí. Hiện tại chỉ có modal sửa, chưa có trang xem tổng quan.

3. **Hiện đối tượng ưu tiên trên form SV**: Trong modal sửa SV, thêm section "Đối tượng ưu tiên" — hiện danh sách đối tượng SV đang thuộc, kèm nút gán thêm/gỡ.

4. **Export danh sách SV ra Excel**: Thêm nút "Xuất Excel" trên toolbar → gọi API download file Excel có các cột: MSSV, Họ tên, Ngày sinh, Giới tính, Ngành, Khoa, Trạng thái.

5. **Import SV từ Excel**: Thêm nút "Nhập Excel" → upload file → hiện preview bảng → xác nhận → gọi API batch create. Hiện kết quả: thành công X, lỗi Y (kèm lý do từng dòng lỗi).

6. **Upload ảnh đại diện**: Trong form SV thêm input file ảnh, preview ảnh, gọi API upload (multipart/form-data hoặc base64).

### Giao diện Admin — Trang Đối tượng ưu tiên

7. **Thêm search**: Thêm ô tìm kiếm theo mã/tên đối tượng (hiện chưa có).

8. **Hiện số SV trên bảng**: Bảng chính thêm cột "Số SV" hiện `_count.DOITUONGSINHVIEN` — data đã có từ API, chỉ cần render.

9. **Import SV vào đối tượng từ Excel**: Nút "Nhập DS sinh viên" trong modal SV → upload Excel danh sách MSSV → batch gán.

### Giao diện Sinh viên — Trang Hồ sơ

10. **Hiện đối tượng ưu tiên**: Trên trang `/student/profile`, thêm section "Đối tượng ưu tiên" — hiện tên đối tượng + tỉ lệ giảm.

11. **Upload ảnh đại diện SV**: SV tự upload ảnh đại diện trên trang profile.

### Yêu cầu bổ sung bắt buộc — Sinh viên/Đối tượng

12. **Trang hồ sơ sinh viên phải hiện đối tượng của sinh viên**: Trên `/student/profile`, thêm block "Đối tượng ưu tiên" hiển thị đầy đủ mã đối tượng, tên đối tượng, tỉ lệ giảm học phí, độ ưu tiên và ghi chú nếu có. Nếu sinh viên chưa có đối tượng, hiển thị trạng thái rỗng rõ ràng như "Chưa thuộc đối tượng ưu tiên nào".

13. **Ngăn sinh viên tự sửa đối tượng ưu tiên**: Ở `/student/profile`, phần đối tượng chỉ được xem, không có input, checkbox, nút thêm/gỡ hoặc thao tác sửa. Nếu có nút "Chỉnh sửa hồ sơ", phần đối tượng vẫn phải readonly vì đối tượng ưu tiên chỉ do admin quản lý.

14. **Trang quản lý sinh viên phải hiện đối tượng khi sửa sinh viên**: Trong modal/panel sửa sinh viên ở `/admin/students`, thêm section "Đối tượng ưu tiên hiện tại" hiển thị danh sách đối tượng sinh viên đang thuộc. Dữ liệu cần có: mã đối tượng, tên đối tượng, tỉ lệ giảm, độ ưu tiên. Không để admin nhập mã đối tượng bằng text tự do trong form sửa sinh viên.

15. **Thao tác đối tượng phải đi qua module đối tượng ưu tiên**: Nếu admin muốn thay đổi đối tượng của sinh viên, UI phải điều hướng hoặc mở đúng chức năng gán/gỡ trong `/admin/beneficiaries`; không cập nhật đối tượng bằng cách sửa trực tiếp field trong form sinh viên.

16. **API profile phải trả kèm đối tượng**: API dùng cho `/student/profile` và `/admin/students` phải include `DOITUONGSINHVIEN` + `DOITUONG` để frontend không phải gọi rời rạc nhiều lần. Nếu API hiện có chưa trả, bổ sung ở controller/model formatter.

### Giao diện Admin — Tỉnh/Phường xã

17. **Bổ sung trang quản lý tỉnh/thành phố**: Tạo `/admin/provinces` để admin xem danh sách `TINH`, thêm/sửa/khóa/xóa mềm tỉnh/thành phố, search theo mã/tên, filter trạng thái. Không cho khóa/xóa nếu còn phường/xã hoặc sinh viên đang phụ thuộc mà chưa có phương án xử lý.

18. **Bổ sung trang quản lý phường/xã**: Tạo `/admin/wards` để admin xem danh sách `PHUONGXA`, thêm/sửa/khóa/xóa mềm phường/xã. Form phải chọn tỉnh bằng dropdown, quản lý đủ mã, tên, loại, khu vực, trạng thái; có filter theo tỉnh, trạng thái, khu vực.

19. **Đồng bộ dropdown địa chỉ trong form sinh viên**: `/admin/students` và `/student/profile` phải lấy tỉnh/phường xã active từ API quản lý địa giới. Khi sửa sinh viên cũ có địa phương đã khóa, vẫn hiển thị giá trị hiện tại nhưng không cho chọn mới địa phương inactive.

### Backend

20. **API export Excel SV**: `GET /api/students/export?search=&MaNganh=` → trả file Excel. Dùng thư viện `exceljs` hoặc `xlsx`.

21. **API import Excel SV**: `POST /api/students/import` → nhận file Excel → validate từng dòng → batch create → trả kết quả.

22. **API upload ảnh SV**: `POST /api/students/:id/avatar` → nhận file ảnh → lưu vào `public/uploads/` → update `AnhDaiDien` trong DB.

23. **API lấy đối tượng theo SV**: `GET /api/students/:id/beneficiaries` → trả danh sách đối tượng ưu tiên SV đang có.

24. **Thêm filter MaKhoa vào getAllStudents**: Backend `getAllStudents()` hiện chỉ filter `MaNganh`, thêm filter `MaKhoa` (join qua NGANHHOC).

25. **API CRUD tỉnh/thành phố**: Bổ sung controller/routes cho `TINH`: list/search/filter, get detail, create, update, khóa/xóa mềm. Endpoint gợi ý: `/api/provinces`.

26. **API CRUD phường/xã**: Bổ sung controller/routes cho `PHUONGXA`: list/search/filter theo `MaTinh`, create, update, khóa/xóa mềm. Endpoint gợi ý: `/api/wards`.

27. **Validate ràng buộc địa giới khi cập nhật/xóa**: Không để xóa/khóa tỉnh còn phường/xã active hoặc phường/xã còn sinh viên đang tham chiếu nếu việc đó làm form sinh viên lỗi. Response phải trả lý do cụ thể để UI hiển thị.

## 1.3. Phạm vi file

- **Backend**: `studentController.js`, `beneficiaryController.js`, `locationController.js` nếu tách riêng, `studentRoutes.js`, `beneficiaryRoutes.js`, `locationRoutes.js` nếu tách riêng, `studentModel.js`, `locationModel.js`
- **Frontend**: `admin/students.pug` + `.js`, `admin/beneficiaries.pug` + `.js`, `admin/provinces.pug` + `.js`, `admin/wards.pug` + `.js`, `student/profile.pug` + `.js`

## 1.4. Test Cases

| ID | Mô tả | Expected |
| --- | --- | --- |
| N1-01 | Thêm SV đầy đủ thông tin | Tạo thành công, reload bảng |
| N1-02 | Thêm SV trùng MSSV | Hiện lỗi "MSSV đã tồn tại" |
| N1-03 | Sửa SV đổi ngành | Cập nhật thành công |
| N1-04 | Xóa SV (mềm) | Hiện confirm, xóa, reload |
| N1-05 | Search SV theo tên | Bảng lọc đúng |
| N1-06 | Filter SV theo khoa → ngành | Cascade dropdown, bảng lọc đúng |
| N1-07 | Export Excel | Download file .xlsx có dữ liệu đúng |
| N1-08 | Import Excel 10 SV hợp lệ | Thêm 10 SV, hiện "Thành công 10" |
| N1-09 | Import Excel có 2 dòng lỗi | Hiện "Thành công 8, lỗi 2" + lý do |
| N1-10 | Upload ảnh SV | Ảnh hiện trên form + bảng |
| N1-11 | Xem chi tiết SV | Modal/panel hiện tab: Info/ĐT/ĐK/HP |
| N1-12 | Gán SV vào đối tượng | Thêm thành công, list cập nhật |
| N1-13 | Gỡ SV khỏi đối tượng | Xóa thành công |
| N1-14 | Search đối tượng | Bảng lọc đúng |
| N1-15 | SV xem profile thấy đối tượng | Hiện "DT06 - Giảm 50%" |
| N1-16 | SV mở profile | Phần đối tượng ưu tiên hiển thị readonly, không có nút thêm/sửa/gỡ |
| N1-17 | Admin mở modal sửa SV | Hiển thị danh sách đối tượng hiện tại của sinh viên |
| N1-18 | SV không có đối tượng | Profile hiển thị trạng thái rỗng rõ ràng |
| N1-19 | Admin mở trang tỉnh/thành phố | Bảng hiện mã, tên, loại tỉnh, trạng thái và có search/filter |
| N1-20 | Admin thêm tỉnh/thành phố | Tạo thành công, dropdown tỉnh trong form sinh viên load được dữ liệu mới |
| N1-21 | Admin mở trang phường/xã | Bảng filter được theo tỉnh, trạng thái, khu vực |
| N1-22 | Admin thêm phường/xã | Chọn tỉnh từ dropdown, tạo thành công, form sinh viên load được phường/xã mới |
| N1-23 | Khóa/xóa phường xã đang có SV sử dụng | API chặn hoặc cảnh báo rõ lý do, không làm dữ liệu sinh viên lỗi |

---

# NGƯỜI 2 — Môn học, Điều kiện, Chương trình học, Lịch sử học

## 2.1. Hiện trạng

**Trang Môn học (admin/courses):**
- ✅ Đã có: CRUD (mã, tên, khoa, loại môn, số tiết, mô tả), `syncCredits()` auto tính SoTinChi phía client, search, phân trang SSR.
- ❌ Chưa có: lọc theo khoa/loại môn, xem chi tiết môn (danh sách điều kiện, lớp đã mở, SV đã học), hiện SoTinChi trên bảng danh sách, dropdown chọn khoa (hiện nhập tay MaKhoa), export danh sách môn.

**Trang Điều kiện môn (admin/prerequisites):**
- ✅ Đã có: CRUD (chọn môn chính, môn điều kiện, loại điều kiện, mô tả), search, filter loại, phân trang SSR.
- ❌ Chưa có: dropdown chọn môn thay vì nhập mã, hiện tên môn trên form khi chọn, ngăn chọn cùng 1 môn 2 bên, hiện đồ thị/cây điều kiện.

**Trang Môn đã học (admin/completed-courses):**
- ✅ Đã có: hiện danh sách MONDAHOC, filter SV/HK/kết quả, form tạo/sửa (7.6KB khá đầy đủ).
- ❌ Chưa có: import kết quả từ Excel, batch nhập điểm cho cả lớp, export.

**Trang Chương trình ĐT (student/curriculum):**
- ✅ Đã có: hiện CTHT theo HK 1→8, trạng thái từng môn (passed/failed/registered/not_started), tổng TC/đã hoàn thành.
- ❌ Chưa có: hiện tiến độ % dạng progress bar, hiện điều kiện tiên quyết từng môn, lọc theo trạng thái, tính số tín chỉ còn nợ theo chương trình đào tạo tới học kỳ hiện tại để xét điều kiện đăng ký khóa luận tốt nghiệp.

**Trang Môn đã học SV (student/completed-courses):**
- ✅ Đã có: hiện lịch sử học (4.4KB), tổng TC đã qua.
- ❌ Chưa có: filter theo HK, filter theo kết quả, hiện GPA/điểm trung bình (nếu có).

**Backend:**
- ✅ `courseController.js` — CRUD, stats, `getMyCurriculum()`, `getOpenedClasses()`.
- ✅ `prerequisiteController.js` — CRUD, `validatePayload()` check tự trỏ + trùng.
- ✅ `completedCourseController.js` — CRUD lịch sử học.
- ❌ Chưa có: API lấy danh sách khoa cho dropdown, API lấy chi tiết môn (kèm điều kiện + lớp), API import kết quả, API batch nhập điểm, API/helper tính số tín chỉ còn nợ theo CTĐT để xét điều kiện khóa luận tốt nghiệp.

## 2.2. Công việc cần làm

### Giao diện Admin — Trang Môn học

1. **Dropdown chọn khoa**: Thay input nhập tay `MaKhoa` bằng dropdown load từ API `/api/faculties`. Thêm dropdown "Lọc theo khoa" trên toolbar.

2. **Thêm lọc theo loại môn**: Dropdown "Loại môn" (LT/TH/Tất cả) cạnh search.

3. **Hiện SoTinChi trên bảng**: Thêm cột "Tín chỉ" trong bảng danh sách (data đã có từ API, chỉ cần render).

4. **Trang chi tiết môn**: Click vào môn → modal chi tiết hiện: thông tin môn, danh sách điều kiện tiên quyết/học trước, danh sách lớp đã mở từng HK. Cần tạo API GET `/api/courses/:id` (đã có, chỉ cần render).

5. **Export danh sách môn**: Nút "Xuất Excel" → download file Excel danh sách môn.

### Giao diện Admin — Trang Điều kiện môn

6. **Dropdown chọn môn**: Thay 2 input nhập mã bằng 2 dropdown search (select2/autocomplete) load từ API `/api/courses`. Khi chọn 1 bên → disable môn đó bên kia.

7. **Hiện đồ thị điều kiện**: Thêm nút "Xem sơ đồ" → render đồ thị (mermaid hoặc SVG) hiện chuỗi điều kiện giữa các môn. Giúp admin kiểm tra trực quan.

### Giao diện Admin — Trang Môn đã học

8. **Import kết quả từ Excel**: Nút "Nhập Excel" → upload file (cột: MSSV, MaMonHoc, Diem, KetQua, HocKy) → preview → xác nhận → batch create.

9. **Batch nhập điểm cho lớp**: Chọn lớp + HK → hiện danh sách SV đã ĐK → nhập điểm/kết quả cho từng SV → lưu batch. Cần API `POST /api/completed-courses/batch`.

### Giao diện Sinh viên — Chương trình ĐT

10. **Progress bar tiến độ**: Hiện thanh tiến độ "Đã hoàn thành X/Y tín chỉ (Z%)" ở đầu trang.

11. **Hiện điều kiện tiên quyết**: Mỗi môn trong CTHT, khi hover/click hiện tooltip "Tiên quyết: Toán A1, Lý đại cương". Cần gọi thêm API điều kiện.

12. **Filter theo trạng thái**: Thêm filter "Đã qua / Đang học / Chưa học / Rớt" → lọc danh sách môn.

### Giao diện Sinh viên — Môn đã học

13. **Filter theo HK và kết quả**: Thêm 2 dropdown "Học kỳ" + "Kết quả" lọc danh sách.

### Yêu cầu bổ sung bắt buộc — Chương trình học/Môn đã học

14. **Bổ sung quản lý chương trình học cho admin**: Cần có màn hình hoặc tab quản lý chương trình học cho từng ngành. Admin phải chọn được ngành, xem danh sách môn trong chương trình theo học kỳ dự kiến, thêm môn vào chương trình, gỡ môn khỏi chương trình, đổi học kỳ dự kiến, đánh dấu bắt buộc/tự chọn và bật/tắt trạng thái môn trong chương trình.

15. **Bảng chương trình học phải đủ thông tin để kiểm tra RBTV07**: Mỗi dòng chương trình học cần hiện: mã môn, tên môn, loại môn, số tín chỉ, học kỳ dự kiến, bắt buộc/tự chọn, danh sách môn tiên quyết/học trước, trạng thái hợp lệ. Nếu môn đang vi phạm điều kiện học kỳ, UI phải đánh dấu lỗi rõ ràng.

16. **Form thêm/sửa môn trong chương trình học**: Khi thêm môn vào chương trình, dùng dropdown search môn học, không nhập mã tay. Form phải có học kỳ dự kiến, loại môn trong chương trình, bắt buộc/tự chọn, ghi chú. Khi lưu phải gọi backend kiểm tra: môn tiên quyết phải ở học kỳ trước, môn học trước phải ở học kỳ trước hoặc cùng học kỳ.

17. **Chức năng lọc/tìm kiếm trong chương trình học**: Có filter theo ngành, khoa, học kỳ dự kiến, loại môn, trạng thái hợp lệ/vi phạm. Có ô tìm kiếm theo mã môn/tên môn.

18. **Trang môn đã học của sinh viên phải tìm kiếm theo thuộc tính môn học**: Ở `/student/completed-courses`, bổ sung tìm kiếm/lọc không chỉ theo học kỳ/kết quả mà còn theo mã môn, tên môn, khoa, loại môn LT/TH, số tín chỉ, lớp nếu có, giảng viên nếu backend có dữ liệu lớp. Search phải áp dụng lên danh sách hiển thị và truyền query xuống API nếu danh sách phân trang server-side.

19. **Trang môn đã học admin cũng phải hỗ trợ thuộc tính môn học**: Ở `/admin/completed-courses`, bổ sung filter/tìm kiếm theo mã môn, tên môn, khoa, loại môn, số tín chỉ, học kỳ, kết quả, MSSV. Khi lọc phải giữ phân trang đúng và không làm mất filter sau reload.

20. **API môn đã học phải include thông tin môn học đủ dùng cho filter**: `completedCourseController` cần trả kèm `MONHOC` với mã môn, tên môn, loại môn, số tín chỉ, khoa; nếu lọc server-side thì thêm query params tương ứng.

21. **Bổ sung rule điều kiện đăng ký khóa luận tốt nghiệp**: Sinh viên chỉ được đăng ký môn khóa luận tốt nghiệp nếu số tín chỉ còn nợ theo chương trình đào tạo tới thời điểm/học kỳ đăng ký không quá 8 tín chỉ. Cách tính tối thiểu: lấy `CHUONGTRINHHOC` của ngành sinh viên với `HocKyDuKien <= học kỳ hiện tại/học kỳ đăng ký`, cộng tín chỉ các môn bắt buộc chưa có kết quả `qua_mon` trong `MONDAHOC`. Nếu có môn tự chọn/nhóm tự chọn thì phải tính theo số tín chỉ yêu cầu của nhóm, không cộng cứng tất cả môn tự chọn.

22. **Xác định môn khóa luận tốt nghiệp rõ ràng**: Trong quản lý môn học/chương trình học phải có cách nhận diện môn khóa luận tốt nghiệp để backend không hardcode theo tên môn. Nếu schema hiện tại chưa có cờ riêng, dùng cấu hình danh sách mã môn khóa luận trong config/tham số tạm thời và ghi chú rõ cần trưởng nhóm bổ sung field nếu muốn quản lý chính quy.

23. **Hiển thị trạng thái đủ điều kiện khóa luận trên CTĐT**: Ở `/student/curriculum`, bổ sung thông tin "Tín chỉ còn nợ tới hiện tại: X" và trạng thái "Đủ/Chưa đủ điều kiện đăng ký khóa luận" để sinh viên biết trước khi đăng ký.

### Backend

24. **API lấy khoa cho dropdown**: Sử dụng API `/api/faculties` đã có. Đảm bảo courses form gọi đúng.

25. **API batch nhập điểm**: `POST /api/completed-courses/batch` — nhận array `[{MaSv, MaMonHoc, Diem, KetQua, MaHocKy}]` → validate + batch create.

26. **API import kết quả**: `POST /api/completed-courses/import` — nhận file Excel → parse → batch create.

27. **API export môn**: `GET /api/courses/export` → trả file Excel.

28. **API/helper tính tín chỉ còn nợ theo CTĐT**: Bổ sung hàm dùng chung, ví dụ `calculateCurriculumDebt(MaSv, MaHocKy)`, trả `requiredCreditsUntilNow`, `passedCredits`, `owedCredits`, `missingCourses[]`. Hàm này thuộc module chương trình học/môn đã học để Người 3 có thể gọi trong đăng ký môn.

29. **API kiểm tra điều kiện khóa luận**: Endpoint gợi ý `GET /api/students/:id/thesis-eligibility?MaHocKy=` hoặc endpoint trong curriculum trả trạng thái đủ điều kiện. Response cần có `eligible`, `owedCredits`, `maxAllowedOwedCredits = 8`, `missingCourses[]`, không chỉ trả true/false.

## 2.3. Phạm vi file

- **Backend**: `courseController.js`, `prerequisiteController.js`, `completedCourseController.js`, `majorController.js`, `viewController.js`, `courseRoutes.js`, `prerequisiteRoutes.js`, `completedCourseRoutes.js`, `majorRoutes.js`, `courseModel.js`, helper/service tính điều kiện khóa luận nếu tách riêng
- **Frontend**: `admin/courses.pug` + `.js`, `admin/prerequisites.pug` + `.js`, `admin/completed-courses.pug` + `.js`, `admin/majors.pug` + `.js`, `admin/curriculum.pug` + `.js` nếu cần tạo trang riêng, `student/curriculum.pug` + `.js`, `student/completed-courses.pug` + `.js`

## 2.4. Test Cases

| ID | Mô tả | Expected |
| --- | --- | --- |
| N2-01 | Thêm môn LT, SoTiet=45 | SoTinChi auto=3, tạo thành công |
| N2-02 | Thêm môn trùng mã | Lỗi "mã đã tồn tại" |
| N2-03 | Sửa môn đổi loại LT→TH | SoTinChi auto recalc |
| N2-04 | Xóa môn | Xóa mềm, reload |
| N2-05 | Filter môn theo khoa | Dropdown khoa, bảng lọc đúng |
| N2-06 | Filter môn theo loại LT/TH | Bảng lọc đúng |
| N2-07 | Xem chi tiết môn | Modal hiện: info + điều kiện + lớp mở |
| N2-08 | Thêm điều kiện bằng dropdown | Chọn 2 môn khác nhau, tạo OK |
| N2-09 | Chọn cùng 1 môn 2 bên | Disabled, không cho chọn |
| N2-10 | Export môn ra Excel | Download file đúng |
| N2-11 | Batch nhập điểm lớp 30 SV | Preview → confirm → tạo 30 record |
| N2-12 | Import Excel kết quả | Upload → preview → confirm → batch |
| N2-13 | SV xem CTHT tiến độ | Progress bar "Đã hoàn thành 60/120 TC (50%)" |
| N2-14 | SV xem điều kiện tiên quyết | Tooltip hiện danh sách môn tiên quyết |
| N2-15 | SV filter môn đã học theo HK | Dropdown HK, list lọc đúng |
| N2-16 | Admin mở quản lý chương trình học | Chọn ngành, thấy danh sách môn theo học kỳ dự kiến |
| N2-17 | Admin thêm môn vào chương trình | Chọn môn + học kỳ + bắt buộc/tự chọn, lưu thành công nếu hợp lệ |
| N2-18 | Admin xếp môn sai tiên quyết | UI/API báo lỗi học kỳ không hợp lệ |
| N2-19 | SV tìm môn đã học theo tên môn | Danh sách lọc đúng theo thuộc tính môn học |
| N2-20 | SV lọc môn đã học theo loại môn/khoa | Danh sách lọc đúng, phân trang giữ filter |
| N2-21 | SV còn nợ 9 TC theo CTĐT tới HK hiện tại | API điều kiện khóa luận trả `eligible=false`, `owedCredits=9` |
| N2-22 | SV còn nợ 8 TC hoặc ít hơn | API điều kiện khóa luận trả `eligible=true` |

---

# NGƯỜI 3 — Học kỳ, Lớp, Tiết học, Đơn giá, Đăng ký

## 3.1. Hiện trạng

**Trang Học kỳ (admin/semesters):**
- ✅ Đã có: CRUD (mã, tên, năm học, loại, thứ tự, ngày BD/KT, ngày ĐK BD/KT, hạn HP, trạng thái), phân trang SSR.
- ❌ Chưa có: dropdown chọn năm học (hiện nhập tay MaNamHoc), thêm/sửa năm học, validate ngày BD < KT realtime trên form, hiện thống kê (bao nhiêu lớp mở, bao nhiêu SV ĐK) ngay trên bảng, hiện trạng thái bằng badge màu.

**Trang Lớp (admin/classes):**
- ✅ Đã có: CRUD (mã, tên, mã môn, GV, lịch, phòng, sĩ số tối đa, mô tả), search, phân trang SSR.
- ❌ Chưa có: dropdown chọn môn học (hiện nhập tay MaMonHoc), quản lý mở/đóng lớp theo HK (hiện chỉ có API, chưa có nút trên UI), quản lý lịch học chi tiết theo tiết (hiện chỉ có text LichHoc), xem danh sách SV đã ĐK trong lớp, filter theo môn/HK/trạng thái, hiện SoLuongDaDangKy trên bảng.

**Trang Tiết học (admin/periods):**
- ✅ Đã có: CRUD tiết học (3.3KB), đầy đủ cơ bản.
- ❌ Chưa có: sắp xếp theo thứ tự, drag-drop đổi thứ tự.

**Trang Đơn giá (admin/pricing):**
- ✅ Đã có: bảng đơn giá, filter loại môn/HK (2.2KB cơ bản).
- ❌ Chưa có: form thêm/sửa đơn giá trên UI (chỉ có API, chưa rõ có modal chưa), hiện đơn giá dạng tiền VNĐ.

**Trang Đăng ký (admin/registrations):**
- ✅ Đã có: bảng phiếu ĐK (SoPhieu, MSSV, HoTen, HK, SoMon, TongTC, TongTien, Ngày, TrangThai), search, filter trạng thái, modal chi tiết (hiện danh sách môn ĐK theo HK).
- ❌ Chưa có: admin hủy/xóa 1 CTDK, admin đăng ký học phần hộ SV, hiện tổng tiền/miễn giảm trên chi tiết, export danh sách ĐK.

**Trang ĐK SV (student/course-registration):**
- ✅ Đã có: dropdown chọn HK, bảng lớp mở (MaLop, TenMon, TC, GV, Lịch, Phòng, LoaiDK, HocPhi, SĩSố), nút ĐK, phân trang, search, badge loại ĐK, hiện "X/Y" sĩ số, nút ĐK bị thay bằng "Hết chỗ" khi đầy.
- ❌ Chưa có: hiện "Còn X chỗ" dạng warning khi gần đầy (< 5), hiện tổng TC đã ĐK trong HK hiện tại, nút hủy ĐK cho SV (hiện phải qua trang khác).

**Trang Môn đã ĐK (student/my-courses):**
- ✅ Đã có: hiện danh sách CTDK theo HK (3.7KB).
- ❌ Chưa có: nút hủy ĐK từng môn, hiện tổng TC + tổng tiền.

**Trang Thời khóa biểu (student/my-schedule):**
- ✅ Đã có: render lịch theo thứ × tiết (8.6KB, khá đầy đủ), hiện tên môn, phòng, GV.
- ❌ Chưa có: chọn HK xem lịch (nếu chưa có), in/export lịch.

**Backend:**
- ✅ `semesterController.js` — CRUD, getActiveSemester, getRegistrationOptions, getAcademicYears.
- ✅ `classController.js` — CRUD, openClass, closeClass, getClassSchedules, upsertClassSchedule, getClassStats.
- ✅ `registrationController.js` — CRUD, registerCourse, cancelRegistration, getAvailableCourses, getStudentCourses. Có ensureNoScheduleConflict, ensureCreditLimit.
- ❌ Chưa có: API lấy DS SV trong 1 lớp, API export ĐK, API admin hủy CTDK, kiểm tra điều kiện khóa luận tốt nghiệp khi đăng ký môn khóa luận.

## 3.2. Công việc cần làm

### Giao diện Admin — Trang Học kỳ

1. **Dropdown chọn năm học**: Thay input MaNamHoc bằng dropdown load từ API `getAcademicYears()` (đã có). Thêm nút "Thêm năm học" nếu chưa có năm mong muốn.

2. **Validate ngày realtime trên form**: Khi nhập NgayBD/NgayKT → so sánh realtime, hiện ✗ "Ngày bắt đầu phải trước ngày kết thúc". Tương tự cho NgayBDDK/NgayKTDK.

3. **Hiện thống kê trên bảng**: Thêm cột "Lớp mở" (count LOPMO) + "SV ĐK" (count PHIEUDANGKY) trên bảng. Cần sửa viewController truyền thêm stats.

4. **Badge trạng thái**: Hiện trạng thái bằng badge màu (xanh = Đang diễn ra, vàng = Sắp diễn ra, xám = Kết thúc).

### Giao diện Admin — Trang Lớp

5. **Dropdown chọn môn**: Thay input MaMonHoc bằng dropdown search load từ API `/api/courses`.

6. **UI mở/đóng lớp theo HK**: Trong trang chi tiết lớp hoặc row actions: nút "Mở lớp" → modal chọn HK → gọi API openClass. Nút "Đóng lớp" → confirm → gọi closeClass. Hiện trạng thái mở/đóng trên bảng.

7. **UI quản lý lịch học chi tiết**: Click vào lớp → panel "Lịch học" → form chọn HK/Thứ/Tiết BĐ/Tiết KT/Phòng → nút Thêm/Sửa/Xóa. Hiện bảng lịch đã thêm. API đã có (`upsertClassSchedule`, `getClassSchedules`), chỉ cần UI.

8. **Xem danh sách SV trong lớp**: Nút "DS Sinh viên" → modal hiện bảng SV đã ĐK (MSSV, Họ tên, Ngày ĐK, Trạng thái). Cần API `GET /api/classes/:id/students`.

9. **Filter theo môn/HK/trạng thái**: 3 dropdown filter trên toolbar bảng lớp.

10. **Hiện SoLuongDaDangKy**: Thêm cột "Đã ĐK/Tối đa" trên bảng (data đã có).

### Giao diện Admin — Danh sách môn học mở

11. **Bổ sung quản lý danh sách môn học mở**: Cần có trang hoặc tab "Môn học mở" để admin xem toàn bộ lớp/môn đang được mở theo học kỳ. Đây không chỉ là danh sách lớp thường, mà là danh sách các offering có `MaHocKy + MaLop + MaMonHoc`.

12. **Bảng môn học mở phải đủ cột nghiệp vụ**: Mỗi dòng cần hiển thị học kỳ, mã lớp, tên lớp, mã môn, tên môn, loại môn, số tín chỉ, khoa, giảng viên, lịch học, phòng, sĩ số tối đa, số đã đăng ký, số chỗ còn lại, trạng thái mở/đóng.

13. **Bộ lọc môn học mở**: Có filter theo học kỳ, khoa, môn học, giảng viên, mã lớp, loại môn LT/TH, trạng thái mở/đóng, còn chỗ/hết chỗ. Search text phải tìm được theo mã môn, tên môn, mã lớp, tên lớp, giảng viên.

14. **Hành động trên môn học mở**: Từ danh sách môn học mở phải có nút xem lịch học, xem danh sách sinh viên đăng ký, đóng/mở lớp, chỉnh lịch học, chỉnh phòng/giảng viên nếu còn hợp lệ.

15. **API danh sách môn học mở**: Backend cần trả endpoint danh sách lớp mở kèm môn, lớp, học kỳ, lịch học, sĩ số và số chỗ còn lại. Nếu đã có API `getOpenedClasses`, phải bổ sung filter/query và dữ liệu còn thiếu.

### Giao diện Admin — Trang Đơn giá

16. **Form thêm/sửa đơn giá**: Kiểm tra xem pug đã có modal form chưa. Nếu chưa: thêm modal (chọn LoaiMon, LoaiHoc, HK, DonGia, TrangThai) + nút Thêm/Sửa/Xóa.

17. **Format tiền VNĐ**: Hiện đơn giá dạng "27.000 ₫" thay vì số thô.

### Giao diện Admin — Trang Đăng ký

18. **Admin hủy CTDK**: Nút "Hủy" cạnh từng môn trong modal chi tiết → confirm → gọi API cancelRegistration. Hiện lý do nếu bị chặn.

19. **Hiện miễn giảm trên chi tiết**: Trong modal chi tiết phiếu ĐK, thêm dòng: TiLeGiam, TienMienGiam, TongTienPhaiDong (data đã có từ PHIEUDANGKY).

20. **Export ĐK ra Excel**: Nút "Xuất Excel" → download file gồm: MSSV, HoTen, HK, DsMon, TongTC, TongTien.

### Giao diện Sinh viên — Đăng ký môn

21. **Hiện tổng TC đã ĐK trong HK**: Trên đầu bảng lớp mở, hiện "Đã đăng ký: X tín chỉ / Max Y tín chỉ". Load từ API getStudentCourses filter theo HK.

22. **Cảnh báo sĩ số gần đầy**: Nếu còn < 5 chỗ → badge đỏ "Sắp hết" thay vì text bình thường.

23. **Bổ sung tìm kiếm theo giảng viên**: Ở `/student/course-registration`, thêm filter/ô tìm kiếm giảng viên. Sinh viên nhập tên giảng viên hoặc chọn dropdown, danh sách lớp mở phải lọc đúng các lớp do giảng viên đó phụ trách.

24. **Bổ sung tìm kiếm theo lớp**: Thêm tìm kiếm theo mã lớp và tên lớp. Kết quả phải lọc được khi sinh viên chỉ nhớ mã lớp, ví dụ `SE104.N11`, hoặc tên lớp/nhóm lớp.

25. **Bổ sung tìm kiếm theo loại môn**: Thêm filter loại môn LT/TH/Tất cả. Nếu có thêm loại học khác trong dữ liệu thì dropdown phải lấy theo dữ liệu thực tế hoặc định nghĩa chung, không hardcode sai.

26. **Bổ sung filter theo lịch học**: Thêm các lựa chọn lọc theo thứ trong tuần, ngày học hoặc ca/tiết học nếu dữ liệu lịch có đủ. Tối thiểu phải có filter theo thứ và khoảng tiết để sinh viên tìm lớp không trùng lịch cá nhân.

27. **Bỏ phần học phí dự kiến khỏi trang đăng ký môn**: Không hiển thị cột/card/text "Học phí dự kiến", `DonGiaDuKien`, `ThanhTienDuKien` ở `/student/course-registration`. Phần học phí chỉ xử lý ở trang học phí/thanh toán. Backend có thể vẫn giữ dữ liệu để tính toán, nhưng frontend đăng ký môn không được làm sinh viên hiểu đây là màn thanh toán.

28. **Filter phải giữ trạng thái sau reload/phân trang**: Khi sinh viên lọc theo giảng viên/lớp/loại môn/thứ/tiết rồi chuyển trang hoặc đăng ký xong, filter hiện tại phải được giữ lại.

29. **Hiển thị lỗi điều kiện khóa luận rõ ràng**: Khi sinh viên đăng ký lớp/môn khóa luận tốt nghiệp nhưng chưa đủ điều kiện, UI phải hiển thị thông báo từ API, ví dụ "Chưa đủ điều kiện đăng ký khóa luận: còn nợ 9 tín chỉ, tối đa được nợ 8 tín chỉ". Không hiển thị lỗi chung chung như "Đăng ký thất bại".

### Giao diện Sinh viên — Môn đã ĐK

30. **Nút hủy ĐK**: Mỗi môn trong danh sách có nút "Hủy ĐK" → confirm → gọi API cancelRegistration → reload.

31. **Hiện tổng TC + tổng tiền**: Cuối danh sách hiện tổng: "Tổng: X tín chỉ | Học phí: Y₫".

32. **Hủy đăng ký xong thì xóa khỏi danh sách đang đăng ký**: Khi sinh viên bấm "Hủy ĐK" ở `/student/my-courses`, sau khi API thành công không hiển thị dòng đó với trạng thái "Đã hủy". Danh sách này chỉ là danh sách học phần đang đăng ký, nên môn đã hủy phải biến mất khỏi bảng active. Nếu cần lịch sử hủy thì để ở màn hình khác, không nằm trong danh sách đang đăng ký.

33. **Tổng tín chỉ đã đăng ký chỉ tính môn active**: Thêm phần tổng tín chỉ đã đăng ký ở đầu hoặc cuối trang `/student/my-courses`, chỉ cộng các chi tiết có trạng thái active/đã đăng ký. Không cộng môn đã hủy. Hiển thị rõ dạng "Tổng tín chỉ đã đăng ký: X".

34. **Không nhấn mạnh học phí ở danh sách môn đã đăng ký**: Vì đây là màn quản lý học phần đã đăng ký, không phải màn thanh toán, ưu tiên tổng tín chỉ và trạng thái học phần. Nếu vẫn cần giữ tổng tiền để admin/kiểm tra, không đặt thành thông tin chính; học phí chi tiết nằm ở `/student/my-tuition`.

### Giao diện Sinh viên — Thời khóa biểu

35. **Dropdown chọn HK**: Nếu chưa có → thêm dropdown chọn HK để xem lịch HK khác.

36. **In/export lịch**: Nút "In TKB" → window.print() hoặc export PDF.

### Backend

37. **API danh sách SV trong lớp**: `GET /api/classes/:id/students?MaHocKy=` → query CHITIETDANGKY join PHIEUDANGKY join SINHVIEN.

38. **API export ĐK**: `GET /api/registrations/export?MaHocKy=` → trả file Excel.

39. **Sửa viewController truyền stats cho HK**: Trong `adminSemesters()` → query count LOPMO + PHIEUDANGKY cho mỗi HK.

40. **Bổ sung filter cho API lớp mở sinh viên đăng ký**: `getAvailableCourses()` cần nhận thêm query như `GiangVien`, `MaLop`, `LoaiMon`, `ThuTrongTuan`, `MaTietBatDau`, `MaTietKetThuc`, `ConCho`. API phải filter đúng trên `LOP`, `MONHOC`, `LOPMO`, `LICHHOCLOP` và vẫn trả phân trang đúng.

41. **API môn đã đăng ký chỉ trả danh sách active theo mặc định**: `getStudentCourses()` hoặc endpoint tương ứng cho `/student/my-courses` phải mặc định chỉ lấy chi tiết đang đăng ký. Nếu cần lấy cả đã hủy thì phải có query riêng như `includeCancelled=true`, không dùng cho danh sách active mặc định.

42. **API tổng tín chỉ đã đăng ký**: Response của danh sách môn đã đăng ký cần có summary `totalCreditsRegistered` chỉ tính chi tiết active để frontend hiển thị "Tổng tín chỉ đã đăng ký".

43. **API danh sách môn học mở cho admin**: Bổ sung endpoint/filter cho trang "Danh sách môn học mở", gồm học kỳ, khoa, môn, giảng viên, lớp, loại môn, trạng thái, còn chỗ/hết chỗ.

44. **Chặn đăng ký khóa luận nếu nợ quá 8 tín chỉ**: Trong `registerCourse()` và mọi luồng admin đăng ký học phần hộ SV, nếu môn/lớp đang đăng ký là khóa luận tốt nghiệp thì gọi helper/API điều kiện khóa luận của Người 2. Nếu `owedCredits > 8`, không tạo `CHITIETDANGKY`, không cập nhật học phí, trả lỗi có `owedCredits`, `maxAllowedOwedCredits=8` và danh sách môn còn nợ nếu có.

## 3.3. Phạm vi file

- **Backend**: `semesterController.js`, `classController.js`, `periodController.js`, `pricingController.js`, `registrationController.js`, `semesterRoutes.js`, `classRoutes.js`, `periodRoutes.js`, `pricingRoutes.js`, `registrationRoutes.js`, `viewController.js`
- **Frontend**: `admin/semesters.pug` + `.js`, `admin/classes.pug` + `.js`, `admin/periods.pug` + `.js`, `admin/pricing.pug` + `.js`, `admin/registrations.pug` + `.js`, `student/course-registration.pug` + `.js`, `student/my-courses.pug` + `.js`, `student/my-schedule.pug` + `.js`

## 3.4. Test Cases

| ID | Mô tả | Expected |
| --- | --- | --- |
| N3-01 | Thêm HK đủ thông tin | Tạo thành công |
| N3-02 | Form HK NgayBD > NgayKT | Hiện ✗ realtime, disable Lưu |
| N3-03 | Thêm lớp chọn môn từ dropdown | Dropdown load môn, tạo OK |
| N3-04 | Mở lớp cho HK | Nút Mở → chọn HK → thành công |
| N3-05 | Đóng lớp | Nút Đóng → confirm → thành công |
| N3-06 | Thêm lịch học cho lớp | Form chọn thứ/tiết → thêm OK |
| N3-07 | Xem DS SV trong lớp | Modal hiện bảng SV đã ĐK |
| N3-08 | Filter lớp theo môn/HK | Dropdown, bảng lọc đúng |
| N3-09 | Thêm đơn giá | Modal form, tạo OK |
| N3-10 | Admin hủy CTDK | Nút hủy → confirm → danh sách active reload đúng, chi tiết đã hủy không xuất hiện trong danh sách đang đăng ký |
| N3-11 | Export ĐK ra Excel | Download file đúng |
| N3-12 | SV ĐK môn, hiện tổng TC | "Đã ĐK: 9 TC / Max 24 TC" |
| N3-13 | Lớp còn 3 chỗ | Badge đỏ "Sắp hết - 3/40" |
| N3-14 | SV hủy ĐK trên my-courses | Nút hủy, confirm, hủy OK, reload |
| N3-15 | SV xem TKB HK khác | Dropdown HK, lịch thay đổi |
| N3-16 | SV in TKB | Nút In → cửa sổ in mở |
| N3-17 | SV tìm môn theo giảng viên | Nhập/chọn giảng viên, danh sách lớp mở lọc đúng |
| N3-18 | SV tìm môn theo mã lớp | Nhập mã lớp, chỉ hiện lớp khớp |
| N3-19 | SV lọc theo loại môn LT/TH | Danh sách lọc đúng loại môn |
| N3-20 | SV lọc theo thứ/tiết học | Danh sách chỉ hiện lớp có lịch phù hợp |
| N3-21 | Trang đăng ký môn không hiện học phí dự kiến | Không còn cột/card học phí dự kiến trên UI |
| N3-22 | SV hủy môn đã đăng ký | Môn biến mất khỏi danh sách active, không hiện dòng "Đã hủy" |
| N3-23 | My-courses hiện tổng tín chỉ | Tổng tín chỉ chỉ cộng môn đang đăng ký |
| N3-24 | Admin xem danh sách môn học mở | Bảng có học kỳ, môn, lớp, giảng viên, lịch, sĩ số, còn chỗ |
| N3-25 | SV đăng ký khóa luận khi còn nợ 9 TC | API chặn, UI hiện lý do còn nợ quá 8 tín chỉ, không tạo CTDK |

---

# NGƯỜI 4 — Học phí, Thanh toán, Thùng rác, Tài khoản, Thông báo, Báo cáo, Dashboard

## 4.1. Hiện trạng

**Trang Học phí (admin/tuition):**
- ✅ Backend: `tuitionController.js` (10KB) — `getAllTuition()` đã trả đầy đủ: MSSV, HoTen, HK, SoMon, TongTienPhaiDong, TongTienDaDong, ConNo, TrangThai, CoTheThanhToan, QuaHan. `getTuitionById()` trả chi tiết từng CTDK + danh sách phiếu thu.
- ❌ Frontend: **`admin/tuition.js` chỉ có 16 dòng** — chỉ có debounce search + filter redirect. **Không có gì khác**: không có bảng chi tiết, không có nút xem, không có modal, không format tiền, không hiện trạng thái.

**Trang Phiếu thu (admin/payments):**
- ✅ Đã có: form tạo phiếu thu (MSSV, HK, SoTien, HinhThuc, GhiChu), nút xác nhận/hủy phiếu, search, dropdown HK, phân trang SSR.
- ❌ Chưa có: filter theo hình thức thu/trạng thái (UI), xem chi tiết phiếu thu, in phiếu thu, hiện thông tin SV (học phí còn nợ) khi nhập MSSV, export.

**Trang Thùng rác (admin/trash):**
- ✅ Đã có: UI hiện danh sách entity đã xóa theo loại, nút Khôi phục/Xóa vĩnh viễn (4.7KB).
- ❌ Chưa có: search trong thùng rác, xóa hàng loạt, khôi phục hàng loạt, hiện ai xóa/khi nào rõ ràng hơn.

**Trang Tài khoản (admin/users):**
- ✅ Đã có: CRUD tài khoản, khóa/mở khóa, phân quyền nhóm, filter theo role/nhóm, search (6.5KB khá đầy đủ).
- ❌ Chưa có: đổi mật khẩu admin cho user, reset mật khẩu, hiện SV liên kết với TK, tạo TK hàng loạt cho SV.

**Trang Thông báo (admin/notifications):**
- ✅ Đã có: CRUD thông báo, filter loại (2.5KB cơ bản).
- ❌ Chưa có: chọn đối tượng gửi (tất cả/theo khoa/theo nhóm), hẹn giờ gửi, hiện preview, rich text editor.

**Trang Báo cáo (admin/reports):**
- ✅ Đã có: hiện thống kê cơ bản (tổng SV, môn, ĐK, đã thu, còn nợ), bảng SV theo trạng thái, bảng thanh toán theo hình thức.
- ❌ Chưa có: filter theo HK, biểu đồ (chart), báo cáo chi tiết SV nợ HP, báo cáo doanh thu theo tháng, export PDF/Excel.

**Trang Dashboard (admin):**
- ✅ Đã có: hiện 4 stat cards (SV, Môn, ĐK, Doanh thu) — load từ API stats (20 dòng JS).
- ❌ Chưa có: biểu đồ doanh thu, biểu đồ ĐK theo HK, danh sách SV nợ HP gần nhất, thông báo mới nhất, hoạt động gần đây.

**Trang Học phí SV (student/my-tuition):**
- ✅ Đã có: bảng HP theo HK, tổng/đã đóng/còn nợ, nút thanh toán VNPay/ZaloPay/QR (7.5KB khá tốt).
- ❌ Chưa có: hiện chi tiết từng môn trong phiếu, hiện đối tượng miễn giảm, hiện lịch sử thanh toán trong cùng trang.

**Trang Lịch sử TT SV (student/my-payments):**
- ✅ Đã có: bảng phiếu thu (2.7KB cơ bản).
- ❌ Chưa có: filter theo HK/trạng thái, xem chi tiết phiếu, in phiếu thu.

**Trang Thông báo SV (student/notifications):**
- ✅ Đã có: hiện danh sách thông báo (3KB).
- ❌ Chưa có: đánh dấu đã đọc, filter đã đọc/chưa đọc, phân trang.

**Trang Dashboard SV:**
- ✅ Đã có: file `student/dashboard.js` (2.5KB).
- ❌ Cần kiểm tra: hiện tóm tắt (TC đã hoàn thành, HP còn nợ, lịch học hôm nay, thông báo mới).

## 4.2. Công việc cần làm

### Giao diện Admin — Trang Học phí ⚠️ (cần viết gần như từ đầu)

1. **Viết lại `admin/tuition.js` hoàn chỉnh**: File hiện chỉ 16 dòng. Cần viết:
   - Bảng danh sách: MSSV, Họ tên, HK, Số môn, Tổng phải đóng, Đã đóng, Còn nợ, Trạng thái (badge màu: xanh=Đã đóng đủ, vàng=Đóng 1 phần, đỏ=Quá hạn, xám=Chưa phát sinh).
   - Format tiền dạng "1.000.000 ₫".
   - Nút "Xem chi tiết" → modal hiện: breakdown từng CTDK (môn, TC, loại ĐK, đơn giá, thành tiền) + danh sách phiếu thu + tổng kết.
   - Filter theo HK, trạng thái.

2. **Sửa `admin/tuition.pug`**: Đảm bảo template render đúng bảng + modal, gọi đúng JS.

### Giao diện Admin — Trang Phiếu thu

3. **Filter theo hình thức/trạng thái**: Thêm 2 dropdown filter cạnh search.

4. **Auto-fill khi nhập MSSV**: Khi nhập MSSV trên form tạo phiếu thu → gọi API lấy thông tin SV + HP còn nợ → hiện: "Nguyễn Văn A - Còn nợ: 2.500.000₫". Auto fill số tiền = còn nợ.

5. **Xem chi tiết phiếu thu**: Click vào phiếu → modal hiện: thông tin SV, HK, số tiền, hình thức, người thu, ngày, mã GD, trạng thái.

6. **In phiếu thu**: Nút "In" → tạo layout in phiếu thu (tên trường, thông tin SV, số tiền bằng số + chữ, ngày, người thu).

7. **Export phiếu thu**: Nút "Xuất Excel" → download file.

### Giao diện Admin — Trang Thùng rác

8. **Thêm search**: Ô tìm kiếm theo tên/mã entity đã xóa.

9. **Khôi phục/xóa hàng loạt**: Checkbox chọn nhiều → nút "Khôi phục đã chọn" / "Xóa vĩnh viễn đã chọn".

### Giao diện Admin — Trang Tài khoản

10. **Reset mật khẩu**: Nút "Reset MK" → confirm → gọi API reset mật khẩu về mặc định.

11. **Tạo TK hàng loạt cho SV**: Nút "Tạo TK cho SV" → chọn nhóm SV (theo ngành/khoa/danh sách) → batch tạo TK (username=MSSV, password mặc định). Cần API `POST /api/users/batch-create-student-accounts`.

### Giao diện Admin — Trang Thông báo

12. **Chọn đối tượng gửi**: Thêm field "Gửi cho": radio (Tất cả SV / SV theo khoa / SV theo ngành) + dropdown tương ứng.

13. **Preview thông báo**: Nút "Xem trước" → hiện preview thông báo trước khi lưu.

### Giao diện Admin — Trang Báo cáo

14. **Filter theo HK**: Dropdown "Học kỳ" → load lại stats cho HK đó. API stats đã hỗ trợ query `MaHocKy`.

15. **Biểu đồ**: Thêm ít nhất 2 biểu đồ: Biểu đồ cột "Doanh thu theo HK" + Biểu đồ tròn "Thanh toán theo hình thức". Dùng Chart.js hoặc tương tự.

16. **Báo cáo SV nợ HP**: Bảng riêng hiện danh sách SV còn nợ HP, sắp xếp theo số tiền nợ giảm dần.

17. **Export báo cáo**: Nút "Xuất PDF" / "Xuất Excel" cho từng loại báo cáo.

18. **Thống kê danh sách sinh viên chưa hoàn thành đóng học phí**: Trong `/admin/reports`, bổ sung một khối báo cáo riêng "Sinh viên chưa hoàn thành học phí". Khối này phải thống kê và liệt kê các sinh viên có `ConNo > 0`, bao gồm chưa đóng gì, đóng một phần và quá hạn.

19. **Bảng sinh viên chưa hoàn thành học phí phải đủ cột**: Mỗi dòng cần có MSSV, họ tên, ngành/khoa nếu có, học kỳ, tổng phải đóng, đã đóng, còn nợ, hạn đóng học phí, số ngày quá hạn nếu có, trạng thái (`Chưa đóng`, `Đóng một phần`, `Quá hạn`).

20. **Filter báo cáo học phí chưa hoàn thành**: Có filter theo học kỳ, khoa/ngành nếu API có dữ liệu, trạng thái nợ, quá hạn/chưa quá hạn. Có ô tìm theo MSSV/họ tên.

21. **Tổng hợp số liệu đầu bảng**: Phía trên danh sách phải có tổng số sinh viên chưa hoàn thành, tổng số tiền còn nợ, số sinh viên quá hạn, số sinh viên đã đóng một phần.

22. **Export danh sách sinh viên chưa hoàn thành học phí**: Nút xuất Excel/PDF cho riêng bảng này để phòng tài chính dùng đối soát.

### Giao diện Admin — Dashboard

23. **Biểu đồ dashboard**: Thêm biểu đồ doanh thu 6 tháng gần nhất + biểu đồ ĐK theo HK.

24. **Danh sách SV nợ HP mới nhất**: Card hiện top 5 SV nợ nhiều nhất.

25. **Hoạt động gần đây**: Card hiện 5 hoạt động gần nhất (ĐK mới, thanh toán mới, SV mới).

### Giao diện Sinh viên — Học phí

26. **Hiện chi tiết môn**: Mỗi dòng HP khi expand/click → hiện breakdown từng môn (tên, TC, loại ĐK, đơn giá, thành tiền).

27. **Hiện đối tượng miễn giảm**: Dòng "Miễn giảm: DT06 (50%) → -1.250.000₫".

28. **Kéo đúng API thanh toán VNPay/ZaloPay/QR**: Nút đóng học phí trên `/student/my-tuition` không được hardcode link thanh toán. Khi sinh viên chọn VNPay, ZaloPay, QR hoặc phương thức khác, frontend phải gọi đúng API thanh toán của backend, truyền đúng `SoPhieu` hoặc `MaSv + MaHocKy`, `SoTienThu`, `method`.

29. **Xử lý response thanh toán chính xác**: Nếu API trả `checkoutUrl` thì chuyển hướng hoặc mở đúng URL. Nếu trả `qrPayload` thì hiển thị QR đúng. Nếu API trả phiếu đang chờ xác nhận thì cập nhật UI sang trạng thái "Chờ xác nhận". Nếu API báo lỗi vượt số tiền/còn yêu cầu chờ thì hiển thị lỗi cụ thể.

30. **Không tự tính sai số tiền thanh toán ở frontend**: Số còn nợ phải lấy từ API học phí/thanh toán; frontend chỉ format và gửi số tiền hợp lệ. Không tự cộng/trừ từ dữ liệu cũ nếu API đã trả `remainingAmount` hoặc `ConNo`.

### Giao diện Sinh viên — Lịch sử TT

31. **Filter theo HK**: Dropdown chọn HK.

32. **In phiếu thu**: Nút "In" cho từng phiếu.

### Giao diện Sinh viên — Thông báo

33. **Đánh dấu đã đọc**: Click vào thông báo → đánh dấu đã đọc, đổi style.

34. **Filter đã đọc/chưa**: Toggle "Tất cả / Chưa đọc".

35. **Bổ sung xem chi tiết thông báo**: Ở `/student/notifications`, mỗi thông báo phải click được để mở modal/panel/trang chi tiết hiển thị toàn bộ nội dung thông báo, không chỉ tiêu đề hoặc đoạn rút gọn. Chi tiết cần có: tiêu đề, nội dung đầy đủ, loại thông báo, ngày tạo, ngày hết hạn nếu có, trạng thái đã đọc/chưa đọc, đường dẫn liên quan nếu có.

36. **Đánh dấu đã đọc khi xem chi tiết**: Khi sinh viên mở chi tiết thông báo, gọi API đánh dấu đã đọc. Sau khi đóng modal/quay lại danh sách, badge "chưa đọc" và bộ đếm thông báo phải cập nhật.

37. **Nội dung dài phải đọc được đầy đủ**: Modal/panel chi tiết cần hỗ trợ nội dung nhiều dòng, link, xuống dòng; không cắt bằng ellipsis trong phần chi tiết. Nếu thông báo có `DuongDan`, hiển thị nút "Mở liên kết" rõ ràng.

### Giao diện Sinh viên — Dashboard

38. **Hiện tóm tắt**: Cards: "TC đã hoàn thành", "HP còn nợ", "Lịch học hôm nay", "Thông báo mới".

### Backend

39. **API reset mật khẩu**: `PUT /api/users/:id/reset-password` → set mật khẩu mặc định, trả thành công.

40. **API batch tạo TK SV**: `POST /api/users/batch-create-student-accounts` → nhận danh sách MaSv → tạo TK.

41. **API báo cáo doanh thu theo tháng**: `GET /api/reports/revenue-monthly?year=2025` → trả array [{month, amount}].

42. **API danh sách SV nợ HP**: `GET /api/reports/students-owing?MaHocKy=` → trả danh sách SV còn nợ, sắp xếp theo ConNo DESC.

43. **API export phiếu thu**: `GET /api/payments/export` → trả file Excel.

44. **API đánh dấu thông báo đã đọc**: `PUT /api/notifications/:id/read` (cho SV).

45. **API chi tiết thông báo**: `GET /api/notifications/:id` hoặc dùng endpoint hiện có nhưng phải trả đầy đủ `TieuDe`, `NoiDung`, `Loai`, `DuongDan`, `NgayTao`, `NgayHetHan`, `DaDoc`. API phải kiểm tra quyền: sinh viên chỉ xem thông báo của mình hoặc thông báo chung đúng đối tượng.

46. **API checkout thanh toán thống nhất**: Đảm bảo `POST /api/payments/checkout` hoặc endpoint tương ứng nhận `method` (`vnpay`, `zalopay`, `qr`, `cash`) và trả response thống nhất: `receipt`, `checkoutUrl`, `qrPayload`, `remainingAmount`, `message`. Frontend học phí sinh viên phải dùng API này.

47. **API báo cáo sinh viên chưa hoàn thành học phí**: Endpoint báo cáo cần trả cả dữ liệu tổng hợp và danh sách chi tiết: `summary.totalStudents`, `summary.totalDebt`, `summary.overdueStudents`, `rows[]` gồm MSSV, họ tên, học kỳ, phải đóng, đã đóng, còn nợ, hạn đóng, trạng thái.

## 4.3. Phạm vi file

- **Backend**: `tuitionController.js`, `paymentController.js`, `trashController.js`, `roleController.js`, `notificationController.js`, `dashboardController.js`, `viewController.js`, `tuitionRoutes.js`, `paymentRoutes.js`, `trashRoutes.js`, `roleRoutes.js`, `notificationRoutes.js`, `dashboardRoutes.js`, `paymentRules.js`, `trashConfig.js`
- **Frontend**: `admin/tuition.pug` + `.js`, `admin/payments.pug` + `.js`, `admin/trash.pug` + `.js`, `admin/users.pug` + `.js`, `admin/notifications.pug` + `.js`, `admin/reports.pug` + `.js`, `admin/dashboard.pug` + `.js`, `student/my-tuition.pug` + `.js`, `student/my-payments.pug` + `.js`, `student/notifications.pug` + `.js`, `student/dashboard.pug` + `.js`

## 4.4. Test Cases

| ID | Mô tả | Expected |
| --- | --- | --- |
| N4-01 | Xem trang Học phí admin | Bảng hiện đầy đủ: SV, HK, PhaiDong, DaDong, ConNo, TrangThai badge |
| N4-02 | Xem chi tiết HP 1 SV | Modal hiện breakdown môn + phiếu thu |
| N4-03 | Filter HP theo HK | Bảng lọc đúng |
| N4-04 | Tạo phiếu thu, nhập MSSV | Auto hiện tên SV + còn nợ |
| N4-05 | Tạo phiếu thu thành công | Phiếu tạo, reload bảng |
| N4-06 | Xác nhận phiếu thu chờ | Chuyển thành "Thành công" |
| N4-07 | Hủy phiếu thu | Confirm → hủy OK |
| N4-08 | In phiếu thu | Cửa sổ in mở, layout đúng |
| N4-09 | Export phiếu thu Excel | Download file đúng |
| N4-10 | Search thùng rác | Tìm đúng entity |
| N4-11 | Khôi phục entity | Khôi phục OK, entity quay lại |
| N4-12 | Xóa vĩnh viễn | Confirm → xóa vĩnh viễn |
| N4-13 | Reset MK user | MK reset về mặc định |
| N4-14 | Batch tạo TK cho SV | Chọn nhóm SV → tạo TK hàng loạt |
| N4-15 | Báo cáo filter theo HK | Stats cập nhật theo HK |
| N4-16 | Biểu đồ doanh thu | Chart hiện đúng data |
| N4-17 | Dashboard hiện stats | 4 cards + biểu đồ + SV nợ |
| N4-18 | SV xem HP chi tiết | Expand hiện breakdown môn |
| N4-19 | SV đánh dấu TB đã đọc | Click → style đổi, count giảm |
| N4-20 | SV xem dashboard | Cards: TC, HP nợ, lịch hôm nay |
| N4-21 | SV mở chi tiết thông báo | Modal/panel hiện toàn bộ tiêu đề, nội dung, ngày, link; không bị cắt nội dung |
| N4-22 | SV xem thông báo chi tiết | Thông báo được đánh dấu đã đọc, badge/count cập nhật |
| N4-23 | SV thanh toán VNPay | Gọi API checkout, nhận checkoutUrl và chuyển hướng đúng |
| N4-24 | SV thanh toán ZaloPay | Gọi API checkout, nhận checkoutUrl đúng, không hardcode link |
| N4-25 | SV thanh toán QR | API trả qrPayload, UI hiện QR đúng số tiền còn nợ |
| N4-26 | Báo cáo SV chưa hoàn thành học phí | Bảng hiện MSSV, họ tên, phải đóng, đã đóng, còn nợ, hạn đóng, trạng thái |
| N4-27 | Export danh sách SV chưa hoàn thành học phí | Download file đúng filter hiện tại |

---

# Tổng kết khối lượng

> Cách tính: `Số việc` = số đầu mục công việc dạng `n. **...**` trong phần "Công việc cần làm" của từng người; `Test Cases` = số dòng test case `N1-*`, `N2-*`, `N3-*`, `N4-*`.

| Người | Số việc | Test Cases | Việc nặng nhất |
| --- | --- | --- | --- |
| Người 1 | 27 | 23 | Import/Export Excel SV, trang chi tiết SV, hiển thị đối tượng readonly ở profile/form sửa SV, quản lý tỉnh/phường xã |
| Người 2 | 29 | 22 | Batch nhập điểm, dropdown chọn môn, đồ thị điều kiện, quản lý chương trình học, tính điều kiện khóa luận tốt nghiệp |
| Người 3 | 44 | 25 | UI lịch học chi tiết, DS SV trong lớp, mở/đóng lớp UI, danh sách môn học mở, filter đăng ký môn, chặn đăng ký khóa luận khi nợ quá 8 TC |
| Người 4 | 47 | 27 | **Viết lại trang Học phí admin**, tích hợp checkout VNPay/ZaloPay/QR, chi tiết thông báo, báo cáo SV chưa hoàn thành học phí |
