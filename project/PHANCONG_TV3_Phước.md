# NGƯỜI 3 — Học kỳ, Lớp, Tiết học, Đơn giá, Đăng ký

## 3.1. Hiện trạng

**Trang Học kỳ (admin/semesters):**

- ✅ Đã có: CRUD (mã, tên, năm học, loại, thứ tự, ngày BD/KT, ngày ĐK BD/KT, hạn HP, trạng thái), phân trang SSR.  
- ❌ Chưa có: dropdown chọn năm học (hiện nhập tay MaNamHoc), thêm/sửa năm học, validate ngày BD \< KT realtime trên form, hiện thống kê (bao nhiêu lớp mở, bao nhiêu SV ĐK) ngay trên bảng, hiện trạng thái bằng badge màu.

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
- ❌ Chưa có: hiện "Còn X chỗ" dạng warning khi gần đầy (\< 5), hiện tổng TC đã ĐK trong HK hiện tại, nút hủy ĐK cho SV (hiện phải qua trang khác).

**Trang Môn đã ĐK (student/my-courses):**

- ✅ Đã có: hiện danh sách CTDK theo HK (3.7KB).  
- ❌ Chưa có: nút hủy ĐK từng môn, hiện tổng TC \+ tổng tiền.

**Trang Thời khóa biểu (student/my-schedule):**

- ✅ Đã có: render lịch theo thứ × tiết (8.6KB, khá đầy đủ), hiện tên môn, phòng, GV.  
- ❌ Chưa có: chọn HK xem lịch (nếu chưa có), in/export lịch.

**Backend:**

- ✅ semesterController.js — CRUD, getActiveSemester, getRegistrationOptions, getAcademicYears.  
- ✅ classController.js — CRUD, openClass, closeClass, getClassSchedules, upsertClassSchedule, getClassStats.  
- ✅ registrationController.js — CRUD, registerCourse, cancelRegistration, getAvailableCourses, getStudentCourses. Có ensureNoScheduleConflict, ensureCreditLimit.  
- ❌ Chưa có: API lấy DS SV trong 1 lớp, API export ĐK, API admin hủy CTDK, kiểm tra điều kiện khóa luận tốt nghiệp khi đăng ký môn khóa luận.

## 3.2. Công việc cần làm

### Giao diện Admin — Trang Học kỳ

1. **Dropdown chọn năm học**: Thay input MaNamHoc bằng dropdown load từ API getAcademicYears() (đã có). Thêm nút "Thêm năm học" nếu chưa có năm mong muốn.  
     
2. **Validate ngày realtime trên form**: Khi nhập NgayBD/NgayKT → so sánh realtime, hiện ✗ "Ngày bắt đầu phải trước ngày kết thúc". Tương tự cho NgayBDDK/NgayKTDK.  
     
3. **Hiện thống kê trên bảng**: Thêm cột "Lớp mở" (count LOPMO) \+ "SV ĐK" (count PHIEUDANGKY) trên bảng. Cần sửa viewController truyền thêm stats.  
     
4. **Badge trạng thái**: Hiện trạng thái bằng badge màu (xanh \= Đang diễn ra, vàng \= Sắp diễn ra, xám \= Kết thúc).

### Giao diện Admin — Trang Lớp

5. **Dropdown chọn môn**: Thay input MaMonHoc bằng dropdown search load từ API /api/courses.  
     
6. **UI mở/đóng lớp theo HK**: Trong trang chi tiết lớp hoặc row actions: nút "Mở lớp" → modal chọn HK → gọi API openClass. Nút "Đóng lớp" → confirm → gọi closeClass. Hiện trạng thái mở/đóng trên bảng.  
     
7. **UI quản lý lịch học chi tiết**: Click vào lớp → panel "Lịch học" → form chọn HK/Thứ/Tiết BĐ/Tiết KT/Phòng → nút Thêm/Sửa/Xóa. Hiện bảng lịch đã thêm. API đã có (upsertClassSchedule, getClassSchedules), chỉ cần UI.  
     
8. **Xem danh sách SV trong lớp**: Nút "DS Sinh viên" → modal hiện bảng SV đã ĐK (MSSV, Họ tên, Ngày ĐK, Trạng thái). Cần API GET /api/classes/:id/students.  
     
9. **Filter theo môn/HK/trạng thái**: 3 dropdown filter trên toolbar bảng lớp.  
     
10. **Hiện SoLuongDaDangKy**: Thêm cột "Đã ĐK/Tối đa" trên bảng (data đã có).

### Giao diện Admin — Danh sách môn học mở

11. **Bổ sung quản lý danh sách môn học mở**: Cần có trang hoặc tab "Môn học mở" để admin xem toàn bộ lớp/môn đang được mở theo học kỳ. Đây không chỉ là danh sách lớp thường, mà là danh sách các offering có MaHocKy \+ MaLop \+ MaMonHoc.  
      
12. **Bảng môn học mở phải đủ cột nghiệp vụ**: Mỗi dòng cần hiển thị học kỳ, mã lớp, tên lớp, mã môn, tên môn, loại môn, số tín chỉ, khoa, giảng viên, lịch học, phòng, sĩ số tối đa, số đã đăng ký, số chỗ còn lại, trạng thái mở/đóng.  
      
