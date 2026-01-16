# 🗄️ PHÂN TÍCH CẤU TRÚC DATABASE

## Hệ thống Quản lý Đăng ký Môn học và Thu Học phí

> **Nguồn:** `backend/src/config/init.sql`  
> **Hệ quản trị CSDL:** PostgreSQL 12+  
> **Mã hóa:** UTF-8

---

## 📋 TỔNG QUAN CÁC BẢNG

Hệ thống bao gồm **21 bảng** được chia thành 7 nhóm chức năng:

| Nhóm | Bảng | Mục đích |
|------|------|----------|
| **Địa danh** | `tinh`, `huyen` | Quản lý thông tin địa lý |
| **Đối tượng ưu tiên** | `doi_tuong`, `doi_tuong_sinh_vien` | Quản lý chính sách miễn giảm học phí |
| **Tổ chức - Đào tạo** | `khoa`, `nganh_hoc`, `chuong_trinh_hoc` | Quản lý khoa, ngành, chương trình học |
| **Nhân sự** | `sinh_vien`, `quan_tri_vien`, `tai_khoan` | Quản lý người dùng hệ thống |
| **Môn học - Lớp** | `mon_hoc`, `dieu_kien_mon_hoc`, `lop` | Quản lý môn học và lớp học |
| **Thời gian - Đăng ký** | `nam_hoc`, `hoc_ky`, `lop_mo`, `phieu_dang_ky`, `chi_tiet_dang_ky` | Quản lý đăng ký học phần |
| **Học phí - Thông báo** | `don_gia_tin_chi`, `phieu_thu_hoc_phi`, `thong_bao`, `thong_bao_ca_nhan` | Quản lý học phí và thông báo |

---

## 📊 PHÂN TÍCH CHI TIẾT TỪNG BẢNG

### 1. BẢNG `tinh` - Tỉnh/Thành phố

**Mục đích:** Lưu trữ danh sách các tỉnh/thành phố của Việt Nam.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_tinh` | VARCHAR(10) | **PRIMARY KEY**, NOT NULL | Mã tỉnh (VD: 'HCM', 'HN') |
| `ten_tinh` | VARCHAR(100) | NOT NULL | Tên đầy đủ của tỉnh/thành phố |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo bản ghi |

**Ví dụ dữ liệu:** `('HCM', 'TP. Hồ Chí Minh', TRUE, '2026-01-16')`

---

### 2. BẢNG `huyen` - Huyện/Quận

**Mục đích:** Lưu trữ danh sách huyện/quận thuộc các tỉnh, kèm thông tin vùng sâu/vùng xa.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_huyen` | VARCHAR(10) | **PRIMARY KEY**, NOT NULL | Mã huyện/quận |
| `ten_huyen` | VARCHAR(100) | NOT NULL | Tên huyện/quận |
| `ma_tinh` | VARCHAR(10) | **FOREIGN KEY** → `tinh(ma_tinh)`, NOT NULL | Mã tỉnh trực thuộc |
| `la_vung_sau_vung_xa` | BOOLEAN | DEFAULT FALSE | Đánh dấu vùng sâu/xa (ảnh hưởng đến học phí) |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo bản ghi |

**Quan hệ:** Mỗi huyện thuộc đúng 1 tỉnh. Một tỉnh có nhiều huyện.

---

### 3. BẢNG `doi_tuong` - Đối tượng ưu tiên

