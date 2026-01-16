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
| 1 | `trg_sinh_vien_before_insert` | Kiểm tra và chuẩn hóa dữ liệu trước khi thêm sinh viên | `sinh_vien` |
| 2 | `trg_sinh_vien_after_insert` | Tự động tạo tài khoản cho sinh viên mới | `sinh_vien`, `tai_khoan` |
| 3 | `trg_doi_tuong_sinh_vien_after_insert` | Cập nhật tỷ lệ giảm HP khi gán đối tượng | `doi_tuong_sinh_vien`, `phieu_dang_ky` |
| 4 | `trg_doi_tuong_sinh_vien_after_delete` | Cập nhật lại tỷ lệ giảm khi xóa đối tượng | `doi_tuong_sinh_vien`, `phieu_dang_ky` |
| 5 | `fn_lay_ti_le_giam_hoc_phi(ma_sv)` | Lấy tỷ lệ giảm học phí theo đối tượng ưu tiên cao nhất (QĐ1) | `doi_tuong`, `doi_tuong_sinh_vien`, `huyen` |
| 6 | `fn_kiem_tra_vung_sau_vung_xa(ma_huyen)` | Kiểm tra huyện có thuộc vùng sâu/xa không (QĐ1) | `huyen` |
| 7 | `sp_lap_ho_so_sinh_vien(...)` | Procedure tạo hồ sơ sinh viên đầy đủ (BM1) | `sinh_vien`, `tai_khoan`, `doi_tuong_sinh_vien` |
| 8 | `trg_huyen_before_update` | Cập nhật tỷ lệ giảm cho SV khi thay đổi vùng sâu/xa | `huyen`, `sinh_vien`, `phieu_dang_ky` |

### 📝 MÔ TẢ CHI TIẾT TỪNG TRIGGER/FUNCTION:

#### 1. `trg_sinh_vien_before_insert`
**Mục đích:** Kiểm tra và chuẩn hóa dữ liệu trước khi thêm sinh viên mới vào database.

**Input:** Dữ liệu sinh viên mới từ lệnh INSERT (NEW.*)

**Logic xử lý:**
- Kiểm tra `ma_sv` không được NULL và không trùng lặp
- Kiểm tra `ho_ten` không được rỗng, chuẩn hóa (trim, capitalize)
- Kiểm tra `ngay_sinh` hợp lệ (không được là ngày trong tương lai, tuổi >= 16)
- Kiểm tra `gioi_tinh` phải là 'Nam' hoặc 'Nữ'
- Kiểm tra `ma_huyen` tồn tại trong bảng `huyen`
- Kiểm tra `ma_nganh` tồn tại trong bảng `nganh_hoc`
- Chuẩn hóa email về dạng lowercase
- Tự động set `ngay_tao = CURRENT_TIMESTAMP`
- Tự động set `trang_thai = 'Đang học'` nếu không được cung cấp

**Output:** Cho phép INSERT nếu hợp lệ, raise exception nếu không hợp lệ

**Ví dụ:**
```sql
-- Trigger sẽ chạy khi thực hiện:
INSERT INTO sinh_vien (ma_sv, ho_ten, ngay_sinh, gioi_tinh, ma_huyen, ma_nganh)
VALUES ('SV001', '  nguyễn văn an  ', '2003-05-15', 'Nam', 'Q1', 'KTPM');
-- Kết quả: ho_ten được chuẩn hóa thành 'Nguyễn Văn An'
```

---

#### 2. `trg_sinh_vien_after_insert`
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

#### 3. `trg_doi_tuong_sinh_vien_after_insert`
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

#### 4. `trg_doi_tuong_sinh_vien_after_delete`
**Mục đích:** Cập nhật lại tỷ lệ giảm học phí khi xóa đối tượng ưu tiên của sinh viên.

**Input:** Dữ liệu đối tượng bị xóa (OLD.ma_sv, OLD.ma_doi_tuong)

**Logic xử lý:**
1. Kiểm tra sinh viên còn đối tượng nào khác không
2. Gọi `fn_lay_ti_le_giam_hoc_phi(OLD.ma_sv)` để tính lại tỷ lệ giảm
3. Cập nhật lại các phiếu đăng ký tương tự như trigger INSERT

