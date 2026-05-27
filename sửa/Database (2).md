-- =====================================================
-- BẮT ĐẦU KHỞI TẠO SCHEMA VÀ DỮ LIỆU
-- =====================================================

-- Drop tables if exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS "THONGBAO" CASCADE;
DROP TABLE IF EXISTS "PHIEUTHUHOCPHI" CASCADE;
DROP TABLE IF EXISTS "CHITIETDANGKY" CASCADE;
DROP TABLE IF EXISTS "PHIEUDANGKY" CASCADE;
DROP TABLE IF EXISTS "MONDAHOC" CASCADE;
DROP TABLE IF EXISTS "DIEMSINHVIEN" CASCADE;
DROP TABLE IF EXISTS "LICHHOCLOP" CASCADE;
DROP TABLE IF EXISTS "DONGIATINCHI" CASCADE;
DROP TABLE IF EXISTS "LOPMO" CASCADE;
DROP TABLE IF EXISTS "CHUONGTRINHHOC" CASCADE;
DROP TABLE IF EXISTS "HOCKY" CASCADE;
DROP TABLE IF EXISTS "NAMHOC" CASCADE;
DROP TABLE IF EXISTS "LOP" CASCADE;
DROP TABLE IF EXISTS "TIETHOC" CASCADE;
DROP TABLE IF EXISTS "THAMSO" CASCADE;
DROP TABLE IF EXISTS "CAUHINHDANGKY" CASCADE;
DROP TABLE IF EXISTS "DIEUKIENMONHOC" CASCADE;
DROP TABLE IF EXISTS "MONHOC" CASCADE;
DROP TABLE IF EXISTS "DOITUONGSINHVIEN" CASCADE;
DROP TABLE IF EXISTS "QUANTRIVIEN" CASCADE;
DROP TABLE IF EXISTS "SINHVIEN" CASCADE;
DROP TABLE IF EXISTS "NGUOIDUNG" CASCADE;
DROP TABLE IF EXISTS "PHANQUYEN" CASCADE;
DROP TABLE IF EXISTS "CHUCNANG" CASCADE;
DROP TABLE IF EXISTS "NHOMNGUOIDUNG" CASCADE;
DROP TABLE IF EXISTS "NGANHHOC" CASCADE;
DROP TABLE IF EXISTS "KHOA" CASCADE;
DROP TABLE IF EXISTS "DOITUONG" CASCADE;
DROP TABLE IF EXISTS "PHUONGXA" CASCADE;
DROP TABLE IF EXISTS "HUYEN" CASCADE;
DROP TABLE IF EXISTS "TINH" CASCADE;
DROP TABLE IF EXISTS "DANTOC" CASCADE;

-- =====================================================
-- 1. BẢNG "TINH" - Tỉnh/Thành phố (QĐ1)
-- =====================================================
CREATE TABLE "TINH" (
    "MaTinh" VARCHAR(10) NOT NULL,
    "TenTinh" VARCHAR(100) NOT NULL,
    "LoaiTinh" VARCHAR(30) DEFAULT 'Tỉnh',
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tinh_pkey PRIMARY KEY ("MaTinh"),
    CONSTRAINT chk_loai_tinh CHECK ("LoaiTinh" IN ('Tỉnh', 'Thành phố'))
);

-- =====================================================
-- 1.5. BẢNG "DANTOC" - Dân tộc (54 dân tộc Việt Nam)
-- =====================================================
CREATE TABLE "DANTOC" (
    "MaDanToc" VARCHAR(10) NOT NULL,
    "TenDanToc" VARCHAR(100) NOT NULL,
    "LaDanTocThieuSo" BOOLEAN DEFAULT FALSE,
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT dan_toc_pkey PRIMARY KEY ("MaDanToc")
);

-- =====================================================
-- 2. BẢNG "PHUONGXA" - Phường/Xã (thay thế bảng Huyện - QĐ1)
-- Ghi chú: Đối tượng "vùng sâu vùng xa" = thuộc KV3 VÀ là dân tộc thiểu số
-- Quy tắc này được thực hiện trong function fn_kiem_tra_vung_sau_vung_xa()
-- và fn_lay_ti_le_giam_hoc_phi() trong mã ứng dụng (theo QĐ1)
-- =====================================================
CREATE TABLE "PHUONGXA" (
    "MaPhuongXa" VARCHAR(20) NOT NULL,
    "TenPhuongXa" VARCHAR(100) NOT NULL,
    "MaTinh" VARCHAR(10) NOT NULL,
    "Loai" VARCHAR(30) DEFAULT 'Xã',
    "KhuVuc" VARCHAR(10) DEFAULT 'KV1',
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT phuong_xa_pkey PRIMARY KEY ("MaPhuongXa"),
    CONSTRAINT fk_phuong_xa_tinh FOREIGN KEY ("MaTinh") 
        REFERENCES "TINH"("MaTinh") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_loai_phuong_xa CHECK ("Loai" IN ('Phường', 'Xã', 'Thị trấn')),
    CONSTRAINT chk_khu_vuc CHECK ("KhuVuc" IN ('KV1', 'KV2', 'KV2-NT', 'KV3'))
);