**Mục đích:** Định nghĩa các loại đối tượng được miễn/giảm học phí.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_doi_tuong` | VARCHAR(10) | **PRIMARY KEY**, NOT NULL | Mã đối tượng (VD: 'DT01', 'DT02') |
| `ten_doi_tuong` | VARCHAR(100) | NOT NULL | Tên loại đối tượng |
| `ti_le_giam_hoc_phi` | DECIMAL(5,2) | NOT NULL, CHECK (0-100) | Phần trăm giảm học phí |
| `do_uu_tien` | INTEGER | NOT NULL | Độ ưu tiên (số nhỏ = ưu tiên cao) |
| `mo_ta` | VARCHAR(300) | NULL | Mô tả chi tiết |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

**Ví dụ:** `('DT01', 'Con liệt sĩ', 100.00, 1)` → Miễn 100% học phí, ưu tiên cao nhất

---

### 4. BẢNG `khoa` - Khoa

**Mục đích:** Lưu trữ thông tin các khoa trong trường.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_khoa` | VARCHAR(10) | **PRIMARY KEY**, NOT NULL | Mã khoa |
| `ten_khoa` | VARCHAR(100) | NOT NULL | Tên đầy đủ của khoa |
| `ten_viet_tat` | VARCHAR(20) | NULL | Tên viết tắt |
| `sdt` | VARCHAR(15) | NULL | Số điện thoại liên hệ |
| `email` | VARCHAR(100) | NULL | Email khoa |
| `dia_chi` | VARCHAR(200) | NULL | Địa chỉ văn phòng |
| `truong_khoa` | VARCHAR(100) | NULL | Họ tên trưởng khoa |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

---

### 5. BẢNG `nganh_hoc` - Ngành học

**Mục đích:** Lưu trữ các ngành học thuộc các khoa.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_nganh` | VARCHAR(10) | **PRIMARY KEY**, NOT NULL | Mã ngành (VD: 'KTPM', 'HTTT') |
| `ten_nganh` | VARCHAR(100) | NOT NULL | Tên ngành học |
| `ma_khoa` | VARCHAR(10) | **FOREIGN KEY** → `khoa(ma_khoa)`, NOT NULL | Mã khoa quản lý |
| `so_tin_chi_toi_thieu` | INTEGER | DEFAULT 120 | Số tín chỉ tốt nghiệp |
| `thoi_gian_dao_tao` | DECIMAL(3,1) | DEFAULT 4 | Thời gian đào tạo (năm) |
| `mo_ta` | VARCHAR(500) | NULL | Mô tả ngành |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

**Quan hệ:** Mỗi ngành thuộc đúng 1 khoa. Một khoa có nhiều ngành.

---

### 6. BẢNG `tai_khoan` - Tài khoản đăng nhập

**Mục đích:** Quản lý tài khoản đăng nhập hệ thống với phân quyền trực tiếp.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_tai_khoan` | SERIAL | **PRIMARY KEY** | ID tự tăng |
| `ten_dang_nhap` | VARCHAR(50) | NOT NULL, **UNIQUE** | Tên đăng nhập |
| `mat_khau` | VARCHAR(255) | NOT NULL | Mật khẩu (BCrypt hash) |
| `role` | VARCHAR(20) | DEFAULT 'sinh_vien', CHECK ('admin', 'sinh_vien') | Vai trò người dùng |
| `ma_sv` | VARCHAR(15) | **FOREIGN KEY** → `sinh_vien(ma_sv)`, **UNIQUE** | Liên kết đến sinh viên (nếu có) |
| `ho_ten` | VARCHAR(100) | NULL | Họ tên (cho admin) |
| `email` | VARCHAR(100) | NULL | Email |
| `sdt` | VARCHAR(15) | NULL | Số điện thoại |
| `anh_dai_dien` | VARCHAR(255) | NULL | Đường dẫn ảnh đại diện |
| `lan_dang_nhap_cuoi` | TIMESTAMP | NULL | Lần đăng nhập cuối |
| `refresh_token` | VARCHAR(500) | NULL | JWT refresh token |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |
| `ngay_cap_nhat` | TIMESTAMP | NULL | Thời điểm cập nhật |

**Đặc biệt:** Quan hệ 1-1 hai chiều với bảng `sinh_vien` để hỗ trợ truy vấn từ cả hai phía.

---

### 7. BẢNG `sinh_vien` - Sinh viên