**Output:** Cập nhật các phiếu đăng ký của sinh viên

---

#### 5. `fn_lay_ti_le_giam_hoc_phi(p_ma_sv VARCHAR)`
**Mục đích:** Lấy tỷ lệ giảm học phí của sinh viên dựa trên đối tượng ưu tiên có độ ưu tiên cao nhất.

**Input:** 
- `p_ma_sv`: Mã sinh viên (VARCHAR(15))

**Logic xử lý:**
1. Tìm tất cả đối tượng của sinh viên từ `doi_tuong_sinh_vien`
2. JOIN với `doi_tuong` để lấy `ti_le_giam_hoc_phi` và `do_uu_tien`
3. Sắp xếp theo `do_uu_tien ASC` (nhỏ nhất = ưu tiên cao nhất)
4. Lấy `ti_le_giam_hoc_phi` của đối tượng có ưu tiên cao nhất
5. Nếu sinh viên không có đối tượng nào, kiểm tra quê quán có thuộc vùng sâu/xa không:
   - Nếu có → trả về tỷ lệ giảm của đối tượng "Vùng sâu vùng xa" (50%)
   - Nếu không → trả về 0

**Output:** DECIMAL(5,2) - Tỷ lệ giảm học phí (0-100)

**Ví dụ:**
```sql
-- Sinh viên có 2 đối tượng: "Con liệt sĩ" (100%, độ ưu tiên 1) và "Vùng sâu" (50%, độ ưu tiên 4)
SELECT fn_lay_ti_le_giam_hoc_phi('SV001'); -- Kết quả: 100.00

-- Sinh viên không có đối tượng nhưng quê ở vùng sâu/xa
SELECT fn_lay_ti_le_giam_hoc_phi('SV002'); -- Kết quả: 50.00

-- Sinh viên không có đối tượng và quê không ở vùng sâu/xa
SELECT fn_lay_ti_le_giam_hoc_phi('SV003'); -- Kết quả: 0.00
```

---

#### 6. `fn_kiem_tra_vung_sau_vung_xa(p_ma_huyen VARCHAR)`
**Mục đích:** Kiểm tra một huyện có thuộc vùng sâu/vùng xa hay không.

**Input:**
- `p_ma_huyen`: Mã huyện (VARCHAR(10))

**Logic xử lý:**
1. Truy vấn bảng `huyen` với `ma_huyen = p_ma_huyen`
2. Trả về giá trị cột `la_vung_sau_vung_xa`

**Output:** BOOLEAN - TRUE nếu là vùng sâu/xa, FALSE nếu không

**Ví dụ:**
```sql
SELECT fn_kiem_tra_vung_sau_vung_xa('KRONG'); -- TRUE (Huyện Krông Bông, Đắk Lắk)
SELECT fn_kiem_tra_vung_sau_vung_xa('Q1');    -- FALSE (Quận 1, TP.HCM)
```

---

#### 7. `sp_lap_ho_so_sinh_vien(...)`
**Mục đích:** Procedure tạo hồ sơ sinh viên đầy đủ bao gồm: sinh viên, tài khoản, và gán đối tượng (nếu có).

**Input:**
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `p_ma_sv` | VARCHAR(15) | Có | Mã sinh viên |
| `p_ho_ten` | VARCHAR(100) | Có | Họ tên sinh viên |
| `p_ngay_sinh` | DATE | Có | Ngày sinh |
| `p_gioi_tinh` | VARCHAR(5) | Có | 'Nam' hoặc 'Nữ' |
| `p_ma_huyen` | VARCHAR(10) | Có | Mã huyện (quê quán) |
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
   - `ma_huyen` tồn tại trong bảng `huyen`
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
    'Q1',              -- ma_huyen (Quận 1, TP.HCM)
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

#### 8. `trg_huyen_before_update`
**Mục đích:** Cập nhật tỷ lệ giảm học phí cho tất cả sinh viên của huyện khi thay đổi trạng thái vùng sâu/xa.

**Input:** Dữ liệu huyện trước và sau khi UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `la_vung_sau_vung_xa` thay đổi
2. Nếu thay đổi từ FALSE → TRUE:
   - Tìm sinh viên có `ma_huyen = NEW.ma_huyen` và chưa có đối tượng "Vùng sâu vùng xa"
   - Cập nhật tỷ lệ giảm cho các phiếu đăng ký
