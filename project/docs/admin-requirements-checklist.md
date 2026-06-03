# Admin Requirements Checklist

Nguồn yêu cầu: `docs/admin-requirements-full.md`.

Quy ước trạng thái: [ ] chưa làm, [~] đang làm, [x] đã sửa code và đã kiểm tra. Mỗi lượt cập nhật chỉ đánh dấu các mã checklist thuộc nhóm được yêu cầu trong lượt đó.

## 8. Trang quản lý phòng học

File đã sửa trong nhóm: `prisma/schema.prisma`; `src/config/init.sql`; `src/config/database.js`; `src/controllers/viewController.js`; `src/controllers/roomController.js`; `src/routes/roomRoutes.js`; `src/views/pages/admin/rooms.pug`; `src/public/js/admin/rooms.js`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-ROOM-001 | [x] | /admin/rooms | Thiếu tham chiếu và dữ liệu tới học kỳ; tạo lại bảng phòng học và seed database phòng học cho từng kỳ. | Danh sách, form thêm/sửa và popup dùng `MaHocKy`. | `roomController.getRoomRows` lọc theo học kỳ; tạo/sửa upsert phân bổ học kỳ. | Thêm `PHONGHOCHOCKY`, FK tới `PHONGHOC` và `HOCKY`, seed/backfill phòng theo từng kỳ trong `init.sql` và bootstrap. | Đã kiểm tra schema/init/bootstrap; `npx prisma validate`; Pug compile; JS syntax. |
| REQ-ROOM-002 | [x] | /admin/rooms | Thêm select bên trái ô tìm kiếm để tìm theo mã phòng, tên phòng, tòa nhà, loại phòng hoặc học kỳ. | `rooms.js` tích hợp `AdminUI.createSearchCriterionControl`. | `roomController` nhận `searchField` và query raw theo từng trường. | Dùng join `PHONGHOCHOCKY`/`HOCKY` để tìm theo học kỳ. | Chọn từng tiêu chí và gửi query `searchField` tương ứng. |
| REQ-ROOM-003 | [x] | /admin/rooms | Thêm filter lọc theo status đang dùng và filter học kỳ. | Thêm `#filter-semester` và `#filter-used-status`. | `getRoomRows` tính `ClassCount`, `IsInUse`, lọc `usedStatus=in_use/free`. | Dựa trên `LOPMO` + `LICHHOCLOP` theo học kỳ. | Lọc phòng đang có lớp/chưa có lớp theo học kỳ. |
| REQ-ROOM-004 | [x] | /admin/rooms | Bỏ cột đang dùng; trong cột thao tác có nút Lớp đang dùng mở popup danh sách lớp đang dùng phòng trong học kỳ, mặc định học kỳ hiện tại. | Bảng bỏ cột đang dùng; nút `Lớp đang dùng` nằm trong cột thao tác. | Thêm `GET /api/rooms/:id/classes`. | Query lớp dùng phòng theo `MaHocKy`. | Mở popup, đổi học kỳ trong popup, kiểm tra danh sách lớp. |
| REQ-ROOM-005 | [x] | /admin/rooms | Thêm cột học kỳ. | Bảng hiển thị `HocKyLabel`/`MaHocKy`. | `getRoomRows` trả `MaHocKy`, `TenHocKy`, `TenNamHoc`. | Phụ thuộc `PHONGHOCHOCKY`. | Danh sách đổi theo filter học kỳ. |
| REQ-ROOM-006 | [x] | /admin/rooms | Click dòng bản ghi thì popup thông tin chi tiết bản ghi đó. | `rooms.pug` thêm `data-record`; `rooms.js` gắn `AdminUI.attachRowDetailHandlers`. | Dữ liệu list đủ để render chi tiết. | Không cần thêm DB ngoài học kỳ. | Click dòng, không click nút thao tác, modal chi tiết mở đúng. |
| REQ-ROOM-007 | [x] | /admin/rooms | Khi sửa phòng học, trường không được phép sửa phải bôi xám và hiện thông báo lỗi khi click. | `MaPhong` readonly, có `data-readonly-message`, dùng `AdminUI.initReadonlyNotices`. | `updateRoom` chặn đổi `MaPhong`. | Không cần thêm DB. | Mở sửa, click mã phòng, kiểm tra toast; gửi API đổi mã bị chặn. |
| REQ-ROOM-008 | [x] | /admin/rooms | Hiệu chỉnh giao diện thân thiện sau các thao tác trên. | Bố trí filter, bảng, modal form và modal lớp dùng chung style admin. | Không thêm API ngoài popup lớp. | Không cần thêm DB. | Pug compile và kiểm tra tương tác chính. |