**Mục đích:** Lưu trữ thông tin đầy đủ của sinh viên.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_sv` | VARCHAR(15) | **PRIMARY KEY**, NOT NULL | Mã số sinh viên |
| `ma_tai_khoan` | INTEGER | **FOREIGN KEY** → `tai_khoan(ma_tai_khoan)`, **UNIQUE** | Tài khoản đăng nhập |
| `ho_ten` | VARCHAR(100) | NOT NULL | Họ và tên |
| `ngay_sinh` | DATE | NOT NULL | Ngày sinh |
| `gioi_tinh` | VARCHAR(5) | NOT NULL, CHECK ('Nam', 'Nữ') | Giới tính |
| `cccd` | VARCHAR(20) | **UNIQUE** | Số CCCD |
| `ma_huyen` | VARCHAR(10) | **FOREIGN KEY** → `huyen(ma_huyen)`, NOT NULL | Quê quán (huyện) |
| `ma_nganh` | VARCHAR(10) | **FOREIGN KEY** → `nganh_hoc(ma_nganh)`, NOT NULL | Ngành học |
| `dia_chi_lien_he` | VARCHAR(200) | NULL | Địa chỉ hiện tại |
| `sdt` | VARCHAR(15) | NULL | Số điện thoại |
| `email` | VARCHAR(100) | NULL | Email |
| `anh_dai_dien` | VARCHAR(255) | NULL | Ảnh đại diện |
| `ho_ten_cha` | VARCHAR(100) | NULL | Họ tên cha |
| `sdt_cha` | VARCHAR(15) | NULL | SĐT cha |
| `ho_ten_me` | VARCHAR(100) | NULL | Họ tên mẹ |
| `sdt_me` | VARCHAR(15) | NULL | SĐT mẹ |
| `ngay_nhap_hoc` | DATE | DEFAULT CURRENT_DATE | Ngày nhập học |
| `trang_thai` | VARCHAR(30) | DEFAULT 'Đang học', CHECK ('Đang học', 'Bảo lưu', 'Nghỉ học', 'Tốt nghiệp') | Trạng thái học tập |
| `ghi_chu` | VARCHAR(300) | NULL | Ghi chú |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |
| `ngay_cap_nhat` | TIMESTAMP | NULL | Thời điểm cập nhật |

---

### 8. BẢNG `doi_tuong_sinh_vien` - Đối tượng của Sinh viên

**Mục đích:** Liên kết sinh viên với các đối tượng ưu tiên (quan hệ nhiều-nhiều).

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | SERIAL | **PRIMARY KEY** | ID tự tăng |
| `ma_sv` | VARCHAR(15) | **FOREIGN KEY** → `sinh_vien(ma_sv)`, NOT NULL | Mã sinh viên |
| `ma_doi_tuong` | VARCHAR(10) | **FOREIGN KEY** → `doi_tuong(ma_doi_tuong)`, NOT NULL | Mã đối tượng |
| `file_minh_chung` | VARCHAR(255) | NULL | File đính kèm minh chứng |
| `ghi_chu` | VARCHAR(200) | NULL | Ghi chú |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

**Ràng buộc UNIQUE:** `(ma_sv, ma_doi_tuong)` - Mỗi SV chỉ gán 1 lần cho mỗi đối tượng.

---

### 9. BẢNG `quan_tri_vien` - Quản trị viên

**Mục đích:** Lưu trữ thông tin chi tiết của quản trị viên hệ thống.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_quan_tri_vien` | SERIAL | **PRIMARY KEY** | ID tự tăng |
| `ma_tai_khoan` | INTEGER | **FOREIGN KEY** → `tai_khoan(ma_tai_khoan)`, NOT NULL, **UNIQUE** | Tài khoản đăng nhập |
| `ho_ten` | VARCHAR(100) | NOT NULL | Họ tên |
| `ngay_sinh` | DATE | NULL | Ngày sinh |
| `gioi_tinh` | VARCHAR(5) | CHECK ('Nam', 'Nữ') | Giới tính |
| `sdt` | VARCHAR(15) | NULL | Số điện thoại |
| `email` | VARCHAR(100) | NULL | Email |
| `dia_chi` | VARCHAR(200) | NULL | Địa chỉ |
| `chuc_vu` | VARCHAR(100) | NULL | Chức vụ |
| `phong_ban` | VARCHAR(100) | NULL | Phòng ban |
| `anh_dai_dien` | VARCHAR(255) | NULL | Ảnh đại diện |
| `ghi_chu` | VARCHAR(300) | NULL | Ghi chú |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |
| `ngay_cap_nhat` | TIMESTAMP | NULL | Thời điểm cập nhật |