3. Nếu thay đổi từ TRUE → FALSE:
   - Tìm sinh viên chỉ có đối tượng từ vùng sâu/xa
   - Tính lại tỷ lệ giảm (có thể = 0 nếu không còn đối tượng khác)

**Output:** Cập nhật phiếu đăng ký của sinh viên liên quan

### Chi tiết yêu cầu:
- **BM1**: Lập hồ sơ sinh viên (Họ tên, Ngày sinh, Giới tính, Quê quán, Đối tượng, Ngành học)
- **QĐ1**: 
  - Quê quán gồm Huyện và Tỉnh
  - Lưu danh sách vùng sâu/vùng xa
  - Xác định đối tượng ưu tiên có độ ưu tiên cao nhất
  - Tỷ lệ giảm HP: 100%, 80%, 50%, 30%...

---

## 👤 THÀNH VIÊN 2: Quản lý Môn học & Chương trình học

### Phụ trách: BM2, BM3, QĐ2, QĐ3

| STT | Tên Trigger/Function | Mô tả | Bảng liên quan |
|-----|---------------------|-------|----------------|
| 1 | `trg_mon_hoc_before_insert` | Kiểm tra loại môn (LT/TH) và số tiết hợp lệ | `mon_hoc` |
| 2 | `trg_mon_hoc_after_insert` | Tự động tạo lớp học mặc định cho môn mới | `mon_hoc`, `lop` |
| 3 | `fn_tinh_so_tin_chi(loai_mon, so_tiet)` | Tính số tín chỉ theo QĐ2 (LT: số tiết/15, TH: số tiết/30) | - |
| 4 | `trg_lop_before_insert` | Kiểm tra môn học tồn tại, đặt mã lớp | `lop`, `mon_hoc` |
| 5 | `sp_nhap_danh_sach_mon_hoc(...)` | Procedure nhập danh sách môn học (BM2) | `mon_hoc` |
| 6 | `trg_chuong_trinh_hoc_before_insert` | Kiểm tra ngành và môn học hợp lệ | `chuong_trinh_hoc`, `nganh_hoc`, `mon_hoc` |
| 7 | `sp_nhap_chuong_trinh_hoc(ma_nganh, ...)` | Procedure nhập chương trình học theo ngành (BM3) | `chuong_trinh_hoc`, `nganh_hoc`, `mon_hoc` |
| 8 | `trg_dieu_kien_mon_hoc_before_insert` | Kiểm tra điều kiện tiên quyết/học trước hợp lệ | `dieu_kien_mon_hoc`, `mon_hoc` |
| 9 | `fn_lay_chuong_trinh_hoc_theo_nganh(ma_nganh)` | Lấy danh sách môn học của ngành theo học kỳ (BM3) | `chuong_trinh_hoc` |

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

#### 2. `trg_mon_hoc_after_insert`
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

#### 3. `fn_tinh_so_tin_chi(p_loai_mon VARCHAR, p_so_tiet INTEGER)`
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

#### 4. `trg_lop_before_insert`
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

#### 5. `sp_nhap_danh_sach_mon_hoc(...)`
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

#### 6. `trg_chuong_trinh_hoc_before_insert`
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

#### 7. `sp_nhap_chuong_trinh_hoc(ma_nganh, ...)`
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

#### 8. `trg_dieu_kien_mon_hoc_before_insert`
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

#### 9. `fn_lay_chuong_trinh_hoc_theo_nganh(p_ma_nganh VARCHAR)`
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

### Phụ trách: BM4, BM5, QĐ4, QĐ5