## 9. Trang quản lý giảng viên

File đã sửa trong nhóm: `prisma/schema.prisma`; `src/config/init.sql`; `src/config/database.js`; `src/controllers/viewController.js`; `src/controllers/lecturerController.js`; `src/routes/lecturerRoutes.js`; `src/views/pages/admin/lecturers.pug`; `src/public/js/admin/lecturers.js`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-LECTURER-001 | [x] | /admin/lecturers | Thiếu tham chiếu và dữ liệu tới học kỳ; tạo lại bảng giảng viên và seed giảng viên cho từng kỳ. | Danh sách, form và popup dùng `MaHocKy`. | `lecturerController.getLecturerRows` lọc theo học kỳ; tạo/sửa upsert phân bổ học kỳ. | Thêm `GIANGVIENHOCKY`, FK tới `GIANGVIEN` và `HOCKY`, seed/backfill giảng viên theo từng kỳ. | Đã kiểm tra schema/init/bootstrap; `npx prisma validate`; Pug compile; JS syntax. |
| REQ-LECTURER-002 | [x] | /admin/lecturers | Tách học hàm và học vị khỏi trường hiện tại. | Bảng/form dùng `HocHam` và `HocVi` riêng. | Controller lưu `HocHam`, `HocVi`, đồng bộ `HocHamHocVi` legacy. | Thêm cột `GIANGVIEN.HocHam`, `GIANGVIEN.HocVi`, backfill từ legacy. | Thêm/sửa lưu riêng hai trường. |
| REQ-LECTURER-003 | [x] | /admin/lecturers | Trong thêm/sửa giảng viên, học hàm và học vị phải là select với option phù hợp, không nhập tự do. | Form dùng select học hàm `GS/PGS` và học vị `CN/KS/ThS/TS`. | Controller validate whitelist giá trị. | Không cần bảng danh mục riêng. | Gửi giá trị ngoài whitelist qua API bị chặn. |
| REQ-LECTURER-004 | [x] | /admin/lecturers | Thêm select bên trái ô tìm kiếm để tìm theo mã GV, họ tên, khoa, email giảng viên hoặc học kỳ. | `lecturers.js` tích hợp `AdminUI.createSearchCriterionControl`. | Query theo `searchField` qua `getLecturerRows`. | Dùng join `GIANGVIENHOCKY`/`HOCKY`/`KHOA`. | Chọn từng tiêu chí và kiểm tra query tương ứng. |
| REQ-LECTURER-005 | [x] | /admin/lecturers | Thiếu data email giảng viên; seed database thêm email, không được thiếu. | Email hiển thị ở bảng và bắt buộc trong form. | Controller validate email khi thêm/sửa. | `GIANGVIEN.Email` là NOT NULL; seed/backfill `lower(MaGiangVien) || '@uit.edu.vn'`. | Kiểm tra seed/bootstrap không còn email trống. |
| REQ-LECTURER-006 | [x] | /admin/lecturers | Bỏ cột số lớp; thay bằng nút xem lớp trong cột thao tác, popup lớp giảng viên đang dạy trong học kỳ tùy chọn, mặc định học kỳ hiện tại. | Nút `Xem lớp` mở modal theo học kỳ. | Thêm `GET /api/lecturers/:id/classes`. | Query `LOPMO` theo `MaGiangVien` và `MaHocKy`. | Mở popup, đổi học kỳ, kiểm tra lớp có/không có dữ liệu. |
| REQ-LECTURER-007 | [x] | /admin/lecturers | Thêm cột học hàm, học vị trước họ tên hoặc gộp rõ với cột họ tên để tránh quá rộng. | Bảng có cột `Học hàm`, `Học vị` trước `Họ tên`. | `getLecturerRows` trả riêng `HocHam`, `HocVi`. | Phụ thuộc backfill tách trường. | Bảng hiển thị rõ hai trường. |
| REQ-LECTURER-008 | [x] | /admin/lecturers | Click dòng bản ghi thì popup thông tin chi tiết bản ghi đó. | `lecturers.pug` thêm `data-record`; `lecturers.js` gắn detail modal. | Dữ liệu list đủ để render chi tiết. | Không cần thêm DB ngoài học kỳ/tách trường. | Click dòng mở modal chi tiết chỉ xem. |
| REQ-LECTURER-009 | [x] | /admin/lecturers | Khi sửa giảng viên, trường không được phép sửa phải bôi xám và hiện thông báo lỗi khi click. | `MaGiangVien` readonly, có `data-readonly-message`, dùng `AdminUI.initReadonlyNotices`. | `updateLecturer` chặn đổi `MaGiangVien`. | Không cần thêm DB. | Mở sửa, click mã GV, kiểm tra toast; gửi API đổi mã bị chặn. |
| REQ-LECTURER-010 | [x] | /admin/lecturers | Hiệu chỉnh giao diện thân thiện sau các thao tác trên. | Bố trí filter, bảng, form select, popup lớp và modal chi tiết theo style admin. | Không thêm API ngoài popup lớp. | Không cần thêm DB. | Pug compile và kiểm tra tương tác chính. |