---

### 10. BẢNG `mon_hoc` - Môn học

**Mục đích:** Lưu trữ danh sách môn học với thuộc tính tính toán số tín chỉ.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_mon_hoc` | VARCHAR(15) | **PRIMARY KEY**, NOT NULL | Mã môn học |
| `ten_mon_hoc` | VARCHAR(150) | NOT NULL | Tên môn học |
| `ma_khoa` | VARCHAR(10) | **FOREIGN KEY** → `khoa(ma_khoa)`, NOT NULL | Khoa quản lý |
| `loai_mon` | VARCHAR(5) | NOT NULL, CHECK ('LT', 'TH') | Loại môn: Lý thuyết hoặc Thực hành |
| `so_tiet` | INTEGER | NOT NULL, CHECK (> 0) | Số tiết học |
| `so_tin_chi` | INTEGER | **GENERATED** (computed) | Số tín chỉ (tự động tính) |
| `mo_ta` | VARCHAR(500) | NULL | Mô tả môn học |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái hoạt động |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

**Công thức tính số tín chỉ:**
- Môn LT: `so_tin_chi = so_tiet / 15`
- Môn TH: `so_tin_chi = so_tiet / 30`

---

### 11. BẢNG `dieu_kien_mon_hoc` - Điều kiện môn học

**Mục đích:** Định nghĩa điều kiện tiên quyết và học trước cho các môn học.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | SERIAL | **PRIMARY KEY** | ID tự tăng |
| `ma_mon_hoc` | VARCHAR(15) | **FOREIGN KEY** → `mon_hoc(ma_mon_hoc)`, NOT NULL | Môn học chính |
| `ma_mon_dieu_kien` | VARCHAR(15) | **FOREIGN KEY** → `mon_hoc(ma_mon_hoc)`, NOT NULL | Môn học điều kiện |
| `loai_dieu_kien` | VARCHAR(20) | DEFAULT 'hoc_truoc', CHECK ('tien_quyet', 'hoc_truoc') | Loại điều kiện |
| `mo_ta` | VARCHAR(200) | NULL | Mô tả chi tiết |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

**Giải thích loại điều kiện:**
- `tien_quyet`: Phải **ĐẠT** môn điều kiện trước khi đăng ký
- `hoc_truoc`: Phải **ĐĂNG KÝ** môn điều kiện trước hoặc đồng thời

---

### 12. BẢNG `lop` - Lớp học

**Mục đích:** Lưu trữ các lớp học của từng môn (một môn có thể có nhiều lớp).

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_lop` | VARCHAR(20) | **PRIMARY KEY**, NOT NULL | Mã lớp |
| `ten_lop` | VARCHAR(100) | NOT NULL | Tên lớp |
| `ma_mon_hoc` | VARCHAR(15) | **FOREIGN KEY** → `mon_hoc(ma_mon_hoc)`, NOT NULL | Môn học |
| `giang_vien` | VARCHAR(100) | NULL | Giảng viên phụ trách |
| `lich_hoc` | VARCHAR(200) | NULL | Lịch học (VD: 'Thứ 2, Tiết 1-3') |
| `phong_hoc` | VARCHAR(50) | NULL | Phòng học |
| `so_luong_toi_da` | INTEGER | DEFAULT 50 | Sĩ số tối đa |
| `mo_ta` | VARCHAR(300) | NULL | Mô tả |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

---

