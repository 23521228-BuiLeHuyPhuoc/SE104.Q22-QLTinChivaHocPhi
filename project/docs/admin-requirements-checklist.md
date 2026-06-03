# Admin Requirements Checklist

Nguồn yêu cầu: `docs/admin-requirements-full.md`.

Quy ước trạng thái: [ ] chưa làm, [~] đang làm, [x] đã sửa code và đã kiểm tra. Lượt cập nhật này chỉ xử lý hai nhóm `/admin/rooms` và `/admin/lecturers` theo yêu cầu.

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