## 14. Trang quản lý đơn giá tín chỉ

File đã sửa trong nhóm: `src/views/pages/admin/pricing.pug`; `src/public/js/admin/pricing.js`; `src/public/css/admin/pricing.css`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-PRICING-001 | [x] | /admin/pricing | Thời gian ở phần sửa thiếu giờ phút giây. | Bảng và modal sửa hiển thị `Sửa lúc` đủ ngày/tháng/năm giờ:phút:giây; modal sửa có khối audit `Sửa bởi/Sửa lúc`. | Không cần API mới; dùng dữ liệu `NgayCapNhat`, `NguoiCapNhat`. | Không cần migration. | `node --check`; Pug compile; mở modal sửa kiểm tra thời gian đầy đủ. |
| REQ-PRICING-002 | [x] | /admin/pricing | Hiệu chỉnh giao diện thân thiện với người dùng. | Bổ sung khối audit đọc rõ, giữ layout filter/table/modal gọn và nhất quán style admin. | Không cần API mới. | Không cần migration. | Pug compile; kiểm tra modal thêm không hiện audit, modal sửa hiện audit. |

## 15. Trang quản lý đối tượng ưu tiên

File đã sửa trong nhóm: `src/controllers/beneficiaryController.js`; `src/controllers/viewController.js`; `src/views/pages/admin/beneficiaries.pug`; `src/public/js/admin/beneficiaries.js`; `src/public/css/theme.css`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-BENEFICIARY-001 | [x] | /admin/beneficiaries | Bên trái ô tìm kiếm, thêm select để tìm theo mã hoặc tên đối tượng. | Toolbar có select `Tất cả/Mã/Tên đối tượng` trước ô tìm kiếm và giữ query `searchField` khi lọc/phân trang. | API/list view nhận `searchField=MaDoiTuong/TenDoiTuong/all`. | Không cần migration. | `node --check`; Pug compile; tìm theo từng tiêu chí. |
| REQ-BENEFICIARY-002 | [x] | /admin/beneficiaries, /api/beneficiaries | Khi thêm/sửa bỏ nhập độ ưu tiên; độ ưu tiên tự tính theo tỉ lệ giảm; cập nhật lại toàn bộ bản ghi. | Form bỏ input `DoUuTien`, thay bằng trạng thái tự động. | `createBeneficiary`, `updateBeneficiary`, `deleteBeneficiary` chạy transaction và recompute `DoUuTien` cho toàn bộ bản ghi chưa xóa theo `TiLeGiamHocPhi` giảm dần. | Không cần migration. | `node --check`; tạo/sửa tỉ lệ giảm và kiểm tra bảng sắp xếp/độ ưu tiên cập nhật lại. |
| REQ-BENEFICIARY-003 | [x] | /admin/beneficiaries | Mã đối tượng khi sửa phải tô xám vì không được sửa mã; click vùng tô xám hiện thông báo. | `MaDoiTuong` dùng `readonly`, class readonly và `data-readonly-message`; click field hiện toast qua `AdminUI`. | `updateBeneficiary` chặn request cố đổi `MaDoiTuong`. | Không cần migration. | Mở modal sửa, click mã đối tượng thấy thông báo; gửi API đổi mã bị trả lỗi. |