| STT | Tên Trigger/Function | Mô tả | Bảng liên quan |
|-----|---------------------|-------|----------------|
| 1 | `trg_hoc_ky_before_insert` | Kiểm tra năm học, loại học kỳ (Chính/Hè) | `hoc_ky`, `nam_hoc` |
| 2 | `sp_mo_lop_trong_hoc_ky(ma_hoc_ky, ...)` | Procedure mở lớp học trong học kỳ (BM4) | `lop_mo`, `hoc_ky`, `lop` |
| 3 | `trg_lop_mo_before_insert` | Kiểm tra lớp và học kỳ hợp lệ | `lop_mo`, `lop`, `hoc_ky` |
| 4 | `fn_lay_don_gia(loai_mon, loai_hoc, ma_hoc_ky)` | Lấy đơn giá tín chỉ theo loại môn và loại học (QĐ5) | `don_gia_tin_chi`, `hoc_ky` |
| 5 | `trg_phieu_dang_ky_before_insert` | Kiểm tra SV và học kỳ hợp lệ, tính tỷ lệ giảm | `phieu_dang_ky`, `sinh_vien`, `hoc_ky` |
| 6 | `sp_dang_ky_lop(ma_sv, ma_hoc_ky, ma_lop, loai_dang_ky)` | Procedure đăng ký lớp học (BM5) | `phieu_dang_ky`, `chi_tiet_dang_ky`, `lop_mo` |
| 7 | `trg_chi_tiet_dang_ky_after_insert` | Cập nhật tổng tín chỉ và tổng tiền phiếu đăng ký | `chi_tiet_dang_ky`, `phieu_dang_ky` |
| 8 | `trg_chi_tiet_dang_ky_after_update` | Cập nhật khi hủy môn đăng ký | `chi_tiet_dang_ky`, `phieu_dang_ky`, `lop_mo` |
| 9 | `fn_kiem_tra_lop_mo(ma_hoc_ky, ma_lop)` | Kiểm tra lớp có mở trong học kỳ không (QĐ5) | `lop_mo` |
| 10 | `fn_kiem_tra_si_so_lop(ma_lop, ma_hoc_ky)` | Kiểm tra sĩ số còn chỗ trống | `lop_mo`, `lop` |
| 11 | `sp_huy_dang_ky_lop(ma_sv, ma_hoc_ky, ma_lop)` | Procedure hủy đăng ký lớp | `chi_tiet_dang_ky`, `phieu_dang_ky`, `lop_mo` |

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

#### 2. `sp_mo_lop_trong_hoc_ky(ma_hoc_ky, ...)`
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

#### 3. `trg_lop_mo_before_insert`
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

#### 4. `fn_lay_don_gia(p_loai_mon, p_loai_hoc, p_ma_hoc_ky)`
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

#### 5. `trg_phieu_dang_ky_before_insert`
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

#### 6. `sp_dang_ky_lop(ma_sv, ma_hoc_ky, ma_lop, loai_dang_ky)`
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

#### 7. `trg_chi_tiet_dang_ky_after_insert`
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

#### 8. `trg_chi_tiet_dang_ky_after_update`
**Mục đích:** Xử lý khi sinh viên hủy đăng ký môn học (UPDATE trang_thai = 'Đã hủy').

**Input:** Dữ liệu chi tiết đăng ký trước và sau UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `trang_thai` thay đổi từ 'Đã đăng ký' → 'Đã hủy':
   - Cập nhật `ngay_huy = CURRENT_TIMESTAMP`
   - Giảm `so_luong_da_dang_ky` của lớp mở đi 1
   - Tính lại tổng tiền phiếu đăng ký (tương tự trigger INSERT)

**Output:** Cập nhật phiếu đăng ký và lớp mở

---

#### 9. `fn_kiem_tra_lop_mo(p_ma_hoc_ky, p_ma_lop)`
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

#### 10. `fn_kiem_tra_si_so_lop(p_ma_lop, p_ma_hoc_ky)`
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

#### 11. `sp_huy_dang_ky_lop(ma_sv, ma_hoc_ky, ma_lop)`
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

## 👤 THÀNH VIÊN 4: Quản lý Học phí & Báo cáo

### Phụ trách: BM6, BM7, QĐ6, QĐ7

