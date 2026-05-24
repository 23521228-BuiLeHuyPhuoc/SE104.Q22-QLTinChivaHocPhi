# Kế Hoạch Thực Thi Tổng Hợp QL Tín Chỉ Và Học Phí

## Mục tiêu
- Chuẩn hóa toàn hệ thống phân trang 15 bản ghi/trang.
- Bổ sung sidebar thu/mở, xóa mềm qua thùng rác, audit người sửa/xóa và thời điểm.
- Sửa các nghiệp vụ trọng tâm: duyệt sinh viên, dashboard dữ liệu thật, đăng ký tín chỉ theo sinh viên, chống trùng lịch, CTĐT 4 năm, hạn học phí và thanh toán.

## Hạng mục nền tảng
- Thêm helper phân trang dùng `DEFAULT_PAGE_SIZE = 15`.
- Thêm các cột `DaXoa`, `NguoiXoa`, `NgayXoa`, `NguoiCapNhat`, `NgayCapNhat` cho các bảng nghiệp vụ chính.
- Mặc định các API/list view lọc `DaXoa = false`.
- DELETE thường chỉ xóa mềm; hard delete chỉ đi qua thùng rác.
- Tạo API/view thùng rác để xem người xóa, thời điểm xóa, khôi phục hoặc xóa vĩnh viễn.

## Hạng mục Admin
- Dashboard dùng API thống kê dữ liệu thật, loại trừ bản ghi đã xóa mềm.
- Sinh viên có CCCD, dân tộc, địa chỉ bắt buộc; hiển thị trạng thái duyệt tài khoản.
- Các trang Sinh viên, Môn học, Lớp học, Học kỳ, Khoa, Ngành, Môn đã học, Đơn giá tín chỉ, Đối tượng dùng phân trang và audit cập nhật.
- Lớp học hiển thị số sinh viên đã đăng ký.
- Đăng ký tín chỉ admin liệt kê theo phiếu/sinh viên, có nút xem chi tiết môn đăng ký.
- Học phí hiển thị hạn đóng, trạng thái quá hạn và số tiền đã thu thật.
- Đơn giá tín chỉ bổ sung loại học hè, chặn tạo dư khi đã đủ loại học trong cùng phạm vi.
- Tham số hệ thống bổ sung giới hạn tín chỉ khi chưa hoàn thành các môn Anh văn bắt buộc.

## Hạng mục Sinh viên
- Đăng ký môn dùng dropdown 3 học kỳ mới nhất, hiển thị đã đăng ký/tối đa.
- Loại đăng ký do backend tính từ môn đã học: học mới, học lại, học cải thiện.
- Backend và trigger DB chặn trùng thời khóa biểu cùng sinh viên/cùng học kỳ.
- CTĐT hiển thị đủ 8 học kỳ của 4 năm, trạng thái từng môn và tiến độ tích lũy.
- Học phí có chức năng tạo yêu cầu thanh toán QR, VNPAY sandbox, ZaloPay sandbox.
- Hồ sơ hiển thị các trường bắt buộc CCCD, dân tộc, địa chỉ.
- Thông báo có trang danh sách đầy đủ, lọc chưa đọc/đã đọc và phân trang 15.

## Kiểm thử
- Chạy `npx prisma generate`.
- Chạy kiểm tra cú pháp các controller/route/JS client đã chỉnh.
- Kiểm tra bootstrap DB với database cũ.
- QA thủ công các luồng: sidebar, phân trang, xóa mềm/thùng rác, duyệt sinh viên, đăng ký môn, chống trùng lịch, học phí/thanh toán, thông báo.