## 16. Trang báo cáo thống kê

File đã sửa trong nhóm: `src/controllers/viewController.js`; `src/routes/viewRoutes.js`; `src/views/pages/admin/reports.pug`; `src/views/pages/admin/reports-incomplete-tuition.pug`; `src/views/partials/sidebar-admin.pug`; `src/public/js/admin/reports.js`; `src/utils/permissionCatalog.js`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-REPORT-001 | [x] | /admin/reports, /admin/reports/incomplete-tuition | Tách phần “Sinh viên chưa hoàn thành học phí” thành một mục riêng trên sidebar thuộc khung báo cáo. | Sidebar khung Báo cáo có mục `Chưa hoàn thành học phí`; trang thống kê chính chỉ còn link điều hướng; trang mới chứa filter, tổng quan, bảng, export Excel/PDF. | Thêm route view `/admin/reports/incomplete-tuition`, render cùng dữ liệu học kỳ/khoa/ngành; quyền `ADMIN_REPORTS` nhận path mới. | Không cần migration. | Pug compile; mở hai route, kiểm tra sidebar active và bảng nợ tải riêng. |
| REQ-REPORT-002 | [x] | /admin/reports, /admin/reports/incomplete-tuition | Hiệu chỉnh giao diện thân thiện với người dùng. | Trang nợ có toolbar/filter/action riêng; `reports.js` có guard để mỗi trang chỉ gọi phần dữ liệu có DOM tương ứng. | Không cần API mới; dùng lại `/api/dashboard/incomplete-tuition`. | Không cần migration. | `node --check`; Pug compile; đổi học kỳ/filter trên từng trang không lỗi DOM thiếu. |

Ghi chú kiểm tra Cụm 9: `node --check`, Pug compile và `npx prisma validate` đã pass. `npm test` vẫn fail do script placeholder `Error: no test specified`; `npm run lint` và `npm run build` chưa có trong `package.json`.

## 27. Trang quản lý thông báo

File đã sửa trong nhóm: `src/config/init.sql`; `src/config/database.js`; `src/utils/notificationEvents.js`; `src/controllers/notificationController.js`; `src/controllers/registrationController.js`; `src/controllers/paymentController.js`; `src/controllers/viewController.js`; `src/views/pages/admin/notifications.pug`; `src/public/js/admin/notifications.js`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-NOTIFICATION-001 | [x] | /admin/notifications | Seed thông báo có vấn đề; chỉ nên seed thông báo về hạn thu học phí, hạn đăng ký học phần, hạn tương tự; thông báo khi thanh toán/đăng ký môn phải là thông báo tự động. | Bảng thông báo hiển thị nguồn thủ công/tự động; form thủ công chỉ chọn nhóm hạn hợp lệ, không cho sửa thông báo tự động. | `registrationController.registerCourse` sinh thông báo đăng ký học phần tự động; `paymentController` sinh thông báo thanh toán thành công/thất bại theo callback hoặc xác nhận admin; `notificationController` chặn sửa loại `auto_*`. | `init.sql` bỏ seed thông báo đăng ký/thanh toán thành công, chỉ seed hạn đăng ký, hạn cứu xét, hạn thu học phí, hạn bảo trì; `database.js` cho phép thông báo broadcast không có `MaTaiKhoanNhan`. | Kiểm tra seed `THONGBAO` không còn bản ghi thành công theo sự kiện; đăng ký môn sinh `auto_dang_ky_mon`; thanh toán/xác nhận/thất bại sinh `auto_thanh_toan_hoc_phi`; thông báo tự động không sửa thủ công. |
| REQ-NOTIFICATION-002 | [x] | /admin/notifications | Hiệu chỉnh giao diện thân thiện sau thao tác trên. | Thêm filter nguồn, cột nguồn, cột hết hạn, badge loại/nguồn; vô hiệu nút sửa với thông báo tự động; preview hiển thị nhóm hạn. | `viewController.adminNotifications` hỗ trợ lọc `Nguon=manual/auto`. | Không cần migration ngoài seed/bootstrap trên. | Mở `/admin/notifications`, lọc theo nguồn/loại, tạo thông báo hạn thủ công, xem bảng không nhầm thông báo tự động. |