-- =====================================================
-- 3. BẢNG "DOITUONG" - Đối tượng ưu tiên (QĐ1)
-- =====================================================
CREATE TABLE "DOITUONG" (
    "MaDoiTuong" VARCHAR(10) NOT NULL,
    "TenDoiTuong" VARCHAR(100) NOT NULL,
    "TiLeGiamHocPhi" DECIMAL(5,2) NOT NULL,
    "DoUuTien" INTEGER NOT NULL,
    "MoTa" VARCHAR(300),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT doi_tuong_pkey PRIMARY KEY ("MaDoiTuong"),
    CONSTRAINT chk_ti_le_giam CHECK ("TiLeGiamHocPhi" >= 0 AND "TiLeGiamHocPhi" <= 100)
);

-- =====================================================
-- 4. BẢNG "KHOA" - Khoa (QĐ1)
-- =====================================================
CREATE TABLE "KHOA" (
    "MaKhoa" VARCHAR(10) NOT NULL,
    "TenKhoa" VARCHAR(100) NOT NULL,
    "TenVietTat" VARCHAR(20),
    "Sdt" VARCHAR(15),
    "Email" VARCHAR(100),
    "DiaChi" VARCHAR(200),
    "TruongKhoa" VARCHAR(100),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT khoa_pkey PRIMARY KEY ("MaKhoa")
);

