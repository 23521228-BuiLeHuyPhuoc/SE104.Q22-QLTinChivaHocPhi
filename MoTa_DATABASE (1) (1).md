# 📚 TÀI LIỆU MÔ TẢ DATABASE
## Hệ thống Quản lý Đăng ký Môn học và Thu Học phí

---

## 1.  TỔNG QUAN

### 1.1. Thông tin chung
| Thuộc tính | Giá trị |
|------------|---------|
| Tên Database | `ql_dangky_hocphi` |
| Hệ quản trị CSDL | PostgreSQL |
| Phiên bản | 12+ |
| Số lượng bảng | 26 bảng |
| Mã hóa | UTF-8 |

### 1.2. Danh sách các bảng theo nhóm chức năng

| STT | Nhóm | Bảng | Mô tả |
|-----|------|------|-------|
| 1 | Địa danh | `tinh` | Danh sách tỉnh/thành phố (từ ITExpressLocation.sql) |
| 2 | Địa danh | `phuong_xa` | Danh sách phường/xã (từ ITExpressLocation.sql, thay thế `huyen`) |
| 3 | Dân tộc | `dan_toc` | Danh sách dân tộc (54 dân tộc Việt Nam) |
| 4 | Đối tượng | `doi_tuong` | Danh mục đối tượng ưu tiên |
| 5 | Đối tượng | `doi_tuong_sinh_vien` | Liên kết SV với đối tượng |
| 6 | Tổ chức | `khoa` | Danh sách khoa |
| 7 | Tổ chức | `nganh_hoc` | Danh sách ngành học |
| 8 | Nhân sự | `sinh_vien` | Thông tin sinh viên (bao gồm dân tộc) |
| 9 | Môn học | `mon_hoc` | Danh sách môn học (thuộc khoa quản lý) |
| 10 | Môn học | `dieu_kien_mon_hoc` | Điều kiện môn học (tiên quyết, học trước) |
| 11 | Môn học | `lop` | Danh sách lớp học (một môn có nhiều lớp) |
| 12 | Đào tạo | `chuong_trinh_hoc` | Chương trình đào tạo |
| 13 | Thời gian | `nam_hoc` | Danh sách năm học |
| 14 | Thời gian | `hoc_ky` | Danh sách học kỳ |
| 15 | Thời gian | `tiet_hoc` | Danh sách tiết học (Tiết 1-10, Buổi tối) |
| 16 | Đào tạo | `lop_mo` | Lớp mở trong học kỳ |
| 17 | Đào tạo | `lich_hoc_lop` | Lịch học chi tiết của lớp mở |
| 18 | Đăng ký | `phieu_dang_ky` | Phiếu đăng ký học phần (có thống kê theo loại học) |
| 19 | Đăng ký | `chi_tiet_dang_ky` | Chi tiết lớp đăng ký |
| 20 | Điểm số | `diem_sinh_vien` | Điểm các môn học của sinh viên |
| 21 | Học phí | `phieu_thu_hoc_phi` | Phiếu thu học phí |
| 22 | Cấu hình | `don_gia_tin_chi` | Đơn giá tín chỉ theo loại học |
| 23 | Cấu hình | `cau_hinh_dang_ky` | Cấu hình quy định đăng ký (số TC tối đa, GPA vượt) |
| 24 | Tài khoản | `tai_khoan` | Tài khoản đăng nhập (phân quyền qua cột `role` bằng phần mềm) |
| 25 | Quản trị | `quan_tri_vien` | Thông tin quản trị viên |
| 26 | Thông báo | `thong_bao` | Thông báo (gộp chung và cá nhân, phân biệt qua thuộc tính `loai`) |

> **Ghi chú phân quyền:** Phân quyền được thực hiện hoàn toàn bằng phần mềm (backend middleware), dựa trên cột `role` trong bảng `tai_khoan`. Backend kiểm tra `role` (admin/sinh_vien) để xác định quyền truy cập. Không cần thêm bảng CSDL riêng cho phân quyền.

---

## 2. MÔ TẢ CHI TIẾT CÁC BẢNG

---

### 2.1. BẢNG `tinh` - Tỉnh/Thành phố

**Mô tả:** Lưu trữ danh sách các tỉnh/thành phố (QĐ1)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_tinh` | VARCHAR(10) | NO | - | **PK** - Mã tỉnh |
| `ten_tinh` | VARCHAR(100) | NO | - | Tên tỉnh/thành phố |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_tinh`

**Ràng buộc:** Không có

**Ví dụ dữ liệu:**
```sql
| ma_tinh | ten_tinh           | trang_thai |
|---------|--------------------|------------|
| HCM     | TP.  Hồ Chí Minh    | true       |
| HN      | Hà Nội             | true       |
| DL      | Đắk Lắk            | true       |
```

---

### 2.2. BẢNG `phuong_xa` - Phường/Xã

**Mô tả:** Lưu trữ danh sách phường/xã (thay thế bảng `huyen`), phân loại khu vực ưu tiên theo QĐ1 và tra-cuu-khu-vuc-uu-tien-2025.docx. Dữ liệu từ file ITExpressLocation.sql.

> ⚠️ **Lưu ý:** Đối tượng "vùng sâu vùng xa" = sinh viên có `ma_phuong_xa` thuộc KV3 **VÀ** có `ma_dan_toc` là dân tộc thiểu số.

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_phuong_xa` | VARCHAR(20) | NO | - | **PK** - Mã phường/xã |
| `ten_phuong_xa` | VARCHAR(100) | NO | - | Tên phường/xã |
| `ma_tinh` | VARCHAR(10) | NO | - | **FK** → `tinh.ma_tinh` |
| `loai` | VARCHAR(30) | YES | 'Xã' | Loại: 'Phường', 'Xã', 'Thị trấn' |
| `khu_vuc` | VARCHAR(10) | YES | 'KV1' | Khu vực ưu tiên: 'KV1', 'KV2', 'KV2-NT', 'KV3' |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_phuong_xa`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_phuong_xa_tinh` | `ma_tinh` | `tinh(ma_tinh)` | Phường/xã thuộc tỉnh |

**Phân loại khu vực ưu tiên:**
- **KV1**: Thành phố, thị xã, vùng đồng bằng
- **KV2**: Vùng nông thôn, ngoại thành
- **KV2-NT**: Vùng nông thôn đặc biệt
- **KV3**: Vùng sâu, vùng xa, biên giới, hải đảo, vùng đồng bào dân tộc thiểu số

**Ví dụ dữ liệu:**
```sql
| ma_phuong_xa | ten_phuong_xa      | ma_tinh | loai    | khu_vuc |
|--------------|--------------------|---------|---------| --------|
| 2659         | Vũng Tàu           | 29      | Phường  | KV1     |
| 1045         | Xã Mường Tè        | 14      | Xã      | KV3     |
```

---

### 2.2.1. BẢNG `dan_toc` - Dân tộc

**Mô tả:** Danh sách 54 dân tộc Việt Nam, phân biệt dân tộc Kinh và dân tộc thiểu số.

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_dan_toc` | VARCHAR(10) | NO | - | **PK** - Mã dân tộc |
| `ten_dan_toc` | VARCHAR(100) | NO | - | Tên dân tộc |
| `la_dan_toc_thieu_so` | BOOLEAN | YES | FALSE | TRUE nếu là dân tộc thiểu số |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_dan_toc`

**Ví dụ dữ liệu:**
```sql
| ma_dan_toc | ten_dan_toc | la_dan_toc_thieu_so |
|------------|-------------|---------------------|
| KINH       | Kinh        | false               |
| TAY        | Tày         | true                |
| MONG       | Mông        | true                |
```

---

### 2.3. BẢNG `doi_tuong` - Đối tượng ưu tiên

**Mô tả:** Danh mục các đối tượng ưu tiên với tỷ lệ giảm học phí (QĐ1)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_doi_tuong` | VARCHAR(10) | NO | - | **PK** - Mã đối tượng |
| `ten_doi_tuong` | VARCHAR(100) | NO | - | Tên đối tượng |
| `ti_le_giam_hoc_phi` | DECIMAL(5,2) | NO | - | Tỷ lệ giảm HP (0-100%) |
| `do_uu_tien` | INTEGER | NO | - | Độ ưu tiên (nhỏ = cao) |
| `mo_ta` | VARCHAR(300) | YES | - | Mô tả |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_doi_tuong`

**Ràng buộc:**
- `ti_le_giam_hoc_phi` phải >= 0 và <= 100

**Ví dụ dữ liệu:**
```sql
| ma_doi_tuong | ten_doi_tuong    | ti_le_giam_hoc_phi | do_uu_tien |
|--------------|------------------|-------------------|------------|
| DT01         | Con liệt sĩ      | 100. 00            | 1          |
| DT02         | Con thương binh  | 80.00             | 2          |
| DT03         | Vùng sâu vùng xa | 50.00             | 3          |
```

---

### 2.4. BẢNG `doi_tuong_sinh_vien` - Đối tượng của Sinh viên

**Mô tả:** Liên kết sinh viên với các đối tượng ưu tiên (QĐ1:  một SV có thể thuộc nhiều đối tượng)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `id` | SERIAL | NO | Auto | **PK** - ID tự tăng |
| `ma_sv` | VARCHAR(15) | NO | - | **FK** → `sinh_vien.ma_sv` |
| `ma_doi_tuong` | VARCHAR(10) | NO | - | **FK** → `doi_tuong.ma_doi_tuong` |
| `file_minh_chung` | VARCHAR(255) | YES | - | File đính kèm minh chứng |
| `ghi_chu` | VARCHAR(200) | YES | - | Ghi chú |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `id`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_dtsv_sv` | `ma_sv` | `sinh_vien(ma_sv)` | Sinh viên |
| `fk_dtsv_dt` | `ma_doi_tuong` | `doi_tuong(ma_doi_tuong)` | Đối tượng |

**Ràng buộc UNIQUE:** `(ma_sv, ma_doi_tuong)` - Mỗi SV chỉ gán 1 lần cho mỗi đối tượng

---

### 2.5. BẢNG `khoa` - Khoa

**Mô tả:** Danh sách các khoa trong trường (QĐ1)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_khoa` | VARCHAR(10) | NO | - | **PK** - Mã khoa |
| `ten_khoa` | VARCHAR(100) | NO | - | Tên khoa |
| `ten_viet_tat` | VARCHAR(20) | YES | - | Tên viết tắt |
| `sdt` | VARCHAR(15) | YES | - | Số điện thoại |
| `email` | VARCHAR(100) | YES | - | Email |
| `dia_chi` | VARCHAR(200) | YES | - | Địa chỉ |
| `truong_khoa` | VARCHAR(100) | YES | - | Tên trưởng khoa |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_khoa`

---

### 2.6. BẢNG `nganh_hoc` - Ngành học

**Mô tả:** Danh sách ngành học thuộc các khoa (QĐ1:  mỗi khoa có nhiều ngành)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_nganh` | VARCHAR(10) | NO | - | **PK** - Mã ngành |
| `ten_nganh` | VARCHAR(100) | NO | - | Tên ngành |
| `ma_khoa` | VARCHAR(10) | NO | - | **FK** → `khoa.ma_khoa` |
| `so_tin_chi_toi_thieu` | INTEGER | YES | 120 | Số tín chỉ tối thiểu |
| `thoi_gian_dao_tao` | DECIMAL(3,1) | YES | 4 | Thời gian đào tạo (năm) |
| `mo_ta` | VARCHAR(500) | YES | - | Mô tả |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_nganh`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_nganh_khoa` | `ma_khoa` | `khoa(ma_khoa)` | Ngành thuộc khoa |

---

### 2.7. BẢNG `sinh_vien` - Sinh viên

**Mô tả:** Thông tin sinh viên (BM1, QĐ1). Mỗi sinh viên có thể liên kết với một tài khoản để đăng nhập hệ thống.

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_sv` | VARCHAR(15) | NO | - | **PK** - Mã sinh viên |
| `ma_tai_khoan` | INTEGER | YES | - | **FK** → `tai_khoan.ma_tai_khoan` (UNIQUE) |
| `ho_ten` | VARCHAR(100) | NO | - | Họ tên (BM1) |
| `ngay_sinh` | DATE | NO | - | Ngày sinh (BM1) |
| `gioi_tinh` | VARCHAR(5) | NO | - | Giới tính:  'Nam'/'Nữ' (BM1) |
| `cccd` | VARCHAR(20) | YES | - | Số CCCD (UNIQUE) |
| `ma_huyen` | VARCHAR(10) | NO | - | **FK** → `huyen.ma_huyen` (Quê quán - BM1) |
| `ma_nganh` | VARCHAR(10) | NO | - | **FK** → `nganh_hoc.ma_nganh` (Ngành học - BM1) |
| `dia_chi_lien_he` | VARCHAR(200) | YES | - | Địa chỉ liên hệ |
| `sdt` | VARCHAR(15) | YES | - | Số điện thoại |
| `email` | VARCHAR(100) | YES | - | Email |
| `anh_dai_dien` | VARCHAR(255) | YES | - | Đường dẫn ảnh |
| `ho_ten_cha` | VARCHAR(100) | YES | - | Họ tên cha |
| `sdt_cha` | VARCHAR(15) | YES | - | SĐT cha |
| `ho_ten_me` | VARCHAR(100) | YES | - | Họ tên mẹ |
| `sdt_me` | VARCHAR(15) | YES | - | SĐT mẹ |
| `ngay_nhap_hoc` | DATE | YES | CURRENT_DATE | Ngày nhập học |
| `trang_thai` | VARCHAR(30) | YES | 'Đang học' | Trạng thái |
| `ghi_chu` | VARCHAR(300) | YES | - | Ghi chú |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMP | YES | - | Ngày cập nhật |

**Khóa chính:** `ma_sv`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_sv_huyen` | `ma_huyen` | `huyen(ma_huyen)` | Quê quán (QĐ1) |
| `fk_sv_nganh` | `ma_nganh` | `nganh_hoc(ma_nganh)` | Ngành học (QĐ1) |
| `fk_sv_tk` | `ma_tai_khoan` | `tai_khoan(ma_tai_khoan)` | Tài khoản đăng nhập của sinh viên |

**Ràng buộc:**
- `gioi_tinh` IN ('Nam', 'Nữ')
- `trang_thai` IN ('Đang học', 'Bảo lưu', 'Nghỉ học', 'Tốt nghiệp')
- `cccd` UNIQUE
- `ma_tai_khoan` UNIQUE (mỗi sinh viên chỉ có 1 tài khoản)

**Lưu ý:** Bảng `sinh_vien` có mối quan hệ 1-1 với bảng `tai_khoan` thông qua cột `ma_tai_khoan`. Mỗi sinh viên phải có một tài khoản với `role = 'sinh_vien'` trong bảng `tai_khoan`. Ràng buộc này được kiểm soát ở mức ứng dụng (application-level constraint).

---

### 2.8. BẢNG `mon_hoc` - Môn học

**Mô tả:** Danh sách môn học thuộc khoa quản lý (BM2, QĐ2)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_mon_hoc` | VARCHAR(15) | NO | - | **PK** - Mã môn học (BM2) |
| `ten_mon_hoc` | VARCHAR(150) | NO | - | Tên môn học (BM2) |
| `ma_khoa` | VARCHAR(10) | NO | - | **FK** → `khoa.ma_khoa` (Khoa quản lý) |
| `loai_mon` | VARCHAR(5) | NO | - | Loại môn:  'LT'/'TH' (BM2, QĐ2) |
| `so_tiet` | INTEGER | NO | - | Số tiết (BM2, QĐ2) |
| `so_tin_chi` | INTEGER | - | **Computed** | Số tín chỉ (QĐ2) |
| `mo_ta` | VARCHAR(500) | YES | - | Mô tả |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_mon_hoc`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_monhoc_khoa` | `ma_khoa` | `khoa(ma_khoa)` | Khoa quản lý môn học |

**Cột tính toán (Computed Column):**
```sql
so_tin_chi = CASE 
    WHEN loai_mon = 'LT' THEN so_tiet / 15   -- QĐ2: LT = số tiết/15
    WHEN loai_mon = 'TH' THEN so_tiet / 30   -- QĐ2: TH = số tiết/30
    ELSE 0 
END
```

**Ràng buộc:**
- `loai_mon` IN ('LT', 'TH')
- `so_tiet` > 0

---

### 2.8.1. BẢNG `dieu_kien_mon_hoc` - Điều kiện môn học