### 13. BẢNG `chuong_trinh_hoc` - Chương trình học

**Mục đích:** Định nghĩa chương trình đào tạo cho từng ngành học.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | SERIAL | **PRIMARY KEY** | ID tự tăng |
| `ma_nganh` | VARCHAR(10) | **FOREIGN KEY** → `nganh_hoc(ma_nganh)`, NOT NULL | Ngành học |
| `ma_mon_hoc` | VARCHAR(15) | **FOREIGN KEY** → `mon_hoc(ma_mon_hoc)`, NOT NULL | Môn học |
| `hoc_ky_du_kien` | INTEGER | NOT NULL, CHECK (1-10) | Học kỳ dự kiến |
| `bat_buoc` | BOOLEAN | DEFAULT TRUE | Môn bắt buộc |
| `ghi_chu` | VARCHAR(200) | NULL | Ghi chú |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

**Ràng buộc UNIQUE:** `(ma_nganh, ma_mon_hoc)` - Mỗi môn chỉ xuất hiện 1 lần trong mỗi ngành.

---

### 14. BẢNG `nam_hoc` - Năm học

**Mục đích:** Lưu trữ danh sách các năm học.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_nam_hoc` | VARCHAR(15) | **PRIMARY KEY**, NOT NULL | Mã năm học (VD: '2024-2025') |
| `ten_nam_hoc` | VARCHAR(50) | NOT NULL | Tên năm học |
| `nam_bat_dau` | INTEGER | NOT NULL | Năm bắt đầu |
| `nam_ket_thuc` | INTEGER | NOT NULL | Năm kết thúc |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

---

### 15. BẢNG `hoc_ky` - Học kỳ

**Mục đích:** Lưu trữ các học kỳ thuộc năm học.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_hoc_ky` | VARCHAR(15) | **PRIMARY KEY**, NOT NULL | Mã học kỳ |
| `ten_hoc_ky` | VARCHAR(50) | NOT NULL | Tên học kỳ (HK I, HK II, HK Hè) |
| `ma_nam_hoc` | VARCHAR(15) | **FOREIGN KEY** → `nam_hoc(ma_nam_hoc)`, NOT NULL | Năm học |
| `loai_hoc_ky` | VARCHAR(20) | DEFAULT 'Chính', CHECK ('Chính', 'Hè') | Loại học kỳ |
| `thu_tu` | INTEGER | DEFAULT 1 | Thứ tự trong năm (1, 2, 3) |
| `ngay_bat_dau` | DATE | NULL | Ngày bắt đầu |
| `ngay_ket_thuc` | DATE | NULL | Ngày kết thúc |
| `ngay_bat_dau_dang_ky` | TIMESTAMP | NULL | Bắt đầu đăng ký |
| `ngay_ket_thuc_dang_ky` | TIMESTAMP | NULL | Kết thúc đăng ký |
| `han_dong_hoc_phi` | DATE | NULL | Hạn đóng học phí |
| `trang_thai` | VARCHAR(20) | DEFAULT 'Sắp diễn ra', CHECK ('Sắp diễn ra', 'Đang diễn ra', 'Đã kết thúc') | Trạng thái |
| `ghi_chu` | VARCHAR(300) | NULL | Ghi chú |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

---

### 16. BẢNG `lop_mo` - Lớp mở trong học kỳ

**Mục đích:** Quản lý các lớp được mở đăng ký trong từng học kỳ.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | SERIAL | **PRIMARY KEY** | ID tự tăng |
| `ma_hoc_ky` | VARCHAR(15) | **FOREIGN KEY** → `hoc_ky(ma_hoc_ky)`, NOT NULL | Học kỳ |
| `ma_lop` | VARCHAR(20) | **FOREIGN KEY** → `lop(ma_lop)`, NOT NULL | Lớp học |
| `so_luong_da_dang_ky` | INTEGER | DEFAULT 0 | Số SV đã đăng ký |
| `ghi_chu` | VARCHAR(200) | NULL | Ghi chú |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |

**Ràng buộc UNIQUE:** `(ma_hoc_ky, ma_lop)` - Mỗi lớp chỉ mở 1 lần trong mỗi học kỳ.

---

### 17. BẢNG `don_gia_tin_chi` - Đơn giá tín chỉ

**Mục đích:** Cấu hình đơn giá tín chỉ theo loại môn và loại học.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | SERIAL | **PRIMARY KEY** | ID tự tăng |
| `loai_mon` | VARCHAR(5) | NOT NULL, CHECK ('LT', 'TH') | Loại môn học |
| `loai_hoc` | VARCHAR(20) | DEFAULT 'hoc_moi', CHECK ('hoc_moi', 'hoc_lai', 'hoc_cai_thien', 'hoc_he') | Loại học |
| `don_gia` | DECIMAL(12,0) | NOT NULL | Đơn giá/tín chỉ (VNĐ) |
| `ma_hoc_ky` | VARCHAR(15) | **FOREIGN KEY** → `hoc_ky(ma_hoc_ky)` | Học kỳ (NULL = áp dụng chung) |
| `ngay_ap_dung` | DATE | DEFAULT CURRENT_DATE | Ngày áp dụng |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái |
| `ghi_chu` | VARCHAR(200) | NULL | Ghi chú |

**Bảng đơn giá mặc định:**

| Loại môn | Loại học | Đơn giá (VNĐ) |
|----------|----------|---------------|
| LT | hoc_moi | 27,000 |
| TH | hoc_moi | 37,000 |
| LT | hoc_lai | 32,000 |
| TH | hoc_lai | 42,000 |
| LT | hoc_cai_thien | 30,000 |
| TH | hoc_cai_thien | 40,000 |
| LT | hoc_he | 35,000 |
| TH | hoc_he | 45,000 |

---

### 18. BẢNG `phieu_dang_ky` - Phiếu đăng ký học phần

**Mục đích:** Lưu trữ phiếu đăng ký học phần của sinh viên theo học kỳ.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `so_phieu` | SERIAL | **PRIMARY KEY** | Số phiếu |
| `ma_sv` | VARCHAR(15) | **FOREIGN KEY** → `sinh_vien(ma_sv)`, NOT NULL | Sinh viên |
| `ma_hoc_ky` | VARCHAR(15) | **FOREIGN KEY** → `hoc_ky(ma_hoc_ky)`, NOT NULL | Học kỳ |
| `ngay_lap` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ngày lập phiếu |
| `tong_tin_chi` | INTEGER | DEFAULT 0 | Tổng số tín chỉ đăng ký |
| `tong_tien_dang_ky` | DECIMAL(15,0) | DEFAULT 0 | Tổng tiền đăng ký |
| `ti_le_giam` | DECIMAL(5,2) | DEFAULT 0 | Tỷ lệ giảm học phí (%) |
| `tien_mien_giam` | DECIMAL(15,0) | DEFAULT 0 | Tiền được miễn giảm |
| `tong_tien_phai_dong` | DECIMAL(15,0) | DEFAULT 0 | Tổng tiền phải đóng |
| `trang_thai` | VARCHAR(30) | DEFAULT 'Đã đăng ký', CHECK ('Đã đăng ký', 'Đã hủy') | Trạng thái |
| `ghi_chu` | VARCHAR(300) | NULL | Ghi chú |
| `ngay_cap_nhat` | TIMESTAMP | NULL | Thời điểm cập nhật |

**Ràng buộc UNIQUE:** `(ma_sv, ma_hoc_ky)` - Mỗi SV chỉ có 1 phiếu đăng ký/học kỳ.

---

### 19. BẢNG `chi_tiet_dang_ky` - Chi tiết đăng ký