13. **Bộ lọc môn học mở**: Có filter theo học kỳ, khoa, môn học, giảng viên, mã lớp, loại môn LT/TH, trạng thái mở/đóng, còn chỗ/hết chỗ. Search text phải tìm được theo mã môn, tên môn, mã lớp, tên lớp, giảng viên.  
      
14. **Hành động trên môn học mở**: Từ danh sách môn học mở phải có nút xem lịch học, xem danh sách sinh viên đăng ký, đóng/mở lớp, chỉnh lịch học, chỉnh phòng/giảng viên nếu còn hợp lệ.  
      
15. **API danh sách môn học mở**: Backend cần trả endpoint danh sách lớp mở kèm môn, lớp, học kỳ, lịch học, sĩ số và số chỗ còn lại. Nếu đã có API getOpenedClasses, phải bổ sung filter/query và dữ liệu còn thiếu.

### Giao diện Admin — Trang Đơn giá

16. **Form thêm/sửa đơn giá**: Kiểm tra xem pug đã có modal form chưa. Nếu chưa: thêm modal (chọn LoaiMon, LoaiHoc, HK, DonGia, TrangThai) \+ nút Thêm/Sửa/Xóa.  
      
17. **Format tiền VNĐ**: Hiện đơn giá dạng "27.000 ₫" thay vì số thô.

### Giao diện Admin — Trang Đăng ký

18. **Admin hủy CTDK**: Nút "Hủy" cạnh từng môn trong modal chi tiết → confirm → gọi API cancelRegistration. Hiện lý do nếu bị chặn.  
      
19. **Hiện miễn giảm trên chi tiết**: Trong modal chi tiết phiếu ĐK, thêm dòng: TiLeGiam, TienMienGiam, TongTienPhaiDong (data đã có từ PHIEUDANGKY).  
      
20. **Export ĐK ra Excel**: Nút "Xuất Excel" → download file gồm: MSSV, HoTen, HK, DsMon, TongTC, TongTien.

### Giao diện Sinh viên — Đăng ký môn

21. **Hiện tổng TC đã ĐK trong HK**: Trên đầu bảng lớp mở, hiện "Đã đăng ký: X tín chỉ / Max Y tín chỉ". Load từ API getStudentCourses filter theo HK.  
      
22. **Cảnh báo sĩ số gần đầy**: Nếu còn \< 5 chỗ → badge đỏ "Sắp hết" thay vì text bình thường.  
      
23. **Bổ sung tìm kiếm theo giảng viên**: Ở /student/course-registration, thêm filter/ô tìm kiếm giảng viên. Sinh viên nhập tên giảng viên hoặc chọn dropdown, danh sách lớp mở phải lọc đúng các lớp do giảng viên đó phụ trách.  
      
24. **Bổ sung tìm kiếm theo lớp**: Thêm tìm kiếm theo mã lớp và tên lớp. Kết quả phải lọc được khi sinh viên chỉ nhớ mã lớp, ví dụ SE104.N11, hoặc tên lớp/nhóm lớp.  
      
25. **Bổ sung tìm kiếm theo loại môn**: Thêm filter loại môn LT/TH/Tất cả. Nếu có thêm loại học khác trong dữ liệu thì dropdown phải lấy theo dữ liệu thực tế hoặc định nghĩa chung, không hardcode sai.  
      
26. **Bổ sung filter theo lịch học**: Thêm các lựa chọn lọc theo thứ trong tuần, ngày học hoặc ca/tiết học nếu dữ liệu lịch có đủ. Tối thiểu phải có filter theo thứ và khoảng tiết để sinh viên tìm lớp không trùng lịch cá nhân.  
      
27. **Bỏ phần học phí dự kiến khỏi trang đăng ký môn**: Không hiển thị cột/card/text "Học phí dự kiến", DonGiaDuKien, ThanhTienDuKien ở /student/course-registration. Phần học phí chỉ xử lý ở trang học phí/thanh toán. Backend có thể vẫn giữ dữ liệu để tính toán, nhưng frontend đăng ký môn không được làm sinh viên hiểu đây là màn thanh toán.  
      
28. **Filter phải giữ trạng thái sau reload/phân trang**: Khi sinh viên lọc theo giảng viên/lớp/loại môn/thứ/tiết rồi chuyển trang hoặc đăng ký xong, filter hiện tại phải được giữ lại.  
      
29. **Hiển thị lỗi điều kiện khóa luận rõ ràng**: Khi sinh viên đăng ký lớp/môn khóa luận tốt nghiệp nhưng chưa đủ điều kiện, UI phải hiển thị thông báo từ API, ví dụ "Chưa đủ điều kiện đăng ký khóa luận: còn nợ 9 tín chỉ, tối đa được nợ 8 tín chỉ". Không hiển thị lỗi chung chung như "Đăng ký thất bại".

### Giao diện Sinh viên — Môn đã ĐK