**Mô tả:** Lưu trữ các điều kiện/ràng buộc giữa các môn học, bao gồm môn tiên quyết (prerequisite) và môn học trước (prior course).

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `id` | SERIAL | NO | Auto | **PK** - ID tự tăng |
| `ma_mon_hoc` | VARCHAR(15) | NO | - | **FK** → `mon_hoc.ma_mon_hoc` (Môn học chính) |
| `ma_mon_dieu_kien` | VARCHAR(15) | NO | - | **FK** → `mon_hoc.ma_mon_hoc` (Môn điều kiện) |
| `loai_dieu_kien` | VARCHAR(20) | NO | 'hoc_truoc' | Loại điều kiện: 'tien_quyet'/'hoc_truoc' |
| `mo_ta` | VARCHAR(200) | YES | - | Mô tả chi tiết |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `id`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_dkmh_monhoc` | `ma_mon_hoc` | `mon_hoc(ma_mon_hoc)` | Môn học chính |
| `fk_dkmh_monhoc_dk` | `ma_mon_dieu_kien` | `mon_hoc(ma_mon_hoc)` | Môn học điều kiện |

**Ràng buộc:**
- `loai_dieu_kien` IN ('tien_quyet', 'hoc_truoc')
- UNIQUE `(ma_mon_hoc, ma_mon_dieu_kien, loai_dieu_kien)` - Mỗi cặp môn học chỉ có 1 loại điều kiện

**Giải thích loại điều kiện:**
- **`tien_quyet` (Prerequisite):** Sinh viên **PHẢI ĐẠT** môn điều kiện (đã học và có điểm đạt) trước khi được phép đăng ký môn học chính.
- **`hoc_truoc` (Prior course):** Sinh viên **PHẢI ĐĂNG KÝ HỌC** môn điều kiện trước hoặc đồng thời với môn học chính (không yêu cầu đã đạt).

**Ví dụ dữ liệu:**
```sql
| id | ma_mon_hoc | ma_mon_dieu_kien | loai_dieu_kien | mo_ta |
|----|------------|------------------|----------------|-------|
| 1  | CS106      | IT003            | hoc_truoc      | Cần học CTDL&GT trước |
| 2  | CS211      | CS106            | hoc_truoc      | Cần học TTNT trước |
| 3  | ADENG3     | ADENG2           | tien_quyet     | Phải đạt Anh văn TC 2 |
| 4  | JAN02      | JAN01            | tien_quyet     | Phải đạt Tiếng Nhật 1 |
```

---

### 2.9. BẢNG `lop` - Lớp học

**Mô tả:** Danh sách các lớp học của môn học (một môn có thể có nhiều lớp)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_lop` | VARCHAR(20) | NO | - | **PK** - Mã lớp |
| `ten_lop` | VARCHAR(100) | NO | - | Tên lớp (VD: "CSDL_01", "CSDL_02") |
| `ma_mon_hoc` | VARCHAR(15) | NO | - | **FK** → `mon_hoc.ma_mon_hoc` |
| `giang_vien` | VARCHAR(100) | YES | - | Giảng viên phụ trách |
| `lich_hoc` | VARCHAR(200) | YES | - | Lịch học (VD: "Thứ 2, Tiết 1-3") |
| `phong_hoc` | VARCHAR(50) | YES | - | Phòng học |
| `so_luong_toi_da` | INTEGER | YES | 50 | Số lượng SV tối đa |
| `mo_ta` | VARCHAR(300) | YES | - | Mô tả |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_lop`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_lop_monhoc` | `ma_mon_hoc` | `mon_hoc(ma_mon_hoc)` | Lớp thuộc môn học |

**Ví dụ dữ liệu:**
```sql
| ma_lop     | ten_lop    | ma_mon_hoc | giang_vien     | lich_hoc              |
|------------|------------|------------|----------------|----------------------|
| CSDL01     | CSDL_01    | LT005      | Nguyễn Văn A   | Thứ 2, Tiết 1-3      |
| CSDL02     | CSDL_02    | LT005      | Trần Thị B     | Thứ 4, Tiết 6-8      |
| LTW01      | LTW_01     | LT006      | Lê Văn C       | Thứ 3, Tiết 1-3      |
```

---

### 2.10. BẢNG `chuong_trinh_hoc` - Chương trình học

**Mô tả:** Chương trình đào tạo theo ngành (BM3, QĐ3)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `id` | SERIAL | NO | Auto | **PK** - ID tự tăng |
| `ma_nganh` | VARCHAR(10) | NO | - | **FK** → `nganh_hoc.ma_nganh` (BM3) |
| `ma_mon_hoc` | VARCHAR(15) | NO | - | **FK** → `mon_hoc.ma_mon_hoc` (BM3) |
| `hoc_ky_du_kien` | INTEGER | NO | - | Học kỳ dự kiến (BM3) |
| `bat_buoc` | BOOLEAN | YES | TRUE | Môn bắt buộc |
| `ghi_chu` | VARCHAR(200) | YES | - | Ghi chú (BM3) |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `id`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_cth_nganh` | `ma_nganh` | `nganh_hoc(ma_nganh)` | Thuộc ngành |
| `fk_cth_mon` | `ma_mon_hoc` | `mon_hoc(ma_mon_hoc)` | Môn học |

**Ràng buộc:**
- UNIQUE `(ma_nganh, ma_mon_hoc)` - Mỗi môn chỉ xuất hiện 1 lần trong 1 ngành
- `hoc_ky_du_kien` >= 1 AND <= 10

---

### 2.11. BẢNG `nam_hoc` - Năm học

**Mô tả:** Danh sách năm học (BM4)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_nam_hoc` | VARCHAR(15) | NO | - | **PK** - Mã năm học (VD: 2024-2025) |
| `ten_nam_hoc` | VARCHAR(50) | NO | - | Tên năm học (BM4) |
| `nam_bat_dau` | INTEGER | NO | - | Năm bắt đầu |
| `nam_ket_thuc` | INTEGER | NO | - | Năm kết thúc |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_nam_hoc`

---

### 2.12. BẢNG `hoc_ky` - Học kỳ

**Mô tả:** Danh sách học kỳ (BM4, QĐ4, QĐ6)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_hoc_ky` | VARCHAR(15) | NO | - | **PK** - Mã học kỳ |
| `ten_hoc_ky` | VARCHAR(50) | NO | - | Tên:  HK I, HK II, HK Hè (BM4) |
| `ma_nam_hoc` | VARCHAR(15) | NO | - | **FK** → `nam_hoc.ma_nam_hoc` |
| `loai_hoc_ky` | VARCHAR(20) | YES | 'Chính' | Loại:  'Chính'/'Hè' (QĐ4) |
| `thu_tu` | INTEGER | YES | 1 | Thứ tự trong năm (1, 2, 3) |
| `ngay_bat_dau` | DATE | YES | - | Ngày bắt đầu |
| `ngay_ket_thuc` | DATE | YES | - | Ngày kết thúc |
| `ngay_bat_dau_dang_ky` | TIMESTAMP | YES | - | Bắt đầu đăng ký |
| `ngay_ket_thuc_dang_ky` | TIMESTAMP | YES | - | Kết thúc đăng ký |
| `han_dong_hoc_phi` | DATE | YES | - | Hạn đóng HP (QĐ6) |
| `trang_thai` | VARCHAR(20) | YES | 'Sắp diễn ra' | Trạng thái |
| `ghi_chu` | VARCHAR(300) | YES | - | Ghi chú |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_hoc_ky`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_hk_namhoc` | `ma_nam_hoc` | `nam_hoc(ma_nam_hoc)` | Thuộc năm học |

**Ràng buộc:**
- `loai_hoc_ky` IN ('Chính', 'Hè')
- `trang_thai` IN ('Sắp diễn ra', 'Đang diễn ra', 'Đã kết thúc')

---

### 2.13. BẢNG `lop_mo` - Lớp mở trong học kỳ

**Mô tả:** Danh sách lớp học mở đăng ký trong học kỳ (BM4, QĐ4, QĐ5)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `id` | SERIAL | NO | Auto | **PK** - ID tự tăng |
| `ma_hoc_ky` | VARCHAR(15) | NO | - | **FK** → `hoc_ky.ma_hoc_ky` (BM4) |
| `ma_lop` | VARCHAR(20) | NO | - | **FK** → `lop.ma_lop` |
| `so_luong_da_dang_ky` | INTEGER | YES | 0 | Số SV đã đăng ký |
| `ghi_chu` | VARCHAR(200) | YES | - | Ghi chú |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `id`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_lopmo_hocky` | `ma_hoc_ky` | `hoc_ky(ma_hoc_ky)` | Học kỳ |
| `fk_lopmo_lop` | `ma_lop` | `lop(ma_lop)` | Lớp học |

**Ràng buộc:**
- UNIQUE `(ma_hoc_ky, ma_lop)` - Mỗi lớp chỉ mở 1 lần trong 1 học kỳ

---

### 2.14. BẢNG `phieu_dang_ky` - Phiếu đăng ký học phần

**Mô tả:** Phiếu đăng ký học phần của sinh viên (BM5, QĐ5, QĐ7). Bao gồm thống kê chi tiết theo loại đăng ký (học mới, học lại, học cải thiện) để theo dõi tác động của đối tượng sinh viên và loại học lên học phí.

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `so_phieu` | SERIAL | NO | Auto | **PK** - Số phiếu (BM5) |
| `ma_sv` | VARCHAR(15) | NO | - | **FK** → `sinh_vien.ma_sv` (BM5) |
| `ma_hoc_ky` | VARCHAR(15) | NO | - | **FK** → `hoc_ky.ma_hoc_ky` (BM5) |
| `ngay_lap` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày lập (BM5) |
| `tong_tin_chi` | INTEGER | YES | 0 | Tổng tín chỉ đăng ký |
| `so_mon_hoc_moi` | INTEGER | YES | 0 | Số môn học mới |
| `so_tin_chi_hoc_moi` | INTEGER | YES | 0 | Số tín chỉ học mới |
| `tien_hoc_moi` | DECIMAL(15,0) | YES | 0 | Tiền học mới |
| `so_mon_hoc_lai` | INTEGER | YES | 0 | Số môn học lại |
| `so_tin_chi_hoc_lai` | INTEGER | YES | 0 | Số tín chỉ học lại |
| `tien_hoc_lai` | DECIMAL(15,0) | YES | 0 | Tiền học lại |
| `so_mon_hoc_cai_thien` | INTEGER | YES | 0 | Số môn học cải thiện |
| `so_tin_chi_hoc_cai_thien` | INTEGER | YES | 0 | Số tín chỉ học cải thiện |
| `tien_hoc_cai_thien` | DECIMAL(15,0) | YES | 0 | Tiền học cải thiện |
| `tong_tien_dang_ky` | DECIMAL(15,0) | YES | 0 | Tổng tiền đăng ký (BM7) |
| `ti_le_giam` | DECIMAL(5,2) | YES | 0 | Tỷ lệ giảm HP (QĐ1) |
| `tien_mien_giam` | DECIMAL(15,0) | YES | 0 | Tiền được miễn giảm |
| `tong_tien_phai_dong` | DECIMAL(15,0) | YES | 0 | Tổng tiền phải đóng (BM7) |
| `trang_thai` | VARCHAR(30) | YES | 'Đã đăng ký' | Trạng thái |
| `ghi_chu` | VARCHAR(300) | YES | - | Ghi chú |
| `ngay_cap_nhat` | TIMESTAMP | YES | - | Ngày cập nhật |

**Khóa chính:** `so_phieu`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_pdk_sv` | `ma_sv` | `sinh_vien(ma_sv)` | Sinh viên |
| `fk_pdk_hk` | `ma_hoc_ky` | `hoc_ky(ma_hoc_ky)` | Học kỳ |

**Ràng buộc:**
- UNIQUE `(ma_sv, ma_hoc_ky)` - Mỗi SV chỉ có 1 phiếu đăng ký/học kỳ
- `trang_thai` IN ('Đã đăng ký', 'Đã hủy')

**Công thức tính toán:**
```
tong_tien_dang_ky = tien_hoc_moi + tien_hoc_lai + tien_hoc_cai_thien
                  = SUM(chi_tiet_dang_ky.thanh_tien)
tien_mien_giam = tong_tien_dang_ky * ti_le_giam / 100
tong_tien_phai_dong = tong_tien_dang_ky - tien_mien_giam  (QĐ7)
```

**Lưu ý:** Tỷ lệ giảm (`ti_le_giam`) được xác định dựa trên đối tượng ưu tiên của sinh viên (bảng `doi_tuong_sinh_vien`). Đơn giá của từng loại đăng ký (học mới, học lại, học cải thiện) khác nhau theo cấu hình trong bảng `don_gia_tin_chi`.

---

### 2.15. BẢNG `chi_tiet_dang_ky` - Chi tiết đăng ký

**Mô tả:** Chi tiết các lớp học đăng ký trong phiếu (BM5, QĐ5)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `id` | SERIAL | NO | Auto | **PK** - ID tự tăng |
| `so_phieu` | INTEGER | NO | - | **FK** → `phieu_dang_ky.so_phieu` |
| `ma_lop` | VARCHAR(20) | NO | - | **FK** → `lop.ma_lop` |
| `loai_dang_ky` | VARCHAR(20) | YES | 'hoc_moi' | Loại đăng ký: 'hoc_moi'/'hoc_lai'/'hoc_cai_thien' |
| `so_tin_chi` | INTEGER | NO | - | Số tín chỉ (BM5) |
| `loai_mon` | VARCHAR(5) | NO | - | Loại môn: 'LT'/'TH' |
| `don_gia` | DECIMAL(12,0) | NO | - | Đơn giá/tín chỉ (QĐ5) |
| `thanh_tien` | DECIMAL(15,0) | NO | - | Thành tiền = số TC × đơn giá |
| `trang_thai` | VARCHAR(30) | YES | 'Đã đăng ký' | Trạng thái |
| `ngay_dang_ky` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày đăng ký |
| `ngay_huy` | TIMESTAMP | YES | - | Ngày hủy |
| `ly_do_huy` | VARCHAR(200) | YES | - | Lý do hủy |

**Khóa chính:** `id`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_ctdk_phieu` | `so_phieu` | `phieu_dang_ky(so_phieu)` | Phiếu đăng ký |
| `fk_ctdk_lop` | `ma_lop` | `lop(ma_lop)` | Lớp học |

**Ràng buộc:**
- UNIQUE `(so_phieu, ma_lop)` - Mỗi lớp chỉ đăng ký 1 lần/phiếu
- `trang_thai` IN ('Đã đăng ký', 'Đã hủy')
- `loai_dang_ky` IN ('hoc_moi', 'hoc_lai', 'hoc_cai_thien')

**Đơn giá theo loại đăng ký (xem bảng don_gia_tin_chi):**
- Học mới (kỳ chính): Đơn giá cơ bản
- Học lại: Đơn giá theo cấu hình (thường cao hơn)
- Học cải thiện: Đơn giá theo cấu hình
- Học hè: Đơn giá theo cấu hình (áp dụng khi loai_hoc_ky = 'Hè')

---

### 2.16. BẢNG `phieu_thu_hoc_phi` - Phiếu thu học phí

**Mô tả:** Phiếu thu học phí (BM6, QĐ6: SV có thể đóng nhiều lần)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `so_phieu_thu` | SERIAL | NO | Auto | **PK** - Số phiếu thu (BM6) |
| `so_phieu_dang_ky` | INTEGER | NO | - | **FK** → `phieu_dang_ky.so_phieu` |
| `ma_sv` | VARCHAR(15) | NO | - | **FK** → `sinh_vien.ma_sv` (BM6) |
| `ngay_lap` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày lập (BM6) |
| `so_tien_thu` | DECIMAL(15,0) | NO | - | Số tiền thu (BM6) |
| `hinh_thuc_thu` | VARCHAR(50) | YES | 'Tiền mặt' | Hình thức thanh toán |
| `ma_giao_dich` | VARCHAR(100) | YES | - | Mã giao dịch (nếu CK) |
| `nguoi_thu` | VARCHAR(100) | YES | - | Người thu |
| `ghi_chu` | VARCHAR(300) | YES | - | Ghi chú |
| `trang_thai` | VARCHAR(20) | YES | 'Thành công' | Trạng thái |

**Khóa chính:** `so_phieu_thu`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_pthp_pdk` | `so_phieu_dang_ky` | `phieu_dang_ky(so_phieu)` | Phiếu đăng ký |
| `fk_pthp_sv` | `ma_sv` | `sinh_vien(ma_sv)` | Sinh viên |

**Ràng buộc:**
- `so_tien_thu` > 0
- `hinh_thuc_thu` IN ('Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử')
- `trang_thai` IN ('Thành công', 'Đã hủy')

**Lưu ý QĐ6:** Một phiếu đăng ký có thể có nhiều phiếu thu (đóng nhiều lần)

---

### 2.17. BẢNG `don_gia_tin_chi` - Đơn giá tín chỉ

**Mô tả:** Cấu hình đơn giá tín chỉ theo loại môn và loại học (QĐ5)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `id` | SERIAL | NO | Auto | **PK** - ID |
| `loai_mon` | VARCHAR(5) | NO | - | Loại môn: 'LT'/'TH' |
| `loai_hoc` | VARCHAR(20) | NO | 'hoc_moi' | Loại học: 'hoc_moi'/'hoc_lai'/'hoc_cai_thien'/'hoc_he' |
| `don_gia` | DECIMAL(12,0) | NO | - | Đơn giá/tín chỉ |
| `ma_hoc_ky` | VARCHAR(15) | YES | - | **FK** → `hoc_ky.ma_hoc_ky` |
| `ngay_ap_dung` | DATE | YES | CURRENT_DATE | Ngày áp dụng |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ghi_chu` | VARCHAR(200) | YES | - | Ghi chú |

**Khóa chính:** `id`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_dgtc_hk` | `ma_hoc_ky` | `hoc_ky(ma_hoc_ky)` | Học kỳ (NULL = áp dụng chung) |