## 28. Trang tham số hệ thống

File đã sửa trong nhóm: `src/controllers/settingsController.js`; `src/controllers/paymentController.js`; `src/controllers/registrationController.js`; `src/controllers/viewController.js`; `src/views/pages/admin/settings.pug`; `src/public/js/admin/settings.js`; `src/public/css/theme.css`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-SETTING-001 | [x] | /admin/settings | Khi thay đổi các trường dữ liệu trong trang tham số hệ thống thì các trường ràng buộc cũng phải thay đổi theo. | Trang settings hiển thị bảng ràng buộc đang dùng từng tham số; validate frontend đồng nhất backend. | `settingsController` trả metadata tác động, validate số nguyên và mã môn Anh văn tồn tại; `registrationController` dùng `SoTinChiDangKyToiDa`, `SoTinChiDangKyToiDaKhiVuot`, `DanhSachMonAnhVanBatBuoc`, `NamKiemTraAnhVan`, `GioiHanTinChiChuaDatAnhVan`; `paymentController` dùng `SoTinChiDangKyToiThieu`; `curriculumService` đang dùng `GioiHanTinChiNoKhoaLuan`. | Không thêm tham số hạn đăng ký/hạn đóng học phí vì code xác định các hạn này thuộc `HOCKY`, không thuộc `THAMSO`; không cần migration. | Đổi từng tham số và kiểm tra: trần tín chỉ đăng ký thay đổi ngay, giới hạn cứng khi vượt được chặn, danh sách/mốc Anh văn đổi giới hạn, thanh toán chặn phiếu dưới tín chỉ tối thiểu, điều kiện khóa luận đọc giới hạn nợ mới. |

## 29. Trang quản lý năm học