-- =====================================================
-- 5. BẢNG "NGANHHOC" - Ngành học (QĐ1)
-- =====================================================
CREATE TABLE "NGANHHOC" (
    "MaNganh" VARCHAR(10) NOT NULL,
    "TenNganh" VARCHAR(100) NOT NULL,
    "MaKhoa" VARCHAR(10) NOT NULL,
    "SoTinChiToiThieu" INTEGER DEFAULT 120,
    "ThoiGianDaoTao" DECIMAL(3,1) DEFAULT 4,
    "MoTa" VARCHAR(500),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT nganh_hoc_pkey PRIMARY KEY ("MaNganh"),
    CONSTRAINT fk_nganh_khoa FOREIGN KEY ("MaKhoa") 
        REFERENCES "KHOA"("MaKhoa") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================================================
-- 6. BẢNG "CHUCNANG" - Danh mục chức năng
-- =====================================================
CREATE TABLE "CHUCNANG" (
    "MaChucNang" VARCHAR(30) NOT NULL,
    "TenChucNang" VARCHAR(100) NOT NULL,
    "TenManHinhDuocLoad" VARCHAR(100) NOT NULL,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT chuc_nang_pkey PRIMARY KEY ("MaChucNang")
);

-- =====================================================
-- 7. BẢNG "NHOMNGUOIDUNG" - Nhóm người dùng
-- =====================================================
CREATE TABLE "NHOMNGUOIDUNG" (
    "MaNhom" VARCHAR(20) NOT NULL,
    "TenNhom" VARCHAR(100) NOT NULL,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT nhom_nguoi_dung_pkey PRIMARY KEY ("MaNhom"),
    CONSTRAINT nhom_nguoi_dung_ten_nhom_key UNIQUE ("TenNhom")
);

-- =====================================================
-- 8. BẢNG "PHANQUYEN" - Phân quyền chức năng theo nhóm
-- =====================================================
CREATE TABLE "PHANQUYEN" (
    "MaNhom" VARCHAR(20) NOT NULL,
    "MaChucNang" VARCHAR(30) NOT NULL,
    CONSTRAINT phan_quyen_pkey PRIMARY KEY ("MaNhom", "MaChucNang"),
    CONSTRAINT fk_pq_nhom FOREIGN KEY ("MaNhom")
        REFERENCES "NHOMNGUOIDUNG"("MaNhom") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pq_chuc_nang FOREIGN KEY ("MaChucNang")
        REFERENCES "CHUCNANG"("MaChucNang") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================
-- 9. BẢNG "NGUOIDUNG" - Người dùng đăng nhập
-- =====================================================
CREATE TABLE "NGUOIDUNG" (
    "MaTaiKhoan" SERIAL NOT NULL,
    "TenDangNhap" VARCHAR(50) NOT NULL,
    "MatKhau" VARCHAR(255) NOT NULL,
    "Role" VARCHAR(20) NOT NULL DEFAULT 'student',
    "MaNhom" VARCHAR(20) NOT NULL DEFAULT 'SINHVIEN',
    "MaSv" VARCHAR(15),
    "HoTen" VARCHAR(100),
    "Email" VARCHAR(100),
    "Sdt" VARCHAR(15),
    "AnhDaiDien" VARCHAR(500),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "TrangThaiDuyet" VARCHAR(20) NOT NULL DEFAULT 'approved',
    "NgayDuyet" TIMESTAMP,
    "NguoiDuyet" INTEGER,
    "LyDoTuChoi" VARCHAR(300),
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NgayCapNhat" TIMESTAMP,
    "LanDangNhapCuoi" TIMESTAMP,
    "RefreshToken" VARCHAR(500),
    CONSTRAINT nguoi_dung_pkey PRIMARY KEY ("MaTaiKhoan"),
    CONSTRAINT nguoi_dung_ten_dang_nhap_key UNIQUE ("TenDangNhap"),
    CONSTRAINT nguoi_dung_ma_sv_key UNIQUE ("MaSv"),
    CONSTRAINT chk_role CHECK ("Role" IN ('admin', 'student')),
    CONSTRAINT chk_trang_thai_duyet CHECK ("TrangThaiDuyet" IN ('pending', 'approved', 'rejected')),
    CONSTRAINT fk_nd_nhom FOREIGN KEY ("MaNhom")
        REFERENCES "NHOMNGUOIDUNG"("MaNhom") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 10. BẢNG "SINHVIEN" - Sinh viên (BM1, QĐ1)
-- Ghi chú: Đối tượng "vùng sâu vùng xa" = sinh viên ở KV3 VÀ là dân tộc thiểu số
-- =====================================================
CREATE TABLE "SINHVIEN" (
    "MaSv" VARCHAR(15) NOT NULL,
    "MaTaiKhoan" INTEGER,
    "HoTen" VARCHAR(100) NOT NULL,
    "NgaySinh" DATE NOT NULL,
    "GioiTinh" VARCHAR(5) NOT NULL,
    "Cccd" VARCHAR(20) NOT NULL,
    "MaPhuongXa" VARCHAR(20) NOT NULL,
    "MaDanToc" VARCHAR(10) NOT NULL,
    "MaNganh" VARCHAR(10) NOT NULL,
    "DiaChiLienHe" VARCHAR(200) NOT NULL DEFAULT 'Chua cap nhat',
    "Sdt" VARCHAR(15),
    "Email" VARCHAR(100),
    "AnhDaiDien" VARCHAR(500),
    "HoTenCha" VARCHAR(100),
    "SdtCha" VARCHAR(15),
    "HoTenMe" VARCHAR(100),
    "SdtMe" VARCHAR(15),
    "NgayNhapHoc" DATE DEFAULT CURRENT_DATE,
    "TrangThai" VARCHAR(30) DEFAULT 'Đang học',
    "GhiChu" VARCHAR(300),
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NgayCapNhat" TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT sinh_vien_pkey PRIMARY KEY ("MaSv"),
    CONSTRAINT sinh_vien_cccd_key UNIQUE ("Cccd"),
    CONSTRAINT sinh_vien_ma_tai_khoan_key UNIQUE ("MaTaiKhoan"),
    CONSTRAINT chk_gioi_tinh CHECK ("GioiTinh" IN ('Nam', 'Nữ')),
    CONSTRAINT chk_trang_thai_sv CHECK ("TrangThai" IN ('Đang học', 'Bảo lưu', 'Nghỉ học', 'Tốt nghiệp')),
    CONSTRAINT fk_sv_phuong_xa FOREIGN KEY ("MaPhuongXa") 
        REFERENCES "PHUONGXA"("MaPhuongXa") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sv_dan_toc FOREIGN KEY ("MaDanToc") 
        REFERENCES "DANTOC"("MaDanToc") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_sv_nganh FOREIGN KEY ("MaNganh") 
        REFERENCES "NGANHHOC"("MaNganh") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sv_tk FOREIGN KEY ("MaTaiKhoan") 
        REFERENCES "NGUOIDUNG"("MaTaiKhoan") ON DELETE SET NULL ON UPDATE CASCADE
);

-- FK này phải thêm sau vì "NGUOIDUNG" và "SINHVIEN" tham chiếu vòng nhau.
ALTER TABLE "NGUOIDUNG" 
    ADD CONSTRAINT fk_tk_sv FOREIGN KEY ("MaSv") 
    REFERENCES "SINHVIEN"("MaSv") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- 8. BẢNG "DOITUONGSINHVIEN" - Đối tượng của Sinh viên (QĐ1)
-- =====================================================
CREATE TABLE "DOITUONGSINHVIEN" (
    id SERIAL NOT NULL,
    "MaSv" VARCHAR(15) NOT NULL,
    "MaDoiTuong" VARCHAR(10) NOT NULL,
    "FileMinhChung" VARCHAR(255),
    "GhiChu" VARCHAR(200),
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT doi_tuong_sinh_vien_pkey PRIMARY KEY (id),
    CONSTRAINT uq_dtsv UNIQUE ("MaSv", "MaDoiTuong"),
    CONSTRAINT fk_dtsv_sv FOREIGN KEY ("MaSv") 
        REFERENCES "SINHVIEN"("MaSv") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dtsv_dt FOREIGN KEY ("MaDoiTuong") 
        REFERENCES "DOITUONG"("MaDoiTuong") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================================================
-- 9. BẢNG "QUANTRIVIEN" - Quản trị viên
-- =====================================================
CREATE TABLE "QUANTRIVIEN" (
    "MaQuanTriVien" SERIAL NOT NULL,
    "MaTaiKhoan" INTEGER NOT NULL,
    "HoTen" VARCHAR(100) NOT NULL,
    "NgaySinh" DATE,
    "GioiTinh" VARCHAR(5),
    "Sdt" VARCHAR(15),
    "Email" VARCHAR(100),
    "DiaChi" VARCHAR(200),
    "ChucVu" VARCHAR(100),
    "PhongBan" VARCHAR(100),
    "AnhDaiDien" VARCHAR(500),
    "GhiChu" VARCHAR(300),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NgayCapNhat" TIMESTAMP,
    CONSTRAINT quan_tri_vien_pkey PRIMARY KEY ("MaQuanTriVien"),
    CONSTRAINT quan_tri_vien_ma_tai_khoan_key UNIQUE ("MaTaiKhoan"),
    CONSTRAINT chk_gioi_tinh_qtv CHECK ("GioiTinh" IN ('Nam', 'Nữ')),
    CONSTRAINT fk_qtv_tk FOREIGN KEY ("MaTaiKhoan") 
        REFERENCES "NGUOIDUNG"("MaTaiKhoan") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================
-- 10. BẢNG "MONHOC" - Môn học (BM2, QĐ2)
-- =====================================================
CREATE TABLE "MONHOC" (
    "MaMonHoc" VARCHAR(15) NOT NULL,
    "TenMonHoc" VARCHAR(150) NOT NULL,
    "MaKhoa" VARCHAR(10) NOT NULL,
    "LoaiMon" VARCHAR(5) NOT NULL,
    "SoTiet" INTEGER NOT NULL,
    "SoTinChi" INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN "LoaiMon" = 'LT' THEN "SoTiet" / 15
            WHEN "LoaiMon" = 'TH' THEN "SoTiet" / 30
            ELSE 0
        END
    ) STORED,
    "MoTa" VARCHAR(500),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT mon_hoc_pkey PRIMARY KEY ("MaMonHoc"),
    CONSTRAINT chk_loai_mon CHECK ("LoaiMon" IN ('LT', 'TH')),
    CONSTRAINT chk_so_tiet CHECK ("SoTiet" > 0),
    CONSTRAINT fk_monhoc_khoa FOREIGN KEY ("MaKhoa") 
        REFERENCES "KHOA"("MaKhoa") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================================================
-- 10.1. BẢNG "DIEUKIENMONHOC" - Điều kiện môn học (Tiên quyết, Học trước)
-- =====================================================
CREATE TABLE "DIEUKIENMONHOC" (
    id SERIAL NOT NULL,
    "MaMonHoc" VARCHAR(15) NOT NULL,
    "MaMonDieuKien" VARCHAR(15) NOT NULL,
    "LoaiDieuKien" VARCHAR(20) NOT NULL DEFAULT 'hoc_truoc',
    "MoTa" VARCHAR(200),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT dieu_kien_mon_hoc_pkey PRIMARY KEY (id),
    CONSTRAINT uq_dkmh UNIQUE ("MaMonHoc", "MaMonDieuKien", "LoaiDieuKien"),
    CONSTRAINT chk_loai_dieu_kien CHECK ("LoaiDieuKien" IN ('tien_quyet', 'hoc_truoc')),
    CONSTRAINT fk_dkmh_monhoc FOREIGN KEY ("MaMonHoc") 
        REFERENCES "MONHOC"("MaMonHoc") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dkmh_monhoc_dk FOREIGN KEY ("MaMonDieuKien") 
        REFERENCES "MONHOC"("MaMonHoc") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================
-- 11. BẢNG "TIETHOC" - Tiết học (Quản lý lịch học)
-- Thứ 2 - Thứ 7, Tiết 1-10 và Buổi tối
-- =====================================================
CREATE TABLE "TIETHOC" (
    "MaTiet" VARCHAR(10) NOT NULL,
    "TenTiet" VARCHAR(50) NOT NULL,
    "GioBatDau" TIME NOT NULL,
    "GioKetThuc" TIME NOT NULL,
    "ThuTu" INTEGER NOT NULL,
    "MoTa" VARCHAR(200),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT tiet_hoc_pkey PRIMARY KEY ("MaTiet"),
    CONSTRAINT chk_thu_tu_tiet CHECK ("ThuTu" >= 1 AND "ThuTu" <= 11)
);

-- =====================================================
-- 12. BẢNG "THAMSO" - Tham số hệ thống độc lập
-- =====================================================
CREATE TABLE "THAMSO" (
    id SMALLINT NOT NULL DEFAULT 1,
    "SoTinChiDangKyToiThieu" INTEGER NOT NULL DEFAULT 14,
    "SoTinChiDangKyToiDa" INTEGER NOT NULL DEFAULT 24,
    "SoTinChiDangKyToiDaKhiVuot" INTEGER NOT NULL DEFAULT 30,
    "DanhSachMonAnhVanBatBuoc" VARCHAR(200) DEFAULT 'ENG01,ENG02,ENG03',
    "NamKiemTraAnhVan" INTEGER DEFAULT 2,
    "GioiHanTinChiChuaDatAnhVan" INTEGER DEFAULT 14,
    "NgayCapNhat" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tham_so_pkey PRIMARY KEY (id),
    CONSTRAINT chk_tham_so_singleton CHECK (id = 1),
    CONSTRAINT chk_tham_so_tin_chi CHECK (
        "SoTinChiDangKyToiThieu" >= 0
        AND "SoTinChiDangKyToiDa" >= "SoTinChiDangKyToiThieu"
        AND "SoTinChiDangKyToiDaKhiVuot" >= "SoTinChiDangKyToiDa"
    )
);

-- =====================================================
-- 13. BẢNG "LOP" - Lớp học
-- =====================================================
CREATE TABLE "LOP" (
    "MaLop" VARCHAR(20) NOT NULL,
    "TenLop" VARCHAR(100) NOT NULL,
    "MaMonHoc" VARCHAR(15) NOT NULL,
    "GiangVien" VARCHAR(100),
    "LichHoc" VARCHAR(200),
    "PhongHoc" VARCHAR(50),
    "SoLuongToiDa" INTEGER DEFAULT 50,
    "MoTa" VARCHAR(300),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT lop_pkey PRIMARY KEY ("MaLop"),
    CONSTRAINT fk_lop_monhoc FOREIGN KEY ("MaMonHoc") 
        REFERENCES "MONHOC"("MaMonHoc") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================
-- 14. BẢNG "CHUONGTRINHHOC" - Chương trình học (BM3, QĐ3)
-- =====================================================
CREATE TABLE "CHUONGTRINHHOC" (
    id SERIAL NOT NULL,
    "MaNganh" VARCHAR(10) NOT NULL,
    "MaMonHoc" VARCHAR(15) NOT NULL,
    "HocKy" INTEGER NOT NULL,
    "HocKyDuKien" INTEGER DEFAULT 1,
    "BatBuoc" BOOLEAN DEFAULT TRUE,
    "GhiChu" VARCHAR(200),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chuong_trinh_hoc_pkey PRIMARY KEY (id),
    CONSTRAINT uq_cth UNIQUE ("MaNganh", "MaMonHoc"),
    CONSTRAINT chk_hoc_ky CHECK ("HocKy" >= 1 AND "HocKy" <= 10),
    CONSTRAINT fk_cth_nganh FOREIGN KEY ("MaNganh") 
        REFERENCES "NGANHHOC"("MaNganh") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cth_mon FOREIGN KEY ("MaMonHoc") 
        REFERENCES "MONHOC"("MaMonHoc") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================
-- 13. BẢNG "NAMHOC" - Năm học (BM4)
-- =====================================================
CREATE TABLE "NAMHOC" (
    "MaNamHoc" VARCHAR(15) NOT NULL,
    "TenNamHoc" VARCHAR(50) NOT NULL,
    "NamBatDau" INTEGER NOT NULL,
    "NamKetThuc" INTEGER NOT NULL,
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT nam_hoc_pkey PRIMARY KEY ("MaNamHoc")
);

-- =====================================================
-- 14. BẢNG "HOCKY" - Học kỳ (BM4, QĐ4, QĐ6)
-- =====================================================
CREATE TABLE "HOCKY" (
    "MaHocKy" VARCHAR(15) NOT NULL,
    "TenHocKy" VARCHAR(50) NOT NULL,
    "MaNamHoc" VARCHAR(15) NOT NULL,
    "LoaiHocKy" VARCHAR(20) DEFAULT 'Chính',
    "ThuTu" INTEGER DEFAULT 1,
    "NgayBatDau" DATE,
    "NgayKetThuc" DATE,
    "NgayBatDauDangKy" TIMESTAMP,
    "NgayKetThucDangKy" TIMESTAMP,
    "HanDongHocPhi" DATE,
    "TrangThai" VARCHAR(20) DEFAULT 'Sắp diễn ra',
    "GhiChu" VARCHAR(300),
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT hoc_ky_pkey PRIMARY KEY ("MaHocKy"),
    CONSTRAINT chk_loai_hoc_ky CHECK ("LoaiHocKy" IN ('Chính', 'Hè')),
    CONSTRAINT chk_trang_thai_hk CHECK ("TrangThai" IN ('Sắp diễn ra', 'Đang diễn ra', 'Đã kết thúc')),
    CONSTRAINT fk_hk_namhoc FOREIGN KEY ("MaNamHoc") 
        REFERENCES "NAMHOC"("MaNamHoc") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================================================
-- 17. BẢNG "LOPMO" - Lớp mở trong học kỳ (BM4, QĐ4, QĐ5)
-- =====================================================
CREATE TABLE "LOPMO" (
    id SERIAL NOT NULL,
    "MaHocKy" VARCHAR(15) NOT NULL,
    "MaLop" VARCHAR(20) NOT NULL,
    "SoLuongDaDangKy" INTEGER DEFAULT 0,
    "GhiChu" VARCHAR(200),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lop_mo_pkey PRIMARY KEY (id),
    CONSTRAINT uq_lopmo UNIQUE ("MaHocKy", "MaLop"),
    CONSTRAINT fk_lopmo_hocky FOREIGN KEY ("MaHocKy") 
        REFERENCES "HOCKY"("MaHocKy") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lopmo_lop FOREIGN KEY ("MaLop") 
        REFERENCES "LOP"("MaLop") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================
-- 18. BẢNG "LICHHOCLOP" - Lịch học chi tiết của lớp mở
-- Liên kết lớp mở với tiết học và thứ trong tuần
-- =====================================================
CREATE TABLE "LICHHOCLOP" (
    id SERIAL NOT NULL,
    "LopMoId" INTEGER NOT NULL,
    "ThuTrongTuan" INTEGER NOT NULL,
    "MaTietBatDau" VARCHAR(10) NOT NULL,
    "MaTietKetThuc" VARCHAR(10) NOT NULL,
    "PhongHoc" VARCHAR(50),
    "GhiChu" VARCHAR(200),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lich_hoc_lop_pkey PRIMARY KEY (id),
    CONSTRAINT chk_thu_trong_tuan CHECK ("ThuTrongTuan" >= 2 AND "ThuTrongTuan" <= 7),
    CONSTRAINT fk_lhl_lopmo FOREIGN KEY ("LopMoId") 
        REFERENCES "LOPMO"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lhl_tiet_bat_dau FOREIGN KEY ("MaTietBatDau") 
        REFERENCES "TIETHOC"("MaTiet") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lhl_tiet_ket_thuc FOREIGN KEY ("MaTietKetThuc") 
        REFERENCES "TIETHOC"("MaTiet") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================================================
-- 19. BẢNG "DONGIATINCHI" - Đơn giá tín chỉ (QĐ5)
-- =====================================================
CREATE TABLE "DONGIATINCHI" (
    id SERIAL NOT NULL,
    "LoaiMon" VARCHAR(5) NOT NULL,
    "LoaiHoc" VARCHAR(20) NOT NULL DEFAULT 'hoc_moi',
    "DonGia" DECIMAL(12,0) NOT NULL,
    "MaHocKy" VARCHAR(15),
    "NgayApDung" DATE DEFAULT CURRENT_DATE,
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "GhiChu" VARCHAR(200),
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT don_gia_tin_chi_pkey PRIMARY KEY (id),
    CONSTRAINT uq_dgtc UNIQUE ("LoaiMon", "LoaiHoc", "MaHocKy"),
    CONSTRAINT chk_loai_mon_dg CHECK ("LoaiMon" IN ('LT', 'TH')),
    CONSTRAINT chk_loai_hoc CHECK ("LoaiHoc" IN ('hoc_moi', 'hoc_lai', 'hoc_cai_thien', 'hoc_he')),
    CONSTRAINT fk_dgtc_hk FOREIGN KEY ("MaHocKy") 
        REFERENCES "HOCKY"("MaHocKy") ON DELETE SET NULL ON UPDATE CASCADE
);

-- =====================================================
-- 17. BẢNG "PHIEUDANGKY" - Phiếu đăng ký học phần (BM5, QĐ5, QĐ7)
-- =====================================================
CREATE TABLE "PHIEUDANGKY" (
    "SoPhieu" SERIAL NOT NULL,
    "MaSv" VARCHAR(15) NOT NULL,
    "MaHocKy" VARCHAR(15) NOT NULL,
    "NgayLap" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "TongTinChi" INTEGER DEFAULT 0,
    "TongTienDangKy" DECIMAL(15,0) DEFAULT 0,
    "TienMienGiam" DECIMAL(15,0) DEFAULT 0,
    "SoMonHocMoi" INTEGER DEFAULT 0,
    "SoTinChiHocMoi" INTEGER DEFAULT 0,
    "TienHocMoi" NUMERIC(15,0) DEFAULT 0,
    "SoMonHocLai" INTEGER DEFAULT 0,
    "SoTinChiHocLai" INTEGER DEFAULT 0,
    "TienHocLai" NUMERIC(15,0) DEFAULT 0,
    "SoMonHocCaiThien" INTEGER DEFAULT 0,
    "SoTinChiHocCaiThien" INTEGER DEFAULT 0,
    "TienHocCaiThien" NUMERIC(15,0) DEFAULT 0,
    "TiLeGiam" NUMERIC(5,2) DEFAULT 0,
    "TongTienPhaiDong" NUMERIC(15,0) DEFAULT 0,
    "TrangThai" VARCHAR(30) DEFAULT 'Đã đăng ký',
    "GhiChu" VARCHAR(300),
    "NgayCapNhat" TIMESTAMP,
    CONSTRAINT phieu_dang_ky_pkey PRIMARY KEY ("SoPhieu"),
    CONSTRAINT uq_pdk UNIQUE ("MaSv", "MaHocKy"),
    CONSTRAINT chk_trang_thai_pdk CHECK ("TrangThai" IN ('Đã đăng ký', 'Đã hủy')),
    CONSTRAINT fk_pdk_sv FOREIGN KEY ("MaSv") 
        REFERENCES "SINHVIEN"("MaSv") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pdk_hk FOREIGN KEY ("MaHocKy") 
        REFERENCES "HOCKY"("MaHocKy") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================================================
-- 18. BẢNG "CHITIETDANGKY" - Chi tiết đăng ký (BM5, QĐ5)
-- =====================================================
CREATE TABLE "CHITIETDANGKY" (
    id SERIAL NOT NULL,
    "SoPhieu" INTEGER NOT NULL,
    "MaLop" VARCHAR(20) NOT NULL,
    "MaMonHoc" VARCHAR(15) NOT NULL,
    "LoaiDangKy" VARCHAR(20) DEFAULT 'hoc_moi',
    "SoTinChi" INTEGER DEFAULT 0,
    "LoaiMon" VARCHAR(5) DEFAULT 'LT',
    "DonGia" DECIMAL(12,0) NOT NULL,
    "ThanhTien" DECIMAL(15,0) NOT NULL,
    "TrangThai" VARCHAR(30) DEFAULT 'Đã đăng ký',
    "NgayDangKy" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NgayHuy" TIMESTAMP,
    "LyDoHuy" VARCHAR(200),
    CONSTRAINT chi_tiet_dang_ky_pkey PRIMARY KEY (id),
    CONSTRAINT uq_ctdk UNIQUE ("SoPhieu", "MaMonHoc"),
    CONSTRAINT chk_trang_thai_ctdk CHECK ("TrangThai" IN ('Đã đăng ký', 'Đã hủy')),
    CONSTRAINT chk_loai_dang_ky CHECK ("LoaiDangKy" IN ('hoc_moi', 'hoc_lai', 'hoc_cai_thien')),
    CONSTRAINT fk_ctdk_phieu FOREIGN KEY ("SoPhieu") 
        REFERENCES "PHIEUDANGKY"("SoPhieu") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ctdk_lop FOREIGN KEY ("MaLop") 
        REFERENCES "LOP"("MaLop") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ctdk_monhoc FOREIGN KEY ("MaMonHoc")
        REFERENCES "MONHOC"("MaMonHoc") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================================================
-- 22. BẢNG "MONDAHOC" - Lịch sử môn đã học
-- Lưu kết quả qua/rớt, không lưu điểm số hay điểm chữ
-- =====================================================
CREATE TABLE "MONDAHOC" (
    id SERIAL NOT NULL,
    "MaSv" VARCHAR(15) NOT NULL,
    "MaMonHoc" VARCHAR(15) NOT NULL,
    "MaHocKy" VARCHAR(15) NOT NULL,
    "MaLop" VARCHAR(20),
    "LanHoc" INTEGER NOT NULL DEFAULT 1,
    "KetQua" VARCHAR(20) NOT NULL,
    "GhiChu" VARCHAR(300),
    "NguoiCapNhat" INTEGER,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT mon_da_hoc_pkey PRIMARY KEY (id),
    CONSTRAINT uq_mdh_sv_mon_hk UNIQUE ("MaSv", "MaMonHoc", "MaHocKy", "LanHoc"),
    CONSTRAINT chk_mdh_ket_qua CHECK ("KetQua" IN ('qua_mon', 'rot')),
    CONSTRAINT fk_mdh_sv FOREIGN KEY ("MaSv") 
        REFERENCES "SINHVIEN"("MaSv") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_mdh_mh FOREIGN KEY ("MaMonHoc") 
        REFERENCES "MONHOC"("MaMonHoc") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_mdh_hk FOREIGN KEY ("MaHocKy") 
        REFERENCES "HOCKY"("MaHocKy") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_mdh_lop FOREIGN KEY ("MaLop") 
        REFERENCES "LOP"("MaLop") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_mdh_nguoi_cap_nhat FOREIGN KEY ("NguoiCapNhat")
        REFERENCES "NGUOIDUNG"("MaTaiKhoan") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_mdh_sv_mon ON "MONDAHOC"("MaSv", "MaMonHoc");

-- =====================================================
-- 23. BẢNG "PHIEUTHUHOCPHI" - Phiếu thu học phí (BM6, QĐ6)
-- =====================================================
CREATE TABLE "PHIEUTHUHOCPHI" (
    "SoPhieuThu" SERIAL NOT NULL,
    "SoPhieuDangKy" INTEGER NOT NULL,
    "MaSv" VARCHAR(15) NOT NULL,
    "NgayLap" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "SoTienThu" DECIMAL(15,0) NOT NULL,
    "HinhThucThu" VARCHAR(50) DEFAULT 'Tiền mặt',
    "MaGiaoDich" VARCHAR(100),
    "NguoiThu" VARCHAR(100),
    "PaymentProvider" VARCHAR(30),
    "PaymentChannel" VARCHAR(30),
    "CheckoutUrl" VARCHAR(1000),
    "QrPayload" TEXT,
    "GhiChu" VARCHAR(300),
    "TrangThai" VARCHAR(20) DEFAULT 'Thành công',
    "NgayXacNhan" TIMESTAMP,
    "NgayCapNhat" TIMESTAMP,
    CONSTRAINT phieu_thu_hoc_phi_pkey PRIMARY KEY ("SoPhieuThu"),
    CONSTRAINT chk_so_tien_thu CHECK ("SoTienThu" > 0),
    CONSTRAINT chk_hinh_thuc_thu CHECK ("HinhThucThu" IN ('Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử')),
    CONSTRAINT chk_trang_thai_pthp CHECK ("TrangThai" IN ('Chờ xác nhận', 'Thành công', 'Thất bại', 'Đã hủy')),
    CONSTRAINT fk_pthp_pdk FOREIGN KEY ("SoPhieuDangKy") 
        REFERENCES "PHIEUDANGKY"("SoPhieu") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pthp_sv FOREIGN KEY ("MaSv") 
        REFERENCES "SINHVIEN"("MaSv") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =====================================================
-- 20. BẢNG "THONGBAO" - Thông báo cá nhân
-- =====================================================
CREATE TABLE "THONGBAO" (
    "MaThongBao" SERIAL NOT NULL,
    "MaTaiKhoanNhan" INTEGER NOT NULL,
    "TieuDe" VARCHAR(200) NOT NULL,
    "NoiDung" TEXT NOT NULL,
    "DuongDan" VARCHAR(255),
    "DaDoc" BOOLEAN DEFAULT FALSE,
    "NgayDoc" TIMESTAMP,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Loai" VARCHAR(20) DEFAULT 'chung',
    "LoaiThongBao" VARCHAR(50),
    "DOITUONG" VARCHAR(30) DEFAULT 'Tất cả',
    "GhimTop" BOOLEAN DEFAULT FALSE,
    "NgayHetHan" TIMESTAMP,
    "NguoiTao" INTEGER,
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT thong_bao_pkey PRIMARY KEY ("MaThongBao"),
    CONSTRAINT fk_tb_nguoinhan FOREIGN KEY ("MaTaiKhoanNhan") 
        REFERENCES "NGUOIDUNG"("MaTaiKhoan") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================

-- =====================================================
-- FUNCTION VÀ TRIGGER NGHIỆP VỤ
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_student_schedule_conflict()
RETURNS trigger AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  IF COALESCE(NEW."TrangThai", '') <> 'Đã đăng ký' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO conflict_count
  FROM "PHIEUDANGKY" p_new
  JOIN "LOPMO" lm_new ON lm_new."MaHocKy" = p_new."MaHocKy" AND lm_new."MaLop" = NEW."MaLop" AND COALESCE(lm_new."TrangThai", TRUE) = TRUE
  JOIN "LICHHOCLOP" lh_new ON lh_new."LopMoId" = lm_new.id AND COALESCE(lh_new."TrangThai", TRUE) = TRUE
  JOIN "TIETHOC" tbn ON tbn."MaTiet" = lh_new."MaTietBatDau"
  JOIN "TIETHOC" ten ON ten."MaTiet" = lh_new."MaTietKetThuc"
  JOIN "PHIEUDANGKY" p_old ON p_old."MaSv" = p_new."MaSv" AND p_old."MaHocKy" = p_new."MaHocKy"
  JOIN "CHITIETDANGKY" c_old ON c_old."SoPhieu" = p_old."SoPhieu" AND c_old.id <> NEW.id AND COALESCE(c_old."TrangThai", '') = 'Đã đăng ký'
  JOIN "LOPMO" lm_old ON lm_old."MaHocKy" = p_old."MaHocKy" AND lm_old."MaLop" = c_old."MaLop" AND COALESCE(lm_old."TrangThai", TRUE) = TRUE
  JOIN "LICHHOCLOP" lh_old ON lh_old."LopMoId" = lm_old.id AND COALESCE(lh_old."TrangThai", TRUE) = TRUE
  JOIN "TIETHOC" tbo ON tbo."MaTiet" = lh_old."MaTietBatDau"
  JOIN "TIETHOC" teo ON teo."MaTiet" = lh_old."MaTietKetThuc"
  WHERE p_new."SoPhieu" = NEW."SoPhieu"
    AND lh_new."ThuTrongTuan" = lh_old."ThuTrongTuan"
    AND tbn."ThuTu" <= teo."ThuTu"
    AND tbo."ThuTu" <= ten."ThuTu";

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Sinh vien bi trung lich hoc trong hoc ky nay';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_student_schedule_conflict ON "CHITIETDANGKY";
CREATE TRIGGER trg_prevent_student_schedule_conflict
BEFORE INSERT OR UPDATE OF "SoPhieu", "MaLop", "TrangThai"
ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION prevent_student_schedule_conflict();