**Ràng buộc:**
- `loai_mon` IN ('LT', 'TH')
- `loai_hoc` IN ('hoc_moi', 'hoc_lai', 'hoc_cai_thien', 'hoc_he')
- UNIQUE `(loai_mon, loai_hoc, ma_hoc_ky)` - Mỗi loại môn + loại học chỉ có 1 đơn giá/học kỳ

**Giá trị mặc định theo QĐ5 (ví dụ):**
```sql
| loai_mon | loai_hoc       | don_gia | ghi_chu                           |
|----------|----------------|---------|-----------------------------------|
| LT       | hoc_moi        | 27000   | Đơn giá môn LT học trong kỳ chính |
| TH       | hoc_moi        | 37000   | Đơn giá môn TH học trong kỳ chính |
| LT       | hoc_lai        | 32000   | Đơn giá môn LT học lại            |
| TH       | hoc_lai        | 42000   | Đơn giá môn TH học lại            |
| LT       | hoc_cai_thien  | 30000   | Đơn giá môn LT học cải thiện      |
| TH       | hoc_cai_thien  | 40000   | Đơn giá môn TH học cải thiện      |
| LT       | hoc_he         | 35000   | Đơn giá môn LT học hè             |
| TH       | hoc_he         | 45000   | Đơn giá môn TH học hè             |
```

---

### 2.18. BẢNG `tai_khoan` - Tài khoản

**Mô tả:** Tài khoản đăng nhập hệ thống. Phân quyền trực tiếp qua cột `role` thay vì dùng bảng riêng.

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_tai_khoan` | SERIAL | NO | Auto | **PK** - Mã tài khoản |
| `ten_dang_nhap` | VARCHAR(50) | NO | - | Tên đăng nhập (UNIQUE) |
| `mat_khau` | VARCHAR(255) | NO | - | Mật khẩu (BCrypt hash) |
| `role` | VARCHAR(20) | NO | 'sinh_vien' | Vai trò: 'admin'/'sinh_vien' |
| `ma_sv` | VARCHAR(15) | YES | - | **FK** → `sinh_vien.ma_sv` (UNIQUE) |
| `ho_ten` | VARCHAR(100) | YES | - | Họ tên (nếu là Admin) |
| `email` | VARCHAR(100) | YES | - | Email |
| `sdt` | VARCHAR(15) | YES | - | Số điện thoại |
| `anh_dai_dien` | VARCHAR(255) | YES | - | Ảnh đại diện |
| `lan_dang_nhap_cuoi` | TIMESTAMP | YES | - | Lần đăng nhập cuối |
| `refresh_token` | VARCHAR(500) | YES | - | Refresh token (JWT) |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMP | YES | - | Ngày cập nhật |

**Khóa chính:** `ma_tai_khoan`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_tk_sv` | `ma_sv` | `sinh_vien(ma_sv)` | Sinh viên (nếu là SV) |

**Ràng buộc:**
- `ten_dang_nhap` UNIQUE
- `ma_sv` UNIQUE (mỗi SV chỉ có 1 tài khoản)
- `role` IN ('admin', 'sinh_vien')

**Lưu ý:** Phân quyền được thực hiện trực tiếp qua cột `role`. Không cần xây dựng giao diện phân quyền riêng.

---

### 2.19. BẢNG `quan_tri_vien` - Quản trị viên

**Mô tả:** Lưu trữ thông tin chi tiết của quản trị viên hệ thống

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_quan_tri_vien` | SERIAL | NO | Auto | **PK** - Mã quản trị viên |
| `ma_tai_khoan` | INTEGER | NO | - | **FK** → `tai_khoan.ma_tai_khoan` (UNIQUE) |
| `ho_ten` | VARCHAR(100) | NO | - | Họ tên quản trị viên |
| `ngay_sinh` | DATE | YES | - | Ngày sinh |
| `gioi_tinh` | VARCHAR(5) | YES | - | Giới tính: 'Nam'/'Nữ' |
| `sdt` | VARCHAR(15) | YES | - | Số điện thoại |
| `email` | VARCHAR(100) | YES | - | Email |
| `dia_chi` | VARCHAR(200) | YES | - | Địa chỉ |
| `chuc_vu` | VARCHAR(100) | YES | - | Chức vụ (VD: Quản trị viên hệ thống, Quản trị viên khoa) |
| `phong_ban` | VARCHAR(100) | YES | - | Phòng ban |
| `anh_dai_dien` | VARCHAR(255) | YES | - | Đường dẫn ảnh đại diện |
| `ghi_chu` | VARCHAR(300) | YES | - | Ghi chú |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMP | YES | - | Ngày cập nhật |

**Khóa chính:** `ma_quan_tri_vien`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_qtv_tk` | `ma_tai_khoan` | `tai_khoan(ma_tai_khoan)` | Tài khoản của quản trị viên |

**Ràng buộc:**
- `ma_tai_khoan` UNIQUE (mỗi quản trị viên chỉ có 1 tài khoản)
- `gioi_tinh` IN ('Nam', 'Nữ')

**Lưu ý:** Bảng này lưu trữ thông tin chi tiết của quản trị viên. Mỗi quản trị viên phải có một tài khoản với `role = 'admin'` trong bảng `tai_khoan`. Ràng buộc này được kiểm soát ở mức ứng dụng (application-level constraint).

**Ví dụ dữ liệu:**
```sql
| ma_quan_tri_vien | ma_tai_khoan | ho_ten           | email                    | chuc_vu                    | trang_thai |
|------------------|--------------|------------------|--------------------------|----------------------------|------------|
| 1                | 1            | Nguyễn Văn Admin | admin@school.edu.vn      | Quản trị viên hệ thống     | true       |
| 2                | 2            | Trần Thị Quản Lý | quanly@school.edu.vn     | Quản trị viên đào tạo      | true       |
```

---

### 2.20. BẢNG `thong_bao` - Thông báo (gộp chung và cá nhân)

**Mô tả:** Bảng thông báo duy nhất, gộp cả thông báo chung (gửi đến tất cả hoặc nhóm người dùng) và thông báo cá nhân (gửi đến từng người dùng cụ thể). Phân biệt qua thuộc tính `loai`:
- `'chung'`: Thông báo chung cho tất cả hoặc nhóm người dùng
- `'ca_nhan'`: Thông báo riêng cho từng người dùng

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_thong_bao` | SERIAL | NO | Auto | **PK** - Mã thông báo |
| `loai` | VARCHAR(20) | NO | 'chung' | Loại: 'chung' hoặc 'ca_nhan' |
| `tieu_de` | VARCHAR(200) | NO | - | Tiêu đề |
| `noi_dung` | TEXT | NO | - | Nội dung |
| `loai_thong_bao` | VARCHAR(50) | YES | - | Phân loại thông báo (Học phí, Đăng ký, ...) |
| `doi_tuong` | VARCHAR(30) | YES | 'Tất cả' | Đối tượng nhận (cho thông báo chung) |
| `ghim_top` | BOOLEAN | YES | FALSE | Ghim lên đầu (cho thông báo chung) |
| `ngay_het_han` | TIMESTAMP | YES | - | Ngày hết hạn (cho thông báo chung) |
| `ma_tai_khoan_nhan` | INTEGER | YES | - | **FK** → `tai_khoan.ma_tai_khoan` (cho thông báo cá nhân) |
| `duong_dan` | VARCHAR(255) | YES | - | Link đến trang liên quan (cho thông báo cá nhân) |
| `da_doc` | BOOLEAN | YES | FALSE | Đã đọc (cho thông báo cá nhân) |
| `ngay_doc` | TIMESTAMP | YES | - | Ngày đọc (cho thông báo cá nhân) |
| `nguoi_tao` | INTEGER | YES | - | **FK** → `tai_khoan.ma_tai_khoan` |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |

**Khóa chính:** `ma_thong_bao`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_tb_nguoitao` | `nguoi_tao` | `tai_khoan(ma_tai_khoan)` | Người tạo |
| `fk_tb_nguoinhan` | `ma_tai_khoan_nhan` | `tai_khoan(ma_tai_khoan)` | Người nhận (cho thông báo cá nhân) |

**Ràng buộc:**
- `loai` IN ('chung', 'ca_nhan')

**Ưu điểm của thiết kế gộp:**
1. Đơn giản hóa cấu trúc database (giảm từ 2 bảng xuống 1 bảng)
2. Dễ dàng quản lý và truy vấn thông báo
3. Linh hoạt trong việc mở rộng thêm loại thông báo mới
4. Giảm độ phức tạp của code backend

**Ví dụ dữ liệu:**
```sql
-- Thông báo chung
| ma_thong_bao | loai   | tieu_de            | doi_tuong | ma_tai_khoan_nhan |
|--------------|--------|--------------------|-----------|--------------------|
| 1            | chung  | Đợt đăng ký HK2    | Tất cả    | NULL               |

-- Thông báo cá nhân
| ma_thong_bao | loai     | tieu_de               | doi_tuong | ma_tai_khoan_nhan |
|--------------|----------|-----------------------|-----------|-------------------|
| 10           | ca_nhan  | Đăng ký thành công    | NULL      | 5                 |
```

---

### 2.21. BẢNG `tiet_hoc` - Tiết học

**Mô tả:** Lưu trữ thông tin các tiết học trong ngày (Tiết 1-10 và Buổi tối). Trường học mở cửa từ Thứ 2 đến Thứ 7.

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `ma_tiet` | VARCHAR(10) | NO | - | **PK** - Mã tiết học |
| `ten_tiet` | VARCHAR(50) | NO | - | Tên tiết học |
| `gio_bat_dau` | TIME | NO | - | Giờ bắt đầu |
| `gio_ket_thuc` | TIME | NO | - | Giờ kết thúc |
| `thu_tu` | INTEGER | NO | - | Thứ tự tiết trong ngày (1-11) |
| `mo_ta` | VARCHAR(200) | YES | - | Mô tả chi tiết |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `ma_tiet`

**Ràng buộc:**
- `chk_thu_tu_tiet`: `thu_tu >= 1 AND thu_tu <= 11`

**Ví dụ dữ liệu:**
```sql
| ma_tiet | ten_tiet  | gio_bat_dau | gio_ket_thuc | thu_tu | mo_ta                   |
|---------|-----------|-------------|--------------|--------|-------------------------|
| T1      | Tiết 1    | 07:30       | 08:15        | 1      | Tiết 1 (7:30 - 8:15)    |
| T6      | Tiết 6    | 13:00       | 13:45        | 6      | Tiết 6 (13:00 - 13:45)  |
| TOI     | Buổi tối  | 17:45       | 20:45        | 11     | Buổi tối (17:45 - 20:45)|
```

---

### 2.22. BẢNG `cau_hinh_dang_ky` - Cấu hình đăng ký môn học

**Mô tả:** Lưu trữ các quy định về đăng ký môn học (số tín chỉ tối đa, điểm GPA để vượt, điểm đậu...)

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `id` | SERIAL | NO | auto | **PK** - ID tự tăng |
| `ma_cau_hinh` | VARCHAR(20) | NO | - | Mã cấu hình (UNIQUE) |
| `ten_cau_hinh` | VARCHAR(100) | NO | - | Tên cấu hình |
| `gia_tri` | INTEGER | NO | - | Giá trị số nguyên |
| `gia_tri_so` | DECIMAL(4,2) | YES | - | Giá trị số thập phân |
| `mo_ta` | VARCHAR(300) | YES | - | Mô tả chi tiết |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMP | YES | - | Ngày cập nhật |

**Khóa chính:** `id`

**Quy định quan trọng:**
- **MAX_TC_HK = 24**: Số tín chỉ tối đa mỗi học kỳ
- **MIN_GPA_VUOT = 8.50**: Điểm GPA tối thiểu để đăng ký vượt tín chỉ
- **DIEM_DAU = 5.00**: Điểm trung bình môn >= 5.0 mới được tính là đậu (< 5.0 = Rớt)

**Ví dụ dữ liệu:**
```sql
| ma_cau_hinh   | ten_cau_hinh                    | gia_tri | gia_tri_so |
|---------------|---------------------------------|---------|------------|
| MAX_TC_HK     | Số tín chỉ tối đa mỗi học kỳ    | 24      | NULL       |
| MIN_GPA_VUOT  | Điểm GPA tối thiểu để vượt TC   | 0       | 8.50       |
| DIEM_DAU      | Điểm đậu tối thiểu              | 5       | 5.00       |
```

---

### 2.23. BẢNG `lich_hoc_lop` - Lịch học chi tiết của lớp mở

**Mô tả:** Lưu trữ lịch học chi tiết của từng lớp mở, liên kết với tiết học và thứ trong tuần

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `id` | SERIAL | NO | auto | **PK** - ID tự tăng |
| `lop_mo_id` | INTEGER | NO | - | **FK** → `lop_mo.id` |
| `thu_trong_tuan` | INTEGER | NO | - | Thứ trong tuần (2-7) |
| `ma_tiet_bat_dau` | VARCHAR(10) | NO | - | **FK** → `tiet_hoc.ma_tiet` |
| `ma_tiet_ket_thuc` | VARCHAR(10) | NO | - | **FK** → `tiet_hoc.ma_tiet` |
| `phong_hoc` | VARCHAR(50) | YES | - | Phòng học |
| `ghi_chu` | VARCHAR(200) | YES | - | Ghi chú |
| `trang_thai` | BOOLEAN | YES | TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |

**Khóa chính:** `id`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_lhl_lopmo` | `lop_mo_id` | `lop_mo(id)` | Lịch học thuộc lớp mở |
| `fk_lhl_tiet_bat_dau` | `ma_tiet_bat_dau` | `tiet_hoc(ma_tiet)` | Tiết bắt đầu |
| `fk_lhl_tiet_ket_thuc` | `ma_tiet_ket_thuc` | `tiet_hoc(ma_tiet)` | Tiết kết thúc |

**Ràng buộc:**
- `chk_thu_trong_tuan`: `thu_trong_tuan >= 2 AND thu_trong_tuan <= 7` (Thứ 2 đến Thứ 7)

**Ví dụ dữ liệu:**
```sql
| id | lop_mo_id | thu_trong_tuan | ma_tiet_bat_dau | ma_tiet_ket_thuc | phong_hoc |
|----|-----------|----------------|-----------------|------------------|-----------|
| 1  | 1         | 2              | T1              | T3               | B1.02     |
| 2  | 1         | 4              | T6              | T8               | B2.08     |
```

---

### 2.24. BẢNG `diem_sinh_vien` - Điểm của sinh viên

**Mô tả:** Lưu trữ điểm các môn học của sinh viên. Điểm trung bình < 5.0 = Rớt, >= 5.0 = Đậu

**Cấu trúc:**

| Tên cột | Kiểu dữ liệu | Null | Mặc định | Mô tả |
|---------|--------------|------|----------|-------|
| `id` | SERIAL | NO | auto | **PK** - ID tự tăng |
| `ma_sv` | VARCHAR(15) | NO | - | **FK** → `sinh_vien.ma_sv` |
| `ma_mon_hoc` | VARCHAR(15) | NO | - | **FK** → `mon_hoc.ma_mon_hoc` |
| `ma_hoc_ky` | VARCHAR(15) | NO | - | **FK** → `hoc_ky.ma_hoc_ky` |
| `ma_lop` | VARCHAR(20) | YES | - | **FK** → `lop.ma_lop` |
| `diem_qua_trinh` | DECIMAL(4,2) | YES | - | Điểm quá trình (0-10) |
| `diem_giua_ky` | DECIMAL(4,2) | YES | - | Điểm giữa kỳ (0-10) |
| `diem_cuoi_ky` | DECIMAL(4,2) | YES | - | Điểm cuối kỳ (0-10) |
| `diem_trung_binh` | DECIMAL(4,2) | YES | - | Điểm trung bình môn (0-10) |
| `diem_chu` | VARCHAR(2) | YES | - | Điểm chữ (A+, A, B+, B, C+, C, D+, D, F) |
| `so_tin_chi` | INTEGER | NO | - | Số tín chỉ môn học |
| `lan_hoc` | INTEGER | YES | 1 | Lần học (1 = lần đầu, 2 = học lại...) |
| `ket_qua` | VARCHAR(20) | YES | 'Chưa có' | Kết quả: Chưa có, Đậu, Rớt, Vắng thi, Cấm thi |
| `ghi_chu` | VARCHAR(300) | YES | - | Ghi chú |
| `ngay_nhap_diem` | TIMESTAMP | YES | - | Ngày nhập điểm |
| `nguoi_nhap_diem` | INTEGER | YES | - | **FK** → `tai_khoan.ma_tai_khoan` |
| `ngay_tao` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Ngày tạo |
| `ngay_cap_nhat` | TIMESTAMP | YES | - | Ngày cập nhật |

**Khóa chính:** `id`

**Ràng buộc duy nhất:** `(ma_sv, ma_mon_hoc, ma_hoc_ky, lan_hoc)`

**Khóa ngoại:**

| Tên FK | Cột | Tham chiếu | Mô tả |
|--------|-----|------------|-------|
| `fk_dsv_sv` | `ma_sv` | `sinh_vien(ma_sv)` | Điểm của sinh viên |
| `fk_dsv_mh` | `ma_mon_hoc` | `mon_hoc(ma_mon_hoc)` | Điểm môn học |
| `fk_dsv_hk` | `ma_hoc_ky` | `hoc_ky(ma_hoc_ky)` | Điểm trong học kỳ |
| `fk_dsv_lop` | `ma_lop` | `lop(ma_lop)` | Lớp học |

**Ràng buộc:**
- `chk_diem_*`: Các điểm phải từ 0 đến 10
- `chk_diem_chu`: Điểm chữ phải là một trong: A+, A, B+, B, C+, C, D+, D, F
- `chk_ket_qua`: Kết quả phải là một trong: Chưa có, Đậu, Rớt, Vắng thi, Cấm thi

**Quy định đậu/rớt:**
- Điểm trung bình >= 5.0: **Đậu**
- Điểm trung bình < 5.0: **Rớt** (cần học lại)

**Ví dụ dữ liệu:**
```sql
| ma_sv    | ma_mon_hoc | ma_hoc_ky | diem_tb | diem_chu | lan_hoc | ket_qua |
|----------|------------|-----------|---------|----------|---------|---------|
| 22520001 | IT001      | HK1-2425  | 8.17    | B+       | 1       | Đậu     |
| 22520004 | MA006      | HK1-2425  | 3.92    | F        | 1       | Rớt     |
```

---

## 3. SƠ ĐỒ QUAN HỆ (ERD)

### 3.1. Sơ đồ tổng quan

```
                                    ┌─────────────┐
                                    │    tinh     │
                                    └──────┬──────┘
                                           │ 1
                                           │
                                           │ n
                                    ┌──────┴──────┐
                                    │    huyen    │
                                    └──────┬──────┘
                                           │ 1
                                           │
            ┌─────────────┐                │              ┌─────────────┐
            │    khoa     │                │              │  doi_tuong  │
            └──────┬──────┘                │              └──────┬──────┘
                   │ 1                     │                     │ 1
                   │                       │                     │
       ┌───────────┼───────────┐           │                     │ n
       │           │ n         │           │       ┌─────────────┴─────────────┐
       │    ┌──────┴──────┐    │           │       │   doi_tuong_sinh_vien     │
       │    │  nganh_hoc  │    │           │       └─────────────┬─────────────┘
       │    └──────┬──────┘    │           │                     │ n
       │ n         │ 1         │           │                     │
  ┌────┴────┐      │           │           │                     │
  │ mon_hoc │      │ n         │   n       │        1            │
  └────┬────┘      └───────────┴───────────┴────────┴────────────┘
       │ 1                     sinh_vien
       │                           │
       │ n                    ┌────┴────────────────┬───────────────────────────┐
  ┌────┴────┐                 │ 1                   │ 1                         │
  │   lop   │                 │                     │                           │
  └────┬────┘                 │ n                   │ n                         │ 1
       │ 1              ┌─────┴──────┐   ┌──────────┴──────┐   ┌────────────────┴────┐
       │                │ phieu_dang_ky│   │phieu_thu_hoc_phi│   │      tai_khoan      │
       │ n              └──────┬──────┘   └─────────────────┘   └──────────┬──────────┘
  ┌────┴────┐                  │ 1                                        │
  │  lop_mo │                  │                              ┌───────────┼───────────┐
  └────┬────┘                  │ n                            │ 1         │           │ n
       │ n              ┌──────┴──────┐              ┌────────┴────┐  ┌───┴───────────┴───┐
       │                │chi_tiet_dk  │              │quan_tri_vien│  │     thong_bao     │
       │ 1              └──────┬──────┘              └─────────────┘  │ (chung + cá nhân) │
  ┌────┴────┐                  │ n                                    └───────────────────┘
  │  hoc_ky │◄─────────────────┘
  └────┬────┘              (FK: ma_lop)
       │ n
       │
       │ 1
  ┌────┴────┐
  │ nam_hoc │
  └─────────┘

Ghi chú mối quan hệ sinh_vien - tai_khoan:
- sinh_vien.ma_tai_khoan → tai_khoan.ma_tai_khoan (FK: fk_sv_tk)
- tai_khoan.ma_sv → sinh_vien.ma_sv (FK: fk_tk_sv)
- Đây là mối quan hệ 1-1 hai chiều để dễ dàng truy vấn thông tin từ cả hai phía

Ghi chú bảng thong_bao:
- Bảng thong_bao gộp cả thông báo chung và cá nhân
- Thuộc tính loai='chung' hoặc 'ca_nhan' để phân biệt
- Thông báo cá nhân sử dụng ma_tai_khoan_nhan để xác định người nhận
```

### 3.2. Chi tiết các mối quan hệ

| STT | Bảng cha | Bảng con | Quan hệ | Mô tả |
|-----|----------|----------|---------|-------|
| 1 | `tinh` | `huyen` | 1 - n | Mỗi tỉnh có nhiều huyện |
| 2 | `huyen` | `sinh_vien` | 1 - n | Mỗi huyện có nhiều SV (quê quán) |
| 3 | `khoa` | `nganh_hoc` | 1 - n | Mỗi khoa có nhiều ngành |
| 4 | `khoa` | `mon_hoc` | 1 - n | Mỗi khoa quản lý nhiều môn học |
| 5 | `nganh_hoc` | `sinh_vien` | 1 - n | Mỗi ngành có nhiều SV |
| 6 | `nganh_hoc` | `chuong_trinh_hoc` | 1 - n | Mỗi ngành có nhiều môn trong CTĐT |
| 7 | `doi_tuong` | `doi_tuong_sinh_vien` | 1 - n | Mỗi đối tượng gán cho nhiều SV |
| 8 | `sinh_vien` | `doi_tuong_sinh_vien` | 1 - n | Mỗi SV có thể thuộc nhiều đối tượng |
| 9 | `sinh_vien` | `phieu_dang_ky` | 1 - n | Mỗi SV có nhiều phiếu ĐK (qua các HK) |
| 10 | `sinh_vien` | `phieu_thu_hoc_phi` | 1 - n | Mỗi SV có nhiều phiếu thu |
| 11 | `tai_khoan` | `sinh_vien` | 1 - 1 | Mỗi tài khoản SV có 1 thông tin sinh viên (qua fk_sv_tk) |
| 12 | `sinh_vien` | `tai_khoan` | 1 - 1 | Mỗi SV có 1 tài khoản (qua fk_tk_sv) |
| 13 | `nam_hoc` | `hoc_ky` | 1 - n | Mỗi năm học có nhiều học kỳ |
| 14 | `hoc_ky` | `lop_mo` | 1 - n | Mỗi HK mở nhiều lớp |
| 15 | `hoc_ky` | `phieu_dang_ky` | 1 - n | Mỗi HK có nhiều phiếu ĐK |
| 16 | `mon_hoc` | `lop` | 1 - n | Mỗi môn có nhiều lớp |
| 17 | `mon_hoc` | `chuong_trinh_hoc` | 1 - n | Mỗi môn thuộc nhiều CTĐT |
| 18 | `lop` | `lop_mo` | 1 - n | Mỗi lớp có thể mở ở nhiều HK |
| 19 | `lop` | `chi_tiet_dang_ky` | 1 - n | Mỗi lớp được ĐK nhiều lần |
| 20 | `phieu_dang_ky` | `chi_tiet_dang_ky` | 1 - n | Mỗi phiếu ĐK có nhiều chi tiết (lớp) |
| 21 | `phieu_dang_ky` | `phieu_thu_hoc_phi` | 1 - n | Mỗi phiếu ĐK có nhiều phiếu thu (QĐ6) |
| 22 | `tai_khoan` | `thong_bao` (loai='ca_nhan') | 1 - n | Mỗi TK nhận nhiều thông báo cá nhân |
| 23 | `tai_khoan` | `quan_tri_vien` | 1 - 1 | Mỗi TK admin có 1 thông tin quản trị viên |

---
## 4. TỔNG HỢP KHÓA NGOẠI

| STT | Bảng | Tên FK | Cột | Tham chiếu | ON DELETE | ON UPDATE |
|-----|------|--------|-----|------------|-----------|-----------|
| 1 | `huyen` | `fk_huyen_tinh` | `ma_tinh` | `tinh(ma_tinh)` | RESTRICT | CASCADE |
| 2 | `nganh_hoc` | `fk_nganh_khoa` | `ma_khoa` | `khoa(ma_khoa)` | RESTRICT | CASCADE |
| 3 | `sinh_vien` | `fk_sv_huyen` | `ma_huyen` | `huyen(ma_huyen)` | RESTRICT | CASCADE |
| 4 | `sinh_vien` | `fk_sv_nganh` | `ma_nganh` | `nganh_hoc(ma_nganh)` | RESTRICT | CASCADE |
| 5 | `sinh_vien` | `fk_sv_tk` | `ma_tai_khoan` | `tai_khoan(ma_tai_khoan)` | SET NULL | CASCADE |
| 6 | `doi_tuong_sinh_vien` | `fk_dtsv_sv` | `ma_sv` | `sinh_vien(ma_sv)` | CASCADE | CASCADE |
| 7 | `doi_tuong_sinh_vien` | `fk_dtsv_dt` | `ma_doi_tuong` | `doi_tuong(ma_doi_tuong)` | RESTRICT | CASCADE |
| 8 | `mon_hoc` | `fk_monhoc_khoa` | `ma_khoa` | `khoa(ma_khoa)` | RESTRICT | CASCADE |
| 9 | `dieu_kien_mon_hoc` | `fk_dkmh_monhoc` | `ma_mon_hoc` | `mon_hoc(ma_mon_hoc)` | CASCADE | CASCADE |
| 10 | `dieu_kien_mon_hoc` | `fk_dkmh_monhoc_dk` | `ma_mon_dieu_kien` | `mon_hoc(ma_mon_hoc)` | CASCADE | CASCADE |
| 11 | `lop` | `fk_lop_monhoc` | `ma_mon_hoc` | `mon_hoc(ma_mon_hoc)` | CASCADE | CASCADE |
| 12 | `chuong_trinh_hoc` | `fk_cth_nganh` | `ma_nganh` | `nganh_hoc(ma_nganh)` | CASCADE | CASCADE |
| 13 | `chuong_trinh_hoc` | `fk_cth_mon` | `ma_mon_hoc` | `mon_hoc(ma_mon_hoc)` | CASCADE | CASCADE |
| 14 | `hoc_ky` | `fk_hk_namhoc` | `ma_nam_hoc` | `nam_hoc(ma_nam_hoc)` | RESTRICT | CASCADE |
| 15 | `lop_mo` | `fk_lopmo_hocky` | `ma_hoc_ky` | `hoc_ky(ma_hoc_ky)` | CASCADE | CASCADE |
| 16 | `lop_mo` | `fk_lopmo_lop` | `ma_lop` | `lop(ma_lop)` | CASCADE | CASCADE |
| 17 | `phieu_dang_ky` | `fk_pdk_sv` | `ma_sv` | `sinh_vien(ma_sv)` | RESTRICT | CASCADE |
| 18 | `phieu_dang_ky` | `fk_pdk_hk` | `ma_hoc_ky` | `hoc_ky(ma_hoc_ky)` | RESTRICT | CASCADE |
| 19 | `chi_tiet_dang_ky` | `fk_ctdk_phieu` | `so_phieu` | `phieu_dang_ky(so_phieu)` | CASCADE | CASCADE |
| 20 | `chi_tiet_dang_ky` | `fk_ctdk_lop` | `ma_lop` | `lop(ma_lop)` | RESTRICT | CASCADE |
| 21 | `phieu_thu_hoc_phi` | `fk_pthp_pdk` | `so_phieu_dang_ky` | `phieu_dang_ky(so_phieu)` | RESTRICT | CASCADE |
| 22 | `phieu_thu_hoc_phi` | `fk_pthp_sv` | `ma_sv` | `sinh_vien(ma_sv)` | RESTRICT | CASCADE |
| 23 | `don_gia_tin_chi` | `fk_dgtc_hk` | `ma_hoc_ky` | `hoc_ky(ma_hoc_ky)` | SET NULL | CASCADE |
| 24 | `tai_khoan` | `fk_tk_sv` | `ma_sv` | `sinh_vien(ma_sv)` | SET NULL | CASCADE |
| 25 | `quan_tri_vien` | `fk_qtv_tk` | `ma_tai_khoan` | `tai_khoan(ma_tai_khoan)` | CASCADE | CASCADE |
| 26 | `thong_bao` | `fk_tb_nguoitao` | `nguoi_tao` | `tai_khoan(ma_tai_khoan)` | SET NULL | CASCADE |
| 27 | `thong_bao_ca_nhan` | `fk_tbcn_tk` | `ma_tai_khoan` | `tai_khoan(ma_tai_khoan)` | CASCADE | CASCADE |

---

## 5. TỔNG HỢP RÀNG BUỘC (CONSTRAINTS)

### 5.1. Primary Keys (Khóa chính)

| STT | Bảng | Tên PK | Cột | Kiểu |
|-----|------|--------|-----|------|
| 1 | `tinh` | `tinh_pkey` | `ma_tinh` | VARCHAR(10) |
| 2 | `huyen` | `huyen_pkey` | `ma_huyen` | VARCHAR(10) |
| 3 | `doi_tuong` | `doi_tuong_pkey` | `ma_doi_tuong` | VARCHAR(10) |
| 4 | `doi_tuong_sinh_vien` | `doi_tuong_sinh_vien_pkey` | `id` | SERIAL |
| 5 | `khoa` | `khoa_pkey` | `ma_khoa` | VARCHAR(10) |
| 6 | `nganh_hoc` | `nganh_hoc_pkey` | `ma_nganh` | VARCHAR(10) |
| 7 | `sinh_vien` | `sinh_vien_pkey` | `ma_sv` | VARCHAR(15) |
| 8 | `mon_hoc` | `mon_hoc_pkey` | `ma_mon_hoc` | VARCHAR(15) |
| 9 | `dieu_kien_mon_hoc` | `dieu_kien_mon_hoc_pkey` | `id` | SERIAL |
| 10 | `lop` | `lop_pkey` | `ma_lop` | VARCHAR(20) |
| 11 | `chuong_trinh_hoc` | `chuong_trinh_hoc_pkey` | `id` | SERIAL |
| 12 | `nam_hoc` | `nam_hoc_pkey` | `ma_nam_hoc` | VARCHAR(15) |
| 13 | `hoc_ky` | `hoc_ky_pkey` | `ma_hoc_ky` | VARCHAR(15) |
| 14 | `lop_mo` | `lop_mo_pkey` | `id` | SERIAL |
| 15 | `phieu_dang_ky` | `phieu_dang_ky_pkey` | `so_phieu` | SERIAL |
| 16 | `chi_tiet_dang_ky` | `chi_tiet_dang_ky_pkey` | `id` | SERIAL |
| 17 | `phieu_thu_hoc_phi` | `phieu_thu_hoc_phi_pkey` | `so_phieu_thu` | SERIAL |
| 18 | `don_gia_tin_chi` | `don_gia_tin_chi_pkey` | `id` | SERIAL |
| 19 | `tai_khoan` | `tai_khoan_pkey` | `ma_tai_khoan` | SERIAL |
| 20 | `quan_tri_vien` | `quan_tri_vien_pkey` | `ma_quan_tri_vien` | SERIAL |
| 21 | `thong_bao` | `thong_bao_pkey` | `ma_thong_bao` | SERIAL |
| 22 | `thong_bao_ca_nhan` | `thong_bao_ca_nhan_pkey` | `id` | BIGSERIAL |

### 5.2. Unique Constraints (Ràng buộc duy nhất)

| STT | Bảng | Tên Constraint | Cột | Mô tả |
|-----|------|----------------|-----|-------|
| 1 | `sinh_vien` | `sinh_vien_cccd_key` | `cccd` | Mỗi CCCD là duy nhất |
| 2 | `sinh_vien` | `sinh_vien_ma_tai_khoan_key` | `ma_tai_khoan` | Mỗi sinh viên chỉ có 1 tài khoản |
| 3 | `doi_tuong_sinh_vien` | `uq_dtsv` | `(ma_sv, ma_doi_tuong)` | SV chỉ gán 1 lần/đối tượng |
| 4 | `dieu_kien_mon_hoc` | `uq_dkmh` | `(ma_mon_hoc, ma_mon_dieu_kien, loai_dieu_kien)` | Mỗi cặp môn chỉ có 1 loại điều kiện |
| 5 | `chuong_trinh_hoc` | `uq_cth` | `(ma_nganh, ma_mon_hoc)` | Môn chỉ xuất hiện 1 lần/ngành |
| 6 | `lop_mo` | `uq_lopmo` | `(ma_hoc_ky, ma_lop)` | Lớp chỉ mở 1 lần/học kỳ |
| 7 | `phieu_dang_ky` | `uq_pdk` | `(ma_sv, ma_hoc_ky)` | SV chỉ có 1 phiếu ĐK/học kỳ |
| 8 | `chi_tiet_dang_ky` | `uq_ctdk` | `(so_phieu, ma_lop)` | Lớp chỉ ĐK 1 lần/phiếu |
| 9 | `don_gia_tin_chi` | `uq_dongia` | `(loai_mon, loai_hoc, ma_hoc_ky)` | Mỗi loại môn + loại học chỉ có 1 đơn giá/HK |
| 10 | `tai_khoan` | `tai_khoan_ten_dang_nhap_key` | `ten_dang_nhap` | Tên đăng nhập duy nhất |
| 11 | `tai_khoan` | `tai_khoan_ma_sv_key` | `ma_sv` | Mỗi SV chỉ có 1 tài khoản (tham chiếu từ tai_khoan) |
| 12 | `quan_tri_vien` | `quan_tri_vien_ma_tai_khoan_key` | `ma_tai_khoan` | Mỗi quản trị viên chỉ có 1 tài khoản |

### 5.3. Check Constraints (Ràng buộc kiểm tra)

| STT | Bảng | Cột | Điều kiện | Mô tả |
|-----|------|-----|-----------|-------|
| 1 | `doi_tuong` | `ti_le_giam_hoc_phi` | `>= 0 AND <= 100` | Tỷ lệ giảm 0-100% |
| 2 | `sinh_vien` | `gioi_tinh` | `IN ('Nam', 'Nữ')` | Giới tính hợp lệ |
| 3 | `sinh_vien` | `trang_thai` | `IN ('Đang học', 'Bảo lưu', 'Nghỉ học', 'Tốt nghiệp')` | Trạng thái SV |
| 4 | `mon_hoc` | `loai_mon` | `IN ('LT', 'TH')` | Loại môn:  Lý thuyết/Thực hành |
| 5 | `mon_hoc` | `so_tiet` | `> 0` | Số tiết phải > 0 |
| 6 | `dieu_kien_mon_hoc` | `loai_dieu_kien` | `IN ('tien_quyet', 'hoc_truoc')` | Loại điều kiện môn học |
| 7 | `chuong_trinh_hoc` | `hoc_ky_du_kien` | `>= 1 AND <= 10` | Học kỳ dự kiến 1-10 |
| 8 | `hoc_ky` | `loai_hoc_ky` | `IN ('Chính', 'Hè')` | Loại học kỳ |
| 9 | `hoc_ky` | `trang_thai` | `IN ('Sắp diễn ra', 'Đang diễn ra', 'Đã kết thúc')` | Trạng thái HK |
| 10 | `chi_tiet_dang_ky` | `loai_dang_ky` | `IN ('hoc_moi', 'hoc_lai', 'hoc_cai_thien')` | Loại đăng ký |
| 11 | `phieu_dang_ky` | `trang_thai` | `IN ('Đã đăng ký', 'Đã hủy')` | Trạng thái phiếu ĐK |
| 12 | `chi_tiet_dang_ky` | `trang_thai` | `IN ('Đã đăng ký', 'Đã hủy')` | Trạng thái chi tiết |
| 13 | `phieu_thu_hoc_phi` | `so_tien_thu` | `> 0` | Số tiền thu > 0 |
| 14 | `phieu_thu_hoc_phi` | `hinh_thuc_thu` | `IN ('Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử')` | Hình thức thanh toán |
| 15 | `phieu_thu_hoc_phi` | `trang_thai` | `IN ('Thành công', 'Đã hủy')` | Trạng thái phiếu thu |
| 16 | `don_gia_tin_chi` | `loai_mon` | `IN ('LT', 'TH')` | Loại môn |
| 17 | `don_gia_tin_chi` | `loai_hoc` | `IN ('hoc_moi', 'hoc_lai', 'hoc_cai_thien', 'hoc_he')` | Loại học |
| 18 | `tai_khoan` | `role` | `IN ('admin', 'sinh_vien')` | Vai trò người dùng |
| 18 | `thong_bao` | `doi_tuong` | `IN ('Tất cả', 'Sinh viên', 'Admin')` | Đối tượng nhận TB |
| 19 | `quan_tri_vien` | `gioi_tinh` | `IN ('Nam', 'Nữ')` | Giới tính hợp lệ |

---

## 6. INDEXES (CHỈ MỤC)

| STT | Tên Index | Bảng | Cột | Mục đích |
|-----|-----------|------|-----|----------|
| 1 | `idx_sv_ma_nganh` | `sinh_vien` | `ma_nganh` | Tìm SV theo ngành |
| 2 | `idx_sv_ma_huyen` | `sinh_vien` | `ma_huyen` | Tìm SV theo quê quán |
| 3 | `idx_sv_trang_thai` | `sinh_vien` | `trang_thai` | Lọc SV theo trạng thái |
| 4 | `idx_dtsv_ma_sv` | `doi_tuong_sinh_vien` | `ma_sv` | Tìm đối tượng của SV |
| 5 | `idx_cth_ma_nganh` | `chuong_trinh_hoc` | `ma_nganh` | Tìm CTĐT theo ngành |
| 6 | `idx_monhoc_ma_khoa` | `mon_hoc` | `ma_khoa` | Tìm môn học theo khoa |
| 7 | `idx_lop_ma_mon` | `lop` | `ma_mon_hoc` | Tìm lớp theo môn học |
| 8 | `idx_lopmo_ma_hoc_ky` | `lop_mo` | `ma_hoc_ky` | Tìm lớp mở theo HK |
| 9 | `idx_pdk_ma_sv` | `phieu_dang_ky` | `ma_sv` | Tìm phiếu ĐK theo SV |
| 10 | `idx_pdk_ma_hoc_ky` | `phieu_dang_ky` | `ma_hoc_ky` | Tìm phiếu ĐK theo HK |
| 11 | `idx_ctdk_so_phieu` | `chi_tiet_dang_ky` | `so_phieu` | Tìm chi tiết theo phiếu |
| 12 | `idx_ctdk_ma_lop` | `chi_tiet_dang_ky` | `ma_lop` | Tìm chi tiết theo lớp |
| 13 | `idx_pthp_so_phieu_dk` | `phieu_thu_hoc_phi` | `so_phieu_dang_ky` | Tìm phiếu thu theo phiếu ĐK |
| 14 | `idx_pthp_ma_sv` | `phieu_thu_hoc_phi` | `ma_sv` | Tìm phiếu thu theo SV |
| 15 | `idx_tk_ma_sv` | `tai_khoan` | `ma_sv` | Tìm TK theo SV |
| 16 | `idx_tbcn_ma_tk` | `thong_bao_ca_nhan` | `ma_tai_khoan` | Tìm TB theo TK |
| 17 | `idx_tbcn_da_doc` | `thong_bao_ca_nhan` | `da_doc` | Lọc TB chưa đọc |
| 18 | `idx_qtv_ma_tk` | `quan_tri_vien` | `ma_tai_khoan` | Tìm quản trị viên theo TK |

---

## 7. VIEWS (KHUNG NHÌN)

### 7.1. Danh sách Views

| STT | Tên View | Mô tả | Biểu mẫu liên quan |
|-----|----------|-------|-------------------|
| 1 | `v_ho_so_sinh_vien` | Hồ sơ sinh viên đầy đủ | BM1 |
| 2 | `v_danh_sach_mon_hoc` | Danh sách môn học (theo khoa) | BM2 |
| 3 | `v_chuong_trinh_hoc` | Chương trình học theo ngành | BM3 |
| 4 | `v_lop_mo` | Danh sách lớp học mở | BM4 |
| 5 | `v_phieu_dang_ky` | Phiếu đăng ký học phần chi tiết | BM5 |
| 6 | `v_phieu_thu_hoc_phi` | Phiếu thu học phí | BM6 |
| 7 | `v_tinh_hinh_hoc_phi` | Tình hình đóng học phí | - |
| 8 | `v_bao_cao_sv_chua_dong_hoc_phi` | Báo cáo SV chưa đóng HP | BM7 |

### 7.2. Chi tiết Views

#### View 1: `v_ho_so_sinh_vien` (BM1)

```sql
CREATE OR REPLACE VIEW v_ho_so_sinh_vien AS
SELECT 
    sv.ma_sv,
    sv.ho_ten,
    sv.ngay_sinh,
    sv. gioi_tinh,
    h.ten_huyen || ', ' || t.ten_tinh AS que_quan,
    h.la_vung_sau_vung_xa,
    -- Lấy đối tượng ưu tiên cao nhất (QĐ1)
    (SELECT dt.ten_doi_tuong 
     FROM doi_tuong_sinh_vien dtsv 
     JOIN doi_tuong dt ON dtsv.ma_doi_tuong = dt.ma_doi_tuong
     WHERE dtsv.ma_sv = sv.ma_sv AND dt.trang_thai = TRUE
     ORDER BY dt.do_uu_tien
     LIMIT 1) AS doi_tuong,
    -- Tỷ lệ giảm học phí
    COALESCE((SELECT dt.ti_le_giam_hoc_phi 
     FROM doi_tuong_sinh_vien dtsv 
     JOIN doi_tuong dt ON dtsv.ma_doi_tuong = dt.ma_doi_tuong
     WHERE dtsv.ma_sv = sv.ma_sv AND dt.trang_thai = TRUE
     ORDER BY dt.do_uu_tien
     LIMIT 1), 0) AS ti_le_giam_hoc_phi,
    nh.ma_nganh,
    nh.ten_nganh AS nganh_hoc,
    k.ma_khoa,
    k. ten_khoa,
    sv.trang_thai