File đã sửa/kiểm tra trong nhóm: `prisma/schema.prisma`; `src/config/init.sql`; `src/config/database.js`; `src/controllers/viewController.js`; `src/controllers/semesterController.js`; `src/views/pages/admin/academic-years.pug`; `src/public/js/admin/academic-years.js`; `src/public/js/main.js`; `src/public/css/theme.css`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-ACADEMICYEAR-001 | [x] | /admin/academic-years | Thêm select cạnh trái ô tìm kiếm để tìm kiếm theo mã hoặc theo tên năm học. | `academic-years.pug` có `#year-search-field`; `academic-years.js` gửi `searchField` khi lọc. | `viewController.adminAcademicYears` và `semesterController.getAcademicYears` lọc theo `MaNamHoc` hoặc `TenNamHoc`. | Không cần DB mới. | Chọn từng tiêu chí, nhập từ khóa, kiểm tra URL/API có `searchField`; `node --check`; Pug compile. |
| REQ-ACADEMICYEAR-002 | [x] | /admin/academic-years | Xóa cột học kỳ. | Bảng `academic-years.pug` không còn cột học kỳ/`SoHocKy`; colspan đã cập nhật. | `viewController.adminAcademicYears` không còn include `_count.HOCKY` cho bảng này. | Không cần DB mới. | Compile Pug và rà bảng chỉ còn các cột năm học/trạng thái/audit/thao tác. |
| REQ-ACADEMICYEAR-003 | [x] | /admin/academic-years | Khi sửa năm học, các trường không được phép sửa phải bôi xám và hiện thông báo khi click. | `#year-ma` có `data-readonly-message`; `academic-years.js` set `readOnly` và dùng `AdminUI.markReadonlyFields`; `main.js` khởi tạo `AdminUI.initReadonlyNotices`. | `semesterController.updateAcademicYear` cập nhật theo `req.params.id`, không nhận đổi `MaNamHoc`. | Không cần DB mới. | Mở sửa, mã năm học tô xám; click mã hiện toast; gửi PUT kèm mã khác không đổi khóa chính. |
| REQ-ACADEMICYEAR-004 | [x] | /admin/academic-years | Click vào dòng bản ghi thì popup/modal chi tiết chỉ xem. | `academic-years.pug` gắn `data-record`; `academic-years.js` dùng `AdminUI.attachRowDetailHandlers`. | Dữ liệu list có đủ trường để dựng chi tiết. | Không cần DB mới. | Click dòng ngoài nút thao tác, modal chi tiết mở đúng; nút sửa/xóa không kích hoạt detail. |
| REQ-ACADEMICYEAR-005 | [x] | /admin/academic-years | Bổ sung cột sửa bởi ai, sửa vào thời điểm đầy đủ giờ phút giây, ngày tháng năm. | Bảng và detail hiển thị `NguoiCapNhatTen`/`NguoiCapNhat`, `NgayCapNhat` với giây. | `semesterController` ghi `updateAudit(req)` khi tạo/sửa năm học; `viewController`/API attach tên người cập nhật. | `NAMHOC` có `NguoiCapNhat`, `NgayCapNhat` trong Prisma schema, `init.sql`, bootstrap `database.js`. | `npx prisma validate`; sửa năm học rồi kiểm tra cột người sửa/thời điểm sửa định dạng đủ giây. |
| REQ-ACADEMICYEAR-006 | [x] | /admin/academic-years | Hiệu chỉnh giao diện thân thiện với người dùng sau các thao tác trên. | Toolbar search/filter, bảng audit, modal form và detail modal dùng style admin chung. | Không thêm API ngoài các endpoint năm học hiện có. | Không cần DB mới ngoài audit ở REQ-ACADEMICYEAR-005. | Pug compile, JS syntax, rà tương tác search/filter/modal. |

## 30. Trang quản lý khoa

File đã sửa/kiểm tra trong nhóm: `src/controllers/viewController.js`; `src/controllers/facultyController.js`; `src/views/pages/admin/faculties.pug`; `src/public/js/admin/faculties.js`; `src/public/js/main.js`; `src/public/css/theme.css`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-FACULTY-001 | [x] | /admin/faculties | Thêm select bên trái ô tìm kiếm để tìm kiếm theo mã khoa, tên khoa, hay tên viết tắt. | `faculties.pug` có `#faculty-search-field`; `faculties.js` gửi `searchField`. | `viewController.adminFaculties` và `facultyController.getAllFaculties` lọc theo `MaKhoa`, `TenKhoa`, `TenVietTat`. | Không cần DB mới. | Chọn từng tiêu chí search; `node --check`; Pug compile. |
| REQ-FACULTY-002 | [x] | /admin/faculties | Khi sửa khoa, trường không được phép sửa phải bôi xám và hiện thông báo khi click. | `#fac-ma` có `data-readonly-message`; JS set `readOnly` khi edit và dùng `AdminUI.markReadonlyFields`; readonly notice global trong `main.js`. | `facultyController.updateFaculty` cập nhật theo `req.params.id`, không nhận đổi `MaKhoa`. | Không cần DB mới. | Mở sửa khoa, click mã khoa có toast; PUT không thể đổi khóa chính. |
| REQ-FACULTY-003 | [x] | /admin/faculties | Click vào dòng bản ghi thì popup/modal chi tiết chỉ xem. | `faculties.pug` gắn `data-record`; `faculties.js` dùng `AdminUI.attachRowDetailHandlers`. | List trả đủ dữ liệu và `_count` để hiển thị detail. | Không cần DB mới. | Click dòng mở detail; click sửa/xóa không mở detail. |
| REQ-FACULTY-004 | [x] | /admin/faculties | Hiệu chỉnh giao diện thân thiện với người dùng sau các thao tác trên. | Toolbar search theo tiêu chí, bảng audit, modal form/detail dùng style admin chung. | Không thêm API ngoài API khoa hiện có. | Không cần DB mới. | Pug compile, JS syntax, rà thao tác thêm/sửa/search/detail. |

