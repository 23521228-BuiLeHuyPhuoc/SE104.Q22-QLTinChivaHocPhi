\# AGENTS.md



\## Quy tắc bắt buộc khi làm task admin requirements



\* Trước khi sửa code, luôn đọc `docs/admin-requirements-full.md`.

\* Không được tự ý bỏ qua, rút gọn, hoặc gom mơ hồ bất kỳ yêu cầu nào.

\* Việc đầu tiên phải làm là tạo `docs/admin-requirements-checklist.md`.

\* Mỗi yêu cầu trong checklist phải có mã riêng, ví dụ:



&#x20; \* `REQ-PROVINCE-001`

&#x20; \* `REQ-WARD-001`

&#x20; \* `REQ-COURSE-001`

&#x20; \* `REQ-TUITION-001`

\* Mỗi mục checklist phải ghi rõ:



&#x20; \* Trang/module liên quan

&#x20; \* Nội dung yêu cầu gốc

&#x20; \* File backend cần sửa, nếu có

&#x20; \* File frontend cần sửa, nếu có

&#x20; \* Database/migration/seed cần sửa, nếu có

&#x20; \* Cách kiểm thử

&#x20; \* Trạng thái: `\[ ]`, `\[\~]`, `\[x]`

\* Không được đánh dấu `\[x]` nếu chưa sửa code và chưa kiểm thử.

\* Sau mỗi nhóm chức năng, phải cập nhật checklist và ghi rõ file đã sửa.

\* Ưu tiên tạo component/hàm dùng chung cho các yêu cầu lặp lại:



&#x20; \* select tìm kiếm bên trái ô tìm kiếm

&#x20; \* modal xem chi tiết khi click dòng

&#x20; \* field không được sửa thì tô xám và hiện thông báo khi click

&#x20; \* popup chọn môn học/giảng viên/phòng học có tìm kiếm

&#x20; \* hiển thị sửa bởi ai, sửa vào thời điểm nào

\* Với thay đổi database:



&#x20; \* Phải kiểm tra quan hệ khóa ngoại/ràng buộc trước khi xóa.

&#x20; \* Phải tạo migration hoặc cập nhật schema đúng cách.

&#x20; \* Phải cập nhật seed data nếu yêu cầu có nhắc seed.

\* Với import Excel:



&#x20; \* Phải có hướng dẫn format file.

&#x20; \* Phải hiện kết quả từng dòng: thành công/thất bại.

&#x20; \* Phải hiện lỗi cụ thể cho từng dòng thất bại.

\* Với thanh toán/học phí/phiếu thu:



&#x20; \* Không được chỉ sửa UI.

&#x20; \* Phải kiểm tra luồng tạo phiếu thu, sinh viên thanh toán, callback thành công/thất bại, cập nhật công nợ.

\* Definition of Done:



&#x20; \* Checklist của nhóm đang làm đã được cập nhật.

&#x20; \* Code build được.

&#x20; \* Test/lint/typecheck phù hợp đã chạy, hoặc ghi rõ vì sao không chạy được.

&#x20; \* `git diff` đã được tự review.

&#x20; \* Không còn yêu cầu nào trong nhóm bị bỏ trống.