FROM sinh_vien sv
JOIN huyen h ON sv.ma_huyen = h.ma_huyen
JOIN tinh t ON h.ma_tinh = t.ma_tinh
JOIN nganh_hoc nh ON sv.ma_nganh = nh. ma_nganh
JOIN khoa k ON nh.ma_khoa = k.ma_khoa;
```

**Cột trả về:**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `ma_sv` | VARCHAR(15) | Mã sinh viên |
| `ho_ten` | VARCHAR(100) | Họ tên |
| `ngay_sinh` | DATE | Ngày sinh |
| `gioi_tinh` | VARCHAR(5) | Giới tính |
| `que_quan` | TEXT | Quê quán (Huyện, Tỉnh) |
| `la_vung_sau_vung_xa` | BOOLEAN | Thuộc vùng sâu/xa |
| `doi_tuong` | VARCHAR(100) | Đối tượng ưu tiên |
| `ti_le_giam_hoc_phi` | DECIMAL(5,2) | Tỷ lệ giảm HP |
| `nganh_hoc` | VARCHAR(100) | Tên ngành học |
| `ten_khoa` | VARCHAR(100) | Tên khoa |
| `trang_thai` | VARCHAR(30) | Trạng thái SV |

---

#### View 2: `v_danh_sach_mon_hoc` (BM2)

```sql
CREATE OR REPLACE VIEW v_danh_sach_mon_hoc AS
SELECT 
    ma_mon_hoc,
    ten_mon_hoc,
    CASE loai_mon 
        WHEN 'LT' THEN 'Lý thuyết'
        WHEN 'TH' THEN 'Thực hành'
    END AS loai_mon,
    so_tiet,
    so_tin_chi
FROM mon_hoc
WHERE trang_thai = TRUE;
```

**Cột trả về:**

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `ma_mon_hoc` | VARCHAR(15) | Mã môn học |
| `ten_mon_hoc` | VARCHAR(150) | Tên môn học |
| `loai_mon` | TEXT | Loại môn (Lý thuyết/Thực hành) |
| `so_tiet` | INTEGER | Số tiết |
| `so_tin_chi` | INTEGER | Số tín chỉ (tính theo QĐ2) |

---

#### View 3: `v_chuong_trinh_hoc` (BM3)

```sql
CREATE OR REPLACE VIEW v_chuong_trinh_hoc AS
SELECT 
    nh.ma_nganh,
    nh.ten_nganh AS nganh_hoc,
    k.ten_khoa AS khoa,
    cth.hoc_ky_du_kien AS hoc_ky,
    mh.ma_mon_hoc,
    mh.ten_mon_hoc AS mon_hoc,
    mh.so_tin_chi,
    cth.ghi_chu
FROM chuong_trinh_hoc cth
JOIN nganh_hoc nh ON cth.ma_nganh = nh.ma_nganh
JOIN khoa k ON nh.ma_khoa = k.ma_khoa
JOIN mon_hoc mh ON cth.ma_mon_hoc = mh.ma_mon_hoc
WHERE cth.trang_thai = TRUE;
```

---

#### View 4: `v_lop_mo` (BM4)

```sql
CREATE OR REPLACE VIEW v_lop_mo AS
SELECT 
    hk.ma_hoc_ky,
    hk.ten_hoc_ky AS hoc_ky,
    nh.ma_nam_hoc,
    nh.ten_nam_hoc AS nam_hoc,
    ROW_NUMBER() OVER (PARTITION BY hk.ma_hoc_ky ORDER BY l.ma_lop) AS stt,
    mh.ma_mon_hoc,
    mh.ten_mon_hoc AS mon_hoc,
    k.ten_khoa AS khoa_quan_ly,
    l.ma_lop,
    l.ten_lop,
    l.giang_vien,
    l.lich_hoc,
    l.phong_hoc,
    mh.so_tin_chi,
    l.so_luong_toi_da,
    lm.so_luong_da_dang_ky
FROM lop_mo lm
JOIN hoc_ky hk ON lm.ma_hoc_ky = hk.ma_hoc_ky
JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
JOIN lop l ON lm.ma_lop = l.ma_lop
JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
JOIN khoa k ON mh.ma_khoa = k.ma_khoa
WHERE lm.trang_thai = TRUE;
```

---

#### View 5: `v_phieu_dang_ky` (BM5)

```sql
CREATE OR REPLACE VIEW v_phieu_dang_ky AS
SELECT 
    pdk.so_phieu,
    pdk.ma_sv AS ma_so_sinh_vien,
    sv.ho_ten AS ten_sinh_vien,
    pdk.ngay_lap,
    hk.ten_hoc_ky AS hoc_ky,
    nh.ten_nam_hoc AS nam_hoc,
    ROW_NUMBER() OVER (PARTITION BY pdk.so_phieu ORDER BY ctdk.id) AS stt,
    mh.ten_mon_hoc AS mon_hoc,
    l.ten_lop,
    ctdk.loai_dang_ky,
    ctdk.so_tin_chi,
    ctdk.don_gia,
    ctdk.thanh_tien,
    pdk.tong_tin_chi,
    pdk.tong_tien_dang_ky,
    pdk.ti_le_giam,
    pdk.tien_mien_giam,
    pdk.tong_tien_phai_dong
FROM phieu_dang_ky pdk
JOIN sinh_vien sv ON pdk.ma_sv = sv.ma_sv
JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
JOIN chi_tiet_dang_ky ctdk ON pdk.so_phieu = ctdk.so_phieu
JOIN lop l ON ctdk.ma_lop = l.ma_lop
JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
WHERE ctdk.trang_thai = 'Đã đăng ký' AND pdk.trang_thai = 'Đã đăng ký';
```

---

#### View 6: `v_phieu_thu_hoc_phi` (BM6)

```sql
CREATE OR REPLACE VIEW v_phieu_thu_hoc_phi AS
SELECT 
    pthp.so_phieu_thu AS so_phieu,
    pthp.ngay_lap,
    pthp.ma_sv AS ma_so_sinh_vien,
    sv.ho_ten AS ten_sinh_vien,
    pthp.so_tien_thu,
    pthp.hinh_thuc_thu,
    pthp.nguoi_thu,
    pthp.ghi_chu,
    hk.ten_hoc_ky,
    nh.ten_nam_hoc
FROM phieu_thu_hoc_phi pthp
JOIN sinh_vien sv ON pthp.ma_sv = sv.ma_sv
JOIN phieu_dang_ky pdk ON pthp.so_phieu_dang_ky = pdk. so_phieu
JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
WHERE pthp. trang_thai = 'Thành công';
```

---

#### View 7: `v_tinh_hinh_hoc_phi`

```sql
CREATE OR REPLACE VIEW v_tinh_hinh_hoc_phi AS
SELECT 
    pdk.so_phieu,
    pdk.ma_sv,
    sv.ho_ten,
    hk.ma_hoc_ky,
    hk.ten_hoc_ky,
    nh.ten_nam_hoc,
    pdk.tong_tien_dang_ky AS so_tien_dang_ky,
    pdk.tong_tien_phai_dong AS so_tien_phai_dong,
    COALESCE((SELECT SUM(so_tien_thu) FROM phieu_thu_hoc_phi 
              WHERE so_phieu_dang_ky = pdk. so_phieu 
              AND trang_thai = 'Thành công'), 0) AS so_tien_da_dong,
    pdk.tong_tien_phai_dong - COALESCE((SELECT SUM(so_tien_thu) 
              FROM phieu_thu_hoc_phi 
              WHERE so_phieu_dang_ky = pdk.so_phieu 
              AND trang_thai = 'Thành công'), 0) AS so_tien_con_lai,
    hk.han_dong_hoc_phi