30. **Nút hủy ĐK**: Mỗi môn trong danh sách có nút "Hủy ĐK" → confirm → gọi API cancelRegistration → reload.  
      
31. **Hiện tổng TC \+ tổng tiền**: Cuối danh sách hiện tổng: "Tổng: X tín chỉ | Học phí: Y₫".  
      
32. **Hủy đăng ký xong thì xóa khỏi danh sách đang đăng ký**: Khi sinh viên bấm "Hủy ĐK" ở /student/my-courses, sau khi API thành công không hiển thị dòng đó với trạng thái "Đã hủy". Danh sách này chỉ là danh sách học phần đang đăng ký, nên môn đã hủy phải biến mất khỏi bảng active. Nếu cần lịch sử hủy thì để ở màn hình khác, không nằm trong danh sách đang đăng ký.  
      
33. **Tổng tín chỉ đã đăng ký chỉ tính môn active**: Thêm phần tổng tín chỉ đã đăng ký ở đầu hoặc cuối trang /student/my-courses, chỉ cộng các chi tiết có trạng thái active/đã đăng ký. Không cộng môn đã hủy. Hiển thị rõ dạng "Tổng tín chỉ đã đăng ký: X".  
      
34. **Không nhấn mạnh học phí ở danh sách môn đã đăng ký**: Vì đây là màn quản lý học phần đã đăng ký, không phải màn thanh toán, ưu tiên tổng tín chỉ và trạng thái học phần. Nếu vẫn cần giữ tổng tiền để admin/kiểm tra, không đặt thành thông tin chính; học phí chi tiết nằm ở /student/my-tuition.

### Giao diện Sinh viên — Thời khóa biểu

35. **Dropdown chọn HK**: Nếu chưa có → thêm dropdown chọn HK để xem lịch HK khác.  
      
36. **In/export lịch**: Nút "In TKB" → window.print() hoặc export PDF.

### Backend

37. **API danh sách SV trong lớp**: GET /api/classes/:id/students?MaHocKy= → query CHITIETDANGKY join PHIEUDANGKY join SINHVIEN.  
      
38. **API export ĐK**: GET /api/registrations/export?MaHocKy= → trả file Excel.  
      
39. **Sửa viewController truyền stats cho HK**: Trong adminSemesters() → query count LOPMO \+ PHIEUDANGKY cho mỗi HK.  
      
40. **Bổ sung filter cho API lớp mở sinh viên đăng ký**: getAvailableCourses() cần nhận thêm query như GiangVien, MaLop, LoaiMon, ThuTrongTuan, MaTietBatDau, MaTietKetThuc, ConCho. API phải filter đúng trên LOP, MONHOC, LOPMO, LICHHOCLOP và vẫn trả phân trang đúng.  
      
41. **API môn đã đăng ký chỉ trả danh sách active theo mặc định**: getStudentCourses() hoặc endpoint tương ứng cho /student/my-courses phải mặc định chỉ lấy chi tiết đang đăng ký. Nếu cần lấy cả đã hủy thì phải có query riêng như includeCancelled=true, không dùng cho danh sách active mặc định.  
      
42. **API tổng tín chỉ đã đăng ký**: Response của danh sách môn đã đăng ký cần có summary totalCreditsRegistered chỉ tính chi tiết active để frontend hiển thị "Tổng tín chỉ đã đăng ký".  
      
43. **API danh sách môn học mở cho admin**: Bổ sung endpoint/filter cho trang "Danh sách môn học mở", gồm học kỳ, khoa, môn, giảng viên, lớp, loại môn, trạng thái, còn chỗ/hết chỗ.  
      
44. **Chặn đăng ký khóa luận nếu nợ quá 8 tín chỉ**: Trong registerCourse() và mọi luồng admin đăng ký học phần hộ SV, nếu môn/lớp đang đăng ký là khóa luận tốt nghiệp thì gọi helper/API điều kiện khóa luận của Người 2\. Nếu owedCredits \> 8, không tạo CHITIETDANGKY, không cập nhật học phí, trả lỗi có owedCredits, maxAllowedOwedCredits=8 và danh sách môn còn nợ nếu có.

## 3.3. Phạm vi file

- **Backend**: semesterController.js, classController.js, periodController.js, pricingController.js, registrationController.js, semesterRoutes.js, classRoutes.js, periodRoutes.js, pricingRoutes.js, registrationRoutes.js, viewController.js  
- **Frontend**: admin/semesters.pug \+ .js, admin/classes.pug \+ .js, admin/periods.pug \+ .js, admin/pricing.pug \+ .js, admin/registrations.pug \+ .js, student/course-registration.pug \+ .js, student/my-courses.pug \+ .js, student/my-schedule.pug \+ .js

## 3.4. Test Cases

| ID | Mô tả | Expected |
| :---- | :---- | :---- |
| N3-01 | Thêm HK đủ thông tin | Tạo thành công |
| N3-02 | Form HK NgayBD \> NgayKT | Hiện ✗ realtime, disable Lưu |
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
| N3-13 | Lớp còn 3 chỗ | Badge đỏ "Sắp hết \- 3/40" |
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