**Mục đích:** Lưu chi tiết các lớp học được đăng ký trong phiếu.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | SERIAL | **PRIMARY KEY** | ID tự tăng |
| `so_phieu` | INTEGER | **FOREIGN KEY** → `phieu_dang_ky(so_phieu)`, NOT NULL | Số phiếu đăng ký |
| `ma_lop` | VARCHAR(20) | **FOREIGN KEY** → `lop(ma_lop)`, NOT NULL | Lớp học |
| `loai_dang_ky` | VARCHAR(20) | DEFAULT 'hoc_moi', CHECK ('hoc_moi', 'hoc_lai', 'hoc_cai_thien') | Loại đăng ký |
| `so_tin_chi` | INTEGER | NOT NULL | Số tín chỉ |
| `loai_mon` | VARCHAR(5) | NOT NULL | Loại môn (LT/TH) |
| `don_gia` | DECIMAL(12,0) | NOT NULL | Đơn giá/tín chỉ |
| `thanh_tien` | DECIMAL(15,0) | NOT NULL | Thành tiền = số TC × đơn giá |
| `trang_thai` | VARCHAR(30) | DEFAULT 'Đã đăng ký', CHECK ('Đã đăng ký', 'Đã hủy') | Trạng thái |
| `ngay_dang_ky` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ngày đăng ký |
| `ngay_huy` | TIMESTAMP | NULL | Ngày hủy |
| `ly_do_huy` | VARCHAR(200) | NULL | Lý do hủy |

**Ràng buộc UNIQUE:** `(so_phieu, ma_lop)` - Mỗi lớp chỉ đăng ký 1 lần/phiếu.

---

### 20. BẢNG `phieu_thu_hoc_phi` - Phiếu thu học phí

**Mục đích:** Lưu trữ các phiếu thu học phí (hỗ trợ đóng nhiều lần).

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `so_phieu_thu` | SERIAL | **PRIMARY KEY** | Số phiếu thu |
| `so_phieu_dang_ky` | INTEGER | **FOREIGN KEY** → `phieu_dang_ky(so_phieu)`, NOT NULL | Phiếu đăng ký |
| `ma_sv` | VARCHAR(15) | **FOREIGN KEY** → `sinh_vien(ma_sv)`, NOT NULL | Sinh viên |
| `ngay_lap` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ngày lập phiếu |
| `so_tien_thu` | DECIMAL(15,0) | NOT NULL, CHECK (> 0) | Số tiền thu |
| `hinh_thuc_thu` | VARCHAR(50) | DEFAULT 'Tiền mặt', CHECK ('Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử') | Hình thức thanh toán |
| `ma_giao_dich` | VARCHAR(100) | NULL | Mã giao dịch (chuyển khoản) |
| `nguoi_thu` | VARCHAR(100) | NULL | Người thu |
| `ghi_chu` | VARCHAR(300) | NULL | Ghi chú |
| `trang_thai` | VARCHAR(20) | DEFAULT 'Thành công', CHECK ('Thành công', 'Đã hủy') | Trạng thái |

---

### 21. BẢNG `thong_bao` - Thông báo chung

**Mục đích:** Lưu trữ các thông báo gửi cho toàn bộ người dùng.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `ma_thong_bao` | SERIAL | **PRIMARY KEY** | Mã thông báo |
| `tieu_de` | VARCHAR(200) | NOT NULL | Tiêu đề |
| `noi_dung` | TEXT | NOT NULL | Nội dung chi tiết |
| `loai_thong_bao` | VARCHAR(50) | NULL | Loại thông báo |
| `doi_tuong` | VARCHAR(30) | DEFAULT 'Tất cả' | Đối tượng nhận |
| `ghim_top` | BOOLEAN | DEFAULT FALSE | Ghim lên đầu |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |
| `ngay_het_han` | TIMESTAMP | NULL | Ngày hết hạn |
| `nguoi_tao` | INTEGER | **FOREIGN KEY** → `tai_khoan(ma_tai_khoan)` | Người tạo |
| `trang_thai` | BOOLEAN | DEFAULT TRUE | Trạng thái |

---

### 22. BẢNG `thong_bao_ca_nhan` - Thông báo cá nhân

