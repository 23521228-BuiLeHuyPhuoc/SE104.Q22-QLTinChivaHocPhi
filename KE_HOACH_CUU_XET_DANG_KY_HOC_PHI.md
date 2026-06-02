# Kế Hoạch Cứu Xét Đăng Ký Học Phần Và Thu Học Phí

## Tóm Tắt

- Project hiện là Node.js/Express + Pug SSR + Prisma/PostgreSQL, đã có các module học kỳ, đăng ký học phần, chốt đăng ký, học phí, phiếu thu và thanh toán sandbox.
- File này chỉ là kế hoạch triển khai, chưa thực hiện sửa code nghiệp vụ.
- Quy trình cần mở rộng là: đăng ký thường -> cứu xét theo học kỳ -> admin chốt đăng ký -> admin mở thu học phí -> admin tạo phiếu thu -> sinh viên thanh toán đúng đủ số tiền.
- Các quyết định đã chốt: hạn cứu xét cấu hình theo từng học kỳ; mỗi đơn cứu xét chỉ có một hành động; admin tạo phiếu thu lẻ và tạo hàng loạt.
- Nguyên tắc triển khai: mỗi bước làm xong phải test ngay bước đó, không gom test đến cuối.

## 1. Hiện Trạng Project

Project hiện có các bảng và module liên quan: `HOCKY`, `LOPMO`, `PHIEUDANGKY`, `CHITIETDANGKY`, `PHIEUTHUHOCPHI`, cùng các controller `semesterController`, `registrationController`, `tuitionController`, `paymentController` và các giao diện admin/sinh viên tương ứng.

Các phần đã có:

- Sinh viên đăng ký/hủy học phần trong hạn đăng ký.
- Admin chốt đăng ký và hệ thống đã có một phần logic đóng lớp dưới 75% sức chứa.
- Hệ thống đã tính lại học phí theo các chi tiết đăng ký còn hiệu lực.
- Đã có phiếu thu, thanh toán tiền mặt/chuyển khoản/QR/VNPAY/ZaloPay sandbox ở mức nền tảng.

Các phần còn thiếu hoặc chưa đúng yêu cầu:

- Chưa có bảng và luồng xử lý đơn cứu xét đăng ký.
- Chưa có hạn cứu xét riêng theo học kỳ.
- Chưa có trạng thái admin mở/khóa thu học phí riêng.
- Phiếu thu hiện có thể được tạo ở trạng thái thành công ngay, chưa đúng yêu cầu mặc định là `Chưa thanh toán`.
- Sinh viên hiện còn có thể checkout từ màn học phí và nhập số tiền; yêu cầu mới là chỉ thanh toán khi admin đã tạo phiếu thu và phải đóng đúng đủ số tiền.
- Trigger DB đang chặn đăng ký/hủy ngoài hạn đăng ký, cần mở ngoại lệ có kiểm soát cho admin duyệt cứu xét và admin chốt đăng ký.

## 2. Quy Trình Nghiệp Vụ Mục Tiêu

1. Admin cấu hình học kỳ, hạn đăng ký và hạn cứu xét.
2. Trong hạn đăng ký, sinh viên được đăng ký/hủy học phần trực tiếp.
3. Hết hạn đăng ký, sinh viên không được sửa đăng ký trực tiếp; nếu muốn thêm/hủy/đổi môn thì gửi đơn cứu xét.
4. Mỗi đơn cứu xét chỉ tác động một môn: `them` là thêm một lớp, `huy` là hủy một lớp đã đăng ký, `doi` là hủy lớp cũ và thêm lớp mới trong cùng transaction.
5. Admin duyệt đơn thì hệ thống kiểm tra lại điều kiện đăng ký, thực thi thay đổi và tính lại học phí.
6. Admin từ chối đơn thì lưu lý do từ chối, không thay đổi đăng ký/học phí.
7. Hết hạn cứu xét và không còn đơn `cho_duyet` thì admin mới được chốt đăng ký.
8. Khi chốt, lớp có số lượng đăng ký `< 75% SoLuongToiDa` bị đóng: `LOPMO.TrangThai = false`, các lịch học liên quan bị tắt, đăng ký của sinh viên trong lớp đó bị hủy với lý do `Hủy do không đủ sinh viên đăng ký`, và học phí được tính lại.
9. Sinh viên không được đóng học phí từ lúc mở đăng ký đến trước khi admin mở thu học phí.
10. Admin chỉ được mở thu học phí sau khi hết cứu xét, hết đơn chờ duyệt và đã chốt đăng ký.
11. Admin tạo phiếu thu lẻ hoặc hàng loạt. Phiếu thu ban đầu là `Chưa thanh toán`.
12. Sinh viên chỉ thấy nút thanh toán khi đã có phiếu thu admin tạo.
13. Sinh viên phải thanh toán đúng toàn bộ số tiền của phiếu thu, không có đóng thiếu/đóng một phần.
14. Tiền mặt: sinh viên gửi yêu cầu, admin xác nhận thì `Thành công`, admin từ chối thì `Thất bại`.
15. Chuyển khoản/QR/VNPAY/ZaloPay sandbox: hiển thị đúng số tiền; kết quả thành công/thất bại cập nhật trạng thái phiếu thu tự động.
16. Nợ học phí chỉ tồn tại khi sinh viên có học lại hoặc học cải thiện; hạn đóng nhóm này = `HanDongHocPhi + 2 tháng`.