## 31. Trang quản lý ngành học

File đã sửa/kiểm tra trong nhóm: `src/controllers/viewController.js`; `src/controllers/majorController.js`; `src/views/pages/admin/majors.pug`; `src/public/js/admin/majors.js`; `src/public/js/main.js`; `src/public/css/theme.css`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-MAJOR-001 | [x] | /admin/majors | Thêm select bên trái ô tìm kiếm để tìm kiếm theo mã ngành, tên ngành, hay tên khoa. | `majors.pug` có `#major-search-field`; `majors.js` gửi `searchField`. | `viewController.adminMajors` và `majorController.getAllMajors` lọc theo `MaNganh`, `TenNganh`, relation `KHOA.TenKhoa`. | Không cần DB mới. | Chọn từng tiêu chí search; kiểm tra query theo tên khoa; `node --check`; Pug compile. |
| REQ-MAJOR-002 | [x] | /admin/majors | Khi sửa ngành, trường không được phép sửa phải bôi xám và hiện thông báo khi click. | `#maj-ma` có `data-readonly-message`; JS set `readOnly` khi edit và dùng readonly style/toast chung. | `majorController.updateMajor` cập nhật theo `req.params.id`, không nhận đổi `MaNganh`. | Không cần DB mới. | Mở sửa ngành, click mã ngành có toast; PUT không thể đổi khóa chính. |
| REQ-MAJOR-003 | [x] | /admin/majors | Nút CTDT Chương trình đào tạo khi nhấn vào chưa hiện đúng chương trình đào tạo. | Nút CTDT truyền `data-major-id`/`data-major-name`; `selectCurriculumMajor` chọn đúng ngành, cập nhật tiêu đề và gọi `loadCurriculum()`. | `majorController.getCurriculum` nhận `MaNganh` và trả chương trình theo ngành; route `/api/majors/curriculum/items`. | Không cần DB mới. | Bấm CTDT ở từng ngành, kiểm tra `#curriculum-major` đổi đúng và bảng CTDT tải đúng môn của ngành. |
| REQ-MAJOR-004 | [x] | /admin/majors | Click vào dòng bản ghi thì popup/modal chi tiết chỉ xem. | `majors.pug` gắn `data-record`; `majors.js` dùng `AdminUI.attachRowDetailHandlers`. | List include `KHOA` và `_count.SINHVIEN` để hiển thị detail. | Không cần DB mới. | Click dòng mở detail; click CTDT/sửa/xóa không mở detail. |
| REQ-MAJOR-005 | [x] | /admin/majors | Hiệu chỉnh giao diện thân thiện với người dùng sau các thao tác trên. | Toolbar search/filter khoa, bảng audit, khối CTDT, modal form/detail dùng style admin chung. | Không thêm API ngoài API ngành/CTDT hiện có. | Không cần DB mới. | Pug compile, JS syntax, rà search/filter/modal/CTDT. |

## 32. Trang quản lý tiết học