**Mục đích:** Lưu trữ thông báo gửi đến từng người dùng cụ thể.

| Thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|------------|--------------|-----------|-------|
| `id` | BIGSERIAL | **PRIMARY KEY** | ID tự tăng |
| `ma_tai_khoan` | INTEGER | **FOREIGN KEY** → `tai_khoan(ma_tai_khoan)`, NOT NULL | Tài khoản nhận |
| `tieu_de` | VARCHAR(200) | NOT NULL | Tiêu đề |
| `noi_dung` | TEXT | NULL | Nội dung |
| `loai_thong_bao` | VARCHAR(50) | NULL | Loại thông báo |
| `duong_dan` | VARCHAR(255) | NULL | Link liên quan |
| `da_doc` | BOOLEAN | DEFAULT FALSE | Đã đọc chưa |
| `ngay_doc` | TIMESTAMP | NULL | Ngày đọc |
| `ngay_tao` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |

---

## 🔗 SƠ ĐỒ QUAN HỆ GIỮA CÁC BẢNG

```
┌─────────┐     1:n     ┌─────────┐     1:n     ┌──────────────┐
│  tinh   │────────────►│  huyen  │────────────►│  sinh_vien   │
└─────────┘             └─────────┘             └───────┬──────┘
                                                       │
                        ┌──────────────────────────────┤
                        │                              │
                        ▼ n:n                          ▼ 1:1
               ┌────────────────┐              ┌──────────────┐
               │doi_tuong_sv    │              │  tai_khoan   │
               └───────┬────────┘              └───────┬──────┘
                       │                               │
                       ▼ n:1                           ▼ 1:1
               ┌────────────────┐              ┌──────────────┐
               │   doi_tuong    │              │ quan_tri_vien│
               └────────────────┘              └──────────────┘

┌─────────┐     1:n     ┌───────────┐     1:n     ┌────────────┐
│  khoa   │────────────►│ nganh_hoc │────────────►│chuong_trinh│
└────┬────┘             └───────────┘             │   _hoc     │
     │                                            └──────┬─────┘
     │ 1:n                                               │
     ▼                                                   │ n:1
┌─────────┐     1:n     ┌──────────┐                     │
│ mon_hoc │────────────►│   lop    │◄────────────────────┘
└────┬────┘             └────┬─────┘
     │                       │
     │ n:n (self)            │ 1:n
     ▼                       ▼
┌─────────────┐         ┌──────────┐
│ dieu_kien   │         │ lop_mo   │
│  _mon_hoc   │         └────┬─────┘
└─────────────┘              │ n:1
                             ▼
┌───────────┐     1:n   ┌──────────┐     1:n    ┌──────────────┐
│  nam_hoc  │──────────►│  hoc_ky  │───────────►│ phieu_dang_ky│
└───────────┘           └──────────┘            └───────┬──────┘
                                                        │
                                      ┌─────────────────┤
                                      │                 │
                                      ▼ 1:n             ▼ 1:n
                              ┌────────────────┐ ┌───────────────┐
                              │chi_tiet_dang_ky│ │phieu_thu_hp   │
                              └────────────────┘ └───────────────┘
```

---

## 📈 TỔNG KẾT THỐNG KÊ

| Loại | Số lượng |
|------|----------|
| Tổng số bảng | 21 |
| Bảng có khóa ngoại | 16 |
| Cột tính toán (computed) | 1 (`mon_hoc.so_tin_chi`) |
| Ràng buộc UNIQUE | 10 |
| Ràng buộc CHECK | 12 |
| Index | 30+ |
| Views | 3 |

---

## 📝 GHI CHÚ

- **Mã hóa:** UTF-8 để hỗ trợ tiếng Việt có dấu
- **Phiên bản PostgreSQL:** 12+ (yêu cầu cho generated columns)
- **Tham khảo chi tiết:** Xem file `MoTa_DATABASE.md` để biết thêm về functions, triggers, và hướng dẫn sử dụng