## 3. Database Và Schema Cần Sửa

Cần cập nhật đồng bộ `project/prisma/schema.prisma`, `project/src/config/init.sql`, và `project/src/config/database.js` vì project đang bootstrap schema bằng `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

- Mở rộng `HOCKY`: thêm `NgayBatDauCuuXet`, `NgayKetThucCuuXet`, `NgayChotDangKy`, `MoThuHocPhi`, `NgayMoThuHocPhi`.
- Tạo bảng `DONCUUXETDANGKY`: `id`, `MaSv`, `MaHocKy`, `SoPhieu`, `LoaiYeuCau`, `ChiTietHuyId`, `MaLopMuonThem`, `MaMonHocMuonThem`, `LyDoSinhVien`, `TrangThai`, `LyDoTuChoi`, `GhiChuAdmin`, `NguoiDuyet`, `NgayDuyet`, `NgayTao`, `NgayCapNhat`.
- Ràng buộc đơn cứu xét: `LoaiYeuCau IN ('them','huy','doi')`, `TrangThai IN ('cho_duyet','da_duyet','tu_choi','da_huy')`, không tạo đơn `cho_duyet` trùng cùng sinh viên, học kỳ và mục tiêu xử lý.
- Sửa `PHIEUTHUHOCPHI`: trạng thái mặc định `Chưa thanh toán`; cho phép `Chưa thanh toán`, `Chờ xác nhận`, `Thành công`, `Thất bại`, `Đã hủy`. Nếu giữ refund hiện có thì thêm `Hoàn tiền` vào constraint DB.

## 4. Backend Cần Làm

- `registrationWindow.js`: thêm hàm xác định hạn cứu xét, chặn đăng ký trực tiếp ngoài hạn, trả metadata để UI biết khi nào được gửi đơn cứu xét.
- `paymentRules.js`: chặn thanh toán nếu chưa mở thu học phí, chưa chốt đăng ký, còn trong hạn đăng ký/cứu xét, hoặc còn đơn chờ duyệt.
- Tạo `appealController.js` và `appealRoutes.js`, mount `/api/appeals` trong `index.js`.
- API đơn cứu xét: admin list/filter, sinh viên xem đơn của mình, tạo đơn, duyệt, từ chối, hủy đơn chờ duyệt.
- Khi tạo đơn: chỉ cho sinh viên tạo cho chính mình, chỉ trong hạn cứu xét, chỉ một hành động/một môn, không tạo khi học kỳ đã chốt hoặc đã mở thu học phí.
- Khi duyệt đơn: chạy transaction, kiểm tra lại hạn cứu xét, lớp còn chỗ, không trùng lịch, không vượt tín chỉ, đúng học kỳ, chưa chốt, chưa mở thu; sau đó cập nhật đăng ký, số lượng lớp và học phí.
- `registrationController.js`: chỉ cho đăng ký/hủy trực tiếp trong hạn đăng ký; ngoài hạn thì trả thông tin để UI hiển thị nút gửi đơn cứu xét.
- `semesterController.js`: thêm field cứu xét, sửa chốt đăng ký để chặn khi còn đơn chờ duyệt, lưu `NgayChotDangKy`, thêm API mở/khóa thu học phí.
- `paymentController.js`: admin tạo phiếu thu `Chưa thanh toán`, thêm tạo hàng loạt; checkout theo `SoPhieuThu`, không cho client nhập số tiền; tiền mặt chờ admin xác nhận; online/QR/các cổng sandbox cập nhật kết quả.
- `tuitionController.js`: chỉ hiện thanh toán khi học kỳ đã mở thu và đã có phiếu thu; tính hạn học lại/cải thiện cộng thêm 2 tháng.
- Trigger `fn_check_rbtv17_*`: vẫn chặn thao tác trực tiếp ngoài hạn, nhưng cho bypass có kiểm soát bằng `SET LOCAL app.appeal_approval='1'` khi admin duyệt cứu xét và `SET LOCAL app.finalize_registration='1'` khi chốt đăng ký.

## 5. Frontend Cần Làm

- `/admin/semesters`: thêm ngày bắt đầu/kết thúc cứu xét, trạng thái đã chốt, trạng thái mở thu, nút chốt đăng ký, nút mở/khóa thu học phí.
- Thêm `/admin/appeals` hoặc tab trong `/admin/registrations`: lọc đơn, xem chi tiết, duyệt, từ chối kèm lý do.
- `/student/course-registration`: trong hạn đăng ký giữ đăng ký trực tiếp; trong hạn cứu xét hiển thị nút gửi đơn thêm/đổi.
- `/student/my-courses`: trong hạn cứu xét hiển thị nút gửi đơn hủy/đổi thay cho nút bị khóa; thêm danh sách `Đơn cứu xét của tôi`.
- `/admin/payments`: tạo phiếu thu lẻ/hàng loạt, số tiền readonly theo công nợ, trạng thái ban đầu `Chưa thanh toán`, admin xác nhận/từ chối tiền mặt.
- `/student/my-tuition` và `/student/my-payments`: chỉ thanh toán theo phiếu thu admin đã tạo, bỏ input số tiền, hiển thị QR/cổng thanh toán và trạng thái mới.

## 6. API Công Khai / Giao Diện Tích Hợp

- `GET /api/appeals`: admin list/filter đơn cứu xét.
- `GET /api/appeals/student/:studentId`: sinh viên xem đơn của mình.
- `POST /api/appeals`: sinh viên tạo đơn cứu xét.
- `PUT /api/appeals/:id/approve`: admin duyệt và thực thi thay đổi đăng ký.
- `PUT /api/appeals/:id/reject`: admin từ chối kèm lý do.
- `PUT /api/appeals/:id/cancel`: sinh viên hủy đơn khi còn `cho_duyet`.
- `POST /api/semesters/:id/finalize-registration`: thêm kiểm tra hết hạn cứu xét và hết đơn chờ duyệt.
- `POST /api/semesters/:id/open-tuition-payment`: admin mở thu học phí.
- `POST /api/semesters/:id/close-tuition-payment`: admin khóa thu học phí nếu cần quản trị đợt thu.
- `POST /api/payments`: admin tạo phiếu thu `Chưa thanh toán`, không tự thành công.
- `POST /api/payments/bulk`: admin tạo phiếu thu hàng loạt cho học kỳ.
- `POST /api/payments/:id/checkout`: sinh viên thanh toán một phiếu thu đã tồn tại.
- `PUT /api/payments/:id/confirm`: admin xác nhận tiền mặt.
- `PUT /api/payments/:id/cancel` hoặc `PUT /api/payments/:id/fail`: admin từ chối/đánh thất bại phiếu tiền mặt.

## 7. Kế Hoạch Test Chi Tiết

### 7.1. Test đăng ký trong hạn

- Sinh viên đăng ký một lớp còn chỗ trong hạn đăng ký -> thành công.
- Sinh viên hủy một lớp đã đăng ký trong hạn đăng ký -> thành công và học phí giảm đúng.
- Sinh viên đăng ký lớp hết chỗ -> bị chặn.
- Sinh viên đăng ký lớp trùng lịch -> bị chặn.
- Sinh viên đăng ký vượt số tín chỉ tối đa -> bị chặn.
- Sinh viên đăng ký cùng một môn hai lần -> bị chặn.
- Sinh viên đăng ký ngoài `NgayBatDauDangKy`/`NgayKetThucDangKy` -> bị chặn.

### 7.2. Test gửi đơn cứu xét

- Sau hạn đăng ký và trong hạn cứu xét, sinh viên gửi đơn thêm một lớp -> tạo đơn `cho_duyet`.
- Sinh viên gửi đơn hủy một lớp đã đăng ký -> tạo đơn `cho_duyet`.
- Sinh viên gửi đơn đổi một lớp cũ sang lớp mới -> tạo đơn `cho_duyet`.
- Sinh viên gửi đơn ngoài hạn cứu xét -> bị chặn.
- Sinh viên gửi đơn khi học kỳ đã chốt -> bị chặn.
- Sinh viên gửi đơn khi học kỳ đã mở thu học phí -> bị chặn.
- Sinh viên gửi đơn cho sinh viên khác -> bị chặn quyền.
- Sinh viên gửi hai đơn chờ duyệt trùng mục tiêu -> bị chặn.

### 7.3. Test duyệt/từ chối đơn cứu xét

- Admin duyệt đơn thêm -> thêm `CHITIETDANGKY`, tăng `LOPMO.SoLuongDaDangKy`, tính lại học phí.
- Admin duyệt đơn hủy -> chi tiết đăng ký chuyển `Đã hủy`, giảm số lượng lớp, tính lại học phí.
- Admin duyệt đơn đổi -> hủy lớp cũ, thêm lớp mới, cập nhật số lượng cả hai lớp, tính lại học phí.
- Admin duyệt đơn nhưng lớp mới hết chỗ -> bị chặn và rollback.
- Admin duyệt đơn nhưng lớp mới trùng lịch -> bị chặn và rollback.
- Admin từ chối đơn không nhập lý do -> bị chặn.
- Admin từ chối đơn có lý do -> đơn `tu_choi`, đăng ký/học phí không đổi.
- Sinh viên hủy đơn đang `cho_duyet` -> đơn `da_huy`.

### 7.4. Test chốt đăng ký

- Chưa hết hạn cứu xét -> không chốt được.
- Còn đơn `cho_duyet` -> không chốt được.
- Hết hạn cứu xét và hết đơn chờ -> chốt thành công.
- Lớp đạt từ 75% sức chứa trở lên -> vẫn mở.
- Lớp dưới 75% sức chứa -> `LOPMO.TrangThai = false`, lịch học bị tắt.
- Đăng ký thuộc lớp bị đóng -> `CHITIETDANGKY.TrangThai = Đã hủy`, `LyDoHuy = Hủy do không đủ sinh viên đăng ký`.
- Sau khi hủy lớp không đủ số lượng -> `PHIEUDANGKY.TongTienPhaiDong` được tính lại đúng.

### 7.5. Test mở thu học phí và phiếu thu

- Chưa chốt đăng ký -> không mở thu học phí được.
- Chưa hết hạn cứu xét -> không mở thu học phí được.
- Còn đơn chờ duyệt -> không mở thu học phí được.
- Đủ điều kiện -> admin mở thu học phí thành công.
- Chưa mở thu học phí -> mọi checkout bị chặn.
- Admin tạo phiếu thu lẻ -> trạng thái ban đầu `Chưa thanh toán`.
- Admin tạo phiếu thu hàng loạt -> tạo cho sinh viên còn phải đóng, không tạo trùng phiếu đang mở.
- Phiếu thu có số tiền khác số tiền còn phải đóng -> bị chặn.

### 7.6. Test thanh toán

- Sinh viên chưa có phiếu thu -> không thấy nút thanh toán.
- Sinh viên có phiếu thu `Chưa thanh toán` -> thấy nút thanh toán.
- Sinh viên thanh toán thiếu tiền -> API bị chặn.
- Sinh viên thanh toán thừa tiền -> API bị chặn.
- Sinh viên chọn tiền mặt -> phiếu thu chuyển `Chờ xác nhận`.
- Admin xác nhận tiền mặt -> phiếu thu `Thành công`.
- Admin từ chối tiền mặt -> phiếu thu `Thất bại`.
- QR/chuyển khoản sandbox thành công -> phiếu thu `Thành công`.
- QR/chuyển khoản sandbox thất bại -> phiếu thu `Thất bại`.
- VNPAY/ZaloPay callback thành công -> phiếu thu `Thành công`.
- VNPAY/ZaloPay callback thất bại -> phiếu thu `Thất bại`.
- Phiếu thu đã thành công -> không checkout lại được.

### 7.7. Test nợ học phí

- Phiếu chỉ có học mới -> hạn đóng là `HanDongHocPhi`.
- Phiếu có `hoc_lai` -> hạn đóng là `HanDongHocPhi + 2 tháng`.
- Phiếu có `hoc_cai_thien` -> hạn đóng là `HanDongHocPhi + 2 tháng`.
- Phiếu có cả học mới và học lại/cải thiện -> hạn đóng theo nhóm có học lại/cải thiện.
- Không có trạng thái đóng một phần trong luồng mới.

## 8. Lộ Trình Triển Khai Kèm Test Từng Bước

Nguyên tắc của phần này là làm xong bước nào thì test ngay bước đó. Không chuyển sang bước kế tiếp nếu test của bước hiện tại chưa đạt hoặc chưa xác định rõ lỗi nằm ở đâu.

### 8.1. Bước 1: Cập nhật database, Prisma schema và bootstrap schema

Công việc:

- Thêm các cột cứu xét/chốt đăng ký/mở thu học phí vào `HOCKY`.
- Tạo bảng `DONCUUXETDANGKY` với đầy đủ trạng thái, loại yêu cầu và khóa ngoại cần thiết.
- Sửa constraint trạng thái của `PHIEUTHUHOCPHI` để mặc định là `Chưa thanh toán` và hỗ trợ `Chờ xác nhận`, `Thành công`, `Thất bại`, `Đã hủy`.
- Cập nhật đồng bộ `schema.prisma`, `init.sql`, `database.js` để môi trường mới và môi trường đã có database đều chạy được.

Test ngay sau bước 1:

- Khởi động server với database trống -> các bảng/cột mới được tạo đủ.
- Khởi động server với database đã có dữ liệu -> `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` không làm mất dữ liệu cũ.
- Prisma introspection/client nhìn thấy đầy đủ field mới của `HOCKY`, `DONCUUXETDANGKY`, `PHIEUTHUHOCPHI`.
- Insert đơn cứu xét hợp lệ loại `them`, `huy`, `doi` -> thành công.
- Insert đơn cứu xét có `LoaiYeuCau` sai -> bị chặn bởi constraint.
- Insert đơn cứu xét có `TrangThai` sai -> bị chặn bởi constraint.
- Tạo phiếu thu không truyền trạng thái -> mặc định là `Chưa thanh toán`.

### 8.2. Bước 2: Tách rule thời gian đăng ký, cứu xét và thu học phí

Công việc:

- Tạo hoặc mở rộng helper kiểm tra trạng thái học kỳ: trước đăng ký, trong hạn đăng ký, trong hạn cứu xét, sau cứu xét, đã chốt, đã mở thu học phí.
- Tạo helper chặn thanh toán khi chưa đủ điều kiện mở thu học phí.
- Chuẩn hóa response để controller và UI dùng chung thông tin `canRegister`, `canAppeal`, `canPay`.

Test ngay sau bước 2:

- Ngày hiện tại trước `NgayBatDauDangKy` -> không được đăng ký, không được cứu xét, không được thanh toán.
- Ngày hiện tại nằm trong hạn đăng ký -> được đăng ký trực tiếp, không cần gửi đơn cứu xét, không được thanh toán.
- Ngày hiện tại sau hạn đăng ký nhưng trong hạn cứu xét -> không được đăng ký trực tiếp, được gửi đơn cứu xét, không được thanh toán.
- Ngày hiện tại sau hạn cứu xét nhưng chưa chốt -> không được đăng ký, không được cứu xét, không được thanh toán.
- Học kỳ đã chốt nhưng chưa mở thu -> không được đăng ký/cứu xét, vẫn chưa được thanh toán.
- Học kỳ đã chốt và đã mở thu -> được thanh toán nếu có phiếu thu hợp lệ.

### 8.3. Bước 3: Xây dựng backend tạo và xem đơn cứu xét

Công việc:

- Tạo `appealController.js`, `appealRoutes.js` và mount route `/api/appeals`.
- Sinh viên tạo đơn `them`, `huy`, `doi` trong hạn cứu xét.
- Sinh viên xem danh sách đơn của chính mình.
- Admin xem/lọc toàn bộ đơn theo học kỳ, sinh viên, trạng thái, loại yêu cầu.
- Chặn tạo đơn ngoài hạn cứu xét, sai sinh viên, trùng đơn đang chờ, hoặc học kỳ đã chốt/mở thu học phí.

Test ngay sau bước 3:

- Sinh viên tạo đơn thêm một lớp hợp lệ -> trả về đơn `cho_duyet`.
- Sinh viên tạo đơn hủy một lớp đã đăng ký -> trả về đơn `cho_duyet`.
- Sinh viên tạo đơn đổi lớp -> trả về đơn `cho_duyet` có đủ lớp cũ và lớp mới.
- Sinh viên tạo đơn khi chưa tới hạn cứu xét -> bị chặn.
- Sinh viên tạo đơn khi đã hết hạn cứu xét -> bị chặn.
- Sinh viên tạo đơn cho mã sinh viên khác -> bị chặn quyền.
- Sinh viên tạo hai đơn chờ duyệt trùng mục tiêu -> bị chặn.
- Admin lọc đơn theo trạng thái `cho_duyet` -> chỉ trả đúng đơn chờ duyệt.

### 8.4. Bước 4: Xây dựng backend duyệt, từ chối và hủy đơn cứu xét

Công việc:

- Admin duyệt đơn trong transaction.
- Đơn `them`: thêm đúng một lớp/môn cho sinh viên.
- Đơn `huy`: hủy đúng một chi tiết đăng ký.
- Đơn `doi`: hủy một lớp cũ và thêm một lớp mới trong cùng transaction.
- Admin từ chối đơn kèm lý do.
- Sinh viên hủy đơn khi đơn còn `cho_duyet`.

Test ngay sau bước 4:

- Duyệt đơn thêm hợp lệ -> có thêm `CHITIETDANGKY`, số lượng lớp tăng 1, học phí tăng đúng.
- Duyệt đơn hủy hợp lệ -> chi tiết đăng ký chuyển trạng thái hủy, số lượng lớp giảm 1, học phí giảm đúng.
- Duyệt đơn đổi hợp lệ -> lớp cũ bị hủy, lớp mới được thêm, học phí cập nhật đúng trong một transaction.
- Duyệt đơn thêm lớp hết chỗ -> thất bại và không phát sinh chi tiết đăng ký mới.
- Duyệt đơn thêm lớp trùng lịch -> thất bại và dữ liệu không đổi.
- Duyệt đơn làm vượt tín chỉ tối đa -> thất bại và dữ liệu không đổi.
- Từ chối đơn không nhập lý do -> bị chặn.
- Từ chối đơn có lý do -> trạng thái `tu_choi`, đăng ký và học phí không đổi.
- Sinh viên hủy đơn chờ duyệt -> trạng thái `da_huy`.
- Sinh viên hủy đơn đã duyệt/từ chối -> bị chặn.

### 8.5. Bước 5: Cập nhật trigger/ràng buộc DB cho luồng cứu xét và chốt đăng ký

Công việc:

- Giữ trigger chặn sinh viên đăng ký/hủy ngoài hạn đăng ký.
- Cho phép admin duyệt cứu xét bằng cờ transaction nội bộ, ví dụ `SET LOCAL app.appeal_approval='1'`.
- Cho phép admin chốt đăng ký hủy lớp dưới 75% bằng cờ transaction nội bộ, ví dụ `SET LOCAL app.finalize_registration='1'`.

Test ngay sau bước 5:

- Sinh viên/API thường cập nhật đăng ký ngoài hạn đăng ký -> trigger vẫn chặn.
- Transaction admin duyệt cứu xét có set cờ hợp lệ -> trigger cho phép đúng thao tác trong transaction đó.
- Sau khi transaction kết thúc, cờ không còn hiệu lực cho request khác.
- Transaction admin không set cờ -> trigger vẫn chặn ngoài hạn.
- Cờ chốt đăng ký chỉ cho phép hủy do chốt, không cho phép sửa tùy tiện các đăng ký khác.

### 8.6. Bước 6: Cập nhật logic chốt đăng ký

Công việc:

- Chặn chốt khi chưa hết hạn cứu xét.
- Chặn chốt khi còn đơn cứu xét `cho_duyet`.
- Khi chốt, đóng lớp có số lượng đăng ký nhỏ hơn 75% sức chứa.
- Hủy đăng ký của sinh viên thuộc lớp bị đóng với lý do thống nhất.
- Tính lại học phí cho các sinh viên bị ảnh hưởng.
- Lưu `NgayChotDangKy` và trạng thái học kỳ phù hợp.

Test ngay sau bước 6:

- Chốt khi còn trong hạn cứu xét -> bị chặn.
- Chốt khi còn đơn `cho_duyet` -> bị chặn.
- Chốt khi hết hạn cứu xét và không còn đơn chờ -> thành công.
- Lớp có đúng 75% sức chứa -> vẫn mở.
- Lớp có dưới 75% sức chứa -> chuyển `LOPMO.TrangThai = false`.
- Lịch học của lớp bị đóng -> bị tắt đúng.
- Đăng ký của sinh viên trong lớp bị đóng -> bị hủy với lý do `Hủy do không đủ sinh viên đăng ký`.
- Học phí sau chốt -> loại bỏ tiền của lớp bị hủy và giữ nguyên các lớp vẫn mở.

### 8.7. Bước 7: Xây dựng logic mở/khóa thu học phí

Công việc:

- Thêm API admin mở thu học phí cho học kỳ.
- Chỉ cho mở thu khi đã hết hạn cứu xét, không còn đơn chờ duyệt và đã chốt đăng ký.
- Cho phép khóa thu học phí nếu cần quản trị đợt thu.
- Tất cả API checkout phải kiểm tra `MoThuHocPhi` trước khi xử lý.

Test ngay sau bước 7:

- Mở thu khi chưa chốt đăng ký -> bị chặn.
- Mở thu khi còn đơn cứu xét chờ duyệt -> bị chặn.
- Mở thu khi chưa hết hạn cứu xét -> bị chặn.
- Mở thu khi đủ điều kiện -> `MoThuHocPhi = true`, có `NgayMoThuHocPhi`.
- Khóa thu học phí -> checkout mới bị chặn.
- Sinh viên gọi checkout trước khi mở thu -> bị chặn ở backend dù UI có lỗi hiển thị.

### 8.8. Bước 8: Cập nhật phiếu thu và thanh toán backend

Công việc:

- Admin tạo phiếu thu lẻ cho sinh viên/học kỳ.
- Admin tạo phiếu thu hàng loạt cho sinh viên còn phải đóng.
- Phiếu thu mới luôn ở trạng thái `Chưa thanh toán`.
- Sinh viên checkout theo phiếu thu có sẵn, không gửi số tiền tùy ý.
- Thanh toán tiền mặt chuyển sang `Chờ xác nhận` để admin xác nhận hoặc từ chối.
- QR/chuyển khoản/VNPAY/ZaloPay sandbox cập nhật `Thành công` hoặc `Thất bại` qua kết quả mô phỏng/callback.

Test ngay sau bước 8:

- Admin tạo phiếu thu lẻ đúng công nợ -> tạo thành công, trạng thái `Chưa thanh toán`.
- Admin tạo phiếu thu lẻ sai số tiền -> bị chặn.
- Admin tạo phiếu thu hàng loạt -> chỉ tạo cho sinh viên còn phải đóng.
- Tạo hàng loạt lần hai -> không tạo trùng phiếu đang mở.
- Sinh viên checkout phiếu không thuộc về mình -> bị chặn quyền.
- Sinh viên checkout phiếu đã `Thành công` -> bị chặn.
- Sinh viên cố gửi số tiền thiếu/thừa qua API -> bị bỏ qua hoặc bị chặn, backend vẫn lấy số tiền từ phiếu thu.
- Chọn tiền mặt -> phiếu chuyển `Chờ xác nhận`.
- Admin xác nhận tiền mặt -> phiếu chuyển `Thành công`.
- Admin từ chối tiền mặt -> phiếu chuyển `Thất bại`.
- Callback sandbox thành công -> phiếu chuyển `Thành công` đúng số tiền.
- Callback sandbox thất bại -> phiếu chuyển `Thất bại`.

### 8.9. Bước 9: Cập nhật logic nợ học phí học lại/học cải thiện

Công việc:

- Xác định môn học lại/học cải thiện từ dữ liệu đăng ký hiện có.
- Nếu phiếu có học lại hoặc học cải thiện, hạn đóng thực tế = `HanDongHocPhi + 2 tháng`.
- Không tạo cơ chế nợ cho học phần mới bình thường.
- Không hỗ trợ đóng một phần trong mọi trường hợp.

Test ngay sau bước 9:

- Sinh viên chỉ có môn học mới -> hạn đóng giữ nguyên theo học kỳ.
- Sinh viên có môn học lại -> hạn đóng cộng thêm 2 tháng.
- Sinh viên có môn học cải thiện -> hạn đóng cộng thêm 2 tháng.
- Sinh viên có cả học mới và học lại/cải thiện -> phiếu áp dụng hạn cộng thêm 2 tháng.
- Sinh viên cố đóng một phần học phí -> bị chặn.
- Báo cáo công nợ không ghi nợ cho học mới quá hạn nếu không thuộc học lại/cải thiện theo quy định mới.

### 8.10. Bước 10: Cập nhật UI admin

Công việc:

- Màn học kỳ cho nhập ngày bắt đầu/kết thúc cứu xét, hiển thị trạng thái chốt và trạng thái mở thu học phí.
- Màn đơn cứu xét cho admin lọc, xem chi tiết, duyệt, từ chối.
- Màn đăng ký/học kỳ có nút chốt đăng ký chỉ bật khi đủ điều kiện.
- Màn thanh toán cho admin tạo phiếu thu lẻ/hàng loạt, xác nhận/từ chối tiền mặt.

Test ngay sau bước 10:

- Admin tạo/sửa học kỳ với hạn cứu xét hợp lệ -> lưu và hiển thị đúng.
- Admin nhập hạn cứu xét sai thứ tự ngày -> UI/backend báo lỗi rõ.
- Nút chốt đăng ký bị disable khi còn đơn chờ hoặc chưa hết hạn cứu xét.
- Nút chốt đăng ký bật khi đủ điều kiện.
- Danh sách đơn cứu xét lọc đúng theo học kỳ, trạng thái, sinh viên.
- Admin duyệt đơn từ UI -> trạng thái đơn và dữ liệu đăng ký cập nhật đúng.
- Admin từ chối đơn từ UI -> bắt buộc nhập lý do và sinh viên xem được lý do.
- Admin tạo phiếu thu lẻ từ UI -> sinh viên nhìn thấy phiếu.
- Admin tạo phiếu thu hàng loạt từ UI -> số lượng phiếu tạo đúng và không trùng.
- Admin xác nhận/từ chối tiền mặt từ UI -> trạng thái phiếu đổi đúng.

### 8.11. Bước 11: Cập nhật UI sinh viên

Công việc:

- Màn đăng ký học phần chỉ cho đăng ký trực tiếp trong hạn đăng ký.
- Trong hạn cứu xét, hiển thị hành động gửi đơn thêm/đổi thay cho đăng ký trực tiếp.
- Màn học phần của tôi hiển thị hành động gửi đơn hủy/đổi trong hạn cứu xét.
- Màn đơn cứu xét của tôi hiển thị trạng thái và lý do từ chối.
- Màn học phí chỉ hiện nút thanh toán khi admin đã tạo phiếu thu và đã mở thu học phí.
- Bỏ input nhập số tiền thanh toán thủ công.

Test ngay sau bước 11:

- Trong hạn đăng ký, sinh viên thấy nút đăng ký/hủy trực tiếp và thao tác thành công.
- Sau hạn đăng ký nhưng trong hạn cứu xét, nút đăng ký trực tiếp không còn; nút gửi đơn cứu xét xuất hiện.
- Sinh viên gửi đơn thêm từ UI -> đơn xuất hiện trong danh sách `Đơn cứu xét của tôi`.
- Sinh viên gửi đơn hủy từ UI -> đơn xuất hiện đúng môn cần hủy.
- Sinh viên gửi đơn đổi từ UI -> đơn có đủ môn/lớp cũ và mới.
- Đơn bị admin từ chối -> sinh viên thấy trạng thái và lý do từ chối.
- Chưa có phiếu thu -> sinh viên không thấy nút thanh toán.
- Có phiếu thu nhưng chưa mở thu học phí -> sinh viên vẫn không thanh toán được.
- Có phiếu thu và đã mở thu -> sinh viên thấy nút thanh toán.
- Màn thanh toán không còn ô nhập số tiền thủ công.

### 8.12. Bước 12: Test tích hợp toàn luồng trước khi bàn giao

Công việc:

- Chạy lại toàn bộ flow từ cấu hình học kỳ đến thu học phí.
- Kiểm tra dữ liệu trên cả DB, API và UI.
- Ghi lại các case đạt/chưa đạt để sửa trước khi bàn giao.

Test ngay sau bước 12:

- Admin tạo học kỳ có hạn đăng ký và hạn cứu xét.
- Sinh viên đăng ký học phần trong hạn đăng ký.
- Hết hạn đăng ký, sinh viên gửi đơn thêm/hủy/đổi trong hạn cứu xét.
- Admin duyệt một đơn và từ chối một đơn.
- Hết hạn cứu xét, admin chốt đăng ký.
- Lớp dưới 75% bị đóng và học phí sinh viên được tính lại.
- Admin mở thu học phí.
- Admin tạo phiếu thu lẻ cho một sinh viên và tạo hàng loạt cho các sinh viên còn lại.
- Sinh viên thanh toán tiền mặt, admin xác nhận thành công.
- Sinh viên thanh toán QR/chuyển khoản sandbox thành công.
- Một giao dịch sandbox thất bại -> phiếu thu chuyển `Thất bại`.
- Báo cáo học phí/công nợ sau toàn luồng khớp với dữ liệu đăng ký cuối cùng.

## 9. File Dự Kiến Cần Sửa/Thêm Khi Được Phép Triển Khai

- `project/prisma/schema.prisma`
- `project/src/config/init.sql`
- `project/src/config/database.js`
- `project/src/utils/registrationWindow.js`
- `project/src/utils/paymentRules.js`
- `project/src/controllers/appealController.js`
- `project/src/routes/appealRoutes.js`
- `project/src/controllers/registrationController.js`
- `project/src/controllers/semesterController.js`
- `project/src/controllers/tuitionController.js`
- `project/src/controllers/paymentController.js`
- `project/src/routes/semesterRoutes.js`
- `project/src/routes/paymentRoutes.js`
- `project/src/index.js`
- `project/src/controllers/viewController.js`
- `project/src/routes/viewRoutes.js`
- `project/src/views/partials/sidebar-admin.pug`
- Các view/script admin liên quan đến học kỳ, đăng ký/cứu xét và thanh toán.
- Các view/script sinh viên liên quan đến đăng ký học phần, học phần của tôi, học phí và phiếu thu.

## 10. Quy Ước Đã Chốt

- Hạn cứu xét được cấu hình theo từng học kỳ, không dùng cấu hình toàn hệ thống.
- Mỗi đơn cứu xét chỉ xử lý một hành động trên một môn/lớp.
- Loại `doi` được hiểu là hủy một lớp cũ và thêm một lớp mới trong cùng transaction.
- Admin có thể tạo phiếu thu lẻ và tạo phiếu thu hàng loạt.
- QR sandbox dùng cơ chế mô phỏng kết quả/callback nội bộ để demo tự động cập nhật trạng thái.
- Sinh viên không được đóng học phí một phần; mỗi lần thanh toán phải đúng đủ số tiền của phiếu thu.
- Nợ học phí chỉ áp dụng cho học lại/học cải thiện và được dời hạn thêm 2 tháng so với hạn học phí của học kỳ.
- Trạng thái hiển thị cho người dùng dùng tiếng Việt có dấu; trong code nên dùng hằng số hoặc enum nội bộ để tránh lỗi encoding.