| STT | Tên Trigger/Function | Mô tả | Bảng liên quan |
|-----|---------------------|-------|----------------|
| 1 | `trg_phieu_thu_hoc_phi_before_insert` | Kiểm tra phiếu đăng ký và số tiền thu hợp lệ | `phieu_thu_hoc_phi`, `phieu_dang_ky` |
| 2 | `trg_phieu_thu_hoc_phi_after_insert` | Cập nhật trạng thái đã đóng đủ nếu cần | `phieu_thu_hoc_phi`, `phieu_dang_ky` |
| 3 | `sp_thu_hoc_phi(ma_sv, ma_hoc_ky, so_tien, hinh_thuc, nguoi_thu, ghi_chu)` | Procedure thu học phí (BM6) | `phieu_thu_hoc_phi`, `phieu_dang_ky` |
| 4 | `fn_tinh_so_tien_con_lai(ma_sv, ma_hoc_ky)` | Tính số tiền còn lại phải đóng (QĐ7) | `phieu_dang_ky`, `phieu_thu_hoc_phi` |
| 5 | `fn_tinh_tong_tien_da_thu(so_phieu_dang_ky)` | Tính tổng tiền đã thu cho 1 phiếu đăng ký | `phieu_thu_hoc_phi` |
| 6 | `sp_lap_bao_cao_sv_chua_dong_hp(ma_hoc_ky)` | Procedure lập báo cáo SV chưa đóng đủ HP (BM7) | `phieu_dang_ky`, `phieu_thu_hoc_phi`, `sinh_vien`, `hoc_ky` |
| 7 | `trg_hoc_ky_check_han_dong_hp` | Kiểm tra và cảnh báo SV chưa đóng HP khi đến hạn | `hoc_ky`, `phieu_dang_ky`, `thong_bao_ca_nhan` |
| 8 | `fn_kiem_tra_qua_han_dong_hp(ma_sv, ma_hoc_ky)` | Kiểm tra SV đã quá hạn đóng HP chưa (QĐ6) | `phieu_dang_ky`, `hoc_ky` |
| 9 | `sp_gui_thong_bao_nhac_hp(ma_hoc_ky)` | Gửi thông báo nhắc nộp HP cho SV chưa đóng đủ | `thong_bao_ca_nhan`, `sinh_vien`, `tai_khoan` |
| 10 | `trg_phieu_thu_hoc_phi_after_update` | Xử lý khi hủy phiếu thu | `phieu_thu_hoc_phi`, `phieu_dang_ky` |

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

#### 2. `trg_phieu_thu_hoc_phi_after_insert`
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

#### 3. `sp_thu_hoc_phi(...)`
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

#### 4. `fn_tinh_so_tien_con_lai(p_ma_sv, p_ma_hoc_ky)`
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

#### 5. `fn_tinh_tong_tien_da_thu(p_so_phieu_dang_ky)`
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

#### 6. `sp_lap_bao_cao_sv_chua_dong_hp(ma_hoc_ky)`
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

#### 7. `trg_hoc_ky_check_han_dong_hp`
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

#### 8. `fn_kiem_tra_qua_han_dong_hp(p_ma_sv, p_ma_hoc_ky)`
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

#### 9. `sp_gui_thong_bao_nhac_hp(ma_hoc_ky)`
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

#### 10. `trg_phieu_thu_hoc_phi_after_update`
**Mục đích:** Xử lý khi hủy phiếu thu học phí (UPDATE trang_thai = 'Đã hủy').

**Input:** Dữ liệu phiếu thu trước và sau UPDATE (OLD.*, NEW.*)

**Logic xử lý:**
1. Kiểm tra nếu `trang_thai` thay đổi từ 'Thành công' → 'Đã hủy':
   - Ghi log lý do hủy (nếu có)
   - Tính lại tổng tiền đã thu cho phiếu đăng ký
   - Gửi thông báo cho sinh viên về việc hủy phiếu thu
2. Nếu trước đó sinh viên đã đóng đủ, giờ cần cập nhật lại trạng thái

**Output:** Cập nhật thông tin liên quan

**Ví dụ:**
```sql
-- Hủy phiếu thu do nhập sai số tiền
UPDATE phieu_thu_hoc_phi 
SET trang_thai = 'Đã hủy', ghi_chu = 'Hủy do nhập sai số tiền'
WHERE so_phieu_thu = 1;
-- Kết quả: Tự động tính lại số tiền còn nợ cho phiếu đăng ký
```

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
| **TV1** | BM1 | QĐ1 | 4 | 2 | 1 |
| **TV2** | BM2, BM3 | QĐ2, QĐ3 | 4 | 2 | 2 |
| **TV3** | BM4, BM5 | QĐ4, QĐ5 | 4 | 3 | 3 |
| **TV4** | BM6, BM7 | QĐ6, QĐ7 | 3 | 3 | 3 |

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