FROM phieu_dang_ky pdk
JOIN sinh_vien sv ON pdk.ma_sv = sv.ma_sv
JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
WHERE pdk.trang_thai = 'Đã đăng ký';
```

---

#### View 8: `v_bao_cao_sv_chua_dong_hoc_phi` (BM7)

```sql
CREATE OR REPLACE VIEW v_bao_cao_sv_chua_dong_hoc_phi AS
SELECT 
    ma_hoc_ky,
    ten_hoc_ky AS hoc_ky,
    ten_nam_hoc AS nam_hoc,
    ROW_NUMBER() OVER (PARTITION BY ma_hoc_ky ORDER BY ma_sv) AS stt,
    ma_sv AS ma_so_sinh_vien,
    ho_ten,
    so_tien_dang_ky,
    so_tien_phai_dong,
    so_tien_con_lai,
    han_dong_hoc_phi,
    CASE 
        WHEN han_dong_hoc_phi < CURRENT_DATE THEN 'Quá hạn'
        ELSE 'Chưa đóng đủ'
    END AS trang_thai
FROM v_tinh_hinh_hoc_phi
WHERE so_tien_con_lai > 0;
```

**Cột trả về theo BM7:**

| Cột | Kiểu | Mô tả BM7 |
|-----|------|-----------|
| `stt` | BIGINT | STT |
| `ma_so_sinh_vien` | VARCHAR(15) | Mã số sinh viên |
| `so_tien_dang_ky` | DECIMAL(15,0) | Số tiền đăng ký |
| `so_tien_phai_dong` | DECIMAL(15,0) | Số tiền phải đóng (sau miễn giảm - QĐ7) |
| `so_tien_con_lai` | DECIMAL(15,0) | Số tiền còn lại |

---

## 8. FUNCTIONS VÀ STORED PROCEDURES

### 8.1. Danh sách Functions

| STT | Tên Function | Mô tả | Tham số | Trả về |
|-----|--------------|-------|---------|--------|
| 1 | `fn_lay_ti_le_giam_hoc_phi` | Lấy tỷ lệ giảm HP của SV (QĐ1) | `p_ma_sv` | `DECIMAL(5,2)` |
| 2 | `fn_lay_don_gia` | Lấy đơn giá tín chỉ theo loại môn và loại học (QĐ5) | `p_loai_mon`, `p_loai_hoc`, `p_ma_hoc_ky` | `DECIMAL(12,0)` |
| 3 | `sp_dang_ky_lop` | Đăng ký lớp học (BM5) | `p_ma_sv`, `p_ma_hoc_ky`, `p_ma_lop`, `p_loai_dang_ky` | `TEXT` |
| 4 | `sp_huy_dang_ky_lop` | Hủy đăng ký lớp | `p_ma_sv`, `p_ma_hoc_ky`, `p_ma_lop` | `TEXT` |
| 5 | `sp_thu_hoc_phi` | Thu học phí (BM6, QĐ6) | `p_ma_sv`, `p_ma_hoc_ky`, `p_so_tien_thu`, ...  | `TEXT` |

### 8.2. Chi tiết Functions

#### Function 1: `fn_lay_ti_le_giam_hoc_phi` (QĐ1)

```sql
CREATE OR REPLACE FUNCTION fn_lay_ti_le_giam_hoc_phi(p_ma_sv VARCHAR)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_ti_le DECIMAL(5,2) := 0;
    v_la_vsvx BOOLEAN;
BEGIN
    -- Lấy từ đối tượng ưu tiên cao nhất (do_uu_tien nhỏ nhất)
    SELECT dt.ti_le_giam_hoc_phi INTO v_ti_le
    FROM doi_tuong_sinh_vien dtsv
    JOIN doi_tuong dt ON dtsv.ma_doi_tuong = dt.ma_doi_tuong
    WHERE dtsv.ma_sv = p_ma_sv AND dt.trang_thai = TRUE
    ORDER BY dt.do_uu_tien
    LIMIT 1;
    
    -- Nếu chưa có, kiểm tra vùng sâu/vùng xa (QĐ1)
    IF v_ti_le IS NULL OR v_ti_le = 0 THEN
        SELECT h.la_vung_sau_vung_xa INTO v_la_vsvx
        FROM sinh_vien sv
        JOIN huyen h ON sv.ma_huyen = h.ma_huyen
        WHERE sv.ma_sv = p_ma_sv;
        
        IF v_la_vsvx = TRUE THEN
            SELECT ti_le_giam_hoc_phi INTO v_ti_le
            FROM doi_tuong
            WHERE ten_doi_tuong ILIKE '%vùng sâu%' 
               OR ten_doi_tuong ILIKE '%vùng xa%'
            LIMIT 1;
        END IF;
    END IF;
    
    RETURN COALESCE(v_ti_le, 0);
END;
$$ LANGUAGE plpgsql;
```

**Mô tả:** 
- Lấy tỷ lệ giảm học phí của sinh viên dựa trên đối tượng ưu tiên
- Ưu tiên đối tượng có `do_uu_tien` nhỏ nhất (QĐ1)
- Nếu SV ở vùng sâu/vùng xa mà chưa có đối tượng → tự động áp dụng

---

#### Function 2: `fn_lay_don_gia` (QĐ5)

```sql
CREATE OR REPLACE FUNCTION fn_lay_don_gia(
    p_loai_mon VARCHAR, 
    p_loai_hoc VARCHAR DEFAULT 'hoc_moi',
    p_ma_hoc_ky VARCHAR DEFAULT NULL
)
RETURNS DECIMAL(12,0) AS $$
DECLARE
    v_don_gia DECIMAL(12,0);
    v_loai_hoc_ky VARCHAR(20);
BEGIN
    -- Xác định loại học: nếu học kỳ hè thì áp dụng giá học hè
    IF p_ma_hoc_ky IS NOT NULL THEN
        SELECT loai_hoc_ky INTO v_loai_hoc_ky
        FROM hoc_ky WHERE ma_hoc_ky = p_ma_hoc_ky;
        
        IF v_loai_hoc_ky = 'Hè' AND p_loai_hoc = 'hoc_moi' THEN
            -- Nếu là học kỳ hè, áp dụng giá học hè
            SELECT don_gia INTO v_don_gia
            FROM don_gia_tin_chi
            WHERE loai_mon = p_loai_mon 
              AND loai_hoc = 'hoc_he' 
              AND trang_thai = TRUE
              AND (ma_hoc_ky = p_ma_hoc_ky OR ma_hoc_ky IS NULL)
            ORDER BY ma_hoc_ky DESC NULLS LAST
            LIMIT 1;
        END IF;
    END IF;
    
    -- Nếu chưa có giá, lấy theo loại học cụ thể
    IF v_don_gia IS NULL THEN
        SELECT don_gia INTO v_don_gia
        FROM don_gia_tin_chi
        WHERE loai_mon = p_loai_mon 
          AND loai_hoc = p_loai_hoc 
          AND trang_thai = TRUE
          AND (ma_hoc_ky = p_ma_hoc_ky OR ma_hoc_ky IS NULL)
        ORDER BY ma_hoc_ky DESC NULLS LAST
        LIMIT 1;
    END IF;
    
    -- Mặc định theo QĐ5 (học mới)
    IF v_don_gia IS NULL THEN
        v_don_gia := CASE 
            WHEN p_loai_mon = 'LT' AND p_loai_hoc = 'hoc_moi' THEN 27000
            WHEN p_loai_mon = 'TH' AND p_loai_hoc = 'hoc_moi' THEN 37000
            WHEN p_loai_mon = 'LT' AND p_loai_hoc = 'hoc_lai' THEN 32000
            WHEN p_loai_mon = 'TH' AND p_loai_hoc = 'hoc_lai' THEN 42000
            WHEN p_loai_mon = 'LT' AND p_loai_hoc = 'hoc_cai_thien' THEN 30000
            WHEN p_loai_mon = 'TH' AND p_loai_hoc = 'hoc_cai_thien' THEN 40000
            WHEN p_loai_mon = 'LT' AND p_loai_hoc = 'hoc_he' THEN 35000
            WHEN p_loai_mon = 'TH' AND p_loai_hoc = 'hoc_he' THEN 45000
            ELSE 27000
        END;
    END IF;
    
    RETURN v_don_gia;
END;
$$ LANGUAGE plpgsql;
```

**Mô tả:**
- Lấy đơn giá 1 tín chỉ theo loại môn và loại học (QĐ5)
- Hỗ trợ đơn giá khác nhau cho:
  - **Học mới**: LT = 27,000đ, TH = 37,000đ
  - **Học lại**: LT = 32,000đ, TH = 42,000đ
  - **Học cải thiện**: LT = 30,000đ, TH = 40,000đ
  - **Học hè**: LT = 35,000đ, TH = 45,000đ

---

#### Function 3: `sp_dang_ky_lop` (BM5, QĐ5)

```sql
CREATE OR REPLACE FUNCTION sp_dang_ky_lop(
    p_ma_sv VARCHAR,
    p_ma_hoc_ky VARCHAR,
    p_ma_lop VARCHAR,
    p_loai_dang_ky VARCHAR DEFAULT 'hoc_moi'  -- 'hoc_moi', 'hoc_lai', 'hoc_cai_thien'
) RETURNS TEXT AS $$
DECLARE
    v_so_phieu INTEGER;
    v_so_tin_chi INTEGER;
    v_loai_mon VARCHAR(5);
    v_don_gia DECIMAL(12,0);
    v_thanh_tien DECIMAL(15,0);
    v_ti_le_giam DECIMAL(5,2);
    v_ma_mon_hoc VARCHAR(15);
BEGIN
    -- Kiểm tra lớp có mở trong học kỳ không
    IF NOT EXISTS (
        SELECT 1 FROM lop_mo 
        WHERE ma_hoc_ky = p_ma_hoc_ky 
          AND ma_lop = p_ma_lop 
          AND trang_thai = TRUE
    ) THEN
        RETURN 'Lớp học không mở trong học kỳ này';
    END IF;
    
    -- Kiểm tra sĩ số còn chỗ
    IF EXISTS (
        SELECT 1 FROM lop_mo lm
        JOIN lop l ON lm.ma_lop = l.ma_lop
        WHERE lm.ma_hoc_ky = p_ma_hoc_ky 
          AND lm.ma_lop = p_ma_lop
          AND lm.so_luong_da_dang_ky >= l.so_luong_toi_da
    ) THEN
        RETURN 'Lớp học đã đầy';
    END IF;
    
    -- Lấy thông tin lớp và môn học
    SELECT mh.ma_mon_hoc, mh.so_tin_chi, mh.loai_mon 
    INTO v_ma_mon_hoc, v_so_tin_chi, v_loai_mon
    FROM lop l
    JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
    WHERE l.ma_lop = p_ma_lop;
    
    -- Lấy đơn giá theo loại học (QĐ5)
    v_don_gia := fn_lay_don_gia(v_loai_mon, p_loai_dang_ky, p_ma_hoc_ky);
    v_thanh_tien := v_so_tin_chi * v_don_gia;
    
    -- Lấy tỷ lệ giảm (QĐ1)
    v_ti_le_giam := fn_lay_ti_le_giam_hoc_phi(p_ma_sv);
    
    -- Tạo/lấy phiếu đăng ký
    SELECT so_phieu INTO v_so_phieu
    FROM phieu_dang_ky 
    WHERE ma_sv = p_ma_sv AND ma_hoc_ky = p_ma_hoc_ky;
    
    IF v_so_phieu IS NULL THEN
        INSERT INTO phieu_dang_ky (ma_sv, ma_hoc_ky, ti_le_giam)
        VALUES (p_ma_sv, p_ma_hoc_ky, v_ti_le_giam)
        RETURNING so_phieu INTO v_so_phieu;
    END IF;
    
    -- Kiểm tra đã đăng ký lớp này chưa
    IF EXISTS (
        SELECT 1 FROM chi_tiet_dang_ky 
        WHERE so_phieu = v_so_phieu 
          AND ma_lop = p_ma_lop 
          AND trang_thai = 'Đã đăng ký'
    ) THEN
        RETURN 'Đã đăng ký lớp này';
    END IF;
    
    -- Thêm chi tiết đăng ký
    INSERT INTO chi_tiet_dang_ky (
        so_phieu, ma_lop, loai_dang_ky, so_tin_chi, loai_mon, don_gia, thanh_tien
    ) VALUES (
        v_so_phieu, p_ma_lop, p_loai_dang_ky, v_so_tin_chi, v_loai_mon, v_don_gia, v_thanh_tien
    );
    
    -- Cập nhật tổng tiền phiếu đăng ký
    UPDATE phieu_dang_ky SET
        tong_tin_chi = (
            SELECT COALESCE(SUM(so_tin_chi), 0) 
            FROM chi_tiet_dang_ky 
            WHERE so_phieu = v_so_phieu AND trang_thai = 'Đã đăng ký'
        ),
        tong_tien_dang_ky = (
            SELECT COALESCE(SUM(thanh_tien), 0) 
            FROM chi_tiet_dang_ky 
            WHERE so_phieu = v_so_phieu AND trang_thai = 'Đã đăng ký'
        ),
        tien_mien_giam = (
            SELECT COALESCE(SUM(thanh_tien), 0) 
            FROM chi_tiet_dang_ky 
            WHERE so_phieu = v_so_phieu AND trang_thai = 'Đã đăng ký'
        ) * v_ti_le_giam / 100,
        tong_tien_phai_dong = (
            SELECT COALESCE(SUM(thanh_tien), 0) 
            FROM chi_tiet_dang_ky 
            WHERE so_phieu = v_so_phieu AND trang_thai = 'Đã đăng ký'
        ) * (100 - v_ti_le_giam) / 100,
        ngay_cap_nhat = CURRENT_TIMESTAMP
    WHERE so_phieu = v_so_phieu;
    
    -- Cập nhật số lượng đăng ký của lớp mở
    UPDATE lop_mo 
    SET so_luong_da_dang_ky = so_luong_da_dang_ky + 1
    WHERE ma_hoc_ky = p_ma_hoc_ky AND ma_lop = p_ma_lop;
    
    RETURN 'Đăng ký thành công';