File đã sửa/kiểm tra trong nhóm: `src/controllers/viewController.js`; `src/controllers/periodController.js`; `src/views/pages/admin/periods.pug`; `src/public/js/admin/periods.js`; `src/public/js/main.js`; `src/public/css/theme.css`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-PERIOD-001 | [x] | /admin/periods | Có select bên trái ô tìm kiếm để tìm kiếm theo mã tiết hoặc tên tiết. | `periods.pug` có `#period-search-field`; `periods.js` gửi `searchField`. | `viewController.adminPeriods` và `periodController.getPeriods` lọc theo `MaTiet`, `TenTiet`. | Không cần DB mới. | Chọn mã tiết/tên tiết, nhập từ khóa, kiểm tra query; `node --check`; Pug compile. |
| REQ-PERIOD-002 | [x] | /admin/periods | Khi sửa tiết học, các trường không được phép sửa phải bôi xám và hiện thông báo khi click. | `#period-ma` có `data-readonly-message`; JS set `readOnly` khi edit và dùng readonly style/toast chung. | `periodController.updatePeriod` xóa `data.MaTiet`, cập nhật theo `req.params.id`. | Không cần DB mới. | Mở sửa tiết học, click mã tiết có toast; PUT không thể đổi `MaTiet`. |
| REQ-PERIOD-003 | [x] | /admin/periods | Click vào dòng bản ghi thì popup/modal chi tiết chỉ xem. | `periods.pug` gắn `data-record`; `periods.js` dùng `AdminUI.attachRowDetailHandlers`. | List trả giờ bắt đầu/kết thúc dạng text để hiển thị detail. | Không cần DB mới. | Click dòng mở detail; click sửa/xóa không mở detail. |
| REQ-PERIOD-004 | [x] | /admin/periods | Hiệu chỉnh giao diện thân thiện với người dùng sau các thao tác trên. | Toolbar search, bảng, modal form/detail dùng style admin chung. | Không thêm API ngoài API tiết học hiện có. | Không cần DB mới. | Pug compile, JS syntax, rà thao tác search/detail/sửa. |

## 33. Ghi chú yêu cầu bị lặp tên "Trang Quản lý tiết học"

Giả định: block yêu cầu "Thiếu filter theo trạng thái chốt đăng ký, theo trạng thái mở thu" không thuộc `TIETHOC` mà thuộc học kỳ/đợt đăng ký. Code xử lý đúng ở `/admin/semesters` vì dữ liệu nằm trên `HOCKY.NgayChotDangKy`, `HOCKY.MoThuHocPhi`, `HOCKY.NgayMoThuHocPhi` và hạn học phí.

File đã sửa/kiểm tra trong nhóm: `src/views/pages/admin/semesters.pug`; `src/public/js/admin/semesters.js`; `src/controllers/semesterController.js`.

| Mã | Trạng thái | Trang/module liên quan | Nội dung yêu cầu gốc | Frontend cần kiểm tra/sửa | Backend/API cần kiểm tra/sửa | Database/migration/seed liên quan | Cách kiểm thử |
|---|---|---|---|---|---|---|---|
| REQ-SEMESTER-REGSTATUS-001 | [x] | /admin/semesters | Thiếu filter theo trạng thái chốt đăng ký, theo trạng thái mở thu. | `semesters.pug` thêm select `#semester-registration-finalized`, `#semester-tuition-open`; `semesters.js` gửi query. | `semesterController.buildSemesterWhere` lọc `NgayChotDangKy` null/not null và `MoThuHocPhi` true/false. | Không cần DB mới vì cột đã tồn tại trên `HOCKY`. | Chọn từng filter, kiểm tra API `/api/semesters` trả đúng nhóm đã chốt/chưa chốt và mở thu/chưa mở thu; `node --check`; Pug compile. |
| REQ-SEMESTER-REGSTATUS-002 | [x] | /admin/semesters | Click vào dòng bản ghi thì popup/modal chi tiết có bản ghi đó. | `semesters.js` gắn `AdminUI.attachRowDetailHandlers` cho `.semester-list-row[data-record-index]`, detail chỉ xem. | API list học kỳ đã trả đủ dữ liệu detail. | Không cần DB mới. | Click dòng học kỳ ngoài nút thao tác, modal chi tiết mở đúng; click sửa/xóa không mở detail. |
| REQ-SEMESTER-REGSTATUS-003 | [x] | /admin/semesters | Hiệu chỉnh giao diện thân thiện với người dùng sau các thao tác trên. | Filter mới nằm trong filter panel hiện có, dùng badge/detail modal style admin chung. | Không thêm endpoint mới. | Không cần DB mới. | Pug compile, JS syntax, rà filter/reset/detail. |