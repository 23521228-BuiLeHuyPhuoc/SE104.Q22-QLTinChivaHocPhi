# 📋 PHÂN CÔNG CÔNG VIỆC - TRIGGER & STORED PROCEDURES

## Hệ thống Quản lý Đăng ký Môn học và Thu Học phí

---

## 📌 TỔNG QUAN

Tài liệu này phân chia công việc viết Trigger và Stored Procedures cho **4 thành viên** trong nhóm, đảm bảo đáp ứng đầy đủ các yêu cầu từ BM1-BM7 và QĐ1-QĐ7.

---

## 👤 THÀNH VIÊN 1: Quản lý Sinh viên & Đối tượng ưu tiên

### Phụ trách: BM1, QĐ1

| STT | Tên Trigger/Function | Mô tả | Bảng liên quan |
|-----|---------------------|-------|----------------|
| 1 | `trg_sinh_vien_before_insert` | Kiểm tra và chuẩn hóa dữ liệu (bao gồm CCCD 12 số, SĐT, email) | `sinh_vien` |
| 2 | `trg_sinh_vien_before_update` | Kiểm tra và chuẩn hóa dữ liệu khi sửa (bao gồm CCCD 12 số, SĐT, email) | `sinh_vien` |
| 3 | `trg_sinh_vien_before_delete` | Kiểm tra ràng buộc trước khi xóa sinh viên | `sinh_vien`, `phieu_dang_ky`, `tai_khoan` |
| 4 | `trg_sinh_vien_after_insert` | Tự động tạo tài khoản cho sinh viên mới | `sinh_vien`, `tai_khoan` |
| 5 | `trg_sinh_vien_after_update` | Cập nhật tỷ lệ giảm HP khi thay đổi phường/xã hoặc dân tộc | `sinh_vien`, `phieu_dang_ky` |
| 6 | `trg_doi_tuong_sinh_vien_before_insert` | Kiểm tra dữ liệu đối tượng sinh viên hợp lệ | `doi_tuong_sinh_vien`, `sinh_vien`, `doi_tuong` |
| 7 | `trg_doi_tuong_sinh_vien_before_update` | Kiểm tra dữ liệu khi cập nhật đối tượng sinh viên | `doi_tuong_sinh_vien`, `sinh_vien`, `doi_tuong` |
| 8 | `trg_doi_tuong_sinh_vien_after_insert` | Cập nhật tỷ lệ giảm HP khi gán đối tượng | `doi_tuong_sinh_vien`, `phieu_dang_ky` |
| 9 | `trg_doi_tuong_sinh_vien_after_update` | Cập nhật tỷ lệ giảm HP khi sửa đối tượng | `doi_tuong_sinh_vien`, `phieu_dang_ky` |
| 10 | `trg_doi_tuong_sinh_vien_after_delete` | Cập nhật lại tỷ lệ giảm khi xóa đối tượng | `doi_tuong_sinh_vien`, `phieu_dang_ky` |
| 11 | `trg_doi_tuong_before_insert` | Kiểm tra tỷ lệ giảm và độ ưu tiên hợp lệ | `doi_tuong` |
| 12 | `trg_doi_tuong_before_update` | Kiểm tra dữ liệu khi cập nhật đối tượng | `doi_tuong` |
| 13 | `trg_doi_tuong_before_delete` | Kiểm tra ràng buộc trước khi xóa đối tượng | `doi_tuong`, `doi_tuong_sinh_vien` |
| 14 | `trg_doi_tuong_after_update` | Cập nhật tỷ lệ giảm HP cho tất cả SV khi sửa tỷ lệ giảm | `doi_tuong`, `doi_tuong_sinh_vien`, `phieu_dang_ky` |
| 15 | `trg_phuong_xa_before_update` | Cập nhật tỷ lệ giảm cho SV khi thay đổi khu vực ưu tiên | `phuong_xa`, `sinh_vien`, `phieu_dang_ky` |
| 16 | `trg_dan_toc_before_update` | Cập nhật tỷ lệ giảm cho SV khi thay đổi thuộc tính DTTS | `dan_toc`, `sinh_vien`, `phieu_dang_ky` |
| 17 | `trg_phuong_xa_before_delete` | Kiểm tra có sinh viên tham chiếu không trước khi xóa | `phuong_xa`, `sinh_vien` |
| 18 | `trg_dan_toc_before_delete` | Kiểm tra có sinh viên tham chiếu không trước khi xóa | `dan_toc`, `sinh_vien` |
| 19 | `trg_nganh_hoc_before_delete` | Kiểm tra có sinh viên/CTĐT tham chiếu không trước khi xóa | `nganh_hoc`, `sinh_vien`, `chuong_trinh_hoc` |
| 20 | `trg_quan_huyen_before_delete` | Kiểm tra có phường/xã tham chiếu không trước khi xóa | `quan_huyen`, `phuong_xa` |
| 21 | `fn_lay_ti_le_giam_hoc_phi(ma_sv)` | Lấy tỷ lệ giảm học phí theo đối tượng ưu tiên cao nhất (QĐ1) | `doi_tuong`, `doi_tuong_sinh_vien`, `phuong_xa`, `dan_toc` |
| 22 | `fn_kiem_tra_vung_sau_vung_xa(ma_sv)` | Kiểm tra sinh viên có thuộc đối tượng vùng sâu/xa không (KV3 + DTTS) (QĐ1) | `sinh_vien`, `phuong_xa`, `dan_toc` |
| 23 | `fn_validate_cccd(cccd)` | Kiểm tra CCCD có đúng 12 ký tự số không | - |
| 24 | `fn_validate_sdt(sdt)` | Kiểm tra SĐT có hợp lệ không (10-11 số, bắt đầu bằng 0) | - |
| 25 | `fn_validate_email(email)` | Kiểm tra email có định dạng hợp lệ không | - |
| 26 | `sp_lap_ho_so_sinh_vien(...)` | Procedure tạo hồ sơ sinh viên đầy đủ (BM1) | `sinh_vien`, `tai_khoan`, `doi_tuong_sinh_vien` |

### 📝 MÔ TẢ CHI TIẾT TỪNG TRIGGER/FUNCTION:

#### 1. `trg_sinh_vien_before_insert`
**Mục đích:** Kiểm tra và chuẩn hóa dữ liệu trước khi thêm sinh viên mới vào database.

**Input:** Dữ liệu sinh viên mới từ lệnh INSERT (NEW.*)

**Logic xử lý:**
- Kiểm tra `ma_sv` không được NULL và không trùng lặp
- Kiểm tra `ho_ten` không được rỗng, chuẩn hóa (trim, capitalize)
- Kiểm tra `ngay_sinh` hợp lệ (không được là ngày trong tương lai, tuổi >= 16)
- Kiểm tra `gioi_tinh` phải là 'Nam' hoặc 'Nữ'
- **Kiểm tra `cccd` (nếu có):**
  - Phải có đúng 12 ký tự số
  - Không được chứa ký tự đặc biệt hoặc chữ cái
  - Regex: `^[0-9]{12}$`
- **Kiểm tra `sdt` (nếu có):**
  - Phải có 10-11 ký tự số
  - Bắt đầu bằng số 0
  - Regex: `^0[0-9]{9,10}$`
- **Kiểm tra `email` (nếu có):**
  - Phải có định dạng email hợp lệ (có @ và domain)
  - Chuẩn hóa email về dạng lowercase
- Kiểm tra `ma_phuong_xa` tồn tại trong bảng `phuong_xa`
- Kiểm tra `ma_dan_toc` tồn tại trong bảng `dan_toc` (nếu có)
- Kiểm tra `ma_nganh` tồn tại trong bảng `nganh_hoc`
- Tự động set `ngay_tao = CURRENT_TIMESTAMP`
- Tự động set `trang_thai = 'Đang học'` nếu không được cung cấp

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- Trigger sẽ chạy khi thực hiện:
INSERT INTO sinh_vien (ma_sv, ho_ten, ngay_sinh, gioi_tinh, cccd, sdt, email, ma_phuong_xa, ma_dan_toc, ma_nganh)
VALUES ('SV001', '  nguyễn văn an  ', '2003-05-15', 'Nam', '079203012345', '0901234567', 'An.NV@email.com', '2659', 'KINH', 'KTPM');
-- Kết quả: 
-- - ho_ten được chuẩn hóa thành 'Nguyễn Văn An'
-- - email được chuẩn hóa thành 'an.nv@email.com'
-- - cccd được kiểm tra có đúng 12 số

-- INSERT với cccd không hợp lệ:
INSERT INTO sinh_vien (ma_sv, ho_ten, ngay_sinh, gioi_tinh, cccd, ma_phuong_xa, ma_nganh)
VALUES ('SV002', 'Trần Văn B', '2003-05-15', 'Nam', '07920301', '2659', 'KTPM');
-- Kết quả: Error - CCCD phải có đúng 12 ký tự số
```

---

#### 2. `trg_sinh_vien_before_update`
**Mục đích:** Kiểm tra và chuẩn hóa dữ liệu trước khi cập nhật thông tin sinh viên.

**Input:** Dữ liệu sinh viên trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
- Kiểm tra `ho_ten` không được rỗng, chuẩn hóa (trim, capitalize)
- Kiểm tra `ngay_sinh` hợp lệ (không được là ngày trong tương lai, tuổi >= 16)
- Kiểm tra `gioi_tinh` phải là 'Nam' hoặc 'Nữ'
- **Kiểm tra `cccd` (nếu thay đổi):**
  - Phải có đúng 12 ký tự số
  - Không được chứa ký tự đặc biệt hoặc chữ cái
  - Regex: `^[0-9]{12}$`
- **Kiểm tra `sdt` (nếu thay đổi):**
  - Phải có 10-11 ký tự số
  - Bắt đầu bằng số 0
  - Regex: `^0[0-9]{9,10}$`
- **Kiểm tra `email` (nếu thay đổi):**
  - Phải có định dạng email hợp lệ (có @ và domain)
  - Chuẩn hóa email về dạng lowercase
- Kiểm tra `ma_phuong_xa` tồn tại trong bảng `phuong_xa` (nếu thay đổi)
- Kiểm tra `ma_dan_toc` tồn tại trong bảng `dan_toc` (nếu thay đổi)
- Kiểm tra `ma_nganh` tồn tại trong bảng `nganh_hoc` (nếu thay đổi)
- Tự động set `ngay_cap_nhat = CURRENT_TIMESTAMP`
- Không cho phép thay đổi `ma_sv` (primary key)

**Output:** Cho phép UPDATE nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- Cập nhật thông tin SV hợp lệ:
UPDATE sinh_vien SET ho_ten = '  trần văn bình  ', cccd = '079203012346' WHERE ma_sv = 'SV001';
-- Kết quả: ho_ten được chuẩn hóa thành 'Trần Văn Bình', cccd được kiểm tra hợp lệ

-- Cập nhật CCCD không hợp lệ:
UPDATE sinh_vien SET cccd = '12345' WHERE ma_sv = 'SV001';
-- Kết quả: Error - CCCD phải có đúng 12 ký tự số

-- Cập nhật email không hợp lệ:
UPDATE sinh_vien SET email = 'invalid-email' WHERE ma_sv = 'SV001';
-- Kết quả: Error - Email không hợp lệ
```

---

#### 3. `trg_sinh_vien_before_delete`
**Mục đích:** Kiểm tra ràng buộc trước khi xóa sinh viên, đảm bảo không còn dữ liệu liên quan.

**Input:** Dữ liệu sinh viên sắp bị xóa (OLD.*)

**Logic xử lý:**
1. Kiểm tra không còn phiếu đăng ký nào của sinh viên này có `trang_thai = 'Đã đăng ký'`
2. Kiểm tra không còn phiếu thu học phí nào có `trang_thai = 'Thành công'`
3. Kiểm tra không còn điểm số của sinh viên
4. Nếu còn dữ liệu liên quan → raise exception với thông báo chi tiết
5. Nếu không còn ràng buộc → xóa tài khoản liên kết trước, sau đó cho phép xóa sinh viên

**Output:** Cho phép DELETE nếu không còn ràng buộc, raise exception nếu còn

**Ví dụ:**
```sql
-- Xóa sinh viên không còn ràng buộc:
DELETE FROM sinh_vien WHERE ma_sv = 'SV999';
-- Kết quả: Xóa thành công (tài khoản liên kết cũng bị xóa theo)

-- Xóa sinh viên còn phiếu đăng ký:
DELETE FROM sinh_vien WHERE ma_sv = 'SV001';
-- Kết quả: Error - Không thể xóa: sinh viên còn 2 phiếu đăng ký chưa xử lý
```

---

#### 4. `trg_sinh_vien_after_insert`
**Mục đích:** Tự động tạo tài khoản đăng nhập cho sinh viên mới.

**Input:** Dữ liệu sinh viên vừa được INSERT (NEW.*)

**Logic xử lý:**
1. Tạo username từ `ma_sv` (VD: 'SV001' → username: 'sv001')
2. Tạo mật khẩu mặc định ngẫu nhiên (random string 12 ký tự) hoặc hash của thông tin không dễ đoán
   - **⚠️ Lưu ý bảo mật:** KHÔNG sử dụng thông tin cá nhân dễ đoán như mã SV + ngày sinh
   - Gợi ý: Sử dụng UUID v4 hoặc random string generator
3. INSERT vào bảng `tai_khoan` với `role = 'sinh_vien'`
4. UPDATE `sinh_vien` để liên kết `ma_tai_khoan`
5. Gửi email/thông báo mật khẩu mặc định cho sinh viên (nếu có)

**Output:** Tự động tạo record trong bảng `tai_khoan`

**Ví dụ:**
```sql
-- Sau khi INSERT sinh viên SV001:
-- Tự động tạo tài khoản với mật khẩu ngẫu nhiên:
-- | ten_dang_nhap | mat_khau          | role       |
-- | sv001         | $2a$10$...hash... | sinh_vien  |
-- Mật khẩu gốc được gửi qua email/thông báo
```

---

#### 5. `trg_sinh_vien_after_update`
**Mục đích:** Cập nhật tỷ lệ giảm học phí cho các phiếu đăng ký khi thay đổi phường/xã hoặc dân tộc của sinh viên.

**Input:** Dữ liệu sinh viên trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `ma_phuong_xa` hoặc `ma_dan_toc` thay đổi:
   - Gọi `fn_lay_ti_le_giam_hoc_phi(NEW.ma_sv)` để tính lại tỷ lệ giảm
   - Tìm tất cả phiếu đăng ký của sinh viên có `trang_thai = 'Đã đăng ký'`
   - Cập nhật lại:
     - `ti_le_giam` = tỷ lệ mới
     - `tien_mien_giam` = `tong_tien_dang_ky * ti_le_giam / 100`
     - `tong_tien_phai_dong` = `tong_tien_dang_ky - tien_mien_giam`

**Output:** Cập nhật các phiếu đăng ký của sinh viên nếu có thay đổi liên quan

**Ví dụ:**
```sql
-- Sinh viên SV001 đổi địa chỉ từ KV1 sang KV3 và là dân tộc thiểu số:
UPDATE sinh_vien SET ma_phuong_xa = '12345' WHERE ma_sv = 'SV001';
-- Kết quả: phiếu đăng ký được cập nhật với tỷ lệ giảm mới (50% cho vùng sâu xa)
```

---

#### 6. `trg_doi_tuong_sinh_vien_before_insert`
**Mục đích:** Kiểm tra dữ liệu đối tượng sinh viên hợp lệ trước khi INSERT.