END;
$$ LANGUAGE plpgsql;
```

---

#### Function 4: `sp_thu_hoc_phi` (BM6, QĐ6)

```sql
CREATE OR REPLACE FUNCTION sp_thu_hoc_phi(
    p_ma_sv VARCHAR,
    p_ma_hoc_ky VARCHAR,
    p_so_tien_thu DECIMAL,
    p_hinh_thuc_thu VARCHAR DEFAULT 'Tiền mặt',
    p_nguoi_thu VARCHAR DEFAULT NULL,
    p_ghi_chu VARCHAR DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_so_phieu INTEGER;
    v_con_lai DECIMAL(15,0);
BEGIN
    -- Lấy phiếu đăng ký
    SELECT so_phieu INTO v_so_phieu
    FROM phieu_dang_ky 
    WHERE ma_sv = p_ma_sv 
      AND ma_hoc_ky = p_ma_hoc_ky 
      AND trang_thai = 'Đã đăng ký';
    
    IF v_so_phieu IS NULL THEN
        RETURN 'Không tìm thấy phiếu đăng ký';
    END IF;
    
    -- Tính số tiền còn lại
    SELECT tong_tien_phai_dong - COALESCE((
        SELECT SUM(so_tien_thu) FROM phieu_thu_hoc_phi 
        WHERE so_phieu_dang_ky = v_so_phieu 
          AND trang_thai = 'Thành công'
    ), 0) INTO v_con_lai
    FROM phieu_dang_ky WHERE so_phieu = v_so_phieu;
    
    -- Kiểm tra số tiền thu
    IF p_so_tien_thu > v_con_lai THEN
        RETURN 'Số tiền thu vượt quá số tiền còn lại (' || 
               TO_CHAR(v_con_lai, 'FM999,999,999') || 'đ)';
    END IF;
    
    -- Tạo phiếu thu (QĐ6: SV có thể đóng nhiều lần)
    INSERT INTO phieu_thu_hoc_phi (
        so_phieu_dang_ky, ma_sv, so_tien_thu, 
        hinh_thuc_thu, nguoi_thu, ghi_chu
    ) VALUES (
        v_so_phieu, p_ma_sv, p_so_tien_thu, 
        p_hinh_thuc_thu, p_nguoi_thu, p_ghi_chu
    );
    
    RETURN 'Thu học phí thành công.  Còn lại:  ' || 
           TO_CHAR(v_con_lai - p_so_tien_thu, 'FM999,999,999') || 'đ';
END;
$$ LANGUAGE plpgsql;
```

---

## 9. QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

### 9.1. Quy định theo đề tài

| Mã | Quy định | Bảng liên quan | Cách triển khai |
|----|----------|----------------|-----------------|
| QĐ1 | Quê quán gồm Huyện và Tỉnh. Huyện có thuộc vùng sâu/xa hay không. SV có thể thuộc nhiều đối tượng, lấy đối tượng ưu tiên cao nhất | `tinh`, `huyen`, `doi_tuong`, `doi_tuong_sinh_vien` | Cột `la_vung_sau_vung_xa` trong `huyen`. Function `fn_lay_ti_le_giam_hoc_phi` |
| QĐ2 | Loại môn LT/TH. Số tín chỉ = số tiết/15 (LT) hoặc /30 (TH). Môn học thuộc khoa quản lý | `mon_hoc`, `khoa` | Computed column `so_tin_chi`, FK `ma_khoa` |
| QĐ3 | Chương trình học theo ngành để mở lớp trong học kỳ | `chuong_trinh_hoc`, `lop`, `lop_mo` | FK liên kết |
| QĐ4 | Có HK I, HK II (chính) và có thể có HK Hè | `hoc_ky` | Cột `loai_hoc_ky` |
| QĐ5 | Đơn giá khác nhau theo loại môn và loại học (học mới, học lại, học cải thiện, học hè). SV chỉ ĐK lớp có mở trong HK | `don_gia_tin_chi`, `lop_mo` | Function `fn_lay_don_gia`, `sp_dang_ky_lop` |
| QĐ6 | SV có thể đóng HP nhiều lần, phải hoàn thành trước hạn | `phieu_thu_hoc_phi`, `hoc_ky` | Cho phép nhiều phiếu thu/phiếu ĐK. Cột `han_dong_hoc_phi` |
| QĐ7 | Số tiền phải đóng <= Số tiền đăng ký (do miễn giảm) | `phieu_dang_ky` | Cột `tong_tien_phai_dong` = `tong_tien_dang_ky` - `tien_mien_giam` |
| QĐ8 | Một môn học có thể có nhiều lớp | `mon_hoc`, `lop` | FK `ma_mon_hoc` trong bảng `lop` |

### 9.2. Công thức tính toán

```
┌─────────────────────────────────────────────────────────────────┐
│                    CÔNG THỨC TÍNH HỌC PHÍ                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Số tín chỉ (QĐ2):                                          │
│     - Môn LT: số_tín_chỉ = số_tiết / 15                        │
│     - Môn TH: số_tín_chỉ = số_tiết / 30                        │
│                                                                 │
│  2. Thành tiền mỗi lớp (QĐ5):                                  │
│     thành_tiền = số_tín_chỉ × đơn_giá (theo loại học)          │
│     Đơn giá theo loại học:                                     │
│     - Học mới: LT = 27,000đ, TH = 37,000đ                      │
│     - Học lại: LT = 32,000đ, TH = 42,000đ                      │
│     - Học cải thiện: LT = 30,000đ, TH = 40,000đ                │
│     - Học hè: LT = 35,000đ, TH = 45,000đ                       │
│                                                                 │
│  3. Tổng tiền đăng ký (BM7):                                   │
│     tổng_tiền_đăng_ký = SUM(thành_tiền các lớp)                │
│                                                                 │
│  4. Tiền miễn giảm (QĐ1, QĐ7):                                 │
│     tiền_miễn_giảm = tổng_tiền_đăng_ký × tỉ_lệ_giảm / 100      │
│                                                                 │
│  5. Tổng tiền phải đóng (BM7):                                 │
│     tổng_tiền_phải_đóng = tổng_tiền_đăng_ký - tiền_miễn_giảm   │
│                                                                 │
│  6. Số tiền còn lại (BM7):                                     │
│     số_tiền_còn_lại = tổng_tiền_phải_đóng - SUM(số_tiền_đã_thu)│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. PHỤ LỤC

### 10.1. Sơ đồ ERD chi tiết

```
                                ┌─────────────────┐
                                │      tinh       │
                                │─────────────────│
                                │ * ma_tinh (PK)  │
                                │   ten_tinh      │
                                │   trang_thai    │
                                └────────┬────────┘
                                         │ 1
                                         │
                                         │ n
                                ┌────────┴────────┐
                                │      huyen      │
                                │─────────────────│
                                │ * ma_huyen (PK) │
                                │   ten_huyen     │
                                │ # ma_tinh (FK)  │
                                │   la_vung_sau..  │
                                └────────┬────────┘
                                         │ 1
          ┌──────────────────────────────┼──────────────────────────────┐
          │                              │                              │
          │ n                            │                              │
┌─────────┴─────────┐                    │                    ┌─────────┴─────────┐
│       khoa        │                    │                    │    doi_tuong      │
│───────────────────│                    │                    │───────────────────│
│ * ma_khoa (PK)    │                    │                    │ * ma_doi_tuong(PK)│
│   ten_khoa        │                    │                    │   ten_doi_tuong   │
└─────────┬─────────┘                    │                    │   ti_le_giam_hp   │
          │ 1                            │                    │   do_uu_tien      │
          │                              │                    └─────────┬─────────┘
          │ n                            │                              │ 1
┌─────────┴─────────┐                    │                              │
│    nganh_hoc      │                    │                              │ n
│───────────────────│                    │                    ┌─────────┴─────────┐
│ * ma_nganh (PK)   │                    │                    │ doi_tuong_sv      │
│   ten_nganh       │                    │                    │───────────────────│
│ # ma_khoa (FK)    │                    │                    │ * id (PK)         │
└─────────┬─────────┘                    │                    │ # ma_sv (FK)      │
          │ 1                            │                    │ # ma_doi_tuong(FK)│
          │                              │                    └─────────┬─────────┘
          │ n                   n        │                              │ n
          └──────────────────────────────┼──────────────────────────────┘
                                         │
                                ┌────────┴────────┐
                                │   sinh_vien     │
                                │─────────────────│
                                │ * ma_sv (PK)    │
                                │ # ma_tai_khoan  │
                                │   ho_ten        │
                                │   ngay_sinh     │
                                │   gioi_tinh     │
                                │ # ma_huyen (FK) │
                                │ # ma_nganh (FK) │
                                │   trang_thai    │
                                └────────┬────────┘
                                         │ 1
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    │ n                  │ n                  │ 1
          ┌─────────┴─────────┐ ┌────────┴────────┐ ┌─────────┴─────────┐
          │  phieu_dang_ky    │ │ phieu_thu_hp    │ │    tai_khoan      │
          │───────────────────│ │─────────────────│ │───────────────────│
          │ * so_phieu (PK)   │ │ * so_phieu_thu  │ │ * ma_tai_khoan(PK)│
          │ # ma_sv (FK)      │ │ # so_phieu_dk   │ │   ten_dang_nhap   │
          │ # ma_hoc_ky (FK)  │ │ # ma_sv (FK)    │ │   role            │
          │   ngay_lap        │ │   so_tien_thu   │ │ # ma_sv (FK)      │
          │   tong_tien_dk    │ │   hinh_thuc_thu │ └───────────────────┘
          │   ti_le_giam      │ └─────────────────┘
          │   tong_tien_phai.  │
          └─────────┬─────────┘
                    │ 1
                    │
                    │ n
          ┌─────────┴─────────┐
          │  chi_tiet_dk      │
          │───────────────────│
          │ * id (PK)         │
          │ # so_phieu (FK)   │
          │ # ma_lop (FK)     │
          │   loai_dang_ky    │
          │   so_tin_chi      │
          │   don_gia         │
          │   thanh_tien      │
          └─────────┬─────────┘
                    │ n
                    │
                    │ 1
          ┌─────────┴─────────┐
          │       lop         │
          │───────────────────│
          │ * ma_lop (PK)     │
          │ # ma_mon_hoc (FK) │
          │   ten_lop         │
          │   giang_vien      │
          │   lich_hoc        │
          │   so_luong_toi_da │
          └─────────┬─────────┘
                    │ 1
                    │
                    │ n
          ┌─────────┴─────────┐                   
          │     mon_hoc       │                   
          │───────────────────│          ┌────────────────┐
          │ * ma_mon_hoc (PK) │          │chuong_trinh_hoc│
          │ # ma_khoa (FK)    │          │────────────────│
          │   ten_mon_hoc     │◄─────────│ * id (PK)      │
          │   loai_mon        │          │ # ma_nganh (FK)│
          │   so_tiet         │          │ # ma_mon_hoc   │
          │   so_tin_chi      │          │   hoc_ky_du_kien│
          └─────────┬─────────┘          └────────────────┘
                    │ n
                    │
                    │ 1
          ┌─────────┴─────────┐
          │       khoa        │
          │───────────────────│
          │ * ma_khoa (PK)    │
          │   ten_khoa        │
          └───────────────────┘

Ghi chú mối quan hệ sinh_vien - tai_khoan:
- sinh_vien.ma_tai_khoan → tai_khoan.ma_tai_khoan (FK: fk_sv_tk)
- tai_khoan.ma_sv → sinh_vien.ma_sv (FK: fk_tk_sv)
- Đây là mối quan hệ 1-1 hai chiều để dễ dàng truy vấn thông tin từ cả hai phía

Chú thích:
  * :  Primary Key (Khóa chính)
  # : Foreign Key (Khóa ngoại)
  1 : Một
  n : Nhiều
```
### 10.2. Danh sách dữ liệu mẫu đề xuất (Tiếp theo)

| Bảng | Số bản ghi đề xuất | Ghi chú |
|------|-------------------|---------|
| `tinh` | 63 | 63 tỉnh/thành Việt Nam |
| `huyen` | 100+ | Các huyện/quận phổ biến |
| `doi_tuong` | 6-10 | Các đối tượng ưu tiên theo QĐ1 |
| `khoa` | 5-10 | Các khoa trong trường |
| `nganh_hoc` | 15-20 | Các ngành đào tạo |
| `sinh_vien` | 100+ | Sinh viên mẫu |
| `mon_hoc` | 50-100 | Các môn học (thuộc khoa quản lý) |
| `lop` | 100+ | Các lớp học (một môn nhiều lớp) |
| `chuong_trinh_hoc` | 200+ | CTĐT các ngành |
| `nam_hoc` | 3-5 | Các năm học gần đây |
| `hoc_ky` | 10-15 | Các học kỳ |
| `lop_mo` | 100+ | Lớp mở trong HK hiện tại |
| `tai_khoan` | 100+ | Tài khoản người dùng (với role trực tiếp) |

### 10.3. Dữ liệu mẫu chi tiết

#### 10.3.1. Đối tượng ưu tiên (QĐ1)

```sql
INSERT INTO doi_tuong (ma_doi_tuong, ten_doi_tuong, ti_le_giam_hoc_phi, do_uu_tien, mo_ta) VALUES 
('DT01', 'Con liệt sĩ',           100. 00, 1, 'Miễn 100% học phí'),
('DT02', 'Con thương binh',        80.00, 2, 'Giảm 80% học phí'),
('DT03', 'Hộ nghèo',               70.00, 3, 'Giảm 70% học phí'),
('DT04', 'Vùng sâu vùng xa',       50.00, 4, 'Giảm 50% học phí'),
('DT05', 'Hộ cận nghèo',           50.00, 5, 'Giảm 50% học phí'),
('DT06', 'Dân tộc thiểu số',       30.00, 6, 'Giảm 30% học phí'),
('DT07', 'Mồ côi cha hoặc mẹ',     30.00, 7, 'Giảm 30% học phí'),
('DT08', 'Khuyết tật',             50.00, 8, 'Giảm 50% học phí');
```

#### 10.3.2. Đơn giá tín chỉ (QĐ5)

```sql
INSERT INTO don_gia_tin_chi (loai_mon, don_gia, ghi_chu) VALUES 
('LT', 27000, 'Đơn giá môn Lý thuyết - 27,000đ/tín chỉ (QĐ5)'),
('TH', 37000, 'Đơn giá môn Thực hành - 37,000đ/tín chỉ (QĐ5)');
```

#### 10.3.3. Môn học mẫu (BM2, QĐ2)

```sql
-- Môn Lý thuyết (LT): số tín chỉ = số tiết / 15
INSERT INTO mon_hoc (ma_mon_hoc, ten_mon_hoc, loai_mon, so_tiet) VALUES 
('LT001', 'Toán cao cấp',                    'LT', 45),  -- 3 TC
('LT002', 'Vật lý đại cương',                'LT', 45),  -- 3 TC
('LT003', 'Triết học Mác-Lênin',             'LT', 45),  -- 3 TC
('LT004', 'Kinh tế chính trị',               'LT', 30),  -- 2 TC
('LT005', 'Cơ sở dữ liệu',                   'LT', 45),  -- 3 TC
('LT006', 'Lập trình hướng đối tượng',       'LT', 45),  -- 3 TC
('LT007', 'Mạng máy tính',                   'LT', 60),  -- 4 TC
('LT008', 'Tiếng Anh cơ bản 1',              'LT', 60),  -- 4 TC
('LT009', 'Tiếng Anh cơ bản 2',              'LT', 60),  -- 4 TC
('LT010', 'Cấu trúc dữ liệu và giải thuật',  'LT', 45),  -- 3 TC
('LT011', 'Hệ điều hành',                    'LT', 45),  -- 3 TC
('LT012', 'Công nghệ phần mềm',              'LT', 45);  -- 3 TC

-- Môn Thực hành (TH): số tín chỉ = số tiết / 30
INSERT INTO mon_hoc (ma_mon_hoc, ten_mon_hoc, loai_mon, so_tiet) VALUES 
('TH001', 'Thực hành Cơ sở dữ liệu',         'TH', 60),  -- 2 TC
('TH002', 'Thực hành Lập trình',             'TH', 90),  -- 3 TC
('TH003', 'Thực hành Mạng máy tính',         'TH', 60),  -- 2 TC
('TH004', 'Đồ án môn học',                   'TH', 60),  -- 2 TC
('TH005', 'Thực hành Hệ điều hành',          'TH', 60),  -- 2 TC
('TH006', 'Đồ án tốt nghiệp',                'TH', 300); -- 10 TC
```

#### 10.3.4. Tài khoản người dùng

```sql
-- Tài khoản được phân quyền trực tiếp qua cột `role`
-- Không cần bảng vai_tro, quyen, phan_quyen riêng

-- Tạo tài khoản Admin
INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, role, ho_ten, email) VALUES 
('admin', '$2a$10$...', 'admin', 'Quản trị viên', 'admin@school.edu.vn');

-- Tạo tài khoản Sinh viên (liên kết với bảng sinh_vien qua ma_sv và ngược lại)
-- Bước 1: Tạo tài khoản trước
INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, role, email) VALUES 
('SV001', '$2a$10$...', 'sinh_vien', 'sv001@student.edu.vn'),
('SV002', '$2a$10$...', 'sinh_vien', 'sv002@student.edu.vn');

-- Bước 2: Tạo sinh viên với ma_tai_khoan tham chiếu tới tài khoản vừa tạo
-- (Giả sử ma_tai_khoan của SV001 = 2, SV002 = 3)
INSERT INTO sinh_vien (ma_sv, ma_tai_khoan, ho_ten, ngay_sinh, gioi_tinh, ma_huyen, ma_nganh, email) VALUES 
('SV001', 2, 'Nguyễn Văn An', '2003-05-15', 'Nam', 'Q1', 'KTPM', 'sv001@student.edu.vn'),
('SV002', 3, 'Trần Thị Bích', '2003-08-20', 'Nữ', 'Q1', 'KTPM', 'sv002@student.edu.vn');

-- Bước 3: Cập nhật lại tài khoản để liên kết ngược với sinh viên
UPDATE tai_khoan SET ma_sv = 'SV001' WHERE ma_tai_khoan = 2;
UPDATE tai_khoan SET ma_sv = 'SV002' WHERE ma_tai_khoan = 3;
```

**Lưu ý:** 
- Mối quan hệ hai chiều giữa `sinh_vien` và `tai_khoan` cho phép:
  - Từ `sinh_vien` truy vấn `tai_khoan` qua `ma_tai_khoan`
  - Từ `tai_khoan` truy vấn `sinh_vien` qua `ma_sv`
- Phân quyền được thực hiện trực tiếp trong code backend dựa trên giá trị cột `role`:
  - `admin`: Toàn quyền quản lý
  - `sinh_vien`: Chỉ xem thông tin cá nhân, đăng ký lớp học, xem học phí

---

## 11. HƯỚNG DẪN SỬ DỤNG

### 11.1. Tạo Database

```sql
-- Bước 1: Tạo database
CREATE DATABASE ql_dangky_hocphi
    WITH ENCODING = 'UTF8'
    LC_COLLATE = 'vi_VN.UTF-8'
    LC_CTYPE = 'vi_VN.UTF-8';

-- Bước 2: Kết nối đến database
\c ql_dangky_hocphi

-- Bước 3: Chạy script tạo bảng (file SQL chính)
\i path/to/QuanLyDangKyMonHoc_HocPhi_PostgreSQL.sql
```

### 11.2. Các thao tác cơ bản

#### 11.2.1. Thêm sinh viên mới (BM1)

```sql
-- Bước 1: Tạo tài khoản trước
INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, role, email)
VALUES ('SV001', '$2a$10$...', 'sinh_vien', 'an.nv@email.com')
RETURNING ma_tai_khoan;
-- Giả sử trả về ma_tai_khoan = 10

-- Bước 2: Thêm sinh viên với ma_tai_khoan
INSERT INTO sinh_vien (
    ma_sv, ma_tai_khoan, ho_ten, ngay_sinh, gioi_tinh, 
    ma_huyen, ma_nganh, sdt, email
) VALUES (
    'SV001', 10, 'Nguyễn Văn An', '2003-05-15', 'Nam',
    'Q1', 'KTPM', '0901234567', 'an.nv@email.com'
);

-- Bước 3: Cập nhật lại tài khoản để liên kết với sinh viên (tùy chọn, để hỗ trợ truy vấn 2 chiều)
UPDATE tai_khoan SET ma_sv = 'SV001' WHERE ma_tai_khoan = 10;

-- Gán đối tượng ưu tiên cho sinh viên (nếu có)
INSERT INTO doi_tuong_sinh_vien (ma_sv, ma_doi_tuong, ghi_chu)
VALUES ('SV001', 'DT03', 'Sinh viên hộ nghèo');
```

**Lưu ý:** Mối quan hệ hai chiều giữa `sinh_vien` và `tai_khoan`:
- `sinh_vien.ma_tai_khoan` → tham chiếu tới `tai_khoan.ma_tai_khoan`
- `tai_khoan.ma_sv` → tham chiếu tới `sinh_vien.ma_sv`

Điều này cho phép truy vấn thông tin từ cả hai phía một cách thuận tiện.

#### 11.2.2. Thêm môn học (BM2)

```sql
-- Thêm môn Lý thuyết (số tín chỉ tự động tính = 45/15 = 3)
-- Môn thuộc khoa quản lý
INSERT INTO mon_hoc (ma_mon_hoc, ten_mon_hoc, ma_khoa, loai_mon, so_tiet)
VALUES ('LT013', 'Trí tuệ nhân tạo', 'CNTT', 'LT', 45);

-- Thêm môn Thực hành (số tín chỉ tự động tính = 60/30 = 2)
INSERT INTO mon_hoc (ma_mon_hoc, ten_mon_hoc, ma_khoa, loai_mon, so_tiet)
VALUES ('TH007', 'Thực hành AI', 'CNTT', 'TH', 60);
```

#### 11.2.3. Tạo lớp học cho môn

```sql
-- Mỗi môn có thể có nhiều lớp
INSERT INTO lop (ma_lop, ten_lop, ma_mon_hoc, giang_vien, lich_hoc, phong_hoc, so_luong_toi_da)
VALUES 
    ('LT013_01', 'LT013_Lớp 1', 'LT013', 'Nguyễn Văn A', 'Thứ 2, Tiết 1-3', 'A101', 50),
    ('LT013_02', 'LT013_Lớp 2', 'LT013', 'Trần Thị B', 'Thứ 4, Tiết 1-3', 'A102', 50),
    ('TH007_01', 'TH007_Lớp 1', 'TH007', 'Lê Văn C', 'Thứ 6, Tiết 1-3', 'Lab01', 30);
```

#### 11.2.4. Thiết lập chương trình học (BM3)

```sql
-- Thêm môn vào chương trình đào tạo ngành KTPM
INSERT INTO chuong_trinh_hoc (ma_nganh, ma_mon_hoc, hoc_ky_du_kien, ghi_chu)
VALUES 
    ('KTPM', 'LT001', 1, 'Môn cơ sở'),
    ('KTPM', 'LT005', 2, 'Môn cơ sở ngành'),
    ('KTPM', 'TH001', 2, 'Thực hành đi kèm LT005'),
    ('KTPM', 'LT006', 3, 'Môn chuyên ngành');
```

#### 11.2.5. Mở lớp trong học kỳ (BM4)

```sql
-- Mở các lớp cho học kỳ 1 năm 2025-2026
INSERT INTO lop_mo (ma_hoc_ky, ma_lop)
VALUES 
    ('HK1-2526', 'LT013_01'),
    ('HK1-2526', 'LT013_02'),
    ('HK1-2526', 'TH007_01');
```

#### 11.2.6. Đăng ký lớp học (BM5)

```sql
-- Sử dụng function đăng ký lớp học
-- Đăng ký học mới
SELECT sp_dang_ky_lop('SV001', 'HK1-2526', 'LT013_01', 'hoc_moi');

-- Đăng ký học lại (đơn giá cao hơn)
SELECT sp_dang_ky_lop('SV001', 'HK1-2526', 'TH007_01', 'hoc_lai');

-- Đăng ký học cải thiện
SELECT sp_dang_ky_lop('SV002', 'HK1-2526', 'LT013_02', 'hoc_cai_thien');

-- Xem phiếu đăng ký
SELECT * FROM v_phieu_dang_ky WHERE ma_so_sinh_vien = 'SV001';
```

#### 11.2.7. Thu học phí (BM6)

```sql
-- Sinh viên đóng học phí lần 1 (QĐ6: có thể đóng nhiều lần)
SELECT sp_thu_hoc_phi(
    'SV001',           -- Mã SV
    'HK1-2526',        -- Mã học kỳ
    200000,            -- Số tiền thu
    'Tiền mặt',        -- Hình thức
    'Nguyễn Văn B',    -- Người thu
    'Đóng lần 1'       -- Ghi chú
);

-- Sinh viên đóng học phí lần 2
SELECT sp_thu_hoc_phi('SV001', 'HK1-2526', 150000, 'Chuyển khoản', NULL, 'Đóng lần 2');

-- Xem phiếu thu
SELECT * FROM v_phieu_thu_hoc_phi WHERE ma_so_sinh_vien = 'SV001';
```

#### 11.2.8. Xem báo cáo SV chưa đóng học phí (BM7)

```sql
-- Xem tất cả SV chưa đóng đủ học phí
SELECT * FROM v_bao_cao_sv_chua_dong_hoc_phi;

-- Lọc theo học kỳ
SELECT * FROM v_bao_cao_sv_chua_dong_hoc_phi 
WHERE ma_hoc_ky = 'HK1-2526';

-- Lọc SV quá hạn
SELECT * FROM v_bao_cao_sv_chua_dong_hoc_phi 
WHERE trang_thai = 'Quá hạn';
```

### 11.3. Queries thường dùng

#### 11.3.1. Thống kê sinh viên theo ngành

```sql
SELECT 
    k.ten_khoa,
    nh.ten_nganh,
    COUNT(sv.ma_sv) AS so_luong_sv,
    COUNT(CASE WHEN sv.trang_thai = 'Đang học' THEN 1 END) AS dang_hoc,
    COUNT(CASE WHEN sv.trang_thai = 'Tốt nghiệp' THEN 1 END) AS tot_nghiep
FROM sinh_vien sv
JOIN nganh_hoc nh ON sv.ma_nganh = nh. ma_nganh
JOIN khoa k ON nh.ma_khoa = k.ma_khoa
GROUP BY k.ten_khoa, nh.ten_nganh
ORDER BY k.ten_khoa, nh.ten_nganh;
```

#### 11.3.2. Thống kê đăng ký lớp theo học kỳ

```sql
SELECT 
    hk.ten_hoc_ky,
    nh.ten_nam_hoc,
    mh.ma_mon_hoc,
    mh.ten_mon_hoc,
    l.ma_lop,
    l.ten_lop,
    l.giang_vien,
    l.so_luong_toi_da,
    lm.so_luong_da_dang_ky,
    l.so_luong_toi_da - lm.so_luong_da_dang_ky AS con_trong
FROM lop_mo lm
JOIN hoc_ky hk ON lm.ma_hoc_ky = hk.ma_hoc_ky
JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
JOIN lop l ON lm.ma_lop = l.ma_lop
JOIN mon_hoc mh ON l.ma_mon_hoc = mh.ma_mon_hoc
WHERE lm.trang_thai = TRUE
ORDER BY hk.ma_hoc_ky, mh.ma_mon_hoc, l.ma_lop;
```

#### 11.3.3. Thống kê thu học phí theo học kỳ

```sql
SELECT 
    hk.ten_hoc_ky,
    nh.ten_nam_hoc,
    COUNT(DISTINCT pdk.ma_sv) AS tong_sv,
    SUM(pdk.tong_tien_dang_ky) AS tong_tien_dang_ky,
    SUM(pdk.tien_mien_giam) AS tong_mien_giam,
    SUM(pdk.tong_tien_phai_dong) AS tong_phai_dong,
    COALESCE(SUM(thu. da_thu), 0) AS tong_da_thu,
    SUM(pdk.tong_tien_phai_dong) - COALESCE(SUM(thu.da_thu), 0) AS tong_con_no,
    COUNT(CASE WHEN pdk.tong_tien_phai_dong <= COALESCE(thu.da_thu, 0) THEN 1 END) AS sv_da_dong_du,
    COUNT(CASE WHEN pdk.tong_tien_phai_dong > COALESCE(thu.da_thu, 0) THEN 1 END) AS sv_con_no
FROM phieu_dang_ky pdk
JOIN hoc_ky hk ON pdk.ma_hoc_ky = hk.ma_hoc_ky
JOIN nam_hoc nh ON hk.ma_nam_hoc = nh.ma_nam_hoc
LEFT JOIN (
    SELECT so_phieu_dang_ky, SUM(so_tien_thu) AS da_thu
    FROM phieu_thu_hoc_phi
    WHERE trang_thai = 'Thành công'
    GROUP BY so_phieu_dang_ky
) thu ON pdk.so_phieu = thu.so_phieu_dang_ky
WHERE pdk.trang_thai = 'Đã đăng ký'
GROUP BY hk.ma_hoc_ky, hk.ten_hoc_ky, nh.ten_nam_hoc
ORDER BY nh.ten_nam_hoc DESC, hk.thu_tu;
```

#### 11.3.4. Danh sách SV được miễn giảm học phí

```sql
SELECT 
    sv.ma_sv,
    sv.ho_ten,
    nh.ten_nganh,
    dt.ten_doi_tuong,
    dt. ti_le_giam_hoc_phi,
    h.ten_huyen || ', ' || t.ten_tinh AS que_quan,
    CASE WHEN h.la_vung_sau_vung_xa THEN 'Có' ELSE 'Không' END AS vung_sau_xa
FROM sinh_vien sv
JOIN nganh_hoc nh ON sv.ma_nganh = nh.ma_nganh
JOIN huyen h ON sv.ma_huyen = h.ma_huyen
JOIN tinh t ON h.ma_tinh = t.ma_tinh
LEFT JOIN doi_tuong_sinh_vien dtsv ON sv.ma_sv = dtsv.ma_sv
LEFT JOIN doi_tuong dt ON dtsv.ma_doi_tuong = dt.ma_doi_tuong
WHERE dtsv.id IS NOT NULL OR h.la_vung_sau_vung_xa = TRUE
ORDER BY dt. do_uu_tien NULLS LAST, sv.ma_sv;
```

---

## 12. BẢO TRÌ VÀ BACKUP

### 12.1. Backup Database

```bash
# Backup toàn bộ database
pg_dump -U postgres -h localhost -F c -b -v -f "backup_ql_dangky_hocphi_$(date +%Y%m%d).dump" ql_dangky_hocphi

# Backup chỉ schema (cấu trúc)
pg_dump -U postgres -h localhost -s -f "schema_backup. sql" ql_dangky_hocphi

# Backup chỉ data
pg_dump -U postgres -h localhost -a -f "data_backup.sql" ql_dangky_hocphi
```

### 12.2. Restore Database

```bash
# Restore từ file dump
pg_restore -U postgres -h localhost -d ql_dangky_hocphi -v "backup_ql_dangky_hocphi_20260116.dump"

# Restore từ file SQL
psql -U postgres -h localhost -d ql_dangky_hocphi -f "backup. sql"
```

### 12.3. Maintenance

```sql
-- Cập nhật thống kê
ANALYZE;

-- Vacuum để giải phóng không gian
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE ql_dangky_hocphi;

-- Kiểm tra kích thước các bảng
SELECT 
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS data_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog. pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

---

## 13. CẤU TRÚC LƯU TRỮ FILE

### 13.1. Tổng quan

Hệ thống sử dụng thư mục `backend/uploads/` để lưu trữ các file tải lên từ người dùng, bao gồm avatar tài khoản và logo website.

### 13.2. Cấu trúc thư mục

```
backend/
└── uploads/
    ├── avatars/          # Thư mục lưu avatar của tài khoản
    │   ├── .gitkeep      # File giữ thư mục trong git
    │   ├── user_1.jpg    # Ví dụ: avatar của tài khoản có ID = 1
    │   └── user_2.png    # Ví dụ: avatar của tài khoản có ID = 2
    │
    └── logos/            # Thư mục lưu logo của website
        ├── .gitkeep      # File giữ thư mục trong git
        ├── logo.png      # Logo chính của website
        └── favicon.ico   # Favicon của website
```

### 13.3. Quy tắc đặt tên file

| Loại file | Quy tắc đặt tên | Ví dụ |
|-----------|-----------------|-------|
| Avatar tài khoản | `user_{ma_tai_khoan}.{ext}` | `user_1.jpg`, `user_2.png` |
| Logo website | `logo.{ext}` hoặc `logo_{variant}.{ext}` | `logo.png`, `logo_dark.png` |
| Favicon | `favicon.ico` hoặc `favicon.{ext}` | `favicon.ico`, `favicon.png` |

**Lưu ý về quy tắc đặt tên avatar:** Tất cả người dùng (sinh viên, quản trị viên) đều sử dụng `ma_tai_khoan` từ bảng `tai_khoan` để đặt tên file avatar. Điều này đảm bảo tính nhất quán và dễ quản lý vì mỗi người dùng đều có một tài khoản duy nhất.

### 13.4. Định dạng file hỗ trợ

| Loại | Định dạng | Kích thước tối đa |
|------|-----------|-------------------|
| Avatar | JPG, JPEG, PNG, GIF, WEBP | 5 MB |
| Logo | PNG, SVG, JPG | 2 MB |
| Favicon | ICO, PNG | 1 MB |

### 13.5. Liên kết với Database

- Cột `anh_dai_dien` trong bảng `tai_khoan` lưu đường dẫn tương đối đến file avatar, ví dụ: `uploads/avatars/user_1.jpg`
- Cột `anh_dai_dien` trong bảng `sinh_vien` và `quan_tri_vien` cũng có thể lưu đường dẫn avatar, nhưng khuyến nghị sử dụng cột `anh_dai_dien` trong bảng `tai_khoan` làm nguồn chính thức để đảm bảo tính nhất quán

### 13.6. Ví dụ sử dụng

```sql
-- Cập nhật avatar cho tài khoản (cách khuyến nghị)
UPDATE tai_khoan 
SET anh_dai_dien = 'uploads/avatars/user_1.jpg',
    ngay_cap_nhat = CURRENT_TIMESTAMP
WHERE ma_tai_khoan = 1;

-- Lấy đường dẫn avatar của tài khoản
SELECT ten_dang_nhap, anh_dai_dien 
FROM tai_khoan 
WHERE ma_tai_khoan = 1;

-- Lấy avatar của sinh viên thông qua tài khoản liên kết
SELECT sv.ma_sv, sv.ho_ten, tk.anh_dai_dien
FROM sinh_vien sv
JOIN tai_khoan tk ON sv.ma_tai_khoan = tk.ma_tai_khoan
WHERE sv.ma_sv = 'SV001';
```

---

## 14. LỊCH SỬ PHIÊN BẢN

| Phiên bản | Ngày | Mô tả thay đổi |
|-----------|------|----------------|
| 1.0 | 2026-01-16 | Phiên bản đầu tiên - Đáp ứng BM1-BM7, QĐ1-QĐ7 |
| 1.1 | 2026-01-16 | Thêm mục 13 - Cấu trúc lưu trữ file (avatar, logo) |
| 1.2 | 2026-03-01 | Cập nhật phân quyền: dùng cột `role` trong `tai_khoan` + backend middleware thay vì thêm bảng CSDL riêng |

---

## 15. LIÊN HỆ VÀ HỖ TRỢ

**Tác giả:** Copilot AI Assistant

**Mục đích:** Tài liệu mô tả database cho đề tài "Quản lý việc đăng ký môn học và thu học phí của sinh viên"

**Ghi chú:** 
- Database được thiết kế cho PostgreSQL 12+
- Đáp ứng đầy đủ 7 biểu mẫu (BM1-BM7) và 7 quy định (QĐ1-QĐ7) theo yêu cầu đề tài
- Hỗ trợ phân quyền bằng phần mềm thông qua cột `role` trong bảng `tai_khoan` và backend middleware (không cần thêm bảng CSDL riêng)