**Input:** Dữ liệu đối tượng sinh viên mới (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_sv` tồn tại trong bảng `sinh_vien` và đang hoạt động
2. Kiểm tra `ma_doi_tuong` tồn tại trong bảng `doi_tuong` và đang hoạt động
3. Kiểm tra không trùng lặp `(ma_sv, ma_doi_tuong)` - một SV không được gán cùng một đối tượng hai lần
4. Kiểm tra sinh viên có trạng thái 'Đang học' (không cho phép gán đối tượng cho SV đã nghỉ/tốt nghiệp)
5. Set `ngay_tao = CURRENT_TIMESTAMP`

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- Gán đối tượng hợp lệ:
INSERT INTO doi_tuong_sinh_vien (ma_sv, ma_doi_tuong) VALUES ('SV001', 'DT02');
-- Kết quả: INSERT thành công

-- Gán đối tượng đã có:
INSERT INTO doi_tuong_sinh_vien (ma_sv, ma_doi_tuong) VALUES ('SV001', 'DT02');
-- Kết quả: Error - Sinh viên đã có đối tượng này
```

---

#### 7. `trg_doi_tuong_sinh_vien_before_update`
**Mục đích:** Kiểm tra dữ liệu khi cập nhật đối tượng sinh viên.

**Input:** Dữ liệu đối tượng sinh viên trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_sv` tồn tại (nếu thay đổi - thường không nên cho phép)
2. Kiểm tra `ma_doi_tuong` tồn tại (nếu thay đổi)
3. Kiểm tra không trùng lặp `(ma_sv, ma_doi_tuong)` với bản ghi khác
4. Không cho phép thay đổi `id` (primary key)
5. Cho phép cập nhật `file_minh_chung`, `ghi_chu`

**Output:** Cho phép UPDATE nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- Cập nhật file minh chứng:
UPDATE doi_tuong_sinh_vien SET file_minh_chung = '/uploads/mc_sv001.pdf' WHERE id = 1;
-- Kết quả: OK
```

---

#### 8. `trg_doi_tuong_sinh_vien_after_insert`
**Mục đích:** Cập nhật tỷ lệ giảm học phí cho các phiếu đăng ký của sinh viên khi được gán đối tượng ưu tiên mới.

**Input:** Dữ liệu gán đối tượng mới (NEW.ma_sv, NEW.ma_doi_tuong)

**Logic xử lý:**
1. Gọi `fn_lay_ti_le_giam_hoc_phi(NEW.ma_sv)` để lấy tỷ lệ giảm mới (cao nhất)
2. Tìm tất cả phiếu đăng ký của sinh viên có `trang_thai = 'Đã đăng ký'`
3. Cập nhật lại:
   - `ti_le_giam` = tỷ lệ mới
   - `tien_mien_giam` = `tong_tien_dang_ky * ti_le_giam / 100`
   - `tong_tien_phai_dong` = `tong_tien_dang_ky - tien_mien_giam`

**Output:** Cập nhật các phiếu đăng ký của sinh viên

**Ví dụ:**
```sql
-- Sinh viên SV001 đã đăng ký HK1, tổng tiền 5,000,000đ, chưa có đối tượng
-- Gán đối tượng "Con thương binh" (80% giảm):
INSERT INTO doi_tuong_sinh_vien (ma_sv, ma_doi_tuong) VALUES ('SV001', 'DT02');
-- Kết quả: phiếu đăng ký được cập nhật:
-- ti_le_giam = 80, tien_mien_giam = 4,000,000, tong_tien_phai_dong = 1,000,000
```

---

#### 9. `trg_doi_tuong_sinh_vien_after_update`
**Mục đích:** Cập nhật tỷ lệ giảm học phí khi thay đổi thông tin đối tượng của sinh viên.

**Input:** Dữ liệu đối tượng trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `ma_doi_tuong` thay đổi
2. Gọi `fn_lay_ti_le_giam_hoc_phi(NEW.ma_sv)` để tính lại tỷ lệ giảm
3. Cập nhật lại các phiếu đăng ký:
   - `ti_le_giam` = tỷ lệ mới
   - `tien_mien_giam` = `tong_tien_dang_ky * ti_le_giam / 100`
   - `tong_tien_phai_dong` = `tong_tien_dang_ky - tien_mien_giam`

**Output:** Cập nhật các phiếu đăng ký của sinh viên

**Ví dụ:**
```sql
-- Sinh viên SV001 có đối tượng "Con thương binh" (80%), đổi sang "Hộ nghèo" (50%):
UPDATE doi_tuong_sinh_vien SET ma_doi_tuong = 'DT03' WHERE ma_sv = 'SV001' AND ma_doi_tuong = 'DT02';
-- Kết quả: phiếu đăng ký được cập nhật với tỷ lệ giảm mới
```

---

#### 7. `trg_doi_tuong_sinh_vien_after_delete`
**Mục đích:** Cập nhật lại tỷ lệ giảm học phí khi xóa đối tượng ưu tiên của sinh viên.

**Input:** Dữ liệu đối tượng bị xóa (OLD.ma_sv, OLD.ma_doi_tuong)

**Logic xử lý:**
1. Kiểm tra sinh viên còn đối tượng nào khác không
2. Gọi `fn_lay_ti_le_giam_hoc_phi(OLD.ma_sv)` để tính lại tỷ lệ giảm
3. Cập nhật lại các phiếu đăng ký tương tự như trigger INSERT

**Output:** Cập nhật các phiếu đăng ký của sinh viên

---

#### 11. `trg_doi_tuong_before_insert`
**Mục đích:** Kiểm tra dữ liệu đối tượng ưu tiên hợp lệ trước khi INSERT.

**Input:** Dữ liệu đối tượng mới (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_doi_tuong` không được NULL và không trùng lặp
2. Kiểm tra `ten_doi_tuong` không được rỗng
3. Kiểm tra `ti_le_giam_hoc_phi` trong khoảng [0, 100]
4. Kiểm tra `do_uu_tien` > 0
5. Kiểm tra không trùng `do_uu_tien` với đối tượng khác (mỗi mức ưu tiên chỉ có 1 đối tượng)
6. Set `ngay_tao = CURRENT_TIMESTAMP`
7. Set `trang_thai = TRUE` nếu không được cung cấp

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- Thêm đối tượng mới:
INSERT INTO doi_tuong (ma_doi_tuong, ten_doi_tuong, ti_le_giam_hoc_phi, do_uu_tien)
VALUES ('DT10', 'Sinh viên khuyết tật', 100, 2);
-- Kết quả: INSERT thành công

-- Thêm với tỷ lệ giảm không hợp lệ:
INSERT INTO doi_tuong (ma_doi_tuong, ten_doi_tuong, ti_le_giam_hoc_phi, do_uu_tien)
VALUES ('DT11', 'Đối tượng mới', 150, 5);
-- Kết quả: Error - Tỷ lệ giảm phải trong khoảng 0-100
```

---

#### 12. `trg_doi_tuong_before_update`
**Mục đích:** Kiểm tra dữ liệu đối tượng ưu tiên hợp lệ trước khi UPDATE.

**Input:** Dữ liệu đối tượng trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `ten_doi_tuong` không được rỗng
2. Kiểm tra `ti_le_giam_hoc_phi` trong khoảng [0, 100]
3. Kiểm tra `do_uu_tien` > 0
4. Kiểm tra không trùng `do_uu_tien` với đối tượng khác (nếu thay đổi)
5. Không cho phép thay đổi `ma_doi_tuong` (primary key)

**Output:** Cho phép UPDATE nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- Cập nhật tỷ lệ giảm:
UPDATE doi_tuong SET ti_le_giam_hoc_phi = 60 WHERE ma_doi_tuong = 'DT03';
-- Kết quả: OK (trigger trg_doi_tuong_after_update sẽ cập nhật phiếu đăng ký)
```

---

#### 13. `trg_doi_tuong_before_delete`
**Mục đích:** Kiểm tra ràng buộc trước khi xóa đối tượng ưu tiên.

**Input:** Dữ liệu đối tượng sắp bị xóa (OLD.*)

**Logic xử lý:**
1. Kiểm tra không còn sinh viên nào được gán đối tượng này trong bảng `doi_tuong_sinh_vien`
2. Nếu còn sinh viên có đối tượng này → raise exception với danh sách sinh viên
3. Nếu không còn ràng buộc → cho phép xóa

**Output:** Cho phép DELETE nếu không còn ràng buộc, raise exception nếu còn

**Ví dụ:**
```sql
-- Xóa đối tượng không có sinh viên:
DELETE FROM doi_tuong WHERE ma_doi_tuong = 'DT99';
-- Kết quả: Xóa thành công

-- Xóa đối tượng đang có sinh viên:
DELETE FROM doi_tuong WHERE ma_doi_tuong = 'DT03';
-- Kết quả: Error - Không thể xóa: có 15 sinh viên đang thuộc đối tượng này
```

---

#### 14. `trg_doi_tuong_after_update`
**Mục đích:** Cập nhật tỷ lệ giảm học phí cho tất cả sinh viên thuộc đối tượng khi sửa tỷ lệ giảm.

**Input:** Dữ liệu đối tượng trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `ti_le_giam_hoc_phi` hoặc `do_uu_tien` thay đổi
2. Tìm tất cả sinh viên có đối tượng này từ bảng `doi_tuong_sinh_vien`
3. Với mỗi sinh viên:
   - Gọi `fn_lay_ti_le_giam_hoc_phi(ma_sv)` để tính lại tỷ lệ giảm (cao nhất)
   - Cập nhật lại các phiếu đăng ký có `trang_thai = 'Đã đăng ký'`:
     - `ti_le_giam` = tỷ lệ mới
     - `tien_mien_giam` = `tong_tien_dang_ky * ti_le_giam / 100`
     - `tong_tien_phai_dong` = `tong_tien_dang_ky - tien_mien_giam`

**Output:** Cập nhật các phiếu đăng ký của tất cả sinh viên liên quan

**Ví dụ:**
```sql
-- Đối tượng "Hộ nghèo" (DT03) được điều chỉnh từ 50% lên 60%:
UPDATE doi_tuong SET ti_le_giam_hoc_phi = 60 WHERE ma_doi_tuong = 'DT03';
-- Kết quả: Tất cả phiếu đăng ký của sinh viên thuộc hộ nghèo được cập nhật
```

---

#### 15. `trg_phuong_xa_before_update`
**Mục đích:** Cập nhật tỷ lệ giảm học phí cho tất cả sinh viên khi thay đổi khu vực ưu tiên của phường/xã.

**Input:** Dữ liệu phường/xã trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `khu_vuc` thay đổi
2. Nếu thay đổi thành `KV3`:
   - Tìm sinh viên có `ma_phuong_xa = NEW.ma_phuong_xa` VÀ là dân tộc thiểu số
   - Kiểm tra và gán đối tượng "Vùng sâu vùng xa" nếu đủ điều kiện
   - Cập nhật tỷ lệ giảm cho các phiếu đăng ký
3. Nếu thay đổi từ `KV3` sang khu vực khác:
   - Tìm sinh viên có đối tượng "Vùng sâu vùng xa" từ khu vực này
   - Xóa đối tượng "Vùng sâu vùng xa" (không còn đủ điều kiện)
   - Tính lại tỷ lệ giảm (có thể = 0 nếu không còn đối tượng khác)

**Output:** Cập nhật phiếu đăng ký của sinh viên liên quan

---

#### 16. `trg_dan_toc_before_update`
**Mục đích:** Cập nhật tỷ lệ giảm học phí cho tất cả sinh viên khi thay đổi thuộc tính dân tộc thiểu số.

**Input:** Dữ liệu dân tộc trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `la_dan_toc_thieu_so` thay đổi
2. Nếu thay đổi từ FALSE → TRUE:
   - Tìm sinh viên có `ma_dan_toc = NEW.ma_dan_toc` VÀ ở khu vực KV3
   - Cập nhật tỷ lệ giảm cho các phiếu đăng ký (thêm vào đối tượng vùng sâu vùng xa)
3. Nếu thay đổi từ TRUE → FALSE:
   - Tìm sinh viên không còn đủ điều kiện vùng sâu vùng xa
   - Tính lại tỷ lệ giảm

**Output:** Cập nhật phiếu đăng ký của sinh viên liên quan

---

#### 17. `fn_lay_ti_le_giam_hoc_phi(p_ma_sv VARCHAR)`
**Mục đích:** Lấy tỷ lệ giảm học phí của sinh viên dựa trên đối tượng ưu tiên có độ ưu tiên cao nhất.

**Input:** 
- `p_ma_sv`: Mã sinh viên (VARCHAR(15))

**Logic xử lý:**
1. Tìm tất cả đối tượng của sinh viên từ `doi_tuong_sinh_vien`
2. JOIN với `doi_tuong` để lấy `ti_le_giam_hoc_phi` và `do_uu_tien`
3. Sắp xếp theo `do_uu_tien ASC` (nhỏ nhất = ưu tiên cao nhất)
4. Lấy `ti_le_giam_hoc_phi` của đối tượng có ưu tiên cao nhất
5. Nếu sinh viên không có đối tượng nào, kiểm tra điều kiện "vùng sâu vùng xa":
   - Kiểm tra phường/xã của sinh viên có `khu_vuc = 'KV3'` không
   - Kiểm tra dân tộc của sinh viên có `la_dan_toc_thieu_so = TRUE` không
   - Nếu **CẢ HAI** điều kiện đều đúng → trả về tỷ lệ giảm của đối tượng "Vùng sâu vùng xa" (50%)
   - Ngược lại → trả về 0

**Output:** DECIMAL(5,2) - Tỷ lệ giảm học phí (0-100)

**Ví dụ:**
```sql
-- Sinh viên có 2 đối tượng: "Con liệt sĩ" (100%, độ ưu tiên 1) và "Vùng sâu" (50%, độ ưu tiên 4)
SELECT fn_lay_ti_le_giam_hoc_phi('SV001'); -- Kết quả: 100.00

-- Sinh viên không có đối tượng nhưng ở KV3 VÀ là dân tộc thiểu số
SELECT fn_lay_ti_le_giam_hoc_phi('SV002'); -- Kết quả: 50.00

-- Sinh viên ở KV3 nhưng là dân tộc Kinh (không đủ điều kiện vùng sâu xa)
SELECT fn_lay_ti_le_giam_hoc_phi('SV003'); -- Kết quả: 0.00

-- Sinh viên là dân tộc thiểu số nhưng ở KV1 (không đủ điều kiện vùng sâu xa)
SELECT fn_lay_ti_le_giam_hoc_phi('SV004'); -- Kết quả: 0.00
```

---

#### 9. `fn_kiem_tra_vung_sau_vung_xa(p_ma_sv VARCHAR)`
**Mục đích:** Kiểm tra một sinh viên có thuộc đối tượng vùng sâu/vùng xa hay không.

> ⚠️ **Điều kiện "vùng sâu vùng xa":** Sinh viên thuộc khu vực KV3 **VÀ** là dân tộc thiểu số.

**Input:**
- `p_ma_sv`: Mã sinh viên (VARCHAR(15))

**Logic xử lý:**
1. Lấy thông tin phường/xã của sinh viên từ bảng `sinh_vien` và `phuong_xa`
2. Kiểm tra `khu_vuc = 'KV3'`
3. Lấy thông tin dân tộc của sinh viên từ bảng `dan_toc`
4. Kiểm tra `la_dan_toc_thieu_so = TRUE`
5. Trả về TRUE nếu **CẢ HAI** điều kiện đều thỏa mãn

**Output:** BOOLEAN - TRUE nếu là vùng sâu/xa, FALSE nếu không

**Ví dụ:**
```sql
-- Sinh viên ở KV3 và là người Mông (dân tộc thiểu số)
SELECT fn_kiem_tra_vung_sau_vung_xa('SV001'); -- TRUE

-- Sinh viên ở KV3 nhưng là người Kinh
SELECT fn_kiem_tra_vung_sau_vung_xa('SV002'); -- FALSE

-- Sinh viên là người Thái (DTTS) nhưng ở KV1
SELECT fn_kiem_tra_vung_sau_vung_xa('SV003'); -- FALSE
```

---

#### 19. `fn_validate_cccd(p_cccd VARCHAR)`
**Mục đích:** Kiểm tra số CCCD có hợp lệ hay không (phải có đúng 12 ký tự số).

**Input:**
- `p_cccd`: Số CCCD cần kiểm tra (VARCHAR(20))

**Logic xử lý:**
1. Nếu `p_cccd` là NULL hoặc rỗng → trả về TRUE (CCCD không bắt buộc)
2. Kiểm tra độ dài = 12 ký tự
3. Kiểm tra tất cả ký tự là số (regex: `^[0-9]{12}$`)
4. Trả về TRUE nếu hợp lệ, FALSE nếu không

**Output:** BOOLEAN - TRUE nếu CCCD hợp lệ hoặc rỗng, FALSE nếu không hợp lệ

**Ví dụ:**
```sql
SELECT fn_validate_cccd('079203012345');  -- TRUE (12 số)
SELECT fn_validate_cccd('07920301234');   -- FALSE (11 số)
SELECT fn_validate_cccd('0792030123AB');  -- FALSE (có chữ cái)
SELECT fn_validate_cccd(NULL);            -- TRUE (không bắt buộc)
SELECT fn_validate_cccd('');              -- TRUE (không bắt buộc)
```

---

#### 20. `fn_validate_sdt(p_sdt VARCHAR)`
**Mục đích:** Kiểm tra số điện thoại có hợp lệ hay không.

**Input:**
- `p_sdt`: Số điện thoại cần kiểm tra (VARCHAR(15))

**Logic xử lý:**
1. Nếu `p_sdt` là NULL hoặc rỗng → trả về TRUE (SĐT không bắt buộc)
2. Kiểm tra bắt đầu bằng số 0
3. Kiểm tra tổng độ dài 10-11 ký tự (số 0 đầu + 9-10 số tiếp theo)
4. Kiểm tra tất cả ký tự là số (regex: `^0[0-9]{9,10}$` nghĩa là: 1 số 0 đầu + 9-10 số tiếp theo = tổng 10-11 số)
5. Trả về TRUE nếu hợp lệ, FALSE nếu không

**Output:** BOOLEAN - TRUE nếu SĐT hợp lệ hoặc rỗng, FALSE nếu không hợp lệ

**Ví dụ:**
```sql
SELECT fn_validate_sdt('0901234567');   -- TRUE (10 số tổng cộng: 0 + 9 số)
SELECT fn_validate_sdt('09012345678');  -- TRUE (11 số tổng cộng: 0 + 10 số)
SELECT fn_validate_sdt('84901234567');  -- FALSE (không bắt đầu bằng 0)
SELECT fn_validate_sdt('090123456');    -- FALSE (9 số, quá ngắn)
SELECT fn_validate_sdt(NULL);           -- TRUE (không bắt buộc)
```

---

#### 21. `fn_validate_email(p_email VARCHAR)`
**Mục đích:** Kiểm tra email có định dạng hợp lệ hay không.

**Input:**
- `p_email`: Email cần kiểm tra (VARCHAR(100))

**Logic xử lý:**
1. Nếu `p_email` là NULL hoặc rỗng → trả về TRUE (email không bắt buộc)
2. Kiểm tra có chứa ký tự `@`
3. Kiểm tra có domain sau `@`
4. Kiểm tra định dạng cơ bản (regex: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
5. Trả về TRUE nếu hợp lệ, FALSE nếu không

**Output:** BOOLEAN - TRUE nếu email hợp lệ hoặc rỗng, FALSE nếu không hợp lệ

**Ví dụ:**
```sql
SELECT fn_validate_email('an.nguyen@student.edu.vn');  -- TRUE
SELECT fn_validate_email('invalid-email');             -- FALSE (thiếu @)
SELECT fn_validate_email('test@');                     -- FALSE (thiếu domain)
SELECT fn_validate_email(NULL);                        -- TRUE (không bắt buộc)
```

---

#### 22. `sp_lap_ho_so_sinh_vien(...)`
**Mục đích:** Procedure tạo hồ sơ sinh viên đầy đủ bao gồm: sinh viên, tài khoản, và gán đối tượng (nếu có).

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_sv` | VARCHAR(15) | Có | Mã sinh viên |
| `p_ho_ten` | VARCHAR(100) | Có | Họ tên sinh viên |
| `p_ngay_sinh` | DATE | Có | Ngày sinh |
| `p_gioi_tinh` | VARCHAR(5) | Có | 'Nam' hoặc 'Nữ' |
| `p_ma_phuong_xa` | VARCHAR(20) | Có | Mã phường/xã (quê quán) |
| `p_ma_dan_toc` | VARCHAR(10) | Không | Mã dân tộc (mặc định 'KINH') |
| `p_ma_nganh` | VARCHAR(10) | Có | Mã ngành học |
| `p_cccd` | VARCHAR(20) | Không | Số CCCD |
| `p_sdt` | VARCHAR(15) | Không | Số điện thoại |
| `p_email` | VARCHAR(100) | Không | Email |
| `p_dia_chi` | VARCHAR(200) | Không | Địa chỉ liên hệ |
| `p_ma_doi_tuong` | VARCHAR(10) | Không | Mã đối tượng ưu tiên |

**Logic xử lý:**
1. Bắt đầu TRANSACTION
2. Kiểm tra dữ liệu đầu vào:
   - `ma_sv` không tồn tại
   - `ma_phuong_xa` tồn tại trong bảng `phuong_xa`
   - `ma_dan_toc` tồn tại trong bảng `dan_toc` (nếu có)
   - `ma_nganh` tồn tại trong bảng `nganh_hoc`
   - `ma_doi_tuong` (nếu có) tồn tại trong bảng `doi_tuong`
3. INSERT vào bảng `sinh_vien`
4. Trigger `trg_sinh_vien_after_insert` tự động tạo tài khoản
5. Nếu có `p_ma_doi_tuong` → INSERT vào `doi_tuong_sinh_vien`
6. COMMIT hoặc ROLLBACK nếu có lỗi

**Output:** TEXT - Thông báo kết quả ('Thành công' hoặc thông báo lỗi)

**Ví dụ:**
```sql
SELECT sp_lap_ho_so_sinh_vien(
    'SV001',           -- ma_sv
    'Nguyễn Văn An',   -- ho_ten
    '2003-05-15',      -- ngay_sinh
    'Nam',             -- gioi_tinh
    '2659',            -- ma_phuong_xa (Phường Vũng Tàu, TP.HCM)
    'KINH',            -- ma_dan_toc (Dân tộc Kinh)
    'KTPM',            -- ma_nganh (Kỹ thuật phần mềm)
    '001203012345',    -- cccd
    '0901234567',      -- sdt
    'an.nv@email.com', -- email
    '123 Lê Lợi, Q1',  -- dia_chi
    'DT03'             -- ma_doi_tuong (Hộ nghèo)
);
-- Kết quả: 'Thành công: Đã tạo hồ sơ sinh viên SV001 với tài khoản sv001'
```

---

#### 11. `trg_phuong_xa_before_update`
**Mục đích:** Cập nhật tỷ lệ giảm học phí cho tất cả sinh viên khi thay đổi khu vực ưu tiên của phường/xã.

**Input:** Dữ liệu phường/xã trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `khu_vuc` thay đổi
2. Nếu thay đổi thành `KV3`:
   - Tìm sinh viên có `ma_phuong_xa = NEW.ma_phuong_xa` VÀ là dân tộc thiểu số
   - Kiểm tra và gán đối tượng "Vùng sâu vùng xa" nếu đủ điều kiện
   - Cập nhật tỷ lệ giảm cho các phiếu đăng ký
3. Nếu thay đổi từ `KV3` sang khu vực khác:
   - Tìm sinh viên có đối tượng "Vùng sâu vùng xa" từ khu vực này
   - Xóa đối tượng "Vùng sâu vùng xa" (không còn đủ điều kiện)
   - Tính lại tỷ lệ giảm (có thể = 0 nếu không còn đối tượng khác)

**Output:** Cập nhật phiếu đăng ký của sinh viên liên quan

---

#### 12. `trg_doi_tuong_after_update`
**Mục đích:** Cập nhật tỷ lệ giảm học phí cho tất cả sinh viên thuộc đối tượng khi sửa tỷ lệ giảm của đối tượng ưu tiên.

**Input:** Dữ liệu đối tượng trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `ti_le_giam_hoc_phi` hoặc `do_uu_tien` thay đổi
2. Tìm tất cả sinh viên có đối tượng này từ bảng `doi_tuong_sinh_vien`
3. Với mỗi sinh viên:
   - Gọi `fn_lay_ti_le_giam_hoc_phi(ma_sv)` để tính lại tỷ lệ giảm (cao nhất)
   - Cập nhật lại các phiếu đăng ký có `trang_thai = 'Đã đăng ký'`:
     - `ti_le_giam` = tỷ lệ mới
     - `tien_mien_giam` = `tong_tien_dang_ky * ti_le_giam / 100`
     - `tong_tien_phai_dong` = `tong_tien_dang_ky - tien_mien_giam`

**Output:** Cập nhật các phiếu đăng ký của tất cả sinh viên liên quan

**Ví dụ:**
```sql
-- Đối tượng "Hộ nghèo" (DT03) được điều chỉnh từ 50% lên 60%:
UPDATE doi_tuong SET ti_le_giam_hoc_phi = 60 WHERE ma_doi_tuong = 'DT03';
-- Kết quả: Tất cả phiếu đăng ký của sinh viên thuộc hộ nghèo được cập nhật
```

### Chi tiết yêu cầu:
- **BM1**: Lập hồ sơ sinh viên (Họ tên, Ngày sinh, Giới tính, Quê quán, Dân tộc, Đối tượng, Ngành học)
- **QĐ1**: 
  - Quê quán gồm Phường/Xã và Tỉnh (dữ liệu từ ITExpressLocation.sql)
  - Khu vực ưu tiên: KV1, KV2, KV2-NT, KV3 (theo tra-cuu-khu-vuc-uu-tien-2025.docx)
  - Đối tượng "vùng sâu vùng xa" = KV3 + dân tộc thiểu số
  - Xác định đối tượng ưu tiên có độ ưu tiên cao nhất
  - Tỷ lệ giảm HP: 100%, 80%, 50%, 30%...

---

## 👤 THÀNH VIÊN 2: Quản lý Môn học & Chương trình học

### Phụ trách: BM2, BM3, QĐ2, QĐ3

| STT | Tên Trigger/Function | Mô tả | Bảng liên quan |
|-----|---------------------|-------|----------------|
| 1 | `trg_mon_hoc_before_insert` | Kiểm tra loại môn (LT/TH) và số tiết hợp lệ | `mon_hoc` |
| 2 | `trg_mon_hoc_before_update` | Kiểm tra dữ liệu khi cập nhật môn học | `mon_hoc` |
| 3 | `trg_mon_hoc_after_insert` | Tự động tạo lớp học mặc định cho môn mới | `mon_hoc`, `lop` |
| 4 | `trg_mon_hoc_after_update` | Cập nhật thông tin lớp học khi thay đổi môn học | `mon_hoc`, `lop`, `chi_tiet_dang_ky` |
| 5 | `trg_mon_hoc_before_delete` | Kiểm tra ràng buộc trước khi xóa môn học | `mon_hoc`, `lop`, `chuong_trinh_hoc`, `dieu_kien_mon_hoc` |
| 6 | `fn_tinh_so_tin_chi(loai_mon, so_tiet)` | Tính số tín chỉ theo QĐ2 (LT: số tiết/15, TH: số tiết/30) | - |
| 7 | `trg_lop_before_insert` | Kiểm tra môn học tồn tại, đặt mã lớp | `lop`, `mon_hoc` |
| 8 | `trg_lop_before_update` | Kiểm tra dữ liệu khi cập nhật lớp học | `lop`, `mon_hoc` |
| 9 | `trg_lop_before_delete` | Kiểm tra ràng buộc trước khi xóa lớp học | `lop`, `lop_mo`, `chi_tiet_dang_ky` |
| 10 | `sp_nhap_danh_sach_mon_hoc(...)` | Procedure nhập danh sách môn học (BM2) | `mon_hoc` |
| 11 | `trg_chuong_trinh_hoc_before_insert` | Kiểm tra ngành và môn học hợp lệ | `chuong_trinh_hoc`, `nganh_hoc`, `mon_hoc` |
| 12 | `trg_chuong_trinh_hoc_before_update` | Kiểm tra dữ liệu khi cập nhật chương trình học | `chuong_trinh_hoc`, `nganh_hoc`, `mon_hoc` |
| 13 | `sp_nhap_chuong_trinh_hoc(ma_nganh, ...)` | Procedure nhập chương trình học theo ngành (BM3) | `chuong_trinh_hoc`, `nganh_hoc`, `mon_hoc` |
| 14 | `trg_dieu_kien_mon_hoc_before_insert` | Kiểm tra điều kiện tiên quyết/học trước hợp lệ | `dieu_kien_mon_hoc`, `mon_hoc` |
| 15 | `trg_dieu_kien_mon_hoc_before_update` | Kiểm tra điều kiện khi cập nhật, tránh vòng lặp | `dieu_kien_mon_hoc`, `mon_hoc` |
| 16 | `trg_dieu_kien_mon_hoc_before_delete` | Kiểm tra ảnh hưởng trước khi xóa điều kiện môn học | `dieu_kien_mon_hoc`, `mon_hoc` |
| 17 | `trg_khoa_before_delete` | Kiểm tra có môn học/ngành học tham chiếu không trước khi xóa | `khoa`, `mon_hoc`, `nganh_hoc` |
| 18 | `trg_chuong_trinh_hoc_before_delete` | Kiểm tra ràng buộc trước khi xóa môn trong CTĐT | `chuong_trinh_hoc`, `chi_tiet_dang_ky` |
| 19 | `fn_lay_chuong_trinh_hoc_theo_nganh(ma_nganh)` | Lấy danh sách môn học của ngành theo học kỳ (BM3) | `chuong_trinh_hoc` |

### 📝 MÔ TẢ CHI TIẾT TỪNG TRIGGER/FUNCTION:

#### 1. `trg_mon_hoc_before_insert`
**Mục đích:** Kiểm tra và chuẩn hóa dữ liệu môn học trước khi INSERT, tự động tính số tín chỉ.

**Input:** Dữ liệu môn học mới từ lệnh INSERT (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_mon_hoc` không được NULL và không trùng lặp
2. Kiểm tra `ten_mon_hoc` không được rỗng, chuẩn hóa (trim)
3. Kiểm tra `loai_mon` phải là 'LT' hoặc 'TH'
4. Kiểm tra `so_tiet` > 0
5. Kiểm tra `ma_khoa` tồn tại trong bảng `khoa`
6. **Tự động tính số tín chỉ:**
   - Nếu `loai_mon = 'LT'` → `so_tin_chi = so_tiet / 15` (làm tròn xuống)
   - Nếu `loai_mon = 'TH'` → `so_tin_chi = so_tiet / 30` (làm tròn xuống)
7. Set `ngay_tao = CURRENT_TIMESTAMP`
8. Set `trang_thai = TRUE` nếu không được cung cấp

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- INSERT môn Lý thuyết 45 tiết
INSERT INTO mon_hoc (ma_mon_hoc, ten_mon_hoc, ma_khoa, loai_mon, so_tiet)
VALUES ('LT001', 'Toán cao cấp', 'CNTT', 'LT', 45);
-- Kết quả: so_tin_chi tự động = 45/15 = 3 tín chỉ

-- INSERT môn Thực hành 60 tiết  
INSERT INTO mon_hoc (ma_mon_hoc, ten_mon_hoc, ma_khoa, loai_mon, so_tiet)
VALUES ('TH001', 'Thực hành CSDL', 'CNTT', 'TH', 60);
-- Kết quả: so_tin_chi tự động = 60/30 = 2 tín chỉ
```

---

#### 2. `trg_mon_hoc_before_update`
**Mục đích:** Kiểm tra và chuẩn hóa dữ liệu môn học trước khi UPDATE.

**Input:** Dữ liệu môn học trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `ten_mon_hoc` không được rỗng, chuẩn hóa (trim)
2. Kiểm tra `loai_mon` phải là 'LT' hoặc 'TH'
3. Kiểm tra `so_tiet` > 0
4. Kiểm tra `ma_khoa` tồn tại trong bảng `khoa` (nếu thay đổi)
5. **Tự động tính lại số tín chỉ** nếu `loai_mon` hoặc `so_tiet` thay đổi
6. Không cho phép thay đổi `ma_mon_hoc` (primary key)

**Output:** Cho phép UPDATE nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- Cập nhật số tiết môn học
UPDATE mon_hoc SET so_tiet = 60 WHERE ma_mon_hoc = 'LT001';
-- Kết quả: so_tin_chi tự động được tính lại = 60/15 = 4 tín chỉ
```

---

#### 3. `trg_mon_hoc_after_insert`
**Mục đích:** Tự động tạo một lớp học mặc định cho môn học mới.

**Input:** Dữ liệu môn học vừa được INSERT (NEW.*)

**Logic xử lý:**
1. Tạo mã lớp mặc định: `ma_lop = NEW.ma_mon_hoc || '_01'`
2. Tạo tên lớp: `ten_lop = NEW.ten_mon_hoc || ' - Lớp 01'`
3. INSERT vào bảng `lop` với:
   - `ma_lop`, `ten_lop` như trên
   - `ma_mon_hoc = NEW.ma_mon_hoc`
   - `so_luong_toi_da = 50` (mặc định)
   - `trang_thai = TRUE`

**Output:** Tự động tạo record trong bảng `lop`

**Ví dụ:**
```sql
-- Sau khi INSERT môn học 'LT001':
-- Tự động tạo lớp:
-- | ma_lop   | ten_lop                  | ma_mon_hoc | so_luong_toi_da |
-- | LT001_01 | Toán cao cấp - Lớp 01    | LT001      | 50              |
```

---

#### 4. `trg_mon_hoc_after_update`
**Mục đích:** Cập nhật thông tin liên quan khi thay đổi môn học.

**Input:** Dữ liệu môn học trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Nếu `ten_mon_hoc` thay đổi:
   - Cập nhật `ten_lop` của các lớp thuộc môn học này
2. Nếu `so_tiet` hoặc `loai_mon` thay đổi (làm thay đổi `so_tin_chi`):
   - Cập nhật lại `so_tin_chi` trong `chi_tiet_dang_ky` cho các phiếu đăng ký có `trang_thai = 'Đã đăng ký'`
   - Tính lại `thanh_tien = so_tin_chi * don_gia`
   - Cập nhật tổng tiền của phiếu đăng ký

**Output:** Cập nhật các bảng liên quan

**Ví dụ:**
```sql
-- Cập nhật số tiết môn LT001 từ 45 lên 60 (từ 3 TC lên 4 TC):
UPDATE mon_hoc SET so_tiet = 60 WHERE ma_mon_hoc = 'LT001';
-- Kết quả: Các chi tiết đăng ký môn LT001 được cập nhật so_tin_chi và thanh_tien
```

---

#### 5. `trg_mon_hoc_before_delete`
**Mục đích:** Kiểm tra ràng buộc trước khi xóa môn học, đảm bảo không còn dữ liệu liên quan.

**Input:** Dữ liệu môn học sắp bị xóa (OLD.*)

**Logic xử lý:**
1. Kiểm tra không còn lớp nào thuộc môn học này trong bảng `lop`
2. Kiểm tra không còn trong chương trình học (`chuong_trinh_hoc`)
3. Kiểm tra không còn trong điều kiện môn học (`dieu_kien_mon_hoc`)
4. Kiểm tra không còn sinh viên đang đăng ký môn này (`chi_tiet_dang_ky` với `trang_thai = 'Đã đăng ký'`)
5. Nếu còn dữ liệu liên quan → raise exception với thông báo chi tiết
6. Nếu không còn ràng buộc → cho phép xóa

**Output:** Cho phép DELETE nếu không còn ràng buộc, raise exception nếu còn

**Ví dụ:**
```sql
-- Xóa môn học không còn ràng buộc
DELETE FROM mon_hoc WHERE ma_mon_hoc = 'LT001';
-- Kết quả: Xóa thành công nếu không còn lớp, CTĐT, điều kiện môn học liên quan

-- Xóa môn học còn lớp mở
DELETE FROM mon_hoc WHERE ma_mon_hoc = 'IT001';
-- Kết quả: Error - Không thể xóa: còn 3 lớp thuộc môn học này
```

---

#### 6. `fn_tinh_so_tin_chi(p_loai_mon VARCHAR, p_so_tiet INTEGER)`
**Mục đích:** Tính số tín chỉ dựa trên loại môn và số tiết theo QĐ2.

**Input:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `p_loai_mon` | VARCHAR(5) | Loại môn: 'LT' hoặc 'TH' |
| `p_so_tiet` | INTEGER | Số tiết của môn học |

**Logic xử lý:**
```
Nếu p_loai_mon = 'LT':
    so_tin_chi = p_so_tiet / 15 (làm tròn xuống)
Nếu p_loai_mon = 'TH':
    so_tin_chi = p_so_tiet / 30 (làm tròn xuống)
Ngược lại:
    Raise exception 'Loại môn không hợp lệ'
```

**Output:** INTEGER - Số tín chỉ

**Ví dụ:**
```sql
SELECT fn_tinh_so_tin_chi('LT', 45);  -- Kết quả: 3
SELECT fn_tinh_so_tin_chi('LT', 30);  -- Kết quả: 2
SELECT fn_tinh_so_tin_chi('TH', 60);  -- Kết quả: 2
SELECT fn_tinh_so_tin_chi('TH', 90);  -- Kết quả: 3
SELECT fn_tinh_so_tin_chi('TH', 300); -- Kết quả: 10 (đồ án tốt nghiệp)
```

---

#### 7. `trg_lop_before_insert`
**Mục đích:** Kiểm tra dữ liệu lớp học trước khi INSERT, đảm bảo môn học tồn tại.

**Input:** Dữ liệu lớp mới từ lệnh INSERT (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_mon_hoc` tồn tại trong bảng `mon_hoc`
2. Nếu `ma_lop` không được cung cấp:
   - Đếm số lớp hiện có của môn học
   - Tự động tạo `ma_lop = ma_mon_hoc || '_' || (count + 1)`
3. Kiểm tra `ma_lop` không trùng lặp
4. Kiểm tra `so_luong_toi_da` > 0 (nếu được cung cấp)
5. Set `trang_thai = TRUE` nếu không được cung cấp

**Output:** Cho phép INSERT nếu hợp lệ

**Ví dụ:**
```sql
-- Môn LT001 đã có lớp LT001_01
INSERT INTO lop (ten_lop, ma_mon_hoc, giang_vien)
VALUES ('Toán cao cấp - Lớp 02', 'LT001', 'TS. Nguyễn Văn A');
-- Kết quả: ma_lop tự động = 'LT001_02'
```

---

#### 8. `trg_lop_before_update`
**Mục đích:** Kiểm tra dữ liệu lớp học trước khi UPDATE.

**Input:** Dữ liệu lớp trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_mon_hoc` tồn tại trong bảng `mon_hoc` (nếu thay đổi)
2. Kiểm tra `so_luong_toi_da` > 0
3. Kiểm tra `so_luong_toi_da >= so_luong_da_dang_ky` (từ lop_mo) nếu giảm sức chứa
4. Không cho phép thay đổi `ma_lop` (primary key)
5. Không cho phép thay đổi `ma_mon_hoc` nếu đã có sinh viên đăng ký

**Output:** Cho phép UPDATE nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- Giảm sức chứa lớp khi chưa có ai đăng ký
UPDATE lop SET so_luong_toi_da = 30 WHERE ma_lop = 'LT001_02';
-- Kết quả: OK

-- Giảm sức chứa lớp xuống thấp hơn số đã đăng ký (40 người đã đăng ký)
UPDATE lop SET so_luong_toi_da = 30 WHERE ma_lop = 'IT001.N01';
-- Kết quả: Error - Không thể giảm sức chứa: đã có 40 sinh viên đăng ký
```

---

#### 9. `trg_lop_before_delete`
**Mục đích:** Kiểm tra ràng buộc trước khi xóa lớp học.

**Input:** Dữ liệu lớp sắp bị xóa (OLD.*)

**Logic xử lý:**
1. Kiểm tra không còn trong danh sách lớp mở (`lop_mo`)
2. Kiểm tra không còn sinh viên đang đăng ký lớp này (`chi_tiet_dang_ky` với `trang_thai = 'Đã đăng ký'`)
3. Nếu còn dữ liệu liên quan → raise exception
4. Nếu không còn ràng buộc → cho phép xóa

**Output:** Cho phép DELETE nếu không còn ràng buộc

**Ví dụ:**
```sql
-- Xóa lớp chưa được mở
DELETE FROM lop WHERE ma_lop = 'LT001_02';
-- Kết quả: Xóa thành công

-- Xóa lớp đang có sinh viên đăng ký
DELETE FROM lop WHERE ma_lop = 'IT001.N01';
-- Kết quả: Error - Không thể xóa: lớp đang có 45 sinh viên đăng ký
```

---

#### 10. `sp_nhap_danh_sach_mon_hoc(...)`
**Mục đích:** Procedure nhập danh sách môn học từ dữ liệu JSON hoặc từng môn một.

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_mon_hoc` | VARCHAR(15) | Có | Mã môn học |
| `p_ten_mon_hoc` | VARCHAR(150) | Có | Tên môn học |
| `p_ma_khoa` | VARCHAR(10) | Có | Mã khoa quản lý |
| `p_loai_mon` | VARCHAR(5) | Có | 'LT' hoặc 'TH' |
| `p_so_tiet` | INTEGER | Có | Số tiết |
| `p_mo_ta` | VARCHAR(500) | Không | Mô tả môn học |

**Logic xử lý:**
1. Kiểm tra dữ liệu đầu vào hợp lệ
2. Kiểm tra `ma_khoa` tồn tại
3. Tính `so_tin_chi` dựa trên `loai_mon` và `so_tiet`
4. INSERT vào bảng `mon_hoc`
5. Trigger `trg_mon_hoc_after_insert` tự động tạo lớp mặc định

**Output:** TEXT - Thông báo kết quả

**Ví dụ:**
```sql
SELECT sp_nhap_danh_sach_mon_hoc(
    'CS106',                    -- ma_mon_hoc
    'Trí tuệ nhân tạo',         -- ten_mon_hoc
    'KHMT',                     -- ma_khoa
    'LT',                       -- loai_mon
    45,                         -- so_tiet
    'Nhập môn về AI và ML'      -- mo_ta
);
-- Kết quả: 'Thành công: Đã thêm môn học CS106 (3 tín chỉ) và tạo lớp CS106_01'
```

---

#### 11. `trg_chuong_trinh_hoc_before_insert`
**Mục đích:** Kiểm tra dữ liệu chương trình học trước khi INSERT.

**Input:** Dữ liệu chương trình học mới (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_nganh` tồn tại trong bảng `nganh_hoc`
2. Kiểm tra `ma_mon_hoc` tồn tại trong bảng `mon_hoc`
3. Kiểm tra `hoc_ky_du_kien` hợp lệ (1-10)
4. Kiểm tra không trùng lặp `(ma_nganh, ma_mon_hoc)`
5. Kiểm tra không có vòng lặp điều kiện tiên quyết (môn A tiên quyết B, B tiên quyết A)

**Output:** Cho phép INSERT nếu hợp lệ

---

#### 12. `trg_chuong_trinh_hoc_before_update`
**Mục đích:** Kiểm tra dữ liệu chương trình học trước khi UPDATE.

**Input:** Dữ liệu chương trình học trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_nganh` tồn tại trong bảng `nganh_hoc` (nếu thay đổi)
2. Kiểm tra `ma_mon_hoc` tồn tại trong bảng `mon_hoc` (nếu thay đổi)
3. Kiểm tra `hoc_ky_du_kien` hợp lệ (1-10)
4. Kiểm tra không trùng lặp `(ma_nganh, ma_mon_hoc)` với bản ghi khác
5. Không cho phép thay đổi `ma_nganh` hoặc `ma_mon_hoc` nếu đã có sinh viên đăng ký môn này

**Output:** Cho phép UPDATE nếu hợp lệ

**Ví dụ:**
```sql
-- Đổi học kỳ dự kiến của môn CS106 trong ngành KTPM
UPDATE chuong_trinh_hoc SET hoc_ky_du_kien = 6 WHERE ma_nganh = 'KTPM' AND ma_mon_hoc = 'CS106';
-- Kết quả: OK
```

---

#### 13. `sp_nhap_chuong_trinh_hoc(ma_nganh, ...)`
**Mục đích:** Procedure nhập chương trình đào tạo cho một ngành học.

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_nganh` | VARCHAR(10) | Có | Mã ngành học |
| `p_ma_mon_hoc` | VARCHAR(15) | Có | Mã môn học |
| `p_hoc_ky_du_kien` | INTEGER | Có | Học kỳ dự kiến (1-10) |
| `p_bat_buoc` | BOOLEAN | Không | Môn bắt buộc? Mặc định TRUE |
| `p_ghi_chu` | VARCHAR(200) | Không | Ghi chú |

**Logic xử lý:**
1. Kiểm tra ngành học tồn tại và đang hoạt động
2. Kiểm tra môn học tồn tại
3. Kiểm tra chưa có trong CTĐT
4. INSERT vào bảng `chuong_trinh_hoc`

**Output:** TEXT - Thông báo kết quả

**Ví dụ:**
```sql
-- Thêm môn "Trí tuệ nhân tạo" vào CTĐT ngành KTPM, học kỳ 5
SELECT sp_nhap_chuong_trinh_hoc('KTPM', 'CS106', 5, TRUE, 'Môn chuyên ngành');
-- Kết quả: 'Thành công: Đã thêm CS106 vào CTĐT ngành KTPM, HK5'
```

---

#### 14. `trg_dieu_kien_mon_hoc_before_insert`
**Mục đích:** Kiểm tra điều kiện tiên quyết/học trước hợp lệ, tránh vòng lặp.

**Input:** Dữ liệu điều kiện môn học mới (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_mon_hoc` và `ma_mon_dieu_kien` tồn tại
2. Kiểm tra `ma_mon_hoc != ma_mon_dieu_kien` (không tự làm điều kiện của chính nó)
3. Kiểm tra `loai_dieu_kien` là 'tien_quyet' hoặc 'hoc_truoc'
4. **Kiểm tra vòng lặp:**
   - Nếu A tiên quyết B, không được có B tiên quyết A
   - Sử dụng đệ quy để kiểm tra chuỗi điều kiện
5. Kiểm tra không trùng lặp `(ma_mon_hoc, ma_mon_dieu_kien, loai_dieu_kien)`

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu phát hiện vòng lặp

**Ví dụ:**
```sql
-- CS106 tiên quyết IT003 ✓
INSERT INTO dieu_kien_mon_hoc (ma_mon_hoc, ma_mon_dieu_kien, loai_dieu_kien)
VALUES ('CS106', 'IT003', 'hoc_truoc');

-- Nếu IT003 đã tiên quyết CS106 → Error: Phát hiện vòng lặp điều kiện
```

---

#### 15. `trg_dieu_kien_mon_hoc_before_update`
**Mục đích:** Kiểm tra điều kiện tiên quyết/học trước hợp lệ khi UPDATE, tránh vòng lặp.

**Input:** Dữ liệu điều kiện môn học trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_mon_hoc` và `ma_mon_dieu_kien` tồn tại (nếu thay đổi)
2. Kiểm tra `ma_mon_hoc != ma_mon_dieu_kien`
3. Kiểm tra `loai_dieu_kien` là 'tien_quyet' hoặc 'hoc_truoc'
4. **Kiểm tra vòng lặp:** tương tự trigger INSERT
5. Kiểm tra không trùng lặp `(ma_mon_hoc, ma_mon_dieu_kien, loai_dieu_kien)` với bản ghi khác

**Output:** Cho phép UPDATE nếu hợp lệ, raise exception nếu phát hiện vòng lặp

**Ví dụ:**
```sql
-- Đổi loại điều kiện từ 'hoc_truoc' sang 'tien_quyet'
UPDATE dieu_kien_mon_hoc SET loai_dieu_kien = 'tien_quyet' 
WHERE ma_mon_hoc = 'CS106' AND ma_mon_dieu_kien = 'IT003';
-- Kết quả: OK nếu không tạo vòng lặp
```

---

#### 16. `fn_lay_chuong_trinh_hoc_theo_nganh(p_ma_nganh VARCHAR)`
**Mục đích:** Lấy danh sách môn học của một ngành, sắp xếp theo học kỳ dự kiến.

**Input:**
- `p_ma_nganh`: Mã ngành học (VARCHAR(10))

**Logic xử lý:**
1. Truy vấn bảng `chuong_trinh_hoc` với `ma_nganh = p_ma_nganh`
2. JOIN với `mon_hoc` để lấy thông tin môn học
3. Sắp xếp theo `hoc_ky_du_kien ASC`
4. Trả về JSON hoặc TABLE chứa danh sách môn

**Output:** TABLE hoặc JSON - Danh sách môn học theo học kỳ

**Ví dụ:**
```sql
SELECT * FROM fn_lay_chuong_trinh_hoc_theo_nganh('KTPM');
-- Kết quả:
-- | hoc_ky | ma_mon_hoc | ten_mon_hoc           | so_tin_chi | bat_buoc |
-- |--------|------------|-----------------------|------------|----------|
-- | 1      | MA006      | Giải tích             | 4          | true     |
-- | 1      | IT001      | Nhập môn lập trình    | 4          | true     |
-- | 2      | IT003      | CTDL&GT               | 4          | true     |
-- | 2      | IT004      | Cơ sở dữ liệu         | 4          | true     |
-- | 5      | CS106      | Trí tuệ nhân tạo      | 4          | false    |
```

### Chi tiết yêu cầu:
- **BM2**: Nhập danh sách môn học (Mã MH, Tên MH, Loại môn, Số tiết)
- **QĐ2**: 
  - Loại môn: LT (Lý thuyết) hoặc TH (Thực hành)
  - Số tín chỉ = số tiết/15 (LT) hoặc số tiết/30 (TH)
- **BM3**: Chương trình học theo ngành và khoa
- **QĐ3**: Dựa trên chương trình học để mở môn trong học kỳ

---

## 👤 THÀNH VIÊN 3: Quản lý Học kỳ & Đăng ký môn học

### Phụ trách: BM4, BM5, QĐ4, QĐ5, Quản lý Lịch học & Giới hạn tín chỉ

| STT | Tên Trigger/Function | Mô tả | Bảng liên quan |
|-----|---------------------|-------|----------------|
| 1 | `trg_hoc_ky_before_insert` | Kiểm tra năm học, loại học kỳ (Chính/Hè) | `hoc_ky`, `nam_hoc` |
| 2 | `trg_hoc_ky_before_update` | Kiểm tra dữ liệu khi cập nhật học kỳ | `hoc_ky`, `nam_hoc` |
| 3 | `sp_mo_lop_trong_hoc_ky(ma_hoc_ky, ...)` | Procedure mở lớp học trong học kỳ (BM4) | `lop_mo`, `hoc_ky`, `lop` |
| 4 | `trg_lop_mo_before_insert` | Kiểm tra lớp và học kỳ hợp lệ | `lop_mo`, `lop`, `hoc_ky` |
| 5 | `trg_lop_mo_before_update` | Kiểm tra dữ liệu khi cập nhật lớp mở | `lop_mo`, `lop`, `hoc_ky` |
| 6 | `trg_lop_mo_before_delete` | Kiểm tra ràng buộc trước khi xóa lớp mở | `lop_mo`, `chi_tiet_dang_ky`, `lich_hoc_lop` |
| 7 | `fn_lay_don_gia(loai_mon, loai_hoc, ma_hoc_ky)` | Lấy đơn giá tín chỉ theo loại môn và loại học (QĐ5) | `don_gia_tin_chi`, `hoc_ky` |
| 8 | `trg_phieu_dang_ky_before_insert` | Kiểm tra SV và học kỳ hợp lệ, tính tỷ lệ giảm | `phieu_dang_ky`, `sinh_vien`, `hoc_ky` |
| 9 | `trg_phieu_dang_ky_before_update` | Kiểm tra dữ liệu khi cập nhật phiếu đăng ký | `phieu_dang_ky`, `sinh_vien`, `hoc_ky` |
| 10 | `sp_dang_ky_lop(ma_sv, ma_hoc_ky, ma_lop, loai_dang_ky)` | Procedure đăng ký lớp học (BM5) | `phieu_dang_ky`, `chi_tiet_dang_ky`, `lop_mo` |
| 11 | `trg_chi_tiet_dang_ky_after_insert` | Cập nhật tổng tín chỉ và tổng tiền phiếu đăng ký | `chi_tiet_dang_ky`, `phieu_dang_ky` |
| 12 | `trg_chi_tiet_dang_ky_after_update` | Cập nhật khi hủy môn đăng ký | `chi_tiet_dang_ky`, `phieu_dang_ky`, `lop_mo` |
| 13 | `trg_chi_tiet_dang_ky_after_delete` | Cập nhật tổng tiền phiếu đăng ký khi xóa chi tiết | `chi_tiet_dang_ky`, `phieu_dang_ky`, `lop_mo` |
| 14 | `fn_kiem_tra_lop_mo(ma_hoc_ky, ma_lop)` | Kiểm tra lớp có mở trong học kỳ không (QĐ5) | `lop_mo` |
| 15 | `fn_kiem_tra_si_so_lop(ma_lop, ma_hoc_ky)` | Kiểm tra sĩ số còn chỗ trống | `lop_mo`, `lop` |
| 16 | `sp_huy_dang_ky_lop(ma_sv, ma_hoc_ky, ma_lop)` | Procedure hủy đăng ký lớp | `chi_tiet_dang_ky`, `phieu_dang_ky`, `lop_mo` |
| 17 | `fn_kiem_tra_gioi_han_tin_chi(ma_sv, ma_hoc_ky, so_tin_chi_moi)` | Kiểm tra giới hạn tín chỉ đăng ký (max 24, vượt cần GPA >= 8.5) | `cau_hinh_dang_ky`, `diem_sinh_vien`, `phieu_dang_ky` |
| 18 | `fn_tinh_gpa_tich_luy(ma_sv)` | Tính điểm trung bình tích lũy (GPA) của sinh viên | `diem_sinh_vien` |
| 19 | `fn_kiem_tra_trung_lich(ma_sv, ma_hoc_ky, lop_mo_id)` | Kiểm tra trùng lịch học khi đăng ký | `lich_hoc_lop`, `chi_tiet_dang_ky` |
| 20 | `trg_lich_hoc_lop_before_insert` | Kiểm tra lịch học hợp lệ khi thêm | `lich_hoc_lop`, `tiet_hoc`, `lop_mo` |
| 21 | `trg_lich_hoc_lop_before_update` | Kiểm tra lịch học khi cập nhật | `lich_hoc_lop`, `tiet_hoc`, `lop_mo` |
| 22 | `trg_lich_hoc_lop_before_delete` | Kiểm tra ràng buộc trước khi xóa lịch học | `lich_hoc_lop`, `chi_tiet_dang_ky` |
| 23 | `trg_hoc_ky_before_delete` | Kiểm tra có phiếu đăng ký/lớp mở không trước khi xóa | `hoc_ky`, `phieu_dang_ky`, `lop_mo` |
| 24 | `trg_nam_hoc_before_delete` | Kiểm tra có học kỳ tham chiếu không trước khi xóa | `nam_hoc`, `hoc_ky` |
| 25 | `trg_nam_hoc_before_update` | Cập nhật mã học kỳ nếu đổi năm học | `nam_hoc`, `hoc_ky` |
| 26 | `trg_phieu_dang_ky_before_delete` | Kiểm tra có chi tiết đăng ký/phiếu thu không trước khi xóa | `phieu_dang_ky`, `chi_tiet_dang_ky`, `phieu_thu_hoc_phi` |
| 27 | `trg_chi_tiet_dang_ky_before_insert` | Kiểm tra điều kiện tiên quyết, trùng lịch trước khi đăng ký | `chi_tiet_dang_ky`, `dieu_kien_mon_hoc`, `lich_hoc_lop` |
| 28 | `trg_don_gia_tin_chi_before_delete` | Kiểm tra có chi tiết đăng ký tham chiếu không | `don_gia_tin_chi`, `chi_tiet_dang_ky` |
| 29 | `trg_don_gia_tin_chi_after_update` | Cập nhật thành tiền trong chi tiết đăng ký khi đổi giá | `don_gia_tin_chi`, `chi_tiet_dang_ky`, `phieu_dang_ky` |
| 30 | `trg_tiet_hoc_before_delete` | Kiểm tra có lịch học tham chiếu không | `tiet_hoc`, `lich_hoc_lop` |
| 31 | `trg_tiet_hoc_before_update` | Cập nhật lịch học khi đổi thông tin tiết | `tiet_hoc`, `lich_hoc_lop` |
| 32 | `sp_them_lich_hoc_lop(lop_mo_id, thu, tiet_bd, tiet_kt, phong)` | Procedure thêm lịch học cho lớp mở | `lich_hoc_lop`, `tiet_hoc` |

### 📝 MÔ TẢ CHI TIẾT TỪNG TRIGGER/FUNCTION:

#### 1. `trg_hoc_ky_before_insert`
**Mục đích:** Kiểm tra dữ liệu học kỳ trước khi INSERT, đảm bảo tính hợp lệ.

**Input:** Dữ liệu học kỳ mới (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_nam_hoc` tồn tại trong bảng `nam_hoc`
2. Kiểm tra `loai_hoc_ky` phải là 'Chính' hoặc 'Hè'
3. Kiểm tra `thu_tu` hợp lệ:
   - Loại 'Chính': thu_tu = 1 hoặc 2 (HK I, HK II)
   - Loại 'Hè': thu_tu = 3
4. Kiểm tra không trùng lặp học kỳ trong cùng năm học
5. Kiểm tra ngày bắt đầu < ngày kết thúc
6. Kiểm tra ngày bắt đầu đăng ký < ngày kết thúc đăng ký
7. Kiểm tra hạn đóng học phí hợp lệ
8. Set `trang_thai = 'Sắp diễn ra'` nếu không được cung cấp

**Output:** Cho phép INSERT nếu hợp lệ

**Ví dụ:**
```sql
INSERT INTO hoc_ky (ma_hoc_ky, ten_hoc_ky, ma_nam_hoc, loai_hoc_ky, thu_tu, 
                    ngay_bat_dau, ngay_ket_thuc, han_dong_hoc_phi)
VALUES ('HK1-2526', 'Học kỳ I - 2025-2026', '2025-2026', 'Chính', 1,
        '2025-09-01', '2026-01-15', '2025-10-31');
```

---

#### 2. `trg_hoc_ky_before_update`
**Mục đích:** Kiểm tra dữ liệu học kỳ trước khi UPDATE.

**Input:** Dữ liệu học kỳ trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_nam_hoc` tồn tại (nếu thay đổi)
2. Kiểm tra `loai_hoc_ky` hợp lệ
3. Kiểm tra `thu_tu` hợp lệ theo loại học kỳ
4. Kiểm tra ngày bắt đầu < ngày kết thúc
5. Kiểm tra ngày đăng ký hợp lệ
6. Không cho phép thay đổi `ma_hoc_ky` (primary key)
7. Không cho phép thay đổi `loai_hoc_ky` nếu đã có phiếu đăng ký

**Output:** Cho phép UPDATE nếu hợp lệ

**Ví dụ:**
```sql
-- Cập nhật hạn đóng học phí
UPDATE hoc_ky SET han_dong_hoc_phi = '2025-11-15' WHERE ma_hoc_ky = 'HK1-2526';
-- Kết quả: OK
```

---

#### 3. `sp_mo_lop_trong_hoc_ky(ma_hoc_ky, ...)`
**Mục đích:** Procedure mở một hoặc nhiều lớp học trong học kỳ theo BM4.

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_hoc_ky` | VARCHAR(15) | Có | Mã học kỳ |
| `p_ma_lop` | VARCHAR(20) | Có | Mã lớp cần mở |
| `p_ghi_chu` | VARCHAR(200) | Không | Ghi chú |

**Logic xử lý:**
1. Kiểm tra `ma_hoc_ky` tồn tại và học kỳ đang trong thời gian đăng ký
2. Kiểm tra `ma_lop` tồn tại trong bảng `lop`
3. Kiểm tra lớp chưa được mở trong học kỳ này
4. INSERT vào bảng `lop_mo` với `so_luong_da_dang_ky = 0`

**Output:** TEXT - Thông báo kết quả

**Ví dụ:**
```sql
-- Mở lớp CS106_01 trong HK1-2526
SELECT sp_mo_lop_trong_hoc_ky('HK1-2526', 'CS106_01', 'Lớp buổi sáng');
-- Kết quả: 'Thành công: Đã mở lớp CS106_01 trong học kỳ HK1-2526'

-- Mở nhiều lớp (gọi nhiều lần hoặc dùng batch)
SELECT sp_mo_lop_trong_hoc_ky('HK1-2526', 'CS106_02', 'Lớp buổi chiều');
SELECT sp_mo_lop_trong_hoc_ky('HK1-2526', 'IT003_01', NULL);
```

---

#### 4. `trg_lop_mo_before_insert`
**Mục đích:** Kiểm tra dữ liệu lớp mở trước khi INSERT.

**Input:** Dữ liệu lớp mở mới (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_hoc_ky` tồn tại
2. Kiểm tra `ma_lop` tồn tại
3. Kiểm tra không trùng lặp `(ma_hoc_ky, ma_lop)`
4. Set `so_luong_da_dang_ky = 0` nếu không được cung cấp
5. Set `trang_thai = TRUE`

**Output:** Cho phép INSERT nếu hợp lệ

---

#### 5. `trg_lop_mo_before_update`
**Mục đích:** Kiểm tra dữ liệu lớp mở trước khi UPDATE.

**Input:** Dữ liệu lớp mở trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_hoc_ky` tồn tại (nếu thay đổi)
2. Kiểm tra `ma_lop` tồn tại (nếu thay đổi)
3. Không cho phép giảm `so_luong_da_dang_ky` thủ công (chỉ được cập nhật qua hệ thống)
4. Không cho phép thay đổi `ma_hoc_ky` hoặc `ma_lop` nếu đã có sinh viên đăng ký

**Output:** Cho phép UPDATE nếu hợp lệ

**Ví dụ:**
```sql
-- Cập nhật ghi chú lớp mở
UPDATE lop_mo SET ghi_chu = 'Lớp sáng thứ 2-4' WHERE id = 1;
-- Kết quả: OK
```

---

#### 6. `trg_lop_mo_before_delete`
**Mục đích:** Kiểm tra ràng buộc trước khi xóa lớp mở.

**Input:** Dữ liệu lớp mở sắp bị xóa (OLD.*)

**Logic xử lý:**
1. Kiểm tra không còn sinh viên đăng ký lớp này (`chi_tiet_dang_ky` với `trang_thai = 'Đã đăng ký'`)
2. Kiểm tra không còn lịch học của lớp này (`lich_hoc_lop`)
3. Nếu còn dữ liệu liên quan → raise exception
4. Nếu không còn ràng buộc → cho phép xóa và giảm `so_luong_da_dang_ky` nếu cần

**Output:** Cho phép DELETE nếu không còn ràng buộc

**Ví dụ:**
```sql
-- Xóa lớp mở không có ai đăng ký
DELETE FROM lop_mo WHERE id = 100;
-- Kết quả: OK

-- Xóa lớp mở đang có sinh viên đăng ký
DELETE FROM lop_mo WHERE id = 1;
-- Kết quả: Error - Không thể xóa: lớp đang có 45 sinh viên đăng ký
```

---

#### 7. `fn_lay_don_gia(p_loai_mon, p_loai_hoc, p_ma_hoc_ky)`
**Mục đích:** Lấy đơn giá tín chỉ theo loại môn, loại học và học kỳ theo QĐ5.

**Input:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `p_loai_mon` | VARCHAR(5) | Loại môn: 'LT' hoặc 'TH' |
| `p_loai_hoc` | VARCHAR(20) | Loại học: 'hoc_moi', 'hoc_lai', 'hoc_cai_thien', 'hoc_he' |
| `p_ma_hoc_ky` | VARCHAR(15) | Mã học kỳ (để xác định học kỳ hè) |

**Logic xử lý:**
1. Nếu `p_ma_hoc_ky` được cung cấp:
   - Kiểm tra loại học kỳ
   - Nếu là học kỳ hè và `p_loai_hoc = 'hoc_moi'` → dùng giá 'hoc_he'
2. Truy vấn bảng `don_gia_tin_chi` với `loai_mon` và `loai_hoc`
3. Ưu tiên đơn giá cụ thể cho học kỳ, nếu không có thì lấy đơn giá chung
4. Nếu không tìm thấy trong CSDL, trả về giá mặc định theo QĐ5:

| Loại môn | Loại học | Đơn giá (VNĐ/TC) |
|----------|----------|------------------|
| LT | hoc_moi | 27,000 |
| TH | hoc_moi | 37,000 |
| LT | hoc_lai | 32,000 |
| TH | hoc_lai | 42,000 |
| LT | hoc_cai_thien | 30,000 |
| TH | hoc_cai_thien | 40,000 |
| LT | hoc_he | 35,000 |
| TH | hoc_he | 45,000 |

**Output:** DECIMAL(12,0) - Đơn giá tín chỉ (VNĐ)

**Ví dụ:**
```sql
-- Môn LT học mới trong kỳ chính
SELECT fn_lay_don_gia('LT', 'hoc_moi', 'HK1-2526');    -- 27,000

-- Môn TH học lại
SELECT fn_lay_don_gia('TH', 'hoc_lai', 'HK1-2526');   -- 42,000

-- Môn LT học mới trong kỳ hè (tự động áp dụng giá hè)
SELECT fn_lay_don_gia('LT', 'hoc_moi', 'HKHe-2526'); -- 35,000
```

---

#### 8. `trg_phieu_dang_ky_before_insert`
**Mục đích:** Kiểm tra dữ liệu phiếu đăng ký, tự động tính tỷ lệ giảm học phí.

**Input:** Dữ liệu phiếu đăng ký mới (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_sv` tồn tại và đang học
2. Kiểm tra `ma_hoc_ky` tồn tại và đang trong thời gian đăng ký
3. Kiểm tra sinh viên chưa có phiếu đăng ký trong học kỳ này
4. **Tự động tính tỷ lệ giảm:**
   - Gọi `fn_lay_ti_le_giam_hoc_phi(NEW.ma_sv)`
   - Set `NEW.ti_le_giam` = kết quả
5. Set `ngay_lap = CURRENT_TIMESTAMP`
6. Set `trang_thai = 'Đã đăng ký'`
7. Khởi tạo các giá trị = 0:
   - `tong_tin_chi`, `tong_tien_dang_ky`, `tien_mien_giam`, `tong_tien_phai_dong`

**Output:** Cho phép INSERT nếu hợp lệ

---

#### 9. `trg_phieu_dang_ky_before_update`
**Mục đích:** Kiểm tra dữ liệu phiếu đăng ký trước khi UPDATE.

**Input:** Dữ liệu phiếu đăng ký trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_sv` tồn tại và đang học (nếu thay đổi - thường không cho phép)
2. Kiểm tra `ma_hoc_ky` hợp lệ (nếu thay đổi - thường không cho phép)
3. Không cho phép thay đổi `so_phieu` (primary key)
4. Không cho phép thay đổi `ma_sv`, `ma_hoc_ky` nếu đã có chi tiết đăng ký
5. Nếu `trang_thai` thay đổi sang 'Đã hủy':
   - Kiểm tra tất cả chi tiết đăng ký đã bị hủy chưa
   - Nếu còn chi tiết chưa hủy → raise exception
6. Set `ngay_cap_nhat = CURRENT_TIMESTAMP`

**Output:** Cho phép UPDATE nếu hợp lệ

**Ví dụ:**
```sql
-- Cập nhật ghi chú phiếu đăng ký
UPDATE phieu_dang_ky SET ghi_chu = 'Đã xác nhận' WHERE so_phieu = 1;
-- Kết quả: OK
```

---

#### 10. `sp_dang_ky_lop(ma_sv, ma_hoc_ky, ma_lop, loai_dang_ky)`
**Mục đích:** Procedure đăng ký lớp học cho sinh viên theo BM5, QĐ5.

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_sv` | VARCHAR(15) | Có | Mã sinh viên |
| `p_ma_hoc_ky` | VARCHAR(15) | Có | Mã học kỳ |
| `p_ma_lop` | VARCHAR(20) | Có | Mã lớp cần đăng ký |
| `p_loai_dang_ky` | VARCHAR(20) | Không | 'hoc_moi'(mặc định), 'hoc_lai', 'hoc_cai_thien' |

**Logic xử lý:**
1. **Kiểm tra lớp có mở:**
   - Gọi `fn_kiem_tra_lop_mo(p_ma_hoc_ky, p_ma_lop)`
   - Nếu FALSE → trả về lỗi
2. **Kiểm tra sĩ số:**
   - Gọi `fn_kiem_tra_si_so_lop(p_ma_lop, p_ma_hoc_ky)`
   - Nếu FALSE → trả về "Lớp đã đầy"
3. **Kiểm tra điều kiện tiên quyết** (nếu loại = 'hoc_moi'):
   - Kiểm tra sinh viên đã hoàn thành môn tiên quyết chưa
4. **Lấy/tạo phiếu đăng ký:**
   - Tìm phiếu đăng ký của SV trong HK
   - Nếu chưa có → tự động tạo mới
5. **Kiểm tra chưa đăng ký lớp này:**
   - Kiểm tra trong `chi_tiet_dang_ky`
6. **Lấy thông tin môn học:**
   - `so_tin_chi`, `loai_mon` từ bảng `mon_hoc` (qua `lop`)
7. **Tính tiền:**
   - `don_gia = fn_lay_don_gia(loai_mon, p_loai_dang_ky, p_ma_hoc_ky)`
   - `thanh_tien = so_tin_chi * don_gia`
8. **INSERT chi tiết đăng ký:**
   - Thêm vào `chi_tiet_dang_ky`
   - Trigger `trg_chi_tiet_dang_ky_after_insert` sẽ cập nhật tổng tiền phiếu
9. **Cập nhật sĩ số lớp mở:**
   - UPDATE `lop_mo` SET `so_luong_da_dang_ky += 1`

**Output:** TEXT - Thông báo kết quả

**Ví dụ:**
```sql
-- Đăng ký học mới
SELECT sp_dang_ky_lop('SV001', 'HK1-2526', 'CS106_01', 'hoc_moi');
-- Kết quả: 'Thành công: Đã đăng ký lớp CS106_01 (3 TC x 27,000đ = 81,000đ)'

-- Đăng ký học lại
SELECT sp_dang_ky_lop('SV002', 'HK1-2526', 'IT003_01', 'hoc_lai');
-- Kết quả: 'Thành công: Đã đăng ký học lại lớp IT003_01 (4 TC x 32,000đ = 128,000đ)'

-- Lớp đã đầy
SELECT sp_dang_ky_lop('SV003', 'HK1-2526', 'CS106_01', 'hoc_moi');
-- Kết quả: 'Lỗi: Lớp CS106_01 đã đầy (50/50)'
```

---

#### 11. `trg_chi_tiet_dang_ky_after_insert`
**Mục đích:** Cập nhật tổng tín chỉ và tổng tiền của phiếu đăng ký sau khi thêm chi tiết.

**Input:** Dữ liệu chi tiết đăng ký vừa INSERT (NEW.*)

**Logic xử lý:**
1. Tìm phiếu đăng ký tương ứng (NEW.so_phieu)
2. Tính lại các tổng từ bảng `chi_tiet_dang_ky`:
   ```sql
   tong_tin_chi = SUM(so_tin_chi) WHERE trang_thai = 'Đã đăng ký'
   tong_tien_dang_ky = SUM(thanh_tien) WHERE trang_thai = 'Đã đăng ký'
   ```
3. Tính tiền miễn giảm và tiền phải đóng:
   ```sql
   tien_mien_giam = tong_tien_dang_ky * ti_le_giam / 100
   tong_tien_phai_dong = tong_tien_dang_ky - tien_mien_giam
   ```
4. UPDATE phiếu đăng ký với các giá trị mới

**Output:** Cập nhật phiếu đăng ký

**Ví dụ:**
```sql
-- Sau khi đăng ký lớp CS106_01 (3 TC, 81,000đ):
-- Phiếu đăng ký được cập nhật:
-- | so_phieu | tong_tin_chi | tong_tien_dang_ky | ti_le_giam | tien_mien_giam | tong_tien_phai_dong |
-- | 1        | 3            | 81,000            | 50         | 40,500         | 40,500              |
```

---

#### 12. `trg_chi_tiet_dang_ky_after_update`
**Mục đích:** Xử lý khi sinh viên hủy đăng ký môn học (UPDATE trang_thai = 'Đã hủy').

**Input:** Dữ liệu chi tiết đăng ký trước và sau UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `trang_thai` thay đổi từ 'Đã đăng ký' → 'Đã hủy':
   - Cập nhật `ngay_huy = CURRENT_TIMESTAMP`
   - Giảm `so_luong_da_dang_ky` của lớp mở đi 1
   - Tính lại tổng tiền phiếu đăng ký (tương tự trigger INSERT)

**Output:** Cập nhật phiếu đăng ký và lớp mở

---

#### 13. `trg_chi_tiet_dang_ky_after_delete`
**Mục đích:** Cập nhật tổng tiền phiếu đăng ký khi xóa chi tiết đăng ký.

**Input:** Dữ liệu chi tiết đăng ký bị xóa (OLD.*)

**Logic xử lý:**
1. Tìm phiếu đăng ký tương ứng (OLD.so_phieu)
2. Giảm `so_luong_da_dang_ky` của lớp mở đi 1 (nếu `OLD.trang_thai = 'Đã đăng ký'`)
3. Tính lại các tổng từ bảng `chi_tiet_dang_ky`:
   ```sql
   tong_tin_chi = SUM(so_tin_chi) WHERE trang_thai = 'Đã đăng ký'
   tong_tien_dang_ky = SUM(thanh_tien) WHERE trang_thai = 'Đã đăng ký'
   ```
4. Tính lại tiền miễn giảm và tiền phải đóng
5. UPDATE phiếu đăng ký với các giá trị mới

**Output:** Cập nhật phiếu đăng ký và lớp mở

**Ví dụ:**
```sql
-- Xóa chi tiết đăng ký (trường hợp admin xử lý lỗi):
DELETE FROM chi_tiet_dang_ky WHERE id = 100;
-- Kết quả: Phiếu đăng ký và lớp mở được cập nhật tự động
```

---

#### 14. `fn_kiem_tra_lop_mo(p_ma_hoc_ky, p_ma_lop)`
**Mục đích:** Kiểm tra một lớp có được mở trong học kỳ hay không.

**Input:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `p_ma_hoc_ky` | VARCHAR(15) | Mã học kỳ |
| `p_ma_lop` | VARCHAR(20) | Mã lớp |

**Logic xử lý:**
1. Truy vấn bảng `lop_mo` với điều kiện:
   - `ma_hoc_ky = p_ma_hoc_ky`
   - `ma_lop = p_ma_lop`
   - `trang_thai = TRUE`
2. Trả về TRUE nếu tìm thấy, FALSE nếu không

**Output:** BOOLEAN

**Ví dụ:**
```sql
SELECT fn_kiem_tra_lop_mo('HK1-2526', 'CS106_01');  -- TRUE
SELECT fn_kiem_tra_lop_mo('HK1-2526', 'CS999_01');  -- FALSE (lớp không mở)
```

---

#### 15. `fn_kiem_tra_si_so_lop(p_ma_lop, p_ma_hoc_ky)`
**Mục đích:** Kiểm tra lớp còn chỗ trống để đăng ký không.

**Input:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `p_ma_lop` | VARCHAR(20) | Mã lớp |
| `p_ma_hoc_ky` | VARCHAR(15) | Mã học kỳ |

**Logic xử lý:**
1. Lấy `so_luong_toi_da` từ bảng `lop`
2. Lấy `so_luong_da_dang_ky` từ bảng `lop_mo`
3. So sánh: `so_luong_da_dang_ky < so_luong_toi_da`

**Output:** BOOLEAN - TRUE nếu còn chỗ, FALSE nếu đầy

**Ví dụ:**
```sql
-- Lớp có sức chứa 50, đã đăng ký 30
SELECT fn_kiem_tra_si_so_lop('CS106_01', 'HK1-2526');  -- TRUE

-- Lớp đã đầy (50/50)
SELECT fn_kiem_tra_si_so_lop('IT003_01', 'HK1-2526');  -- FALSE
```

---

#### 16. `sp_huy_dang_ky_lop(ma_sv, ma_hoc_ky, ma_lop)`
**Mục đích:** Procedure hủy đăng ký lớp học của sinh viên.

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_sv` | VARCHAR(15) | Có | Mã sinh viên |
| `p_ma_hoc_ky` | VARCHAR(15) | Có | Mã học kỳ |
| `p_ma_lop` | VARCHAR(20) | Có | Mã lớp cần hủy |
| `p_ly_do` | VARCHAR(200) | Không | Lý do hủy |

**Logic xử lý:**
1. Kiểm tra học kỳ còn trong thời gian cho phép hủy đăng ký
2. Tìm phiếu đăng ký của sinh viên
3. Tìm chi tiết đăng ký của lớp
4. Kiểm tra trạng thái = 'Đã đăng ký'
5. UPDATE chi tiết đăng ký:
   - `trang_thai = 'Đã hủy'`
   - `ngay_huy = CURRENT_TIMESTAMP`
   - `ly_do_huy = p_ly_do`
6. Trigger `trg_chi_tiet_dang_ky_after_update` sẽ cập nhật phiếu và lớp mở

**Output:** TEXT - Thông báo kết quả

**Ví dụ:**
```sql
SELECT sp_huy_dang_ky_lop('SV001', 'HK1-2526', 'CS106_01', 'Trùng lịch');
-- Kết quả: 'Thành công: Đã hủy đăng ký lớp CS106_01. Hoàn trả 81,000đ vào phiếu.'
```

### Chi tiết yêu cầu:
- **BM4**: Danh sách môn học mở trong học kỳ (Học kỳ, Năm học, Môn học)
- **QĐ4**: 
  - 2 học kỳ chính (HK I, HK II)
  - Có thể có học kỳ hè (tùy theo nhu cầu)
- **BM5**: Phiếu đăng ký học phần (Số phiếu, MSSV, Ngày lập, Học kỳ, Năm học, Môn học, Số tín chỉ)
- **QĐ5**: 
  - Đơn giá: LT = 27,000đ/TC, TH = 37,000đ/TC (học mới)
  - Đơn giá học lại, cải thiện, học hè khác nhau
  - SV chỉ được đăng ký môn có mở trong học kỳ

---

## 👤 THÀNH VIÊN 4: Quản lý Học phí, Điểm số & Báo cáo

### Phụ trách: BM6, BM7, QĐ6, QĐ7, Quản lý Điểm sinh viên

| STT | Tên Trigger/Function | Mô tả | Bảng liên quan |
|-----|---------------------|-------|----------------|
| 1 | `trg_phieu_thu_hoc_phi_before_insert` | Kiểm tra phiếu đăng ký và số tiền thu hợp lệ | `phieu_thu_hoc_phi`, `phieu_dang_ky` |
| 2 | `trg_phieu_thu_hoc_phi_before_update` | Kiểm tra dữ liệu khi cập nhật phiếu thu | `phieu_thu_hoc_phi`, `phieu_dang_ky` |
| 3 | `trg_phieu_thu_hoc_phi_after_insert` | Cập nhật trạng thái đã đóng đủ nếu cần | `phieu_thu_hoc_phi`, `phieu_dang_ky` |
| 4 | `trg_phieu_thu_hoc_phi_after_update` | Xử lý khi hủy phiếu thu | `phieu_thu_hoc_phi`, `phieu_dang_ky` |
| 5 | `trg_phieu_thu_hoc_phi_after_delete` | Cập nhật tổng tiền đã thu khi xóa phiếu thu | `phieu_thu_hoc_phi`, `phieu_dang_ky` |
| 6 | `sp_thu_hoc_phi(ma_sv, ma_hoc_ky, so_tien, hinh_thuc, nguoi_thu, ghi_chu)` | Procedure thu học phí (BM6) | `phieu_thu_hoc_phi`, `phieu_dang_ky` |
| 7 | `fn_tinh_so_tien_con_lai(ma_sv, ma_hoc_ky)` | Tính số tiền còn lại phải đóng (QĐ7) | `phieu_dang_ky`, `phieu_thu_hoc_phi` |
| 8 | `fn_tinh_tong_tien_da_thu(so_phieu_dang_ky)` | Tính tổng tiền đã thu cho 1 phiếu đăng ký | `phieu_thu_hoc_phi` |
| 9 | `sp_lap_bao_cao_sv_chua_dong_hp(ma_hoc_ky)` | Procedure lập báo cáo SV chưa đóng đủ HP (BM7) | `phieu_dang_ky`, `phieu_thu_hoc_phi`, `sinh_vien`, `hoc_ky` |
| 10 | `trg_hoc_ky_check_han_dong_hp` | Kiểm tra và cảnh báo SV chưa đóng HP khi đến hạn | `hoc_ky`, `phieu_dang_ky`, `thong_bao` |
| 11 | `fn_kiem_tra_qua_han_dong_hp(ma_sv, ma_hoc_ky)` | Kiểm tra SV đã quá hạn đóng HP chưa (QĐ6) | `phieu_dang_ky`, `hoc_ky` |
| 12 | `sp_gui_thong_bao_nhac_hp(ma_hoc_ky)` | Gửi thông báo nhắc nộp HP cho SV chưa đóng đủ | `thong_bao`, `sinh_vien`, `tai_khoan` |
| 13 | `trg_diem_sinh_vien_before_insert` | Kiểm tra điểm hợp lệ (0-10), tính điểm TB tự động | `diem_sinh_vien` |
| 14 | `trg_diem_sinh_vien_before_update` | Kiểm tra điểm hợp lệ khi cập nhật | `diem_sinh_vien` |
| 15 | `trg_diem_sinh_vien_after_insert` | Cập nhật kết quả đậu/rớt (< 5.0 = Rớt) | `diem_sinh_vien` |
| 16 | `trg_diem_sinh_vien_after_update` | Cập nhật GPA tích lũy khi sửa điểm | `diem_sinh_vien`, `cau_hinh_dang_ky` |
| 17 | `trg_diem_sinh_vien_after_delete` | Cập nhật GPA tích lũy khi xóa điểm | `diem_sinh_vien` |
| 18 | `sp_nhap_diem(ma_sv, ma_mon, ma_hk, diem_qt, diem_gk, diem_ck)` | Procedure nhập điểm sinh viên | `diem_sinh_vien`, `chi_tiet_dang_ky` |
| 19 | `fn_tinh_diem_trung_binh_mon(diem_qt, diem_gk, diem_ck)` | Tính điểm trung bình môn học | `diem_sinh_vien` |
| 20 | `fn_chuyen_diem_sang_chu(diem_tb)` | Chuyển điểm số sang điểm chữ (A+, A, B+...) | `diem_sinh_vien` |
| 21 | `sp_lap_bang_diem_sinh_vien(ma_sv)` | Procedure lập bảng điểm toàn khóa của SV | `diem_sinh_vien`, `mon_hoc`, `hoc_ky` |
| 22 | `fn_cap_nhat_gpa_tich_luy(ma_sv)` | Cập nhật GPA tích lũy sau khi thay đổi điểm | `diem_sinh_vien` |

### 📝 MÔ TẢ CHI TIẾT TỪNG TRIGGER/FUNCTION:

#### 1. `trg_phieu_thu_hoc_phi_before_insert`
**Mục đích:** Kiểm tra dữ liệu phiếu thu học phí trước khi INSERT.

**Input:** Dữ liệu phiếu thu mới (NEW.*)

**Logic xử lý:**
1. Kiểm tra `so_phieu_dang_ky` tồn tại và có `trang_thai = 'Đã đăng ký'`
2. Kiểm tra `ma_sv` khớp với sinh viên trong phiếu đăng ký
3. Kiểm tra `so_tien_thu` > 0
4. Kiểm tra `so_tien_thu` <= số tiền còn lại phải đóng:
   - Gọi `fn_tinh_so_tien_con_lai(ma_sv, ma_hoc_ky)`
   - Nếu `so_tien_thu > con_lai` → raise warning (có thể cho phép nhưng cảnh báo)
5. Kiểm tra `hinh_thuc_thu` hợp lệ: 'Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử'
6. Set `ngay_lap = CURRENT_TIMESTAMP`
7. Set `trang_thai = 'Thành công'`

**Output:** Cho phép INSERT nếu hợp lệ

**Ví dụ:**
```sql
-- Sinh viên còn nợ 500,000đ, nộp 300,000đ
INSERT INTO phieu_thu_hoc_phi (so_phieu_dang_ky, ma_sv, so_tien_thu, hinh_thuc_thu, nguoi_thu)
VALUES (1, 'SV001', 300000, 'Tiền mặt', 'Nguyễn Thị A');
-- Kết quả: INSERT thành công

-- Sinh viên còn nợ 500,000đ, nộp 600,000đ
-- Kết quả: Warning - Số tiền thu vượt quá số tiền còn lại
```

---

#### 2. `trg_phieu_thu_hoc_phi_before_update`
**Mục đích:** Kiểm tra dữ liệu phiếu thu học phí trước khi UPDATE.

**Input:** Dữ liệu phiếu thu trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra `so_phieu_dang_ky` không được thay đổi
2. Kiểm tra `ma_sv` không được thay đổi
3. Nếu `trang_thai` thay đổi từ 'Thành công' → 'Đã hủy':
   - Ghi lại lý do hủy (nếu có)
   - Cho phép hủy
4. Nếu `so_tien_thu` thay đổi:
   - Kiểm tra `so_tien_thu` > 0
   - Cập nhật tổng tiền đã thu của phiếu đăng ký

**Output:** Cho phép UPDATE nếu hợp lệ

**Ví dụ:**
```sql
-- Sửa số tiền thu do nhập sai
UPDATE phieu_thu_hoc_phi SET so_tien_thu = 250000 WHERE so_phieu_thu = 1;
-- Kết quả: OK
```

---

#### 3. `trg_phieu_thu_hoc_phi_after_insert`
**Mục đích:** Kiểm tra và cập nhật trạng thái phiếu đăng ký sau khi thu học phí.

**Input:** Dữ liệu phiếu thu vừa INSERT (NEW.*)

**Logic xử lý:**
1. Tính tổng tiền đã thu cho phiếu đăng ký:
   - Gọi `fn_tinh_tong_tien_da_thu(NEW.so_phieu_dang_ky)`
2. So sánh với `tong_tien_phai_dong` của phiếu đăng ký
3. Nếu đã đóng đủ (tổng thu >= tổng phải đóng):
   - Có thể gửi thông báo "Đã hoàn thành đóng học phí" cho sinh viên
4. Cập nhật ngày cập nhật của phiếu đăng ký

**Output:** Gửi thông báo nếu đã đóng đủ

**Ví dụ:**
```sql
-- Sau khi sinh viên đóng đủ học phí:
-- Tự động gửi thông báo vào bảng thong_bao_ca_nhan:
-- "Bạn đã hoàn thành đóng học phí HK1-2526. Tổng đã đóng: 500,000đ"
```

---

#### 4. `trg_phieu_thu_hoc_phi_after_update`
**Mục đích:** Xử lý khi cập nhật phiếu thu học phí (đặc biệt khi hủy).

**Input:** Dữ liệu phiếu thu trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `trang_thai` thay đổi từ 'Thành công' → 'Đã hủy':
   - Ghi log lý do hủy (nếu có)
   - Tính lại tổng tiền đã thu cho phiếu đăng ký
   - Gửi thông báo cho sinh viên về việc hủy phiếu thu
2. Nếu `so_tien_thu` thay đổi:
   - Tính lại tổng tiền đã thu cho phiếu đăng ký
3. Nếu trước đó sinh viên đã đóng đủ, giờ cần cập nhật lại trạng thái

**Output:** Cập nhật thông tin liên quan

---

#### 5. `trg_phieu_thu_hoc_phi_after_delete`
**Mục đích:** Cập nhật tổng tiền đã thu khi xóa phiếu thu học phí.

**Input:** Dữ liệu phiếu thu bị xóa (OLD.*)

**Logic xử lý:**
1. Tìm phiếu đăng ký tương ứng (OLD.so_phieu_dang_ky)
2. Nếu `OLD.trang_thai = 'Thành công'`:
   - Tính lại tổng tiền đã thu cho phiếu đăng ký
3. Gửi thông báo cho sinh viên (nếu cần)

**Output:** Cập nhật thông tin liên quan

**Ví dụ:**
```sql
-- Xóa phiếu thu do nhầm lẫn (trường hợp admin xử lý):
DELETE FROM phieu_thu_hoc_phi WHERE so_phieu_thu = 100;
-- Kết quả: Tổng tiền đã thu của phiếu đăng ký được cập nhật tự động
```

---

#### 6. `sp_thu_hoc_phi(...)`
**Mục đích:** Procedure thu học phí cho sinh viên theo BM6, QĐ6.

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_sv` | VARCHAR(15) | Có | Mã sinh viên |
| `p_ma_hoc_ky` | VARCHAR(15) | Có | Mã học kỳ |
| `p_so_tien_thu` | DECIMAL(15,0) | Có | Số tiền thu |
| `p_hinh_thuc_thu` | VARCHAR(50) | Không | Hình thức: 'Tiền mặt'(mặc định), 'Chuyển khoản', 'Thẻ', 'Ví điện tử' |
| `p_nguoi_thu` | VARCHAR(100) | Không | Tên người thu |
| `p_ghi_chu` | VARCHAR(300) | Không | Ghi chú |
| `p_ma_giao_dich` | VARCHAR(100) | Không | Mã giao dịch (nếu chuyển khoản) |

**Logic xử lý:**
1. Tìm phiếu đăng ký của sinh viên trong học kỳ
2. Nếu không tìm thấy → trả về lỗi
3. Tính số tiền còn lại: `fn_tinh_so_tien_con_lai(p_ma_sv, p_ma_hoc_ky)`
4. Nếu `p_so_tien_thu > con_lai`:
   - Trả về thông báo cảnh báo (có thể vẫn cho đóng để xử lý thừa sau)
5. INSERT vào bảng `phieu_thu_hoc_phi`:
   - Trigger sẽ tự động xử lý các validation và update
6. Trả về thông báo kết quả bao gồm:
   - Số tiền đã thu
   - Số tiền còn lại sau khi thu

**Output:** TEXT - Thông báo kết quả

**Ví dụ:**
```sql
-- Thu tiền lần 1
SELECT sp_thu_hoc_phi(
    'SV001',           -- ma_sv
    'HK1-2526',        -- ma_hoc_ky
    200000,            -- so_tien_thu
    'Tiền mặt',        -- hinh_thuc_thu
    'Nguyễn Văn B',    -- nguoi_thu
    'Đóng lần 1',      -- ghi_chu
    NULL               -- ma_giao_dich
);
-- Kết quả: 'Thành công: Thu 200,000đ. Còn lại: 300,000đ'

-- Thu tiền lần 2 qua chuyển khoản
SELECT sp_thu_hoc_phi(
    'SV001', 'HK1-2526', 300000, 
    'Chuyển khoản', NULL, 'Đóng lần 2', 'TXN123456789'
);
-- Kết quả: 'Thành công: Thu 300,000đ. Đã đóng đủ học phí!'
```

---

#### 7. `fn_tinh_so_tien_con_lai(p_ma_sv, p_ma_hoc_ky)`
**Mục đích:** Tính số tiền học phí còn lại mà sinh viên phải đóng theo QĐ7.

**Input:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `p_ma_sv` | VARCHAR(15) | Mã sinh viên |
| `p_ma_hoc_ky` | VARCHAR(15) | Mã học kỳ |

**Logic xử lý:**
1. Tìm phiếu đăng ký của sinh viên trong học kỳ
2. Lấy `tong_tien_phai_dong` từ phiếu đăng ký
3. Tính tổng đã thu: `fn_tinh_tong_tien_da_thu(so_phieu)`
4. Tính còn lại: `con_lai = tong_tien_phai_dong - tong_da_thu`
5. Nếu `con_lai < 0` → trả về 0 (đã đóng dư)

**Output:** DECIMAL(15,0) - Số tiền còn lại phải đóng (VNĐ)

**Ví dụ:**
```sql
-- Sinh viên đăng ký 500,000đ, đã đóng 200,000đ
SELECT fn_tinh_so_tien_con_lai('SV001', 'HK1-2526');  -- 300,000

-- Sinh viên đã đóng đủ
SELECT fn_tinh_so_tien_con_lai('SV002', 'HK1-2526');  -- 0

-- Sinh viên chưa đóng gì
SELECT fn_tinh_so_tien_con_lai('SV003', 'HK1-2526');  -- 500,000 (= tong_tien_phai_dong)
```

---

#### 8. `fn_tinh_tong_tien_da_thu(p_so_phieu_dang_ky)`
**Mục đích:** Tính tổng số tiền đã thu cho một phiếu đăng ký (hỗ trợ đóng nhiều lần - QĐ6).

**Input:**
- `p_so_phieu_dang_ky`: INTEGER - Số phiếu đăng ký

**Logic xử lý:**
1. Truy vấn bảng `phieu_thu_hoc_phi`:
   ```sql
   SELECT COALESCE(SUM(so_tien_thu), 0)
   FROM phieu_thu_hoc_phi
   WHERE so_phieu_dang_ky = p_so_phieu_dang_ky
     AND trang_thai = 'Thành công'
   ```

**Output:** DECIMAL(15,0) - Tổng tiền đã thu (VNĐ)

**Ví dụ:**
```sql
-- Phiếu đăng ký 1 có 2 phiếu thu: 200,000 + 300,000
SELECT fn_tinh_tong_tien_da_thu(1);  -- 500,000

-- Phiếu đăng ký 2 chưa có phiếu thu nào
SELECT fn_tinh_tong_tien_da_thu(2);  -- 0
```

---

#### 9. `sp_lap_bao_cao_sv_chua_dong_hp(ma_hoc_ky)`
**Mục đích:** Procedure lập báo cáo danh sách sinh viên chưa hoàn thành đóng học phí theo BM7.

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_hoc_ky` | VARCHAR(15) | Có | Mã học kỳ cần lập báo cáo |

**Logic xử lý:**
1. Lấy thông tin học kỳ (tên, hạn đóng HP)
2. Truy vấn tất cả phiếu đăng ký trong học kỳ có `trang_thai = 'Đã đăng ký'`
3. Với mỗi phiếu, tính:
   - `tong_tien_dang_ky` - Số tiền đăng ký
   - `tong_tien_phai_dong` - Số tiền phải đóng (sau miễn giảm)
   - `da_dong` = `fn_tinh_tong_tien_da_thu(so_phieu)`
   - `con_lai` = `tong_tien_phai_dong - da_dong`
4. Lọc những sinh viên có `con_lai > 0`
5. Xác định trạng thái:
   - Nếu `CURRENT_DATE > han_dong_hoc_phi` → 'Quá hạn'
   - Ngược lại → 'Còn nợ'
6. Trả về danh sách theo định dạng BM7

**Output:** TABLE - Danh sách sinh viên chưa đóng đủ HP

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `ma_sv` | VARCHAR | Mã sinh viên |
| `ho_ten` | VARCHAR | Họ tên |
| `ma_nganh` | VARCHAR | Mã ngành |
| `ten_nganh` | VARCHAR | Tên ngành |
| `so_tien_dang_ky` | DECIMAL | Tổng tiền đăng ký |
| `so_tien_phai_dong` | DECIMAL | Số tiền phải đóng (sau miễn giảm) |
| `so_tien_da_dong` | DECIMAL | Số tiền đã đóng |
| `so_tien_con_lai` | DECIMAL | Số tiền còn lại |
| `trang_thai` | VARCHAR | 'Còn nợ' hoặc 'Quá hạn' |

**Ví dụ:**
```sql
SELECT * FROM sp_lap_bao_cao_sv_chua_dong_hp('HK1-2526');
-- Kết quả:
-- | ma_sv | ho_ten          | ma_nganh | so_tien_dang_ky | so_tien_phai_dong | so_tien_da_dong | so_tien_con_lai | trang_thai |
-- | SV001 | Nguyễn Văn An   | KTPM     | 1,000,000       | 500,000           | 200,000         | 300,000         | Còn nợ     |
-- | SV003 | Trần Thị Hoa    | KHMT     | 800,000         | 800,000           | 0               | 800,000         | Quá hạn    |
```

---

#### 10. `trg_hoc_ky_check_han_dong_hp`
**Mục đích:** Trigger kiểm tra và tự động gửi thông báo cảnh báo khi gần đến hạn đóng HP hoặc đã quá hạn.

**Input:** Dữ liệu học kỳ được UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `CURRENT_DATE` gần `han_dong_hoc_phi` (VD: còn 7 ngày):
   - Tìm tất cả sinh viên chưa đóng đủ HP
   - Gửi thông báo nhắc nhở vào `thong_bao_ca_nhan`
2. Kiểm tra nếu `CURRENT_DATE > han_dong_hoc_phi`:
   - Tìm sinh viên chưa đóng đủ HP
   - Gửi thông báo cảnh báo "Đã quá hạn đóng học phí"

**Output:** Gửi thông báo vào `thong_bao_ca_nhan`

**Lưu ý:** Trigger này có thể được kích hoạt bởi một job định kỳ (scheduled job) thay vì trigger trực tiếp.

---

#### 11. `fn_kiem_tra_qua_han_dong_hp(p_ma_sv, p_ma_hoc_ky)`
**Mục đích:** Kiểm tra sinh viên đã quá hạn đóng học phí hay chưa theo QĐ6.

**Input:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `p_ma_sv` | VARCHAR(15) | Mã sinh viên |
| `p_ma_hoc_ky` | VARCHAR(15) | Mã học kỳ |

**Logic xử lý:**
1. Kiểm tra sinh viên còn nợ HP không: `fn_tinh_so_tien_con_lai() > 0`
2. Lấy `han_dong_hoc_phi` từ bảng `hoc_ky`
3. So sánh `CURRENT_DATE` với `han_dong_hoc_phi`
4. Trả về TRUE nếu còn nợ VÀ đã quá hạn

**Output:** BOOLEAN - TRUE nếu quá hạn và còn nợ, FALSE nếu không

**Ví dụ:**
```sql
-- Sinh viên còn nợ và đã quá hạn
SELECT fn_kiem_tra_qua_han_dong_hp('SV001', 'HK1-2526');  -- TRUE

-- Sinh viên đã đóng đủ
SELECT fn_kiem_tra_qua_han_dong_hp('SV002', 'HK1-2526');  -- FALSE

-- Sinh viên còn nợ nhưng chưa quá hạn
SELECT fn_kiem_tra_qua_han_dong_hp('SV003', 'HK2-2526');  -- FALSE
```

**Ứng dụng:** Dùng để kiểm tra sinh viên có được thi cuối kỳ hay không (theo QĐ6).

---

#### 12. `sp_gui_thong_bao_nhac_hp(ma_hoc_ky)`
**Mục đích:** Procedure gửi thông báo nhắc nộp học phí cho tất cả sinh viên chưa đóng đủ.

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_hoc_ky` | VARCHAR(15) | Có | Mã học kỳ |
| `p_loai_thong_bao` | VARCHAR(50) | Không | 'nhac_nho' hoặc 'canh_bao' (mặc định: 'nhac_nho') |

**Logic xử lý:**
1. Gọi `sp_lap_bao_cao_sv_chua_dong_hp(p_ma_hoc_ky)` để lấy danh sách SV
2. Với mỗi sinh viên trong danh sách:
   - Lấy `ma_tai_khoan` từ bảng `sinh_vien`
   - Tạo nội dung thông báo:
     ```
     Tiêu đề: "Nhắc nhở đóng học phí [HK1-2526]"
     Nội dung: "Bạn còn nợ [300,000đ] học phí. Hạn đóng: [31/10/2025]. 
               Vui lòng đóng học phí đúng hạn để tránh bị hạn chế đăng ký thi."
     ```
   - INSERT vào `thong_bao_ca_nhan`
3. Ghi log số lượng thông báo đã gửi

**Output:** TEXT - Thông báo kết quả

**Ví dụ:**
```sql
SELECT sp_gui_thong_bao_nhac_hp('HK1-2526', 'nhac_nho');
-- Kết quả: 'Đã gửi thông báo nhắc nhở cho 25 sinh viên chưa đóng đủ học phí'

SELECT sp_gui_thong_bao_nhac_hp('HK1-2526', 'canh_bao');
-- Kết quả: 'Đã gửi cảnh báo quá hạn cho 10 sinh viên'
```

---

#### 13. `trg_diem_sinh_vien_before_insert`
**Mục đích:** Kiểm tra điểm hợp lệ (0-10) và tự động tính điểm trung bình.

**Input:** Dữ liệu điểm mới (NEW.*)

**Logic xử lý:**
1. Kiểm tra `ma_sv` tồn tại trong bảng `sinh_vien`
2. Kiểm tra `ma_mon_hoc` tồn tại trong bảng `mon_hoc`
3. Kiểm tra `ma_hoc_ky` tồn tại trong bảng `hoc_ky`
4. Kiểm tra điểm trong khoảng [0, 10]:
   - `diem_qua_trinh` (nếu có)
   - `diem_giua_ky` (nếu có)
   - `diem_cuoi_ky` (nếu có)
5. Tự động tính `diem_trung_binh` nếu có đủ điểm thành phần:
   - `diem_trung_binh = diem_qua_trinh * 0.2 + diem_giua_ky * 0.3 + diem_cuoi_ky * 0.5`
6. Tự động chuyển sang `diem_chu` dựa trên `diem_trung_binh`

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

---

#### 14. `trg_diem_sinh_vien_before_update`
**Mục đích:** Kiểm tra điểm hợp lệ khi cập nhật và tự động tính lại điểm trung bình.

**Input:** Dữ liệu điểm trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra điểm trong khoảng [0, 10] (nếu thay đổi)
2. Tự động tính lại `diem_trung_binh` nếu điểm thành phần thay đổi
3. Tự động cập nhật `diem_chu` dựa trên `diem_trung_binh` mới
4. Set `ngay_cap_nhat = CURRENT_TIMESTAMP`

**Output:** Cho phép UPDATE nếu hợp lệ

---

#### 15. `trg_diem_sinh_vien_after_insert`
**Mục đích:** Cập nhật kết quả đậu/rớt và GPA tích lũy sau khi nhập điểm.

**Input:** Dữ liệu điểm vừa INSERT (NEW.*)

**Logic xử lý:**
1. Nếu `diem_trung_binh` đã có:
   - Nếu `diem_trung_binh < 5.0` → `ket_qua = 'Rớt'`
   - Nếu `diem_trung_binh >= 5.0` → `ket_qua = 'Đậu'`
2. Gọi `fn_cap_nhat_gpa_tich_luy(NEW.ma_sv)` để cập nhật GPA

**Output:** Cập nhật kết quả đậu/rớt

---

#### 16. `trg_diem_sinh_vien_after_update`
**Mục đích:** Cập nhật GPA tích lũy khi sửa điểm.

**Input:** Dữ liệu điểm trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Nếu `diem_trung_binh` thay đổi:
   - Cập nhật lại `ket_qua` (Đậu/Rớt)
   - Gọi `fn_cap_nhat_gpa_tich_luy(NEW.ma_sv)` để cập nhật GPA

**Output:** Cập nhật GPA tích lũy

---

#### 17. `trg_diem_sinh_vien_after_delete`
**Mục đích:** Cập nhật GPA tích lũy khi xóa điểm.

**Input:** Dữ liệu điểm bị xóa (OLD.*)

**Logic xử lý:**
1. Gọi `fn_cap_nhat_gpa_tich_luy(OLD.ma_sv)` để cập nhật GPA tích lũy

**Output:** Cập nhật GPA tích lũy

---

#### 18. `sp_nhap_diem(ma_sv, ma_mon, ma_hk, diem_qt, diem_gk, diem_ck)`
**Mục đích:** Procedure nhập điểm sinh viên.

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_sv` | VARCHAR(15) | Có | Mã sinh viên |
| `p_ma_mon_hoc` | VARCHAR(15) | Có | Mã môn học |
| `p_ma_hoc_ky` | VARCHAR(15) | Có | Mã học kỳ |
| `p_diem_qt` | DECIMAL(4,2) | Không | Điểm quá trình |
| `p_diem_gk` | DECIMAL(4,2) | Không | Điểm giữa kỳ |
| `p_diem_ck` | DECIMAL(4,2) | Không | Điểm cuối kỳ |

**Logic xử lý:**
1. Kiểm tra sinh viên có đăng ký môn học này trong học kỳ không
2. Kiểm tra điểm hợp lệ (0-10)
3. Tính điểm trung bình và điểm chữ
4. INSERT hoặc UPDATE vào `diem_sinh_vien`

**Output:** TEXT - Thông báo kết quả

---

#### 19. `fn_tinh_diem_trung_binh_mon(diem_qt, diem_gk, diem_ck)`
**Mục đích:** Tính điểm trung bình môn học.

**Input:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `diem_qt` | DECIMAL(4,2) | Điểm quá trình |
| `diem_gk` | DECIMAL(4,2) | Điểm giữa kỳ |
| `diem_ck` | DECIMAL(4,2) | Điểm cuối kỳ |

**Logic xử lý:**
```
diem_tb = diem_qt * 0.2 + diem_gk * 0.3 + diem_ck * 0.5
```

**Output:** DECIMAL(4,2) - Điểm trung bình

---

#### 20. `fn_chuyen_diem_sang_chu(diem_tb)`
**Mục đích:** Chuyển điểm số sang điểm chữ.

**Input:** `diem_tb` - Điểm trung bình (DECIMAL(4,2))

**Logic xử lý:**
| Điểm số | Điểm chữ |
|---------|----------|
| 9.0 - 10.0 | A+ |
| 8.5 - 8.9 | A |
| 8.0 - 8.4 | B+ |
| 7.0 - 7.9 | B |
| 6.5 - 6.9 | C+ |
| 5.5 - 6.4 | C |
| 5.0 - 5.4 | D+ |
| 4.0 - 4.9 | D |
| < 4.0 | F |

**Output:** VARCHAR(2) - Điểm chữ

---

#### 21. `sp_lap_bang_diem_sinh_vien(ma_sv)`
**Mục đích:** Lập bảng điểm toàn khóa của sinh viên.

**Input:** `p_ma_sv` - Mã sinh viên (VARCHAR(15))

**Output:** TABLE - Bảng điểm chi tiết

---

#### 22. `fn_cap_nhat_gpa_tich_luy(ma_sv)`
**Mục đích:** Cập nhật GPA tích lũy sau khi thay đổi điểm.

**Input:** `p_ma_sv` - Mã sinh viên (VARCHAR(15))

**Logic xử lý:**
1. Tính GPA tích lũy:
   ```
   GPA = SUM(diem_trung_binh * so_tin_chi) / SUM(so_tin_chi)
   ```
   (Chỉ tính các môn có kết quả 'Đậu')

**Output:** DECIMAL(4,2) - GPA tích lũy

### Chi tiết yêu cầu về Điểm sinh viên:
- Điểm trong khoảng 0-10
- Điểm trung bình < 5.0 = Rớt
- GPA tích lũy được cập nhật tự động khi có thay đổi điểm

### Chi tiết yêu cầu:
- **BM6**: Phiếu thu học phí (Số phiếu, Ngày lập, MSSV, Số tiền thu)
- **QĐ6**: 
  - Phiếu thu dựa trên phiếu đăng ký học phần
  - SV có thể đóng nhiều lần cho 1 phiếu đăng ký
  - Phải hoàn thành trước hạn (không được thi cuối kỳ nếu chưa đóng đủ)
- **BM7**: Báo cáo SV chưa hoàn thành đóng HP (MSSV, Số tiền đăng ký, Số tiền phải đóng, Số tiền còn lại)
- **QĐ7**: 
  - Số tiền phải đóng <= Số tiền đăng ký (do miễn giảm theo đối tượng)

---

## 📊 TỔNG HỢP CÔNG VIỆC

| Thành viên | BM | QĐ | Số Trigger | Số Function | Số Procedure |
|------------|----|----|------------|-------------|--------------|
| **TV1** | BM1 | QĐ1 | 20 | 5 | 1 |
| **TV2** | BM2, BM3 | QĐ2, QĐ3 | 13 | 2 | 2 |
| **TV3** | BM4, BM5 | QĐ4, QĐ5 | 22 | 5 | 4 |
| **TV4** | BM6, BM7 | QĐ6, QĐ7 | 11 | 6 | 5 |

### Chi tiết số lượng TV1 (sau bổ sung):
- **Trigger (20):**
  - `sinh_vien`: before_insert, before_update, before_delete, after_insert, after_update (5)
  - `doi_tuong_sinh_vien`: before_insert, before_update, after_insert, after_update, after_delete (5)
  - `doi_tuong`: before_insert, before_update, before_delete, after_update (4)
  - `phuong_xa`: before_update, **before_delete** (2)
  - `dan_toc`: before_update, **before_delete** (2)
  - `nganh_hoc`: **before_delete** (1)
  - `quan_huyen`: **before_delete** (1)
- **Function (5):**
  - `fn_lay_ti_le_giam_hoc_phi`, `fn_kiem_tra_vung_sau_vung_xa`, `fn_validate_cccd`, `fn_validate_sdt`, `fn_validate_email`
- **Procedure (1):**
  - `sp_lap_ho_so_sinh_vien`

### Chi tiết số lượng TV2 (sau bổ sung):
- **Trigger (13):**
  - `mon_hoc`: before_insert, before_update, before_delete, after_insert, after_update (5)
  - `lop`: before_insert, before_update, before_delete (3)
  - `chuong_trinh_hoc`: before_insert, before_update, **before_delete** (3)
  - `dieu_kien_mon_hoc`: before_insert, before_update, **before_delete** (3)
  - `khoa`: **before_delete** (1) → cần thêm

### Chi tiết số lượng TV3 (sau bổ sung):
- **Trigger (22):**
  - `hoc_ky`: before_insert, before_update, **before_delete** (3)
  - `nam_hoc`: **before_delete**, **before_update** (2)
  - `lop_mo`: before_insert, before_update, before_delete (3)
  - `phieu_dang_ky`: before_insert, before_update, **before_delete** (3)
  - `chi_tiet_dang_ky`: **before_insert**, after_insert, after_update, after_delete (4)
  - `lich_hoc_lop`: before_insert, before_update, before_delete (3)
  - `don_gia_tin_chi`: **before_delete**, **after_update** (2)
  - `tiet_hoc`: **before_delete**, **before_update** (2)

---

## 📋 BẢNG TẦM ẢNH HƯỞNG CỦA TRIGGER

> **Chú thích:**
> - **+** = Có ảnh hưởng, cần có trigger xử lý
> - **-** = Không ảnh hưởng, không cần trigger
> - ✅ = Đã có trigger xử lý
> - ⚠️ = Thiếu trigger, cần bổ sung

Bảng này xét với mỗi trigger, các **thao tác Thêm/Xóa/Sửa trên các bảng liên quan** có ảnh hưởng đến logic của trigger không. Nếu có ảnh hưởng thì cần có trigger xử lý.

---

### Thành viên 1 - Sinh viên & Đối tượng ưu tiên

#### Trigger `trg_sinh_vien_before_insert` + `trg_sinh_vien_after_insert`

**Bảng liên quan:** `sinh_vien`, `phuong_xa`, `dan_toc`, `nganh_hoc`, `tai_khoan`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `sinh_vien` | ✅ | - | - | `trg_sinh_vien_before_insert`, `trg_sinh_vien_after_insert` |
| `phuong_xa` | - | + | + | ⚠️ `trg_phuong_xa_before_delete` (thiếu), ✅ `trg_phuong_xa_before_update` |
| `dan_toc` | - | + | + | ⚠️ `trg_dan_toc_before_delete` (thiếu), ✅ `trg_dan_toc_before_update` |
| `nganh_hoc` | - | + | - | ⚠️ `trg_nganh_hoc_before_delete` (thiếu) |
| `tai_khoan` | - | - | - | - |

**Giải thích:**
- Xóa `phuong_xa`/`dan_toc`/`nganh_hoc` đang được sinh viên tham chiếu → cần ngăn chặn hoặc cập nhật dữ liệu

---

#### Trigger `trg_sinh_vien_before_update` + `trg_sinh_vien_after_update`

**Bảng liên quan:** `sinh_vien`, `phuong_xa`, `dan_toc`, `nganh_hoc`, `phieu_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `sinh_vien` | - | - | ✅ | `trg_sinh_vien_before_update`, `trg_sinh_vien_after_update` |
| `phuong_xa` | - | + | + | ⚠️ `trg_phuong_xa_before_delete` (thiếu), ✅ `trg_phuong_xa_before_update` |
| `dan_toc` | - | + | + | ⚠️ `trg_dan_toc_before_delete` (thiếu), ✅ `trg_dan_toc_before_update` |
| `nganh_hoc` | - | + | - | ⚠️ `trg_nganh_hoc_before_delete` (thiếu) |
| `phieu_dang_ky` | - | - | - | - |

---

#### Trigger `trg_sinh_vien_before_delete`

**Bảng liên quan:** `sinh_vien`, `tai_khoan`, `phieu_dang_ky`, `doi_tuong_sinh_vien`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `sinh_vien` | - | ✅ | - | `trg_sinh_vien_before_delete` |
| `tai_khoan` | - | - | - | - |
| `phieu_dang_ky` | - | - | - | - |
| `doi_tuong_sinh_vien` | - | - | - | - |

---

#### Trigger `trg_doi_tuong_sinh_vien_before_insert/update` + `after_insert/update/delete`

**Bảng liên quan:** `doi_tuong_sinh_vien`, `sinh_vien`, `doi_tuong`, `phieu_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `doi_tuong_sinh_vien` | ✅ | ✅ | ✅ | `trg_doi_tuong_sinh_vien_before_insert`, `after_insert`, `before_update`, `after_update`, `after_delete` |
| `sinh_vien` | - | + | - | Xử lý qua FK cascade hoặc `trg_sinh_vien_before_delete` |
| `doi_tuong` | - | + | + | ✅ `trg_doi_tuong_before_delete`, ✅ `trg_doi_tuong_after_update` |
| `phieu_dang_ky` | - | - | - | - |

---

#### Trigger `trg_doi_tuong_before_insert/update/delete` + `after_update`

**Bảng liên quan:** `doi_tuong`, `doi_tuong_sinh_vien`, `phieu_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `doi_tuong` | ✅ | ✅ | ✅ | `trg_doi_tuong_before_insert`, `before_update`, `before_delete`, `after_update` |
| `doi_tuong_sinh_vien` | - | - | - | - |
| `phieu_dang_ky` | - | - | - | - |

---

#### Trigger `trg_phuong_xa_before_update`

**Bảng liên quan:** `phuong_xa`, `sinh_vien`, `dan_toc`, `phieu_dang_ky`, `doi_tuong_sinh_vien`, `quan_huyen`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `phuong_xa` | - | + | ✅ | ⚠️ `trg_phuong_xa_before_delete` (thiếu), ✅ `trg_phuong_xa_before_update` |
| `sinh_vien` | - | - | - | - |
| `dan_toc` | - | - | - | - |
| `phieu_dang_ky` | - | - | - | - |
| `doi_tuong_sinh_vien` | - | - | - | - |
| `quan_huyen` | - | + | - | ⚠️ `trg_quan_huyen_before_delete` (thiếu) |

---

#### Trigger `trg_dan_toc_before_update`

**Bảng liên quan:** `dan_toc`, `sinh_vien`, `phuong_xa`, `phieu_dang_ky`, `doi_tuong_sinh_vien`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `dan_toc` | - | + | ✅ | ⚠️ `trg_dan_toc_before_delete` (thiếu), ✅ `trg_dan_toc_before_update` |
| `sinh_vien` | - | - | - | - |
| `phuong_xa` | - | - | - | - |
| `phieu_dang_ky` | - | - | - | - |
| `doi_tuong_sinh_vien` | - | - | - | - |

---

### Thành viên 2 - Môn học & Chương trình học

#### Trigger `trg_mon_hoc_before_insert` + `trg_mon_hoc_after_insert`

**Bảng liên quan:** `mon_hoc`, `khoa`, `lop`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `mon_hoc` | ✅ | - | - | `trg_mon_hoc_before_insert`, `trg_mon_hoc_after_insert` |
| `khoa` | - | + | - | ⚠️ `trg_khoa_before_delete` (thiếu) |
| `lop` | - | - | - | - |

---

#### Trigger `trg_mon_hoc_before_update` + `trg_mon_hoc_after_update`

**Bảng liên quan:** `mon_hoc`, `khoa`, `lop`, `chi_tiet_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `mon_hoc` | - | - | ✅ | `trg_mon_hoc_before_update`, `trg_mon_hoc_after_update` |
| `khoa` | - | + | - | ⚠️ `trg_khoa_before_delete` (thiếu) |
| `lop` | - | - | - | - |
| `chi_tiet_dang_ky` | - | - | - | - |

---

#### Trigger `trg_mon_hoc_before_delete`

**Bảng liên quan:** `mon_hoc`, `lop`, `chuong_trinh_hoc`, `dieu_kien_mon_hoc`, `chi_tiet_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `mon_hoc` | - | ✅ | - | `trg_mon_hoc_before_delete` |
| `lop` | - | - | - | - |
| `chuong_trinh_hoc` | - | - | - | - |
| `dieu_kien_mon_hoc` | - | - | - | - |
| `chi_tiet_dang_ky` | - | - | - | - |

---

#### Trigger `trg_lop_before_insert/update/delete`

**Bảng liên quan:** `lop`, `mon_hoc`, `lop_mo`, `chi_tiet_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `lop` | ✅ | ✅ | ✅ | `trg_lop_before_insert`, `trg_lop_before_update`, `trg_lop_before_delete` |
| `mon_hoc` | - | + | + | ✅ `trg_mon_hoc_before_delete`, ⚠️ `trg_mon_hoc_after_update` ảnh hưởng |
| `lop_mo` | - | - | - | - |
| `chi_tiet_dang_ky` | - | - | - | - |

---

#### Trigger `trg_chuong_trinh_hoc_before_insert/update`

**Bảng liên quan:** `chuong_trinh_hoc`, `nganh_hoc`, `mon_hoc`, `dieu_kien_mon_hoc`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `chuong_trinh_hoc` | ✅ | - | ✅ | `trg_chuong_trinh_hoc_before_insert`, `trg_chuong_trinh_hoc_before_update` |
| `nganh_hoc` | - | + | - | ⚠️ `trg_nganh_hoc_before_delete` (thiếu) |
| `mon_hoc` | - | + | + | ✅ `trg_mon_hoc_before_delete` |
| `dieu_kien_mon_hoc` | - | - | - | - |

**⚠️ Thiếu trigger:** `trg_chuong_trinh_hoc_before_delete` - kiểm tra ràng buộc trước khi xóa

---

#### Trigger `trg_dieu_kien_mon_hoc_before_insert/update`

**Bảng liên quan:** `dieu_kien_mon_hoc`, `mon_hoc`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `dieu_kien_mon_hoc` | ✅ | - | ✅ | `trg_dieu_kien_mon_hoc_before_insert`, `trg_dieu_kien_mon_hoc_before_update` |
| `mon_hoc` | - | + | - | ✅ `trg_mon_hoc_before_delete` kiểm tra ràng buộc |

**⚠️ Thiếu trigger:** `trg_dieu_kien_mon_hoc_before_delete` - kiểm tra ảnh hưởng trước khi xóa

---

### Thành viên 3 - Học kỳ & Đăng ký môn học

#### Trigger `trg_hoc_ky_before_insert/update`

**Bảng liên quan:** `hoc_ky`, `nam_hoc`, `phieu_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `hoc_ky` | ✅ | - | ✅ | `trg_hoc_ky_before_insert`, `trg_hoc_ky_before_update` |
| `nam_hoc` | - | + | + | ⚠️ `trg_nam_hoc_before_delete` (thiếu), ⚠️ `trg_nam_hoc_before_update` (thiếu) |
| `phieu_dang_ky` | - | - | - | - |

**⚠️ Thiếu trigger:** 
- `trg_hoc_ky_before_delete` - kiểm tra có phiếu đăng ký/lớp mở không
- `trg_nam_hoc_before_delete` - không cho xóa năm học nếu còn học kỳ

---

#### Trigger `trg_lop_mo_before_insert/update/delete`

**Bảng liên quan:** `lop_mo`, `hoc_ky`, `lop`, `chi_tiet_dang_ky`, `lich_hoc_lop`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `lop_mo` | ✅ | ✅ | ✅ | `trg_lop_mo_before_insert`, `trg_lop_mo_before_update`, `trg_lop_mo_before_delete` |
| `hoc_ky` | - | + | + | ⚠️ `trg_hoc_ky_before_delete` (thiếu), ⚠️ ảnh hưởng khi sửa ngày |
| `lop` | - | + | + | ✅ `trg_lop_before_delete` |
| `chi_tiet_dang_ky` | - | - | - | - |
| `lich_hoc_lop` | - | - | - | - |

---

#### Trigger `trg_phieu_dang_ky_before_insert/update`

**Bảng liên quan:** `phieu_dang_ky`, `sinh_vien`, `hoc_ky`, `doi_tuong_sinh_vien`, `doi_tuong`, `phuong_xa`, `dan_toc`, `chi_tiet_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `phieu_dang_ky` | ✅ | - | ✅ | `trg_phieu_dang_ky_before_insert`, `trg_phieu_dang_ky_before_update` |
| `sinh_vien` | - | + | + | ✅ `trg_sinh_vien_before_delete`, ✅ `trg_sinh_vien_after_update` |
| `hoc_ky` | - | + | + | ⚠️ `trg_hoc_ky_before_delete` (thiếu) |
| `doi_tuong_sinh_vien` | + | + | + | ✅ `trg_doi_tuong_sinh_vien_after_*` |
| `doi_tuong` | - | + | + | ✅ `trg_doi_tuong_before_delete`, ✅ `trg_doi_tuong_after_update` |
| `phuong_xa` | - | + | + | ⚠️ `trg_phuong_xa_before_delete` (thiếu), ✅ `trg_phuong_xa_before_update` |
| `dan_toc` | - | + | + | ⚠️ `trg_dan_toc_before_delete` (thiếu), ✅ `trg_dan_toc_before_update` |
| `chi_tiet_dang_ky` | - | - | - | - |

**⚠️ Thiếu trigger:** `trg_phieu_dang_ky_before_delete` - kiểm tra có chi tiết đăng ký và phiếu thu không

---

#### Trigger `trg_chi_tiet_dang_ky_after_insert/update/delete`

**Bảng liên quan:** `chi_tiet_dang_ky`, `phieu_dang_ky`, `lop_mo`, `lop`, `mon_hoc`, `don_gia_tin_chi`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `chi_tiet_dang_ky` | ✅ | ✅ | ✅ | `trg_chi_tiet_dang_ky_after_insert`, `after_update`, `after_delete` |
| `phieu_dang_ky` | - | + | - | ⚠️ `trg_phieu_dang_ky_before_delete` (thiếu) |
| `lop_mo` | - | + | + | ✅ `trg_lop_mo_before_delete` |
| `lop` | - | + | + | ✅ `trg_lop_before_delete` |
| `mon_hoc` | - | + | + | ✅ `trg_mon_hoc_before_delete` |
| `don_gia_tin_chi` | - | + | + | ⚠️ `trg_don_gia_tin_chi_before_delete` (thiếu), ⚠️ `trg_don_gia_tin_chi_after_update` (thiếu) |

**⚠️ Thiếu trigger:** `trg_chi_tiet_dang_ky_before_insert` - kiểm tra điều kiện tiên quyết, trùng lịch

---

#### Trigger `trg_lich_hoc_lop_before_insert/update/delete`

**Bảng liên quan:** `lich_hoc_lop`, `lop_mo`, `tiet_hoc`, `chi_tiet_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `lich_hoc_lop` | ✅ | ✅ | ✅ | `trg_lich_hoc_lop_before_insert`, `before_update`, `before_delete` |
| `lop_mo` | - | + | - | ✅ `trg_lop_mo_before_delete` |
| `tiet_hoc` | - | + | + | ⚠️ `trg_tiet_hoc_before_delete` (thiếu), ⚠️ `trg_tiet_hoc_before_update` (thiếu) |
| `chi_tiet_dang_ky` | - | - | - | - |

---

### Thành viên 4 - Học phí & Điểm số

#### Trigger `trg_phieu_thu_hoc_phi_before_insert/update` + `after_insert/update/delete`

**Bảng liên quan:** `phieu_thu_hoc_phi`, `phieu_dang_ky`, `sinh_vien`, `thong_bao_ca_nhan`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `phieu_thu_hoc_phi` | ✅ | ✅ | ✅ | `trg_phieu_thu_hoc_phi_before_insert`, `before_update`, `after_insert`, `after_update`, `after_delete` |
| `phieu_dang_ky` | - | + | + | ⚠️ `trg_phieu_dang_ky_before_delete` (thiếu), ảnh hưởng khi sửa số tiền |
| `sinh_vien` | - | + | - | ✅ `trg_sinh_vien_before_delete` |
| `thong_bao_ca_nhan` | - | - | - | - |

---

#### Trigger `trg_diem_sinh_vien_before_insert/update` + `after_insert/update/delete`

**Bảng liên quan:** `diem_sinh_vien`, `sinh_vien`, `mon_hoc`, `hoc_ky`, `chi_tiet_dang_ky`, `cau_hinh_dang_ky`

| Bảng | Thêm | Xóa | Sửa | Trigger xử lý |
|------|------|-----|-----|---------------|
| `diem_sinh_vien` | ✅ | ✅ | ✅ | `trg_diem_sinh_vien_before_insert`, `before_update`, `after_insert`, `after_update`, `after_delete` |
| `sinh_vien` | - | + | - | ✅ `trg_sinh_vien_before_delete` |
| `mon_hoc` | - | + | + | ✅ `trg_mon_hoc_before_delete`, ảnh hưởng khi sửa số tín chỉ |
| `hoc_ky` | - | + | - | ⚠️ `trg_hoc_ky_before_delete` (thiếu) |
| `chi_tiet_dang_ky` | - | - | - | - |
| `cau_hinh_dang_ky` | - | - | - | - |

---

## 📝 MÔ TẢ CHI TIẾT TRIGGER BỔ SUNG

> **Lưu ý:** Các trigger bổ sung sau đã được thêm vào bảng công việc chính của từng thành viên tương ứng ở trên.

### Thành viên 1 - Trigger bổ sung

#### `trg_phuong_xa_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa phường/xã nếu còn sinh viên đang tham chiếu.

**Input:** Dữ liệu phường/xã cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `sinh_vien` có sinh viên nào có `ma_phuong_xa = OLD.ma_phuong_xa` không
- Nếu có: RAISE EXCEPTION 'Không thể xóa phường/xã vì còn sinh viên đang tham chiếu'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có sinh viên tham chiếu

**Ví dụ:**
```sql
-- Nếu có sinh viên thuộc phường/xã '2659':
DELETE FROM phuong_xa WHERE ma_phuong_xa = '2659';
-- Kết quả: Error - Không thể xóa phường/xã vì còn sinh viên đang tham chiếu
```

---

#### `trg_dan_toc_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa dân tộc nếu còn sinh viên đang tham chiếu.

**Input:** Dữ liệu dân tộc cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `sinh_vien` có sinh viên nào có `ma_dan_toc = OLD.ma_dan_toc` không
- Nếu có: RAISE EXCEPTION 'Không thể xóa dân tộc vì còn sinh viên đang tham chiếu'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có sinh viên tham chiếu

**Ví dụ:**
```sql
-- Nếu có sinh viên thuộc dân tộc 'KINH':
DELETE FROM dan_toc WHERE ma_dan_toc = 'KINH';
-- Kết quả: Error - Không thể xóa dân tộc vì còn sinh viên đang tham chiếu
```

---

#### `trg_nganh_hoc_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa ngành học nếu còn sinh viên hoặc chương trình đào tạo đang tham chiếu.

**Input:** Dữ liệu ngành học cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `sinh_vien` có sinh viên nào có `ma_nganh = OLD.ma_nganh` không
- Kiểm tra trong bảng `chuong_trinh_hoc` có CTĐT nào có `ma_nganh = OLD.ma_nganh` không
- Nếu có bất kỳ ràng buộc nào: RAISE EXCEPTION 'Không thể xóa ngành học vì còn dữ liệu tham chiếu'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có dữ liệu tham chiếu

**Ví dụ:**
```sql
-- Nếu có sinh viên thuộc ngành 'KTPM':
DELETE FROM nganh_hoc WHERE ma_nganh = 'KTPM';
-- Kết quả: Error - Không thể xóa ngành học vì còn sinh viên đang tham chiếu
```

---

#### `trg_quan_huyen_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa quận/huyện nếu còn phường/xã đang tham chiếu.

**Input:** Dữ liệu quận/huyện cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `phuong_xa` có phường/xã nào có `ma_quan_huyen = OLD.ma_quan_huyen` không
- Nếu có: RAISE EXCEPTION 'Không thể xóa quận/huyện vì còn phường/xã đang tham chiếu'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có phường/xã tham chiếu

**Ví dụ:**
```sql
-- Nếu có phường/xã thuộc quận/huyện '001':
DELETE FROM quan_huyen WHERE ma_quan_huyen = '001';
-- Kết quả: Error - Không thể xóa quận/huyện vì còn phường/xã đang tham chiếu
```

---

### Thành viên 2 - Trigger bổ sung

#### `trg_khoa_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa khoa nếu còn môn học đang tham chiếu.

**Input:** Dữ liệu khoa cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `mon_hoc` có môn học nào có `ma_khoa = OLD.ma_khoa` không
- Kiểm tra trong bảng `nganh_hoc` có ngành học nào có `ma_khoa = OLD.ma_khoa` không
- Nếu có bất kỳ ràng buộc nào: RAISE EXCEPTION 'Không thể xóa khoa vì còn dữ liệu tham chiếu'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có dữ liệu tham chiếu

**Ví dụ:**
```sql
-- Nếu có môn học thuộc khoa 'CNTT':
DELETE FROM khoa WHERE ma_khoa = 'CNTT';
-- Kết quả: Error - Không thể xóa khoa vì còn môn học đang tham chiếu
```

---

#### `trg_chuong_trinh_hoc_before_delete`
**Mục đích:** Kiểm tra ràng buộc trước khi xóa môn trong chương trình đào tạo.

**Input:** Dữ liệu CTĐT cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra xem môn này có phải là môn bắt buộc không
- Kiểm tra xem có sinh viên nào đang học theo CTĐT này và đã đăng ký môn không
- Nếu có ràng buộc: RAISE EXCEPTION 'Không thể xóa môn khỏi CTĐT vì có ràng buộc'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có

**Ví dụ:**
```sql
-- Nếu môn 'IT001' trong CTĐT 'KTPM' đã có sinh viên đăng ký:
DELETE FROM chuong_trinh_hoc WHERE ma_nganh = 'KTPM' AND ma_mon_hoc = 'IT001';
-- Kết quả: Error - Không thể xóa môn khỏi CTĐT vì có sinh viên đã đăng ký
```

---

#### `trg_dieu_kien_mon_hoc_before_delete`
**Mục đích:** Kiểm tra ảnh hưởng trước khi xóa điều kiện môn học.

**Input:** Dữ liệu điều kiện môn học cần xóa (OLD.*)

**Logic xử lý:**
- Ghi log việc xóa điều kiện môn học
- Kiểm tra xem việc xóa có ảnh hưởng đến sinh viên đang chờ đăng ký không (cảnh báo)
- Cho phép xóa nhưng ghi nhận lịch sử thay đổi

**Output:** Cho phép DELETE và ghi log

**Ví dụ:**
```sql
DELETE FROM dieu_kien_mon_hoc WHERE ma_mon_hoc = 'IT002' AND ma_mon_dieu_kien = 'IT001';
-- Kết quả: Xóa thành công, ghi log 'Đã xóa điều kiện IT001 cho môn IT002'
```

---

### Thành viên 3 - Trigger bổ sung

#### `trg_hoc_ky_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa học kỳ nếu còn phiếu đăng ký hoặc lớp mở.

**Input:** Dữ liệu học kỳ cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `phieu_dang_ky` có phiếu nào có `ma_hoc_ky = OLD.ma_hoc_ky` không
- Kiểm tra trong bảng `lop_mo` có lớp nào có `ma_hoc_ky = OLD.ma_hoc_ky` không
- Nếu có bất kỳ ràng buộc nào: RAISE EXCEPTION 'Không thể xóa học kỳ vì còn dữ liệu tham chiếu'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có

**Ví dụ:**
```sql
-- Nếu có lớp mở trong học kỳ 'HK1_2024':
DELETE FROM hoc_ky WHERE ma_hoc_ky = 'HK1_2024';
-- Kết quả: Error - Không thể xóa học kỳ vì còn lớp mở tham chiếu
```

---

#### `trg_nam_hoc_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa năm học nếu còn học kỳ đang tham chiếu.

**Input:** Dữ liệu năm học cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `hoc_ky` có học kỳ nào có `ma_nam_hoc = OLD.ma_nam_hoc` không
- Nếu có: RAISE EXCEPTION 'Không thể xóa năm học vì còn học kỳ đang tham chiếu'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có học kỳ tham chiếu

**Ví dụ:**
```sql
-- Nếu có học kỳ thuộc năm học '2024':
DELETE FROM nam_hoc WHERE ma_nam_hoc = '2024';
-- Kết quả: Error - Không thể xóa năm học vì còn học kỳ đang tham chiếu
```

---

#### `trg_nam_hoc_before_update`
**Mục đích:** Cập nhật thông tin học kỳ khi thay đổi thông tin năm học.

**Input:** Dữ liệu năm học trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
- Nếu `ma_nam_hoc` thay đổi: kiểm tra không có học kỳ tham chiếu
- Nếu `ten_nam_hoc` thay đổi: cập nhật tên tương ứng trong `hoc_ky` (nếu cần)
- Nếu `ngay_bat_dau` hoặc `ngay_ket_thuc` thay đổi: kiểm tra và cập nhật ngày tương ứng trong học kỳ

**Output:** Cho phép UPDATE và cascade nếu cần

**Ví dụ:**
```sql
-- Cập nhật ngày kết thúc năm học:
UPDATE nam_hoc SET ngay_ket_thuc = '2024-08-31' WHERE ma_nam_hoc = '2024';
-- Kết quả: Cập nhật thành công, các học kỳ liên quan được kiểm tra ngày hợp lệ
```

---

#### `trg_phieu_dang_ky_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa phiếu đăng ký nếu còn chi tiết đăng ký hoặc phiếu thu học phí.

**Input:** Dữ liệu phiếu đăng ký cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `chi_tiet_dang_ky` có chi tiết nào có `ma_phieu_dk = OLD.ma_phieu_dk` không
- Kiểm tra trong bảng `phieu_thu_hoc_phi` có phiếu thu nào có `ma_phieu_dk = OLD.ma_phieu_dk` không
- Nếu có bất kỳ ràng buộc nào: RAISE EXCEPTION 'Không thể xóa phiếu đăng ký vì còn dữ liệu tham chiếu'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có

**Ví dụ:**
```sql
-- Nếu có chi tiết đăng ký trong phiếu 'PDK001':
DELETE FROM phieu_dang_ky WHERE ma_phieu_dk = 'PDK001';
-- Kết quả: Error - Không thể xóa phiếu đăng ký vì còn chi tiết đăng ký
```

---

#### `trg_chi_tiet_dang_ky_before_insert`
**Mục đích:** Kiểm tra điều kiện tiên quyết và trùng lịch trước khi đăng ký môn học.

**Input:** Dữ liệu chi tiết đăng ký mới (NEW.*)

**Logic xử lý:**
- Lấy thông tin sinh viên và lớp mở từ `phieu_dang_ky` và `lop_mo`
- Kiểm tra sinh viên đã hoàn thành các môn tiên quyết trong `dieu_kien_mon_hoc` chưa
- Kiểm tra lịch học của lớp mới có trùng với các lớp đã đăng ký không
- Kiểm tra số lượng đăng ký không vượt quá sức chứa của lớp
- Nếu không đạt điều kiện: RAISE EXCEPTION với thông báo lỗi cụ thể
- Nếu đạt: Cho phép INSERT

**Output:** Cho phép INSERT nếu đủ điều kiện, raise exception nếu không

**Ví dụ:**
```sql
-- Nếu sinh viên chưa hoàn thành môn tiên quyết:
INSERT INTO chi_tiet_dang_ky (ma_phieu_dk, lop_mo_id) VALUES ('PDK001', 10);
-- Kết quả: Error - Sinh viên chưa hoàn thành môn tiên quyết 'IT001'

-- Nếu bị trùng lịch:
INSERT INTO chi_tiet_dang_ky (ma_phieu_dk, lop_mo_id) VALUES ('PDK001', 11);
-- Kết quả: Error - Trùng lịch học với lớp đã đăng ký (Thứ 2, tiết 1-3)
```

---

#### `trg_don_gia_tin_chi_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa đơn giá tín chỉ nếu còn chi tiết đăng ký đang sử dụng.

**Input:** Dữ liệu đơn giá tín chỉ cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `chi_tiet_dang_ky` có chi tiết nào đang sử dụng đơn giá này không
- Nếu có: RAISE EXCEPTION 'Không thể xóa đơn giá vì còn chi tiết đăng ký đang sử dụng'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có

**Ví dụ:**
```sql
-- Nếu có chi tiết đăng ký đang sử dụng đơn giá:
DELETE FROM don_gia_tin_chi WHERE id = 1;
-- Kết quả: Error - Không thể xóa đơn giá vì còn chi tiết đăng ký đang sử dụng
```

---

#### `trg_don_gia_tin_chi_after_update`
**Mục đích:** Cập nhật thành tiền trong chi tiết đăng ký khi đổi đơn giá tín chỉ.

**Input:** Dữ liệu đơn giá trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
- Nếu `don_gia` thay đổi:
  - Tìm tất cả chi tiết đăng ký đang sử dụng đơn giá này
  - Tính lại `thanh_tien = so_tin_chi * NEW.don_gia`
  - Cập nhật `tong_tien_phai_dong` trong `phieu_dang_ky` tương ứng
  - Ghi log thay đổi

**Output:** Cập nhật thành tiền trong các chi tiết đăng ký liên quan

**Ví dụ:**
```sql
-- Cập nhật đơn giá tín chỉ:
UPDATE don_gia_tin_chi SET don_gia = 500000 WHERE id = 1;
-- Kết quả: Tất cả chi tiết đăng ký sử dụng đơn giá này được tính lại thành tiền
```

---

#### `trg_tiet_hoc_before_delete`
**Mục đích:** Kiểm tra và ngăn chặn xóa tiết học nếu còn lịch học đang sử dụng.

**Input:** Dữ liệu tiết học cần xóa (OLD.*)

**Logic xử lý:**
- Kiểm tra trong bảng `lich_hoc_lop` có lịch nào có `ma_tiet = OLD.ma_tiet` không
- Nếu có: RAISE EXCEPTION 'Không thể xóa tiết học vì còn lịch học đang sử dụng'
- Nếu không: Cho phép xóa

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu có

**Ví dụ:**
```sql
-- Nếu có lịch học sử dụng tiết 1:
DELETE FROM tiet_hoc WHERE ma_tiet = 1;
-- Kết quả: Error - Không thể xóa tiết học vì còn lịch học đang sử dụng
```

---

#### `trg_tiet_hoc_before_update`
**Mục đích:** Kiểm tra và cập nhật lịch học khi thay đổi thông tin tiết học.

**Input:** Dữ liệu tiết học trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
- Nếu `gio_bat_dau` hoặc `gio_ket_thuc` thay đổi:
  - Kiểm tra không có xung đột với các tiết khác
  - Kiểm tra thời gian hợp lệ (gio_bat_dau < gio_ket_thuc)
  - Cảnh báo nếu có lịch học đang sử dụng tiết này

**Output:** Cho phép UPDATE nếu hợp lệ, raise exception nếu không

**Ví dụ:**
```sql
-- Cập nhật giờ bắt đầu tiết học:
UPDATE tiet_hoc SET gio_bat_dau = '07:30:00' WHERE ma_tiet = 1;
-- Kết quả: Cập nhật thành công, cảnh báo nếu có lịch học đang sử dụng
```

---

## 🔐 PHÂN QUYỀN BẰNG PHẦN MỀM - Trigger & Function cho bảng phân quyền

### Phụ trách: Phân chia cho cả 4 thành viên (ưu tiên Thành viên 1 phụ trách chính)

> **Lưu ý quan trọng:** Hệ thống phân quyền hoàn toàn bằng phần mềm, KHÔNG dùng database role/grant.
> Quyền được gán qua: `tai_khoan` → `tai_khoan_nhom` → `nhom_nguoi_dung` → `nhom_quyen` → `quyen`

| STT | Tên Trigger/Function | Mô tả | Bảng liên quan |
|-----|---------------------|-------|----------------|
| 1 | `trg_nhom_nguoi_dung_before_insert` | Kiểm tra mã nhóm, tên nhóm không trùng | `nhom_nguoi_dung` |
| 2 | `trg_nhom_nguoi_dung_before_update` | Kiểm tra dữ liệu khi cập nhật nhóm | `nhom_nguoi_dung` |
| 3 | `trg_nhom_nguoi_dung_before_delete` | Kiểm tra có tài khoản thuộc nhóm trước khi xóa | `nhom_nguoi_dung`, `tai_khoan_nhom` |
| 4 | `trg_quyen_before_insert` | Kiểm tra mã quyền, tên quyền, nhóm chức năng hợp lệ | `quyen` |
| 5 | `trg_quyen_before_update` | Kiểm tra dữ liệu khi cập nhật quyền | `quyen` |
| 6 | `trg_quyen_before_delete` | Kiểm tra quyền chưa được gán cho nhóm nào | `quyen`, `nhom_quyen` |
| 7 | `trg_nhom_quyen_before_insert` | Kiểm tra nhóm và quyền tồn tại, tránh trùng lặp | `nhom_quyen`, `nhom_nguoi_dung`, `quyen` |
| 8 | `trg_nhom_quyen_after_insert` | Ghi log khi gán quyền mới cho nhóm | `nhom_quyen` |
| 9 | `trg_nhom_quyen_after_delete` | Ghi log khi xóa quyền khỏi nhóm | `nhom_quyen` |
| 10 | `trg_tai_khoan_nhom_before_insert` | Kiểm tra tài khoản và nhóm tồn tại, tránh trùng lặp | `tai_khoan_nhom`, `tai_khoan`, `nhom_nguoi_dung` |
| 11 | `trg_tai_khoan_nhom_after_insert` | Ghi log khi gán tài khoản vào nhóm | `tai_khoan_nhom` |
| 12 | `trg_tai_khoan_nhom_after_delete` | Ghi log khi xóa tài khoản khỏi nhóm | `tai_khoan_nhom` |
| 13 | `fn_kiem_tra_quyen(ma_tai_khoan, ma_quyen)` | Kiểm tra tài khoản có quyền cụ thể không | `tai_khoan_nhom`, `nhom_quyen`, `quyen` |
| 14 | `fn_lay_danh_sach_quyen(ma_tai_khoan)` | Lấy tất cả quyền của một tài khoản | `tai_khoan_nhom`, `nhom_quyen`, `quyen` |
| 15 | `sp_gan_quyen_nhom(ma_nhom, ma_quyen, nguoi_gan)` | Procedure gán quyền cho nhóm | `nhom_quyen` |
| 16 | `sp_gan_tai_khoan_nhom(ma_tai_khoan, ma_nhom, nguoi_gan)` | Procedure gán tài khoản vào nhóm | `tai_khoan_nhom` |

### 📊 BẢNG TẦM ẢNH HƯỞNG - Bảng `nhom_nguoi_dung`

| Thao tác | Bảng bị ảnh hưởng | Mô tả ảnh hưởng |
|----------|-------------------|-----------------|
| **THÊM** | `nhom_nguoi_dung` | Kiểm tra mã nhóm không trùng, tên nhóm không rỗng |
| **SỬA** | `nhom_nguoi_dung` | Kiểm tra dữ liệu hợp lệ, cập nhật `ngay_cap_nhat` |
| **XÓA** | `nhom_nguoi_dung`, `tai_khoan_nhom`, `nhom_quyen` | Kiểm tra không còn tài khoản thuộc nhóm. Cascade xóa `nhom_quyen` và `tai_khoan_nhom` |

### 📊 BẢNG TẦM ẢNH HƯỞNG - Bảng `quyen`

| Thao tác | Bảng bị ảnh hưởng | Mô tả ảnh hưởng |
|----------|-------------------|-----------------|
| **THÊM** | `quyen` | Kiểm tra mã quyền không trùng, nhóm chức năng hợp lệ |
| **SỬA** | `quyen` | Kiểm tra dữ liệu hợp lệ |
| **XÓA** | `quyen`, `nhom_quyen` | Kiểm tra quyền chưa được gán. Cascade xóa `nhom_quyen` |

### 📊 BẢNG TẦM ẢNH HƯỞNG - Bảng `nhom_quyen`

| Thao tác | Bảng bị ảnh hưởng | Mô tả ảnh hưởng |
|----------|-------------------|-----------------|
| **THÊM** | `nhom_quyen` | Kiểm tra `ma_nhom` tồn tại, `ma_quyen` tồn tại, cặp (ma_nhom, ma_quyen) chưa trùng. Ảnh hưởng tới quyền của tất cả tài khoản thuộc nhóm |
| **XÓA** | `nhom_quyen` | Thu hồi quyền khỏi nhóm. Ảnh hưởng tới quyền của tất cả tài khoản thuộc nhóm |

### 📊 BẢNG TẦM ẢNH HƯỞNG - Bảng `tai_khoan_nhom`

| Thao tác | Bảng bị ảnh hưởng | Mô tả ảnh hưởng |
|----------|-------------------|-----------------|
| **THÊM** | `tai_khoan_nhom` | Kiểm tra `ma_tai_khoan` tồn tại, `ma_nhom` tồn tại, cặp (ma_tai_khoan, ma_nhom) chưa trùng. Tài khoản sẽ có thêm tất cả quyền của nhóm mới |
| **XÓA** | `tai_khoan_nhom` | Xóa liên kết tài khoản khỏi nhóm. Tài khoản mất tất cả quyền của nhóm bị xóa (trừ khi có từ nhóm khác) |

### 📝 MÔ TẢ CHI TIẾT TRIGGER/FUNCTION PHÂN QUYỀN:

#### 1. `trg_nhom_nguoi_dung_before_insert`
**Mục đích:** Kiểm tra và chuẩn hóa dữ liệu trước khi thêm nhóm người dùng mới.

**Logic xử lý:**
- Kiểm tra `ma_nhom` không được NULL và không trùng lặp
- Kiểm tra `ten_nhom` không được rỗng
- Chuẩn hóa `ma_nhom` về dạng UPPER
- Tự động set `ngay_tao = CURRENT_TIMESTAMP`

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

---

#### 2. `trg_nhom_nguoi_dung_before_update`
**Mục đích:** Kiểm tra dữ liệu khi cập nhật nhóm người dùng.

**Logic xử lý:**
- Không cho phép sửa `ma_nhom` (khóa chính)
- Kiểm tra `ten_nhom` không được rỗng
- Tự động set `ngay_cap_nhat = CURRENT_TIMESTAMP`

**Output:** Cho phép UPDATE nếu hợp lệ, raise exception nếu không hợp lệ

---

#### 3. `trg_nhom_nguoi_dung_before_delete`
**Mục đích:** Kiểm tra ràng buộc trước khi xóa nhóm người dùng.

**Logic xử lý:**
- Kiểm tra không có tài khoản nào đang thuộc nhóm (trong `tai_khoan_nhom`)
- Nếu có tài khoản, raise exception: "Không thể xóa nhóm vì còn tài khoản thuộc nhóm"

**Output:** Cho phép DELETE nếu không có ràng buộc, raise exception nếu còn tài khoản

---

#### 4. `trg_quyen_before_insert`
**Mục đích:** Kiểm tra dữ liệu trước khi thêm quyền mới.

**Logic xử lý:**
- Kiểm tra `ma_quyen` không được NULL và không trùng lặp
- Kiểm tra `ten_quyen` không được rỗng
- Kiểm tra `nhom_chuc_nang` không được rỗng
- Chuẩn hóa `ma_quyen` về dạng UPPER

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

---

#### 5. `trg_quyen_before_update`
**Mục đích:** Kiểm tra dữ liệu khi cập nhật quyền hạn.

**Logic xử lý:**
- Không cho phép sửa `ma_quyen` (khóa chính)
- Kiểm tra `ten_quyen` không được rỗng
- Kiểm tra `nhom_chuc_nang` không được rỗng

**Output:** Cho phép UPDATE nếu hợp lệ, raise exception nếu không hợp lệ

---

#### 6. `trg_quyen_before_delete`
**Mục đích:** Kiểm tra quyền chưa được gán cho nhóm nào trước khi xóa.

**Logic xử lý:**
- Kiểm tra `ma_quyen` không tồn tại trong bảng `nhom_quyen`
- Nếu tồn tại, raise exception: "Không thể xóa quyền vì đang được gán cho nhóm"

**Output:** Cho phép DELETE nếu không có ràng buộc

---

#### 7. `trg_nhom_quyen_before_insert`
**Mục đích:** Kiểm tra trước khi gán quyền cho nhóm.

**Logic xử lý:**
- Kiểm tra `ma_nhom` tồn tại trong `nhom_nguoi_dung` và đang hoạt động
- Kiểm tra `ma_quyen` tồn tại trong `quyen` và đang hoạt động
- Kiểm tra cặp (ma_nhom, ma_quyen) chưa tồn tại (tránh trùng lặp)

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

---

#### 8. `trg_tai_khoan_nhom_before_insert`
**Mục đích:** Kiểm tra trước khi gán tài khoản vào nhóm.

**Logic xử lý:**
- Kiểm tra `ma_tai_khoan` tồn tại trong `tai_khoan` và đang hoạt động
- Kiểm tra `ma_nhom` tồn tại trong `nhom_nguoi_dung` và đang hoạt động
- Kiểm tra cặp (ma_tai_khoan, ma_nhom) chưa tồn tại

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

---

#### 9. `fn_kiem_tra_quyen(ma_tai_khoan, ma_quyen)`
**Mục đích:** Kiểm tra tài khoản có quyền cụ thể không (dùng bởi phần mềm để phân quyền).

**Input:** `ma_tai_khoan INTEGER`, `ma_quyen VARCHAR(50)`

**Logic xử lý:**
```sql
SELECT EXISTS (
    SELECT 1
    FROM tai_khoan_nhom tkn
    JOIN nhom_quyen nq ON tkn.ma_nhom = nq.ma_nhom
    JOIN nhom_nguoi_dung nnd ON tkn.ma_nhom = nnd.ma_nhom
    JOIN quyen q ON nq.ma_quyen = q.ma_quyen
    WHERE tkn.ma_tai_khoan = p_ma_tai_khoan
      AND nq.ma_quyen = p_ma_quyen
      AND nnd.trang_thai = TRUE
      AND q.trang_thai = TRUE
);
```

**Output:** `BOOLEAN` - TRUE nếu có quyền, FALSE nếu không

> **Lưu ý hiệu suất:** Function này join 4 bảng và được gọi thường xuyên bởi middleware. Các index `idx_tkn_ma_tai_khoan`, `idx_tkn_ma_nhom`, `idx_nq_ma_nhom`, `idx_nq_ma_quyen` đã được tạo để tối ưu hiệu suất. Phần mềm nên cache kết quả quyền khi đăng nhập để giảm số lần gọi.

---

#### 10. `fn_lay_danh_sach_quyen(ma_tai_khoan)`
**Mục đích:** Lấy tất cả quyền của một tài khoản (phần mềm dùng để xây dựng menu/UI).

**Input:** `ma_tai_khoan INTEGER`

**Output:** `TABLE(ma_quyen, ten_quyen, nhom_chuc_nang)` - Danh sách tất cả quyền của tài khoản

---

#### 11. `sp_gan_quyen_nhom(ma_nhom, ma_quyen, nguoi_gan)`
**Mục đích:** Stored procedure gán quyền cho nhóm người dùng (giao diện phần mềm gọi procedure này).

**Logic xử lý:**
- Kiểm tra nhóm và quyền tồn tại
- INSERT vào `nhom_quyen`
- Ghi log ai đã gán quyền

---

#### 12. `sp_gan_tai_khoan_nhom(ma_tai_khoan, ma_nhom, nguoi_gan)`
**Mục đích:** Stored procedure gán tài khoản vào nhóm người dùng.

**Logic xử lý:**
- Kiểm tra tài khoản và nhóm tồn tại
- INSERT vào `tai_khoan_nhom`
- Ghi log ai đã gán nhóm

---

## 📝 QUY TẮC ĐẶT TÊN

### Trigger
```
trg_<tên_bảng>_<timing>_<event>
Ví dụ: trg_sinh_vien_before_insert
```

### Function
```
fn_<chức_năng>
Ví dụ: fn_lay_ti_le_giam_hoc_phi
```

### Stored Procedure
```
sp_<chức_năng>
Ví dụ: sp_dang_ky_lop
```

---

## ⏰ TIMELINE CÔNG VIỆC

| Giai đoạn | Công việc | Thời gian |
|-----------|-----------|-----------|
| 1 | Phân tích yêu cầu chi tiết | 2 ngày |
| 2 | Viết Trigger/Function/Procedure | 5 ngày |
| 3 | Test đơn vị từng chức năng | 2 ngày |
| 4 | Test tích hợp toàn hệ thống | 2 ngày |
| 5 | Review và hoàn thiện | 1 ngày |

---

## 📌 LƯU Ý QUAN TRỌNG

1. **Đảm bảo tính nhất quán dữ liệu**: Tất cả trigger phải đảm bảo dữ liệu luôn nhất quán
2. **Xử lý lỗi**: Mỗi function/procedure phải có xử lý lỗi rõ ràng
3. **Transaction**: Các procedure phức tạp cần sử dụng transaction để đảm bảo atomic
4. **Performance**: Tránh các query không hiệu quả trong trigger (vì trigger chạy với mỗi row)
5. **Documentation**: Comment rõ ràng cho mỗi trigger/function/procedure
