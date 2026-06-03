-- =====================================================
-- Database: ql_dangky_hocphi (Quản lý Đăng ký Môn học và Thu Học phí)
-- PostgreSQL 18 - Tương thích pgAdmin Query Tool
-- Mã hóa: UTF-8
-- =====================================================

-- =====================================================
-- HƯỚNG DẪN SỬ DỤNG
-- =====================================================
--
-- *** CÁCH 1: Sử dụng pgAdmin 4 / DBeaver / DataGrip (GUI Tools) ***
--
--   BƯỚC 1: Tạo database (Chạy trong database 'postgres')
--     - Kết nối vào database 'postgres' (hoặc bất kỳ database nào khác)
--     - Chạy lệnh sau:
--
--       CREATE DATABASE ql_dangky_hocphi
--           WITH
--           OWNER = postgres
--           ENCODING = 'UTF8'
--           LC_COLLATE = 'C'
--           LC_CTYPE = 'C'
--           TEMPLATE = template0
--           CONNECTION LIMIT = -1;
--
--   BƯỚC 2: Kết nối vào database 'ql_dangky_hocphi' và chạy file này
--     - Trong pgAdmin: Click phải vào 'ql_dangky_hocphi' -> 'Query Tool'
--     - Mở file init.sql và chạy (F5)
--
-- *** CÁCH 2: Sử dụng Terminal với psql ***
--
--   Bước 1: Tạo database
--     psql -U postgres -c "CREATE DATABASE ql_dangky_hocphi WITH ENCODING='UTF8' TEMPLATE=template0;"
--
--   Bước 2: Chạy file init.sql
--     psql -U postgres -d ql_dangky_hocphi -f init.sql
--
-- *** CÁCH 3: Sử dụng trong ứng dụng Node.js ***
--   Đọc nội dung file init.sql và thực thi qua pg client
--   (Xem backend/src/config/database.js)
--
-- =====================================================
-- BẮT ĐẦU KHỞI TẠO SCHEMA VÀ DỮ LIỆU
-- =====================================================

-- Drop tables if exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS "THONGBAO" CASCADE;
DROP TABLE IF EXISTS "DONCUUXETDANGKY" CASCADE;
DROP TABLE IF EXISTS "PHIEUTHUHOCPHI" CASCADE;
DROP TABLE IF EXISTS "CHITIETDANGKY" CASCADE;
DROP TABLE IF EXISTS "PHIEUDANGKY" CASCADE;
DROP TABLE IF EXISTS "MONDAHOC" CASCADE;
DROP TABLE IF EXISTS "DIEMSINHVIEN" CASCADE;
DROP TABLE IF EXISTS "LICHHOCLOP" CASCADE;
DROP TABLE IF EXISTS "DONGIATINCHI" CASCADE;
DROP TABLE IF EXISTS "LOPMO" CASCADE;
DROP TABLE IF EXISTS "MONHOCMO" CASCADE;
DROP TABLE IF EXISTS "CHUONGTRINHHOC" CASCADE;
DROP TABLE IF EXISTS "HOCKY" CASCADE;
DROP TABLE IF EXISTS "NAMHOC" CASCADE;
DROP TABLE IF EXISTS "LOP" CASCADE;
DROP TABLE IF EXISTS "GIANGVIEN" CASCADE;
DROP TABLE IF EXISTS "PHONGHOC" CASCADE;
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
    "GioiHanTinChiNoKhoaLuan" INTEGER DEFAULT 8,
    "NgayCapNhat" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tham_so_pkey PRIMARY KEY (id),
    CONSTRAINT chk_tham_so_singleton CHECK (id = 1),
    CONSTRAINT chk_tham_so_tin_chi CHECK (
        "SoTinChiDangKyToiThieu" >= 0
        AND "SoTinChiDangKyToiDa" >= "SoTinChiDangKyToiThieu"
        AND "SoTinChiDangKyToiDaKhiVuot" >= "SoTinChiDangKyToiDa"
        AND "GioiHanTinChiNoKhoaLuan" >= 0
    )
);

-- =====================================================
-- 13. BẢNG "PHONGHOC" - Danh mục phòng học
-- =====================================================
CREATE TABLE "PHONGHOC" (
    "MaPhong" VARCHAR(50) NOT NULL,
    "TenPhong" VARCHAR(100) NOT NULL,
    "ToaNha" VARCHAR(50),
    "SucChua" INTEGER DEFAULT 60,
    "LoaiPhong" VARCHAR(30) DEFAULT 'ly_thuyet',
    "MoTa" VARCHAR(300),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT phong_hoc_pkey PRIMARY KEY ("MaPhong"),
    CONSTRAINT chk_phong_hoc_suc_chua CHECK ("SucChua" IS NULL OR "SucChua" > 0)
);

-- =====================================================
-- 14. BẢNG "GIANGVIEN" - Danh mục giảng viên
-- =====================================================
CREATE TABLE "GIANGVIEN" (
    "MaGiangVien" VARCHAR(20) NOT NULL,
    "HoTen" VARCHAR(100) NOT NULL,
    "HocHamHocVi" VARCHAR(50),
    "MaKhoa" VARCHAR(10),
    "Email" VARCHAR(100),
    "Sdt" VARCHAR(15),
    "MoTa" VARCHAR(300),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT giang_vien_pkey PRIMARY KEY ("MaGiangVien"),
    CONSTRAINT fk_giangvien_khoa FOREIGN KEY ("MaKhoa")
        REFERENCES "KHOA"("MaKhoa") ON DELETE SET NULL ON UPDATE CASCADE
);

-- =====================================================
-- 13. BẢNG "LOP" - Lớp học
-- =====================================================
CREATE TABLE "LOP" (
    "MaLop" VARCHAR(20) NOT NULL,
    "TenLop" VARCHAR(100) NOT NULL,
    "MaMonHoc" VARCHAR(15) NOT NULL,
    "MaGiangVien" VARCHAR(20),
    "GiangVien" VARCHAR(100),
    "LichHoc" VARCHAR(200),
    "ThuTrongTuan" INTEGER,
    "MaTietBatDau" VARCHAR(10),
    "MaTietKetThuc" VARCHAR(10),
    "MaPhong" VARCHAR(50),
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
        REFERENCES "MONHOC"("MaMonHoc") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lop_giangvien FOREIGN KEY ("MaGiangVien")
        REFERENCES "GIANGVIEN"("MaGiangVien") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_lop_phonghoc FOREIGN KEY ("MaPhong")
        REFERENCES "PHONGHOC"("MaPhong") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_lop_tiet_bat_dau FOREIGN KEY ("MaTietBatDau")
        REFERENCES "TIETHOC"("MaTiet") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lop_tiet_ket_thuc FOREIGN KEY ("MaTietKetThuc")
        REFERENCES "TIETHOC"("MaTiet") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "NgayBatDauCuuXet" TIMESTAMP,
    "NgayKetThucCuuXet" TIMESTAMP,
    "NgayChotDangKy" TIMESTAMP,
    "MoThuHocPhi" BOOLEAN NOT NULL DEFAULT FALSE,
    "NgayMoThuHocPhi" TIMESTAMP,
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
CREATE TABLE "MONHOCMO" (
    id SERIAL NOT NULL,
    "MaHocKy" VARCHAR(15) NOT NULL,
    "MaMonHoc" VARCHAR(15) NOT NULL,
    "GhiChu" VARCHAR(200),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NguoiCapNhat" INTEGER,
    "NgayCapNhat" TIMESTAMP,
    "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
    "NguoiXoa" INTEGER,
    "NgayXoa" TIMESTAMP,
    CONSTRAINT mon_hoc_mo_pkey PRIMARY KEY (id),
    CONSTRAINT uq_monhocmo UNIQUE ("MaHocKy", "MaMonHoc"),
    CONSTRAINT fk_monhocmo_hocky FOREIGN KEY ("MaHocKy")
        REFERENCES "HOCKY"("MaHocKy") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_monhocmo_monhoc FOREIGN KEY ("MaMonHoc")
        REFERENCES "MONHOC"("MaMonHoc") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_monhocmo_hocky ON "MONHOCMO" ("MaHocKy");
CREATE INDEX idx_monhocmo_monhoc ON "MONHOCMO" ("MaMonHoc");

CREATE TABLE "LOPMO" (
    id SERIAL NOT NULL,
    "MaHocKy" VARCHAR(15) NOT NULL,
    "MaLop" VARCHAR(20) NOT NULL,
    "MaGiangVien" VARCHAR(20),
    "GiangVien" VARCHAR(100),
    "SoLuongDaDangKy" INTEGER DEFAULT 0,
    "GhiChu" VARCHAR(200),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lop_mo_pkey PRIMARY KEY (id),
    CONSTRAINT uq_lopmo UNIQUE ("MaHocKy", "MaLop"),
    CONSTRAINT fk_lopmo_hocky FOREIGN KEY ("MaHocKy")
        REFERENCES "HOCKY"("MaHocKy") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lopmo_lop FOREIGN KEY ("MaLop")
        REFERENCES "LOP"("MaLop") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lopmo_giangvien FOREIGN KEY ("MaGiangVien")
        REFERENCES "GIANGVIEN"("MaGiangVien") ON DELETE SET NULL ON UPDATE CASCADE
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
    "MaPhong" VARCHAR(50),
    "PhongHoc" VARCHAR(50),
    "GhiChu" VARCHAR(200),
    "TrangThai" BOOLEAN DEFAULT TRUE,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lich_hoc_lop_pkey PRIMARY KEY (id),
    CONSTRAINT chk_thu_trong_tuan CHECK ("ThuTrongTuan" >= 1 AND "ThuTrongTuan" <= 7),
    CONSTRAINT fk_lhl_lopmo FOREIGN KEY ("LopMoId")
        REFERENCES "LOPMO"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lhl_phonghoc FOREIGN KEY ("MaPhong")
        REFERENCES "PHONGHOC"("MaPhong") ON DELETE SET NULL ON UPDATE CASCADE,
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
-- 18.5. BẢNG "DONCUUXETDANGKY" - Đơn cứu xét đăng ký sau hạn
-- =====================================================
CREATE TABLE "DONCUUXETDANGKY" (
    id SERIAL NOT NULL,
    "MaSv" VARCHAR(15) NOT NULL,
    "MaHocKy" VARCHAR(15) NOT NULL,
    "SoPhieu" INTEGER,
    "LoaiDon" VARCHAR(10) NOT NULL DEFAULT 'them',
    "TrangThai" VARCHAR(20) NOT NULL DEFAULT 'cho_duyet',
    "MaLopHuy" VARCHAR(20),
    "MaLopThem" VARCHAR(20),
    "LyDo" VARCHAR(500) NOT NULL,
    "LyDoTuChoi" VARCHAR(500),
    "NguoiDuyet" INTEGER,
    "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "NgayCapNhat" TIMESTAMP,
    "NgayDuyet" TIMESTAMP,
    CONSTRAINT don_cuu_xet_dang_ky_pkey PRIMARY KEY (id),
    CONSTRAINT chk_dcx_loai_don CHECK ("LoaiDon" IN ('them', 'huy', 'doi')),
    CONSTRAINT chk_dcx_trang_thai CHECK ("TrangThai" IN ('cho_duyet', 'da_duyet', 'tu_choi', 'da_huy')),
    CONSTRAINT chk_dcx_lop_theo_loai CHECK (
        ("LoaiDon" = 'them' AND "MaLopThem" IS NOT NULL AND "MaLopHuy" IS NULL)
        OR ("LoaiDon" = 'huy' AND "MaLopHuy" IS NOT NULL AND "MaLopThem" IS NULL)
        OR ("LoaiDon" = 'doi' AND "MaLopHuy" IS NOT NULL AND "MaLopThem" IS NOT NULL)
    ),
    CONSTRAINT fk_dcx_sinhvien FOREIGN KEY ("MaSv")
        REFERENCES "SINHVIEN"("MaSv") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dcx_hocky FOREIGN KEY ("MaHocKy")
        REFERENCES "HOCKY"("MaHocKy") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dcx_phieudangky FOREIGN KEY ("SoPhieu")
        REFERENCES "PHIEUDANGKY"("SoPhieu") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dcx_lop_huy FOREIGN KEY ("MaLopHuy")
        REFERENCES "LOP"("MaLop") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dcx_lop_them FOREIGN KEY ("MaLopThem")
        REFERENCES "LOP"("MaLop") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dcx_nguoi_duyet FOREIGN KEY ("NguoiDuyet")
        REFERENCES "NGUOIDUNG"("MaTaiKhoan") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_dcx_sv_hk ON "DONCUUXETDANGKY" ("MaSv", "MaHocKy");
CREATE INDEX idx_dcx_hk_trangthai ON "DONCUUXETDANGKY" ("MaHocKy", "TrangThai");
CREATE UNIQUE INDEX uq_dcx_pending
    ON "DONCUUXETDANGKY" ("MaSv", "MaHocKy", "LoaiDon", COALESCE("MaLopHuy", ''), COALESCE("MaLopThem", ''))
    WHERE "TrangThai" = 'cho_duyet';

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
    "TrangThai" VARCHAR(20) DEFAULT 'Chưa thanh toán',
    "NgayXacNhan" TIMESTAMP,
    "NgayCapNhat" TIMESTAMP,
    CONSTRAINT phieu_thu_hoc_phi_pkey PRIMARY KEY ("SoPhieuThu"),
    CONSTRAINT chk_so_tien_thu CHECK ("SoTienThu" > 0),
    CONSTRAINT chk_hinh_thuc_thu CHECK ("HinhThucThu" IN ('Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử')),
    CONSTRAINT chk_trang_thai_pthp CHECK ("TrangThai" IN ('Chưa thanh toán', 'Chờ xác nhận', 'Thành công', 'Thất bại', 'Đã hủy', 'Hoàn tiền')),
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
--FILE TỔNG HỢP TRIGGER
--RBTV1:
CREATE OR REPLACE FUNCTION trg_func_sinhvien_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "PHUONGXA" px
        JOIN "DANTOC" dt ON dt."MaDanToc" = NEW."MaDanToc"
        WHERE px."MaPhuongXa" = NEW."MaPhuongXa"
          AND px."KhuVuc" = 'KV3'
          AND dt."LaDanTocThieuSo" = TRUE
    ) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM "DOITUONGSINHVIEN"
            WHERE "MaSv" = NEW."MaSv" AND "MaDoiTuong" = 'DT06'
        ) THEN
            RAISE EXCEPTION 'Lỗi RBTV01: Sinh viên % thuộc vùng sâu vùng xa nhưng chưa được gán đối tượng DT06.', NEW."MaSv";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_sinhvien_rbtv01
AFTER INSERT OR UPDATE OF "MaPhuongXa", "MaDanToc" ON "SINHVIEN"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_func_sinhvien_rbtv01();

CREATE OR REPLACE FUNCTION trg_func_phuongxa_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."KhuVuc" = 'KV3' AND OLD."KhuVuc" IS DISTINCT FROM NEW."KhuVuc" THEN
        IF EXISTS (
            SELECT 1
            FROM "SINHVIEN" sv
            JOIN "DANTOC" dt ON sv."MaDanToc" = dt."MaDanToc"
            WHERE sv."MaPhuongXa" = NEW."MaPhuongXa"
              AND dt."LaDanTocThieuSo" = TRUE
              AND NOT EXISTS (
                  SELECT 1 FROM "DOITUONGSINHVIEN" dtsv
                  WHERE dtsv."MaSv" = sv."MaSv" AND dtsv."MaDoiTuong" = 'DT06'
              )
        ) THEN
            RAISE EXCEPTION 'Lỗi RBTV01: Không thể cập nhật KhuVuc thành KV3 vì có sinh viên dân tộc thiểu số tại đây chưa có mã DT06.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_phuongxa_rbtv01
AFTER UPDATE OF "KhuVuc" ON "PHUONGXA"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_func_phuongxa_rbtv01();

CREATE OR REPLACE FUNCTION trg_func_dantoc_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."LaDanTocThieuSo" = TRUE AND OLD."LaDanTocThieuSo" IS DISTINCT FROM NEW."LaDanTocThieuSo" THEN
        IF EXISTS (
            SELECT 1
            FROM "SINHVIEN" sv
            JOIN "PHUONGXA" px ON sv."MaPhuongXa" = px."MaPhuongXa"
            WHERE sv."MaDanToc" = NEW."MaDanToc"
              AND px."KhuVuc" = 'KV3'
              AND NOT EXISTS (
                  SELECT 1 FROM "DOITUONGSINHVIEN" dtsv
                  WHERE dtsv."MaSv" = sv."MaSv" AND dtsv."MaDoiTuong" = 'DT06'
              )
        ) THEN
            RAISE EXCEPTION 'Lỗi RBTV01: Không thể cập nhật LaDanTocThieuSo thành TRUE vì có sinh viên ở KV3 thuộc dân tộc này chưa có mã DT06.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_dantoc_rbtv01
AFTER UPDATE OF "LaDanTocThieuSo" ON "DANTOC"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_func_dantoc_rbtv01();

CREATE OR REPLACE FUNCTION trg_func_doituongsinhvien_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD."MaDoiTuong" = 'DT06' AND NEW."MaDoiTuong" <> 'DT06') THEN
        IF OLD."MaDoiTuong" = 'DT06' THEN
            IF EXISTS (
                SELECT 1
                FROM "SINHVIEN" sv
                JOIN "PHUONGXA" px ON sv."MaPhuongXa" = px."MaPhuongXa"
                JOIN "DANTOC" dt ON sv."MaDanToc" = dt."MaDanToc"
                WHERE sv."MaSv" = OLD."MaSv"
                  AND px."KhuVuc" = 'KV3'
                  AND dt."LaDanTocThieuSo" = TRUE
            ) THEN
                RAISE EXCEPTION 'Lỗi RBTV01: Không thể xóa/sửa đối tượng DT06 của sinh viên % vì sinh viên này thuộc vùng sâu vùng xa.', OLD."MaSv";
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_doituongsinhvien_rbtv01
AFTER INSERT OR UPDATE OR DELETE ON "DOITUONGSINHVIEN"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_func_doituongsinhvien_rbtv01();

CREATE OR REPLACE FUNCTION trg_func_doituong_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."MaDoiTuong" = 'DT06' THEN
        RAISE EXCEPTION 'Lỗi RBTV01: Không được phép xóa hoặc sửa mã đối tượng hệ thống DT06.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doituong_rbtv01
BEFORE UPDATE OR DELETE ON "DOITUONG"
FOR EACH ROW
EXECUTE FUNCTION trg_func_doituong_rbtv01();
--RBTV2:
CREATE OR REPLACE FUNCTION function_calculate_max_discount(p_ma_sv VARCHAR)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_ti_le_giam DECIMAL(5,2);
BEGIN
    WITH student_objects AS (
        -- 1. Các đối tượng được gán trực tiếp (phải đang kích hoạt và chưa bị xóa)
        SELECT dt."TiLeGiamHocPhi", dt."DoUuTien"
        FROM "DOITUONGSINHVIEN" dtsv
        JOIN "DOITUONG" dt ON dtsv."MaDoiTuong" = dt."MaDoiTuong"
        WHERE dtsv."MaSv" = p_ma_sv
          AND dt."TrangThai" = TRUE
          AND dt."DaXoa" = FALSE

        UNION ALL

        -- 2. Đối tượng DT06 tự động (nếu sinh viên ở Khu vực 3 và là Dân tộc thiểu số)
        SELECT dt."TiLeGiamHocPhi", dt."DoUuTien"
        FROM "SINHVIEN" sv
        JOIN "PHUONGXA" px ON sv."MaPhuongXa" = px."MaPhuongXa"
        JOIN "DANTOC" dc ON sv."MaDanToc" = dc."MaDanToc"
        JOIN "DOITUONG" dt ON dt."MaDoiTuong" = 'DT06'
        WHERE sv."MaSv" = p_ma_sv
          AND px."KhuVuc" = 'KV3'
          AND dc."LaDanTocThieuSo" = TRUE
          AND dt."TrangThai" = TRUE
          AND dt."DaXoa" = FALSE
    )
    SELECT "TiLeGiamHocPhi"
    INTO v_ti_le_giam
    FROM student_objects
    ORDER BY "DoUuTien" ASC, "TiLeGiamHocPhi" DESC -- Ưu tiên DoUuTien nhỏ nhất, nếu bằng nhau lấy phần trăm cao nhất
    LIMIT 1;

    -- Nếu không thuộc đối tượng nào, tỷ lệ giảm mặc định là 0
    RETURN COALESCE(v_ti_le_giam, 0.00);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_fn_phieudangky_tilegiam()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        NEW."TiLeGiam" := function_calculate_max_discount(NEW."MaSv");
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_phieudangky_tilegiam
BEFORE INSERT OR UPDATE OF "MaSv", "TrangThai", "TiLeGiam"
ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_phieudangky_tilegiam();

CREATE OR REPLACE FUNCTION trg_fn_doituongsinhvien_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE "PHIEUDANGKY"
        SET "TiLeGiam" = function_calculate_max_discount(NEW."MaSv")
        WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = 'Đã đăng ký';
    END IF;

    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        UPDATE "PHIEUDANGKY"
        SET "TiLeGiam" = function_calculate_max_discount(OLD."MaSv")
        WHERE "MaSv" = OLD."MaSv" AND "TrangThai" = 'Đã đăng ký';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doituongsinhvien_sync
AFTER INSERT OR UPDATE OR DELETE
ON "DOITUONGSINHVIEN"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_doituongsinhvien_sync();

CREATE OR REPLACE FUNCTION trg_fn_doituong_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD."TiLeGiamHocPhi" IS DISTINCT FROM NEW."TiLeGiamHocPhi") OR
       (OLD."DoUuTien" IS DISTINCT FROM NEW."DoUuTien") OR
       (OLD."TrangThai" IS DISTINCT FROM NEW."TrangThai") OR
       (OLD."DaXoa" IS DISTINCT FROM NEW."DaXoa") THEN

        -- Nếu chỉnh sửa cấu hình của DT06, quét toàn bộ sinh viên diện vùng sâu vùng xa
        IF NEW."MaDoiTuong" = 'DT06' THEN
            UPDATE "PHIEUDANGKY" p
            SET "TiLeGiam" = function_calculate_max_discount(p."MaSv")
            FROM "SINHVIEN" sv
            JOIN "PHUONGXA" px ON sv."MaPhuongXa" = px."MaPhuongXa"
            JOIN "DANTOC" dc ON sv."MaDanToc" = dc."MaDanToc"
            WHERE p."MaSv" = sv."MaSv"
              AND p."TrangThai" = 'Đã đăng ký'
              AND px."KhuVuc" = 'KV3'
              AND dc."LaDanTocThieuSo" = TRUE;
        END IF;

        -- Cập nhật cho những sinh viên được gán trực tiếp mã đối tượng này
        UPDATE "PHIEUDANGKY" p
        SET "TiLeGiam" = function_calculate_max_discount(p."MaSv")
        FROM "DOITUONGSINHVIEN" dtsv
        WHERE p."MaSv" = dtsv."MaSv"
          AND p."TrangThai" = 'Đã đăng ký'
          AND dtsv."MaDoiTuong" = NEW."MaDoiTuong";

    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doituong_sync
AFTER UPDATE ON "DOITUONG"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_doituong_sync();

CREATE OR REPLACE FUNCTION trg_fn_sinhvien_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD."MaPhuongXa" IS DISTINCT FROM NEW."MaPhuongXa") OR
       (OLD."MaDanToc" IS DISTINCT FROM NEW."MaDanToc") THEN
        UPDATE "PHIEUDANGKY"
        SET "TiLeGiam" = function_calculate_max_discount(NEW."MaSv")
        WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = 'Đã đăng ký';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sinhvien_sync
AFTER UPDATE OF "MaPhuongXa", "MaDanToc" ON "SINHVIEN"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sinhvien_sync();

-- Trigger cho bảng PHUONGXA
CREATE OR REPLACE FUNCTION trg_fn_phuongxa_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."KhuVuc" IS DISTINCT FROM NEW."KhuVuc" THEN
        UPDATE "PHIEUDANGKY" p
        SET "TiLeGiam" = function_calculate_max_discount(p."MaSv")
        FROM "SINHVIEN" sv
        WHERE p."MaSv" = sv."MaSv"
          AND p."TrangThai" = 'Đã đăng ký'
          AND sv."MaPhuongXa" = NEW."MaPhuongXa";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_phuongxa_sync
AFTER UPDATE OF "KhuVuc" ON "PHUONGXA"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_phuongxa_sync();

-- Trigger cho bảng DANTOC
CREATE OR REPLACE FUNCTION trg_fn_dantoc_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."LaDanTocThieuSo" IS DISTINCT FROM NEW."LaDanTocThieuSo" THEN
        UPDATE "PHIEUDANGKY" p
        SET "TiLeGiam" = function_calculate_max_discount(p."MaSv")
        FROM "SINHVIEN" sv
        WHERE p."MaSv" = sv."MaSv"
          AND p."TrangThai" = 'Đã đăng ký'
          AND sv."MaDanToc" = NEW."MaDanToc";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dantoc_sync
AFTER UPDATE OF "LaDanTocThieuSo" ON "DANTOC"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dantoc_sync();
--RBTV3:
CREATE OR REPLACE FUNCTION trg_fn_phieudangky_tinhtien()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Đảm bảo dữ liệu số không bị NULL để tránh lỗi tính toán
    NEW."TongTienDangKy" := COALESCE(NEW."TongTienDangKy", 0);
    NEW."TiLeGiam"       := COALESCE(NEW."TiLeGiam", 0.00);

    -- 2. Công thức 1: TienMienGiam = ROUND(TongTienDangKy * TiLeGiam / 100)
    NEW."TienMienGiam"   := ROUND(NEW."TongTienDangKy" * NEW."TiLeGiam" / 100);

    -- 3. Công thức 2: TongTienPhaiDong = GREATEST(TongTienDangKy - TienMienGiam, 0)
    NEW."TongTienPhaiDong" := GREATEST(NEW."TongTienDangKy" - NEW."TienMienGiam", 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger áp dụng cho cả hành động INSERT và UPDATE trên bảng PHIEUDANGKY
CREATE TRIGGER trg_phieudangky_tinhtien
BEFORE INSERT OR UPDATE OF "TongTienDangKy", "TiLeGiam", "TienMienGiam", "TongTienPhaiDong"
ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_phieudangky_tinhtien();

--RBTV16:
CREATE OR REPLACE FUNCTION trg_fn_phieudangky_rbtv16()
RETURNS TRIGGER AS $$
DECLARE
    v_sv_trang_thai VARCHAR;
    v_nd_trang_thai BOOLEAN;
    v_ma_tk INTEGER;
BEGIN
    -- Lấy thông tin sinh viên
    SELECT "TrangThai", "MaTaiKhoan" INTO v_sv_trang_thai, v_ma_tk
    FROM "SINHVIEN"
    WHERE "MaSv" = NEW."MaSv";

    -- Kiểm tra 1: Sinh viên phải ở trạng thái 'Đang học'
    IF v_sv_trang_thai IS DISTINCT FROM 'Đang học' THEN
        RAISE EXCEPTION 'Lỗi RBTV16: Sinh viên % đang ở trạng thái "%", không được phép lập phiếu đăng ký.', NEW."MaSv", v_sv_trang_thai;
    END IF;

    -- Kiểm tra 2: Nếu sinh viên có tài khoản, tài khoản đó phải đang Active (TRUE)
    IF v_ma_tk IS NOT NULL THEN
        SELECT "TrangThai" INTO v_nd_trang_thai
        FROM "NGUOIDUNG"
        WHERE "MaTaiKhoan" = v_ma_tk;

        IF v_nd_trang_thai = FALSE THEN
            RAISE EXCEPTION 'Lỗi RBTV16: Tài khoản hệ thống của sinh viên % đã bị khóa, không thể lập phiếu đăng ký.', NEW."MaSv";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_phieudangky_rbtv16
BEFORE INSERT OR UPDATE OF "MaSv" ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_phieudangky_rbtv16();

CREATE OR REPLACE FUNCTION trg_fn_sinhvien_rbtv16()
RETURNS TRIGGER AS $$
DECLARE
    v_nd_trang_thai BOOLEAN;
BEGIN
    -- Chỉ kiểm tra nếu sinh viên này đã từng lập Phiếu đăng ký
    IF EXISTS (SELECT 1 FROM "PHIEUDANGKY" WHERE "MaSv" = NEW."MaSv") THEN

        -- Nếu định đổi trạng thái khác 'Đang học'
        IF NEW."TrangThai" IS DISTINCT FROM 'Đang học' THEN
            RAISE EXCEPTION 'Lỗi RBTV16: Sinh viên % đã có phiếu đăng ký, không thể chuyển trạng thái thành "%".', NEW."MaSv", NEW."TrangThai";
        END IF;

        -- Nếu cập nhật lại Mã tài khoản
        IF NEW."MaTaiKhoan" IS NOT NULL THEN
            SELECT "TrangThai" INTO v_nd_trang_thai
            FROM "NGUOIDUNG" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan";

            IF v_nd_trang_thai = FALSE THEN
                RAISE EXCEPTION 'Lỗi RBTV16: Sinh viên % đã có phiếu đăng ký, không thể gán một tài khoản đang bị khóa.', NEW."MaSv";
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sinhvien_rbtv16
AFTER UPDATE OF "TrangThai", "MaTaiKhoan" ON "SINHVIEN"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sinhvien_rbtv16();

CREATE OR REPLACE FUNCTION trg_fn_nguoidung_rbtv16()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu thao tác là khóa tài khoản (TRUE -> FALSE)
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (
            SELECT 1 FROM "SINHVIEN" sv
            JOIN "PHIEUDANGKY" pdk ON sv."MaSv" = pdk."MaSv"
            WHERE sv."MaTaiKhoan" = NEW."MaTaiKhoan"
        ) THEN
            RAISE EXCEPTION 'Lỗi RBTV16: Không thể khóa tài khoản % vì sinh viên sở hữu đang có phiếu đăng ký.', NEW."TenDangNhap";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nguoidung_rbtv16
AFTER UPDATE OF "TrangThai" ON "NGUOIDUNG"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_nguoidung_rbtv16();

--Tạo Trigger RBTV04
-- 1. Tạo hàm thực hiện kiểm tra ràng buộc
CREATE OR REPLACE FUNCTION func_check_rbtv04_SoTiet()
RETURNS TRIGGER AS $$
BEGIN
    -- Kiểm tra điều kiện:
    -- (LoaiMon = 'LT' AND SoTiet chia hết cho 15)
    -- OR (LoaiMon = 'TH' AND SoTiet chia hết cho 30)
    IF NOT (
        (NEW."LoaiMon" = 'LT' AND NEW."SoTiet" % 15 = 0) OR
        (NEW."LoaiMon" = 'TH' AND NEW."SoTiet" % 30 = 0)
    ) THEN
        RAISE EXCEPTION 'Vi phạm RBTV04: Số tiết không hợp lệ. Mon Ly thuyet phai chia het cho 15, mon Thuc hanh phai chia het cho 30.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tạo trigger gắn hàm trên vào bảng MONHOC
DROP TRIGGER IF EXISTS trigger_rbtv04 ON "MONHOC";

CREATE TRIGGER trigger_rbtv04
BEFORE INSERT OR UPDATE OF "LoaiMon", "SoTiet" ON "MONHOC"
FOR EACH ROW
EXECUTE FUNCTION func_check_rbtv04_SoTiet();


--Tạo Trigger RBTV05
-- 1. Tạo hàm thực hiện kiểm tra ràng buộc
CREATE OR REPLACE FUNCTION func_check_rbtv05_DieuKienMonHoc()
RETURNS TRIGGER AS $$
BEGIN
    -- Kiểm tra điều kiện:
    -- Mã môn học phải khác Mã môn điều kiện
    IF NOT (
        NEW."MaMonHoc" <> NEW."MaMonDieuKien"
    ) THEN
        RAISE EXCEPTION 'Vi phạm RBTV05: Một môn học không được là điều kiện của chính nó.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tạo trigger gắn hàm trên vào bảng DIEUKIENMONHOC
DROP TRIGGER IF EXISTS trigger_rbtv05 ON "DIEUKIENMONHOC";

CREATE TRIGGER trigger_rbtv05
BEFORE INSERT OR UPDATE OF "MaMonHoc", "MaMonDieuKien" ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION func_check_rbtv05_DieuKienMonHoc();


--Tạo Trigger RBTV06
ALTER TABLE "DIEUKIENMONHOC"
ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE;

-- 1. Hàm kiểm tra đệ quy phát hiện chu trình đồ thị môn học
CREATE OR REPLACE FUNCTION func_check_rbtv06_DieuKienMonHoc()
RETURNS TRIGGER AS $$
DECLARE
    v_has_cycle BOOLEAN := FALSE;
    v_error_path TEXT;
BEGIN
    -- Nếu bản ghi bị tắt kích hoạt (TrangThai = FALSE) thì bỏ qua không xét
    IF NEW."TrangThai" = FALSE THEN
        RETURN NULL;
    END IF;

    -- Sử dụng Đệ quy kiểm tra bắt đầu từ môn học vừa được tác động
    WITH RECURSIVE CycleCheck AS (
        -- KHỞI TẠO: Lấy các môn điều kiện trực tiếp của MaMonHoc vừa thêm/sửa
        SELECT
            "MaMonDieuKien",
            ARRAY[NEW."MaMonHoc"::TEXT, "MaMonDieuKien"::TEXT] AS path,
            FALSE AS is_cycle
        FROM "DIEUKIENMONHOC"
        WHERE "MaMonHoc" = NEW."MaMonHoc" AND "TrangThai" = TRUE

        UNION ALL

        -- ĐỆ QUY: Đi tiếp sang các môn điều kiện tầng tiếp theo
        SELECT
            d."MaMonDieuKien",
            c.path || d."MaMonDieuKien"::TEXT,
            (d."MaMonDieuKien"::TEXT = ANY(c.path)) AS is_cycle
        FROM "DIEUKIENMONHOC" d
        INNER JOIN CycleCheck c ON d."MaMonHoc" = c."MaMonDieuKien"
        WHERE d."TrangThai" = TRUE
          AND NOT c.is_cycle -- Ngắt nhánh ngay lập tức nếu bước trước đã phát hiện vòng lặp
    )
    -- Lọc ra dòng đầu tiên tìm thấy chu trình
    SELECT TRUE, array_to_string(path, ' -> ')
    INTO v_has_cycle, v_error_path
    FROM CycleCheck
    WHERE is_cycle = TRUE OR "MaMonDieuKien" = NEW."MaMonHoc"
    LIMIT 1;

    -- Nếu tồn tại vòng lặp chu trình -> Tiến hành chặn và trả về thông tin sơ đồ lỗi
    IF v_has_cycle THEN
        RAISE EXCEPTION 'Vi phạm RBTV06: Không được tạo vòng lặp điều kiện môn học! Sơ đồ lỗi chu trình: %', v_error_path;
    END IF;

    RETURN NULL; -- AFTER trigger luôn trả về NULL
END;
$$ LANGUAGE plpgsql;

-- 2. Thiết lập AFTER trigger để bắt chính xác trạng thái thực tế sau thay đổi
DROP TRIGGER IF EXISTS trigger_rbtv06 ON "DIEUKIENMONHOC";

CREATE TRIGGER trigger_rbtv06
AFTER INSERT OR UPDATE OF "MaMonHoc", "MaMonDieuKien", "TrangThai" ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION func_check_rbtv06_DieuKienMonHoc();


--Tạo Trigger RBTV07
CREATE OR REPLACE FUNCTION func_check_rbtv07_ChuongTrinhHoc()
RETURNS TRIGGER AS $$
BEGIN
    -- THAO TÁC: INSERT hoặc UPDATE thông tin của chính môn học hiện tại (M)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD."MaNganh" <> NEW."MaNganh" OR OLD."MaMonHoc" <> NEW."MaMonHoc" OR OLD."HocKy" <> NEW."HocKy")) THEN
        -- Kiểm tra xem môn M vừa tác động có thỏa mãn toàn bộ môn điều kiện D đang hoạt động hay không
        IF EXISTS (
            SELECT 1
            FROM "DIEUKIENMONHOC" dk
            LEFT JOIN "CHUONGTRINHHOC" ctdk
                ON ctdk."MaNganh" = NEW."MaNganh" AND ctdk."MaMonHoc" = dk."MaMonDieuKien"
            WHERE dk."MaMonHoc" = NEW."MaMonHoc" AND dk."TrangThai" = TRUE
              AND (
                  ctdk."MaMonHoc" IS NULL -- Chưa xếp môn điều kiện D vào chương trình học của ngành N
                  OR (dk."LoaiDieuKien" = 'tien_quyet' AND ctdk."HocKy" >= NEW."HocKy") -- Vi phạm điều kiện Học kỳ môn tiên quyết phải nhỏ hơn (<)
                  OR (dk."LoaiDieuKien" = 'hoc_truoc' AND ctdk."HocKy" > NEW."HocKy")   -- Vi phạm điều kiện Học kỳ môn học trước phải nhỏ hơn hoặc bằng (<=)
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Môn học "%" thuộc ngành "%" xếp ở học kỳ % không hợp lý với cấu hình các môn điều kiện hiện tại.',
                NEW."MaMonHoc", NEW."MaNganh", NEW."HocKy";
        END IF;
    END IF;

    -- THAO TÁC: DELETE hoặc UPDATE thông tin môn học đóng vai trò làm môn điều kiện (D) cho môn khác
    IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND (OLD."MaNganh" <> NEW."MaNganh" OR OLD."MaMonHoc" <> NEW."MaMonHoc" OR OLD."HocKy" <> NEW."HocKy")) THEN
        -- Kiểm tra xem môn học cũ (OLD) có đang làm môn điều kiện hoạt động cho bất kỳ môn M nào khác cùng ngành không
        IF EXISTS (
            SELECT 1
            FROM "CHUONGTRINHHOC" ctm
            JOIN "DIEUKIENMONHOC" dk ON ctm."MaMonHoc" = dk."MaMonHoc"
            WHERE ctm."MaNganh" = OLD."MaNganh"
              AND dk."MaMonDieuKien" = OLD."MaMonHoc"
              AND dk."TrangThai" = TRUE
              AND (
                  TG_OP = 'DELETE' -- Xóa môn điều kiện ra khỏi ngành sẽ làm môn phụ thuộc thiếu điều kiện
                  OR OLD."MaNganh" <> NEW."MaNganh" -- Chuyển ngành môn điều kiện
                  OR OLD."MaMonHoc" <> NEW."MaMonHoc" -- Thay đổi mã môn
                  OR (dk."LoaiDieuKien" = 'tien_quyet' AND NEW."HocKy" >= ctm."HocKy") -- Sửa học kỳ mới làm vi phạm quy tắc môn tiên quyết
                  OR (dk."LoaiDieuKien" = 'hoc_truoc' AND NEW."HocKy" > ctm."HocKy")   -- Sửa học kỳ mới làm vi phạm quy tắc môn học trước
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Thao tác % môn "%" của ngành "%" gây ảnh hưởng hoặc làm sai lệch lộ trình học kỳ của môn phụ thuộc khác.',
                CASE WHEN TG_OP = 'DELETE' THEN 'XÓA' ELSE 'CẬP NHẬT' END, OLD."MaMonHoc", OLD."MaNganh";
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- Thiết lập Trigger chạy BEFORE trên bảng CHUONGTRINHHOC
DROP TRIGGER IF EXISTS trigger_rbtv07_cth ON "CHUONGTRINHHOC";
CREATE TRIGGER trigger_rbtv07_cth
BEFORE INSERT OR UPDATE OR DELETE ON "CHUONGTRINHHOC"
FOR EACH ROW EXECUTE FUNCTION func_check_rbtv07_ChuongTrinhHoc();

CREATE OR REPLACE FUNCTION func_check_rbtv07_ChuongTrinhHoc()
RETURNS TRIGGER AS $$
BEGIN
    -- THAO TÁC: INSERT hoặc UPDATE thông tin của chính môn học hiện tại (M)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD."MaNganh" <> NEW."MaNganh" OR OLD."MaMonHoc" <> NEW."MaMonHoc" OR OLD."HocKy" <> NEW."HocKy")) THEN
        -- Kiểm tra xem môn M vừa tác động có thỏa mãn toàn bộ môn điều kiện D đang hoạt động hay không
        IF EXISTS (
            SELECT 1
            FROM "DIEUKIENMONHOC" dk
            LEFT JOIN "CHUONGTRINHHOC" ctdk
                ON ctdk."MaNganh" = NEW."MaNganh" AND ctdk."MaMonHoc" = dk."MaMonDieuKien"
            WHERE dk."MaMonHoc" = NEW."MaMonHoc" AND dk."TrangThai" = TRUE
              AND (
                  ctdk."MaMonHoc" IS NULL -- Chưa xếp môn điều kiện D vào chương trình học của ngành N
                  OR (dk."LoaiDieuKien" = 'tien_quyet' AND ctdk."HocKy" >= NEW."HocKy") -- Vi phạm điều kiện Học kỳ môn tiên quyết phải nhỏ hơn (<)
                  OR (dk."LoaiDieuKien" = 'hoc_truoc' AND ctdk."HocKy" > NEW."HocKy")   -- Vi phạm điều kiện Học kỳ môn học trước phải nhỏ hơn hoặc bằng (<=)
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Môn học "%" thuộc ngành "%" xếp ở học kỳ % không hợp lý với cấu hình các môn điều kiện hiện tại.',
                NEW."MaMonHoc", NEW."MaNganh", NEW."HocKy";
        END IF;
    END IF;

    -- THAO TÁC: DELETE hoặc UPDATE thông tin môn học đóng vai trò làm môn điều kiện (D) cho môn khác
    IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND (OLD."MaNganh" <> NEW."MaNganh" OR OLD."MaMonHoc" <> NEW."MaMonHoc" OR OLD."HocKy" <> NEW."HocKy")) THEN
        -- Kiểm tra xem môn học cũ (OLD) có đang làm môn điều kiện hoạt động cho bất kỳ môn M nào khác cùng ngành không
        IF EXISTS (
            SELECT 1
            FROM "CHUONGTRINHHOC" ctm
            JOIN "DIEUKIENMONHOC" dk ON ctm."MaMonHoc" = dk."MaMonHoc"
            WHERE ctm."MaNganh" = OLD."MaNganh"
              AND dk."MaMonDieuKien" = OLD."MaMonHoc"
              AND dk."TrangThai" = TRUE
              AND (
                  TG_OP = 'DELETE' -- Xóa môn điều kiện ra khỏi ngành sẽ làm môn phụ thuộc thiếu điều kiện
                  OR OLD."MaNganh" <> NEW."MaNganh" -- Chuyển ngành môn điều kiện
                  OR OLD."MaMonHoc" <> NEW."MaMonHoc" -- Thay đổi mã môn
                  OR (dk."LoaiDieuKien" = 'tien_quyet' AND NEW."HocKy" >= ctm."HocKy") -- Sửa học kỳ mới làm vi phạm quy tắc môn tiên quyết
                  OR (dk."LoaiDieuKien" = 'hoc_truoc' AND NEW."HocKy" > ctm."HocKy")   -- Sửa học kỳ mới làm vi phạm quy tắc môn học trước
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Thao tác % môn "%" của ngành "%" gây ảnh hưởng hoặc làm sai lệch lộ trình học kỳ của môn phụ thuộc khác.',
                CASE WHEN TG_OP = 'DELETE' THEN 'XÓA' ELSE 'CẬP NHẬT' END, OLD."MaMonHoc", OLD."MaNganh";
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- Thiết lập Trigger chạy BEFORE trên bảng CHUONGTRINHHOC
DROP TRIGGER IF EXISTS trigger_rbtv07_cth ON "CHUONGTRINHHOC";
CREATE TRIGGER trigger_rbtv07_cth
BEFORE INSERT OR UPDATE OR DELETE ON "CHUONGTRINHHOC"
FOR EACH ROW EXECUTE FUNCTION func_check_rbtv07_ChuongTrinhHoc();

CREATE OR REPLACE FUNCTION func_check_rbtv07_DieuKienMonHoc()
RETURNS TRIGGER AS $$
BEGIN
    -- Ràng buộc chỉ cần kiểm tra khi dữ liệu mối quan hệ này ở trạng thái hoạt động (TrangThai = TRUE)
    IF NEW."TrangThai" = TRUE THEN
        -- Kiểm tra trên toàn bộ các ngành xem có ngành nào đang chứa môn M (NEW.MaMonHoc) nhưng vi phạm điều kiện mới này không
        IF EXISTS (
            SELECT 1
            FROM "CHUONGTRINHHOC" ctm
            LEFT JOIN "CHUONGTRINHHOC" ctdk
                ON ctdk."MaNganh" = ctm."MaNganh" AND ctdk."MaMonHoc" = NEW."MaMonDieuKien"
            WHERE ctm."MaMonHoc" = NEW."MaMonHoc"
              AND (
                  ctdk."MaMonHoc" IS NULL -- Ngành đó có môn M nhưng chưa xếp môn điều kiện D vào chương trình học
                  OR (NEW."LoaiDieuKien" = 'tien_quyet' AND ctdk."HocKy" >= ctm."HocKy") -- Vi phạm học kỳ môn tiên quyết
                  OR (NEW."LoaiDieuKien" = 'hoc_truoc' AND ctdk."HocKy" > ctm."HocKy")   -- Vi phạm học kỳ môn học trước
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Không thể thiết lập điều kiện (Môn "%" cần môn "%" là "%") vì phân bổ học kỳ hiện tại trong chương trình học của ngành không tương thích.',
                NEW."MaMonHoc", NEW."MaMonDieuKien", NEW."LoaiDieuKien";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Thiết lập Trigger chạy BEFORE trên bảng DIEUKIENMONHOC
DROP TRIGGER IF EXISTS trigger_rbtv07_dkmh ON "DIEUKIENMONHOC";
CREATE TRIGGER trigger_rbtv07_dkmh
BEFORE INSERT OR UPDATE OF "MaMonHoc", "MaMonDieuKien", "LoaiDieuKien", "TrangThai" ON "DIEUKIENMONHOC"
FOR EACH ROW EXECUTE FUNCTION func_check_rbtv07_DieuKienMonHoc();


--Tạo Trigger RBV22
-- =====================================================
-- TRIGGER 1: Kiểm tra LoaiDangKy khi INSERT/UPDATE CHITIETDANGKY
-- =====================================================
-- Mục đích: Khi sinh viên đăng ký môn, kiểm tra LoaiDangKy có phù hợp
-- với lịch sử học hay không
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv22_check_loai_dang_ky()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_sv VARCHAR(15);
    v_ma_mon_hoc VARCHAR(15);
    v_loai_dang_ky VARCHAR(20);
    v_count_rot INTEGER;
    v_count_qua_mon INTEGER;
    v_count_total INTEGER;
BEGIN
    -- Lấy thông tin sinh viên từ PHIEUDANGKY
    SELECT pd."MaSv"
    INTO v_ma_sv
    FROM "PHIEUDANGKY" pd
    WHERE pd."SoPhieu" = NEW."SoPhieu";

    v_ma_mon_hoc := NEW."MaMonHoc";
    v_loai_dang_ky := COALESCE(NEW."LoaiDangKy", 'hoc_moi');

    -- ===== KIỂM TRA LOẠI ĐĂNG KÝ =====
    IF v_loai_dang_ky = 'hoc_moi' THEN
        -- hoc_moi: Chưa có lịch sử học môn M
        SELECT COUNT(*)
        INTO v_count_total
        FROM "MONDAHOC" mdh
        WHERE mdh."MaSv" = v_ma_sv AND mdh."MaMonHoc" = v_ma_mon_hoc;

        IF v_count_total > 0 THEN
            RAISE EXCEPTION 'RBTV22: Loại đăng ký "hoc_moi" không hợp lệ. Sinh viên % đã có lịch sử học môn %',
                v_ma_sv, v_ma_mon_hoc;
        END IF;

    ELSIF v_loai_dang_ky = 'hoc_lai' THEN
        -- hoc_lai: Tồn tại MONDAHOC(SV, M, KetQua = 'rot')
        -- và chưa có lần qua_mon
        SELECT COUNT(*)
        INTO v_count_rot
        FROM "MONDAHOC" mdh
        WHERE mdh."MaSv" = v_ma_sv
          AND mdh."MaMonHoc" = v_ma_mon_hoc
          AND mdh."KetQua" = 'rot';

        SELECT COUNT(*)
        INTO v_count_qua_mon
        FROM "MONDAHOC" mdh
        WHERE mdh."MaSv" = v_ma_sv
          AND mdh."MaMonHoc" = v_ma_mon_hoc
          AND mdh."KetQua" = 'qua_mon';

        -- Phải có ít nhất 1 lần rớt và chưa qua
        IF v_count_rot = 0 THEN
            RAISE EXCEPTION 'RBTV22: Loại đăng ký "hoc_lai" không hợp lệ. Sinh viên % chưa rớt môn %',
                v_ma_sv, v_ma_mon_hoc;
        END IF;

        IF v_count_qua_mon > 0 THEN
            RAISE EXCEPTION 'RBTV22: Loại đăng ký "hoc_lai" không hợp lệ. Sinh viên % đã qua môn % rồi',
                v_ma_sv, v_ma_mon_hoc;
        END IF;

    ELSIF v_loai_dang_ky = 'hoc_cai_thien' THEN
        -- hoc_cai_thien: Tồn tại MONDAHOC(SV, M, KetQua = 'qua_mon')
        SELECT COUNT(*)
        INTO v_count_qua_mon
        FROM "MONDAHOC" mdh
        WHERE mdh."MaSv" = v_ma_sv
          AND mdh."MaMonHoc" = v_ma_mon_hoc
          AND mdh."KetQua" = 'qua_mon';

        IF v_count_qua_mon = 0 THEN
            RAISE EXCEPTION 'RBTV22: Loại đăng ký "hoc_cai_thien" không hợp lệ. Sinh viên % chưa qua môn %',
                v_ma_sv, v_ma_mon_hoc;
        END IF;

    ELSE
        RAISE EXCEPTION 'RBTV22: Loại đăng ký không hợp lệ: %', v_loai_dang_ky;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv22_check_loai_dang_ky ON "CHITIETDANGKY";

-- Tạo trigger cho INSERT và UPDATE
CREATE TRIGGER trg_rbtv22_check_loai_dang_ky
BEFORE INSERT OR UPDATE ON "CHITIETDANGKY"
FOR EACH ROW
WHEN (NEW."TrangThai" = 'Đã đăng ký')
EXECUTE FUNCTION fn_rbtv22_check_loai_dang_ky();


-- =====================================================
-- TRIGGER 2: Kiểm tra lại CHITIETDANGKY khi INSERT/UPDATE/DELETE MONDAHOC
-- =====================================================
-- Mục đích: Khi thêm/sửa/xóa lịch sử học, kiểm tra các đăng ký hiện tại
-- có còn hợp lệ không
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv22_validate_registrations_on_history_change()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_sv VARCHAR(15);
    v_ma_mon_hoc VARCHAR(15);
    v_ket_qua VARCHAR(20);
    v_registration RECORD;
    v_loai_dang_ky VARCHAR(20);
    v_count_rot INTEGER;
    v_count_qua_mon INTEGER;
    v_count_total INTEGER;
BEGIN
    -- Lấy thông tin từ MONDAHOC
    IF TG_OP = 'DELETE' THEN
        v_ma_sv := OLD."MaSv";
        v_ma_mon_hoc := OLD."MaMonHoc";
        v_ket_qua := OLD."KetQua";
    ELSE
        v_ma_sv := NEW."MaSv";
        v_ma_mon_hoc := NEW."MaMonHoc";
        v_ket_qua := NEW."KetQua";
    END IF;

    -- Tìm tất cả các đăng ký của sinh viên này để môn này
    FOR v_registration IN
        SELECT ctdk."SoPhieu", ctdk."LoaiDangKy"
        FROM "CHITIETDANGKY" ctdk
        INNER JOIN "PHIEUDANGKY" pd ON ctdk."SoPhieu" = pd."SoPhieu"
        WHERE pd."MaSv" = v_ma_sv
          AND ctdk."MaMonHoc" = v_ma_mon_hoc
          AND ctdk."TrangThai" = 'Đã đăng ký'
    LOOP
        v_loai_dang_ky := v_registration."LoaiDangKy";

        -- Kiểm tra tính hợp lệ của loại đăng ký
        IF v_loai_dang_ky = 'hoc_moi' THEN
            -- hoc_moi: Chưa có lịch sử học môn
            SELECT COUNT(*)
            INTO v_count_total
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv
              AND mdh."MaMonHoc" = v_ma_mon_hoc
              AND (TG_OP = 'DELETE' OR mdh."MaHocKy" != NEW."MaHocKy" OR mdh."MaSv" != NEW."MaSv");

            IF v_count_total > 0 THEN
                RAISE EXCEPTION 'RBTV22: Đăng ký "hoc_moi" của SV % môn % trở nên không hợp lệ',
                    v_ma_sv, v_ma_mon_hoc;
            END IF;

        ELSIF v_loai_dang_ky = 'hoc_lai' THEN
            -- hoc_lai: Phải có rớt và chưa qua
            SELECT COUNT(*)
            INTO v_count_rot
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv
              AND mdh."MaMonHoc" = v_ma_mon_hoc
              AND mdh."KetQua" = 'rot';

            SELECT COUNT(*)
            INTO v_count_qua_mon
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv
              AND mdh."MaMonHoc" = v_ma_mon_hoc
              AND mdh."KetQua" = 'qua_mon';

            IF v_count_rot = 0 THEN
                RAISE EXCEPTION 'RBTV22: Đăng ký "hoc_lai" của SV % môn % trở nên không hợp lệ (không có rớt)',
                    v_ma_sv, v_ma_mon_hoc;
            END IF;

            IF v_count_qua_mon > 0 THEN
                RAISE EXCEPTION 'RBTV22: Đăng ký "hoc_lai" của SV % môn % trở nên không hợp lệ (đã qua rồi)',
                    v_ma_sv, v_ma_mon_hoc;
            END IF;

        ELSIF v_loai_dang_ky = 'hoc_cai_thien' THEN
            -- hoc_cai_thien: Phải có qua_mon
            SELECT COUNT(*)
            INTO v_count_qua_mon
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv
              AND mdh."MaMonHoc" = v_ma_mon_hoc
              AND mdh."KetQua" = 'qua_mon';

            IF v_count_qua_mon = 0 THEN
                RAISE EXCEPTION 'RBTV22: Đăng ký "hoc_cai_thien" của SV % môn % trở nên không hợp lệ (chưa qua)',
                    v_ma_sv, v_ma_mon_hoc;
            END IF;
        END IF;
    END LOOP;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv22_mondahoc_insert ON "MONDAHOC";
DROP TRIGGER IF EXISTS trg_rbtv22_mondahoc_update ON "MONDAHOC";
DROP TRIGGER IF EXISTS trg_rbtv22_mondahoc_delete ON "MONDAHOC";

-- Tạo trigger
CREATE TRIGGER trg_rbtv22_mondahoc_insert
AFTER INSERT ON "MONDAHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv22_validate_registrations_on_history_change();

CREATE TRIGGER trg_rbtv22_mondahoc_update
AFTER UPDATE ON "MONDAHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv22_validate_registrations_on_history_change();

CREATE TRIGGER trg_rbtv22_mondahoc_delete
BEFORE DELETE ON "MONDAHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv22_validate_registrations_on_history_change();


--Tạo Trigger RBTV23
CREATE OR REPLACE FUNCTION fn_rbtv23_get_semester_order(p_ma_hoc_ky VARCHAR)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT CAST(SUBSTRING("MaNamHoc", 1, 4) AS INTEGER) * 10 + COALESCE("ThuTu", 1)
            FROM "HOCKY" WHERE "MaHocKy" = p_ma_hoc_ky);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- =====================================================
-- TRIGGER 1: Kiểm tra điều kiện khi INSERT/UPDATE CHITIETDANGKY
-- =====================================================
-- Mục đích: Khi sinh viên đăng ký một môn học, kiểm tra xem sinh viên có thỏa
-- các điều kiện tiên quyết/học trước hay không.
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv23_check_prerequisite_on_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_sv VARCHAR(15);
    v_ma_mon_hoc VARCHAR(15);
    v_ma_hoc_ky VARCHAR(15);
    v_hoc_ky_dang_ky INTEGER;
    v_loai_dieu_kien VARCHAR(20);
    v_ma_mon_dieu_kien VARCHAR(15);
    v_count_tien_quyet INTEGER;
    v_count_hoc_truoc INTEGER;
    v_count_cung_phieu INTEGER;
    v_dieu_kien RECORD;
BEGIN
    -- Lấy thông tin từ PHIEUDANGKY
    SELECT pd."MaSv", pd."MaHocKy"
    INTO v_ma_sv, v_ma_hoc_ky
    FROM "PHIEUDANGKY" pd
    WHERE pd."SoPhieu" = NEW."SoPhieu";

    -- Lấy mã môn học từ NEW record
    v_ma_mon_hoc := NEW."MaMonHoc";

    -- Lấy thứ tự học kỳ đăng ký
    v_hoc_ky_dang_ky := fn_rbtv23_get_semester_order(v_ma_hoc_ky);

    -- ===== KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT/HỌC TRƯỚC =====
    -- Lặp qua tất cả các điều kiện của môn đăng ký
    FOR v_dieu_kien IN
        SELECT d."MaMonDieuKien", d."LoaiDieuKien"
        FROM "DIEUKIENMONHOC" d
        WHERE d."MaMonHoc" = v_ma_mon_hoc AND d."TrangThai" = TRUE
    LOOP
        v_ma_mon_dieu_kien := v_dieu_kien."MaMonDieuKien";
        v_loai_dieu_kien := v_dieu_kien."LoaiDieuKien";

        IF v_loai_dieu_kien = 'tien_quyet' THEN
            -- ===== KIỂM TRA TIÊN QUYẾT (tien_quyet) =====
            -- Sinh viên phải đã học xong môn D với kết quả "qua_mon"
            -- TRONG HỌC KỲ TRƯỚC học kỳ đăng ký
            SELECT COUNT(*)
            INTO v_count_tien_quyet
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv
              AND mdh."MaMonHoc" = v_ma_mon_dieu_kien
              AND mdh."KetQua" = 'qua_mon'
              AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky;

            -- Nếu không có môn tiên quyết → Lỗi
            IF v_count_tien_quyet = 0 THEN
                RAISE EXCEPTION 'Vi phạm RBTV23: Sinh viên % chưa đạt tiên quyết % để đăng ký %',
                    v_ma_sv, v_ma_mon_dieu_kien, v_ma_mon_hoc;
            END IF;

        ELSIF v_loai_dieu_kien = 'hoc_truoc' THEN
            -- ===== KIỂM TRA HỌC TRƯỚC (hoc_truoc) =====
            -- Sinh viên phải từng học xong môn D TRƯỚC ĐÓ
            -- HOẶC đăng ký đồng thời môn D trong CÙNG phiếu/học kỳ

            -- Kiểm tra: Sinh viên đã học môn này trong học kỳ trước chưa?
            SELECT COUNT(*)
            INTO v_count_hoc_truoc
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv
              AND mdh."MaMonHoc" = v_ma_mon_dieu_kien
              AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky;

            -- Nếu chưa học trước, kiểm tra có đăng ký cùng phiếu không
            IF v_count_hoc_truoc = 0 THEN
                SELECT COUNT(*)
                INTO v_count_cung_phieu
                FROM "CHITIETDANGKY" ctdk
                WHERE ctdk."SoPhieu" = NEW."SoPhieu"
                  AND ctdk."MaMonHoc" = v_ma_mon_dieu_kien
                  AND ctdk."TrangThai" = 'Đã đăng ký';

                -- Nếu không đăng ký cùng phiếu → Lỗi
                IF v_count_cung_phieu = 0 THEN
                    RAISE EXCEPTION 'Vi phạm RBTV23: Sinh viên % phải học trước hoặc đăng ký cùng lúc %',
                        v_ma_sv, v_ma_mon_dieu_kien;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv23_check_prerequisite_on_registration ON "CHITIETDANGKY";

-- Tạo trigger cho INSERT và UPDATE
CREATE TRIGGER trg_rbtv23_check_prerequisite_on_registration
BEFORE INSERT OR UPDATE ON "CHITIETDANGKY"
FOR EACH ROW
WHEN (NEW."TrangThai" = 'Đã đăng ký')
EXECUTE FUNCTION fn_rbtv23_check_prerequisite_on_registration();


-- =====================================================
-- TRIGGER 2: Kiểm tra lại đăng ký hiện tại khi thay đổi DIEUKIENMONHOC
-- =====================================================
-- Mục đích: Khi thêm/sửa/xóa điều kiện, kiểm tra các đăng ký hiện tại có vi phạm không
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv23_validate_registrations_on_condition_change()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_mon_hoc VARCHAR(15);
    v_ma_mon_dieu_kien VARCHAR(15);
    v_loai_dieu_kien VARCHAR(20);
    v_registration RECORD;
    v_ma_sv VARCHAR(15);
    v_ma_hoc_ky VARCHAR(15);
    v_hoc_ky_dang_ky INTEGER;
    v_count_met INTEGER;
BEGIN
    -- Xác định môn học và điều kiện được thay đổi
    IF TG_OP = 'DELETE' THEN
        v_ma_mon_hoc := OLD."MaMonHoc";
        v_ma_mon_dieu_kien := OLD."MaMonDieuKien";
        v_loai_dieu_kien := OLD."LoaiDieuKien";
    ELSE
        v_ma_mon_hoc := NEW."MaMonHoc";
        v_ma_mon_dieu_kien := NEW."MaMonDieuKien";
        v_loai_dieu_kien := NEW."LoaiDieuKien";
    END IF;

    -- Chỉ kiểm tra nếu điều kiện đang hoạt động (hoặc được kích hoạt)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW."TrangThai" = TRUE) OR TG_OP = 'DELETE' THEN
        -- Lặp qua tất cả các đăng ký của môn này
        FOR v_registration IN
            SELECT ctdk."SoPhieu", pd."MaSv", pd."MaHocKy"
            FROM "CHITIETDANGKY" ctdk
            INNER JOIN "PHIEUDANGKY" pd ON ctdk."SoPhieu" = pd."SoPhieu"
            WHERE ctdk."MaMonHoc" = v_ma_mon_hoc
              AND ctdk."TrangThai" = 'Đã đăng ký'
        LOOP
            v_ma_sv := v_registration."MaSv";
            v_ma_hoc_ky := v_registration."MaHocKy";
            v_hoc_ky_dang_ky := fn_rbtv23_get_semester_order(v_ma_hoc_ky);

            -- Kiểm tra điều kiện
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW."TrangThai" = TRUE THEN
                IF v_loai_dieu_kien = 'tien_quyet' THEN
                    -- Kiểm tra tiên quyết
                    SELECT COUNT(*) INTO v_count_met
                    FROM "MONDAHOC" mdh
                    WHERE mdh."MaSv" = v_ma_sv
                      AND mdh."MaMonHoc" = v_ma_mon_dieu_kien
                      AND mdh."KetQua" = 'qua_mon'
                      AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky;

                    IF v_count_met = 0 THEN
                        RAISE EXCEPTION 'Vi phạm RBTV23: Điều kiện tiên quyết vi phạm - SV: % môn: %',
                            v_ma_sv, v_ma_mon_hoc;
                    END IF;

                ELSIF v_loai_dieu_kien = 'hoc_truoc' THEN
                    -- Kiểm tra học trước
                    SELECT COUNT(*) INTO v_count_met
                    FROM "MONDAHOC" mdh
                    WHERE mdh."MaSv" = v_ma_sv
                      AND mdh."MaMonHoc" = v_ma_mon_dieu_kien
                      AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky;

                    IF v_count_met = 0 THEN
                        -- Kiểm tra có đăng ký cùng phiếu không
                        SELECT COUNT(*) INTO v_count_met
                        FROM "CHITIETDANGKY" ctdk
                        WHERE ctdk."SoPhieu" = v_registration."SoPhieu"
                          AND ctdk."MaMonHoc" = v_ma_mon_dieu_kien
                          AND ctdk."TrangThai" = 'Đã đăng ký';

                        IF v_count_met = 0 THEN
                            RAISE EXCEPTION 'Vi phạm RBTV23: Điều kiện học trước vi phạm - SV: % môn: %',
                                v_ma_sv, v_ma_mon_hoc;
                        END IF;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv23_check_condition_insert ON "DIEUKIENMONHOC";
DROP TRIGGER IF EXISTS trg_rbtv23_check_condition_update ON "DIEUKIENMONHOC";
DROP TRIGGER IF EXISTS trg_rbtv23_check_condition_delete ON "DIEUKIENMONHOC";

-- Tạo trigger
CREATE TRIGGER trg_rbtv23_check_condition_insert
BEFORE INSERT ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv23_validate_registrations_on_condition_change();

CREATE TRIGGER trg_rbtv23_check_condition_update
BEFORE UPDATE ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv23_validate_registrations_on_condition_change();

CREATE TRIGGER trg_rbtv23_check_condition_delete
BEFORE DELETE ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv23_validate_registrations_on_condition_change();


-- =====================================================
-- TRIGGER 3: Kiểm tra đăng ký tương lai khi thay đổi MONDAHOC
-- =====================================================
-- Mục đích: Khi thêm/sửa/xóa kết quả học, kiểm tra các đăng ký tương lai có ảnh hưởng không
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv23_validate_future_registrations()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_sv VARCHAR(15);
    v_ma_mon_hoc VARCHAR(15);
    v_hoc_ky_hoan_thanh INTEGER;
    v_dependent_mon RECORD;
    v_registration RECORD;
    v_loai_dieu_kien VARCHAR(20);
    v_ma_hoc_ky_dang_ky VARCHAR(15);
    v_hoc_ky_dang_ky INTEGER;
    v_count_met INTEGER;
BEGIN
    -- Lấy thông tin môn vừa hoàn thành/thay đổi
    IF TG_OP = 'DELETE' THEN
        v_ma_sv := OLD."MaSv";
        v_ma_mon_hoc := OLD."MaMonHoc";
    ELSE
        v_ma_sv := NEW."MaSv";
        v_ma_mon_hoc := NEW."MaMonHoc";
    END IF;

    -- Lấy thứ tự học kỳ hoàn thành
    IF TG_OP = 'DELETE' THEN
        v_hoc_ky_hoan_thanh := fn_rbtv23_get_semester_order(OLD."MaHocKy");
    ELSE
        v_hoc_ky_hoan_thanh := fn_rbtv23_get_semester_order(NEW."MaHocKy");
    END IF;

    -- Tìm tất cả các môn học có điều kiện phụ thuộc vào môn này
    FOR v_dependent_mon IN
        SELECT "MaMonHoc", "LoaiDieuKien"
        FROM "DIEUKIENMONHOC"
        WHERE "MaMonDieuKien" = v_ma_mon_hoc AND "TrangThai" = TRUE
    LOOP
        -- Tìm các đăng ký của môn phụ thuộc
        FOR v_registration IN
            SELECT ctdk."SoPhieu", pd."MaHocKy"
            FROM "CHITIETDANGKY" ctdk
            INNER JOIN "PHIEUDANGKY" pd ON ctdk."SoPhieu" = pd."SoPhieu"
            WHERE pd."MaSv" = v_ma_sv
              AND ctdk."MaMonHoc" = v_dependent_mon."MaMonHoc"
              AND ctdk."TrangThai" = 'Đã đăng ký'
        LOOP
            v_ma_hoc_ky_dang_ky := v_registration."MaHocKy";
            v_hoc_ky_dang_ky := fn_rbtv23_get_semester_order(v_ma_hoc_ky_dang_ky);
            v_loai_dieu_kien := v_dependent_mon."LoaiDieuKien";

            -- Chỉ kiểm tra nếu đăng ký này >= học kỳ hoàn thành
            IF v_hoc_ky_dang_ky >= v_hoc_ky_hoan_thanh THEN
                IF v_loai_dieu_kien = 'tien_quyet' THEN
                    -- Nếu xóa hoặc kết quả không phải qua_mon → kiểm tra lại
                    IF TG_OP = 'DELETE' OR NEW."KetQua" != 'qua_mon' THEN
                        SELECT COUNT(*) INTO v_count_met
                        FROM "MONDAHOC" mdh
                        WHERE mdh."MaSv" = v_ma_sv
                          AND mdh."MaMonHoc" = v_ma_mon_hoc
                          AND mdh."KetQua" = 'qua_mon'
                          AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky
                          AND (TG_OP = 'DELETE' OR mdh.id != NEW.id);

                        IF v_count_met = 0 THEN
                            RAISE EXCEPTION 'RBTV23: Thay đổi kết quả vi phạm tiên quyết - SV: % môn: %',
                                v_ma_sv, v_dependent_mon."MaMonHoc";
                        END IF;
                    END IF;

                ELSIF v_loai_dieu_kien = 'hoc_truoc' THEN
                    -- Nếu xóa record → kiểm tra có đăng ký cùng phiếu không
                    IF TG_OP = 'DELETE' THEN
                        SELECT COUNT(*) INTO v_count_met
                        FROM "CHITIETDANGKY" ctdk
                        WHERE ctdk."SoPhieu" = v_registration."SoPhieu"
                          AND ctdk."MaMonHoc" = v_ma_mon_hoc
                          AND ctdk."TrangThai" = 'Đã đăng ký';

                        IF v_count_met = 0 THEN
                            RAISE EXCEPTION 'Vi phạm RBTV23: Xóa kết quả học vi phạm học trước - SV: % môn: %',
                                v_ma_sv, v_dependent_mon."MaMonHoc";
                        END IF;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv23_check_mondahoc_change ON "MONDAHOC";

-- Tạo trigger
CREATE TRIGGER trg_rbtv23_check_mondahoc_change
BEFORE INSERT OR UPDATE OR DELETE ON "MONDAHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv23_validate_future_registrations();
--RBTV 08
-- Tạo function xử lý logic kiểm tra RBTV08 (Điều kiện nới lỏng)
CREATE OR REPLACE FUNCTION fn_check_rbtv08_namhoc_relaxed()
RETURNS TRIGGER AS $$
BEGIN
    -- Kiểm tra điều kiện NamKetThuc phải lớn hơn NamBatDau
    IF NEW."NamKetThuc" <= NEW."NamBatDau" THEN
        RAISE EXCEPTION 'Vi phạm RBTV08: Năm kết thúc (%) phải lớn hơn năm bắt đầu (%).', NEW."NamKetThuc", NEW."NamBatDau";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger gắn vào bảng NAMHOC
DROP TRIGGER IF EXISTS trg_rbtv08_namhoc_relaxed ON "NAMHOC";

CREATE TRIGGER trg_rbtv08_namhoc_relaxed
BEFORE INSERT OR UPDATE OF "NamBatDau", "NamKetThuc"
ON "NAMHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv08_namhoc_relaxed();
--RBTV 09
-- Tạo function xử lý cho bảng HOCKY
CREATE OR REPLACE FUNCTION fn_check_rbtv09_hocky()
RETURNS TRIGGER AS $$
BEGIN
    /* 1. Kiểm tra thứ tự theo loại học kỳ */
    IF NEW."LoaiHocKy" = 'Chính' AND NEW."ThuTu" NOT IN (1, 2) THEN
        RAISE EXCEPTION 'RBTV09: Học kỳ Chính phải có ThuTu là 1 hoặc 2.';
    END IF;

    IF NEW."LoaiHocKy" = 'Hè' AND NEW."ThuTu" != 3 THEN
        RAISE EXCEPTION 'RBTV09: Học kỳ Hè phải có ThuTu là 3.';
    END IF;

    /* 2. Kiểm tra tính duy nhất UNIQUE(MaNamHoc, ThuTu) */
    IF EXISTS (
        SELECT 1 FROM "HOCKY"
        WHERE "MaNamHoc" = NEW."MaNamHoc"
          AND "ThuTu" = NEW."ThuTu"
          AND "MaHocKy" IS DISTINCT FROM NEW."MaHocKy"
    ) THEN
        RAISE EXCEPTION 'RBTV09: Học kỳ có thứ tự % đã tồn tại trong năm học %.', NEW."ThuTu", NEW."MaNamHoc";
    END IF;

    /* 3. Kiểm tra logic các mốc thời gian (bỏ qua nếu dữ liệu NULL) */
    IF NEW."NgayBatDau" IS NOT NULL AND NEW."NgayKetThuc" IS NOT NULL THEN
        IF NEW."NgayBatDau" >= NEW."NgayKetThuc" THEN
            RAISE EXCEPTION 'RBTV09: NgayBatDau phải nhỏ hơn NgayKetThuc.';
        END IF;
    END IF;

    IF NEW."NgayBatDauDangKy" IS NOT NULL AND NEW."NgayKetThucDangKy" IS NOT NULL THEN
        IF NEW."NgayBatDauDangKy" > NEW."NgayKetThucDangKy" THEN
            RAISE EXCEPTION 'RBTV09: NgayBatDauDangKy phải nhỏ hơn hoặc bằng NgayKetThucDangKy.';
        END IF;
    END IF;

    IF NEW."NgayKetThucDangKy" IS NOT NULL AND NEW."NgayKetThuc" IS NOT NULL THEN
        /* Ép kiểu TIMESTAMP về DATE để so sánh chính xác với NgayKetThuc (kiểu DATE) */
        IF NEW."NgayKetThucDangKy"::DATE > NEW."NgayKetThuc" THEN
            RAISE EXCEPTION 'RBTV09: NgayKetThucDangKy không được lớn hơn NgayKetThuc.';
        END IF;
    END IF;

    IF NEW."NgayBatDauCuuXet" IS NOT NULL AND NEW."NgayKetThucCuuXet" IS NOT NULL THEN
        IF NEW."NgayBatDauCuuXet" > NEW."NgayKetThucCuuXet" THEN
            RAISE EXCEPTION 'RBTV09: NgayBatDauCuuXet phải nhỏ hơn hoặc bằng NgayKetThucCuuXet.';
        END IF;
    END IF;

    IF NEW."NgayBatDauCuuXet" IS NOT NULL AND NEW."NgayKetThucDangKy" IS NOT NULL THEN
        IF NEW."NgayBatDauCuuXet" <= NEW."NgayKetThucDangKy" THEN
            RAISE EXCEPTION 'RBTV09: Thời gian cứu xét phải bắt đầu sau khi kết thúc đăng ký.';
        END IF;
    END IF;

    IF NEW."NgayKetThucCuuXet" IS NOT NULL AND NEW."NgayBatDau" IS NOT NULL THEN
        IF NEW."NgayKetThucCuuXet"::DATE > NEW."NgayBatDau" THEN
            RAISE EXCEPTION 'RBTV09: NgayKetThucCuuXet không được lớn hơn NgayBatDau học kỳ.';
        END IF;
    END IF;

    IF NEW."HanDongHocPhi" IS NOT NULL AND NEW."NgayBatDau" IS NOT NULL THEN
        IF NEW."HanDongHocPhi" < NEW."NgayBatDau" THEN
            RAISE EXCEPTION 'RBTV09: HanDongHocPhi phải lớn hơn hoặc bằng NgayBatDau.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng HOCKY
CREATE TRIGGER trg_rbtv09_hocky_ins_upd
BEFORE INSERT OR UPDATE ON "HOCKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv09_hocky();
-- Tạo function xử lý cho bảng NAMHOC
CREATE OR REPLACE FUNCTION fn_check_rbtv09_namhoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Kiểm tra nếu người dùng đổi MaNamHoc sang một mã khác có sẵn,
     đảm bảo không bị gộp/trùng (UNIQUE MaNamHoc, ThuTu) ở bảng HOCKY.
    */
    IF NEW."MaNamHoc" IS DISTINCT FROM OLD."MaNamHoc" THEN
        IF EXISTS (
            SELECT "ThuTu"
            FROM "HOCKY"
            WHERE "MaNamHoc" = NEW."MaNamHoc"
            GROUP BY "ThuTu"
            HAVING COUNT(*) > 1
        ) THEN
            RAISE EXCEPTION 'RBTV09: Thay đổi MaNamHoc dẫn đến trùng lặp thứ tự học kỳ bên bảng HOCKY.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng NAMHOC
CREATE TRIGGER trg_rbtv09_namhoc_upd
AFTER UPDATE OF "MaNamHoc" ON "NAMHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv09_namhoc();
--RBTV10
-- Tạo function xử lý cho bảng LOP
CREATE OR REPLACE FUNCTION fn_check_rbtv10_lop()
RETURNS TRIGGER AS $$
BEGIN
    /* Kiểm tra SoLuongToiDa phải dương (> 0) */
    IF NEW."SoLuongToiDa" IS NOT NULL AND NEW."SoLuongToiDa" <= 0 THEN
        RAISE EXCEPTION 'RBTV10: Sĩ số tối đa của lớp (%) phải lớn hơn 0.', NEW."SoLuongToiDa";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOP
CREATE TRIGGER trg_rbtv10_lop_ins_upd
BEFORE INSERT OR UPDATE OF "SoLuongToiDa" ON "LOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv10_lop();
--RBTV11
CREATE OR REPLACE FUNCTION fn_check_rbtv11_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    thu_tu_bat_dau INTEGER;
    thu_tu_ket_thuc INTEGER;
BEGIN
    /* Lấy giá trị ThuTu của tiết bắt đầu từ bảng TIETHOC */
    SELECT "ThuTu" INTO thu_tu_bat_dau
    FROM "TIETHOC"
    WHERE "MaTiet" = NEW."MaTietBatDau";

    /* Lấy giá trị ThuTu của tiết kết thúc từ bảng TIETHOC */
    SELECT "ThuTu" INTO thu_tu_ket_thuc
    FROM "TIETHOC"
    WHERE "MaTiet" = NEW."MaTietKetThuc";

    /* Kiểm tra ràng buộc: Thứ tự tiết bắt đầu <= Thứ tự tiết kết thúc */
    IF thu_tu_bat_dau > thu_tu_ket_thuc THEN
        RAISE EXCEPTION 'RBTV11: Tiết bắt đầu (thứ tự %) không được sau tiết kết thúc (thứ tự %).', thu_tu_bat_dau, thu_tu_ket_thuc;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv11_lichhoclop_ins_upd
BEFORE INSERT OR UPDATE OF "MaTietBatDau", "MaTietKetThuc" ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv11_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv11_tiethoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu giá trị ThuTu thực sự bị thay đổi */
    IF NEW."ThuTu" IS DISTINCT FROM OLD."ThuTu" THEN

        /* Trường hợp 1: Tiết đang sửa đóng vai trò là MaTietBatDau trong LICHHOCLOP.
           Thứ tự mới của nó không được lớn hơn thứ tự của tiết kết thúc tương ứng.
        */
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" l
            JOIN "TIETHOC" t_kt ON l."MaTietKetThuc" = t_kt."MaTiet"
            WHERE l."MaTietBatDau" = NEW."MaTiet"
              AND NEW."ThuTu" > t_kt."ThuTu"
        ) THEN
            RAISE EXCEPTION 'RBTV11: Việc cập nhật ThuTu làm vi phạm lịch học hiện tại (tiết bắt đầu sau tiết kết thúc).';
        END IF;

        /* Trường hợp 2: Tiết đang sửa đóng vai trò là MaTietKetThuc trong LICHHOCLOP.
           Thứ tự mới của nó không được nhỏ hơn thứ tự của tiết bắt đầu tương ứng.
        */
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" l
            JOIN "TIETHOC" t_bd ON l."MaTietBatDau" = t_bd."MaTiet"
            WHERE l."MaTietKetThuc" = NEW."MaTiet"
              AND t_bd."ThuTu" > NEW."ThuTu"
        ) THEN
            RAISE EXCEPTION 'RBTV11: Việc cập nhật ThuTu làm vi phạm lịch học hiện tại (tiết kết thúc trước tiết bắt đầu).';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv11_tiethoc_upd
BEFORE UPDATE OF "ThuTu" ON "TIETHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv11_tiethoc();
--RBTV12
CREATE OR REPLACE FUNCTION fn_check_rbtv12_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    new_bd_thutu INT;
    new_kt_thutu INT;
BEGIN
    /* 1. Lấy thứ tự (ThuTu) của tiết bắt đầu và tiết kết thúc của dòng đang thao tác */
    SELECT "ThuTu" INTO new_bd_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
    SELECT "ThuTu" INTO new_kt_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";

    /* 2. Kiểm tra xem có dòng nào khác cùng LopMoId, cùng ThuTrongTuan mà bị giao khoảng tiết hay không */
    IF EXISTS (
        SELECT 1
        FROM "LICHHOCLOP" lh
        JOIN "TIETHOC" bd ON lh."MaTietBatDau" = bd."MaTiet"
        JOIN "TIETHOC" kt ON lh."MaTietKetThuc" = kt."MaTiet"
        WHERE lh."LopMoId" = NEW."LopMoId"
          AND lh."ThuTrongTuan" = NEW."ThuTrongTuan"
          -- Loại trừ chính dòng hiện tại khi thực hiện thao tác UPDATE
          AND lh.id IS DISTINCT FROM NEW.id
          -- Công thức kiểm tra giao nhau: bd1.ThuTu <= kt2.ThuTu AND bd2.ThuTu <= kt1.ThuTu
          AND new_bd_thutu <= kt."ThuTu"
          AND bd."ThuTu" <= new_kt_thutu
    ) THEN
        RAISE EXCEPTION 'RBTV12: Lớp mở này đã có lịch học khác trùng/giao khoảng tiết vào Thứ %.', NEW."ThuTrongTuan";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LICHHOCLOP
CREATE TRIGGER trg_rbtv12_lichhoclop_ins_upd
BEFORE INSERT OR UPDATE OF "LopMoId", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc" ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv12_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv12_tiethoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ xử lý kiểm tra nếu thứ tự của tiết học thực sự bị thay đổi */
    IF NEW."ThuTu" IS DISTINCT FROM OLD."ThuTu" THEN

        /* Kiểm tra xem việc đổi thứ tự tiết này có làm bất kỳ lớp mở nào bị tự trùng lịch hay không */
        IF EXISTS (
            SELECT 1
            -- Tự bắt cặp nối lhl1 và lhl2 để tìm cặp lịch học bị xung đột trong cùng một lớp mở
            FROM "LICHHOCLOP" lh1
            JOIN "LICHHOCLOP" lh2 ON lh1."LopMoId" = lh2."LopMoId"
                                 AND lh1."ThuTrongTuan" = lh2."ThuTrongTuan"
                                 AND lh1.id < lh2.id
            -- Tham chiếu thứ tự của ca học thứ nhất
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            -- Tham chiếu thứ tự của ca học thứ hai
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE
                -- Áp dụng giá trị ThuTu mới nếu mã tiết trùng với tiết vừa sửa, ngược lại giữ nguyên ThuTu cũ
                (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) <=
                (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
                AND
                (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END) <=
                (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END)
        ) THEN
            RAISE EXCEPTION 'RBTV12: Không thể sửa ThuTu của tiết học này vì sẽ gián tiếp làm trùng lịch của một lớp mở đang vận hành.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng TIETHOC
CREATE TRIGGER trg_rbtv12_tiethoc_upd
BEFORE UPDATE OF "ThuTu" ON "TIETHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv12_tiethoc();
--RBTV13
CREATE OR REPLACE FUNCTION fn_check_rbtv13_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    v_mahocky VARCHAR(15);
    v_trangthai BOOLEAN;
    v_bd_thutu INT;
    v_kt_thutu INT;
BEGIN
    /* Bỏ qua kiểm tra nếu lịch học chưa được xếp phòng */
    IF COALESCE(NEW."MaPhong", NEW."PhongHoc") IS NULL OR TRIM(COALESCE(NEW."MaPhong", NEW."PhongHoc")) = '' THEN
        RETURN NEW;
    END IF;

    /* Lấy thông tin Học kỳ và Trạng thái của Lớp mở hiện tại */
    SELECT "MaHocKy", "TrangThai" INTO v_mahocky, v_trangthai
    FROM "LOPMO"
    WHERE id = NEW."LopMoId";

    /* Bỏ qua nếu lớp mở này đã ngừng hoạt động */
    IF NOT v_trangthai THEN
        RETURN NEW;
    END IF;

    /* Lấy thứ tự (ThuTu) của tiết bắt đầu và kết thúc */
    SELECT "ThuTu" INTO v_bd_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
    SELECT "ThuTu" INTO v_kt_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";

    /* Kiểm tra trùng phòng học (Giao nhau về thời gian, cùng phòng, cùng thứ, cùng học kỳ) */
    IF EXISTS (
        SELECT 1
        FROM "LICHHOCLOP" lh
        JOIN "LOPMO" lm ON lh."LopMoId" = lm.id
        JOIN "TIETHOC" bd ON lh."MaTietBatDau" = bd."MaTiet"
        JOIN "TIETHOC" kt ON lh."MaTietKetThuc" = kt."MaTiet"
        WHERE lh.id IS DISTINCT FROM NEW.id -- Loại trừ chính nó khi UPDATE
          AND COALESCE(lh."MaPhong", lh."PhongHoc") = COALESCE(NEW."MaPhong", NEW."PhongHoc")
          AND lh."ThuTrongTuan" = NEW."ThuTrongTuan"
          AND lm."MaHocKy" = v_mahocky
          AND lm."TrangThai" = TRUE -- Chỉ xét các lớp đang hoạt động
          -- Công thức kiểm tra giao khoảng tiết
          AND v_bd_thutu <= kt."ThuTu"
          AND bd."ThuTu" <= v_kt_thutu
    ) THEN
        RAISE EXCEPTION 'RBTV13: Phòng % đã có lớp khác học vào Thứ % (Học kỳ %).', COALESCE(NEW."MaPhong", NEW."PhongHoc"), NEW."ThuTrongTuan", v_mahocky;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv13_lichhoclop_ins_upd
BEFORE INSERT OR UPDATE OF "MaPhong", "PhongHoc", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "LopMoId" ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv13_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv13_lopmo()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu lớp chuyển sang trạng thái HOẠT ĐỘNG,
       và có sự thay đổi về Học kỳ hoặc Trạng thái. */
    IF NEW."TrangThai" = TRUE AND (NEW."TrangThai" IS DISTINCT FROM OLD."TrangThai" OR NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy") THEN

        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" lh1
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            -- Tìm lịch học của lớp khác cùng phòng, cùng thứ
            JOIN "LICHHOCLOP" lh2 ON COALESCE(lh1."MaPhong", lh1."PhongHoc") = COALESCE(lh2."MaPhong", lh2."PhongHoc")
                                 AND lh1."ThuTrongTuan" = lh2."ThuTrongTuan"
                                 AND lh1.id <> lh2.id
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE lh1."LopMoId" = NEW.id
              AND COALESCE(lh1."MaPhong", lh1."PhongHoc") IS NOT NULL
              AND TRIM(COALESCE(lh1."MaPhong", lh1."PhongHoc")) <> ''
              AND lm2."MaHocKy" = NEW."MaHocKy"
              AND lm2."TrangThai" = TRUE
              -- Công thức kiểm tra giao khoảng tiết
              AND bd1."ThuTu" <= kt2."ThuTu"
              AND bd2."ThuTu" <= kt1."ThuTu"
        ) THEN
            RAISE EXCEPTION 'RBTV13: Cập nhật thông tin lớp mở (%) gây trùng lịch phòng học trong học kỳ %.', NEW.id, NEW."MaHocKy";
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv13_lopmo_upd
BEFORE UPDATE OF "MaHocKy", "TrangThai" ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv13_lopmo();
CREATE OR REPLACE FUNCTION fn_check_rbtv13_tiethoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ quét lại hệ thống nếu ThuTu thực sự bị thay đổi */
    IF NEW."ThuTu" IS DISTINCT FROM OLD."ThuTu" THEN

        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" lh1
            JOIN "LOPMO" lm1 ON lh1."LopMoId" = lm1.id
            -- Tìm cặp lịch học bất kỳ trùng phòng, trùng thứ
            JOIN "LICHHOCLOP" lh2 ON COALESCE(lh1."MaPhong", lh1."PhongHoc") = COALESCE(lh2."MaPhong", lh2."PhongHoc")
                                  AND lh1."ThuTrongTuan" = lh2."ThuTrongTuan"
                                  AND lh1.id < lh2.id -- id < id để tránh bắt chéo 2 lần
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE COALESCE(lh1."MaPhong", lh1."PhongHoc") IS NOT NULL
              AND TRIM(COALESCE(lh1."MaPhong", lh1."PhongHoc")) <> ''
              AND lm1."MaHocKy" = lm2."MaHocKy" -- Cùng học kỳ
              AND lm1."TrangThai" = TRUE
              AND lm2."TrangThai" = TRUE -- Các lớp đều đang hoạt động
              -- Gắn ThuTu mới vào phép so sánh nếu mã tiết khớp với tiết đang sửa
              AND (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) <=
                  (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
              AND (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END) <=
                  (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END)
        ) THEN
            RAISE EXCEPTION 'RBTV13: Sửa ThuTu của tiết học này gián tiếp làm trùng phòng học giữa các lớp đang hoạt động.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv13_tiethoc_upd
BEFORE UPDATE OF "ThuTu" ON "TIETHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv13_tiethoc();
--RBTV14
CREATE OR REPLACE FUNCTION fn_check_rbtv14_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    v_mahocky VARCHAR(15);
    v_giangvien VARCHAR(100);
    v_trangthai BOOLEAN;
    v_bd_thutu INT;
    v_kt_thutu INT;
BEGIN
    /* Lấy thông tin Học kỳ, trạng thái và giảng viên từ lớp mở */
    SELECT lm."MaHocKy", lm."TrangThai", COALESCE(lm."MaGiangVien", lm."GiangVien")
    INTO v_mahocky, v_trangthai, v_giangvien
    FROM "LOPMO" lm
    WHERE lm.id = NEW."LopMoId";

    /* Bỏ qua nếu không có giảng viên hoặc lớp mở đang bị vô hiệu hóa */
    IF v_giangvien IS NULL OR TRIM(v_giangvien) = '' OR NOT v_trangthai THEN
        RETURN NEW;
    END IF;

    /* Lấy thứ tự (ThuTu) của tiết bắt đầu và kết thúc */
    SELECT "ThuTu" INTO v_bd_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
    SELECT "ThuTu" INTO v_kt_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";

    /* Kiểm tra xem giảng viên có bị trùng lịch trong cùng học kỳ không */
    IF EXISTS (
        SELECT 1
        FROM "LICHHOCLOP" lh
        JOIN "LOPMO" lm ON lh."LopMoId" = lm.id
        JOIN "TIETHOC" bd ON lh."MaTietBatDau" = bd."MaTiet"
        JOIN "TIETHOC" kt ON lh."MaTietKetThuc" = kt."MaTiet"
        WHERE lh.id IS DISTINCT FROM NEW.id
          AND COALESCE(lm."MaGiangVien", lm."GiangVien") = v_giangvien
          AND lh."ThuTrongTuan" = NEW."ThuTrongTuan"
          AND lm."MaHocKy" = v_mahocky
          AND lm."TrangThai" = TRUE
          -- Công thức kiểm tra giao khoảng tiết
          AND v_bd_thutu <= kt."ThuTu"
          AND bd."ThuTu" <= v_kt_thutu
    ) THEN
        RAISE EXCEPTION 'RBTV14: Giảng viên % đã có lịch dạy trùng thời gian vào Thứ % (Học kỳ %).', v_giangvien, NEW."ThuTrongTuan", v_mahocky;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv14_lichhoclop_ins_upd
BEFORE INSERT OR UPDATE OF "LopMoId", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc" ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv14_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv14_lopmo()
RETURNS TRIGGER AS $$
DECLARE
    v_giangvien VARCHAR(100);
BEGIN
    /* Giảng viên được phân công ở lớp mở, không nằm trên danh mục lớp */
    v_giangvien := COALESCE(NEW."MaGiangVien", NEW."GiangVien");

    /* Kiểm tra nếu lớp mở có giảng viên và đang được kích hoạt, dời học kỳ hoặc đổi giảng viên */
    IF v_giangvien IS NOT NULL AND TRIM(v_giangvien) <> ''
       AND NEW."TrangThai" = TRUE
       AND (
          NEW."TrangThai" IS DISTINCT FROM OLD."TrangThai"
          OR NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy"
          OR NEW."MaGiangVien" IS DISTINCT FROM OLD."MaGiangVien"
          OR NEW."GiangVien" IS DISTINCT FROM OLD."GiangVien"
       ) THEN

        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" lh1
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            JOIN "LICHHOCLOP" lh2 ON lh1."ThuTrongTuan" = lh2."ThuTrongTuan" AND lh1.id <> lh2.id
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE lh1."LopMoId" = NEW.id
              AND lm2."TrangThai" = TRUE
              AND lm2."MaHocKy" = NEW."MaHocKy"
              AND COALESCE(lm2."MaGiangVien", lm2."GiangVien") = v_giangvien
              -- Công thức kiểm tra giao khoảng tiết
              AND bd1."ThuTu" <= kt2."ThuTu"
              AND bd2."ThuTu" <= kt1."ThuTu"
        ) THEN
            RAISE EXCEPTION 'RBTV14: Cập nhật lớp mở % gây trùng lịch dạy của giảng viên % trong học kỳ %.', NEW.id, v_giangvien, NEW."MaHocKy";
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv14_lopmo_upd
BEFORE UPDATE OF "MaHocKy", "TrangThai", "MaGiangVien", "GiangVien" ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv14_lopmo();
CREATE OR REPLACE FUNCTION fn_check_rbtv14_tiethoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ quét lại hệ thống nếu ThuTu thực sự bị cập nhật */
    IF NEW."ThuTu" IS DISTINCT FROM OLD."ThuTu" THEN
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" lh1
            JOIN "LOPMO" lm1 ON lh1."LopMoId" = lm1.id
            -- Bắt cặp với các lịch học khác để tìm xung đột
            JOIN "LICHHOCLOP" lh2 ON lh1."ThuTrongTuan" = lh2."ThuTrongTuan" AND lh1.id < lh2.id
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id

            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"

            WHERE COALESCE(lm1."MaGiangVien", lm1."GiangVien") IS NOT NULL
              AND TRIM(COALESCE(lm1."MaGiangVien", lm1."GiangVien")) <> ''
              AND COALESCE(lm1."MaGiangVien", lm1."GiangVien") = COALESCE(lm2."MaGiangVien", lm2."GiangVien")
              AND lm1."MaHocKy" = lm2."MaHocKy"
              AND lm1."TrangThai" = TRUE
              AND lm2."TrangThai" = TRUE
              -- Gắn ThuTu mới vào phép đối chiếu
              AND (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) <=
                  (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
              AND (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END) <=
                  (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END)
        ) THEN
            RAISE EXCEPTION 'RBTV14: Sửa ThuTu của tiết học này gián tiếp làm trùng lịch dạy của giảng viên.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv14_tiethoc_upd
BEFORE UPDATE OF "ThuTu" ON "TIETHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv14_tiethoc();
--RBTV15
CREATE OR REPLACE FUNCTION fn_check_rbtv15_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    v_malop VARCHAR(20);
    v_mahocky VARCHAR(15);
BEGIN
    /* Lấy MaLop và MaHocKy của lớp mở đang bị ảnh hưởng (dựa trên dữ liệu cũ OLD) */
    SELECT "MaLop", "MaHocKy" INTO v_malop, v_mahocky
    FROM "LOPMO"
    WHERE id = OLD."LopMoId";

    /* Kiểm tra xem lớp mở này đã có sinh viên nào đăng ký thành công chưa */
    IF EXISTS (
        SELECT 1
        FROM "CHITIETDANGKY" ctdk
        JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
        WHERE ctdk."MaLop" = v_malop
          AND pdk."MaHocKy" = v_mahocky
          AND ctdk."TrangThai" = 'Đã đăng ký'
    ) THEN
        RAISE EXCEPTION 'RBTV15: Không thể sửa hoặc xóa lịch học. Lớp % trong học kỳ % đã có sinh viên đăng ký.', v_malop, v_mahocky;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LICHHOCLOP
CREATE TRIGGER trg_rbtv15_lichhoclop_del_upd
BEFORE DELETE OR UPDATE OF "LopMoId", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "MaPhong", "PhongHoc"
ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv15_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv15_lopmo()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu thực sự có sự thay đổi về mã lớp hoặc mã học kỳ */
    IF NEW."MaLop" IS DISTINCT FROM OLD."MaLop" OR NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy" THEN

        /* Kiểm tra xem lớp mở này có đang chứa lịch học nào không */
        IF EXISTS (SELECT 1 FROM "LICHHOCLOP" WHERE "LopMoId" = OLD.id) THEN

            /* Nếu có lịch học, tiếp tục kiểm tra xem đã có sinh viên đăng ký chưa */
            IF EXISTS (
                SELECT 1
                FROM "CHITIETDANGKY" ctdk
                JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
                WHERE ctdk."MaLop" = OLD."MaLop"
                  AND pdk."MaHocKy" = OLD."MaHocKy"
                  AND ctdk."TrangThai" = 'Đã đăng ký'
            ) THEN
                RAISE EXCEPTION 'RBTV15: Không thể đổi MaLop hoặc MaHocKy vì lớp mở này đang chứa lịch học và đã có sinh viên chốt đăng ký.';
            END IF;

        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOPMO
CREATE TRIGGER trg_rbtv15_lopmo_upd
BEFORE UPDATE OF "MaLop", "MaHocKy" ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv15_lopmo();
--RBTV17
CREATE OR REPLACE FUNCTION fn_check_rbtv17_phieudangky()
RETURNS TRIGGER AS $$
DECLARE
    v_ngaybatdau TIMESTAMP;
    v_ngayketthuc TIMESTAMP;
    v_deadline TIMESTAMP;
    v_trangthai VARCHAR(20);
BEGIN
    IF current_setting('app.appeal_approval', true) = '1'
       OR current_setting('app.finalize_registration', true) = '1' THEN
        RETURN NEW;
    END IF;

    /* Lấy thông tin thời gian và trạng thái của học kỳ */
    SELECT "NgayBatDauDangKy", "NgayKetThucDangKy", "TrangThai"
    INTO v_ngaybatdau, v_ngayketthuc, v_trangthai
    FROM "HOCKY"
    WHERE "MaHocKy" = NEW."MaHocKy";

    v_deadline := CASE
        WHEN v_ngayketthuc IS NOT NULL AND v_ngayketthuc::time = TIME '00:00:00'
            THEN v_ngayketthuc + INTERVAL '1 day' - INTERVAL '1 millisecond'
        ELSE v_ngayketthuc
    END;

    /* Kiểm tra điều kiện thời gian và trạng thái */
    IF v_ngaybatdau IS NULL
       OR v_deadline IS NULL
       OR CURRENT_TIMESTAMP < v_ngaybatdau
       OR CURRENT_TIMESTAMP > v_deadline
       OR v_trangthai = 'Đã kết thúc' THEN
        RAISE EXCEPTION 'RBTV17: Không thể tạo phiếu đăng ký. Hiện tại không nằm trong thời gian đăng ký hoặc học kỳ đã kết thúc.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng PHIEUDANGKY
CREATE TRIGGER trg_rbtv17_phieudangky_ins
BEFORE INSERT ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv17_phieudangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv17_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_ngaybatdau TIMESTAMP;
    v_ngayketthuc TIMESTAMP;
    v_deadline TIMESTAMP;
    v_trangthai VARCHAR(20);
    v_is_finalize_cancel BOOLEAN;
BEGIN
    IF current_setting('app.appeal_approval', true) = '1'
       OR current_setting('app.finalize_registration', true) = '1' THEN
        RETURN NEW;
    END IF;

    /* Lấy thông tin thời gian của học kỳ thông qua PhieuDangKy */
    SELECT hk."NgayBatDauDangKy", hk."NgayKetThucDangKy", hk."TrangThai"
    INTO v_ngaybatdau, v_ngayketthuc, v_trangthai
    FROM "PHIEUDANGKY" pdk
    JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
    WHERE pdk."SoPhieu" = NEW."SoPhieu";

    v_deadline := CASE
        WHEN v_ngayketthuc IS NOT NULL AND v_ngayketthuc::time = TIME '00:00:00'
            THEN v_ngayketthuc + INTERVAL '1 day' - INTERVAL '1 millisecond'
        ELSE v_ngayketthuc
    END;
    v_is_finalize_cancel := NEW."TrangThai" = 'Đã hủy'
        AND COALESCE(NEW."LyDoHuy", '') IN ('Lớp không đủ 75% sức chứa khi chốt đăng ký', 'Hủy do không đủ sinh viên đăng ký');

    /* TH 1: Thêm mới hoặc chuyển sang 'Đã đăng ký' */
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        IF v_ngaybatdau IS NULL
           OR v_deadline IS NULL
           OR CURRENT_TIMESTAMP < v_ngaybatdau
           OR CURRENT_TIMESTAMP > v_deadline
           OR v_trangthai = 'Đã kết thúc' THEN
            RAISE EXCEPTION 'RBTV17: Không thể đăng ký học phần ngoài khung thời gian quy định hoặc khi học kỳ đã kết thúc.';
        END IF;

    /* TH 2: Hủy chi tiết học phần */
    ELSIF NEW."TrangThai" = 'Đã hủy' THEN
        IF v_deadline IS NULL OR (CURRENT_TIMESTAMP > v_deadline AND NOT v_is_finalize_cancel) THEN
            RAISE EXCEPTION 'RBTV17: Không thể hủy học phần vì đã quá hạn kết thúc đăng ký của học kỳ.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng CHITIETDANGKY
CREATE TRIGGER trg_rbtv17_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "TrangThai" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv17_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv17_hocky()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.appeal_approval', true) = '1'
       OR current_setting('app.finalize_registration', true) = '1' THEN
        RETURN NEW;
    END IF;

    /* Chỉ kiểm tra khi có sự thay đổi thực sự về các cột thời gian hoặc trạng thái */
    IF NEW."NgayBatDauDangKy" IS DISTINCT FROM OLD."NgayBatDauDangKy"
       OR NEW."NgayKetThucDangKy" IS DISTINCT FROM OLD."NgayKetThucDangKy"
       OR NEW."TrangThai" IS DISTINCT FROM OLD."TrangThai" THEN

        /* 1. Kiểm tra mâu thuẫn với ngày lập của các Phiếu đăng ký hiện tại */
        IF EXISTS (
            SELECT 1 FROM "PHIEUDANGKY"
            WHERE "MaHocKy" = NEW."MaHocKy"
              AND ("NgayLap" < NEW."NgayBatDauDangKy" OR "NgayLap" > NEW."NgayKetThucDangKy" OR NEW."TrangThai" = 'Đã kết thúc')
        ) THEN
            RAISE EXCEPTION 'RBTV17: Không thể cập nhật học kỳ. Thời gian/Trạng thái mới gây mâu thuẫn với Ngày lập của các phiếu đăng ký hiện có.';
        END IF;

        /* 2. Kiểm tra mâu thuẫn với các Chi tiết Đã đăng ký */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            WHERE pdk."MaHocKy" = NEW."MaHocKy"
              AND ctdk."TrangThai" = 'Đã đăng ký'
              AND (ctdk."NgayDangKy" < NEW."NgayBatDauDangKy" OR ctdk."NgayDangKy" > NEW."NgayKetThucDangKy" OR NEW."TrangThai" = 'Đã kết thúc')
        ) THEN
            RAISE EXCEPTION 'RBTV17: Không thể cập nhật học kỳ. Thời gian mới gây mâu thuẫn với các chi tiết môn học đã đăng ký.';
        END IF;

        /* 3. Kiểm tra mâu thuẫn với các Chi tiết Đã hủy */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            WHERE pdk."MaHocKy" = NEW."MaHocKy"
              AND ctdk."TrangThai" = 'Đã hủy'
              AND ctdk."NgayHuy" > NEW."NgayKetThucDangKy"
        ) THEN
            RAISE EXCEPTION 'RBTV17: Không thể cập nhật học kỳ. Thời gian kết thúc mới gây mâu thuẫn với các chi tiết môn học đã bị hủy trước đó.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng HOCKY
CREATE TRIGGER trg_rbtv17_hocky_upd
BEFORE UPDATE OF "NgayBatDauDangKy", "NgayKetThucDangKy", "TrangThai" ON "HOCKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv17_hocky();
--RBTV18
CREATE OR REPLACE FUNCTION fn_check_rbtv18_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_mahocky VARCHAR(15);
BEGIN
    /* Chỉ kiểm tra nếu trạng thái của chi tiết là 'Đã đăng ký' */
    IF NEW."TrangThai" = 'Đã đăng ký' THEN

        /* Lấy MaHocKy từ phiếu đăng ký tương ứng */
        SELECT "MaHocKy" INTO v_mahocky
        FROM "PHIEUDANGKY"
        WHERE "SoPhieu" = NEW."SoPhieu";

        /* Kiểm tra sự tồn tại của lớp mở tương ứng */
        IF NOT EXISTS (
            SELECT 1
            FROM "LOPMO"
            WHERE "MaHocKy" = v_mahocky
              AND "MaLop" = NEW."MaLop"
              AND "TrangThai" = TRUE
        ) THEN
            RAISE EXCEPTION 'RBTV18: Lớp % không được mở hoặc đã bị đóng trong học kỳ %.', NEW."MaLop", v_mahocky;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng CHITIETDANGKY
CREATE TRIGGER trg_rbtv18_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "MaLop", "SoPhieu", "TrangThai" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv18_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv18_phieudangky()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu thực sự có sự thay đổi về học kỳ */
    IF NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy" THEN

        /* Kiểm tra xem có chi tiết đăng ký nào bị thiếu lớp mở tương ứng ở học kỳ mới không */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            WHERE ctdk."SoPhieu" = NEW."SoPhieu"
              AND ctdk."TrangThai" = 'Đã đăng ký'
              AND NOT EXISTS (
                  SELECT 1
                  FROM "LOPMO" lm
                  WHERE lm."MaLop" = ctdk."MaLop"
                    AND lm."MaHocKy" = NEW."MaHocKy"
                    AND lm."TrangThai" = TRUE
              )
        ) THEN
            RAISE EXCEPTION 'RBTV18: Không thể chuyển phiếu % sang học kỳ %. Có lớp đăng ký chưa được mở trong học kỳ này.', NEW."SoPhieu", NEW."MaHocKy";
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng PHIEUDANGKY
CREATE TRIGGER trg_rbtv18_phieudangky_upd
BEFORE UPDATE OF "MaHocKy" ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv18_phieudangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv18_lopmo()
RETURNS TRIGGER AS $$
BEGIN
    /* Xác định thao tác XÓA hoặc SỬA làm vô hiệu hóa lớp mở hiện tại */
    IF TG_OP = 'DELETE' OR
       (TG_OP = 'UPDATE' AND (NEW."TrangThai" = FALSE OR NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy" OR NEW."MaLop" IS DISTINCT FROM OLD."MaLop")) THEN

        /* Quét xem có sinh viên nào đang giữ đăng ký môn học này ở học kỳ tương ứng không */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            WHERE ctdk."MaLop" = OLD."MaLop"
              AND pdk."MaHocKy" = OLD."MaHocKy"
              AND ctdk."TrangThai" = 'Đã đăng ký'
        ) THEN
            RAISE EXCEPTION 'RBTV18: Không thể thao tác trên lớp mở % (HK: %) vì đã có sinh viên đăng ký môn này.', OLD."MaLop", OLD."MaHocKy";
        END IF;

    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOPMO
CREATE TRIGGER trg_rbtv18_lopmo_del_upd
BEFORE DELETE OR UPDATE OF "TrangThai", "MaHocKy", "MaLop" ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv18_lopmo();
--RBTV 19
CREATE OR REPLACE FUNCTION fn_check_rbtv19_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_mamonhoc_goc VARCHAR(15);
BEGIN
    /* Lấy Mã môn học gốc của lớp tương ứng từ bảng LOP */
    SELECT "MaMonHoc" INTO v_mamonhoc_goc
    FROM "LOP"
    WHERE "MaLop" = NEW."MaLop";

    /* Đối chiếu với Mã môn học trong chi tiết đăng ký */
    IF NEW."MaMonHoc" IS DISTINCT FROM v_mamonhoc_goc THEN
        RAISE EXCEPTION 'RBTV19: Mã môn học trong chi tiết đăng ký (%) không khớp với cấu hình môn học của lớp % (%).', NEW."MaMonHoc", NEW."MaLop", v_mamonhoc_goc;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng CHITIETDANGKY
CREATE TRIGGER trg_rbtv19_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "MaLop", "MaMonHoc" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv19_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv19_lop()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu thực sự có sự thay đổi về Mã môn học */
    IF NEW."MaMonHoc" IS DISTINCT FROM OLD."MaMonHoc" THEN

        /* Kiểm tra xem có chi tiết đăng ký nào đang trỏ vào lớp này nhưng mang mã môn học cũ hay không */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY"
            WHERE "MaLop" = NEW."MaLop"
              AND "MaMonHoc" IS DISTINCT FROM NEW."MaMonHoc"
        ) THEN
            RAISE EXCEPTION 'RBTV19: Không thể đổi mã môn học của lớp % sang %. Lớp này đã có chi tiết đăng ký ghi nhận theo mã môn học cũ.', NEW."MaLop", NEW."MaMonHoc";
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOP
CREATE TRIGGER trg_rbtv19_lop_upd
BEFORE UPDATE OF "MaMonHoc" ON "LOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv19_lop();
--RBTV 20
CREATE OR REPLACE FUNCTION fn_check_rbtv20_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_sotinchi_goc INT;
    v_loaimon_goc VARCHAR(5);
BEGIN
    /* Lấy thông tin SoTinChi và LoaiMon của môn học thông qua lớp đang đăng ký */
    SELECT mh."SoTinChi", mh."LoaiMon"
    INTO v_sotinchi_goc, v_loaimon_goc
    FROM "LOP" l
    JOIN "MONHOC" mh ON l."MaMonHoc" = mh."MaMonHoc"
    WHERE l."MaLop" = NEW."MaLop";

    /* Đối chiếu dữ liệu được truyền vào với dữ liệu gốc */
    IF NEW."SoTinChi" IS DISTINCT FROM v_sotinchi_goc OR NEW."LoaiMon" IS DISTINCT FROM v_loaimon_goc THEN
        RAISE EXCEPTION 'RBTV20: Dữ liệu không khớp. Lớp % yêu cầu LoaiMon là % và SoTinChi là % (Dữ liệu nhập: %, %).',
                        NEW."MaLop", v_loaimon_goc, v_sotinchi_goc, NEW."LoaiMon", NEW."SoTinChi";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng CHITIETDANGKY
CREATE TRIGGER trg_rbtv20_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "MaLop", "SoTinChi", "LoaiMon" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv20_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv20_lop()
RETURNS TRIGGER AS $$
DECLARE
    v_sotinchi_moi INT;
    v_loaimon_moi VARCHAR(5);
BEGIN
    IF NEW."MaMonHoc" IS DISTINCT FROM OLD."MaMonHoc" THEN

        /* Lấy thông tin của môn học mới vừa được gán */
        SELECT "SoTinChi", "LoaiMon" INTO v_sotinchi_moi, v_loaimon_moi
        FROM "MONHOC"
        WHERE "MaMonHoc" = NEW."MaMonHoc";

        /* Quét xem có chi tiết đăng ký nào của lớp này bị mâu thuẫn với môn mới không */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY"
            WHERE "MaLop" = NEW."MaLop"
              AND ("SoTinChi" IS DISTINCT FROM v_sotinchi_moi OR "LoaiMon" IS DISTINCT FROM v_loaimon_moi)
        ) THEN
            RAISE EXCEPTION 'RBTV20: Không thể đổi môn học của lớp %. Lớp này đã có sinh viên đăng ký với Số tín chỉ/Loại môn của môn học cũ.', NEW."MaLop";
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOP
CREATE TRIGGER trg_rbtv20_lop_upd
BEFORE UPDATE OF "MaMonHoc" ON "LOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv20_lop();
CREATE OR REPLACE FUNCTION fn_check_rbtv20_monhoc()
RETURNS TRIGGER AS $$
DECLARE
    v_sotinchi_moi INT;
BEGIN
    IF NEW."LoaiMon" IS DISTINCT FROM OLD."LoaiMon" OR NEW."SoTiet" IS DISTINCT FROM OLD."SoTiet" THEN

        /* Tính toán trước số tín chỉ mới để đối chiếu (vì Trigger BEFORE chưa cập nhật cột GENERATED) */
        IF NEW."LoaiMon" = 'LT' THEN
            v_sotinchi_moi := NEW."SoTiet" / 15;
        ELSIF NEW."LoaiMon" = 'TH' THEN
            v_sotinchi_moi := NEW."SoTiet" / 30;
        ELSE
            v_sotinchi_moi := 0;
        END IF;

        /* Quét các chi tiết đăng ký đang trỏ về các lớp thuộc môn học này */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            JOIN "LOP" l ON ctdk."MaLop" = l."MaLop"
            WHERE l."MaMonHoc" = NEW."MaMonHoc"
              AND (ctdk."SoTinChi" IS DISTINCT FROM v_sotinchi_moi OR ctdk."LoaiMon" IS DISTINCT FROM NEW."LoaiMon")
        ) THEN
            RAISE EXCEPTION 'RBTV20: Không thể đổi Loại môn hoặc Số tiết. Hành động này làm sai lệch Số tín chỉ/Loại môn của sinh viên đã đăng ký môn này trước đó.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng MONHOC
CREATE TRIGGER trg_rbtv20_monhoc_upd
BEFORE UPDATE OF "LoaiMon", "SoTiet" ON "MONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv20_monhoc();
--RBTV 21
CREATE OR REPLACE FUNCTION fn_lay_don_gia(
    p_LoaiMon VARCHAR,
    p_LoaiGia VARCHAR,
    p_MaHocKy VARCHAR
) RETURNS DECIMAL AS $$
DECLARE
    v_DonGia DECIMAL(12,0);
BEGIN
    SELECT "DonGia" INTO v_DonGia
    FROM "DONGIATINCHI"
    WHERE "LoaiMon" = p_LoaiMon
      AND "LoaiHoc" = p_LoaiGia
      AND "TrangThai" = TRUE
      AND ("MaHocKy" = p_MaHocKy OR "MaHocKy" IS NULL)
    ORDER BY "MaHocKy" DESC NULLS LAST
    LIMIT 1;

    IF v_DonGia IS NULL THEN
        RAISE EXCEPTION 'RBTV21: Không tìm thấy bảng giá áp dụng cho Loại môn: %, Loại học: %, Học kỳ: %.', p_LoaiMon, p_LoaiGia, p_MaHocKy;
    END IF;

    RETURN v_DonGia;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION fn_lay_don_gia(
    p_LoaiMon VARCHAR,
    p_LoaiGia VARCHAR,
    p_MaHocKy VARCHAR
) RETURNS DECIMAL AS $$
DECLARE
    v_DonGia DECIMAL(12,0);
BEGIN
    EXECUTE format(
        'SELECT %1$I FROM %2$I
         WHERE %3$I = $1
           AND %4$I = $2
           AND %5$I = TRUE
           AND COALESCE(%6$I, FALSE) = FALSE
           AND (%7$I = $3 OR %7$I IS NULL)
         ORDER BY CASE WHEN %7$I = $3 THEN 0 ELSE 1 END,
                  %8$I DESC NULLS LAST,
                  %9$I DESC
         LIMIT 1',
        'DonGia', 'DONGIATINCHI', 'LoaiMon', 'LoaiHoc', 'TrangThai', 'DaXoa', 'MaHocKy', 'NgayApDung', 'id'
    ) INTO v_DonGia
    USING p_LoaiMon, p_LoaiGia, p_MaHocKy;

    IF v_DonGia IS NULL THEN
        RAISE EXCEPTION 'RBTV21: Khong tim thay bang gia ap dung cho Loai mon: %, Loai hoc: %, Hoc ky: %.', p_LoaiMon, p_LoaiGia, p_MaHocKy;
    END IF;

    RETURN v_DonGia;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_check_rbtv21_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_MaHocKy VARCHAR(15);
    v_LoaiHocKy VARCHAR(20);
    v_LoaiGia VARCHAR(20);
    v_DonGia_Chuan DECIMAL(12,0);
    v_ThanhTien_Chuan DECIMAL(15,0);
BEGIN
    /* Lấy Học kỳ và Loại học kỳ từ Phiếu đăng ký gốc */
    SELECT pdk."MaHocKy", hk."LoaiHocKy" INTO v_MaHocKy, v_LoaiHocKy
    FROM "PHIEUDANGKY" pdk
    JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
    WHERE pdk."SoPhieu" = NEW."SoPhieu";

    /* BƯỚC 1: Xác định Loại Giá theo công thức */
    IF v_LoaiHocKy = 'Hè' AND NEW."LoaiDangKy" = 'hoc_moi' THEN
        v_LoaiGia := 'hoc_he';
    ELSE
        v_LoaiGia := NEW."LoaiDangKy";
    END IF;

    /* BƯỚC 2: Gọi hàm lấy Đơn giá chuẩn */
    v_DonGia_Chuan := fn_lay_don_gia(NEW."LoaiMon", v_LoaiGia, v_MaHocKy);

    /* BƯỚC 3: Tính Thành tiền chuẩn */
    v_ThanhTien_Chuan := NEW."SoTinChi" * v_DonGia_Chuan;

    /* BƯỚC 4: Đối chiếu */
    IF NEW."DonGia" != v_DonGia_Chuan OR NEW."ThanhTien" != v_ThanhTien_Chuan THEN
        RAISE EXCEPTION 'RBTV21: Sai lệch tài chính. Đơn giá yêu cầu: %, Thành tiền yêu cầu: % (Dữ liệu nhập: %, %)',
                        v_DonGia_Chuan, v_ThanhTien_Chuan, NEW."DonGia", NEW."ThanhTien";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv21_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "LoaiDangKy", "SoTinChi", "LoaiMon", "DonGia", "ThanhTien", "SoPhieu" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv21_phieudangky()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy" THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "SoPhieu" = NEW."SoPhieu") THEN
            RAISE EXCEPTION 'RBTV21: Không thể đổi Mã học kỳ. Phiếu % đã có môn đăng ký, thao tác này sẽ làm sai lệch Đơn giá và Thành tiền.', NEW."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv21_phieudangky_upd
BEFORE UPDATE OF "MaHocKy" ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_phieudangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv21_hocky()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."LoaiHocKy" IS DISTINCT FROM OLD."LoaiHocKy" THEN
        /* Chặn nếu đã có phiếu đăng ký chứa chi tiết học phần thuộc học kỳ này */
        IF EXISTS (
            SELECT 1 FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            WHERE pdk."MaHocKy" = NEW."MaHocKy"
        ) THEN
            RAISE EXCEPTION 'RBTV21: Không thể đổi Loại học kỳ. Đã có sinh viên đăng ký, thao tác này sẽ phá vỡ công thức tính Giá trị tín chỉ.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv21_hocky_upd
BEFORE UPDATE OF "LoaiHocKy" ON "HOCKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_hocky();
CREATE OR REPLACE FUNCTION fn_check_rbtv21_dongiatinchi()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.bypass_pricing_guard', true) = '1' THEN
        RETURN NEW;
    END IF;

    IF NEW."DonGia" IS DISTINCT FROM OLD."DonGia" OR NEW."TrangThai" IS DISTINCT FROM OLD."TrangThai" THEN
        /* Quét xem có chi tiết đăng ký nào đang phụ thuộc vào cấu hình giá cũ này không */
        IF EXISTS (
            SELECT 1 FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
            WHERE ctdk."LoaiMon" = OLD."LoaiMon"
              AND (CASE WHEN hk."LoaiHocKy" = 'Hè' AND ctdk."LoaiDangKy" = 'hoc_moi' THEN 'hoc_he' ELSE ctdk."LoaiDangKy" END) = OLD."LoaiHoc"
              AND (OLD."MaHocKy" IS NULL OR pdk."MaHocKy" = OLD."MaHocKy")
              AND ctdk."DonGia" = OLD."DonGia"
        ) THEN
            RAISE EXCEPTION 'RBTV21: Không thể sửa Đơn giá hoặc Trạng thái. Mức giá này đang được sử dụng trong các Phiếu đăng ký đã lưu.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv21_dongiatinchi_upd
BEFORE UPDATE OF "DonGia", "TrangThai" ON "DONGIATINCHI"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_dongiatinchi();
CREATE OR REPLACE FUNCTION fn_check_rbtv21_monhoc()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."LoaiMon" IS DISTINCT FROM OLD."LoaiMon" OR NEW."SoTiet" IS DISTINCT FROM OLD."SoTiet" THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "MaMonHoc" = NEW."MaMonHoc") THEN
            RAISE EXCEPTION 'RBTV21: Không thể sửa Loại môn hoặc Số tiết. Việc này làm sai lệch công thức Đơn giá/Thành tiền của sinh viên đã đăng ký.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv21_monhoc_upd
BEFORE UPDATE OF "LoaiMon", "SoTiet" ON "MONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_monhoc();
--RBTV 24
CREATE OR REPLACE FUNCTION fn_check_rbtv24_gioihan_tinchi()
RETURNS TRIGGER AS $$
DECLARE
    v_MaSv VARCHAR(15);
    v_MaHocKy VARCHAR(15);
    v_TongTinChi INTEGER := 0;

    -- Bien luu tham so he thong
    v_SoTinChiDangKyToiDa INTEGER;
    v_SoTinChiDangKyToiDaKhiVuot INTEGER;
    v_NamKiemTraAnhVan INTEGER;
    v_GioiHanTinChiChuaDatAnhVan INTEGER;
    v_DanhSachMonAnhVanBatBuoc VARCHAR(200);

    -- Bien phuc vu logic kiem tra
    v_GioiHanHienTai INTEGER;
    v_NgayNhapHoc DATE;
    v_NamBatDauHocKy INTEGER;
    v_ThuTuHocKy INTEGER;
    v_MaxThuTuChinh INTEGER;
    v_NamThuHoc INTEGER;
    v_ToiHanKiemTra BOOLEAN := FALSE;
    v_SoMonAnhVanYeuCau INTEGER;
    v_SoMonAnhVanDaDat INTEGER;
BEGIN
    -- 1. Xac dinh MaSv va MaHocKy tuong ung voi bang dang thao tac
    IF TG_TABLE_NAME = 'CHITIETDANGKY' THEN
        SELECT "MaSv", "MaHocKy" INTO v_MaSv, v_MaHocKy
        FROM "PHIEUDANGKY" WHERE "SoPhieu" = NEW."SoPhieu";
    ELSIF TG_TABLE_NAME = 'PHIEUDANGKY' THEN
        v_MaSv := NEW."MaSv";
        v_MaHocKy := NEW."MaHocKy";
    END IF;

    IF v_MaSv IS NULL OR v_MaHocKy IS NULL THEN
        RETURN NEW;
    END IF;

    -- 2. Lay cac tham so he thong
    SELECT "SoTinChiDangKyToiDa", "SoTinChiDangKyToiDaKhiVuot", "NamKiemTraAnhVan", "GioiHanTinChiChuaDatAnhVan", "DanhSachMonAnhVanBatBuoc"
    INTO v_SoTinChiDangKyToiDa, v_SoTinChiDangKyToiDaKhiVuot, v_NamKiemTraAnhVan, v_GioiHanTinChiChuaDatAnhVan, v_DanhSachMonAnhVanBatBuoc
    FROM "THAMSO" WHERE id = 1;

    -- 3. Tinh TongTinChiDangKy hien tai
    SELECT COALESCE(SUM(ct."SoTinChi"), 0) INTO v_TongTinChi
    FROM "CHITIETDANGKY" ct
    JOIN "PHIEUDANGKY" p ON ct."SoPhieu" = p."SoPhieu"
    WHERE p."MaSv" = v_MaSv AND p."MaHocKy" = v_MaHocKy
      AND ct."TrangThai" = 'Đã đăng ký'
      AND (TG_TABLE_NAME <> 'CHITIETDANGKY' OR ct.id <> NEW.id);

    -- Cong them tin chi cua ban ghi dang them/sua neu no co trang thai 'Đã đăng ký'
    IF TG_TABLE_NAME = 'CHITIETDANGKY' AND NEW."TrangThai" = 'Đã đăng ký' THEN
        v_TongTinChi := v_TongTinChi + NEW."SoTinChi";
    END IF;

    -- 4. Kiem tra lo trinh Anh van
    SELECT "NgayNhapHoc" INTO v_NgayNhapHoc FROM "SINHVIEN" WHERE "MaSv" = v_MaSv;

    SELECT n."NamBatDau", hk."ThuTu"
    INTO v_NamBatDauHocKy, v_ThuTuHocKy
    FROM "HOCKY" hk
    JOIN "NAMHOC" n ON hk."MaNamHoc" = n."MaNamHoc"
    WHERE hk."MaHocKy" = v_MaHocKy;

    -- Tinh nam hoc hien tai cua sinh vien (tu ngay nhap hoc)
    v_NamThuHoc := v_NamBatDauHocKy - EXTRACT(YEAR FROM v_NgayNhapHoc) + 1;

    -- Lay thu tu hoc ky chinh cuoi cung trong nam hoc de xet "hoc ky cuoi"
    SELECT COALESCE(MAX(hk2."ThuTu"), 2) INTO v_MaxThuTuChinh
    FROM "HOCKY" hk2
    JOIN "NAMHOC" n2 ON hk2."MaNamHoc" = n2."MaNamHoc"
    WHERE n2."NamBatDau" = v_NamBatDauHocKy AND hk2."LoaiHocKy" = 'Chính';

    -- Xac dinh xem sinh vien da cham moc "hoc ky cuoi cua nam thu X" chua
    IF v_NamThuHoc > v_NamKiemTraAnhVan OR (v_NamThuHoc = v_NamKiemTraAnhVan AND v_ThuTuHocKy >= v_MaxThuTuChinh) THEN
        v_ToiHanKiemTra := TRUE;
    END IF;

    v_GioiHanHienTai := v_SoTinChiDangKyToiDa;

    -- 5. Kiem tra danh sach mon Anh van neu da toi han
    IF v_ToiHanKiemTra THEN
        -- Dem so luong mon bat buoc (xu ly mang an toan loai bo khoang trang)
        v_SoMonAnhVanYeuCau := array_length(string_to_array(REPLACE(v_DanhSachMonAnhVanBatBuoc, ' ', ''), ','), 1);

        -- Dem so luong mon Anh van da 'qua_mon'
        SELECT COUNT(DISTINCT "MaMonHoc") INTO v_SoMonAnhVanDaDat
        FROM "MONDAHOC"
        WHERE "MaSv" = v_MaSv
          AND "KetQua" = 'qua_mon'
          AND "MaMonHoc" = ANY(string_to_array(REPLACE(v_DanhSachMonAnhVanBatBuoc, ' ', ''), ','));

        -- Ap dung phat neu chua du
        IF COALESCE(v_SoMonAnhVanDaDat, 0) < COALESCE(v_SoMonAnhVanYeuCau, 0) THEN
            v_GioiHanHienTai := v_GioiHanTinChiChuaDatAnhVan;
        END IF;
    END IF;

    -- 6. Danh gia vi pham
    IF v_TongTinChi > v_SoTinChiDangKyToiDaKhiVuot THEN
        RAISE EXCEPTION 'Tong tin chi (%) vuot qua gioi han he thong cho phep (%).', v_TongTinChi, v_SoTinChiDangKyToiDaKhiVuot;
    END IF;

    IF v_TongTinChi > v_GioiHanHienTai THEN
        RAISE EXCEPTION 'Tong tin chi (%) vuot qua gioi han (%). SV co the chua dat dieu kien Anh van bat buoc.', v_TongTinChi, v_GioiHanHienTai;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv24_chitietdangky ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv24_chitietdangky
BEFORE INSERT OR UPDATE OF "TrangThai", "SoTinChi", "SoPhieu"
ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv24_gioihan_tinchi();
DROP TRIGGER IF EXISTS trg_rbtv24_phieudangky ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv24_phieudangky
BEFORE UPDATE OF "MaSv", "MaHocKy", "TrangThai"
ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv24_gioihan_tinchi();
--RBTV 25
CREATE OR REPLACE FUNCTION fn_rbtv25_sync_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_SoPhieu INTEGER;
BEGIN
    -- 1. Xac dinh SoPhieu can dong bo
    IF TG_OP = 'DELETE' THEN
        v_SoPhieu := OLD."SoPhieu";
    ELSE
        v_SoPhieu := NEW."SoPhieu";
    END IF;

    -- 2. Thuc hien cap nhat lai toan bo cot tong hop tren PHIEUDANGKY
    UPDATE "PHIEUDANGKY"
    SET
        "TongTinChi" = agg.tong_tc,
        "TongTienDangKy" = agg.tong_tien,
        "SoMonHocMoi" = agg.sm_moi,
        "SoTinChiHocMoi" = agg.stc_moi,
        "TienHocMoi" = agg.tien_moi,
        "SoMonHocLai" = agg.sm_lai,
        "SoTinChiHocLai" = agg.stc_lai,
        "TienHocLai" = agg.tien_lai,
        "SoMonHocCaiThien" = agg.sm_ct,
        "SoTinChiHocCaiThien" = agg.stc_ct,
        "TienHocCaiThien" = agg.tien_ct
    FROM (
        SELECT
            COALESCE(SUM("SoTinChi"), 0)::INTEGER AS tong_tc,
            COALESCE(SUM("ThanhTien"), 0)::DECIMAL AS tong_tien,

            COUNT(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN 1 END)::INTEGER AS sm_moi,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_moi,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_moi,

            COUNT(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN 1 END)::INTEGER AS sm_lai,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_lai,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_lai,

            COUNT(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN 1 END)::INTEGER AS sm_ct,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_ct,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_ct
        FROM "CHITIETDANGKY"
        WHERE "SoPhieu" = v_SoPhieu AND "TrangThai" = 'Đã đăng ký'
    ) agg
    WHERE "PHIEUDANGKY"."SoPhieu" = v_SoPhieu;

    -- 3. Xu ly rieng truong hop UPDATE thay doi SoPhieu (chuyen chi tiet tu phieu cu sang phieu moi)
    IF TG_OP = 'UPDATE' AND OLD."SoPhieu" <> NEW."SoPhieu" THEN
        UPDATE "PHIEUDANGKY"
        SET
            "TongTinChi" = agg.tong_tc,
            "TongTienDangKy" = agg.tong_tien,
            "SoMonHocMoi" = agg.sm_moi,
            "SoTinChiHocMoi" = agg.stc_moi,
            "TienHocMoi" = agg.tien_moi,
            "SoMonHocLai" = agg.sm_lai,
            "SoTinChiHocLai" = agg.stc_lai,
            "TienHocLai" = agg.tien_lai,
            "SoMonHocCaiThien" = agg.sm_ct,
            "SoTinChiHocCaiThien" = agg.stc_ct,
            "TienHocCaiThien" = agg.tien_ct
        FROM (
            SELECT
                COALESCE(SUM("SoTinChi"), 0)::INTEGER AS tong_tc,
                COALESCE(SUM("ThanhTien"), 0)::DECIMAL AS tong_tien,
                COUNT(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN 1 END)::INTEGER AS sm_moi,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_moi,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_moi,
                COUNT(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN 1 END)::INTEGER AS sm_lai,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_lai,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_lai,
                COUNT(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN 1 END)::INTEGER AS sm_ct,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_ct,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_ct
            FROM "CHITIETDANGKY"
            WHERE "SoPhieu" = OLD."SoPhieu" AND "TrangThai" = 'Đã đăng ký'
        ) agg
        WHERE "PHIEUDANGKY"."SoPhieu" = OLD."SoPhieu";
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gan Trigger vao cac thao tac thay doi du lieu chi tiet
DROP TRIGGER IF EXISTS trg_rbtv25_sync_chitietdangky ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv25_sync_chitietdangky
AFTER INSERT OR DELETE OR UPDATE OF "SoPhieu", "SoTinChi", "ThanhTien", "LoaiDangKy", "TrangThai"
ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv25_sync_chitietdangky();
CREATE OR REPLACE FUNCTION fn_rbtv25_check_phieudangky()
RETURNS TRIGGER AS $$
DECLARE
    v_TongTinChi INTEGER;
    v_TongTienDangKy DECIMAL;
    v_SoMonHocMoi INTEGER;
    v_SoTinChiHocMoi INTEGER;
    v_TienHocMoi DECIMAL;
    v_SoMonHocLai INTEGER;
    v_SoTinChiHocLai INTEGER;
    v_TienHocLai DECIMAL;
    v_SoMonHocCaiThien INTEGER;
    v_SoTinChiHocCaiThien INTEGER;
    v_TienHocCaiThien DECIMAL;
BEGIN
    -- Query lai cac con so thuc te dang ton tai o CHITIETDANGKY
    SELECT
        COALESCE(SUM("SoTinChi"), 0),
        COALESCE(SUM("ThanhTien"), 0),
        COUNT(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN 1 END),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "SoTinChi" ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "ThanhTien" ELSE 0 END), 0),
        COUNT(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN 1 END),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "SoTinChi" ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "ThanhTien" ELSE 0 END), 0),
        COUNT(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN 1 END),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "SoTinChi" ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "ThanhTien" ELSE 0 END), 0)
    INTO
        v_TongTinChi, v_TongTienDangKy,
        v_SoMonHocMoi, v_SoTinChiHocMoi, v_TienHocMoi,
        v_SoMonHocLai, v_SoTinChiHocLai, v_TienHocLai,
        v_SoMonHocCaiThien, v_SoTinChiHocCaiThien, v_TienHocCaiThien
    FROM "CHITIETDANGKY"
    WHERE "SoPhieu" = NEW."SoPhieu" AND "TrangThai" = 'Đã đăng ký';

    -- So sanh voi gia tri NEW ma cau lennh UPDATE dinh cap nhat vao PHIEUDANGKY
    IF NEW."TongTinChi" <> v_TongTinChi OR
       NEW."TongTienDangKy" <> v_TongTienDangKy OR
       NEW."SoMonHocMoi" <> v_SoMonHocMoi OR
       NEW."SoTinChiHocMoi" <> v_SoTinChiHocMoi OR
       NEW."TienHocMoi" <> v_TienHocMoi OR
       NEW."SoMonHocLai" <> v_SoMonHocLai OR
       NEW."SoTinChiHocLai" <> v_SoTinChiHocLai OR
       NEW."TienHocLai" <> v_TienHocLai OR
       NEW."SoMonHocCaiThien" <> v_SoMonHocCaiThien OR
       NEW."SoTinChiHocCaiThien" <> v_SoTinChiHocCaiThien OR
       NEW."TienHocCaiThien" <> v_TienHocCaiThien
    THEN
        RAISE EXCEPTION 'Loi RBTV25: Cac cot tong hop tren PHIEUDANGKY (SoPhieu: %) khong khop voi tong chi tiet thuc te.', NEW."SoPhieu";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gan Trigger check vao thao tac UPDATE cot tong hop
DROP TRIGGER IF EXISTS trg_rbtv25_check_phieudangky ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv25_check_phieudangky
BEFORE UPDATE OF "TrangThai", "TongTinChi", "TongTienDangKy", "SoMonHocMoi", "SoTinChiHocMoi", "TienHocMoi", "SoMonHocLai", "SoTinChiHocLai", "TienHocLai", "SoMonHocCaiThien", "SoTinChiHocCaiThien", "TienHocCaiThien"
ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv25_check_phieudangky();
--RBTV 26
CREATE OR REPLACE FUNCTION check_rbtv26_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_hoc_ky VARCHAR(15);
    v_sl_thuc_te INT;
    v_sl_dang_ky INT;
    v_sl_toi_da INT;
    v_ma_lop_check VARCHAR(20);
    v_so_phieu_check INT;
BEGIN
    -- Lấy thông tin dựa trên thao tác (OLD cho DELETE, NEW cho INSERT/UPDATE)
    IF TG_OP = 'DELETE' THEN
        v_ma_lop_check := OLD."MaLop";
        v_so_phieu_check := OLD."SoPhieu";
    ELSE
        v_ma_lop_check := NEW."MaLop";
        v_so_phieu_check := NEW."SoPhieu";
    END IF;

    -- Lấy MaHocKy từ phiếu đăng ký tương ứng
    SELECT "MaHocKy" INTO v_ma_hoc_ky
    FROM "PHIEUDANGKY"
    WHERE "SoPhieu" = v_so_phieu_check;

    -- Đếm số lượng thực tế
    SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
    FROM "CHITIETDANGKY" ct
    JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
    WHERE ct."MaLop" = v_ma_lop_check
      AND pdk."MaHocKy" = v_ma_hoc_ky
      AND ct."TrangThai" = 'Đã đăng ký';

    -- Lấy thông tin từ LOPMO và LOP
    SELECT "SoLuongDaDangKy" INTO v_sl_dang_ky
    FROM "LOPMO"
    WHERE "MaHocKy" = v_ma_hoc_ky AND "MaLop" = v_ma_lop_check;

    SELECT "SoLuongToiDa" INTO v_sl_toi_da
    FROM "LOP"
    WHERE "MaLop" = v_ma_lop_check;

    -- Kiểm tra điều kiện RBTV
    IF v_sl_dang_ky IS DISTINCT FROM v_sl_thuc_te THEN
        RAISE EXCEPTION 'RBTV26: Sĩ số đã đăng ký (%) không khớp số đăng ký thực tế (%) của lớp %.', v_sl_dang_ky, v_sl_thuc_te, v_ma_lop_check;
    END IF;

    IF v_sl_dang_ky < 0 OR v_sl_dang_ky > v_sl_toi_da THEN
        RAISE EXCEPTION 'RBTV26: Sĩ số (%) vượt quá sức chứa tối đa (%) của lớp %.', v_sl_dang_ky, v_sl_toi_da, v_ma_lop_check;
    END IF;

    -- Nếu là UPDATE và đổi lớp, cần kiểm tra thêm lớp cũ
    IF TG_OP = 'UPDATE' AND OLD."MaLop" <> NEW."MaLop" THEN
        -- Đếm thực tế lớp cũ
        SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
        FROM "CHITIETDANGKY" ct
        JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
        WHERE ct."MaLop" = OLD."MaLop"
          AND pdk."MaHocKy" = v_ma_hoc_ky
          AND ct."TrangThai" = 'Đã đăng ký';

        SELECT "SoLuongDaDangKy" INTO v_sl_dang_ky
        FROM "LOPMO"
        WHERE "MaHocKy" = v_ma_hoc_ky AND "MaLop" = OLD."MaLop";

        IF v_sl_dang_ky IS DISTINCT FROM v_sl_thuc_te THEN
            RAISE EXCEPTION 'RBTV26: Sĩ số đã đăng ký lớp cũ không khớp thực tế do đổi mã lớp.';
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_chk_rbtv26_ctdk
AFTER INSERT OR DELETE OR UPDATE OF "MaLop", "TrangThai"
ON "CHITIETDANGKY"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv26_chitietdangky();
CREATE OR REPLACE FUNCTION check_rbtv26_lopmo()
RETURNS TRIGGER AS $$
DECLARE
    v_sl_thuc_te INT;
    v_sl_toi_da INT;
BEGIN
    SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
    FROM "CHITIETDANGKY" ct
    JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
    WHERE ct."MaLop" = NEW."MaLop"
      AND pdk."MaHocKy" = NEW."MaHocKy"
      AND ct."TrangThai" = 'Đã đăng ký';

    SELECT "SoLuongToiDa" INTO v_sl_toi_da
    FROM "LOP"
    WHERE "MaLop" = NEW."MaLop";

    IF NEW."SoLuongDaDangKy" != v_sl_thuc_te THEN
        RAISE EXCEPTION 'RBTV26: Sĩ số trong LOPMO (%) không khớp với số đăng ký thực tế (%).', NEW."SoLuongDaDangKy", v_sl_thuc_te;
    END IF;

    IF NEW."SoLuongDaDangKy" < 0 OR NEW."SoLuongDaDangKy" > v_sl_toi_da THEN
        RAISE EXCEPTION 'RBTV26: Sĩ số cập nhật (%) vi phạm giới hạn của lớp (Tối đa: %).', NEW."SoLuongDaDangKy", v_sl_toi_da;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_chk_rbtv26_lopmo
AFTER UPDATE OF "SoLuongDaDangKy", "TrangThai"
ON "LOPMO"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv26_lopmo();
CREATE OR REPLACE FUNCTION check_rbtv26_lop()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN (
        SELECT "MaHocKy", "SoLuongDaDangKy"
        FROM "LOPMO"
        WHERE "MaLop" = NEW."MaLop"
    ) LOOP
        IF rec."SoLuongDaDangKy" > NEW."SoLuongToiDa" THEN
            RAISE EXCEPTION 'RBTV26: Sức chứa mới (%) nhỏ hơn số sinh viên đã đăng ký (%) ở học kỳ %.', NEW."SoLuongToiDa", rec."SoLuongDaDangKy", rec."MaHocKy";
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_chk_rbtv26_lop
AFTER UPDATE OF "SoLuongToiDa"
ON "LOP"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv26_lop();
CREATE OR REPLACE FUNCTION check_rbtv26_phieudangky()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
    v_sl_thuc_te INT;
    v_sl_dang_ky INT;
BEGIN
    -- Kiểm tra tất cả các lớp liên quan đến phiếu đăng ký bị cập nhật
    FOR rec IN (
        SELECT "MaLop"
        FROM "CHITIETDANGKY"
        WHERE "SoPhieu" = NEW."SoPhieu" AND "TrangThai" = 'Đã đăng ký'
    ) LOOP
        -- Kiểm tra thực tế ở học kỳ mới (hoặc cùng kỳ nếu chỉ đổi TrangThai)
        SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
        FROM "CHITIETDANGKY" ct
        JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
        WHERE ct."MaLop" = rec."MaLop"
          AND pdk."MaHocKy" = NEW."MaHocKy"
          AND ct."TrangThai" = 'Đã đăng ký';

        SELECT "SoLuongDaDangKy" INTO v_sl_dang_ky
        FROM "LOPMO"
        WHERE "MaHocKy" = NEW."MaHocKy" AND "MaLop" = rec."MaLop";

        IF v_sl_dang_ky IS DISTINCT FROM v_sl_thuc_te THEN
            RAISE EXCEPTION 'RBTV26: Cập nhật PHIEUDANGKY làm sai lệch tổng đăng ký.';
        END IF;
    END LOOP;

    -- Nếu thay đổi MaHocKy, phải kiểm tra lại cả các lớp ở Học kỳ cũ
    IF OLD."MaHocKy" <> NEW."MaHocKy" THEN
        FOR rec IN (
            SELECT "MaLop"
            FROM "CHITIETDANGKY"
            WHERE "SoPhieu" = OLD."SoPhieu" AND "TrangThai" = 'Đã đăng ký'
        ) LOOP
            SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
            FROM "CHITIETDANGKY" ct
            JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
            WHERE ct."MaLop" = rec."MaLop"
              AND pdk."MaHocKy" = OLD."MaHocKy"
              AND ct."TrangThai" = 'Đã đăng ký';

            SELECT "SoLuongDaDangKy" INTO v_sl_dang_ky
            FROM "LOPMO"
            WHERE "MaHocKy" = OLD."MaHocKy" AND "MaLop" = rec."MaLop";

            IF v_sl_dang_ky IS DISTINCT FROM v_sl_thuc_te THEN
                RAISE EXCEPTION 'RBTV26: Đổi học kỳ làm sai lệch tổng đăng ký của học kỳ cũ.';
            END IF;
        END LOOP;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_chk_rbtv26_pdk
AFTER UPDATE OF "MaHocKy", "TrangThai"
ON "PHIEUDANGKY"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv26_phieudangky();
--RBTV 27
CREATE OR REPLACE FUNCTION check_rbtv27_phieudangky()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ cần kiểm tra khi phiếu có trạng thái 'Đã hủy'
    IF NEW."TrangThai" = 'Đã hủy' THEN
        -- Tìm xem có chi tiết nào còn 'Đã đăng ký' thuộc phiếu này không
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY"
            WHERE "SoPhieu" = NEW."SoPhieu"
              AND "TrangThai" = 'Đã đăng ký'
        ) THEN
            RAISE EXCEPTION 'RBTV27: Lỗi! Không thể lưu trạng thái "Đã hủy" cho phiếu % vì vẫn còn môn học ở trạng thái "Đã đăng ký".', NEW."SoPhieu";
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Tạo Constraint Trigger (Hoãn kiểm tra đến cuối transaction)
CREATE CONSTRAINT TRIGGER trg_chk_rbtv27_pdk
AFTER UPDATE OF "TrangThai"
ON "PHIEUDANGKY"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv27_phieudangky();
CREATE OR REPLACE FUNCTION check_rbtv27_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_trang_thai_phieu VARCHAR(30);
BEGIN
    -- Chỉ cần kiểm tra khi chi tiết đang ở trạng thái 'Đã đăng ký'
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        -- Lấy trạng thái của phiếu đăng ký chứa môn học này
        SELECT "TrangThai" INTO v_trang_thai_phieu
        FROM "PHIEUDANGKY"
        WHERE "SoPhieu" = NEW."SoPhieu";

        -- Nếu phiếu mẹ đã hủy thì không cho phép chi tiết đăng ký
        IF v_trang_thai_phieu = 'Đã hủy' THEN
            RAISE EXCEPTION 'RBTV27: Lỗi! Không thể thêm hoặc giữ trạng thái "Đã đăng ký" cho chi tiết vì phiếu % đã bị "Đã hủy".', NEW."SoPhieu";
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Tạo Constraint Trigger (Hoãn kiểm tra đến cuối transaction)
CREATE CONSTRAINT TRIGGER trg_chk_rbtv27_ctdk
AFTER INSERT OR UPDATE OF "SoPhieu", "TrangThai"
ON "CHITIETDANGKY"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv27_chitietdangky();
-- =====================================================
-- RBTV28: Không được hủy/xóa đăng ký đã có phiếu thu thành công
-- Bảng liên quan: PHIEUDANGKY, CHITIETDANGKY, PHIEUTHUHOCPHI
-- =====================================================

-- Hàm kiểm tra dùng chung: có tồn tại phiếu thu thành công cho phiếu đăng ký không?
CREATE OR REPLACE FUNCTION fn_rbtv28_co_phieu_thu_thanh_cong(p_so_phieu INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "PHIEUTHUHOCPHI"
        WHERE "SoPhieuDangKy" = p_so_phieu AND "TrangThai" = 'Thành công'
    );
END;
$$ LANGUAGE plpgsql;

-- [RBTV28 - PHIEUDANGKY] Chặn DELETE phiếu đăng ký
CREATE OR REPLACE FUNCTION trg_fn_rbtv28_phieudangky_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF fn_rbtv28_co_phieu_thu_thanh_cong(OLD."SoPhieu") THEN
        RAISE EXCEPTION '[RBTV28] Không thể xóa phiếu đăng ký SoPhieu=% vì đã có phiếu thu học phí thành công. Vui lòng hủy phiếu thu trước.', OLD."SoPhieu";
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv28_phieudangky_delete ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv28_phieudangky_delete BEFORE DELETE ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv28_phieudangky_delete();

-- [RBTV28 - PHIEUDANGKY] Chặn UPDATE TrangThai thành Đã hủy
CREATE OR REPLACE FUNCTION trg_fn_rbtv28_phieudangky_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Đã hủy' AND OLD."TrangThai" <> 'Đã hủy' AND fn_rbtv28_co_phieu_thu_thanh_cong(OLD."SoPhieu") THEN
        RAISE EXCEPTION '[RBTV28] Không thể hủy phiếu đăng ký SoPhieu=% vì đã có phiếu thu học phí thành công. Vui lòng hủy phiếu thu trước.', OLD."SoPhieu";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv28_phieudangky_update ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv28_phieudangky_update BEFORE UPDATE OF "TrangThai" ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv28_phieudangky_update();

-- [RBTV28 - CHITIETDANGKY] Chặn DELETE chi tiết đăng ký
CREATE OR REPLACE FUNCTION trg_fn_rbtv28_chitietdangky_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF fn_rbtv28_co_phieu_thu_thanh_cong(OLD."SoPhieu") THEN
        RAISE EXCEPTION '[RBTV28] Không thể xóa chi tiết id=% (SoPhieu=%) vì phiếu đăng ký đã có phiếu thu thành công.', OLD.id, OLD."SoPhieu";
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv28_chitietdangky_delete ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv28_chitietdangky_delete BEFORE DELETE ON "CHITIETDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv28_chitietdangky_delete();

-- [RBTV28 - CHITIETDANGKY] Chặn UPDATE hủy hoặc giảm tiền/tín chỉ
CREATE OR REPLACE FUNCTION trg_fn_rbtv28_chitietdangky_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."TrangThai" = 'Đã hủy' AND OLD."TrangThai" = 'Đã đăng ký')
       OR (NEW."ThanhTien" < OLD."ThanhTien")
       OR (NEW."SoTinChi" < OLD."SoTinChi")
    THEN
        IF fn_rbtv28_co_phieu_thu_thanh_cong(OLD."SoPhieu") THEN
            RAISE EXCEPTION '[RBTV28] Không thể hủy hoặc giảm học phí/tín chỉ cho id=% (SoPhieu=%) vì đã có phiếu thu thành công.', OLD.id, OLD."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv28_chitietdangky_update ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv28_chitietdangky_update BEFORE UPDATE OF "TrangThai", "ThanhTien", "SoTinChi" ON "CHITIETDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv28_chitietdangky_update();


-- =====================================================
-- RBTV29: Sinh viên trên phiếu thu phải đúng là sinh viên của phiếu đăng ký
-- Bảng liên quan: PHIEUTHUHOCPHI, PHIEUDANGKY
-- =====================================================

-- [RBTV29 - PHIEUTHUHOCPHI] Kiểm tra MaSv khi INSERT/UPDATE
CREATE OR REPLACE FUNCTION trg_fn_rbtv29_phieuthuhocphi()
RETURNS TRIGGER AS $$
DECLARE v_masv_pdk VARCHAR(15);
BEGIN
    SELECT "MaSv" INTO v_masv_pdk FROM "PHIEUDANGKY" WHERE "SoPhieu" = NEW."SoPhieuDangKy";
    IF NOT FOUND THEN
        RAISE EXCEPTION '[RBTV29] Phiếu đăng ký SoPhieu=% không tồn tại.', NEW."SoPhieuDangKy";
    END IF;
    IF NEW."MaSv" <> v_masv_pdk THEN
        RAISE EXCEPTION '[RBTV29] MaSv trên phiếu thu (%) không khớp với MaSv trên phiếu đăng ký SoPhieu=% (%).', NEW."MaSv", NEW."SoPhieuDangKy", v_masv_pdk;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv29_phieuthuhocphi ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv29_phieuthuhocphi BEFORE INSERT OR UPDATE OF "MaSv", "SoPhieuDangKy" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv29_phieuthuhocphi();

-- [RBTV29 - PHIEUDANGKY] Chặn sửa MaSv nếu đã có phiếu thu
CREATE OR REPLACE FUNCTION trg_fn_rbtv29_phieudangky_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."MaSv" <> OLD."MaSv" THEN
        IF EXISTS (SELECT 1 FROM "PHIEUTHUHOCPHI" WHERE "SoPhieuDangKy" = OLD."SoPhieu") THEN
            RAISE EXCEPTION '[RBTV29] Không thể đổi MaSv phiếu đăng ký SoPhieu=% vì đã có phiếu thu liên kết.', OLD."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv29_phieudangky_update ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv29_phieudangky_update BEFORE UPDATE OF "MaSv" ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv29_phieudangky_update();


-- =====================================================
-- RBTV30: Tổng tiền thu thành công <= TongTienPhaiDong
-- Bảng liên quan: PHIEUTHUHOCPHI, PHIEUDANGKY
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv30_kiem_tra_tong_thu(p_so_phieu INTEGER)
RETURNS VOID AS $$
DECLARE
    v_tong_phai_dong NUMERIC(15,0);
    v_tong_da_thu NUMERIC(15,0);
BEGIN
    SELECT "TongTienPhaiDong" INTO v_tong_phai_dong FROM "PHIEUDANGKY" WHERE "SoPhieu" = p_so_phieu;
    IF NOT FOUND THEN RETURN; END IF;

    -- Tính tổng TẤT CẢ phiếu thu thành công
    -- (đã bao gồm dòng vừa Insert/Update vì đây là AFTER trigger)
    SELECT COALESCE(SUM("SoTienThu"), 0) INTO v_tong_da_thu
    FROM "PHIEUTHUHOCPHI"
    WHERE "SoPhieuDangKy" = p_so_phieu AND "TrangThai" = 'Thành công';

    IF v_tong_da_thu > v_tong_phai_dong THEN
        RAISE EXCEPTION '[RBTV30] Tổng tiền đã thu thành công (%) vượt quá TongTienPhaiDong (%) của phiếu đăng ký SoPhieu=%.', v_tong_da_thu, v_tong_phai_dong, p_so_phieu;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- [RBTV30 - PHIEUTHUHOCPHI] AFTER INSERT
CREATE OR REPLACE FUNCTION trg_fn_rbtv30_phieuthuhocphi_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Thành công' THEN
        PERFORM fn_rbtv30_kiem_tra_tong_thu(NEW."SoPhieuDangKy");
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv30_phieuthuhocphi_insert ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv30_phieuthuhocphi_insert AFTER INSERT ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv30_phieuthuhocphi_insert();

-- [RBTV30 - PHIEUTHUHOCPHI] AFTER UPDATE
CREATE OR REPLACE FUNCTION trg_fn_rbtv30_phieuthuhocphi_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Thành công' THEN
        PERFORM fn_rbtv30_kiem_tra_tong_thu(NEW."SoPhieuDangKy");
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv30_phieuthuhocphi_update ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv30_phieuthuhocphi_update AFTER UPDATE OF "SoTienThu", "TrangThai", "SoPhieuDangKy" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv30_phieuthuhocphi_update();

-- [RBTV30 - PHIEUDANGKY] BEFORE UPDATE TongTienPhaiDong
CREATE OR REPLACE FUNCTION trg_fn_rbtv30_phieudangky_update()
RETURNS TRIGGER AS $$
DECLARE v_tong_da_thu NUMERIC(15,0);
BEGIN
    IF NEW."TongTienPhaiDong" < OLD."TongTienPhaiDong" THEN
        SELECT COALESCE(SUM("SoTienThu"), 0) INTO v_tong_da_thu
        FROM "PHIEUTHUHOCPHI"
        WHERE "SoPhieuDangKy" = OLD."SoPhieu" AND "TrangThai" = 'Thành công';

        IF v_tong_da_thu > NEW."TongTienPhaiDong" THEN
            RAISE EXCEPTION '[RBTV30] Không thể giảm TongTienPhaiDong xuống % vì tổng đã thu thành công là % (SoPhieu=%).', NEW."TongTienPhaiDong", v_tong_da_thu, OLD."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv30_phieudangky_update ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv30_phieudangky_update BEFORE UPDATE OF "TongTienPhaiDong" ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv30_phieudangky_update();


-- =====================================================
-- RBTV31: Giao dịch không tiền mặt phải có MaGiaoDich; không trùng lặp
-- Bảng liên quan: PHIEUTHUHOCPHI
-- =====================================================

CREATE OR REPLACE FUNCTION trg_fn_rbtv31_phieuthuhocphi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."HinhThucThu" <> 'Tiền mặt' AND NEW."TrangThai" = 'Thành công' AND NEW."MaGiaoDich" IS NULL THEN
        RAISE EXCEPTION '[RBTV31] Giao dịch không phải tiền mặt với trạng thái Thành công phải có MaGiaoDich (SoPhieuThu=%).', NEW."SoPhieuThu";
    END IF;

    IF NEW."TrangThai" = 'Thành công' AND NEW."MaGiaoDich" IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM "PHIEUTHUHOCPHI"
            WHERE "TrangThai" = 'Thành công'
              AND "MaGiaoDich" = NEW."MaGiaoDich"
              AND ((NEW."PaymentProvider" IS NOT NULL AND "PaymentProvider" = NEW."PaymentProvider") OR (NEW."PaymentProvider" IS NULL AND "PaymentProvider" IS NULL))
              AND "SoPhieuThu" <> COALESCE(NEW."SoPhieuThu", -1)
        ) THEN
            RAISE EXCEPTION '[RBTV31] MaGiaoDich=% đã tồn tại trong một phiếu thu thành công khác (PaymentProvider=%).', NEW."MaGiaoDich", NEW."PaymentProvider";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv31_phieuthuhocphi ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv31_phieuthuhocphi BEFORE INSERT OR UPDATE OF "HinhThucThu", "MaGiaoDich", "PaymentProvider", "TrangThai" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv31_phieuthuhocphi();

-- =====================================================
-- RBTV32: Ngày xác nhận phải nhất quán với trạng thái thanh toán
-- Bảng liên quan: PHIEUTHUHOCPHI
-- =====================================================

CREATE OR REPLACE FUNCTION trg_fn_rbtv32_phieuthuhocphi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Thành công' AND NEW."NgayXacNhan" IS NULL THEN
        RAISE EXCEPTION '[RBTV32] Phiếu thu SoPhieuThu=% có TrangThai Thành công nhưng NgayXacNhan đang NULL.', NEW."SoPhieuThu";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv32_phieuthuhocphi ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv32_phieuthuhocphi BEFORE INSERT OR UPDATE OF "TrangThai", "NgayXacNhan" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv32_phieuthuhocphi();


-- =====================================================
-- RBTV33: Phiếu thu đã thành công không được sửa thông tin định danh chính
-- Bảng liên quan: PHIEUTHUHOCPHI
-- =====================================================

CREATE OR REPLACE FUNCTION trg_fn_rbtv33_phieuthuhocphi()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."TrangThai" <> 'Thành công' THEN RETURN NEW; END IF;

    IF NEW."TrangThai" = 'Đã hủy' THEN
        IF NEW."GhiChu" IS NULL OR TRIM(NEW."GhiChu") = '' THEN
            RAISE EXCEPTION '[RBTV33] Khi hủy phiếu thu đã thành công (SoPhieuThu=%), bắt buộc phải ghi lý do vào GhiChu.', OLD."SoPhieuThu";
        END IF;
        IF NEW."SoPhieuDangKy" <> OLD."SoPhieuDangKy" OR NEW."MaSv" <> OLD."MaSv" OR NEW."SoTienThu" <> OLD."SoTienThu" OR NEW."HinhThucThu" <> OLD."HinhThucThu" OR (NEW."MaGiaoDich" IS DISTINCT FROM OLD."MaGiaoDich") THEN
            RAISE EXCEPTION '[RBTV33] Khi hủy phiếu thu (SoPhieuThu=%), không được thay đổi các trường định danh.', OLD."SoPhieuThu";
        END IF;
        RETURN NEW;
    END IF;

    IF NEW."SoPhieuDangKy" <> OLD."SoPhieuDangKy" OR NEW."MaSv" <> OLD."MaSv" OR NEW."SoTienThu" <> OLD."SoTienThu" OR NEW."HinhThucThu" <> OLD."HinhThucThu" OR (NEW."MaGiaoDich" IS DISTINCT FROM OLD."MaGiaoDich") THEN
        RAISE EXCEPTION '[RBTV33] Không thể sửa thông tin định danh của phiếu thu đã thành công (SoPhieuThu=%).', OLD."SoPhieuThu";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv33_phieuthuhocphi ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv33_phieuthuhocphi BEFORE UPDATE ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv33_phieuthuhocphi();




-- KỊCH BẢN TỔNG HỢP TRIGGER RBTV34
-- CHÚ Ý: ĐÃ LOẠI BỎ TOÀN BỘ KÝ HIỆU // THEO YÊU CẦU

-- ==============================================================================
-- PHẦN 1: BẢO VỆ TỪ PHÍA BẢNG CON (KHI INSERT HOẶC UPDATE LÊN TRẠNG THÁI HOẠT ĐỘNG)
-- ==============================================================================

-- 1. CHITIETDANGKY
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_Lop_DaXoa BOOLEAN; v_Lop_TrangThai BOOLEAN;
    v_Mon_DaXoa BOOLEAN; v_Mon_TrangThai BOOLEAN;
    v_Phieu_TrangThai VARCHAR;
BEGIN
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        SELECT "DaXoa", "TrangThai" INTO v_Lop_DaXoa, v_Lop_TrangThai FROM "LOP" WHERE "MaLop" = NEW."MaLop";
        IF COALESCE(v_Lop_DaXoa, FALSE) = TRUE OR COALESCE(v_Lop_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: LOP % khong hop le.', NEW."MaLop";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Mon_DaXoa, v_Mon_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;

        SELECT "TrangThai" INTO v_Phieu_TrangThai FROM "PHIEUDANGKY" WHERE "SoPhieu" = NEW."SoPhieu";
        IF COALESCE(v_Phieu_TrangThai, '') != 'Đã đăng ký' THEN
            RAISE EXCEPTION 'RBTV34: PHIEUDANGKY % khong hop le.', NEW."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_chitietdangky
BEFORE INSERT OR UPDATE OF "MaLop", "MaMonHoc", "SoPhieu", "TrangThai" ON "CHITIETDANGKY"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_chitietdangky();

-- 2. PHIEUDANGKY
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_phieudangky()
RETURNS TRIGGER AS $$
DECLARE
    v_Sv_DaXoa BOOLEAN; v_Sv_TrangThai VARCHAR;
    v_Hk_DaXoa BOOLEAN; v_Hk_TrangThai VARCHAR;
BEGIN
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        SELECT "DaXoa", "TrangThai" INTO v_Sv_DaXoa, v_Sv_TrangThai FROM "SINHVIEN" WHERE "MaSv" = NEW."MaSv";
        IF COALESCE(v_Sv_DaXoa, FALSE) = TRUE OR v_Sv_TrangThai != 'Đang học' THEN
            RAISE EXCEPTION 'RBTV34: SINHVIEN % khong hop le.', NEW."MaSv";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Hk_DaXoa, v_Hk_TrangThai FROM "HOCKY" WHERE "MaHocKy" = NEW."MaHocKy";
        IF COALESCE(v_Hk_DaXoa, FALSE) = TRUE OR v_Hk_TrangThai = 'Đã kết thúc' THEN
            RAISE EXCEPTION 'RBTV34: HOCKY % khong hop le.', NEW."MaHocKy";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_phieudangky
BEFORE INSERT OR UPDATE OF "MaSv", "MaHocKy", "TrangThai" ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_phieudangky();

-- 3. PHIEUTHUHOCPHI
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_phieuthuhocphi()
RETURNS TRIGGER AS $$
DECLARE
    v_Phieu_TrangThai VARCHAR;
    v_Sv_DaXoa BOOLEAN;
BEGIN
    IF NEW."TrangThai" = 'Thành công' THEN
        SELECT "TrangThai" INTO v_Phieu_TrangThai FROM "PHIEUDANGKY" WHERE "SoPhieu" = NEW."SoPhieuDangKy";
        IF COALESCE(v_Phieu_TrangThai, '') != 'Đã đăng ký' THEN
            RAISE EXCEPTION 'RBTV34: PHIEUDANGKY % khong hop le.', NEW."SoPhieuDangKy";
        END IF;

        SELECT "DaXoa" INTO v_Sv_DaXoa FROM "SINHVIEN" WHERE "MaSv" = NEW."MaSv";
        IF COALESCE(v_Sv_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: SINHVIEN % khong hop le.', NEW."MaSv";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_phieuthuhocphi
BEFORE INSERT OR UPDATE OF "SoPhieuDangKy", "MaSv", "TrangThai" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_phieuthuhocphi();

-- 4. LOPMO
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lopmo()
RETURNS TRIGGER AS $$
DECLARE
    v_Hk_DaXoa BOOLEAN; v_Lop_DaXoa BOOLEAN; v_Lop_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa" INTO v_Hk_DaXoa FROM "HOCKY" WHERE "MaHocKy" = NEW."MaHocKy";
        IF COALESCE(v_Hk_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: HOCKY % khong hop le.', NEW."MaHocKy";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Lop_DaXoa, v_Lop_TrangThai FROM "LOP" WHERE "MaLop" = NEW."MaLop";
        IF COALESCE(v_Lop_DaXoa, FALSE) = TRUE OR COALESCE(v_Lop_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: LOP % khong hop le.', NEW."MaLop";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_lopmo
BEFORE INSERT OR UPDATE OF "MaHocKy", "MaLop", "TrangThai" ON "LOPMO"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lopmo();

-- 5. MONDAHOC
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_mondahoc()
RETURNS TRIGGER AS $$
DECLARE
    v_Sv_DaXoa BOOLEAN; v_Mon_DaXoa BOOLEAN; v_Mon_TrangThai BOOLEAN;
    v_Hk_DaXoa BOOLEAN; v_Lop_DaXoa BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE THEN
        SELECT "DaXoa" INTO v_Sv_DaXoa FROM "SINHVIEN" WHERE "MaSv" = NEW."MaSv";
        IF COALESCE(v_Sv_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: SINHVIEN % khong hop le.', NEW."MaSv";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Mon_DaXoa, v_Mon_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;

        SELECT "DaXoa" INTO v_Hk_DaXoa FROM "HOCKY" WHERE "MaHocKy" = NEW."MaHocKy";
        IF COALESCE(v_Hk_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: HOCKY % khong hop le.', NEW."MaHocKy";
        END IF;

        IF NEW."MaLop" IS NOT NULL THEN
            SELECT "DaXoa" INTO v_Lop_DaXoa FROM "LOP" WHERE "MaLop" = NEW."MaLop";
            IF COALESCE(v_Lop_DaXoa, FALSE) = TRUE THEN
                RAISE EXCEPTION 'RBTV34: LOP % khong hop le.', NEW."MaLop";
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_mondahoc
BEFORE INSERT OR UPDATE OF "MaSv", "MaMonHoc", "MaHocKy", "MaLop", "DaXoa" ON "MONDAHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_mondahoc();

-- 6. PHUONGXA
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_phuongxa()
RETURNS TRIGGER AS $$
DECLARE v_Tinh_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "TrangThai" INTO v_Tinh_TrangThai FROM "TINH" WHERE "MaTinh" = NEW."MaTinh";
        IF COALESCE(v_Tinh_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: TINH % khong hop le.', NEW."MaTinh";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_phuongxa
BEFORE INSERT OR UPDATE OF "MaTinh", "TrangThai" ON "PHUONGXA"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_phuongxa();

-- 7. NGANHHOC & MONHOC
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_khoa_ref()
RETURNS TRIGGER AS $$
DECLARE v_Khoa_DaXoa BOOLEAN; v_Khoa_TrangThai BOOLEAN;
BEGIN
    IF (NEW."DaXoa" IS NULL OR NEW."DaXoa" = FALSE) AND NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa", "TrangThai" INTO v_Khoa_DaXoa, v_Khoa_TrangThai FROM "KHOA" WHERE "MaKhoa" = NEW."MaKhoa";
        IF COALESCE(v_Khoa_DaXoa, FALSE) = TRUE OR COALESCE(v_Khoa_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: KHOA % khong hop le.', NEW."MaKhoa";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_nganhhoc
BEFORE INSERT OR UPDATE OF "MaKhoa", "TrangThai", "DaXoa" ON "NGANHHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_khoa_ref();

CREATE TRIGGER trg_rbtv34_monhoc
BEFORE INSERT OR UPDATE OF "MaKhoa", "TrangThai", "DaXoa" ON "MONHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_khoa_ref();

-- 8. DIEUKIENMONHOC
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_dieukienmonhoc()
RETURNS TRIGGER AS $$
DECLARE
    v_Mon1_DaXoa BOOLEAN; v_Mon1_TrangThai BOOLEAN;
    v_Mon2_DaXoa BOOLEAN; v_Mon2_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa", "TrangThai" INTO v_Mon1_DaXoa, v_Mon1_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon1_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon1_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Mon2_DaXoa, v_Mon2_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonDieuKien";
        IF COALESCE(v_Mon2_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon2_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC dieu kien % khong hop le.', NEW."MaMonDieuKien";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_dieukienmonhoc
BEFORE INSERT OR UPDATE OF "MaMonHoc", "MaMonDieuKien", "TrangThai", "DaXoa" ON "DIEUKIENMONHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_dieukienmonhoc();

-- 9. LOP
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lop()
RETURNS TRIGGER AS $$
DECLARE v_Mon_DaXoa BOOLEAN; v_Mon_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa", "TrangThai" INTO v_Mon_DaXoa, v_Mon_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_lop
BEFORE INSERT OR UPDATE OF "MaMonHoc", "TrangThai", "DaXoa" ON "LOP"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lop();

-- 10. CHUONGTRINHHOC
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_chuongtrinhhoc()
RETURNS TRIGGER AS $$
DECLARE
    v_Nganh_DaXoa BOOLEAN; v_Nganh_TrangThai BOOLEAN;
    v_Mon_DaXoa BOOLEAN; v_Mon_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa", "TrangThai" INTO v_Nganh_DaXoa, v_Nganh_TrangThai FROM "NGANHHOC" WHERE "MaNganh" = NEW."MaNganh";
        IF COALESCE(v_Nganh_DaXoa, FALSE) = TRUE OR COALESCE(v_Nganh_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NGANHHOC % khong hop le.', NEW."MaNganh";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Mon_DaXoa, v_Mon_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_chuongtrinhhoc
BEFORE INSERT OR UPDATE OF "MaNganh", "MaMonHoc", "TrangThai" ON "CHUONGTRINHHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_chuongtrinhhoc();

-- 11. HOCKY
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_hocky()
RETURNS TRIGGER AS $$
DECLARE v_Nam_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" != 'Đã kết thúc' THEN
        SELECT "TrangThai" INTO v_Nam_TrangThai FROM "NAMHOC" WHERE "MaNamHoc" = NEW."MaNamHoc";
        IF COALESCE(v_Nam_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NAMHOC % khong hop le.', NEW."MaNamHoc";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_hocky
BEFORE INSERT OR UPDATE OF "MaNamHoc", "TrangThai", "DaXoa" ON "HOCKY"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_hocky();

-- 12. LICHHOCLOP
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    v_LopMo_TrangThai BOOLEAN;
    v_Tiet1_DaXoa BOOLEAN; v_Tiet1_TrangThai BOOLEAN;
    v_Tiet2_DaXoa BOOLEAN; v_Tiet2_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "TrangThai" INTO v_LopMo_TrangThai FROM "LOPMO" WHERE id = NEW."LopMoId";
        IF COALESCE(v_LopMo_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: LOPMO % khong hop le.', NEW."LopMoId";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Tiet1_DaXoa, v_Tiet1_TrangThai FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
        IF COALESCE(v_Tiet1_DaXoa, FALSE) = TRUE OR COALESCE(v_Tiet1_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: TIETHOC bat dau % khong hop le.', NEW."MaTietBatDau";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Tiet2_DaXoa, v_Tiet2_TrangThai FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";
        IF COALESCE(v_Tiet2_DaXoa, FALSE) = TRUE OR COALESCE(v_Tiet2_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: TIETHOC ket thuc % khong hop le.', NEW."MaTietKetThuc";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_lichhoclop
BEFORE INSERT OR UPDATE OF "LopMoId", "MaTietBatDau", "MaTietKetThuc", "TrangThai" ON "LICHHOCLOP"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lichhoclop();

-- 13. DONGIATINCHI
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_dongiatinchi()
RETURNS TRIGGER AS $$
DECLARE v_Hk_DaXoa BOOLEAN; v_Hk_TrangThai VARCHAR;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = TRUE AND NEW."MaHocKy" IS NOT NULL THEN
        SELECT "DaXoa", "TrangThai" INTO v_Hk_DaXoa, v_Hk_TrangThai FROM "HOCKY" WHERE "MaHocKy" = NEW."MaHocKy";
        IF COALESCE(v_Hk_DaXoa, FALSE) = TRUE OR v_Hk_TrangThai = 'Đã kết thúc' THEN
            RAISE EXCEPTION 'RBTV34: HOCKY % khong hop le.', NEW."MaHocKy";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_dongiatinchi
BEFORE INSERT OR UPDATE OF "MaHocKy", "TrangThai", "DaXoa" ON "DONGIATINCHI"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_dongiatinchi();

-- 14. SINHVIEN
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_sinhvien()
RETURNS TRIGGER AS $$
DECLARE
    v_Px_TrangThai BOOLEAN; v_Dt_TrangThai BOOLEAN;
    v_Ng_DaXoa BOOLEAN; v_Ng_TrangThai BOOLEAN;
    v_Nd_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = 'Đang học' THEN
        SELECT "TrangThai" INTO v_Px_TrangThai FROM "PHUONGXA" WHERE "MaPhuongXa" = NEW."MaPhuongXa";
        IF COALESCE(v_Px_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: PHUONGXA % khong hop le.', NEW."MaPhuongXa";
        END IF;

        SELECT "TrangThai" INTO v_Dt_TrangThai FROM "DANTOC" WHERE "MaDanToc" = NEW."MaDanToc";
        IF COALESCE(v_Dt_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: DANTOC % khong hop le.', NEW."MaDanToc";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Ng_DaXoa, v_Ng_TrangThai FROM "NGANHHOC" WHERE "MaNganh" = NEW."MaNganh";
        IF COALESCE(v_Ng_DaXoa, FALSE) = TRUE OR COALESCE(v_Ng_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NGANHHOC % khong hop le.', NEW."MaNganh";
        END IF;

        IF NEW."MaTaiKhoan" IS NOT NULL THEN
            SELECT "TrangThai" INTO v_Nd_TrangThai FROM "NGUOIDUNG" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan";
            IF COALESCE(v_Nd_TrangThai, TRUE) = FALSE THEN
                RAISE EXCEPTION 'RBTV34: NGUOIDUNG % khong hop le.', NEW."MaTaiKhoan";
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_sinhvien
BEFORE INSERT OR UPDATE OF "MaPhuongXa", "MaDanToc", "MaNganh", "MaTaiKhoan", "TrangThai", "DaXoa" ON "SINHVIEN"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_sinhvien();

-- 15. NGUOIDUNG
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_nguoidung()
RETURNS TRIGGER AS $$
DECLARE
    v_Nhom_DaXoa BOOLEAN; v_Sv_DaXoa BOOLEAN; v_Sv_TrangThai VARCHAR;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa" INTO v_Nhom_DaXoa FROM "NHOMNGUOIDUNG" WHERE "MaNhom" = NEW."MaNhom";
        IF COALESCE(v_Nhom_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: NHOMNGUOIDUNG % khong hop le.', NEW."MaNhom";
        END IF;

        IF NEW."MaSv" IS NOT NULL THEN
            SELECT "DaXoa", "TrangThai" INTO v_Sv_DaXoa, v_Sv_TrangThai FROM "SINHVIEN" WHERE "MaSv" = NEW."MaSv";
            IF COALESCE(v_Sv_DaXoa, FALSE) = TRUE OR v_Sv_TrangThai != 'Đang học' THEN
                RAISE EXCEPTION 'RBTV34: SINHVIEN % khong hop le.', NEW."MaSv";
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_nguoidung
BEFORE INSERT OR UPDATE OF "MaNhom", "MaSv", "TrangThai" ON "NGUOIDUNG"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_nguoidung();

-- 16. QUANTRIVIEN
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_quantrivien()
RETURNS TRIGGER AS $$
DECLARE v_Nd_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "TrangThai" INTO v_Nd_TrangThai FROM "NGUOIDUNG" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan";
        IF COALESCE(v_Nd_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NGUOIDUNG % khong hop le.', NEW."MaTaiKhoan";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_quantrivien
BEFORE INSERT OR UPDATE OF "MaTaiKhoan", "TrangThai" ON "QUANTRIVIEN"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_quantrivien();

-- 17. THONGBAO
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_thongbao()
RETURNS TRIGGER AS $$
DECLARE v_Nd_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = TRUE THEN
        SELECT "TrangThai" INTO v_Nd_TrangThai FROM "NGUOIDUNG" WHERE "MaTaiKhoan" = NEW."MaTaiKhoanNhan";
        IF COALESCE(v_Nd_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NGUOIDUNG % khong hop le.', NEW."MaTaiKhoanNhan";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rbtv34_thongbao
BEFORE INSERT OR UPDATE OF "MaTaiKhoanNhan", "TrangThai", "DaXoa" ON "THONGBAO"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_thongbao();


-- ==============================================================================
-- PHẦN 2: BẢO VỆ TỪ PHÍA BẢNG CHA (KHI UPDATE XÓA MỀM HOẶC TẮT TRẠNG THÁI)
-- ==============================================================================

-- 1. LOP (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lop_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "MaLop" = NEW."MaLop" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHITIETDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "LOPMO" WHERE "MaLop" = NEW."MaLop" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LOPMO con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONDAHOC" WHERE "MaLop" = NEW."MaLop" AND "DaXoa" = FALSE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONDAHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "LICHHOCLOP" ll JOIN "LOPMO" lm ON ll."LopMoId" = lm.id WHERE lm."MaLop" = NEW."MaLop" AND ll."TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LICHHOCLOP con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_lop_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "LOP" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lop_parent();

-- 2. MONHOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_monhoc_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "MaMonHoc" = NEW."MaMonHoc" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHITIETDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONDAHOC" WHERE "MaMonHoc" = NEW."MaMonHoc" AND "DaXoa" = FALSE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONDAHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "DIEUKIENMONHOC" WHERE ("MaMonHoc" = NEW."MaMonHoc" OR "MaMonDieuKien" = NEW."MaMonHoc") AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: DIEUKIENMONHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "LOP" WHERE "MaMonHoc" = NEW."MaMonHoc" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LOP con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "CHUONGTRINHHOC" WHERE "MaMonHoc" = NEW."MaMonHoc" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHUONGTRINHHOC con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_monhoc_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "MONHOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_monhoc_parent();

-- 3. HOCKY (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_hocky_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = 'Đã kết thúc' AND OLD."TrangThai" != 'Đã kết thúc') THEN
        IF EXISTS (SELECT 1 FROM "PHIEUDANGKY" WHERE "MaHocKy" = NEW."MaHocKy" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHIEUDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "LOPMO" WHERE "MaHocKy" = NEW."MaHocKy" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LOPMO con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONDAHOC" WHERE "MaHocKy" = NEW."MaHocKy" AND "DaXoa" = FALSE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONDAHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "DONGIATINCHI" WHERE "MaHocKy" = NEW."MaHocKy" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: DONGIATINCHI con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_hocky_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "HOCKY" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_hocky_parent();

-- 4. SINHVIEN (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_sinhvien_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" != 'Đang học' AND OLD."TrangThai" = 'Đang học') THEN
        IF EXISTS (SELECT 1 FROM "PHIEUDANGKY" WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHIEUDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "PHIEUTHUHOCPHI" WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = 'Thành công') THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHIEUTHUHOCPHI con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONDAHOC" WHERE "MaSv" = NEW."MaSv" AND "DaXoa" = FALSE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONDAHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "NGUOIDUNG" WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: NGUOIDUNG con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_sinhvien_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "SINHVIEN" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_sinhvien_parent();

-- 5. PHIEUDANGKY (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_phieudangky_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Đã hủy' AND OLD."TrangThai" != 'Đã hủy' THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "SoPhieu" = NEW."SoPhieu" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHITIETDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "PHIEUTHUHOCPHI" WHERE "SoPhieuDangKy" = NEW."SoPhieu" AND "TrangThai" = 'Thành công') THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHIEUTHUHOCPHI con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_phieudangky_parent BEFORE UPDATE OF "TrangThai" ON "PHIEUDANGKY" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_phieudangky_parent();

-- 6. TINH (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_tinh_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (SELECT 1 FROM "PHUONGXA" WHERE "MaTinh" = NEW."MaTinh" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHUONGXA con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_tinh_parent BEFORE UPDATE OF "TrangThai" ON "TINH" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_tinh_parent();

-- 7. KHOA (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_khoa_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "NGANHHOC" WHERE "MaKhoa" = NEW."MaKhoa" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: NGANHHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONHOC" WHERE "MaKhoa" = NEW."MaKhoa" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONHOC con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_khoa_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "KHOA" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_khoa_parent();

-- 8. NAMHOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_namhoc_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (SELECT 1 FROM "HOCKY" WHERE "MaNamHoc" = NEW."MaNamHoc" AND "DaXoa" = FALSE AND "TrangThai" != 'Đã kết thúc') THEN RAISE EXCEPTION 'RBTV34 Lỗi: HOCKY con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_namhoc_parent BEFORE UPDATE OF "TrangThai" ON "NAMHOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_namhoc_parent();

-- 9. LOPMO (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lopmo_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (SELECT 1 FROM "LICHHOCLOP" WHERE "LopMoId" = NEW.id AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LICHHOCLOP con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_lopmo_parent BEFORE UPDATE OF "TrangThai" ON "LOPMO" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lopmo_parent();

-- 10. TIETHOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_tiethoc_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "LICHHOCLOP" WHERE ("MaTietBatDau" = NEW."MaTiet" OR "MaTietKetThuc" = NEW."MaTiet") AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LICHHOCLOP con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_tiethoc_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "TIETHOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_tiethoc_parent();

-- 11. PHUONGXA & DANTOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_px_dt_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF TG_TABLE_NAME = 'PHUONGXA' THEN
            IF EXISTS (SELECT 1 FROM "SINHVIEN" WHERE "MaPhuongXa" = NEW."MaPhuongXa" AND "DaXoa" = FALSE AND "TrangThai" = 'Đang học') THEN RAISE EXCEPTION 'RBTV34 Lỗi: SINHVIEN con hoat dong.'; END IF;
        ELSIF TG_TABLE_NAME = 'DANTOC' THEN
            IF EXISTS (SELECT 1 FROM "SINHVIEN" WHERE "MaDanToc" = NEW."MaDanToc" AND "DaXoa" = FALSE AND "TrangThai" = 'Đang học') THEN RAISE EXCEPTION 'RBTV34 Lỗi: SINHVIEN con hoat dong.'; END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_phuongxa_parent BEFORE UPDATE OF "TrangThai" ON "PHUONGXA" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_px_dt_parent();
CREATE TRIGGER trg_rbtv34_dantoc_parent BEFORE UPDATE OF "TrangThai" ON "DANTOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_px_dt_parent();

-- 12. NGANHHOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_nganhhoc_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "SINHVIEN" WHERE "MaNganh" = NEW."MaNganh" AND "DaXoa" = FALSE AND "TrangThai" = 'Đang học') THEN RAISE EXCEPTION 'RBTV34 Lỗi: SINHVIEN con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "CHUONGTRINHHOC" WHERE "MaNganh" = NEW."MaNganh" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHUONGTRINHHOC con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_nganhhoc_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "NGANHHOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_nganhhoc_parent();

-- 13. NHOMNGUOIDUNG (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_nhomnguoidung_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE THEN
        IF EXISTS (SELECT 1 FROM "NGUOIDUNG" WHERE "MaNhom" = NEW."MaNhom" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: NGUOIDUNG con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_nhomnguoidung_parent BEFORE UPDATE OF "DaXoa" ON "NHOMNGUOIDUNG" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_nhomnguoidung_parent();

-- 14. NGUOIDUNG (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_nguoidung_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (SELECT 1 FROM "SINHVIEN" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan" AND "DaXoa" = FALSE AND "TrangThai" = 'Đang học') THEN RAISE EXCEPTION 'RBTV34 Lỗi: SINHVIEN con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "QUANTRIVIEN" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: QUANTRIVIEN con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "THONGBAO" WHERE "MaTaiKhoanNhan" = NEW."MaTaiKhoan" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: THONGBAO con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rbtv34_nguoidung_parent BEFORE UPDATE OF "TrangThai" ON "NGUOIDUNG" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_nguoidung_parent();
-- =====================================================
-- =====================================================
-- SAMPLE DATA - Dữ liệu mẫu
-- =====================================================

-- =====================================================
-- INSERT DATA - Dân tộc (Ethnicities)
-- =====================================================
INSERT INTO "DANTOC" ("MaDanToc", "TenDanToc", "LaDanTocThieuSo") VALUES
('KINH', 'Kinh', FALSE),
('TAY', 'Tày', TRUE),
('THAI', 'Thái', TRUE),
('MUONG', 'Mường', TRUE),
('KHMER', 'Khmer', TRUE),
('MONG', 'Mông', TRUE),
('NUNG', 'Nùng', TRUE),
('HOA', 'Hoa', TRUE),
('DAO', 'Dao', TRUE),
('GIARAI', 'Gia Rai', TRUE),
('EDE', 'Ê Đê', TRUE),
('BAHNAR', 'Ba Na', TRUE),
('XODANG', 'Xơ Đăng', TRUE),
('STIENG', 'Stiêng', TRUE),
('COTU', 'Cơ Tu', TRUE),
('CHAMPA', 'Chăm', TRUE),
('KHAC', 'Dân tộc khác', TRUE);

-- =====================================================
-- INSERT DATA - Tỉnh/Thành phố (từ ITExpressLocation.sql)
-- =====================================================
INSERT INTO "TINH" ("MaTinh", "TenTinh", "LoaiTinh") VALUES
('1', 'Hà Nội', 'Thành phố'),
('2', 'Bắc Ninh', 'Tỉnh'),
('3', 'Quảng Ninh', 'Tỉnh'),
('4', 'Hải Phòng', 'Thành phố'),
('5', 'Hưng Yên', 'Tỉnh'),
('6', 'Ninh Bình', 'Tỉnh'),
('7', 'Cao Bằng', 'Tỉnh'),
('8', 'Tuyên Quang', 'Tỉnh'),
('9', 'Lào Cai', 'Tỉnh'),
('10', 'Thái Nguyên', 'Tỉnh'),
('11', 'Lạng Sơn', 'Tỉnh'),
('12', 'Phú Thọ', 'Tỉnh'),
('13', 'Điện Biên', 'Tỉnh'),
('14', 'Lai Châu', 'Tỉnh'),
('15', 'Sơn La', 'Tỉnh'),
('16', 'Thanh Hoá', 'Tỉnh'),
('17', 'Nghệ An', 'Tỉnh'),
('18', 'Hà Tĩnh', 'Tỉnh'),
('19', 'Quảng Trị', 'Tỉnh'),
('20', 'Huế', 'Thành phố'),
('21', 'Đà Nẵng', 'Thành phố'),
('22', 'Quảng Ngãi', 'Tỉnh'),
('23', 'Khánh Hòa', 'Tỉnh'),
('24', 'Gia Lai', 'Tỉnh'),
('25', 'Đắk Lắk', 'Tỉnh'),
('26', 'Lâm Đồng', 'Tỉnh'),
('27', 'Tây Ninh', 'Tỉnh'),
('28', 'Đồng Nai', 'Tỉnh'),
('29', 'Hồ Chí Minh', 'Thành phố'),
('30', 'Vĩnh Long', 'Tỉnh'),
('31', 'Đồng Tháp', 'Tỉnh'),
('32', 'An Giang', 'Tỉnh'),
('33', 'Cần Thơ', 'Thành phố'),
('34', 'Cà Mau', 'Tỉnh');

-- =====================================================
-- INSERT DATA - Phường/Xã (từ ITExpressLocation.sql)
-- Ghi chú: "KhuVuc" được phân loại theo tra-cuu-khu-vuc-uu-tien-2025.docx
-- Trong bản mẫu này, các tỉnh miền núi phía Bắc và Tây Nguyên được đánh dấu KV3:
--   - Cao Bằng(7), Tuyên Quang(8), Lào Cai(9), Lạng Sơn(11)
--   - Phú Thọ(12), Điện Biên(13), Lai Châu(14), Sơn La(15)
--   - Gia Lai(24), Đắk Lắk(25)
-- Lưu ý: Danh sách này cần được cập nhật theo quy định chính thức năm 2025
-- =====================================================
INSERT INTO "PHUONGXA" ("MaPhuongXa", "TenPhuongXa", "MaTinh", "Loai", "KhuVuc") VALUES
('1', 'Hoàn Kiếm', '1', 'Phường', 'KV1'),
('2', 'Cửa Nam', '1', 'Phường', 'KV1'),
('3', 'Ba Đình', '1', 'Phường', 'KV1'),
('4', 'Ngọc Hà', '1', 'Phường', 'KV1'),
('5', 'Giảng Võ', '1', 'Phường', 'KV1'),
('6', 'Hai Bà Trưng', '1', 'Phường', 'KV1'),
('7', 'Vĩnh Tuy', '1', 'Phường', 'KV1'),
('8', 'Bạch Mai', '1', 'Phường', 'KV1'),
('9', 'Đống Đa', '1', 'Phường', 'KV1'),
('10', 'Kim Liên', '1', 'Phường', 'KV1'),
('11', 'Văn Miếu - Quốc Tử Giám', '1', 'Phường', 'KV1'),
('12', 'Láng', '1', 'Phường', 'KV1'),
('13', 'Ô Chợ Dừa', '1', 'Phường', 'KV1'),
('14', 'Hồng Hà', '1', 'Phường', 'KV1'),
('15', 'Lĩnh Nam', '1', 'Phường', 'KV1'),
('16', 'Hoàng Mai', '1', 'Phường', 'KV1'),
('17', 'Vĩnh Hưng', '1', 'Phường', 'KV1'),
('18', 'Tương Mai', '1', 'Phường', 'KV1'),
('19', 'Định Công', '1', 'Phường', 'KV1'),
('20', 'Hoàng Liệt', '1', 'Phường', 'KV1'),
('21', 'Yên Sở', '1', 'Phường', 'KV1'),
('22', 'Thanh Xuân', '1', 'Phường', 'KV1'),
('23', 'Khương Đình', '1', 'Phường', 'KV1'),
('24', 'Phương Liệt', '1', 'Phường', 'KV1'),
('25', 'Cầu Giấy', '1', 'Phường', 'KV1'),
('26', 'Nghĩa Đô', '1', 'Phường', 'KV1'),
('27', 'Yên Hoà', '1', 'Phường', 'KV1'),
('28', 'Tây Hồ', '1', 'Phường', 'KV1'),
('29', 'Phú Thượng', '1', 'Phường', 'KV1'),
('30', 'Tây Tựu', '1', 'Phường', 'KV1'),
('31', 'Phú Diễn', '1', 'Phường', 'KV1'),
('32', 'Xuân Đỉnh', '1', 'Phường', 'KV1'),
('33', 'Đông Ngạc', '1', 'Phường', 'KV1'),
('34', 'Thượng Cát', '1', 'Phường', 'KV1'),
('35', 'Từ Liêm', '1', 'Phường', 'KV1'),
('36', 'Xuân Phương', '1', 'Phường', 'KV1'),
('37', 'Tây Mỗ', '1', 'Phường', 'KV1'),
('38', 'Đại Mỗ', '1', 'Phường', 'KV1'),
('39', 'Long Biên', '1', 'Phường', 'KV1'),
('40', 'Bồ Đề', '1', 'Phường', 'KV1'),
('41', 'Việt Hưng', '1', 'Phường', 'KV1'),
('42', 'Phúc Lợi', '1', 'Phường', 'KV1'),
('43', 'Hà Đông', '1', 'Phường', 'KV1'),
('44', 'Dương Nội', '1', 'Phường', 'KV1'),
('45', 'Yên Nghĩa', '1', 'Phường', 'KV1'),
('46', 'Phú Lương', '1', 'Phường', 'KV1'),
('47', 'Kiến Hưng', '1', 'Phường', 'KV1'),
('48', 'Thanh Trì', '1', 'Xã', 'KV1'),
('49', 'Đại Thanh', '1', 'Xã', 'KV1'),
('50', 'Nam Phù', '1', 'Xã', 'KV1'),
('51', 'Ngọc Hồi', '1', 'Xã', 'KV1'),
('52', 'Thanh Liệt', '1', 'Phường', 'KV1'),
('53', 'Thượng Phúc', '1', 'Xã', 'KV1'),
('54', 'Thường Tín', '1', 'Xã', 'KV1'),
('55', 'Chương Dương', '1', 'Xã', 'KV1'),
('56', 'Hồng Vân', '1', 'Xã', 'KV1'),
('57', 'Phú Xuyên', '1', 'Xã', 'KV1'),
('58', 'Phượng Dực', '1', 'Xã', 'KV1'),
('59', 'Chuyên Mỹ', '1', 'Xã', 'KV1'),
('60', 'Đại Xuyên', '1', 'Xã', 'KV1'),
('61', 'Thanh Oai', '1', 'Xã', 'KV1'),
('62', 'Bình Minh', '1', 'Xã', 'KV1'),
('63', 'Tam Hưng', '1', 'Xã', 'KV1'),
('64', 'Dân Hoà', '1', 'Xã', 'KV1'),
('65', 'Vân Đình', '1', 'Xã', 'KV1'),
('66', 'Ứng Thiên', '1', 'Xã', 'KV1'),
('67', 'Hoà Xá', '1', 'Xã', 'KV1'),
('68', 'Ứng Hoà', '1', 'Xã', 'KV1'),
('69', 'Mỹ Đức', '1', 'Xã', 'KV1'),
('70', 'Hồng Sơn', '1', 'Xã', 'KV1'),
('71', 'Phúc Sơn', '1', 'Xã', 'KV1'),
('72', 'Hương Sơn', '1', 'Xã', 'KV1'),
('73', 'Chương Mỹ', '1', 'Phường', 'KV1'),
('74', 'Phú Nghĩa', '1', 'Xã', 'KV1'),
('75', 'Xuân Mai', '1', 'Xã', 'KV1'),
('76', 'Trần Phú', '1', 'Xã', 'KV1'),
('77', 'Hoà Phú', '1', 'Xã', 'KV1'),
('78', 'Quảng Bị', '1', 'Xã', 'KV1'),
('79', 'Minh Châu', '1', 'Xã', 'KV1'),
('80', 'Quảng Oai', '1', 'Xã', 'KV1'),
('81', 'Vật Lại', '1', 'Xã', 'KV1'),
('82', 'Cổ Đô', '1', 'Xã', 'KV1'),
('83', 'Bất Bạt', '1', 'Xã', 'KV1'),
('84', 'Suối Hai', '1', 'Xã', 'KV1'),
('85', 'Ba Vì', '1', 'Xã', 'KV1'),
('86', 'Yên Bài', '1', 'Xã', 'KV1'),
('87', 'Sơn Tây', '1', 'Phường', 'KV1'),
('88', 'Tùng Thiện', '1', 'Phường', 'KV1'),
('89', 'Đoài Phương', '1', 'Xã', 'KV1'),
('90', 'Phúc Thọ', '1', 'Xã', 'KV1'),
('91', 'Phúc Lộc', '1', 'Xã', 'KV1'),
('92', 'Hát Môn', '1', 'Xã', 'KV1'),
('93', 'Thạch Thất', '1', 'Xã', 'KV1'),
('94', 'Hạ Bằng', '1', 'Xã', 'KV1'),
('95', 'Tây Phương', '1', 'Xã', 'KV1'),
('96', 'Hoà Lạc', '1', 'Xã', 'KV1'),
('97', 'Yên Xuân', '1', 'Xã', 'KV1'),
('98', 'Quốc Oai', '1', 'Xã', 'KV1'),
('99', 'Hưng Đạo', '1', 'Xã', 'KV1'),
('100', 'Kiều Phú', '1', 'Xã', 'KV1'),
('101', 'Phú Cát', '1', 'Xã', 'KV1'),
('102', 'Hoài Đức', '1', 'Xã', 'KV1'),
('103', 'Dương Hoà', '1', 'Xã', 'KV1'),
('104', 'Sơn Đồng', '1', 'Xã', 'KV1'),
('105', 'An Khánh', '1', 'Xã', 'KV1'),
('106', 'Đan Phượng', '1', 'Xã', 'KV1'),
('107', 'Ô Diên', '1', 'Xã', 'KV1'),
('108', 'Liên Minh', '1', 'Xã', 'KV1'),
('109', 'Gia Lâm', '1', 'Xã', 'KV1'),
('110', 'Thuận An', '1', 'Xã', 'KV1'),
('111', 'Bát Tràng', '1', 'Xã', 'KV1'),
('112', 'Phù Đổng', '1', 'Xã', 'KV1'),
('113', 'Thư Lâm', '1', 'Xã', 'KV1'),
('114', 'Đông Anh', '1', 'Xã', 'KV1'),
('115', 'Phúc Thịnh', '1', 'Xã', 'KV1'),
('116', 'Thiên Lộc', '1', 'Xã', 'KV1'),
('117', 'Vĩnh Thanh', '1', 'Xã', 'KV1'),
('118', 'Mê Linh', '1', 'Xã', 'KV1'),
('119', 'Yên Lãng', '1', 'Xã', 'KV1'),
('120', 'Tiến Thắng', '1', 'Xã', 'KV1'),
('121', 'Quang Minh', '1', 'Xã', 'KV1'),
('122', 'Sóc Sơn', '1', 'Xã', 'KV1'),
('123', 'Đa Phúc', '1', 'Xã', 'KV1'),
('124', 'Nội Bài', '1', 'Xã', 'KV1'),
('125', 'Trung Giã', '1', 'Xã', 'KV1'),
('126', 'Kim Anh', '1', 'Xã', 'KV1'),
('127', 'Đại Sơn', '2', 'Xã', 'KV1'),
('128', 'Sơn Động', '2', 'Xã', 'KV1'),
('129', 'Tây Yên Tử', '2', 'Xã', 'KV1'),
('130', 'Dương Hưu', '2', 'Xã', 'KV1'),
('131', 'Yên Định', '2', 'Xã', 'KV1'),
('132', 'An Lạc', '2', 'Xã', 'KV1'),
('133', 'Vân Sơn', '2', 'Xã', 'KV1'),
('134', 'Biển Động', '2', 'Xã', 'KV1'),
('135', 'Lục Ngạn', '2', 'Xã', 'KV1'),
('136', 'Đèo Gia', '2', 'Xã', 'KV1'),
('137', 'Sơn Hải', '2', 'Xã', 'KV1'),
('138', 'Tân Sơn', '2', 'Xã', 'KV1'),
('139', 'Biên Sơn', '2', 'Xã', 'KV1'),
('140', 'Sa Lý', '2', 'Xã', 'KV1'),
('141', 'Nam Dương', '2', 'Xã', 'KV1'),
('142', 'Kiên Lao', '2', 'Xã', 'KV1'),
('143', 'Chũ', '2', 'Phường', 'KV1'),
('144', 'Phượng Sơn', '2', 'Phường', 'KV1'),
('145', 'Lục Sơn', '2', 'Xã', 'KV1'),
('146', 'Trường Sơn', '2', 'Xã', 'KV1'),
('147', 'Cẩm Lý', '2', 'Xã', 'KV1'),
('148', 'Đông Phú', '2', 'Xã', 'KV1'),
('149', 'Nghĩa Phương', '2', 'Xã', 'KV1'),
('150', 'Lục Nam', '2', 'Xã', 'KV1'),
('151', 'Bắc Lũng', '2', 'Xã', 'KV1'),
('152', 'Bảo Đài', '2', 'Xã', 'KV1'),
('153', 'Lạng Giang', '2', 'Xã', 'KV1'),
('154', 'Mỹ Thái', '2', 'Xã', 'KV1'),
('155', 'Kép', '2', 'Xã', 'KV1'),
('156', 'Tân Dĩnh', '2', 'Xã', 'KV1'),
('157', 'Tiên Lục', '2', 'Xã', 'KV1'),
('158', 'Yên Thế', '2', 'Xã', 'KV1'),
('159', 'Bố Hạ', '2', 'Xã', 'KV1'),
('160', 'Đồng Kỳ', '2', 'Xã', 'KV1'),
('161', 'Xuân Lương', '2', 'Xã', 'KV1'),
('162', 'Tam Tiến', '2', 'Xã', 'KV1'),
('163', 'Tân Yên', '2', 'Xã', 'KV1'),
('164', 'Ngọc Thiện', '2', 'Xã', 'KV1'),
('165', 'Nhã Nam', '2', 'Xã', 'KV1'),
('166', 'Phúc Hoà', '2', 'Xã', 'KV1'),
('167', 'Quang Trung', '2', 'Xã', 'KV1'),
('168', 'Hợp Thịnh', '2', 'Xã', 'KV1'),
('169', 'Hiệp Hoà', '2', 'Xã', 'KV1'),
('170', 'Hoàng Vân', '2', 'Xã', 'KV1'),
('171', 'Xuân Cẩm', '2', 'Xã', 'KV1'),
('172', 'Tự Lạn', '2', 'Phường', 'KV1'),
('173', 'Việt Yên', '2', 'Phường', 'KV1'),
('174', 'Nếnh', '2', 'Phường', 'KV1'),
('175', 'Vân Hà', '2', 'Phường', 'KV1'),
('176', 'Đồng Việt', '2', 'Xã', 'KV1'),
('177', 'Bắc Giang', '2', 'Phường', 'KV1'),
('178', 'Đa Mai', '2', 'Phường', 'KV1'),
('179', 'Tiền Phong', '2', 'Phường', 'KV1'),
('180', 'Tân An', '2', 'Phường', 'KV1'),
('181', 'Yên Dũng', '2', 'Phường', 'KV1'),
('182', 'Tân Tiến', '2', 'Phường', 'KV1'),
('183', 'Cảnh Thụy', '2', 'Phường', 'KV1'),
('184', 'Kinh Bắc', '2', 'Phường', 'KV1'),
('185', 'Võ Cường', '2', 'Phường', 'KV1'),
('186', 'Vũ Ninh', '2', 'Phường', 'KV1'),
('187', 'Hạp Lĩnh', '2', 'Phường', 'KV1'),
('188', 'Nam Sơn', '2', 'Phường', 'KV1'),
('189', 'Từ Sơn', '2', 'Phường', 'KV1'),
('190', 'Tam Sơn', '2', 'Phường', 'KV1'),
('191', 'Đồng Nguyên', '2', 'Phường', 'KV1'),
('192', 'Phù Khê', '2', 'Phường', 'KV1'),
('193', 'Thuận Thành', '2', 'Phường', 'KV1'),
('194', 'Mão Điền', '2', 'Phường', 'KV1'),
('195', 'Trạm Lộ', '2', 'Phường', 'KV1'),
('196', 'Trí Quả', '2', 'Phường', 'KV1'),
('197', 'Song Liễu', '2', 'Phường', 'KV1'),
('198', 'Ninh Xá', '2', 'Phường', 'KV1'),
('199', 'Quế Võ', '2', 'Phường', 'KV1'),
('200', 'Phương Liễu', '2', 'Phường', 'KV1'),
('201', 'Nhân Hoà', '2', 'Phường', 'KV1'),
('202', 'Đào Viên', '2', 'Phường', 'KV1'),
('203', 'Bồng Lai', '2', 'Phường', 'KV1'),
('204', 'Chi Lăng', '2', 'Xã', 'KV1'),
('205', 'Phù Lãng', '2', 'Xã', 'KV1'),
('206', 'Yên Phong', '2', 'Xã', 'KV1'),
('207', 'Văn Môn', '2', 'Xã', 'KV1'),
('208', 'Tam Giang', '2', 'Xã', 'KV1'),
('209', 'Yên Trung', '2', 'Xã', 'KV1'),
('210', 'Tam Đa', '2', 'Xã', 'KV1'),
('211', 'Tiên Du', '2', 'Xã', 'KV1'),
('212', 'Liên Bão', '2', 'Xã', 'KV1'),
('213', 'Tân Chi', '2', 'Xã', 'KV1'),
('214', 'Đại Đồng', '2', 'Xã', 'KV1'),
('215', 'Phật Tích', '2', 'Xã', 'KV1'),
('216', 'Gia Bình', '2', 'Xã', 'KV1'),
('217', 'Nhân Thắng', '2', 'Xã', 'KV1'),
('218', 'Đại Lai', '2', 'Xã', 'KV1'),
('219', 'Cao Đức', '2', 'Xã', 'KV1'),
('220', 'Đông Cứu', '2', 'Xã', 'KV1'),
('221', 'Lương Tài', '2', 'Xã', 'KV1'),
('222', 'Lâm Thao', '2', 'Xã', 'KV1'),
('223', 'Trung Chính', '2', 'Xã', 'KV1'),
('224', 'Trung Kênh', '2', 'Xã', 'KV1'),
('225', 'Tuấn Đạo', '2', 'Xã', 'KV1'),
('226', 'An Sinh', '3', 'Phường', 'KV1'),
('227', 'Đông Triều', '3', 'Phường', 'KV1'),
('228', 'Bình Khê', '3', 'Phường', 'KV1'),
('229', 'Mạo Khê', '3', 'Phường', 'KV1'),
('230', 'Hoàng Quế', '3', 'Phường', 'KV1'),
('231', 'Yên Tử', '3', 'Phường', 'KV1'),
('232', 'Vàng Danh', '3', 'Phường', 'KV1'),
('233', 'Uông Bí', '3', 'Phường', 'KV1'),
('234', 'Đông Mai', '3', 'Phường', 'KV1'),
('235', 'Hiệp Hoà', '3', 'Phường', 'KV1'),
('236', 'Quảng Yên', '3', 'Phường', 'KV1'),
('237', 'Hà An', '3', 'Phường', 'KV1'),
('238', 'Phong Cốc', '3', 'Phường', 'KV1'),
('239', 'Liên Hoà', '3', 'Phường', 'KV1'),
('240', 'Tuần Châu', '3', 'Phường', 'KV1'),
('241', 'Việt Hưng', '3', 'Phường', 'KV1'),
('242', 'Bãi Cháy', '3', 'Phường', 'KV1'),
('243', 'Hà Tu', '3', 'Phường', 'KV1'),
('244', 'Hà Lầm', '3', 'Phường', 'KV1'),
('245', 'Cao Xanh', '3', 'Phường', 'KV1'),
('246', 'Hồng Gai', '3', 'Phường', 'KV1'),
('247', 'Hạ Long', '3', 'Phường', 'KV1'),
('248', 'Hoành Bồ', '3', 'Phường', 'KV1'),
('249', 'Quảng La', '3', 'Xã', 'KV1'),
('250', 'Thống Nhất', '3', 'Xã', 'KV1'),
('251', 'Mông Dương', '3', 'Phường', 'KV1'),
('252', 'Quang Hanh', '3', 'Phường', 'KV1'),
('253', 'Cẩm Phả', '3', 'Phường', 'KV1'),
('254', 'Cửa Ông', '3', 'Phường', 'KV1'),
('255', 'Hải Hoà', '3', 'Xã', 'KV1'),
('256', 'Tiên Yên', '3', 'Xã', 'KV1'),
('257', 'Điền Xá', '3', 'Xã', 'KV1'),
('258', 'Đông Ngũ', '3', 'Xã', 'KV1'),
('259', 'Hải Lạng', '3', 'Xã', 'KV1'),
('260', 'Lương Minh', '3', 'Xã', 'KV1'),
('261', 'Kỳ Thượng', '3', 'Xã', 'KV1'),
('262', 'Ba Chẽ', '3', 'Xã', 'KV1'),
('263', 'Quảng Tân', '3', 'Xã', 'KV1'),
('264', 'Đầm Hà', '3', 'Xã', 'KV1'),
('265', 'Quảng Hà', '3', 'Xã', 'KV1'),
('266', 'Đường Hoa', '3', 'Xã', 'KV1'),
('267', 'Quảng Đức', '3', 'Xã', 'KV1'),
('268', 'Hoành Mô', '3', 'Xã', 'KV1'),
('269', 'Lục Hồn', '3', 'Xã', 'KV1'),
('270', 'Bình Liêu', '3', 'Xã', 'KV1'),
('271', 'Hải Sơn', '3', 'Xã', 'KV1'),
('272', 'Hải Ninh', '3', 'Xã', 'KV1'),
('273', 'Vĩnh Thực', '3', 'Xã', 'KV1'),
('274', 'Móng Cái 1', '3', 'Phường', 'KV1'),
('275', 'Móng Cái 2', '3', 'Phường', 'KV1'),
('276', 'Móng Cái 3', '3', 'Phường', 'KV1'),
('277', 'khu Vân Đồn', '3', 'Xã', 'KV1'),
('278', 'khu Cô Tô', '3', 'Xã', 'KV1'),
('279', 'Cái Chiên', '3', 'Xã', 'KV1'),
('280', 'Thuỷ Nguyên', '4', 'Phường', 'KV1'),
('281', 'Thiên Hương', '4', 'Phường', 'KV1'),
('282', 'Hoà Bình', '4', 'Phường', 'KV1'),
('283', 'Nam Triệu', '4', 'Phường', 'KV1'),
('284', 'Bạch Đằng', '4', 'Phường', 'KV1'),
('285', 'Lưu Kiếm', '4', 'Phường', 'KV1'),
('286', 'Lê Ích Mộc', '4', 'Phường', 'KV1'),
('287', 'Hồng Bàng', '4', 'Phường', 'KV1'),
('288', 'Hồng An', '4', 'Phường', 'KV1'),
('289', 'Ngô Quyền', '4', 'Phường', 'KV1'),
('290', 'Gia Viên', '4', 'Phường', 'KV1'),
('291', 'Lê Chân', '4', 'Phường', 'KV1'),
('292', 'An Biên', '4', 'Phường', 'KV1'),
('293', 'Hải An', '4', 'Phường', 'KV1'),
('294', 'Đông Hải', '4', 'Phường', 'KV1'),
('295', 'Kiến An', '4', 'Phường', 'KV1'),
('296', 'Phù Liễn', '4', 'Phường', 'KV1'),
('297', 'Nam Đồ Sơn', '4', 'Phường', 'KV1'),
('298', 'Đồ Sơn', '4', 'Phường', 'KV1'),
('299', 'Hưng Đạo', '4', 'Phường', 'KV1'),
('300', 'Dương Kinh', '4', 'Phường', 'KV1'),
('301', 'An Dương', '4', 'Phường', 'KV1'),
('302', 'An Hải', '4', 'Phường', 'KV1'),
('303', 'An Phong', '4', 'Phường', 'KV1'),
('304', 'An Hưng', '4', 'Xã', 'KV1'),
('305', 'An Khánh', '4', 'Xã', 'KV1'),
('306', 'An Quang', '4', 'Xã', 'KV1'),
('307', 'An Trường', '4', 'Xã', 'KV1'),
('308', 'An Lão', '4', 'Xã', 'KV1'),
('309', 'Kiến Thụy', '4', 'Xã', 'KV1'),
('310', 'Kiến Minh', '4', 'Xã', 'KV1'),
('311', 'Kiến Hải', '4', 'Xã', 'KV1'),
('312', 'Kiến Hưng', '4', 'Xã', 'KV1'),
('313', 'Nghi Dương', '4', 'Xã', 'KV1'),
('314', 'Quyết Thắng', '4', 'Xã', 'KV1'),
('315', 'Tiên Lãng', '4', 'Xã', 'KV1'),
('316', 'Tân Minh', '4', 'Xã', 'KV1'),
('317', 'Tiên Minh', '4', 'Xã', 'KV1'),
('318', 'Chấn Hưng', '4', 'Xã', 'KV1'),
('319', 'Hùng Thắng', '4', 'Xã', 'KV1'),
('320', 'Vĩnh Bảo', '4', 'Xã', 'KV1'),
('321', 'Nguyễn Bỉnh Khiêm', '4', 'Xã', 'KV1'),
('322', 'Vĩnh Am', '4', 'Xã', 'KV1'),
('323', 'Vĩnh Hải', '4', 'Xã', 'KV1'),
('324', 'Vĩnh Hoà', '4', 'Xã', 'KV1'),
('325', 'Vĩnh Thịnh', '4', 'Xã', 'KV1'),
('326', 'Vĩnh Thuận', '4', 'Xã', 'KV1'),
('327', 'Việt Khê', '4', 'Xã', 'KV1'),
('328', 'khu Cát Hải', '4', 'Xã', 'KV1'),
('329', 'khu Bạch Long Vĩ', '4', 'Xã', 'KV1'),
('330', 'Hải Dương', '4', 'Phường', 'KV1'),
('331', 'Lê Thanh Nghị', '4', 'Phường', 'KV1'),
('332', 'Việt Hoà', '4', 'Phường', 'KV1'),
('333', 'Thành Đông', '4', 'Phường', 'KV1'),
('334', 'Nam Đồng', '4', 'Phường', 'KV1'),
('335', 'Tân Hưng', '4', 'Phường', 'KV1'),
('336', 'Thạch Khôi', '4', 'Phường', 'KV1'),
('337', 'Tứ Minh', '4', 'Phường', 'KV1'),
('338', 'Ái Quốc', '4', 'Phường', 'KV1'),
('339', 'Chu Văn An', '4', 'Phường', 'KV1'),
('340', 'Chí Linh', '4', 'Phường', 'KV1'),
('341', 'Trần Hưng Đạo', '4', 'Phường', 'KV1'),
('342', 'Nguyễn Trãi', '4', 'Phường', 'KV1'),
('343', 'Trần Nhân Tông', '4', 'Phường', 'KV1'),
('344', 'Lê Đại Hành', '4', 'Phường', 'KV1'),
('345', 'Kinh Môn', '4', 'Phường', 'KV1'),
('346', 'Nguyễn Đại Năng', '4', 'Phường', 'KV1'),
('347', 'Trần Liễu', '4', 'Phường', 'KV1'),
('348', 'Bắc An Phụ', '4', 'Phường', 'KV1'),
('349', 'Phạm Sư Mạnh', '4', 'Phường', 'KV1'),
('350', 'Nhị Chiểu', '4', 'Phường', 'KV1'),
('351', 'Nam An Phụ', '4', 'Xã', 'KV1'),
('352', 'Nam Sách', '4', 'Xã', 'KV1'),
('353', 'Thái Tân', '4', 'Xã', 'KV1'),
('354', 'Hợp Tiến', '4', 'Xã', 'KV1'),
('355', 'Trần Phú', '4', 'Xã', 'KV1'),
('356', 'An Phú', '4', 'Xã', 'KV1'),
('357', 'Thanh Hà', '4', 'Xã', 'KV1'),
('358', 'Hà Tây', '4', 'Xã', 'KV1'),
('359', 'Hà Bắc', '4', 'Xã', 'KV1'),
('360', 'Hà Nam', '4', 'Xã', 'KV1'),
('361', 'Hà Đông', '4', 'Xã', 'KV1'),
('362', 'Cẩm Giang', '4', 'Xã', 'KV1'),
('363', 'Tuệ Tĩnh', '4', 'Xã', 'KV1'),
('364', 'Mao Điền', '4', 'Xã', 'KV1'),
('365', 'Cẩm Giàng', '4', 'Xã', 'KV1'),
('366', 'Kẻ Sặt', '4', 'Xã', 'KV1'),
('367', 'Bình Giang', '4', 'Xã', 'KV1'),
('368', 'Đường An', '4', 'Xã', 'KV1'),
('369', 'Thượng Hồng', '4', 'Xã', 'KV1'),
('370', 'Gia Lộc', '4', 'Xã', 'KV1'),
('371', 'Yết Kiêu', '4', 'Xã', 'KV1'),
('372', 'Gia Phúc', '4', 'Xã', 'KV1'),
('373', 'Trường Tân', '4', 'Xã', 'KV1'),
('374', 'Tứ Kỳ', '4', 'Xã', 'KV1'),
('375', 'Tân Kỳ', '4', 'Xã', 'KV1'),
('376', 'Đại Sơn', '4', 'Xã', 'KV1'),
('377', 'Chí Minh', '4', 'Xã', 'KV1'),
('378', 'Lạc Phượng', '4', 'Xã', 'KV1'),
('379', 'Nguyên Giáp', '4', 'Xã', 'KV1'),
('380', 'Ninh Giang', '4', 'Xã', 'KV1'),
('381', 'Vĩnh Lại', '4', 'Xã', 'KV1'),
('382', 'Khúc Thừa Dụ', '4', 'Xã', 'KV1'),
('383', 'Tân An', '4', 'Xã', 'KV1'),
('384', 'Hồng Châu', '4', 'Xã', 'KV1'),
('385', 'Thanh Miện', '4', 'Xã', 'KV1'),
('386', 'Bắc Thanh Miện', '4', 'Xã', 'KV1'),
('387', 'Hải Hưng', '4', 'Xã', 'KV1'),
('388', 'Nguyễn Lương Bằng', '4', 'Xã', 'KV1'),
('389', 'Nam Thanh Miện', '4', 'Xã', 'KV1'),
('390', 'Phú Thái', '4', 'Xã', 'KV1'),
('391', 'Lai Khê', '4', 'Xã', 'KV1'),
('392', 'An Thành', '4', 'Xã', 'KV1'),
('393', 'Kim Thành', '4', 'Xã', 'KV1'),
('394', 'Phố Hiến', '5', 'Phường', 'KV1'),
('395', 'Sơn Nam', '5', 'Phường', 'KV1'),
('396', 'Hồng Châu', '5', 'Phường', 'KV1'),
('397', 'Mỹ Hào', '5', 'Phường', 'KV1'),
('398', 'Đường Hào', '5', 'Phường', 'KV1'),
('399', 'Thượng Hồng', '5', 'Phường', 'KV1'),
('400', 'Tân Hưng', '5', 'Xã', 'KV1'),
('401', 'Hoàng Hoa Thám', '5', 'Xã', 'KV1'),
('402', 'Tiên Lữ', '5', 'Xã', 'KV1'),
('403', 'Tiên Hoa', '5', 'Xã', 'KV1'),
('404', 'Quang Hưng', '5', 'Xã', 'KV1'),
('405', 'Đoàn Đào', '5', 'Xã', 'KV1'),
('406', 'Tiên Tiến', '5', 'Xã', 'KV1'),
('407', 'Tống Trân', '5', 'Xã', 'KV1'),
('408', 'Lương Bằng', '5', 'Xã', 'KV1'),
('409', 'Nghĩa Dân', '5', 'Xã', 'KV1'),
('410', 'Hiệp Cường', '5', 'Xã', 'KV1'),
('411', 'Đức Hợp', '5', 'Xã', 'KV1'),
('412', 'Ân Thi', '5', 'Xã', 'KV1'),
('413', 'Xuân Trúc', '5', 'Xã', 'KV1'),
('414', 'Phạm Ngũ Lão', '5', 'Xã', 'KV1'),
('415', 'Nguyễn Trãi', '5', 'Xã', 'KV1'),
('416', 'Hồng Quang', '5', 'Xã', 'KV1'),
('417', 'Khoái Châu', '5', 'Xã', 'KV1'),
('418', 'Triệu Việt Vương', '5', 'Xã', 'KV1'),
('419', 'Việt Tiến', '5', 'Xã', 'KV1'),
('420', 'Chí Minh', '5', 'Xã', 'KV1'),
('421', 'Châu Ninh', '5', 'Xã', 'KV1'),
('422', 'Yên Mỹ', '5', 'Xã', 'KV1'),
('423', 'Việt Yên', '5', 'Xã', 'KV1'),
('424', 'Hoàn Long', '5', 'Xã', 'KV1'),
('425', 'Nguyễn Văn Linh', '5', 'Xã', 'KV1'),
('426', 'Như Quỳnh', '5', 'Xã', 'KV1'),
('427', 'Lạc Đạo', '5', 'Xã', 'KV1'),
('428', 'Đại Đồng', '5', 'Xã', 'KV1'),
('429', 'Nghĩa Trụ', '5', 'Xã', 'KV1'),
('430', 'Phụng Công', '5', 'Xã', 'KV1'),
('431', 'Văn Giang', '5', 'Xã', 'KV1'),
('432', 'Mễ Sở', '5', 'Xã', 'KV1'),
('433', 'Thái Bình', '5', 'Phường', 'KV1'),
('434', 'Trần Lãm', '5', 'Phường', 'KV1'),
('435', 'Trần Hưng Đạo', '5', 'Phường', 'KV1'),
('436', 'Trà Lý', '5', 'Phường', 'KV1'),
('437', 'Vũ Phúc', '5', 'Phường', 'KV1'),
('438', 'Thái Thụy', '5', 'Xã', 'KV1'),
('439', 'Đông Thụy Anh', '5', 'Xã', 'KV1'),
('440', 'Bắc Thụy Anh', '5', 'Xã', 'KV1'),
('441', 'Thụy Anh', '5', 'Xã', 'KV1'),
('442', 'Nam Thụy Anh', '5', 'Xã', 'KV1'),
('443', 'Bắc Thái Ninh', '5', 'Xã', 'KV1'),
('444', 'Thái Ninh', '5', 'Xã', 'KV1'),
('445', 'Đông Thái Ninh', '5', 'Xã', 'KV1'),
('446', 'Nam Thái Ninh', '5', 'Xã', 'KV1'),
('447', 'Tây Thái Ninh', '5', 'Xã', 'KV1'),
('448', 'Tây Thụy Anh', '5', 'Xã', 'KV1'),
('449', 'Tiền Hải', '5', 'Xã', 'KV1'),
('450', 'Tây Tiền Hải', '5', 'Xã', 'KV1'),
('451', 'Ái Quốc', '5', 'Xã', 'KV1'),
('452', 'Đồng Châu', '5', 'Xã', 'KV1'),
('453', 'Đông Tiền Hải', '5', 'Xã', 'KV1'),
('454', 'Nam Cường', '5', 'Xã', 'KV1'),
('455', 'Hưng Phú', '5', 'Xã', 'KV1'),
('456', 'Nam Tiền Hải', '5', 'Xã', 'KV1'),
('457', 'Quỳnh Phụ', '5', 'Xã', 'KV1'),
('458', 'Minh Thọ', '5', 'Xã', 'KV1'),
('459', 'Nguyễn Du', '5', 'Xã', 'KV1'),
('460', 'Quỳnh An', '5', 'Xã', 'KV1'),
('461', 'Ngọc Lâm', '5', 'Xã', 'KV1'),
('462', 'Đồng Bằng', '5', 'Xã', 'KV1'),
('463', 'A Sào', '5', 'Xã', 'KV1'),
('464', 'Phụ Dực', '5', 'Xã', 'KV1'),
('465', 'Tân Tiến', '5', 'Xã', 'KV1'),
('466', 'Hưng Hà', '5', 'Xã', 'KV1'),
('467', 'Tiên La', '5', 'Xã', 'KV1'),
('468', 'Lê Quý Đôn', '5', 'Xã', 'KV1'),
('469', 'Hồng Minh', '5', 'Xã', 'KV1'),
('470', 'Thần Khê', '5', 'Xã', 'KV1'),
('471', 'Diên Hà', '5', 'Xã', 'KV1'),
('472', 'Ngự Thiên', '5', 'Xã', 'KV1'),
('473', 'Long Hưng', '5', 'Xã', 'KV1'),
('474', 'Đông Hưng', '5', 'Xã', 'KV1'),
('475', 'Bắc Tiên Hưng', '5', 'Xã', 'KV1'),
('476', 'Đông Tiên Hưng', '5', 'Xã', 'KV1'),
('477', 'Nam Đông Hưng', '5', 'Xã', 'KV1'),
('478', 'Bắc Đông Quan', '5', 'Xã', 'KV1'),
('479', 'Bắc Đông Hưng', '5', 'Xã', 'KV1'),
('480', 'Đông Quan', '5', 'Xã', 'KV1'),
('481', 'Nam Tiên Hưng', '5', 'Xã', 'KV1'),
('482', 'Tiên Hưng', '5', 'Xã', 'KV1'),
('483', 'Lê Lợi', '5', 'Xã', 'KV1'),
('484', 'Kiến Xương', '5', 'Xã', 'KV1'),
('485', 'Quang Lịch', '5', 'Xã', 'KV1'),
('486', 'Vũ Quý', '5', 'Xã', 'KV1'),
('487', 'Bình Thanh', '5', 'Xã', 'KV1'),
('488', 'Bình Định', '5', 'Xã', 'KV1'),
('489', 'Hồng Vũ', '5', 'Xã', 'KV1'),
('490', 'Bình Nguyên', '5', 'Xã', 'KV1'),
('491', 'Trà Giang', '5', 'Xã', 'KV1'),
('492', 'Vũ Thư', '5', 'Xã', 'KV1'),
('493', 'Thư Trì', '5', 'Xã', 'KV1'),
('494', 'Tân Thuận', '5', 'Xã', 'KV1'),
('495', 'Thư Vũ', '5', 'Xã', 'KV1'),
('496', 'Vũ Tiên', '5', 'Xã', 'KV1'),
('497', 'Vạn Xuân', '5', 'Xã', 'KV1'),
('498', 'Gia Viễn', '6', 'Xã', 'KV1'),
('499', 'Đại Hoàng', '6', 'Xã', 'KV1'),
('500', 'Gia Hưng', '6', 'Xã', 'KV1'),
('501', 'Gia Phong', '6', 'Xã', 'KV1'),
('502', 'Gia Vân', '6', 'Xã', 'KV1'),
('503', 'Gia Trấn', '6', 'Xã', 'KV1'),
('504', 'Nho Quan', '6', 'Xã', 'KV1'),
('505', 'Gia Lâm', '6', 'Xã', 'KV1'),
('506', 'Gia Tường', '6', 'Xã', 'KV1'),
('507', 'Phú Sơn', '6', 'Xã', 'KV1'),
('508', 'Cúc Phương', '6', 'Xã', 'KV1'),
('509', 'Phú Long', '6', 'Xã', 'KV1'),
('510', 'Thanh Sơn', '6', 'Xã', 'KV1'),
('511', 'Quỳnh Lưu', '6', 'Xã', 'KV1'),
('512', 'Yên Khánh', '6', 'Xã', 'KV1'),
('513', 'Khánh Nhạc', '6', 'Xã', 'KV1'),
('514', 'Khánh Thiện', '6', 'Xã', 'KV1'),
('515', 'Khánh Hội', '6', 'Xã', 'KV1'),
('516', 'Khánh Trung', '6', 'Xã', 'KV1'),
('517', 'Yên Mô', '6', 'Xã', 'KV1'),
('518', 'Yên Từ', '6', 'Xã', 'KV1'),
('519', 'Yên Mạc', '6', 'Xã', 'KV1'),
('520', 'Đồng Thái', '6', 'Xã', 'KV1'),
('521', 'Chất Bình', '6', 'Xã', 'KV1'),
('522', 'Kim Sơn', '6', 'Xã', 'KV1'),
('523', 'Quang Thiện', '6', 'Xã', 'KV1'),
('524', 'Phát Diệm', '6', 'Xã', 'KV1'),
('525', 'Lai Thành', '6', 'Xã', 'KV1'),
('526', 'Định Hóa', '6', 'Xã', 'KV1'),
('527', 'Bình Minh', '6', 'Xã', 'KV1'),
('528', 'Kim Đông', '6', 'Xã', 'KV1'),
('529', 'Bình Lục', '6', 'Xã', 'KV1'),
('530', 'Bình Mỹ', '6', 'Xã', 'KV1'),
('531', 'Bình An', '6', 'Xã', 'KV1'),
('532', 'Bình Giang', '6', 'Xã', 'KV1'),
('533', 'Bình Sơn', '6', 'Xã', 'KV1'),
('534', 'Liêm Hà', '6', 'Xã', 'KV1'),
('535', 'Tân Thanh', '6', 'Xã', 'KV1'),
('536', 'Thanh Bình', '6', 'Xã', 'KV1'),
('537', 'Thanh Lâm', '6', 'Xã', 'KV1'),
('538', 'Thanh Liêm', '6', 'Xã', 'KV1'),
('539', 'Lý Nhân', '6', 'Xã', 'KV1'),
('540', 'Nam Xang', '6', 'Xã', 'KV1'),
('541', 'Bắc Lý', '6', 'Xã', 'KV1'),
('542', 'Vĩnh Trụ', '6', 'Xã', 'KV1'),
('543', 'Trần Thương', '6', 'Xã', 'KV1'),
('544', 'Nhân Hà', '6', 'Xã', 'KV1'),
('545', 'Nam Lý', '6', 'Xã', 'KV1'),
('546', 'Nam Trực', '6', 'Xã', 'KV1'),
('547', 'Nam Minh', '6', 'Xã', 'KV1'),
('548', 'Nam Đồng', '6', 'Xã', 'KV1'),
('549', 'Nam Ninh', '6', 'Xã', 'KV1'),
('550', 'Nam Hồng', '6', 'Xã', 'KV1'),
('551', 'Minh Tân', '6', 'Xã', 'KV1'),
('552', 'Hiển Khánh', '6', 'Xã', 'KV1'),
('553', 'Vụ Bản', '6', 'Xã', 'KV1'),
('554', 'Liên Minh', '6', 'Xã', 'KV1'),
('555', 'Ý Yên', '6', 'Xã', 'KV1'),
('556', 'Yên Đồng', '6', 'Xã', 'KV1'),
('557', 'Yên Cường', '6', 'Xã', 'KV1'),
('558', 'Vạn Thắng', '6', 'Xã', 'KV1'),
('559', 'Vũ Dương', '6', 'Xã', 'KV1'),
('560', 'Tân Minh', '6', 'Xã', 'KV1'),
('561', 'Phong Doanh', '6', 'Xã', 'KV1'),
('562', 'Cổ Lễ', '6', 'Xã', 'KV1'),
('563', 'Ninh Giang', '6', 'Xã', 'KV1'),
('564', 'Cát Thành', '6', 'Xã', 'KV1'),
('565', 'Trực Ninh', '6', 'Xã', 'KV1'),
('566', 'Quang Hưng', '6', 'Xã', 'KV1'),
('567', 'Minh Thái', '6', 'Xã', 'KV1'),
('568', 'Ninh Cường', '6', 'Xã', 'KV1'),
('569', 'Xuân Trường', '6', 'Xã', 'KV1'),
('570', 'Xuân Hưng', '6', 'Xã', 'KV1'),
('571', 'Xuân Giang', '6', 'Xã', 'KV1'),
('572', 'Xuân Hồng', '6', 'Xã', 'KV1'),
('573', 'Hải Hậu', '6', 'Xã', 'KV1'),
('574', 'Hải Anh', '6', 'Xã', 'KV1'),
('575', 'Hải Tiến', '6', 'Xã', 'KV1'),
('576', 'Hải Hưng', '6', 'Xã', 'KV1'),
('577', 'Hải An', '6', 'Xã', 'KV1'),
('578', 'Hải Quang', '6', 'Xã', 'KV1'),
('579', 'Hải Xuân', '6', 'Xã', 'KV1'),
('580', 'Hải Thịnh', '6', 'Xã', 'KV1'),
('581', 'Giao Minh', '6', 'Xã', 'KV1'),
('582', 'Giao Hoà', '6', 'Xã', 'KV1'),
('583', 'Giao Thuỷ', '6', 'Xã', 'KV1'),
('584', 'Giao Phúc', '6', 'Xã', 'KV1'),
('585', 'Giao Hưng', '6', 'Xã', 'KV1'),
('586', 'Giao Bình', '6', 'Xã', 'KV1'),
('587', 'Giao Ninh', '6', 'Xã', 'KV1'),
('588', 'Đồng Thịnh', '6', 'Xã', 'KV1'),
('589', 'Nghĩa Hưng', '6', 'Xã', 'KV1'),
('590', 'Nghĩa Sơn', '6', 'Xã', 'KV1'),
('591', 'Hồng Phong', '6', 'Xã', 'KV1'),
('592', 'Quỹ Nhất', '6', 'Xã', 'KV1'),
('593', 'Nghĩa Lâm', '6', 'Xã', 'KV1'),
('594', 'Rạng Đông', '6', 'Xã', 'KV1'),
('595', 'Tây Hoa Lư', '6', 'Phường', 'KV1'),
('596', 'Hoa Lư', '6', 'Phường', 'KV1'),
('597', 'Nam Hoa Lư', '6', 'Phường', 'KV1'),
('598', 'Đông Hoa Lư', '6', 'Phường', 'KV1'),
('599', 'Tam Điệp', '6', 'Phường', 'KV1'),
('600', 'Yên Sơn', '6', 'Phường', 'KV1'),
('601', 'Trung Sơn', '6', 'Phường', 'KV1'),
('602', 'Yên Thắng', '6', 'Phường', 'KV1'),
('603', 'Hà Nam', '6', 'Phường', 'KV1'),
('604', 'Phủ Lý', '6', 'Phường', 'KV1'),
('605', 'Phù Vân', '6', 'Phường', 'KV1'),
('606', 'Châu Sơn', '6', 'Phường', 'KV1'),
('607', 'Liêm Tuyền', '6', 'Phường', 'KV1'),
('608', 'Duy Tiên', '6', 'Phường', 'KV1'),
('609', 'Duy Tân', '6', 'Phường', 'KV1'),
('610', 'Đồng Văn', '6', 'Phường', 'KV1'),
('611', 'Duy Hà', '6', 'Phường', 'KV1'),
('612', 'Tiên Sơn', '6', 'Phường', 'KV1'),
('613', 'Lê Hồ', '6', 'Phường', 'KV1'),
('614', 'Nguyễn Úy', '6', 'Phường', 'KV1'),
('615', 'Lý Thường Kiệt', '6', 'Phường', 'KV1'),
('616', 'Kim Thanh', '6', 'Phường', 'KV1'),
('617', 'Tam Chúc', '6', 'Phường', 'KV1'),
('618', 'Kim Bảng', '6', 'Phường', 'KV1'),
('619', 'Nam Định', '6', 'Phường', 'KV1'),
('620', 'Thiên Trường', '6', 'Phường', 'KV1'),
('621', 'Đông A', '6', 'Phường', 'KV1'),
('622', 'Vị Khê', '6', 'Phường', 'KV1'),
('623', 'Thành Nam', '6', 'Phường', 'KV1'),
('624', 'Trường Thi', '6', 'Phường', 'KV1'),
('625', 'Hồng Quang', '6', 'Phường', 'KV1'),
('626', 'Mỹ Lộc', '6', 'Phường', 'KV1'),
('627', 'Thục Phán', '7', 'Phường', 'KV3'),
('628', 'Nùng Trí Cao', '7', 'Phường', 'KV3'),
('629', 'Tân Giang', '7', 'Phường', 'KV3'),
('630', 'Quảng Lâm', '7', 'Xã', 'KV3'),
('631', 'Nam Quang', '7', 'Xã', 'KV3'),
('632', 'Lý Bôn', '7', 'Xã', 'KV3'),
('633', 'Bảo Lâm', '7', 'Xã', 'KV3'),
('634', 'Yên Thổ', '7', 'Xã', 'KV3'),
('635', 'Sơn Lộ', '7', 'Xã', 'KV3'),
('636', 'Hưng Đạo', '7', 'Xã', 'KV3'),
('637', 'Bảo Lạc', '7', 'Xã', 'KV3'),
('638', 'Cốc Pàng', '7', 'Xã', 'KV3'),
('639', 'Cô Ba', '7', 'Xã', 'KV3'),
('640', 'Khánh Xuân', '7', 'Xã', 'KV3'),
('641', 'Xuân Trường', '7', 'Xã', 'KV3'),
('642', 'Huy Giáp', '7', 'Xã', 'KV3'),
('643', 'Ca Thành', '7', 'Xã', 'KV3'),
('644', 'Phan Thanh', '7', 'Xã', 'KV3'),
('645', 'Thành Công', '7', 'Xã', 'KV3'),
('646', 'Tĩnh Túc', '7', 'Xã', 'KV3'),
('647', 'Tam Kim', '7', 'Xã', 'KV3'),
('648', 'Nguyên Bình', '7', 'Xã', 'KV3'),
('649', 'Minh Tâm', '7', 'Xã', 'KV3'),
('650', 'Thanh Long', '7', 'Xã', 'KV3'),
('651', 'Cần Yên', '7', 'Xã', 'KV3'),
('652', 'Thông Nông', '7', 'Xã', 'KV3'),
('653', 'Trường Hà', '7', 'Xã', 'KV3'),
('654', 'Hà Quảng', '7', 'Xã', 'KV3'),
('655', 'Lũng Nặm', '7', 'Xã', 'KV3'),
('656', 'Tổng Cọt', '7', 'Xã', 'KV3'),
('657', 'Nam Tuấn', '7', 'Xã', 'KV3'),
('658', 'Hoà An', '7', 'Xã', 'KV3'),
('659', 'Bạch Đằng', '7', 'Xã', 'KV3'),
('660', 'Nguyễn Huệ', '7', 'Xã', 'KV3'),
('661', 'Minh Khai', '7', 'Xã', 'KV3'),
('662', 'Canh Tân', '7', 'Xã', 'KV3'),
('663', 'Kim Đồng', '7', 'Xã', 'KV3'),
('664', 'Thạch An', '7', 'Xã', 'KV3'),
('665', 'Đông Khê', '7', 'Xã', 'KV3'),
('666', 'Đức Long', '7', 'Xã', 'KV3'),
('667', 'Phục Hoà', '7', 'Xã', 'KV3'),
('668', 'Bế Văn Đàn', '7', 'Xã', 'KV3'),
('669', 'Độc Lập', '7', 'Xã', 'KV3'),
('670', 'Quảng Uyên', '7', 'Xã', 'KV3'),
('671', 'Hạnh Phúc', '7', 'Xã', 'KV3'),
('672', 'Quang Hán', '7', 'Xã', 'KV3'),
('673', 'Trà Lĩnh', '7', 'Xã', 'KV3'),
('674', 'Quang Trung', '7', 'Xã', 'KV3'),
('675', 'Đoài Dương', '7', 'Xã', 'KV3'),
('676', 'Trùng Khánh', '7', 'Xã', 'KV3'),
('677', 'Đàm Thuỷ', '7', 'Xã', 'KV3'),
('678', 'Đình Phong', '7', 'Xã', 'KV3'),
('679', 'Lý Quốc', '7', 'Xã', 'KV3'),
('680', 'Hạ Lang', '7', 'Xã', 'KV3'),
('681', 'Vinh Quý', '7', 'Xã', 'KV3'),
('682', 'Quang Long', '7', 'Xã', 'KV3'),
('683', 'Thượng Lâm', '8', 'Xã', 'KV3'),
('684', 'Lâm Bình', '8', 'Xã', 'KV3'),
('685', 'Minh Quang', '8', 'Xã', 'KV3'),
('686', 'Bình An', '8', 'Xã', 'KV3'),
('687', 'Côn Lôn', '8', 'Xã', 'KV3'),
('688', 'Yên Hoa', '8', 'Xã', 'KV3'),
('689', 'Thượng Nông', '8', 'Xã', 'KV3'),
('690', 'Hồng Thái', '8', 'Xã', 'KV3'),
('691', 'Nà Hang', '8', 'Xã', 'KV3'),
('692', 'Tân Mỹ', '8', 'Xã', 'KV3'),
('693', 'Yên Lập', '8', 'Xã', 'KV3'),
('694', 'Tân An', '8', 'Xã', 'KV3'),
('695', 'Chiêm Hoá', '8', 'Xã', 'KV3'),
('696', 'Hoà An', '8', 'Xã', 'KV3'),
('697', 'Kiên Đài', '8', 'Xã', 'KV3'),
('698', 'Tri Phú', '8', 'Xã', 'KV3'),
('699', 'Kim Bình', '8', 'Xã', 'KV3'),
('700', 'Yên Nguyên', '8', 'Xã', 'KV3'),
('701', 'Trung Hà', '8', 'Xã', 'KV3'),
('702', 'Yên Phú', '8', 'Xã', 'KV3'),
('703', 'Bạch Xa', '8', 'Xã', 'KV3'),
('704', 'Phù Lưu', '8', 'Xã', 'KV3'),
('705', 'Hàm Yên', '8', 'Xã', 'KV3'),
('706', 'Bình Xa', '8', 'Xã', 'KV3'),
('707', 'Thái Sơn', '8', 'Xã', 'KV3'),
('708', 'Thái Hoà', '8', 'Xã', 'KV3'),
('709', 'Hùng Đức', '8', 'Xã', 'KV3'),
('710', 'Hùng Lợi', '8', 'Xã', 'KV3'),
('711', 'Trung Sơn', '8', 'Xã', 'KV3'),
('712', 'Thái Bình', '8', 'Xã', 'KV3'),
('713', 'Tân Long', '8', 'Xã', 'KV3'),
('714', 'Xuân Vân', '8', 'Xã', 'KV3'),
('715', 'Lực Hành', '8', 'Xã', 'KV3'),
('716', 'Yên Sơn', '8', 'Xã', 'KV3'),
('717', 'Nhữ Khê', '8', 'Xã', 'KV3'),
('718', 'Kiến Thiết', '8', 'Xã', 'KV3'),
('719', 'Tân Trào', '8', 'Xã', 'KV3'),
('720', 'Minh Thanh', '8', 'Xã', 'KV3'),
('721', 'Sơn Dương', '8', 'Xã', 'KV3'),
('722', 'Bình Ca', '8', 'Xã', 'KV3'),
('723', 'Tân Thanh', '8', 'Xã', 'KV3'),
('724', 'Sơn Thuỷ', '8', 'Xã', 'KV3'),
('725', 'Phú Lương', '8', 'Xã', 'KV3'),
('726', 'Trường Sinh', '8', 'Xã', 'KV3'),
('727', 'Hồng Sơn', '8', 'Xã', 'KV3'),
('728', 'Đông Thọ', '8', 'Xã', 'KV3'),
('729', 'Mỹ Lâm', '8', 'Phường', 'KV3'),
('730', 'Minh Xuân', '8', 'Phường', 'KV3'),
('731', 'Nông Tiến', '8', 'Phường', 'KV3'),
('732', 'An Tường', '8', 'Phường', 'KV3'),
('733', 'Bình Thuận', '8', 'Phường', 'KV3'),
('734', 'Lũng Cú', '8', 'Xã', 'KV3'),
('735', 'Đồng Văn', '8', 'Xã', 'KV3'),
('736', 'Sà Phìn', '8', 'Xã', 'KV3'),
('737', 'Phố Bảng', '8', 'Xã', 'KV3'),
('738', 'Lũng Phìn', '8', 'Xã', 'KV3'),
('739', 'Sủng Máng', '8', 'Xã', 'KV3'),
('740', 'Sơn Vĩ', '8', 'Xã', 'KV3'),
('741', 'Mèo Vạc', '8', 'Xã', 'KV3'),
('742', 'Khâu Vai', '8', 'Xã', 'KV3'),
('743', 'Niêm Sơn', '8', 'Xã', 'KV3'),
('744', 'Tát Ngà', '8', 'Xã', 'KV3'),
('745', 'Thắng Mố', '8', 'Xã', 'KV3'),
('746', 'Bạch Đích', '8', 'Xã', 'KV3'),
('747', 'Yên Minh', '8', 'Xã', 'KV3'),
('748', 'Mậu Duệ', '8', 'Xã', 'KV3'),
('749', 'Ngọc Long', '8', 'Xã', 'KV3'),
('750', 'Du Già', '8', 'Xã', 'KV3'),
('751', 'Đường Thượng', '8', 'Xã', 'KV3'),
('752', 'Lùng Tám', '8', 'Xã', 'KV3'),
('753', 'Cán Tỷ', '8', 'Xã', 'KV3'),
('754', 'Nghĩa Thuận', '8', 'Xã', 'KV3'),
('755', 'Quản Bạ', '8', 'Xã', 'KV3'),
('756', 'Tùng Vài', '8', 'Xã', 'KV3'),
('757', 'Yên Cường', '8', 'Xã', 'KV3'),
('758', 'Đường Hồng', '8', 'Xã', 'KV3'),
('759', 'Bắc Mê', '8', 'Xã', 'KV3'),
('760', 'Giáp Trung', '8', 'Xã', 'KV3'),
('761', 'Minh Sơn', '8', 'Xã', 'KV3'),
('762', 'Minh Ngọc', '8', 'Xã', 'KV3'),
('763', 'Ngọc Đường', '8', 'Xã', 'KV3'),
('764', 'Hà Giang 1', '8', 'Phường', 'KV3'),
('765', 'Hà Giang 2', '8', 'Phường', 'KV3'),
('766', 'Lao Chải', '8', 'Xã', 'KV3'),
('767', 'Thanh Thuỷ', '8', 'Xã', 'KV3'),
('768', 'Minh Tân', '8', 'Xã', 'KV3'),
('769', 'Thuận Hoà', '8', 'Xã', 'KV3'),
('770', 'Tùng Bá', '8', 'Xã', 'KV3'),
('771', 'Phú Linh', '8', 'Xã', 'KV3'),
('772', 'Linh Hồ', '8', 'Xã', 'KV3'),
('773', 'Bạch Ngọc', '8', 'Xã', 'KV3'),
('774', 'Vị Xuyên', '8', 'Xã', 'KV3'),
('775', 'Việt Lâm', '8', 'Xã', 'KV3'),
('776', 'Cao Bồ', '8', 'Xã', 'KV3'),
('777', 'Thượng Sơn', '8', 'Xã', 'KV3'),
('778', 'Tân Quang', '8', 'Xã', 'KV3'),
('779', 'Đồng Tâm', '8', 'Xã', 'KV3'),
('780', 'Liên Hiệp', '8', 'Xã', 'KV3'),
('781', 'Bằng Hành', '8', 'Xã', 'KV3'),
('782', 'Bắc Quang', '8', 'Xã', 'KV3'),
('783', 'Hùng An', '8', 'Xã', 'KV3'),
('784', 'Vĩnh Tuy', '8', 'Xã', 'KV3'),
('785', 'Đồng Yên', '8', 'Xã', 'KV3'),
('786', 'Tiên Yên', '8', 'Xã', 'KV3'),
('787', 'Xuân Giang', '8', 'Xã', 'KV3'),
('788', 'Bằng Lang', '8', 'Xã', 'KV3'),
('789', 'Yên Thành', '8', 'Xã', 'KV3'),
('790', 'Quang Bình', '8', 'Xã', 'KV3'),
('791', 'Tân Trịnh', '8', 'Xã', 'KV3'),
('792', 'Tiên Nguyên', '8', 'Xã', 'KV3'),
('793', 'Thông Nguyên', '8', 'Xã', 'KV3'),
('794', 'Hồ Thầu', '8', 'Xã', 'KV3'),
('795', 'Nậm Dịch', '8', 'Xã', 'KV3'),
('796', 'Tân Tiến', '8', 'Xã', 'KV3'),
('797', 'Hoàng Su Phì', '8', 'Xã', 'KV3'),
('798', 'Thàng Tín', '8', 'Xã', 'KV3'),
('799', 'Bản Máy', '8', 'Xã', 'KV3'),
('800', 'Pờ Ly Ngài', '8', 'Xã', 'KV3'),
('801', 'Xín Mần', '8', 'Xã', 'KV3'),
('802', 'Pà Vầy Sủ', '8', 'Xã', 'KV3'),
('803', 'Nấm Dẩn', '8', 'Xã', 'KV3'),
('804', 'Trung Thịnh', '8', 'Xã', 'KV3'),
('805', 'Quảng Nguyên', '8', 'Xã', 'KV3'),
('806', 'Khuôn Lùng', '8', 'Xã', 'KV3'),
('807', 'Khao Mang', '9', 'Xã', 'KV3'),
('808', 'Mù Cang Chải', '9', 'Xã', 'KV3'),
('809', 'Púng Luông', '9', 'Xã', 'KV3'),
('810', 'Tú Lệ', '9', 'Xã', 'KV3'),
('811', 'Trạm Tấu', '9', 'Xã', 'KV3'),
('812', 'Hạnh Phúc', '9', 'Xã', 'KV3'),
('813', 'Phình Hồ', '9', 'Xã', 'KV3'),
('814', 'Nghĩa Lộ', '9', 'Phường', 'KV3'),
('815', 'Trung Tâm', '9', 'Phường', 'KV3'),
('816', 'Cầu Thia', '9', 'Phường', 'KV3'),
('817', 'Liên Sơn', '9', 'Xã', 'KV3'),
('818', 'Gia Hội', '9', 'Xã', 'KV3'),
('819', 'Sơn Lương', '9', 'Xã', 'KV3'),
('820', 'Thượng Bằng La', '9', 'Xã', 'KV3'),
('821', 'Chấn Thịnh', '9', 'Xã', 'KV3'),
('822', 'Nghĩa Tâm', '9', 'Xã', 'KV3'),
('823', 'Văn Chấn', '9', 'Xã', 'KV3'),
('824', 'Phong Dụ Hạ', '9', 'Xã', 'KV3'),
('825', 'Châu Quế', '9', 'Xã', 'KV3'),
('826', 'Lâm Giang', '9', 'Xã', 'KV3'),
('827', 'Đông Cuông', '9', 'Xã', 'KV3'),
('828', 'Tân Hợp', '9', 'Xã', 'KV3'),
('829', 'Mậu A', '9', 'Xã', 'KV3'),
('830', 'Xuân Ái', '9', 'Xã', 'KV3'),
('831', 'Mỏ Vàng', '9', 'Xã', 'KV3'),
('832', 'Lâm Thượng', '9', 'Xã', 'KV3'),
('833', 'Lục Yên', '9', 'Xã', 'KV3'),
('834', 'Tân Lĩnh', '9', 'Xã', 'KV3'),
('835', 'Khánh Hoà', '9', 'Xã', 'KV3'),
('836', 'Phúc Lợi', '9', 'Xã', 'KV3'),
('837', 'Mường Lai', '9', 'Xã', 'KV3'),
('838', 'Cảm Nhân', '9', 'Xã', 'KV3'),
('839', 'Yên Thành', '9', 'Xã', 'KV3'),
('840', 'Thác Bà', '9', 'Xã', 'KV3'),
('841', 'Yên Bình', '9', 'Xã', 'KV3'),
('842', 'Bảo Ái', '9', 'Xã', 'KV3'),
('843', 'Văn Phú', '9', 'Phường', 'KV3'),
('844', 'Yên Bái', '9', 'Phường', 'KV3'),
('845', 'Nam Cường', '9', 'Phường', 'KV3'),
('846', 'Âu Lâu', '9', 'Phường', 'KV3'),
('847', 'Trấn Yên', '9', 'Xã', 'KV3'),
('848', 'Hưng Khánh', '9', 'Xã', 'KV3'),
('849', 'Lương Thịnh', '9', 'Xã', 'KV3'),
('850', 'Việt Hồng', '9', 'Xã', 'KV3'),
('851', 'Quy Mông', '9', 'Xã', 'KV3'),
('852', 'Phong Hải', '9', 'Xã', 'KV3'),
('853', 'Xuân Quang', '9', 'Xã', 'KV3'),
('854', 'Bảo Thắng', '9', 'Xã', 'KV3'),
('855', 'Tằng Lỏong', '9', 'Xã', 'KV3'),
('856', 'Gia Phú', '9', 'Xã', 'KV3'),
('857', 'Cốc San', '9', 'Xã', 'KV3'),
('858', 'Hợp Thành', '9', 'Xã', 'KV3'),
('859', 'Cam Đường', '9', 'Phường', 'KV3'),
('860', 'Lào Cai', '9', 'Phường', 'KV3'),
('861', 'Mường Hum', '9', 'Xã', 'KV3'),
('862', 'Dền Sáng', '9', 'Xã', 'KV3'),
('863', 'Y Tý', '9', 'Xã', 'KV3'),
('864', 'A Mú Sung', '9', 'Xã', 'KV3'),
('865', 'Trịnh Tường', '9', 'Xã', 'KV3'),
('866', 'Bản Xèo', '9', 'Xã', 'KV3'),
('867', 'Bát Xát', '9', 'Xã', 'KV3'),
('868', 'Nghĩa Đô', '9', 'Xã', 'KV3'),
('869', 'Thượng Hà', '9', 'Xã', 'KV3'),
('870', 'Bảo Yên', '9', 'Xã', 'KV3'),
('871', 'Xuân Hoà', '9', 'Xã', 'KV3'),
('872', 'Phúc Khánh', '9', 'Xã', 'KV3'),
('873', 'Bảo Hà', '9', 'Xã', 'KV3'),
('874', 'Võ Lao', '9', 'Xã', 'KV3'),
('875', 'Khánh Yên', '9', 'Xã', 'KV3'),
('876', 'Văn Bàn', '9', 'Xã', 'KV3'),
('877', 'Dương Quỳ', '9', 'Xã', 'KV3'),
('878', 'Chiềng Ken', '9', 'Xã', 'KV3'),
('879', 'Minh Lương', '9', 'Xã', 'KV3'),
('880', 'Nậm Chày', '9', 'Xã', 'KV3'),
('881', 'Mường Bo', '9', 'Xã', 'KV3'),
('882', 'Bản Hồ', '9', 'Xã', 'KV3'),
('883', 'Tả Phìn', '9', 'Xã', 'KV3'),
('884', 'Tả Van', '9', 'Xã', 'KV3'),
('885', 'Sa Pa', '9', 'Phường', 'KV3'),
('886', 'Cốc Lầu', '9', 'Xã', 'KV3'),
('887', 'Bảo Nhai', '9', 'Xã', 'KV3'),
('888', 'Bản Liền', '9', 'Xã', 'KV3'),
('889', 'Bắc Hà', '9', 'Xã', 'KV3'),
('890', 'Tả Củ Tỷ', '9', 'Xã', 'KV3'),
('891', 'Lùng Phình', '9', 'Xã', 'KV3'),
('892', 'Pha Long', '9', 'Xã', 'KV3'),
('893', 'Mường Khương', '9', 'Xã', 'KV3'),
('894', 'Bản Lầu', '9', 'Xã', 'KV3'),
('895', 'Cao Sơn', '9', 'Xã', 'KV3'),
('896', 'Si Ma Cai', '9', 'Xã', 'KV3'),
('897', 'Sín Chéng', '9', 'Xã', 'KV3'),
('898', 'Lao Chải', '9', 'Xã', 'KV3'),
('899', 'Chế Tạo', '9', 'Xã', 'KV3'),
('900', 'Nậm Có', '9', 'Xã', 'KV3'),
('901', 'Tà Xi Láng', '9', 'Xã', 'KV3'),
('902', 'Phong Dụ Thượng', '9', 'Xã', 'KV3'),
('903', 'Cát Thịnh', '9', 'Xã', 'KV3'),
('904', 'Nậm Xé', '9', 'Xã', 'KV3'),
('905', 'Ngũ Chỉ Sơn', '9', 'Xã', 'KV3'),
('906', 'Phan Đình Phùng', '10', 'Phường', 'KV1'),
('907', 'Linh Sơn', '10', 'Phường', 'KV1'),
('908', 'Tích Lương', '10', 'Phường', 'KV1'),
('909', 'Gia Sàng', '10', 'Phường', 'KV1'),
('910', 'Quyết Thắng', '10', 'Phường', 'KV1'),
('911', 'Quan Triều', '10', 'Phường', 'KV1'),
('912', 'Tân Cương', '10', 'Xã', 'KV1'),
('913', 'Đại Phúc', '10', 'Xã', 'KV1'),
('914', 'Đại Từ', '10', 'Xã', 'KV1'),
('915', 'Đức Lương', '10', 'Xã', 'KV1'),
('916', 'Phú Thịnh', '10', 'Xã', 'KV1'),
('917', 'La Bằng', '10', 'Xã', 'KV1'),
('918', 'Phú Lạc', '10', 'Xã', 'KV1'),
('919', 'An Khánh', '10', 'Xã', 'KV1'),
('920', 'Quân Chu', '10', 'Xã', 'KV1'),
('921', 'Vạn Phú', '10', 'Xã', 'KV1'),
('922', 'Phú Xuyên', '10', 'Xã', 'KV1'),
('923', 'Phổ Yên', '10', 'Phường', 'KV1'),
('924', 'Vạn Xuân', '10', 'Phường', 'KV1'),
('925', 'Trung Thành', '10', 'Phường', 'KV1'),
('926', 'Phúc Thuận', '10', 'Phường', 'KV1'),
('927', 'Thành Công', '10', 'Xã', 'KV1'),
('928', 'Phú Bình', '10', 'Xã', 'KV1'),
('929', 'Tân Thành', '10', 'Xã', 'KV1'),
('930', 'Điềm Thụy', '10', 'Xã', 'KV1'),
('931', 'Kha Sơn', '10', 'Xã', 'KV1'),
('932', 'Tân Khánh', '10', 'Xã', 'KV1'),
('933', 'Đồng Hỷ', '10', 'Xã', 'KV1'),
('934', 'Quang Sơn', '10', 'Xã', 'KV1'),
('935', 'Trại Cau', '10', 'Xã', 'KV1'),
('936', 'Nam Hoà', '10', 'Xã', 'KV1'),
('937', 'Văn Hán', '10', 'Xã', 'KV1'),
('938', 'Văn Lăng', '10', 'Xã', 'KV1'),
('939', 'Sông Công', '10', 'Phường', 'KV1'),
('940', 'Bá Xuyên', '10', 'Phường', 'KV1'),
('941', 'Bách Quang', '10', 'Phường', 'KV1'),
('942', 'Phú Lương', '10', 'Xã', 'KV1'),
('943', 'Vô Tranh', '10', 'Xã', 'KV1'),
('944', 'Yên Trạch', '10', 'Xã', 'KV1'),
('945', 'Hợp Thành', '10', 'Xã', 'KV1'),
('946', 'Định Hóa', '10', 'Xã', 'KV1'),
('947', 'Bình Yên', '10', 'Xã', 'KV1'),
('948', 'Trung Hội', '10', 'Xã', 'KV1'),
('949', 'Phượng Tiến', '10', 'Xã', 'KV1'),
('950', 'Phú Đình', '10', 'Xã', 'KV1'),
('951', 'Bình Thành', '10', 'Xã', 'KV1'),
('952', 'Kim Phượng', '10', 'Xã', 'KV1'),
('953', 'Lam Vỹ', '10', 'Xã', 'KV1'),
('954', 'Võ Nhai', '10', 'Xã', 'KV1'),
('955', 'Dân Tiến', '10', 'Xã', 'KV1'),
('956', 'Nghinh Tường', '10', 'Xã', 'KV1'),
('957', 'Thần Sa', '10', 'Xã', 'KV1'),
('958', 'La Hiên', '10', 'Xã', 'KV1'),
('959', 'Tràng Xá', '10', 'Xã', 'KV1'),
('960', 'Bằng Thành', '10', 'Xã', 'KV1'),
('961', 'Nghiên Loan', '10', 'Xã', 'KV1'),
('962', 'Cao Minh', '10', 'Xã', 'KV1'),
('963', 'Ba Bể', '10', 'Xã', 'KV1'),
('964', 'Chợ Rã', '10', 'Xã', 'KV1'),
('965', 'Phúc Lộc', '10', 'Xã', 'KV1'),
('966', 'Thượng Minh', '10', 'Xã', 'KV1'),
('967', 'Đồng Phúc', '10', 'Xã', 'KV1'),
('968', 'Yên Bình', '10', 'Xã', 'KV1'),
('969', 'Bằng Vân', '10', 'Xã', 'KV1'),
('970', 'Ngân Sơn', '10', 'Xã', 'KV1'),
('971', 'Nà Phặc', '10', 'Xã', 'KV1'),
('972', 'Hiệp Lực', '10', 'Xã', 'KV1'),
('973', 'Nam Cường', '10', 'Xã', 'KV1'),
('974', 'Quảng Bạch', '10', 'Xã', 'KV1'),
('975', 'Yên Thịnh', '10', 'Xã', 'KV1'),
('976', 'Chợ Đồn', '10', 'Xã', 'KV1'),
('977', 'Yên Phong', '10', 'Xã', 'KV1'),
('978', 'Nghĩa Tá', '10', 'Xã', 'KV1'),
('979', 'Phủ Thông', '10', 'Xã', 'KV1'),
('980', 'Cẩm Giàng', '10', 'Xã', 'KV1'),
('981', 'Vĩnh Thông', '10', 'Xã', 'KV1'),
('982', 'Bạch Thông', '10', 'Xã', 'KV1'),
('983', 'Phong Quang', '10', 'Xã', 'KV1'),
('984', 'Đức Xuân', '10', 'Phường', 'KV1'),
('985', 'Bắc Kạn', '10', 'Phường', 'KV1'),
('986', 'Văn Lang', '10', 'Xã', 'KV1'),
('987', 'Cường Lợi', '10', 'Xã', 'KV1'),
('988', 'Na Rì', '10', 'Xã', 'KV1'),
('989', 'Trần Phú', '10', 'Xã', 'KV1'),
('990', 'Côn Minh', '10', 'Xã', 'KV1'),
('991', 'Xuân Dương', '10', 'Xã', 'KV1'),
('992', 'Tân Kỳ', '10', 'Xã', 'KV1'),
('993', 'Thanh Mai', '10', 'Xã', 'KV1'),
('994', 'Thanh Thịnh', '10', 'Xã', 'KV1'),
('995', 'Chợ Mới', '10', 'Xã', 'KV1'),
('996', 'Sảng Mộc', '10', 'Xã', 'KV1'),
('997', 'Thượng Quan', '10', 'Xã', 'KV1'),
('998', 'Thất Khê', '11', 'Xã', 'KV3'),
('999', 'Đoàn Kết', '11', 'Xã', 'KV3'),
('1000', 'Tân Tiến', '11', 'Xã', 'KV3'),
('1001', 'Tràng Định', '11', 'Xã', 'KV3'),
('1002', 'Quốc Khánh', '11', 'Xã', 'KV3'),
('1003', 'Kháng Chiến', '11', 'Xã', 'KV3'),
('1004', 'Quốc Việt', '11', 'Xã', 'KV3'),
('1005', 'Bình Gia', '11', 'Xã', 'KV3'),
('1006', 'Tân Văn', '11', 'Xã', 'KV3'),
('1007', 'Hồng Phong', '11', 'Xã', 'KV3'),
('1008', 'Hoa Thám', '11', 'Xã', 'KV3'),
('1009', 'Quý Hoà', '11', 'Xã', 'KV3'),
('1010', 'Thiện Hoà', '11', 'Xã', 'KV3'),
('1011', 'Thiện Thuật', '11', 'Xã', 'KV3'),
('1012', 'Thiện Long', '11', 'Xã', 'KV3'),
('1013', 'Bắc Sơn', '11', 'Xã', 'KV3'),
('1014', 'Hưng Vũ', '11', 'Xã', 'KV3'),
('1015', 'Vũ Lăng', '11', 'Xã', 'KV3'),
('1016', 'Nhất Hoà', '11', 'Xã', 'KV3'),
('1017', 'Vũ Lễ', '11', 'Xã', 'KV3'),
('1018', 'Tân Tri', '11', 'Xã', 'KV3'),
('1019', 'Văn Quan', '11', 'Xã', 'KV3'),
('1020', 'Điềm He', '11', 'Xã', 'KV3'),
('1021', 'Tri Lễ', '11', 'Xã', 'KV3'),
('1022', 'Yên Phúc', '11', 'Xã', 'KV3'),
('1023', 'Tân Đoàn', '11', 'Xã', 'KV3'),
('1024', 'Khánh Khê', '11', 'Xã', 'KV3'),
('1025', 'Na Sầm', '11', 'Xã', 'KV3'),
('1026', 'Văn Lãng', '11', 'Xã', 'KV3'),
('1027', 'Hội Hoan', '11', 'Xã', 'KV3'),
('1028', 'Thụy Hùng', '11', 'Xã', 'KV3'),
('1029', 'Hoàng Văn Thụ', '11', 'Xã', 'KV3'),
('1030', 'Lộc Bình', '11', 'Xã', 'KV3'),
('1031', 'Mẫu Sơn', '11', 'Xã', 'KV3'),
('1032', 'Na Dương', '11', 'Xã', 'KV3'),
('1033', 'Lợi Bác', '11', 'Xã', 'KV3'),
('1034', 'Thống Nhất', '11', 'Xã', 'KV3'),
('1035', 'Xuân Dương', '11', 'Xã', 'KV3'),
('1036', 'Khuất Xá', '11', 'Xã', 'KV3'),
('1037', 'Đình Lập', '11', 'Xã', 'KV3'),
('1038', 'Châu Sơn', '11', 'Xã', 'KV3'),
('1039', 'Kiên Mộc', '11', 'Xã', 'KV3'),
('1040', 'Thái Bình', '11', 'Xã', 'KV3'),
('1041', 'Hữu Lũng', '11', 'Xã', 'KV3'),
('1042', 'Tuấn Sơn', '11', 'Xã', 'KV3'),
('1043', 'Tân Thành', '11', 'Xã', 'KV3'),
('1044', 'Vân Nham', '11', 'Xã', 'KV3'),
('1045', 'Thiện Tân', '11', 'Xã', 'KV3'),
('1046', 'Yên Bình', '11', 'Xã', 'KV3'),
('1047', 'Hữu Liên', '11', 'Xã', 'KV3'),
('1048', 'Cai Kinh', '11', 'Xã', 'KV3'),
('1049', 'Chi Lăng', '11', 'Xã', 'KV3'),
('1050', 'Nhân Lý', '11', 'Xã', 'KV3'),
('1051', 'Chiến Thắng', '11', 'Xã', 'KV3'),
('1052', 'Quan Sơn', '11', 'Xã', 'KV3'),
('1053', 'Bằng Mạc', '11', 'Xã', 'KV3'),
('1054', 'Vạn Linh', '11', 'Xã', 'KV3'),
('1055', 'Đồng Đăng', '11', 'Xã', 'KV3'),
('1056', 'Cao Lộc', '11', 'Xã', 'KV3'),
('1057', 'Công Sơn', '11', 'Xã', 'KV3'),
('1058', 'Ba Sơn', '11', 'Xã', 'KV3'),
('1059', 'Tam Thanh', '11', 'Phường', 'KV3'),
('1060', 'Lương Văn Tri', '11', 'Phường', 'KV3'),
('1061', 'Kỳ Lừa', '11', 'Phường', 'KV3'),
('1062', 'Đông Kinh', '11', 'Phường', 'KV3'),
('1063', 'Việt Trì', '12', 'Phường', 'KV3'),
('1064', 'Nông Trang', '12', 'Phường', 'KV3'),
('1065', 'Thanh Miếu', '12', 'Phường', 'KV3'),
('1066', 'Vân Phú', '12', 'Phường', 'KV3'),
('1067', 'Hy Cương', '12', 'Xã', 'KV3'),
('1068', 'Lâm Thao', '12', 'Xã', 'KV3'),
('1069', 'Xuân Lũng', '12', 'Xã', 'KV3'),
('1070', 'Phùng Nguyên', '12', 'Xã', 'KV3'),
('1071', 'Bản Nguyên', '12', 'Xã', 'KV3'),
('1072', 'Phong Châu', '12', 'Phường', 'KV3'),
('1073', 'Phú Thọ', '12', 'Phường', 'KV3'),
('1074', 'Âu Cơ', '12', 'Phường', 'KV3'),
('1075', 'Phù Ninh', '12', 'Xã', 'KV3'),
('1076', 'Dân Chủ', '12', 'Xã', 'KV3'),
('1077', 'Phú Mỹ', '12', 'Xã', 'KV3'),
('1078', 'Trạm Thản', '12', 'Xã', 'KV3'),
('1079', 'Bình Phú', '12', 'Xã', 'KV3'),
('1080', 'Thanh Ba', '12', 'Xã', 'KV3'),
('1081', 'Quảng Yên', '12', 'Xã', 'KV3'),
('1082', 'Hoàng Cương', '12', 'Xã', 'KV3'),
('1083', 'Đông Thành', '12', 'Xã', 'KV3'),
('1084', 'Chí Tiên', '12', 'Xã', 'KV3'),
('1085', 'Liên Minh', '12', 'Xã', 'KV3'),
('1086', 'Đoan Hùng', '12', 'Xã', 'KV3'),
('1087', 'Tây Cốc', '12', 'Xã', 'KV3'),
('1088', 'Chân Mộng', '12', 'Xã', 'KV3'),
('1089', 'Chí Đám', '12', 'Xã', 'KV3'),
('1090', 'Bằng Luân', '12', 'Xã', 'KV3'),
('1091', 'Hạ Hòa', '12', 'Xã', 'KV3'),
('1092', 'Đan Thượng', '12', 'Xã', 'KV3'),
('1093', 'Yên Kỳ', '12', 'Xã', 'KV3'),
('1094', 'Vĩnh Chân', '12', 'Xã', 'KV3'),
('1095', 'Văn Lang', '12', 'Xã', 'KV3'),
('1096', 'Hiền Lương', '12', 'Xã', 'KV3'),
('1097', 'Cẩm Khê', '12', 'Xã', 'KV3'),
('1098', 'Phú Khê', '12', 'Xã', 'KV3'),
('1099', 'Hùng Việt', '12', 'Xã', 'KV3'),
('1100', 'Đồng Lương', '12', 'Xã', 'KV3'),
('1101', 'Tiên Lương', '12', 'Xã', 'KV3'),
('1102', 'Vân Bán', '12', 'Xã', 'KV3'),
('1103', 'Tam Nông', '12', 'Xã', 'KV3'),
('1104', 'Thọ Văn', '12', 'Xã', 'KV3'),
('1105', 'Vạn Xuân', '12', 'Xã', 'KV3'),
('1106', 'Hiền Quan', '12', 'Xã', 'KV3'),
('1107', 'Thanh Thuỷ', '12', 'Xã', 'KV3'),
('1108', 'Đào Xá', '12', 'Xã', 'KV3'),
('1109', 'Tu Vũ', '12', 'Xã', 'KV3'),
('1110', 'Thanh Sơn', '12', 'Xã', 'KV3'),
('1111', 'Võ Miếu', '12', 'Xã', 'KV3'),
('1112', 'Văn Miếu', '12', 'Xã', 'KV3'),
('1113', 'Cự Đồng', '12', 'Xã', 'KV3'),
('1114', 'Hương Cần', '12', 'Xã', 'KV3'),
('1115', 'Yên Sơn', '12', 'Xã', 'KV3'),
('1116', 'Khả Cửu', '12', 'Xã', 'KV3'),
('1117', 'Tân Sơn', '12', 'Xã', 'KV3'),
('1118', 'Minh Đài', '12', 'Xã', 'KV3'),
('1119', 'Lai Đồng', '12', 'Xã', 'KV3'),
('1120', 'Thu Cúc', '12', 'Xã', 'KV3'),
('1121', 'Xuân Đài', '12', 'Xã', 'KV3'),
('1122', 'Long Cốc', '12', 'Xã', 'KV3'),
('1123', 'Yên Lập', '12', 'Xã', 'KV3'),
('1124', 'Thượng Long', '12', 'Xã', 'KV3'),
('1125', 'Sơn Lương', '12', 'Xã', 'KV3'),
('1126', 'Xuân Viên', '12', 'Xã', 'KV3'),
('1127', 'Minh Hòa', '12', 'Xã', 'KV3'),
('1128', 'Trung Sơn', '12', 'Xã', 'KV3'),
('1129', 'Tam Sơn', '12', 'Xã', 'KV3'),
('1130', 'Sông Lô', '12', 'Xã', 'KV3'),
('1131', 'Hải Lựu', '12', 'Xã', 'KV3'),
('1132', 'Yên Lãng', '12', 'Xã', 'KV3'),
('1133', 'Lập Thạch', '12', 'Xã', 'KV3'),
('1134', 'Tiên Lữ', '12', 'Xã', 'KV3'),
('1135', 'Thái Hòa', '12', 'Xã', 'KV3'),
('1136', 'Liên Hòa', '12', 'Xã', 'KV3'),
('1137', 'Hợp Lý', '12', 'Xã', 'KV3'),
('1138', 'Sơn Đông', '12', 'Xã', 'KV3'),
('1139', 'Tam Đảo', '12', 'Xã', 'KV3'),
('1140', 'Đại Đình', '12', 'Xã', 'KV3'),
('1141', 'Đạo Trù', '12', 'Xã', 'KV3'),
('1142', 'Tam Dương', '12', 'Xã', 'KV3'),
('1143', 'Hội Thịnh', '12', 'Xã', 'KV3'),
('1144', 'Hoàng An', '12', 'Xã', 'KV3'),
('1145', 'Tam Dương Bắc', '12', 'Xã', 'KV3'),
('1146', 'Vĩnh Tường', '12', 'Xã', 'KV3'),
('1147', 'Thổ Tang', '12', 'Xã', 'KV3'),
('1148', 'Vĩnh Hưng', '12', 'Xã', 'KV3'),
('1149', 'Vĩnh An', '12', 'Xã', 'KV3'),
('1150', 'Vĩnh Phú', '12', 'Xã', 'KV3'),
('1151', 'Vĩnh Thành', '12', 'Xã', 'KV3'),
('1152', 'Yên Lạc', '12', 'Xã', 'KV3'),
('1153', 'Tề Lỗ', '12', 'Xã', 'KV3'),
('1154', 'Liên Châu', '12', 'Xã', 'KV3'),
('1155', 'Tam Hồng', '12', 'Xã', 'KV3'),
('1156', 'Nguyệt Đức', '12', 'Xã', 'KV3'),
('1157', 'Bình Nguyên', '12', 'Xã', 'KV3'),
('1158', 'Xuân Lãng', '12', 'Xã', 'KV3'),
('1159', 'Bình Xuyên', '12', 'Xã', 'KV3'),
('1160', 'Bình Tuyền', '12', 'Xã', 'KV3'),
('1161', 'Vĩnh Phúc', '12', 'Phường', 'KV3'),
('1162', 'Vĩnh Yên', '12', 'Phường', 'KV3'),
('1163', 'Phúc Yên', '12', 'Phường', 'KV3'),
('1164', 'Xuân Hòa', '12', 'Phường', 'KV3'),
('1165', 'Cao Phong', '12', 'Xã', 'KV3'),
('1166', 'Mường Thàng', '12', 'Xã', 'KV3'),
('1167', 'Thung Nai', '12', 'Xã', 'KV3'),
('1168', 'Đà Bắc', '12', 'Xã', 'KV3'),
('1169', 'Cao Sơn', '12', 'Xã', 'KV3'),
('1170', 'Đức Nhàn', '12', 'Xã', 'KV3'),
('1171', 'Quy Đức', '12', 'Xã', 'KV3'),
('1172', 'Tân Pheo', '12', 'Xã', 'KV3'),
('1173', 'Tiền Phong', '12', 'Xã', 'KV3'),
('1174', 'Kim Bôi', '12', 'Xã', 'KV3'),
('1175', 'Mường Động', '12', 'Xã', 'KV3'),
('1176', 'Dũng Tiến', '12', 'Xã', 'KV3'),
('1177', 'Hợp Kim', '12', 'Xã', 'KV3'),
('1178', 'Nật Sơn', '12', 'Xã', 'KV3'),
('1179', 'Lạc Sơn', '12', 'Xã', 'KV3'),
('1180', 'Mường Vang', '12', 'Xã', 'KV3'),
('1181', 'Đại Đồng', '12', 'Xã', 'KV3'),
('1182', 'Ngọc Sơn', '12', 'Xã', 'KV3'),
('1183', 'Nhân Nghĩa', '12', 'Xã', 'KV3'),
('1184', 'Quyết Thắng', '12', 'Xã', 'KV3'),
('1185', 'Thượng Cốc', '12', 'Xã', 'KV3'),
('1186', 'Yên Phú', '12', 'Xã', 'KV3'),
('1187', 'Lạc Thủy', '12', 'Xã', 'KV3'),
('1188', 'An Bình', '12', 'Xã', 'KV3'),
('1189', 'An Nghĩa', '12', 'Xã', 'KV3'),
('1190', 'Lương Sơn', '12', 'Xã', 'KV3'),
('1191', 'Cao Dương', '12', 'Xã', 'KV3'),
('1192', 'Liên Sơn', '12', 'Xã', 'KV3'),
('1193', 'Mai Châu', '12', 'Xã', 'KV3'),
('1194', 'Bao La', '12', 'Xã', 'KV3'),
('1195', 'Mai Hạ', '12', 'Xã', 'KV3'),
('1196', 'Pà Cò', '12', 'Xã', 'KV3'),
('1197', 'Tân Mai', '12', 'Xã', 'KV3'),
('1198', 'Tân Lạc', '12', 'Xã', 'KV3'),
('1199', 'Mường Bi', '12', 'Xã', 'KV3'),
('1200', 'Mường Hoa', '12', 'Xã', 'KV3'),
('1201', 'Toàn Thắng', '12', 'Xã', 'KV3'),
('1202', 'Vân Sơn', '12', 'Xã', 'KV3'),
('1203', 'Yên Thủy', '12', 'Xã', 'KV3'),
('1204', 'Lạc Lương', '12', 'Xã', 'KV3'),
('1205', 'Yên Trị', '12', 'Xã', 'KV3'),
('1206', 'Thịnh Minh', '12', 'Xã', 'KV3'),
('1207', 'Hoà Bình', '12', 'Phường', 'KV3'),
('1208', 'Kỳ Sơn', '12', 'Phường', 'KV3'),
('1209', 'Tân Hoà', '12', 'Phường', 'KV3'),
('1210', 'Thống Nhất', '12', 'Phường', 'KV3'),
('1211', 'Mường Phăng', '13', 'Xã', 'KV3'),
('1212', 'Điện Biên Phủ', '13', 'Phường', 'KV3'),
('1213', 'Mường Thanh', '13', 'Phường', 'KV3'),
('1214', 'Mường Lay', '13', 'Phường', 'KV3'),
('1215', 'Thanh Nưa', '13', 'Xã', 'KV3'),
('1216', 'Thanh An', '13', 'Xã', 'KV3'),
('1217', 'Thanh Yên', '13', 'Xã', 'KV3'),
('1218', 'Sam Mứn', '13', 'Xã', 'KV3'),
('1219', 'Núa Ngam', '13', 'Xã', 'KV3'),
('1220', 'Mường Nhà', '13', 'Xã', 'KV3'),
('1221', 'Tuần Giáo', '13', 'Xã', 'KV3'),
('1222', 'Quài Tở', '13', 'Xã', 'KV3'),
('1223', 'Mường Mùn', '13', 'Xã', 'KV3'),
('1224', 'Pú Nhung', '13', 'Xã', 'KV3'),
('1225', 'Chiềng Sinh', '13', 'Xã', 'KV3'),
('1226', 'Tủa Chùa', '13', 'Xã', 'KV3'),
('1227', 'Sín Chải', '13', 'Xã', 'KV3'),
('1228', 'Sính Phình', '13', 'Xã', 'KV3'),
('1229', 'Tủa Thàng', '13', 'Xã', 'KV3'),
('1230', 'Sáng Nhè', '13', 'Xã', 'KV3'),
('1231', 'Na Sang', '13', 'Xã', 'KV3'),
('1232', 'Mường Tùng', '13', 'Xã', 'KV3'),
('1233', 'Pa Ham', '13', 'Xã', 'KV3'),
('1234', 'Nậm Nèn', '13', 'Xã', 'KV3'),
('1235', 'Mường Pồn', '13', 'Xã', 'KV3'),
('1236', 'Na Son', '13', 'Xã', 'KV3'),
('1237', 'Xa Dung', '13', 'Xã', 'KV3'),
('1238', 'Pu Nhi', '13', 'Xã', 'KV3'),
('1239', 'Mường Luân', '13', 'Xã', 'KV3'),
('1240', 'Tìa Dình', '13', 'Xã', 'KV3'),
('1241', 'Phình Giàng', '13', 'Xã', 'KV3'),
('1242', 'Mường Chà', '13', 'Xã', 'KV3'),
('1243', 'Nà Hỳ', '13', 'Xã', 'KV3'),
('1244', 'Nà Bủng', '13', 'Xã', 'KV3'),
('1245', 'Chà Tở', '13', 'Xã', 'KV3'),
('1246', 'Si Pa Phìn', '13', 'Xã', 'KV3'),
('1247', 'Mường Nhé', '13', 'Xã', 'KV3'),
('1248', 'Sín Thầu', '13', 'Xã', 'KV3'),
('1249', 'Mường Toong', '13', 'Xã', 'KV3'),
('1250', 'Nậm Kè', '13', 'Xã', 'KV3'),
('1251', 'Quảng Lâm', '13', 'Xã', 'KV3'),
('1252', 'Mường Ảng', '13', 'Xã', 'KV3'),
('1253', 'Nà Tấu', '13', 'Xã', 'KV3'),
('1254', 'Búng Lao', '13', 'Xã', 'KV3'),
('1255', 'Mường Lạn', '13', 'Xã', 'KV3'),
('1256', 'Mường Kim', '14', 'Xã', 'KV3'),
('1257', 'Khoen On', '14', 'Xã', 'KV3'),
('1258', 'Than Uyên', '14', 'Xã', 'KV3'),
('1259', 'Mường Than', '14', 'Xã', 'KV3'),
('1260', 'Pắc Ta', '14', 'Xã', 'KV3'),
('1261', 'Nậm Sỏ', '14', 'Xã', 'KV3'),
('1262', 'Tân Uyên', '14', 'Xã', 'KV3'),
('1263', 'Mường Khoa', '14', 'Xã', 'KV3'),
('1264', 'Bản Bo', '14', 'Xã', 'KV3'),
('1265', 'Bình Lư', '14', 'Xã', 'KV3'),
('1266', 'Tả Lèng', '14', 'Xã', 'KV3'),
('1267', 'Khun Há', '14', 'Xã', 'KV3'),
('1268', 'Tân Phong', '14', 'Phường', 'KV3'),
('1269', 'Đoàn Kết', '14', 'Phường', 'KV3'),
('1270', 'Sin Suối Hồ', '14', 'Xã', 'KV3'),
('1271', 'Phong Thổ', '14', 'Xã', 'KV3'),
('1272', 'Sì Lở Lầu', '14', 'Xã', 'KV3'),
('1273', 'Dào San', '14', 'Xã', 'KV3'),
('1274', 'Khổng Lào', '14', 'Xã', 'KV3'),
('1275', 'Tủa Sín Chải', '14', 'Xã', 'KV3'),
('1276', 'Sìn Hồ', '14', 'Xã', 'KV3'),
('1277', 'Hồng Thu', '14', 'Xã', 'KV3'),
('1278', 'Nậm Tăm', '14', 'Xã', 'KV3'),
('1279', 'Pu Sam Cáp', '14', 'Xã', 'KV3'),
('1280', 'Nậm Cuổi', '14', 'Xã', 'KV3'),
('1281', 'Nậm Mạ', '14', 'Xã', 'KV3'),
('1282', 'Lê Lợi', '14', 'Xã', 'KV3'),
('1283', 'Nậm Hàng', '14', 'Xã', 'KV3'),
('1284', 'Mường Mô', '14', 'Xã', 'KV3'),
('1285', 'Hua Bum', '14', 'Xã', 'KV3'),
('1286', 'Pa Tần', '14', 'Xã', 'KV3'),
('1287', 'Bum Nưa', '14', 'Xã', 'KV3'),
('1288', 'Bum Tở', '14', 'Xã', 'KV3'),
('1289', 'Mường Tè', '14', 'Xã', 'KV3'),
('1290', 'Thu Lũm', '14', 'Xã', 'KV3'),
('1291', 'Pa Ủ', '14', 'Xã', 'KV3'),
('1292', 'Tà Tổng', '14', 'Xã', 'KV3'),
('1293', 'Mù Cả', '14', 'Xã', 'KV3'),
('1294', 'Tô Hiệu', '15', 'Phường', 'KV3'),
('1295', 'Chiềng An', '15', 'Phường', 'KV3'),
('1296', 'Chiềng Cơi', '15', 'Phường', 'KV3'),
('1297', 'Chiềng Sinh', '15', 'Phường', 'KV3'),
('1298', 'Mộc Châu', '15', 'Phường', 'KV3'),
('1299', 'Mộc Sơn', '15', 'Phường', 'KV3'),
('1300', 'Vân Sơn', '15', 'Phường', 'KV3'),
('1301', 'Thảo Nguyên', '15', 'Phường', 'KV3'),
('1302', 'Đoàn Kết', '15', 'Xã', 'KV3'),
('1303', 'Lóng Sập', '15', 'Xã', 'KV3'),
('1304', 'Chiềng Sơn', '15', 'Xã', 'KV3'),
('1305', 'Vân Hồ', '15', 'Xã', 'KV3'),
('1306', 'Song Khủa', '15', 'Xã', 'KV3'),
('1307', 'Tô Múa', '15', 'Xã', 'KV3'),
('1308', 'Xuân Nha', '15', 'Xã', 'KV3'),
('1309', 'Quỳnh Nhai', '15', 'Xã', 'KV3'),
('1310', 'Mường Chiên', '15', 'Xã', 'KV3'),
('1311', 'Mường Giôn', '15', 'Xã', 'KV3'),
('1312', 'Mường Sại', '15', 'Xã', 'KV3'),
('1313', 'Thuận Châu', '15', 'Xã', 'KV3'),
('1314', 'Chiềng La', '15', 'Xã', 'KV3'),
('1315', 'Nậm Lầu', '15', 'Xã', 'KV3'),
('1316', 'Muổi Nọi', '15', 'Xã', 'KV3'),
('1317', 'Mường Khiêng', '15', 'Xã', 'KV3'),
('1318', 'Co Mạ', '15', 'Xã', 'KV3'),
('1319', 'Bình Thuận', '15', 'Xã', 'KV3'),
('1320', 'Mường É', '15', 'Xã', 'KV3'),
('1321', 'Long Hẹ', '15', 'Xã', 'KV3'),
('1322', 'Mường La', '15', 'Xã', 'KV3'),
('1323', 'Chiềng Lao', '15', 'Xã', 'KV3'),
('1324', 'Mường Bú', '15', 'Xã', 'KV3'),
('1325', 'Chiềng Hoa', '15', 'Xã', 'KV3'),
('1326', 'Bắc Yên', '15', 'Xã', 'KV3'),
('1327', 'Tà Xùa', '15', 'Xã', 'KV3'),
('1328', 'Tạ Khoa', '15', 'Xã', 'KV3'),
('1329', 'Xím Vàng', '15', 'Xã', 'KV3'),
('1330', 'Pắc Ngà', '15', 'Xã', 'KV3'),
('1331', 'Chiềng Sại', '15', 'Xã', 'KV3'),
('1332', 'Phù Yên', '15', 'Xã', 'KV3'),
('1333', 'Gia Phù', '15', 'Xã', 'KV3'),
('1334', 'Tường Hạ', '15', 'Xã', 'KV3'),
('1335', 'Mường Cơi', '15', 'Xã', 'KV3'),
('1336', 'Mường Bang', '15', 'Xã', 'KV3'),
('1337', 'Tân Phong', '15', 'Xã', 'KV3'),
('1338', 'Kim Bon', '15', 'Xã', 'KV3'),
('1339', 'Yên Châu', '15', 'Xã', 'KV3'),
('1340', 'Chiềng Hặc', '15', 'Xã', 'KV3'),
('1341', 'Lóng Phiêng', '15', 'Xã', 'KV3'),
('1342', 'Yên Sơn', '15', 'Xã', 'KV3'),
('1343', 'Chiềng Mai', '15', 'Xã', 'KV3'),
('1344', 'Mai Sơn', '15', 'Xã', 'KV3'),
('1345', 'Phiêng Pằn', '15', 'Xã', 'KV3'),
('1346', 'Chiềng Mung', '15', 'Xã', 'KV3'),
('1347', 'Phiêng Cằm', '15', 'Xã', 'KV3'),
('1348', 'Mường Chanh', '15', 'Xã', 'KV3'),
('1349', 'Tà Hộc', '15', 'Xã', 'KV3'),
('1350', 'Chiềng Sung', '15', 'Xã', 'KV3'),
('1351', 'Bó Sinh', '15', 'Xã', 'KV3'),
('1352', 'Chiềng Khương', '15', 'Xã', 'KV3'),
('1353', 'Mường Hung', '15', 'Xã', 'KV3'),
('1354', 'Chiềng Khoong', '15', 'Xã', 'KV3'),
('1355', 'Mường Lầm', '15', 'Xã', 'KV3'),
('1356', 'Nậm Ty', '15', 'Xã', 'KV3'),
('1357', 'Sông Mã', '15', 'Xã', 'KV3'),
('1358', 'Huổi Một', '15', 'Xã', 'KV3'),
('1359', 'Chiềng Sơ', '15', 'Xã', 'KV3'),
('1360', 'Sốp Cộp', '15', 'Xã', 'KV3'),
('1361', 'Púng Bánh', '15', 'Xã', 'KV3'),
('1362', 'Tân Yên', '15', 'Xã', 'KV3'),
('1363', 'Mường Bám', '15', 'Xã', 'KV3'),
('1364', 'Ngọc Chiến', '15', 'Xã', 'KV3'),
('1365', 'Suối Tọ', '15', 'Xã', 'KV3'),
('1366', 'Phiêng Khoài', '15', 'Xã', 'KV3'),
('1367', 'Mường Lạn', '15', 'Xã', 'KV3'),
('1368', 'Mường Lèo', '15', 'Xã', 'KV3'),
('1369', 'Hạc Thành', '16', 'Phường', 'KV1'),
('1370', 'Quảng Phú', '16', 'Phường', 'KV1'),
('1371', 'Đông Quang', '16', 'Phường', 'KV1'),
('1372', 'Đông Sơn', '16', 'Phường', 'KV1'),
('1373', 'Đông Tiến', '16', 'Phường', 'KV1'),
('1374', 'Hàm Rồng', '16', 'Phường', 'KV1'),
('1375', 'Nguyệt Viên', '16', 'Phường', 'KV1'),
('1376', 'Sầm Sơn', '16', 'Phường', 'KV1'),
('1377', 'Nam Sầm Sơn', '16', 'Phường', 'KV1'),
('1378', 'Bỉm Sơn', '16', 'Phường', 'KV1'),
('1379', 'Quang Trung', '16', 'Phường', 'KV1'),
('1380', 'Ngọc Sơn', '16', 'Phường', 'KV1'),
('1381', 'Tân Dân', '16', 'Phường', 'KV1'),
('1382', 'Hải Lĩnh', '16', 'Phường', 'KV1'),
('1383', 'Tĩnh Gia', '16', 'Phường', 'KV1'),
('1384', 'Đào Duy Tư', '16', 'Phường', 'KV1'),
('1385', 'Hải Bình', '16', 'Phường', 'KV1'),
('1386', 'Trúc Lâm', '16', 'Phường', 'KV1'),
('1387', 'Nghi Sơn', '16', 'Phường', 'KV1'),
('1388', 'Các Sơn', '16', 'Xã', 'KV1'),
('1389', 'Trường Lâm', '16', 'Xã', 'KV1'),
('1390', 'Hà Trung', '16', 'Xã', 'KV1'),
('1391', 'Tống Sơn', '16', 'Xã', 'KV1'),
('1392', 'Hà Long', '16', 'Xã', 'KV1'),
('1393', 'Hoạt Giang', '16', 'Xã', 'KV1'),
('1394', 'Lĩnh Toại', '16', 'Xã', 'KV1'),
('1395', 'Triệu Lộc', '16', 'Xã', 'KV1'),
('1396', 'Đông Thành', '16', 'Xã', 'KV1'),
('1397', 'Hậu Lộc', '16', 'Xã', 'KV1'),
('1398', 'Hoa Lộc', '16', 'Xã', 'KV1'),
('1399', 'Vạn Lộc', '16', 'Xã', 'KV1'),
('1400', 'Nga Sơn', '16', 'Xã', 'KV1'),
('1401', 'Nga Thắng', '16', 'Xã', 'KV1'),
('1402', 'Hồ Vương', '16', 'Xã', 'KV1'),
('1403', 'Tân Tiến', '16', 'Xã', 'KV1'),
('1404', 'Nga An', '16', 'Xã', 'KV1'),
('1405', 'Ba Đình', '16', 'Xã', 'KV1'),
('1406', 'Hoằng Hóa', '16', 'Xã', 'KV1'),
('1407', 'Hoằng Tiến', '16', 'Xã', 'KV1'),
('1408', 'Hoằng Thanh', '16', 'Xã', 'KV1'),
('1409', 'Hoằng Lộc', '16', 'Xã', 'KV1'),
('1410', 'Hoằng Châu', '16', 'Xã', 'KV1'),
('1411', 'Hoằng Sơn', '16', 'Xã', 'KV1'),
('1412', 'Hoằng Phú', '16', 'Xã', 'KV1'),
('1413', 'Hoằng Giang', '16', 'Xã', 'KV1'),
('1414', 'Lưu Vệ', '16', 'Xã', 'KV1'),
('1415', 'Quảng Yên', '16', 'Xã', 'KV1'),
('1416', 'Quảng Ngọc', '16', 'Xã', 'KV1'),
('1417', 'Quảng Ninh', '16', 'Xã', 'KV1'),
('1418', 'Quảng Bình', '16', 'Xã', 'KV1'),
('1419', 'Tiên Trang', '16', 'Xã', 'KV1'),
('1420', 'Quảng Chính', '16', 'Xã', 'KV1'),
('1421', 'Nông Cống', '16', 'Xã', 'KV1'),
('1422', 'Thắng Lợi', '16', 'Xã', 'KV1'),
('1423', 'Trung Chính', '16', 'Xã', 'KV1'),
('1424', 'Trường Văn', '16', 'Xã', 'KV1'),
('1425', 'Thăng Bình', '16', 'Xã', 'KV1'),
('1426', 'Tượng Lĩnh', '16', 'Xã', 'KV1'),
('1427', 'Công Chính', '16', 'Xã', 'KV1'),
('1428', 'Thiệu Hóa', '16', 'Xã', 'KV1'),
('1429', 'Thiệu Quang', '16', 'Xã', 'KV1'),
('1430', 'Thiệu Tiến', '16', 'Xã', 'KV1'),
('1431', 'Thiệu Toán', '16', 'Xã', 'KV1'),
('1432', 'Thiệu Trung', '16', 'Xã', 'KV1'),
('1433', 'Yên Định', '16', 'Xã', 'KV1'),
('1434', 'Yên Trường', '16', 'Xã', 'KV1'),
('1435', 'Yên Phú', '16', 'Xã', 'KV1'),
('1436', 'Quý Lộc', '16', 'Xã', 'KV1'),
('1437', 'Yên Ninh', '16', 'Xã', 'KV1'),
('1438', 'Định Tân', '16', 'Xã', 'KV1'),
('1439', 'Định Hoà', '16', 'Xã', 'KV1'),
('1440', 'Thọ Xuân', '16', 'Xã', 'KV1'),
('1441', 'Thọ Long', '16', 'Xã', 'KV1'),
('1442', 'Xuân Hoà', '16', 'Xã', 'KV1'),
('1443', 'Sao Vàng', '16', 'Xã', 'KV1'),
('1444', 'Lam Sơn', '16', 'Xã', 'KV1'),
('1445', 'Thọ Lập', '16', 'Xã', 'KV1'),
('1446', 'Xuân Tín', '16', 'Xã', 'KV1'),
('1447', 'Xuân Lập', '16', 'Xã', 'KV1'),
('1448', 'Vĩnh Lộc', '16', 'Xã', 'KV1'),
('1449', 'Tây Đô', '16', 'Xã', 'KV1'),
('1450', 'Biện Thượng', '16', 'Xã', 'KV1'),
('1451', 'Triệu Sơn', '16', 'Xã', 'KV1'),
('1452', 'Thọ Bình', '16', 'Xã', 'KV1'),
('1453', 'Thọ Ngọc', '16', 'Xã', 'KV1'),
('1454', 'Thọ Phú', '16', 'Xã', 'KV1'),
('1455', 'Hợp Tiến', '16', 'Xã', 'KV1'),
('1456', 'An Nông', '16', 'Xã', 'KV1'),
('1457', 'Tân Ninh', '16', 'Xã', 'KV1'),
('1458', 'Đồng Tiến', '16', 'Xã', 'KV1'),
('1459', 'Mường Chanh', '16', 'Xã', 'KV1'),
('1460', 'Quang Chiểu', '16', 'Xã', 'KV1'),
('1461', 'Tam chung', '16', 'Xã', 'KV1'),
('1462', 'Mường Lát', '16', 'Xã', 'KV1'),
('1463', 'Pù Nhi', '16', 'Xã', 'KV1'),
('1464', 'Nhi Sơn', '16', 'Xã', 'KV1'),
('1465', 'Mường Lý', '16', 'Xã', 'KV1'),
('1466', 'Trung Lý', '16', 'Xã', 'KV1'),
('1467', 'Hồi Xuân', '16', 'Xã', 'KV1'),
('1468', 'Nam Xuân', '16', 'Xã', 'KV1'),
('1469', 'Thiên Phủ', '16', 'Xã', 'KV1'),
('1470', 'Hiền Kiệt', '16', 'Xã', 'KV1'),
('1471', 'Phú Xuân', '16', 'Xã', 'KV1'),
('1472', 'Phú Lệ', '16', 'Xã', 'KV1'),
('1473', 'Trung Thành', '16', 'Xã', 'KV1'),
('1474', 'Trung Sơn', '16', 'Xã', 'KV1'),
('1475', 'Na Mèo', '16', 'Xã', 'KV1'),
('1476', 'Sơn Thủy', '16', 'Xã', 'KV1'),
('1477', 'Sơn Điện', '16', 'Xã', 'KV1'),
('1478', 'Mường Mìn', '16', 'Xã', 'KV1'),
('1479', 'Tam Thanh', '16', 'Xã', 'KV1'),
('1480', 'Tam Lư', '16', 'Xã', 'KV1'),
('1481', 'Quan Sơn', '16', 'Xã', 'KV1'),
('1482', 'Trung Hạ', '16', 'Xã', 'KV1'),
('1483', 'Linh Sơn', '16', 'Xã', 'KV1'),
('1484', 'Đồng Lương', '16', 'Xã', 'KV1'),
('1485', 'Văn Phú', '16', 'Xã', 'KV1'),
('1486', 'Giao An', '16', 'Xã', 'KV1'),
('1487', 'Yên Khương', '16', 'Xã', 'KV1'),
('1488', 'Yên Thắng', '16', 'Xã', 'KV1'),
('1489', 'Văn Nho', '16', 'Xã', 'KV1'),
('1490', 'Thiết Ống', '16', 'Xã', 'KV1'),
('1491', 'Bá Thước', '16', 'Xã', 'KV1'),
('1492', 'Cổ Lũng', '16', 'Xã', 'KV1'),
('1493', 'Pù Luông', '16', 'Xã', 'KV1'),
('1494', 'Điền Lư', '16', 'Xã', 'KV1'),
('1495', 'Điền Quang', '16', 'Xã', 'KV1'),
('1496', 'Quý Lương', '16', 'Xã', 'KV1'),
('1497', 'Ngọc Lặc', '16', 'Xã', 'KV1'),
('1498', 'Thạch Lập', '16', 'Xã', 'KV1'),
('1499', 'Ngọc Liên', '16', 'Xã', 'KV1'),
('1500', 'Minh Sơn', '16', 'Xã', 'KV1'),
('1501', 'Nguyệt Ấn', '16', 'Xã', 'KV1'),
('1502', 'Kiên Thọ', '16', 'Xã', 'KV1'),
('1503', 'Cẩm Thạch', '16', 'Xã', 'KV1'),
('1504', 'Cẩm Thủy', '16', 'Xã', 'KV1'),
('1505', 'Cẩm Tú', '16', 'Xã', 'KV1'),
('1506', 'Cẩm Vân', '16', 'Xã', 'KV1'),
('1507', 'Cẩm Tân', '16', 'Xã', 'KV1'),
('1508', 'Kim Tân', '16', 'Xã', 'KV1'),
('1509', 'Vân Du', '16', 'Xã', 'KV1'),
('1510', 'Ngọc Trạo', '16', 'Xã', 'KV1'),
('1511', 'Thạch Bình', '16', 'Xã', 'KV1'),
('1512', 'Thành Vinh', '16', 'Xã', 'KV1'),
('1513', 'Thạch Quảng', '16', 'Xã', 'KV1'),
('1514', 'Như Xuân', '16', 'Xã', 'KV1'),
('1515', 'Thượng Ninh', '16', 'Xã', 'KV1'),
('1516', 'Xuân Bình', '16', 'Xã', 'KV1'),
('1517', 'Hóa Quỳ', '16', 'Xã', 'KV1'),
('1518', 'Thanh Quân', '16', 'Xã', 'KV1'),
('1519', 'Thanh Phong', '16', 'Xã', 'KV1'),
('1520', 'Xuân Du', '16', 'Xã', 'KV1'),
('1521', 'Mậu Lâm', '16', 'Xã', 'KV1'),
('1522', 'Như Thanh', '16', 'Xã', 'KV1'),
('1523', 'Yên Thọ', '16', 'Xã', 'KV1'),
('1524', 'Xuân Thái', '16', 'Xã', 'KV1'),
('1525', 'Thanh Kỳ', '16', 'Xã', 'KV1'),
('1526', 'Bát Mọt', '16', 'Xã', 'KV1'),
('1527', 'Yên Nhân', '16', 'Xã', 'KV1'),
('1528', 'Lương Sơn', '16', 'Xã', 'KV1'),
('1529', 'Thường Xuân', '16', 'Xã', 'KV1'),
('1530', 'Luận Thành', '16', 'Xã', 'KV1'),
('1531', 'Tân Thành', '16', 'Xã', 'KV1'),
('1532', 'Vạn Xuân', '16', 'Xã', 'KV1'),
('1533', 'Thắng Lộc', '16', 'Xã', 'KV1'),
('1534', 'Xuân Chinh', '16', 'Xã', 'KV1'),
('1535', 'Anh Sơn', '17', 'Xã', 'KV1'),
('1536', 'Yên Xuân', '17', 'Xã', 'KV1'),
('1537', 'Nhân Hoà', '17', 'Xã', 'KV1'),
('1538', 'Anh Sơn Đông', '17', 'Xã', 'KV1'),
('1539', 'Vĩnh Tường', '17', 'Xã', 'KV1'),
('1540', 'Thành Bình Thọ', '17', 'Xã', 'KV1'),
('1541', 'Con Cuông', '17', 'Xã', 'KV1'),
('1542', 'Môn Sơn', '17', 'Xã', 'KV1'),
('1543', 'Mậu Thạch', '17', 'Xã', 'KV1'),
('1544', 'Cam Phục', '17', 'Xã', 'KV1'),
('1545', 'Châu Khê', '17', 'Xã', 'KV1'),
('1546', 'Bình Chuẩn', '17', 'Xã', 'KV1'),
('1547', 'Diễn Châu', '17', 'Xã', 'KV1'),
('1548', 'Đức Châu', '17', 'Xã', 'KV1'),
('1549', 'Quảng Châu', '17', 'Xã', 'KV1'),
('1550', 'Hải Châu', '17', 'Xã', 'KV1'),
('1551', 'Tân Châu', '17', 'Xã', 'KV1'),
('1552', 'An Châu', '17', 'Xã', 'KV1'),
('1553', 'Minh Châu', '17', 'Xã', 'KV1'),
('1554', 'Hùng Châu', '17', 'Xã', 'KV1'),
('1555', 'Đô Lương', '17', 'Xã', 'KV1'),
('1556', 'Bạch Ngọc', '17', 'Xã', 'KV1'),
('1557', 'Văn Hiến', '17', 'Xã', 'KV1'),
('1558', 'Bạch Hà', '17', 'Xã', 'KV1'),
('1559', 'Thuần Trung', '17', 'Xã', 'KV1'),
('1560', 'Lương Sơn', '17', 'Xã', 'KV1'),
('1561', 'Hoàng Mai', '17', 'Phường', 'KV1'),
('1562', 'Tân Mai', '17', 'Phường', 'KV1'),
('1563', 'Quỳnh Mai', '17', 'Phường', 'KV1'),
('1564', 'Hưng Nguyên', '17', 'Xã', 'KV1'),
('1565', 'Yên Trung', '17', 'Xã', 'KV1'),
('1566', 'Hưng Nguyên Nam', '17', 'Xã', 'KV1'),
('1567', 'Lam Thành', '17', 'Xã', 'KV1'),
('1568', 'Mường Xén', '17', 'Xã', 'KV1'),
('1569', 'Hữu Kiệm', '17', 'Xã', 'KV1'),
('1570', 'Nậm Cắn', '17', 'Xã', 'KV1'),
('1571', 'Chiêu Lưu', '17', 'Xã', 'KV1'),
('1572', 'Na Loi', '17', 'Xã', 'KV1'),
('1573', 'Mường Típ', '17', 'Xã', 'KV1'),
('1574', 'Na Ngoi', '17', 'Xã', 'KV1'),
('1575', 'Mỹ Lý', '17', 'Xã', 'KV1'),
('1576', 'Bắc Lý', '17', 'Xã', 'KV1'),
('1577', 'Keng Đu', '17', 'Xã', 'KV1'),
('1578', 'Huồi Tụ', '17', 'Xã', 'KV1'),
('1579', 'Mường Lống', '17', 'Xã', 'KV1'),
('1580', 'Vạn An', '17', 'Xã', 'KV1'),
('1581', 'Nam Đàn', '17', 'Xã', 'KV1'),
('1582', 'Đại Huệ', '17', 'Xã', 'KV1'),
('1583', 'Thiên Nhẫn', '17', 'Xã', 'KV1'),
('1584', 'Kim Liên', '17', 'Xã', 'KV1'),
('1585', 'Nghĩa Đàn', '17', 'Xã', 'KV1'),
('1586', 'Nghĩa Thọ', '17', 'Xã', 'KV1'),
('1587', 'Nghĩa Lâm', '17', 'Xã', 'KV1'),
('1588', 'Nghĩa Mai', '17', 'Xã', 'KV1'),
('1589', 'Nghĩa Hưng', '17', 'Xã', 'KV1'),
('1590', 'Nghĩa Khánh', '17', 'Xã', 'KV1'),
('1591', 'Nghĩa Lộc', '17', 'Xã', 'KV1'),
('1592', 'Nghi Lộc', '17', 'Xã', 'KV1'),
('1593', 'Phúc Lộc', '17', 'Xã', 'KV1'),
('1594', 'Đông Lộc', '17', 'Xã', 'KV1'),
('1595', 'Trung Lộc', '17', 'Xã', 'KV1'),
('1596', 'Thần Lĩnh', '17', 'Xã', 'KV1'),
('1597', 'Hải Lộc', '17', 'Xã', 'KV1'),
('1598', 'Văn Kiều', '17', 'Xã', 'KV1'),
('1599', 'Quế Phong', '17', 'Xã', 'KV1'),
('1600', 'Tiền Phong', '17', 'Xã', 'KV1'),
('1601', 'Tri Lễ', '17', 'Xã', 'KV1'),
('1602', 'Mường Quàng', '17', 'Xã', 'KV1'),
('1603', 'Thông Thụ', '17', 'Xã', 'KV1'),
('1604', 'Quỳ Châu', '17', 'Xã', 'KV1'),
('1605', 'Châu Tiến', '17', 'Xã', 'KV1'),
('1606', 'Hùng Chân', '17', 'Xã', 'KV1'),
('1607', 'Châu Bình', '17', 'Xã', 'KV1'),
('1608', 'Quỳ Hợp', '17', 'Xã', 'KV1'),
('1609', 'Tam Hợp', '17', 'Xã', 'KV1'),
('1610', 'Châu Lộc', '17', 'Xã', 'KV1'),
('1611', 'Châu Hồng', '17', 'Xã', 'KV1'),
('1612', 'Mường Ham', '17', 'Xã', 'KV1'),
('1613', 'Mường Chọng', '17', 'Xã', 'KV1'),
('1614', 'Minh Hợp', '17', 'Xã', 'KV1'),
('1615', 'Quỳnh Lưu', '17', 'Xã', 'KV1'),
('1616', 'Quỳnh Văn', '17', 'Xã', 'KV1'),
('1617', 'Quỳnh Anh', '17', 'Xã', 'KV1'),
('1618', 'Quỳnh Tam', '17', 'Xã', 'KV1'),
('1619', 'Quỳnh Phú', '17', 'Xã', 'KV1'),
('1620', 'Quỳnh Sơn', '17', 'Xã', 'KV1'),
('1621', 'Quỳnh Thắng', '17', 'Xã', 'KV1'),
('1622', 'Tân Kỳ', '17', 'Xã', 'KV1'),
('1623', 'Tân Phú', '17', 'Xã', 'KV1'),
('1624', 'Tân An', '17', 'Xã', 'KV1'),
('1625', 'Nghĩa Đồng', '17', 'Xã', 'KV1'),
('1626', 'Giai Xuân', '17', 'Xã', 'KV1'),
('1627', 'Nghĩa Hành', '17', 'Xã', 'KV1'),
('1628', 'Tiên Đồng', '17', 'Xã', 'KV1'),
('1629', 'Thái Hoà', '17', 'Phường', 'KV1'),
('1630', 'Tây Hiếu', '17', 'Phường', 'KV1'),
('1631', 'Đông Hiếu', '17', 'Xã', 'KV1'),
('1632', 'Cát Ngạn', '17', 'Xã', 'KV1'),
('1633', 'Tam Đồng', '17', 'Xã', 'KV1'),
('1634', 'Hạnh Lâm', '17', 'Xã', 'KV1'),
('1635', 'Sơn Lâm', '17', 'Xã', 'KV1'),
('1636', 'Hoa Quân', '17', 'Xã', 'KV1'),
('1637', 'Kim Bảng', '17', 'Xã', 'KV1'),
('1638', 'Bích Hào', '17', 'Xã', 'KV1'),
('1639', 'Đại Đồng', '17', 'Xã', 'KV1'),
('1640', 'Xuân Lâm', '17', 'Xã', 'KV1'),
('1641', 'Tam Quang', '17', 'Xã', 'KV1'),
('1642', 'Tam Thái', '17', 'Xã', 'KV1'),
('1643', 'Tương Dương', '17', 'Xã', 'KV1'),
('1644', 'Lượng Minh', '17', 'Xã', 'KV1'),
('1645', 'Yên Na', '17', 'Xã', 'KV1'),
('1646', 'Yên Hoà', '17', 'Xã', 'KV1'),
('1647', 'Nga My', '17', 'Xã', 'KV1'),
('1648', 'Hữu Khuông', '17', 'Xã', 'KV1'),
('1649', 'Nhôn Mai', '17', 'Xã', 'KV1'),
('1650', 'Trường Vinh', '17', 'Phường', 'KV1'),
('1651', 'Thành Vinh', '17', 'Phường', 'KV1'),
('1652', 'Vinh Hưng', '17', 'Phường', 'KV1'),
('1653', 'Vinh Phú', '17', 'Phường', 'KV1'),
('1654', 'Vinh Lộc', '17', 'Phường', 'KV1'),
('1655', 'Cửa Lò', '17', 'Phường', 'KV1'),
('1656', 'Yên Thành', '17', 'Xã', 'KV1'),
('1657', 'Quan Thành', '17', 'Xã', 'KV1'),
('1658', 'Hợp Minh', '17', 'Xã', 'KV1'),
('1659', 'Vân Tụ', '17', 'Xã', 'KV1'),
('1660', 'Vân Du', '17', 'Xã', 'KV1'),
('1661', 'Quang Đồng', '17', 'Xã', 'KV1'),
('1662', 'Giai Lạc', '17', 'Xã', 'KV1'),
('1663', 'Bình Minh', '17', 'Xã', 'KV1'),
('1664', 'Đông Thành', '17', 'Xã', 'KV1'),
('1665', 'Sông Trí', '18', 'Phường', 'KV1'),
('1666', 'Hải Ninh', '18', 'Phường', 'KV1'),
('1667', 'Hoành Sơn', '18', 'Phường', 'KV1'),
('1668', 'Vũng Áng', '18', 'Phường', 'KV1'),
('1669', 'Kỳ Xuân', '18', 'Xã', 'KV1'),
('1670', 'Kỳ Anh', '18', 'Xã', 'KV1'),
('1671', 'Kỳ Hoa', '18', 'Xã', 'KV1'),
('1672', 'Kỳ Văn', '18', 'Xã', 'KV1'),
('1673', 'Kỳ Khang', '18', 'Xã', 'KV1'),
('1674', 'Kỳ Lạc', '18', 'Xã', 'KV1'),
('1675', 'Kỳ Thượng', '18', 'Xã', 'KV1'),
('1676', 'Cẩm Xuyên', '18', 'Xã', 'KV1'),
('1677', 'Thiên Cầm', '18', 'Xã', 'KV1'),
('1678', 'Cẩm Duệ', '18', 'Xã', 'KV1'),
('1679', 'Cẩm Hưng', '18', 'Xã', 'KV1'),
('1680', 'Cẩm Lạc', '18', 'Xã', 'KV1'),
('1681', 'Cẩm Trung', '18', 'Xã', 'KV1'),
('1682', 'Yên Hoà', '18', 'Xã', 'KV1'),
('1683', 'Thành Sen', '18', 'Phường', 'KV1'),
('1684', 'Trần Phú', '18', 'Phường', 'KV1'),
('1685', 'Hà Huy Tập', '18', 'Phường', 'KV1'),
('1686', 'Thạch Lạc', '18', 'Xã', 'KV1'),
('1687', 'Đồng Tiến', '18', 'Xã', 'KV1'),
('1688', 'Thạch Khê', '18', 'Xã', 'KV1'),
('1689', 'Cẩm Bình', '18', 'Xã', 'KV1'),
('1690', 'Thạch Hà', '18', 'Xã', 'KV1'),
('1691', 'Toàn Lưu', '18', 'Xã', 'KV1'),
('1692', 'Việt Xuyên', '18', 'Xã', 'KV1'),
('1693', 'Đông Kinh', '18', 'Xã', 'KV1'),
('1694', 'Thạch Xuân', '18', 'Xã', 'KV1'),
('1695', 'Lộc Hà', '18', 'Xã', 'KV1'),
('1696', 'Hồng Lộc', '18', 'Xã', 'KV1'),
('1697', 'Mai Phụ', '18', 'Xã', 'KV1'),
('1698', 'Can Lộc', '18', 'Xã', 'KV1'),
('1699', 'Tùng Lộc', '18', 'Xã', 'KV1'),
('1700', 'Gia Hanh', '18', 'Xã', 'KV1'),
('1701', 'Trường Lưu', '18', 'Xã', 'KV1'),
('1702', 'Xuân Lộc', '18', 'Xã', 'KV1'),
('1703', 'Đồng Lộc', '18', 'Xã', 'KV1'),
('1704', 'Bắc Hồng Lĩnh', '18', 'Phường', 'KV1'),
('1705', 'Nam Hồng Lĩnh', '18', 'Phường', 'KV1'),
('1706', 'Tiên Điền', '18', 'Xã', 'KV1'),
('1707', 'Nghi Xuân', '18', 'Xã', 'KV1'),
('1708', 'Cổ Đạm', '18', 'Xã', 'KV1'),
('1709', 'Đan Hải', '18', 'Xã', 'KV1'),
('1710', 'Đức Thọ', '18', 'Xã', 'KV1'),
('1711', 'Đức Quang', '18', 'Xã', 'KV1'),
('1712', 'Đức Đồng', '18', 'Xã', 'KV1'),
('1713', 'Đức Thịnh', '18', 'Xã', 'KV1'),
('1714', 'Đức Minh', '18', 'Xã', 'KV1'),
('1715', 'Hương Sơn', '18', 'Xã', 'KV1'),
('1716', 'Sơn Tây', '18', 'Xã', 'KV1'),
('1717', 'Tứ Mỹ', '18', 'Xã', 'KV1'),
('1718', 'Sơn Giang', '18', 'Xã', 'KV1'),
('1719', 'Sơn Tiến', '18', 'Xã', 'KV1'),
('1720', 'Sơn Hồng', '18', 'Xã', 'KV1'),
('1721', 'Kim Hoa', '18', 'Xã', 'KV1'),
('1722', 'Vũ Quang', '18', 'Xã', 'KV1'),
('1723', 'Mai Hoa', '18', 'Xã', 'KV1'),
('1724', 'Thượng Đức', '18', 'Xã', 'KV1'),
('1725', 'Hương Khê', '18', 'Xã', 'KV1'),
('1726', 'Hương Phố', '18', 'Xã', 'KV1'),
('1727', 'Hương Đô', '18', 'Xã', 'KV1'),
('1728', 'Hà Linh', '18', 'Xã', 'KV1'),
('1729', 'Hương Bình', '18', 'Xã', 'KV1'),
('1730', 'Phúc Trạch', '18', 'Xã', 'KV1'),
('1731', 'Hương Xuân', '18', 'Xã', 'KV1'),
('1732', 'Sơn Kim 1', '18', 'Xã', 'KV1'),
('1733', 'Sơn Kim 2', '18', 'Xã', 'KV1'),
('1734', 'Đồng Hới', '19', 'Phường', 'KV1'),
('1735', 'Đồng Thuận', '19', 'Phường', 'KV1'),
('1736', 'Đồng Sơn', '19', 'Phường', 'KV1'),
('1737', 'Nam Gianh', '19', 'Xã', 'KV1'),
('1738', 'Nam Ba Đồn', '19', 'Xã', 'KV1'),
('1739', 'Ba Đồn', '19', 'Phường', 'KV1'),
('1740', 'Bắc Gianh', '19', 'Phường', 'KV1'),
('1741', 'Dân Hóa', '19', 'Xã', 'KV1'),
('1742', 'Kim Điền', '19', 'Xã', 'KV1'),
('1743', 'Kim Phú', '19', 'Xã', 'KV1'),
('1744', 'Minh Hóa', '19', 'Xã', 'KV1'),
('1745', 'Tân Thành', '19', 'Xã', 'KV1'),
('1746', 'Tuyên Lâm', '19', 'Xã', 'KV1'),
('1747', 'Tuyên Sơn', '19', 'Xã', 'KV1'),
('1748', 'Đồng Lê', '19', 'Xã', 'KV1'),
('1749', 'Tuyên Phú', '19', 'Xã', 'KV1'),
('1750', 'Tuyên Bình', '19', 'Xã', 'KV1'),
('1751', 'Tuyên Hóa', '19', 'Xã', 'KV1'),
('1752', 'Tân Gianh', '19', 'Xã', 'KV1'),
('1753', 'Trung Thuần', '19', 'Xã', 'KV1'),
('1754', 'Quảng Trạch', '19', 'Xã', 'KV1'),
('1755', 'Hoà Trạch', '19', 'Xã', 'KV1'),
('1756', 'Phú Trạch', '19', 'Xã', 'KV1'),
('1757', 'Thượng Trạch', '19', 'Xã', 'KV1'),
('1758', 'Phong Nha', '19', 'Xã', 'KV1'),
('1759', 'Bắc Trạch', '19', 'Xã', 'KV1'),
('1760', 'Đông Trạch', '19', 'Xã', 'KV1'),
('1761', 'Hoàn Lão', '19', 'Xã', 'KV1'),
('1762', 'Bố Trạch', '19', 'Xã', 'KV1'),
('1763', 'Nam Trạch', '19', 'Xã', 'KV1'),
('1764', 'Quảng Ninh', '19', 'Xã', 'KV1'),
('1765', 'Ninh Châu', '19', 'Xã', 'KV1'),
('1766', 'Trường Ninh', '19', 'Xã', 'KV1'),
('1767', 'Trường Sơn', '19', 'Xã', 'KV1'),
('1768', 'Lệ Thủy', '19', 'Xã', 'KV1'),
('1769', 'Cam Hồng', '19', 'Xã', 'KV1'),
('1770', 'Sen Ngư', '19', 'Xã', 'KV1'),
('1771', 'Tân Mỹ', '19', 'Xã', 'KV1'),
('1772', 'Trường Phú', '19', 'Xã', 'KV1'),
('1773', 'Lệ Ninh', '19', 'Xã', 'KV1'),
('1774', 'Kim Ngân', '19', 'Xã', 'KV1'),
('1775', 'Đông Hà', '19', 'Phường', 'KV1'),
('1776', 'Nam Đông Hà', '19', 'Phường', 'KV1'),
('1777', 'Quảng Trị', '19', 'Phường', 'KV1'),
('1778', 'Vĩnh Linh', '19', 'Xã', 'KV1'),
('1779', 'Cửa Tùng', '19', 'Xã', 'KV1'),
('1780', 'Vĩnh Hoàng', '19', 'Xã', 'KV1'),
('1781', 'Vĩnh Thủy', '19', 'Xã', 'KV1'),
('1782', 'Bến Quan', '19', 'Xã', 'KV1'),
('1783', 'Cồn Tiên', '19', 'Xã', 'KV1'),
('1784', 'Cửa Việt', '19', 'Xã', 'KV1'),
('1785', 'Gio Linh', '19', 'Xã', 'KV1'),
('1786', 'Bến Hải', '19', 'Xã', 'KV1'),
('1787', 'Hướng Lập', '19', 'Xã', 'KV1'),
('1788', 'Hướng Phùng', '19', 'Xã', 'KV1'),
('1789', 'Khe Sanh', '19', 'Xã', 'KV1'),
('1790', 'Tân Lập', '19', 'Xã', 'KV1'),
('1791', 'Lao Bảo', '19', 'Xã', 'KV1'),
('1792', 'Lìa', '19', 'Xã', 'KV1'),
('1793', 'A Dơi', '19', 'Xã', 'KV1'),
('1794', 'La Lay', '19', 'Xã', 'KV1'),
('1795', 'Tà Rụt', '19', 'Xã', 'KV1'),
('1796', 'Đakrông', '19', 'Xã', 'KV1'),
('1797', 'Ba Lòng', '19', 'Xã', 'KV1'),
('1798', 'Hướng Hiệp', '19', 'Xã', 'KV1'),
('1799', 'Cam Lộ', '19', 'Xã', 'KV1'),
('1800', 'Hiếu Giang', '19', 'Xã', 'KV1'),
('1801', 'Triệu Phong', '19', 'Xã', 'KV1'),
('1802', 'Ái Tử', '19', 'Xã', 'KV1'),
('1803', 'Triệu Bình', '19', 'Xã', 'KV1'),
('1804', 'Triệu Cơ', '19', 'Xã', 'KV1'),
('1805', 'Nam Cửa Việt', '19', 'Xã', 'KV1'),
('1806', 'Diên Sanh', '19', 'Xã', 'KV1'),
('1807', 'Mỹ Thủy', '19', 'Xã', 'KV1'),
('1808', 'Hải Lăng', '19', 'Xã', 'KV1'),
('1809', 'Vĩnh Định', '19', 'Xã', 'KV1'),
('1810', 'Nam Hải Lăng', '19', 'Xã', 'KV1'),
('1811', 'khu Cồn Cỏ', '19', 'Xã', 'KV1'),
('1812', 'Thuận An', '20', 'Phường', 'KV1'),
('1813', 'Hóa Châu', '20', 'Phường', 'KV1'),
('1814', 'Mỹ Thượng', '20', 'Phường', 'KV1'),
('1815', 'Vỹ Dạ', '20', 'Phường', 'KV1'),
('1816', 'Thuận Hóa', '20', 'Phường', 'KV1'),
('1817', 'An Cựu', '20', 'Phường', 'KV1'),
('1818', 'Thủy Xuân', '20', 'Phường', 'KV1'),
('1819', 'Kim Long', '20', 'Phường', 'KV1'),
('1820', 'Hương An', '20', 'Phường', 'KV1'),
('1821', 'Phú Xuân', '20', 'Phường', 'KV1'),
('1822', 'Hương Trà', '20', 'Phường', 'KV1'),
('1823', 'Kim Trà', '20', 'Phường', 'KV1'),
('1824', 'Thanh Thủy', '20', 'Phường', 'KV1'),
('1825', 'Hương Thủy', '20', 'Phường', 'KV1'),
('1826', 'Phú Bài', '20', 'Phường', 'KV1'),
('1827', 'Phong Điền', '20', 'Phường', 'KV1'),
('1828', 'Phong Thái', '20', 'Phường', 'KV1'),
('1829', 'Phong Dinh', '20', 'Phường', 'KV1'),
('1830', 'Phong Phú', '20', 'Phường', 'KV1'),
('1831', 'Phong Quảng', '20', 'Phường', 'KV1'),
('1832', 'Đan Điền', '20', 'Xã', 'KV1'),
('1833', 'Quảng Điền', '20', 'Xã', 'KV1'),
('1834', 'Phú Vinh', '20', 'Xã', 'KV1'),
('1835', 'Phú Hồ', '20', 'Xã', 'KV1'),
('1836', 'Phú Vang', '20', 'Xã', 'KV1'),
('1837', 'Vinh Lộc', '20', 'Xã', 'KV1'),
('1838', 'Hưng Lộc', '20', 'Xã', 'KV1'),
('1839', 'Lộc An', '20', 'Xã', 'KV1'),
('1840', 'Phú Lộc', '20', 'Xã', 'KV1'),
('1841', 'Chân Mây – Lăng Cô', '20', 'Xã', 'KV1'),
('1842', 'Long Quảng', '20', 'Xã', 'KV1'),
('1843', 'Nam Đông', '20', 'Xã', 'KV1'),
('1844', 'Khe Tre', '20', 'Xã', 'KV1'),
('1845', 'Bình Điền', '20', 'Xã', 'KV1'),
('1846', 'A Lưới 1', '20', 'Xã', 'KV1'),
('1847', 'A Lưới 2', '20', 'Xã', 'KV1'),
('1848', 'A Lưới 3', '20', 'Xã', 'KV1'),
('1849', 'A Lưới 4', '20', 'Xã', 'KV1'),
('1850', 'A Lưới 5', '20', 'Xã', 'KV1'),
('1851', 'Dương Nỗ', '20', 'Phường', 'KV1'),
('1852', 'Hải Châu', '21', 'Phường', 'KV1'),
('1853', 'Hoà Cường', '21', 'Phường', 'KV1'),
('1854', 'Thanh Khê', '21', 'Phường', 'KV1'),
('1855', 'An Khê', '21', 'Phường', 'KV1'),
('1856', 'An Hải', '21', 'Phường', 'KV1'),
('1857', 'Sơn Trà', '21', 'Phường', 'KV1'),
('1858', 'Ngũ Hành Sơn', '21', 'Phường', 'KV1'),
('1859', 'Hoà Khánh', '21', 'Phường', 'KV1'),
('1860', 'Hải Vân', '21', 'Phường', 'KV1'),
('1861', 'Liên Chiểu', '21', 'Phường', 'KV1'),
('1862', 'Cẩm Lệ', '21', 'Phường', 'KV1'),
('1863', 'Hoà Xuân', '21', 'Phường', 'KV1'),
('1864', 'Hoà Vang', '21', 'Xã', 'KV1'),
('1865', 'Hoà Tiến', '21', 'Xã', 'KV1'),
('1866', 'Bà Nà', '21', 'Xã', 'KV1'),
('1867', 'khu Hoàng Sa', '21', 'Xã', 'KV1'),
('1868', 'Núi Thành', '21', 'Xã', 'KV1'),
('1869', 'Tam Mỹ', '21', 'Xã', 'KV1'),
('1870', 'Tam Anh', '21', 'Xã', 'KV1'),
('1871', 'Đức Phú', '21', 'Xã', 'KV1'),
('1872', 'Tam Xuân', '21', 'Xã', 'KV1'),
('1873', 'Tam Hải', '21', 'Xã', 'KV1'),
('1874', 'Tam Kỳ', '21', 'Phường', 'KV1'),
('1875', 'Quảng Phú', '21', 'Phường', 'KV1'),
('1876', 'Hương Trà', '21', 'Phường', 'KV1'),
('1877', 'Bàn Thạch', '21', 'Phường', 'KV1'),
('1878', 'Tây Hồ', '21', 'Xã', 'KV1'),
('1879', 'Chiên Đàn', '21', 'Xã', 'KV1'),
('1880', 'Phú Ninh', '21', 'Xã', 'KV1'),
('1881', 'Lãnh Ngọc', '21', 'Xã', 'KV1'),
('1882', 'Tiên Phước', '21', 'Xã', 'KV1'),
('1883', 'Thạnh Bình', '21', 'Xã', 'KV1'),
('1884', 'Sơn Cẩm Hà', '21', 'Xã', 'KV1'),
('1885', 'Trà Liên', '21', 'Xã', 'KV1'),
('1886', 'Trà Giáp', '21', 'Xã', 'KV1'),
('1887', 'Trà Tân', '21', 'Xã', 'KV1'),
('1888', 'Trà Đốc', '21', 'Xã', 'KV1'),
('1889', 'Trà My', '21', 'Xã', 'KV1'),
('1890', 'Nam Trà My', '21', 'Xã', 'KV1'),
('1891', 'Trà Tập', '21', 'Xã', 'KV1'),
('1892', 'Trà Vân', '21', 'Xã', 'KV1'),
('1893', 'Trà Linh', '21', 'Xã', 'KV1'),
('1894', 'Trà Leng', '21', 'Xã', 'KV1'),
('1895', 'Thăng Bình', '21', 'Xã', 'KV1'),
('1896', 'Thăng An', '21', 'Xã', 'KV1'),
('1897', 'Thăng Trường', '21', 'Xã', 'KV1'),
('1898', 'Thăng Điền', '21', 'Xã', 'KV1'),
('1899', 'Thăng Phú', '21', 'Xã', 'KV1'),
('1900', 'Đồng Dương', '21', 'Xã', 'KV1'),
('1901', 'Quế Sơn Trung', '21', 'Xã', 'KV1'),
('1902', 'Quế Sơn', '21', 'Xã', 'KV1'),
('1903', 'Xuân Phú', '21', 'Xã', 'KV1'),
('1904', 'Nông Sơn', '21', 'Xã', 'KV1'),
('1905', 'Quế Phước', '21', 'Xã', 'KV1'),
('1906', 'Duy Nghĩa', '21', 'Xã', 'KV1'),
('1907', 'Nam Phước', '21', 'Xã', 'KV1'),
('1908', 'Duy Xuyên', '21', 'Xã', 'KV1'),
('1909', 'Thu Bồn', '21', 'Xã', 'KV1'),
('1910', 'Điện Bàn', '21', 'Phường', 'KV1'),
('1911', 'Điện Bàn Đông', '21', 'Phường', 'KV1'),
('1912', 'An Thắng', '21', 'Phường', 'KV1'),
('1913', 'Điện Bàn Bắc', '21', 'Phường', 'KV1'),
('1914', 'Điện Bàn Tây', '21', 'Xã', 'KV1'),
('1915', 'Gò Nổi', '21', 'Xã', 'KV1'),
('1916', 'Hội An', '21', 'Phường', 'KV1'),
('1917', 'Hội An Đông', '21', 'Phường', 'KV1'),
('1918', 'Hội An Tây', '21', 'Phường', 'KV1'),
('1919', 'Tân Hiệp', '21', 'Xã', 'KV1'),
('1920', 'Đại Lộc', '21', 'Xã', 'KV1'),
('1921', 'Hà Nha', '21', 'Xã', 'KV1'),
('1922', 'Thượng Đức', '21', 'Xã', 'KV1'),
('1923', 'Vu Gia', '21', 'Xã', 'KV1'),
('1924', 'Phú Thuận', '21', 'Xã', 'KV1'),
('1925', 'Thạnh Mỹ', '21', 'Xã', 'KV1'),
('1926', 'Bến Giằng', '21', 'Xã', 'KV1'),
('1927', 'Nam Giang', '21', 'Xã', 'KV1'),
('1928', 'Đắc Pring', '21', 'Xã', 'KV1'),
('1929', 'La Dêê', '21', 'Xã', 'KV1'),
('1930', 'La Êê', '21', 'Xã', 'KV1'),
('1931', 'Sông Vàng', '21', 'Xã', 'KV1'),
('1932', 'Sông Kôn', '21', 'Xã', 'KV1'),
('1933', 'Đông Giang', '21', 'Xã', 'KV1'),
('1934', 'Bến Hiên', '21', 'Xã', 'KV1'),
('1935', 'Avương', '21', 'Xã', 'KV1'),
('1936', 'Tây Giang', '21', 'Xã', 'KV1'),
('1937', 'Hùng Sơn', '21', 'Xã', 'KV1'),
('1938', 'Hiệp Đức', '21', 'Xã', 'KV1'),
('1939', 'Việt An', '21', 'Xã', 'KV1'),
('1940', 'Phước Trà', '21', 'Xã', 'KV1'),
('1941', 'Khâm Đức', '21', 'Xã', 'KV1'),
('1942', 'Phước Năng', '21', 'Xã', 'KV1'),
('1943', 'Phước Chánh', '21', 'Xã', 'KV1'),
('1944', 'Phước Thành', '21', 'Xã', 'KV1'),
('1945', 'Phước Hiệp', '21', 'Xã', 'KV1'),
('1946', 'Tịnh Khê', '22', 'Xã', 'KV1'),
('1947', 'Trương Quang Trọng', '22', 'Phường', 'KV1'),
('1948', 'An Phú', '22', 'Xã', 'KV1'),
('1949', 'Cẩm Thành', '22', 'Phường', 'KV1'),
('1950', 'Nghĩa Lộ', '22', 'Phường', 'KV1'),
('1951', 'Trà Câu', '22', 'Phường', 'KV1'),
('1952', 'Nguyễn Nghiêm', '22', 'Xã', 'KV1'),
('1953', 'Đức Phổ', '22', 'Phường', 'KV1'),
('1954', 'Khánh Cường', '22', 'Xã', 'KV1'),
('1955', 'Sa Huỳnh', '22', 'Phường', 'KV1'),
('1956', 'Bình Minh', '22', 'Xã', 'KV1'),
('1957', 'Bình Chương', '22', 'Xã', 'KV1'),
('1958', 'Bình Sơn', '22', 'Xã', 'KV1'),
('1959', 'Vạn Tường', '22', 'Xã', 'KV1'),
('1960', 'Đông Sơn', '22', 'Xã', 'KV1'),
('1961', 'Trường Giang', '22', 'Xã', 'KV1'),
('1962', 'Ba Gia', '22', 'Xã', 'KV1'),
('1963', 'Sơn Tịnh', '22', 'Xã', 'KV1'),
('1964', 'Thọ Phong', '22', 'Xã', 'KV1'),
('1965', 'Tư Nghĩa', '22', 'Xã', 'KV1'),
('1966', 'Vệ Giang', '22', 'Xã', 'KV1'),
('1967', 'Nghĩa Giang', '22', 'Xã', 'KV1'),
('1968', 'Trà Giang', '22', 'Xã', 'KV1'),
('1969', 'Nghĩa Hành', '22', 'Xã', 'KV1'),
('1970', 'Đình Cương', '22', 'Xã', 'KV1'),
('1971', 'Thiện Tín', '22', 'Xã', 'KV1'),
('1972', 'Phước Giang', '22', 'Xã', 'KV1'),
('1973', 'Long Phụng', '22', 'Xã', 'KV1'),
('1974', 'Mỏ Cày', '22', 'Xã', 'KV1'),
('1975', 'Mộ Đức', '22', 'Xã', 'KV1'),
('1976', 'Lân Phong', '22', 'Xã', 'KV1'),
('1977', 'Trà Bồng', '22', 'Xã', 'KV1'),
('1978', 'Đông Trà Bồng', '22', 'Xã', 'KV1'),
('1979', 'Tây Trà', '22', 'Xã', 'KV1'),
('1980', 'Thanh Bồng', '22', 'Xã', 'KV1'),
('1981', 'Cà Đam', '22', 'Xã', 'KV1'),
('1982', 'Tây Trà Bồng', '22', 'Xã', 'KV1'),
('1983', 'Sơn Hạ', '22', 'Xã', 'KV1'),
('1984', 'Sơn Linh', '22', 'Xã', 'KV1'),
('1985', 'Sơn Hà', '22', 'Xã', 'KV1'),
('1986', 'Sơn Thủy', '22', 'Xã', 'KV1'),
('1987', 'Sơn Kỳ', '22', 'Xã', 'KV1'),
('1988', 'Sơn Tây', '22', 'Xã', 'KV1'),
('1989', 'Sơn Tây Thượng', '22', 'Xã', 'KV1'),
('1990', 'Sơn Tây Hạ', '22', 'Xã', 'KV1'),
('1991', 'Minh Long', '22', 'Xã', 'KV1'),
('1992', 'Sơn Mai', '22', 'Xã', 'KV1'),
('1993', 'Ba Vì', '22', 'Xã', 'KV1'),
('1994', 'Ba Tô', '22', 'Xã', 'KV1'),
('1995', 'Ba Dinh', '22', 'Xã', 'KV1'),
('1996', 'Ba Tơ', '22', 'Xã', 'KV1'),
('1997', 'Ba Vinh', '22', 'Xã', 'KV1'),
('1998', 'Ba Động', '22', 'Xã', 'KV1'),
('1999', 'Đặng Thùy Trâm', '22', 'Xã', 'KV1'),
('2000', 'Ba Xa', '22', 'Xã', 'KV1'),
('2001', 'khu Lý Sơn', '22', 'Xã', 'KV1'),
('2002', 'Kon Tum', '22', 'Phường', 'KV1'),
('2003', 'Đăk Cấm', '22', 'Phường', 'KV1'),
('2004', 'Đăk BLa', '22', 'Phường', 'KV1'),
('2005', 'Ngọk Bay', '22', 'Xã', 'KV1'),
('2006', 'Ia Chim', '22', 'Xã', 'KV1'),
('2007', 'Đăk Rơ Wa', '22', 'Xã', 'KV1'),
('2008', 'Đăk Pxi', '22', 'Xã', 'KV1'),
('2009', 'Đăk Mar', '22', 'Xã', 'KV1'),
('2010', 'Đăk Ui', '22', 'Xã', 'KV1'),
('2011', 'Ngọk Réo', '22', 'Xã', 'KV1'),
('2012', 'Đăk Hà', '22', 'Xã', 'KV1'),
('2013', 'Ngọk Tụ', '22', 'Xã', 'KV1'),
('2014', 'Đăk Tô', '22', 'Xã', 'KV1'),
('2015', 'Kon Đào', '22', 'Xã', 'KV1'),
('2016', 'Đăk Sao', '22', 'Xã', 'KV1'),
('2017', 'Đăk Tờ Kan', '22', 'Xã', 'KV1'),
('2018', 'Tu Mơ Rông', '22', 'Xã', 'KV1'),
('2019', 'Măng Ri', '22', 'Xã', 'KV1'),
('2020', 'Bờ Y', '22', 'Xã', 'KV1'),
('2021', 'Sa Loong', '22', 'Xã', 'KV1'),
('2022', 'Dục Nông', '22', 'Xã', 'KV1'),
('2023', 'Xốp', '22', 'Xã', 'KV1'),
('2024', 'Ngọc Linh', '22', 'Xã', 'KV1'),
('2025', 'Đăk Plô', '22', 'Xã', 'KV1'),
('2026', 'Đăk Pék', '22', 'Xã', 'KV1'),
('2027', 'Đăk Môn', '22', 'Xã', 'KV1'),
('2028', 'Sa Thầy', '22', 'Xã', 'KV1'),
('2029', 'Sa Bình', '22', 'Xã', 'KV1'),
('2030', 'Ya Ly', '22', 'Xã', 'KV1'),
('2031', 'Ia Tơi', '22', 'Xã', 'KV1'),
('2032', 'Đăk Kôi', '22', 'Xã', 'KV1'),
('2033', 'Kon Braih', '22', 'Xã', 'KV1'),
('2034', 'Đăk Rve', '22', 'Xã', 'KV1'),
('2035', 'Măng Đen', '22', 'Xã', 'KV1'),
('2036', 'Măng Bút', '22', 'Xã', 'KV1'),
('2037', 'Kon Plông', '22', 'Xã', 'KV1'),
('2038', 'Đăk Long', '22', 'Xã', 'KV1'),
('2039', 'Rờ Kơi', '22', 'Xã', 'KV1'),
('2040', 'Mô Rai', '22', 'Xã', 'KV1'),
('2041', 'Ia Đal', '22', 'Xã', 'KV1'),
('2042', 'Nha Trang', '23', 'Phường', 'KV1'),
('2043', 'Bắc Nha Trang', '23', 'Phường', 'KV1'),
('2044', 'Tây Nha Trang', '23', 'Phường', 'KV1'),
('2045', 'Nam Nha Trang', '23', 'Phường', 'KV1'),
('2046', 'Bắc Cam Ranh', '23', 'Phường', 'KV1'),
('2047', 'Cam Ranh', '23', 'Phường', 'KV1'),
('2048', 'Cam Linh', '23', 'Phường', 'KV1'),
('2049', 'Ba Ngòi', '23', 'Phường', 'KV1'),
('2050', 'Nam Cam Ranh', '23', 'Xã', 'KV1'),
('2051', 'Bắc Ninh Hoà', '23', 'Xã', 'KV1'),
('2052', 'Ninh Hoà', '23', 'Phường', 'KV1'),
('2053', 'Tân Định', '23', 'Xã', 'KV1'),
('2054', 'Đông Ninh Hoà', '23', 'Phường', 'KV1'),
('2055', 'Hoà Thắng', '23', 'Phường', 'KV1'),
('2056', 'Nam Ninh Hoà', '23', 'Xã', 'KV1'),
('2057', 'Tây Ninh Hoà', '23', 'Xã', 'KV1'),
('2058', 'Hoà Trí', '23', 'Xã', 'KV1'),
('2059', 'Đại Lãnh', '23', 'Xã', 'KV1'),
('2060', 'Tu Bông', '23', 'Xã', 'KV1'),
('2061', 'Vạn Thắng', '23', 'Xã', 'KV1'),
('2062', 'Vạn Ninh', '23', 'Xã', 'KV1'),
('2063', 'Vạn Hưng', '23', 'Xã', 'KV1'),
('2064', 'Diên Khánh', '23', 'Xã', 'KV1'),
('2065', 'Diên Lạc', '23', 'Xã', 'KV1'),
('2066', 'Diên Điền', '23', 'Xã', 'KV1'),
('2067', 'Diên Lâm', '23', 'Xã', 'KV1'),
('2068', 'Diên Thọ', '23', 'Xã', 'KV1'),
('2069', 'Suối Hiệp', '23', 'Xã', 'KV1'),
('2070', 'Cam Lâm', '23', 'Xã', 'KV1'),
('2071', 'Suối Dầu', '23', 'Xã', 'KV1'),
('2072', 'Cam Hiệp', '23', 'Xã', 'KV1'),
('2073', 'Cam An', '23', 'Xã', 'KV1'),
('2074', 'Bắc Khánh Vĩnh', '23', 'Xã', 'KV1'),
('2075', 'Trung Khánh Vĩnh', '23', 'Xã', 'KV1'),
('2076', 'Tây Khánh Vĩnh', '23', 'Xã', 'KV1'),
('2077', 'Nam Khánh Vĩnh', '23', 'Xã', 'KV1'),
('2078', 'Khánh Vĩnh', '23', 'Xã', 'KV1'),
('2079', 'Khánh Sơn', '23', 'Xã', 'KV1'),
('2080', 'Tây Khánh Sơn', '23', 'Xã', 'KV1'),
('2081', 'Đông Khánh Sơn', '23', 'Xã', 'KV1'),
('2082', 'khu Trường Sa', '23', 'Xã', 'KV1'),
('2083', 'Phan Rang', '23', 'Phường', 'KV1'),
('2084', 'Đông Hải', '23', 'Phường', 'KV1'),
('2085', 'Ninh Chử', '23', 'Phường', 'KV1'),
('2086', 'Bảo An', '23', 'Phường', 'KV1'),
('2087', 'Đô Vinh', '23', 'Phường', 'KV1'),
('2088', 'Ninh Phước', '23', 'Xã', 'KV1'),
('2089', 'Phước Hữu', '23', 'Xã', 'KV1'),
('2090', 'Phước Hậu', '23', 'Xã', 'KV1'),
('2091', 'Thuận Nam', '23', 'Xã', 'KV1'),
('2092', 'Cà Ná', '23', 'Xã', 'KV1'),
('2093', 'Phước Hà', '23', 'Xã', 'KV1'),
('2094', 'Phước Dinh', '23', 'Xã', 'KV1'),
('2095', 'Ninh Hải', '23', 'Xã', 'KV1'),
('2096', 'Xuân Hải', '23', 'Xã', 'KV1'),
('2097', 'Vĩnh Hải', '23', 'Xã', 'KV1'),
('2098', 'Thuận Bắc', '23', 'Xã', 'KV1'),
('2099', 'Công Hải', '23', 'Xã', 'KV1'),
('2100', 'Ninh Sơn', '23', 'Xã', 'KV1'),
('2101', 'Lâm Sơn', '23', 'Xã', 'KV1'),
('2102', 'Anh Dũng', '23', 'Xã', 'KV1'),
('2103', 'Mỹ Sơn', '23', 'Xã', 'KV1'),
('2104', 'Bác Ái Đông', '23', 'Xã', 'KV1'),
('2105', 'Bác Ái', '23', 'Xã', 'KV1'),
('2106', 'Bác Ái Tây', '23', 'Xã', 'KV1'),
('2107', 'Quy Nhơn', '24', 'Phường', 'KV3'),
('2108', 'Quy Nhơn Đông', '24', 'Phường', 'KV3'),
('2109', 'Quy Nhơn Tây', '24', 'Phường', 'KV3'),
('2110', 'Quy Nhơn Nam', '24', 'Phường', 'KV3'),
('2111', 'Quy Nhơn Bắc', '24', 'Phường', 'KV3'),
('2112', 'Bình Định', '24', 'Phường', 'KV3'),
('2113', 'An Nhơn', '24', 'Phường', 'KV3'),
('2114', 'An Nhơn Đông', '24', 'Phường', 'KV3'),
('2115', 'An Nhơn Nam', '24', 'Phường', 'KV3'),
('2116', 'An Nhơn Bắc', '24', 'Phường', 'KV3'),
('2117', 'An Nhơn Tây', '24', 'Xã', 'KV3'),
('2118', 'Bồng Sơn', '24', 'Phường', 'KV3'),
('2119', 'Hoài Nhơn', '24', 'Phường', 'KV3'),
('2120', 'Tam Quan', '24', 'Phường', 'KV3'),
('2121', 'Hoài Nhơn Đông', '24', 'Phường', 'KV3'),
('2122', 'Hoài Nhơn Tây', '24', 'Phường', 'KV3'),
('2123', 'Hoài Nhơn Nam', '24', 'Phường', 'KV3'),
('2124', 'Hoài Nhơn Bắc', '24', 'Phường', 'KV3'),
('2125', 'Phù Cát', '24', 'Xã', 'KV3'),
('2126', 'Xuân An', '24', 'Xã', 'KV3'),
('2127', 'Ngô Mây', '24', 'Xã', 'KV3'),
('2128', 'Cát Tiến', '24', 'Xã', 'KV3'),
('2129', 'Đề Gi', '24', 'Xã', 'KV3'),
('2130', 'Hoà Hội', '24', 'Xã', 'KV3'),
('2131', 'Hội Sơn', '24', 'Xã', 'KV3'),
('2132', 'Phù Mỹ', '24', 'Xã', 'KV3'),
('2133', 'An Lương', '24', 'Xã', 'KV3'),
('2134', 'Bình Dương', '24', 'Xã', 'KV3'),
('2135', 'Phù Mỹ Đông', '24', 'Xã', 'KV3'),
('2136', 'Phù Mỹ Tây', '24', 'Xã', 'KV3'),
('2137', 'Phù Mỹ Nam', '24', 'Xã', 'KV3'),
('2138', 'Phù Mỹ Bắc', '24', 'Xã', 'KV3'),
('2139', 'Tuy Phước', '24', 'Xã', 'KV3'),
('2140', 'Tuy Phước Đông', '24', 'Xã', 'KV3'),
('2141', 'Tuy Phước Tây', '24', 'Xã', 'KV3'),
('2142', 'Tuy Phước Bắc', '24', 'Xã', 'KV3'),
('2143', 'Tây Sơn', '24', 'Xã', 'KV3'),
('2144', 'Bình Khê', '24', 'Xã', 'KV3'),
('2145', 'Bình Phú', '24', 'Xã', 'KV3'),
('2146', 'Bình Hiệp', '24', 'Xã', 'KV3'),
('2147', 'Bình An', '24', 'Xã', 'KV3'),
('2148', 'Hoài Ân', '24', 'Xã', 'KV3'),
('2149', 'Ân Tường', '24', 'Xã', 'KV3'),
('2150', 'Kim Sơn', '24', 'Xã', 'KV3'),
('2151', 'Vạn Đức', '24', 'Xã', 'KV3'),
('2152', 'Ân Hảo', '24', 'Xã', 'KV3'),
('2153', 'Vân Canh', '24', 'Xã', 'KV3'),
('2154', 'Canh Vinh', '24', 'Xã', 'KV3'),
('2155', 'Canh Liên', '24', 'Xã', 'KV3'),
('2156', 'Vĩnh Thạnh', '24', 'Xã', 'KV3'),
('2157', 'Vĩnh Thịnh', '24', 'Xã', 'KV3'),
('2158', 'Vĩnh Quang', '24', 'Xã', 'KV3'),
('2159', 'Vĩnh Sơn', '24', 'Xã', 'KV3'),
('2160', 'An Hoà', '24', 'Xã', 'KV3'),
('2161', 'An Lão', '24', 'Xã', 'KV3'),
('2162', 'An Vinh', '24', 'Xã', 'KV3'),
('2163', 'An Toàn', '24', 'Xã', 'KV3'),
('2164', 'Pleiku', '24', 'Phường', 'KV3'),
('2165', 'Hội Phú', '24', 'Phường', 'KV3'),
('2166', 'Thống Nhất', '24', 'Phường', 'KV3'),
('2167', 'Diên Hồng', '24', 'Phường', 'KV3'),
('2168', 'An Phú', '24', 'Phường', 'KV3'),
('2169', 'Biển Hồ', '24', 'Xã', 'KV3'),
('2170', 'Gào', '24', 'Xã', 'KV3'),
('2171', 'Ia Ly', '24', 'Xã', 'KV3'),
('2172', 'Chư Păh', '24', 'Xã', 'KV3'),
('2173', 'Ia Khươl', '24', 'Xã', 'KV3'),
('2174', 'Ia Phí', '24', 'Xã', 'KV3'),
('2175', 'Chư Prông', '24', 'Xã', 'KV3'),
('2176', 'Bàu Cạn', '24', 'Xã', 'KV3'),
('2177', 'Ia Boòng', '24', 'Xã', 'KV3'),
('2178', 'Ia Lâu', '24', 'Xã', 'KV3'),
('2179', 'Ia Pia', '24', 'Xã', 'KV3'),
('2180', 'Ia Tôr', '24', 'Xã', 'KV3'),
('2181', 'Chư Sê', '24', 'Xã', 'KV3'),
('2182', 'Bờ Ngoong', '24', 'Xã', 'KV3'),
('2183', 'Ia Ko', '24', 'Xã', 'KV3'),
('2184', 'Albá', '24', 'Xã', 'KV3'),
('2185', 'Chư Pưh', '24', 'Xã', 'KV3'),
('2186', 'Ia Le', '24', 'Xã', 'KV3'),
('2187', 'Ia Hrú', '24', 'Xã', 'KV3'),
('2188', 'An Khê', '24', 'Phường', 'KV3'),
('2189', 'An Bình', '24', 'Phường', 'KV3'),
('2190', 'Cửu An', '24', 'Xã', 'KV3'),
('2191', 'Đak Pơ', '24', 'Xã', 'KV3'),
('2192', 'Ya Hội', '24', 'Xã', 'KV3'),
('2193', 'Kbang', '24', 'Xã', 'KV3'),
('2194', 'Kông Bơ La', '24', 'Xã', 'KV3'),
('2195', 'Tơ Tung', '24', 'Xã', 'KV3'),
('2196', 'Sơn Lang', '24', 'Xã', 'KV3'),
('2197', 'Đak Rong', '24', 'Xã', 'KV3'),
('2198', 'Kông Chro', '24', 'Xã', 'KV3'),
('2199', 'Ya Ma', '24', 'Xã', 'KV3'),
('2200', 'Chư Krey', '24', 'Xã', 'KV3'),
('2201', 'SRó', '24', 'Xã', 'KV3'),
('2202', 'Đăk Song', '24', 'Xã', 'KV3'),
('2203', 'Chơ Long', '24', 'Xã', 'KV3'),
('2204', 'Ayun Pa', '24', 'Phường', 'KV3'),
('2205', 'Ia Rbol', '24', 'Xã', 'KV3'),
('2206', 'Ia Sao', '24', 'Xã', 'KV3'),
('2207', 'Phú Thiện', '24', 'Xã', 'KV3'),
('2208', 'Chư A Thai', '24', 'Xã', 'KV3'),
('2209', 'Ia Hiao', '24', 'Xã', 'KV3'),
('2210', 'Pờ Tó', '24', 'Xã', 'KV3'),
('2211', 'Ia Pa', '24', 'Xã', 'KV3'),
('2212', 'Ia Tul', '24', 'Xã', 'KV3'),
('2213', 'Phú Túc', '24', 'Xã', 'KV3'),
('2214', 'Ia Dreh', '24', 'Xã', 'KV3'),
('2215', 'Ia Rsai', '24', 'Xã', 'KV3'),
('2216', 'Uar', '24', 'Xã', 'KV3'),
('2217', 'Đak Đoa', '24', 'Xã', 'KV3'),
('2218', 'Kon Gang', '24', 'Xã', 'KV3'),
('2219', 'Ia Băng', '24', 'Xã', 'KV3'),
('2220', 'KDang', '24', 'Xã', 'KV3'),
('2221', 'Đak Sơmei', '24', 'Xã', 'KV3'),
('2222', 'Mang Yang', '24', 'Xã', 'KV3'),
('2223', 'Lơ Pang', '24', 'Xã', 'KV3'),
('2224', 'Kon Chiêng', '24', 'Xã', 'KV3'),
('2225', 'Hra', '24', 'Xã', 'KV3'),
('2226', 'Ayun', '24', 'Xã', 'KV3'),
('2227', 'Ia Grai', '24', 'Xã', 'KV3'),
('2228', 'Ia Krái', '24', 'Xã', 'KV3'),
('2229', 'Ia Hrung', '24', 'Xã', 'KV3'),
('2230', 'Đức Cơ', '24', 'Xã', 'KV3'),
('2231', 'Ia Dơk', '24', 'Xã', 'KV3'),
('2232', 'Ia Krêl', '24', 'Xã', 'KV3'),
('2233', 'Nhơn Châu', '24', 'Xã', 'KV3'),
('2234', 'Ia Púch', '24', 'Xã', 'KV3'),
('2235', 'Ia Mơ', '24', 'Xã', 'KV3'),
('2236', 'Ia Pnôn', '24', 'Xã', 'KV3'),
('2237', 'Ia Nan', '24', 'Xã', 'KV3'),
('2238', 'Ia Dom', '24', 'Xã', 'KV3'),
('2239', 'Ia Chia', '24', 'Xã', 'KV3'),
('2240', 'Ia O', '24', 'Xã', 'KV3'),
('2241', 'Krong', '24', 'Xã', 'KV3'),
('2242', 'Hoà Phú', '25', 'Xã', 'KV3'),
('2243', 'Buôn Ma Thuột', '25', 'Phường', 'KV3'),
('2244', 'Tân An', '25', 'Phường', 'KV3'),
('2245', 'Tân Lập', '25', 'Phường', 'KV3'),
('2246', 'Thành Nhất', '25', 'Phường', 'KV3'),
('2247', 'Ea Kao', '25', 'Phường', 'KV3'),
('2248', 'Ea Drông', '25', 'Xã', 'KV3'),
('2249', 'Buôn Hồ', '25', 'Phường', 'KV3'),
('2250', 'Cư Bao', '25', 'Phường', 'KV3'),
('2251', 'Ea Súp', '25', 'Xã', 'KV3'),
('2252', 'Ea Rốk', '25', 'Xã', 'KV3'),
('2253', 'Ea Bung', '25', 'Xã', 'KV3'),
('2254', 'Ia Rvê', '25', 'Xã', 'KV3'),
('2255', 'Ia Lốp', '25', 'Xã', 'KV3'),
('2256', 'Ea Wer', '25', 'Xã', 'KV3'),
('2257', 'Ea Nuôl', '25', 'Xã', 'KV3'),
('2258', 'Buôn Đôn', '25', 'Xã', 'KV3'),
('2259', 'Ea Kiết', '25', 'Xã', 'KV3'),
('2260', 'Ea M’Droh', '25', 'Xã', 'KV3'),
('2261', 'Quảng Phú', '25', 'Xã', 'KV3'),
('2262', 'Cuôr Đăng', '25', 'Xã', 'KV3'),
('2263', 'Cư M’gar', '25', 'Xã', 'KV3'),
('2264', 'Ea Tul', '25', 'Xã', 'KV3'),
('2265', 'Pơng Drang', '25', 'Xã', 'KV3'),
('2266', 'Krông Búk', '25', 'Xã', 'KV3'),
('2267', 'Cư Pơng', '25', 'Xã', 'KV3'),
('2268', 'Ea Khăl', '25', 'Xã', 'KV3'),
('2269', 'Ea Drăng', '25', 'Xã', 'KV3'),
('2270', 'Ea Wy', '25', 'Xã', 'KV3'),
('2271', 'Ea H’leo', '25', 'Xã', 'KV3'),
('2272', 'Ea Hiao', '25', 'Xã', 'KV3'),
('2273', 'Krông Năng', '25', 'Xã', 'KV3'),
('2274', 'Dliê Ya', '25', 'Xã', 'KV3'),
('2275', 'Tam Giang', '25', 'Xã', 'KV3'),
('2276', 'Phú Xuân', '25', 'Xã', 'KV3'),
('2277', 'Krông Pắc', '25', 'Xã', 'KV3'),
('2278', 'Ea Knuếc', '25', 'Xã', 'KV3'),
('2279', 'Tân Tiến', '25', 'Xã', 'KV3'),
('2280', 'Ea Phê', '25', 'Xã', 'KV3'),
('2281', 'Ea Kly', '25', 'Xã', 'KV3'),
('2282', 'Vụ Bổn', '25', 'Xã', 'KV3'),
('2283', 'Ea Kar', '25', 'Xã', 'KV3'),
('2284', 'Ea Ô', '25', 'Xã', 'KV3'),
('2285', 'Ea Knốp', '25', 'Xã', 'KV3'),
('2286', 'Cư Yang', '25', 'Xã', 'KV3'),
('2287', 'Ea Păl', '25', 'Xã', 'KV3'),
('2288', 'M’Drắk', '25', 'Xã', 'KV3'),
('2289', 'Ea Riêng', '25', 'Xã', 'KV3'),
('2290', 'Cư M’ta', '25', 'Xã', 'KV3'),
('2291', 'Krông Á', '25', 'Xã', 'KV3'),
('2292', 'Cư Prao', '25', 'Xã', 'KV3'),
('2293', 'Ea Trang', '25', 'Xã', 'KV3'),
('2294', 'Hoà Sơn', '25', 'Xã', 'KV3'),
('2295', 'Dang Kang', '25', 'Xã', 'KV3'),
('2296', 'Krông Bông', '25', 'Xã', 'KV3'),
('2297', 'Yang Mao', '25', 'Xã', 'KV3'),
('2298', 'Cư Pui', '25', 'Xã', 'KV3'),
('2299', 'Liên Sơn Lắk', '25', 'Xã', 'KV3'),
('2300', 'Đắk Liêng', '25', 'Xã', 'KV3'),
('2301', 'Nam Ka', '25', 'Xã', 'KV3'),
('2302', 'Đắk Phơi', '25', 'Xã', 'KV3'),
('2303', 'Krông Nô', '25', 'Xã', 'KV3'),
('2304', 'Ea Ning', '25', 'Xã', 'KV3'),
('2305', 'Dray Bhăng', '25', 'Xã', 'KV3'),
('2306', 'Ea Ktur', '25', 'Xã', 'KV3'),
('2307', 'Krông Ana', '25', 'Xã', 'KV3'),
('2308', 'Dur Kmăl', '25', 'Xã', 'KV3'),
('2309', 'Ea Na', '25', 'Xã', 'KV3'),
('2310', 'Tuy Hòa', '25', 'Phường', 'KV3'),
('2311', 'Phú Yên', '25', 'Phường', 'KV3'),
('2312', 'Bình Kiến', '25', 'Phường', 'KV3'),
('2313', 'Xuân Thọ', '25', 'Xã', 'KV3'),
('2314', 'Xuân Cảnh', '25', 'Xã', 'KV3'),
('2315', 'Xuân Lộc', '25', 'Xã', 'KV3'),
('2316', 'Xuân Đài', '25', 'Phường', 'KV3'),
('2317', 'Sông Cầu', '25', 'Phường', 'KV3'),
('2318', 'Hòa Xuân', '25', 'Xã', 'KV3'),
('2319', 'Đông Hòa', '25', 'Phường', 'KV3'),
('2320', 'Hòa Hiệp', '25', 'Phường', 'KV3'),
('2321', 'Tuy An Bắc', '25', 'Xã', 'KV3'),
('2322', 'Tuy An Đông', '25', 'Xã', 'KV3'),
('2323', 'Ô Loan', '25', 'Xã', 'KV3'),
('2324', 'Tuy An Nam', '25', 'Xã', 'KV3'),
('2325', 'Tuy An Tây', '25', 'Xã', 'KV3'),
('2326', 'Phú Hòa 1', '25', 'Xã', 'KV3'),
('2327', 'Phú Hòa 2', '25', 'Xã', 'KV3'),
('2328', 'Tây Hòa', '25', 'Xã', 'KV3'),
('2329', 'Hòa Thịnh', '25', 'Xã', 'KV3'),
('2330', 'Hòa Mỹ', '25', 'Xã', 'KV3'),
('2331', 'Sơn Thành', '25', 'Xã', 'KV3'),
('2332', 'Sơn Hòa', '25', 'Xã', 'KV3'),
('2333', 'Vân Hòa', '25', 'Xã', 'KV3'),
('2334', 'Tây Sơn', '25', 'Xã', 'KV3'),
('2335', 'Suối Trai', '25', 'Xã', 'KV3'),
('2336', 'Ea Ly', '25', 'Xã', 'KV3'),
('2337', 'Ea Bá', '25', 'Xã', 'KV3'),
('2338', 'Đức Bình', '25', 'Xã', 'KV3'),
('2339', 'Sông Hinh', '25', 'Xã', 'KV3'),
('2340', 'Xuân Lãnh', '25', 'Xã', 'KV3'),
('2341', 'Phú Mỡ', '25', 'Xã', 'KV3'),
('2342', 'Xuân Phước', '25', 'Xã', 'KV3'),
('2343', 'Đồng Xuân', '25', 'Xã', 'KV3'),
('2344', 'Xuân Hương - Đà Lạt', '26', 'Phường', 'KV1'),
('2345', 'Cam Ly - Đà Lạt', '26', 'Phường', 'KV1'),
('2346', 'Lâm Viên - Đà Lạt', '26', 'Phường', 'KV1'),
('2347', 'Xuân Trường - Đà Lạt', '26', 'Phường', 'KV1'),
('2348', 'Langbiang - Đà Lạt', '26', 'Phường', 'KV1'),
('2349', '1 Bảo Lộc', '26', 'Phường', 'KV1'),
('2350', '2 Bảo Lộc', '26', 'Phường', 'KV1'),
('2351', '3 Bảo Lộc', '26', 'Phường', 'KV1'),
('2353', 'Lạc Dương', '26', 'Xã', 'KV1'),
('2354', 'Đơn Dương', '26', 'Xã', 'KV1'),
('2355', 'Ka Đô', '26', 'Xã', 'KV1'),
('2356', 'Quảng Lập', '26', 'Xã', 'KV1'),
('2358', 'Hiệp Thạnh', '26', 'Xã', 'KV1'),
('2359', 'Đức Trọng', '26', 'Xã', 'KV1'),
('2360', 'Tân Hội', '26', 'Xã', 'KV1'),
('2361', 'Tà Hine', '26', 'Xã', 'KV1'),
('2362', 'Tà Năng', '26', 'Xã', 'KV1'),
('2363', 'Đinh Văn - Lâm Hà', '26', 'Xã', 'KV1'),
('2364', 'Phú Sơn - Lâm Hà', '26', 'Xã', 'KV1'),
('2365', 'Nam Hà - Lâm Hà', '26', 'Xã', 'KV1'),
('2366', 'Nam Ban - Lâm Hà', '26', 'Xã', 'KV1'),
('2367', 'Tân Hà - Lâm Hà', '26', 'Xã', 'KV1'),
('2368', 'Phúc Thọ - Lâm Hà', '26', 'Xã', 'KV1'),
('2369', 'Đam Rông 1', '26', 'Xã', 'KV1'),
('2370', 'Đam Rông 2', '26', 'Xã', 'KV1'),
('2371', 'Đam Rông 3', '26', 'Xã', 'KV1'),
('2372', 'Đam Rông 4', '26', 'Xã', 'KV1'),
('2373', 'Di Linh', '26', 'Xã', 'KV1'),
('2374', 'Hoà Ninh', '26', 'Xã', 'KV1'),
('2375', 'Hoà Bắc', '26', 'Xã', 'KV1'),
('2376', 'Đinh Trang Thượng', '26', 'Xã', 'KV1'),
('2377', 'Bảo Thuận', '26', 'Xã', 'KV1'),
('2378', 'Sơn Điền', '26', 'Xã', 'KV1'),
('2379', 'Gia Hiệp', '26', 'Xã', 'KV1'),
('2380', 'Bảo Lâm 1', '26', 'Xã', 'KV1'),
('2381', 'Bảo Lâm 2', '26', 'Xã', 'KV1'),
('2382', 'Bảo Lâm 3', '26', 'Xã', 'KV1'),
('2383', 'Bảo Lâm 4', '26', 'Xã', 'KV1'),
('2384', 'Bảo Lâm 5', '26', 'Xã', 'KV1'),
('2385', 'Đạ Huoai', '26', 'Xã', 'KV1'),
('2386', 'Đạ Huoai 2', '26', 'Xã', 'KV1'),
('2387', 'Đạ Huoai 3', '26', 'Xã', 'KV1'),
('2388', 'Đạ Tẻh', '26', 'Xã', 'KV1'),
('2389', 'Đạ Tẻh 2', '26', 'Xã', 'KV1'),
('2390', 'Đạ Tẻh 3', '26', 'Xã', 'KV1'),
('2391', 'Cát Tiên', '26', 'Xã', 'KV1'),
('2392', 'Cát Tiên 2', '26', 'Xã', 'KV1'),
('2393', 'Cát Tiên 3', '26', 'Xã', 'KV1'),
('2394', 'Hàm Thắng', '26', 'Phường', 'KV1'),
('2395', 'Bình Thuận', '26', 'Phường', 'KV1'),
('2396', 'Mũi Né', '26', 'Phường', 'KV1'),
('2397', 'Phú Thuỷ', '26', 'Phường', 'KV1'),
('2398', 'Phan Thiết', '26', 'Phường', 'KV1'),
('2399', 'Tiến Thành', '26', 'Phường', 'KV1'),
('2400', 'La Gi', '26', 'Phường', 'KV1'),
('2401', 'Phước Hội', '26', 'Phường', 'KV1'),
('2402', 'Tuyên Quang', '26', 'Xã', 'KV1'),
('2403', 'Tân Hải', '26', 'Xã', 'KV1'),
('2404', 'Vĩnh Hảo', '26', 'Xã', 'KV1'),
('2405', 'Liên Hương', '26', 'Xã', 'KV1'),
('2406', 'Tuy Phong', '26', 'Xã', 'KV1'),
('2407', 'Phan Rí Cửa', '26', 'Xã', 'KV1'),
('2408', 'Bắc Bình', '26', 'Xã', 'KV1'),
('2409', 'Hồng Thái', '26', 'Xã', 'KV1'),
('2410', 'Hải Ninh', '26', 'Xã', 'KV1'),
('2411', 'Phan Sơn', '26', 'Xã', 'KV1'),
('2412', 'Sông Lũy', '26', 'Xã', 'KV1'),
('2413', 'Lương Sơn', '26', 'Xã', 'KV1'),
('2414', 'Hoà Thắng', '26', 'Xã', 'KV1'),
('2415', 'Đông Giang', '26', 'Xã', 'KV1'),
('2416', 'La Dạ', '26', 'Xã', 'KV1'),
('2417', 'Hàm Thuận Bắc', '26', 'Xã', 'KV1'),
('2418', 'Hàm Thuận', '26', 'Xã', 'KV1'),
('2419', 'Hồng Sơn', '26', 'Xã', 'KV1'),
('2420', 'Hàm Liêm', '26', 'Xã', 'KV1'),
('2421', 'Hàm Thạnh', '26', 'Xã', 'KV1'),
('2422', 'Hàm Kiệm', '26', 'Xã', 'KV1'),
('2423', 'Tân Thành', '26', 'Xã', 'KV1'),
('2424', 'Hàm Thuận Nam', '26', 'Xã', 'KV1'),
('2425', 'Tân Lập', '26', 'Xã', 'KV1'),
('2426', 'Tân Minh', '26', 'Xã', 'KV1'),
('2427', 'Hàm Tân', '26', 'Xã', 'KV1'),
('2428', 'Sơn Mỹ', '26', 'Xã', 'KV1'),
('2429', 'Bắc Ruộng', '26', 'Xã', 'KV1'),
('2430', 'Nghị Đức', '26', 'Xã', 'KV1'),
('2431', 'Đồng Kho', '26', 'Xã', 'KV1'),
('2432', 'Tánh Linh', '26', 'Xã', 'KV1'),
('2433', 'Suối Kiết', '26', 'Xã', 'KV1'),
('2434', 'Nam Thành', '26', 'Xã', 'KV1'),
('2435', 'Đức Linh', '26', 'Xã', 'KV1'),
('2436', 'Hoài Đức', '26', 'Xã', 'KV1'),
('2437', 'Trà Tân', '26', 'Xã', 'KV1'),
('2438', 'khu Phú Quý', '26', 'Xã', 'KV1'),
('2439', 'Bắc Gia Nghĩa', '26', 'Phường', 'KV1'),
('2440', 'Nam Gia Nghĩa', '26', 'Phường', 'KV1'),
('2441', 'Đông Gia Nghĩa', '26', 'Phường', 'KV1'),
('2442', 'Đắk Wil', '26', 'Xã', 'KV1'),
('2443', 'Nam Dong', '26', 'Xã', 'KV1'),
('2444', 'Cư Jút', '26', 'Xã', 'KV1'),
('2445', 'Thuận An', '26', 'Xã', 'KV1'),
('2446', 'Đức Lập', '26', 'Xã', 'KV1'),
('2447', 'Đắk Mil', '26', 'Xã', 'KV1'),
('2448', 'Đắk Sắk', '26', 'Xã', 'KV1'),
('2449', 'Nam Đà', '26', 'Xã', 'KV1'),
('2450', 'Krông Nô', '26', 'Xã', 'KV1'),
('2451', 'Nâm Nung', '26', 'Xã', 'KV1'),
('2452', 'Quảng Phú', '26', 'Xã', 'KV1'),
('2453', 'Đắk song', '26', 'Xã', 'KV1'),
('2454', 'Đức An', '26', 'Xã', 'KV1'),
('2455', 'Thuận Hạnh', '26', 'Xã', 'KV1'),
('2456', 'Trường Xuân', '26', 'Xã', 'KV1'),
('2457', 'Tà Đùng', '26', 'Xã', 'KV1'),
('2458', 'Quảng Khê', '26', 'Xã', 'KV1'),
('2459', 'Quảng Tân', '26', 'Xã', 'KV1'),
('2460', 'Tuy Đức', '26', 'Xã', 'KV1'),
('2461', 'Kiến Đức', '26', 'Xã', 'KV1'),
('2462', 'Nhân Cơ', '26', 'Xã', 'KV1'),
('2463', 'Quảng Tín', '26', 'Xã', 'KV1'),
('2464', 'Ninh Gia', '26', 'Xã', 'KV1'),
('2465', 'Quảng Hoà', '26', 'Xã', 'KV1'),
('2466', 'Quảng Sơn', '26', 'Xã', 'KV1'),
('2467', 'Quảng Trực', '26', 'Xã', 'KV1'),
('2468', 'Hưng Điền', '27', 'Xã', 'KV1'),
('2469', 'Vĩnh Thạnh', '27', 'Xã', 'KV1'),
('2470', 'Tân Hưng', '27', 'Xã', 'KV1'),
('2471', 'Vĩnh Châu', '27', 'Xã', 'KV1'),
('2472', 'Tuyên Bình', '27', 'Xã', 'KV1'),
('2473', 'Vĩnh Hưng', '27', 'Xã', 'KV1'),
('2474', 'Khánh Hưng', '27', 'Xã', 'KV1'),
('2475', 'Tuyên Thạnh', '27', 'Xã', 'KV1'),
('2476', 'Bình Hiệp', '27', 'Xã', 'KV1'),
('2477', 'Kiến Tường', '27', 'Phường', 'KV1'),
('2478', 'Bình Hoà', '27', 'Xã', 'KV1'),
('2479', 'Mộc Hoá', '27', 'Xã', 'KV1'),
('2480', 'Hậu Thạnh', '27', 'Xã', 'KV1'),
('2481', 'Nhơn Hoà Lập', '27', 'Xã', 'KV1'),
('2482', 'Nhơn Ninh', '27', 'Xã', 'KV1'),
('2483', 'Tân Thạnh', '27', 'Xã', 'KV1'),
('2484', 'Bình Thành', '27', 'Xã', 'KV1'),
('2485', 'Thạnh Phước', '27', 'Xã', 'KV1'),
('2486', 'Thạnh Hóa', '27', 'Xã', 'KV1'),
('2487', 'Tân Tây', '27', 'Xã', 'KV1'),
('2488', 'Thủ Thừa', '27', 'Xã', 'KV1'),
('2489', 'Mỹ An', '27', 'Xã', 'KV1'),
('2490', 'Mỹ Thạnh', '27', 'Xã', 'KV1'),
('2491', 'Tân Long', '27', 'Xã', 'KV1'),
('2492', 'Mỹ Quý', '27', 'Xã', 'KV1'),
('2493', 'Đông Thành', '27', 'Xã', 'KV1'),
('2494', 'Đức Huệ', '27', 'Xã', 'KV1'),
('2495', 'An Ninh', '27', 'Xã', 'KV1'),
('2496', 'Hiệp Hoà', '27', 'Xã', 'KV1'),
('2497', 'Hậu Nghĩa', '27', 'Xã', 'KV1'),
('2498', 'Hoà Khánh', '27', 'Xã', 'KV1'),
('2499', 'Đức Lập', '27', 'Xã', 'KV1'),
('2500', 'Mỹ Hạnh', '27', 'Xã', 'KV1'),
('2501', 'Đức Hoà', '27', 'Xã', 'KV1'),
('2502', 'Thạnh Lợi', '27', 'Xã', 'KV1'),
('2503', 'Bình Đức', '27', 'Xã', 'KV1'),
('2504', 'Lương Hoà', '27', 'Xã', 'KV1'),
('2505', 'Bến Lức', '27', 'Xã', 'KV1'),
('2506', 'Mỹ Yên', '27', 'Xã', 'KV1'),
('2507', 'Long Cang', '27', 'Xã', 'KV1'),
('2508', 'Rạch Kiến', '27', 'Xã', 'KV1'),
('2509', 'Mỹ Lệ', '27', 'Xã', 'KV1'),
('2510', 'Tân Lân', '27', 'Xã', 'KV1'),
('2511', 'Cần Đước', '27', 'Xã', 'KV1'),
('2512', 'Long Hựu', '27', 'Xã', 'KV1'),
('2513', 'Phước Lý', '27', 'Xã', 'KV1'),
('2514', 'Mỹ Lộc', '27', 'Xã', 'KV1'),
('2515', 'Cần Giuộc', '27', 'Xã', 'KV1'),
('2516', 'Phước Vĩnh Tây', '27', 'Xã', 'KV1'),
('2517', 'Tân Tập', '27', 'Xã', 'KV1'),
('2518', 'Vàm Cỏ', '27', 'Xã', 'KV1'),
('2519', 'Tân Trụ', '27', 'Xã', 'KV1'),
('2520', 'Nhựt Tảo', '27', 'Xã', 'KV1'),
('2521', 'Thuận Mỹ', '27', 'Xã', 'KV1'),
('2522', 'An Lục Long', '27', 'Xã', 'KV1'),
('2523', 'Tầm Vu', '27', 'Xã', 'KV1'),
('2524', 'Vĩnh Công', '27', 'Xã', 'KV1'),
('2525', 'Long An', '27', 'Phường', 'KV1'),
('2526', 'Tân An', '27', 'Phường', 'KV1'),
('2527', 'Khánh Hậu', '27', 'Phường', 'KV1'),
('2528', 'Tân Ninh', '27', 'Phường', 'KV1'),
('2529', 'Bình Minh', '27', 'Phường', 'KV1'),
('2530', 'Ninh Thạnh', '27', 'Phường', 'KV1'),
('2531', 'Long Hoa', '27', 'Phường', 'KV1'),
('2532', 'Hoà Thành', '27', 'Phường', 'KV1'),
('2533', 'Thanh Điền', '27', 'Phường', 'KV1'),
('2534', 'Trảng Bàng', '27', 'Phường', 'KV1'),
('2535', 'An Tịnh', '27', 'Phường', 'KV1'),
('2536', 'Gò Dầu', '27', 'Phường', 'KV1'),
('2537', 'Gia Lộc', '27', 'Phường', 'KV1'),
('2538', 'Hưng Thuận', '27', 'Xã', 'KV1'),
('2539', 'Phước Chỉ', '27', 'Xã', 'KV1'),
('2540', 'Thạnh Đức', '27', 'Xã', 'KV1'),
('2541', 'Phước Thạnh', '27', 'Xã', 'KV1'),
('2542', 'Truông Mít', '27', 'Xã', 'KV1'),
('2543', 'Lộc Ninh', '27', 'Xã', 'KV1'),
('2544', 'Cầu Khởi', '27', 'Xã', 'KV1'),
('2545', 'Dương Minh Châu', '27', 'Xã', 'KV1'),
('2546', 'Tân Đông', '27', 'Xã', 'KV1'),
('2547', 'Tân Châu', '27', 'Xã', 'KV1'),
('2548', 'Tân Phú', '27', 'Xã', 'KV1'),
('2549', 'Tân Hội', '27', 'Xã', 'KV1'),
('2550', 'Tân Thành', '27', 'Xã', 'KV1'),
('2551', 'Tân Hoà', '27', 'Xã', 'KV1'),
('2552', 'Tân Lập', '27', 'Xã', 'KV1'),
('2553', 'Tân Biên', '27', 'Xã', 'KV1'),
('2554', 'Thạnh Bình', '27', 'Xã', 'KV1'),
('2555', 'Trà Vong', '27', 'Xã', 'KV1'),
('2556', 'Phước Vinh', '27', 'Xã', 'KV1'),
('2557', 'Hoà Hội', '27', 'Xã', 'KV1'),
('2558', 'Ninh Điền', '27', 'Xã', 'KV1'),
('2559', 'Châu Thành', '27', 'Xã', 'KV1'),
('2560', 'Hảo Đước', '27', 'Xã', 'KV1'),
('2561', 'Long Chữ', '27', 'Xã', 'KV1'),
('2562', 'Long Thuận', '27', 'Xã', 'KV1'),
('2563', 'Bến Cầu', '27', 'Xã', 'KV1'),
('2564', 'Biên Hoà', '28', 'Phường', 'KV1'),
('2565', 'Trấn Biên', '28', 'Phường', 'KV1'),
('2566', 'Tam Hiệp', '28', 'Phường', 'KV1'),
('2567', 'Long Bình', '28', 'Phường', 'KV1'),
('2568', 'Trảng Dài', '28', 'Phường', 'KV1'),
('2569', 'Hố Nai', '28', 'Phường', 'KV1'),
('2570', 'Long Hưng', '28', 'Phường', 'KV1'),
('2571', 'Đại Phước', '28', 'Xã', 'KV1'),
('2572', 'Nhơn Trạch', '28', 'Xã', 'KV1'),
('2573', 'Phước An', '28', 'Xã', 'KV1'),
('2574', 'Phước Thái', '28', 'Xã', 'KV1'),
('2575', 'Long Phước', '28', 'Xã', 'KV1'),
('2576', 'Bình An', '28', 'Xã', 'KV1'),
('2577', 'Long Thành', '28', 'Xã', 'KV1'),
('2578', 'An Phước', '28', 'Xã', 'KV1'),
('2579', 'An Viễn', '28', 'Xã', 'KV1'),
('2580', 'Bình Minh', '28', 'Xã', 'KV1'),
('2581', 'Trảng Bom', '28', 'Xã', 'KV1'),
('2582', 'Bàu Hàm', '28', 'Xã', 'KV1'),
('2583', 'Hưng Thịnh', '28', 'Xã', 'KV1'),
('2584', 'Dầu Giây', '28', 'Xã', 'KV1'),
('2585', 'Gia Kiệm', '28', 'Xã', 'KV1'),
('2586', 'Thống Nhất', '28', 'Xã', 'KV1'),
('2587', 'Bình Lộc', '28', 'Phường', 'KV1'),
('2588', 'Bảo Vinh', '28', 'Phường', 'KV1'),
('2589', 'Xuân Lập', '28', 'Phường', 'KV1'),
('2590', 'Long Khánh', '28', 'Phường', 'KV1'),
('2591', 'Hàng Gòn', '28', 'Phường', 'KV1'),
('2592', 'Xuân Quế', '28', 'Xã', 'KV1'),
('2593', 'Xuân Đường', '28', 'Xã', 'KV1'),
('2594', 'Cẩm Mỹ', '28', 'Xã', 'KV1'),
('2595', 'Sông Ray', '28', 'Xã', 'KV1'),
('2596', 'Xuân Đông', '28', 'Xã', 'KV1'),
('2597', 'Xuân Định', '28', 'Xã', 'KV1'),
('2598', 'Xuân Phú', '28', 'Xã', 'KV1'),
('2599', 'Xuân Lộc', '28', 'Xã', 'KV1'),
('2600', 'Xuân Hoà', '28', 'Xã', 'KV1'),
('2601', 'Xuân Thành', '28', 'Xã', 'KV1'),
('2602', 'Xuân Bắc', '28', 'Xã', 'KV1'),
('2603', 'La Ngà', '28', 'Xã', 'KV1'),
('2604', 'Định Quán', '28', 'Xã', 'KV1'),
('2605', 'Phú Vinh', '28', 'Xã', 'KV1'),
('2606', 'Phú Hoà', '28', 'Xã', 'KV1'),
('2607', 'Tà Lài', '28', 'Xã', 'KV1'),
('2608', 'Nam Cát Tiên', '28', 'Xã', 'KV1'),
('2609', 'Tân Phú', '28', 'Xã', 'KV1'),
('2610', 'Phú Lâm', '28', 'Xã', 'KV1'),
('2611', 'Trị An', '28', 'Xã', 'KV1'),
('2612', 'Tân An', '28', 'Xã', 'KV1'),
('2613', 'Tân Triều', '28', 'Phường', 'KV1'),
('2614', 'Minh Hưng', '28', 'Phường', 'KV1'),
('2615', 'Chơn Thành', '28', 'Phường', 'KV1'),
('2616', 'Nha Bích', '28', 'Xã', 'KV1'),
('2617', 'Tân Quan', '28', 'Xã', 'KV1'),
('2618', 'Tân Hưng', '28', 'Xã', 'KV1'),
('2619', 'Tân Khai', '28', 'Xã', 'KV1'),
('2620', 'Minh Đức', '28', 'Xã', 'KV1'),
('2621', 'Bình Long', '28', 'Phường', 'KV1'),
('2622', 'An Lộc', '28', 'Phường', 'KV1'),
('2623', 'Lộc Thành', '28', 'Xã', 'KV1'),
('2624', 'Lộc Ninh', '28', 'Xã', 'KV1'),
('2625', 'Lộc Hưng', '28', 'Xã', 'KV1'),
('2626', 'Lộc Tấn', '28', 'Xã', 'KV1'),
('2627', 'Lộc Thạnh', '28', 'Xã', 'KV1'),
('2628', 'Lộc Quang', '28', 'Xã', 'KV1'),
('2629', 'Tân Tiến', '28', 'Xã', 'KV1'),
('2630', 'Thiện Hưng', '28', 'Xã', 'KV1'),
('2631', 'Hưng Phước', '28', 'Xã', 'KV1'),
('2632', 'Phú Nghĩa', '28', 'Xã', 'KV1'),
('2633', 'Đa Kia', '28', 'Xã', 'KV1'),
('2634', 'Phước Bình', '28', 'Phường', 'KV1'),
('2635', 'Phước Long', '28', 'Phường', 'KV1'),
('2636', 'Bình Tân', '28', 'Xã', 'KV1'),
('2637', 'Long Hà', '28', 'Xã', 'KV1'),
('2638', 'Phú Riềng', '28', 'Xã', 'KV1'),
('2639', 'Phú Trung', '28', 'Xã', 'KV1'),
('2640', 'Đồng Xoài', '28', 'Phường', 'KV1'),
('2641', 'Bình Phước', '28', 'Phường', 'KV1'),
('2642', 'Thuận Lợi', '28', 'Xã', 'KV1'),
('2643', 'Đồng Tâm', '28', 'Xã', 'KV1'),
('2644', 'Tân Lợi', '28', 'Xã', 'KV1'),
('2645', 'Đồng Phú', '28', 'Xã', 'KV1'),
('2646', 'Phước Sơn', '28', 'Xã', 'KV1'),
('2647', 'Nghĩa Trung', '28', 'Xã', 'KV1'),
('2648', 'Bù Đăng', '28', 'Xã', 'KV1'),
('2649', 'Thọ Sơn', '28', 'Xã', 'KV1'),
('2650', 'Đak Nhau', '28', 'Xã', 'KV1'),
('2651', 'Bom Bo', '28', 'Xã', 'KV1'),
('2652', 'Tam Phước', '28', 'Phường', 'KV1'),
('2653', 'Phước Tân', '28', 'Phường', 'KV1'),
('2654', 'Thanh Sơn', '28', 'Xã', 'KV1'),
('2655', 'Đak Lua', '28', 'Xã', 'KV1'),
('2656', 'Phú Lý', '28', 'Xã', 'KV1'),
('2657', 'Bù Gia Mập', '28', 'Xã', 'KV1'),
('2658', 'Đăk Ơ', '28', 'Xã', 'KV1'),
('2659', 'Vũng Tàu', '29', 'Phường', 'KV1'),
('2660', 'Tam Thắng', '29', 'Phường', 'KV1'),
('2661', 'Rạch Dừa', '29', 'Phường', 'KV1'),
('2662', 'Phước Thắng', '29', 'Phường', 'KV1'),
('2663', 'Bà Rịa', '29', 'Phường', 'KV1'),
('2664', 'Long Hương', '29', 'Phường', 'KV1'),
('2665', 'Phú Mỹ', '29', 'Phường', 'KV1'),
('2666', 'Tam Long', '29', 'Phường', 'KV1'),
('2667', 'Tân Thành', '29', 'Phường', 'KV1'),
('2668', 'Tân Phước', '29', 'Phường', 'KV1'),
('2669', 'Tân Hải', '29', 'Phường', 'KV1'),
('2670', 'Châu Pha', '29', 'Xã', 'KV1'),
('2671', 'Ngãi Giao', '29', 'Xã', 'KV1'),
('2672', 'Bình Giã', '29', 'Xã', 'KV1'),
('2673', 'Kim Long', '29', 'Xã', 'KV1'),
('2674', 'Châu Đức', '29', 'Xã', 'KV1'),
('2675', 'Xuân Sơn', '29', 'Xã', 'KV1'),
('2676', 'Nghĩa Thành', '29', 'Xã', 'KV1'),
('2677', 'Hồ Tràm', '29', 'Xã', 'KV1'),
('2678', 'Xuyên Mộc', '29', 'Xã', 'KV1'),
('2679', 'Hòa Hội', '29', 'Xã', 'KV1'),
('2680', 'Bàu Lâm', '29', 'Xã', 'KV1'),
('2681', 'Phước Hải', '29', 'Xã', 'KV1'),
('2682', 'Long Hải', '29', 'Xã', 'KV1'),
('2683', 'Đất Đỏ', '29', 'Xã', 'KV1'),
('2684', 'Long Điền', '29', 'Xã', 'KV1'),
('2685', 'khu Côn Đảo', '29', 'Xã', 'KV1'),
('2686', 'Đông Hoà', '29', 'Phường', 'KV1'),
('2687', 'Dĩ An', '29', 'Phường', 'KV1'),
('2688', 'Tân Đông Hiệp', '29', 'Phường', 'KV1'),
('2689', 'Thuận An', '29', 'Phường', 'KV1'),
('2690', 'Thuận Giao', '29', 'Phường', 'KV1'),
('2691', 'Bình Hoà', '29', 'Phường', 'KV1'),
('2692', 'Lái Thiêu', '29', 'Phường', 'KV1'),
('2693', 'An Phú', '29', 'Phường', 'KV1'),
('2694', 'Bình Dương', '29', 'Phường', 'KV1'),
('2695', 'Chánh Hiệp', '29', 'Phường', 'KV1'),
('2696', 'Thủ Dầu Một', '29', 'Phường', 'KV1'),
('2697', 'Phú Lợi', '29', 'Phường', 'KV1'),
('2698', 'Vĩnh Tân', '29', 'Phường', 'KV1'),
('2699', 'Bình Cơ', '29', 'Phường', 'KV1'),
('2700', 'Tân Uyên', '29', 'Phường', 'KV1'),
('2701', 'Tân Hiệp', '29', 'Phường', 'KV1'),
('2702', 'Tân Khánh', '29', 'Phường', 'KV1'),
('2703', 'Hoà Lợi', '29', 'Phường', 'KV1'),
('2704', 'Phú An', '29', 'Phường', 'KV1'),
('2705', 'Tây Nam', '29', 'Phường', 'KV1'),
('2706', 'Long Nguyên', '29', 'Phường', 'KV1'),
('2707', 'Bến Cát', '29', 'Phường', 'KV1'),
('2708', 'Chánh Phú Hoà', '29', 'Phường', 'KV1'),
('2709', 'Bắc Tân Uyên', '29', 'Xã', 'KV1'),
('2710', 'Thường Tân', '29', 'Xã', 'KV1'),
('2711', 'An Long', '29', 'Xã', 'KV1'),
('2712', 'Phước Thành', '29', 'Xã', 'KV1'),
('2713', 'Phước Hoà', '29', 'Xã', 'KV1'),
('2714', 'Phú Giáo', '29', 'Xã', 'KV1'),
('2715', 'Trừ Văn Thố', '29', 'Xã', 'KV1'),
('2716', 'Bàu Bàng', '29', 'Xã', 'KV1'),
('2717', 'Minh Thạnh', '29', 'Xã', 'KV1'),
('2718', 'Long Hoà', '29', 'Xã', 'KV1'),
('2719', 'Dầu Tiếng', '29', 'Xã', 'KV1'),
('2720', 'Thanh An', '29', 'Xã', 'KV1'),
('2721', 'Sài Gòn', '29', 'Phường', 'KV1'),
('2722', 'Tân Định', '29', 'Phường', 'KV1'),
('2723', 'Bến Thành', '29', 'Phường', 'KV1'),
('2724', 'Cầu Ông Lãnh', '29', 'Phường', 'KV1'),
('2725', 'Bàn Cờ', '29', 'Phường', 'KV1'),
('2726', 'Xuân Hoà', '29', 'Phường', 'KV1'),
('2727', 'Nhiêu Lộc', '29', 'Phường', 'KV1'),
('2728', 'Xóm Chiếu', '29', 'Phường', 'KV1'),
('2729', 'Khánh Hội', '29', 'Phường', 'KV1'),
('2730', 'Vĩnh Hội', '29', 'Phường', 'KV1'),
('2731', 'Chợ Quán', '29', 'Phường', 'KV1'),
('2732', 'An Đông', '29', 'Phường', 'KV1'),
('2733', 'Chợ Lớn', '29', 'Phường', 'KV1'),
('2734', 'Bình Tây', '29', 'Phường', 'KV1'),
('2735', 'Bình Tiên', '29', 'Phường', 'KV1'),
('2736', 'Bình Phú', '29', 'Phường', 'KV1'),
('2737', 'Phú Lâm', '29', 'Phường', 'KV1'),
('2738', 'Tân Thuận', '29', 'Phường', 'KV1'),
('2739', 'Phú Thuận', '29', 'Phường', 'KV1'),
('2740', 'Tân Mỹ', '29', 'Phường', 'KV1'),
('2741', 'Tân Hưng', '29', 'Phường', 'KV1'),
('2742', 'Chánh Hưng', '29', 'Phường', 'KV1'),
('2743', 'Phú Định', '29', 'Phường', 'KV1'),
('2744', 'Bình Đông', '29', 'Phường', 'KV1'),
('2745', 'Diên Hồng', '29', 'Phường', 'KV1'),
('2746', 'Vườn Lài', '29', 'Phường', 'KV1'),
('2747', 'Hoà Hưng', '29', 'Phường', 'KV1'),
('2748', 'Minh Phụng', '29', 'Phường', 'KV1'),
('2749', 'Bình Thới', '29', 'Phường', 'KV1'),
('2750', 'Hoà Bình', '29', 'Phường', 'KV1'),
('2751', 'Phú Thọ', '29', 'Phường', 'KV1'),
('2752', 'Đông Hưng Thuận', '29', 'Phường', 'KV1'),
('2753', 'Trung Mỹ Tây', '29', 'Phường', 'KV1'),
('2754', 'Tân Thới Hiệp', '29', 'Phường', 'KV1'),
('2755', 'Thới An', '29', 'Phường', 'KV1'),
('2756', 'An Phú Đông', '29', 'Phường', 'KV1'),
('2757', 'An Lạc', '29', 'Phường', 'KV1'),
('2758', 'Tân Tạo', '29', 'Phường', 'KV1'),
('2759', 'Bình Tân', '29', 'Phường', 'KV1'),
('2760', 'Bình Trị Đông', '29', 'Phường', 'KV1'),
('2761', 'Bình Hưng Hoà', '29', 'Phường', 'KV1'),
('2762', 'Gia Định', '29', 'Phường', 'KV1'),
('2763', 'Bình Thạnh', '29', 'Phường', 'KV1'),
('2764', 'Bình Lợi Trung', '29', 'Phường', 'KV1'),
('2765', 'Thạnh Mỹ Tây', '29', 'Phường', 'KV1'),
('2766', 'Bình Quới', '29', 'Phường', 'KV1'),
('2767', 'Hạnh Thông', '29', 'Phường', 'KV1'),
('2768', 'An Nhơn', '29', 'Phường', 'KV1'),
('2769', 'Gò Vấp', '29', 'Phường', 'KV1'),
('2770', 'An Hội Đông', '29', 'Phường', 'KV1'),
('2771', 'Thông Tây Hội', '29', 'Phường', 'KV1'),
('2772', 'An Hội Tây', '29', 'Phường', 'KV1'),
('2773', 'Đức Nhuận', '29', 'Phường', 'KV1'),
('2774', 'Cầu Kiệu', '29', 'Phường', 'KV1'),
('2775', 'Phú Nhuận', '29', 'Phường', 'KV1'),
('2776', 'Tân Sơn Hoà', '29', 'Phường', 'KV1'),
('2777', 'Tân Sơn Nhất', '29', 'Phường', 'KV1'),
('2778', 'Tân Hoà', '29', 'Phường', 'KV1'),
('2779', 'Bảy Hiền', '29', 'Phường', 'KV1'),
('2780', 'Tân Bình', '29', 'Phường', 'KV1'),
('2781', 'Tân Sơn', '29', 'Phường', 'KV1'),
('2782', 'Tây Thạnh', '29', 'Phường', 'KV1'),
('2783', 'Tân Sơn Nhì', '29', 'Phường', 'KV1'),
('2784', 'Phú Thọ Hoà', '29', 'Phường', 'KV1'),
('2785', 'Tân Phú', '29', 'Phường', 'KV1'),
('2786', 'Phú Thạnh', '29', 'Phường', 'KV1'),
('2787', 'Hiệp Bình', '29', 'Phường', 'KV1'),
('2788', 'Thủ Đức', '29', 'Phường', 'KV1'),
('2789', 'Tam Bình', '29', 'Phường', 'KV1'),
('2790', 'Linh Xuân', '29', 'Phường', 'KV1'),
('2791', 'Tăng Nhơn Phú', '29', 'Phường', 'KV1'),
('2792', 'Long Bình', '29', 'Phường', 'KV1'),
('2793', 'Long Phước', '29', 'Phường', 'KV1'),
('2794', 'Long Trường', '29', 'Phường', 'KV1'),
('2795', 'Cát Lái', '29', 'Phường', 'KV1'),
('2796', 'Bình Trưng', '29', 'Phường', 'KV1'),
('2797', 'Phước Long', '29', 'Phường', 'KV1'),
('2798', 'An Khánh', '29', 'Phường', 'KV1'),
('2799', 'Vĩnh Lộc', '29', 'Xã', 'KV1'),
('2800', 'Tân Vĩnh Lộc', '29', 'Xã', 'KV1'),
('2801', 'Bình Lợi', '29', 'Xã', 'KV1'),
('2802', 'Tân Nhựt', '29', 'Xã', 'KV1'),
('2803', 'Bình Chánh', '29', 'Xã', 'KV1'),
('2804', 'Hưng Long', '29', 'Xã', 'KV1'),
('2805', 'Bình Hưng', '29', 'Xã', 'KV1'),
('2806', 'Bình Khánh', '29', 'Xã', 'KV1'),
('2807', 'An Thới Đông', '29', 'Xã', 'KV1'),
('2808', 'Cần Giờ', '29', 'Xã', 'KV1'),
('2809', 'Củ Chi', '29', 'Xã', 'KV1'),
('2810', 'Tân An Hội', '29', 'Xã', 'KV1'),
('2811', 'Thái Mỹ', '29', 'Xã', 'KV1'),
('2812', 'An Nhơn Tây', '29', 'Xã', 'KV1'),
('2813', 'Nhuận Đức', '29', 'Xã', 'KV1'),
('2814', 'Phú Hoà Đông', '29', 'Xã', 'KV1'),
('2815', 'Bình Mỹ', '29', 'Xã', 'KV1'),
('2816', 'Đông Thạnh', '29', 'Xã', 'KV1'),
('2817', 'Hóc Môn', '29', 'Xã', 'KV1'),
('2818', 'Xuân Thới Sơn', '29', 'Xã', 'KV1'),
('2819', 'Bà Điểm', '29', 'Xã', 'KV1'),
('2820', 'Nhà Bè', '29', 'Xã', 'KV1'),
('2821', 'Hiệp Phước', '29', 'Xã', 'KV1'),
('2822', 'Long Sơn', '29', 'Xã', 'KV1'),
('2823', 'Hòa Hiệp', '29', 'Xã', 'KV1'),
('2824', 'Bình Châu', '29', 'Xã', 'KV1'),
('2825', 'Thới Hoà', '29', 'Phường', 'KV1'),
('2826', 'Thạnh An', '29', 'Xã', 'KV1'),
('2827', 'Trà Vinh', '30', 'Phường', 'KV1'),
('2828', 'Cái Nhum', '30', 'Xã', 'KV1'),
('2829', 'Long Đức', '30', 'Phường', 'KV1'),
('2830', 'Tân Long Hội', '30', 'Xã', 'KV1'),
('2831', 'Nguyệt Hóa', '30', 'Phường', 'KV1'),
('2832', 'Nhơn Phú', '30', 'Xã', 'KV1'),
('2833', 'Hòa Thuận', '30', 'Phường', 'KV1'),
('2834', 'Bình Phước', '30', 'Xã', 'KV1'),
('2835', 'Càng Long', '30', 'Xã', 'KV1'),
('2836', 'An Bình', '30', 'Xã', 'KV1'),
('2837', 'An Trường', '30', 'Xã', 'KV1'),
('2838', 'Long Hồ', '30', 'Xã', 'KV1'),
('2839', 'Tân An', '30', 'Xã', 'KV1'),
('2840', 'Phú Quới', '30', 'Xã', 'KV1'),
('2841', 'Nhị Long', '30', 'Xã', 'KV1'),
('2842', 'Thanh Đức', '30', 'Phường', 'KV1'),
('2843', 'Bình Phú', '30', 'Xã', 'KV1'),
('2844', 'Long Châu', '30', 'Phường', 'KV1'),
('2845', 'Châu Thành', '30', 'Xã', 'KV1'),
('2846', 'Phước Hậu', '30', 'Phường', 'KV1'),
('2847', 'Song Lộc', '30', 'Xã', 'KV1'),
('2848', 'Tân Hạnh', '30', 'Phường', 'KV1'),
('2849', 'Hưng Mỹ', '30', 'Xã', 'KV1'),
('2850', 'Tân Ngãi', '30', 'Phường', 'KV1'),
('2851', 'Hòa Minh', '30', 'Xã', 'KV1'),
('2852', 'Quới Thiện', '30', 'Xã', 'KV1'),
('2853', 'Long Hòa', '30', 'Xã', 'KV1'),
('2854', 'Trung Thành', '30', 'Xã', 'KV1'),
('2855', 'Cầu Kè', '30', 'Xã', 'KV1'),
('2856', 'Trung Ngãi', '30', 'Xã', 'KV1'),
('2857', 'Phong Thạnh', '30', 'Xã', 'KV1'),
('2858', 'Quới An', '30', 'Xã', 'KV1'),
('2859', 'An Phú Tân', '30', 'Xã', 'KV1'),
('2860', 'Trung Hiệp', '30', 'Xã', 'KV1'),
('2861', 'Tam Ngãi', '30', 'Xã', 'KV1'),
('2862', 'Hiếu Phụng', '30', 'Xã', 'KV1'),
('2863', 'Tiểu Cần', '30', 'Xã', 'KV1'),
('2864', 'Hiếu Thành', '30', 'Xã', 'KV1'),
('2865', 'Tân Hòa', '30', 'Xã', 'KV1'),
('2866', 'Lục Sỹ Thành', '30', 'Xã', 'KV1'),
('2867', 'Hùng Hòa', '30', 'Xã', 'KV1'),
('2868', 'Trà Ôn', '30', 'Xã', 'KV1'),
('2869', 'Tập Ngãi', '30', 'Xã', 'KV1'),
('2870', 'Trà Côn', '30', 'Xã', 'KV1'),
('2871', 'Cầu Ngang', '30', 'Xã', 'KV1'),
('2872', 'Vĩnh Xuân', '30', 'Xã', 'KV1'),
('2873', 'Mỹ Long', '30', 'Xã', 'KV1'),
('2874', 'Hòa Bình', '30', 'Xã', 'KV1'),
('2875', 'Vinh Kim', '30', 'Xã', 'KV1'),
('2876', 'Hòa Hiệp', '30', 'Xã', 'KV1'),
('2877', 'Nhị Trường', '30', 'Xã', 'KV1'),
('2878', 'Tam Bình', '30', 'Xã', 'KV1'),
('2879', 'Hiệp Mỹ', '30', 'Xã', 'KV1'),
('2880', 'Ngãi Tứ', '30', 'Xã', 'KV1'),
('2881', 'Trà Cú', '30', 'Xã', 'KV1'),
('2882', 'Song Phú', '30', 'Xã', 'KV1'),
('2883', 'Lưu Nghiệp Anh', '30', 'Xã', 'KV1'),
('2884', 'Cái Ngang', '30', 'Xã', 'KV1'),
('2885', 'Đại An', '30', 'Xã', 'KV1'),
('2886', 'Tân Quới', '30', 'Xã', 'KV1'),
('2887', 'Hàm Giang', '30', 'Xã', 'KV1'),
('2888', 'Tân Lược', '30', 'Xã', 'KV1'),
('2889', 'Long Hiệp', '30', 'Xã', 'KV1'),
('2890', 'Mỹ Thuận', '30', 'Xã', 'KV1'),
('2891', 'Tập Sơn', '30', 'Xã', 'KV1'),
('2892', 'Bình Minh', '30', 'Phường', 'KV1'),
('2893', 'Duyên Hải', '30', 'Phường', 'KV1'),
('2894', 'Cái Vồn', '30', 'Phường', 'KV1'),
('2895', 'Trường Long Hòa', '30', 'Phường', 'KV1'),
('2896', 'Đông Thành', '30', 'Phường', 'KV1'),
('2897', 'Long Hữu', '30', 'Xã', 'KV1'),
('2898', 'Long Thành', '30', 'Xã', 'KV1'),
('2899', 'Đông Hải', '30', 'Xã', 'KV1'),
('2900', 'Long Vĩnh', '30', 'Xã', 'KV1'),
('2901', 'Đôn Châu', '30', 'Xã', 'KV1'),
('2902', 'Ngũ Lạc', '30', 'Xã', 'KV1'),
('2903', 'An Hội', '30', 'Phường', 'KV1'),
('2904', 'Phú Khương', '30', 'Phường', 'KV1'),
('2905', 'Bến Tre', '30', 'Phường', 'KV1'),
('2906', 'Sơn Đông', '30', 'Phường', 'KV1'),
('2907', 'Phú Tân', '30', 'Phường', 'KV1'),
('2908', 'Phú Túc', '30', 'Xã', 'KV1'),
('2909', 'Giao Long', '30', 'Xã', 'KV1'),
('2910', 'Tiên Thủy', '30', 'Xã', 'KV1'),
('2911', 'Tân Phú', '30', 'Xã', 'KV1'),
('2912', 'Phú Phụng', '30', 'Xã', 'KV1'),
('2913', 'Chợ Lách', '30', 'Xã', 'KV1'),
('2914', 'Vĩnh Thành', '30', 'Xã', 'KV1'),
('2915', 'Hưng Khánh Trung', '30', 'Xã', 'KV1'),
('2916', 'Phước Mỹ Trung', '30', 'Xã', 'KV1'),
('2917', 'Tân Thành Bình', '30', 'Xã', 'KV1'),
('2918', 'Nhuận Phú Tân', '30', 'Xã', 'KV1'),
('2919', 'Đồng Khởi', '30', 'Xã', 'KV1'),
('2920', 'Mỏ Cày', '30', 'Xã', 'KV1'),
('2921', 'Thành Thới', '30', 'Xã', 'KV1'),
('2922', 'An Định', '30', 'Xã', 'KV1'),
('2923', 'Hương Mỹ', '30', 'Xã', 'KV1'),
('2924', 'Đại Điền', '30', 'Xã', 'KV1'),
('2925', 'Quới Điền', '30', 'Xã', 'KV1'),
('2926', 'Thạnh Phú', '30', 'Xã', 'KV1'),
('2927', 'An Qui', '30', 'Xã', 'KV1'),
('2928', 'Thạnh Hải', '30', 'Xã', 'KV1'),
('2929', 'Thạnh Phong', '30', 'Xã', 'KV1'),
('2930', 'Tân Thủy', '30', 'Xã', 'KV1'),
('2931', 'Bảo Thạnh', '30', 'Xã', 'KV1'),
('2932', 'Ba Tri', '30', 'Xã', 'KV1'),
('2933', 'Tân Xuân', '30', 'Xã', 'KV1'),
('2934', 'Mỹ Chánh Hòa', '30', 'Xã', 'KV1'),
('2935', 'An Ngãi Trung', '30', 'Xã', 'KV1'),
('2936', 'An Hiệp', '30', 'Xã', 'KV1'),
('2937', 'Hưng Nhượng', '30', 'Xã', 'KV1'),
('2938', 'Giồng Trôm', '30', 'Xã', 'KV1'),
('2939', 'Tân Hào', '30', 'Xã', 'KV1'),
('2940', 'Phước Long', '30', 'Xã', 'KV1'),
('2941', 'Lương Phú', '30', 'Xã', 'KV1'),
('2942', 'Châu Hòa', '30', 'Xã', 'KV1'),
('2943', 'Lương Hòa', '30', 'Xã', 'KV1'),
('2944', 'Thới Thuận', '30', 'Xã', 'KV1'),
('2945', 'Thạnh Phước', '30', 'Xã', 'KV1'),
('2946', 'Bình Đại', '30', 'Xã', 'KV1'),
('2947', 'Thạnh Trị', '30', 'Xã', 'KV1'),
('2948', 'Lộc Thuận', '30', 'Xã', 'KV1'),
('2949', 'Châu Hưng', '30', 'Xã', 'KV1'),
('2950', 'Phú Thuận', '30', 'Xã', 'KV1'),
('2951', 'Mỹ Tho', '31', 'Phường', 'KV1'),
('2952', 'Đạo Thạnh', '31', 'Phường', 'KV1'),
('2953', 'Mỹ Phong', '31', 'Phường', 'KV1'),
('2954', 'Thới Sơn', '31', 'Phường', 'KV1'),
('2955', 'Trung An', '31', 'Phường', 'KV1'),
('2956', 'Gò Công', '31', 'Phường', 'KV1'),
('2957', 'Long Thuận', '31', 'Phường', 'KV1'),
('2958', 'Sơn Qui', '31', 'Phường', 'KV1'),
('2959', 'Bình Xuân', '31', 'Phường', 'KV1'),
('2960', 'Mỹ Phước Tây', '31', 'Phường', 'KV1'),
('2961', 'Thanh Hoà', '31', 'Phường', 'KV1'),
('2962', 'Cai Lậy', '31', 'Phường', 'KV1'),
('2963', 'Nhị Quý', '31', 'Phường', 'KV1'),
('2964', 'Tân Phú', '31', 'Xã', 'KV1'),
('2965', 'Thanh Hưng', '31', 'Xã', 'KV1'),
('2966', 'An Hữu', '31', 'Xã', 'KV1'),
('2967', 'Mỹ Lợi', '31', 'Xã', 'KV1'),
('2968', 'Mỹ Đức Tây', '31', 'Xã', 'KV1'),
('2969', 'Mỹ Thiện', '31', 'Xã', 'KV1'),
('2970', 'Hậu Mỹ', '31', 'Xã', 'KV1'),
('2971', 'Hội Cư', '31', 'Xã', 'KV1'),
('2972', 'Cái Bè', '31', 'Xã', 'KV1'),
('2973', 'Bình Phú', '31', 'Xã', 'KV1'),
('2974', 'Hiệp Đức', '31', 'Xã', 'KV1'),
('2975', 'Ngũ Hiệp', '31', 'Xã', 'KV1'),
('2976', 'Long Tiên', '31', 'Xã', 'KV1'),
('2977', 'Mỹ Thành', '31', 'Xã', 'KV1'),
('2978', 'Thạnh Phú', '31', 'Xã', 'KV1'),
('2979', 'Tân Phước 1', '31', 'Xã', 'KV1'),
('2980', 'Tân Phước 2', '31', 'Xã', 'KV1'),
('2981', 'Tân Phước 3', '31', 'Xã', 'KV1'),
('2982', 'Hưng Thạnh', '31', 'Xã', 'KV1'),
('2983', 'Tân Hương', '31', 'Xã', 'KV1'),
('2984', 'Châu Thành', '31', 'Xã', 'KV1'),
('2985', 'Long Hưng', '31', 'Xã', 'KV1'),
('2986', 'Long Định', '31', 'Xã', 'KV1'),
('2987', 'Vĩnh Kim', '31', 'Xã', 'KV1'),
('2988', 'Kim Sơn', '31', 'Xã', 'KV1'),
('2989', 'Bình Trưng', '31', 'Xã', 'KV1'),
('2990', 'Mỹ Tịnh An', '31', 'Xã', 'KV1'),
('2991', 'Lương Hoà Lạc', '31', 'Xã', 'KV1'),
('2992', 'Tân Thuận Bình', '31', 'Xã', 'KV1'),
('2993', 'Chợ Gạo', '31', 'Xã', 'KV1'),
('2994', 'An Thạnh Thủy', '31', 'Xã', 'KV1'),
('2995', 'Bình Ninh', '31', 'Xã', 'KV1'),
('2996', 'Vĩnh Bình', '31', 'Xã', 'KV1'),
('2997', 'Đồng Sơn', '31', 'Xã', 'KV1'),
('2998', 'Phú Thành', '31', 'Xã', 'KV1'),
('2999', 'Long Bình', '31', 'Xã', 'KV1'),
('3000', 'Vĩnh Hựu', '31', 'Xã', 'KV1'),
('3001', 'Gò Công Đông', '31', 'Xã', 'KV1'),
('3002', 'Tân Điền', '31', 'Xã', 'KV1'),
('3003', 'Tân Hoà', '31', 'Xã', 'KV1'),
('3004', 'Tân Đông', '31', 'Xã', 'KV1'),
('3005', 'Gia Thuận', '31', 'Xã', 'KV1'),
('3006', 'Tân Thới', '31', 'Xã', 'KV1'),
('3007', 'Tân Phú Đông', '31', 'Xã', 'KV1'),
('3008', 'Tân Hồng', '31', 'Xã', 'KV1'),
('3009', 'Tân Thành', '31', 'Xã', 'KV1'),
('3010', 'Tân Hộ Cơ', '31', 'Xã', 'KV1'),
('3011', 'An Phước', '31', 'Xã', 'KV1'),
('3012', 'An Bình', '31', 'Phường', 'KV1'),
('3013', 'Hồng Ngự', '31', 'Phường', 'KV1'),
('3014', 'Thường Lạc', '31', 'Phường', 'KV1'),
('3015', 'Thường Phước', '31', 'Xã', 'KV1'),
('3016', 'Long Khánh', '31', 'Xã', 'KV1'),
('3017', 'Long Phú Thuận', '31', 'Xã', 'KV1'),
('3018', 'An Hoà', '31', 'Xã', 'KV1'),
('3019', 'Tam Nông', '31', 'Xã', 'KV1'),
('3020', 'Phú Thọ', '31', 'Xã', 'KV1'),
('3021', 'Tràm Chim', '31', 'Xã', 'KV1'),
('3022', 'Phú Cường', '31', 'Xã', 'KV1'),
('3023', 'An Long', '31', 'Xã', 'KV1'),
('3024', 'Thanh Bình', '31', 'Xã', 'KV1'),
('3025', 'Tân Thạnh', '31', 'Xã', 'KV1'),
('3026', 'Bình Thành', '31', 'Xã', 'KV1'),
('3027', 'Tân Long', '31', 'Xã', 'KV1'),
('3028', 'Tháp Mười', '31', 'Xã', 'KV1'),
('3029', 'Thanh Mỹ', '31', 'Xã', 'KV1'),
('3030', 'Mỹ Quí', '31', 'Xã', 'KV1'),
('3031', 'Đốc Binh Kiều', '31', 'Xã', 'KV1'),
('3032', 'Trường Xuân', '31', 'Xã', 'KV1'),
('3033', 'Phương Thịnh', '31', 'Xã', 'KV1'),
('3034', 'Phong Mỹ', '31', 'Xã', 'KV1'),
('3035', 'Ba Sao', '31', 'Xã', 'KV1'),
('3036', 'Mỹ Thọ', '31', 'Xã', 'KV1'),
('3037', 'Bình Hàng Trung', '31', 'Xã', 'KV1'),
('3038', 'Mỹ Hiệp', '31', 'Xã', 'KV1'),
('3039', 'Cao Lãnh', '31', 'Phường', 'KV1'),
('3040', 'Mỹ Ngãi', '31', 'Phường', 'KV1'),
('3041', 'Mỹ Trà', '31', 'Phường', 'KV1'),
('3042', 'Mỹ An Hưng', '31', 'Xã', 'KV1'),
('3043', 'Tân Khánh Trung', '31', 'Xã', 'KV1'),
('3044', 'Lấp Vò', '31', 'Xã', 'KV1'),
('3045', 'Lai Vung', '31', 'Xã', 'KV1'),
('3046', 'Hoà Long', '31', 'Xã', 'KV1'),
('3047', 'Phong Hoà', '31', 'Xã', 'KV1'),
('3048', 'Sa Đéc', '31', 'Phường', 'KV1'),
('3049', 'Tân Dương', '31', 'Xã', 'KV1'),
('3050', 'Phú Hựu', '31', 'Xã', 'KV1'),
('3051', 'Tân Nhuận Đông', '31', 'Xã', 'KV1'),
('3052', 'Tân Phú Trung', '31', 'Xã', 'KV1'),
('3053', 'Mỹ Hoà Hưng', '32', 'Xã', 'KV1'),
('3054', 'Long Xuyên', '32', 'Phường', 'KV1'),
('3055', 'Bình Đức', '32', 'Phường', 'KV1'),
('3056', 'Mỹ Thới', '32', 'Phường', 'KV1'),
('3057', 'Châu Đốc', '32', 'Phường', 'KV1'),
('3058', 'Vĩnh Tế', '32', 'Phường', 'KV1'),
('3059', 'An Phú', '32', 'Xã', 'KV1'),
('3060', 'Vĩnh Hậu', '32', 'Xã', 'KV1'),
('3061', 'Nhơn Hội', '32', 'Xã', 'KV1'),
('3062', 'Khánh Bình', '32', 'Xã', 'KV1'),
('3063', 'Phú Hữu', '32', 'Xã', 'KV1'),
('3064', 'Tân An', '32', 'Xã', 'KV1'),
('3065', 'Châu Phong', '32', 'Xã', 'KV1'),
('3066', 'Vĩnh Xương', '32', 'Xã', 'KV1'),
('3067', 'Tân Châu', '32', 'Phường', 'KV1'),
('3068', 'Long Phú', '32', 'Phường', 'KV1'),
('3069', 'Phú Tân', '32', 'Xã', 'KV1'),
('3070', 'Phú An', '32', 'Xã', 'KV1'),
('3071', 'Bình Thạnh Đông', '32', 'Xã', 'KV1'),
('3072', 'Chợ Vàm', '32', 'Xã', 'KV1'),
('3073', 'Hoà Lạc', '32', 'Xã', 'KV1'),
('3074', 'Phú Lâm', '32', 'Xã', 'KV1'),
('3075', 'Châu Phú', '32', 'Xã', 'KV1'),
('3076', 'Mỹ Đức', '32', 'Xã', 'KV1'),
('3077', 'Vĩnh Thạnh Trung', '32', 'Xã', 'KV1'),
('3078', 'Bình Mỹ', '32', 'Xã', 'KV1'),
('3079', 'Thạnh Mỹ Tây', '32', 'Xã', 'KV1'),
('3080', 'An Cư', '32', 'Xã', 'KV1'),
('3081', 'Núi Cấm', '32', 'Xã', 'KV1'),
('3082', 'Tịnh Biên', '32', 'Phường', 'KV1'),
('3083', 'Thới Sơn', '32', 'Phường', 'KV1'),
('3084', 'Chi Lăng', '32', 'Phường', 'KV1'),
('3085', 'Ba Chúc', '32', 'Xã', 'KV1'),
('3086', 'Tri Tôn', '32', 'Xã', 'KV1'),
('3087', 'Ô Lâm', '32', 'Xã', 'KV1'),
('3088', 'Cô Tô', '32', 'Xã', 'KV1'),
('3089', 'Vĩnh Gia', '32', 'Xã', 'KV1'),
('3090', 'An Châu', '32', 'Xã', 'KV1'),
('3091', 'Bình Hoà', '32', 'Xã', 'KV1'),
('3092', 'Cần Đăng', '32', 'Xã', 'KV1'),
('3093', 'Vĩnh Hanh', '32', 'Xã', 'KV1'),
('3094', 'Vĩnh An', '32', 'Xã', 'KV1'),
('3095', 'Chợ Mới', '32', 'Xã', 'KV1'),
('3096', 'Cù Lao Giêng', '32', 'Xã', 'KV1'),
('3097', 'Hội An', '32', 'Xã', 'KV1'),
('3098', 'Long Điền', '32', 'Xã', 'KV1'),
('3099', 'Nhơn Mỹ', '32', 'Xã', 'KV1'),
('3100', 'Long Kiến', '32', 'Xã', 'KV1'),
('3101', 'Thoại Sơn', '32', 'Xã', 'KV1'),
('3102', 'Óc Eo', '32', 'Xã', 'KV1'),
('3103', 'Định Mỹ', '32', 'Xã', 'KV1'),
('3104', 'Phú Hoà', '32', 'Xã', 'KV1'),
('3105', 'Vĩnh Trạch', '32', 'Xã', 'KV1'),
('3106', 'Tây Phú', '32', 'Xã', 'KV1'),
('3107', 'Vĩnh Bình', '32', 'Xã', 'KV1'),
('3108', 'Vĩnh Thuận', '32', 'Xã', 'KV1'),
('3109', 'Vĩnh Phong', '32', 'Xã', 'KV1'),
('3110', 'Vĩnh Hoà', '32', 'Xã', 'KV1'),
('3111', 'U Minh Thượng', '32', 'Xã', 'KV1'),
('3112', 'Đông Hoà', '32', 'Xã', 'KV1'),
('3113', 'Tân Thạnh', '32', 'Xã', 'KV1'),
('3114', 'Đông Hưng', '32', 'Xã', 'KV1'),
('3115', 'An Minh', '32', 'Xã', 'KV1'),
('3116', 'Vân Khánh', '32', 'Xã', 'KV1'),
('3117', 'Tây Yên', '32', 'Xã', 'KV1'),
('3118', 'Đông Thái', '32', 'Xã', 'KV1'),
('3119', 'An Biên', '32', 'Xã', 'KV1'),
('3120', 'Định Hoà', '32', 'Xã', 'KV1'),
('3121', 'Gò Quao', '32', 'Xã', 'KV1'),
('3122', 'Vĩnh Hoà Hưng', '32', 'Xã', 'KV1'),
('3123', 'Vĩnh Tuy', '32', 'Xã', 'KV1'),
('3124', 'Giồng Riềng', '32', 'Xã', 'KV1'),
('3125', 'Thạnh Hưng', '32', 'Xã', 'KV1'),
('3126', 'Long Thạnh', '32', 'Xã', 'KV1'),
('3127', 'Hoà Hưng', '32', 'Xã', 'KV1'),
('3128', 'Ngọc Chúc', '32', 'Xã', 'KV1'),
('3129', 'Hoà Thuận', '32', 'Xã', 'KV1'),
('3130', 'Tân Hội', '32', 'Xã', 'KV1'),
('3131', 'Tân Hiệp', '32', 'Xã', 'KV1'),
('3132', 'Thạnh Đông', '32', 'Xã', 'KV1'),
('3133', 'Thạnh Lộc', '32', 'Xã', 'KV1'),
('3134', 'Châu Thành', '32', 'Xã', 'KV1'),
('3135', 'Bình An', '32', 'Xã', 'KV1'),
('3136', 'Hòn Đất', '32', 'Xã', 'KV1'),
('3137', 'Sơn Kiên', '32', 'Xã', 'KV1'),
('3138', 'Mỹ Thuận', '32', 'Xã', 'KV1'),
('3139', 'Bình Sơn', '32', 'Xã', 'KV1'),
('3140', 'Bình Giang', '32', 'Xã', 'KV1'),
('3141', 'Giang Thành', '32', 'Xã', 'KV1'),
('3142', 'Vĩnh Điều', '32', 'Xã', 'KV1'),
('3143', 'Hoà Điền', '32', 'Xã', 'KV1'),
('3144', 'Kiên Lương', '32', 'Xã', 'KV1'),
('3145', 'Sơn Hải', '32', 'Xã', 'KV1'),
('3146', 'Hòn Nghệ', '32', 'Xã', 'KV1'),
('3147', 'khu Kiên Hải', '32', 'Xã', 'KV1'),
('3148', 'Vĩnh Thông', '32', 'Phường', 'KV1'),
('3149', 'Rạch Giá', '32', 'Phường', 'KV1'),
('3150', 'Hà Tiên', '32', 'Phường', 'KV1'),
('3151', 'Tô Châu', '32', 'Phường', 'KV1'),
('3152', 'Tiên Hải', '32', 'Xã', 'KV1'),
('3153', 'khu Phú Quốc', '32', 'Xã', 'KV1'),
('3154', 'khu Thổ Châu', '32', 'Xã', 'KV1'),
('3155', 'Ninh Kiều', '33', 'Phường', 'KV1'),
('3156', 'Cái Khế', '33', 'Phường', 'KV1'),
('3157', 'Tân An', '33', 'Phường', 'KV1'),
('3158', 'An Bình', '33', 'Phường', 'KV1'),
('3159', 'Thới An Đông', '33', 'Phường', 'KV1'),
('3160', 'Bình Thủy', '33', 'Phường', 'KV1'),
('3161', 'Long Tuyền', '33', 'Phường', 'KV1'),
('3162', 'Cái Răng', '33', 'Phường', 'KV1'),
('3163', 'Hưng Phú', '33', 'Phường', 'KV1'),
('3164', 'Ô Môn', '33', 'Phường', 'KV1'),
('3165', 'Thới Long', '33', 'Phường', 'KV1'),
('3166', 'Phước Thới', '33', 'Phường', 'KV1'),
('3167', 'Trung Nhứt', '33', 'Phường', 'KV1'),
('3168', 'Thốt Nốt', '33', 'Phường', 'KV1'),
('3169', 'Thuận Hưng', '33', 'Phường', 'KV1'),
('3170', 'Tân Lộc', '33', 'Phường', 'KV1'),
('3171', 'Phong Điền', '33', 'Xã', 'KV1'),
('3172', 'Nhơn Ái', '33', 'Xã', 'KV1'),
('3173', 'Trường Long', '33', 'Xã', 'KV1'),
('3174', 'Thới Lai', '33', 'Xã', 'KV1'),
('3175', 'Đông Thuận', '33', 'Xã', 'KV1'),
('3176', 'Trường Xuân', '33', 'Xã', 'KV1'),
('3177', 'Trường Thành', '33', 'Xã', 'KV1'),
('3178', 'Cờ Đỏ', '33', 'Xã', 'KV1'),
('3179', 'Đông Hiệp', '33', 'Xã', 'KV1'),
('3180', 'Thạnh Phú', '33', 'Xã', 'KV1'),
('3181', 'Thới Hưng', '33', 'Xã', 'KV1'),
('3182', 'Trung Hưng', '33', 'Xã', 'KV1'),
('3183', 'Vĩnh Thạnh', '33', 'Xã', 'KV1'),
('3184', 'Vĩnh Trinh', '33', 'Xã', 'KV1'),
('3185', 'Thạnh An', '33', 'Xã', 'KV1'),
('3186', 'Thạnh Quới', '33', 'Xã', 'KV1'),
('3187', 'Hỏa Lựu', '33', 'Xã', 'KV1'),
('3188', 'Vị Thanh', '33', 'Phường', 'KV1'),
('3189', 'Vị Tân', '33', 'Phường', 'KV1'),
('3190', 'Vị Thủy', '33', 'Xã', 'KV1'),
('3191', 'Vĩnh Thuận Đông', '33', 'Xã', 'KV1'),
('3192', 'Vị Thanh 1', '33', 'Xã', 'KV1'),
('3193', 'Vĩnh Tường', '33', 'Xã', 'KV1'),
('3194', 'Vĩnh Viễn', '33', 'Xã', 'KV1'),
('3195', 'Xà Phiên', '33', 'Xã', 'KV1'),
('3196', 'Lương Tâm', '33', 'Xã', 'KV1'),
('3197', 'Long Bình', '33', 'Phường', 'KV1'),
('3198', 'Long Mỹ', '33', 'Phường', 'KV1'),
('3199', 'Long Phú 1', '33', 'Phường', 'KV1'),
('3200', 'Thạnh Xuân', '33', 'Xã', 'KV1'),
('3201', 'Tân Hoà', '33', 'Xã', 'KV1'),
('3202', 'Trường Long Tây', '33', 'Xã', 'KV1'),
('3203', 'Châu Thành', '33', 'Xã', 'KV1'),
('3204', 'Đông Phước', '33', 'Xã', 'KV1'),
('3205', 'Phú Hữu', '33', 'Xã', 'KV1'),
('3206', 'Đại Thành', '33', 'Phường', 'KV1'),
('3207', 'Ngã Bảy', '33', 'Phường', 'KV1'),
('3208', 'Tân Bình', '33', 'Xã', 'KV1'),
('3209', 'Hoà An', '33', 'Xã', 'KV1'),
('3210', 'Phương Bình', '33', 'Xã', 'KV1'),
('3211', 'Tân Phước Hưng', '33', 'Xã', 'KV1'),
('3212', 'Hiệp Hưng', '33', 'Xã', 'KV1'),
('3213', 'Phụng Hiệp', '33', 'Xã', 'KV1'),
('3214', 'Thạnh Hoà', '33', 'Xã', 'KV1'),
('3215', 'Phú Lợi', '33', 'Phường', 'KV1'),
('3216', 'Sóc Trăng', '33', 'Phường', 'KV1'),
('3217', 'Mỹ Xuyên', '33', 'Phường', 'KV1'),
('3218', 'Hoà Tú', '33', 'Xã', 'KV1'),
('3219', 'Gia Hoà', '33', 'Xã', 'KV1'),
('3220', 'Nhu Gia', '33', 'Xã', 'KV1'),
('3221', 'Ngọc Tố', '33', 'Xã', 'KV1'),
('3222', 'Trường Khánh', '33', 'Xã', 'KV1'),
('3223', 'Đại Ngãi', '33', 'Xã', 'KV1'),
('3224', 'Tân Thạnh', '33', 'Xã', 'KV1'),
('3225', 'Long Phú', '33', 'Xã', 'KV1'),
('3226', 'Nhơn Mỹ', '33', 'Xã', 'KV1'),
('3227', 'Phong Nẫm', '33', 'Xã', 'KV1'),
('3228', 'An Lạc Thôn', '33', 'Xã', 'KV1'),
('3229', 'Kế Sách', '33', 'Xã', 'KV1'),
('3230', 'Thới An Hội', '33', 'Xã', 'KV1'),
('3231', 'Đại Hải', '33', 'Xã', 'KV1'),
('3232', 'Phú Tâm', '33', 'Xã', 'KV1'),
('3233', 'An Ninh', '33', 'Xã', 'KV1'),
('3234', 'Thuận Hoà', '33', 'Xã', 'KV1'),
('3235', 'Hồ Đắc Kiện', '33', 'Xã', 'KV1'),
('3236', 'Mỹ Tú', '33', 'Xã', 'KV1'),
('3237', 'Long Hưng', '33', 'Xã', 'KV1'),
('3238', 'Mỹ Phước', '33', 'Xã', 'KV1'),
('3239', 'Mỹ Hương', '33', 'Xã', 'KV1'),
('3240', 'Vĩnh Hải', '33', 'Xã', 'KV1'),
('3241', 'Lai Hoà', '33', 'Xã', 'KV1'),
('3242', 'Vĩnh Phước', '33', 'Phường', 'KV1'),
('3243', 'Vĩnh Châu', '33', 'Phường', 'KV1'),
('3244', 'Khánh Hoà', '33', 'Phường', 'KV1'),
('3245', 'Tân Long', '33', 'Xã', 'KV1'),
('3246', 'Ngã Năm', '33', 'Phường', 'KV1'),
('3247', 'Mỹ Quới', '33', 'Phường', 'KV1'),
('3248', 'Phú Lộc', '33', 'Xã', 'KV1'),
('3249', 'Vĩnh Lợi', '33', 'Xã', 'KV1'),
('3250', 'Lâm Tân', '33', 'Xã', 'KV1'),
('3251', 'Thạnh Thới An', '33', 'Xã', 'KV1'),
('3252', 'Tài Văn', '33', 'Xã', 'KV1'),
('3253', 'Liêu Tú', '33', 'Xã', 'KV1'),
('3254', 'Lịch Hội Thượng', '33', 'Xã', 'KV1'),
('3255', 'Trần Đề', '33', 'Xã', 'KV1'),
('3256', 'An Thạnh', '33', 'Xã', 'KV1'),
('3257', 'Cù Lao Dung', '33', 'Xã', 'KV1'),
('3258', 'An Xuyên', '34', 'Phường', 'KV1'),
('3259', 'Lý Văn Lâm', '34', 'Phường', 'KV1'),
('3260', 'Tân Thành', '34', 'Phường', 'KV1'),
('3261', 'Hòa Thành', '34', 'Phường', 'KV1'),
('3262', 'Tân Thuận', '34', 'Xã', 'KV1'),
('3263', 'Tân Tiến', '34', 'Xã', 'KV1'),
('3264', 'Tạ An Khương', '34', 'Xã', 'KV1'),
('3265', 'Trần Phán', '34', 'Xã', 'KV1'),
('3266', 'Thanh Tùng', '34', 'Xã', 'KV1'),
('3267', 'Đầm Dơi', '34', 'Xã', 'KV1'),
('3268', 'Quách Phẩm', '34', 'Xã', 'KV1'),
('3269', 'U Minh', '34', 'Xã', 'KV1'),
('3270', 'Nguyễn Phích', '34', 'Xã', 'KV1'),
('3271', 'Khánh Lâm', '34', 'Xã', 'KV1'),
('3272', 'Khánh An', '34', 'Xã', 'KV1'),
('3273', 'Phan Ngọc Hiển', '34', 'Xã', 'KV1'),
('3274', 'Đất Mũi', '34', 'Xã', 'KV1'),
('3275', 'Tân Ân', '34', 'Xã', 'KV1'),
('3276', 'Khánh Bình', '34', 'Xã', 'KV1'),
('3277', 'Đá Bạc', '34', 'Xã', 'KV1'),
('3278', 'Khánh Hưng', '34', 'Xã', 'KV1'),
('3279', 'Sông Đốc', '34', 'Xã', 'KV1'),
('3280', 'Trần Văn Thời', '34', 'Xã', 'KV1'),
('3281', 'Thới Bình', '34', 'Xã', 'KV1'),
('3282', 'Trí Phải', '34', 'Xã', 'KV1'),
('3283', 'Tân Lộc', '34', 'Xã', 'KV1'),
('3284', 'Hồ Thị Kỷ', '34', 'Xã', 'KV1'),
('3285', 'Biển Bạch', '34', 'Xã', 'KV1'),
('3286', 'Đất Mới', '34', 'Xã', 'KV1'),
('3287', 'Năm Căn', '34', 'Xã', 'KV1'),
('3288', 'Tam Giang', '34', 'Xã', 'KV1'),
('3289', 'Cái Đôi Vàm', '34', 'Xã', 'KV1'),
('3290', 'Nguyễn Việt Khái', '34', 'Xã', 'KV1'),
('3291', 'Phú Tân', '34', 'Xã', 'KV1'),
('3292', 'Phú Mỹ', '34', 'Xã', 'KV1'),
('3293', 'Lương Thế Trân', '34', 'Xã', 'KV1'),
('3294', 'Tân Hưng', '34', 'Xã', 'KV1'),
('3295', 'Hưng Mỹ', '34', 'Xã', 'KV1'),
('3296', 'Cái Nước', '34', 'Xã', 'KV1'),
('3297', 'Bạc Liêu', '34', 'Phường', 'KV1'),
('3298', 'Vĩnh Trạch', '34', 'Phường', 'KV1'),
('3299', 'Hiệp Thành', '34', 'Phường', 'KV1'),
('3300', 'Giá Rai', '34', 'Phường', 'KV1'),
('3301', 'Láng Tròn', '34', 'Phường', 'KV1'),
('3302', 'Phong Thạnh', '34', 'Xã', 'KV1'),
('3303', 'Hồng Dân', '34', 'Xã', 'KV1'),
('3304', 'Vĩnh Lộc', '34', 'Xã', 'KV1'),
('3305', 'Ninh Thạnh Lợi', '34', 'Xã', 'KV1'),
('3306', 'Ninh Quới', '34', 'Xã', 'KV1'),
('3307', 'Gành Hào', '34', 'Xã', 'KV1'),
('3308', 'Định Thành', '34', 'Xã', 'KV1'),
('3309', 'An Trạch', '34', 'Xã', 'KV1'),
('3310', 'Long Điền', '34', 'Xã', 'KV1'),
('3311', 'Đông Hải', '34', 'Xã', 'KV1'),
('3312', 'Hoà Bình', '34', 'Xã', 'KV1'),
('3313', 'Vĩnh Mỹ', '34', 'Xã', 'KV1'),
('3314', 'Vĩnh Hậu', '34', 'Xã', 'KV1'),
('3315', 'Phước Long', '34', 'Xã', 'KV1'),
('3316', 'Vĩnh Phước', '34', 'Xã', 'KV1'),
('3317', 'Phong Hiệp', '34', 'Xã', 'KV1'),
('3318', 'Vĩnh Thanh', '34', 'Xã', 'KV1'),
('3319', 'Vĩnh Lợi', '34', 'Xã', 'KV1'),
('3320', 'Hưng Hội', '34', 'Xã', 'KV1'),
('3321', 'Châu Thới', '34', 'Xã', 'KV1');

-- INSERT DATA - Đối tượng ưu tiên (Priority Objects)
-- =====================================================
INSERT INTO "DOITUONG" ("MaDoiTuong", "TenDoiTuong", "TiLeGiamHocPhi", "DoUuTien", "MoTa") VALUES
('DT01', 'Con liệt sĩ', 100.0, 1, 'Miễn 100% học phí'),
('DT02', 'Con thương binh, bệnh binh (mất sức lao động từ 81% trở lên)', 80.0, 2, 'Giảm 80% học phí'),
('DT03', 'Con thương binh, bệnh binh (mất sức lao động từ 61% đến 80%)', 70.0, 3, 'Giảm 70% học phí'),
('DT04', 'Hộ nghèo', 70.0, 4, 'Giảm 70% học phí'),
('DT05', 'Mồ côi cả cha lẫn mẹ, không nơi nương tựa', 70.0, 5, 'Giảm 70% học phí'),
('DT06', 'Vùng sâu vùng xa (KV3 + Dân tộc thiểu số)', 50.0, 6, 'Giảm 50% HP - Sinh viên thuộc khu vực KV3 VÀ là dân tộc thiểu số'),
('DT07', 'Hộ cận nghèo', 50.0, 7, 'Giảm 50% học phí'),
('DT08', 'Dân tộc thiểu số vùng đặc biệt khó khăn', 50.0, 8, 'Giảm 50% học phí'),
('DT09', 'Dân tộc thiểu số', 30.0, 9, 'Giảm 30% học phí'),
('DT10', 'Mồ côi cha hoặc mẹ', 30.0, 10, 'Giảm 30% học phí'),
('DT11', 'Khuyết tật', 50.0, 11, 'Giảm 50% học phí'),
('DT12', 'Con thương binh (mất sức lao động từ 21% đến 60%)', 30.0, 12, 'Giảm 30% học phí');

-- =====================================================
-- INSERT DATA - Tiết học (Class Periods)
-- Thứ 2 - Thứ 7, Tiết 1-10 và Buổi tối
-- Ghi chú:
--   - Giờ nghỉ giải lao: 10:30-10:45 (giữa Tiết 4 và Tiết 5)
--   - Giờ nghỉ trưa: 11:30-13:00 (giữa Tiết 5 và Tiết 6)
--   - Giờ nghỉ chiều: 15:15-15:30 (giữa Tiết 8 và Tiết 9)
-- =====================================================
INSERT INTO "TIETHOC" ("MaTiet", "TenTiet", "GioBatDau", "GioKetThuc", "ThuTu", "MoTa") VALUES
('T1', 'Tiết 1', '07:30:00', '08:15:00', 1, 'Tiết 1 (7:30 - 8:15)'),
('T2', 'Tiết 2', '08:15:00', '09:00:00', 2, 'Tiết 2 (8:15 - 9:00)'),
('T3', 'Tiết 3', '09:00:00', '09:45:00', 3, 'Tiết 3 (9:00 - 9:45)'),
('T4', 'Tiết 4', '09:45:00', '10:30:00', 4, 'Tiết 4 (9:45 - 10:30)'),
-- Nghỉ giải lao: 10:30-10:45
('T5', 'Tiết 5', '10:45:00', '11:30:00', 5, 'Tiết 5 (10:45 - 11:30)'),
-- Nghỉ trưa: 11:30-13:00
('T6', 'Tiết 6', '13:00:00', '13:45:00', 6, 'Tiết 6 (13:00 - 13:45)'),
('T7', 'Tiết 7', '13:45:00', '14:30:00', 7, 'Tiết 7 (13:45 - 14:30)'),
('T8', 'Tiết 8', '14:30:00', '15:15:00', 8, 'Tiết 8 (14:30 - 15:15)'),
-- Nghỉ giải lao: 15:15-15:30
('T9', 'Tiết 9', '15:30:00', '16:15:00', 9, 'Tiết 9 (15:30 - 16:15)'),
('T10', 'Tiết 10', '16:15:00', '17:00:00', 10, 'Tiết 10 (16:15 - 17:00)'),
('TOI', 'Buổi tối', '17:45:00', '20:45:00', 11, 'Buổi tối (17:45 - 20:45)');

-- =====================================================
-- INSERT DATA - Tham số hệ thống
-- =====================================================
INSERT INTO "THAMSO" (
    id,
    "SoTinChiDangKyToiThieu",
    "SoTinChiDangKyToiDa",
    "SoTinChiDangKyToiDaKhiVuot",
    "DanhSachMonAnhVanBatBuoc",
    "NamKiemTraAnhVan",
    "GioiHanTinChiChuaDatAnhVan",
    "GioiHanTinChiNoKhoaLuan"
) VALUES (1, 14, 24, 30, 'ENG01,ENG02,ENG03', 2, 14, 8);

-- =====================================================
-- INSERT DATA - Nhóm người dùng, chức năng và phân quyền
-- =====================================================
INSERT INTO "NHOMNGUOIDUNG" ("MaNhom", "TenNhom") VALUES
('ADMIN', 'Admin hệ thống'),
('ADMIN_DAOTAO', 'Quản trị viên đào tạo'),
('ADMIN_TAICHINH', 'Quản trị viên tài chính'),
('SINHVIEN', 'Sinh viên');

INSERT INTO "CHUCNANG" ("MaChucNang", "TenChucNang", "TenManHinhDuocLoad") VALUES
('ADMIN_DASHBOARD', 'Bảng điều khiển quản trị', '/admin/dashboard'),
('ADMIN_STUDENTS', 'Quản lý sinh viên', '/admin/students'),
('ADMIN_LOCATIONS', 'Quản lý địa danh', '/admin/locations'),
('ADMIN_COURSES', 'Quản lý môn học', '/admin/courses'),
('ADMIN_OPEN_COURSES', 'Quản lý môn học mở', '/admin/open-courses'),
('ADMIN_CLASSES', 'Quản lý lớp học', '/admin/classes'),
('ADMIN_ROOMS', 'Quản lý phòng học', '/admin/rooms'),
('ADMIN_LECTURERS', 'Quản lý giảng viên', '/admin/lecturers'),
('ADMIN_SEMESTERS', 'Quản lý học kỳ', '/admin/semesters'),
('ADMIN_ACAD_YEARS', 'Quản lý năm học', '/admin/academic-years'),
('ADMIN_PERIODS', 'Quản lý tiết học', '/admin/periods'),
('ADMIN_PREREQ', 'Quản lý ràng buộc môn học', '/admin/prerequisites'),
('ADMIN_REGS', 'Quản lý đăng ký môn học', '/admin/registrations'),
('ADMIN_APPEALS', 'Duyệt đơn cứu xét đăng ký', '/admin/appeals'),
('ADMIN_TUITION', 'Quản lý học phí', '/admin/tuition'),
('ADMIN_PAYMENTS', 'Quản lý phiếu thu', '/admin/payments'),
('ADMIN_REPORTS', 'Báo cáo thống kê', '/admin/reports'),
('ADMIN_USERS', 'Quản lý người dùng', '/admin/users'),
('ADMIN_FACULTIES', 'Quản lý khoa', '/admin/faculties'),
('ADMIN_MAJORS', 'Quản lý ngành học', '/admin/majors'),
('ADMIN_CURRICULUM', 'Quản lý chương trình học', '/admin/curriculum-programs'),
('ADMIN_COMPLETED', 'Quản lý môn đã học', '/admin/completed-courses'),
('ADMIN_PRICING', 'Quản lý đơn giá tín chỉ', '/admin/pricing'),
('ADMIN_BENEFICIARIES', 'Quản lý đối tượng ưu tiên', '/admin/beneficiaries'),
('ADMIN_PERMISSIONS', 'Phân quyền hệ thống', '/admin/permissions'),
('ADMIN_NOTIFICATIONS', 'Quản lý thông báo', '/admin/notifications'),
('ADMIN_SETTINGS', 'Tham số hệ thống', '/admin/settings'),
('ADMIN_TRASH', 'Thùng rác dữ liệu', '/admin/trash'),
('ADMIN_PROFILE', 'Hồ sơ quản trị viên', '/admin/profile'),
('STUDENT_DASHBOARD', 'Bảng điều khiển sinh viên', '/student/dashboard'),
('STUDENT_REGISTRATION', 'Đăng ký học phần', '/student/course-registration'),
('STUDENT_MY_COURSES', 'Phiếu đăng ký học phần', '/student/my-courses'),
('STUDENT_COMPLETED', 'Môn đã học của sinh viên', '/student/completed-courses'),
('STUDENT_TUITION', 'Học phí của sinh viên', '/student/my-tuition'),
('STUDENT_PAYMENTS', 'Lịch sử thanh toán', '/student/my-payments'),
('STUDENT_SCHEDULE', 'Thời khóa biểu', '/student/my-schedule'),
('STUDENT_PROFILE', 'Hồ sơ sinh viên', '/student/profile'),
('STUDENT_NOTIFICATIONS', 'Thông báo sinh viên', '/student/notifications'),
('STUDENT_CURRICULUM', 'Chương trình đào tạo', '/student/curriculum');

INSERT INTO "PHANQUYEN" ("MaNhom", "MaChucNang") VALUES
('ADMIN', 'ADMIN_DASHBOARD'),
('ADMIN', 'ADMIN_STUDENTS'),
('ADMIN', 'ADMIN_LOCATIONS'),
('ADMIN', 'ADMIN_COURSES'),
('ADMIN', 'ADMIN_OPEN_COURSES'),
('ADMIN', 'ADMIN_CLASSES'),
('ADMIN', 'ADMIN_ROOMS'),
('ADMIN', 'ADMIN_LECTURERS'),
('ADMIN', 'ADMIN_SEMESTERS'),
('ADMIN', 'ADMIN_ACAD_YEARS'),
('ADMIN', 'ADMIN_PERIODS'),
('ADMIN', 'ADMIN_PREREQ'),
('ADMIN', 'ADMIN_REGS'),
('ADMIN', 'ADMIN_APPEALS'),
('ADMIN', 'ADMIN_TUITION'),
('ADMIN', 'ADMIN_PAYMENTS'),
('ADMIN', 'ADMIN_REPORTS'),
('ADMIN', 'ADMIN_USERS'),
('ADMIN', 'ADMIN_FACULTIES'),
('ADMIN', 'ADMIN_MAJORS'),
('ADMIN', 'ADMIN_CURRICULUM'),
('ADMIN', 'ADMIN_COMPLETED'),
('ADMIN', 'ADMIN_PRICING'),
('ADMIN', 'ADMIN_BENEFICIARIES'),
('ADMIN', 'ADMIN_PERMISSIONS'),
('ADMIN', 'ADMIN_NOTIFICATIONS'),
('ADMIN', 'ADMIN_SETTINGS'),
('ADMIN', 'ADMIN_TRASH'),
('ADMIN', 'ADMIN_PROFILE'),
('ADMIN_DAOTAO', 'ADMIN_DASHBOARD'),
('ADMIN_DAOTAO', 'ADMIN_LOCATIONS'),
('ADMIN_DAOTAO', 'ADMIN_STUDENTS'),
('ADMIN_DAOTAO', 'ADMIN_COURSES'),
('ADMIN_DAOTAO', 'ADMIN_OPEN_COURSES'),
('ADMIN_DAOTAO', 'ADMIN_CLASSES'),
('ADMIN_DAOTAO', 'ADMIN_ROOMS'),
('ADMIN_DAOTAO', 'ADMIN_LECTURERS'),
('ADMIN_DAOTAO', 'ADMIN_SEMESTERS'),
('ADMIN_DAOTAO', 'ADMIN_ACAD_YEARS'),
('ADMIN_DAOTAO', 'ADMIN_PERIODS'),
('ADMIN_DAOTAO', 'ADMIN_PREREQ'),
('ADMIN_DAOTAO', 'ADMIN_REGS'),
('ADMIN_DAOTAO', 'ADMIN_APPEALS'),
('ADMIN_DAOTAO', 'ADMIN_FACULTIES'),
('ADMIN_DAOTAO', 'ADMIN_MAJORS'),
('ADMIN_DAOTAO', 'ADMIN_CURRICULUM'),
('ADMIN_DAOTAO', 'ADMIN_COMPLETED'),
('ADMIN_DAOTAO', 'ADMIN_PROFILE'),
('ADMIN_TAICHINH', 'ADMIN_DASHBOARD'),
('ADMIN_TAICHINH', 'ADMIN_TUITION'),
('ADMIN_TAICHINH', 'ADMIN_PAYMENTS'),
('ADMIN_TAICHINH', 'ADMIN_REPORTS'),
('ADMIN_TAICHINH', 'ADMIN_PRICING'),
('ADMIN_TAICHINH', 'ADMIN_BENEFICIARIES'),
('ADMIN_TAICHINH', 'ADMIN_PROFILE'),
('SINHVIEN', 'STUDENT_DASHBOARD'),
('SINHVIEN', 'STUDENT_REGISTRATION'),
('SINHVIEN', 'STUDENT_MY_COURSES'),
('SINHVIEN', 'STUDENT_COMPLETED'),
('SINHVIEN', 'STUDENT_TUITION'),
('SINHVIEN', 'STUDENT_PAYMENTS'),
('SINHVIEN', 'STUDENT_SCHEDULE'),
('SINHVIEN', 'STUDENT_PROFILE'),
('SINHVIEN', 'STUDENT_NOTIFICATIONS'),
('SINHVIEN', 'STUDENT_CURRICULUM');

-- =====================================================
-- INSERT DATA - Khoa (Faculties)
-- =====================================================
INSERT INTO "KHOA" ("MaKhoa", "TenKhoa", "TenVietTat", "Sdt", "Email") VALUES
('CNTT', 'Khoa Công nghệ Thông tin', 'CNTT', '0283.8971234', 'cntt@uit.edu.vn'),
('KTMT', 'Khoa Kỹ thuật Máy tính', 'KTMT', '0283.8971235', 'ktmt@uit.edu.vn'),
('HTTT', 'Khoa Hệ thống Thông tin', 'HTTT', '0283.8971236', 'httt@uit.edu.vn'),
('KHMT', 'Khoa Khoa học Máy tính', 'KHMT', '0283.8971237', 'khmt@uit.edu.vn'),
('MMT', 'Khoa Mạng máy tính và Truyền thông', 'MMT&TT', '0283.8971238', 'mmt@uit.edu.vn'),
('KTTT', 'Khoa Kỹ thuật Thông tin', 'KTTT', '0283.8971239', 'kttt@uit.edu.vn'),
('CNPM', 'Khoa Công nghệ Phần mềm', 'CNPM', '0283.8971240', 'cnpm@uit.edu.vn');

-- =====================================================
-- INSERT DATA - Ngành học (Academic Programs)
-- Cập nhật theo chương trình đào tạo thực tế
-- =====================================================
INSERT INTO "NGANHHOC" ("MaNganh", "TenNganh", "MaKhoa", "SoTinChiToiThieu") VALUES
('KTPM', 'Kỹ thuật Phần mềm', 'CNPM', 130),
('KHMT', 'Khoa học Máy tính', 'KHMT', 126),
('HTTT', 'Hệ thống Thông tin', 'HTTT', 132),
('HTTT_TT', 'Hệ thống Thông tin Tiên tiến', 'HTTT', 130),
('MMT', 'Mạng máy tính và Truyền thông dữ liệu', 'MMT', 130),
('TMDT', 'Thương mại điện tử', 'HTTT', 125),
('ATTT', 'An toàn Thông tin', 'MMT', 129),
('KTMT', 'Kỹ thuật Máy tính', 'KTMT', 128),
('CNTT', 'Công nghệ Thông tin', 'CNTT', 125),
('CNTT_VN', 'Công nghệ Thông tin Việt Nhật', 'CNTT', 132),
('KHDL', 'Khoa học Dữ liệu', 'KTTT', 123),
('TTNT', 'Trí tuệ Nhân tạo', 'KHMT', 128),
('TKVM', 'Thiết kế Vi mạch', 'KTMT', 132),
('HTTT_YT', 'Cử nhân ngành Hệ thống Thông tin – chuyên ngành Hệ thống thông tin y tế', 'HTTT', 132);

-- =====================================================
-- INSERT DATA - Môn học (Courses)
-- =====================================================
INSERT INTO "MONHOC" ("MaMonHoc", "TenMonHoc", "MaKhoa", "LoaiMon", "SoTiet") VALUES
('ACCT3603', 'Hệ thống thông tin kế toán', 'HTTT', 'LT', 45),
('ACCT5123', 'Hoạch định nguồn lực doanh nghiệp', 'HTTT', 'LT', 45),
('ADENG1', 'Tiếng Anh tăng cường 1', 'HTTT', 'LT', 15),
('ADENG2', 'Tiếng Anh tăng cường 2', 'HTTT', 'LT', 15),
('ADENG3', 'Tiếng Anh tăng cường 3', 'HTTT', 'LT', 15),
('ADENG4', 'Tiếng Anh tăng cường 4', 'HTTT', 'LT', 15),
('AI001', 'Giới thiệu ngành Trí tuệ nhân tạo', 'KHMT', 'LT', 15),
('AI002', 'Tư duy Trí tuệ nhân tạo', 'KHMT', 'LT', 45),
('AI002_TH', 'Tư duy Trí tuệ nhân tạo (Thực hành)', 'KHMT', 'TH', 30),
('AI301', 'Khởi nghiệp và sáng tạo', 'KHMT', 'LT', 30),
('AI302', 'Kỹ thuật viết báo cáo và trình bày', 'KHMT', 'LT', 30),
('AI503', 'Đồ án tốt nghiệp', 'KHMT', 'LT', 90),
('AI504', 'Đồ án tốt nghiệp tại doanh nghiệp', 'KHMT', 'LT', 150),
('AI505', 'Khoá luận tốt nghiệp', 'KHMT', 'LT', 150),
('BCH058', 'Kỹ năng truyền thông giao tiếp', 'CNTT', 'LT', 15),
('BCH058_TH', 'Kỹ năng truyền thông giao tiếp (Thực hành)', 'CNTT', 'TH', 30),
('BOQC1', 'Nhập môn máy tính lượng tử', 'CNTT', 'LT', 15),
('BUS1125', 'Khởi nghiệp kinh doanh', 'CNTT', 'LT', 30),
('BUS1125_TH', 'Khởi nghiệp kinh doanh (Thực hành)', 'CNTT', 'TH', 30),
('CARC1', 'Kiến trúc máy tính', 'KTMT', 'LT', 45),
('CE005', 'Giới thiệu ngành Kỹ Thuật Máy tính', 'KTMT', 'LT', 15),
('CE006', 'Giới thiệu ngành Thiết kế vi mạch', 'KTMT', 'LT', 15),
('CE101', 'Lý thuyết mạch điện', 'KTMT', 'LT', 60),
('CE102', 'Hệ thống số', 'KTMT', 'LT', 45),
('CE102_TH', 'Hệ thống số (Thực hành)', 'KTMT', 'TH', 30),
('CE103', 'Vi xử lý-vi điều khiển', 'KTMT', 'LT', 45),
('CE103_TH', 'Vi xử lý-vi điều khiển (Thực hành)', 'KTMT', 'TH', 30),
('CE104', 'Các thiết bị và mạch điện tử', 'KTMT', 'LT', 15),
('CE105', 'Xử lý tín hiệu số', 'KTMT', 'LT', 15),
('CE106', 'Thiết kế vi mạch với HDL', 'KTMT', 'LT', 45),
('CE106_TH', 'Thiết kế vi mạch với HDL (Thực hành)', 'KTMT', 'TH', 30),
('CE107', 'Hệ thống nhúng', 'KTMT', 'LT', 15),
('CE108', 'Hệ điều hành nâng cao', 'KTMT', 'LT', 45),
('CE109', 'Lập trình nhúng căn bản', 'KTMT', 'LT', 30),
('CE109_TH', 'Lập trình nhúng căn bản (Thực hành)', 'KTMT', 'TH', 30),
('CE110', 'Lập trình hệ thống với Java', 'KTMT', 'LT', 45),
('CE110_TH', 'Lập trình hệ thống với Java (Thực hành)', 'KTMT', 'TH', 30),
('CE111', 'Kiến trúc máy tính nâng cao', 'KTMT', 'LT', 30),
('CE111_TH', 'Kiến trúc máy tính nâng cao (Thực hành)', 'KTMT', 'TH', 30),
('CE112', 'Đồ án môn học thiết kế mạch', 'KTMT', 'TH', 60),
('CE113', 'Điều khiển tự động', 'KTMT', 'LT', 45),
('CE114', 'Lập trình trên thiết bị di động', 'KTMT', 'LT', 30),
('CE114_TH', 'Lập trình trên thiết bị di động (Thực hành)', 'KTMT', 'TH', 30),
('CE115', 'Thiết kế mạng', 'KTMT', 'LT', 45),
('CE115_TH', 'Thiết kế mạng (Thực hành)', 'KTMT', 'TH', 30),
('CE116', 'Đồ án môn học ngành KTMT', 'KTMT', 'TH', 60),
('CE117', 'Thực hành điện- điện tử', 'KTMT', 'LT', 15),
('CE118', 'Thiết kế luận lý số', 'KTMT', 'LT', 45),
('CE118_TH', 'Thiết kế luận lý số (Thực hành)', 'KTMT', 'TH', 30),
('CE119', 'Thực hành Kiến trúc máy tính', 'KTMT', 'TH', 30),
('CE121', 'Lý thuyết mạch điện', 'KTMT', 'LT', 15),
('CE122', 'Phân tích mạch kỹ thuật', 'KTMT', 'LT', 45),
('CE122_TH', 'Phân tích mạch kỹ thuật (Thực hành)', 'KTMT', 'TH', 30),
('CE124', 'Các thiết bị và mạch điện tử', 'KTMT', 'LT', 45),
('CE124_TH', 'Các thiết bị và mạch điện tử (Thực hành)', 'KTMT', 'TH', 30),
('CE125', 'Kỹ thuật phân tích mạch', 'KTMT', 'LT', 45),
('CE125_TH', 'Kỹ thuật phân tích mạch (Thực hành)', 'KTMT', 'TH', 30),
('CE126', 'Vật lý bán dẫn và ứng dụng', 'KTMT', 'LT', 45),
('CE126_TH', 'Vật lý bán dẫn và ứng dụng (Thực hành)', 'KTMT', 'TH', 30),
('CE201', 'Đồ án 1', 'KTMT', 'LT', 15),
('CE202', 'An toàn mạng máy tính', 'KTMT', 'LT', 45),
('CE203', 'Điều khiển tự động nâng cao', 'KTMT', 'LT', 45),
('CE204', 'Thiết kế và lập trình Web', 'KTMT', 'LT', 45),
('CE205', 'Xử lý tín hiệu số', 'KTMT', 'LT', 45),
('CE205_TH', 'Xử lý tín hiệu số (Thực hành)', 'KTMT', 'TH', 30),
('CE206', 'Đồ án 2', 'KTMT', 'LT', 15),
('CE207', 'Đồ án Thiết kế vi mạch 1', 'KTMT', 'LT', 15),
('CE208', 'Đồ án Thiết kế vi mạch 2', 'KTMT', 'TH', 60),
('CE211', 'Lập trình nhúng căn bản', 'KTMT', 'LT', 45),
('CE211_TH', 'Lập trình nhúng căn bản (Thực hành)', 'KTMT', 'TH', 30),
('CE212', 'Điều khiển tự động', 'KTMT', 'LT', 15),
('CE213', 'Thiết kế hệ thống số với HDL', 'KTMT', 'LT', 15),
('CE219', 'Tương tác người - máy', 'KTMT', 'LT', 45),
('CE221', 'Thiết kế vi mạch với HDL', 'KTMT', 'LT', 15),
('CE222', 'Thiết kế vi mạch số', 'KTMT', 'LT', 45),
('CE222_TH', 'Thiết kế vi mạch số (Thực hành)', 'KTMT', 'TH', 30),
('CE224', 'Thiết kế hệ thống nhúng', 'KTMT', 'LT', 45),
('CE224_TH', 'Thiết kế hệ thống nhúng (Thực hành)', 'KTMT', 'TH', 30),
('CE226', 'Thiết kế VLSI', 'KTMT', 'LT', 45),
('CE226_TH', 'Thiết kế VLSI (Thực hành)', 'KTMT', 'TH', 30),
('CE232', 'Thiết kế hệ thống nhúng không dây', 'KTMT', 'LT', 45),
('CE232_TH', 'Thiết kế hệ thống nhúng không dây (Thực hành)', 'KTMT', 'TH', 30),
('CE233', 'Kỹ thuật Robot', 'KTMT', 'LT', 45),
('CE233_TH', 'Kỹ thuật Robot (Thực hành)', 'KTMT', 'TH', 30),
('CE301', 'Hệ thống chứng thực số', 'KTMT', 'LT', 45),
('CE302', 'Thiết kế vi mạch', 'KTMT', 'LT', 30),
('CE302_TH', 'Thiết kế vi mạch (Thực hành)', 'KTMT', 'TH', 30),
('CE303', 'Robot công nghiệp', 'KTMT', 'LT', 15),
('CE3031', 'Công nghệ cảm biến', 'KTMT', 'LT', 15),
('CE304', 'Robot công nghiệp', 'KTMT', 'LT', 15),
('CE306', 'Thị giác máy tính', 'KTMT', 'LT', 45),
('CE312', 'Hệ thống thời gian thực', 'KTMT', 'LT', 15),
('CE313', 'Xử lý song song và hệ thống phân tán', 'KTMT', 'LT', 15),
('CE314', 'Trình biên dịch', 'KTMT', 'LT', 15),
('CE315', 'Lập trình hệ thống với Java', 'KTMT', 'LT', 30),
('CE315_TH', 'Lập trình hệ thống với Java (Thực hành)', 'KTMT', 'TH', 30),
('CE316', 'Logic mờ và ứng dụng', 'KTMT', 'LT', 45),
('CE317', 'Điều khiển tự động nâng cao', 'KTMT', 'LT', 15),
('CE318', 'Trình biên dịch', 'KTMT', 'LT', 15),
('CE319', 'Logic mờ và ứng dụng', 'KTMT', 'LT', 45),
('CE319_TH', 'Logic mờ và ứng dụng (Thực hành)', 'KTMT', 'TH', 30),
('CE320', 'Logic mờ cho ứng dụng hệ thống nhúng', 'KTMT', 'LT', 45),
('CE320_TH', 'Logic mờ cho ứng dụng hệ thống nhúng (Thực hành)', 'KTMT', 'TH', 30),
('CE321', 'Kỹ thuật chế tạo vi mạch', 'KTMT', 'LT', 45),
('CE322', 'Thiết kế vi mạch hỗn hợp', 'KTMT', 'LT', 30),
('CE322_TH', 'Thiết kế vi mạch hỗn hợp (Thực hành)', 'KTMT', 'TH', 30),
('CE323', 'Kĩ thuật thiết kế mạch in', 'KTMT', 'LT', 15),
('CE324', 'Thiết kế vi mạch tương tự', 'KTMT', 'LT', 15),
('CE325', 'Thiết kế dựa trên vi xử lý', 'KTMT', 'LT', 15),
('CE326', 'Tự động hóa thiết kế vi mạch', 'KTMT', 'LT', 30),
('CE326_TH', 'Tự động hóa thiết kế vi mạch (Thực hành)', 'KTMT', 'TH', 30),
('CE327', 'Tối ưu hóa dựa trên FPGA', 'KTMT', 'LT', 15),
('CE331', 'Kỹ thuật chế tạo vi mạch', 'KTMT', 'LT', 45),
('CE331_TH', 'Kỹ thuật chế tạo vi mạch (Thực hành)', 'KTMT', 'TH', 30),
('CE332', 'Thiết kế vi mạch hỗn hợp', 'KTMT', 'LT', 45),
('CE332_TH', 'Thiết kế vi mạch hỗn hợp (Thực hành)', 'KTMT', 'TH', 30),
('CE333', 'Tiếng Anh chuyên ngành Kỹ thuật Máy tính', 'KTMT', 'LT', 15),
('CE334', 'Thiết kế vi mạch tương tự', 'KTMT', 'LT', 15),
('CE335', 'Thiết kế dựa trên vi xử lý', 'KTMT', 'LT', 15),
('CE336', 'Tự động hóa thiết kế vi mạch', 'KTMT', 'LT', 15),
('CE337', 'Tối ưu hóa dựa trên FPGA', 'KTMT', 'LT', 15),
('CE338', 'Hệ thống thời gian thực', 'KTMT', 'LT', 15),
('CE339', 'Công nghệ IoT và Ứng dụng', 'KTMT', 'LT', 15),
('CE340', 'Trí tuệ nhân tạo cho hệ thống nhúng', 'KTMT', 'LT', 45),
('CE340_TH', 'Trí tuệ nhân tạo cho hệ thống nhúng (Thực hành)', 'KTMT', 'TH', 30),
('CE341', 'Lập trình nhúng trên các thiết bị di động', 'KTMT', 'LT', 45),
('CE341_TH', 'Lập trình nhúng trên các thiết bị di động (Thực hành)', 'KTMT', 'TH', 30),
('CE342', 'Hệ thống thông minh', 'KTMT', 'LT', 45),
('CE342_TH', 'Hệ thống thông minh (Thực hành)', 'KTMT', 'TH', 30),
('CE343', 'Trí tuệ nhân tạo cho xe tự hành', 'KTMT', 'LT', 45),
('CE343_TH', 'Trí tuệ nhân tạo cho xe tự hành (Thực hành)', 'KTMT', 'TH', 30),
('CE344', 'Trí tuệ nhân tạo cho IoT', 'KTMT', 'LT', 45),
('CE344_TH', 'Trí tuệ nhân tạo cho IoT (Thực hành)', 'KTMT', 'TH', 30),
('CE345', 'Kiến trúc IoT: Giao thức mạng và bảo mật', 'KTMT', 'LT', 45),
('CE345_TH', 'Kiến trúc IoT: Giao thức mạng và bảo mật (Thực hành)', 'KTMT', 'TH', 30),
('CE346', 'Thiết kế Antenna tích hợp cho thiết bị IoT', 'KTMT', 'LT', 45),
('CE346_TH', 'Thiết kế Antenna tích hợp cho thiết bị IoT (Thực hành)', 'KTMT', 'TH', 30),
('CE347', 'Điều khiển thông minh cho robot', 'KTMT', 'LT', 45),
('CE347_TH', 'Điều khiển thông minh cho robot (Thực hành)', 'KTMT', 'TH', 30),
('CE348', 'Công nghệ cảm biến trong IoT', 'KTMT', 'LT', 45),
('CE348_TH', 'Công nghệ cảm biến trong IoT (Thực hành)', 'KTMT', 'TH', 30),
('CE349', 'Hệ thống nhúng trên SoC', 'KTMT', 'LT', 45),
('CE349_TH', 'Hệ thống nhúng trên SoC (Thực hành)', 'KTMT', 'TH', 30),
('CE350', 'Xử lý ảnh hướng ASIC', 'KTMT', 'LT', 45),
('CE350_TH', 'Xử lý ảnh hướng ASIC (Thực hành)', 'KTMT', 'TH', 30),
('CE351', 'Thiết kế bộ tăng tốc phần cứng', 'KTMT', 'LT', 45),
('CE351_TH', 'Thiết kế bộ tăng tốc phần cứng (Thực hành)', 'KTMT', 'TH', 30),
('CE352', 'Xử lý tín hiệu số trên FPGA', 'KTMT', 'LT', 15),
('CE353', 'Thiết kế vật lý vi mạch', 'KTMT', 'LT', 45),
('CE353_TH', 'Thiết kế vật lý vi mạch (Thực hành)', 'KTMT', 'TH', 30),
('CE401', 'Kỹ thuật hệ thống máy tính', 'KTMT', 'LT', 15),
('CE402', 'Các hệ điều hành nhúng', 'KTMT', 'LT', 15),
('CE403', 'Thiết kế số', 'KTMT', 'LT', 15),
('CE404', 'Kỹ thuật chế tạo vi mạch', 'KTMT', 'LT', 45),
('CE405', 'Tương tác người máy', 'KTMT', 'LT', 45),
('CE406', 'Tương tác người – Máy', 'KTMT', 'LT', 45),
('CE406_TH', 'Tương tác người – Máy (Thực hành)', 'KTMT', 'TH', 30),
('CE407', 'Đồ án chuyên ngành Hệ thống nhúng và Robot', 'KTMT', 'TH', 60),
('CE408', 'Đồ án chuyên ngành Thiết kế vi mạch và phần cứng', 'KTMT', 'LT', 15),
('CE409', 'Kỹ thuật thiết kế kiểm tra', 'KTMT', 'LT', 15),
('CE410', 'Kỹ thuật hệ thống máy tính', 'KTMT', 'LT', 15),
('CE411', 'Chuyên đề hệ thống nhúng và robot', 'KTMT', 'LT', 45),
('CE411_TH', 'Chuyên đề hệ thống nhúng và robot (Thực hành)', 'KTMT', 'TH', 30),
('CE412', 'Đồ án chuyên ngành Hệ thống nhúng và IoT', 'KTMT', 'TH', 60),
('CE413', 'Đồ án chuyên ngành Robotics và AI', 'KTMT', 'LT', 15),
('CE421', 'Chuyên đề thiết kế vi mạch và phần cứng', 'KTMT', 'LT', 15),
('CE430', 'Lập trình hệ thống', 'KTMT', 'LT', 45),
('CE430_TH', 'Lập trình hệ thống (Thực hành)', 'KTMT', 'TH', 30),
('CE432', 'Thiết kế vi mạch hướng ASIC', 'KTMT', 'LT', 15),
('CE433', 'Thiết kế hệ thống SoC', 'KTMT', 'LT', 15),
('CE434', 'Chuyên đề thiết kế hệ vi mạch 1', 'KTMT', 'LT', 45),
('CE434_TH', 'Chuyên đề thiết kế hệ vi mạch 1 (Thực hành)', 'KTMT', 'TH', 30),
('CE435', 'Chuyên đề thiết kế hệ vi mạch 2', 'KTMT', 'LT', 45),
('CE435_TH', 'Chuyên đề thiết kế hệ vi mạch 2 (Thực hành)', 'KTMT', 'TH', 30),
('CE436', 'Xử lý tín hiệu số và ứng dụng', 'KTMT', 'LT', 15),
('CE437', 'Chuyên đề thiết kế hệ thống nhúng 1', 'KTMT', 'LT', 45),
('CE437_TH', 'Chuyên đề thiết kế hệ thống nhúng 1 (Thực hành)', 'KTMT', 'TH', 30),
('CE438', 'Chuyên đề thiết kế hệ thống nhúng 2', 'KTMT', 'LT', 45),
('CE438_TH', 'Chuyên đề thiết kế hệ thống nhúng 2 (Thực hành)', 'KTMT', 'TH', 30),
('CE439', 'Lập trình song song và hệ phân tán', 'KTMT', 'LT', 15),
('CE440', 'Hệ thống định vị với ứng dụng AI', 'KTMT', 'LT', 45),
('CE440_TH', 'Hệ thống định vị với ứng dụng AI (Thực hành)', 'KTMT', 'TH', 30),
('CE441', 'Chuyên đề thiết kế Robotics và AI 1', 'KTMT', 'LT', 15),
('CE442', 'Chuyên đề thiết kế Robotics và AI 2', 'KTMT', 'LT', 15),
('CE501', 'Thực tập doanh nghiệp', 'KTMT', 'TH', 90),
('CE502', 'Thực tập doanh nghiệp', 'KTMT', 'LT', 30),
('CE505', 'Khóa luận tốt nghiệp', 'KTMT', 'LT', 150),
('CE506', 'Luận văn chuyên sâu đặc thù', 'KTMT', 'TH', 420),
('CE507', 'Đồ án tốt nghiệp tại doanh nghiệp', 'KTMT', 'LT', 150),
('CE508', 'Đồ án tốt nghiệp', 'KTMT', 'TH', 180),
('CE510', 'Chuyên đề tốt nghiệp định hướng Hệ thống nhúng và IoT', 'KTMT', 'LT', 45),
('CE510_TH', 'Chuyên đề tốt nghiệp định hướng Hệ thống nhúng và IoT (Thực hành)', 'KTMT', 'TH', 30),
('CE511', 'Chuyên đề tốt nghiệp định hướng Robotic và AI', 'KTMT', 'LT', 45),
('CE511_TH', 'Chuyên đề tốt nghiệp định hướng Robotic và AI (Thực hành)', 'KTMT', 'TH', 30),
('CE512', 'Chuyên đề tốt nghiệp định hướng thiết kế vi mạch', 'KTMT', 'LT', 45),
('CE512_TH', 'Chuyên đề tốt nghiệp định hướng thiết kế vi mạch (Thực hành)', 'KTMT', 'TH', 30),
('CM101', 'Quản lý giao tiếp', 'HTTT', 'LT', 45),
('CNBU001', 'Mạng máy tính', 'MMT', 'LT', 45),
('CNBU001_TH', 'Mạng máy tính (Thực hành)', 'MMT', 'TH', 30),
('CNBU002', 'Bảo mật', 'MMT', 'LT', 45),
('CNBU002_TH', 'Bảo mật (Thực hành)', 'MMT', 'TH', 30),
('CNBU003', 'Dự án nghiên cứu', 'MMT', 'LT', 60),
('CNBU003_TH', 'Dự án nghiên cứu (Thực hành)', 'MMT', 'TH', 120),
('CNBU004', 'Thiết kế và phát triển website', 'MMT', 'LT', 45),
('CNBU004_TH', 'Thiết kế và phát triển website (Thực hành)', 'MMT', 'TH', 30),
('CNBU005', 'Internet of Things', 'MMT', 'LT', 45),
('CNBU005_TH', 'Internet of Things (Thực hành)', 'MMT', 'TH', 30),
('CNBU006', 'An toàn mạng máy tính', 'MMT', 'LT', 45),
('CNBU006_TH', 'An toàn mạng máy tính (Thực hành)', 'MMT', 'TH', 30),
('CNBU007', 'Pháp chứng kỹ thuật số', 'MMT', 'LT', 45),
('CNBU007_TH', 'Pháp chứng kỹ thuật số (Thực hành)', 'MMT', 'TH', 30),
('CNBU008', 'Quản lý an toàn thông tin', 'MMT', 'LT', 45),
('CNBU008_TH', 'Quản lý an toàn thông tin (Thực hành)', 'MMT', 'TH', 30),
('CNBU009', 'Thực tập', 'MMT', 'LT', 15),
('CNBU101', 'Toán cho Tin học', 'MMT', 'LT', 600),
('CNBU101_TH', 'Toán cho Tin học (Thực hành)', 'MMT', 'TH', 750),
('CNBU102', 'Công nghệ mạng máy tính', 'MMT', 'LT', 600),
('CNBU102_TH', 'Công nghệ mạng máy tính (Thực hành)', 'MMT', 'TH', 750),
('CNBU103', 'Lập trình cho kỹ sư mạng máy tính', 'MMT', 'LT', 600),
('CNBU103_TH', 'Lập trình cho kỹ sư mạng máy tính (Thực hành)', 'MMT', 'TH', 750),
('CNBU104', 'Hệ thống Servers', 'MMT', 'LT', 600),
('CNBU104_TH', 'Hệ thống Servers (Thực hành)', 'MMT', 'TH', 750),
('CNBU105', 'Hệ thống mạng doanh nghiệp', 'MMT', 'LT', 600),
('CNBU105_TH', 'Hệ thống mạng doanh nghiệp (Thực hành)', 'MMT', 'TH', 750),
('CNBU106', 'Hoạt động an ninh mạng', 'MMT', 'LT', 600),
('CNBU106_TH', 'Hoạt động an ninh mạng (Thực hành)', 'MMT', 'TH', 750),
('CNBU107', 'Dự án chuyên ngành', 'MMT', 'LT', 600),
('CNBU107_TH', 'Dự án chuyên ngành (Thực hành)', 'MMT', 'TH', 750),
('CNBU108', 'Hệ điều hành', 'MMT', 'LT', 660),
('CNBU108_TH', 'Hệ điều hành (Thực hành)', 'MMT', 'TH', 750),
('CNBU201', 'Công nghệ mạng không dây', 'MMT', 'LT', 600),
('CNBU201_TH', 'Công nghệ mạng không dây (Thực hành)', 'MMT', 'TH', 750),
('CNBU202', 'Hệ thống tường lửa nâng cao', 'MMT', 'LT', 600),
('CNBU202_TH', 'Hệ thống tường lửa nâng cao (Thực hành)', 'MMT', 'TH', 750),
('CNBU203', 'An toàn mạng máy tính', 'MMT', 'LT', 600),
('CNBU203_TH', 'An toàn mạng máy tính (Thực hành)', 'MMT', 'TH', 750),
('CNBU204', 'Ethical Hacking', 'MMT', 'LT', 600),
('CNBU204_TH', 'Ethical Hacking (Thực hành)', 'MMT', 'TH', 750),
('CNBU205', 'Dự án cá nhân', 'MMT', 'LT', 600),
('CNBU205_TH', 'Dự án cá nhân (Thực hành)', 'MMT', 'TH', 750),
('CNET1', 'Mạng máy tính', 'MMT', 'LT', 45),
('CNET1_TH', 'Mạng máy tính (Thực hành)', 'MMT', 'TH', 30),
('CS003', 'Máy học nâng cao', 'KHMT', 'LT', 45),
('CS004', 'Máy học trong xử lý ngôn ngữ tự nhiên', 'KHMT', 'LT', 45),
('CS005', 'Giới thiệu ngành Khoa học Máy tính', 'KHMT', 'LT', 15),
('CS013', 'Máy học nâng cao', 'KHMT', 'LT', 45),
('CS013_TH', 'Máy học nâng cao (Thực hành)', 'KHMT', 'TH', 30),
('CS014', 'Máy học trong xử lý ngôn ngữ tự nhiên', 'KHMT', 'LT', 45),
('CS014_TH', 'Máy học trong xử lý ngôn ngữ tự nhiên (Thực hành)', 'KHMT', 'TH', 30),
('CS019', 'Chuyên đề ứng dụng Trí tuệ nhân tạo', 'KHMT', 'LT', 60),
('CS101', 'Nguyên lý và phương pháp lập trình', 'KHMT', 'LT', 45),
('CS102', 'Phân tích & thiết kế thuật toán', 'KHMT', 'LT', 45),
('CS103', 'Cơ sở lập trình', 'KHMT', 'LT', 15),
('CS104', 'Nhập môn công nghệ phần mềm', 'KHMT', 'LT', 45),
('CS105', 'Đồ họa máy tính', 'KHMT', 'LT', 45),
('CS105_TH', 'Đồ họa máy tính (Thực hành)', 'KHMT', 'TH', 30),
('CS106', 'Trí tuệ nhân tạo', 'KHMT', 'LT', 45),
('CS106_TH', 'Trí tuệ nhân tạo (Thực hành)', 'KHMT', 'TH', 30),
('CS107', 'Các hệ cơ sở tri thức', 'KHMT', 'LT', 60),
('CS108', 'Lý thuyết thông tin', 'KHMT', 'LT', 45),
('CS109', 'Máy học', 'KHMT', 'LT', 60),
('CS110', 'Nhập môn công nghệ tri thức & máy học', 'KHMT', 'LT', 45),
('CS110_TH', 'Nhập môn công nghệ tri thức & máy học (Thực hành)', 'KHMT', 'TH', 30),
('CS111', 'Nguyên lý và phương pháp lập trình', 'KHMT', 'LT', 45),
('CS111_TH', 'Nguyên lý và phương pháp lập trình (Thực hành)', 'KHMT', 'TH', 30),
('CS1113', 'Khoa học máy tính I', 'HTTT', 'LT', 45),
('CS1113_TH', 'Khoa học máy tính I (Thực hành)', 'HTTT', 'TH', 30),
('CS112', 'Phân tích và thiết kế thuật toán', 'KHMT', 'LT', 15),
('CS113', 'Đồ họa máy tính và Xử lý ảnh', 'KHMT', 'LT', 15),
('CS114', 'Máy học', 'KHMT', 'LT', 15),
('CS115', 'Toán cho Khoa học máy tính', 'KHMT', 'LT', 60),
('CS116', 'Lập trình Python cho Máy học', 'KHMT', 'LT', 15),
('CS117', 'Tư duy tính toán', 'KHMT', 'LT', 45),
('CS117_TH', 'Tư duy tính toán (Thực hành)', 'KHMT', 'TH', 30),
('CS210', 'Xử lý ngôn ngữ tự nhiên nâng cao', 'KHMT', 'LT', 60),
('CS211', 'Trí tuệ nhân tạo nâng cao', 'KHMT', 'LT', 45),
('CS211_TH', 'Trí tuệ nhân tạo nâng cao (Thực hành)', 'KHMT', 'TH', 30),
('CS212', 'Xử lý ngôn ngữ tự nhiên', 'KHMT', 'LT', 45),
('CS212_TH', 'Xử lý ngôn ngữ tự nhiên (Thực hành)', 'KHMT', 'TH', 30),
('CS213', 'Ngôn ngữ học máy tính', 'CNTT', 'LT', 60),
('CS2133', 'Khoa học máy tính II', 'HTTT', 'LT', 45),
('CS2133_TH', 'Khoa học máy tính II (Thực hành)', 'HTTT', 'TH', 30),
('CS2134', 'Khoa học máy tính', 'HTTT', 'LT', 45),
('CS2134_TH', 'Khoa học máy tính (Thực hành)', 'HTTT', 'TH', 30),
('CS214', 'Biểu diễn tri thức và suy luận', 'KHMT', 'LT', 45),
('CS214_TH', 'Biểu diễn tri thức và suy luận (Thực hành)', 'KHMT', 'TH', 30),
('CS217', 'Các hệ cơ sở tri thức', 'KHMT', 'LT', 15),
('CS221', 'Xử lý ngôn ngữ tự nhiên', 'KHMT', 'LT', 15),
('CS222', 'Xử lý ngôn ngữ tự nhiên nâng cao', 'KHMT', 'LT', 45),
('CS222_TH', 'Xử lý ngôn ngữ tự nhiên nâng cao (Thực hành)', 'KHMT', 'TH', 30),
('CS223', 'Máy học nâng cao', 'KHMT', 'LT', 45),
('CS223_TH', 'Máy học nâng cao (Thực hành)', 'KHMT', 'TH', 30),
('CS224', 'Máy học xử lý ngôn ngữ tự nhiên', 'KHMT', 'LT', 45),
('CS224_TH', 'Máy học xử lý ngôn ngữ tự nhiên (Thực hành)', 'KHMT', 'TH', 30),
('CS225', 'Lập trình symbolic trong trí tuệ nhân tạo', 'KHMT', 'LT', 60),
('CS226', 'Ngôn ngữ học máy tính', 'KHMT', 'LT', 60),
('CS227', 'Khai thác dữ liệu và ứng dụng', 'KHMT', 'LT', 45),
('CS227_TH', 'Khai thác dữ liệu và ứng dụng (Thực hành)', 'KHMT', 'TH', 30),
('CS228', 'Máy học và ứng dụng', 'KHMT', 'LT', 45),
('CS228_TH', 'Máy học và ứng dụng (Thực hành)', 'KHMT', 'TH', 30),
('CS229', 'Ngữ nghĩa học tính toán', 'KHMT', 'LT', 45),
('CS229_TH', 'Ngữ nghĩa học tính toán (Thực hành)', 'KHMT', 'TH', 30),
('CS231', 'Nhập môn Thị giác máy tính', 'KHMT', 'LT', 45),
('CS231_TH', 'Nhập môn Thị giác máy tính (Thực hành)', 'KHMT', 'TH', 30),
('CS232', 'Tính toán đa phương tiện', 'KHMT', 'LT', 45),
('CS232_TH', 'Tính toán đa phương tiện (Thực hành)', 'KHMT', 'TH', 30),
('CS233', 'Nhận dạng Thị giác', 'KHMT', 'LT', 45),
('CS233_TH', 'Nhận dạng Thị giác (Thực hành)', 'KHMT', 'TH', 30),
('CS2433', 'Lập trình C/C++', 'HTTT', 'LT', 45),
('CS2433_TH', 'Lập trình C/C++ (Thực hành)', 'HTTT', 'TH', 30),
('CS301', 'Chuyên đề nghiên cứu "KHOA" học', 'KHMT', 'LT', 60),
('CS302', 'Seminar', 'KHMT', 'LT', 45),
('CS311', 'Kỹ thuật lập trình trí tuệ nhân tạo', 'KHMT', 'LT', 45),
('CS311_TH', 'Kỹ thuật lập trình trí tuệ nhân tạo (Thực hành)', 'KHMT', 'TH', 30),
('CS312', 'Hệ thống đa tác tử', 'KHMT', 'LT', 45),
('CS312_TH', 'Hệ thống đa tác tử (Thực hành)', 'KHMT', 'TH', 30),
('CS313', 'Khai thác dữ liệu và ứng dụng', 'KHMT', 'LT', 15),
('CS314', 'Lập trình symbolic trong trí tuệ nhân tạo', 'KHMT', 'LT', 45),
('CS314_TH', 'Lập trình symbolic trong trí tuệ nhân tạo (Thực hành)', 'KHMT', 'TH', 30),
('CS315', 'Máy học nâng cao', 'KHMT', 'LT', 45),
('CS315_TH', 'Máy học nâng cao (Thực hành)', 'KHMT', 'TH', 30),
('CS316', 'Các hệ giải bài toán thông minh', 'KHMT', 'LT', 45),
('CS316_TH', 'Các hệ giải bài toán thông minh (Thực hành)', 'KHMT', 'TH', 30),
('CS317', 'Phát triển và vận hành hệ thống máy học', 'KHMT', 'LT', 45),
('CS317_TH', 'Phát triển và vận hành hệ thống máy học (Thực hành)', 'KHMT', 'TH', 30),
('CS321', 'Ngôn ngữ học ngữ liệu', 'KHMT', 'LT', 45),
('CS321_TH', 'Ngôn ngữ học ngữ liệu (Thực hành)', 'KHMT', 'TH', 30),
('CS322', 'Biểu diễn tri thức và ứng dụng', 'KHMT', 'LT', 60),
('CS323', 'Các hệ thống hỏi-đáp', 'KHMT', 'LT', 45),
('CS323_TH', 'Các hệ thống hỏi-đáp (Thực hành)', 'KHMT', 'TH', 30),
('CS324', 'Máy học trong xử lý ngôn ngữ tự nhiên', 'KHMT', 'LT', 45),
('CS324_TH', 'Máy học trong xử lý ngôn ngữ tự nhiên (Thực hành)', 'KHMT', 'TH', 30),
('CS325', 'Dịch máy', 'KHMT', 'LT', 45),
('CS325_TH', 'Dịch máy (Thực hành)', 'KHMT', 'TH', 30),
('CS326', 'Các kĩ thuật trong xử lý ngôn ngữ tự nhiên', 'KHMT', 'LT', 45),
('CS326_TH', 'Các kĩ thuật trong xử lý ngôn ngữ tự nhiên (Thực hành)', 'KHMT', 'TH', 30),
('CS331', 'Thị giác máy tính nâng cao', 'KHMT', 'LT', 45),
('CS331_TH', 'Thị giác máy tính nâng cao (Thực hành)', 'KHMT', 'TH', 30),
('CS332', 'Máy học trong Thị giác Máy tính', 'KHMT', 'LT', 45),
('CS332_TH', 'Máy học trong Thị giác Máy tính (Thực hành)', 'KHMT', 'TH', 30),
('CS333', 'Đồ họa game', 'KHMT', 'LT', 30),
('CS333_TH', 'Đồ họa game (Thực hành)', 'KHMT', 'TH', 30),
('CS334', 'Lập trình tính toán hình thức', 'KHMT', 'LT', 45),
('CS334_TH', 'Lập trình tính toán hình thức (Thực hành)', 'KHMT', 'TH', 30),
('CS335', 'Tìm Kiếm Ảnh và Video', 'KHMT', 'LT', 45),
('CS335_TH', 'Tìm Kiếm Ảnh và Video (Thực hành)', 'KHMT', 'TH', 30),
('CS336', 'Truy vấn thông tin đa phương tiện', 'KHMT', 'LT', 45),
('CS336_TH', 'Truy vấn thông tin đa phương tiện (Thực hành)', 'KHMT', 'TH', 30),
('CS3363', 'Tổ chức ngôn ngữ lập trình', 'HTTT', 'LT', 45),
('CS3363_TH', 'Tổ chức ngôn ngữ lập trình (Thực hành)', 'HTTT', 'TH', 30),
('CS337', 'Xử lý âm thanh và tiếng nói', 'KHMT', 'LT', 45),
('CS337_TH', 'Xử lý âm thanh và tiếng nói (Thực hành)', 'KHMT', 'TH', 30),
('CS3373', 'Lập trình hướng đối tượng nâng cao cho môi trường windows', 'HTTT', 'LT', 45),
('CS3373_TH', 'Lập trình hướng đối tượng nâng cao cho môi trường windows (Thực hành)', 'HTTT', 'TH', 30),
('CS338', 'Nhận dạng', 'KHMT', 'LT', 45),
('CS338_TH', 'Nhận dạng (Thực hành)', 'KHMT', 'TH', 30),
('CS339', 'Xử lý văn bản Y "KHOA"', 'KHMT', 'LT', 45),
('CS339_TH', 'Xử lý văn bản Y "KHOA" (Thực hành)', 'KHMT', 'TH', 30),
('CS3423', 'Cấu trúc tập tin', 'HTTT', 'LT', 45),
('CS3423_TH', 'Cấu trúc tập tin (Thực hành)', 'HTTT', 'TH', 30),
('CS3443', 'Hệ thống máy tính', 'HTTT', 'LT', 45),
('CS351', 'Chuyên đề NCKH 1', 'KHMT', 'LT', 60),
('CS3513', 'Phương pháp số cho máy tính kỹ thuật số', 'HTTT', 'LT', 45),
('CS352', 'Chuyên đề NCKH 2', 'KHMT', 'LT', 60),
('CS3613', 'Cơ sở tính toán', 'HTTT', 'LT', 45),
('CS3613_TH', 'Cơ sở tính toán (Thực hành)', 'HTTT', 'TH', 30),
('CS3653', 'Toán rời rạc cho máy tính', 'HTTT', 'LT', 45),
('CS371', 'Seminar chuyên đề 1', 'KHMT', 'LT', 30),
('CS372', 'Seminar chuyên đề 2', 'KHMT', 'LT', 30),
('CS401', 'Công nghệ Java', 'KHMT', 'LT', 45),
('CS401_TH', 'Công nghệ Java (Thực hành)', 'KHMT', 'TH', 30),
('CS402', 'Phân tích thiết kế HTTT quản lý', 'KHMT', 'LT', 45),
('CS403', 'Các dịch vụ web', 'KHMT', 'LT', 45),
('CS404', 'Công nghệ đa tác tử (Muli-Agent)', 'KHMT', 'LT', 60),
('CS405', 'Logic mờ và ứng dụng', 'KHMT', 'LT', 45),
('CS405_TH', 'Logic mờ và ứng dụng (Thực hành)', 'KHMT', 'TH', 30),
('CS406', 'Xử lý ảnh và ứng dụng', 'KHMT', 'LT', 45),
('CS406_TH', 'Xử lý ảnh và ứng dụng (Thực hành)', 'KHMT', 'TH', 30),
('CS407', 'Các kỹ thuật trong xử lý NNTN', 'KHMT', 'LT', 60),
('CS408', 'Các hệ giải toán thông minh', 'KHMT', 'LT', 60),
('CS409', 'Hệ suy diễn mờ', 'KHMT', 'LT', 45),
('CS409_TH', 'Hệ suy diễn mờ (Thực hành)', 'KHMT', 'TH', 30),
('CS410', 'Mạng neural và thuật giải di truyền', 'KHMT', 'LT', 45),
('CS410_TH', 'Mạng neural và thuật giải di truyền (Thực hành)', 'KHMT', 'TH', 30),
('CS411', 'Dịch máy', 'KHMT', 'LT', 60),
('CS412', 'Web ngữ nghĩa', 'KHMT', 'LT', 45),
('CS412_TH', 'Web ngữ nghĩa (Thực hành)', 'KHMT', 'TH', 30),
('CS414', 'Lý thuyết automat và ứng dụng', 'KHMT', 'LT', 45),
('CS414_TH', 'Lý thuyết automat và ứng dụng (Thực hành)', 'KHMT', 'TH', 30),
('CS4143', 'Đồ họa máy tính', 'HTTT', 'LT', 45),
('CS415', 'Mã hóa thông tin', 'KHMT', 'LT', 45),
('CS415_TH', 'Mã hóa thông tin (Thực hành)', 'KHMT', 'TH', 30),
('CS4153', 'Phát triển ứng dụng trên di động', 'HTTT', 'LT', 45),
('CS417', 'Nhận dạng', 'KHMT', 'LT', 30),
('CS417_TH', 'Nhận dạng (Thực hành)', 'KHMT', 'TH', 30),
('CS418', 'Trực quan máy tính', 'KHMT', 'LT', 45),
('CS418_TH', 'Trực quan máy tính (Thực hành)', 'KHMT', 'TH', 30),
('CS419', 'Truy xuất thông tin', 'KHMT', 'LT', 45),
('CS419_TH', 'Truy xuất thông tin (Thực hành)', 'KHMT', 'TH', 30),
('CS420', 'Các vấn đề chọn lọc trong Thị giác máy tính', 'KHMT', 'LT', 45),
('CS420_TH', 'Các vấn đề chọn lọc trong Thị giác máy tính (Thực hành)', 'KHMT', 'TH', 30),
('CS421', 'Khai thác dữ liệu đa phương tiện', 'KHMT', 'LT', 45),
('CS421_TH', 'Khai thác dữ liệu đa phương tiện (Thực hành)', 'KHMT', 'TH', 30),
('CS4243', 'Thuật toán và tiến trình trong an toàn máy tính', 'HTTT', 'LT', 45),
('CS4273', 'Nhập môn Công nghệ phần mềm', 'HTTT', 'LT', 45),
('CS4273_TH', 'Nhập môn Công nghệ phần mềm (Thực hành)', 'HTTT', 'TH', 30),
('CS4283', 'Mạng máy tính', 'HTTT', 'LT', 45),
('CS431', 'Các kĩ thuật học sâu và ứng dụng', 'KHMT', 'LT', 15),
('CS4323', 'Hệ điều hành', 'HTTT', 'LT', 45),
('CS4343', 'Cấu trúc dữ liệu và giải thuật', 'HTTT', 'LT', 45),
('CS4343_TH', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'HTTT', 'TH', 30),
('CS4344', 'An ninh mạng', 'HTTT', 'LT', 45),
('CS4793', 'Trí tuệ nhân tạo', 'HTTT', 'LT', 45),
('CS4793_TH', 'Trí tuệ nhân tạo (Thực hành)', 'HTTT', 'TH', 30),
('CS4883', 'Các vấn đề xã hội trong tính toán', 'HTTT', 'LT', 45),
('CS5000', 'Luận văn', 'HTTT', 'LT', 150),
('CS501', 'Khóa luận tốt nghiệp', 'KHMT', 'LT', 150),
('CS502', 'Các công nghệ web và ứng dụng', 'KHMT', 'LT', 30),
('CS503', 'Môn tốt nghiệp KHMT 2', 'KHMT', 'LT', 45),
('CS5030', 'Thực tập tốt nghiệp', 'HTTT', 'LT', 45),
('CS5031', 'Thực tập doanh nghiệp', 'HTTT', 'LT', 30),
('CS504', 'Công nghệ .NET', 'KHMT', 'LT', 45),
('CS504_TH', 'Công nghệ .NET (Thực hành)', 'KHMT', 'TH', 30),
('CS505', 'Khoá luận tốt nghiệp', 'KHMT', 'LT', 150),
('CS506', 'Chuyên đề J2EE', 'KHMT', 'LT', 45),
('CS506_TH', 'Chuyên đề J2EE (Thực hành)', 'KHMT', 'TH', 30),
('CS507', 'Hệ điều hành Linux', 'KHMT', 'LT', 45),
('CS507_TH', 'Hệ điều hành Linux (Thực hành)', 'KHMT', 'TH', 30),
('CS508', 'Lập trình cơ sở dữ liệu', 'KHMT', 'LT', 45),
('CS508_TH', 'Lập trình cơ sở dữ liệu (Thực hành)', 'KHMT', 'TH', 30),
('CS510', 'Lý thuyết thông tin', 'KHMT', 'LT', 45),
('CS511', 'Ngôn ngữ lập trình C#', 'KHMT', 'LT', 15),
('CS513', 'Ngôn ngữ lập trình Java', 'KHMT', 'LT', 45),
('CS513_TH', 'Ngôn ngữ lập trình Java (Thực hành)', 'KHMT', 'TH', 30),
('CS515', 'Phân tích thiết kế hệ thống thông tin', 'KHMT', 'LT', 45),
('CS515_TH', 'Phân tích thiết kế hệ thống thông tin (Thực hành)', 'KHMT', 'TH', 30),
('CS516', 'Phân tích thiết kế hướng đối tượng với UML', 'KHMT', 'LT', 45),
('CS516_TH', 'Phân tích thiết kế hướng đối tượng với UML (Thực hành)', 'KHMT', 'TH', 30),
('CS517', 'Quản lý dự án', 'KHMT', 'LT', 45),
('CS518', 'Xây dựng phần mềm hướng đối tượng', 'KHMT', 'LT', 45),
('CS518_TH', 'Xây dựng phần mềm hướng đối tượng (Thực hành)', 'KHMT', 'TH', 30),
('CS519', 'Phương pháp luận nghiên cứu "KHOA" học', 'KHMT', 'LT', 45),
('CS521', 'Toán rời rạc nâng cao', 'KHMT', 'LT', 15),
('CS522', 'Đại số máy tính', 'KHMT', 'LT', 15),
('CS523', 'Cấu trúc dữ liệu và giải thuật nâng cao', 'KHMT', 'LT', 15),
('CS524', 'Một số ứng dụng của xử lý ngôn ngữ tự nhiên', 'KHMT', 'LT', 45),
('CS524_TH', 'Một số ứng dụng của xử lý ngôn ngữ tự nhiên (Thực hành)', 'KHMT', 'TH', 30),
('CS525', 'Thị giác máy tính trong tương tác người – máy', 'KHMT', 'LT', 45),
('CS525_TH', 'Thị giác máy tính trong tương tác người – máy (Thực hành)', 'KHMT', 'TH', 30),
('CS526', 'Phát triển ứng dụng đa phương tiện trên thiết bị di động', 'KHMT', 'LT', 15),
('CS527', 'Thực tại ảo', 'KHMT', 'LT', 45),
('CS527_TH', 'Thực tại ảo (Thực hành)', 'KHMT', 'TH', 30),
('CS528', 'Trực quan hóa thông tin', 'KHMT', 'LT', 45),
('CS528_TH', 'Trực quan hóa thông tin (Thực hành)', 'KHMT', 'TH', 30),
('CS529', 'Các vấn đề nghiên cứu và ứng dụng trong "KHOA" học máy tính', 'KHMT', 'LT', 60),
('CS530', 'Đồ án chuyên ngành', 'KHMT', 'LT', 45),
('CS531', 'Đồ họa trong video game', 'KHMT', 'LT', 45),
('CS531_TH', 'Đồ họa trong video game (Thực hành)', 'KHMT', 'TH', 30),
('CS532', 'Thị giác máy tính trong tương tác người-máy', 'KHMT', 'LT', 45),
('CS532_TH', 'Thị giác máy tính trong tương tác người-máy (Thực hành)', 'KHMT', 'TH', 30),
('CS534', 'Lập trình Javascript và ứng dụng', 'KHMT', 'LT', 45),
('CS534_TH', 'Lập trình Javascript và ứng dụng (Thực hành)', 'KHMT', 'TH', 30),
('CS535', 'Tổng hợp tiếng nói', 'KHMT', 'LT', 15),
('CS5423', 'Nguyên lý các hệ cơ sở dữ liệu', 'HTTT', 'LT', 45),
('CS5423_TH', 'Nguyên lý các hệ cơ sở dữ liệu (Thực hành)', 'HTTT', 'TH', 30),
('CS5433', 'Các hệ cơ sở dữ liệu phân tán', 'HTTT', 'LT', 15),
('CS551', 'Thực tập', 'KHMT', 'LT', 30),
('CS553', 'Đồ án tốt nghiệp', 'KHMT', 'LT', 90),
('CS554', 'Đồ án tốt nghiệp tại doanh nghiệp', 'KHMT', 'LT', 150),
('CSBU001', 'Lập trình', 'KHMT', 'LT', 45),
('CSBU001_TH', 'Lập trình (Thực hành)', 'KHMT', 'TH', 30),
('CSBU002', 'Mạng máy tính', 'KHMT', 'LT', 45),
('CSBU002_TH', 'Mạng máy tính (Thực hành)', 'KHMT', 'TH', 30),
('CSBU003', 'Thực hành nghề nghiệp', 'KHMT', 'LT', 60),
('CSBU004', 'Toán cho Tin học', 'KHMT', 'LT', 45),
('CSBU004_TH', 'Toán cho Tin học (Thực hành)', 'KHMT', 'TH', 30),
('CSBU005', 'Bảo mật', 'KHMT', 'LT', 45),
('CSBU005_TH', 'Bảo mật (Thực hành)', 'KHMT', 'TH', 30),
('CSBU006', 'Quản lý dự án máy tính thành công', 'KHMT', 'LT', 60),
('CSBU007', 'Thiết kế và phát triển cơ sở dữ liệu', 'KHMT', 'LT', 45),
('CSBU007_TH', 'Thiết kế và phát triển cơ sở dữ liệu (Thực hành)', 'KHMT', 'TH', 30),
('CSBU008', 'Kiến trúc máy tính', 'KHMT', 'LT', 45),
('CSBU008_TH', 'Kiến trúc máy tính (Thực hành)', 'KHMT', 'TH', 30),
('CSBU009', 'Dự án nghiên cứu', 'KHMT', 'LT', 60),
('CSBU009_TH', 'Dự án nghiên cứu (Thực hành)', 'KHMT', 'TH', 120),
('CSBU010', 'Công nghệ kinh doanh thông minh', 'KHMT', 'LT', 45),
('CSBU010_TH', 'Công nghệ kinh doanh thông minh (Thực hành)', 'KHMT', 'TH', 30),
('CSBU011', 'Toán rời rạc', 'KHMT', 'LT', 60),
('CSBU012', 'Cấu trúc dữ liệu và giải thuật', 'KHMT', 'LT', 45),
('CSBU012_TH', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'KHMT', 'TH', 30),
('CSBU013', 'Lập trình nâng cao', 'KHMT', 'LT', 45),
('CSBU013_TH', 'Lập trình nâng cao (Thực hành)', 'KHMT', 'TH', 30),
('CSBU014', 'Máy học', 'KHMT', 'LT', 45),
('CSBU014_TH', 'Máy học (Thực hành)', 'KHMT', 'TH', 30),
('CSBU015', 'Điện toán đám mây', 'KHMT', 'LT', 45),
('CSBU015_TH', 'Điện toán đám mây (Thực hành)', 'KHMT', 'TH', 30),
('CSBU016', 'Thực tập', 'KHMT', 'LT', 15),
('CSBU101', 'Lập trình máy tính', 'KHMT', 'LT', 600),
('CSBU101_TH', 'Lập trình máy tính (Thực hành)', 'KHMT', 'TH', 750),
('CSBU102', 'Hệ thống máy tính', 'KHMT', 'LT', 600),
('CSBU102_TH', 'Hệ thống máy tính (Thực hành)', 'KHMT', 'TH', 750),
('CSBU103', 'Phát triển và thiết kế web', 'KHMT', 'LT', 600),
('CSBU103_TH', 'Phát triển và thiết kế web (Thực hành)', 'KHMT', 'TH', 750),
('CSBU104', 'Cấu trúc dữ liệu và giải thuật', 'KHMT', 'LT', 600),
('CSBU104_TH', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'KHMT', 'TH', 750),
('CSBU105', 'Mạng máy tính căn bản', 'KHMT', 'LT', 600),
('CSBU105_TH', 'Mạng máy tính căn bản (Thực hành)', 'KHMT', 'TH', 750),
('CSBU106', 'Đồ án đổi mới sáng tạo', 'KHMT', 'LT', 720),
('CSBU106_TH', 'Đồ án đổi mới sáng tạo (Thực hành)', 'KHMT', 'TH', 960),
('CSBU107', 'Lập trình hướng đối tượng', 'KHMT', 'LT', 600),
('CSBU107_TH', 'Lập trình hướng đối tượng (Thực hành)', 'KHMT', 'TH', 750),
('CSBU108', 'Hệ điều hành', 'KHMT', 'LT', 600),
('CSBU108_TH', 'Hệ điều hành (Thực hành)', 'KHMT', 'TH', 750),
('CSBU109', 'Phát triển ứng dụng web và cơ sở dữ liệu', 'KHMT', 'LT', 600),
('CSBU109_TH', 'Phát triển ứng dụng web và cơ sở dữ liệu (Thực hành)', 'KHMT', 'TH', 750),
('CSBU110', 'Toán rời rạc và Lập trình khai báo', 'KHMT', 'LT', 600),
('CSBU110_TH', 'Toán rời rạc và Lập trình khai báo (Thực hành)', 'KHMT', 'TH', 750),
('CSBU111', 'An ninh mạng', 'KHMT', 'LT', 600),
('CSBU111_TH', 'An ninh mạng (Thực hành)', 'KHMT', 'TH', 750),
('CSBU112', 'Thiết kế phần mềm', 'KHMT', 'LT', 600),
('CSBU112_TH', 'Thiết kế phần mềm (Thực hành)', 'KHMT', 'TH', 750),
('CSBU201', 'Thiết kế trải nghiệm người dùng', 'KHMT', 'LT', 600),
('CSBU201_TH', 'Thiết kế trải nghiệm người dùng (Thực hành)', 'KHMT', 'TH', 750),
('CSBU202', 'Phát triển ứng dụng cho thiết bị di động và thiết bị đeo', 'KHMT', 'LT', 720),
('CSBU202_TH', 'Phát triển ứng dụng cho thiết bị di động và thiết bị đeo (Thực hành)', 'KHMT', 'TH', 960),
('CSBU203', 'Điện toán đám mây', 'KHMT', 'LT', 600),
('CSBU203_TH', 'Điện toán đám mây (Thực hành)', 'KHMT', 'TH', 750),
('CSBU204', 'Trí tuệ nhân tạo và Máy học', 'KHMT', 'LT', 600),
('CSBU204_TH', 'Trí tuệ nhân tạo và Máy học (Thực hành)', 'KHMT', 'TH', 750),
('CSBU205', 'Dự án cá nhân', 'KHMT', 'LT', 720),
('CSBU205_TH', 'Dự án cá nhân (Thực hành)', 'KHMT', 'TH', 960),
('CSC01', 'Tin học đại cương', 'KHMT', 'LT', 45),
('CSC01_TH', 'Tin học đại cương (Thực hành)', 'KHMT', 'TH', 30),
('CSC11', 'Khoa học máy tính I', 'KHMT', 'LT', 60),
('CSC12', 'Khoa học máy tính II', 'KHMT', 'LT', 60),
('CSC21', 'Tin học đại cương (TE)', 'KHMT', 'LT', 15),
('CSKI1', 'Kỹ năng truyền thông làm việc nhóm', 'KHMT', 'LT', 60),
('CU001', 'Văn hóa doanh nghiệp Nhật', 'KTTT', 'LT', 30),
('DAI015', 'Thực hành văn bản Tiếng Việt', 'CNTT', 'LT', 30),
('DBSS1', 'Cơ sở dữ liệu', 'CNTT', 'LT', 45),
('DBSS1_TH', 'Cơ sở dữ liệu (Thực hành)', 'CNTT', 'TH', 30),
('DS005', 'Giới thiệu ngành Khoa học Dữ liệu', 'KTTT', 'LT', 15),
('DS101', 'Thống kê và xác suất chuyên sâu', 'KTTT', 'LT', 15),
('DS102', 'Học máy thống kê', 'KTTT', 'LT', 45),
('DS102_TH', 'Học máy thống kê (Thực hành)', 'KTTT', 'TH', 30),
('DS103', 'Thu thập và tiền xử lý dữ liệu', 'KTTT', 'LT', 45),
('DS103_TH', 'Thu thập và tiền xử lý dữ liệu (Thực hành)', 'KTTT', 'TH', 30),
('DS104', 'Tính toán song song & phân tán', 'KTTT', 'LT', 45),
('DS104_TH', 'Tính toán song song & phân tán (Thực hành)', 'KTTT', 'TH', 30),
('DS105', 'Phân tích và trực quan dữ liệu', 'KTTT', 'LT', 15),
('DS106', 'Tối ưu hóa và ứng dụng', 'KTTT', 'LT', 30),
('DS106_TH', 'Tối ưu hóa và ứng dụng (Thực hành)', 'KTTT', 'TH', 30),
('DS107', 'Tư duy tính toán cho Khoa học dữ liệu', 'KTTT', 'LT', 45),
('DS107_TH', 'Tư duy tính toán cho Khoa học dữ liệu (Thực hành)', 'KTTT', 'TH', 30),
('DS108', 'Tiền xử lý và xây dựng bộ dữ liệu', 'KTTT', 'LT', 15),
('DS111', 'Phân tích dữ liệu', 'KTTT', 'LT', 15),
('DS200', 'Phân tích dữ liệu lớn', 'KTTT', 'LT', 45),
('DS200_TH', 'Phân tích dữ liệu lớn (Thực hành)', 'KTTT', 'TH', 30),
('DS201', 'Deep Learning trong "KHOA" học dữ liệu', 'KTTT', 'LT', 45),
('DS201_TH', 'Deep Learning trong "KHOA" học dữ liệu (Thực hành)', 'KTTT', 'TH', 30),
('DS202', 'Đồ án "KHOA" học dữ liệu và ứng dụng 1', 'KTTT', 'TH', 60),
('DS203', 'Đồ án "KHOA" học dữ liệu và ứng dụng 2', 'KTTT', 'TH', 60),
('DS204', 'Đồ án "KHOA" học dữ liệu và ứng dụng', 'KTTT', 'TH', 60),
('DS207', 'Đồ án', 'KTTT', 'TH', 60),
('DS300', 'Hệ khuyến nghị', 'KTTT', 'LT', 45),
('DS300_TH', 'Hệ khuyến nghị (Thực hành)', 'KTTT', 'TH', 30),
('DS301', 'Các giải thuật khai phá dữ liệu lớn', 'KTTT', 'LT', 45),
('DS301_TH', 'Các giải thuật khai phá dữ liệu lớn (Thực hành)', 'KTTT', 'TH', 30),
('DS302', 'Phân tích thống kê đa biến', 'KTTT', 'LT', 30),
('DS302_TH', 'Phân tích thống kê đa biến (Thực hành)', 'KTTT', 'TH', 30),
('DS303', 'Thống kê Bayes', 'KTTT', 'LT', 30),
('DS303_TH', 'Thống kê Bayes (Thực hành)', 'KTTT', 'TH', 30),
('DS304', 'Thiết kế và phân tích thực nghiệm', 'KTTT', 'LT', 45),
('DS305', 'Phân tích dữ liệu chuỗi thời gian và ứng dụng', 'KTTT', 'LT', 30),
('DS305_TH', 'Phân tích dữ liệu chuỗi thời gian và ứng dụng (Thực hành)', 'KTTT', 'TH', 30),
('DS306', 'Phân tích dữ liệu lớn trong tài chính', 'KTTT', 'LT', 45),
('DS307', 'Phân tích dữ liệu truyền thông xã hội', 'KTTT', 'LT', 45),
('DS308', 'Mô hình đồ thị xác suất', 'KTTT', 'LT', 45),
('DS308_TH', 'Mô hình đồ thị xác suất (Thực hành)', 'KTTT', 'TH', 30),
('DS309', 'Thực tập doanh nghiệp', 'KTTT', 'LT', 30),
('DS310', 'Xử lý ngôn ngữ tự nhiên cho Khoa học dữ liệu', 'KTTT', 'LT', 45),
('DS310_TH', 'Xử lý ngôn ngữ tự nhiên cho Khoa học dữ liệu (Thực hành)', 'KTTT', 'TH', 30),
('DS311', 'Kỹ năng nghiên cứu và viết bài báo "KHOA" học', 'KTTT', 'LT', 45),
('DS312', 'Xử lý ảnh y "KHOA"', 'KTTT', 'LT', 45),
('DS313', 'Xử lý thông tin giọng nói', 'KTTT', 'LT', 45),
('DS313_TH', 'Xử lý thông tin giọng nói (Thực hành)', 'KTTT', 'TH', 30),
('DS314', 'Rút trích và truy vấn thông tin', 'KTTT', 'LT', 45),
('DS314_TH', 'Rút trích và truy vấn thông tin (Thực hành)', 'KTTT', 'TH', 30),
('DS315', 'Phân tích Kho dữ liệu', 'KTTT', 'LT', 45),
('DS315_TH', 'Phân tích Kho dữ liệu (Thực hành)', 'KTTT', 'TH', 30),
('DS316', 'Xây dựng ứng dụng thông minh', 'KTTT', 'LT', 45),
('DS316_TH', 'Xây dựng ứng dụng thông minh (Thực hành)', 'KTTT', 'TH', 30),
('DS317', 'Khai phá dữ liệu trong doanh nghiệp', 'KTTT', 'LT', 15),
('DS318', 'Đạo đức trong Trí tuệ nhân tạo và Khoa học dữ liệu', 'KTTT', 'LT', 45),
('DS319', 'Mô hình ngôn ngữ lớn', 'KTTT', 'LT', 15),
('DS320', 'Học đa thể thức', 'KTTT', 'LT', 15),
('DS321', 'Khoa học dữ liệu cho An toàn thông tin', 'KTTT', 'LT', 45),
('DS321_TH', 'Khoa học dữ liệu cho An toàn thông tin (Thực hành)', 'KTTT', 'TH', 30),
('DS322', 'Thiết kế hệ thống Học máy', 'KTTT', 'LT', 45),
('DS322_TH', 'Thiết kế hệ thống Học máy (Thực hành)', 'KTTT', 'TH', 30),
('DS323', 'Viết báo cáo kỹ thuật và thuyết trình', 'KTTT', 'LT', 45),
('DS324', 'Khai thác dữ liệu ảnh số', 'KTTT', 'LT', 15),
('DS325', 'Thiết kế ứng dụng với dữ liệu chuyên sâu', 'KTTT', 'LT', 45),
('DS325_TH', 'Thiết kế ứng dụng với dữ liệu chuyên sâu (Thực hành)', 'KTTT', 'TH', 30),
('DS326', 'Khai phá dữ liệu đa phương tiện và ứng dụng', 'KTTT', 'LT', 15),
('DS327', 'Các mô hình nền tảng', 'KTTT', 'LT', 15),
('DS400', 'Chuyên đề tốt nghiệp Khoa học dữ liệu', 'KTTT', 'LT', 60),
('DS501', 'Đồ án tốt nghiệp', 'KTTT', 'LT', 90),
('DS502', 'Đồ án tốt nghiệp tại doanh nghiệp', 'KTTT', 'LT', 150),
('DS505', 'Khóa luận tốt nghiệp', 'KTTT', 'LT', 150),
('DSAL1', 'Cấu trúc dữ liệu và giải thuật', 'CNTT', 'LT', 45),
('DSAL1_TH', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'CNTT', 'TH', 30),
('DSAL2', 'Cấu trúc dữ liệu & giải thuật nâng cao', 'KHMT', 'LT', 45),
('DSAL2_TH', 'Cấu trúc dữ liệu & giải thuật nâng cao (Thực hành)', 'KHMT', 'TH', 30),
('DTH039', 'Đô thị học đại cương', 'CNTT', 'LT', 45),
('EC001', 'Kinh tế học đại cương', 'HTTT', 'LT', 60),
('EC002', 'Quản trị doanh nghiệp', 'HTTT', 'LT', 45),
('EC003', 'Tiếp thị căn bản', 'HTTT', 'LT', 45),
('EC005', 'Giới thiệu ngành Thương mại Điện tử', 'HTTT', 'LT', 15),
('EC101', 'Marketing căn bản', 'HTTT', 'LT', 45),
('EC201', 'Phân tích thiết kế quy trình nghiệp vụ doanh nghiệp', 'HTTT', 'LT', 45),
('EC201_TH', 'Phân tích thiết kế quy trình nghiệp vụ doanh nghiệp (Thực hành)', 'HTTT', 'TH', 30),
('EC202', 'Nhập môn quản trị chuỗi cung ứng', 'HTTT', 'LT', 45),
('EC202_TH', 'Nhập môn quản trị chuỗi cung ứng (Thực hành)', 'HTTT', 'TH', 30),
('EC203', 'Quản trị quan hệ khách hàng và nhà cung cấp', 'HTTT', 'LT', 45),
('EC203_TH', 'Quản trị quan hệ khách hàng và nhà cung cấp (Thực hành)', 'HTTT', 'TH', 30),
('EC204', 'Marketing điện tử', 'HTTT', 'LT', 30),
('EC204_TH', 'Marketing điện tử (Thực hành)', 'HTTT', 'TH', 30),
('EC208', 'QuẢN trị dự án TMĐT', 'HTTT', 'LT', 45),
('EC212', 'Thực tập doanh nghiệp', 'HTTT', 'LT', 45),
('EC213', 'Quản trị quan hệ khách hàng và nhà cung cấp', 'HTTT', 'LT', 30),
('EC213_TH', 'Quản trị quan hệ khách hàng và nhà cung cấp (Thực hành)', 'HTTT', 'TH', 30),
('EC214', 'Nhập môn Quản trị chuỗi cung ứng', 'HTTT', 'LT', 45),
('EC219', 'Pháp luật trong thương mại điện tử', 'HTTT', 'LT', 45),
('EC222', 'Thực tập doanh nghiệp', 'HTTT', 'LT', 30),
('EC229', 'Pháp luật trong thương mại điện tử', 'HTTT', 'LT', 30),
('EC232', 'Nguyên lý kế toán', 'HTTT', 'LT', 45),
('EC301', 'Tiếp thị trực tuyến (E-Marketing)', 'HTTT', 'LT', 45),
('EC301_TH', 'Tiếp thị trực tuyến (E-Marketing) (Thực hành)', 'HTTT', 'TH', 30),
('EC302', 'Thiết kế Hệ thống Thương mại điện tử', 'HTTT', 'LT', 45),
('EC302_TH', 'Thiết kế Hệ thống Thương mại điện tử (Thực hành)', 'HTTT', 'TH', 30),
('EC304', 'Tối ưu hóa công cụ tìm kiếm trong Thương mại điện tử', 'HTTT', 'LT', 45),
('EC311', 'Tiếp thị trực tuyến', 'HTTT', 'LT', 30),
('EC311_TH', 'Tiếp thị trực tuyến (Thực hành)', 'HTTT', 'TH', 30),
('EC312', 'Thiết kế hệ thống thương mại điện tử', 'HTTT', 'LT', 30),
('EC312_TH', 'Thiết kế hệ thống thương mại điện tử (Thực hành)', 'HTTT', 'TH', 30),
('EC331', 'Quản trị chiến lược kinh doanh điện tử', 'HTTT', 'LT', 45),
('EC332', 'Quản trị sản xuất', 'HTTT', 'LT', 45),
('EC333', 'Quản trị tài chính doanh nghiệp', 'HTTT', 'LT', 45),
('EC334', 'Quản trị kênh phân phối', 'HTTT', 'LT', 45),
('EC335', 'An toàn và bảo mật thương mại điện tử', 'HTTT', 'LT', 15),
('EC336', 'Quản trị nhân lực', 'HTTT', 'LT', 45),
('EC337', 'Hệ thống thanh toán trực tuyến', 'HTTT', 'LT', 45),
('EC338', 'Quản trị bán hàng', 'HTTT', 'LT', 45),
('EC401', 'Khóa luận tốt nghiệp', 'HTTT', 'LT', 150),
('EC402', 'Phát triển ứng dụng thương mại di động', 'HTTT', 'LT', 45),
('EC402_TH', 'Phát triển ứng dụng thương mại di động (Thực hành)', 'HTTT', 'TH', 30),
('EC403', 'Thương mại xã hội', 'HTTT', 'LT', 45),
('EC404', 'Đồ án tốt nghiệp', 'HTTT', 'LT', 90),
('EC405', 'Đồ án tốt nghiệp tại doanh nghiệp', 'HTTT', 'LT', 150),
('ECE02', 'Mạch số', 'CNTT', 'LT', 45),
('ECE02_TH', 'Mạch số (Thực hành)', 'CNTT', 'TH', 30),
('ECON3313', 'Kinh tế tiền tệ', 'HTTT', 'LT', 45),
('EN001', 'Anh văn 1', 'CNTT', 'LT', 60),
('EN001.CO', 'English for Communication 1', 'HTTT', 'LT', 15),
('EN001.GE', 'General English', 'HTTT', 'LT', 15),
('EN002', 'Anh văn 2', 'CNTT', 'LT', 15),
('EN002.CO', 'English for Communication 1', 'HTTT', 'LT', 15),
('EN002.GE', 'General English', 'HTTT', 'LT', 15),
('EN003', 'Anh văn 3', 'CNTT', 'LT', 15),
('EN004', 'Anh văn 1', 'CNTT', 'LT', 60),
('EN005', 'Anh văn 2', 'CNTT', 'LT', 60),
('EN006', 'Anh văn 3', 'CNTT', 'LT', 60),
('ENBT', 'Anh văn Bổ túc', 'CNTT', 'LT', 15),
('ENG00', 'Anh văn 0', 'CNTT', 'LT', 15),
('ENG01', 'Anh văn 1', 'CNTT', 'LT', 15),
('ENG02', 'Anh văn 2', 'CNTT', 'LT', 15),
('ENG03', 'Anh văn 3', 'CNTT', 'LT', 15),
('ENG04', 'Anh văn 4', 'CNTT', 'LT', 60),
('ENG05', 'Anh văn 5', 'CNTT', 'LT', 60),
('ENG06', 'Kỹ năng thuyết trình tiếng Anh', 'CNTT', 'LT', 60),
('ENG07', 'Kỹ Năng Viết Luận', 'CNTT', 'LT', 60),
('ENG11', 'Tiếng anh tăng cường I', 'CNTT', 'LT', 15),
('ENG12', 'Tiếng anh tăng cường II', 'CNTT', 'LT', 15),
('ENG13', 'Tiếng Anh I', 'CNTT', 'LT', 15),
('ENG14', 'Tiếng Anh II', 'CNTT', 'LT', 15),
('ENG15', 'Tiếng Anh chuyên ngành CNTT', 'CNTT', 'LT', 15),
('ENGA1', 'Anh văn sơ cấp 1', 'CNTT', 'LT', 15),
('ENGA2', 'Anh văn sơ cấp 2', 'CNTT', 'LT', 15),
('ENGBT', 'Anh văn bổ túc', 'CNTT', 'LT', 15),
('ENGL1113', 'Tiếng Anh I', 'HTTT', 'LT', 45),
('ENGL1213', 'Tiếng Anh II', 'HTTT', 'LT', 45),
('ENLS1', 'Nâng cao kỹ năng nghe, nói tiếng Anh 1', 'CNTT', 'LT', 15),
('ENLS2', 'Nâng cao kỹ năng nghe, nói tiếng Anh 2', 'CNTT', 'LT', 15),
('ENRW1', 'Nâng cao kỹ năng đọc, viết tiếng Anh 1', 'CNTT', 'LT', 15),
('ENRW2', 'Nâng cao kỹ năng đọc, viết tiếng Anh 2', 'CNTT', 'LT', 15),
('GDH075', 'Tâm lý học giao tiếp', 'CNTT', 'LT', 15),
('GDH075_TH', 'Tâm lý học giao tiếp (Thực hành)', 'CNTT', 'TH', 30),
('HCMT1', 'Tư tưởng Hồ Chí Minh', 'CNTT', 'LT', 30),
('IE005', 'Giới thiệu ngành Công nghệ Thông tin', 'KTTT', 'LT', 15),
('IE101', 'Cơ sở hạ tầng công nghệ thông tin', 'KTTT', 'LT', 30),
('IE101_TH', 'Cơ sở hạ tầng công nghệ thông tin (Thực hành)', 'KTTT', 'TH', 30),
('IE102', 'Các công nghệ nền', 'KTTT', 'LT', 30),
('IE102_TH', 'Các công nghệ nền (Thực hành)', 'KTTT', 'TH', 30),
('IE103', 'Quản lý thông tin', 'KTTT', 'LT', 45),
('IE103_TH', 'Quản lý thông tin (Thực hành)', 'KTTT', 'TH', 30),
('IE104', 'Internet và công nghệ Web', 'KTTT', 'LT', 15),
('IE105', 'Nhập môn bảo đảm và an ninh thông tin', 'KTTT', 'LT', 45),
('IE105_TH', 'Nhập môn bảo đảm và an ninh thông tin (Thực hành)', 'KTTT', 'TH', 30),
('IE106', 'Thiết kế giao diện người dùng', 'KTTT', 'LT', 45),
('IE106_TH', 'Thiết kế giao diện người dùng (Thực hành)', 'KTTT', 'TH', 30),
('IE107', 'Thiết kế giao diện người dùng', 'KTTT', 'LT', 45),
('IE107_TH', 'Thiết kế giao diện người dùng (Thực hành)', 'KTTT', 'TH', 30),
('IE108', 'Phân tích thiết kế phần mềm', 'KTTT', 'LT', 45),
('IE108_TH', 'Phân tích thiết kế phần mềm (Thực hành)', 'KTTT', 'TH', 30),
('IE201', 'Xử lý dữ liệu thống kê', 'KTTT', 'LT', 15),
('IE202', 'Quản trị doanh nghiệp', 'KTTT', 'LT', 45),
('IE203', 'Hệ thống quản trị qui trình nghiệp vụ', 'KTTT', 'LT', 15),
('IE204', 'Tối ưu hóa công cụ tìm kiếm', 'KTTT', 'LT', 45),
('IE204_TH', 'Tối ưu hóa công cụ tìm kiếm (Thực hành)', 'KTTT', 'TH', 30),
('IE205', 'Xử lý ảnh vệ "TINH"', 'KTTT', 'LT', 45),
('IE206', 'Đồ án chuẩn bị tốt nghiệp', 'KTTT', 'TH', 60),
('IE207', 'Đồ án', 'KTTT', 'LT', 15),
('IE208', 'Kiến trúc và tích hợp hệ thống', 'KTTT', 'LT', 45),
('IE209', 'Công nghệ Java', 'KTTT', 'LT', 45),
('IE209_TH', 'Công nghệ Java (Thực hành)', 'KTTT', 'TH', 30),
('IE210', 'Hệ thống định vị toàn cầu (GPS)', 'KTTT', 'LT', 45),
('IE211', 'Tin học môi trường', 'KTTT', 'LT', 30),
('IE212', 'Công nghệ Dữ liệu lớn', 'KTTT', 'LT', 45),
('IE212_TH', 'Công nghệ Dữ liệu lớn (Thực hành)', 'KTTT', 'TH', 30),
('IE213', 'Kỹ thuật phát triển hệ thống Web', 'KTTT', 'LT', 45),
('IE213_TH', 'Kỹ thuật phát triển hệ thống Web (Thực hành)', 'KTTT', 'TH', 30),
('IE216', 'Các chủ đề toán học cho KHDL', 'KTTT', 'LT', 45),
('IE217', 'Máy học', 'KTTT', 'LT', 45),
('IE217_TH', 'Máy học (Thực hành)', 'KTTT', 'TH', 30),
('IE218', 'Xử lý dữ liệu lớn', 'KTTT', 'LT', 45),
('IE218_TH', 'Xử lý dữ liệu lớn (Thực hành)', 'KTTT', 'TH', 30),
('IE221', 'Kỹ thuật lập trình Python', 'KTTT', 'LT', 45),
('IE221_TH', 'Kỹ thuật lập trình Python (Thực hành)', 'KTTT', 'TH', 30),
('IE222', 'Phân tích dữ liệu bằng Python', 'KTTT', 'LT', 45),
('IE222_TH', 'Phân tích dữ liệu bằng Python (Thực hành)', 'KTTT', 'TH', 30),
('IE223', 'Phân tích dữ liệu bằng Python &R', 'KTTT', 'LT', 45),
('IE223_TH', 'Phân tích dữ liệu bằng Python &R (Thực hành)', 'KTTT', 'TH', 30),
('IE224', 'Phân tích dữ liệu', 'KTTT', 'LT', 45),
('IE224_TH', 'Phân tích dữ liệu (Thực hành)', 'KTTT', 'TH', 30),
('IE225', 'Mạng kết nối', 'KTTT', 'LT', 45),
('IE225_TH', 'Mạng kết nối (Thực hành)', 'KTTT', 'TH', 30),
('IE226', 'Đồ họa và trực quan hóa máy tính', 'KTTT', 'LT', 45),
('IE226_TH', 'Đồ họa và trực quan hóa máy tính (Thực hành)', 'KTTT', 'TH', 30),
('IE227', 'Xử lý tín hiệu số cho mạng', 'KTTT', 'LT', 45),
('IE227_TH', 'Xử lý tín hiệu số cho mạng (Thực hành)', 'KTTT', 'TH', 30),
('IE228', 'Human-Computer Interaction', 'KTTT', 'LT', 45),
('IE228_TH', 'Human-Computer Interaction (Thực hành)', 'KTTT', 'TH', 30),
('IE229', 'Artificial Intelligence', 'KTTT', 'LT', 45),
('IE229_TH', 'Artificial Intelligence (Thực hành)', 'KTTT', 'TH', 30),
('IE230', 'Viết báo cáo kỹ thuật bằng tiếng Nhật', 'KTTT', 'TH', 60),
('IE231', 'Quản trị doanh nghiệp công nghệ thông tin', 'KTTT', 'LT', 45),
('IE232', 'Nhập môn trí tuệ nhân tạo', 'KTTT', 'LT', 45),
('IE232_TH', 'Nhập môn trí tuệ nhân tạo (Thực hành)', 'KTTT', 'TH', 30),
('IE233', 'Phân tích và mô hình mạng xã hội', 'KTTT', 'LT', 45),
('IE233_TH', 'Phân tích và mô hình mạng xã hội (Thực hành)', 'KTTT', 'TH', 30),
('IE301', 'Quản trị quan hệ khách hàng', 'KTTT', 'LT', 45),
('IE302', 'Kiến trúc và tích hợp hệ thống', 'KTTT', 'LT', 45),
('IE303', 'Công nghệ Java', 'KTTT', 'LT', 45),
('IE303_TH', 'Công nghệ Java (Thực hành)', 'KTTT', 'TH', 30),
('IE304', 'Hệ thống định vị toàn cầu', 'KTTT', 'LT', 45),
('IE305', 'Tin học môi trường', 'KTTT', 'LT', 15),
('IE307', 'Công nghệ lập trình đa nền tảng cho ứng dụng di động', 'KTTT', 'LT', 45),
('IE307_TH', 'Công nghệ lập trình đa nền tảng cho ứng dụng di động (Thực hành)', 'KTTT', 'TH', 30),
('IE309', 'Thực tập doanh nghiệp', 'KTTT', 'LT', 30),
('IE310', 'Tư duy thiết kế', 'KTTT', 'LT', 45),
('IE313', 'Phân tích và trực quan dữ liệu', 'KTTT', 'LT', 45),
('IE313_TH', 'Phân tích và trực quan dữ liệu (Thực hành)', 'KTTT', 'TH', 30),
('IE400', 'Chuyên đề tốt nghiệp', 'KTTT', 'LT', 60),
('IE401', 'Tin-Sinh học', 'KTTT', 'LT', 45),
('IE402', 'Hệ thống thông tin địa lý 3 chiều', 'KTTT', 'LT', 45),
('IE402_TH', 'Hệ thống thông tin địa lý 3 chiều (Thực hành)', 'KTTT', 'TH', 30),
('IE403', 'Khai thác dữ liệu truyền thông xã hội', 'KTTT', 'LT', 45),
('IE404', 'Khai phá truyền thông xã hội', 'KTTT', 'LT', 45),
('IE405', 'Công nghệ phân tích dữ liệu lớn', 'KTTT', 'LT', 45),
('IE405_TH', 'Công nghệ phân tích dữ liệu lớn (Thực hành)', 'KTTT', 'TH', 30),
('IE406', 'Nhập môn ẩn thông tin và ứng dụng', 'KTTT', 'LT', 45),
('IE501', 'Đồ án tốt nghiệp', 'KTTT', 'LT', 90),
('IE502', 'Đồ án tốt nghiệp tại doanh nghiệp', 'KTTT', 'LT', 150),
('IE505', 'Khóa luận tốt nghiệp', 'KTTT', 'LT', 150),
('IEM4733', 'Tái cấu trúc quy trình doanh nghiệp', 'HTTT', 'LT', 45),
('IEM5723', 'Mô hình hóa dữ liệu, quy trình và đối tượng', 'HTTT', 'LT', 45),
('INI01', 'Thực tập quốc tế', 'CNTT', 'LT', 30),
('INT001', 'Tiếng Anh tổng quát (tạm gọi)', 'HTTT', 'LT', 15),
('INT002', 'Toeic 1', 'HTTT', 'LT', 15),
('INT003', 'Tiếng Anh tổng quát 2 (tạm gọi)', 'HTTT', 'LT', 15),
('INT004', 'Toeic 2', 'HTTT', 'LT', 15),
('INT005', 'Tiếng Anh giao tiếp (tạm gọi)', 'HTTT', 'LT', 15),
('INT006', 'Toeic 3', 'HTTT', 'LT', 15),
('IS005', 'Giới thiệu ngành Hệ thống Thông tin', 'HTTT', 'LT', 15),
('IS101', 'Thiết kế cơ sở dữ liệu', 'HTTT', 'LT', 45),
('IS101_TH', 'Thiết kế cơ sở dữ liệu (Thực hành)', 'HTTT', 'TH', 30),
('IS102', 'Các hệ cơ sở tri thức', 'HTTT', 'LT', 45),
('IS103', 'Hệ quản trị cơ sở dữ liệu', 'HTTT', 'LT', 45),
('IS103_TH', 'Hệ quản trị cơ sở dữ liệu (Thực hành)', 'HTTT', 'TH', 30),
('IS104', 'Cơ sở dữ liệu phân tán', 'HTTT', 'LT', 45),
('IS104_TH', 'Cơ sở dữ liệu phân tán (Thực hành)', 'HTTT', 'TH', 30),
('IS105', 'Hệ quản trị cơ sở dữ liệu Oracle', 'HTTT', 'LT', 45),
('IS105_TH', 'Hệ quản trị cơ sở dữ liệu Oracle (Thực hành)', 'HTTT', 'TH', 30),
('IS106', 'Khai thác dữ liệu', 'HTTT', 'LT', 45),
('IS106_TH', 'Khai thác dữ liệu (Thực hành)', 'HTTT', 'TH', 30),
('IS107', 'Hệ thống thông tin kế toán', 'HTTT', 'LT', 75),
('IS201', 'Phân tích thiết kế hệ thống thông tin', 'HTTT', 'LT', 15),
('IS202', 'Nhập môn công nghệ phần mềm', 'HTTT', 'LT', 45),
('IS202_TH', 'Nhập môn công nghệ phần mềm (Thực hành)', 'HTTT', 'TH', 30),
('IS203', 'Lập trình cơ sở dữ liệu', 'HTTT', 'LT', 45),
('IS203_TH', 'Lập trình cơ sở dữ liệu (Thực hành)', 'HTTT', 'TH', 30),
('IS204', 'Nhập môn hệ thống thông tin địa lý', 'HTTT', 'LT', 45),
('IS204_TH', 'Nhập môn hệ thống thông tin địa lý (Thực hành)', 'HTTT', 'TH', 30),
('IS205', 'PTTK hướng đối tượng với UML', 'HTTT', 'LT', 45),
('IS205_TH', 'PTTK hướng đối tượng với UML (Thực hành)', 'HTTT', 'TH', 30),
('IS206', 'Lập trình ứng dụng Web với Java', 'HTTT', 'LT', 45),
('IS206_TH', 'Lập trình ứng dụng Web với Java (Thực hành)', 'HTTT', 'TH', 30),
('IS207', 'Phát triển ứng dụng web', 'HTTT', 'LT', 45),
('IS207_TH', 'Phát triển ứng dụng web (Thực hành)', 'HTTT', 'TH', 30),
('IS208', 'Quản lý dự án công nghệ thông tin', 'HTTT', 'LT', 45),
('IS208_TH', 'Quản lý dự án công nghệ thông tin (Thực hành)', 'HTTT', 'TH', 30),
('IS210', 'Hệ quản trị cơ sở dữ liệu', 'HTTT', 'LT', 45),
('IS210_TH', 'Hệ quản trị cơ sở dữ liệu (Thực hành)', 'HTTT', 'TH', 30),
('IS211', 'Cơ sở dữ liệu phân tán', 'HTTT', 'LT', 15),
('IS212', 'Thực tập tốt nghiệp', 'HTTT', 'LT', 45),
('IS213', 'Đồ án xây dựng một hệ thống thông tin', 'HTTT', 'LT', 45),
('IS214', 'Thiết kế cơ sở dữ liệu', 'HTTT', 'LT', 45),
('IS214_TH', 'Thiết kế cơ sở dữ liệu (Thực hành)', 'HTTT', 'TH', 30),
('IS215', 'Thiết kế hướng đối tượng với UML', 'HTTT', 'LT', 15),
('IS216', 'Lập trình Java', 'HTTT', 'LT', 45),
('IS216_TH', 'Lập trình Java (Thực hành)', 'HTTT', 'TH', 30),
('IS217', 'Kho dữ liệu và OLAP', 'HTTT', 'LT', 45),
('IS218', 'Kỹ năng tư vấn', 'HTTT', 'LT', 30),
('IS219', 'Pháp luật trong Thương mại điện tử', 'HTTT', 'LT', 45),
('IS220', 'Xây dựng HTTT trên các framework', 'HTTT', 'LT', 45),
('IS220_TH', 'Xây dựng HTTT trên các framework (Thực hành)', 'HTTT', 'TH', 30),
('IS225', 'Khai thác dữ liệu và ứng dụng', 'CNTT', 'LT', 60),
('IS232', 'Hệ thống thông tin kế toán', 'HTTT', 'LT', 60),
('IS251', 'Nhập môn Hệ thống thông tin địa lý', 'HTTT', 'LT', 45),
('IS251_TH', 'Nhập môn Hệ thống thông tin địa lý (Thực hành)', 'HTTT', 'TH', 30),
('IS252', 'Khai thác dữ liệu', 'HTTT', 'LT', 15),
('IS253', 'Lập trình ứng dụng trên thiết bị di động', 'HTTT', 'LT', 30),
('IS253_TH', 'Lập trình ứng dụng trên thiết bị di động (Thực hành)', 'HTTT', 'TH', 30),
('IS254', 'Hệ hỗ trợ quyết định', 'HTTT', 'LT', 45),
('IS301', 'Thương mại điện tử', 'HTTT', 'LT', 45),
('IS302', 'Phân tích không gian', 'HTTT', 'LT', 45),
('IS302_TH', 'Phân tích không gian (Thực hành)', 'HTTT', 'TH', 30),
('IS303', 'Hệ cơ sở dữ liệu không gian', 'HTTT', 'LT', 45),
('IS303_TH', 'Hệ cơ sở dữ liệu không gian (Thực hành)', 'HTTT', 'TH', 30),
('IS3033', 'Quản lý dự án hệ thống thông tin', 'HTTT', 'LT', 60),
('IS304', 'Kho dữ liệu và OLAP', 'HTTT', 'LT', 15),
('IS305', 'An toàn và bảo mật HTTT', 'HTTT', 'LT', 45),
('IS306', 'Hệ thống thông tin quản lý', 'HTTT', 'LT', 45),
('IS311', 'Đồ án xây dựng hệ thống thông tin', 'HTTT', 'LT', 45),
('IS3303', 'Phân tích thiết kế hệ thống', 'HTTT', 'LT', 60),
('IS332', 'Hệ thống thông tin quản lý', 'HTTT', 'LT', 45),
('IS334', 'Thương mại điện tử', 'HTTT', 'LT', 45),
('IS335', 'An toàn và bảo mật hệ thống thông tin', 'HTTT', 'LT', 15),
('IS336', 'Hoạch định nguồn lực doanh nghiệp', 'HTTT', 'LT', 45),
('IS336_TH', 'Hoạch định nguồn lực doanh nghiệp (Thực hành)', 'HTTT', 'TH', 30),
('IS337', 'Cơ sở dữ liệu nâng cao', 'HTTT', 'LT', 45),
('IS337_TH', 'Cơ sở dữ liệu nâng cao (Thực hành)', 'HTTT', 'TH', 30),
('IS338', 'Dự báo kinh doanh', 'HTTT', 'LT', 45),
('IS339', 'Sinh tin học', 'HTTT', 'LT', 45),
('IS340', 'Thị trường chứng khoán', 'HTTT', 'LT', 45),
('IS341', 'Khởi nghiệp', 'HTTT', 'LT', 45),
('IS342', 'Chính phủ điện tử', 'HTTT', 'LT', 45),
('IS343', 'Luật CNTT', 'HTTT', 'LT', 45),
('IS344', 'Quản trị nguồn lực y tế', 'HTTT', 'LT', 30),
('IS344_TH', 'Quản trị nguồn lực y tế (Thực hành)', 'HTTT', 'TH', 30),
('IS345', 'AI trong y tế', 'HTTT', 'LT', 45),
('IS346', 'Quản lý dự án công nghệ thông tin y tế', 'HTTT', 'LT', 30),
('IS346_TH', 'Quản lý dự án công nghệ thông tin y tế (Thực hành)', 'HTTT', 'TH', 30),
('IS347', 'Thống kê y học', 'HTTT', 'LT', 45),
('IS348', 'Dịch tễ học', 'HTTT', 'LT', 30),
('IS348_TH', 'Dịch tễ học (Thực hành)', 'HTTT', 'TH', 30),
('IS349', 'Hệ thống y tế', 'HTTT', 'LT', 45),
('IS351', 'Phân tích không gian', 'HTTT', 'LT', 45),
('IS351_TH', 'Phân tích không gian (Thực hành)', 'HTTT', 'TH', 30),
('IS352', 'Hệ cơ sở dữ liệu không gian', 'HTTT', 'LT', 15),
('IS353', 'Mạng xã hội', 'HTTT', 'LT', 15),
('IS354', 'Công nghệ tài chính căn bản Fintech', 'HTTT', 'LT', 45),
('IS355', 'Công nghệ Blockchain', 'HTTT', 'LT', 15),
('IS356', 'Agile IT với DevOps', 'HTTT', 'LT', 45),
('IS357', 'Kiến trúc hướng dịch vụ', 'HTTT', 'LT', 45),
('IS358', 'Kiểm soát nhiễm khuẩn bệnh viện', 'HTTT', 'LT', 45),
('IS360', 'Quản lý chăm sóc và điều trị', 'HTTT', 'LT', 45),
('IS361', 'Quản lý chuỗi cung ứng dược và thiết bị y tế', 'HTTT', 'LT', 45),
('IS362', 'Quản trị tài chính và bảo hiểm y tế', 'HTTT', 'LT', 45),
('IS363', 'Pháp luật trong lĩnh vực y tế', 'HTTT', 'LT', 30),
('IS364', 'Mã tiêu chuẩn dùng chung trong y tế', 'HTTT', 'LT', 45),
('IS401', 'Khóa luận tốt nghiệp', 'HTTT', 'LT', 150),
('IS4013', 'Thiết kế, quản lý và quản trị hệ CSDL', 'HTTT', 'LT', 45),
('IS402', 'Điện toán đám mây', 'HTTT', 'LT', 15),
('IS403', 'Phân tích dữ liệu kinh doanh', 'HTTT', 'LT', 15),
('IS404', 'Kho dữ liệu và OLAP', 'HTTT', 'LT', 45),
('IS404_TH', 'Kho dữ liệu và OLAP (Thực hành)', 'HTTT', 'TH', 30),
('IS405', 'Dữ liệu lớn', 'HTTT', 'LT', 45),
('IS405_TH', 'Dữ liệu lớn (Thực hành)', 'HTTT', 'TH', 30),
('IS406', 'Điện toán đám mây và xử lý dữ liệu lớn', 'HTTT', 'LT', 45),
('IS407', 'Đồ án tốt nghiệp', 'HTTT', 'LT', 90),
('IS4133', 'Công nghệ thông tin cho thương mại điện tử', 'HTTT', 'LT', 45),
('IS4263', 'Các ứng dụng thông minh và hỗ trợ ra quyết định', 'HTTT', 'LT', 45),
('IS4523', 'Hệ truyền thông dữ liệu', 'HTTT', 'LT', 45),
('IS501', 'Thực tập cuối khóa', 'HTTT', 'LT', 45),
('IS502', 'Thực tập doanh nghiệp', 'HTTT', 'LT', 30),
('IS503', 'Đồ án tốt nghiệp tại doanh nghiệp', 'HTTT', 'LT', 150),
('IS505', 'Khóa luận tốt nghiệp', 'HTTT', 'LT', 150),
('IS5100', 'Thực tập cuối khóa', 'HTTT', 'LT', 60),
('IS6301', 'Phân tích thiết kế hệ thống thông tin nâng cao', 'HTTT', 'LT', 60),
('IS6301_TH', 'Phân tích thiết kế hệ thống thông tin nâng cao (Thực hành)', 'HTTT', 'TH', 90),
('IT001', 'Nhập môn lập trình', 'KHMT', 'LT', 45),
('IT001_TH', 'Nhập môn lập trình (Thực hành)', 'KHMT', 'TH', 30),
('IT002', 'Lập trình hướng đối tượng', 'CNPM', 'LT', 45),
('IT002_TH', 'Lập trình hướng đối tượng (Thực hành)', 'CNPM', 'TH', 30),
('IT003', 'Cấu trúc dữ liệu và giải thuật', 'KHMT', 'LT', 45),
('IT003_TH', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'KHMT', 'TH', 30),
('IT004', 'Cơ sở dữ liệu', 'HTTT', 'LT', 45),
('IT004_TH', 'Cơ sở dữ liệu (Thực hành)', 'HTTT', 'TH', 30),
('IT005', 'Nhập môn mạng máy tính', 'MMT', 'LT', 45),
('IT005_TH', 'Nhập môn mạng máy tính (Thực hành)', 'MMT', 'TH', 30),
('IT006', 'Kiến trúc máy tính', 'KTMT', 'LT', 15),
('IT007', 'Hệ điều hành', 'KTMT', 'LT', 45),
('IT007_TH', 'Hệ điều hành (Thực hành)', 'KTMT', 'TH', 30),
('IT008', 'Lập trình trực quan', 'CNPM', 'LT', 15),
('IT009', 'Giới thiệu ngành', 'CNTT', 'LT', 15),
('IT010', 'Tổ chức và cấu trúc máy tính', 'KTMT', 'LT', 30),
('IT011', 'Nhập môn lập trình thi đấu', 'KHMT', 'LT', 45),
('IT011_TH', 'Nhập môn lập trình thi đấu (Thực hành)', 'KHMT', 'TH', 30),
('IT012', 'Tổ chức và Cấu trúc Máy tính II', 'KTMT', 'LT', 45),
('IT012_TH', 'Tổ chức và Cấu trúc Máy tính II (Thực hành)', 'KTMT', 'TH', 30),
('IT013', 'Cấu trúc dữ liệu cho lập trình thi đấu', 'KHMT', 'LT', 45),
('IT013_TH', 'Cấu trúc dữ liệu cho lập trình thi đấu (Thực hành)', 'KHMT', 'TH', 30),
('ITEM1', 'Nhập môn Quản trị doanh nghiệp', 'CNTT', 'LT', 30),
('ITEW1', 'Nhập môn công tác kỹ sư', 'CNTT', 'LT', 15),
('ITNT005', 'Communication', 'HTTT', 'LT', 15),
('JAN01', 'Tiếng Nhật 1', 'CNTT', 'LT', 30),
('JAN01_TH', 'Tiếng Nhật 1 (Thực hành)', 'CNTT', 'TH', 90),
('JAN02', 'Tiếng Nhật 2', 'CNTT', 'LT', 30),
('JAN02_TH', 'Tiếng Nhật 2 (Thực hành)', 'CNTT', 'TH', 90),
('JAN03', 'Tiếng Nhật 3', 'CNTT', 'LT', 30),
('JAN03_TH', 'Tiếng Nhật 3 (Thực hành)', 'CNTT', 'TH', 90),
('JAN04', 'Tiếng Nhật 4', 'CNTT', 'LT', 30),
('JAN04_TH', 'Tiếng Nhật 4 (Thực hành)', 'CNTT', 'TH', 90),
('JAN05', 'Tiếng Nhật 5', 'CNTT', 'LT', 30),
('JAN05_TH', 'Tiếng Nhật 5 (Thực hành)', 'CNTT', 'TH', 90),
('JAN06', 'Tiếng Nhật 6', 'CNTT', 'LT', 15),
('JAN06_TH', 'Tiếng Nhật 6 (Thực hành)', 'CNTT', 'TH', 60),
('JAN07', 'Tiếng Nhật 7', 'CNTT', 'LT', 15),
('JAN07_TH', 'Tiếng Nhật 7 (Thực hành)', 'CNTT', 'TH', 60),
('JAN08', 'Tiếng Nhật 8', 'CNTT', 'LT', 15),
('JAN08_TH', 'Tiếng Nhật 8 (Thực hành)', 'CNTT', 'TH', 60),
('JANHU', 'Tiếng Nhật miễn phí do Huredee tài trợ', 'CNTT', 'LT', 600),
('LIA01', 'Đại số tuyến tính', 'CNTT', 'LT', 45),
('LIA11', 'Đại số tuyến tính', 'CNTT', 'LT', 45),
('MA001', 'Giải tích 1', 'CNTT', 'LT', 45),
('MA002', 'Giải tích 2', 'CNTT', 'LT', 45),
('MA003', 'Đại số tuyến tính', 'CNTT', 'LT', 45),
('MA004', 'Cấu trúc rời rạc', 'CNTT', 'LT', 60),
('MA005', 'Xác suất thống kê', 'CNTT', 'LT', 45),
('MA006', 'Giải tích', 'CNTT', 'LT', 60),
('MAT01', 'Toán cao cấp A1', 'CNTT', 'LT', 45),
('MAT02', 'Toán cao cấp A2', 'CNTT', 'LT', 60),
('MAT04', 'Cấu trúc rời rạc', 'CNTT', 'LT', 60),
('MAT11', 'Giải tích 1', 'CNTT', 'LT', 60),
('MAT12', 'Giải tích 2', 'CNTT', 'LT', 45),
('MAT14', 'Toán rời rạc cho máy tính', 'CNTT', 'LT', 45),
('MAT21', 'Toán cao cấp A1 (TE)', 'CNTT', 'LT', 15),
('MAT22', 'Toán cao cấp A2 (TE)', 'CNTT', 'LT', 15),
('MAT23', 'Đại số tuyến tính', 'CNTT', 'LT', 60),
('MAT24', 'Cấu trúc rời rạc (TE)', 'CNTT', 'LT', 60),
('MATH2144', 'Giải tích I', 'HTTT', 'LT', 60),
('MATH2153', 'Giải tích II', 'HTTT', 'LT', 45),
('MATH2154', 'Giải tích', 'HTTT', 'LT', 60),
('MATH3013', 'Đại số tuyến tính', 'HTTT', 'LT', 45),
('ME001', 'Giáo dục quốc phòng', 'CNTT', 'LT', 15),
('MEDU1', 'Giáo dục quốc phòng', 'CNTT', 'LT', 15),
('MKTG4223', 'Quản trị chuỗi cung ứng', 'HTTT', 'LT', 45),
('MKTG5883', 'Khai phá dữ liệu và ứng dụng', 'HTTT', 'LT', 45),
('MKTG5883_TH', 'Khai phá dữ liệu và ứng dụng (Thực hành)', 'HTTT', 'TH', 30),
('MLPE1', 'Kinh tế chính trị Mác-Lênin (TE)', 'CNTT', 'LT', 75),
('MLPE2', 'Kinh tế chính trị Mác-Lênin (TE1)', 'CNTT', 'LT', 60),
('MM001', 'Kỹ năng truyền thông cho người làm CNTT', 'CNTT', 'LT', 30),
('MM001_TH', 'Kỹ năng truyền thông cho người làm CNTT (Thực hành)', 'CNTT', 'TH', 30),
('MM002', 'Truyền thông Kỹ thuật số', 'CNTT', 'LT', 30),
('MM002_TH', 'Truyền thông Kỹ thuật số (Thực hành)', 'CNTT', 'TH', 30),
('MM003', 'Quản trị sự kiện', 'CNPM', 'LT', 45),
('MM003_TH', 'Quản trị sự kiện (Thực hành)', 'CNPM', 'TH', 30),
('MM004', 'Nguyên lý thiết kế đồ hoạ', 'CNPM', 'TH', 60),
('MM005', 'Nhập môn marketing', 'CNPM', 'LT', 30),
('MM006', 'Tâm lý học đại cương', 'CNPM', 'LT', 30),
('MM007', 'Tư duy sáng tạo và xu hướng thiết kế truyền thông', 'CNPM', 'LT', 30),
('MM008', 'Kỹ năng truyền thông ứng dụng', 'CNPM', 'LT', 30),
('MM101', 'Giới thiệu ngành Truyền thông đa phương tiện', 'CNPM', 'LT', 15),
('MM102', 'Lý luận truyền thông đại chúng', 'CNPM', 'LT', 45),
('MM103', 'Cơ sở tạo hình và nguyên lý thị giác', 'CNPM', 'LT', 30),
('MM104', 'Viết nội dung đa phương tiện', 'CNPM', 'LT', 45),
('MM105', 'Nhập môn kỹ thuật sản xuất nội dung đa phương tiện', 'CNPM', 'LT', 30),
('MM105_TH', 'Nhập môn kỹ thuật sản xuất nội dung đa phương tiện (Thực hành)', 'CNPM', 'TH', 30),
('MM106', 'Thu thập và phân tích khám phá dữ liệu Truyền thông đa phương tiện', 'CNPM', 'LT', 30),
('MM106_TH', 'Thu thập và phân tích khám phá dữ liệu Truyền thông đa phương tiện (Thực hành)', 'CNPM', 'TH', 30),
('MM107', 'Học máy ứng dụng trong Truyền thông đa phương tiện', 'CNPM', 'LT', 30),
('MM107_TH', 'Học máy ứng dụng trong Truyền thông đa phương tiện (Thực hành)', 'CNPM', 'TH', 30),
('MM108', 'Tiếp thị số', 'CNPM', 'LT', 30),
('MM108_TH', 'Tiếp thị số (Thực hành)', 'CNPM', 'TH', 30),
('MM109', 'Thiết kế đồ họa', 'CNPM', 'LT', 45),
('MM109_TH', 'Thiết kế đồ họa (Thực hành)', 'CNPM', 'TH', 30),
('MM110', 'Màu sắc và tâm lý thị giác trong thiết kế truyền thông', 'CNPM', 'LT', 30),
('MM201', 'Truyền thông và dư luận xã hội', 'CNPM', 'LT', 45),
('MM201_TH', 'Truyền thông và dư luận xã hội (Thực hành)', 'CNPM', 'TH', 30),
('MM202', 'Học sâu ứng dụng trong truyền thông đa phương tiện', 'CNPM', 'LT', 45),
('MM202_TH', 'Học sâu ứng dụng trong truyền thông đa phương tiện (Thực hành)', 'CNPM', 'TH', 30),
('MM203', 'Xử lý ngôn ngữ tự nhiên cho truyền thông đa phương tiện', 'CNPM', 'LT', 45),
('MM203_TH', 'Xử lý ngôn ngữ tự nhiên cho truyền thông đa phương tiện (Thực hành)', 'CNPM', 'TH', 30),
('MM204', 'Xử lý ảnh số và video trong truyền thông đa phương tiện', 'CNPM', 'LT', 45),
('MM204_TH', 'Xử lý ảnh số và video trong truyền thông đa phương tiện (Thực hành)', 'CNPM', 'TH', 30),
('MM205', 'Phân tích và hiểu nội dung đa phương thức', 'CNPM', 'LT', 45),
('MM205_TH', 'Phân tích và hiểu nội dung đa phương thức (Thực hành)', 'CNPM', 'TH', 30),
('MM206', 'Dữ liệu lớn ứng dụng trong truyền thông đa phương tiện', 'CNPM', 'LT', 45),
('MM206_TH', 'Dữ liệu lớn ứng dụng trong truyền thông đa phương tiện (Thực hành)', 'CNPM', 'TH', 30),
('MM207', 'Hệ thống khai phá dữ liệu mạng xã hội', 'CNPM', 'LT', 45),
('MM207_TH', 'Hệ thống khai phá dữ liệu mạng xã hội (Thực hành)', 'CNPM', 'TH', 30),
('MM208', 'Thiết kế và sản xuất ấn phẩm', 'CNPM', 'LT', 45),
('MM208_TH', 'Thiết kế và sản xuất ấn phẩm (Thực hành)', 'CNPM', 'TH', 30),
('MM209', 'Nghiệp vụ truyền thông và báo chí', 'CNPM', 'LT', 45),
('MM209_TH', 'Nghiệp vụ truyền thông và báo chí (Thực hành)', 'CNPM', 'TH', 30),
('MM210', 'Kỹ thuật quay phim biên kịch và hậu kỳ', 'CNPM', 'LT', 45),
('MM210_TH', 'Kỹ thuật quay phim biên kịch và hậu kỳ (Thực hành)', 'CNPM', 'TH', 30),
('MM211', 'Thực tế ảo và thực tế tăng cường', 'CNPM', 'LT', 45),
('MM211_TH', 'Thực tế ảo và thực tế tăng cường (Thực hành)', 'CNPM', 'TH', 30),
('MM212', 'Hoạt hình', 'CNPM', 'LT', 30),
('MM212_TH', 'Hoạt hình (Thực hành)', 'CNPM', 'TH', 30),
('MM213', 'Quản lý dự án truyền thông đa phương tiện', 'CNPM', 'LT', 45),
('MM213_TH', 'Quản lý dự án truyền thông đa phương tiện (Thực hành)', 'CNPM', 'TH', 30),
('MM214', 'Chiến lược phát triển thương hiệu', 'CNPM', 'LT', 45),
('MM215', 'Quan hệ công chúng trong marketing', 'CNPM', 'LT', 45),
('MM216', 'Tối ưu hóa và tiếp thị trên công cụ tìm kiếm', 'CNPM', 'LT', 45),
('MM216_TH', 'Tối ưu hóa và tiếp thị trên công cụ tìm kiếm (Thực hành)', 'CNPM', 'TH', 30),
('MM217', 'Tiếp thị cho sản phẩm dịch vụ', 'CNPM', 'LT', 45),
('MM218', 'Xây dựng kênh tiếp thị trực tuyến', 'CNPM', 'LT', 45),
('MM219', 'Quản trị mối quan hệ khách hàng định hướng dữ liệu', 'CNPM', 'LT', 45),
('MM219_TH', 'Quản trị mối quan hệ khách hàng định hướng dữ liệu (Thực hành)', 'CNPM', 'TH', 30),
('MM220', 'Phân tích dữ liệu truyền thông số', 'CNPM', 'LT', 45),
('MM220_TH', 'Phân tích dữ liệu truyền thông số (Thực hành)', 'CNPM', 'TH', 30),
('MM221', 'Chuyên đề các vấn đề hiện đại trong Truyền thông đa phương tiện', 'CNPM', 'LT', 45),
('MM222', 'An ninh thông tin trong truyền thông đa phương tiện', 'CNPM', 'LT', 45),
('MM222_TH', 'An ninh thông tin trong truyền thông đa phương tiện (Thực hành)', 'CNPM', 'TH', 30),
('MM223', 'Kể chuyện tương tác', 'CNPM', 'LT', 45),
('MM223_TH', 'Kể chuyện tương tác (Thực hành)', 'CNPM', 'TH', 30),
('MM224', 'Hình họa cơ bản', 'CNPM', 'LT', 45),
('MM224_TH', 'Hình họa cơ bản (Thực hành)', 'CNPM', 'TH', 30),
('MM301', 'Đồ án Truyền thông đa phương tiện', 'CNPM', 'TH', 60),
('MM302', 'Thực tập', 'CNPM', 'TH', 60),
('MM304', 'Khởi nghiệp ngành Truyền thông đa phương tiện', 'CNPM', 'LT', 30),
('MM504', 'Đồ án tốt nghiệp', 'CNPM', 'TH', 180),
('MM505', 'Khóa luận tốt nghiệp', 'CNPM', 'TH', 300),
('MM506', 'Đồ án tốt nghiệp tại doanh nghiệp', 'CNPM', 'TH', 300),
('MSIS207', 'Phát triển ứng dụng web', 'HTTT', 'LT', 15),
('MSIS2433', 'Lập trình hướng đối tượng', 'HTTT', 'LT', 45),
('MSIS3033', 'Quản lý dự án hệ thống thông tin', 'HTTT', 'LT', 45),
('MSIS3233', 'Khoa học quản lý', 'HTTT', 'LT', 45),
('MSIS3242', 'Quản lý chất lượng phần mềm', 'HTTT', 'LT', 45),
('MSIS3243', 'Lý thuyết quyết định quản lý', 'HTTT', 'LT', 45),
('MSIS3303', 'Phân tích thiết kế hệ thống', 'HTTT', 'LT', 45),
('MSIS3303_TH', 'Phân tích thiết kế hệ thống (Thực hành)', 'HTTT', 'TH', 30),
('MSIS4013', 'Thiết kế, quản lý và quản trị hệ CSDL', 'HTTT', 'LT', 45),
('MSIS402', 'Điện toán đám mây', 'HTTT', 'LT', 45),
('MSIS405', 'Dữ liệu lớn', 'HTTT', 'LT', 45),
('MSIS406', 'Dữ liệu lớn trên nền điện toán đám mây', 'HTTT', 'LT', 45),
('MSIS406_TH', 'Dữ liệu lớn trên nền điện toán đám mây (Thực hành)', 'HTTT', 'TH', 30),
('MSIS4133', 'Công nghệ thông tin trong thương mại điện tử', 'HTTT', 'LT', 45),
('MSIS4243', 'Điều khiển và giám sát hệ thống thông tin', 'HTTT', 'LT', 45),
('MSIS4263', 'Các ứng dụng thông minh và hỗ trợ ra quyết định', 'HTTT', 'LT', 45),
('MSIS4363', 'Các chủ đề nâng cao trong phát triển hệ thống', 'HTTT', 'LT', 45),
('MSIS4443', 'Các hệ thống mô phỏng trên máy tính', 'HTTT', 'LT', 45),
('MSIS4523', 'Hệ truyền thông dữ liệu', 'HTTT', 'LT', 45),
('MSIS4800', 'Hệ thống thông tin tính toán', 'HTTT', 'LT', 45),
('MSIS4801', 'Quản lý thông tin địa lý', 'HTTT', 'LT', 45),
('MSIS4801_TH', 'Quản lý thông tin địa lý (Thực hành)', 'HTTT', 'TH', 30),
('MSIS5723', 'Phân tích thiết kế hệ thống thông tin', 'HTTT', 'LT', 45),
('MSIS5723_TH', 'Phân tích thiết kế hệ thống thông tin (Thực hành)', 'HTTT', 'TH', 30),
('NHJP1', 'Tiếng Nhật Sơ cấp 1', 'CNTT', 'LT', 15),
('NHJP2', 'Tiếng Nhật Sơ cấp 2', 'CNTT', 'LT', 15),
('NNH050', 'Ngôn ngữ quảng cáo', 'CNTT', 'LT', 30),
('NT005', 'Giới thiệu ngành Mạng máy tính và Truyền thông dữ liệu', 'MMT', 'LT', 15),
('NT015', 'Giới thiệu ngành An toàn Thông tin', 'MMT', 'LT', 15),
('NT101', 'An toàn mạng máy tính', 'MMT', 'LT', 45),
('NT101_TH', 'An toàn mạng máy tính (Thực hành)', 'MMT', 'TH', 30),
('NT102', 'Điện tử cho công nghệ thông tin', 'MMT', 'LT', 45),
('NT102_TH', 'Điện tử cho công nghệ thông tin (Thực hành)', 'MMT', 'TH', 30),
('NT103', 'Hệ điều hành Linux', 'MMT', 'LT', 45),
('NT103_TH', 'Hệ điều hành Linux (Thực hành)', 'MMT', 'TH', 30),
('NT104', 'Lý thuyết thông tin', 'MMT', 'LT', 45),
('NT105', 'Truyền dữ liệu', 'MMT', 'LT', 45),
('NT105_TH', 'Truyền dữ liệu (Thực hành)', 'MMT', 'TH', 30),
('NT106', 'Lập trình mạng căn bản', 'MMT', 'LT', 15),
('NT107', 'Xử lý tín hiệu trong truyển thông', 'MMT', 'LT', 45),
('NT107_TH', 'Xử lý tín hiệu trong truyển thông (Thực hành)', 'MMT', 'TH', 30),
('NT108', 'Mạng truyền thông và di động', 'MMT', 'LT', 45),
('NT109', 'Lập trình ứng dụng mạng', 'MMT', 'LT', 15),
('NT110', 'Tín hiệu và mạch', 'MMT', 'LT', 45),
('NT111', 'Thiết bị mạng và truyền thông ĐPT', 'MMT', 'LT', 45),
('NT111_TH', 'Thiết bị mạng và truyền thông ĐPT (Thực hành)', 'MMT', 'TH', 30),
('NT112', 'Công nghệ mạng viễn thông', 'MMT', 'LT', 30),
('NT112_TH', 'Công nghệ mạng viễn thông (Thực hành)', 'MMT', 'TH', 30),
('NT113', 'Thiết kế Mạng', 'MMT', 'LT', 30),
('NT113_TH', 'Thiết kế Mạng (Thực hành)', 'MMT', 'TH', 30),
('NT114', 'Đồ án chuyên ngành', 'MMT', 'TH', 60),
('NT115', 'Thực tập doanh nghiệp', 'MMT', 'LT', 45),
('NT116', 'Kỹ năng mềm', 'MMT', 'TH', 60),
('NT117', 'Đồ án môn học Lập trình ứng dụng Mạng', 'MMT', 'TH', 60),
('NT118', 'Phát triển ứng dụng trên thiết bị di động', 'MMT', 'LT', 30),
('NT118_TH', 'Phát triển ứng dụng trên thiết bị di động (Thực hành)', 'MMT', 'TH', 30),
('NT119', 'Mật mã học', 'MMT', 'LT', 15),
('NT121', 'Thiết bị mạng và truyền thông ĐPT', 'MMT', 'LT', 30),
('NT121_TH', 'Thiết bị mạng và truyền thông ĐPT (Thực hành)', 'MMT', 'TH', 30),
('NT130', 'Cơ chế hoạt động của mã độc', 'MMT', 'LT', 15),
('NT131', 'Hệ thống nhúng Mạng không dây', 'MMT', 'LT', 45),
('NT131_TH', 'Hệ thống nhúng Mạng không dây (Thực hành)', 'MMT', 'TH', 30),
('NT132', 'Quản trị mạng và hệ thống', 'MMT', 'LT', 45),
('NT132_TH', 'Quản trị mạng và hệ thống (Thực hành)', 'MMT', 'TH', 30),
('NT133', 'An toàn kiến trúc hệ thống', 'MMT', 'LT', 15),
('NT137', 'Kỹ thuật phân tích mã độc', 'MMT', 'LT', 30),
('NT137_TH', 'Kỹ thuật phân tích mã độc (Thực hành)', 'MMT', 'TH', 30),
('NT140', 'An toàn mạng', 'MMT', 'LT', 45),
('NT140_TH', 'An toàn mạng (Thực hành)', 'MMT', 'TH', 30),
('NT201', 'Phân tích thiết kế hệ thống truyền thông và mạng', 'MMT', 'LT', 45),
('NT202', 'Đồ án môn Lập trình ứng dụng mạng', 'MMT', 'TH', 60),
('NT203', 'Đồ án chuyên ngành', 'MMT', 'TH', 60),
('NT204', 'Hệ thống tìm kiếm, phát hiện và ngăn ngừa xâm nhập', 'MMT', 'LT', 30),
('NT204_TH', 'Hệ thống tìm kiếm, phát hiện và ngăn ngừa xâm nhập (Thực hành)', 'MMT', 'TH', 30),
('NT205', 'Tấn công mạng', 'MMT', 'LT', 30),
('NT205_TH', 'Tấn công mạng (Thực hành)', 'MMT', 'TH', 30),
('NT206', 'Quản trị hệ thống mạng', 'MMT', 'LT', 30),
('NT206_TH', 'Quản trị hệ thống mạng (Thực hành)', 'MMT', 'TH', 30),
('NT207', 'Quản lý rủi ro và an toàn thông tin trong doanh nghiệp', 'MMT', 'LT', 30),
('NT207_TH', 'Quản lý rủi ro và an toàn thông tin trong doanh nghiệp (Thực hành)', 'MMT', 'TH', 30),
('NT208', 'Lập trình ứng dụng Web', 'MMT', 'LT', 15),
('NT209', 'Lập trình hệ thống', 'MMT', 'LT', 15),
('NT210', 'Thương mại Điện tử và Triển khai ứng dụng', 'MMT', 'LT', 15),
('NT211', 'An ninh nhân sự, định danh và chứng thực', 'MMT', 'LT', 30),
('NT211_TH', 'An ninh nhân sự, định danh và chứng thực (Thực hành)', 'MMT', 'TH', 30),
('NT212', 'An toàn dữ liệu, khôi phục thông tin sau sự cố', 'MMT', 'LT', 15),
('NT213', 'Bảo mật web và ứng dụng', 'MMT', 'LT', 30),
('NT213_TH', 'Bảo mật web và ứng dụng (Thực hành)', 'MMT', 'TH', 30),
('NT215', 'Thực tập doanh nghiệp', 'MMT', 'LT', 30),
('NT216', 'Bảo mật hệ thống dữ liệu', 'MMT', 'LT', 30),
('NT216_TH', 'Bảo mật hệ thống dữ liệu (Thực hành)', 'MMT', 'TH', 30),
('NT219', 'Mật mã học', 'MMT', 'LT', 30),
('NT219_TH', 'Mật mã học (Thực hành)', 'MMT', 'TH', 30),
('NT230', 'Cơ chế hoạt động của mã độc', 'MMT', 'LT', 30),
('NT230_TH', 'Cơ chế hoạt động của mã độc (Thực hành)', 'MMT', 'TH', 30),
('NT301', 'Quản trị hệ thống mạng', 'MMT', 'LT', 15),
('NT302', 'Xây dựng chuẩn chính sách an toàn thông tin trong doanh nghiệp', 'MMT', 'LT', 30),
('NT302_TH', 'Xây dựng chuẩn chính sách an toàn thông tin trong doanh nghiệp (Thực hành)', 'MMT', 'TH', 30),
('NT303', 'Công nghệ thoại IP', 'MMT', 'LT', 30),
('NT303_TH', 'Công nghệ thoại IP (Thực hành)', 'MMT', 'TH', 30),
('NT304', 'Ứng dụng truyền thông và an ninh thông tin', 'MMT', 'LT', 30),
('NT304_TH', 'Ứng dụng truyền thông và an ninh thông tin (Thực hành)', 'MMT', 'TH', 30),
('NT305', 'Phát triển ứng dụng trên thiết bị di động', 'MMT', 'LT', 30),
('NT305_TH', 'Phát triển ứng dụng trên thiết bị di động (Thực hành)', 'MMT', 'TH', 30),
('NT306', 'Kỹ thuật lập trình mạng trên Linux', 'MMT', 'LT', 45),
('NT307', 'Xây dựng ứng dụng web', 'MMT', 'LT', 15),
('NT309', 'Lập trình trên Linux', 'MMT', 'LT', 30),
('NT309_TH', 'Lập trình trên Linux (Thực hành)', 'MMT', 'TH', 30),
('NT310', 'Pháp chứng mạng di động', 'MMT', 'LT', 30),
('NT310_TH', 'Pháp chứng mạng di động (Thực hành)', 'MMT', 'TH', 30),
('NT311', 'Công nghệ tường lửa và bảo vệ mạng ngoại vi', 'MMT', 'LT', 30),
('NT311_TH', 'Công nghệ tường lửa và bảo vệ mạng ngoại vi (Thực hành)', 'MMT', 'TH', 30),
('NT312', 'Bảo mật với smartcard và NFC', 'MMT', 'LT', 30),
('NT312_TH', 'Bảo mật với smartcard và NFC (Thực hành)', 'MMT', 'TH', 30),
('NT320', 'Công nghệ vệ "TINH"', 'MMT', 'LT', 45),
('NT321', 'Hệ thống tìm kiếm, phát hiện và ngăn ngừa xâm nhập', 'MMT', 'LT', 30),
('NT321_TH', 'Hệ thống tìm kiếm, phát hiện và ngăn ngừa xâm nhập (Thực hành)', 'MMT', 'TH', 30),
('NT330', 'An toàn mạng không dây và di động', 'MMT', 'LT', 30),
('NT330_TH', 'An toàn mạng không dây và di động (Thực hành)', 'MMT', 'TH', 30),
('NT331', 'Xây dựng chuẩn chính sách an toàn thông tin trong doanh nghiệp', 'MMT', 'LT', 15),
('NT332', 'Xử lý tín hiệu trong truyền thông', 'MMT', 'LT', 45),
('NT332_TH', 'Xử lý tín hiệu trong truyền thông (Thực hành)', 'MMT', 'TH', 30),
('NT333', 'Tính toán lưới', 'MMT', 'LT', 15),
('NT334', 'Pháp chứng kỹ thuật số', 'MMT', 'LT', 30),
('NT334_TH', 'Pháp chứng kỹ thuật số (Thực hành)', 'MMT', 'TH', 30),
('NT395', 'Phát triển ứng dụng trên thiết bị di động', 'MMT', 'LT', 30),
('NT395_TH', 'Phát triển ứng dụng trên thiết bị di động (Thực hành)', 'MMT', 'TH', 30),
('NT401', 'An toàn mạng nâng cao', 'MMT', 'LT', 30),
('NT401_TH', 'An toàn mạng nâng cao (Thực hành)', 'MMT', 'TH', 30),
('NT402', 'Công nghệ mạng viễn thông', 'MMT', 'LT', 30),
('NT402_TH', 'Công nghệ mạng viễn thông (Thực hành)', 'MMT', 'TH', 30),
('NT403', 'Tính toán lưới', 'MMT', 'LT', 30),
('NT403_TH', 'Tính toán lưới (Thực hành)', 'MMT', 'TH', 30),
('NT404', 'Khóa luận tốt nghiệp', 'MMT', 'LT', 150),
('NT405', 'Bảo mật Internet', 'MMT', 'LT', 15),
('NT406', 'Đồ án tốt nghiệp', 'MMT', 'LT', 60),
('NT407', 'Pháp chứng kỹ thuật số', 'MMT', 'LT', 30),
('NT407_TH', 'Pháp chứng kỹ thuật số (Thực hành)', 'MMT', 'TH', 30),
('NT408', 'Bảo mật trên Internet', 'MMT', 'LT', 45),
('NT408_TH', 'Bảo mật trên Internet (Thực hành)', 'MMT', 'TH', 30),
('NT501', 'Thực tập doanh nghiệp', 'MMT', 'LT', 45),
('NT502', 'Thương mại Điện tử và Triển khai ứng dụng', 'MMT', 'LT', 15),
('NT503', 'Bảo mật Internet', 'MMT', 'LT', 15),
('NT504', 'Tiểu luận tốt nghiệp', 'MMT', 'LT', 15),
('NT505', 'Khóa luận tốt nghiệp', 'MMT', 'LT', 150),
('NT506', 'Đồ án tốt nghiệp tại doanh nghiệp', 'MMT', 'LT', 150),
('NT507', 'Xây dựng ứng dụng web', 'MMT', 'LT', 30),
('NT507_TH', 'Xây dựng ứng dụng web (Thực hành)', 'MMT', 'TH', 30),
('NT508', 'Đồ án tốt nghiệp', 'MMT', 'LT', 90),
('NT509', 'Hệ thống đa tác tử di động thông minh', 'MMT', 'LT', 30),
('NT509_TH', 'Hệ thống đa tác tử di động thông minh (Thực hành)', 'MMT', 'TH', 30),
('NT521', 'Lập trình an toàn và khai thác lỗ hổng phần mềm', 'MMT', 'LT', 15),
('NT522', 'Phương pháp học máy trong an toàn thông tin', 'MMT', 'LT', 30),
('NT522_TH', 'Phương pháp học máy trong an toàn thông tin (Thực hành)', 'MMT', 'TH', 30),
('NT523', 'An toàn thông tin trong kỷ nguyên máy tính lượng tử', 'MMT', 'LT', 30),
('NT523_TH', 'An toàn thông tin trong kỷ nguyên máy tính lượng tử (Thực hành)', 'MMT', 'TH', 30),
('NT524', 'Kiến trúc và Bảo mật Điện toán Đám mây', 'MMT', 'LT', 45),
('NT524_TH', 'Kiến trúc và Bảo mật Điện toán Đám mây (Thực hành)', 'MMT', 'TH', 30),
('NT531', 'Đánh giá hiệu năng hệ thống mạng máy tính', 'MMT', 'LT', 30),
('NT531_TH', 'Đánh giá hiệu năng hệ thống mạng máy tính (Thực hành)', 'MMT', 'TH', 30),
('NT532', 'Công nghệ Internet of things hiện đại', 'MMT', 'LT', 30),
('NT532_TH', 'Công nghệ Internet of things hiện đại (Thực hành)', 'MMT', 'TH', 30),
('NT533', 'Hệ tính toán phân bố', 'MMT', 'LT', 30),
('NT533_TH', 'Hệ tính toán phân bố (Thực hành)', 'MMT', 'TH', 30),
('NT534', 'An toàn mạng máy tính nâng cao', 'MMT', 'LT', 30),
('NT534_TH', 'An toàn mạng máy tính nâng cao (Thực hành)', 'MMT', 'TH', 30),
('NT535', 'Bảo mật Internet of things', 'MMT', 'LT', 30),
('NT535_TH', 'Bảo mật Internet of things (Thực hành)', 'MMT', 'TH', 30),
('NT536', 'Công nghệ truyền thông đa phương tiện', 'MMT', 'LT', 30),
('NT536_TH', 'Công nghệ truyền thông đa phương tiện (Thực hành)', 'MMT', 'TH', 30),
('NT537', 'Truyền thông xã hội và kinh doanh', 'MMT', 'LT', 45),
('NT538', 'Giải thuật xử lý song song và phân bố', 'MMT', 'LT', 30),
('NT538_TH', 'Giải thuật xử lý song song và phân bố (Thực hành)', 'MMT', 'TH', 30),
('NT539', 'AI ứng dụng trong mạng và truyền thông', 'MMT', 'LT', 45),
('NT539_TH', 'AI ứng dụng trong mạng và truyền thông (Thực hành)', 'MMT', 'TH', 30),
('NT540', 'Mạng không dây thế hệ mới', 'MMT', 'LT', 30),
('NT540_TH', 'Mạng không dây thế hệ mới (Thực hành)', 'MMT', 'TH', 30),
('NT541', 'Công nghệ mạng khả lập trình', 'MMT', 'LT', 45),
('NT541_TH', 'Công nghệ mạng khả lập trình (Thực hành)', 'MMT', 'TH', 30),
('NT542', 'Lập trình kịch bản tự động hóa cho quản trị và bảo mật mạng', 'MMT', 'LT', 30),
('NT542_TH', 'Lập trình kịch bản tự động hóa cho quản trị và bảo mật mạng (Thực hành)', 'MMT', 'TH', 30),
('NT543', 'Tín hiệu và hệ thống thông tin', 'MMT', 'LT', 30),
('NT543_TH', 'Tín hiệu và hệ thống thông tin (Thực hành)', 'MMT', 'TH', 30),
('NT544', 'Ăng ten và truyền thông vô tuyến', 'MMT', 'LT', 45),
('NT544_TH', 'Ăng ten và truyền thông vô tuyến (Thực hành)', 'MMT', 'TH', 30),
('NT545', 'Thiết kế hệ thống viễn thông', 'MMT', 'LT', 30),
('NT545_TH', 'Thiết kế hệ thống viễn thông (Thực hành)', 'MMT', 'TH', 30),
('NT546', 'Thiết kế và triển khai mạng tốc độ cao', 'MMT', 'LT', 30),
('NT546_TH', 'Thiết kế và triển khai mạng tốc độ cao (Thực hành)', 'MMT', 'TH', 30),
('NT547', 'Blockchain: Nền tảng, ứng dụng và bảo mật', 'MMT', 'LT', 30),
('NT547_TH', 'Blockchain: Nền tảng, ứng dụng và bảo mật (Thực hành)', 'MMT', 'TH', 30),
('NT548', 'Công nghệ DevOps và ứng dụng', 'MMT', 'LT', 45),
('NT548_TH', 'Công nghệ DevOps và ứng dụng (Thực hành)', 'MMT', 'TH', 30),
('NT549', 'Học máy tăng cường cho các hệ thống mạng', 'MMT', 'LT', 15),
('OOPT1', 'Lập trình hướng đối tượng', 'CNPM', 'LT', 45),
('OOPT1_TH', 'Lập trình hướng đối tượng (Thực hành)', 'CNPM', 'TH', 30),
('OOPT2', 'Lập trình hướng đối tượng', 'CNPM', 'LT', 60),
('OOPT2_TH', 'Lập trình hướng đối tượng (Thực hành)', 'CNPM', 'TH', 30),
('OSYS1', 'Hệ điều hành', 'MMT', 'LT', 45),
('OSYS2', 'Hệ điều hành', 'MMT', 'LT', 45),
('PE001', 'Giáo dục thể chất 1', 'CNTT', 'LT', 15),
('PE002', 'Giáo dục thể chất 2', 'CNTT', 'LT', 15),
('PE003', 'Giáo dục thể chất 3', 'CNTT', 'LT', 15),
('PE012', 'Giáo dục thể chất', 'CNTT', 'LT', 15),
('PE231', 'Giáo dục thể chất 1', 'CNTT', 'LT', 15),
('PE232', 'Giáo dục thể chất 2', 'CNTT', 'LT', 15),
('PEDU1', 'Giáo dục thể chất 1', 'CNTT', 'LT', 15),
('PEDU2', 'Giáo dục thể chất 2', 'CNTT', 'LT', 15),
('PH001', 'Nhập môn điện tử', 'CNTT', 'LT', 45),
('PH002', 'Nhập môn mạch số', 'KTMT', 'LT', 15),
('PH003', 'Vật lý kỹ thuật', 'CNTT', 'LT', 15),
('PHIL1', 'Những NLCB của chủ nghĩa Mác-Lênin', 'CNTT', 'LT', 75),
('PHIL2', 'Triết học Mác-Lênin', 'CNTT', 'LT', 75),
('PHY01', 'Vật lý đại cương A1', 'CNTT', 'LT', 45),
('PHY02', 'Vật lý đại cương A2', 'CNTT', 'LT', 45),
('PHY03', 'Vật lý đại cương A3', 'CNTT', 'LT', 30),
('PHY11', 'General Physics 1', 'CNTT', 'LT', 60),
('PHY12', 'General Physics 2', 'CNTT', 'LT', 60),
('PHY22', 'Vật lý đại cương A2 (TE1)', 'CNTT', 'LT', 60),
('PHYS1114', 'Vật lý đại cương I', 'HTTT', 'LT', 60),
('PHYS1214', 'Vật lý đại cương II', 'HTTT', 'LT', 60),
('PHYS1215', 'Vật lý đại cương', 'HTTT', 'LT', 45),
('QTE111', 'Văn hóa giao tiếp', 'CNTT', 'LT', 30),
('SC203', 'Phương pháp "KHOA" học', 'HTTT', 'LT', 45),
('SE005', 'Giới thiệu ngành Kỹ thuật Phần mềm', 'CNPM', 'LT', 15),
('SE100', 'Phương pháp Phát triển phần mềm hướng đối tượng', 'CNPM', 'LT', 15),
('SE101', 'Phương pháp mô hình hóa', 'CNPM', 'LT', 15),
('SE102', 'Nhập môn phát triển game', 'CNPM', 'LT', 30),
('SE102_TH', 'Nhập môn phát triển game (Thực hành)', 'CNPM', 'TH', 30),
('SE103', 'Các phương pháp lập trình', 'CNPM', 'LT', 30),
('SE103_TH', 'Các phương pháp lập trình (Thực hành)', 'CNPM', 'TH', 30),
('SE104', 'Nhập môn Công nghệ phần mềm', 'CNPM', 'LT', 15),
('SE105', 'Lập trình nhúng căn bản', 'CNPM', 'LT', 30),
('SE105_TH', 'Lập trình nhúng căn bản (Thực hành)', 'CNPM', 'TH', 30),
('SE106', 'Đặc tả hình thức', 'CNPM', 'LT', 15),
('SE107', 'Phân tích thiết kế hệ thống', 'CNPM', 'LT', 15),
('SE108', 'Kiểm chứng phần mềm', 'CNPM', 'LT', 15),
('SE109', 'Phát triển, vận hành, bảo trì phần mềm', 'CNPM', 'LT', 45),
('SE110', 'Phương pháp Phát triển phần mềm hướng đối tượng', 'CNPM', 'LT', 45),
('SE110_TH', 'Phương pháp Phát triển phần mềm hướng đối tượng (Thực hành)', 'CNPM', 'TH', 30),
('SE111', 'Đồ án mã nguồn mở', 'CNPM', 'LT', 15),
('SE112', 'Đồ án chuyên ngành', 'CNPM', 'LT', 15),
('SE113', 'Kiểm chứng phần mềm', 'CNPM', 'LT', 45),
('SE113_TH', 'Kiểm chứng phần mềm (Thực hành)', 'CNPM', 'TH', 30),
('SE114', 'Nhập môn ứng dụng di động', 'CNPM', 'LT', 15),
('SE115', 'Phát triển game với Unity', 'CNPM', 'LT', 15),
('SE116', 'Phát triển kỹ năng lập trình Game ứng dụng trong thực tế', 'CNPM', 'LT', 45),
('SE116_TH', 'Phát triển kỹ năng lập trình Game ứng dụng trong thực tế (Thực hành)', 'CNPM', 'TH', 30),
('SE117', 'Kỹ thuật lập trình', 'CNPM', 'LT', 45),
('SE117_TH', 'Kỹ thuật lập trình (Thực hành)', 'CNPM', 'TH', 30),
('SE121', 'Đồ án 1', 'CNPM', 'LT', 30),
('SE122', 'Đồ án 2', 'CNPM', 'LT', 30),
('SE207', 'Phân tích thiết kế hệ thống', 'CNPM', 'LT', 45),
('SE207_TH', 'Phân tích thiết kế hệ thống (Thực hành)', 'CNPM', 'TH', 30),
('SE208', 'Kiểm chứng phần mềm', 'CNPM', 'LT', 30),
('SE208_TH', 'Kiểm chứng phần mềm (Thực hành)', 'CNPM', 'TH', 30),
('SE209', 'Phát triển, vận hành, bảo trì phần mềm', 'CNPM', 'LT', 45),
('SE210', 'Quản lý dự án công nghệ thông tin', 'CNPM', 'LT', 45),
('SE210_TH', 'Quản lý dự án công nghệ thông tin (Thực hành)', 'CNPM', 'TH', 30),
('SE211', 'Phát triển phần mềm hướng đối tượng', 'CNPM', 'LT', 45),
('SE211_TH', 'Phát triển phần mềm hướng đối tượng (Thực hành)', 'CNPM', 'TH', 30),
('SE212', 'Phát triển phần mềm mã nguồn mở', 'CNPM', 'LT', 30),
('SE212_TH', 'Phát triển phần mềm mã nguồn mở (Thực hành)', 'CNPM', 'TH', 30),
('SE213', 'Xử lý phân bố', 'CNPM', 'LT', 30),
('SE213_TH', 'Xử lý phân bố (Thực hành)', 'CNPM', 'TH', 30),
('SE214', 'Công nghệ phần mềm chuyên sâu', 'CNPM', 'LT', 15),
('SE215', 'Giao tiếp người máy', 'CNPM', 'LT', 45),
('SE215_TH', 'Giao tiếp người máy (Thực hành)', 'CNPM', 'TH', 30),
('SE220', 'Thiết kế Game', 'CNPM', 'LT', 45),
('SE221', 'Lập trình game nâng cao', 'CNPM', 'LT', 45),
('SE221_TH', 'Lập trình game nâng cao (Thực hành)', 'CNPM', 'TH', 30),
('SE301', 'Phát triển phần mềm mã nguồn mở', 'CNPM', 'LT', 15),
('SE310', 'Công nghệ .NET', 'CNPM', 'LT', 45),
('SE310_TH', 'Công nghệ .NET (Thực hành)', 'CNPM', 'TH', 30),
('SE311', 'Ngôn ngữ lập trình Java', 'CNPM', 'LT', 45),
('SE311_TH', 'Ngôn ngữ lập trình Java (Thực hành)', 'CNPM', 'TH', 30),
('SE312', 'Công nghệ .NET', 'CNPM', 'LT', 15),
('SE313', 'Một số thuật toán thông minh', 'CNPM', 'LT', 15),
('SE314', 'Công nghệ game 3D', 'CNPM', 'LT', 30),
('SE314_TH', 'Công nghệ game 3D (Thực hành)', 'CNPM', 'TH', 30),
('SE315', 'Công nghệ game online', 'CNPM', 'LT', 15),
('SE316', 'Phát triển Game đa nền tảng', 'CNPM', 'LT', 30),
('SE316_TH', 'Phát triển Game đa nền tảng (Thực hành)', 'CNPM', 'TH', 30),
('SE317', 'Công nghệ tiên tiến trong phát triển game', 'CNPM', 'LT', 30),
('SE317_TH', 'Công nghệ tiên tiến trong phát triển game (Thực hành)', 'CNPM', 'TH', 30),
('SE320', 'Lập trình đồ họa 3 chiều với Direct3D', 'CNPM', 'LT', 45),
('SE320_TH', 'Lập trình đồ họa 3 chiều với Direct3D (Thực hành)', 'CNPM', 'TH', 30),
('SE321', 'Lập trình trên thiết bị di động', 'CNPM', 'LT', 60),
('SE322', 'Công nghệ Web và ứng dụng', 'CNPM', 'LT', 30),
('SE323', 'Thiết kế Game', 'CNPM', 'LT', 60),
('SE324', 'Nhập môn lập trình 3D game', 'CNPM', 'LT', 45),
('SE324_TH', 'Nhập môn lập trình 3D game (Thực hành)', 'CNPM', 'TH', 30),
('SE325', 'Chuyên đề J2EE', 'CNPM', 'LT', 15),
('SE326', 'Cơ sở dữ liệu nâng cao', 'CNPM', 'LT', 30),
('SE327', 'Phát triển và vận hành game', 'CNPM', 'LT', 45),
('SE328', 'Lập trình TTNT trong Game', 'CNPM', 'LT', 15),
('SE329', 'Thiết kế 3D Game Engine', 'CNPM', 'LT', 45),
('SE329_TH', 'Thiết kế 3D Game Engine (Thực hành)', 'CNPM', 'TH', 30),
('SE330', 'Ngôn ngữ lập trình Java', 'CNPM', 'LT', 15),
('SE331', 'Chuyên đề E-commerce', 'CNPM', 'LT', 15),
('SE332', 'Chuyên đề CSDL nâng cao', 'CNPM', 'LT', 30),
('SE333', 'Chuyên đề E-Government', 'CNPM', 'LT', 30),
('SE334', 'Các phương pháp lập trình', 'CNPM', 'LT', 30),
('SE334_TH', 'Các phương pháp lập trình (Thực hành)', 'CNPM', 'TH', 30),
('SE335', 'Công nghệ XML và ứng dụng', 'CNPM', 'LT', 45),
('SE335_TH', 'Công nghệ XML và ứng dụng (Thực hành)', 'CNPM', 'TH', 30),
('SE336', 'Phương pháp luận sáng tạo KH-CN', 'CNPM', 'LT', 30),
('SE337', 'Các thuật toán thông minh', 'CNPM', 'LT', 15),
('SE338', 'Logic mờ', 'CNPM', 'LT', 30),
('SE339', 'Xử lý phân bổ', 'CNPM', 'LT', 30),
('SE339_TH', 'Xử lý phân bổ (Thực hành)', 'CNPM', 'TH', 30),
('SE340', 'Quản lý dự án công nghệ thông tin', 'CNPM', 'LT', 45),
('SE340_TH', 'Quản lý dự án công nghệ thông tin (Thực hành)', 'CNPM', 'TH', 30),
('SE341', 'Công nghệ Web và ứng dụng', 'CNPM', 'LT', 15),
('SE342', 'Logic mờ', 'CNPM', 'LT', 30),
('SE343', 'Công nghệ Portal', 'CNPM', 'LT', 45),
('SE344', 'Lập trình game trong các thiết bị di động', 'CNPM', 'LT', 15),
('SE345', 'Kỹ thuật lập trình nhúng', 'CNPM', 'LT', 45),
('SE345_TH', 'Kỹ thuật lập trình nhúng (Thực hành)', 'CNPM', 'TH', 30),
('SE346', 'Lập trình trên thiết bị di động', 'CNPM', 'LT', 15),
('SE347', 'Công nghệ Web và ứng dụng', 'CNPM', 'LT', 15),
('SE348', 'Chuyên đề M-commerce', 'CNPM', 'LT', 30),
('SE349', 'Nhập môn Quản trị doanh nghiệp', 'CNPM', 'LT', 30),
('SE350', 'Chuyên đề E-learning', 'CNPM', 'LT', 30),
('SE351', 'Xử lý song song', 'CNPM', 'LT', 15),
('SE352', 'Phát triển ứng dụng VR', 'CNPM', 'LT', 30),
('SE352_TH', 'Phát triển ứng dụng VR (Thực hành)', 'CNPM', 'TH', 30),
('SE354', 'Chuyên đề các quy trình phát triển phần mềm hiện đại', 'CNPM', 'LT', 30),
('SE354_TH', 'Chuyên đề các quy trình phát triển phần mềm hiện đại (Thực hành)', 'CNPM', 'TH', 30),
('SE355', 'Máy học và các công cụ', 'CNPM', 'LT', 30),
('SE355_TH', 'Máy học và các công cụ (Thực hành)', 'CNPM', 'TH', 30),
('SE356', 'Kiến trúc Phần mềm', 'CNPM', 'LT', 15),
('SE357', 'Kỹ thuật phân tích yêu cầu', 'CNPM', 'LT', 30),
('SE357_TH', 'Kỹ thuật phân tích yêu cầu (Thực hành)', 'CNPM', 'TH', 30),
('SE358', 'Quản lý dự án Phát triển Phần mềm', 'CNPM', 'LT', 45),
('SE358_TH', 'Quản lý dự án Phát triển Phần mềm (Thực hành)', 'CNPM', 'TH', 30),
('SE359', 'DevOps trong phát triển phần mềm', 'CNPM', 'LT', 30),
('SE359_TH', 'DevOps trong phát triển phần mềm (Thực hành)', 'CNPM', 'TH', 30),
('SE360', 'Điện toán đám mây và phát triển ứng dụng hướng dịch vụ', 'CNPM', 'LT', 45),
('SE360_TH', 'Điện toán đám mây và phát triển ứng dụng hướng dịch vụ (Thực hành)', 'CNPM', 'TH', 30),
('SE361', 'Phát triển Phần mềm theo Kiến trúc Microservices', 'CNPM', 'LT', 15),
('SE362', 'An toàn phần mềm và hệ thống', 'CNPM', 'LT', 45),
('SE362_TH', 'An toàn phần mềm và hệ thống (Thực hành)', 'CNPM', 'TH', 30),
('SE363', 'Phát triển ứng dụng trên nền tảng dữ liệu lớn', 'CNPM', 'LT', 45),
('SE363_TH', 'Phát triển ứng dụng trên nền tảng dữ liệu lớn (Thực hành)', 'CNPM', 'TH', 30),
('SE364', 'Thiết kế giao diện và trải nghiệm người dùng', 'CNPM', 'LT', 45),
('SE364_TH', 'Thiết kế giao diện và trải nghiệm người dùng (Thực hành)', 'CNPM', 'TH', 30),
('SE365', 'Học sâu ứng dụng trong phát triển phần mềm', 'CNPM', 'LT', 45),
('SE365_TH', 'Học sâu ứng dụng trong phát triển phần mềm (Thực hành)', 'CNPM', 'TH', 30),
('SE400', 'Seminar các vấn đề hiện đại của CNPM', 'CNPM', 'LT', 15),
('SE401', 'Mẫu thiết kế', 'CNPM', 'LT', 45),
('SE402', 'Điện toán đám mây', 'CNPM', 'LT', 15),
('SE403', 'Nguyên lý thiết kế thế giới ảo', 'CNPM', 'LT', 60),
('SE404', 'Chuyên đề E-Government', 'CNPM', 'LT', 30),
('SE405', 'Chuyên đề Mobile and Pervasive Computing', 'CNPM', 'LT', 45),
('SE406', 'Mẫu thiết kế hướng đối tượng', 'CNPM', 'LT', 60),
('SE407', 'Chuyên đề Pervasive and Mobile Computing', 'CNPM', 'LT', 60),
('SE408', 'Phát triển game với Blockchain', 'CNPM', 'LT', 45),
('SE408_TH', 'Phát triển game với Blockchain (Thực hành)', 'CNPM', 'TH', 30),
('SE409', 'Phát triển dự án Game', 'CNPM', 'LT', 45),
('SE409_TH', 'Phát triển dự án Game (Thực hành)', 'CNPM', 'TH', 30),
('SE417', 'Đồ án môn học mã nguồn mở', 'CNPM', 'LT', 30),
('SE418', 'Đồ án môn học chuyên ngành', 'CNPM', 'LT', 45),
('SE501', 'Thực tập tốt nghiệp', 'CNPM', 'LT', 30),
('SE502', 'Thực tập', 'CNPM', 'LT', 30),
('SE503', 'Đồ án', 'CNPM', 'LT', 30),
('SE505', 'Khóa luận tốt nghiệp', 'CNPM', 'LT', 150),
('SE506', 'Đồ án tốt nghiệp tại doanh nghiệp', 'CNPM', 'LT', 150),
('SE507', 'Đồ án tốt nghiệp', 'CNPM', 'LT', 90),
('SMET1', 'Phương pháp NCKH trong tin học', 'CNTT', 'LT', 15),
('SMET2', 'Phương pháp luận sáng tạo KH-CN', 'CNTT', 'LT', 15),
('SOCI1', 'Chủ nghĩa xã hội "KHOA" học', 'CNTT', 'LT', 45),
('SP3724', 'Kỹ năng giao tiếp', 'HTTT', 'LT', 45),
('SPCH2713', 'Kỹ năng giao tiếp', 'HTTT', 'LT', 30),
('SPCH3723', 'Tiếng Anh chuyên ngành CNTT', 'HTTT', 'LT', 45),
('SPCH3724', 'Kỹ năng giao tiếp', 'HTTT', 'LT', 45),
('SS001', 'Những nguyên lý cơ bản của chủ nghĩa Mác Lênin', 'CNTT', 'LT', 75),
('SS002', 'Đường lối cách mạng của Đảng CS Việt Nam', 'CNTT', 'LT', 45),
('SS003', 'Tư tưởng Hồ Chí Minh', 'CNTT', 'LT', 30),
('SS004', 'Kỹ năng nghề nghiệp', 'CNTT', 'LT', 30),
('SS005', 'Phương pháp luận sáng tạo KH-CN', 'CNTT', 'LT', 15),
('SS006', 'Pháp luật đại cương', 'CNTT', 'LT', 30),
('SS007', 'Triết học Mác – Lênin', 'CNTT', 'LT', 45),
('SS008', 'Kinh tế chính trị Mác – Lênin', 'CNTT', 'LT', 30),
('SS009', 'Chủ nghĩa xã hội "KHOA" học', 'CNTT', 'LT', 30),
('SS010', 'Lịch sử Đảng Cộng sản Việt Nam', 'CNTT', 'LT', 30),
('SSKL1', 'Kỹ năng mềm', 'CNTT', 'LT', 30),
('STA01', 'Xác suất thống kê', 'CNTT', 'LT', 45),
('STAT11', 'Xác suất thống kê', 'HTTT', 'LT', 45),
('STAT3013', 'Phân tích thống kê', 'HTTT', 'LT', 45),
('STAT4033', 'Thống kê', 'HTTT', 'LT', 45),
('THU086', 'Đào tạo năng lực thông tin', 'CNTT', 'LT', 30),
('THU107', 'Truyền thông xã hội trong các tổ chức', 'CNTT', 'LT', 30),
('TLH025', 'Tâm lý học nhân cách', 'CNTT', 'LT', 45),
('TOEIC 450', 'TOEIC 450', 'CNTT', 'LT', 15),
('TOEIC450', 'TOEIC 450', 'CNTT', 'LT', 15),
('VCPH1', 'Lịch sử Đảng CSVN', 'CNTT', 'LT', 45),
('VCPL1', 'Đường lối cách mạng của Đảng CSVN', 'CNTT', 'LT', 45),
('WINP1', 'Lập trình trên Windows', 'CNPM', 'LT', 45),
('WINP1_TH', 'Lập trình trên Windows (Thực hành)', 'CNPM', 'TH', 30),
('IS350', 'Xử lý ảnh y khoa', 'HTTT', 'LT', 45),
('IS359', 'Đồ án chuyên ngành Hệ thống Thông tin y tế', 'HTTT', 'LT', 45),
('CS5032', 'Thực tập doanh nghiệp', 'HTTT', 'LT', 30);

-- =====================================================
-- INSERT DATA - Điều kiện môn học (Course Prerequisites)
-- =====================================================
INSERT INTO "DIEUKIENMONHOC" ("MaMonHoc", "MaMonDieuKien", "LoaiDieuKien", "TrangThai") VALUES
('ADENG3', 'ADENG2', 'tien_quyet', TRUE),
('ADENG4', 'ADENG3', 'tien_quyet', TRUE),
('AI001', 'IE005', 'tien_quyet', FALSE),
('AI001', 'IS005', 'tien_quyet', FALSE),
('AI001', 'SE005', 'tien_quyet', FALSE),
('AI001', 'CE005', 'tien_quyet', FALSE),
('AI001', 'NT005', 'tien_quyet', FALSE),
('AI001', 'NT015', 'hoc_truoc', FALSE),
('CE005', 'IE005', 'tien_quyet', FALSE),
('CE005', 'IS005', 'tien_quyet', FALSE),
('CE005', 'SE005', 'tien_quyet', FALSE),
('CE005', 'NT005', 'tien_quyet', FALSE),
('CE005', 'NT015', 'tien_quyet', FALSE),
('CE005', 'EC005', 'hoc_truoc', FALSE),
('CE103', 'IT006', 'hoc_truoc', TRUE),
('CE105', 'MA001', 'hoc_truoc', TRUE),
('CE107', 'IT001', 'hoc_truoc', TRUE),
('CE111', 'IT006', 'hoc_truoc', TRUE),
('CE118', 'PH002', 'hoc_truoc', TRUE),
('CE119', 'PH002', 'hoc_truoc', TRUE),
('CE124', 'CE121', 'hoc_truoc', FALSE),
('CE201', 'PH002', 'hoc_truoc', TRUE),
('CE206', 'PH002', 'hoc_truoc', TRUE),
('CE207', 'CE226', 'hoc_truoc', TRUE),
('CE208', 'CE207', 'hoc_truoc', TRUE),
('CE211', 'CE107', 'hoc_truoc', TRUE),
('CE222', 'CE118', 'hoc_truoc', TRUE),
('CE224', 'CE103', 'hoc_truoc', TRUE),
('CE232', 'CE224', 'hoc_truoc', TRUE),
('CE233', 'MA003', 'hoc_truoc', TRUE),
('CE303', 'MA001', 'tien_quyet', TRUE),
('CE303', 'MA002', 'tien_quyet', TRUE),
('CE303', 'CE101', 'hoc_truoc', TRUE),
('CE3031', 'MA006', 'hoc_truoc', TRUE),
('CE304', 'CE121', 'tien_quyet', TRUE),
('CE304', 'CE224', 'hoc_truoc', TRUE),
('CE312', 'IT006', 'tien_quyet', TRUE),
('CE312', 'IT007', 'hoc_truoc', TRUE),
('CE316', 'MA004', 'hoc_truoc', TRUE),
('CE317', 'MA001', 'tien_quyet', TRUE),
('CE317', 'MA002', 'tien_quyet', TRUE),
('CE317', 'MA003', 'tien_quyet', TRUE),
('CE317', 'MA004', 'tien_quyet', TRUE),
('CE317', 'CE101', 'hoc_truoc', TRUE),
('CE319', 'MA004', 'hoc_truoc', TRUE),
('CE320', 'MA004', 'hoc_truoc', TRUE),
('CE321', 'CE222', 'hoc_truoc', TRUE),
('CE322', 'CE222', 'hoc_truoc', TRUE),
('CE323', 'CE101', 'hoc_truoc', TRUE),
('CE325', 'IT001', 'hoc_truoc', TRUE),
('CE326', 'CE221', 'hoc_truoc', TRUE),
('CE327', 'CE118', 'hoc_truoc', TRUE),
('CE331', 'CE222', 'hoc_truoc', TRUE),
('CE332', 'CE222', 'hoc_truoc', TRUE),
('CE335', 'IT006', 'hoc_truoc', TRUE),
('CE337', 'IT006', 'hoc_truoc', TRUE),
('CE342', 'CE224', 'hoc_truoc', TRUE),
('CE347', 'MA003', 'hoc_truoc', TRUE),
('CE349', 'CE103', 'hoc_truoc', TRUE),
('CE350', 'CE436', 'hoc_truoc', TRUE),
('CE351', 'CE433', 'hoc_truoc', TRUE),
('CE353', 'CE226', 'hoc_truoc', TRUE),
('CE402', 'IT007', 'hoc_truoc', TRUE),
('CE403', 'PH002', 'hoc_truoc', TRUE),
('CE406', 'CE103', 'hoc_truoc', TRUE),
('CE407', 'IT006', 'hoc_truoc', TRUE),
('CE408', 'CE201', 'hoc_truoc', TRUE),
('CE411', 'CE107', 'hoc_truoc', TRUE),
('CE412', 'CE224', 'hoc_truoc', TRUE),
('CE421', 'CE118', 'hoc_truoc', TRUE),
('CE434', 'CE213', 'hoc_truoc', TRUE),
('CE435', 'CE213', 'hoc_truoc', TRUE),
('CE437', 'CE103', 'hoc_truoc', TRUE),
('CE438', 'CE103', 'hoc_truoc', TRUE),
('CE505', 'CE206', 'hoc_truoc', TRUE),
('CS005', 'IS005', 'tien_quyet', FALSE),
('CS005', 'SE005', 'tien_quyet', FALSE),
('CS005', 'CE005', 'tien_quyet', FALSE),
('CS005', 'NT005', 'tien_quyet', FALSE),
('CS005', 'NT015', 'tien_quyet', FALSE),
('CS005', 'EC005', 'hoc_truoc', FALSE),
('CS106', 'IT003', 'hoc_truoc', TRUE),
('CS111', 'IT003', 'hoc_truoc', TRUE),
('CS114', 'IT001', 'hoc_truoc', TRUE),
('CS115', 'IT001', 'hoc_truoc', TRUE),
('CS211', 'CS106', 'hoc_truoc', TRUE),
('CS2133', 'CS1113', 'hoc_truoc', TRUE),
('CS221', 'IT001', 'hoc_truoc', TRUE),
('CS222', 'CS221', 'hoc_truoc', TRUE),
('CS229', 'CS221', 'hoc_truoc', TRUE),
('CS311', 'IT003', 'hoc_truoc', TRUE),
('CS312', 'CS110', 'hoc_truoc', TRUE),
('CS315', 'CS110', 'hoc_truoc', FALSE),
('CS317', 'CS114', 'hoc_truoc', TRUE),
('CS321', 'IT001', 'hoc_truoc', TRUE),
('CS322', 'CS212', 'hoc_truoc', TRUE),
('CS323', 'CS221', 'hoc_truoc', TRUE),
('CS324', 'CS221', 'hoc_truoc', TRUE),
('CS325', 'CS221', 'hoc_truoc', TRUE),
('CS326', 'CS221', 'hoc_truoc', TRUE),
('CS331', 'CS231', 'hoc_truoc', FALSE),
('CS335', 'IT001', 'hoc_truoc', TRUE),
('CS337', 'IT003', 'hoc_truoc', TRUE),
('CS3653', 'MATH2154', 'hoc_truoc', TRUE),
('CS410', 'IT003', 'tien_quyet', TRUE),
('CS412', 'CS221', 'hoc_truoc', TRUE),
('CS414', 'MA004', 'hoc_truoc', TRUE),
('CS4153', 'CS2133', 'hoc_truoc', FALSE),
('CS419', 'CS115', 'hoc_truoc', TRUE),
('CS420', 'CS231', 'hoc_truoc', TRUE),
('CS4243', 'CS4283', 'hoc_truoc', TRUE),
('CS4343', 'CS2134', 'hoc_truoc', TRUE),
('CS503', 'IT003', 'hoc_truoc', TRUE),
('CS511', 'IT002', 'hoc_truoc', TRUE),
('CS524', 'CS221', 'hoc_truoc', TRUE),
('CS5433', 'CS5423', 'hoc_truoc', TRUE),
('DS005', 'IE005', 'tien_quyet', FALSE),
('DS005', 'IS005', 'tien_quyet', FALSE),
('DS005', 'SE005', 'tien_quyet', FALSE),
('DS005', 'CE005', 'tien_quyet', FALSE),
('DS005', 'NT005', 'tien_quyet', FALSE),
('DS005', 'NT015', 'hoc_truoc', FALSE),
('DS104', 'IT004', 'hoc_truoc', TRUE),
('DS105', 'MA005', 'hoc_truoc', TRUE),
('DS106', 'MA003', 'hoc_truoc', TRUE),
('DS107', 'IT002', 'hoc_truoc', TRUE),
('DS201', 'DS102', 'hoc_truoc', TRUE),
('DS203', 'DS202', 'hoc_truoc', TRUE),
('DS301', 'IT007', 'hoc_truoc', TRUE),
('DS302', 'MA005', 'tien_quyet', TRUE),
('DS303', 'MA005', 'tien_quyet', TRUE),
('DS304', 'MA005', 'hoc_truoc', TRUE),
('DS305', 'MA005', 'tien_quyet', TRUE),
('DS306', 'DS200', 'tien_quyet', TRUE),
('DS307', 'IT004', 'hoc_truoc', TRUE),
('DS310', 'DS102', 'hoc_truoc', TRUE),
('DS313', 'DS102', 'hoc_truoc', TRUE),
('DS315', 'IT004', 'hoc_truoc', TRUE),
('DS319', 'IT003', 'hoc_truoc', TRUE),
('DS320', 'IT002', 'hoc_truoc', TRUE),
('DS325', 'DS108', 'tien_quyet', TRUE),
('DS327', 'IT003', 'hoc_truoc', TRUE),
('DS501', 'DS400', 'hoc_truoc', TRUE),
('DS505', 'DS207', 'hoc_truoc', TRUE),
('EC005', 'IE005', 'tien_quyet', FALSE),
('EC005', 'IS005', 'tien_quyet', FALSE),
('EC005', 'SE005', 'tien_quyet', FALSE),
('EC005', 'CE005', 'tien_quyet', FALSE),
('EC005', 'NT005', 'tien_quyet', FALSE),
('EC005', 'NT015', 'hoc_truoc', FALSE),
('EC312', 'IS207', 'hoc_truoc', TRUE),
('EN001', 'ENBT', 'tien_quyet', TRUE),
('ENG04', 'ENG03', 'tien_quyet', TRUE),
('ENG05', 'ENG04', 'tien_quyet', FALSE),
('ENG06', 'ENG03', 'tien_quyet', TRUE),
('ENG07', 'ENG03', 'tien_quyet', TRUE),
('ENGL1213', 'ENGL1113', 'tien_quyet', TRUE),
('IE005', 'IS005', 'tien_quyet', FALSE),
('IE005', 'SE005', 'tien_quyet', FALSE),
('IE005', 'CE005', 'tien_quyet', FALSE),
('IE005', 'NT005', 'tien_quyet', FALSE),
('IE005', 'NT015', 'tien_quyet', FALSE),
('IE005', 'EC005', 'hoc_truoc', FALSE),
('IE103', 'IT004', 'hoc_truoc', TRUE),
('IE106', 'IT001', 'hoc_truoc', TRUE),
('IE204', 'IE104', 'hoc_truoc', FALSE),
('IE205', 'IS351', 'hoc_truoc', TRUE),
('IE209', 'IT002', 'hoc_truoc', TRUE),
('IE212', 'IT007', 'hoc_truoc', TRUE),
('IE213', 'IE104', 'hoc_truoc', FALSE),
('IE221', 'IT001', 'hoc_truoc', TRUE),
('IE303', 'IT002', 'hoc_truoc', TRUE),
('IE304', 'IS251', 'hoc_truoc', TRUE),
('IE313', 'IT001', 'hoc_truoc', TRUE),
('IE401', 'IT003', 'hoc_truoc', TRUE),
('IE402', 'IT004', 'hoc_truoc', TRUE),
('IE501', 'IE400', 'hoc_truoc', TRUE),
('IEM4733', 'MSIS3303', 'hoc_truoc', TRUE),
('IS005', 'IE005', 'tien_quyet', FALSE),
('IS005', 'SE005', 'tien_quyet', FALSE),
('IS005', 'CE005', 'tien_quyet', FALSE),
('IS005', 'NT005', 'tien_quyet', FALSE),
('IS005', 'NT015', 'tien_quyet', FALSE),
('IS005', 'EC005', 'hoc_truoc', FALSE),
('IS105', 'IT004', 'hoc_truoc', TRUE),
('IS203', 'IT004', 'hoc_truoc', TRUE),
('IS206', 'IT004', 'hoc_truoc', TRUE),
('IS207', 'IT004', 'hoc_truoc', TRUE),
('IS210', 'IT004', 'hoc_truoc', TRUE),
('IS216', 'IT004', 'hoc_truoc', TRUE),
('IS217', 'IT004', 'hoc_truoc', TRUE),
('IS232', 'IS336', 'hoc_truoc', TRUE),
('IS251', 'IT004', 'hoc_truoc', TRUE),
('IS253', 'IT002', 'hoc_truoc', TRUE),
('IS332', 'IS201', 'hoc_truoc', TRUE),
('IS338', 'IS336', 'hoc_truoc', TRUE),
('IS349', 'IT004', 'hoc_truoc', TRUE),
('IS351', 'IS251', 'hoc_truoc', TRUE),
('IS405', 'IT004', 'hoc_truoc', TRUE),
('IT002', 'IT001', 'hoc_truoc', TRUE),
('IT003', 'IT001', 'hoc_truoc', TRUE),
('IT007', 'IT006', 'hoc_truoc', FALSE),
('IT009', 'IE005', 'tien_quyet', TRUE),
('IT009', 'IS005', 'tien_quyet', TRUE),
('IT009', 'SE005', 'tien_quyet', TRUE),
('IT009', 'CE005', 'tien_quyet', TRUE),
('IT009', 'NT005', 'tien_quyet', TRUE),
('IT009', 'NT015', 'hoc_truoc', TRUE),
('JAN02', 'JAN01', 'tien_quyet', TRUE),
('JAN03', 'JAN02', 'tien_quyet', TRUE),
('JAN04', 'JAN03', 'tien_quyet', TRUE),
('JAN05', 'JAN04', 'tien_quyet', TRUE),
('JAN06', 'JAN05', 'tien_quyet', TRUE),
('JAN07', 'JAN06', 'tien_quyet', TRUE),
('JAN08', 'JAN07', 'tien_quyet', TRUE),
('MA002', 'MA001', 'hoc_truoc', TRUE),
('MA005', 'MA006', 'hoc_truoc', TRUE),
('MATH2153', 'MATH2144', 'hoc_truoc', TRUE),
('MKTG5883', 'CS5423', 'hoc_truoc', TRUE),
('MM106', 'IT001', 'hoc_truoc', TRUE),
('MM107', 'IT001', 'hoc_truoc', TRUE),
('MM201', 'IT001', 'hoc_truoc', TRUE),
('MM206', 'IT007', 'hoc_truoc', TRUE),
('MM209', 'MM104', 'hoc_truoc', TRUE),
('MM222', 'IT007', 'hoc_truoc', TRUE),
('MSIS2433', 'CS2134', 'hoc_truoc', TRUE),
('MSIS3233', 'MATH2154', 'hoc_truoc', TRUE),
('MSIS3243', 'MATH2153', 'hoc_truoc', TRUE),
('MSIS3303', 'CS5423', 'hoc_truoc', TRUE),
('MSIS4013', 'CS5423', 'hoc_truoc', TRUE),
('MSIS5723', 'IT004', 'hoc_truoc', FALSE),
('NT005', 'IE005', 'tien_quyet', FALSE),
('NT005', 'IS005', 'tien_quyet', FALSE),
('NT005', 'SE005', 'tien_quyet', FALSE),
('NT005', 'CE005', 'tien_quyet', FALSE),
('NT005', 'NT015', 'tien_quyet', FALSE),
('NT005', 'EC005', 'hoc_truoc', FALSE),
('NT015', 'IE005', 'tien_quyet', FALSE),
('NT015', 'IS005', 'tien_quyet', FALSE),
('NT015', 'SE005', 'tien_quyet', FALSE),
('NT015', 'CE005', 'tien_quyet', FALSE),
('NT015', 'NT005', 'tien_quyet', FALSE),
('NT015', 'EC005', 'hoc_truoc', FALSE),
('NT101', 'IT005', 'hoc_truoc', TRUE),
('NT104', 'IT001', 'hoc_truoc', TRUE),
('NT105', 'IT005', 'hoc_truoc', TRUE),
('NT110', 'IT002', 'hoc_truoc', TRUE),
('NT111', 'IT005', 'hoc_truoc', TRUE),
('NT112', 'IT005', 'hoc_truoc', TRUE),
('NT113', 'NT132', 'hoc_truoc', TRUE),
('NT118', 'IT002', 'hoc_truoc', TRUE),
('NT131', 'IT007', 'hoc_truoc', TRUE),
('NT132', 'IT005', 'hoc_truoc', TRUE),
('NT140', 'IT005', 'hoc_truoc', TRUE),
('NT205', 'NT101', 'hoc_truoc', FALSE),
('NT206', 'IT005', 'hoc_truoc', TRUE),
('NT207', 'NT101', 'hoc_truoc', FALSE),
('NT212', 'IT003', 'hoc_truoc', TRUE),
('NT213', 'NT208', 'hoc_truoc', TRUE),
('NT230', 'NT209', 'hoc_truoc', TRUE),
('NT303', 'NT105', 'hoc_truoc', TRUE),
('NT310', 'NT101', 'hoc_truoc', TRUE),
('NT311', 'NT101', 'hoc_truoc', TRUE),
('NT312', 'NT101', 'hoc_truoc', TRUE),
('NT330', 'NT101', 'hoc_truoc', FALSE),
('NT332', 'IT005', 'hoc_truoc', TRUE),
('NT402', 'NT105', 'hoc_truoc', TRUE),
('NT502', 'IT005', 'hoc_truoc', TRUE),
('NT523', 'MA003', 'hoc_truoc', TRUE),
('NT524', 'IT005', 'hoc_truoc', TRUE),
('NT531', 'NT132', 'hoc_truoc', TRUE),
('NT533', 'IT005', 'hoc_truoc', TRUE),
('NT534', 'NT101', 'hoc_truoc', TRUE),
('NT535', 'NT101', 'hoc_truoc', TRUE),
('NT538', 'IT005', 'hoc_truoc', TRUE),
('NT539', 'IT005', 'hoc_truoc', TRUE),
('NT540', 'NT105', 'hoc_truoc', TRUE),
('NT542', 'NT132', 'hoc_truoc', TRUE),
('NT543', 'NT105', 'hoc_truoc', TRUE),
('NT544', 'NT105', 'hoc_truoc', TRUE),
('NT545', 'NT402', 'hoc_truoc', TRUE),
('NT546', 'NT113', 'hoc_truoc', TRUE),
('NT548', 'IT005', 'hoc_truoc', TRUE),
('PE232', 'PE231', 'hoc_truoc', TRUE),
('PHYS1214', 'PHYS1114', 'hoc_truoc', TRUE),
('SE005', 'IE005', 'tien_quyet', FALSE),
('SE005', 'IS005', 'tien_quyet', FALSE),
('SE005', 'CE005', 'tien_quyet', FALSE),
('SE005', 'NT005', 'tien_quyet', FALSE),
('SE005', 'NT015', 'tien_quyet', FALSE),
('SE005', 'EC005', 'hoc_truoc', FALSE),
('SE101', 'IT001', 'hoc_truoc', TRUE),
('SE102', 'IT001', 'hoc_truoc', TRUE),
('SE106', 'IT001', 'tien_quyet', TRUE),
('SE106', 'IT003', 'hoc_truoc', TRUE),
('SE107', 'IT002', 'hoc_truoc', TRUE),
('SE109', 'SE104', 'hoc_truoc', TRUE),
('SE111', 'IT001', 'tien_quyet', TRUE),
('SE111', 'IT002', 'tien_quyet', TRUE),
('SE111', 'IT003', 'hoc_truoc', TRUE),
('SE112', 'IT002', 'tien_quyet', TRUE),
('SE112', 'IT003', 'hoc_truoc', TRUE),
('SE113', 'SE104', 'hoc_truoc', FALSE),
('SE117', 'IT001', 'hoc_truoc', TRUE),
('SE121', 'SE104', 'hoc_truoc', TRUE),
('SE122', 'SE121', 'hoc_truoc', TRUE),
('SE214', 'SE104', 'hoc_truoc', TRUE),
('SE215', 'SE104', 'hoc_truoc', TRUE),
('SE221', 'SE102', 'hoc_truoc', TRUE),
('SE301', 'IT003', 'tien_quyet', TRUE),
('SE301', 'IT004', 'tien_quyet', TRUE),
('SE301', 'IT002', 'tien_quyet', TRUE),
('SE301', 'SE104', 'hoc_truoc', FALSE),
('SE310', 'IT008', 'hoc_truoc', TRUE),
('SE312', 'IT004', 'hoc_truoc', TRUE),
('SE313', 'IT002', 'hoc_truoc', TRUE),
('SE316', 'SE115', 'hoc_truoc', TRUE),
('SE320', 'SE102', 'hoc_truoc', TRUE),
('SE325', 'IT002', 'hoc_truoc', TRUE),
('SE327', 'SE102', 'hoc_truoc', TRUE),
('SE328', 'IT002', 'hoc_truoc', TRUE),
('SE329', 'SE102', 'hoc_truoc', TRUE),
('SE332', 'IT004', 'hoc_truoc', TRUE),
('SE334', 'IT001', 'hoc_truoc', TRUE),
('SE340', 'IT001', 'hoc_truoc', TRUE),
('SE341', 'IT001', 'hoc_truoc', TRUE),
('SE343', 'SE347', 'hoc_truoc', TRUE),
('SE347', 'IT001', 'hoc_truoc', TRUE),
('SE348', 'SE331', 'hoc_truoc', TRUE),
('SE351', 'IT001', 'hoc_truoc', TRUE),
('SE352', 'SE102', 'hoc_truoc', TRUE),
('SE355', 'IT003', 'hoc_truoc', TRUE),
('SE357', 'SE104', 'hoc_truoc', TRUE),
('SE358', 'SE104', 'hoc_truoc', TRUE),
('SE364', 'IT001', 'hoc_truoc', TRUE),
('SE401', 'SE100', 'hoc_truoc', TRUE),
('SE405', 'SE114', 'hoc_truoc', FALSE),
('SE406', 'SE100', 'hoc_truoc', TRUE),
('SE407', 'SE114', 'hoc_truoc', TRUE),
('SE505', 'SE122', 'hoc_truoc', TRUE),
('SE506', 'SE122', 'hoc_truoc', TRUE),
('SE507', 'SE122', 'hoc_truoc', TRUE),
('STAT3013', 'STAT4033', 'hoc_truoc', TRUE),
('STAT4033', 'MATH3013', 'hoc_truoc', TRUE);

-- =====================================================
-- INSERT DATA - Năm học (Academic Years)
-- =====================================================
INSERT INTO "NAMHOC" ("MaNamHoc", "TenNamHoc", "NamBatDau", "NamKetThuc") VALUES
('2023-2024', 'Năm học 2023-2024', 2023, 2024),
('2024-2025', 'Năm học 2024-2025', 2024, 2025),
('2025-2026', 'Năm học 2025-2026', 2025, 2026),
('2026-2027', 'Năm học 2026-2027', 2026, 2027);

-- =====================================================
-- INSERT DATA - Học kỳ (Semesters)
-- =====================================================
INSERT INTO "HOCKY" ("MaHocKy", "TenHocKy", "MaNamHoc", "LoaiHocKy", "ThuTu", "NgayBatDau", "NgayKetThuc", "NgayBatDauDangKy", "NgayKetThucDangKy", "HanDongHocPhi", "TrangThai") VALUES
('HK1-2324', 'Học kỳ I', '2023-2024', 'Chính', 1, '2023-09-01', '2024-01-15', '2023-08-15 00:00:00', '2023-08-31 23:59:59', '2023-10-15', 'Đã kết thúc'),
('HK2-2324', 'Học kỳ II', '2023-2024', 'Chính', 2, '2024-02-01', '2024-06-15', '2024-01-15 00:00:00', '2024-01-31 23:59:59', '2024-03-15', 'Đã kết thúc'),
('HKH-2324', 'Học kỳ Hè', '2023-2024', 'Hè', 3, '2024-07-01', '2024-08-15', '2024-06-15 00:00:00', '2024-06-30 23:59:59', '2024-07-15', 'Đã kết thúc'),
('HK1-2425', 'Học kỳ I', '2024-2025', 'Chính', 1, '2024-09-01', '2025-01-15', '2024-08-15 00:00:00', '2024-08-31 23:59:59', '2024-10-15', 'Đã kết thúc'),
('HK2-2425', 'Học kỳ II', '2024-2025', 'Chính', 2, '2025-02-01', '2025-06-15', '2025-01-15 00:00:00', '2025-01-31 23:59:59', '2025-03-15', 'Đã kết thúc'),
('HKH-2425', 'Học kỳ Hè', '2024-2025', 'Hè', 3, '2025-07-01', '2025-08-15', '2025-06-15 00:00:00', '2025-06-30 23:59:59', '2025-07-15', 'Đã kết thúc'),
('HK1-2526', 'Học kỳ I', '2025-2026', 'Chính', 1, '2025-09-01', '2026-01-15', '2025-08-15 00:00:00', '2025-08-31 23:59:59', '2025-10-15', 'Đã kết thúc'),
('HK2-2526', 'Học kỳ II', '2025-2026', 'Chính', 2, '2026-02-01', '2026-06-15', '2026-05-01 00:00:00', '2026-06-14 23:59:59', '2026-06-15', 'Đang diễn ra');

-- =====================================================
-- INSERT DATA - Đơn giá tín chỉ (Unit Prices per Credit)
-- =====================================================
INSERT INTO "DONGIATINCHI" ("LoaiMon", "LoaiHoc", "DonGia", "GhiChu") VALUES
('LT', 'hoc_moi', 27000, 'Đơn giá môn Lý thuyết - học mới (QĐ5)'),
('TH', 'hoc_moi', 37000, 'Đơn giá môn Thực hành - học mới (QĐ5)'),
('LT', 'hoc_lai', 32000, 'Đơn giá môn Lý thuyết - học lại'),
('TH', 'hoc_lai', 42000, 'Đơn giá môn Thực hành - học lại'),
('LT', 'hoc_cai_thien', 30000, 'Đơn giá môn Lý thuyết - học cải thiện'),
('TH', 'hoc_cai_thien', 40000, 'Đơn giá môn Thực hành - học cải thiện'),
('LT', 'hoc_he', 35000, 'Đơn giá môn Lý thuyết - học hè'),
('TH', 'hoc_he', 45000, 'Đơn giá môn Thực hành - học hè');

-- =====================================================
-- INSERT DATA - Tài khoản mẫu (Sample Accounts)
-- Password: admin123 -> bcrypt hash
-- Password: student123 -> bcrypt hash
-- =====================================================

-- Tài khoản Admin
INSERT INTO "NGUOIDUNG" ("TenDangNhap", "MatKhau", "Role", "MaNhom", "HoTen", "Email", "TrangThai") VALUES
('admin', '$2b$10$aMTwtHVFreMooCvW6/aHuucOqzapBULA2NxTuIdnqQjQpf3WBBeY2', 'admin', 'ADMIN', 'Quản trị viên', 'admin@school.edu.vn', TRUE);

-- Tạo quan trị viên (sử dụng subquery để lấy đúng ID)
INSERT INTO "QUANTRIVIEN" ("MaTaiKhoan", "HoTen", "ChucVu")
SELECT "MaTaiKhoan", 'Quản trị viên', 'Admin hệ thống'
FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin';

-- =====================================================
-- Tài khoản Sinh viên mẫu (password: student123)
-- Bước 1: Tạo tài khoản KHÔNG có "MaSv" (tránh circular FK)
-- Tài khoản đăng nhập chính cho demo: student/student123, liên kết MSSV 22520006.
-- =====================================================
INSERT INTO "NGUOIDUNG" ("TenDangNhap", "MatKhau", "Role", "MaNhom", "HoTen", "Email", "TrangThai") VALUES
('22520001', '$2b$10$i04Sd3Yr.zmOypY1FGMpbu81qNNYBqkwFQMQKKzxHGHIupZO19uPi', 'student', 'SINHVIEN', 'Nguyễn Văn An', 'an.nguyen@student.edu.vn', TRUE),
('22520002', '$2b$10$i04Sd3Yr.zmOypY1FGMpbu81qNNYBqkwFQMQKKzxHGHIupZO19uPi', 'student', 'SINHVIEN', 'Trần Thị Bình', 'binh.tran@student.edu.vn', TRUE),
('22520003', '$2b$10$i04Sd3Yr.zmOypY1FGMpbu81qNNYBqkwFQMQKKzxHGHIupZO19uPi', 'student', 'SINHVIEN', 'Lê Văn Cường', 'cuong.le@student.edu.vn', TRUE),
('22520004', '$2b$10$i04Sd3Yr.zmOypY1FGMpbu81qNNYBqkwFQMQKKzxHGHIupZO19uPi', 'student', 'SINHVIEN', 'Phạm Thị Dung', 'dung.pham@student.edu.vn', TRUE),
('22520005', '$2b$10$i04Sd3Yr.zmOypY1FGMpbu81qNNYBqkwFQMQKKzxHGHIupZO19uPi', 'student', 'SINHVIEN', 'Hoàng Minh Đức', 'duc.hoang@student.edu.vn', TRUE),
('student', '$2b$10$i04Sd3Yr.zmOypY1FGMpbu81qNNYBqkwFQMQKKzxHGHIupZO19uPi', 'student', 'SINHVIEN', 'Sinh Viên Mẫu', 'student@student.edu.vn', TRUE);

-- =====================================================
-- Bước 2: Tạo sinh viên với "MaTaiKhoan" (dùng subquery)
-- "MaPhuongXa": Sử dụng ID phường/xã từ ITExpressLocation.sql
--   - 2659 = Phường Vũng Tàu (HCM, province_id=29)
--   - 2660 = Phường Tam Thắng (HCM)
--   - 2661 = Phường Rạch Dừa (HCM)
--   - 2662 = Phường Phước Thắng (HCM)
--   - 2663 = Phường Bà Rịa (HCM)
-- "MaDanToc": KINH (dân tộc Kinh), MONG (dân tộc Mông - DTTS)
-- "MaNganh": KTPM, KHMT, HTTT, MMT, ATTT
-- =====================================================
INSERT INTO "SINHVIEN" ("MaSv", "MaTaiKhoan", "HoTen", "NgaySinh", "GioiTinh", "Cccd", "MaPhuongXa", "MaDanToc", "MaNganh", "Sdt", "Email", "TrangThai")
SELECT '22520001', "MaTaiKhoan", 'Nguyễn Văn An', '2004-05-15', 'Nam', '079204001234', '2659', 'KINH', 'KTPM', '0901234567', 'an.nguyen@student.edu.vn', 'Đang học'
FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520001';

INSERT INTO "SINHVIEN" ("MaSv", "MaTaiKhoan", "HoTen", "NgaySinh", "GioiTinh", "Cccd", "MaPhuongXa", "MaDanToc", "MaNganh", "Sdt", "Email", "TrangThai")
SELECT '22520002', "MaTaiKhoan", 'Trần Thị Bình', '2004-08-20', 'Nữ', '079204005678', '2660', 'KINH', 'KHMT', '0909876543', 'binh.tran@student.edu.vn', 'Đang học'
FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520002';

INSERT INTO "SINHVIEN" ("MaSv", "MaTaiKhoan", "HoTen", "NgaySinh", "GioiTinh", "Cccd", "MaPhuongXa", "MaDanToc", "MaNganh", "Sdt", "Email", "TrangThai")
SELECT '22520003', "MaTaiKhoan", 'Lê Văn Cường', '2004-03-10', 'Nam', '079204009012', '2661', 'KINH', 'HTTT', '0912345678', 'cuong.le@student.edu.vn', 'Đang học'
FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520003';

INSERT INTO "SINHVIEN" ("MaSv", "MaTaiKhoan", "HoTen", "NgaySinh", "GioiTinh", "Cccd", "MaPhuongXa", "MaDanToc", "MaNganh", "Sdt", "Email", "TrangThai")
SELECT '22520004', "MaTaiKhoan", 'Phạm Thị Dung', '2004-11-25', 'Nữ', '079204003456', '2662', 'KINH', 'KTPM', '0923456789', 'dung.pham@student.edu.vn', 'Đang học'
FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520004';

-- Sinh viên này là dân tộc Mông (DTTS) để test chức năng vùng sâu vùng xa
INSERT INTO "SINHVIEN" ("MaSv", "MaTaiKhoan", "HoTen", "NgaySinh", "GioiTinh", "Cccd", "MaPhuongXa", "MaDanToc", "MaNganh", "Sdt", "Email", "TrangThai")
SELECT '22520005', "MaTaiKhoan", 'Hoàng Minh Đức', '2004-07-08', 'Nam', '079204007890', '2663', 'MONG', 'MMT', '0934567890', 'duc.hoang@student.edu.vn', 'Đang học'
FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520005';

INSERT INTO "SINHVIEN" ("MaSv", "MaTaiKhoan", "HoTen", "NgaySinh", "GioiTinh", "Cccd", "MaPhuongXa", "MaDanToc", "MaNganh", "Sdt", "Email", "TrangThai")
SELECT '22520006', "MaTaiKhoan", 'Sinh Viên Mẫu', '2004-01-01', 'Nam', '079204011111', '2659', 'KINH', 'KTPM', '0999888777', 'student@student.edu.vn', 'Đang học'
FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'student';

-- =====================================================
-- Bước 3: Cập nhật "MaSv" trong "NGUOIDUNG"
-- =====================================================
UPDATE "NGUOIDUNG" SET "MaSv" = '22520001' WHERE "TenDangNhap" = '22520001';
UPDATE "NGUOIDUNG" SET "MaSv" = '22520002' WHERE "TenDangNhap" = '22520002';
UPDATE "NGUOIDUNG" SET "MaSv" = '22520003' WHERE "TenDangNhap" = '22520003';
UPDATE "NGUOIDUNG" SET "MaSv" = '22520004' WHERE "TenDangNhap" = '22520004';
UPDATE "NGUOIDUNG" SET "MaSv" = '22520005' WHERE "TenDangNhap" = '22520005';
UPDATE "NGUOIDUNG" SET "MaSv" = '22520006' WHERE "TenDangNhap" = 'student';

UPDATE "SINHVIEN"
SET "NgayNhapHoc" = '2025-09-01'
WHERE "MaSv" IN ('22520001', '22520002', '22520003', '22520004', '22520005', '22520006');



-- =====================================================
-- INSERT DATA - Lớp học (Classes)
-- =====================================================
INSERT INTO "LOP" ("MaLop", "TenLop", "MaMonHoc", "GiangVien", "LichHoc", "PhongHoc", "SoLuongToiDa") VALUES
('ACCT3603.N01', 'Hệ thống thông tin kế toán', 'ACCT3603', 'ThS. Nguyễn Minh An', 'Thứ 2, Tiết 1-3', 'I.0001', 60),
('ACCT5123.N01', 'Hoạch định nguồn lực doanh nghiệp', 'ACCT5123', 'TS. Trần Minh An', 'Thứ 3, Tiết 4-5', 'I.0002', 60),
('ADENG1.N01', 'Tiếng Anh tăng cường 1', 'ADENG1', 'ThS. Lê Minh An', 'Thứ 4, Tiết 6-8', 'I.0003', 60),
('ADENG2.N01', 'Tiếng Anh tăng cường 2', 'ADENG2', 'PGS.TS Phạm Minh An', 'Thứ 5, Tiết 8-10', 'I.0004', 60),
('ADENG3.N01', 'Tiếng Anh tăng cường 3', 'ADENG3', 'ThS. Hoàng Minh An', 'Thứ 6, Tiết 1-3', 'I.0005', 60),
('ADENG4.N01', 'Tiếng Anh tăng cường 4', 'ADENG4', 'TS. Huỳnh Minh An', 'Thứ 7, Tiết 4-5', 'I.0006', 60),
('AI001.N01', 'Giới thiệu ngành Trí tuệ nhân tạo', 'AI001', 'ThS. Phan Minh An', 'Thứ 2, Tiết 6-8', 'C.0007', 60),
('AI002.N01', 'Tư duy Trí tuệ nhân tạo', 'AI002', 'PGS.TS Vũ Minh An', 'Thứ 3, Tiết 8-10', 'C.0008', 60),
('AI002_TH.N01', 'Tư duy Trí tuệ nhân tạo (Thực hành)', 'AI002_TH', 'ThS. Võ Minh An', 'Thứ 4, Tiết 1-3', 'C.0009', 30),
('AI301.N01', 'Khởi nghiệp và sáng tạo', 'AI301', 'TS. Đặng Minh An', 'Thứ 5, Tiết 4-5', 'C.0010', 60),
('AI302.N01', 'Kỹ thuật viết báo cáo và trình bày', 'AI302', 'ThS. Bùi Minh An', 'Thứ 6, Tiết 6-8', 'C.0011', 60),
('AI503.N01', 'Đồ án tốt nghiệp', 'AI503', 'PGS.TS Đỗ Minh An', 'Thứ 7, Tiết 8-10', 'C.0012', 60),
('AI504.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'AI504', 'ThS. Hồ Minh An', 'Thứ 2, Tiết 1-3', 'C.0013', 60),
('AI505.N01', 'Khoá luận tốt nghiệp', 'AI505', 'TS. Ngô Minh An', 'Thứ 3, Tiết 4-5', 'C.0014', 60),
('BCH058.N01', 'Kỹ năng truyền thông giao tiếp', 'BCH058', 'ThS. Dương Minh An', 'Thứ 4, Tiết 6-8', 'B.0015', 60),
('BCH058_TH.N01', 'Kỹ năng truyền thông giao tiếp (Thực hành)', 'BCH058_TH', 'PGS.TS Lý Minh An', 'Thứ 5, Tiết 8-10', 'B.0016', 30),
('BOQC1.N01', 'Nhập môn máy tính lượng tử', 'BOQC1', 'ThS. Mai Minh An', 'Thứ 6, Tiết 1-3', 'B.0017', 60),
('BUS1125.N01', 'Khởi nghiệp kinh doanh', 'BUS1125', 'TS. Tạ Minh An', 'Thứ 7, Tiết 4-5', 'B.0018', 60),
('BUS1125_TH.N01', 'Khởi nghiệp kinh doanh (Thực hành)', 'BUS1125_TH', 'ThS. Đinh Minh An', 'Thứ 2, Tiết 6-8', 'B.0019', 30),
('CARC1.N01', 'Kiến trúc máy tính', 'CARC1', 'PGS.TS Cao Minh An', 'Thứ 3, Tiết 8-10', 'CE.0020', 60),
('CE005.N01', 'Giới thiệu ngành Kỹ Thuật Máy tính', 'CE005', 'ThS. Nguyễn Hoàng An', 'Thứ 4, Tiết 1-3', 'CE.0021', 60),
('CE006.N01', 'Giới thiệu ngành Thiết kế vi mạch', 'CE006', 'TS. Trần Hoàng An', 'Thứ 5, Tiết 4-5', 'CE.0022', 60),
('CE101.N01', 'Lý thuyết mạch điện', 'CE101', 'ThS. Lê Hoàng An', 'Thứ 6, Tiết 6-8', 'CE.0023', 60),
('CE102.N01', 'Hệ thống số', 'CE102', 'PGS.TS Phạm Hoàng An', 'Thứ 7, Tiết 8-10', 'CE.0024', 60),
('CE102_TH.N01', 'Hệ thống số (Thực hành)', 'CE102_TH', 'ThS. Hoàng Hoàng An', 'Thứ 2, Tiết 1-3', 'CE.0025', 30),
('CE103.N01', 'Vi xử lý-vi điều khiển', 'CE103', 'TS. Huỳnh Hoàng An', 'Thứ 3, Tiết 4-5', 'CE.0026', 60),
('CE103_TH.N01', 'Vi xử lý-vi điều khiển (Thực hành)', 'CE103_TH', 'ThS. Phan Hoàng An', 'Thứ 4, Tiết 6-8', 'CE.0027', 30),
('CE104.N01', 'Các thiết bị và mạch điện tử', 'CE104', 'PGS.TS Vũ Hoàng An', 'Thứ 5, Tiết 8-10', 'CE.0028', 60),
('CE105.N01', 'Xử lý tín hiệu số', 'CE105', 'ThS. Võ Hoàng An', 'Thứ 6, Tiết 1-3', 'CE.0029', 60),
('CE106.N01', 'Thiết kế vi mạch với HDL', 'CE106', 'TS. Đặng Hoàng An', 'Thứ 7, Tiết 4-5', 'CE.0030', 60),
('CE106_TH.N01', 'Thiết kế vi mạch với HDL (Thực hành)', 'CE106_TH', 'ThS. Bùi Hoàng An', 'Thứ 2, Tiết 6-8', 'CE.0031', 30),
('CE107.N01', 'Hệ thống nhúng', 'CE107', 'PGS.TS Đỗ Hoàng An', 'Thứ 3, Tiết 8-10', 'CE.0032', 60),
('CE108.N01', 'Hệ điều hành nâng cao', 'CE108', 'ThS. Hồ Hoàng An', 'Thứ 4, Tiết 1-3', 'CE.0033', 60),
('CE109.N01', 'Lập trình nhúng căn bản', 'CE109', 'TS. Ngô Hoàng An', 'Thứ 5, Tiết 4-5', 'CE.0034', 60),
('CE109_TH.N01', 'Lập trình nhúng căn bản (Thực hành)', 'CE109_TH', 'ThS. Dương Hoàng An', 'Thứ 6, Tiết 6-8', 'CE.0035', 30),
('CE110.N01', 'Lập trình hệ thống với Java', 'CE110', 'PGS.TS Lý Hoàng An', 'Thứ 7, Tiết 8-10', 'CE.0036', 60),
('CE110_TH.N01', 'Lập trình hệ thống với Java (Thực hành)', 'CE110_TH', 'ThS. Mai Hoàng An', 'Thứ 2, Tiết 1-3', 'CE.0037', 30),
('CE111.N01', 'Kiến trúc máy tính nâng cao', 'CE111', 'TS. Tạ Hoàng An', 'Thứ 3, Tiết 4-5', 'CE.0038', 60),
('CE111_TH.N01', 'Kiến trúc máy tính nâng cao (Thực hành)', 'CE111_TH', 'ThS. Đinh Hoàng An', 'Thứ 4, Tiết 6-8', 'CE.0039', 30),
('CE112.N01', 'Đồ án môn học thiết kế mạch', 'CE112', 'PGS.TS Cao Hoàng An', 'Thứ 5, Tiết 8-10', 'CE.0040', 30),
('CE113.N01', 'Điều khiển tự động', 'CE113', 'ThS. Nguyễn Thanh An', 'Thứ 6, Tiết 1-3', 'CE.0041', 60),
('CE114.N01', 'Lập trình trên thiết bị di động', 'CE114', 'TS. Trần Thanh An', 'Thứ 7, Tiết 4-5', 'CE.0042', 60),
('CE114_TH.N01', 'Lập trình trên thiết bị di động (Thực hành)', 'CE114_TH', 'ThS. Lê Thanh An', 'Thứ 2, Tiết 6-8', 'CE.0043', 30),
('CE115.N01', 'Thiết kế mạng', 'CE115', 'PGS.TS Phạm Thanh An', 'Thứ 3, Tiết 8-10', 'CE.0044', 60),
('CE115_TH.N01', 'Thiết kế mạng (Thực hành)', 'CE115_TH', 'ThS. Hoàng Thanh An', 'Thứ 4, Tiết 1-3', 'CE.0045', 30),
('CE116.N01', 'Đồ án môn học ngành KTMT', 'CE116', 'TS. Huỳnh Thanh An', 'Thứ 5, Tiết 4-5', 'CE.0046', 30),
('CE117.N01', 'Thực hành điện- điện tử', 'CE117', 'ThS. Phan Thanh An', 'Thứ 6, Tiết 6-8', 'CE.0047', 60),
('CE118.N01', 'Thiết kế luận lý số', 'CE118', 'PGS.TS Vũ Thanh An', 'Thứ 7, Tiết 8-10', 'CE.0048', 60),
('CE118_TH.N01', 'Thiết kế luận lý số (Thực hành)', 'CE118_TH', 'ThS. Võ Thanh An', 'Thứ 2, Tiết 1-3', 'CE.0049', 30),
('CE119.N01', 'Thực hành Kiến trúc máy tính', 'CE119', 'TS. Đặng Thanh An', 'Thứ 3, Tiết 4-5', 'CE.0050', 30),
('CE121.N01', 'Lý thuyết mạch điện', 'CE121', 'ThS. Bùi Thanh An', 'Thứ 4, Tiết 6-8', 'CE.0051', 60),
('CE122.N01', 'Phân tích mạch kỹ thuật', 'CE122', 'PGS.TS Đỗ Thanh An', 'Thứ 5, Tiết 8-10', 'CE.0052', 60),
('CE122_TH.N01', 'Phân tích mạch kỹ thuật (Thực hành)', 'CE122_TH', 'ThS. Hồ Thanh An', 'Thứ 6, Tiết 1-3', 'CE.0053', 30),
('CE124.N01', 'Các thiết bị và mạch điện tử', 'CE124', 'TS. Ngô Thanh An', 'Thứ 7, Tiết 4-5', 'CE.0054', 60),
('CE124_TH.N01', 'Các thiết bị và mạch điện tử (Thực hành)', 'CE124_TH', 'ThS. Dương Thanh An', 'Thứ 2, Tiết 6-8', 'CE.0055', 30),
('CE125.N01', 'Kỹ thuật phân tích mạch', 'CE125', 'PGS.TS Lý Thanh An', 'Thứ 3, Tiết 8-10', 'CE.0056', 60),
('CE125_TH.N01', 'Kỹ thuật phân tích mạch (Thực hành)', 'CE125_TH', 'ThS. Mai Thanh An', 'Thứ 4, Tiết 1-3', 'CE.0057', 30),
('CE126.N01', 'Vật lý bán dẫn và ứng dụng', 'CE126', 'TS. Tạ Thanh An', 'Thứ 5, Tiết 4-5', 'CE.0058', 60),
('CE126_TH.N01', 'Vật lý bán dẫn và ứng dụng (Thực hành)', 'CE126_TH', 'ThS. Đinh Thanh An', 'Thứ 6, Tiết 6-8', 'CE.0059', 30),
('CE201.N01', 'Đồ án 1', 'CE201', 'PGS.TS Cao Thanh An', 'Thứ 7, Tiết 8-10', 'CE.0060', 60),
('CE202.N01', 'An toàn mạng máy tính', 'CE202', 'ThS. Nguyễn Quang An', 'Thứ 2, Tiết 1-3', 'CE.0061', 60),
('CE203.N01', 'Điều khiển tự động nâng cao', 'CE203', 'TS. Trần Quang An', 'Thứ 3, Tiết 4-5', 'CE.0062', 60),
('CE204.N01', 'Thiết kế và lập trình Web', 'CE204', 'ThS. Lê Quang An', 'Thứ 4, Tiết 6-8', 'CE.0063', 60),
('CE205.N01', 'Xử lý tín hiệu số', 'CE205', 'PGS.TS Phạm Quang An', 'Thứ 5, Tiết 8-10', 'CE.0064', 60),
('CE205_TH.N01', 'Xử lý tín hiệu số (Thực hành)', 'CE205_TH', 'ThS. Hoàng Quang An', 'Thứ 6, Tiết 1-3', 'CE.0065', 30),
('CE206.N01', 'Đồ án 2', 'CE206', 'TS. Huỳnh Quang An', 'Thứ 7, Tiết 4-5', 'CE.0066', 60),
('CE207.N01', 'Đồ án Thiết kế vi mạch 1', 'CE207', 'ThS. Phan Quang An', 'Thứ 2, Tiết 6-8', 'CE.0067', 60),
('CE208.N01', 'Đồ án Thiết kế vi mạch 2', 'CE208', 'PGS.TS Vũ Quang An', 'Thứ 3, Tiết 8-10', 'CE.0068', 30),
('CE211.N01', 'Lập trình nhúng căn bản', 'CE211', 'ThS. Võ Quang An', 'Thứ 4, Tiết 1-3', 'CE.0069', 60),
('CE211_TH.N01', 'Lập trình nhúng căn bản (Thực hành)', 'CE211_TH', 'TS. Đặng Quang An', 'Thứ 5, Tiết 4-5', 'CE.0070', 30),
('CE212.N01', 'Điều khiển tự động', 'CE212', 'ThS. Bùi Quang An', 'Thứ 6, Tiết 6-8', 'CE.0071', 60),
('CE213.N01', 'Thiết kế hệ thống số với HDL', 'CE213', 'PGS.TS Đỗ Quang An', 'Thứ 7, Tiết 8-10', 'CE.0072', 60),
('CE219.N01', 'Tương tác người - máy', 'CE219', 'ThS. Hồ Quang An', 'Thứ 2, Tiết 1-3', 'CE.0073', 60),
('CE221.N01', 'Thiết kế vi mạch với HDL', 'CE221', 'TS. Ngô Quang An', 'Thứ 3, Tiết 4-5', 'CE.0074', 60),
('CE222.N01', 'Thiết kế vi mạch số', 'CE222', 'ThS. Dương Quang An', 'Thứ 4, Tiết 6-8', 'CE.0075', 60),
('CE222_TH.N01', 'Thiết kế vi mạch số (Thực hành)', 'CE222_TH', 'PGS.TS Lý Quang An', 'Thứ 5, Tiết 8-10', 'CE.0076', 30),
('CE224.N01', 'Thiết kế hệ thống nhúng', 'CE224', 'ThS. Mai Quang An', 'Thứ 6, Tiết 1-3', 'CE.0077', 60),
('CE224_TH.N01', 'Thiết kế hệ thống nhúng (Thực hành)', 'CE224_TH', 'TS. Tạ Quang An', 'Thứ 7, Tiết 4-5', 'CE.0078', 30),
('CE226.N01', 'Thiết kế VLSI', 'CE226', 'ThS. Đinh Quang An', 'Thứ 2, Tiết 6-8', 'CE.0079', 60),
('CE226_TH.N01', 'Thiết kế VLSI (Thực hành)', 'CE226_TH', 'PGS.TS Cao Quang An', 'Thứ 3, Tiết 8-10', 'CE.0080', 30),
('CE232.N01', 'Thiết kế hệ thống nhúng không dây', 'CE232', 'ThS. Nguyễn Hữu An', 'Thứ 4, Tiết 1-3', 'CE.0081', 60),
('CE232_TH.N01', 'Thiết kế hệ thống nhúng không dây (Thực hành)', 'CE232_TH', 'TS. Trần Hữu An', 'Thứ 5, Tiết 4-5', 'CE.0082', 30),
('CE233.N01', 'Kỹ thuật Robot', 'CE233', 'ThS. Lê Hữu An', 'Thứ 6, Tiết 6-8', 'CE.0083', 60),
('CE233_TH.N01', 'Kỹ thuật Robot (Thực hành)', 'CE233_TH', 'PGS.TS Phạm Hữu An', 'Thứ 7, Tiết 8-10', 'CE.0084', 30),
('CE301.N01', 'Hệ thống chứng thực số', 'CE301', 'ThS. Hoàng Hữu An', 'Thứ 2, Tiết 1-3', 'CE.0085', 60),
('CE302.N01', 'Thiết kế vi mạch', 'CE302', 'TS. Huỳnh Hữu An', 'Thứ 3, Tiết 4-5', 'CE.0086', 60),
('CE302_TH.N01', 'Thiết kế vi mạch (Thực hành)', 'CE302_TH', 'ThS. Phan Hữu An', 'Thứ 4, Tiết 6-8', 'CE.0087', 30),
('CE303.N01', 'Robot công nghiệp', 'CE303', 'PGS.TS Vũ Hữu An', 'Thứ 5, Tiết 8-10', 'CE.0088', 60),
('CE3031.N01', 'Công nghệ cảm biến', 'CE3031', 'ThS. Võ Hữu An', 'Thứ 6, Tiết 1-3', 'CE.0089', 60),
('CE304.N01', 'Robot công nghiệp', 'CE304', 'TS. Đặng Hữu An', 'Thứ 7, Tiết 4-5', 'CE.0090', 60),
('CE306.N01', 'Thị giác máy tính', 'CE306', 'ThS. Bùi Hữu An', 'Thứ 2, Tiết 6-8', 'CE.0091', 60),
('CE312.N01', 'Hệ thống thời gian thực', 'CE312', 'PGS.TS Đỗ Hữu An', 'Thứ 3, Tiết 8-10', 'CE.0092', 60),
('CE313.N01', 'Xử lý song song và hệ thống phân tán', 'CE313', 'ThS. Hồ Hữu An', 'Thứ 4, Tiết 1-3', 'CE.0093', 60),
('CE314.N01', 'Trình biên dịch', 'CE314', 'TS. Ngô Hữu An', 'Thứ 5, Tiết 4-5', 'CE.0094', 60),
('CE315.N01', 'Lập trình hệ thống với Java', 'CE315', 'ThS. Dương Hữu An', 'Thứ 6, Tiết 6-8', 'CE.0095', 60),
('CE315_TH.N01', 'Lập trình hệ thống với Java (Thực hành)', 'CE315_TH', 'PGS.TS Lý Hữu An', 'Thứ 7, Tiết 8-10', 'CE.0096', 30),
('CE316.N01', 'Logic mờ và ứng dụng', 'CE316', 'ThS. Mai Hữu An', 'Thứ 2, Tiết 1-3', 'CE.0097', 60),
('CE317.N01', 'Điều khiển tự động nâng cao', 'CE317', 'TS. Tạ Hữu An', 'Thứ 3, Tiết 4-5', 'CE.0098', 60),
('CE318.N01', 'Trình biên dịch', 'CE318', 'ThS. Đinh Hữu An', 'Thứ 4, Tiết 6-8', 'CE.0099', 60),
('CE319.N01', 'Logic mờ và ứng dụng', 'CE319', 'PGS.TS Cao Hữu An', 'Thứ 5, Tiết 8-10', 'CE.0100', 60),
('CE319_TH.N01', 'Logic mờ và ứng dụng (Thực hành)', 'CE319_TH', 'ThS. Nguyễn Gia An', 'Thứ 6, Tiết 1-3', 'CE.0101', 30),
('CE320.N01', 'Logic mờ cho ứng dụng hệ thống nhúng', 'CE320', 'TS. Trần Gia An', 'Thứ 7, Tiết 4-5', 'CE.0102', 60),
('CE320_TH.N01', 'Logic mờ cho ứng dụng hệ thống nhúng (Thực hành)', 'CE320_TH', 'ThS. Lê Gia An', 'Thứ 2, Tiết 6-8', 'CE.0103', 30),
('CE321.N01', 'Kỹ thuật chế tạo vi mạch', 'CE321', 'PGS.TS Phạm Gia An', 'Thứ 3, Tiết 8-10', 'CE.0104', 60),
('CE322.N01', 'Thiết kế vi mạch hỗn hợp', 'CE322', 'ThS. Hoàng Gia An', 'Thứ 4, Tiết 1-3', 'CE.0105', 60),
('CE322_TH.N01', 'Thiết kế vi mạch hỗn hợp (Thực hành)', 'CE322_TH', 'TS. Huỳnh Gia An', 'Thứ 5, Tiết 4-5', 'CE.0106', 30),
('CE323.N01', 'Kĩ thuật thiết kế mạch in', 'CE323', 'ThS. Phan Gia An', 'Thứ 6, Tiết 6-8', 'CE.0107', 60),
('CE324.N01', 'Thiết kế vi mạch tương tự', 'CE324', 'PGS.TS Vũ Gia An', 'Thứ 7, Tiết 8-10', 'CE.0108', 60),
('CE325.N01', 'Thiết kế dựa trên vi xử lý', 'CE325', 'ThS. Võ Gia An', 'Thứ 2, Tiết 1-3', 'CE.0109', 60),
('CE326.N01', 'Tự động hóa thiết kế vi mạch', 'CE326', 'TS. Đặng Gia An', 'Thứ 3, Tiết 4-5', 'CE.0110', 60),
('CE326_TH.N01', 'Tự động hóa thiết kế vi mạch (Thực hành)', 'CE326_TH', 'ThS. Bùi Gia An', 'Thứ 4, Tiết 6-8', 'CE.0111', 30),
('CE327.N01', 'Tối ưu hóa dựa trên FPGA', 'CE327', 'PGS.TS Đỗ Gia An', 'Thứ 5, Tiết 8-10', 'CE.0112', 60),
('CE331.N01', 'Kỹ thuật chế tạo vi mạch', 'CE331', 'ThS. Hồ Gia An', 'Thứ 6, Tiết 1-3', 'CE.0113', 60),
('CE331_TH.N01', 'Kỹ thuật chế tạo vi mạch (Thực hành)', 'CE331_TH', 'TS. Ngô Gia An', 'Thứ 7, Tiết 4-5', 'CE.0114', 30),
('CE332.N01', 'Thiết kế vi mạch hỗn hợp', 'CE332', 'ThS. Dương Gia An', 'Thứ 2, Tiết 6-8', 'CE.0115', 60),
('CE332_TH.N01', 'Thiết kế vi mạch hỗn hợp (Thực hành)', 'CE332_TH', 'PGS.TS Lý Gia An', 'Thứ 3, Tiết 8-10', 'CE.0116', 30),
('CE333.N01', 'Tiếng Anh chuyên ngành Kỹ thuật Máy tính', 'CE333', 'ThS. Mai Gia An', 'Thứ 4, Tiết 1-3', 'CE.0117', 60),
('CE334.N01', 'Thiết kế vi mạch tương tự', 'CE334', 'TS. Tạ Gia An', 'Thứ 5, Tiết 4-5', 'CE.0118', 60),
('CE335.N01', 'Thiết kế dựa trên vi xử lý', 'CE335', 'ThS. Đinh Gia An', 'Thứ 6, Tiết 6-8', 'CE.0119', 60),
('CE336.N01', 'Tự động hóa thiết kế vi mạch', 'CE336', 'PGS.TS Cao Gia An', 'Thứ 7, Tiết 8-10', 'CE.0120', 60),
('CE337.N01', 'Tối ưu hóa dựa trên FPGA', 'CE337', 'ThS. Nguyễn Khánh An', 'Thứ 2, Tiết 1-3', 'CE.0121', 60),
('CE338.N01', 'Hệ thống thời gian thực', 'CE338', 'TS. Trần Khánh An', 'Thứ 3, Tiết 4-5', 'CE.0122', 60),
('CE339.N01', 'Công nghệ IoT và Ứng dụng', 'CE339', 'ThS. Lê Khánh An', 'Thứ 4, Tiết 6-8', 'CE.0123', 60),
('CE340.N01', 'Trí tuệ nhân tạo cho hệ thống nhúng', 'CE340', 'PGS.TS Phạm Khánh An', 'Thứ 5, Tiết 8-10', 'CE.0124', 60),
('CE340_TH.N01', 'Trí tuệ nhân tạo cho hệ thống nhúng (Thực hành)', 'CE340_TH', 'ThS. Hoàng Khánh An', 'Thứ 6, Tiết 1-3', 'CE.0125', 30),
('CE341.N01', 'Lập trình nhúng trên các thiết bị di động', 'CE341', 'TS. Huỳnh Khánh An', 'Thứ 7, Tiết 4-5', 'CE.0126', 60),
('CE341_TH.N01', 'Lập trình nhúng trên các thiết bị di động (Thực hành)', 'CE341_TH', 'ThS. Phan Khánh An', 'Thứ 2, Tiết 6-8', 'CE.0127', 30),
('CE342.N01', 'Hệ thống thông minh', 'CE342', 'PGS.TS Vũ Khánh An', 'Thứ 3, Tiết 8-10', 'CE.0128', 60),
('CE342_TH.N01', 'Hệ thống thông minh (Thực hành)', 'CE342_TH', 'ThS. Võ Khánh An', 'Thứ 4, Tiết 1-3', 'CE.0129', 30),
('CE343.N01', 'Trí tuệ nhân tạo cho xe tự hành', 'CE343', 'TS. Đặng Khánh An', 'Thứ 5, Tiết 4-5', 'CE.0130', 60),
('CE343_TH.N01', 'Trí tuệ nhân tạo cho xe tự hành (Thực hành)', 'CE343_TH', 'ThS. Bùi Khánh An', 'Thứ 6, Tiết 6-8', 'CE.0131', 30),
('CE344.N01', 'Trí tuệ nhân tạo cho IoT', 'CE344', 'PGS.TS Đỗ Khánh An', 'Thứ 7, Tiết 8-10', 'CE.0132', 60),
('CE344_TH.N01', 'Trí tuệ nhân tạo cho IoT (Thực hành)', 'CE344_TH', 'ThS. Hồ Khánh An', 'Thứ 2, Tiết 1-3', 'CE.0133', 30),
('CE345.N01', 'Kiến trúc IoT: Giao thức mạng và bảo mật', 'CE345', 'TS. Ngô Khánh An', 'Thứ 3, Tiết 4-5', 'CE.0134', 60),
('CE345_TH.N01', 'Kiến trúc IoT: Giao thức mạng và bảo mật (Thực hành)', 'CE345_TH', 'ThS. Dương Khánh An', 'Thứ 4, Tiết 6-8', 'CE.0135', 30),
('CE346.N01', 'Thiết kế Antenna tích hợp cho thiết bị IoT', 'CE346', 'PGS.TS Lý Khánh An', 'Thứ 5, Tiết 8-10', 'CE.0136', 60),
('CE346_TH.N01', 'Thiết kế Antenna tích hợp cho thiết bị IoT (Thực hành)', 'CE346_TH', 'ThS. Mai Khánh An', 'Thứ 6, Tiết 1-3', 'CE.0137', 30),
('CE347.N01', 'Điều khiển thông minh cho robot', 'CE347', 'TS. Tạ Khánh An', 'Thứ 7, Tiết 4-5', 'CE.0138', 60),
('CE347_TH.N01', 'Điều khiển thông minh cho robot (Thực hành)', 'CE347_TH', 'ThS. Đinh Khánh An', 'Thứ 2, Tiết 6-8', 'CE.0139', 30),
('CE348.N01', 'Công nghệ cảm biến trong IoT', 'CE348', 'PGS.TS Cao Khánh An', 'Thứ 3, Tiết 8-10', 'CE.0140', 60),
('CE348_TH.N01', 'Công nghệ cảm biến trong IoT (Thực hành)', 'CE348_TH', 'ThS. Nguyễn Tuấn An', 'Thứ 4, Tiết 1-3', 'CE.0141', 30),
('CE349.N01', 'Hệ thống nhúng trên SoC', 'CE349', 'TS. Trần Tuấn An', 'Thứ 5, Tiết 4-5', 'CE.0142', 60),
('CE349_TH.N01', 'Hệ thống nhúng trên SoC (Thực hành)', 'CE349_TH', 'ThS. Lê Tuấn An', 'Thứ 6, Tiết 6-8', 'CE.0143', 30),
('CE350.N01', 'Xử lý ảnh hướng ASIC', 'CE350', 'PGS.TS Phạm Tuấn An', 'Thứ 7, Tiết 8-10', 'CE.0144', 60),
('CE350_TH.N01', 'Xử lý ảnh hướng ASIC (Thực hành)', 'CE350_TH', 'ThS. Hoàng Tuấn An', 'Thứ 2, Tiết 1-3', 'CE.0145', 30),
('CE351.N01', 'Thiết kế bộ tăng tốc phần cứng', 'CE351', 'TS. Huỳnh Tuấn An', 'Thứ 3, Tiết 4-5', 'CE.0146', 60),
('CE351_TH.N01', 'Thiết kế bộ tăng tốc phần cứng (Thực hành)', 'CE351_TH', 'ThS. Phan Tuấn An', 'Thứ 4, Tiết 6-8', 'CE.0147', 30),
('CE352.N01', 'Xử lý tín hiệu số trên FPGA', 'CE352', 'PGS.TS Vũ Tuấn An', 'Thứ 5, Tiết 8-10', 'CE.0148', 60),
('CE353.N01', 'Thiết kế vật lý vi mạch', 'CE353', 'ThS. Võ Tuấn An', 'Thứ 6, Tiết 1-3', 'CE.0149', 60),
('CE353_TH.N01', 'Thiết kế vật lý vi mạch (Thực hành)', 'CE353_TH', 'TS. Đặng Tuấn An', 'Thứ 7, Tiết 4-5', 'CE.0150', 30),
('CE401.N01', 'Kỹ thuật hệ thống máy tính', 'CE401', 'ThS. Bùi Tuấn An', 'Thứ 2, Tiết 6-8', 'CE.0151', 60),
('CE402.N01', 'Các hệ điều hành nhúng', 'CE402', 'PGS.TS Đỗ Tuấn An', 'Thứ 3, Tiết 8-10', 'CE.0152', 60),
('CE403.N01', 'Thiết kế số', 'CE403', 'ThS. Hồ Tuấn An', 'Thứ 4, Tiết 1-3', 'CE.0153', 60),
('CE404.N01', 'Kỹ thuật chế tạo vi mạch', 'CE404', 'TS. Ngô Tuấn An', 'Thứ 5, Tiết 4-5', 'CE.0154', 60),
('CE405.N01', 'Tương tác người máy', 'CE405', 'ThS. Dương Tuấn An', 'Thứ 6, Tiết 6-8', 'CE.0155', 60),
('CE406.N01', 'Tương tác người – Máy', 'CE406', 'PGS.TS Lý Tuấn An', 'Thứ 7, Tiết 8-10', 'CE.0156', 60),
('CE406_TH.N01', 'Tương tác người – Máy (Thực hành)', 'CE406_TH', 'ThS. Mai Tuấn An', 'Thứ 2, Tiết 1-3', 'CE.0157', 30),
('CE407.N01', 'Đồ án chuyên ngành Hệ thống nhúng và Robot', 'CE407', 'TS. Tạ Tuấn An', 'Thứ 3, Tiết 4-5', 'CE.0158', 30),
('CE408.N01', 'Đồ án chuyên ngành Thiết kế vi mạch và phần cứng', 'CE408', 'ThS. Đinh Tuấn An', 'Thứ 4, Tiết 6-8', 'CE.0159', 60),
('CE409.N01', 'Kỹ thuật thiết kế kiểm tra', 'CE409', 'PGS.TS Cao Tuấn An', 'Thứ 5, Tiết 8-10', 'CE.0160', 60),
('CE410.N01', 'Kỹ thuật hệ thống máy tính', 'CE410', 'ThS. Nguyễn Ngọc An', 'Thứ 6, Tiết 1-3', 'CE.0161', 60),
('CE411.N01', 'Chuyên đề hệ thống nhúng và robot', 'CE411', 'TS. Trần Ngọc An', 'Thứ 7, Tiết 4-5', 'CE.0162', 60),
('CE411_TH.N01', 'Chuyên đề hệ thống nhúng và robot (Thực hành)', 'CE411_TH', 'ThS. Lê Ngọc An', 'Thứ 2, Tiết 6-8', 'CE.0163', 30),
('CE412.N01', 'Đồ án chuyên ngành Hệ thống nhúng và IoT', 'CE412', 'PGS.TS Phạm Ngọc An', 'Thứ 3, Tiết 8-10', 'CE.0164', 30),
('CE413.N01', 'Đồ án chuyên ngành Robotics và AI', 'CE413', 'ThS. Hoàng Ngọc An', 'Thứ 4, Tiết 1-3', 'CE.0165', 60),
('CE421.N01', 'Chuyên đề thiết kế vi mạch và phần cứng', 'CE421', 'TS. Huỳnh Ngọc An', 'Thứ 5, Tiết 4-5', 'CE.0166', 60),
('CE430.N01', 'Lập trình hệ thống', 'CE430', 'ThS. Phan Ngọc An', 'Thứ 6, Tiết 6-8', 'CE.0167', 60),
('CE430_TH.N01', 'Lập trình hệ thống (Thực hành)', 'CE430_TH', 'PGS.TS Vũ Ngọc An', 'Thứ 7, Tiết 8-10', 'CE.0168', 30),
('CE432.N01', 'Thiết kế vi mạch hướng ASIC', 'CE432', 'ThS. Võ Ngọc An', 'Thứ 2, Tiết 1-3', 'CE.0169', 60),
('CE433.N01', 'Thiết kế hệ thống SoC', 'CE433', 'TS. Đặng Ngọc An', 'Thứ 3, Tiết 4-5', 'CE.0170', 60),
('CE434.N01', 'Chuyên đề thiết kế hệ vi mạch 1', 'CE434', 'ThS. Bùi Ngọc An', 'Thứ 4, Tiết 6-8', 'CE.0171', 60),
('CE434_TH.N01', 'Chuyên đề thiết kế hệ vi mạch 1 (Thực hành)', 'CE434_TH', 'PGS.TS Đỗ Ngọc An', 'Thứ 5, Tiết 8-10', 'CE.0172', 30),
('CE435.N01', 'Chuyên đề thiết kế hệ vi mạch 2', 'CE435', 'ThS. Hồ Ngọc An', 'Thứ 6, Tiết 1-3', 'CE.0173', 60),
('CE435_TH.N01', 'Chuyên đề thiết kế hệ vi mạch 2 (Thực hành)', 'CE435_TH', 'TS. Ngô Ngọc An', 'Thứ 7, Tiết 4-5', 'CE.0174', 30),
('CE436.N01', 'Xử lý tín hiệu số và ứng dụng', 'CE436', 'ThS. Dương Ngọc An', 'Thứ 2, Tiết 6-8', 'CE.0175', 60),
('CE437.N01', 'Chuyên đề thiết kế hệ thống nhúng 1', 'CE437', 'PGS.TS Lý Ngọc An', 'Thứ 3, Tiết 8-10', 'CE.0176', 60),
('CE437_TH.N01', 'Chuyên đề thiết kế hệ thống nhúng 1 (Thực hành)', 'CE437_TH', 'ThS. Mai Ngọc An', 'Thứ 4, Tiết 1-3', 'CE.0177', 30),
('CE438.N01', 'Chuyên đề thiết kế hệ thống nhúng 2', 'CE438', 'TS. Tạ Ngọc An', 'Thứ 5, Tiết 4-5', 'CE.0178', 60),
('CE438_TH.N01', 'Chuyên đề thiết kế hệ thống nhúng 2 (Thực hành)', 'CE438_TH', 'ThS. Đinh Ngọc An', 'Thứ 6, Tiết 6-8', 'CE.0179', 30),
('CE439.N01', 'Lập trình song song và hệ phân tán', 'CE439', 'PGS.TS Cao Ngọc An', 'Thứ 7, Tiết 8-10', 'CE.0180', 60),
('CE440.N01', 'Hệ thống định vị với ứng dụng AI', 'CE440', 'ThS. Nguyễn Bảo An', 'Thứ 2, Tiết 1-3', 'CE.0181', 60),
('CE440_TH.N01', 'Hệ thống định vị với ứng dụng AI (Thực hành)', 'CE440_TH', 'TS. Trần Bảo An', 'Thứ 3, Tiết 4-5', 'CE.0182', 30),
('CE441.N01', 'Chuyên đề thiết kế Robotics và AI 1', 'CE441', 'ThS. Lê Bảo An', 'Thứ 4, Tiết 6-8', 'CE.0183', 60),
('CE442.N01', 'Chuyên đề thiết kế Robotics và AI 2', 'CE442', 'PGS.TS Phạm Bảo An', 'Thứ 5, Tiết 8-10', 'CE.0184', 60),
('CE501.N01', 'Thực tập doanh nghiệp', 'CE501', 'ThS. Hoàng Bảo An', 'Thứ 6, Tiết 1-3', 'CE.0185', 30),
('CE502.N01', 'Thực tập doanh nghiệp', 'CE502', 'TS. Huỳnh Bảo An', 'Thứ 7, Tiết 4-5', 'CE.0186', 60),
('CE505.N01', 'Khóa luận tốt nghiệp', 'CE505', 'ThS. Phan Bảo An', 'Thứ 2, Tiết 6-8', 'CE.0187', 60),
('CE506.N01', 'Luận văn chuyên sâu đặc thù', 'CE506', 'PGS.TS Vũ Bảo An', 'Thứ 3, Tiết 8-10', 'CE.0188', 30),
('CE507.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'CE507', 'ThS. Võ Bảo An', 'Thứ 4, Tiết 1-3', 'CE.0189', 60),
('CE508.N01', 'Đồ án tốt nghiệp', 'CE508', 'TS. Đặng Bảo An', 'Thứ 5, Tiết 4-5', 'CE.0190', 30),
('CE510.N01', 'Chuyên đề tốt nghiệp định hướng Hệ thống nhúng và IoT', 'CE510', 'ThS. Bùi Bảo An', 'Thứ 6, Tiết 6-8', 'CE.0191', 60),
('CE510_TH.N01', 'Chuyên đề tốt nghiệp định hướng Hệ thống nhúng và IoT (Thực hành)', 'CE510_TH', 'PGS.TS Đỗ Bảo An', 'Thứ 7, Tiết 8-10', 'CE.0192', 30),
('CE511.N01', 'Chuyên đề tốt nghiệp định hướng Robotic và AI', 'CE511', 'ThS. Hồ Bảo An', 'Thứ 2, Tiết 1-3', 'CE.0193', 60),
('CE511_TH.N01', 'Chuyên đề tốt nghiệp định hướng Robotic và AI (Thực hành)', 'CE511_TH', 'TS. Ngô Bảo An', 'Thứ 3, Tiết 4-5', 'CE.0194', 30),
('CE512.N01', 'Chuyên đề tốt nghiệp định hướng thiết kế vi mạch', 'CE512', 'ThS. Dương Bảo An', 'Thứ 4, Tiết 6-8', 'CE.0195', 60),
('CE512_TH.N01', 'Chuyên đề tốt nghiệp định hướng thiết kế vi mạch (Thực hành)', 'CE512_TH', 'PGS.TS Lý Bảo An', 'Thứ 5, Tiết 8-10', 'CE.0196', 30),
('CM101.N01', 'Quản lý giao tiếp', 'CM101', 'ThS. Mai Bảo An', 'Thứ 6, Tiết 1-3', 'I.0197', 60),
('CNBU001.N01', 'Mạng máy tính', 'CNBU001', 'TS. Tạ Bảo An', 'Thứ 7, Tiết 4-5', 'N.0198', 60),
('CNBU001_TH.N01', 'Mạng máy tính (Thực hành)', 'CNBU001_TH', 'ThS. Đinh Bảo An', 'Thứ 2, Tiết 6-8', 'N.0199', 30),
('CNBU002.N01', 'Bảo mật', 'CNBU002', 'PGS.TS Cao Bảo An', 'Thứ 3, Tiết 8-10', 'N.0200', 60),
('CNBU002_TH.N01', 'Bảo mật (Thực hành)', 'CNBU002_TH', 'ThS. Nguyễn Đức An', 'Thứ 4, Tiết 1-3', 'N.0201', 30),
('CNBU003.N01', 'Dự án nghiên cứu', 'CNBU003', 'TS. Trần Đức An', 'Thứ 5, Tiết 4-5', 'N.0202', 60),
('CNBU003_TH.N01', 'Dự án nghiên cứu (Thực hành)', 'CNBU003_TH', 'ThS. Lê Đức An', 'Thứ 6, Tiết 6-8', 'N.0203', 30),
('CNBU004.N01', 'Thiết kế và phát triển website', 'CNBU004', 'PGS.TS Phạm Đức An', 'Thứ 7, Tiết 8-10', 'N.0204', 60),
('CNBU004_TH.N01', 'Thiết kế và phát triển website (Thực hành)', 'CNBU004_TH', 'ThS. Hoàng Đức An', 'Thứ 2, Tiết 1-3', 'N.0205', 30),
('CNBU005.N01', 'Internet of Things', 'CNBU005', 'TS. Huỳnh Đức An', 'Thứ 3, Tiết 4-5', 'N.0206', 60),
('CNBU005_TH.N01', 'Internet of Things (Thực hành)', 'CNBU005_TH', 'ThS. Phan Đức An', 'Thứ 4, Tiết 6-8', 'N.0207', 30),
('CNBU006.N01', 'An toàn mạng máy tính', 'CNBU006', 'PGS.TS Vũ Đức An', 'Thứ 5, Tiết 8-10', 'N.0208', 60),
('CNBU006_TH.N01', 'An toàn mạng máy tính (Thực hành)', 'CNBU006_TH', 'ThS. Võ Đức An', 'Thứ 6, Tiết 1-3', 'N.0209', 30),
('CNBU007.N01', 'Pháp chứng kỹ thuật số', 'CNBU007', 'TS. Đặng Đức An', 'Thứ 7, Tiết 4-5', 'N.0210', 60),
('CNBU007_TH.N01', 'Pháp chứng kỹ thuật số (Thực hành)', 'CNBU007_TH', 'ThS. Bùi Đức An', 'Thứ 2, Tiết 6-8', 'N.0211', 30),
('CNBU008.N01', 'Quản lý an toàn thông tin', 'CNBU008', 'PGS.TS Đỗ Đức An', 'Thứ 3, Tiết 8-10', 'N.0212', 60),
('CNBU008_TH.N01', 'Quản lý an toàn thông tin (Thực hành)', 'CNBU008_TH', 'ThS. Hồ Đức An', 'Thứ 4, Tiết 1-3', 'N.0213', 30),
('CNBU009.N01', 'Thực tập', 'CNBU009', 'TS. Ngô Đức An', 'Thứ 5, Tiết 4-5', 'N.0214', 60),
('CNBU101.N01', 'Toán cho Tin học', 'CNBU101', 'ThS. Dương Đức An', 'Thứ 6, Tiết 6-8', 'N.0215', 60),
('CNBU101_TH.N01', 'Toán cho Tin học (Thực hành)', 'CNBU101_TH', 'PGS.TS Lý Đức An', 'Thứ 7, Tiết 8-10', 'N.0216', 30),
('CNBU102.N01', 'Công nghệ mạng máy tính', 'CNBU102', 'ThS. Mai Đức An', 'Thứ 2, Tiết 1-3', 'N.0217', 60),
('CNBU102_TH.N01', 'Công nghệ mạng máy tính (Thực hành)', 'CNBU102_TH', 'TS. Tạ Đức An', 'Thứ 3, Tiết 4-5', 'N.0218', 30),
('CNBU103.N01', 'Lập trình cho kỹ sư mạng máy tính', 'CNBU103', 'ThS. Đinh Đức An', 'Thứ 4, Tiết 6-8', 'N.0219', 60),
('CNBU103_TH.N01', 'Lập trình cho kỹ sư mạng máy tính (Thực hành)', 'CNBU103_TH', 'PGS.TS Cao Đức An', 'Thứ 5, Tiết 8-10', 'N.0220', 30),
('CNBU104.N01', 'Hệ thống Servers', 'CNBU104', 'ThS. Nguyễn Anh An', 'Thứ 6, Tiết 1-3', 'N.0221', 60),
('CNBU104_TH.N01', 'Hệ thống Servers (Thực hành)', 'CNBU104_TH', 'TS. Trần Anh An', 'Thứ 7, Tiết 4-5', 'N.0222', 30),
('CNBU105.N01', 'Hệ thống mạng doanh nghiệp', 'CNBU105', 'ThS. Lê Anh An', 'Thứ 2, Tiết 6-8', 'N.0223', 60),
('CNBU105_TH.N01', 'Hệ thống mạng doanh nghiệp (Thực hành)', 'CNBU105_TH', 'PGS.TS Phạm Anh An', 'Thứ 3, Tiết 8-10', 'N.0224', 30),
('CNBU106.N01', 'Hoạt động an ninh mạng', 'CNBU106', 'ThS. Hoàng Anh An', 'Thứ 4, Tiết 1-3', 'N.0225', 60),
('CNBU106_TH.N01', 'Hoạt động an ninh mạng (Thực hành)', 'CNBU106_TH', 'TS. Huỳnh Anh An', 'Thứ 5, Tiết 4-5', 'N.0226', 30),
('CNBU107.N01', 'Dự án chuyên ngành', 'CNBU107', 'ThS. Phan Anh An', 'Thứ 6, Tiết 6-8', 'N.0227', 60),
('CNBU107_TH.N01', 'Dự án chuyên ngành (Thực hành)', 'CNBU107_TH', 'PGS.TS Vũ Anh An', 'Thứ 7, Tiết 8-10', 'N.0228', 30),
('CNBU108.N01', 'Hệ điều hành', 'CNBU108', 'ThS. Võ Anh An', 'Thứ 2, Tiết 1-3', 'N.0229', 60),
('CNBU108_TH.N01', 'Hệ điều hành (Thực hành)', 'CNBU108_TH', 'TS. Đặng Anh An', 'Thứ 3, Tiết 4-5', 'N.0230', 30),
('CNBU201.N01', 'Công nghệ mạng không dây', 'CNBU201', 'ThS. Bùi Anh An', 'Thứ 4, Tiết 6-8', 'N.0231', 60),
('CNBU201_TH.N01', 'Công nghệ mạng không dây (Thực hành)', 'CNBU201_TH', 'PGS.TS Đỗ Anh An', 'Thứ 5, Tiết 8-10', 'N.0232', 30),
('CNBU202.N01', 'Hệ thống tường lửa nâng cao', 'CNBU202', 'ThS. Hồ Anh An', 'Thứ 6, Tiết 1-3', 'N.0233', 60),
('CNBU202_TH.N01', 'Hệ thống tường lửa nâng cao (Thực hành)', 'CNBU202_TH', 'TS. Ngô Anh An', 'Thứ 7, Tiết 4-5', 'N.0234', 30),
('CNBU203.N01', 'An toàn mạng máy tính', 'CNBU203', 'ThS. Dương Anh An', 'Thứ 2, Tiết 6-8', 'N.0235', 60),
('CNBU203_TH.N01', 'An toàn mạng máy tính (Thực hành)', 'CNBU203_TH', 'PGS.TS Lý Anh An', 'Thứ 3, Tiết 8-10', 'N.0236', 30),
('CNBU204.N01', 'Ethical Hacking', 'CNBU204', 'ThS. Mai Anh An', 'Thứ 4, Tiết 1-3', 'N.0237', 60),
('CNBU204_TH.N01', 'Ethical Hacking (Thực hành)', 'CNBU204_TH', 'TS. Tạ Anh An', 'Thứ 5, Tiết 4-5', 'N.0238', 30),
('CNBU205.N01', 'Dự án cá nhân', 'CNBU205', 'ThS. Đinh Anh An', 'Thứ 6, Tiết 6-8', 'N.0239', 60),
('CNBU205_TH.N01', 'Dự án cá nhân (Thực hành)', 'CNBU205_TH', 'PGS.TS Cao Anh An', 'Thứ 7, Tiết 8-10', 'N.0240', 30),
('CNET1.N01', 'Mạng máy tính', 'CNET1', 'ThS. Nguyễn Kim An', 'Thứ 2, Tiết 1-3', 'N.0241', 60),
('CNET1_TH.N01', 'Mạng máy tính (Thực hành)', 'CNET1_TH', 'TS. Trần Kim An', 'Thứ 3, Tiết 4-5', 'N.0242', 30),
('CS003.N01', 'Máy học nâng cao', 'CS003', 'ThS. Lê Kim An', 'Thứ 4, Tiết 6-8', 'C.0243', 60),
('CS004.N01', 'Máy học trong xử lý ngôn ngữ tự nhiên', 'CS004', 'PGS.TS Phạm Kim An', 'Thứ 5, Tiết 8-10', 'C.0244', 60),
('CS005.N01', 'Giới thiệu ngành Khoa học Máy tính', 'CS005', 'ThS. Hoàng Kim An', 'Thứ 6, Tiết 1-3', 'C.0245', 60),
('CS013.N01', 'Máy học nâng cao', 'CS013', 'TS. Huỳnh Kim An', 'Thứ 7, Tiết 4-5', 'C.0246', 60),
('CS013_TH.N01', 'Máy học nâng cao (Thực hành)', 'CS013_TH', 'ThS. Phan Kim An', 'Thứ 2, Tiết 6-8', 'C.0247', 30),
('CS014.N01', 'Máy học trong xử lý ngôn ngữ tự nhiên', 'CS014', 'PGS.TS Vũ Kim An', 'Thứ 3, Tiết 8-10', 'C.0248', 60),
('CS014_TH.N01', 'Máy học trong xử lý ngôn ngữ tự nhiên (Thực hành)', 'CS014_TH', 'ThS. Võ Kim An', 'Thứ 4, Tiết 1-3', 'C.0249', 30),
('CS019.N01', 'Chuyên đề ứng dụng Trí tuệ nhân tạo', 'CS019', 'TS. Đặng Kim An', 'Thứ 5, Tiết 4-5', 'C.0250', 60),
('CS101.N01', 'Nguyên lý và phương pháp lập trình', 'CS101', 'ThS. Bùi Kim An', 'Thứ 6, Tiết 6-8', 'C.0251', 60),
('CS102.N01', 'Phân tích & thiết kế thuật toán', 'CS102', 'PGS.TS Đỗ Kim An', 'Thứ 7, Tiết 8-10', 'C.0252', 60),
('CS103.N01', 'Cơ sở lập trình', 'CS103', 'ThS. Hồ Kim An', 'Thứ 2, Tiết 1-3', 'C.0253', 60),
('CS104.N01', 'Nhập môn công nghệ phần mềm', 'CS104', 'TS. Ngô Kim An', 'Thứ 3, Tiết 4-5', 'C.0254', 60),
('CS105.N01', 'Đồ họa máy tính', 'CS105', 'ThS. Dương Kim An', 'Thứ 4, Tiết 6-8', 'C.0255', 60),
('CS105_TH.N01', 'Đồ họa máy tính (Thực hành)', 'CS105_TH', 'PGS.TS Lý Kim An', 'Thứ 5, Tiết 8-10', 'C.0256', 30),
('CS106.N01', 'Trí tuệ nhân tạo', 'CS106', 'ThS. Mai Kim An', 'Thứ 6, Tiết 1-3', 'C.0257', 60),
('CS106_TH.N01', 'Trí tuệ nhân tạo (Thực hành)', 'CS106_TH', 'TS. Tạ Kim An', 'Thứ 7, Tiết 4-5', 'C.0258', 30),
('CS107.N01', 'Các hệ cơ sở tri thức', 'CS107', 'ThS. Đinh Kim An', 'Thứ 2, Tiết 6-8', 'C.0259', 60),
('CS108.N01', 'Lý thuyết thông tin', 'CS108', 'PGS.TS Cao Kim An', 'Thứ 3, Tiết 8-10', 'C.0260', 60),
('CS109.N01', 'Máy học', 'CS109', 'ThS. Nguyễn Mai An', 'Thứ 4, Tiết 1-3', 'C.0261', 60),
('CS110.N01', 'Nhập môn công nghệ tri thức & máy học', 'CS110', 'TS. Trần Mai An', 'Thứ 5, Tiết 4-5', 'C.0262', 60),
('CS110_TH.N01', 'Nhập môn công nghệ tri thức & máy học (Thực hành)', 'CS110_TH', 'ThS. Lê Mai An', 'Thứ 6, Tiết 6-8', 'C.0263', 30),
('CS111.N01', 'Nguyên lý và phương pháp lập trình', 'CS111', 'PGS.TS Phạm Mai An', 'Thứ 7, Tiết 8-10', 'C.0264', 60),
('CS111_TH.N01', 'Nguyên lý và phương pháp lập trình (Thực hành)', 'CS111_TH', 'ThS. Hoàng Mai An', 'Thứ 2, Tiết 1-3', 'C.0265', 30),
('CS1113.N01', 'Khoa học máy tính I', 'CS1113', 'TS. Huỳnh Mai An', 'Thứ 3, Tiết 4-5', 'I.0266', 60),
('CS1113_TH.N01', 'Khoa học máy tính I (Thực hành)', 'CS1113_TH', 'ThS. Phan Mai An', 'Thứ 4, Tiết 6-8', 'I.0267', 30),
('CS112.N01', 'Phân tích và thiết kế thuật toán', 'CS112', 'PGS.TS Vũ Mai An', 'Thứ 5, Tiết 8-10', 'C.0268', 60),
('CS113.N01', 'Đồ họa máy tính và Xử lý ảnh', 'CS113', 'ThS. Võ Mai An', 'Thứ 6, Tiết 1-3', 'C.0269', 60),
('CS114.N01', 'Máy học', 'CS114', 'TS. Đặng Mai An', 'Thứ 7, Tiết 4-5', 'C.0270', 60),
('CS115.N01', 'Toán cho Khoa học máy tính', 'CS115', 'ThS. Bùi Mai An', 'Thứ 2, Tiết 6-8', 'C.0271', 60),
('CS116.N01', 'Lập trình Python cho Máy học', 'CS116', 'PGS.TS Đỗ Mai An', 'Thứ 3, Tiết 8-10', 'C.0272', 60),
('CS117.N01', 'Tư duy tính toán', 'CS117', 'ThS. Hồ Mai An', 'Thứ 4, Tiết 1-3', 'C.0273', 60),
('CS117_TH.N01', 'Tư duy tính toán (Thực hành)', 'CS117_TH', 'TS. Ngô Mai An', 'Thứ 5, Tiết 4-5', 'C.0274', 30),
('CS210.N01', 'Xử lý ngôn ngữ tự nhiên nâng cao', 'CS210', 'ThS. Dương Mai An', 'Thứ 6, Tiết 6-8', 'C.0275', 60),
('CS211.N01', 'Trí tuệ nhân tạo nâng cao', 'CS211', 'PGS.TS Lý Mai An', 'Thứ 7, Tiết 8-10', 'C.0276', 60),
('CS211_TH.N01', 'Trí tuệ nhân tạo nâng cao (Thực hành)', 'CS211_TH', 'ThS. Mai Mai An', 'Thứ 2, Tiết 1-3', 'C.0277', 30),
('CS212.N01', 'Xử lý ngôn ngữ tự nhiên', 'CS212', 'TS. Tạ Mai An', 'Thứ 3, Tiết 4-5', 'C.0278', 60),
('CS212_TH.N01', 'Xử lý ngôn ngữ tự nhiên (Thực hành)', 'CS212_TH', 'ThS. Đinh Mai An', 'Thứ 4, Tiết 6-8', 'C.0279', 30),
('CS213.N01', 'Ngôn ngữ học máy tính', 'CS213', 'PGS.TS Cao Mai An', 'Thứ 5, Tiết 8-10', 'B.0280', 60),
('CS2133.N01', 'Khoa học máy tính II', 'CS2133', 'ThS. Nguyễn Xuân An', 'Thứ 6, Tiết 1-3', 'I.0281', 60),
('CS2133_TH.N01', 'Khoa học máy tính II (Thực hành)', 'CS2133_TH', 'TS. Trần Xuân An', 'Thứ 7, Tiết 4-5', 'I.0282', 30),
('CS2134.N01', 'Khoa học máy tính', 'CS2134', 'ThS. Lê Xuân An', 'Thứ 2, Tiết 6-8', 'I.0283', 60),
('CS2134_TH.N01', 'Khoa học máy tính (Thực hành)', 'CS2134_TH', 'PGS.TS Phạm Xuân An', 'Thứ 3, Tiết 8-10', 'I.0284', 30),
('CS214.N01', 'Biểu diễn tri thức và suy luận', 'CS214', 'ThS. Hoàng Xuân An', 'Thứ 4, Tiết 1-3', 'C.0285', 60),
('CS214_TH.N01', 'Biểu diễn tri thức và suy luận (Thực hành)', 'CS214_TH', 'TS. Huỳnh Xuân An', 'Thứ 5, Tiết 4-5', 'C.0286', 30),
('CS217.N01', 'Các hệ cơ sở tri thức', 'CS217', 'ThS. Phan Xuân An', 'Thứ 6, Tiết 6-8', 'C.0287', 60),
('CS221.N01', 'Xử lý ngôn ngữ tự nhiên', 'CS221', 'PGS.TS Vũ Xuân An', 'Thứ 7, Tiết 8-10', 'C.0288', 60),
('CS222.N01', 'Xử lý ngôn ngữ tự nhiên nâng cao', 'CS222', 'ThS. Võ Xuân An', 'Thứ 2, Tiết 1-3', 'C.0289', 60),
('CS222_TH.N01', 'Xử lý ngôn ngữ tự nhiên nâng cao (Thực hành)', 'CS222_TH', 'TS. Đặng Xuân An', 'Thứ 3, Tiết 4-5', 'C.0290', 30),
('CS223.N01', 'Máy học nâng cao', 'CS223', 'ThS. Bùi Xuân An', 'Thứ 4, Tiết 6-8', 'C.0291', 60),
('CS223_TH.N01', 'Máy học nâng cao (Thực hành)', 'CS223_TH', 'PGS.TS Đỗ Xuân An', 'Thứ 5, Tiết 8-10', 'C.0292', 30),
('CS224.N01', 'Máy học xử lý ngôn ngữ tự nhiên', 'CS224', 'ThS. Hồ Xuân An', 'Thứ 6, Tiết 1-3', 'C.0293', 60),
('CS224_TH.N01', 'Máy học xử lý ngôn ngữ tự nhiên (Thực hành)', 'CS224_TH', 'TS. Ngô Xuân An', 'Thứ 7, Tiết 4-5', 'C.0294', 30),
('CS225.N01', 'Lập trình symbolic trong trí tuệ nhân tạo', 'CS225', 'ThS. Dương Xuân An', 'Thứ 2, Tiết 6-8', 'C.0295', 60),
('CS226.N01', 'Ngôn ngữ học máy tính', 'CS226', 'PGS.TS Lý Xuân An', 'Thứ 3, Tiết 8-10', 'C.0296', 60),
('CS227.N01', 'Khai thác dữ liệu và ứng dụng', 'CS227', 'ThS. Mai Xuân An', 'Thứ 4, Tiết 1-3', 'C.0297', 60),
('CS227_TH.N01', 'Khai thác dữ liệu và ứng dụng (Thực hành)', 'CS227_TH', 'TS. Tạ Xuân An', 'Thứ 5, Tiết 4-5', 'C.0298', 30),
('CS228.N01', 'Máy học và ứng dụng', 'CS228', 'ThS. Đinh Xuân An', 'Thứ 6, Tiết 6-8', 'C.0299', 60),
('CS228_TH.N01', 'Máy học và ứng dụng (Thực hành)', 'CS228_TH', 'PGS.TS Cao Xuân An', 'Thứ 7, Tiết 8-10', 'C.0300', 30),
('CS229.N01', 'Ngữ nghĩa học tính toán', 'CS229', 'ThS. Nguyễn Nhật An', 'Thứ 2, Tiết 1-3', 'C.0301', 60),
('CS229_TH.N01', 'Ngữ nghĩa học tính toán (Thực hành)', 'CS229_TH', 'TS. Trần Nhật An', 'Thứ 3, Tiết 4-5', 'C.0302', 30),
('CS231.N01', 'Nhập môn Thị giác máy tính', 'CS231', 'ThS. Lê Nhật An', 'Thứ 4, Tiết 6-8', 'C.0303', 60),
('CS231_TH.N01', 'Nhập môn Thị giác máy tính (Thực hành)', 'CS231_TH', 'PGS.TS Phạm Nhật An', 'Thứ 5, Tiết 8-10', 'C.0304', 30),
('CS232.N01', 'Tính toán đa phương tiện', 'CS232', 'ThS. Hoàng Nhật An', 'Thứ 6, Tiết 1-3', 'C.0305', 60),
('CS232_TH.N01', 'Tính toán đa phương tiện (Thực hành)', 'CS232_TH', 'TS. Huỳnh Nhật An', 'Thứ 7, Tiết 4-5', 'C.0306', 30),
('CS233.N01', 'Nhận dạng Thị giác', 'CS233', 'ThS. Phan Nhật An', 'Thứ 2, Tiết 6-8', 'C.0307', 60),
('CS233_TH.N01', 'Nhận dạng Thị giác (Thực hành)', 'CS233_TH', 'PGS.TS Vũ Nhật An', 'Thứ 3, Tiết 8-10', 'C.0308', 30),
('CS2433.N01', 'Lập trình C/C++', 'CS2433', 'ThS. Võ Nhật An', 'Thứ 4, Tiết 1-3', 'I.0309', 60),
('CS2433_TH.N01', 'Lập trình C/C++ (Thực hành)', 'CS2433_TH', 'TS. Đặng Nhật An', 'Thứ 5, Tiết 4-5', 'I.0310', 30),
('CS301.N01', 'Chuyên đề nghiên cứu "KHOA" học', 'CS301', 'ThS. Bùi Nhật An', 'Thứ 6, Tiết 6-8', 'C.0311', 60),
('CS302.N01', 'Seminar', 'CS302', 'PGS.TS Đỗ Nhật An', 'Thứ 7, Tiết 8-10', 'C.0312', 60),
('CS311.N01', 'Kỹ thuật lập trình trí tuệ nhân tạo', 'CS311', 'ThS. Hồ Nhật An', 'Thứ 2, Tiết 1-3', 'C.0313', 60),
('CS311_TH.N01', 'Kỹ thuật lập trình trí tuệ nhân tạo (Thực hành)', 'CS311_TH', 'TS. Ngô Nhật An', 'Thứ 3, Tiết 4-5', 'C.0314', 30),
('CS312.N01', 'Hệ thống đa tác tử', 'CS312', 'ThS. Dương Nhật An', 'Thứ 4, Tiết 6-8', 'C.0315', 60),
('CS312_TH.N01', 'Hệ thống đa tác tử (Thực hành)', 'CS312_TH', 'PGS.TS Lý Nhật An', 'Thứ 5, Tiết 8-10', 'C.0316', 30),
('CS313.N01', 'Khai thác dữ liệu và ứng dụng', 'CS313', 'ThS. Mai Nhật An', 'Thứ 6, Tiết 1-3', 'C.0317', 60),
('CS314.N01', 'Lập trình symbolic trong trí tuệ nhân tạo', 'CS314', 'TS. Tạ Nhật An', 'Thứ 7, Tiết 4-5', 'C.0318', 60),
('CS314_TH.N01', 'Lập trình symbolic trong trí tuệ nhân tạo (Thực hành)', 'CS314_TH', 'ThS. Đinh Nhật An', 'Thứ 2, Tiết 6-8', 'C.0319', 30),
('CS315.N01', 'Máy học nâng cao', 'CS315', 'PGS.TS Cao Nhật An', 'Thứ 3, Tiết 8-10', 'C.0320', 60),
('CS315_TH.N01', 'Máy học nâng cao (Thực hành)', 'CS315_TH', 'ThS. Nguyễn Trọng An', 'Thứ 4, Tiết 1-3', 'C.0321', 30),
('CS316.N01', 'Các hệ giải bài toán thông minh', 'CS316', 'TS. Trần Trọng An', 'Thứ 5, Tiết 4-5', 'C.0322', 60),
('CS316_TH.N01', 'Các hệ giải bài toán thông minh (Thực hành)', 'CS316_TH', 'ThS. Lê Trọng An', 'Thứ 6, Tiết 6-8', 'C.0323', 30),
('CS317.N01', 'Phát triển và vận hành hệ thống máy học', 'CS317', 'PGS.TS Phạm Trọng An', 'Thứ 7, Tiết 8-10', 'C.0324', 60),
('CS317_TH.N01', 'Phát triển và vận hành hệ thống máy học (Thực hành)', 'CS317_TH', 'ThS. Hoàng Trọng An', 'Thứ 2, Tiết 1-3', 'C.0325', 30),
('CS321.N01', 'Ngôn ngữ học ngữ liệu', 'CS321', 'TS. Huỳnh Trọng An', 'Thứ 3, Tiết 4-5', 'C.0326', 60),
('CS321_TH.N01', 'Ngôn ngữ học ngữ liệu (Thực hành)', 'CS321_TH', 'ThS. Phan Trọng An', 'Thứ 4, Tiết 6-8', 'C.0327', 30),
('CS322.N01', 'Biểu diễn tri thức và ứng dụng', 'CS322', 'PGS.TS Vũ Trọng An', 'Thứ 5, Tiết 8-10', 'C.0328', 60),
('CS323.N01', 'Các hệ thống hỏi-đáp', 'CS323', 'ThS. Võ Trọng An', 'Thứ 6, Tiết 1-3', 'C.0329', 60),
('CS323_TH.N01', 'Các hệ thống hỏi-đáp (Thực hành)', 'CS323_TH', 'TS. Đặng Trọng An', 'Thứ 7, Tiết 4-5', 'C.0330', 30),
('CS324.N01', 'Máy học trong xử lý ngôn ngữ tự nhiên', 'CS324', 'ThS. Bùi Trọng An', 'Thứ 2, Tiết 6-8', 'C.0331', 60),
('CS324_TH.N01', 'Máy học trong xử lý ngôn ngữ tự nhiên (Thực hành)', 'CS324_TH', 'PGS.TS Đỗ Trọng An', 'Thứ 3, Tiết 8-10', 'C.0332', 30),
('CS325.N01', 'Dịch máy', 'CS325', 'ThS. Hồ Trọng An', 'Thứ 4, Tiết 1-3', 'C.0333', 60),
('CS325_TH.N01', 'Dịch máy (Thực hành)', 'CS325_TH', 'TS. Ngô Trọng An', 'Thứ 5, Tiết 4-5', 'C.0334', 30),
('CS326.N01', 'Các kĩ thuật trong xử lý ngôn ngữ tự nhiên', 'CS326', 'ThS. Dương Trọng An', 'Thứ 6, Tiết 6-8', 'C.0335', 60),
('CS326_TH.N01', 'Các kĩ thuật trong xử lý ngôn ngữ tự nhiên (Thực hành)', 'CS326_TH', 'PGS.TS Lý Trọng An', 'Thứ 7, Tiết 8-10', 'C.0336', 30),
('CS331.N01', 'Thị giác máy tính nâng cao', 'CS331', 'ThS. Mai Trọng An', 'Thứ 2, Tiết 1-3', 'C.0337', 60),
('CS331_TH.N01', 'Thị giác máy tính nâng cao (Thực hành)', 'CS331_TH', 'TS. Tạ Trọng An', 'Thứ 3, Tiết 4-5', 'C.0338', 30),
('CS332.N01', 'Máy học trong Thị giác Máy tính', 'CS332', 'ThS. Đinh Trọng An', 'Thứ 4, Tiết 6-8', 'C.0339', 60),
('CS332_TH.N01', 'Máy học trong Thị giác Máy tính (Thực hành)', 'CS332_TH', 'PGS.TS Cao Trọng An', 'Thứ 5, Tiết 8-10', 'C.0340', 30),
('CS333.N01', 'Đồ họa game', 'CS333', 'ThS. Nguyễn Phúc An', 'Thứ 6, Tiết 1-3', 'C.0341', 60),
('CS333_TH.N01', 'Đồ họa game (Thực hành)', 'CS333_TH', 'TS. Trần Phúc An', 'Thứ 7, Tiết 4-5', 'C.0342', 30),
('CS334.N01', 'Lập trình tính toán hình thức', 'CS334', 'ThS. Lê Phúc An', 'Thứ 2, Tiết 6-8', 'C.0343', 60),
('CS334_TH.N01', 'Lập trình tính toán hình thức (Thực hành)', 'CS334_TH', 'PGS.TS Phạm Phúc An', 'Thứ 3, Tiết 8-10', 'C.0344', 30),
('CS335.N01', 'Tìm Kiếm Ảnh và Video', 'CS335', 'ThS. Hoàng Phúc An', 'Thứ 4, Tiết 1-3', 'C.0345', 60),
('CS335_TH.N01', 'Tìm Kiếm Ảnh và Video (Thực hành)', 'CS335_TH', 'TS. Huỳnh Phúc An', 'Thứ 5, Tiết 4-5', 'C.0346', 30),
('CS336.N01', 'Truy vấn thông tin đa phương tiện', 'CS336', 'ThS. Phan Phúc An', 'Thứ 6, Tiết 6-8', 'C.0347', 60),
('CS336_TH.N01', 'Truy vấn thông tin đa phương tiện (Thực hành)', 'CS336_TH', 'PGS.TS Vũ Phúc An', 'Thứ 7, Tiết 8-10', 'C.0348', 30),
('CS3363.N01', 'Tổ chức ngôn ngữ lập trình', 'CS3363', 'ThS. Võ Phúc An', 'Thứ 2, Tiết 1-3', 'I.0349', 60),
('CS3363_TH.N01', 'Tổ chức ngôn ngữ lập trình (Thực hành)', 'CS3363_TH', 'TS. Đặng Phúc An', 'Thứ 3, Tiết 4-5', 'I.0350', 30),
('CS337.N01', 'Xử lý âm thanh và tiếng nói', 'CS337', 'ThS. Bùi Phúc An', 'Thứ 4, Tiết 6-8', 'C.0351', 60),
('CS337_TH.N01', 'Xử lý âm thanh và tiếng nói (Thực hành)', 'CS337_TH', 'PGS.TS Đỗ Phúc An', 'Thứ 5, Tiết 8-10', 'C.0352', 30),
('CS3373.N01', 'Lập trình hướng đối tượng nâng cao cho môi trường windows', 'CS3373', 'ThS. Hồ Phúc An', 'Thứ 6, Tiết 1-3', 'I.0353', 60),
('CS3373_TH.N01', 'Lập trình hướng đối tượng nâng cao cho môi trường windows (Thực hành)', 'CS3373_TH', 'TS. Ngô Phúc An', 'Thứ 7, Tiết 4-5', 'I.0354', 30),
('CS338.N01', 'Nhận dạng', 'CS338', 'ThS. Dương Phúc An', 'Thứ 2, Tiết 6-8', 'C.0355', 60),
('CS338_TH.N01', 'Nhận dạng (Thực hành)', 'CS338_TH', 'PGS.TS Lý Phúc An', 'Thứ 3, Tiết 8-10', 'C.0356', 30),
('CS339.N01', 'Xử lý văn bản Y "KHOA"', 'CS339', 'ThS. Mai Phúc An', 'Thứ 4, Tiết 1-3', 'C.0357', 60),
('CS339_TH.N01', 'Xử lý văn bản Y "KHOA" (Thực hành)', 'CS339_TH', 'TS. Tạ Phúc An', 'Thứ 5, Tiết 4-5', 'C.0358', 30),
('CS3423.N01', 'Cấu trúc tập tin', 'CS3423', 'ThS. Đinh Phúc An', 'Thứ 6, Tiết 6-8', 'I.0359', 60),
('CS3423_TH.N01', 'Cấu trúc tập tin (Thực hành)', 'CS3423_TH', 'PGS.TS Cao Phúc An', 'Thứ 7, Tiết 8-10', 'I.0360', 30),
('CS3443.N01', 'Hệ thống máy tính', 'CS3443', 'ThS. Nguyễn Đình An', 'Thứ 2, Tiết 1-3', 'I.0361', 60),
('CS351.N01', 'Chuyên đề NCKH 1', 'CS351', 'TS. Trần Đình An', 'Thứ 3, Tiết 4-5', 'C.0362', 60),
('CS3513.N01', 'Phương pháp số cho máy tính kỹ thuật số', 'CS3513', 'ThS. Lê Đình An', 'Thứ 4, Tiết 6-8', 'I.0363', 60),
('CS352.N01', 'Chuyên đề NCKH 2', 'CS352', 'PGS.TS Phạm Đình An', 'Thứ 5, Tiết 8-10', 'C.0364', 60),
('CS3613.N01', 'Cơ sở tính toán', 'CS3613', 'ThS. Hoàng Đình An', 'Thứ 6, Tiết 1-3', 'I.0365', 60),
('CS3613_TH.N01', 'Cơ sở tính toán (Thực hành)', 'CS3613_TH', 'TS. Huỳnh Đình An', 'Thứ 7, Tiết 4-5', 'I.0366', 30),
('CS3653.N01', 'Toán rời rạc cho máy tính', 'CS3653', 'ThS. Phan Đình An', 'Thứ 2, Tiết 6-8', 'I.0367', 60),
('CS371.N01', 'Seminar chuyên đề 1', 'CS371', 'PGS.TS Vũ Đình An', 'Thứ 3, Tiết 8-10', 'C.0368', 60),
('CS372.N01', 'Seminar chuyên đề 2', 'CS372', 'ThS. Võ Đình An', 'Thứ 4, Tiết 1-3', 'C.0369', 60),
('CS401.N01', 'Công nghệ Java', 'CS401', 'TS. Đặng Đình An', 'Thứ 5, Tiết 4-5', 'C.0370', 60),
('CS401_TH.N01', 'Công nghệ Java (Thực hành)', 'CS401_TH', 'ThS. Bùi Đình An', 'Thứ 6, Tiết 6-8', 'C.0371', 30),
('CS402.N01', 'Phân tích thiết kế HTTT quản lý', 'CS402', 'PGS.TS Đỗ Đình An', 'Thứ 7, Tiết 8-10', 'C.0372', 60),
('CS403.N01', 'Các dịch vụ web', 'CS403', 'ThS. Hồ Đình An', 'Thứ 2, Tiết 1-3', 'C.0373', 60),
('CS404.N01', 'Công nghệ đa tác tử (Muli-Agent)', 'CS404', 'TS. Ngô Đình An', 'Thứ 3, Tiết 4-5', 'C.0374', 60),
('CS405.N01', 'Logic mờ và ứng dụng', 'CS405', 'ThS. Dương Đình An', 'Thứ 4, Tiết 6-8', 'C.0375', 60),
('CS405_TH.N01', 'Logic mờ và ứng dụng (Thực hành)', 'CS405_TH', 'PGS.TS Lý Đình An', 'Thứ 5, Tiết 8-10', 'C.0376', 30),
('CS406.N01', 'Xử lý ảnh và ứng dụng', 'CS406', 'ThS. Mai Đình An', 'Thứ 6, Tiết 1-3', 'C.0377', 60),
('CS406_TH.N01', 'Xử lý ảnh và ứng dụng (Thực hành)', 'CS406_TH', 'TS. Tạ Đình An', 'Thứ 7, Tiết 4-5', 'C.0378', 30),
('CS407.N01', 'Các kỹ thuật trong xử lý NNTN', 'CS407', 'ThS. Đinh Đình An', 'Thứ 2, Tiết 6-8', 'C.0379', 60),
('CS408.N01', 'Các hệ giải toán thông minh', 'CS408', 'PGS.TS Cao Đình An', 'Thứ 3, Tiết 8-10', 'C.0380', 60),
('CS409.N01', 'Hệ suy diễn mờ', 'CS409', 'ThS. Nguyễn Hồng An', 'Thứ 4, Tiết 1-3', 'C.0381', 60),
('CS409_TH.N01', 'Hệ suy diễn mờ (Thực hành)', 'CS409_TH', 'TS. Trần Hồng An', 'Thứ 5, Tiết 4-5', 'C.0382', 30),
('CS410.N01', 'Mạng neural và thuật giải di truyền', 'CS410', 'ThS. Lê Hồng An', 'Thứ 6, Tiết 6-8', 'C.0383', 60),
('CS410_TH.N01', 'Mạng neural và thuật giải di truyền (Thực hành)', 'CS410_TH', 'PGS.TS Phạm Hồng An', 'Thứ 7, Tiết 8-10', 'C.0384', 30),
('CS411.N01', 'Dịch máy', 'CS411', 'ThS. Hoàng Hồng An', 'Thứ 2, Tiết 1-3', 'C.0385', 60),
('CS412.N01', 'Web ngữ nghĩa', 'CS412', 'TS. Huỳnh Hồng An', 'Thứ 3, Tiết 4-5', 'C.0386', 60),
('CS412_TH.N01', 'Web ngữ nghĩa (Thực hành)', 'CS412_TH', 'ThS. Phan Hồng An', 'Thứ 4, Tiết 6-8', 'C.0387', 30),
('CS414.N01', 'Lý thuyết automat và ứng dụng', 'CS414', 'PGS.TS Vũ Hồng An', 'Thứ 5, Tiết 8-10', 'C.0388', 60),
('CS414_TH.N01', 'Lý thuyết automat và ứng dụng (Thực hành)', 'CS414_TH', 'ThS. Võ Hồng An', 'Thứ 6, Tiết 1-3', 'C.0389', 30),
('CS4143.N01', 'Đồ họa máy tính', 'CS4143', 'TS. Đặng Hồng An', 'Thứ 7, Tiết 4-5', 'I.0390', 60),
('CS415.N01', 'Mã hóa thông tin', 'CS415', 'ThS. Bùi Hồng An', 'Thứ 2, Tiết 6-8', 'C.0391', 60),
('CS415_TH.N01', 'Mã hóa thông tin (Thực hành)', 'CS415_TH', 'PGS.TS Đỗ Hồng An', 'Thứ 3, Tiết 8-10', 'C.0392', 30),
('CS4153.N01', 'Phát triển ứng dụng trên di động', 'CS4153', 'ThS. Hồ Hồng An', 'Thứ 4, Tiết 1-3', 'I.0393', 60),
('CS417.N01', 'Nhận dạng', 'CS417', 'TS. Ngô Hồng An', 'Thứ 5, Tiết 4-5', 'C.0394', 60),
('CS417_TH.N01', 'Nhận dạng (Thực hành)', 'CS417_TH', 'ThS. Dương Hồng An', 'Thứ 6, Tiết 6-8', 'C.0395', 30),
('CS418.N01', 'Trực quan máy tính', 'CS418', 'PGS.TS Lý Hồng An', 'Thứ 7, Tiết 8-10', 'C.0396', 60),
('CS418_TH.N01', 'Trực quan máy tính (Thực hành)', 'CS418_TH', 'ThS. Mai Hồng An', 'Thứ 2, Tiết 1-3', 'C.0397', 30),
('CS419.N01', 'Truy xuất thông tin', 'CS419', 'TS. Tạ Hồng An', 'Thứ 3, Tiết 4-5', 'C.0398', 60),
('CS419_TH.N01', 'Truy xuất thông tin (Thực hành)', 'CS419_TH', 'ThS. Đinh Hồng An', 'Thứ 4, Tiết 6-8', 'C.0399', 30),
('CS420.N01', 'Các vấn đề chọn lọc trong Thị giác máy tính', 'CS420', 'PGS.TS Cao Hồng An', 'Thứ 5, Tiết 8-10', 'C.0400', 60),
('CS420_TH.N01', 'Các vấn đề chọn lọc trong Thị giác máy tính (Thực hành)', 'CS420_TH', 'ThS. Nguyễn Minh Bình', 'Thứ 6, Tiết 1-3', 'C.0401', 30),
('CS421.N01', 'Khai thác dữ liệu đa phương tiện', 'CS421', 'TS. Trần Minh Bình', 'Thứ 7, Tiết 4-5', 'C.0402', 60),
('CS421_TH.N01', 'Khai thác dữ liệu đa phương tiện (Thực hành)', 'CS421_TH', 'ThS. Lê Minh Bình', 'Thứ 2, Tiết 6-8', 'C.0403', 30),
('CS4243.N01', 'Thuật toán và tiến trình trong an toàn máy tính', 'CS4243', 'PGS.TS Phạm Minh Bình', 'Thứ 3, Tiết 8-10', 'I.0404', 60),
('CS4273.N01', 'Nhập môn Công nghệ phần mềm', 'CS4273', 'ThS. Hoàng Minh Bình', 'Thứ 4, Tiết 1-3', 'I.0405', 60),
('CS4273_TH.N01', 'Nhập môn Công nghệ phần mềm (Thực hành)', 'CS4273_TH', 'TS. Huỳnh Minh Bình', 'Thứ 5, Tiết 4-5', 'I.0406', 30),
('CS4283.N01', 'Mạng máy tính', 'CS4283', 'ThS. Phan Minh Bình', 'Thứ 6, Tiết 6-8', 'I.0407', 60),
('CS431.N01', 'Các kĩ thuật học sâu và ứng dụng', 'CS431', 'PGS.TS Vũ Minh Bình', 'Thứ 7, Tiết 8-10', 'C.0408', 60),
('CS4323.N01', 'Hệ điều hành', 'CS4323', 'ThS. Võ Minh Bình', 'Thứ 2, Tiết 1-3', 'I.0409', 60),
('CS4343.N01', 'Cấu trúc dữ liệu và giải thuật', 'CS4343', 'TS. Đặng Minh Bình', 'Thứ 3, Tiết 4-5', 'I.0410', 60),
('CS4343_TH.N01', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'CS4343_TH', 'ThS. Bùi Minh Bình', 'Thứ 4, Tiết 6-8', 'I.0411', 30),
('CS4344.N01', 'An ninh mạng', 'CS4344', 'PGS.TS Đỗ Minh Bình', 'Thứ 5, Tiết 8-10', 'I.0412', 60),
('CS4793.N01', 'Trí tuệ nhân tạo', 'CS4793', 'ThS. Hồ Minh Bình', 'Thứ 6, Tiết 1-3', 'I.0413', 60),
('CS4793_TH.N01', 'Trí tuệ nhân tạo (Thực hành)', 'CS4793_TH', 'TS. Ngô Minh Bình', 'Thứ 7, Tiết 4-5', 'I.0414', 30),
('CS4883.N01', 'Các vấn đề xã hội trong tính toán', 'CS4883', 'ThS. Dương Minh Bình', 'Thứ 2, Tiết 6-8', 'I.0415', 60),
('CS5000.N01', 'Luận văn', 'CS5000', 'PGS.TS Lý Minh Bình', 'Thứ 3, Tiết 8-10', 'I.0416', 60),
('CS501.N01', 'Khóa luận tốt nghiệp', 'CS501', 'ThS. Mai Minh Bình', 'Thứ 4, Tiết 1-3', 'C.0417', 60),
('CS502.N01', 'Các công nghệ web và ứng dụng', 'CS502', 'TS. Tạ Minh Bình', 'Thứ 5, Tiết 4-5', 'C.0418', 60),
('CS503.N01', 'Môn tốt nghiệp KHMT 2', 'CS503', 'ThS. Đinh Minh Bình', 'Thứ 6, Tiết 6-8', 'C.0419', 60),
('CS5030.N01', 'Thực tập tốt nghiệp', 'CS5030', 'PGS.TS Cao Minh Bình', 'Thứ 7, Tiết 8-10', 'I.0420', 60),
('CS5031.N01', 'Thực tập doanh nghiệp', 'CS5031', 'ThS. Nguyễn Hoàng Bình', 'Thứ 2, Tiết 1-3', 'I.0421', 60),
('CS504.N01', 'Công nghệ .NET', 'CS504', 'TS. Trần Hoàng Bình', 'Thứ 3, Tiết 4-5', 'C.0422', 60),
('CS504_TH.N01', 'Công nghệ .NET (Thực hành)', 'CS504_TH', 'ThS. Lê Hoàng Bình', 'Thứ 4, Tiết 6-8', 'C.0423', 30),
('CS505.N01', 'Khoá luận tốt nghiệp', 'CS505', 'PGS.TS Phạm Hoàng Bình', 'Thứ 5, Tiết 8-10', 'C.0424', 60),
('CS506.N01', 'Chuyên đề J2EE', 'CS506', 'ThS. Hoàng Hoàng Bình', 'Thứ 6, Tiết 1-3', 'C.0425', 60),
('CS506_TH.N01', 'Chuyên đề J2EE (Thực hành)', 'CS506_TH', 'TS. Huỳnh Hoàng Bình', 'Thứ 7, Tiết 4-5', 'C.0426', 30),
('CS507.N01', 'Hệ điều hành Linux', 'CS507', 'ThS. Phan Hoàng Bình', 'Thứ 2, Tiết 6-8', 'C.0427', 60),
('CS507_TH.N01', 'Hệ điều hành Linux (Thực hành)', 'CS507_TH', 'PGS.TS Vũ Hoàng Bình', 'Thứ 3, Tiết 8-10', 'C.0428', 30),
('CS508.N01', 'Lập trình cơ sở dữ liệu', 'CS508', 'ThS. Võ Hoàng Bình', 'Thứ 4, Tiết 1-3', 'C.0429', 60),
('CS508_TH.N01', 'Lập trình cơ sở dữ liệu (Thực hành)', 'CS508_TH', 'TS. Đặng Hoàng Bình', 'Thứ 5, Tiết 4-5', 'C.0430', 30),
('CS510.N01', 'Lý thuyết thông tin', 'CS510', 'ThS. Bùi Hoàng Bình', 'Thứ 6, Tiết 6-8', 'C.0431', 60),
('CS511.N01', 'Ngôn ngữ lập trình C#', 'CS511', 'PGS.TS Đỗ Hoàng Bình', 'Thứ 7, Tiết 8-10', 'C.0432', 60),
('CS513.N01', 'Ngôn ngữ lập trình Java', 'CS513', 'ThS. Hồ Hoàng Bình', 'Thứ 2, Tiết 1-3', 'C.0433', 60),
('CS513_TH.N01', 'Ngôn ngữ lập trình Java (Thực hành)', 'CS513_TH', 'TS. Ngô Hoàng Bình', 'Thứ 3, Tiết 4-5', 'C.0434', 30),
('CS515.N01', 'Phân tích thiết kế hệ thống thông tin', 'CS515', 'ThS. Dương Hoàng Bình', 'Thứ 4, Tiết 6-8', 'C.0435', 60),
('CS515_TH.N01', 'Phân tích thiết kế hệ thống thông tin (Thực hành)', 'CS515_TH', 'PGS.TS Lý Hoàng Bình', 'Thứ 5, Tiết 8-10', 'C.0436', 30),
('CS516.N01', 'Phân tích thiết kế hướng đối tượng với UML', 'CS516', 'ThS. Mai Hoàng Bình', 'Thứ 6, Tiết 1-3', 'C.0437', 60),
('CS516_TH.N01', 'Phân tích thiết kế hướng đối tượng với UML (Thực hành)', 'CS516_TH', 'TS. Tạ Hoàng Bình', 'Thứ 7, Tiết 4-5', 'C.0438', 30),
('CS517.N01', 'Quản lý dự án', 'CS517', 'ThS. Đinh Hoàng Bình', 'Thứ 2, Tiết 6-8', 'C.0439', 60),
('CS518.N01', 'Xây dựng phần mềm hướng đối tượng', 'CS518', 'PGS.TS Cao Hoàng Bình', 'Thứ 3, Tiết 8-10', 'C.0440', 60),
('CS518_TH.N01', 'Xây dựng phần mềm hướng đối tượng (Thực hành)', 'CS518_TH', 'ThS. Nguyễn Thanh Bình', 'Thứ 4, Tiết 1-3', 'C.0441', 30),
('CS519.N01', 'Phương pháp luận nghiên cứu "KHOA" học', 'CS519', 'TS. Trần Thanh Bình', 'Thứ 5, Tiết 4-5', 'C.0442', 60),
('CS521.N01', 'Toán rời rạc nâng cao', 'CS521', 'ThS. Lê Thanh Bình', 'Thứ 6, Tiết 6-8', 'C.0443', 60),
('CS522.N01', 'Đại số máy tính', 'CS522', 'PGS.TS Phạm Thanh Bình', 'Thứ 7, Tiết 8-10', 'C.0444', 60),
('CS523.N01', 'Cấu trúc dữ liệu và giải thuật nâng cao', 'CS523', 'ThS. Hoàng Thanh Bình', 'Thứ 2, Tiết 1-3', 'C.0445', 60),
('CS524.N01', 'Một số ứng dụng của xử lý ngôn ngữ tự nhiên', 'CS524', 'TS. Huỳnh Thanh Bình', 'Thứ 3, Tiết 4-5', 'C.0446', 60),
('CS524_TH.N01', 'Một số ứng dụng của xử lý ngôn ngữ tự nhiên (Thực hành)', 'CS524_TH', 'ThS. Phan Thanh Bình', 'Thứ 4, Tiết 6-8', 'C.0447', 30),
('CS525.N01', 'Thị giác máy tính trong tương tác người – máy', 'CS525', 'PGS.TS Vũ Thanh Bình', 'Thứ 5, Tiết 8-10', 'C.0448', 60),
('CS525_TH.N01', 'Thị giác máy tính trong tương tác người – máy (Thực hành)', 'CS525_TH', 'ThS. Võ Thanh Bình', 'Thứ 6, Tiết 1-3', 'C.0449', 30),
('CS526.N01', 'Phát triển ứng dụng đa phương tiện trên thiết bị di động', 'CS526', 'TS. Đặng Thanh Bình', 'Thứ 7, Tiết 4-5', 'C.0450', 60),
('CS527.N01', 'Thực tại ảo', 'CS527', 'ThS. Bùi Thanh Bình', 'Thứ 2, Tiết 6-8', 'C.0451', 60),
('CS527_TH.N01', 'Thực tại ảo (Thực hành)', 'CS527_TH', 'PGS.TS Đỗ Thanh Bình', 'Thứ 3, Tiết 8-10', 'C.0452', 30),
('CS528.N01', 'Trực quan hóa thông tin', 'CS528', 'ThS. Hồ Thanh Bình', 'Thứ 4, Tiết 1-3', 'C.0453', 60),
('CS528_TH.N01', 'Trực quan hóa thông tin (Thực hành)', 'CS528_TH', 'TS. Ngô Thanh Bình', 'Thứ 5, Tiết 4-5', 'C.0454', 30),
('CS529.N01', 'Các vấn đề nghiên cứu và ứng dụng trong "KHOA" học máy tính', 'CS529', 'ThS. Dương Thanh Bình', 'Thứ 6, Tiết 6-8', 'C.0455', 60),
('CS530.N01', 'Đồ án chuyên ngành', 'CS530', 'PGS.TS Lý Thanh Bình', 'Thứ 7, Tiết 8-10', 'C.0456', 60),
('CS531.N01', 'Đồ họa trong video game', 'CS531', 'ThS. Mai Thanh Bình', 'Thứ 2, Tiết 1-3', 'C.0457', 60),
('CS531_TH.N01', 'Đồ họa trong video game (Thực hành)', 'CS531_TH', 'TS. Tạ Thanh Bình', 'Thứ 3, Tiết 4-5', 'C.0458', 30),
('CS532.N01', 'Thị giác máy tính trong tương tác người-máy', 'CS532', 'ThS. Đinh Thanh Bình', 'Thứ 4, Tiết 6-8', 'C.0459', 60),
('CS532_TH.N01', 'Thị giác máy tính trong tương tác người-máy (Thực hành)', 'CS532_TH', 'PGS.TS Cao Thanh Bình', 'Thứ 5, Tiết 8-10', 'C.0460', 30),
('CS534.N01', 'Lập trình Javascript và ứng dụng', 'CS534', 'ThS. Nguyễn Quang Bình', 'Thứ 6, Tiết 1-3', 'C.0461', 60),
('CS534_TH.N01', 'Lập trình Javascript và ứng dụng (Thực hành)', 'CS534_TH', 'TS. Trần Quang Bình', 'Thứ 7, Tiết 4-5', 'C.0462', 30),
('CS535.N01', 'Tổng hợp tiếng nói', 'CS535', 'ThS. Lê Quang Bình', 'Thứ 2, Tiết 6-8', 'C.0463', 60),
('CS5423.N01', 'Nguyên lý các hệ cơ sở dữ liệu', 'CS5423', 'PGS.TS Phạm Quang Bình', 'Thứ 3, Tiết 8-10', 'I.0464', 60),
('CS5423_TH.N01', 'Nguyên lý các hệ cơ sở dữ liệu (Thực hành)', 'CS5423_TH', 'ThS. Hoàng Quang Bình', 'Thứ 4, Tiết 1-3', 'I.0465', 30),
('CS5433.N01', 'Các hệ cơ sở dữ liệu phân tán', 'CS5433', 'TS. Huỳnh Quang Bình', 'Thứ 5, Tiết 4-5', 'I.0466', 60),
('CS551.N01', 'Thực tập', 'CS551', 'ThS. Phan Quang Bình', 'Thứ 6, Tiết 6-8', 'C.0467', 60),
('CS553.N01', 'Đồ án tốt nghiệp', 'CS553', 'PGS.TS Vũ Quang Bình', 'Thứ 7, Tiết 8-10', 'C.0468', 60),
('CS554.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'CS554', 'ThS. Võ Quang Bình', 'Thứ 2, Tiết 1-3', 'C.0469', 60),
('CSBU001.N01', 'Lập trình', 'CSBU001', 'TS. Đặng Quang Bình', 'Thứ 3, Tiết 4-5', 'C.0470', 60),
('CSBU001_TH.N01', 'Lập trình (Thực hành)', 'CSBU001_TH', 'ThS. Bùi Quang Bình', 'Thứ 4, Tiết 6-8', 'C.0471', 30),
('CSBU002.N01', 'Mạng máy tính', 'CSBU002', 'PGS.TS Đỗ Quang Bình', 'Thứ 5, Tiết 8-10', 'C.0472', 60),
('CSBU002_TH.N01', 'Mạng máy tính (Thực hành)', 'CSBU002_TH', 'ThS. Hồ Quang Bình', 'Thứ 6, Tiết 1-3', 'C.0473', 30),
('CSBU003.N01', 'Thực hành nghề nghiệp', 'CSBU003', 'TS. Ngô Quang Bình', 'Thứ 7, Tiết 4-5', 'C.0474', 60),
('CSBU004.N01', 'Toán cho Tin học', 'CSBU004', 'ThS. Dương Quang Bình', 'Thứ 2, Tiết 6-8', 'C.0475', 60),
('CSBU004_TH.N01', 'Toán cho Tin học (Thực hành)', 'CSBU004_TH', 'PGS.TS Lý Quang Bình', 'Thứ 3, Tiết 8-10', 'C.0476', 30),
('CSBU005.N01', 'Bảo mật', 'CSBU005', 'ThS. Mai Quang Bình', 'Thứ 4, Tiết 1-3', 'C.0477', 60),
('CSBU005_TH.N01', 'Bảo mật (Thực hành)', 'CSBU005_TH', 'TS. Tạ Quang Bình', 'Thứ 5, Tiết 4-5', 'C.0478', 30),
('CSBU006.N01', 'Quản lý dự án máy tính thành công', 'CSBU006', 'ThS. Đinh Quang Bình', 'Thứ 6, Tiết 6-8', 'C.0479', 60),
('CSBU007.N01', 'Thiết kế và phát triển cơ sở dữ liệu', 'CSBU007', 'PGS.TS Cao Quang Bình', 'Thứ 7, Tiết 8-10', 'C.0480', 60),
('CSBU007_TH.N01', 'Thiết kế và phát triển cơ sở dữ liệu (Thực hành)', 'CSBU007_TH', 'ThS. Nguyễn Hữu Bình', 'Thứ 2, Tiết 1-3', 'C.0481', 30),
('CSBU008.N01', 'Kiến trúc máy tính', 'CSBU008', 'TS. Trần Hữu Bình', 'Thứ 3, Tiết 4-5', 'C.0482', 60),
('CSBU008_TH.N01', 'Kiến trúc máy tính (Thực hành)', 'CSBU008_TH', 'ThS. Lê Hữu Bình', 'Thứ 4, Tiết 6-8', 'C.0483', 30),
('CSBU009.N01', 'Dự án nghiên cứu', 'CSBU009', 'PGS.TS Phạm Hữu Bình', 'Thứ 5, Tiết 8-10', 'C.0484', 60),
('CSBU009_TH.N01', 'Dự án nghiên cứu (Thực hành)', 'CSBU009_TH', 'ThS. Hoàng Hữu Bình', 'Thứ 6, Tiết 1-3', 'C.0485', 30),
('CSBU010.N01', 'Công nghệ kinh doanh thông minh', 'CSBU010', 'TS. Huỳnh Hữu Bình', 'Thứ 7, Tiết 4-5', 'C.0486', 60),
('CSBU010_TH.N01', 'Công nghệ kinh doanh thông minh (Thực hành)', 'CSBU010_TH', 'ThS. Phan Hữu Bình', 'Thứ 2, Tiết 6-8', 'C.0487', 30),
('CSBU011.N01', 'Toán rời rạc', 'CSBU011', 'PGS.TS Vũ Hữu Bình', 'Thứ 3, Tiết 8-10', 'C.0488', 60),
('CSBU012.N01', 'Cấu trúc dữ liệu và giải thuật', 'CSBU012', 'ThS. Võ Hữu Bình', 'Thứ 4, Tiết 1-3', 'C.0489', 60),
('CSBU012_TH.N01', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'CSBU012_TH', 'TS. Đặng Hữu Bình', 'Thứ 5, Tiết 4-5', 'C.0490', 30),
('CSBU013.N01', 'Lập trình nâng cao', 'CSBU013', 'ThS. Bùi Hữu Bình', 'Thứ 6, Tiết 6-8', 'C.0491', 60),
('CSBU013_TH.N01', 'Lập trình nâng cao (Thực hành)', 'CSBU013_TH', 'PGS.TS Đỗ Hữu Bình', 'Thứ 7, Tiết 8-10', 'C.0492', 30),
('CSBU014.N01', 'Máy học', 'CSBU014', 'ThS. Hồ Hữu Bình', 'Thứ 2, Tiết 1-3', 'C.0493', 60),
('CSBU014_TH.N01', 'Máy học (Thực hành)', 'CSBU014_TH', 'TS. Ngô Hữu Bình', 'Thứ 3, Tiết 4-5', 'C.0494', 30),
('CSBU015.N01', 'Điện toán đám mây', 'CSBU015', 'ThS. Dương Hữu Bình', 'Thứ 4, Tiết 6-8', 'C.0495', 60),
('CSBU015_TH.N01', 'Điện toán đám mây (Thực hành)', 'CSBU015_TH', 'PGS.TS Lý Hữu Bình', 'Thứ 5, Tiết 8-10', 'C.0496', 30),
('CSBU016.N01', 'Thực tập', 'CSBU016', 'ThS. Mai Hữu Bình', 'Thứ 6, Tiết 1-3', 'C.0497', 60),
('CSBU101.N01', 'Lập trình máy tính', 'CSBU101', 'TS. Tạ Hữu Bình', 'Thứ 7, Tiết 4-5', 'C.0498', 60),
('CSBU101_TH.N01', 'Lập trình máy tính (Thực hành)', 'CSBU101_TH', 'ThS. Đinh Hữu Bình', 'Thứ 2, Tiết 6-8', 'C.0499', 30),
('CSBU102.N01', 'Hệ thống máy tính', 'CSBU102', 'PGS.TS Cao Hữu Bình', 'Thứ 3, Tiết 8-10', 'C.0500', 60),
('CSBU102_TH.N01', 'Hệ thống máy tính (Thực hành)', 'CSBU102_TH', 'ThS. Nguyễn Gia Bình', 'Thứ 4, Tiết 1-3', 'C.0501', 30),
('CSBU103.N01', 'Phát triển và thiết kế web', 'CSBU103', 'TS. Trần Gia Bình', 'Thứ 5, Tiết 4-5', 'C.0502', 60),
('CSBU103_TH.N01', 'Phát triển và thiết kế web (Thực hành)', 'CSBU103_TH', 'ThS. Lê Gia Bình', 'Thứ 6, Tiết 6-8', 'C.0503', 30),
('CSBU104.N01', 'Cấu trúc dữ liệu và giải thuật', 'CSBU104', 'PGS.TS Phạm Gia Bình', 'Thứ 7, Tiết 8-10', 'C.0504', 60),
('CSBU104_TH.N01', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'CSBU104_TH', 'ThS. Hoàng Gia Bình', 'Thứ 2, Tiết 1-3', 'C.0505', 30),
('CSBU105.N01', 'Mạng máy tính căn bản', 'CSBU105', 'TS. Huỳnh Gia Bình', 'Thứ 3, Tiết 4-5', 'C.0506', 60),
('CSBU105_TH.N01', 'Mạng máy tính căn bản (Thực hành)', 'CSBU105_TH', 'ThS. Phan Gia Bình', 'Thứ 4, Tiết 6-8', 'C.0507', 30),
('CSBU106.N01', 'Đồ án đổi mới sáng tạo', 'CSBU106', 'PGS.TS Vũ Gia Bình', 'Thứ 5, Tiết 8-10', 'C.0508', 60),
('CSBU106_TH.N01', 'Đồ án đổi mới sáng tạo (Thực hành)', 'CSBU106_TH', 'ThS. Võ Gia Bình', 'Thứ 6, Tiết 1-3', 'C.0509', 30),
('CSBU107.N01', 'Lập trình hướng đối tượng', 'CSBU107', 'TS. Đặng Gia Bình', 'Thứ 7, Tiết 4-5', 'C.0510', 60),
('CSBU107_TH.N01', 'Lập trình hướng đối tượng (Thực hành)', 'CSBU107_TH', 'ThS. Bùi Gia Bình', 'Thứ 2, Tiết 6-8', 'C.0511', 30),
('CSBU108.N01', 'Hệ điều hành', 'CSBU108', 'PGS.TS Đỗ Gia Bình', 'Thứ 3, Tiết 8-10', 'C.0512', 60),
('CSBU108_TH.N01', 'Hệ điều hành (Thực hành)', 'CSBU108_TH', 'ThS. Hồ Gia Bình', 'Thứ 4, Tiết 1-3', 'C.0513', 30),
('CSBU109.N01', 'Phát triển ứng dụng web và cơ sở dữ liệu', 'CSBU109', 'TS. Ngô Gia Bình', 'Thứ 5, Tiết 4-5', 'C.0514', 60),
('CSBU109_TH.N01', 'Phát triển ứng dụng web và cơ sở dữ liệu (Thực hành)', 'CSBU109_TH', 'ThS. Dương Gia Bình', 'Thứ 6, Tiết 6-8', 'C.0515', 30),
('CSBU110.N01', 'Toán rời rạc và Lập trình khai báo', 'CSBU110', 'PGS.TS Lý Gia Bình', 'Thứ 7, Tiết 8-10', 'C.0516', 60),
('CSBU110_TH.N01', 'Toán rời rạc và Lập trình khai báo (Thực hành)', 'CSBU110_TH', 'ThS. Mai Gia Bình', 'Thứ 2, Tiết 1-3', 'C.0517', 30),
('CSBU111.N01', 'An ninh mạng', 'CSBU111', 'TS. Tạ Gia Bình', 'Thứ 3, Tiết 4-5', 'C.0518', 60),
('CSBU111_TH.N01', 'An ninh mạng (Thực hành)', 'CSBU111_TH', 'ThS. Đinh Gia Bình', 'Thứ 4, Tiết 6-8', 'C.0519', 30),
('CSBU112.N01', 'Thiết kế phần mềm', 'CSBU112', 'PGS.TS Cao Gia Bình', 'Thứ 5, Tiết 8-10', 'C.0520', 60),
('CSBU112_TH.N01', 'Thiết kế phần mềm (Thực hành)', 'CSBU112_TH', 'ThS. Nguyễn Khánh Bình', 'Thứ 6, Tiết 1-3', 'C.0521', 30),
('CSBU201.N01', 'Thiết kế trải nghiệm người dùng', 'CSBU201', 'TS. Trần Khánh Bình', 'Thứ 7, Tiết 4-5', 'C.0522', 60),
('CSBU201_TH.N01', 'Thiết kế trải nghiệm người dùng (Thực hành)', 'CSBU201_TH', 'ThS. Lê Khánh Bình', 'Thứ 2, Tiết 6-8', 'C.0523', 30),
('CSBU202.N01', 'Phát triển ứng dụng cho thiết bị di động và thiết bị đeo', 'CSBU202', 'PGS.TS Phạm Khánh Bình', 'Thứ 3, Tiết 8-10', 'C.0524', 60),
('CSBU202_TH.N01', 'Phát triển ứng dụng cho thiết bị di động và thiết bị đeo (Thực hành)', 'CSBU202_TH', 'ThS. Hoàng Khánh Bình', 'Thứ 4, Tiết 1-3', 'C.0525', 30),
('CSBU203.N01', 'Điện toán đám mây', 'CSBU203', 'TS. Huỳnh Khánh Bình', 'Thứ 5, Tiết 4-5', 'C.0526', 60),
('CSBU203_TH.N01', 'Điện toán đám mây (Thực hành)', 'CSBU203_TH', 'ThS. Phan Khánh Bình', 'Thứ 6, Tiết 6-8', 'C.0527', 30),
('CSBU204.N01', 'Trí tuệ nhân tạo và Máy học', 'CSBU204', 'PGS.TS Vũ Khánh Bình', 'Thứ 7, Tiết 8-10', 'C.0528', 60),
('CSBU204_TH.N01', 'Trí tuệ nhân tạo và Máy học (Thực hành)', 'CSBU204_TH', 'ThS. Võ Khánh Bình', 'Thứ 2, Tiết 1-3', 'C.0529', 30),
('CSBU205.N01', 'Dự án cá nhân', 'CSBU205', 'TS. Đặng Khánh Bình', 'Thứ 3, Tiết 4-5', 'C.0530', 60),
('CSBU205_TH.N01', 'Dự án cá nhân (Thực hành)', 'CSBU205_TH', 'ThS. Bùi Khánh Bình', 'Thứ 4, Tiết 6-8', 'C.0531', 30),
('CSC01.N01', 'Tin học đại cương', 'CSC01', 'PGS.TS Đỗ Khánh Bình', 'Thứ 5, Tiết 8-10', 'C.0532', 60),
('CSC01_TH.N01', 'Tin học đại cương (Thực hành)', 'CSC01_TH', 'ThS. Hồ Khánh Bình', 'Thứ 6, Tiết 1-3', 'C.0533', 30),
('CSC11.N01', 'Khoa học máy tính I', 'CSC11', 'TS. Ngô Khánh Bình', 'Thứ 7, Tiết 4-5', 'C.0534', 60),
('CSC12.N01', 'Khoa học máy tính II', 'CSC12', 'ThS. Dương Khánh Bình', 'Thứ 2, Tiết 6-8', 'C.0535', 60),
('CSC21.N01', 'Tin học đại cương (TE)', 'CSC21', 'PGS.TS Lý Khánh Bình', 'Thứ 3, Tiết 8-10', 'C.0536', 60),
('CSKI1.N01', 'Kỹ năng truyền thông làm việc nhóm', 'CSKI1', 'ThS. Mai Khánh Bình', 'Thứ 4, Tiết 1-3', 'C.0537', 60),
('CU001.N01', 'Văn hóa doanh nghiệp Nhật', 'CU001', 'TS. Tạ Khánh Bình', 'Thứ 5, Tiết 4-5', 'D.0538', 60),
('DAI015.N01', 'Thực hành văn bản Tiếng Việt', 'DAI015', 'ThS. Đinh Khánh Bình', 'Thứ 6, Tiết 6-8', 'B.0539', 60),
('DBSS1.N01', 'Cơ sở dữ liệu', 'DBSS1', 'PGS.TS Cao Khánh Bình', 'Thứ 7, Tiết 8-10', 'B.0540', 60),
('DBSS1_TH.N01', 'Cơ sở dữ liệu (Thực hành)', 'DBSS1_TH', 'ThS. Nguyễn Tuấn Bình', 'Thứ 2, Tiết 1-3', 'B.0541', 30),
('DS005.N01', 'Giới thiệu ngành Khoa học Dữ liệu', 'DS005', 'TS. Trần Tuấn Bình', 'Thứ 3, Tiết 4-5', 'D.0542', 60),
('DS101.N01', 'Thống kê và xác suất chuyên sâu', 'DS101', 'ThS. Lê Tuấn Bình', 'Thứ 4, Tiết 6-8', 'D.0543', 60),
('DS102.N01', 'Học máy thống kê', 'DS102', 'PGS.TS Phạm Tuấn Bình', 'Thứ 5, Tiết 8-10', 'D.0544', 60),
('DS102_TH.N01', 'Học máy thống kê (Thực hành)', 'DS102_TH', 'ThS. Hoàng Tuấn Bình', 'Thứ 6, Tiết 1-3', 'D.0545', 30),
('DS103.N01', 'Thu thập và tiền xử lý dữ liệu', 'DS103', 'TS. Huỳnh Tuấn Bình', 'Thứ 7, Tiết 4-5', 'D.0546', 60),
('DS103_TH.N01', 'Thu thập và tiền xử lý dữ liệu (Thực hành)', 'DS103_TH', 'ThS. Phan Tuấn Bình', 'Thứ 2, Tiết 6-8', 'D.0547', 30),
('DS104.N01', 'Tính toán song song & phân tán', 'DS104', 'PGS.TS Vũ Tuấn Bình', 'Thứ 3, Tiết 8-10', 'D.0548', 60),
('DS104_TH.N01', 'Tính toán song song & phân tán (Thực hành)', 'DS104_TH', 'ThS. Võ Tuấn Bình', 'Thứ 4, Tiết 1-3', 'D.0549', 30),
('DS105.N01', 'Phân tích và trực quan dữ liệu', 'DS105', 'TS. Đặng Tuấn Bình', 'Thứ 5, Tiết 4-5', 'D.0550', 60),
('DS106.N01', 'Tối ưu hóa và ứng dụng', 'DS106', 'ThS. Bùi Tuấn Bình', 'Thứ 6, Tiết 6-8', 'D.0551', 60),
('DS106_TH.N01', 'Tối ưu hóa và ứng dụng (Thực hành)', 'DS106_TH', 'PGS.TS Đỗ Tuấn Bình', 'Thứ 7, Tiết 8-10', 'D.0552', 30),
('DS107.N01', 'Tư duy tính toán cho Khoa học dữ liệu', 'DS107', 'ThS. Hồ Tuấn Bình', 'Thứ 2, Tiết 1-3', 'D.0553', 60),
('DS107_TH.N01', 'Tư duy tính toán cho Khoa học dữ liệu (Thực hành)', 'DS107_TH', 'TS. Ngô Tuấn Bình', 'Thứ 3, Tiết 4-5', 'D.0554', 30),
('DS108.N01', 'Tiền xử lý và xây dựng bộ dữ liệu', 'DS108', 'ThS. Dương Tuấn Bình', 'Thứ 4, Tiết 6-8', 'D.0555', 60),
('DS111.N01', 'Phân tích dữ liệu', 'DS111', 'PGS.TS Lý Tuấn Bình', 'Thứ 5, Tiết 8-10', 'D.0556', 60),
('DS200.N01', 'Phân tích dữ liệu lớn', 'DS200', 'ThS. Mai Tuấn Bình', 'Thứ 6, Tiết 1-3', 'D.0557', 60),
('DS200_TH.N01', 'Phân tích dữ liệu lớn (Thực hành)', 'DS200_TH', 'TS. Tạ Tuấn Bình', 'Thứ 7, Tiết 4-5', 'D.0558', 30),
('DS201.N01', 'Deep Learning trong "KHOA" học dữ liệu', 'DS201', 'ThS. Đinh Tuấn Bình', 'Thứ 2, Tiết 6-8', 'D.0559', 60),
('DS201_TH.N01', 'Deep Learning trong "KHOA" học dữ liệu (Thực hành)', 'DS201_TH', 'PGS.TS Cao Tuấn Bình', 'Thứ 3, Tiết 8-10', 'D.0560', 30),
('DS202.N01', 'Đồ án "KHOA" học dữ liệu và ứng dụng 1', 'DS202', 'ThS. Nguyễn Ngọc Bình', 'Thứ 4, Tiết 1-3', 'D.0561', 30),
('DS203.N01', 'Đồ án "KHOA" học dữ liệu và ứng dụng 2', 'DS203', 'TS. Trần Ngọc Bình', 'Thứ 5, Tiết 4-5', 'D.0562', 30),
('DS204.N01', 'Đồ án "KHOA" học dữ liệu và ứng dụng', 'DS204', 'ThS. Lê Ngọc Bình', 'Thứ 6, Tiết 6-8', 'D.0563', 30),
('DS207.N01', 'Đồ án', 'DS207', 'PGS.TS Phạm Ngọc Bình', 'Thứ 7, Tiết 8-10', 'D.0564', 30),
('DS300.N01', 'Hệ khuyến nghị', 'DS300', 'ThS. Hoàng Ngọc Bình', 'Thứ 2, Tiết 1-3', 'D.0565', 60),
('DS300_TH.N01', 'Hệ khuyến nghị (Thực hành)', 'DS300_TH', 'TS. Huỳnh Ngọc Bình', 'Thứ 3, Tiết 4-5', 'D.0566', 30),
('DS301.N01', 'Các giải thuật khai phá dữ liệu lớn', 'DS301', 'ThS. Phan Ngọc Bình', 'Thứ 4, Tiết 6-8', 'D.0567', 60),
('DS301_TH.N01', 'Các giải thuật khai phá dữ liệu lớn (Thực hành)', 'DS301_TH', 'PGS.TS Vũ Ngọc Bình', 'Thứ 5, Tiết 8-10', 'D.0568', 30),
('DS302.N01', 'Phân tích thống kê đa biến', 'DS302', 'ThS. Võ Ngọc Bình', 'Thứ 6, Tiết 1-3', 'D.0569', 60),
('DS302_TH.N01', 'Phân tích thống kê đa biến (Thực hành)', 'DS302_TH', 'TS. Đặng Ngọc Bình', 'Thứ 7, Tiết 4-5', 'D.0570', 30),
('DS303.N01', 'Thống kê Bayes', 'DS303', 'ThS. Bùi Ngọc Bình', 'Thứ 2, Tiết 6-8', 'D.0571', 60),
('DS303_TH.N01', 'Thống kê Bayes (Thực hành)', 'DS303_TH', 'PGS.TS Đỗ Ngọc Bình', 'Thứ 3, Tiết 8-10', 'D.0572', 30),
('DS304.N01', 'Thiết kế và phân tích thực nghiệm', 'DS304', 'ThS. Hồ Ngọc Bình', 'Thứ 4, Tiết 1-3', 'D.0573', 60),
('DS305.N01', 'Phân tích dữ liệu chuỗi thời gian và ứng dụng', 'DS305', 'TS. Ngô Ngọc Bình', 'Thứ 5, Tiết 4-5', 'D.0574', 60),
('DS305_TH.N01', 'Phân tích dữ liệu chuỗi thời gian và ứng dụng (Thực hành)', 'DS305_TH', 'ThS. Dương Ngọc Bình', 'Thứ 6, Tiết 6-8', 'D.0575', 30),
('DS306.N01', 'Phân tích dữ liệu lớn trong tài chính', 'DS306', 'PGS.TS Lý Ngọc Bình', 'Thứ 7, Tiết 8-10', 'D.0576', 60),
('DS307.N01', 'Phân tích dữ liệu truyền thông xã hội', 'DS307', 'ThS. Mai Ngọc Bình', 'Thứ 2, Tiết 1-3', 'D.0577', 60),
('DS308.N01', 'Mô hình đồ thị xác suất', 'DS308', 'TS. Tạ Ngọc Bình', 'Thứ 3, Tiết 4-5', 'D.0578', 60),
('DS308_TH.N01', 'Mô hình đồ thị xác suất (Thực hành)', 'DS308_TH', 'ThS. Đinh Ngọc Bình', 'Thứ 4, Tiết 6-8', 'D.0579', 30),
('DS309.N01', 'Thực tập doanh nghiệp', 'DS309', 'PGS.TS Cao Ngọc Bình', 'Thứ 5, Tiết 8-10', 'D.0580', 60),
('DS310.N01', 'Xử lý ngôn ngữ tự nhiên cho Khoa học dữ liệu', 'DS310', 'ThS. Nguyễn Bảo Bình', 'Thứ 6, Tiết 1-3', 'D.0581', 60),
('DS310_TH.N01', 'Xử lý ngôn ngữ tự nhiên cho Khoa học dữ liệu (Thực hành)', 'DS310_TH', 'TS. Trần Bảo Bình', 'Thứ 7, Tiết 4-5', 'D.0582', 30),
('DS311.N01', 'Kỹ năng nghiên cứu và viết bài báo "KHOA" học', 'DS311', 'ThS. Lê Bảo Bình', 'Thứ 2, Tiết 6-8', 'D.0583', 60),
('DS312.N01', 'Xử lý ảnh y "KHOA"', 'DS312', 'PGS.TS Phạm Bảo Bình', 'Thứ 3, Tiết 8-10', 'D.0584', 60),
('DS313.N01', 'Xử lý thông tin giọng nói', 'DS313', 'ThS. Hoàng Bảo Bình', 'Thứ 4, Tiết 1-3', 'D.0585', 60),
('DS313_TH.N01', 'Xử lý thông tin giọng nói (Thực hành)', 'DS313_TH', 'TS. Huỳnh Bảo Bình', 'Thứ 5, Tiết 4-5', 'D.0586', 30),
('DS314.N01', 'Rút trích và truy vấn thông tin', 'DS314', 'ThS. Phan Bảo Bình', 'Thứ 6, Tiết 6-8', 'D.0587', 60),
('DS314_TH.N01', 'Rút trích và truy vấn thông tin (Thực hành)', 'DS314_TH', 'PGS.TS Vũ Bảo Bình', 'Thứ 7, Tiết 8-10', 'D.0588', 30),
('DS315.N01', 'Phân tích Kho dữ liệu', 'DS315', 'ThS. Võ Bảo Bình', 'Thứ 2, Tiết 1-3', 'D.0589', 60),
('DS315_TH.N01', 'Phân tích Kho dữ liệu (Thực hành)', 'DS315_TH', 'TS. Đặng Bảo Bình', 'Thứ 3, Tiết 4-5', 'D.0590', 30),
('DS316.N01', 'Xây dựng ứng dụng thông minh', 'DS316', 'ThS. Bùi Bảo Bình', 'Thứ 4, Tiết 6-8', 'D.0591', 60),
('DS316_TH.N01', 'Xây dựng ứng dụng thông minh (Thực hành)', 'DS316_TH', 'PGS.TS Đỗ Bảo Bình', 'Thứ 5, Tiết 8-10', 'D.0592', 30),
('DS317.N01', 'Khai phá dữ liệu trong doanh nghiệp', 'DS317', 'ThS. Hồ Bảo Bình', 'Thứ 6, Tiết 1-3', 'D.0593', 60),
('DS318.N01', 'Đạo đức trong Trí tuệ nhân tạo và Khoa học dữ liệu', 'DS318', 'TS. Ngô Bảo Bình', 'Thứ 7, Tiết 4-5', 'D.0594', 60),
('DS319.N01', 'Mô hình ngôn ngữ lớn', 'DS319', 'ThS. Dương Bảo Bình', 'Thứ 2, Tiết 6-8', 'D.0595', 60),
('DS320.N01', 'Học đa thể thức', 'DS320', 'PGS.TS Lý Bảo Bình', 'Thứ 3, Tiết 8-10', 'D.0596', 60),
('DS321.N01', 'Khoa học dữ liệu cho An toàn thông tin', 'DS321', 'ThS. Mai Bảo Bình', 'Thứ 4, Tiết 1-3', 'D.0597', 60),
('DS321_TH.N01', 'Khoa học dữ liệu cho An toàn thông tin (Thực hành)', 'DS321_TH', 'TS. Tạ Bảo Bình', 'Thứ 5, Tiết 4-5', 'D.0598', 30),
('DS322.N01', 'Thiết kế hệ thống Học máy', 'DS322', 'ThS. Đinh Bảo Bình', 'Thứ 6, Tiết 6-8', 'D.0599', 60),
('DS322_TH.N01', 'Thiết kế hệ thống Học máy (Thực hành)', 'DS322_TH', 'PGS.TS Cao Bảo Bình', 'Thứ 7, Tiết 8-10', 'D.0600', 30),
('DS323.N01', 'Viết báo cáo kỹ thuật và thuyết trình', 'DS323', 'ThS. Nguyễn Đức Bình', 'Thứ 2, Tiết 1-3', 'D.0601', 60),
('DS324.N01', 'Khai thác dữ liệu ảnh số', 'DS324', 'TS. Trần Đức Bình', 'Thứ 3, Tiết 4-5', 'D.0602', 60),
('DS325.N01', 'Thiết kế ứng dụng với dữ liệu chuyên sâu', 'DS325', 'ThS. Lê Đức Bình', 'Thứ 4, Tiết 6-8', 'D.0603', 60),
('DS325_TH.N01', 'Thiết kế ứng dụng với dữ liệu chuyên sâu (Thực hành)', 'DS325_TH', 'PGS.TS Phạm Đức Bình', 'Thứ 5, Tiết 8-10', 'D.0604', 30),
('DS326.N01', 'Khai phá dữ liệu đa phương tiện và ứng dụng', 'DS326', 'ThS. Hoàng Đức Bình', 'Thứ 6, Tiết 1-3', 'D.0605', 60),
('DS327.N01', 'Các mô hình nền tảng', 'DS327', 'TS. Huỳnh Đức Bình', 'Thứ 7, Tiết 4-5', 'D.0606', 60),
('DS400.N01', 'Chuyên đề tốt nghiệp Khoa học dữ liệu', 'DS400', 'ThS. Phan Đức Bình', 'Thứ 2, Tiết 6-8', 'D.0607', 60),
('DS501.N01', 'Đồ án tốt nghiệp', 'DS501', 'PGS.TS Vũ Đức Bình', 'Thứ 3, Tiết 8-10', 'D.0608', 60),
('DS502.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'DS502', 'ThS. Võ Đức Bình', 'Thứ 4, Tiết 1-3', 'D.0609', 60),
('DS505.N01', 'Khóa luận tốt nghiệp', 'DS505', 'TS. Đặng Đức Bình', 'Thứ 5, Tiết 4-5', 'D.0610', 60),
('DSAL1.N01', 'Cấu trúc dữ liệu và giải thuật', 'DSAL1', 'ThS. Bùi Đức Bình', 'Thứ 6, Tiết 6-8', 'B.0611', 60),
('DSAL1_TH.N01', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'DSAL1_TH', 'PGS.TS Đỗ Đức Bình', 'Thứ 7, Tiết 8-10', 'B.0612', 30),
('DSAL2.N01', 'Cấu trúc dữ liệu & giải thuật nâng cao', 'DSAL2', 'ThS. Hồ Đức Bình', 'Thứ 2, Tiết 1-3', 'C.0613', 60),
('DSAL2_TH.N01', 'Cấu trúc dữ liệu & giải thuật nâng cao (Thực hành)', 'DSAL2_TH', 'TS. Ngô Đức Bình', 'Thứ 3, Tiết 4-5', 'C.0614', 30),
('DTH039.N01', 'Đô thị học đại cương', 'DTH039', 'ThS. Dương Đức Bình', 'Thứ 4, Tiết 6-8', 'B.0615', 60),
('EC001.N01', 'Kinh tế học đại cương', 'EC001', 'PGS.TS Lý Đức Bình', 'Thứ 5, Tiết 8-10', 'I.0616', 60),
('EC002.N01', 'Quản trị doanh nghiệp', 'EC002', 'ThS. Mai Đức Bình', 'Thứ 6, Tiết 1-3', 'I.0617', 60),
('EC003.N01', 'Tiếp thị căn bản', 'EC003', 'TS. Tạ Đức Bình', 'Thứ 7, Tiết 4-5', 'I.0618', 60),
('EC005.N01', 'Giới thiệu ngành Thương mại Điện tử', 'EC005', 'ThS. Đinh Đức Bình', 'Thứ 2, Tiết 6-8', 'I.0619', 60),
('EC101.N01', 'Marketing căn bản', 'EC101', 'PGS.TS Cao Đức Bình', 'Thứ 3, Tiết 8-10', 'I.0620', 60),
('EC201.N01', 'Phân tích thiết kế quy trình nghiệp vụ doanh nghiệp', 'EC201', 'ThS. Nguyễn Anh Bình', 'Thứ 4, Tiết 1-3', 'I.0621', 60),
('EC201_TH.N01', 'Phân tích thiết kế quy trình nghiệp vụ doanh nghiệp (Thực hành)', 'EC201_TH', 'TS. Trần Anh Bình', 'Thứ 5, Tiết 4-5', 'I.0622', 30),
('EC202.N01', 'Nhập môn quản trị chuỗi cung ứng', 'EC202', 'ThS. Lê Anh Bình', 'Thứ 6, Tiết 6-8', 'I.0623', 60),
('EC202_TH.N01', 'Nhập môn quản trị chuỗi cung ứng (Thực hành)', 'EC202_TH', 'PGS.TS Phạm Anh Bình', 'Thứ 7, Tiết 8-10', 'I.0624', 30),
('EC203.N01', 'Quản trị quan hệ khách hàng và nhà cung cấp', 'EC203', 'ThS. Hoàng Anh Bình', 'Thứ 2, Tiết 1-3', 'I.0625', 60),
('EC203_TH.N01', 'Quản trị quan hệ khách hàng và nhà cung cấp (Thực hành)', 'EC203_TH', 'TS. Huỳnh Anh Bình', 'Thứ 3, Tiết 4-5', 'I.0626', 30),
('EC204.N01', 'Marketing điện tử', 'EC204', 'ThS. Phan Anh Bình', 'Thứ 4, Tiết 6-8', 'I.0627', 60),
('EC204_TH.N01', 'Marketing điện tử (Thực hành)', 'EC204_TH', 'PGS.TS Vũ Anh Bình', 'Thứ 5, Tiết 8-10', 'I.0628', 30),
('EC208.N01', 'QuẢN trị dự án TMĐT', 'EC208', 'ThS. Võ Anh Bình', 'Thứ 6, Tiết 1-3', 'I.0629', 60),
('EC212.N01', 'Thực tập doanh nghiệp', 'EC212', 'TS. Đặng Anh Bình', 'Thứ 7, Tiết 4-5', 'I.0630', 60),
('EC213.N01', 'Quản trị quan hệ khách hàng và nhà cung cấp', 'EC213', 'ThS. Bùi Anh Bình', 'Thứ 2, Tiết 6-8', 'I.0631', 60),
('EC213_TH.N01', 'Quản trị quan hệ khách hàng và nhà cung cấp (Thực hành)', 'EC213_TH', 'PGS.TS Đỗ Anh Bình', 'Thứ 3, Tiết 8-10', 'I.0632', 30),
('EC214.N01', 'Nhập môn Quản trị chuỗi cung ứng', 'EC214', 'ThS. Hồ Anh Bình', 'Thứ 4, Tiết 1-3', 'I.0633', 60),
('EC219.N01', 'Pháp luật trong thương mại điện tử', 'EC219', 'TS. Ngô Anh Bình', 'Thứ 5, Tiết 4-5', 'I.0634', 60),
('EC222.N01', 'Thực tập doanh nghiệp', 'EC222', 'ThS. Dương Anh Bình', 'Thứ 6, Tiết 6-8', 'I.0635', 60),
('EC229.N01', 'Pháp luật trong thương mại điện tử', 'EC229', 'PGS.TS Lý Anh Bình', 'Thứ 7, Tiết 8-10', 'I.0636', 60),
('EC232.N01', 'Nguyên lý kế toán', 'EC232', 'ThS. Mai Anh Bình', 'Thứ 2, Tiết 1-3', 'I.0637', 60),
('EC301.N01', 'Tiếp thị trực tuyến (E-Marketing)', 'EC301', 'TS. Tạ Anh Bình', 'Thứ 3, Tiết 4-5', 'I.0638', 60),
('EC301_TH.N01', 'Tiếp thị trực tuyến (E-Marketing) (Thực hành)', 'EC301_TH', 'ThS. Đinh Anh Bình', 'Thứ 4, Tiết 6-8', 'I.0639', 30),
('EC302.N01', 'Thiết kế Hệ thống Thương mại điện tử', 'EC302', 'PGS.TS Cao Anh Bình', 'Thứ 5, Tiết 8-10', 'I.0640', 60),
('EC302_TH.N01', 'Thiết kế Hệ thống Thương mại điện tử (Thực hành)', 'EC302_TH', 'ThS. Nguyễn Kim Bình', 'Thứ 6, Tiết 1-3', 'I.0641', 30),
('EC304.N01', 'Tối ưu hóa công cụ tìm kiếm trong Thương mại điện tử', 'EC304', 'TS. Trần Kim Bình', 'Thứ 7, Tiết 4-5', 'I.0642', 60),
('EC311.N01', 'Tiếp thị trực tuyến', 'EC311', 'ThS. Lê Kim Bình', 'Thứ 2, Tiết 6-8', 'I.0643', 60),
('EC311_TH.N01', 'Tiếp thị trực tuyến (Thực hành)', 'EC311_TH', 'PGS.TS Phạm Kim Bình', 'Thứ 3, Tiết 8-10', 'I.0644', 30),
('EC312.N01', 'Thiết kế hệ thống thương mại điện tử', 'EC312', 'ThS. Hoàng Kim Bình', 'Thứ 4, Tiết 1-3', 'I.0645', 60),
('EC312_TH.N01', 'Thiết kế hệ thống thương mại điện tử (Thực hành)', 'EC312_TH', 'TS. Huỳnh Kim Bình', 'Thứ 5, Tiết 4-5', 'I.0646', 30),
('EC331.N01', 'Quản trị chiến lược kinh doanh điện tử', 'EC331', 'ThS. Phan Kim Bình', 'Thứ 6, Tiết 6-8', 'I.0647', 60),
('EC332.N01', 'Quản trị sản xuất', 'EC332', 'PGS.TS Vũ Kim Bình', 'Thứ 7, Tiết 8-10', 'I.0648', 60),
('EC333.N01', 'Quản trị tài chính doanh nghiệp', 'EC333', 'ThS. Võ Kim Bình', 'Thứ 2, Tiết 1-3', 'I.0649', 60),
('EC334.N01', 'Quản trị kênh phân phối', 'EC334', 'TS. Đặng Kim Bình', 'Thứ 3, Tiết 4-5', 'I.0650', 60),
('EC335.N01', 'An toàn và bảo mật thương mại điện tử', 'EC335', 'ThS. Bùi Kim Bình', 'Thứ 4, Tiết 6-8', 'I.0651', 60),
('EC336.N01', 'Quản trị nhân lực', 'EC336', 'PGS.TS Đỗ Kim Bình', 'Thứ 5, Tiết 8-10', 'I.0652', 60),
('EC337.N01', 'Hệ thống thanh toán trực tuyến', 'EC337', 'ThS. Hồ Kim Bình', 'Thứ 6, Tiết 1-3', 'I.0653', 60),
('EC338.N01', 'Quản trị bán hàng', 'EC338', 'TS. Ngô Kim Bình', 'Thứ 7, Tiết 4-5', 'I.0654', 60),
('EC401.N01', 'Khóa luận tốt nghiệp', 'EC401', 'ThS. Dương Kim Bình', 'Thứ 2, Tiết 6-8', 'I.0655', 60),
('EC402.N01', 'Phát triển ứng dụng thương mại di động', 'EC402', 'PGS.TS Lý Kim Bình', 'Thứ 3, Tiết 8-10', 'I.0656', 60),
('EC402_TH.N01', 'Phát triển ứng dụng thương mại di động (Thực hành)', 'EC402_TH', 'ThS. Mai Kim Bình', 'Thứ 4, Tiết 1-3', 'I.0657', 30),
('EC403.N01', 'Thương mại xã hội', 'EC403', 'TS. Tạ Kim Bình', 'Thứ 5, Tiết 4-5', 'I.0658', 60),
('EC404.N01', 'Đồ án tốt nghiệp', 'EC404', 'ThS. Đinh Kim Bình', 'Thứ 6, Tiết 6-8', 'I.0659', 60),
('EC405.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'EC405', 'PGS.TS Cao Kim Bình', 'Thứ 7, Tiết 8-10', 'I.0660', 60),
('ECE02.N01', 'Mạch số', 'ECE02', 'ThS. Nguyễn Mai Bình', 'Thứ 2, Tiết 1-3', 'B.0661', 60),
('ECE02_TH.N01', 'Mạch số (Thực hành)', 'ECE02_TH', 'TS. Trần Mai Bình', 'Thứ 3, Tiết 4-5', 'B.0662', 30),
('ECON3313.N01', 'Kinh tế tiền tệ', 'ECON3313', 'ThS. Lê Mai Bình', 'Thứ 4, Tiết 6-8', 'I.0663', 60),
('EN001.N01', 'Anh văn 1', 'EN001', 'PGS.TS Phạm Mai Bình', 'Thứ 5, Tiết 8-10', 'B.0664', 60),
('EN001.CO.N01', 'English for Communication 1', 'EN001.CO', 'ThS. Hoàng Mai Bình', 'Thứ 6, Tiết 1-3', 'I.0665', 60),
('EN001.GE.N01', 'General English', 'EN001.GE', 'TS. Huỳnh Mai Bình', 'Thứ 7, Tiết 4-5', 'I.0666', 60),
('EN002.N01', 'Anh văn 2', 'EN002', 'ThS. Phan Mai Bình', 'Thứ 2, Tiết 6-8', 'B.0667', 60),
('EN002.CO.N01', 'English for Communication 1', 'EN002.CO', 'PGS.TS Vũ Mai Bình', 'Thứ 3, Tiết 8-10', 'I.0668', 60),
('EN002.GE.N01', 'General English', 'EN002.GE', 'ThS. Võ Mai Bình', 'Thứ 4, Tiết 1-3', 'I.0669', 60),
('EN003.N01', 'Anh văn 3', 'EN003', 'TS. Đặng Mai Bình', 'Thứ 5, Tiết 4-5', 'B.0670', 60),
('EN004.N01', 'Anh văn 1', 'EN004', 'ThS. Bùi Mai Bình', 'Thứ 6, Tiết 6-8', 'B.0671', 60),
('EN005.N01', 'Anh văn 2', 'EN005', 'PGS.TS Đỗ Mai Bình', 'Thứ 7, Tiết 8-10', 'B.0672', 60),
('EN006.N01', 'Anh văn 3', 'EN006', 'ThS. Hồ Mai Bình', 'Thứ 2, Tiết 1-3', 'B.0673', 60),
('ENBT.N01', 'Anh văn Bổ túc', 'ENBT', 'TS. Ngô Mai Bình', 'Thứ 3, Tiết 4-5', 'B.0674', 60),
('ENG00.N01', 'Anh văn 0', 'ENG00', 'ThS. Dương Mai Bình', 'Thứ 4, Tiết 6-8', 'B.0675', 60),
('ENG01.N01', 'Anh văn 1', 'ENG01', 'PGS.TS Lý Mai Bình', 'Thứ 5, Tiết 8-10', 'B.0676', 60),
('ENG02.N01', 'Anh văn 2', 'ENG02', 'ThS. Mai Mai Bình', 'Thứ 6, Tiết 1-3', 'B.0677', 60),
('ENG03.N01', 'Anh văn 3', 'ENG03', 'TS. Tạ Mai Bình', 'Thứ 7, Tiết 4-5', 'B.0678', 60),
('ENG04.N01', 'Anh văn 4', 'ENG04', 'ThS. Đinh Mai Bình', 'Thứ 2, Tiết 6-8', 'B.0679', 60),
('ENG05.N01', 'Anh văn 5', 'ENG05', 'PGS.TS Cao Mai Bình', 'Thứ 3, Tiết 8-10', 'B.0680', 60),
('ENG06.N01', 'Kỹ năng thuyết trình tiếng Anh', 'ENG06', 'ThS. Nguyễn Xuân Bình', 'Thứ 4, Tiết 1-3', 'B.0681', 60),
('ENG07.N01', 'Kỹ Năng Viết Luận', 'ENG07', 'TS. Trần Xuân Bình', 'Thứ 5, Tiết 4-5', 'B.0682', 60),
('ENG11.N01', 'Tiếng anh tăng cường I', 'ENG11', 'ThS. Lê Xuân Bình', 'Thứ 6, Tiết 6-8', 'B.0683', 60),
('ENG12.N01', 'Tiếng anh tăng cường II', 'ENG12', 'PGS.TS Phạm Xuân Bình', 'Thứ 7, Tiết 8-10', 'B.0684', 60),
('ENG13.N01', 'Tiếng Anh I', 'ENG13', 'ThS. Hoàng Xuân Bình', 'Thứ 2, Tiết 1-3', 'B.0685', 60),
('ENG14.N01', 'Tiếng Anh II', 'ENG14', 'TS. Huỳnh Xuân Bình', 'Thứ 3, Tiết 4-5', 'B.0686', 60),
('ENG15.N01', 'Tiếng Anh chuyên ngành CNTT', 'ENG15', 'ThS. Phan Xuân Bình', 'Thứ 4, Tiết 6-8', 'B.0687', 60),
('ENGA1.N01', 'Anh văn sơ cấp 1', 'ENGA1', 'PGS.TS Vũ Xuân Bình', 'Thứ 5, Tiết 8-10', 'B.0688', 60),
('ENGA2.N01', 'Anh văn sơ cấp 2', 'ENGA2', 'ThS. Võ Xuân Bình', 'Thứ 6, Tiết 1-3', 'B.0689', 60),
('ENGBT.N01', 'Anh văn bổ túc', 'ENGBT', 'TS. Đặng Xuân Bình', 'Thứ 7, Tiết 4-5', 'B.0690', 60),
('ENGL1113.N01', 'Tiếng Anh I', 'ENGL1113', 'ThS. Bùi Xuân Bình', 'Thứ 2, Tiết 6-8', 'I.0691', 60),
('ENGL1213.N01', 'Tiếng Anh II', 'ENGL1213', 'PGS.TS Đỗ Xuân Bình', 'Thứ 3, Tiết 8-10', 'I.0692', 60),
('ENLS1.N01', 'Nâng cao kỹ năng nghe, nói tiếng Anh 1', 'ENLS1', 'ThS. Hồ Xuân Bình', 'Thứ 4, Tiết 1-3', 'B.0693', 60),
('ENLS2.N01', 'Nâng cao kỹ năng nghe, nói tiếng Anh 2', 'ENLS2', 'TS. Ngô Xuân Bình', 'Thứ 5, Tiết 4-5', 'B.0694', 60),
('ENRW1.N01', 'Nâng cao kỹ năng đọc, viết tiếng Anh 1', 'ENRW1', 'ThS. Dương Xuân Bình', 'Thứ 6, Tiết 6-8', 'B.0695', 60),
('ENRW2.N01', 'Nâng cao kỹ năng đọc, viết tiếng Anh 2', 'ENRW2', 'PGS.TS Lý Xuân Bình', 'Thứ 7, Tiết 8-10', 'B.0696', 60),
('GDH075.N01', 'Tâm lý học giao tiếp', 'GDH075', 'ThS. Mai Xuân Bình', 'Thứ 2, Tiết 1-3', 'B.0697', 60),
('GDH075_TH.N01', 'Tâm lý học giao tiếp (Thực hành)', 'GDH075_TH', 'TS. Tạ Xuân Bình', 'Thứ 3, Tiết 4-5', 'B.0698', 30),
('HCMT1.N01', 'Tư tưởng Hồ Chí Minh', 'HCMT1', 'ThS. Đinh Xuân Bình', 'Thứ 4, Tiết 6-8', 'B.0699', 60),
('IE005.N01', 'Giới thiệu ngành Công nghệ Thông tin', 'IE005', 'PGS.TS Cao Xuân Bình', 'Thứ 5, Tiết 8-10', 'D.0700', 60),
('IE101.N01', 'Cơ sở hạ tầng công nghệ thông tin', 'IE101', 'ThS. Nguyễn Nhật Bình', 'Thứ 6, Tiết 1-3', 'D.0701', 60),
('IE101_TH.N01', 'Cơ sở hạ tầng công nghệ thông tin (Thực hành)', 'IE101_TH', 'TS. Trần Nhật Bình', 'Thứ 7, Tiết 4-5', 'D.0702', 30),
('IE102.N01', 'Các công nghệ nền', 'IE102', 'ThS. Lê Nhật Bình', 'Thứ 2, Tiết 6-8', 'D.0703', 60),
('IE102_TH.N01', 'Các công nghệ nền (Thực hành)', 'IE102_TH', 'PGS.TS Phạm Nhật Bình', 'Thứ 3, Tiết 8-10', 'D.0704', 30),
('IE103.N01', 'Quản lý thông tin', 'IE103', 'ThS. Hoàng Nhật Bình', 'Thứ 4, Tiết 1-3', 'D.0705', 60),
('IE103_TH.N01', 'Quản lý thông tin (Thực hành)', 'IE103_TH', 'TS. Huỳnh Nhật Bình', 'Thứ 5, Tiết 4-5', 'D.0706', 30),
('IE104.N01', 'Internet và công nghệ Web', 'IE104', 'ThS. Phan Nhật Bình', 'Thứ 6, Tiết 6-8', 'D.0707', 60),
('IE105.N01', 'Nhập môn bảo đảm và an ninh thông tin', 'IE105', 'PGS.TS Vũ Nhật Bình', 'Thứ 7, Tiết 8-10', 'D.0708', 60),
('IE105_TH.N01', 'Nhập môn bảo đảm và an ninh thông tin (Thực hành)', 'IE105_TH', 'ThS. Võ Nhật Bình', 'Thứ 2, Tiết 1-3', 'D.0709', 30),
('IE106.N01', 'Thiết kế giao diện người dùng', 'IE106', 'TS. Đặng Nhật Bình', 'Thứ 3, Tiết 4-5', 'D.0710', 60),
('IE106_TH.N01', 'Thiết kế giao diện người dùng (Thực hành)', 'IE106_TH', 'ThS. Bùi Nhật Bình', 'Thứ 4, Tiết 6-8', 'D.0711', 30),
('IE107.N01', 'Thiết kế giao diện người dùng', 'IE107', 'PGS.TS Đỗ Nhật Bình', 'Thứ 5, Tiết 8-10', 'D.0712', 60),
('IE107_TH.N01', 'Thiết kế giao diện người dùng (Thực hành)', 'IE107_TH', 'ThS. Hồ Nhật Bình', 'Thứ 6, Tiết 1-3', 'D.0713', 30),
('IE108.N01', 'Phân tích thiết kế phần mềm', 'IE108', 'TS. Ngô Nhật Bình', 'Thứ 7, Tiết 4-5', 'D.0714', 60),
('IE108_TH.N01', 'Phân tích thiết kế phần mềm (Thực hành)', 'IE108_TH', 'ThS. Dương Nhật Bình', 'Thứ 2, Tiết 6-8', 'D.0715', 30),
('IE201.N01', 'Xử lý dữ liệu thống kê', 'IE201', 'PGS.TS Lý Nhật Bình', 'Thứ 3, Tiết 8-10', 'D.0716', 60),
('IE202.N01', 'Quản trị doanh nghiệp', 'IE202', 'ThS. Mai Nhật Bình', 'Thứ 4, Tiết 1-3', 'D.0717', 60),
('IE203.N01', 'Hệ thống quản trị qui trình nghiệp vụ', 'IE203', 'TS. Tạ Nhật Bình', 'Thứ 5, Tiết 4-5', 'D.0718', 60),
('IE204.N01', 'Tối ưu hóa công cụ tìm kiếm', 'IE204', 'ThS. Đinh Nhật Bình', 'Thứ 6, Tiết 6-8', 'D.0719', 60),
('IE204_TH.N01', 'Tối ưu hóa công cụ tìm kiếm (Thực hành)', 'IE204_TH', 'PGS.TS Cao Nhật Bình', 'Thứ 7, Tiết 8-10', 'D.0720', 30),
('IE205.N01', 'Xử lý ảnh vệ "TINH"', 'IE205', 'ThS. Nguyễn Trọng Bình', 'Thứ 2, Tiết 1-3', 'D.0721', 60),
('IE206.N01', 'Đồ án chuẩn bị tốt nghiệp', 'IE206', 'TS. Trần Trọng Bình', 'Thứ 3, Tiết 4-5', 'D.0722', 30),
('IE207.N01', 'Đồ án', 'IE207', 'ThS. Lê Trọng Bình', 'Thứ 4, Tiết 6-8', 'D.0723', 60),
('IE208.N01', 'Kiến trúc và tích hợp hệ thống', 'IE208', 'PGS.TS Phạm Trọng Bình', 'Thứ 5, Tiết 8-10', 'D.0724', 60),
('IE209.N01', 'Công nghệ Java', 'IE209', 'ThS. Hoàng Trọng Bình', 'Thứ 6, Tiết 1-3', 'D.0725', 60),
('IE209_TH.N01', 'Công nghệ Java (Thực hành)', 'IE209_TH', 'TS. Huỳnh Trọng Bình', 'Thứ 7, Tiết 4-5', 'D.0726', 30),
('IE210.N01', 'Hệ thống định vị toàn cầu (GPS)', 'IE210', 'ThS. Phan Trọng Bình', 'Thứ 2, Tiết 6-8', 'D.0727', 60),
('IE211.N01', 'Tin học môi trường', 'IE211', 'PGS.TS Vũ Trọng Bình', 'Thứ 3, Tiết 8-10', 'D.0728', 60),
('IE212.N01', 'Công nghệ Dữ liệu lớn', 'IE212', 'ThS. Võ Trọng Bình', 'Thứ 4, Tiết 1-3', 'D.0729', 60),
('IE212_TH.N01', 'Công nghệ Dữ liệu lớn (Thực hành)', 'IE212_TH', 'TS. Đặng Trọng Bình', 'Thứ 5, Tiết 4-5', 'D.0730', 30),
('IE213.N01', 'Kỹ thuật phát triển hệ thống Web', 'IE213', 'ThS. Bùi Trọng Bình', 'Thứ 6, Tiết 6-8', 'D.0731', 60),
('IE213_TH.N01', 'Kỹ thuật phát triển hệ thống Web (Thực hành)', 'IE213_TH', 'PGS.TS Đỗ Trọng Bình', 'Thứ 7, Tiết 8-10', 'D.0732', 30),
('IE216.N01', 'Các chủ đề toán học cho KHDL', 'IE216', 'ThS. Hồ Trọng Bình', 'Thứ 2, Tiết 1-3', 'D.0733', 60),
('IE217.N01', 'Máy học', 'IE217', 'TS. Ngô Trọng Bình', 'Thứ 3, Tiết 4-5', 'D.0734', 60),
('IE217_TH.N01', 'Máy học (Thực hành)', 'IE217_TH', 'ThS. Dương Trọng Bình', 'Thứ 4, Tiết 6-8', 'D.0735', 30),
('IE218.N01', 'Xử lý dữ liệu lớn', 'IE218', 'PGS.TS Lý Trọng Bình', 'Thứ 5, Tiết 8-10', 'D.0736', 60),
('IE218_TH.N01', 'Xử lý dữ liệu lớn (Thực hành)', 'IE218_TH', 'ThS. Mai Trọng Bình', 'Thứ 6, Tiết 1-3', 'D.0737', 30),
('IE221.N01', 'Kỹ thuật lập trình Python', 'IE221', 'TS. Tạ Trọng Bình', 'Thứ 7, Tiết 4-5', 'D.0738', 60),
('IE221_TH.N01', 'Kỹ thuật lập trình Python (Thực hành)', 'IE221_TH', 'ThS. Đinh Trọng Bình', 'Thứ 2, Tiết 6-8', 'D.0739', 30),
('IE222.N01', 'Phân tích dữ liệu bằng Python', 'IE222', 'PGS.TS Cao Trọng Bình', 'Thứ 3, Tiết 8-10', 'D.0740', 60),
('IE222_TH.N01', 'Phân tích dữ liệu bằng Python (Thực hành)', 'IE222_TH', 'ThS. Nguyễn Phúc Bình', 'Thứ 4, Tiết 1-3', 'D.0741', 30),
('IE223.N01', 'Phân tích dữ liệu bằng Python &R', 'IE223', 'TS. Trần Phúc Bình', 'Thứ 5, Tiết 4-5', 'D.0742', 60),
('IE223_TH.N01', 'Phân tích dữ liệu bằng Python &R (Thực hành)', 'IE223_TH', 'ThS. Lê Phúc Bình', 'Thứ 6, Tiết 6-8', 'D.0743', 30),
('IE224.N01', 'Phân tích dữ liệu', 'IE224', 'PGS.TS Phạm Phúc Bình', 'Thứ 7, Tiết 8-10', 'D.0744', 60),
('IE224_TH.N01', 'Phân tích dữ liệu (Thực hành)', 'IE224_TH', 'ThS. Hoàng Phúc Bình', 'Thứ 2, Tiết 1-3', 'D.0745', 30),
('IE225.N01', 'Mạng kết nối', 'IE225', 'TS. Huỳnh Phúc Bình', 'Thứ 3, Tiết 4-5', 'D.0746', 60),
('IE225_TH.N01', 'Mạng kết nối (Thực hành)', 'IE225_TH', 'ThS. Phan Phúc Bình', 'Thứ 4, Tiết 6-8', 'D.0747', 30),
('IE226.N01', 'Đồ họa và trực quan hóa máy tính', 'IE226', 'PGS.TS Vũ Phúc Bình', 'Thứ 5, Tiết 8-10', 'D.0748', 60),
('IE226_TH.N01', 'Đồ họa và trực quan hóa máy tính (Thực hành)', 'IE226_TH', 'ThS. Võ Phúc Bình', 'Thứ 6, Tiết 1-3', 'D.0749', 30),
('IE227.N01', 'Xử lý tín hiệu số cho mạng', 'IE227', 'TS. Đặng Phúc Bình', 'Thứ 7, Tiết 4-5', 'D.0750', 60),
('IE227_TH.N01', 'Xử lý tín hiệu số cho mạng (Thực hành)', 'IE227_TH', 'ThS. Bùi Phúc Bình', 'Thứ 2, Tiết 6-8', 'D.0751', 30),
('IE228.N01', 'Human-Computer Interaction', 'IE228', 'PGS.TS Đỗ Phúc Bình', 'Thứ 3, Tiết 8-10', 'D.0752', 60),
('IE228_TH.N01', 'Human-Computer Interaction (Thực hành)', 'IE228_TH', 'ThS. Hồ Phúc Bình', 'Thứ 4, Tiết 1-3', 'D.0753', 30),
('IE229.N01', 'Artificial Intelligence', 'IE229', 'TS. Ngô Phúc Bình', 'Thứ 5, Tiết 4-5', 'D.0754', 60),
('IE229_TH.N01', 'Artificial Intelligence (Thực hành)', 'IE229_TH', 'ThS. Dương Phúc Bình', 'Thứ 6, Tiết 6-8', 'D.0755', 30),
('IE230.N01', 'Viết báo cáo kỹ thuật bằng tiếng Nhật', 'IE230', 'PGS.TS Lý Phúc Bình', 'Thứ 7, Tiết 8-10', 'D.0756', 30),
('IE231.N01', 'Quản trị doanh nghiệp công nghệ thông tin', 'IE231', 'ThS. Mai Phúc Bình', 'Thứ 2, Tiết 1-3', 'D.0757', 60),
('IE232.N01', 'Nhập môn trí tuệ nhân tạo', 'IE232', 'TS. Tạ Phúc Bình', 'Thứ 3, Tiết 4-5', 'D.0758', 60),
('IE232_TH.N01', 'Nhập môn trí tuệ nhân tạo (Thực hành)', 'IE232_TH', 'ThS. Đinh Phúc Bình', 'Thứ 4, Tiết 6-8', 'D.0759', 30),
('IE233.N01', 'Phân tích và mô hình mạng xã hội', 'IE233', 'PGS.TS Cao Phúc Bình', 'Thứ 5, Tiết 8-10', 'D.0760', 60),
('IE233_TH.N01', 'Phân tích và mô hình mạng xã hội (Thực hành)', 'IE233_TH', 'ThS. Nguyễn Đình Bình', 'Thứ 6, Tiết 1-3', 'D.0761', 30),
('IE301.N01', 'Quản trị quan hệ khách hàng', 'IE301', 'TS. Trần Đình Bình', 'Thứ 7, Tiết 4-5', 'D.0762', 60),
('IE302.N01', 'Kiến trúc và tích hợp hệ thống', 'IE302', 'ThS. Lê Đình Bình', 'Thứ 2, Tiết 6-8', 'D.0763', 60),
('IE303.N01', 'Công nghệ Java', 'IE303', 'PGS.TS Phạm Đình Bình', 'Thứ 3, Tiết 8-10', 'D.0764', 60),
('IE303_TH.N01', 'Công nghệ Java (Thực hành)', 'IE303_TH', 'ThS. Hoàng Đình Bình', 'Thứ 4, Tiết 1-3', 'D.0765', 30),
('IE304.N01', 'Hệ thống định vị toàn cầu', 'IE304', 'TS. Huỳnh Đình Bình', 'Thứ 5, Tiết 4-5', 'D.0766', 60),
('IE305.N01', 'Tin học môi trường', 'IE305', 'ThS. Phan Đình Bình', 'Thứ 6, Tiết 6-8', 'D.0767', 60),
('IE307.N01', 'Công nghệ lập trình đa nền tảng cho ứng dụng di động', 'IE307', 'PGS.TS Vũ Đình Bình', 'Thứ 7, Tiết 8-10', 'D.0768', 60),
('IE307_TH.N01', 'Công nghệ lập trình đa nền tảng cho ứng dụng di động (Thực hành)', 'IE307_TH', 'ThS. Võ Đình Bình', 'Thứ 2, Tiết 1-3', 'D.0769', 30),
('IE309.N01', 'Thực tập doanh nghiệp', 'IE309', 'TS. Đặng Đình Bình', 'Thứ 3, Tiết 4-5', 'D.0770', 60),
('IE310.N01', 'Tư duy thiết kế', 'IE310', 'ThS. Bùi Đình Bình', 'Thứ 4, Tiết 6-8', 'D.0771', 60),
('IE313.N01', 'Phân tích và trực quan dữ liệu', 'IE313', 'PGS.TS Đỗ Đình Bình', 'Thứ 5, Tiết 8-10', 'D.0772', 60),
('IE313_TH.N01', 'Phân tích và trực quan dữ liệu (Thực hành)', 'IE313_TH', 'ThS. Hồ Đình Bình', 'Thứ 6, Tiết 1-3', 'D.0773', 30),
('IE400.N01', 'Chuyên đề tốt nghiệp', 'IE400', 'TS. Ngô Đình Bình', 'Thứ 7, Tiết 4-5', 'D.0774', 60),
('IE401.N01', 'Tin-Sinh học', 'IE401', 'ThS. Dương Đình Bình', 'Thứ 2, Tiết 6-8', 'D.0775', 60),
('IE402.N01', 'Hệ thống thông tin địa lý 3 chiều', 'IE402', 'PGS.TS Lý Đình Bình', 'Thứ 3, Tiết 8-10', 'D.0776', 60),
('IE402_TH.N01', 'Hệ thống thông tin địa lý 3 chiều (Thực hành)', 'IE402_TH', 'ThS. Mai Đình Bình', 'Thứ 4, Tiết 1-3', 'D.0777', 30),
('IE403.N01', 'Khai thác dữ liệu truyền thông xã hội', 'IE403', 'TS. Tạ Đình Bình', 'Thứ 5, Tiết 4-5', 'D.0778', 60),
('IE404.N01', 'Khai phá truyền thông xã hội', 'IE404', 'ThS. Đinh Đình Bình', 'Thứ 6, Tiết 6-8', 'D.0779', 60),
('IE405.N01', 'Công nghệ phân tích dữ liệu lớn', 'IE405', 'PGS.TS Cao Đình Bình', 'Thứ 7, Tiết 8-10', 'D.0780', 60),
('IE405_TH.N01', 'Công nghệ phân tích dữ liệu lớn (Thực hành)', 'IE405_TH', 'ThS. Nguyễn Hồng Bình', 'Thứ 2, Tiết 1-3', 'D.0781', 30),
('IE406.N01', 'Nhập môn ẩn thông tin và ứng dụng', 'IE406', 'TS. Trần Hồng Bình', 'Thứ 3, Tiết 4-5', 'D.0782', 60),
('IE501.N01', 'Đồ án tốt nghiệp', 'IE501', 'ThS. Lê Hồng Bình', 'Thứ 4, Tiết 6-8', 'D.0783', 60),
('IE502.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'IE502', 'PGS.TS Phạm Hồng Bình', 'Thứ 5, Tiết 8-10', 'D.0784', 60),
('IE505.N01', 'Khóa luận tốt nghiệp', 'IE505', 'ThS. Hoàng Hồng Bình', 'Thứ 6, Tiết 1-3', 'D.0785', 60),
('IEM4733.N01', 'Tái cấu trúc quy trình doanh nghiệp', 'IEM4733', 'TS. Huỳnh Hồng Bình', 'Thứ 7, Tiết 4-5', 'I.0786', 60),
('IEM5723.N01', 'Mô hình hóa dữ liệu, quy trình và đối tượng', 'IEM5723', 'ThS. Phan Hồng Bình', 'Thứ 2, Tiết 6-8', 'I.0787', 60),
('INI01.N01', 'Thực tập quốc tế', 'INI01', 'PGS.TS Vũ Hồng Bình', 'Thứ 3, Tiết 8-10', 'B.0788', 60),
('INT001.N01', 'Tiếng Anh tổng quát (tạm gọi)', 'INT001', 'ThS. Võ Hồng Bình', 'Thứ 4, Tiết 1-3', 'I.0789', 60),
('INT002.N01', 'Toeic 1', 'INT002', 'TS. Đặng Hồng Bình', 'Thứ 5, Tiết 4-5', 'I.0790', 60),
('INT003.N01', 'Tiếng Anh tổng quát 2 (tạm gọi)', 'INT003', 'ThS. Bùi Hồng Bình', 'Thứ 6, Tiết 6-8', 'I.0791', 60),
('INT004.N01', 'Toeic 2', 'INT004', 'PGS.TS Đỗ Hồng Bình', 'Thứ 7, Tiết 8-10', 'I.0792', 60),
('INT005.N01', 'Tiếng Anh giao tiếp (tạm gọi)', 'INT005', 'ThS. Hồ Hồng Bình', 'Thứ 2, Tiết 1-3', 'I.0793', 60),
('INT006.N01', 'Toeic 3', 'INT006', 'TS. Ngô Hồng Bình', 'Thứ 3, Tiết 4-5', 'I.0794', 60),
('IS005.N01', 'Giới thiệu ngành Hệ thống Thông tin', 'IS005', 'ThS. Dương Hồng Bình', 'Thứ 4, Tiết 6-8', 'I.0795', 60),
('IS101.N01', 'Thiết kế cơ sở dữ liệu', 'IS101', 'PGS.TS Lý Hồng Bình', 'Thứ 5, Tiết 8-10', 'I.0796', 60),
('IS101_TH.N01', 'Thiết kế cơ sở dữ liệu (Thực hành)', 'IS101_TH', 'ThS. Mai Hồng Bình', 'Thứ 6, Tiết 1-3', 'I.0797', 30),
('IS102.N01', 'Các hệ cơ sở tri thức', 'IS102', 'TS. Tạ Hồng Bình', 'Thứ 7, Tiết 4-5', 'I.0798', 60),
('IS103.N01', 'Hệ quản trị cơ sở dữ liệu', 'IS103', 'ThS. Đinh Hồng Bình', 'Thứ 2, Tiết 6-8', 'I.0799', 60),
('IS103_TH.N01', 'Hệ quản trị cơ sở dữ liệu (Thực hành)', 'IS103_TH', 'PGS.TS Cao Hồng Bình', 'Thứ 3, Tiết 8-10', 'I.0800', 30),
('IS104.N01', 'Cơ sở dữ liệu phân tán', 'IS104', 'ThS. Nguyễn Minh Châu', 'Thứ 4, Tiết 1-3', 'I.0801', 60),
('IS104_TH.N01', 'Cơ sở dữ liệu phân tán (Thực hành)', 'IS104_TH', 'TS. Trần Minh Châu', 'Thứ 5, Tiết 4-5', 'I.0802', 30),
('IS105.N01', 'Hệ quản trị cơ sở dữ liệu Oracle', 'IS105', 'ThS. Lê Minh Châu', 'Thứ 6, Tiết 6-8', 'I.0803', 60),
('IS105_TH.N01', 'Hệ quản trị cơ sở dữ liệu Oracle (Thực hành)', 'IS105_TH', 'PGS.TS Phạm Minh Châu', 'Thứ 7, Tiết 8-10', 'I.0804', 30),
('IS106.N01', 'Khai thác dữ liệu', 'IS106', 'ThS. Hoàng Minh Châu', 'Thứ 2, Tiết 1-3', 'I.0805', 60),
('IS106_TH.N01', 'Khai thác dữ liệu (Thực hành)', 'IS106_TH', 'TS. Huỳnh Minh Châu', 'Thứ 3, Tiết 4-5', 'I.0806', 30),
('IS107.N01', 'Hệ thống thông tin kế toán', 'IS107', 'ThS. Phan Minh Châu', 'Thứ 4, Tiết 6-8', 'I.0807', 60),
('IS201.N01', 'Phân tích thiết kế hệ thống thông tin', 'IS201', 'PGS.TS Vũ Minh Châu', 'Thứ 5, Tiết 8-10', 'I.0808', 60),
('IS202.N01', 'Nhập môn công nghệ phần mềm', 'IS202', 'ThS. Võ Minh Châu', 'Thứ 6, Tiết 1-3', 'I.0809', 60),
('IS202_TH.N01', 'Nhập môn công nghệ phần mềm (Thực hành)', 'IS202_TH', 'TS. Đặng Minh Châu', 'Thứ 7, Tiết 4-5', 'I.0810', 30),
('IS203.N01', 'Lập trình cơ sở dữ liệu', 'IS203', 'ThS. Bùi Minh Châu', 'Thứ 2, Tiết 6-8', 'I.0811', 60),
('IS203_TH.N01', 'Lập trình cơ sở dữ liệu (Thực hành)', 'IS203_TH', 'PGS.TS Đỗ Minh Châu', 'Thứ 3, Tiết 8-10', 'I.0812', 30),
('IS204.N01', 'Nhập môn hệ thống thông tin địa lý', 'IS204', 'ThS. Hồ Minh Châu', 'Thứ 4, Tiết 1-3', 'I.0813', 60),
('IS204_TH.N01', 'Nhập môn hệ thống thông tin địa lý (Thực hành)', 'IS204_TH', 'TS. Ngô Minh Châu', 'Thứ 5, Tiết 4-5', 'I.0814', 30),
('IS205.N01', 'PTTK hướng đối tượng với UML', 'IS205', 'ThS. Dương Minh Châu', 'Thứ 6, Tiết 6-8', 'I.0815', 60),
('IS205_TH.N01', 'PTTK hướng đối tượng với UML (Thực hành)', 'IS205_TH', 'PGS.TS Lý Minh Châu', 'Thứ 7, Tiết 8-10', 'I.0816', 30),
('IS206.N01', 'Lập trình ứng dụng Web với Java', 'IS206', 'ThS. Mai Minh Châu', 'Thứ 2, Tiết 1-3', 'I.0817', 60),
('IS206_TH.N01', 'Lập trình ứng dụng Web với Java (Thực hành)', 'IS206_TH', 'TS. Tạ Minh Châu', 'Thứ 3, Tiết 4-5', 'I.0818', 30),
('IS207.N01', 'Phát triển ứng dụng web', 'IS207', 'ThS. Đinh Minh Châu', 'Thứ 4, Tiết 6-8', 'I.0819', 60),
('IS207_TH.N01', 'Phát triển ứng dụng web (Thực hành)', 'IS207_TH', 'PGS.TS Cao Minh Châu', 'Thứ 5, Tiết 8-10', 'I.0820', 30),
('IS208.N01', 'Quản lý dự án công nghệ thông tin', 'IS208', 'ThS. Nguyễn Hoàng Châu', 'Thứ 6, Tiết 1-3', 'I.0821', 60),
('IS208_TH.N01', 'Quản lý dự án công nghệ thông tin (Thực hành)', 'IS208_TH', 'TS. Trần Hoàng Châu', 'Thứ 7, Tiết 4-5', 'I.0822', 30),
('IS210.N01', 'Hệ quản trị cơ sở dữ liệu', 'IS210', 'ThS. Lê Hoàng Châu', 'Thứ 2, Tiết 6-8', 'I.0823', 60),
('IS210_TH.N01', 'Hệ quản trị cơ sở dữ liệu (Thực hành)', 'IS210_TH', 'PGS.TS Phạm Hoàng Châu', 'Thứ 3, Tiết 8-10', 'I.0824', 30),
('IS211.N01', 'Cơ sở dữ liệu phân tán', 'IS211', 'ThS. Hoàng Hoàng Châu', 'Thứ 4, Tiết 1-3', 'I.0825', 60),
('IS212.N01', 'Thực tập tốt nghiệp', 'IS212', 'TS. Huỳnh Hoàng Châu', 'Thứ 5, Tiết 4-5', 'I.0826', 60),
('IS213.N01', 'Đồ án xây dựng một hệ thống thông tin', 'IS213', 'ThS. Phan Hoàng Châu', 'Thứ 6, Tiết 6-8', 'I.0827', 60),
('IS214.N01', 'Thiết kế cơ sở dữ liệu', 'IS214', 'PGS.TS Vũ Hoàng Châu', 'Thứ 7, Tiết 8-10', 'I.0828', 60),
('IS214_TH.N01', 'Thiết kế cơ sở dữ liệu (Thực hành)', 'IS214_TH', 'ThS. Võ Hoàng Châu', 'Thứ 2, Tiết 1-3', 'I.0829', 30),
('IS215.N01', 'Thiết kế hướng đối tượng với UML', 'IS215', 'TS. Đặng Hoàng Châu', 'Thứ 3, Tiết 4-5', 'I.0830', 60),
('IS216.N01', 'Lập trình Java', 'IS216', 'ThS. Bùi Hoàng Châu', 'Thứ 4, Tiết 6-8', 'I.0831', 60),
('IS216_TH.N01', 'Lập trình Java (Thực hành)', 'IS216_TH', 'PGS.TS Đỗ Hoàng Châu', 'Thứ 5, Tiết 8-10', 'I.0832', 30),
('IS217.N01', 'Kho dữ liệu và OLAP', 'IS217', 'ThS. Hồ Hoàng Châu', 'Thứ 6, Tiết 1-3', 'I.0833', 60),
('IS218.N01', 'Kỹ năng tư vấn', 'IS218', 'TS. Ngô Hoàng Châu', 'Thứ 7, Tiết 4-5', 'I.0834', 60),
('IS219.N01', 'Pháp luật trong Thương mại điện tử', 'IS219', 'ThS. Dương Hoàng Châu', 'Thứ 2, Tiết 6-8', 'I.0835', 60),
('IS220.N01', 'Xây dựng HTTT trên các framework', 'IS220', 'PGS.TS Lý Hoàng Châu', 'Thứ 3, Tiết 8-10', 'I.0836', 60),
('IS220_TH.N01', 'Xây dựng HTTT trên các framework (Thực hành)', 'IS220_TH', 'ThS. Mai Hoàng Châu', 'Thứ 4, Tiết 1-3', 'I.0837', 30),
('IS225.N01', 'Khai thác dữ liệu và ứng dụng', 'IS225', 'TS. Tạ Hoàng Châu', 'Thứ 5, Tiết 4-5', 'B.0838', 60),
('IS232.N01', 'Hệ thống thông tin kế toán', 'IS232', 'ThS. Đinh Hoàng Châu', 'Thứ 6, Tiết 6-8', 'I.0839', 60),
('IS251.N01', 'Nhập môn Hệ thống thông tin địa lý', 'IS251', 'PGS.TS Cao Hoàng Châu', 'Thứ 7, Tiết 8-10', 'I.0840', 60),
('IS251_TH.N01', 'Nhập môn Hệ thống thông tin địa lý (Thực hành)', 'IS251_TH', 'ThS. Nguyễn Thanh Châu', 'Thứ 2, Tiết 1-3', 'I.0841', 30),
('IS252.N01', 'Khai thác dữ liệu', 'IS252', 'TS. Trần Thanh Châu', 'Thứ 3, Tiết 4-5', 'I.0842', 60),
('IS253.N01', 'Lập trình ứng dụng trên thiết bị di động', 'IS253', 'ThS. Lê Thanh Châu', 'Thứ 4, Tiết 6-8', 'I.0843', 60),
('IS253_TH.N01', 'Lập trình ứng dụng trên thiết bị di động (Thực hành)', 'IS253_TH', 'PGS.TS Phạm Thanh Châu', 'Thứ 5, Tiết 8-10', 'I.0844', 30),
('IS254.N01', 'Hệ hỗ trợ quyết định', 'IS254', 'ThS. Hoàng Thanh Châu', 'Thứ 6, Tiết 1-3', 'I.0845', 60),
('IS301.N01', 'Thương mại điện tử', 'IS301', 'TS. Huỳnh Thanh Châu', 'Thứ 7, Tiết 4-5', 'I.0846', 60),
('IS302.N01', 'Phân tích không gian', 'IS302', 'ThS. Phan Thanh Châu', 'Thứ 2, Tiết 6-8', 'I.0847', 60),
('IS302_TH.N01', 'Phân tích không gian (Thực hành)', 'IS302_TH', 'PGS.TS Vũ Thanh Châu', 'Thứ 3, Tiết 8-10', 'I.0848', 30),
('IS303.N01', 'Hệ cơ sở dữ liệu không gian', 'IS303', 'ThS. Võ Thanh Châu', 'Thứ 4, Tiết 1-3', 'I.0849', 60),
('IS303_TH.N01', 'Hệ cơ sở dữ liệu không gian (Thực hành)', 'IS303_TH', 'TS. Đặng Thanh Châu', 'Thứ 5, Tiết 4-5', 'I.0850', 30),
('IS3033.N01', 'Quản lý dự án hệ thống thông tin', 'IS3033', 'ThS. Bùi Thanh Châu', 'Thứ 6, Tiết 6-8', 'I.0851', 60),
('IS304.N01', 'Kho dữ liệu và OLAP', 'IS304', 'PGS.TS Đỗ Thanh Châu', 'Thứ 7, Tiết 8-10', 'I.0852', 60),
('IS305.N01', 'An toàn và bảo mật HTTT', 'IS305', 'ThS. Hồ Thanh Châu', 'Thứ 2, Tiết 1-3', 'I.0853', 60),
('IS306.N01', 'Hệ thống thông tin quản lý', 'IS306', 'TS. Ngô Thanh Châu', 'Thứ 3, Tiết 4-5', 'I.0854', 60),
('IS311.N01', 'Đồ án xây dựng hệ thống thông tin', 'IS311', 'ThS. Dương Thanh Châu', 'Thứ 4, Tiết 6-8', 'I.0855', 60),
('IS3303.N01', 'Phân tích thiết kế hệ thống', 'IS3303', 'PGS.TS Lý Thanh Châu', 'Thứ 5, Tiết 8-10', 'I.0856', 60),
('IS332.N01', 'Hệ thống thông tin quản lý', 'IS332', 'ThS. Mai Thanh Châu', 'Thứ 6, Tiết 1-3', 'I.0857', 60),
('IS334.N01', 'Thương mại điện tử', 'IS334', 'TS. Tạ Thanh Châu', 'Thứ 7, Tiết 4-5', 'I.0858', 60),
('IS335.N01', 'An toàn và bảo mật hệ thống thông tin', 'IS335', 'ThS. Đinh Thanh Châu', 'Thứ 2, Tiết 6-8', 'I.0859', 60),
('IS336.N01', 'Hoạch định nguồn lực doanh nghiệp', 'IS336', 'PGS.TS Cao Thanh Châu', 'Thứ 3, Tiết 8-10', 'I.0860', 60),
('IS336_TH.N01', 'Hoạch định nguồn lực doanh nghiệp (Thực hành)', 'IS336_TH', 'ThS. Nguyễn Quang Châu', 'Thứ 4, Tiết 1-3', 'I.0861', 30),
('IS337.N01', 'Cơ sở dữ liệu nâng cao', 'IS337', 'TS. Trần Quang Châu', 'Thứ 5, Tiết 4-5', 'I.0862', 60),
('IS337_TH.N01', 'Cơ sở dữ liệu nâng cao (Thực hành)', 'IS337_TH', 'ThS. Lê Quang Châu', 'Thứ 6, Tiết 6-8', 'I.0863', 30),
('IS338.N01', 'Dự báo kinh doanh', 'IS338', 'PGS.TS Phạm Quang Châu', 'Thứ 7, Tiết 8-10', 'I.0864', 60),
('IS339.N01', 'Sinh tin học', 'IS339', 'ThS. Hoàng Quang Châu', 'Thứ 2, Tiết 1-3', 'I.0865', 60),
('IS340.N01', 'Thị trường chứng khoán', 'IS340', 'TS. Huỳnh Quang Châu', 'Thứ 3, Tiết 4-5', 'I.0866', 60),
('IS341.N01', 'Khởi nghiệp', 'IS341', 'ThS. Phan Quang Châu', 'Thứ 4, Tiết 6-8', 'I.0867', 60),
('IS342.N01', 'Chính phủ điện tử', 'IS342', 'PGS.TS Vũ Quang Châu', 'Thứ 5, Tiết 8-10', 'I.0868', 60),
('IS343.N01', 'Luật CNTT', 'IS343', 'ThS. Võ Quang Châu', 'Thứ 6, Tiết 1-3', 'I.0869', 60),
('IS344.N01', 'Quản trị nguồn lực y tế', 'IS344', 'TS. Đặng Quang Châu', 'Thứ 7, Tiết 4-5', 'I.0870', 60),
('IS344_TH.N01', 'Quản trị nguồn lực y tế (Thực hành)', 'IS344_TH', 'ThS. Bùi Quang Châu', 'Thứ 2, Tiết 6-8', 'I.0871', 30),
('IS345.N01', 'AI trong y tế', 'IS345', 'PGS.TS Đỗ Quang Châu', 'Thứ 3, Tiết 8-10', 'I.0872', 60),
('IS346.N01', 'Quản lý dự án công nghệ thông tin y tế', 'IS346', 'ThS. Hồ Quang Châu', 'Thứ 4, Tiết 1-3', 'I.0873', 60),
('IS346_TH.N01', 'Quản lý dự án công nghệ thông tin y tế (Thực hành)', 'IS346_TH', 'TS. Ngô Quang Châu', 'Thứ 5, Tiết 4-5', 'I.0874', 30),
('IS347.N01', 'Thống kê y học', 'IS347', 'ThS. Dương Quang Châu', 'Thứ 6, Tiết 6-8', 'I.0875', 60),
('IS348.N01', 'Dịch tễ học', 'IS348', 'PGS.TS Lý Quang Châu', 'Thứ 7, Tiết 8-10', 'I.0876', 60),
('IS348_TH.N01', 'Dịch tễ học (Thực hành)', 'IS348_TH', 'ThS. Mai Quang Châu', 'Thứ 2, Tiết 1-3', 'I.0877', 30),
('IS349.N01', 'Hệ thống y tế', 'IS349', 'TS. Tạ Quang Châu', 'Thứ 3, Tiết 4-5', 'I.0878', 60),
('IS351.N01', 'Phân tích không gian', 'IS351', 'ThS. Đinh Quang Châu', 'Thứ 4, Tiết 6-8', 'I.0879', 60),
('IS351_TH.N01', 'Phân tích không gian (Thực hành)', 'IS351_TH', 'PGS.TS Cao Quang Châu', 'Thứ 5, Tiết 8-10', 'I.0880', 30),
('IS352.N01', 'Hệ cơ sở dữ liệu không gian', 'IS352', 'ThS. Nguyễn Hữu Châu', 'Thứ 6, Tiết 1-3', 'I.0881', 60),
('IS353.N01', 'Mạng xã hội', 'IS353', 'TS. Trần Hữu Châu', 'Thứ 7, Tiết 4-5', 'I.0882', 60),
('IS354.N01', 'Công nghệ tài chính căn bản Fintech', 'IS354', 'ThS. Lê Hữu Châu', 'Thứ 2, Tiết 6-8', 'I.0883', 60),
('IS355.N01', 'Công nghệ Blockchain', 'IS355', 'PGS.TS Phạm Hữu Châu', 'Thứ 3, Tiết 8-10', 'I.0884', 60),
('IS356.N01', 'Agile IT với DevOps', 'IS356', 'ThS. Hoàng Hữu Châu', 'Thứ 4, Tiết 1-3', 'I.0885', 60),
('IS357.N01', 'Kiến trúc hướng dịch vụ', 'IS357', 'TS. Huỳnh Hữu Châu', 'Thứ 5, Tiết 4-5', 'I.0886', 60),
('IS358.N01', 'Kiểm soát nhiễm khuẩn bệnh viện', 'IS358', 'ThS. Phan Hữu Châu', 'Thứ 6, Tiết 6-8', 'I.0887', 60),
('IS360.N01', 'Quản lý chăm sóc và điều trị', 'IS360', 'PGS.TS Vũ Hữu Châu', 'Thứ 7, Tiết 8-10', 'I.0888', 60),
('IS361.N01', 'Quản lý chuỗi cung ứng dược và thiết bị y tế', 'IS361', 'ThS. Võ Hữu Châu', 'Thứ 2, Tiết 1-3', 'I.0889', 60),
('IS362.N01', 'Quản trị tài chính và bảo hiểm y tế', 'IS362', 'TS. Đặng Hữu Châu', 'Thứ 3, Tiết 4-5', 'I.0890', 60),
('IS363.N01', 'Pháp luật trong lĩnh vực y tế', 'IS363', 'ThS. Bùi Hữu Châu', 'Thứ 4, Tiết 6-8', 'I.0891', 60),
('IS364.N01', 'Mã tiêu chuẩn dùng chung trong y tế', 'IS364', 'PGS.TS Đỗ Hữu Châu', 'Thứ 5, Tiết 8-10', 'I.0892', 60),
('IS401.N01', 'Khóa luận tốt nghiệp', 'IS401', 'ThS. Hồ Hữu Châu', 'Thứ 6, Tiết 1-3', 'I.0893', 60),
('IS4013.N01', 'Thiết kế, quản lý và quản trị hệ CSDL', 'IS4013', 'TS. Ngô Hữu Châu', 'Thứ 7, Tiết 4-5', 'I.0894', 60),
('IS402.N01', 'Điện toán đám mây', 'IS402', 'ThS. Dương Hữu Châu', 'Thứ 2, Tiết 6-8', 'I.0895', 60),
('IS403.N01', 'Phân tích dữ liệu kinh doanh', 'IS403', 'PGS.TS Lý Hữu Châu', 'Thứ 3, Tiết 8-10', 'I.0896', 60),
('IS404.N01', 'Kho dữ liệu và OLAP', 'IS404', 'ThS. Mai Hữu Châu', 'Thứ 4, Tiết 1-3', 'I.0897', 60),
('IS404_TH.N01', 'Kho dữ liệu và OLAP (Thực hành)', 'IS404_TH', 'TS. Tạ Hữu Châu', 'Thứ 5, Tiết 4-5', 'I.0898', 30),
('IS405.N01', 'Dữ liệu lớn', 'IS405', 'ThS. Đinh Hữu Châu', 'Thứ 6, Tiết 6-8', 'I.0899', 60),
('IS405_TH.N01', 'Dữ liệu lớn (Thực hành)', 'IS405_TH', 'PGS.TS Cao Hữu Châu', 'Thứ 7, Tiết 8-10', 'I.0900', 30),
('IS406.N01', 'Điện toán đám mây và xử lý dữ liệu lớn', 'IS406', 'ThS. Nguyễn Gia Châu', 'Thứ 2, Tiết 1-3', 'I.0901', 60),
('IS407.N01', 'Đồ án tốt nghiệp', 'IS407', 'TS. Trần Gia Châu', 'Thứ 3, Tiết 4-5', 'I.0902', 60),
('IS4133.N01', 'Công nghệ thông tin cho thương mại điện tử', 'IS4133', 'ThS. Lê Gia Châu', 'Thứ 4, Tiết 6-8', 'I.0903', 60),
('IS4263.N01', 'Các ứng dụng thông minh và hỗ trợ ra quyết định', 'IS4263', 'PGS.TS Phạm Gia Châu', 'Thứ 5, Tiết 8-10', 'I.0904', 60),
('IS4523.N01', 'Hệ truyền thông dữ liệu', 'IS4523', 'ThS. Hoàng Gia Châu', 'Thứ 6, Tiết 1-3', 'I.0905', 60),
('IS501.N01', 'Thực tập cuối khóa', 'IS501', 'TS. Huỳnh Gia Châu', 'Thứ 7, Tiết 4-5', 'I.0906', 60),
('IS502.N01', 'Thực tập doanh nghiệp', 'IS502', 'ThS. Phan Gia Châu', 'Thứ 2, Tiết 6-8', 'I.0907', 60),
('IS503.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'IS503', 'PGS.TS Vũ Gia Châu', 'Thứ 3, Tiết 8-10', 'I.0908', 60),
('IS505.N01', 'Khóa luận tốt nghiệp', 'IS505', 'ThS. Võ Gia Châu', 'Thứ 4, Tiết 1-3', 'I.0909', 60),
('IS5100.N01', 'Thực tập cuối khóa', 'IS5100', 'TS. Đặng Gia Châu', 'Thứ 5, Tiết 4-5', 'I.0910', 60),
('IS6301.N01', 'Phân tích thiết kế hệ thống thông tin nâng cao', 'IS6301', 'ThS. Bùi Gia Châu', 'Thứ 6, Tiết 6-8', 'I.0911', 60),
('IS6301_TH.N01', 'Phân tích thiết kế hệ thống thông tin nâng cao (Thực hành)', 'IS6301_TH', 'PGS.TS Đỗ Gia Châu', 'Thứ 7, Tiết 8-10', 'I.0912', 30),
('IT001.N01', 'Nhập môn lập trình', 'IT001', 'ThS. Hồ Gia Châu', 'Thứ 2, Tiết 1-3', 'C.0913', 60),
('IT001_TH.N01', 'Nhập môn lập trình (Thực hành)', 'IT001_TH', 'TS. Ngô Gia Châu', 'Thứ 3, Tiết 4-5', 'C.0914', 30),
('IT002.N01', 'Lập trình hướng đối tượng', 'IT002', 'ThS. Dương Gia Châu', 'Thứ 4, Tiết 6-8', 'E.0915', 60),
('IT002_TH.N01', 'Lập trình hướng đối tượng (Thực hành)', 'IT002_TH', 'PGS.TS Lý Gia Châu', 'Thứ 5, Tiết 8-10', 'E.0916', 30),
('IT003.N01', 'Cấu trúc dữ liệu và giải thuật', 'IT003', 'ThS. Mai Gia Châu', 'Thứ 6, Tiết 1-3', 'C.0917', 60),
('IT003_TH.N01', 'Cấu trúc dữ liệu và giải thuật (Thực hành)', 'IT003_TH', 'TS. Tạ Gia Châu', 'Thứ 7, Tiết 4-5', 'C.0918', 30),
('IT004.N01', 'Cơ sở dữ liệu', 'IT004', 'ThS. Đinh Gia Châu', 'Thứ 2, Tiết 6-8', 'I.0919', 60),
('IT004_TH.N01', 'Cơ sở dữ liệu (Thực hành)', 'IT004_TH', 'PGS.TS Cao Gia Châu', 'Thứ 3, Tiết 8-10', 'I.0920', 30),
('IT005.N01', 'Nhập môn mạng máy tính', 'IT005', 'ThS. Nguyễn Khánh Châu', 'Thứ 4, Tiết 1-3', 'N.0921', 60),
('IT005_TH.N01', 'Nhập môn mạng máy tính (Thực hành)', 'IT005_TH', 'TS. Trần Khánh Châu', 'Thứ 5, Tiết 4-5', 'N.0922', 30),
('IT006.N01', 'Kiến trúc máy tính', 'IT006', 'ThS. Lê Khánh Châu', 'Thứ 6, Tiết 6-8', 'CE.0923', 60),
('IT007.N01', 'Hệ điều hành', 'IT007', 'PGS.TS Phạm Khánh Châu', 'Thứ 7, Tiết 8-10', 'CE.0924', 60),
('IT007_TH.N01', 'Hệ điều hành (Thực hành)', 'IT007_TH', 'ThS. Hoàng Khánh Châu', 'Thứ 2, Tiết 1-3', 'CE.0925', 30),
('IT008.N01', 'Lập trình trực quan', 'IT008', 'TS. Huỳnh Khánh Châu', 'Thứ 3, Tiết 4-5', 'E.0926', 60),
('IT009.N01', 'Giới thiệu ngành', 'IT009', 'ThS. Phan Khánh Châu', 'Thứ 4, Tiết 6-8', 'B.0927', 60),
('IT010.N01', 'Tổ chức và cấu trúc máy tính', 'IT010', 'PGS.TS Vũ Khánh Châu', 'Thứ 5, Tiết 8-10', 'CE.0928', 60),
('IT011.N01', 'Nhập môn lập trình thi đấu', 'IT011', 'ThS. Võ Khánh Châu', 'Thứ 6, Tiết 1-3', 'C.0929', 60),
('IT011_TH.N01', 'Nhập môn lập trình thi đấu (Thực hành)', 'IT011_TH', 'TS. Đặng Khánh Châu', 'Thứ 7, Tiết 4-5', 'C.0930', 30),
('IT012.N01', 'Tổ chức và Cấu trúc Máy tính II', 'IT012', 'ThS. Bùi Khánh Châu', 'Thứ 2, Tiết 6-8', 'CE.0931', 60),
('IT012_TH.N01', 'Tổ chức và Cấu trúc Máy tính II (Thực hành)', 'IT012_TH', 'PGS.TS Đỗ Khánh Châu', 'Thứ 3, Tiết 8-10', 'CE.0932', 30),
('IT013.N01', 'Cấu trúc dữ liệu cho lập trình thi đấu', 'IT013', 'ThS. Hồ Khánh Châu', 'Thứ 4, Tiết 1-3', 'C.0933', 60),
('IT013_TH.N01', 'Cấu trúc dữ liệu cho lập trình thi đấu (Thực hành)', 'IT013_TH', 'TS. Ngô Khánh Châu', 'Thứ 5, Tiết 4-5', 'C.0934', 30),
('ITEM1.N01', 'Nhập môn Quản trị doanh nghiệp', 'ITEM1', 'ThS. Dương Khánh Châu', 'Thứ 6, Tiết 6-8', 'B.0935', 60),
('ITEW1.N01', 'Nhập môn công tác kỹ sư', 'ITEW1', 'PGS.TS Lý Khánh Châu', 'Thứ 7, Tiết 8-10', 'B.0936', 60),
('ITNT005.N01', 'Communication', 'ITNT005', 'ThS. Mai Khánh Châu', 'Thứ 2, Tiết 1-3', 'I.0937', 60),
('JAN01.N01', 'Tiếng Nhật 1', 'JAN01', 'TS. Tạ Khánh Châu', 'Thứ 3, Tiết 4-5', 'B.0938', 60),
('JAN01_TH.N01', 'Tiếng Nhật 1 (Thực hành)', 'JAN01_TH', 'ThS. Đinh Khánh Châu', 'Thứ 4, Tiết 6-8', 'B.0939', 30),
('JAN02.N01', 'Tiếng Nhật 2', 'JAN02', 'PGS.TS Cao Khánh Châu', 'Thứ 5, Tiết 8-10', 'B.0940', 60),
('JAN02_TH.N01', 'Tiếng Nhật 2 (Thực hành)', 'JAN02_TH', 'ThS. Nguyễn Tuấn Châu', 'Thứ 6, Tiết 1-3', 'B.0941', 30),
('JAN03.N01', 'Tiếng Nhật 3', 'JAN03', 'TS. Trần Tuấn Châu', 'Thứ 7, Tiết 4-5', 'B.0942', 60),
('JAN03_TH.N01', 'Tiếng Nhật 3 (Thực hành)', 'JAN03_TH', 'ThS. Lê Tuấn Châu', 'Thứ 2, Tiết 6-8', 'B.0943', 30),
('JAN04.N01', 'Tiếng Nhật 4', 'JAN04', 'PGS.TS Phạm Tuấn Châu', 'Thứ 3, Tiết 8-10', 'B.0944', 60),
('JAN04_TH.N01', 'Tiếng Nhật 4 (Thực hành)', 'JAN04_TH', 'ThS. Hoàng Tuấn Châu', 'Thứ 4, Tiết 1-3', 'B.0945', 30),
('JAN05.N01', 'Tiếng Nhật 5', 'JAN05', 'TS. Huỳnh Tuấn Châu', 'Thứ 5, Tiết 4-5', 'B.0946', 60),
('JAN05_TH.N01', 'Tiếng Nhật 5 (Thực hành)', 'JAN05_TH', 'ThS. Phan Tuấn Châu', 'Thứ 6, Tiết 6-8', 'B.0947', 30),
('JAN06.N01', 'Tiếng Nhật 6', 'JAN06', 'PGS.TS Vũ Tuấn Châu', 'Thứ 7, Tiết 8-10', 'B.0948', 60),
('JAN06_TH.N01', 'Tiếng Nhật 6 (Thực hành)', 'JAN06_TH', 'ThS. Võ Tuấn Châu', 'Thứ 2, Tiết 1-3', 'B.0949', 30),
('JAN07.N01', 'Tiếng Nhật 7', 'JAN07', 'TS. Đặng Tuấn Châu', 'Thứ 3, Tiết 4-5', 'B.0950', 60),
('JAN07_TH.N01', 'Tiếng Nhật 7 (Thực hành)', 'JAN07_TH', 'ThS. Bùi Tuấn Châu', 'Thứ 4, Tiết 6-8', 'B.0951', 30),
('JAN08.N01', 'Tiếng Nhật 8', 'JAN08', 'PGS.TS Đỗ Tuấn Châu', 'Thứ 5, Tiết 8-10', 'B.0952', 60),
('JAN08_TH.N01', 'Tiếng Nhật 8 (Thực hành)', 'JAN08_TH', 'ThS. Hồ Tuấn Châu', 'Thứ 6, Tiết 1-3', 'B.0953', 30),
('JANHU.N01', 'Tiếng Nhật miễn phí do Huredee tài trợ', 'JANHU', 'TS. Ngô Tuấn Châu', 'Thứ 7, Tiết 4-5', 'B.0954', 60),
('LIA01.N01', 'Đại số tuyến tính', 'LIA01', 'ThS. Dương Tuấn Châu', 'Thứ 2, Tiết 6-8', 'B.0955', 60),
('LIA11.N01', 'Đại số tuyến tính', 'LIA11', 'PGS.TS Lý Tuấn Châu', 'Thứ 3, Tiết 8-10', 'B.0956', 60),
('MA001.N01', 'Giải tích 1', 'MA001', 'ThS. Mai Tuấn Châu', 'Thứ 4, Tiết 1-3', 'B.0957', 60),
('MA002.N01', 'Giải tích 2', 'MA002', 'TS. Tạ Tuấn Châu', 'Thứ 5, Tiết 4-5', 'B.0958', 60),
('MA003.N01', 'Đại số tuyến tính', 'MA003', 'ThS. Đinh Tuấn Châu', 'Thứ 6, Tiết 6-8', 'B.0959', 60),
('MA004.N01', 'Cấu trúc rời rạc', 'MA004', 'PGS.TS Cao Tuấn Châu', 'Thứ 7, Tiết 8-10', 'B.0960', 60),
('MA005.N01', 'Xác suất thống kê', 'MA005', 'ThS. Nguyễn Ngọc Châu', 'Thứ 2, Tiết 1-3', 'B.0961', 60),
('MA006.N01', 'Giải tích', 'MA006', 'TS. Trần Ngọc Châu', 'Thứ 3, Tiết 4-5', 'B.0962', 60),
('MAT01.N01', 'Toán cao cấp A1', 'MAT01', 'ThS. Lê Ngọc Châu', 'Thứ 4, Tiết 6-8', 'B.0963', 60),
('MAT02.N01', 'Toán cao cấp A2', 'MAT02', 'PGS.TS Phạm Ngọc Châu', 'Thứ 5, Tiết 8-10', 'B.0964', 60),
('MAT04.N01', 'Cấu trúc rời rạc', 'MAT04', 'ThS. Hoàng Ngọc Châu', 'Thứ 6, Tiết 1-3', 'B.0965', 60),
('MAT11.N01', 'Giải tích 1', 'MAT11', 'TS. Huỳnh Ngọc Châu', 'Thứ 7, Tiết 4-5', 'B.0966', 60),
('MAT12.N01', 'Giải tích 2', 'MAT12', 'ThS. Phan Ngọc Châu', 'Thứ 2, Tiết 6-8', 'B.0967', 60),
('MAT14.N01', 'Toán rời rạc cho máy tính', 'MAT14', 'PGS.TS Vũ Ngọc Châu', 'Thứ 3, Tiết 8-10', 'B.0968', 60),
('MAT21.N01', 'Toán cao cấp A1 (TE)', 'MAT21', 'ThS. Võ Ngọc Châu', 'Thứ 4, Tiết 1-3', 'B.0969', 60),
('MAT22.N01', 'Toán cao cấp A2 (TE)', 'MAT22', 'TS. Đặng Ngọc Châu', 'Thứ 5, Tiết 4-5', 'B.0970', 60),
('MAT23.N01', 'Đại số tuyến tính', 'MAT23', 'ThS. Bùi Ngọc Châu', 'Thứ 6, Tiết 6-8', 'B.0971', 60),
('MAT24.N01', 'Cấu trúc rời rạc (TE)', 'MAT24', 'PGS.TS Đỗ Ngọc Châu', 'Thứ 7, Tiết 8-10', 'B.0972', 60),
('MATH2144.N01', 'Giải tích I', 'MATH2144', 'ThS. Hồ Ngọc Châu', 'Thứ 2, Tiết 1-3', 'I.0973', 60),
('MATH2153.N01', 'Giải tích II', 'MATH2153', 'TS. Ngô Ngọc Châu', 'Thứ 3, Tiết 4-5', 'I.0974', 60),
('MATH2154.N01', 'Giải tích', 'MATH2154', 'ThS. Dương Ngọc Châu', 'Thứ 4, Tiết 6-8', 'I.0975', 60),
('MATH3013.N01', 'Đại số tuyến tính', 'MATH3013', 'PGS.TS Lý Ngọc Châu', 'Thứ 5, Tiết 8-10', 'I.0976', 60),
('ME001.N01', 'Giáo dục quốc phòng', 'ME001', 'ThS. Mai Ngọc Châu', 'Thứ 6, Tiết 1-3', 'B.0977', 60),
('MEDU1.N01', 'Giáo dục quốc phòng', 'MEDU1', 'TS. Tạ Ngọc Châu', 'Thứ 7, Tiết 4-5', 'B.0978', 60),
('MKTG4223.N01', 'Quản trị chuỗi cung ứng', 'MKTG4223', 'ThS. Đinh Ngọc Châu', 'Thứ 2, Tiết 6-8', 'I.0979', 60),
('MKTG5883.N01', 'Khai phá dữ liệu và ứng dụng', 'MKTG5883', 'PGS.TS Cao Ngọc Châu', 'Thứ 3, Tiết 8-10', 'I.0980', 60),
('MKTG5883_TH.N01', 'Khai phá dữ liệu và ứng dụng (Thực hành)', 'MKTG5883_TH', 'ThS. Nguyễn Bảo Châu', 'Thứ 4, Tiết 1-3', 'I.0981', 30),
('MLPE1.N01', 'Kinh tế chính trị Mác-Lênin (TE)', 'MLPE1', 'TS. Trần Bảo Châu', 'Thứ 5, Tiết 4-5', 'B.0982', 60),
('MLPE2.N01', 'Kinh tế chính trị Mác-Lênin (TE1)', 'MLPE2', 'ThS. Lê Bảo Châu', 'Thứ 6, Tiết 6-8', 'B.0983', 60),
('MM001.N01', 'Kỹ năng truyền thông cho người làm CNTT', 'MM001', 'PGS.TS Phạm Bảo Châu', 'Thứ 7, Tiết 8-10', 'B.0984', 60),
('MM001_TH.N01', 'Kỹ năng truyền thông cho người làm CNTT (Thực hành)', 'MM001_TH', 'ThS. Hoàng Bảo Châu', 'Thứ 2, Tiết 1-3', 'B.0985', 30),
('MM002.N01', 'Truyền thông Kỹ thuật số', 'MM002', 'TS. Huỳnh Bảo Châu', 'Thứ 3, Tiết 4-5', 'B.0986', 60),
('MM002_TH.N01', 'Truyền thông Kỹ thuật số (Thực hành)', 'MM002_TH', 'ThS. Phan Bảo Châu', 'Thứ 4, Tiết 6-8', 'B.0987', 30),
('MM003.N01', 'Quản trị sự kiện', 'MM003', 'PGS.TS Vũ Bảo Châu', 'Thứ 5, Tiết 8-10', 'E.0988', 60),
('MM003_TH.N01', 'Quản trị sự kiện (Thực hành)', 'MM003_TH', 'ThS. Võ Bảo Châu', 'Thứ 6, Tiết 1-3', 'E.0989', 30),
('MM004.N01', 'Nguyên lý thiết kế đồ hoạ', 'MM004', 'TS. Đặng Bảo Châu', 'Thứ 7, Tiết 4-5', 'E.0990', 30),
('MM005.N01', 'Nhập môn marketing', 'MM005', 'ThS. Bùi Bảo Châu', 'Thứ 2, Tiết 6-8', 'E.0991', 60),
('MM006.N01', 'Tâm lý học đại cương', 'MM006', 'PGS.TS Đỗ Bảo Châu', 'Thứ 3, Tiết 8-10', 'E.0992', 60),
('MM007.N01', 'Tư duy sáng tạo và xu hướng thiết kế truyền thông', 'MM007', 'ThS. Hồ Bảo Châu', 'Thứ 4, Tiết 1-3', 'E.0993', 60),
('MM008.N01', 'Kỹ năng truyền thông ứng dụng', 'MM008', 'TS. Ngô Bảo Châu', 'Thứ 5, Tiết 4-5', 'E.0994', 60),
('MM101.N01', 'Giới thiệu ngành Truyền thông đa phương tiện', 'MM101', 'ThS. Dương Bảo Châu', 'Thứ 6, Tiết 6-8', 'E.0995', 60),
('MM102.N01', 'Lý luận truyền thông đại chúng', 'MM102', 'PGS.TS Lý Bảo Châu', 'Thứ 7, Tiết 8-10', 'E.0996', 60),
('MM103.N01', 'Cơ sở tạo hình và nguyên lý thị giác', 'MM103', 'ThS. Mai Bảo Châu', 'Thứ 2, Tiết 1-3', 'E.0997', 60),
('MM104.N01', 'Viết nội dung đa phương tiện', 'MM104', 'TS. Tạ Bảo Châu', 'Thứ 3, Tiết 4-5', 'E.0998', 60),
('MM105.N01', 'Nhập môn kỹ thuật sản xuất nội dung đa phương tiện', 'MM105', 'ThS. Đinh Bảo Châu', 'Thứ 4, Tiết 6-8', 'E.0999', 60),
('MM105_TH.N01', 'Nhập môn kỹ thuật sản xuất nội dung đa phương tiện (Thực hành)', 'MM105_TH', 'PGS.TS Cao Bảo Châu', 'Thứ 5, Tiết 8-10', 'E.1000', 30),
('MM106.N01', 'Thu thập và phân tích khám phá dữ liệu Truyền thông đa phương tiện', 'MM106', 'ThS. Nguyễn Đức Châu', 'Thứ 6, Tiết 1-3', 'E.1001', 60),
('MM106_TH.N01', 'Thu thập và phân tích khám phá dữ liệu Truyền thông đa phương tiện (Thực hành)', 'MM106_TH', 'TS. Trần Đức Châu', 'Thứ 7, Tiết 4-5', 'E.1002', 30),
('MM107.N01', 'Học máy ứng dụng trong Truyền thông đa phương tiện', 'MM107', 'ThS. Lê Đức Châu', 'Thứ 2, Tiết 6-8', 'E.1003', 60),
('MM107_TH.N01', 'Học máy ứng dụng trong Truyền thông đa phương tiện (Thực hành)', 'MM107_TH', 'PGS.TS Phạm Đức Châu', 'Thứ 3, Tiết 8-10', 'E.1004', 30),
('MM108.N01', 'Tiếp thị số', 'MM108', 'ThS. Hoàng Đức Châu', 'Thứ 4, Tiết 1-3', 'E.1005', 60),
('MM108_TH.N01', 'Tiếp thị số (Thực hành)', 'MM108_TH', 'TS. Huỳnh Đức Châu', 'Thứ 5, Tiết 4-5', 'E.1006', 30),
('MM109.N01', 'Thiết kế đồ họa', 'MM109', 'ThS. Phan Đức Châu', 'Thứ 6, Tiết 6-8', 'E.1007', 60),
('MM109_TH.N01', 'Thiết kế đồ họa (Thực hành)', 'MM109_TH', 'PGS.TS Vũ Đức Châu', 'Thứ 7, Tiết 8-10', 'E.1008', 30),
('MM110.N01', 'Màu sắc và tâm lý thị giác trong thiết kế truyền thông', 'MM110', 'ThS. Võ Đức Châu', 'Thứ 2, Tiết 1-3', 'E.1009', 60),
('MM201.N01', 'Truyền thông và dư luận xã hội', 'MM201', 'TS. Đặng Đức Châu', 'Thứ 3, Tiết 4-5', 'E.1010', 60),
('MM201_TH.N01', 'Truyền thông và dư luận xã hội (Thực hành)', 'MM201_TH', 'ThS. Bùi Đức Châu', 'Thứ 4, Tiết 6-8', 'E.1011', 30),
('MM202.N01', 'Học sâu ứng dụng trong truyền thông đa phương tiện', 'MM202', 'PGS.TS Đỗ Đức Châu', 'Thứ 5, Tiết 8-10', 'E.1012', 60),
('MM202_TH.N01', 'Học sâu ứng dụng trong truyền thông đa phương tiện (Thực hành)', 'MM202_TH', 'ThS. Hồ Đức Châu', 'Thứ 6, Tiết 1-3', 'E.1013', 30),
('MM203.N01', 'Xử lý ngôn ngữ tự nhiên cho truyền thông đa phương tiện', 'MM203', 'TS. Ngô Đức Châu', 'Thứ 7, Tiết 4-5', 'E.1014', 60),
('MM203_TH.N01', 'Xử lý ngôn ngữ tự nhiên cho truyền thông đa phương tiện (Thực hành)', 'MM203_TH', 'ThS. Dương Đức Châu', 'Thứ 2, Tiết 6-8', 'E.1015', 30),
('MM204.N01', 'Xử lý ảnh số và video trong truyền thông đa phương tiện', 'MM204', 'PGS.TS Lý Đức Châu', 'Thứ 3, Tiết 8-10', 'E.1016', 60),
('MM204_TH.N01', 'Xử lý ảnh số và video trong truyền thông đa phương tiện (Thực hành)', 'MM204_TH', 'ThS. Mai Đức Châu', 'Thứ 4, Tiết 1-3', 'E.1017', 30),
('MM205.N01', 'Phân tích và hiểu nội dung đa phương thức', 'MM205', 'TS. Tạ Đức Châu', 'Thứ 5, Tiết 4-5', 'E.1018', 60),
('MM205_TH.N01', 'Phân tích và hiểu nội dung đa phương thức (Thực hành)', 'MM205_TH', 'ThS. Đinh Đức Châu', 'Thứ 6, Tiết 6-8', 'E.1019', 30),
('MM206.N01', 'Dữ liệu lớn ứng dụng trong truyền thông đa phương tiện', 'MM206', 'PGS.TS Cao Đức Châu', 'Thứ 7, Tiết 8-10', 'E.1020', 60),
('MM206_TH.N01', 'Dữ liệu lớn ứng dụng trong truyền thông đa phương tiện (Thực hành)', 'MM206_TH', 'ThS. Nguyễn Anh Châu', 'Thứ 2, Tiết 1-3', 'E.1021', 30),
('MM207.N01', 'Hệ thống khai phá dữ liệu mạng xã hội', 'MM207', 'TS. Trần Anh Châu', 'Thứ 3, Tiết 4-5', 'E.1022', 60),
('MM207_TH.N01', 'Hệ thống khai phá dữ liệu mạng xã hội (Thực hành)', 'MM207_TH', 'ThS. Lê Anh Châu', 'Thứ 4, Tiết 6-8', 'E.1023', 30),
('MM208.N01', 'Thiết kế và sản xuất ấn phẩm', 'MM208', 'PGS.TS Phạm Anh Châu', 'Thứ 5, Tiết 8-10', 'E.1024', 60),
('MM208_TH.N01', 'Thiết kế và sản xuất ấn phẩm (Thực hành)', 'MM208_TH', 'ThS. Hoàng Anh Châu', 'Thứ 6, Tiết 1-3', 'E.1025', 30),
('MM209.N01', 'Nghiệp vụ truyền thông và báo chí', 'MM209', 'TS. Huỳnh Anh Châu', 'Thứ 7, Tiết 4-5', 'E.1026', 60),
('MM209_TH.N01', 'Nghiệp vụ truyền thông và báo chí (Thực hành)', 'MM209_TH', 'ThS. Phan Anh Châu', 'Thứ 2, Tiết 6-8', 'E.1027', 30),
('MM210.N01', 'Kỹ thuật quay phim biên kịch và hậu kỳ', 'MM210', 'PGS.TS Vũ Anh Châu', 'Thứ 3, Tiết 8-10', 'E.1028', 60),
('MM210_TH.N01', 'Kỹ thuật quay phim biên kịch và hậu kỳ (Thực hành)', 'MM210_TH', 'ThS. Võ Anh Châu', 'Thứ 4, Tiết 1-3', 'E.1029', 30),
('MM211.N01', 'Thực tế ảo và thực tế tăng cường', 'MM211', 'TS. Đặng Anh Châu', 'Thứ 5, Tiết 4-5', 'E.1030', 60),
('MM211_TH.N01', 'Thực tế ảo và thực tế tăng cường (Thực hành)', 'MM211_TH', 'ThS. Bùi Anh Châu', 'Thứ 6, Tiết 6-8', 'E.1031', 30),
('MM212.N01', 'Hoạt hình', 'MM212', 'PGS.TS Đỗ Anh Châu', 'Thứ 7, Tiết 8-10', 'E.1032', 60),
('MM212_TH.N01', 'Hoạt hình (Thực hành)', 'MM212_TH', 'ThS. Hồ Anh Châu', 'Thứ 2, Tiết 1-3', 'E.1033', 30),
('MM213.N01', 'Quản lý dự án truyền thông đa phương tiện', 'MM213', 'TS. Ngô Anh Châu', 'Thứ 3, Tiết 4-5', 'E.1034', 60),
('MM213_TH.N01', 'Quản lý dự án truyền thông đa phương tiện (Thực hành)', 'MM213_TH', 'ThS. Dương Anh Châu', 'Thứ 4, Tiết 6-8', 'E.1035', 30),
('MM214.N01', 'Chiến lược phát triển thương hiệu', 'MM214', 'PGS.TS Lý Anh Châu', 'Thứ 5, Tiết 8-10', 'E.1036', 60),
('MM215.N01', 'Quan hệ công chúng trong marketing', 'MM215', 'ThS. Mai Anh Châu', 'Thứ 6, Tiết 1-3', 'E.1037', 60),
('MM216.N01', 'Tối ưu hóa và tiếp thị trên công cụ tìm kiếm', 'MM216', 'TS. Tạ Anh Châu', 'Thứ 7, Tiết 4-5', 'E.1038', 60),
('MM216_TH.N01', 'Tối ưu hóa và tiếp thị trên công cụ tìm kiếm (Thực hành)', 'MM216_TH', 'ThS. Đinh Anh Châu', 'Thứ 2, Tiết 6-8', 'E.1039', 30),
('MM217.N01', 'Tiếp thị cho sản phẩm dịch vụ', 'MM217', 'PGS.TS Cao Anh Châu', 'Thứ 3, Tiết 8-10', 'E.1040', 60),
('MM218.N01', 'Xây dựng kênh tiếp thị trực tuyến', 'MM218', 'ThS. Nguyễn Kim Châu', 'Thứ 4, Tiết 1-3', 'E.1041', 60),
('MM219.N01', 'Quản trị mối quan hệ khách hàng định hướng dữ liệu', 'MM219', 'TS. Trần Kim Châu', 'Thứ 5, Tiết 4-5', 'E.1042', 60),
('MM219_TH.N01', 'Quản trị mối quan hệ khách hàng định hướng dữ liệu (Thực hành)', 'MM219_TH', 'ThS. Lê Kim Châu', 'Thứ 6, Tiết 6-8', 'E.1043', 30),
('MM220.N01', 'Phân tích dữ liệu truyền thông số', 'MM220', 'PGS.TS Phạm Kim Châu', 'Thứ 7, Tiết 8-10', 'E.1044', 60),
('MM220_TH.N01', 'Phân tích dữ liệu truyền thông số (Thực hành)', 'MM220_TH', 'ThS. Hoàng Kim Châu', 'Thứ 2, Tiết 1-3', 'E.1045', 30),
('MM221.N01', 'Chuyên đề các vấn đề hiện đại trong Truyền thông đa phương tiện', 'MM221', 'TS. Huỳnh Kim Châu', 'Thứ 3, Tiết 4-5', 'E.1046', 60),
('MM222.N01', 'An ninh thông tin trong truyền thông đa phương tiện', 'MM222', 'ThS. Phan Kim Châu', 'Thứ 4, Tiết 6-8', 'E.1047', 60),
('MM222_TH.N01', 'An ninh thông tin trong truyền thông đa phương tiện (Thực hành)', 'MM222_TH', 'PGS.TS Vũ Kim Châu', 'Thứ 5, Tiết 8-10', 'E.1048', 30),
('MM223.N01', 'Kể chuyện tương tác', 'MM223', 'ThS. Võ Kim Châu', 'Thứ 6, Tiết 1-3', 'E.1049', 60),
('MM223_TH.N01', 'Kể chuyện tương tác (Thực hành)', 'MM223_TH', 'TS. Đặng Kim Châu', 'Thứ 7, Tiết 4-5', 'E.1050', 30),
('MM224.N01', 'Hình họa cơ bản', 'MM224', 'ThS. Bùi Kim Châu', 'Thứ 2, Tiết 6-8', 'E.1051', 60),
('MM224_TH.N01', 'Hình họa cơ bản (Thực hành)', 'MM224_TH', 'PGS.TS Đỗ Kim Châu', 'Thứ 3, Tiết 8-10', 'E.1052', 30),
('MM301.N01', 'Đồ án Truyền thông đa phương tiện', 'MM301', 'ThS. Hồ Kim Châu', 'Thứ 4, Tiết 1-3', 'E.1053', 30),
('MM302.N01', 'Thực tập', 'MM302', 'TS. Ngô Kim Châu', 'Thứ 5, Tiết 4-5', 'E.1054', 30),
('MM304.N01', 'Khởi nghiệp ngành Truyền thông đa phương tiện', 'MM304', 'ThS. Dương Kim Châu', 'Thứ 6, Tiết 6-8', 'E.1055', 60),
('MM504.N01', 'Đồ án tốt nghiệp', 'MM504', 'PGS.TS Lý Kim Châu', 'Thứ 7, Tiết 8-10', 'E.1056', 30),
('MM505.N01', 'Khóa luận tốt nghiệp', 'MM505', 'ThS. Mai Kim Châu', 'Thứ 2, Tiết 1-3', 'E.1057', 30),
('MM506.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'MM506', 'TS. Tạ Kim Châu', 'Thứ 3, Tiết 4-5', 'E.1058', 30),
('MSIS207.N01', 'Phát triển ứng dụng web', 'MSIS207', 'ThS. Đinh Kim Châu', 'Thứ 4, Tiết 6-8', 'I.1059', 60),
('MSIS2433.N01', 'Lập trình hướng đối tượng', 'MSIS2433', 'PGS.TS Cao Kim Châu', 'Thứ 5, Tiết 8-10', 'I.1060', 60),
('MSIS3033.N01', 'Quản lý dự án hệ thống thông tin', 'MSIS3033', 'ThS. Nguyễn Mai Châu', 'Thứ 6, Tiết 1-3', 'I.1061', 60),
('MSIS3233.N01', 'Khoa học quản lý', 'MSIS3233', 'TS. Trần Mai Châu', 'Thứ 7, Tiết 4-5', 'I.1062', 60),
('MSIS3242.N01', 'Quản lý chất lượng phần mềm', 'MSIS3242', 'ThS. Lê Mai Châu', 'Thứ 2, Tiết 6-8', 'I.1063', 60),
('MSIS3243.N01', 'Lý thuyết quyết định quản lý', 'MSIS3243', 'PGS.TS Phạm Mai Châu', 'Thứ 3, Tiết 8-10', 'I.1064', 60),
('MSIS3303.N01', 'Phân tích thiết kế hệ thống', 'MSIS3303', 'ThS. Hoàng Mai Châu', 'Thứ 4, Tiết 1-3', 'I.1065', 60),
('MSIS3303_TH.N01', 'Phân tích thiết kế hệ thống (Thực hành)', 'MSIS3303_TH', 'TS. Huỳnh Mai Châu', 'Thứ 5, Tiết 4-5', 'I.1066', 30),
('MSIS4013.N01', 'Thiết kế, quản lý và quản trị hệ CSDL', 'MSIS4013', 'ThS. Phan Mai Châu', 'Thứ 6, Tiết 6-8', 'I.1067', 60),
('MSIS402.N01', 'Điện toán đám mây', 'MSIS402', 'PGS.TS Vũ Mai Châu', 'Thứ 7, Tiết 8-10', 'I.1068', 60),
('MSIS405.N01', 'Dữ liệu lớn', 'MSIS405', 'ThS. Võ Mai Châu', 'Thứ 2, Tiết 1-3', 'I.1069', 60),
('MSIS406.N01', 'Dữ liệu lớn trên nền điện toán đám mây', 'MSIS406', 'TS. Đặng Mai Châu', 'Thứ 3, Tiết 4-5', 'I.1070', 60),
('MSIS406_TH.N01', 'Dữ liệu lớn trên nền điện toán đám mây (Thực hành)', 'MSIS406_TH', 'ThS. Bùi Mai Châu', 'Thứ 4, Tiết 6-8', 'I.1071', 30),
('MSIS4133.N01', 'Công nghệ thông tin trong thương mại điện tử', 'MSIS4133', 'PGS.TS Đỗ Mai Châu', 'Thứ 5, Tiết 8-10', 'I.1072', 60),
('MSIS4243.N01', 'Điều khiển và giám sát hệ thống thông tin', 'MSIS4243', 'ThS. Hồ Mai Châu', 'Thứ 6, Tiết 1-3', 'I.1073', 60),
('MSIS4263.N01', 'Các ứng dụng thông minh và hỗ trợ ra quyết định', 'MSIS4263', 'TS. Ngô Mai Châu', 'Thứ 7, Tiết 4-5', 'I.1074', 60),
('MSIS4363.N01', 'Các chủ đề nâng cao trong phát triển hệ thống', 'MSIS4363', 'ThS. Dương Mai Châu', 'Thứ 2, Tiết 6-8', 'I.1075', 60),
('MSIS4443.N01', 'Các hệ thống mô phỏng trên máy tính', 'MSIS4443', 'PGS.TS Lý Mai Châu', 'Thứ 3, Tiết 8-10', 'I.1076', 60),
('MSIS4523.N01', 'Hệ truyền thông dữ liệu', 'MSIS4523', 'ThS. Mai Mai Châu', 'Thứ 4, Tiết 1-3', 'I.1077', 60),
('MSIS4800.N01', 'Hệ thống thông tin tính toán', 'MSIS4800', 'TS. Tạ Mai Châu', 'Thứ 5, Tiết 4-5', 'I.1078', 60),
('MSIS4801.N01', 'Quản lý thông tin địa lý', 'MSIS4801', 'ThS. Đinh Mai Châu', 'Thứ 6, Tiết 6-8', 'I.1079', 60),
('MSIS4801_TH.N01', 'Quản lý thông tin địa lý (Thực hành)', 'MSIS4801_TH', 'PGS.TS Cao Mai Châu', 'Thứ 7, Tiết 8-10', 'I.1080', 30),
('MSIS5723.N01', 'Phân tích thiết kế hệ thống thông tin', 'MSIS5723', 'ThS. Nguyễn Xuân Châu', 'Thứ 2, Tiết 1-3', 'I.1081', 60),
('MSIS5723_TH.N01', 'Phân tích thiết kế hệ thống thông tin (Thực hành)', 'MSIS5723_TH', 'TS. Trần Xuân Châu', 'Thứ 3, Tiết 4-5', 'I.1082', 30),
('NHJP1.N01', 'Tiếng Nhật Sơ cấp 1', 'NHJP1', 'ThS. Lê Xuân Châu', 'Thứ 4, Tiết 6-8', 'B.1083', 60),
('NHJP2.N01', 'Tiếng Nhật Sơ cấp 2', 'NHJP2', 'PGS.TS Phạm Xuân Châu', 'Thứ 5, Tiết 8-10', 'B.1084', 60),
('NNH050.N01', 'Ngôn ngữ quảng cáo', 'NNH050', 'ThS. Hoàng Xuân Châu', 'Thứ 6, Tiết 1-3', 'B.1085', 60),
('NT005.N01', 'Giới thiệu ngành Mạng máy tính và Truyền thông dữ liệu', 'NT005', 'TS. Huỳnh Xuân Châu', 'Thứ 7, Tiết 4-5', 'N.1086', 60),
('NT015.N01', 'Giới thiệu ngành An toàn Thông tin', 'NT015', 'ThS. Phan Xuân Châu', 'Thứ 2, Tiết 6-8', 'N.1087', 60),
('NT101.N01', 'An toàn mạng máy tính', 'NT101', 'PGS.TS Vũ Xuân Châu', 'Thứ 3, Tiết 8-10', 'N.1088', 60),
('NT101_TH.N01', 'An toàn mạng máy tính (Thực hành)', 'NT101_TH', 'ThS. Võ Xuân Châu', 'Thứ 4, Tiết 1-3', 'N.1089', 30),
('NT102.N01', 'Điện tử cho công nghệ thông tin', 'NT102', 'TS. Đặng Xuân Châu', 'Thứ 5, Tiết 4-5', 'N.1090', 60),
('NT102_TH.N01', 'Điện tử cho công nghệ thông tin (Thực hành)', 'NT102_TH', 'ThS. Bùi Xuân Châu', 'Thứ 6, Tiết 6-8', 'N.1091', 30),
('NT103.N01', 'Hệ điều hành Linux', 'NT103', 'PGS.TS Đỗ Xuân Châu', 'Thứ 7, Tiết 8-10', 'N.1092', 60),
('NT103_TH.N01', 'Hệ điều hành Linux (Thực hành)', 'NT103_TH', 'ThS. Hồ Xuân Châu', 'Thứ 2, Tiết 1-3', 'N.1093', 30),
('NT104.N01', 'Lý thuyết thông tin', 'NT104', 'TS. Ngô Xuân Châu', 'Thứ 3, Tiết 4-5', 'N.1094', 60),
('NT105.N01', 'Truyền dữ liệu', 'NT105', 'ThS. Dương Xuân Châu', 'Thứ 4, Tiết 6-8', 'N.1095', 60),
('NT105_TH.N01', 'Truyền dữ liệu (Thực hành)', 'NT105_TH', 'PGS.TS Lý Xuân Châu', 'Thứ 5, Tiết 8-10', 'N.1096', 30),
('NT106.N01', 'Lập trình mạng căn bản', 'NT106', 'ThS. Mai Xuân Châu', 'Thứ 6, Tiết 1-3', 'N.1097', 60),
('NT107.N01', 'Xử lý tín hiệu trong truyển thông', 'NT107', 'TS. Tạ Xuân Châu', 'Thứ 7, Tiết 4-5', 'N.1098', 60),
('NT107_TH.N01', 'Xử lý tín hiệu trong truyển thông (Thực hành)', 'NT107_TH', 'ThS. Đinh Xuân Châu', 'Thứ 2, Tiết 6-8', 'N.1099', 30),
('NT108.N01', 'Mạng truyền thông và di động', 'NT108', 'PGS.TS Cao Xuân Châu', 'Thứ 3, Tiết 8-10', 'N.1100', 60),
('NT109.N01', 'Lập trình ứng dụng mạng', 'NT109', 'ThS. Nguyễn Nhật Châu', 'Thứ 4, Tiết 1-3', 'N.1101', 60),
('NT110.N01', 'Tín hiệu và mạch', 'NT110', 'TS. Trần Nhật Châu', 'Thứ 5, Tiết 4-5', 'N.1102', 60),
('NT111.N01', 'Thiết bị mạng và truyền thông ĐPT', 'NT111', 'ThS. Lê Nhật Châu', 'Thứ 6, Tiết 6-8', 'N.1103', 60),
('NT111_TH.N01', 'Thiết bị mạng và truyền thông ĐPT (Thực hành)', 'NT111_TH', 'PGS.TS Phạm Nhật Châu', 'Thứ 7, Tiết 8-10', 'N.1104', 30),
('NT112.N01', 'Công nghệ mạng viễn thông', 'NT112', 'ThS. Hoàng Nhật Châu', 'Thứ 2, Tiết 1-3', 'N.1105', 60),
('NT112_TH.N01', 'Công nghệ mạng viễn thông (Thực hành)', 'NT112_TH', 'TS. Huỳnh Nhật Châu', 'Thứ 3, Tiết 4-5', 'N.1106', 30),
('NT113.N01', 'Thiết kế Mạng', 'NT113', 'ThS. Phan Nhật Châu', 'Thứ 4, Tiết 6-8', 'N.1107', 60),
('NT113_TH.N01', 'Thiết kế Mạng (Thực hành)', 'NT113_TH', 'PGS.TS Vũ Nhật Châu', 'Thứ 5, Tiết 8-10', 'N.1108', 30),
('NT114.N01', 'Đồ án chuyên ngành', 'NT114', 'ThS. Võ Nhật Châu', 'Thứ 6, Tiết 1-3', 'N.1109', 30),
('NT115.N01', 'Thực tập doanh nghiệp', 'NT115', 'TS. Đặng Nhật Châu', 'Thứ 7, Tiết 4-5', 'N.1110', 60),
('NT116.N01', 'Kỹ năng mềm', 'NT116', 'ThS. Bùi Nhật Châu', 'Thứ 2, Tiết 6-8', 'N.1111', 30),
('NT117.N01', 'Đồ án môn học Lập trình ứng dụng Mạng', 'NT117', 'PGS.TS Đỗ Nhật Châu', 'Thứ 3, Tiết 8-10', 'N.1112', 30),
('NT118.N01', 'Phát triển ứng dụng trên thiết bị di động', 'NT118', 'ThS. Hồ Nhật Châu', 'Thứ 4, Tiết 1-3', 'N.1113', 60),
('NT118_TH.N01', 'Phát triển ứng dụng trên thiết bị di động (Thực hành)', 'NT118_TH', 'TS. Ngô Nhật Châu', 'Thứ 5, Tiết 4-5', 'N.1114', 30),
('NT119.N01', 'Mật mã học', 'NT119', 'ThS. Dương Nhật Châu', 'Thứ 6, Tiết 6-8', 'N.1115', 60),
('NT121.N01', 'Thiết bị mạng và truyền thông ĐPT', 'NT121', 'PGS.TS Lý Nhật Châu', 'Thứ 7, Tiết 8-10', 'N.1116', 60),
('NT121_TH.N01', 'Thiết bị mạng và truyền thông ĐPT (Thực hành)', 'NT121_TH', 'ThS. Mai Nhật Châu', 'Thứ 2, Tiết 1-3', 'N.1117', 30),
('NT130.N01', 'Cơ chế hoạt động của mã độc', 'NT130', 'TS. Tạ Nhật Châu', 'Thứ 3, Tiết 4-5', 'N.1118', 60),
('NT131.N01', 'Hệ thống nhúng Mạng không dây', 'NT131', 'ThS. Đinh Nhật Châu', 'Thứ 4, Tiết 6-8', 'N.1119', 60),
('NT131_TH.N01', 'Hệ thống nhúng Mạng không dây (Thực hành)', 'NT131_TH', 'PGS.TS Cao Nhật Châu', 'Thứ 5, Tiết 8-10', 'N.1120', 30),
('NT132.N01', 'Quản trị mạng và hệ thống', 'NT132', 'ThS. Nguyễn Trọng Châu', 'Thứ 6, Tiết 1-3', 'N.1121', 60),
('NT132_TH.N01', 'Quản trị mạng và hệ thống (Thực hành)', 'NT132_TH', 'TS. Trần Trọng Châu', 'Thứ 7, Tiết 4-5', 'N.1122', 30),
('NT133.N01', 'An toàn kiến trúc hệ thống', 'NT133', 'ThS. Lê Trọng Châu', 'Thứ 2, Tiết 6-8', 'N.1123', 60),
('NT137.N01', 'Kỹ thuật phân tích mã độc', 'NT137', 'PGS.TS Phạm Trọng Châu', 'Thứ 3, Tiết 8-10', 'N.1124', 60),
('NT137_TH.N01', 'Kỹ thuật phân tích mã độc (Thực hành)', 'NT137_TH', 'ThS. Hoàng Trọng Châu', 'Thứ 4, Tiết 1-3', 'N.1125', 30),
('NT140.N01', 'An toàn mạng', 'NT140', 'TS. Huỳnh Trọng Châu', 'Thứ 5, Tiết 4-5', 'N.1126', 60),
('NT140_TH.N01', 'An toàn mạng (Thực hành)', 'NT140_TH', 'ThS. Phan Trọng Châu', 'Thứ 6, Tiết 6-8', 'N.1127', 30),
('NT201.N01', 'Phân tích thiết kế hệ thống truyền thông và mạng', 'NT201', 'PGS.TS Vũ Trọng Châu', 'Thứ 7, Tiết 8-10', 'N.1128', 60),
('NT202.N01', 'Đồ án môn Lập trình ứng dụng mạng', 'NT202', 'ThS. Võ Trọng Châu', 'Thứ 2, Tiết 1-3', 'N.1129', 30),
('NT203.N01', 'Đồ án chuyên ngành', 'NT203', 'TS. Đặng Trọng Châu', 'Thứ 3, Tiết 4-5', 'N.1130', 30),
('NT204.N01', 'Hệ thống tìm kiếm, phát hiện và ngăn ngừa xâm nhập', 'NT204', 'ThS. Bùi Trọng Châu', 'Thứ 4, Tiết 6-8', 'N.1131', 60),
('NT204_TH.N01', 'Hệ thống tìm kiếm, phát hiện và ngăn ngừa xâm nhập (Thực hành)', 'NT204_TH', 'PGS.TS Đỗ Trọng Châu', 'Thứ 5, Tiết 8-10', 'N.1132', 30),
('NT205.N01', 'Tấn công mạng', 'NT205', 'ThS. Hồ Trọng Châu', 'Thứ 6, Tiết 1-3', 'N.1133', 60),
('NT205_TH.N01', 'Tấn công mạng (Thực hành)', 'NT205_TH', 'TS. Ngô Trọng Châu', 'Thứ 7, Tiết 4-5', 'N.1134', 30),
('NT206.N01', 'Quản trị hệ thống mạng', 'NT206', 'ThS. Dương Trọng Châu', 'Thứ 2, Tiết 6-8', 'N.1135', 60),
('NT206_TH.N01', 'Quản trị hệ thống mạng (Thực hành)', 'NT206_TH', 'PGS.TS Lý Trọng Châu', 'Thứ 3, Tiết 8-10', 'N.1136', 30),
('NT207.N01', 'Quản lý rủi ro và an toàn thông tin trong doanh nghiệp', 'NT207', 'ThS. Mai Trọng Châu', 'Thứ 4, Tiết 1-3', 'N.1137', 60),
('NT207_TH.N01', 'Quản lý rủi ro và an toàn thông tin trong doanh nghiệp (Thực hành)', 'NT207_TH', 'TS. Tạ Trọng Châu', 'Thứ 5, Tiết 4-5', 'N.1138', 30),
('NT208.N01', 'Lập trình ứng dụng Web', 'NT208', 'ThS. Đinh Trọng Châu', 'Thứ 6, Tiết 6-8', 'N.1139', 60),
('NT209.N01', 'Lập trình hệ thống', 'NT209', 'PGS.TS Cao Trọng Châu', 'Thứ 7, Tiết 8-10', 'N.1140', 60),
('NT210.N01', 'Thương mại Điện tử và Triển khai ứng dụng', 'NT210', 'ThS. Nguyễn Phúc Châu', 'Thứ 2, Tiết 1-3', 'N.1141', 60),
('NT211.N01', 'An ninh nhân sự, định danh và chứng thực', 'NT211', 'TS. Trần Phúc Châu', 'Thứ 3, Tiết 4-5', 'N.1142', 60),
('NT211_TH.N01', 'An ninh nhân sự, định danh và chứng thực (Thực hành)', 'NT211_TH', 'ThS. Lê Phúc Châu', 'Thứ 4, Tiết 6-8', 'N.1143', 30),
('NT212.N01', 'An toàn dữ liệu, khôi phục thông tin sau sự cố', 'NT212', 'PGS.TS Phạm Phúc Châu', 'Thứ 5, Tiết 8-10', 'N.1144', 60),
('NT213.N01', 'Bảo mật web và ứng dụng', 'NT213', 'ThS. Hoàng Phúc Châu', 'Thứ 6, Tiết 1-3', 'N.1145', 60),
('NT213_TH.N01', 'Bảo mật web và ứng dụng (Thực hành)', 'NT213_TH', 'TS. Huỳnh Phúc Châu', 'Thứ 7, Tiết 4-5', 'N.1146', 30),
('NT215.N01', 'Thực tập doanh nghiệp', 'NT215', 'ThS. Phan Phúc Châu', 'Thứ 2, Tiết 6-8', 'N.1147', 60),
('NT216.N01', 'Bảo mật hệ thống dữ liệu', 'NT216', 'PGS.TS Vũ Phúc Châu', 'Thứ 3, Tiết 8-10', 'N.1148', 60),
('NT216_TH.N01', 'Bảo mật hệ thống dữ liệu (Thực hành)', 'NT216_TH', 'ThS. Võ Phúc Châu', 'Thứ 4, Tiết 1-3', 'N.1149', 30),
('NT219.N01', 'Mật mã học', 'NT219', 'TS. Đặng Phúc Châu', 'Thứ 5, Tiết 4-5', 'N.1150', 60),
('NT219_TH.N01', 'Mật mã học (Thực hành)', 'NT219_TH', 'ThS. Bùi Phúc Châu', 'Thứ 6, Tiết 6-8', 'N.1151', 30),
('NT230.N01', 'Cơ chế hoạt động của mã độc', 'NT230', 'PGS.TS Đỗ Phúc Châu', 'Thứ 7, Tiết 8-10', 'N.1152', 60),
('NT230_TH.N01', 'Cơ chế hoạt động của mã độc (Thực hành)', 'NT230_TH', 'ThS. Hồ Phúc Châu', 'Thứ 2, Tiết 1-3', 'N.1153', 30),
('NT301.N01', 'Quản trị hệ thống mạng', 'NT301', 'TS. Ngô Phúc Châu', 'Thứ 3, Tiết 4-5', 'N.1154', 60),
('NT302.N01', 'Xây dựng chuẩn chính sách an toàn thông tin trong doanh nghiệp', 'NT302', 'ThS. Dương Phúc Châu', 'Thứ 4, Tiết 6-8', 'N.1155', 60),
('NT302_TH.N01', 'Xây dựng chuẩn chính sách an toàn thông tin trong doanh nghiệp (Thực hành)', 'NT302_TH', 'PGS.TS Lý Phúc Châu', 'Thứ 5, Tiết 8-10', 'N.1156', 30),
('NT303.N01', 'Công nghệ thoại IP', 'NT303', 'ThS. Mai Phúc Châu', 'Thứ 6, Tiết 1-3', 'N.1157', 60),
('NT303_TH.N01', 'Công nghệ thoại IP (Thực hành)', 'NT303_TH', 'TS. Tạ Phúc Châu', 'Thứ 7, Tiết 4-5', 'N.1158', 30),
('NT304.N01', 'Ứng dụng truyền thông và an ninh thông tin', 'NT304', 'ThS. Đinh Phúc Châu', 'Thứ 2, Tiết 6-8', 'N.1159', 60),
('NT304_TH.N01', 'Ứng dụng truyền thông và an ninh thông tin (Thực hành)', 'NT304_TH', 'PGS.TS Cao Phúc Châu', 'Thứ 3, Tiết 8-10', 'N.1160', 30),
('NT305.N01', 'Phát triển ứng dụng trên thiết bị di động', 'NT305', 'ThS. Nguyễn Đình Châu', 'Thứ 4, Tiết 1-3', 'N.1161', 60),
('NT305_TH.N01', 'Phát triển ứng dụng trên thiết bị di động (Thực hành)', 'NT305_TH', 'TS. Trần Đình Châu', 'Thứ 5, Tiết 4-5', 'N.1162', 30),
('NT306.N01', 'Kỹ thuật lập trình mạng trên Linux', 'NT306', 'ThS. Lê Đình Châu', 'Thứ 6, Tiết 6-8', 'N.1163', 60),
('NT307.N01', 'Xây dựng ứng dụng web', 'NT307', 'PGS.TS Phạm Đình Châu', 'Thứ 7, Tiết 8-10', 'N.1164', 60),
('NT309.N01', 'Lập trình trên Linux', 'NT309', 'ThS. Hoàng Đình Châu', 'Thứ 2, Tiết 1-3', 'N.1165', 60),
('NT309_TH.N01', 'Lập trình trên Linux (Thực hành)', 'NT309_TH', 'TS. Huỳnh Đình Châu', 'Thứ 3, Tiết 4-5', 'N.1166', 30),
('NT310.N01', 'Pháp chứng mạng di động', 'NT310', 'ThS. Phan Đình Châu', 'Thứ 4, Tiết 6-8', 'N.1167', 60),
('NT310_TH.N01', 'Pháp chứng mạng di động (Thực hành)', 'NT310_TH', 'PGS.TS Vũ Đình Châu', 'Thứ 5, Tiết 8-10', 'N.1168', 30),
('NT311.N01', 'Công nghệ tường lửa và bảo vệ mạng ngoại vi', 'NT311', 'ThS. Võ Đình Châu', 'Thứ 6, Tiết 1-3', 'N.1169', 60),
('NT311_TH.N01', 'Công nghệ tường lửa và bảo vệ mạng ngoại vi (Thực hành)', 'NT311_TH', 'TS. Đặng Đình Châu', 'Thứ 7, Tiết 4-5', 'N.1170', 30),
('NT312.N01', 'Bảo mật với smartcard và NFC', 'NT312', 'ThS. Bùi Đình Châu', 'Thứ 2, Tiết 6-8', 'N.1171', 60),
('NT312_TH.N01', 'Bảo mật với smartcard và NFC (Thực hành)', 'NT312_TH', 'PGS.TS Đỗ Đình Châu', 'Thứ 3, Tiết 8-10', 'N.1172', 30),
('NT320.N01', 'Công nghệ vệ "TINH"', 'NT320', 'ThS. Hồ Đình Châu', 'Thứ 4, Tiết 1-3', 'N.1173', 60),
('NT321.N01', 'Hệ thống tìm kiếm, phát hiện và ngăn ngừa xâm nhập', 'NT321', 'TS. Ngô Đình Châu', 'Thứ 5, Tiết 4-5', 'N.1174', 60),
('NT321_TH.N01', 'Hệ thống tìm kiếm, phát hiện và ngăn ngừa xâm nhập (Thực hành)', 'NT321_TH', 'ThS. Dương Đình Châu', 'Thứ 6, Tiết 6-8', 'N.1175', 30),
('NT330.N01', 'An toàn mạng không dây và di động', 'NT330', 'PGS.TS Lý Đình Châu', 'Thứ 7, Tiết 8-10', 'N.1176', 60),
('NT330_TH.N01', 'An toàn mạng không dây và di động (Thực hành)', 'NT330_TH', 'ThS. Mai Đình Châu', 'Thứ 2, Tiết 1-3', 'N.1177', 30),
('NT331.N01', 'Xây dựng chuẩn chính sách an toàn thông tin trong doanh nghiệp', 'NT331', 'TS. Tạ Đình Châu', 'Thứ 3, Tiết 4-5', 'N.1178', 60),
('NT332.N01', 'Xử lý tín hiệu trong truyền thông', 'NT332', 'ThS. Đinh Đình Châu', 'Thứ 4, Tiết 6-8', 'N.1179', 60),
('NT332_TH.N01', 'Xử lý tín hiệu trong truyền thông (Thực hành)', 'NT332_TH', 'PGS.TS Cao Đình Châu', 'Thứ 5, Tiết 8-10', 'N.1180', 30),
('NT333.N01', 'Tính toán lưới', 'NT333', 'ThS. Nguyễn Hồng Châu', 'Thứ 6, Tiết 1-3', 'N.1181', 60),
('NT334.N01', 'Pháp chứng kỹ thuật số', 'NT334', 'TS. Trần Hồng Châu', 'Thứ 7, Tiết 4-5', 'N.1182', 60),
('NT334_TH.N01', 'Pháp chứng kỹ thuật số (Thực hành)', 'NT334_TH', 'ThS. Lê Hồng Châu', 'Thứ 2, Tiết 6-8', 'N.1183', 30),
('NT395.N01', 'Phát triển ứng dụng trên thiết bị di động', 'NT395', 'PGS.TS Phạm Hồng Châu', 'Thứ 3, Tiết 8-10', 'N.1184', 60),
('NT395_TH.N01', 'Phát triển ứng dụng trên thiết bị di động (Thực hành)', 'NT395_TH', 'ThS. Hoàng Hồng Châu', 'Thứ 4, Tiết 1-3', 'N.1185', 30),
('NT401.N01', 'An toàn mạng nâng cao', 'NT401', 'TS. Huỳnh Hồng Châu', 'Thứ 5, Tiết 4-5', 'N.1186', 60),
('NT401_TH.N01', 'An toàn mạng nâng cao (Thực hành)', 'NT401_TH', 'ThS. Phan Hồng Châu', 'Thứ 6, Tiết 6-8', 'N.1187', 30),
('NT402.N01', 'Công nghệ mạng viễn thông', 'NT402', 'PGS.TS Vũ Hồng Châu', 'Thứ 7, Tiết 8-10', 'N.1188', 60),
('NT402_TH.N01', 'Công nghệ mạng viễn thông (Thực hành)', 'NT402_TH', 'ThS. Võ Hồng Châu', 'Thứ 2, Tiết 1-3', 'N.1189', 30),
('NT403.N01', 'Tính toán lưới', 'NT403', 'TS. Đặng Hồng Châu', 'Thứ 3, Tiết 4-5', 'N.1190', 60),
('NT403_TH.N01', 'Tính toán lưới (Thực hành)', 'NT403_TH', 'ThS. Bùi Hồng Châu', 'Thứ 4, Tiết 6-8', 'N.1191', 30),
('NT404.N01', 'Khóa luận tốt nghiệp', 'NT404', 'PGS.TS Đỗ Hồng Châu', 'Thứ 5, Tiết 8-10', 'N.1192', 60),
('NT405.N01', 'Bảo mật Internet', 'NT405', 'ThS. Hồ Hồng Châu', 'Thứ 6, Tiết 1-3', 'N.1193', 60),
('NT406.N01', 'Đồ án tốt nghiệp', 'NT406', 'TS. Ngô Hồng Châu', 'Thứ 7, Tiết 4-5', 'N.1194', 60),
('NT407.N01', 'Pháp chứng kỹ thuật số', 'NT407', 'ThS. Dương Hồng Châu', 'Thứ 2, Tiết 6-8', 'N.1195', 60),
('NT407_TH.N01', 'Pháp chứng kỹ thuật số (Thực hành)', 'NT407_TH', 'PGS.TS Lý Hồng Châu', 'Thứ 3, Tiết 8-10', 'N.1196', 30),
('NT408.N01', 'Bảo mật trên Internet', 'NT408', 'ThS. Mai Hồng Châu', 'Thứ 4, Tiết 1-3', 'N.1197', 60),
('NT408_TH.N01', 'Bảo mật trên Internet (Thực hành)', 'NT408_TH', 'TS. Tạ Hồng Châu', 'Thứ 5, Tiết 4-5', 'N.1198', 30),
('NT501.N01', 'Thực tập doanh nghiệp', 'NT501', 'ThS. Đinh Hồng Châu', 'Thứ 6, Tiết 6-8', 'N.1199', 60),
('NT502.N01', 'Thương mại Điện tử và Triển khai ứng dụng', 'NT502', 'PGS.TS Cao Hồng Châu', 'Thứ 7, Tiết 8-10', 'N.1200', 60),
('NT503.N01', 'Bảo mật Internet', 'NT503', 'ThS. Nguyễn Minh Dũng', 'Thứ 2, Tiết 1-3', 'N.1201', 60),
('NT504.N01', 'Tiểu luận tốt nghiệp', 'NT504', 'TS. Trần Minh Dũng', 'Thứ 3, Tiết 4-5', 'N.1202', 60),
('NT505.N01', 'Khóa luận tốt nghiệp', 'NT505', 'ThS. Lê Minh Dũng', 'Thứ 4, Tiết 6-8', 'N.1203', 60),
('NT506.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'NT506', 'PGS.TS Phạm Minh Dũng', 'Thứ 5, Tiết 8-10', 'N.1204', 60),
('NT507.N01', 'Xây dựng ứng dụng web', 'NT507', 'ThS. Hoàng Minh Dũng', 'Thứ 6, Tiết 1-3', 'N.1205', 60),
('NT507_TH.N01', 'Xây dựng ứng dụng web (Thực hành)', 'NT507_TH', 'TS. Huỳnh Minh Dũng', 'Thứ 7, Tiết 4-5', 'N.1206', 30),
('NT508.N01', 'Đồ án tốt nghiệp', 'NT508', 'ThS. Phan Minh Dũng', 'Thứ 2, Tiết 6-8', 'N.1207', 60),
('NT509.N01', 'Hệ thống đa tác tử di động thông minh', 'NT509', 'PGS.TS Vũ Minh Dũng', 'Thứ 3, Tiết 8-10', 'N.1208', 60),
('NT509_TH.N01', 'Hệ thống đa tác tử di động thông minh (Thực hành)', 'NT509_TH', 'ThS. Võ Minh Dũng', 'Thứ 4, Tiết 1-3', 'N.1209', 30),
('NT521.N01', 'Lập trình an toàn và khai thác lỗ hổng phần mềm', 'NT521', 'TS. Đặng Minh Dũng', 'Thứ 5, Tiết 4-5', 'N.1210', 60),
('NT522.N01', 'Phương pháp học máy trong an toàn thông tin', 'NT522', 'ThS. Bùi Minh Dũng', 'Thứ 6, Tiết 6-8', 'N.1211', 60),
('NT522_TH.N01', 'Phương pháp học máy trong an toàn thông tin (Thực hành)', 'NT522_TH', 'PGS.TS Đỗ Minh Dũng', 'Thứ 7, Tiết 8-10', 'N.1212', 30),
('NT523.N01', 'An toàn thông tin trong kỷ nguyên máy tính lượng tử', 'NT523', 'ThS. Hồ Minh Dũng', 'Thứ 2, Tiết 1-3', 'N.1213', 60),
('NT523_TH.N01', 'An toàn thông tin trong kỷ nguyên máy tính lượng tử (Thực hành)', 'NT523_TH', 'TS. Ngô Minh Dũng', 'Thứ 3, Tiết 4-5', 'N.1214', 30),
('NT524.N01', 'Kiến trúc và Bảo mật Điện toán Đám mây', 'NT524', 'ThS. Dương Minh Dũng', 'Thứ 4, Tiết 6-8', 'N.1215', 60),
('NT524_TH.N01', 'Kiến trúc và Bảo mật Điện toán Đám mây (Thực hành)', 'NT524_TH', 'PGS.TS Lý Minh Dũng', 'Thứ 5, Tiết 8-10', 'N.1216', 30),
('NT531.N01', 'Đánh giá hiệu năng hệ thống mạng máy tính', 'NT531', 'ThS. Mai Minh Dũng', 'Thứ 6, Tiết 1-3', 'N.1217', 60),
('NT531_TH.N01', 'Đánh giá hiệu năng hệ thống mạng máy tính (Thực hành)', 'NT531_TH', 'TS. Tạ Minh Dũng', 'Thứ 7, Tiết 4-5', 'N.1218', 30),
('NT532.N01', 'Công nghệ Internet of things hiện đại', 'NT532', 'ThS. Đinh Minh Dũng', 'Thứ 2, Tiết 6-8', 'N.1219', 60),
('NT532_TH.N01', 'Công nghệ Internet of things hiện đại (Thực hành)', 'NT532_TH', 'PGS.TS Cao Minh Dũng', 'Thứ 3, Tiết 8-10', 'N.1220', 30),
('NT533.N01', 'Hệ tính toán phân bố', 'NT533', 'ThS. Nguyễn Hoàng Dũng', 'Thứ 4, Tiết 1-3', 'N.1221', 60),
('NT533_TH.N01', 'Hệ tính toán phân bố (Thực hành)', 'NT533_TH', 'TS. Trần Hoàng Dũng', 'Thứ 5, Tiết 4-5', 'N.1222', 30),
('NT534.N01', 'An toàn mạng máy tính nâng cao', 'NT534', 'ThS. Lê Hoàng Dũng', 'Thứ 6, Tiết 6-8', 'N.1223', 60),
('NT534_TH.N01', 'An toàn mạng máy tính nâng cao (Thực hành)', 'NT534_TH', 'PGS.TS Phạm Hoàng Dũng', 'Thứ 7, Tiết 8-10', 'N.1224', 30),
('NT535.N01', 'Bảo mật Internet of things', 'NT535', 'ThS. Hoàng Hoàng Dũng', 'Thứ 2, Tiết 1-3', 'N.1225', 60),
('NT535_TH.N01', 'Bảo mật Internet of things (Thực hành)', 'NT535_TH', 'TS. Huỳnh Hoàng Dũng', 'Thứ 3, Tiết 4-5', 'N.1226', 30),
('NT536.N01', 'Công nghệ truyền thông đa phương tiện', 'NT536', 'ThS. Phan Hoàng Dũng', 'Thứ 4, Tiết 6-8', 'N.1227', 60),
('NT536_TH.N01', 'Công nghệ truyền thông đa phương tiện (Thực hành)', 'NT536_TH', 'PGS.TS Vũ Hoàng Dũng', 'Thứ 5, Tiết 8-10', 'N.1228', 30),
('NT537.N01', 'Truyền thông xã hội và kinh doanh', 'NT537', 'ThS. Võ Hoàng Dũng', 'Thứ 6, Tiết 1-3', 'N.1229', 60),
('NT538.N01', 'Giải thuật xử lý song song và phân bố', 'NT538', 'TS. Đặng Hoàng Dũng', 'Thứ 7, Tiết 4-5', 'N.1230', 60),
('NT538_TH.N01', 'Giải thuật xử lý song song và phân bố (Thực hành)', 'NT538_TH', 'ThS. Bùi Hoàng Dũng', 'Thứ 2, Tiết 6-8', 'N.1231', 30),
('NT539.N01', 'AI ứng dụng trong mạng và truyền thông', 'NT539', 'PGS.TS Đỗ Hoàng Dũng', 'Thứ 3, Tiết 8-10', 'N.1232', 60),
('NT539_TH.N01', 'AI ứng dụng trong mạng và truyền thông (Thực hành)', 'NT539_TH', 'ThS. Hồ Hoàng Dũng', 'Thứ 4, Tiết 1-3', 'N.1233', 30),
('NT540.N01', 'Mạng không dây thế hệ mới', 'NT540', 'TS. Ngô Hoàng Dũng', 'Thứ 5, Tiết 4-5', 'N.1234', 60),
('NT540_TH.N01', 'Mạng không dây thế hệ mới (Thực hành)', 'NT540_TH', 'ThS. Dương Hoàng Dũng', 'Thứ 6, Tiết 6-8', 'N.1235', 30),
('NT541.N01', 'Công nghệ mạng khả lập trình', 'NT541', 'PGS.TS Lý Hoàng Dũng', 'Thứ 7, Tiết 8-10', 'N.1236', 60),
('NT541_TH.N01', 'Công nghệ mạng khả lập trình (Thực hành)', 'NT541_TH', 'ThS. Mai Hoàng Dũng', 'Thứ 2, Tiết 1-3', 'N.1237', 30),
('NT542.N01', 'Lập trình kịch bản tự động hóa cho quản trị và bảo mật mạng', 'NT542', 'TS. Tạ Hoàng Dũng', 'Thứ 3, Tiết 4-5', 'N.1238', 60),
('NT542_TH.N01', 'Lập trình kịch bản tự động hóa cho quản trị và bảo mật mạng (Thực hành)', 'NT542_TH', 'ThS. Đinh Hoàng Dũng', 'Thứ 4, Tiết 6-8', 'N.1239', 30),
('NT543.N01', 'Tín hiệu và hệ thống thông tin', 'NT543', 'PGS.TS Cao Hoàng Dũng', 'Thứ 5, Tiết 8-10', 'N.1240', 60),
('NT543_TH.N01', 'Tín hiệu và hệ thống thông tin (Thực hành)', 'NT543_TH', 'ThS. Nguyễn Thanh Dũng', 'Thứ 6, Tiết 1-3', 'N.1241', 30),
('NT544.N01', 'Ăng ten và truyền thông vô tuyến', 'NT544', 'TS. Trần Thanh Dũng', 'Thứ 7, Tiết 4-5', 'N.1242', 60),
('NT544_TH.N01', 'Ăng ten và truyền thông vô tuyến (Thực hành)', 'NT544_TH', 'ThS. Lê Thanh Dũng', 'Thứ 2, Tiết 6-8', 'N.1243', 30),
('NT545.N01', 'Thiết kế hệ thống viễn thông', 'NT545', 'PGS.TS Phạm Thanh Dũng', 'Thứ 3, Tiết 8-10', 'N.1244', 60),
('NT545_TH.N01', 'Thiết kế hệ thống viễn thông (Thực hành)', 'NT545_TH', 'ThS. Hoàng Thanh Dũng', 'Thứ 4, Tiết 1-3', 'N.1245', 30),
('NT546.N01', 'Thiết kế và triển khai mạng tốc độ cao', 'NT546', 'TS. Huỳnh Thanh Dũng', 'Thứ 5, Tiết 4-5', 'N.1246', 60),
('NT546_TH.N01', 'Thiết kế và triển khai mạng tốc độ cao (Thực hành)', 'NT546_TH', 'ThS. Phan Thanh Dũng', 'Thứ 6, Tiết 6-8', 'N.1247', 30),
('NT547.N01', 'Blockchain: Nền tảng, ứng dụng và bảo mật', 'NT547', 'PGS.TS Vũ Thanh Dũng', 'Thứ 7, Tiết 8-10', 'N.1248', 60),
('NT547_TH.N01', 'Blockchain: Nền tảng, ứng dụng và bảo mật (Thực hành)', 'NT547_TH', 'ThS. Võ Thanh Dũng', 'Thứ 2, Tiết 1-3', 'N.1249', 30),
('NT548.N01', 'Công nghệ DevOps và ứng dụng', 'NT548', 'TS. Đặng Thanh Dũng', 'Thứ 3, Tiết 4-5', 'N.1250', 60),
('NT548_TH.N01', 'Công nghệ DevOps và ứng dụng (Thực hành)', 'NT548_TH', 'ThS. Bùi Thanh Dũng', 'Thứ 4, Tiết 6-8', 'N.1251', 30),
('NT549.N01', 'Học máy tăng cường cho các hệ thống mạng', 'NT549', 'PGS.TS Đỗ Thanh Dũng', 'Thứ 5, Tiết 8-10', 'N.1252', 60),
('OOPT1.N01', 'Lập trình hướng đối tượng', 'OOPT1', 'ThS. Hồ Thanh Dũng', 'Thứ 6, Tiết 1-3', 'E.1253', 60),
('OOPT1_TH.N01', 'Lập trình hướng đối tượng (Thực hành)', 'OOPT1_TH', 'TS. Ngô Thanh Dũng', 'Thứ 7, Tiết 4-5', 'E.1254', 30),
('OOPT2.N01', 'Lập trình hướng đối tượng', 'OOPT2', 'ThS. Dương Thanh Dũng', 'Thứ 2, Tiết 6-8', 'E.1255', 60),
('OOPT2_TH.N01', 'Lập trình hướng đối tượng (Thực hành)', 'OOPT2_TH', 'PGS.TS Lý Thanh Dũng', 'Thứ 3, Tiết 8-10', 'E.1256', 30),
('OSYS1.N01', 'Hệ điều hành', 'OSYS1', 'ThS. Mai Thanh Dũng', 'Thứ 4, Tiết 1-3', 'N.1257', 60),
('OSYS2.N01', 'Hệ điều hành', 'OSYS2', 'TS. Tạ Thanh Dũng', 'Thứ 5, Tiết 4-5', 'N.1258', 60),
('PE001.N01', 'Giáo dục thể chất 1', 'PE001', 'ThS. Đinh Thanh Dũng', 'Thứ 6, Tiết 6-8', 'B.1259', 60),
('PE002.N01', 'Giáo dục thể chất 2', 'PE002', 'PGS.TS Cao Thanh Dũng', 'Thứ 7, Tiết 8-10', 'B.1260', 60),
('PE003.N01', 'Giáo dục thể chất 3', 'PE003', 'ThS. Nguyễn Quang Dũng', 'Thứ 2, Tiết 1-3', 'B.1261', 60),
('PE012.N01', 'Giáo dục thể chất', 'PE012', 'TS. Trần Quang Dũng', 'Thứ 3, Tiết 4-5', 'B.1262', 60),
('PE231.N01', 'Giáo dục thể chất 1', 'PE231', 'ThS. Lê Quang Dũng', 'Thứ 4, Tiết 6-8', 'B.1263', 60),
('PE232.N01', 'Giáo dục thể chất 2', 'PE232', 'PGS.TS Phạm Quang Dũng', 'Thứ 5, Tiết 8-10', 'B.1264', 60),
('PEDU1.N01', 'Giáo dục thể chất 1', 'PEDU1', 'ThS. Hoàng Quang Dũng', 'Thứ 6, Tiết 1-3', 'B.1265', 60),
('PEDU2.N01', 'Giáo dục thể chất 2', 'PEDU2', 'TS. Huỳnh Quang Dũng', 'Thứ 7, Tiết 4-5', 'B.1266', 60),
('PH001.N01', 'Nhập môn điện tử', 'PH001', 'ThS. Phan Quang Dũng', 'Thứ 2, Tiết 6-8', 'B.1267', 60),
('PH002.N01', 'Nhập môn mạch số', 'PH002', 'PGS.TS Vũ Quang Dũng', 'Thứ 3, Tiết 8-10', 'CE.1268', 60),
('PH003.N01', 'Vật lý kỹ thuật', 'PH003', 'ThS. Võ Quang Dũng', 'Thứ 4, Tiết 1-3', 'B.1269', 60),
('PHIL1.N01', 'Những NLCB của chủ nghĩa Mác-Lênin', 'PHIL1', 'TS. Đặng Quang Dũng', 'Thứ 5, Tiết 4-5', 'B.1270', 60),
('PHIL2.N01', 'Triết học Mác-Lênin', 'PHIL2', 'ThS. Bùi Quang Dũng', 'Thứ 6, Tiết 6-8', 'B.1271', 60),
('PHY01.N01', 'Vật lý đại cương A1', 'PHY01', 'PGS.TS Đỗ Quang Dũng', 'Thứ 7, Tiết 8-10', 'B.1272', 60),
('PHY02.N01', 'Vật lý đại cương A2', 'PHY02', 'ThS. Hồ Quang Dũng', 'Thứ 2, Tiết 1-3', 'B.1273', 60),
('PHY03.N01', 'Vật lý đại cương A3', 'PHY03', 'TS. Ngô Quang Dũng', 'Thứ 3, Tiết 4-5', 'B.1274', 60),
('PHY11.N01', 'General Physics 1', 'PHY11', 'ThS. Dương Quang Dũng', 'Thứ 4, Tiết 6-8', 'B.1275', 60),
('PHY12.N01', 'General Physics 2', 'PHY12', 'PGS.TS Lý Quang Dũng', 'Thứ 5, Tiết 8-10', 'B.1276', 60),
('PHY22.N01', 'Vật lý đại cương A2 (TE1)', 'PHY22', 'ThS. Mai Quang Dũng', 'Thứ 6, Tiết 1-3', 'B.1277', 60),
('PHYS1114.N01', 'Vật lý đại cương I', 'PHYS1114', 'TS. Tạ Quang Dũng', 'Thứ 7, Tiết 4-5', 'I.1278', 60),
('PHYS1214.N01', 'Vật lý đại cương II', 'PHYS1214', 'ThS. Đinh Quang Dũng', 'Thứ 2, Tiết 6-8', 'I.1279', 60),
('PHYS1215.N01', 'Vật lý đại cương', 'PHYS1215', 'PGS.TS Cao Quang Dũng', 'Thứ 3, Tiết 8-10', 'I.1280', 60),
('QTE111.N01', 'Văn hóa giao tiếp', 'QTE111', 'ThS. Nguyễn Hữu Dũng', 'Thứ 4, Tiết 1-3', 'B.1281', 60),
('SC203.N01', 'Phương pháp "KHOA" học', 'SC203', 'TS. Trần Hữu Dũng', 'Thứ 5, Tiết 4-5', 'I.1282', 60),
('SE005.N01', 'Giới thiệu ngành Kỹ thuật Phần mềm', 'SE005', 'ThS. Lê Hữu Dũng', 'Thứ 6, Tiết 6-8', 'E.1283', 60),
('SE100.N01', 'Phương pháp Phát triển phần mềm hướng đối tượng', 'SE100', 'PGS.TS Phạm Hữu Dũng', 'Thứ 7, Tiết 8-10', 'E.1284', 60),
('SE101.N01', 'Phương pháp mô hình hóa', 'SE101', 'ThS. Hoàng Hữu Dũng', 'Thứ 2, Tiết 1-3', 'E.1285', 60),
('SE102.N01', 'Nhập môn phát triển game', 'SE102', 'TS. Huỳnh Hữu Dũng', 'Thứ 3, Tiết 4-5', 'E.1286', 60),
('SE102_TH.N01', 'Nhập môn phát triển game (Thực hành)', 'SE102_TH', 'ThS. Phan Hữu Dũng', 'Thứ 4, Tiết 6-8', 'E.1287', 30),
('SE103.N01', 'Các phương pháp lập trình', 'SE103', 'PGS.TS Vũ Hữu Dũng', 'Thứ 5, Tiết 8-10', 'E.1288', 60),
('SE103_TH.N01', 'Các phương pháp lập trình (Thực hành)', 'SE103_TH', 'ThS. Võ Hữu Dũng', 'Thứ 6, Tiết 1-3', 'E.1289', 30),
('SE104.N01', 'Nhập môn Công nghệ phần mềm', 'SE104', 'TS. Đặng Hữu Dũng', 'Thứ 7, Tiết 4-5', 'E.1290', 60),
('SE105.N01', 'Lập trình nhúng căn bản', 'SE105', 'ThS. Bùi Hữu Dũng', 'Thứ 2, Tiết 6-8', 'E.1291', 60),
('SE105_TH.N01', 'Lập trình nhúng căn bản (Thực hành)', 'SE105_TH', 'PGS.TS Đỗ Hữu Dũng', 'Thứ 3, Tiết 8-10', 'E.1292', 30),
('SE106.N01', 'Đặc tả hình thức', 'SE106', 'ThS. Hồ Hữu Dũng', 'Thứ 4, Tiết 1-3', 'E.1293', 60),
('SE107.N01', 'Phân tích thiết kế hệ thống', 'SE107', 'TS. Ngô Hữu Dũng', 'Thứ 5, Tiết 4-5', 'E.1294', 60),
('SE108.N01', 'Kiểm chứng phần mềm', 'SE108', 'ThS. Dương Hữu Dũng', 'Thứ 6, Tiết 6-8', 'E.1295', 60),
('SE109.N01', 'Phát triển, vận hành, bảo trì phần mềm', 'SE109', 'PGS.TS Lý Hữu Dũng', 'Thứ 7, Tiết 8-10', 'E.1296', 60),
('SE110.N01', 'Phương pháp Phát triển phần mềm hướng đối tượng', 'SE110', 'ThS. Mai Hữu Dũng', 'Thứ 2, Tiết 1-3', 'E.1297', 60),
('SE110_TH.N01', 'Phương pháp Phát triển phần mềm hướng đối tượng (Thực hành)', 'SE110_TH', 'TS. Tạ Hữu Dũng', 'Thứ 3, Tiết 4-5', 'E.1298', 30),
('SE111.N01', 'Đồ án mã nguồn mở', 'SE111', 'ThS. Đinh Hữu Dũng', 'Thứ 4, Tiết 6-8', 'E.1299', 60),
('SE112.N01', 'Đồ án chuyên ngành', 'SE112', 'PGS.TS Cao Hữu Dũng', 'Thứ 5, Tiết 8-10', 'E.1300', 60),
('SE113.N01', 'Kiểm chứng phần mềm', 'SE113', 'ThS. Nguyễn Gia Dũng', 'Thứ 6, Tiết 1-3', 'E.1301', 60),
('SE113_TH.N01', 'Kiểm chứng phần mềm (Thực hành)', 'SE113_TH', 'TS. Trần Gia Dũng', 'Thứ 7, Tiết 4-5', 'E.1302', 30),
('SE114.N01', 'Nhập môn ứng dụng di động', 'SE114', 'ThS. Lê Gia Dũng', 'Thứ 2, Tiết 6-8', 'E.1303', 60),
('SE115.N01', 'Phát triển game với Unity', 'SE115', 'PGS.TS Phạm Gia Dũng', 'Thứ 3, Tiết 8-10', 'E.1304', 60),
('SE116.N01', 'Phát triển kỹ năng lập trình Game ứng dụng trong thực tế', 'SE116', 'ThS. Hoàng Gia Dũng', 'Thứ 4, Tiết 1-3', 'E.1305', 60),
('SE116_TH.N01', 'Phát triển kỹ năng lập trình Game ứng dụng trong thực tế (Thực hành)', 'SE116_TH', 'TS. Huỳnh Gia Dũng', 'Thứ 5, Tiết 4-5', 'E.1306', 30),
('SE117.N01', 'Kỹ thuật lập trình', 'SE117', 'ThS. Phan Gia Dũng', 'Thứ 6, Tiết 6-8', 'E.1307', 60),
('SE117_TH.N01', 'Kỹ thuật lập trình (Thực hành)', 'SE117_TH', 'PGS.TS Vũ Gia Dũng', 'Thứ 7, Tiết 8-10', 'E.1308', 30),
('SE121.N01', 'Đồ án 1', 'SE121', 'ThS. Võ Gia Dũng', 'Thứ 2, Tiết 1-3', 'E.1309', 60),
('SE122.N01', 'Đồ án 2', 'SE122', 'TS. Đặng Gia Dũng', 'Thứ 3, Tiết 4-5', 'E.1310', 60),
('SE207.N01', 'Phân tích thiết kế hệ thống', 'SE207', 'ThS. Bùi Gia Dũng', 'Thứ 4, Tiết 6-8', 'E.1311', 60),
('SE207_TH.N01', 'Phân tích thiết kế hệ thống (Thực hành)', 'SE207_TH', 'PGS.TS Đỗ Gia Dũng', 'Thứ 5, Tiết 8-10', 'E.1312', 30),
('SE208.N01', 'Kiểm chứng phần mềm', 'SE208', 'ThS. Hồ Gia Dũng', 'Thứ 6, Tiết 1-3', 'E.1313', 60),
('SE208_TH.N01', 'Kiểm chứng phần mềm (Thực hành)', 'SE208_TH', 'TS. Ngô Gia Dũng', 'Thứ 7, Tiết 4-5', 'E.1314', 30),
('SE209.N01', 'Phát triển, vận hành, bảo trì phần mềm', 'SE209', 'ThS. Dương Gia Dũng', 'Thứ 2, Tiết 6-8', 'E.1315', 60),
('SE210.N01', 'Quản lý dự án công nghệ thông tin', 'SE210', 'PGS.TS Lý Gia Dũng', 'Thứ 3, Tiết 8-10', 'E.1316', 60),
('SE210_TH.N01', 'Quản lý dự án công nghệ thông tin (Thực hành)', 'SE210_TH', 'ThS. Mai Gia Dũng', 'Thứ 4, Tiết 1-3', 'E.1317', 30),
('SE211.N01', 'Phát triển phần mềm hướng đối tượng', 'SE211', 'TS. Tạ Gia Dũng', 'Thứ 5, Tiết 4-5', 'E.1318', 60),
('SE211_TH.N01', 'Phát triển phần mềm hướng đối tượng (Thực hành)', 'SE211_TH', 'ThS. Đinh Gia Dũng', 'Thứ 6, Tiết 6-8', 'E.1319', 30),
('SE212.N01', 'Phát triển phần mềm mã nguồn mở', 'SE212', 'PGS.TS Cao Gia Dũng', 'Thứ 7, Tiết 8-10', 'E.1320', 60),
('SE212_TH.N01', 'Phát triển phần mềm mã nguồn mở (Thực hành)', 'SE212_TH', 'ThS. Nguyễn Khánh Dũng', 'Thứ 2, Tiết 1-3', 'E.1321', 30),
('SE213.N01', 'Xử lý phân bố', 'SE213', 'TS. Trần Khánh Dũng', 'Thứ 3, Tiết 4-5', 'E.1322', 60),
('SE213_TH.N01', 'Xử lý phân bố (Thực hành)', 'SE213_TH', 'ThS. Lê Khánh Dũng', 'Thứ 4, Tiết 6-8', 'E.1323', 30),
('SE214.N01', 'Công nghệ phần mềm chuyên sâu', 'SE214', 'PGS.TS Phạm Khánh Dũng', 'Thứ 5, Tiết 8-10', 'E.1324', 60),
('SE215.N01', 'Giao tiếp người máy', 'SE215', 'ThS. Hoàng Khánh Dũng', 'Thứ 6, Tiết 1-3', 'E.1325', 60),
('SE215_TH.N01', 'Giao tiếp người máy (Thực hành)', 'SE215_TH', 'TS. Huỳnh Khánh Dũng', 'Thứ 7, Tiết 4-5', 'E.1326', 30),
('SE220.N01', 'Thiết kế Game', 'SE220', 'ThS. Phan Khánh Dũng', 'Thứ 2, Tiết 6-8', 'E.1327', 60),
('SE221.N01', 'Lập trình game nâng cao', 'SE221', 'PGS.TS Vũ Khánh Dũng', 'Thứ 3, Tiết 8-10', 'E.1328', 60),
('SE221_TH.N01', 'Lập trình game nâng cao (Thực hành)', 'SE221_TH', 'ThS. Võ Khánh Dũng', 'Thứ 4, Tiết 1-3', 'E.1329', 30),
('SE301.N01', 'Phát triển phần mềm mã nguồn mở', 'SE301', 'TS. Đặng Khánh Dũng', 'Thứ 5, Tiết 4-5', 'E.1330', 60),
('SE310.N01', 'Công nghệ .NET', 'SE310', 'ThS. Bùi Khánh Dũng', 'Thứ 6, Tiết 6-8', 'E.1331', 60),
('SE310_TH.N01', 'Công nghệ .NET (Thực hành)', 'SE310_TH', 'PGS.TS Đỗ Khánh Dũng', 'Thứ 7, Tiết 8-10', 'E.1332', 30),
('SE311.N01', 'Ngôn ngữ lập trình Java', 'SE311', 'ThS. Hồ Khánh Dũng', 'Thứ 2, Tiết 1-3', 'E.1333', 60),
('SE311_TH.N01', 'Ngôn ngữ lập trình Java (Thực hành)', 'SE311_TH', 'TS. Ngô Khánh Dũng', 'Thứ 3, Tiết 4-5', 'E.1334', 30),
('SE312.N01', 'Công nghệ .NET', 'SE312', 'ThS. Dương Khánh Dũng', 'Thứ 4, Tiết 6-8', 'E.1335', 60),
('SE313.N01', 'Một số thuật toán thông minh', 'SE313', 'PGS.TS Lý Khánh Dũng', 'Thứ 5, Tiết 8-10', 'E.1336', 60),
('SE314.N01', 'Công nghệ game 3D', 'SE314', 'ThS. Mai Khánh Dũng', 'Thứ 6, Tiết 1-3', 'E.1337', 60),
('SE314_TH.N01', 'Công nghệ game 3D (Thực hành)', 'SE314_TH', 'TS. Tạ Khánh Dũng', 'Thứ 7, Tiết 4-5', 'E.1338', 30),
('SE315.N01', 'Công nghệ game online', 'SE315', 'ThS. Đinh Khánh Dũng', 'Thứ 2, Tiết 6-8', 'E.1339', 60),
('SE316.N01', 'Phát triển Game đa nền tảng', 'SE316', 'PGS.TS Cao Khánh Dũng', 'Thứ 3, Tiết 8-10', 'E.1340', 60),
('SE316_TH.N01', 'Phát triển Game đa nền tảng (Thực hành)', 'SE316_TH', 'ThS. Nguyễn Tuấn Dũng', 'Thứ 4, Tiết 1-3', 'E.1341', 30),
('SE317.N01', 'Công nghệ tiên tiến trong phát triển game', 'SE317', 'TS. Trần Tuấn Dũng', 'Thứ 5, Tiết 4-5', 'E.1342', 60),
('SE317_TH.N01', 'Công nghệ tiên tiến trong phát triển game (Thực hành)', 'SE317_TH', 'ThS. Lê Tuấn Dũng', 'Thứ 6, Tiết 6-8', 'E.1343', 30),
('SE320.N01', 'Lập trình đồ họa 3 chiều với Direct3D', 'SE320', 'PGS.TS Phạm Tuấn Dũng', 'Thứ 7, Tiết 8-10', 'E.1344', 60),
('SE320_TH.N01', 'Lập trình đồ họa 3 chiều với Direct3D (Thực hành)', 'SE320_TH', 'ThS. Hoàng Tuấn Dũng', 'Thứ 2, Tiết 1-3', 'E.1345', 30),
('SE321.N01', 'Lập trình trên thiết bị di động', 'SE321', 'TS. Huỳnh Tuấn Dũng', 'Thứ 3, Tiết 4-5', 'E.1346', 60),
('SE322.N01', 'Công nghệ Web và ứng dụng', 'SE322', 'ThS. Phan Tuấn Dũng', 'Thứ 4, Tiết 6-8', 'E.1347', 60),
('SE323.N01', 'Thiết kế Game', 'SE323', 'PGS.TS Vũ Tuấn Dũng', 'Thứ 5, Tiết 8-10', 'E.1348', 60),
('SE324.N01', 'Nhập môn lập trình 3D game', 'SE324', 'ThS. Võ Tuấn Dũng', 'Thứ 6, Tiết 1-3', 'E.1349', 60),
('SE324_TH.N01', 'Nhập môn lập trình 3D game (Thực hành)', 'SE324_TH', 'TS. Đặng Tuấn Dũng', 'Thứ 7, Tiết 4-5', 'E.1350', 30),
('SE325.N01', 'Chuyên đề J2EE', 'SE325', 'ThS. Bùi Tuấn Dũng', 'Thứ 2, Tiết 6-8', 'E.1351', 60),
('SE326.N01', 'Cơ sở dữ liệu nâng cao', 'SE326', 'PGS.TS Đỗ Tuấn Dũng', 'Thứ 3, Tiết 8-10', 'E.1352', 60),
('SE327.N01', 'Phát triển và vận hành game', 'SE327', 'ThS. Hồ Tuấn Dũng', 'Thứ 4, Tiết 1-3', 'E.1353', 60),
('SE328.N01', 'Lập trình TTNT trong Game', 'SE328', 'TS. Ngô Tuấn Dũng', 'Thứ 5, Tiết 4-5', 'E.1354', 60),
('SE329.N01', 'Thiết kế 3D Game Engine', 'SE329', 'ThS. Dương Tuấn Dũng', 'Thứ 6, Tiết 6-8', 'E.1355', 60),
('SE329_TH.N01', 'Thiết kế 3D Game Engine (Thực hành)', 'SE329_TH', 'PGS.TS Lý Tuấn Dũng', 'Thứ 7, Tiết 8-10', 'E.1356', 30),
('SE330.N01', 'Ngôn ngữ lập trình Java', 'SE330', 'ThS. Mai Tuấn Dũng', 'Thứ 2, Tiết 1-3', 'E.1357', 60),
('SE331.N01', 'Chuyên đề E-commerce', 'SE331', 'TS. Tạ Tuấn Dũng', 'Thứ 3, Tiết 4-5', 'E.1358', 60),
('SE332.N01', 'Chuyên đề CSDL nâng cao', 'SE332', 'ThS. Đinh Tuấn Dũng', 'Thứ 4, Tiết 6-8', 'E.1359', 60),
('SE333.N01', 'Chuyên đề E-Government', 'SE333', 'PGS.TS Cao Tuấn Dũng', 'Thứ 5, Tiết 8-10', 'E.1360', 60),
('SE334.N01', 'Các phương pháp lập trình', 'SE334', 'ThS. Nguyễn Ngọc Dũng', 'Thứ 6, Tiết 1-3', 'E.1361', 60),
('SE334_TH.N01', 'Các phương pháp lập trình (Thực hành)', 'SE334_TH', 'TS. Trần Ngọc Dũng', 'Thứ 7, Tiết 4-5', 'E.1362', 30),
('SE335.N01', 'Công nghệ XML và ứng dụng', 'SE335', 'ThS. Lê Ngọc Dũng', 'Thứ 2, Tiết 6-8', 'E.1363', 60),
('SE335_TH.N01', 'Công nghệ XML và ứng dụng (Thực hành)', 'SE335_TH', 'PGS.TS Phạm Ngọc Dũng', 'Thứ 3, Tiết 8-10', 'E.1364', 30),
('SE336.N01', 'Phương pháp luận sáng tạo KH-CN', 'SE336', 'ThS. Hoàng Ngọc Dũng', 'Thứ 4, Tiết 1-3', 'E.1365', 60),
('SE337.N01', 'Các thuật toán thông minh', 'SE337', 'TS. Huỳnh Ngọc Dũng', 'Thứ 5, Tiết 4-5', 'E.1366', 60),
('SE338.N01', 'Logic mờ', 'SE338', 'ThS. Phan Ngọc Dũng', 'Thứ 6, Tiết 6-8', 'E.1367', 60),
('SE339.N01', 'Xử lý phân bổ', 'SE339', 'PGS.TS Vũ Ngọc Dũng', 'Thứ 7, Tiết 8-10', 'E.1368', 60),
('SE339_TH.N01', 'Xử lý phân bổ (Thực hành)', 'SE339_TH', 'ThS. Võ Ngọc Dũng', 'Thứ 2, Tiết 1-3', 'E.1369', 30),
('SE340.N01', 'Quản lý dự án công nghệ thông tin', 'SE340', 'TS. Đặng Ngọc Dũng', 'Thứ 3, Tiết 4-5', 'E.1370', 60),
('SE340_TH.N01', 'Quản lý dự án công nghệ thông tin (Thực hành)', 'SE340_TH', 'ThS. Bùi Ngọc Dũng', 'Thứ 4, Tiết 6-8', 'E.1371', 30),
('SE341.N01', 'Công nghệ Web và ứng dụng', 'SE341', 'PGS.TS Đỗ Ngọc Dũng', 'Thứ 5, Tiết 8-10', 'E.1372', 60),
('SE342.N01', 'Logic mờ', 'SE342', 'ThS. Hồ Ngọc Dũng', 'Thứ 6, Tiết 1-3', 'E.1373', 60),
('SE343.N01', 'Công nghệ Portal', 'SE343', 'TS. Ngô Ngọc Dũng', 'Thứ 7, Tiết 4-5', 'E.1374', 60),
('SE344.N01', 'Lập trình game trong các thiết bị di động', 'SE344', 'ThS. Dương Ngọc Dũng', 'Thứ 2, Tiết 6-8', 'E.1375', 60),
('SE345.N01', 'Kỹ thuật lập trình nhúng', 'SE345', 'PGS.TS Lý Ngọc Dũng', 'Thứ 3, Tiết 8-10', 'E.1376', 60),
('SE345_TH.N01', 'Kỹ thuật lập trình nhúng (Thực hành)', 'SE345_TH', 'ThS. Mai Ngọc Dũng', 'Thứ 4, Tiết 1-3', 'E.1377', 30),
('SE346.N01', 'Lập trình trên thiết bị di động', 'SE346', 'TS. Tạ Ngọc Dũng', 'Thứ 5, Tiết 4-5', 'E.1378', 60),
('SE347.N01', 'Công nghệ Web và ứng dụng', 'SE347', 'ThS. Đinh Ngọc Dũng', 'Thứ 6, Tiết 6-8', 'E.1379', 60),
('SE348.N01', 'Chuyên đề M-commerce', 'SE348', 'PGS.TS Cao Ngọc Dũng', 'Thứ 7, Tiết 8-10', 'E.1380', 60),
('SE349.N01', 'Nhập môn Quản trị doanh nghiệp', 'SE349', 'ThS. Nguyễn Bảo Dũng', 'Thứ 2, Tiết 1-3', 'E.1381', 60),
('SE350.N01', 'Chuyên đề E-learning', 'SE350', 'TS. Trần Bảo Dũng', 'Thứ 3, Tiết 4-5', 'E.1382', 60),
('SE351.N01', 'Xử lý song song', 'SE351', 'ThS. Lê Bảo Dũng', 'Thứ 4, Tiết 6-8', 'E.1383', 60),
('SE352.N01', 'Phát triển ứng dụng VR', 'SE352', 'PGS.TS Phạm Bảo Dũng', 'Thứ 5, Tiết 8-10', 'E.1384', 60),
('SE352_TH.N01', 'Phát triển ứng dụng VR (Thực hành)', 'SE352_TH', 'ThS. Hoàng Bảo Dũng', 'Thứ 6, Tiết 1-3', 'E.1385', 30),
('SE354.N01', 'Chuyên đề các quy trình phát triển phần mềm hiện đại', 'SE354', 'TS. Huỳnh Bảo Dũng', 'Thứ 7, Tiết 4-5', 'E.1386', 60),
('SE354_TH.N01', 'Chuyên đề các quy trình phát triển phần mềm hiện đại (Thực hành)', 'SE354_TH', 'ThS. Phan Bảo Dũng', 'Thứ 2, Tiết 6-8', 'E.1387', 30),
('SE355.N01', 'Máy học và các công cụ', 'SE355', 'PGS.TS Vũ Bảo Dũng', 'Thứ 3, Tiết 8-10', 'E.1388', 60),
('SE355_TH.N01', 'Máy học và các công cụ (Thực hành)', 'SE355_TH', 'ThS. Võ Bảo Dũng', 'Thứ 4, Tiết 1-3', 'E.1389', 30),
('SE356.N01', 'Kiến trúc Phần mềm', 'SE356', 'TS. Đặng Bảo Dũng', 'Thứ 5, Tiết 4-5', 'E.1390', 60),
('SE357.N01', 'Kỹ thuật phân tích yêu cầu', 'SE357', 'ThS. Bùi Bảo Dũng', 'Thứ 6, Tiết 6-8', 'E.1391', 60),
('SE357_TH.N01', 'Kỹ thuật phân tích yêu cầu (Thực hành)', 'SE357_TH', 'PGS.TS Đỗ Bảo Dũng', 'Thứ 7, Tiết 8-10', 'E.1392', 30),
('SE358.N01', 'Quản lý dự án Phát triển Phần mềm', 'SE358', 'ThS. Hồ Bảo Dũng', 'Thứ 2, Tiết 1-3', 'E.1393', 60),
('SE358_TH.N01', 'Quản lý dự án Phát triển Phần mềm (Thực hành)', 'SE358_TH', 'TS. Ngô Bảo Dũng', 'Thứ 3, Tiết 4-5', 'E.1394', 30),
('SE359.N01', 'DevOps trong phát triển phần mềm', 'SE359', 'ThS. Dương Bảo Dũng', 'Thứ 4, Tiết 6-8', 'E.1395', 60),
('SE359_TH.N01', 'DevOps trong phát triển phần mềm (Thực hành)', 'SE359_TH', 'PGS.TS Lý Bảo Dũng', 'Thứ 5, Tiết 8-10', 'E.1396', 30),
('SE360.N01', 'Điện toán đám mây và phát triển ứng dụng hướng dịch vụ', 'SE360', 'ThS. Mai Bảo Dũng', 'Thứ 6, Tiết 1-3', 'E.1397', 60),
('SE360_TH.N01', 'Điện toán đám mây và phát triển ứng dụng hướng dịch vụ (Thực hành)', 'SE360_TH', 'TS. Tạ Bảo Dũng', 'Thứ 7, Tiết 4-5', 'E.1398', 30),
('SE361.N01', 'Phát triển Phần mềm theo Kiến trúc Microservices', 'SE361', 'ThS. Đinh Bảo Dũng', 'Thứ 2, Tiết 6-8', 'E.1399', 60),
('SE362.N01', 'An toàn phần mềm và hệ thống', 'SE362', 'PGS.TS Cao Bảo Dũng', 'Thứ 3, Tiết 8-10', 'E.1400', 60),
('SE362_TH.N01', 'An toàn phần mềm và hệ thống (Thực hành)', 'SE362_TH', 'ThS. Nguyễn Đức Dũng', 'Thứ 4, Tiết 1-3', 'E.1401', 30),
('SE363.N01', 'Phát triển ứng dụng trên nền tảng dữ liệu lớn', 'SE363', 'TS. Trần Đức Dũng', 'Thứ 5, Tiết 4-5', 'E.1402', 60),
('SE363_TH.N01', 'Phát triển ứng dụng trên nền tảng dữ liệu lớn (Thực hành)', 'SE363_TH', 'ThS. Lê Đức Dũng', 'Thứ 6, Tiết 6-8', 'E.1403', 30),
('SE364.N01', 'Thiết kế giao diện và trải nghiệm người dùng', 'SE364', 'PGS.TS Phạm Đức Dũng', 'Thứ 7, Tiết 8-10', 'E.1404', 60),
('SE364_TH.N01', 'Thiết kế giao diện và trải nghiệm người dùng (Thực hành)', 'SE364_TH', 'ThS. Hoàng Đức Dũng', 'Thứ 2, Tiết 1-3', 'E.1405', 30),
('SE365.N01', 'Học sâu ứng dụng trong phát triển phần mềm', 'SE365', 'TS. Huỳnh Đức Dũng', 'Thứ 3, Tiết 4-5', 'E.1406', 60),
('SE365_TH.N01', 'Học sâu ứng dụng trong phát triển phần mềm (Thực hành)', 'SE365_TH', 'ThS. Phan Đức Dũng', 'Thứ 4, Tiết 6-8', 'E.1407', 30),
('SE400.N01', 'Seminar các vấn đề hiện đại của CNPM', 'SE400', 'PGS.TS Vũ Đức Dũng', 'Thứ 5, Tiết 8-10', 'E.1408', 60),
('SE401.N01', 'Mẫu thiết kế', 'SE401', 'ThS. Võ Đức Dũng', 'Thứ 6, Tiết 1-3', 'E.1409', 60),
('SE402.N01', 'Điện toán đám mây', 'SE402', 'TS. Đặng Đức Dũng', 'Thứ 7, Tiết 4-5', 'E.1410', 60),
('SE403.N01', 'Nguyên lý thiết kế thế giới ảo', 'SE403', 'ThS. Bùi Đức Dũng', 'Thứ 2, Tiết 6-8', 'E.1411', 60),
('SE404.N01', 'Chuyên đề E-Government', 'SE404', 'PGS.TS Đỗ Đức Dũng', 'Thứ 3, Tiết 8-10', 'E.1412', 60),
('SE405.N01', 'Chuyên đề Mobile and Pervasive Computing', 'SE405', 'ThS. Hồ Đức Dũng', 'Thứ 4, Tiết 1-3', 'E.1413', 60),
('SE406.N01', 'Mẫu thiết kế hướng đối tượng', 'SE406', 'TS. Ngô Đức Dũng', 'Thứ 5, Tiết 4-5', 'E.1414', 60),
('SE407.N01', 'Chuyên đề Pervasive and Mobile Computing', 'SE407', 'ThS. Dương Đức Dũng', 'Thứ 6, Tiết 6-8', 'E.1415', 60),
('SE408.N01', 'Phát triển game với Blockchain', 'SE408', 'PGS.TS Lý Đức Dũng', 'Thứ 7, Tiết 8-10', 'E.1416', 60),
('SE408_TH.N01', 'Phát triển game với Blockchain (Thực hành)', 'SE408_TH', 'ThS. Mai Đức Dũng', 'Thứ 2, Tiết 1-3', 'E.1417', 30),
('SE409.N01', 'Phát triển dự án Game', 'SE409', 'TS. Tạ Đức Dũng', 'Thứ 3, Tiết 4-5', 'E.1418', 60),
('SE409_TH.N01', 'Phát triển dự án Game (Thực hành)', 'SE409_TH', 'ThS. Đinh Đức Dũng', 'Thứ 4, Tiết 6-8', 'E.1419', 30),
('SE417.N01', 'Đồ án môn học mã nguồn mở', 'SE417', 'PGS.TS Cao Đức Dũng', 'Thứ 5, Tiết 8-10', 'E.1420', 60),
('SE418.N01', 'Đồ án môn học chuyên ngành', 'SE418', 'ThS. Nguyễn Anh Dũng', 'Thứ 6, Tiết 1-3', 'E.1421', 60),
('SE501.N01', 'Thực tập tốt nghiệp', 'SE501', 'TS. Trần Anh Dũng', 'Thứ 7, Tiết 4-5', 'E.1422', 60),
('SE502.N01', 'Thực tập', 'SE502', 'ThS. Lê Anh Dũng', 'Thứ 2, Tiết 6-8', 'E.1423', 60),
('SE503.N01', 'Đồ án', 'SE503', 'PGS.TS Phạm Anh Dũng', 'Thứ 3, Tiết 8-10', 'E.1424', 60),
('SE505.N01', 'Khóa luận tốt nghiệp', 'SE505', 'ThS. Hoàng Anh Dũng', 'Thứ 4, Tiết 1-3', 'E.1425', 60),
('SE506.N01', 'Đồ án tốt nghiệp tại doanh nghiệp', 'SE506', 'TS. Huỳnh Anh Dũng', 'Thứ 5, Tiết 4-5', 'E.1426', 60),
('SE507.N01', 'Đồ án tốt nghiệp', 'SE507', 'ThS. Phan Anh Dũng', 'Thứ 6, Tiết 6-8', 'E.1427', 60),
('SMET1.N01', 'Phương pháp NCKH trong tin học', 'SMET1', 'PGS.TS Vũ Anh Dũng', 'Thứ 7, Tiết 8-10', 'B.1428', 60),
('SMET2.N01', 'Phương pháp luận sáng tạo KH-CN', 'SMET2', 'ThS. Võ Anh Dũng', 'Thứ 2, Tiết 1-3', 'B.1429', 60),
('SOCI1.N01', 'Chủ nghĩa xã hội "KHOA" học', 'SOCI1', 'TS. Đặng Anh Dũng', 'Thứ 3, Tiết 4-5', 'B.1430', 60),
('SP3724.N01', 'Kỹ năng giao tiếp', 'SP3724', 'ThS. Bùi Anh Dũng', 'Thứ 4, Tiết 6-8', 'I.1431', 60),
('SPCH2713.N01', 'Kỹ năng giao tiếp', 'SPCH2713', 'PGS.TS Đỗ Anh Dũng', 'Thứ 5, Tiết 8-10', 'I.1432', 60),
('SPCH3723.N01', 'Tiếng Anh chuyên ngành CNTT', 'SPCH3723', 'ThS. Hồ Anh Dũng', 'Thứ 6, Tiết 1-3', 'I.1433', 60),
('SPCH3724.N01', 'Kỹ năng giao tiếp', 'SPCH3724', 'TS. Ngô Anh Dũng', 'Thứ 7, Tiết 4-5', 'I.1434', 60),
('SS001.N01', 'Những nguyên lý cơ bản của chủ nghĩa Mác Lênin', 'SS001', 'ThS. Dương Anh Dũng', 'Thứ 2, Tiết 6-8', 'B.1435', 60),
('SS002.N01', 'Đường lối cách mạng của Đảng CS Việt Nam', 'SS002', 'PGS.TS Lý Anh Dũng', 'Thứ 3, Tiết 8-10', 'B.1436', 60),
('SS003.N01', 'Tư tưởng Hồ Chí Minh', 'SS003', 'ThS. Mai Anh Dũng', 'Thứ 4, Tiết 1-3', 'B.1437', 60),
('SS004.N01', 'Kỹ năng nghề nghiệp', 'SS004', 'TS. Tạ Anh Dũng', 'Thứ 5, Tiết 4-5', 'B.1438', 60),
('SS005.N01', 'Phương pháp luận sáng tạo KH-CN', 'SS005', 'ThS. Đinh Anh Dũng', 'Thứ 6, Tiết 6-8', 'B.1439', 60),
('SS006.N01', 'Pháp luật đại cương', 'SS006', 'PGS.TS Cao Anh Dũng', 'Thứ 7, Tiết 8-10', 'B.1440', 60),
('SS007.N01', 'Triết học Mác – Lênin', 'SS007', 'ThS. Nguyễn Kim Dũng', 'Thứ 2, Tiết 1-3', 'B.1441', 60),
('SS008.N01', 'Kinh tế chính trị Mác – Lênin', 'SS008', 'TS. Trần Kim Dũng', 'Thứ 3, Tiết 4-5', 'B.1442', 60),
('SS009.N01', 'Chủ nghĩa xã hội "KHOA" học', 'SS009', 'ThS. Lê Kim Dũng', 'Thứ 4, Tiết 6-8', 'B.1443', 60),
('SS010.N01', 'Lịch sử Đảng Cộng sản Việt Nam', 'SS010', 'PGS.TS Phạm Kim Dũng', 'Thứ 5, Tiết 8-10', 'B.1444', 60),
('SSKL1.N01', 'Kỹ năng mềm', 'SSKL1', 'ThS. Hoàng Kim Dũng', 'Thứ 6, Tiết 1-3', 'B.1445', 60),
('STA01.N01', 'Xác suất thống kê', 'STA01', 'TS. Huỳnh Kim Dũng', 'Thứ 7, Tiết 4-5', 'B.1446', 60),
('STAT11.N01', 'Xác suất thống kê', 'STAT11', 'ThS. Phan Kim Dũng', 'Thứ 2, Tiết 6-8', 'I.1447', 60),
('STAT3013.N01', 'Phân tích thống kê', 'STAT3013', 'PGS.TS Vũ Kim Dũng', 'Thứ 3, Tiết 8-10', 'I.1448', 60),
('STAT4033.N01', 'Thống kê', 'STAT4033', 'ThS. Võ Kim Dũng', 'Thứ 4, Tiết 1-3', 'I.1449', 60),
('THU086.N01', 'Đào tạo năng lực thông tin', 'THU086', 'TS. Đặng Kim Dũng', 'Thứ 5, Tiết 4-5', 'B.1450', 60),
('THU107.N01', 'Truyền thông xã hội trong các tổ chức', 'THU107', 'ThS. Bùi Kim Dũng', 'Thứ 6, Tiết 6-8', 'B.1451', 60),
('TLH025.N01', 'Tâm lý học nhân cách', 'TLH025', 'PGS.TS Đỗ Kim Dũng', 'Thứ 7, Tiết 8-10', 'B.1452', 60),
('TOEIC 450.N01', 'TOEIC 450', 'TOEIC 450', 'ThS. Hồ Kim Dũng', 'Thứ 2, Tiết 1-3', 'B.1453', 60),
('TOEIC450.N01', 'TOEIC 450', 'TOEIC450', 'TS. Ngô Kim Dũng', 'Thứ 3, Tiết 4-5', 'B.1454', 60),
('VCPH1.N01', 'Lịch sử Đảng CSVN', 'VCPH1', 'ThS. Dương Kim Dũng', 'Thứ 4, Tiết 6-8', 'B.1455', 60),
('VCPL1.N01', 'Đường lối cách mạng của Đảng CSVN', 'VCPL1', 'PGS.TS Lý Kim Dũng', 'Thứ 5, Tiết 8-10', 'B.1456', 60),
('WINP1.N01', 'Lập trình trên Windows', 'WINP1', 'ThS. Mai Kim Dũng', 'Thứ 6, Tiết 1-3', 'E.1457', 60),
('WINP1_TH.N01', 'Lập trình trên Windows (Thực hành)', 'WINP1_TH', 'TS. Tạ Kim Dũng', 'Thứ 7, Tiết 4-5', 'E.1458', 30),
('IS350.N01', 'Xử lý ảnh y khoa', 'IS350', 'ThS. Đinh Kim Dũng', 'Thứ 2, Tiết 6-8', 'I.1459', 60),
('IS359.N01', 'Đồ án chuyên ngành Hệ thống Thông tin y tế', 'IS359', 'PGS.TS Cao Kim Dũng', 'Thứ 3, Tiết 8-10', 'I.1460', 60),
('CS5032.N01', 'Thực tập doanh nghiệp', 'CS5032', 'ThS. Nguyễn Mai Dũng', 'Thứ 4, Tiết 1-3', 'I.1461', 60);

-- Chuẩn hóa dữ liệu lớp: giảng viên là tên người, lịch học dùng tiếng Việt có dấu.
WITH danh_sach_giang_vien AS (
  SELECT
    "MaLop",
    (ARRAY[
      'ThS. Nguyễn Hoàng Minh',
      'ThS. Lê Gia Bảo',
      'TS. Trần Hữu Phúc',
      'ThS. Phạm Ngọc Anh',
      'ThS. Võ Minh Quân',
      'ThS. Đặng Thanh Trúc',
      'ThS. Nguyễn Thị Thu',
      'TS. Lê Hoàng Nam',
      'PGS.TS Nguyễn Minh Khoa',
      'TS. Phạm Thu Hà',
      'ThS. Trần Khánh Linh',
      'ThS. Bùi Quang Huy',
      'TS. Đỗ Anh Tuấn',
      'ThS. Huỳnh Mai Phương',
      'ThS. Nguyễn Đức Long',
      'TS. Hoàng Kim Ngân'
    ])[((ROW_NUMBER() OVER (ORDER BY "MaLop") - 1) % 16 + 1)::int] AS "TenGiangVien"
  FROM "LOP"
)
UPDATE "LOP" l
SET
  "GiangVien" = COALESCE(NULLIF(l."GiangVien", ''), dsgv."TenGiangVien"),
  "ThuTrongTuan" = COALESCE(l."ThuTrongTuan", CASE
    WHEN l."LichHoc" ~ '^Thu [2-7] T[0-9]+-T[0-9]+$'
      THEN regexp_replace(l."LichHoc", '^Thu ([2-7]) T([0-9]+)-T([0-9]+)$', '\1')::int
    ELSE NULL
  END),
  "MaTietBatDau" = COALESCE(l."MaTietBatDau", CASE
    WHEN l."LichHoc" ~ '^Thu [2-7] T[0-9]+-T[0-9]+$'
      THEN 'T' || regexp_replace(l."LichHoc", '^Thu ([2-7]) T([0-9]+)-T([0-9]+)$', '\2')
    ELSE NULL
  END),
  "MaTietKetThuc" = COALESCE(l."MaTietKetThuc", CASE
    WHEN l."LichHoc" ~ '^Thu [2-7] T[0-9]+-T[0-9]+$'
      THEN 'T' || regexp_replace(l."LichHoc", '^Thu ([2-7]) T([0-9]+)-T([0-9]+)$', '\3')
    ELSE NULL
  END),
  "LichHoc" = CASE
    WHEN l."LichHoc" ~ '^Thu [2-7] T[0-9]+-T[0-9]+$'
      THEN regexp_replace(l."LichHoc", '^Thu ([2-7]) T([0-9]+)-T([0-9]+)$', 'Thứ \1, Tiết \2-\3')
    ELSE l."LichHoc"
  END
FROM danh_sach_giang_vien dsgv
WHERE dsgv."MaLop" = l."MaLop";

-- Tạo danh mục phòng học từ dữ liệu lớp hiện có và liên kết ngược về LOP.
WITH phong_nguon AS (
  SELECT
    TRIM("PhongHoc") AS "MaPhong",
    MAX(COALESCE("SoLuongToiDa", 60)) AS "SucChua",
    BOOL_OR("MaLop" LIKE '%_TH.%' OR COALESCE("SoLuongToiDa", 60) <= 30) AS "LaPhongThucHanh"
  FROM "LOP"
  WHERE "PhongHoc" IS NOT NULL AND TRIM("PhongHoc") <> ''
  GROUP BY TRIM("PhongHoc")
)
INSERT INTO "PHONGHOC" ("MaPhong", "TenPhong", "ToaNha", "SucChua", "LoaiPhong", "TrangThai")
SELECT
  "MaPhong",
  'Phòng ' || "MaPhong",
  NULLIF(split_part("MaPhong", '.', 1), ''),
  "SucChua",
  CASE WHEN "LaPhongThucHanh" THEN 'thuc_hanh' ELSE 'ly_thuyet' END,
  TRUE
FROM phong_nguon
ON CONFLICT ("MaPhong") DO UPDATE SET
  "TenPhong" = EXCLUDED."TenPhong",
  "ToaNha" = EXCLUDED."ToaNha",
  "SucChua" = GREATEST(COALESCE("PHONGHOC"."SucChua", 0), COALESCE(EXCLUDED."SucChua", 0)),
  "LoaiPhong" = EXCLUDED."LoaiPhong",
  "DaXoa" = FALSE,
  "NguoiXoa" = NULL,
  "NgayXoa" = NULL;

UPDATE "LOP"
SET "MaPhong" = TRIM("PhongHoc")
WHERE "PhongHoc" IS NOT NULL
  AND TRIM("PhongHoc") <> ''
  AND EXISTS (
    SELECT 1 FROM "PHONGHOC" p WHERE p."MaPhong" = TRIM("LOP"."PhongHoc")
  );

-- Tạo danh mục giảng viên từ dữ liệu lớp hiện có và liên kết ngược về LOP.
WITH giang_vien_nguon AS (
  SELECT
    TRIM(l."GiangVien") AS "GiangVienDayDu",
    'GV' || UPPER(substr(md5(TRIM(l."GiangVien")), 1, 8)) AS "MaGiangVien",
    MIN(mh."MaKhoa") AS "MaKhoa"
  FROM "LOP" l
  JOIN "MONHOC" mh ON mh."MaMonHoc" = l."MaMonHoc"
  WHERE l."GiangVien" IS NOT NULL AND TRIM(l."GiangVien") <> ''
  GROUP BY TRIM(l."GiangVien")
)
INSERT INTO "GIANGVIEN" ("MaGiangVien", "HoTen", "HocHamHocVi", "MaKhoa", "TrangThai")
SELECT
  "MaGiangVien",
  NULLIF(TRIM(regexp_replace("GiangVienDayDu", '^(PGS\.TS|TS\.|ThS\.)\s+', '')), ''),
  CASE
    WHEN "GiangVienDayDu" LIKE 'PGS.TS %' THEN 'PGS.TS'
    WHEN "GiangVienDayDu" LIKE 'TS. %' THEN 'TS.'
    WHEN "GiangVienDayDu" LIKE 'ThS. %' THEN 'ThS.'
    ELSE NULL
  END,
  "MaKhoa",
  TRUE
FROM giang_vien_nguon
ON CONFLICT ("MaGiangVien") DO UPDATE SET
  "HoTen" = EXCLUDED."HoTen",
  "HocHamHocVi" = EXCLUDED."HocHamHocVi",
  "MaKhoa" = COALESCE("GIANGVIEN"."MaKhoa", EXCLUDED."MaKhoa"),
  "DaXoa" = FALSE,
  "NguoiXoa" = NULL,
  "NgayXoa" = NULL;

UPDATE "LOP"
SET "MaGiangVien" = 'GV' || UPPER(substr(md5(TRIM("GiangVien")), 1, 8))
WHERE "GiangVien" IS NOT NULL
  AND TRIM("GiangVien") <> ''
  AND EXISTS (
    SELECT 1
    FROM "GIANGVIEN" gv
    WHERE gv."MaGiangVien" = 'GV' || UPPER(substr(md5(TRIM("LOP"."GiangVien")), 1, 8))
  );

-- =====================================================
-- INSERT DATA - Chương trình học (Curriculum)
-- =====================================================
-- Source distribution: thong_ke_ctdt_uit_khoa_2023_da_sua.md.
-- uq_cth is unique on (MaNganh, MaMonHoc), so repeated course codes in the
-- source file are stored by their first appearance in that program.
INSERT INTO "CHUONGTRINHHOC" ("MaNganh", "MaMonHoc", "HocKy") VALUES
('CNTT', 'IT001', 1),
('CNTT', 'MA006', 1),
('CNTT', 'MA003', 1),
('CNTT', 'IE005', 1),
('CNTT', 'SS006', 1),
('CNTT', 'ENG01', 1),
('CNTT', 'ME001', 1),
('CNTT', 'IT002', 2),
('CNTT', 'IT003', 2),
('CNTT', 'SS004', 2),
('CNTT', 'MA004', 2),
('CNTT', 'ENG02', 2),
('CNTT', 'IT004', 3),
('CNTT', 'IT005', 3),
('CNTT', 'IT012', 3),
('CNTT', 'MA005', 3),
('CNTT', 'ENG03', 3),
('CNTT', 'SS003', 4),
('CNTT', 'SS007', 4),
('CNTT', 'IT007', 4),
('CNTT', 'IE101', 4),
('CNTT', 'IE103', 4),
('CNTT', 'SS008', 5),
('CNTT', 'SS009', 5),
('CNTT', 'IE104', 5),
('CNTT', 'IE106', 5),
('CNTT', 'PE231', 5),
('CNTT', 'IE204', 5),
('CNTT', 'IE213', 5),
('CNTT', 'SS010', 6),
('CNTT', 'IE105', 6),
('CNTT', 'IE108', 6),
('CNTT', 'PE232', 6),
('CNTT', 'IE303', 6),
('CNTT', 'IE307', 6),
('CNTT', 'IE207', 7),
('CNTT', 'IS251', 7),
('CNTT', 'IS352', 7),
('CNTT', 'IE505', 8),
('CNTT', 'IS402', 8),
('CNTT', 'IS353', 8),
('CNTT_VN', 'IT001', 1),
('CNTT_VN', 'MA006', 1),
('CNTT_VN', 'MA003', 1),
('CNTT_VN', 'IE005', 1),
('CNTT_VN', 'SS003', 1),
('CNTT_VN', 'JAN01', 1),
('CNTT_VN', 'ME001', 1),
('CNTT_VN', 'IT002', 2),
('CNTT_VN', 'IT003', 2),
('CNTT_VN', 'SS007', 2),
('CNTT_VN', 'MA005', 2),
('CNTT_VN', 'JAN02', 2),
('CNTT_VN', 'IT004', 3),
('CNTT_VN', 'IT005', 3),
('CNTT_VN', 'IT012', 3),
('CNTT_VN', 'MA004', 3),
('CNTT_VN', 'JAN03', 3),
('CNTT_VN', 'IE101', 4),
('CNTT_VN', 'SS010', 4),
('CNTT_VN', 'IT007', 4),
('CNTT_VN', 'IE103', 4),
('CNTT_VN', 'SS008', 4),
('CNTT_VN', 'JAN04', 4),
('CNTT_VN', 'SS006', 5),
('CNTT_VN', 'IE104', 5),
('CNTT_VN', 'IE105', 5),
('CNTT_VN', 'JAN05', 5),
('CNTT_VN', 'PE231', 5),
('CNTT_VN', 'IE204', 5),
('CNTT_VN', 'IE213', 5),
('CNTT_VN', 'IE106', 6),
('CNTT_VN', 'SS004', 6),
('CNTT_VN', 'JAN06', 6),
('CNTT_VN', 'PE232', 6),
('CNTT_VN', 'IE303', 6),
('CNTT_VN', 'IE307', 6),
('CNTT_VN', 'CU001', 7),
('CNTT_VN', 'IE207', 7),
('CNTT_VN', 'SS009', 7),
('CNTT_VN', 'JAN07', 7),
('CNTT_VN', 'IE231', 7),
('CNTT_VN', 'IE203', 7),
('CNTT_VN', 'IE309', 8),
('CNTT_VN', 'IE505', 8),
('CNTT_VN', 'IS402', 8),
('CNTT_VN', 'IS353', 8),
('CNTT_VN', 'JAN08', 8),
('HTTT', 'IT001', 1),
('HTTT', 'MA006', 1),
('HTTT', 'MA003', 1),
('HTTT', 'IT010', 1),
('HTTT', 'IS005', 1),
('HTTT', 'ENG01', 1),
('HTTT', 'ME001', 1),
('HTTT', 'IT002', 2),
('HTTT', 'IT003', 2),
('HTTT', 'MA004', 2),
('HTTT', 'MA005', 2),
('HTTT', 'ENG02', 2),
('HTTT', 'IT004', 3),
('HTTT', 'IT005', 3),
('HTTT', 'SS007', 3),
('HTTT', 'SS008', 3),
('HTTT', 'ENG03', 3),
('HTTT', 'SS006', 3),
('HTTT', 'SS004', 3),
('HTTT', 'IS201', 4),
('HTTT', 'IS210', 4),
('HTTT', 'IS208', 4),
('HTTT', 'IS216', 4),
('HTTT', 'IT007', 4),
('HTTT', 'PE231', 5),
('HTTT', 'SS010', 5),
('HTTT', 'IS403', 5),
('HTTT', 'IS217', 5),
('HTTT', 'IS207', 5),
('HTTT', 'IS336', 5),
('HTTT', 'PE232', 6),
('HTTT', 'SS003', 6),
('HTTT', 'IS252', 6),
('HTTT', 'IS211', 6),
('HTTT', 'IS405', 6),
('HTTT', 'SS009', 7),
('HTTT', 'IS502', 7),
('HTTT', 'NT118', 7),
('HTTT', 'TLH025', 7),
('HTTT', 'CS231', 7),
('HTTT', 'IS402', 8),
('HTTT', 'IS353', 8),
('HTTT', 'IS401', 8),
('HTTT_YT', 'IT001', 1),
('HTTT_YT', 'MA006', 1),
('HTTT_YT', 'MA003', 1),
('HTTT_YT', 'IT010', 1),
('HTTT_YT', 'IS005', 1),
('HTTT_YT', 'ENG01', 1),
('HTTT_YT', 'ME001', 1),
('HTTT_YT', 'IT002', 2),
('HTTT_YT', 'IT003', 2),
('HTTT_YT', 'MA004', 2),
('HTTT_YT', 'MA005', 2),
('HTTT_YT', 'ENG02', 2),
('HTTT_YT', 'IT004', 3),
('HTTT_YT', 'IT005', 3),
('HTTT_YT', 'SS007', 3),
('HTTT_YT', 'SS008', 3),
('HTTT_YT', 'ENG03', 3),
('HTTT_YT', 'SS006', 3),
('HTTT_YT', 'SS004', 3),
('HTTT_YT', 'IS201', 4),
('HTTT_YT', 'IS349', 4),
('HTTT_YT', 'IS346', 4),
('HTTT_YT', 'IS216', 4),
('HTTT_YT', 'IT007', 4),
('HTTT_YT', 'PE231', 5),
('HTTT_YT', 'SS010', 5),
('HTTT_YT', 'IS347', 5),
('HTTT_YT', 'IS217', 5),
('HTTT_YT', 'IS207', 5),
('HTTT_YT', 'IS344', 5),
('HTTT_YT', 'IS348', 5),
('HTTT_YT', 'PE232', 6),
('HTTT_YT', 'SS003', 6),
('HTTT_YT', 'IS345', 6),
('HTTT_YT', 'IS356', 6),
('HTTT_YT', 'IS355', 6),
('HTTT_YT', 'IS354', 6),
('HTTT_YT', 'SS009', 7),
('HTTT_YT', 'IS502', 7),
('HTTT_YT', 'IS350', 7),
('HTTT_YT', 'TLH025', 7),
('HTTT_YT', 'CS231', 7),
('HTTT_YT', 'IS406', 8),
('HTTT_YT', 'IS359', 8),
('HTTT_YT', 'IS401', 8),
('HTTT_TT', 'IS005', 1),
('HTTT_TT', 'SS007', 1),
('HTTT_TT', 'SS008', 1),
('HTTT_TT', 'ENG01', 1),
('HTTT_TT', 'ENG02', 1),
('HTTT_TT', 'ENG03', 1),
('HTTT_TT', 'ME001', 1),
('HTTT_TT', 'PHYS1215', 2),
('HTTT_TT', 'MATH2154', 2),
('HTTT_TT', 'MATH3013', 2),
('HTTT_TT', 'CS2134', 2),
('HTTT_TT', 'CS3443', 2),
('HTTT_TT', 'ENG04', 2),
('HTTT_TT', 'ENG05', 2),
('HTTT_TT', 'ENG06', 2),
('HTTT_TT', 'ENG07', 3),
('HTTT_TT', 'SPCH3723', 3),
('HTTT_TT', 'CS5423', 3),
('HTTT_TT', 'CS4343', 3),
('HTTT_TT', 'CS4323', 3),
('HTTT_TT', 'CS4283', 3),
('HTTT_TT', 'SPCH2713', 3),
('HTTT_TT', 'CS3653', 4),
('HTTT_TT', 'STAT4033', 4),
('HTTT_TT', 'MSIS5723', 4),
('HTTT_TT', 'MSIS3033', 4),
('HTTT_TT', 'ACCT5123', 4),
('HTTT_TT', 'MSIS2433', 4),
('HTTT_TT', 'PE231', 5),
('HTTT_TT', 'SS010', 5),
('HTTT_TT', 'SS009', 5),
('HTTT_TT', 'SS006', 5),
('HTTT_TT', 'STAT3013', 5),
('HTTT_TT', 'MSIS4013', 5),
('HTTT_TT', 'MSIS207', 5),
('HTTT_TT', 'MSIS4263', 5),
('HTTT_TT', 'CS5433', 6),
('HTTT_TT', 'CS4153', 6),
('HTTT_TT', 'MKTG5883', 6),
('HTTT_TT', 'PE232', 6),
('HTTT_TT', 'MSIS406', 7),
('HTTT_TT', 'SS003', 7),
('HTTT_TT', 'CS5032', 7),
('HTTT_TT', 'CS5000', 8),
('KHMT', 'IT001', 1),
('KHMT', 'MA006', 1),
('KHMT', 'MA003', 1),
('KHMT', 'CS005', 1),
('KHMT', 'ENG01', 1),
('KHMT', 'ME001', 1),
('KHMT', 'IT002', 2),
('KHMT', 'IT003', 2),
('KHMT', 'IT012', 2),
('KHMT', 'MA004', 2),
('KHMT', 'MA005', 2),
('KHMT', 'ENG02', 2),
('KHMT', 'IT004', 3),
('KHMT', 'IT005', 3),
('KHMT', 'IT007', 3),
('KHMT', 'ENG03', 3),
('KHMT', 'CS115', 3),
('KHMT', 'SS007', 3),
('KHMT', 'CS112', 4),
('KHMT', 'SE104', 4),
('KHMT', 'CS111', 4),
('KHMT', 'CS117', 4),
('KHMT', 'CS523', 4),
('KHMT', 'CS231', 4),
('KHMT', 'CS331', 4),
('KHMT', 'SS004', 4),
('KHMT', 'SS008', 4),
('KHMT', 'PE231', 4),
('KHMT', 'CS526', 5),
('KHMT', 'CS116', 5),
('KHMT', 'CS114', 5),
('KHMT', 'CS221', 5),
('KHMT', 'TLH025', 5),
('KHMT', 'IE310', 5),
('KHMT', 'SS009', 5),
('KHMT', 'SS010', 5),
('KHMT', 'PE232', 5),
('KHMT', 'CS105', 6),
('KHMT', 'CS338', 6),
('KHMT', 'CS333', 6),
('KHMT', 'CS527', 6),
('KHMT', 'IS353', 6),
('KHMT', 'CS412', 6),
('KHMT', 'SS003', 6),
('KHMT', 'SS006', 6),
('KHMT', 'CS409', 7),
('KHMT', 'CS405', 7),
('KHMT', 'CS505', 7),
('TTNT', 'IT001', 1),
('TTNT', 'MA006', 1),
('TTNT', 'MA003', 1),
('TTNT', 'AI001', 1),
('TTNT', 'ENG01', 1),
('TTNT', 'SS004', 1),
('TTNT', 'ME001', 1),
('TTNT', 'IT002', 2),
('TTNT', 'IT003', 2),
('TTNT', 'IT012', 2),
('TTNT', 'MA004', 2),
('TTNT', 'MA005', 2),
('TTNT', 'ENG02', 2),
('TTNT', 'PE012', 2),
('TTNT', 'IT004', 3),
('TTNT', 'IT005', 3),
('TTNT', 'IT007', 3),
('TTNT', 'ENG03', 3),
('TTNT', 'CS115', 3),
('TTNT', 'CS112', 4),
('TTNT', 'CS116', 4),
('TTNT', 'CS311', 4),
('TTNT', 'CS106', 4),
('TTNT', 'CS114', 4),
('TTNT', 'SS007', 4),
('TTNT', 'SS008', 4),
('TTNT', 'CS526', 5),
('TTNT', 'CS111', 5),
('TTNT', 'AI002', 5),
('TTNT', 'CS211', 5),
('TTNT', 'CS315', 5),
('TTNT', 'DS103', 5),
('TTNT', 'DS200', 5),
('TTNT', 'SS009', 5),
('TTNT', 'SS010', 5),
('TTNT', 'CS410', 6),
('TTNT', 'CS431', 6),
('TTNT', 'CS217', 6),
('TTNT', 'CS316', 6),
('TTNT', 'CE340', 6),
('TTNT', 'CE344', 6),
('TTNT', 'SS003', 6),
('TTNT', 'SS006', 6),
('TTNT', 'CS409', 7),
('TTNT', 'CS405', 7),
('TTNT', 'AI505', 7),
('KTPM', 'MA006', 1),
('KTPM', 'MA003', 1),
('KTPM', 'ENG01', 1),
('KTPM', 'SE005', 1),
('KTPM', 'IT001', 1),
('KTPM', 'IT012', 1),
('KTPM', 'ME001', 1),
('KTPM', 'IT002', 2),
('KTPM', 'IT003', 2),
('KTPM', 'MA004', 2),
('KTPM', 'MA005', 2),
('KTPM', 'ENG02', 2),
('KTPM', 'IT004', 3),
('KTPM', 'IT005', 3),
('KTPM', 'IT007', 3),
('KTPM', 'IT008', 3),
('KTPM', 'ENG03', 3),
('KTPM', 'SE104', 4),
('KTPM', 'SS007', 4),
('KTPM', 'SS008', 4),
('KTPM', 'SS004', 4),
('KTPM', 'SE301', 4),
('KTPM', 'SE113', 4),
('KTPM', 'SS009', 5),
('KTPM', 'SS010', 5),
('KTPM', 'SE100', 5),
('KTPM', 'PE231', 5),
('KTPM', 'SE215', 5),
('KTPM', 'SE358', 5),
('KTPM', 'SS006', 6),
('KTPM', 'SS003', 6),
('KTPM', 'SE121', 6),
('KTPM', 'PE232', 6),
('KTPM', 'SE401', 6),
('KTPM', 'SE403', 6),
('KTPM', 'SE501', 7),
('KTPM', 'SE122', 7),
('KTPM', 'SE400', 7),
('KTPM', 'SE405', 7),
('KTPM', 'TLH025', 7),
('KTPM', 'IE310', 7),
('KTPM', 'SE505', 8),
('KTMT', 'CE005', 1),
('KTMT', 'IT001', 1),
('KTMT', 'MA006', 1),
('KTMT', 'MA003', 1),
('KTMT', 'SS007', 1),
('KTMT', 'ENG01', 1),
('KTMT', 'ME001', 1),
('KTMT', 'IT002', 2),
('KTMT', 'PH002', 2),
('KTMT', 'MA005', 2),
('KTMT', 'MA004', 2),
('KTMT', 'ENG02', 2),
('KTMT', 'IT003', 3),
('KTMT', 'IT005', 3),
('KTMT', 'IT006', 3),
('KTMT', 'CE119', 3),
('KTMT', 'SS003', 3),
('KTMT', 'ENG03', 3),
('KTMT', 'CE103', 4),
('KTMT', 'IT007', 4),
('KTMT', 'CE122', 4),
('KTMT', 'SS009', 4),
('KTMT', 'SS010', 4),
('KTMT', 'IT004', 5),
('KTMT', 'CE124', 5),
('KTMT', 'CE224', 5),
('KTMT', 'CE118', 5),
('KTMT', 'PE231', 5),
('KTMT', 'CE213', 6),
('KTMT', 'SS004', 6),
('KTMT', 'CE433', 6),
('KTMT', 'CE222', 6),
('KTMT', 'TLH025', 6),
('KTMT', 'IE310', 6),
('KTMT', 'CE201', 6),
('KTMT', 'PE232', 6),
('KTMT', 'CE502', 7),
('KTMT', 'CE232', 7),
('KTMT', 'CE339', 7),
('KTMT', 'BUS1125', 7),
('KTMT', 'CE206', 7),
('KTMT', 'SS008', 7),
('KTMT', 'SS006', 7),
('KTMT', 'CE505', 8),
('KTMT', 'CE410', 8),
('MMT', 'IT001', 1),
('MMT', 'MA006', 1),
('MMT', 'MA003', 1),
('MMT', 'PH002', 1),
('MMT', 'NT005', 1),
('MMT', 'ENG01', 1),
('MMT', 'ME001', 1),
('MMT', 'IT002', 2),
('MMT', 'IT005', 2),
('MMT', 'MA004', 2),
('MMT', 'IT006', 2),
('MMT', 'ENG02', 2),
('MMT', 'IT004', 3),
('MMT', 'IT007', 3),
('MMT', 'IT003', 3),
('MMT', 'NT106', 3),
('MMT', 'ENG03', 3),
('MMT', 'NT132', 4),
('MMT', 'NT105', 4),
('MMT', 'NT131', 4),
('MMT', 'MA005', 4),
('MMT', 'SS004', 4),
('MMT', 'NT101', 5),
('MMT', 'NT118', 5),
('MMT', 'NT210', 5),
('MMT', 'NT201', 5),
('MMT', 'SS003', 5),
('MMT', 'SS007', 5),
('MMT', 'PE231', 5),
('MMT', 'NT114', 6),
('MMT', 'NT113', 6),
('MMT', 'NT109', 6),
('MMT', 'NT121', 6),
('MMT', 'NT204', 6),
('MMT', 'NT330', 6),
('MMT', 'NT334', 6),
('MMT', 'NT205', 6),
('MMT', 'SS009', 6),
('MMT', 'PE232', 6),
('MMT', 'NT215', 7),
('MMT', 'NT207', 7),
('MMT', 'NT534', 7),
('MMT', 'NT405', 7),
('MMT', 'NT208', 7),
('MMT', 'SS006', 7),
('MMT', 'SS008', 7),
('MMT', 'SS010', 7),
('MMT', 'NT505', 8),
('MMT', 'NT332', 8),
('MMT', 'NT539', 8),
('MMT', 'NT535', 8),
('ATTT', 'IT001', 1),
('ATTT', 'MA006', 1),
('ATTT', 'MA003', 1),
('ATTT', 'PH002', 1),
('ATTT', 'NT015', 1),
('ATTT', 'ENG01', 1),
('ATTT', 'ME001', 1),
('ATTT', 'IT002', 2),
('ATTT', 'IT005', 2),
('ATTT', 'MA004', 2),
('ATTT', 'IT006', 2),
('ATTT', 'SS006', 2),
('ATTT', 'ENG02', 2),
('ATTT', 'IT004', 3),
('ATTT', 'NT209', 3),
('ATTT', 'IT003', 3),
('ATTT', 'SS004', 3),
('ATTT', 'MA005', 3),
('ATTT', 'ENG03', 3),
('ATTT', 'IT007', 4),
('ATTT', 'NT106', 4),
('ATTT', 'NT219', 4),
('ATTT', 'NT208', 4),
('ATTT', 'SS010', 4),
('ATTT', 'SS007', 4),
('ATTT', 'PE231', 4),
('ATTT', 'SS008', 5),
('ATTT', 'SS009', 5),
('ATTT', 'NT132', 5),
('ATTT', 'NT140', 5),
('ATTT', 'NT521', 5),
('ATTT', 'NT204', 5),
('ATTT', 'NT330', 5),
('ATTT', 'PE232', 5),
('ATTT', 'NT230', 6),
('ATTT', 'SS003', 6),
('ATTT', 'NT114', 6),
('ATTT', 'NT207', 6),
('ATTT', 'NT137', 6),
('ATTT', 'NT213', 6),
('ATTT', 'NT334', 6),
('ATTT', 'NT205', 6),
('ATTT', 'NT211', 6),
('ATTT', 'NT215', 7),
('ATTT', 'NT212', 7),
('ATTT', 'NT505', 7),
('ATTT', 'NT541', 7),
('ATTT', 'NT533', 7),
('ATTT', 'NT522', 7),
('TMDT', 'IT001', 1),
('TMDT', 'MA006', 1),
('TMDT', 'MA003', 1),
('TMDT', 'EC005', 1),
('TMDT', 'ENG01', 1),
('TMDT', 'ME001', 1),
('TMDT', 'IT002', 2),
('TMDT', 'IT003', 2),
('TMDT', 'EC001', 2),
('TMDT', 'MA004', 2),
('TMDT', 'MA005', 2),
('TMDT', 'ENG02', 2),
('TMDT', 'IT004', 3),
('TMDT', 'IT005', 3),
('TMDT', 'IS334', 3),
('TMDT', 'SS004', 3),
('TMDT', 'ENG03', 3),
('TMDT', 'EC101', 4),
('TMDT', 'IS207', 4),
('TMDT', 'EC208', 4),
('TMDT', 'EC201', 4),
('TMDT', 'SS009', 4),
('TMDT', 'EC312', 5),
('TMDT', 'EC204', 5),
('TMDT', 'EC213', 5),
('TMDT', 'SS003', 5),
('TMDT', 'SS006', 5),
('TMDT', 'PE231', 5),
('TMDT', 'EC214', 5),
('TMDT', 'EC232', 5),
('TMDT', 'IS336', 6),
('TMDT', 'EC335', 6),
('TMDT', 'EC229', 6),
('TMDT', 'SS007', 6),
('TMDT', 'PE232', 6),
('TMDT', 'EC333', 6),
('TMDT', 'EC338', 6),
('TMDT', 'EC222', 7),
('TMDT', 'EC337', 7),
('TMDT', 'SS008', 7),
('TMDT', 'SS010', 7),
('TMDT', 'EC002', 7),
('TMDT', 'EC304', 7),
('TMDT', 'EC401', 8),
('TMDT', 'EC331', 8),
('TMDT', 'EC402', 8),
('KHDL', 'IT001', 1),
('KHDL', 'MA006', 1),
('KHDL', 'MA003', 1),
('KHDL', 'SS006', 1),
('KHDL', 'DS005', 1),
('KHDL', 'ENG01', 1),
('KHDL', 'ME001', 1),
('KHDL', 'IT010', 2),
('KHDL', 'SS004', 2),
('KHDL', 'IT003', 2),
('KHDL', 'MA004', 2),
('KHDL', 'MA005', 2),
('KHDL', 'ENG02', 2),
('KHDL', 'IT004', 3),
('KHDL', 'IT005', 3),
('KHDL', 'IT002', 3),
('KHDL', 'DS101', 3),
('KHDL', 'ENG03', 3),
('KHDL', 'SS007', 4),
('KHDL', 'IT007', 4),
('KHDL', 'DS108', 4),
('KHDL', 'DS107', 4),
('KHDL', 'SS008', 5),
('KHDL', 'DS105', 5),
('KHDL', 'DS102', 5),
('KHDL', 'PE231', 5),
('KHDL', 'DS304', 5),
('KHDL', 'DS307', 5),
('KHDL', 'SS009', 6),
('KHDL', 'PE232', 6),
('KHDL', 'DS200', 6),
('KHDL', 'DS201', 6),
('KHDL', 'SS010', 7),
('KHDL', 'SS003', 7),
('KHDL', 'DS207', 7),
('KHDL', 'DS310', 7),
('KHDL', 'DS104', 7),
('KHDL', 'DS505', 8),
('KHDL', 'DS300', 8),
('KHDL', 'DS301', 8);

-- =====================================================
-- INSERT DATA - Lớp mở trong học kỳ (Open Classes per Semester)
-- =====================================================
INSERT INTO "LOPMO" ("MaHocKy", "MaLop", "SoLuongDaDangKy") VALUES
('HK2-2526', 'ACCT5123.N01', 0),
('HK2-2526', 'AI001.N01', 0),
('HK2-2526', 'AI002.N01', 0),
('HK2-2526', 'AI505.N01', 0),
('HK2-2526', 'BUS1125.N01', 0),
('HK2-2526', 'CE005.N01', 0),
('HK2-2526', 'CE103.N01', 0),
('HK2-2526', 'CE118.N01', 0),
('HK2-2526', 'CE119.N01', 0),
('HK2-2526', 'CE122.N01', 0),
('HK2-2526', 'CE124.N01', 0),
('HK2-2526', 'CE201.N01', 0),
('HK2-2526', 'CE206.N01', 0),
('HK2-2526', 'CE213.N01', 0),
('HK2-2526', 'CE222.N01', 0),
('HK2-2526', 'CE224.N01', 0),
('HK2-2526', 'CE232.N01', 0),
('HK2-2526', 'CE339.N01', 0),
('HK2-2526', 'CE340.N01', 0),
('HK2-2526', 'CE344.N01', 0),
('HK2-2526', 'CE410.N01', 0),
('HK2-2526', 'CE433.N01', 0),
('HK2-2526', 'CE502.N01', 0),
('HK2-2526', 'CE505.N01', 0),
('HK2-2526', 'CS005.N01', 0),
('HK2-2526', 'CS105.N01', 0),
('HK2-2526', 'CS106.N01', 0),
('HK2-2526', 'CS111.N01', 0),
('HK2-2526', 'CS112.N01', 0),
('HK2-2526', 'CS114.N01', 0),
('HK2-2526', 'CS115.N01', 0),
('HK2-2526', 'CS116.N01', 0),
('HK2-2526', 'CS117.N01', 0),
('HK2-2526', 'CS211.N01', 0),
('HK2-2526', 'CS2134.N01', 0),
('HK2-2526', 'CS217.N01', 0),
('HK2-2526', 'CS221.N01', 0),
('HK2-2526', 'CS231.N01', 0),
('HK2-2526', 'CS311.N01', 0),
('HK2-2526', 'CS315.N01', 0),
('HK2-2526', 'CS316.N01', 0),
('HK2-2526', 'CS331.N01', 0),
('HK2-2526', 'CS333.N01', 0),
('HK2-2526', 'CS338.N01', 0),
('HK2-2526', 'CS3443.N01', 0),
('HK2-2526', 'CS3653.N01', 0),
('HK2-2526', 'CS405.N01', 0),
('HK2-2526', 'CS409.N01', 0),
('HK2-2526', 'CS410.N01', 0),
('HK2-2526', 'CS412.N01', 0),
('HK2-2526', 'CS4153.N01', 0),
('HK2-2526', 'CS4283.N01', 0),
('HK2-2526', 'CS431.N01', 0),
('HK2-2526', 'CS4323.N01', 0),
('HK2-2526', 'CS4343.N01', 0),
('HK2-2526', 'CS5000.N01', 0),
('HK2-2526', 'CS505.N01', 0),
('HK2-2526', 'CS523.N01', 0),
('HK2-2526', 'CS526.N01', 0),
('HK2-2526', 'CS527.N01', 0),
('HK2-2526', 'CS5423.N01', 0),
('HK2-2526', 'CS5433.N01', 0),
('HK2-2526', 'CU001.N01', 0),
('HK2-2526', 'DS005.N01', 0),
('HK2-2526', 'DS101.N01', 0),
('HK2-2526', 'DS102.N01', 0),
('HK2-2526', 'DS103.N01', 0),
('HK2-2526', 'DS104.N01', 0),
('HK2-2526', 'DS105.N01', 0),
('HK2-2526', 'DS107.N01', 0),
('HK2-2526', 'DS108.N01', 0),
('HK2-2526', 'DS200.N01', 0),
('HK2-2526', 'DS201.N01', 0),
('HK2-2526', 'DS207.N01', 0),
('HK2-2526', 'DS300.N01', 0),
('HK2-2526', 'DS301.N01', 0),
('HK2-2526', 'DS304.N01', 0),
('HK2-2526', 'DS307.N01', 0),
('HK2-2526', 'DS310.N01', 0),
('HK2-2526', 'DS505.N01', 0),
('HK2-2526', 'EC001.N01', 0),
('HK2-2526', 'EC002.N01', 0),
('HK2-2526', 'EC005.N01', 0),
('HK2-2526', 'EC101.N01', 0),
('HK2-2526', 'EC201.N01', 0),
('HK2-2526', 'EC204.N01', 0),
('HK2-2526', 'EC208.N01', 0),
('HK2-2526', 'EC213.N01', 0),
('HK2-2526', 'EC214.N01', 0),
('HK2-2526', 'EC222.N01', 0),
('HK2-2526', 'EC229.N01', 0),
('HK2-2526', 'EC232.N01', 0),
('HK2-2526', 'EC304.N01', 0),
('HK2-2526', 'EC312.N01', 0),
('HK2-2526', 'EC331.N01', 0),
('HK2-2526', 'EC333.N01', 0),
('HK2-2526', 'EC335.N01', 0),
('HK2-2526', 'EC337.N01', 0),
('HK2-2526', 'EC338.N01', 0),
('HK2-2526', 'EC401.N01', 0),
('HK2-2526', 'EC402.N01', 0),
('HK2-2526', 'ENG01.N01', 0),
('HK2-2526', 'ENG02.N01', 6),
('HK2-2526', 'ENG03.N01', 0),
('HK2-2526', 'ENG04.N01', 0),
('HK2-2526', 'ENG05.N01', 0),
('HK2-2526', 'ENG06.N01', 0),
('HK2-2526', 'ENG07.N01', 0),
('HK2-2526', 'IE005.N01', 0),
('HK2-2526', 'IE101.N01', 0),
('HK2-2526', 'IE103.N01', 0),
('HK2-2526', 'IE104.N01', 0),
('HK2-2526', 'IE105.N01', 0),
('HK2-2526', 'IE106.N01', 0),
('HK2-2526', 'IE108.N01', 0),
('HK2-2526', 'IE203.N01', 0),
('HK2-2526', 'IE204.N01', 0),
('HK2-2526', 'IE207.N01', 0),
('HK2-2526', 'IE213.N01', 0),
('HK2-2526', 'IE231.N01', 0),
('HK2-2526', 'IE303.N01', 0),
('HK2-2526', 'IE307.N01', 0),
('HK2-2526', 'IE309.N01', 0),
('HK2-2526', 'IE310.N01', 0),
('HK2-2526', 'IE505.N01', 0),
('HK2-2526', 'IS005.N01', 0),
('HK2-2526', 'IS201.N01', 0),
('HK2-2526', 'IS207.N01', 0),
('HK2-2526', 'IS208.N01', 0),
('HK2-2526', 'IS210.N01', 0),
('HK2-2526', 'IS211.N01', 0),
('HK2-2526', 'IS216.N01', 0),
('HK2-2526', 'IS217.N01', 0),
('HK2-2526', 'IS251.N01', 0),
('HK2-2526', 'IS252.N01', 0),
('HK2-2526', 'IS334.N01', 0),
('HK2-2526', 'IS336.N01', 0),
('HK2-2526', 'IS344.N01', 0),
('HK2-2526', 'IS345.N01', 0),
('HK2-2526', 'IS346.N01', 0),
('HK2-2526', 'IS347.N01', 0),
('HK2-2526', 'IS348.N01', 0),
('HK2-2526', 'IS349.N01', 0),
('HK2-2526', 'IS352.N01', 0),
('HK2-2526', 'IS353.N01', 0),
('HK2-2526', 'IS354.N01', 0),
('HK2-2526', 'IS355.N01', 0),
('HK2-2526', 'IS356.N01', 0),
('HK2-2526', 'IS401.N01', 0),
('HK2-2526', 'IS402.N01', 0),
('HK2-2526', 'IS403.N01', 0),
('HK2-2526', 'IS405.N01', 0),
('HK2-2526', 'IS406.N01', 0),
('HK2-2526', 'IS502.N01', 0),
('HK2-2526', 'IT001.N01', 0),
('HK2-2526', 'IT002.N01', 6),
('HK2-2526', 'IT003.N01', 5),
('HK2-2526', 'IT004.N01', 0),
('HK2-2526', 'IT005.N01', 1),
('HK2-2526', 'IT006.N01', 1),
('HK2-2526', 'IT007.N01', 0),
('HK2-2526', 'IT008.N01', 0),
('HK2-2526', 'IT010.N01', 0),
('HK2-2526', 'IT012.N01', 1),
('HK2-2526', 'JAN01.N01', 0),
('HK2-2526', 'JAN02.N01', 0),
('HK2-2526', 'JAN03.N01', 0),
('HK2-2526', 'JAN04.N01', 0),
('HK2-2526', 'JAN05.N01', 0),
('HK2-2526', 'JAN06.N01', 0),
('HK2-2526', 'JAN07.N01', 0),
('HK2-2526', 'JAN08.N01', 0),
('HK2-2526', 'MA003.N01', 0),
('HK2-2526', 'MA004.N01', 6),
('HK2-2526', 'MA005.N01', 5),
('HK2-2526', 'MA006.N01', 0),
('HK2-2526', 'MATH2154.N01', 0),
('HK2-2526', 'MATH3013.N01', 0),
('HK2-2526', 'ME001.N01', 0),
('HK2-2526', 'MKTG5883.N01', 0),
('HK2-2526', 'MSIS207.N01', 0),
('HK2-2526', 'MSIS2433.N01', 0),
('HK2-2526', 'MSIS3033.N01', 0),
('HK2-2526', 'MSIS4013.N01', 0),
('HK2-2526', 'MSIS406.N01', 0),
('HK2-2526', 'MSIS4263.N01', 0),
('HK2-2526', 'MSIS5723.N01', 0),
('HK2-2526', 'NT005.N01', 0),
('HK2-2526', 'NT015.N01', 0),
('HK2-2526', 'NT101.N01', 0),
('HK2-2526', 'NT105.N01', 0),
('HK2-2526', 'NT106.N01', 0),
('HK2-2526', 'NT109.N01', 0),
('HK2-2526', 'NT113.N01', 0),
('HK2-2526', 'NT114.N01', 0),
('HK2-2526', 'NT118.N01', 0),
('HK2-2526', 'NT121.N01', 0),
('HK2-2526', 'NT131.N01', 0),
('HK2-2526', 'NT132.N01', 0),
('HK2-2526', 'NT137.N01', 0),
('HK2-2526', 'NT140.N01', 0),
('HK2-2526', 'NT201.N01', 0),
('HK2-2526', 'NT204.N01', 0),
('HK2-2526', 'NT205.N01', 0),
('HK2-2526', 'NT207.N01', 0),
('HK2-2526', 'NT208.N01', 0),
('HK2-2526', 'NT209.N01', 0),
('HK2-2526', 'NT210.N01', 0),
('HK2-2526', 'NT211.N01', 0),
('HK2-2526', 'NT212.N01', 0),
('HK2-2526', 'NT213.N01', 0),
('HK2-2526', 'NT215.N01', 0),
('HK2-2526', 'NT219.N01', 0),
('HK2-2526', 'NT230.N01', 0),
('HK2-2526', 'NT330.N01', 0),
('HK2-2526', 'NT332.N01', 0),
('HK2-2526', 'NT334.N01', 0),
('HK2-2526', 'NT405.N01', 0),
('HK2-2526', 'NT505.N01', 0),
('HK2-2526', 'NT521.N01', 0),
('HK2-2526', 'NT522.N01', 0),
('HK2-2526', 'NT533.N01', 0),
('HK2-2526', 'NT534.N01', 0),
('HK2-2526', 'NT535.N01', 0),
('HK2-2526', 'NT539.N01', 0),
('HK2-2526', 'NT541.N01', 0),
('HK2-2526', 'PE012.N01', 0),
('HK2-2526', 'PE231.N01', 0),
('HK2-2526', 'PE232.N01', 0),
('HK2-2526', 'PH002.N01', 0),
('HK2-2526', 'PHYS1215.N01', 0),
('HK2-2526', 'SE005.N01', 0),
('HK2-2526', 'SE100.N01', 0),
('HK2-2526', 'SE104.N01', 0),
('HK2-2526', 'SE113.N01', 0),
('HK2-2526', 'SE121.N01', 0),
('HK2-2526', 'SE122.N01', 0),
('HK2-2526', 'SE215.N01', 0),
('HK2-2526', 'SE301.N01', 0),
('HK2-2526', 'SE358.N01', 0),
('HK2-2526', 'SE400.N01', 0),
('HK2-2526', 'SE401.N01', 0),
('HK2-2526', 'SE403.N01', 0),
('HK2-2526', 'SE405.N01', 0),
('HK2-2526', 'SE501.N01', 0),
('HK2-2526', 'SE505.N01', 0),
('HK2-2526', 'SPCH2713.N01', 0),
('HK2-2526', 'SPCH3723.N01', 0),
('HK2-2526', 'SS003.N01', 0),
('HK2-2526', 'SS004.N01', 0),
('HK2-2526', 'SS006.N01', 0),
('HK2-2526', 'SS007.N01', 0),
('HK2-2526', 'SS008.N01', 0),
('HK2-2526', 'SS009.N01', 0),
('HK2-2526', 'SS010.N01', 0),
('HK2-2526', 'STAT3013.N01', 0),
('HK2-2526', 'STAT4033.N01', 0),
('HK2-2526', 'TLH025.N01', 0),
('HK2-2526', 'IS350.N01', 0),
('HK2-2526', 'IS359.N01', 0),
('HK2-2526', 'CS5032.N01', 0);

UPDATE "LOPMO" lm
SET
  "MaGiangVien" = COALESCE(lm."MaGiangVien", l."MaGiangVien"),
  "GiangVien" = COALESCE(lm."GiangVien", l."GiangVien")
FROM "LOP" l
WHERE l."MaLop" = lm."MaLop";

-- =====================================================
-- INSERT DATA - Lịch học lớp (Class Schedule Details)
-- Liên kết lớp mở với tiết học và thứ trong tuần
-- "LopMoId" tham chiếu từ bảng "LOPMO" (auto-generated)
-- =====================================================
INSERT INTO "LICHHOCLOP" ("LopMoId", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "PhongHoc", "GhiChu") VALUES
(1, 3, 'T4', 'T5', 'I.0002', 'ACCT5123.N01 - Thứ 3, Tiết 4-5'),
(2, 2, 'T6', 'T8', 'C.0007', 'AI001.N01 - Thứ 2, Tiết 6-8'),
(3, 3, 'T8', 'T10', 'C.0008', 'AI002.N01 - Thứ 3, Tiết 8-10'),
(4, 3, 'T4', 'T5', 'C.0014', 'AI505.N01 - Thứ 3, Tiết 4-5'),
(5, 7, 'T4', 'T5', 'B.0018', 'BUS1125.N01 - Thứ 7, Tiết 4-5'),
(6, 4, 'T1', 'T3', 'CE.0021', 'CE005.N01 - Thứ 4, Tiết 1-3'),
(7, 3, 'T4', 'T5', 'CE.0026', 'CE103.N01 - Thứ 3, Tiết 4-5'),
(8, 7, 'T8', 'T10', 'CE.0048', 'CE118.N01 - Thứ 7, Tiết 8-10'),
(9, 3, 'T4', 'T5', 'CE.0050', 'CE119.N01 - Thứ 3, Tiết 4-5'),
(10, 5, 'T8', 'T10', 'CE.0052', 'CE122.N01 - Thứ 5, Tiết 8-10'),
(11, 7, 'T4', 'T5', 'CE.0054', 'CE124.N01 - Thứ 7, Tiết 4-5'),
(12, 7, 'T8', 'T10', 'CE.0060', 'CE201.N01 - Thứ 7, Tiết 8-10'),
(13, 7, 'T4', 'T5', 'CE.0066', 'CE206.N01 - Thứ 7, Tiết 4-5'),
(14, 7, 'T8', 'T10', 'CE.0072', 'CE213.N01 - Thứ 7, Tiết 8-10'),
(15, 4, 'T6', 'T8', 'CE.0075', 'CE222.N01 - Thứ 4, Tiết 6-8'),
(16, 6, 'T1', 'T3', 'CE.0077', 'CE224.N01 - Thứ 6, Tiết 1-3'),
(17, 4, 'T1', 'T3', 'CE.0081', 'CE232.N01 - Thứ 4, Tiết 1-3'),
(18, 4, 'T6', 'T8', 'CE.0123', 'CE339.N01 - Thứ 4, Tiết 6-8'),
(19, 5, 'T8', 'T10', 'CE.0124', 'CE340.N01 - Thứ 5, Tiết 8-10'),
(20, 7, 'T8', 'T10', 'CE.0132', 'CE344.N01 - Thứ 7, Tiết 8-10'),
(21, 6, 'T1', 'T3', 'CE.0161', 'CE410.N01 - Thứ 6, Tiết 1-3'),
(22, 3, 'T4', 'T5', 'CE.0170', 'CE433.N01 - Thứ 3, Tiết 4-5'),
(23, 7, 'T4', 'T5', 'CE.0186', 'CE502.N01 - Thứ 7, Tiết 4-5'),
(24, 2, 'T6', 'T8', 'CE.0187', 'CE505.N01 - Thứ 2, Tiết 6-8'),
(25, 6, 'T1', 'T3', 'C.0245', 'CS005.N01 - Thứ 6, Tiết 1-3'),
(26, 4, 'T6', 'T8', 'C.0255', 'CS105.N01 - Thứ 4, Tiết 6-8'),
(27, 6, 'T1', 'T3', 'C.0257', 'CS106.N01 - Thứ 6, Tiết 1-3'),
(28, 7, 'T8', 'T10', 'C.0264', 'CS111.N01 - Thứ 7, Tiết 8-10'),
(29, 5, 'T8', 'T10', 'C.0268', 'CS112.N01 - Thứ 5, Tiết 8-10'),
(30, 7, 'T4', 'T5', 'C.0270', 'CS114.N01 - Thứ 7, Tiết 4-5'),
(31, 2, 'T6', 'T8', 'C.0271', 'CS115.N01 - Thứ 2, Tiết 6-8'),
(32, 3, 'T8', 'T10', 'C.0272', 'CS116.N01 - Thứ 3, Tiết 8-10'),
(33, 4, 'T1', 'T3', 'C.0273', 'CS117.N01 - Thứ 4, Tiết 1-3'),
(34, 7, 'T8', 'T10', 'C.0276', 'CS211.N01 - Thứ 7, Tiết 8-10'),
(35, 2, 'T6', 'T8', 'I.0283', 'CS2134.N01 - Thứ 2, Tiết 6-8'),
(36, 6, 'T6', 'T8', 'C.0287', 'CS217.N01 - Thứ 6, Tiết 6-8'),
(37, 7, 'T8', 'T10', 'C.0288', 'CS221.N01 - Thứ 7, Tiết 8-10'),
(38, 4, 'T6', 'T8', 'C.0303', 'CS231.N01 - Thứ 4, Tiết 6-8'),
(39, 2, 'T1', 'T3', 'C.0313', 'CS311.N01 - Thứ 2, Tiết 1-3'),
(40, 3, 'T8', 'T10', 'C.0320', 'CS315.N01 - Thứ 3, Tiết 8-10'),
(41, 5, 'T4', 'T5', 'C.0322', 'CS316.N01 - Thứ 5, Tiết 4-5'),
(42, 2, 'T1', 'T3', 'C.0337', 'CS331.N01 - Thứ 2, Tiết 1-3'),
(43, 6, 'T1', 'T3', 'C.0341', 'CS333.N01 - Thứ 6, Tiết 1-3'),
(44, 2, 'T6', 'T8', 'C.0355', 'CS338.N01 - Thứ 2, Tiết 6-8'),
(45, 2, 'T1', 'T3', 'I.0361', 'CS3443.N01 - Thứ 2, Tiết 1-3'),
(46, 2, 'T6', 'T8', 'I.0367', 'CS3653.N01 - Thứ 2, Tiết 6-8'),
(47, 4, 'T6', 'T8', 'C.0375', 'CS405.N01 - Thứ 4, Tiết 6-8'),
(48, 4, 'T1', 'T3', 'C.0381', 'CS409.N01 - Thứ 4, Tiết 1-3'),
(49, 6, 'T6', 'T8', 'C.0383', 'CS410.N01 - Thứ 6, Tiết 6-8'),
(50, 3, 'T4', 'T5', 'C.0386', 'CS412.N01 - Thứ 3, Tiết 4-5'),
(51, 4, 'T1', 'T3', 'I.0393', 'CS4153.N01 - Thứ 4, Tiết 1-3'),
(52, 6, 'T6', 'T8', 'I.0407', 'CS4283.N01 - Thứ 6, Tiết 6-8'),
(53, 7, 'T8', 'T10', 'C.0408', 'CS431.N01 - Thứ 7, Tiết 8-10'),
(54, 2, 'T1', 'T3', 'I.0409', 'CS4323.N01 - Thứ 2, Tiết 1-3'),
(55, 3, 'T4', 'T5', 'I.0410', 'CS4343.N01 - Thứ 3, Tiết 4-5'),
(56, 3, 'T8', 'T10', 'I.0416', 'CS5000.N01 - Thứ 3, Tiết 8-10'),
(57, 5, 'T8', 'T10', 'C.0424', 'CS505.N01 - Thứ 5, Tiết 8-10'),
(58, 2, 'T1', 'T3', 'C.0445', 'CS523.N01 - Thứ 2, Tiết 1-3'),
(59, 7, 'T4', 'T5', 'C.0450', 'CS526.N01 - Thứ 7, Tiết 4-5'),
(60, 2, 'T6', 'T8', 'C.0451', 'CS527.N01 - Thứ 2, Tiết 6-8'),
(61, 3, 'T8', 'T10', 'I.0464', 'CS5423.N01 - Thứ 3, Tiết 8-10'),
(62, 5, 'T4', 'T5', 'I.0466', 'CS5433.N01 - Thứ 5, Tiết 4-5'),
(63, 5, 'T4', 'T5', 'D.0538', 'CU001.N01 - Thứ 5, Tiết 4-5'),
(64, 3, 'T4', 'T5', 'D.0542', 'DS005.N01 - Thứ 3, Tiết 4-5'),
(65, 4, 'T6', 'T8', 'D.0543', 'DS101.N01 - Thứ 4, Tiết 6-8'),
(66, 5, 'T8', 'T10', 'D.0544', 'DS102.N01 - Thứ 5, Tiết 8-10'),
(67, 7, 'T4', 'T5', 'D.0546', 'DS103.N01 - Thứ 7, Tiết 4-5'),
(68, 3, 'T8', 'T10', 'D.0548', 'DS104.N01 - Thứ 3, Tiết 8-10'),
(69, 5, 'T4', 'T5', 'D.0550', 'DS105.N01 - Thứ 5, Tiết 4-5'),
(70, 2, 'T1', 'T3', 'D.0553', 'DS107.N01 - Thứ 2, Tiết 1-3'),
(71, 4, 'T6', 'T8', 'D.0555', 'DS108.N01 - Thứ 4, Tiết 6-8'),
(72, 6, 'T1', 'T3', 'D.0557', 'DS200.N01 - Thứ 6, Tiết 1-3'),
(73, 2, 'T6', 'T8', 'D.0559', 'DS201.N01 - Thứ 2, Tiết 6-8'),
(74, 7, 'T8', 'T10', 'D.0564', 'DS207.N01 - Thứ 7, Tiết 8-10'),
(75, 2, 'T1', 'T3', 'D.0565', 'DS300.N01 - Thứ 2, Tiết 1-3'),
(76, 4, 'T6', 'T8', 'D.0567', 'DS301.N01 - Thứ 4, Tiết 6-8'),
(77, 4, 'T1', 'T3', 'D.0573', 'DS304.N01 - Thứ 4, Tiết 1-3'),
(78, 2, 'T1', 'T3', 'D.0577', 'DS307.N01 - Thứ 2, Tiết 1-3'),
(79, 6, 'T1', 'T3', 'D.0581', 'DS310.N01 - Thứ 6, Tiết 1-3'),
(80, 5, 'T4', 'T5', 'D.0610', 'DS505.N01 - Thứ 5, Tiết 4-5'),
(81, 5, 'T8', 'T10', 'I.0616', 'EC001.N01 - Thứ 5, Tiết 8-10'),
(82, 6, 'T1', 'T3', 'I.0617', 'EC002.N01 - Thứ 6, Tiết 1-3'),
(83, 2, 'T6', 'T8', 'I.0619', 'EC005.N01 - Thứ 2, Tiết 6-8'),
(84, 3, 'T8', 'T10', 'I.0620', 'EC101.N01 - Thứ 3, Tiết 8-10'),
(85, 4, 'T1', 'T3', 'I.0621', 'EC201.N01 - Thứ 4, Tiết 1-3'),
(86, 4, 'T6', 'T8', 'I.0627', 'EC204.N01 - Thứ 4, Tiết 6-8'),
(87, 6, 'T1', 'T3', 'I.0629', 'EC208.N01 - Thứ 6, Tiết 1-3'),
(88, 2, 'T6', 'T8', 'I.0631', 'EC213.N01 - Thứ 2, Tiết 6-8'),
(89, 4, 'T1', 'T3', 'I.0633', 'EC214.N01 - Thứ 4, Tiết 1-3'),
(90, 6, 'T6', 'T8', 'I.0635', 'EC222.N01 - Thứ 6, Tiết 6-8'),
(91, 7, 'T8', 'T10', 'I.0636', 'EC229.N01 - Thứ 7, Tiết 8-10'),
(92, 2, 'T1', 'T3', 'I.0637', 'EC232.N01 - Thứ 2, Tiết 1-3'),
(93, 7, 'T4', 'T5', 'I.0642', 'EC304.N01 - Thứ 7, Tiết 4-5'),
(94, 4, 'T1', 'T3', 'I.0645', 'EC312.N01 - Thứ 4, Tiết 1-3'),
(95, 6, 'T6', 'T8', 'I.0647', 'EC331.N01 - Thứ 6, Tiết 6-8'),
(96, 2, 'T1', 'T3', 'I.0649', 'EC333.N01 - Thứ 2, Tiết 1-3'),
(97, 4, 'T6', 'T8', 'I.0651', 'EC335.N01 - Thứ 4, Tiết 6-8'),
(98, 6, 'T1', 'T3', 'I.0653', 'EC337.N01 - Thứ 6, Tiết 1-3'),
(99, 7, 'T4', 'T5', 'I.0654', 'EC338.N01 - Thứ 7, Tiết 4-5'),
(100, 2, 'T6', 'T8', 'I.0655', 'EC401.N01 - Thứ 2, Tiết 6-8'),
(101, 3, 'T8', 'T10', 'I.0656', 'EC402.N01 - Thứ 3, Tiết 8-10'),
(102, 5, 'T8', 'T10', 'B.0676', 'ENG01.N01 - Thứ 5, Tiết 8-10'),
(103, 6, 'T1', 'T3', 'B.0677', 'ENG02.N01 - Thứ 6, Tiết 1-3'),
(104, 7, 'T4', 'T5', 'B.0678', 'ENG03.N01 - Thứ 7, Tiết 4-5'),
(105, 2, 'T6', 'T8', 'B.0679', 'ENG04.N01 - Thứ 2, Tiết 6-8'),
(106, 3, 'T8', 'T10', 'B.0680', 'ENG05.N01 - Thứ 3, Tiết 8-10'),
(107, 4, 'T1', 'T3', 'B.0681', 'ENG06.N01 - Thứ 4, Tiết 1-3'),
(108, 5, 'T4', 'T5', 'B.0682', 'ENG07.N01 - Thứ 5, Tiết 4-5'),
(109, 5, 'T8', 'T10', 'D.0700', 'IE005.N01 - Thứ 5, Tiết 8-10'),
(110, 6, 'T1', 'T3', 'D.0701', 'IE101.N01 - Thứ 6, Tiết 1-3'),
(111, 4, 'T1', 'T3', 'D.0705', 'IE103.N01 - Thứ 4, Tiết 1-3'),
(112, 6, 'T6', 'T8', 'D.0707', 'IE104.N01 - Thứ 6, Tiết 6-8'),
(113, 7, 'T8', 'T10', 'D.0708', 'IE105.N01 - Thứ 7, Tiết 8-10'),
(114, 3, 'T4', 'T5', 'D.0710', 'IE106.N01 - Thứ 3, Tiết 4-5'),
(115, 7, 'T4', 'T5', 'D.0714', 'IE108.N01 - Thứ 7, Tiết 4-5'),
(116, 5, 'T4', 'T5', 'D.0718', 'IE203.N01 - Thứ 5, Tiết 4-5'),
(117, 6, 'T6', 'T8', 'D.0719', 'IE204.N01 - Thứ 6, Tiết 6-8'),
(118, 4, 'T6', 'T8', 'D.0723', 'IE207.N01 - Thứ 4, Tiết 6-8'),
(119, 6, 'T6', 'T8', 'D.0731', 'IE213.N01 - Thứ 6, Tiết 6-8'),
(120, 2, 'T1', 'T3', 'D.0757', 'IE231.N01 - Thứ 2, Tiết 1-3'),
(121, 3, 'T8', 'T10', 'D.0764', 'IE303.N01 - Thứ 3, Tiết 8-10'),
(122, 7, 'T8', 'T10', 'D.0768', 'IE307.N01 - Thứ 7, Tiết 8-10'),
(123, 3, 'T4', 'T5', 'D.0770', 'IE309.N01 - Thứ 3, Tiết 4-5'),
(124, 4, 'T6', 'T8', 'D.0771', 'IE310.N01 - Thứ 4, Tiết 6-8'),
(125, 6, 'T1', 'T3', 'D.0785', 'IE505.N01 - Thứ 6, Tiết 1-3'),
(126, 4, 'T6', 'T8', 'I.0795', 'IS005.N01 - Thứ 4, Tiết 6-8'),
(127, 5, 'T8', 'T10', 'I.0808', 'IS201.N01 - Thứ 5, Tiết 8-10'),
(128, 4, 'T6', 'T8', 'I.0819', 'IS207.N01 - Thứ 4, Tiết 6-8'),
(129, 6, 'T1', 'T3', 'I.0821', 'IS208.N01 - Thứ 6, Tiết 1-3'),
(130, 2, 'T6', 'T8', 'I.0823', 'IS210.N01 - Thứ 2, Tiết 6-8'),
(131, 4, 'T1', 'T3', 'I.0825', 'IS211.N01 - Thứ 4, Tiết 1-3'),
(132, 4, 'T6', 'T8', 'I.0831', 'IS216.N01 - Thứ 4, Tiết 6-8'),
(133, 6, 'T1', 'T3', 'I.0833', 'IS217.N01 - Thứ 6, Tiết 1-3'),
(134, 7, 'T8', 'T10', 'I.0840', 'IS251.N01 - Thứ 7, Tiết 8-10'),
(135, 3, 'T4', 'T5', 'I.0842', 'IS252.N01 - Thứ 3, Tiết 4-5'),
(136, 7, 'T4', 'T5', 'I.0858', 'IS334.N01 - Thứ 7, Tiết 4-5'),
(137, 3, 'T8', 'T10', 'I.0860', 'IS336.N01 - Thứ 3, Tiết 8-10'),
(138, 7, 'T4', 'T5', 'I.0870', 'IS344.N01 - Thứ 7, Tiết 4-5'),
(139, 3, 'T8', 'T10', 'I.0872', 'IS345.N01 - Thứ 3, Tiết 8-10'),
(140, 4, 'T1', 'T3', 'I.0873', 'IS346.N01 - Thứ 4, Tiết 1-3'),
(141, 6, 'T6', 'T8', 'I.0875', 'IS347.N01 - Thứ 6, Tiết 6-8'),
(142, 7, 'T8', 'T10', 'I.0876', 'IS348.N01 - Thứ 7, Tiết 8-10'),
(143, 3, 'T4', 'T5', 'I.0878', 'IS349.N01 - Thứ 3, Tiết 4-5'),
(144, 6, 'T1', 'T3', 'I.0881', 'IS352.N01 - Thứ 6, Tiết 1-3'),
(145, 7, 'T4', 'T5', 'I.0882', 'IS353.N01 - Thứ 7, Tiết 4-5'),
(146, 2, 'T6', 'T8', 'I.0883', 'IS354.N01 - Thứ 2, Tiết 6-8'),
(147, 3, 'T8', 'T10', 'I.0884', 'IS355.N01 - Thứ 3, Tiết 8-10'),
(148, 4, 'T1', 'T3', 'I.0885', 'IS356.N01 - Thứ 4, Tiết 1-3'),
(149, 6, 'T1', 'T3', 'I.0893', 'IS401.N01 - Thứ 6, Tiết 1-3'),
(150, 2, 'T6', 'T8', 'I.0895', 'IS402.N01 - Thứ 2, Tiết 6-8'),
(151, 3, 'T8', 'T10', 'I.0896', 'IS403.N01 - Thứ 3, Tiết 8-10'),
(152, 6, 'T6', 'T8', 'I.0899', 'IS405.N01 - Thứ 6, Tiết 6-8'),
(153, 2, 'T1', 'T3', 'I.0901', 'IS406.N01 - Thứ 2, Tiết 1-3'),
(154, 2, 'T6', 'T8', 'I.0907', 'IS502.N01 - Thứ 2, Tiết 6-8'),
(155, 2, 'T1', 'T3', 'C.0913', 'IT001.N01 - Thứ 2, Tiết 1-3'),
(156, 4, 'T6', 'T8', 'E.0915', 'IT002.N01 - Thứ 4, Tiết 6-8'),
(157, 6, 'T1', 'T3', 'C.0917', 'IT003.N01 - Thứ 6, Tiết 1-3'),
(158, 2, 'T6', 'T8', 'I.0919', 'IT004.N01 - Thứ 2, Tiết 6-8'),
(159, 4, 'T1', 'T3', 'N.0921', 'IT005.N01 - Thứ 4, Tiết 1-3'),
(160, 6, 'T6', 'T8', 'CE.0923', 'IT006.N01 - Thứ 6, Tiết 6-8'),
(161, 7, 'T8', 'T10', 'CE.0924', 'IT007.N01 - Thứ 7, Tiết 8-10'),
(162, 3, 'T4', 'T5', 'E.0926', 'IT008.N01 - Thứ 3, Tiết 4-5'),
(163, 5, 'T8', 'T10', 'CE.0928', 'IT010.N01 - Thứ 5, Tiết 8-10'),
(164, 2, 'T6', 'T8', 'CE.0931', 'IT012.N01 - Thứ 2, Tiết 6-8'),
(165, 3, 'T4', 'T5', 'B.0938', 'JAN01.N01 - Thứ 3, Tiết 4-5'),
(166, 5, 'T8', 'T10', 'B.0940', 'JAN02.N01 - Thứ 5, Tiết 8-10'),
(167, 7, 'T4', 'T5', 'B.0942', 'JAN03.N01 - Thứ 7, Tiết 4-5'),
(168, 3, 'T8', 'T10', 'B.0944', 'JAN04.N01 - Thứ 3, Tiết 8-10'),
(169, 5, 'T4', 'T5', 'B.0946', 'JAN05.N01 - Thứ 5, Tiết 4-5'),
(170, 7, 'T8', 'T10', 'B.0948', 'JAN06.N01 - Thứ 7, Tiết 8-10'),
(171, 3, 'T4', 'T5', 'B.0950', 'JAN07.N01 - Thứ 3, Tiết 4-5'),
(172, 5, 'T8', 'T10', 'B.0952', 'JAN08.N01 - Thứ 5, Tiết 8-10'),
(173, 6, 'T6', 'T8', 'B.0959', 'MA003.N01 - Thứ 6, Tiết 6-8'),
(174, 7, 'T8', 'T10', 'B.0960', 'MA004.N01 - Thứ 7, Tiết 8-10'),
(175, 2, 'T1', 'T3', 'B.0961', 'MA005.N01 - Thứ 2, Tiết 1-3'),
(176, 3, 'T4', 'T5', 'B.0962', 'MA006.N01 - Thứ 3, Tiết 4-5'),
(177, 4, 'T6', 'T8', 'I.0975', 'MATH2154.N01 - Thứ 4, Tiết 6-8'),
(178, 5, 'T8', 'T10', 'I.0976', 'MATH3013.N01 - Thứ 5, Tiết 8-10'),
(179, 6, 'T1', 'T3', 'B.0977', 'ME001.N01 - Thứ 6, Tiết 1-3'),
(180, 3, 'T8', 'T10', 'I.0980', 'MKTG5883.N01 - Thứ 3, Tiết 8-10'),
(181, 4, 'T6', 'T8', 'I.1059', 'MSIS207.N01 - Thứ 4, Tiết 6-8'),
(182, 5, 'T8', 'T10', 'I.1060', 'MSIS2433.N01 - Thứ 5, Tiết 8-10'),
(183, 6, 'T1', 'T3', 'I.1061', 'MSIS3033.N01 - Thứ 6, Tiết 1-3'),
(184, 6, 'T6', 'T8', 'I.1067', 'MSIS4013.N01 - Thứ 6, Tiết 6-8'),
(185, 3, 'T4', 'T5', 'I.1070', 'MSIS406.N01 - Thứ 3, Tiết 4-5'),
(186, 7, 'T4', 'T5', 'I.1074', 'MSIS4263.N01 - Thứ 7, Tiết 4-5'),
(187, 2, 'T1', 'T3', 'I.1081', 'MSIS5723.N01 - Thứ 2, Tiết 1-3'),
(188, 7, 'T4', 'T5', 'N.1086', 'NT005.N01 - Thứ 7, Tiết 4-5'),
(189, 2, 'T6', 'T8', 'N.1087', 'NT015.N01 - Thứ 2, Tiết 6-8'),
(190, 3, 'T8', 'T10', 'N.1088', 'NT101.N01 - Thứ 3, Tiết 8-10'),
(191, 4, 'T6', 'T8', 'N.1095', 'NT105.N01 - Thứ 4, Tiết 6-8'),
(192, 6, 'T1', 'T3', 'N.1097', 'NT106.N01 - Thứ 6, Tiết 1-3'),
(193, 4, 'T1', 'T3', 'N.1101', 'NT109.N01 - Thứ 4, Tiết 1-3'),
(194, 4, 'T6', 'T8', 'N.1107', 'NT113.N01 - Thứ 4, Tiết 6-8'),
(195, 6, 'T1', 'T3', 'N.1109', 'NT114.N01 - Thứ 6, Tiết 1-3'),
(196, 4, 'T1', 'T3', 'N.1113', 'NT118.N01 - Thứ 4, Tiết 1-3'),
(197, 7, 'T8', 'T10', 'N.1116', 'NT121.N01 - Thứ 7, Tiết 8-10'),
(198, 4, 'T6', 'T8', 'N.1119', 'NT131.N01 - Thứ 4, Tiết 6-8'),
(199, 6, 'T1', 'T3', 'N.1121', 'NT132.N01 - Thứ 6, Tiết 1-3'),
(200, 3, 'T8', 'T10', 'N.1124', 'NT137.N01 - Thứ 3, Tiết 8-10'),
(201, 5, 'T4', 'T5', 'N.1126', 'NT140.N01 - Thứ 5, Tiết 4-5'),
(202, 7, 'T8', 'T10', 'N.1128', 'NT201.N01 - Thứ 7, Tiết 8-10'),
(203, 4, 'T6', 'T8', 'N.1131', 'NT204.N01 - Thứ 4, Tiết 6-8'),
(204, 6, 'T1', 'T3', 'N.1133', 'NT205.N01 - Thứ 6, Tiết 1-3'),
(205, 4, 'T1', 'T3', 'N.1137', 'NT207.N01 - Thứ 4, Tiết 1-3'),
(206, 6, 'T6', 'T8', 'N.1139', 'NT208.N01 - Thứ 6, Tiết 6-8'),
(207, 7, 'T8', 'T10', 'N.1140', 'NT209.N01 - Thứ 7, Tiết 8-10'),
(208, 2, 'T1', 'T3', 'N.1141', 'NT210.N01 - Thứ 2, Tiết 1-3'),
(209, 3, 'T4', 'T5', 'N.1142', 'NT211.N01 - Thứ 3, Tiết 4-5'),
(210, 5, 'T8', 'T10', 'N.1144', 'NT212.N01 - Thứ 5, Tiết 8-10'),
(211, 6, 'T1', 'T3', 'N.1145', 'NT213.N01 - Thứ 6, Tiết 1-3'),
(212, 2, 'T6', 'T8', 'N.1147', 'NT215.N01 - Thứ 2, Tiết 6-8'),
(213, 5, 'T4', 'T5', 'N.1150', 'NT219.N01 - Thứ 5, Tiết 4-5'),
(214, 7, 'T8', 'T10', 'N.1152', 'NT230.N01 - Thứ 7, Tiết 8-10'),
(215, 7, 'T8', 'T10', 'N.1176', 'NT330.N01 - Thứ 7, Tiết 8-10'),
(216, 4, 'T6', 'T8', 'N.1179', 'NT332.N01 - Thứ 4, Tiết 6-8'),
(217, 7, 'T4', 'T5', 'N.1182', 'NT334.N01 - Thứ 7, Tiết 4-5'),
(218, 6, 'T1', 'T3', 'N.1193', 'NT405.N01 - Thứ 6, Tiết 1-3'),
(219, 4, 'T6', 'T8', 'N.1203', 'NT505.N01 - Thứ 4, Tiết 6-8'),
(220, 5, 'T4', 'T5', 'N.1210', 'NT521.N01 - Thứ 5, Tiết 4-5'),
(221, 6, 'T6', 'T8', 'N.1211', 'NT522.N01 - Thứ 6, Tiết 6-8'),
(222, 4, 'T1', 'T3', 'N.1221', 'NT533.N01 - Thứ 4, Tiết 1-3'),
(223, 6, 'T6', 'T8', 'N.1223', 'NT534.N01 - Thứ 6, Tiết 6-8'),
(224, 2, 'T1', 'T3', 'N.1225', 'NT535.N01 - Thứ 2, Tiết 1-3'),
(225, 3, 'T8', 'T10', 'N.1232', 'NT539.N01 - Thứ 3, Tiết 8-10'),
(226, 7, 'T8', 'T10', 'N.1236', 'NT541.N01 - Thứ 7, Tiết 8-10'),
(227, 3, 'T4', 'T5', 'B.1262', 'PE012.N01 - Thứ 3, Tiết 4-5'),
(228, 4, 'T6', 'T8', 'B.1263', 'PE231.N01 - Thứ 4, Tiết 6-8'),
(229, 5, 'T8', 'T10', 'B.1264', 'PE232.N01 - Thứ 5, Tiết 8-10'),
(230, 3, 'T8', 'T10', 'CE.1268', 'PH002.N01 - Thứ 3, Tiết 8-10'),
(231, 3, 'T8', 'T10', 'I.1280', 'PHYS1215.N01 - Thứ 3, Tiết 8-10'),
(232, 6, 'T6', 'T8', 'E.1283', 'SE005.N01 - Thứ 6, Tiết 6-8'),
(233, 7, 'T8', 'T10', 'E.1284', 'SE100.N01 - Thứ 7, Tiết 8-10'),
(234, 7, 'T4', 'T5', 'E.1290', 'SE104.N01 - Thứ 7, Tiết 4-5'),
(235, 6, 'T1', 'T3', 'E.1301', 'SE113.N01 - Thứ 6, Tiết 1-3'),
(236, 2, 'T1', 'T3', 'E.1309', 'SE121.N01 - Thứ 2, Tiết 1-3'),
(237, 3, 'T4', 'T5', 'E.1310', 'SE122.N01 - Thứ 3, Tiết 4-5'),
(238, 6, 'T1', 'T3', 'E.1325', 'SE215.N01 - Thứ 6, Tiết 1-3'),
(239, 5, 'T4', 'T5', 'E.1330', 'SE301.N01 - Thứ 5, Tiết 4-5'),
(240, 2, 'T1', 'T3', 'E.1393', 'SE358.N01 - Thứ 2, Tiết 1-3'),
(241, 5, 'T8', 'T10', 'E.1408', 'SE400.N01 - Thứ 5, Tiết 8-10'),
(242, 6, 'T1', 'T3', 'E.1409', 'SE401.N01 - Thứ 6, Tiết 1-3'),
(243, 2, 'T6', 'T8', 'E.1411', 'SE403.N01 - Thứ 2, Tiết 6-8'),
(244, 4, 'T1', 'T3', 'E.1413', 'SE405.N01 - Thứ 4, Tiết 1-3'),
(245, 7, 'T4', 'T5', 'E.1422', 'SE501.N01 - Thứ 7, Tiết 4-5'),
(246, 4, 'T1', 'T3', 'E.1425', 'SE505.N01 - Thứ 4, Tiết 1-3'),
(247, 5, 'T8', 'T10', 'I.1432', 'SPCH2713.N01 - Thứ 5, Tiết 8-10'),
(248, 6, 'T1', 'T3', 'I.1433', 'SPCH3723.N01 - Thứ 6, Tiết 1-3'),
(249, 4, 'T1', 'T3', 'B.1437', 'SS003.N01 - Thứ 4, Tiết 1-3'),
(250, 5, 'T4', 'T5', 'B.1438', 'SS004.N01 - Thứ 5, Tiết 4-5'),
(251, 7, 'T8', 'T10', 'B.1440', 'SS006.N01 - Thứ 7, Tiết 8-10'),
(252, 2, 'T1', 'T3', 'B.1441', 'SS007.N01 - Thứ 2, Tiết 1-3'),
(253, 3, 'T4', 'T5', 'B.1442', 'SS008.N01 - Thứ 3, Tiết 4-5'),
(254, 4, 'T6', 'T8', 'B.1443', 'SS009.N01 - Thứ 4, Tiết 6-8'),
(255, 5, 'T8', 'T10', 'B.1444', 'SS010.N01 - Thứ 5, Tiết 8-10'),
(256, 3, 'T8', 'T10', 'I.1448', 'STAT3013.N01 - Thứ 3, Tiết 8-10'),
(257, 4, 'T1', 'T3', 'I.1449', 'STAT4033.N01 - Thứ 4, Tiết 1-3'),
(258, 7, 'T8', 'T10', 'B.1452', 'TLH025.N01 - Thứ 7, Tiết 8-10'),
(259, 2, 'T6', 'T8', 'I.1459', 'IS350.N01 - Thứ 2, Tiết 6-8'),
(260, 3, 'T8', 'T10', 'I.1460', 'IS359.N01 - Thứ 3, Tiết 8-10'),
(261, 4, 'T1', 'T3', 'I.1461', 'CS5032.N01 - Thứ 4, Tiết 1-3');

UPDATE "LICHHOCLOP"
SET "GhiChu" = regexp_replace("GhiChu", '^(.+) Thu ([2-7]) T([0-9]+)-T([0-9]+)$', '\1 - Thứ \2, Tiết \3-\4')
WHERE "GhiChu" ~ ' Thu [2-7] T[0-9]+-T[0-9]+$';

-- Đồng bộ phòng học chi tiết trong lịch học lớp với danh mục PHONGHOC.
WITH phong_lich AS (
  SELECT DISTINCT TRIM("PhongHoc") AS "MaPhong"
  FROM "LICHHOCLOP"
  WHERE "PhongHoc" IS NOT NULL AND TRIM("PhongHoc") <> ''
)
INSERT INTO "PHONGHOC" ("MaPhong", "TenPhong", "ToaNha", "SucChua", "LoaiPhong", "TrangThai")
SELECT
  "MaPhong",
  'Phòng ' || "MaPhong",
  NULLIF(split_part("MaPhong", '.', 1), ''),
  60,
  'ly_thuyet',
  TRUE
FROM phong_lich
ON CONFLICT ("MaPhong") DO NOTHING;

UPDATE "LICHHOCLOP"
SET "MaPhong" = TRIM("PhongHoc")
WHERE "PhongHoc" IS NOT NULL
  AND TRIM("PhongHoc") <> ''
  AND EXISTS (
    SELECT 1 FROM "PHONGHOC" p WHERE p."MaPhong" = TRIM("LICHHOCLOP"."PhongHoc")
  );

UPDATE "LOP" l
SET
  "MaGiangVien" = COALESCE(l."MaGiangVien", lm."MaGiangVien"),
  "GiangVien" = COALESCE(l."GiangVien", lm."GiangVien"),
  "ThuTrongTuan" = COALESCE(l."ThuTrongTuan", lh."ThuTrongTuan"),
  "MaTietBatDau" = COALESCE(l."MaTietBatDau", lh."MaTietBatDau"),
  "MaTietKetThuc" = COALESCE(l."MaTietKetThuc", lh."MaTietKetThuc"),
  "MaPhong" = COALESCE(l."MaPhong", lh."MaPhong"),
  "PhongHoc" = COALESCE(l."PhongHoc", lh."PhongHoc")
FROM "LOPMO" lm
JOIN LATERAL (
  SELECT *
  FROM "LICHHOCLOP" lh
  WHERE lh."LopMoId" = lm.id
    AND COALESCE(lh."TrangThai", TRUE) = TRUE
  ORDER BY lh.id
  LIMIT 1
) lh ON TRUE
WHERE l."MaLop" = lm."MaLop"
  AND COALESCE(lm."TrangThai", TRUE) = TRUE;

-- =====================================================
-- INSERT DATA - Đối tượng của Sinh viên (Student Priority Objects)
-- =====================================================
INSERT INTO "DOITUONGSINHVIEN" ("MaSv", "MaDoiTuong", "GhiChu") VALUES
('22520002', 'DT06', 'Sinh viên thuộc diện vùng sâu vùng xa'),
('22520002', 'DT09', 'Sinh viên dân tộc thiểu số'),
('22520002', 'DT10', 'Sinh viên mồ côi cha hoặc mẹ'),
('22520003', 'DT07', 'Sinh viên thuộc hộ cận nghèo'),
('22520003', 'DT10', 'Sinh viên mồ côi cha hoặc mẹ'),
('22520003', 'DT12', 'Con thương binh, bệnh binh'),
('22520004', 'DT12', 'Con thương binh, bệnh binh'),
('22520005', 'DT09', 'Sinh viên dân tộc thiểu số'),
('22520005', 'DT10', 'Sinh viên mồ côi cha hoặc mẹ'),
('22520006', 'DT11', 'Sinh viên khuyết tật'),
('22520006', 'DT12', 'Con thương binh, bệnh binh');

-- =====================================================
-- INSERT DATA - Phiếu đăng ký học phần (Course Registration Forms)
-- Sử dụng giá trị "SoPhieu" cụ thể để đảm bảo tính nhất quán với "CHITIETDANGKY" và "PHIEUTHUHOCPHI"
-- =====================================================
-- INSERT DATA - Mon da hoc (generated from curriculum before current registration)
-- =====================================================
INSERT INTO "MONDAHOC" ("MaSv", "MaMonHoc", "MaHocKy", "MaLop", "LanHoc", "KetQua") VALUES
('22520001', 'MA006', 'HK1-2526', 'MA006.N01', 1, 'qua_mon'),
('22520001', 'MA003', 'HK1-2526', 'MA003.N01', 1, 'qua_mon'),
('22520001', 'ENG01', 'HK1-2526', 'ENG01.N01', 1, 'qua_mon'),
('22520001', 'SE005', 'HK1-2526', 'SE005.N01', 1, 'qua_mon'),
('22520001', 'IT001', 'HK1-2526', 'IT001.N01', 1, 'qua_mon'),
('22520001', 'IT012', 'HK1-2526', 'IT012.N01', 1, 'qua_mon'),
('22520001', 'ME001', 'HK1-2526', 'ME001.N01', 1, 'qua_mon'),
('22520002', 'IT001', 'HK1-2526', 'IT001.N01', 1, 'qua_mon'),
('22520002', 'MA006', 'HK1-2526', 'MA006.N01', 1, 'qua_mon'),
('22520002', 'MA003', 'HK1-2526', 'MA003.N01', 1, 'qua_mon'),
('22520002', 'CS005', 'HK1-2526', 'CS005.N01', 1, 'qua_mon'),
('22520002', 'ENG01', 'HK1-2526', 'ENG01.N01', 1, 'qua_mon'),
('22520002', 'ME001', 'HK1-2526', 'ME001.N01', 1, 'qua_mon'),
('22520003', 'IT001', 'HK1-2526', 'IT001.N01', 1, 'qua_mon'),
('22520003', 'MA006', 'HK1-2526', 'MA006.N01', 1, 'qua_mon'),
('22520003', 'MA003', 'HK1-2526', 'MA003.N01', 1, 'qua_mon'),
('22520003', 'IT010', 'HK1-2526', 'IT010.N01', 1, 'qua_mon'),
('22520003', 'IS005', 'HK1-2526', 'IS005.N01', 1, 'qua_mon'),
('22520003', 'ENG01', 'HK1-2526', 'ENG01.N01', 1, 'qua_mon'),
('22520003', 'ME001', 'HK1-2526', 'ME001.N01', 1, 'qua_mon'),
('22520004', 'MA006', 'HK1-2526', 'MA006.N01', 1, 'qua_mon'),
('22520004', 'MA003', 'HK1-2526', 'MA003.N01', 1, 'qua_mon'),
('22520004', 'ENG01', 'HK1-2526', 'ENG01.N01', 1, 'qua_mon'),
('22520004', 'SE005', 'HK1-2526', 'SE005.N01', 1, 'qua_mon'),
('22520004', 'IT001', 'HK1-2526', 'IT001.N01', 1, 'qua_mon'),
('22520004', 'IT012', 'HK1-2526', 'IT012.N01', 1, 'qua_mon'),
('22520004', 'ME001', 'HK1-2526', 'ME001.N01', 1, 'qua_mon'),
('22520005', 'IT001', 'HK1-2526', 'IT001.N01', 1, 'qua_mon'),
('22520005', 'MA006', 'HK1-2526', 'MA006.N01', 1, 'qua_mon'),
('22520005', 'MA003', 'HK1-2526', 'MA003.N01', 1, 'qua_mon'),
('22520005', 'PH002', 'HK1-2526', 'PH002.N01', 1, 'qua_mon'),
('22520005', 'NT005', 'HK1-2526', 'NT005.N01', 1, 'qua_mon'),
('22520005', 'ENG01', 'HK1-2526', 'ENG01.N01', 1, 'qua_mon'),
('22520005', 'ME001', 'HK1-2526', 'ME001.N01', 1, 'qua_mon'),
('22520006', 'MA006', 'HK1-2526', 'MA006.N01', 1, 'qua_mon'),
('22520006', 'MA003', 'HK1-2526', 'MA003.N01', 1, 'qua_mon'),
('22520006', 'ENG01', 'HK1-2526', 'ENG01.N01', 1, 'qua_mon'),
('22520006', 'SE005', 'HK1-2526', 'SE005.N01', 1, 'qua_mon'),
('22520006', 'IT001', 'HK1-2526', 'IT001.N01', 1, 'qua_mon'),
('22520006', 'IT012', 'HK1-2526', 'IT012.N01', 1, 'qua_mon'),
('22520006', 'ME001', 'HK1-2526', 'ME001.N01', 1, 'qua_mon');

-- =====================================================
INSERT INTO "PHIEUDANGKY" ("SoPhieu", "MaSv", "MaHocKy", "NgayLap", "TongTinChi", "TongTienDangKy", "TienMienGiam", "TrangThai") VALUES
(1, '22520001', 'HK2-2526', '2026-05-19 08:00:00', 0, 0, 0, 'Đã đăng ký'),
(2, '22520002', 'HK2-2526', '2026-05-20 08:00:00', 0, 0, 0, 'Đã đăng ký'),
(3, '22520003', 'HK2-2526', '2026-05-21 08:00:00', 0, 0, 0, 'Đã đăng ký'),
(4, '22520004', 'HK2-2526', '2026-05-22 08:00:00', 0, 0, 0, 'Đã đăng ký'),
(5, '22520005', 'HK2-2526', '2026-05-23 08:00:00', 0, 0, 0, 'Đã đăng ký'),
(6, '22520006', 'HK2-2526', '2026-05-24 08:00:00', 0, 0, 0, 'Đã đăng ký');

-- Cập nhật sequence cho "PHIEUDANGKY" để các INSERT tiếp theo bắt đầu từ giá trị đúng
SELECT setval(pg_get_serial_sequence('"PHIEUDANGKY"', 'SoPhieu'), 6, true);

-- =====================================================
-- INSERT DATA - Chi tiết đăng ký (Registration Details)
-- =====================================================
INSERT INTO "CHITIETDANGKY" ("SoPhieu", "MaLop", "MaMonHoc", "LoaiDangKy", "SoTinChi", "LoaiMon", "DonGia", "ThanhTien", "TrangThai") VALUES
(1, 'IT002.N01', 'IT002', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(1, 'IT003.N01', 'IT003', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(1, 'MA004.N01', 'MA004', 'hoc_moi', 4, 'LT', 27000, 108000, 'Đã đăng ký'),
(1, 'MA005.N01', 'MA005', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(1, 'ENG02.N01', 'ENG02', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký'),
(2, 'IT002.N01', 'IT002', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(2, 'IT003.N01', 'IT003', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(2, 'IT012.N01', 'IT012', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(2, 'MA004.N01', 'MA004', 'hoc_moi', 4, 'LT', 27000, 108000, 'Đã đăng ký'),
(2, 'MA005.N01', 'MA005', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(2, 'ENG02.N01', 'ENG02', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký'),
(3, 'IT002.N01', 'IT002', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(3, 'IT003.N01', 'IT003', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(3, 'MA004.N01', 'MA004', 'hoc_moi', 4, 'LT', 27000, 108000, 'Đã đăng ký'),
(3, 'MA005.N01', 'MA005', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(3, 'ENG02.N01', 'ENG02', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký'),
(4, 'IT002.N01', 'IT002', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(4, 'IT003.N01', 'IT003', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(4, 'MA004.N01', 'MA004', 'hoc_moi', 4, 'LT', 27000, 108000, 'Đã đăng ký'),
(4, 'MA005.N01', 'MA005', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(4, 'ENG02.N01', 'ENG02', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký'),
(5, 'IT002.N01', 'IT002', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(5, 'IT005.N01', 'IT005', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(5, 'MA004.N01', 'MA004', 'hoc_moi', 4, 'LT', 27000, 108000, 'Đã đăng ký'),
(5, 'IT006.N01', 'IT006', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký'),
(5, 'ENG02.N01', 'ENG02', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký'),
(6, 'IT002.N01', 'IT002', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(6, 'IT003.N01', 'IT003', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(6, 'MA004.N01', 'MA004', 'hoc_moi', 4, 'LT', 27000, 108000, 'Đã đăng ký'),
(6, 'MA005.N01', 'MA005', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký'),
(6, 'ENG02.N01', 'ENG02', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký');

-- =====================================================
-- INSERT DATA - Phiếu thu học phí (Tuition Payment Receipts)
-- Sử dụng giá trị "SoPhieuThu" cụ thể để đảm bảo tính nhất quán
-- Số tiền thu phải khớp với học phí phải đóng của "PHIEUDANGKY" tương ứng
-- =====================================================
INSERT INTO "PHIEUTHUHOCPHI" ("SoPhieuThu", "SoPhieuDangKy", "MaSv", "NgayLap", "SoTienThu", "HinhThucThu", "MaGiaoDich", "NguoiThu", "PaymentProvider", "PaymentChannel", "GhiChu", "TrangThai", "NgayXacNhan", "NgayCapNhat") VALUES
(1, 1, '22520001', '2026-05-25 09:00:00', 378000, 'Chuyển khoản', 'GD20260525001', 'Cổng thanh toán', 'bank_transfer', 'student_portal', 'Thanh toán học phí HK2-2526', 'Thành công', '2026-05-25 09:00:00', '2026-05-25 09:00:00'),
(2, 2, '22520002', '2026-05-25 09:30:00', 229500, 'Tiền mặt', 'CASH20260525001', 'Phòng tài chính', 'cash', 'admin', 'Thanh toán học phí HK2-2526', 'Thành công', '2026-05-25 09:30:00', '2026-05-25 09:30:00'),
(3, 3, '22520003', '2026-05-25 10:00:00', 150000, 'Chuyển khoản', 'GD20260525003', 'Cổng thanh toán', 'bank_transfer', 'student_portal', 'Thanh toán một phần học phí HK2-2526', 'Thành công', '2026-05-25 10:00:00', '2026-05-25 10:00:00'),
(4, 4, '22520004', '2026-05-25 10:30:00', 200000, 'Ví điện tử', 'EW20260525004', 'Cổng thanh toán', 'momo', 'student_portal', 'Thanh toán một phần học phí HK2-2526', 'Thành công', '2026-05-25 10:30:00', '2026-05-25 10:30:00'),
(5, 5, '22520005', '2026-05-25 11:00:00', 226800, 'Chuyển khoản', 'GD20260525005', 'Cổng thanh toán', 'bank_transfer', 'student_portal', 'Thanh toán học phí HK2-2526', 'Thành công', '2026-05-25 11:00:00', '2026-05-25 11:00:00'),
(6, 6, '22520006', '2026-05-25 11:30:00', 189000, 'Chuyển khoản', 'GD20260525006', 'Cổng thanh toán', 'bank_transfer', 'student_portal', 'Thanh toán học phí HK2-2526 cho tài khoản student', 'Thành công', '2026-05-25 11:30:00', '2026-05-25 11:30:00');

-- Cập nhật sequence cho "PHIEUTHUHOCPHI" để các INSERT tiếp theo bắt đầu từ giá trị đúng
SELECT setval(pg_get_serial_sequence('"PHIEUTHUHOCPHI"', 'SoPhieuThu'), 6, true);

-- =====================================================
-- INSERT DATA - Dữ liệu mẫu luồng cứu xét đăng ký và thu học phí
-- Các học kỳ mẫu dùng dữ liệu gần ngày 02/06/2026 để test nhanh:
--   HK1-2627: đã hết đăng ký, đang trong hạn cứu xét, có đơn chờ duyệt
--   HK2-2627: đã hết cứu xét, đã chốt đăng ký, chưa mở thu học phí
--   HKH-2627: đã chốt đăng ký, đã mở thu học phí, có đủ trạng thái phiếu thu mới
-- =====================================================
INSERT INTO "NAMHOC" ("MaNamHoc", "TenNamHoc", "NamBatDau", "NamKetThuc") VALUES
('2026-2027', 'Năm học 2026-2027', 2026, 2027)
ON CONFLICT ("MaNamHoc") DO NOTHING;

INSERT INTO "HOCKY" (
  "MaHocKy", "TenHocKy", "MaNamHoc", "LoaiHocKy", "ThuTu",
  "NgayBatDau", "NgayKetThuc",
  "NgayBatDauDangKy", "NgayKetThucDangKy",
  "NgayBatDauCuuXet", "NgayKetThucCuuXet",
  "NgayChotDangKy", "MoThuHocPhi", "NgayMoThuHocPhi",
  "HanDongHocPhi", "TrangThai"
) VALUES
('HK1-2627', 'Học kỳ I', '2026-2027', 'Chính', 1, '2026-06-20', '2026-10-01', '2026-05-01 00:00:00', '2026-05-20 23:59:59', '2026-05-21 00:00:00', '2026-06-10 23:59:59', NULL, FALSE, NULL, '2026-08-15', 'Sắp diễn ra'),
('HK2-2627', 'Học kỳ II', '2026-2027', 'Chính', 2, '2026-07-01', '2026-11-15', '2026-04-01 00:00:00', '2026-04-10 23:59:59', '2026-04-11 00:00:00', '2026-04-20 23:59:59', '2026-04-21 09:00:00', FALSE, NULL, '2026-08-01', 'Sắp diễn ra'),
('HKH-2627', 'Học kỳ Hè', '2026-2027', 'Hè', 3, '2026-07-15', '2026-08-31', '2026-03-01 00:00:00', '2026-03-10 23:59:59', '2026-03-11 00:00:00', '2026-03-20 23:59:59', '2026-03-21 09:00:00', TRUE, '2026-03-22 09:00:00', '2026-07-20', 'Sắp diễn ra')
ON CONFLICT ("MaHocKy") DO UPDATE SET
  "TenHocKy" = EXCLUDED."TenHocKy",
  "MaNamHoc" = EXCLUDED."MaNamHoc",
  "LoaiHocKy" = EXCLUDED."LoaiHocKy",
  "ThuTu" = EXCLUDED."ThuTu",
  "NgayBatDau" = EXCLUDED."NgayBatDau",
  "NgayKetThuc" = EXCLUDED."NgayKetThuc",
  "NgayBatDauDangKy" = EXCLUDED."NgayBatDauDangKy",
  "NgayKetThucDangKy" = EXCLUDED."NgayKetThucDangKy",
  "NgayBatDauCuuXet" = EXCLUDED."NgayBatDauCuuXet",
  "NgayKetThucCuuXet" = EXCLUDED."NgayKetThucCuuXet",
  "NgayChotDangKy" = EXCLUDED."NgayChotDangKy",
  "MoThuHocPhi" = EXCLUDED."MoThuHocPhi",
  "NgayMoThuHocPhi" = EXCLUDED."NgayMoThuHocPhi",
  "HanDongHocPhi" = EXCLUDED."HanDongHocPhi",
  "TrangThai" = EXCLUDED."TrangThai",
  "DaXoa" = FALSE;

INSERT INTO "LOP" ("MaLop", "TenLop", "MaMonHoc", "GiangVien", "LichHoc", "PhongHoc", "SoLuongToiDa") VALUES
('IT002.2627A', 'Lập trình hướng đối tượng', 'IT002', 'ThS. Đào tạo', 'Thứ 2, Tiết 1-3', 'A101', 4),
('IT003.2627A', 'Cấu trúc dữ liệu và giải thuật', 'IT003', 'ThS. Đào tạo', 'Thứ 3, Tiết 1-3', 'A102', 4),
('MA004.2627A', 'Cấu trúc rời rạc', 'MA004', 'ThS. Đào tạo', 'Thứ 4, Tiết 1-4', 'A103', 4),
('IT005.2627B', 'Nhập môn mạng máy tính', 'IT005', 'ThS. Đào tạo', 'Thứ 5, Tiết 1-3', 'A104', 4),
('IT006.2627B', 'Kiến trúc máy tính', 'IT006', 'ThS. Đào tạo', 'Thứ 6, Tiết 1', 'A105', 4),
('ENG02.2627H', 'Anh văn 2', 'ENG02', 'ThS. Đào tạo', 'Thứ 7, Tiết 1', 'A106', 4)
ON CONFLICT ("MaLop") DO NOTHING;

INSERT INTO "LOPMO" ("MaHocKy", "MaLop", "SoLuongDaDangKy", "TrangThai", "GhiChu") VALUES
('HK1-2627', 'IT002.2627A', 3, TRUE, 'Lớp đang có đăng ký trước khi cứu xét'),
('HK1-2627', 'IT003.2627A', 0, TRUE, 'Lớp đích cho đơn đổi'),
('HK1-2627', 'MA004.2627A', 0, TRUE, 'Lớp đích cho đơn thêm'),
('HK2-2627', 'IT005.2627B', 0, FALSE, 'Lớp bị đóng vì dưới 75%'),
('HK2-2627', 'IT006.2627B', 3, TRUE, 'Lớp đủ đúng 75% nên vẫn mở'),
('HKH-2627', 'ENG02.2627H', 4, TRUE, 'Lớp đã chốt và mở thu học phí')
ON CONFLICT ("MaHocKy", "MaLop") DO NOTHING;

INSERT INTO "LICHHOCLOP" ("LopMoId", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "PhongHoc", "GhiChu", "TrangThai")
SELECT lm.id, v."ThuTrongTuan", v."MaTietBatDau", v."MaTietKetThuc", v."PhongHoc", v."GhiChu", v."TrangThai"
FROM (VALUES
  ('HK1-2627', 'IT002.2627A', 2, 'T1', 'T3', 'A101', 'IT002 - cứu xét', TRUE),
  ('HK1-2627', 'IT003.2627A', 3, 'T1', 'T3', 'A102', 'IT003 - lớp đổi', TRUE),
  ('HK1-2627', 'MA004.2627A', 4, 'T1', 'T4', 'A103', 'MA004 - lớp thêm', TRUE),
  ('HK2-2627', 'IT005.2627B', 5, 'T1', 'T3', 'A104', 'IT005 - lớp đóng', FALSE),
  ('HK2-2627', 'IT006.2627B', 6, 'T1', 'T1', 'A105', 'IT006 - đúng 75%', TRUE),
  ('HKH-2627', 'ENG02.2627H', 7, 'T1', 'T1', 'A106', 'ENG02 - mở thu', TRUE)
) AS v("MaHocKy", "MaLop", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "PhongHoc", "GhiChu", "TrangThai")
JOIN "LOPMO" lm ON lm."MaHocKy" = v."MaHocKy" AND lm."MaLop" = v."MaLop"
WHERE NOT EXISTS (
  SELECT 1 FROM "LICHHOCLOP" lh
  WHERE lh."LopMoId" = lm.id
    AND lh."ThuTrongTuan" = v."ThuTrongTuan"
    AND lh."MaTietBatDau" = v."MaTietBatDau"
    AND lh."MaTietKetThuc" = v."MaTietKetThuc"
);

SET app.finalize_registration = '1';

INSERT INTO "PHIEUDANGKY" ("SoPhieu", "MaSv", "MaHocKy", "NgayLap", "TrangThai", "GhiChu") VALUES
(101, '22520001', 'HK1-2627', '2026-05-20 08:00:00', 'Đã đăng ký', 'Demo: có thể gửi đơn thêm trong hạn cứu xét'),
(102, '22520002', 'HK1-2627', '2026-05-20 08:10:00', 'Đã đăng ký', 'Demo: có thể gửi đơn hủy trong hạn cứu xét'),
(103, '22520003', 'HK1-2627', '2026-05-20 08:20:00', 'Đã đăng ký', 'Demo: có thể gửi đơn đổi trong hạn cứu xét'),
(104, '22520004', 'HK2-2627', '2026-04-10 08:00:00', 'Đã đăng ký', 'Demo: đơn thêm đã duyệt'),
(105, '22520005', 'HK2-2627', '2026-04-10 08:10:00', 'Đã đăng ký', 'Demo: lớp đúng 75% vẫn mở'),
(106, '22520006', 'HK2-2627', '2026-04-10 08:20:00', 'Đã đăng ký', 'Demo: đơn đã hủy'),
(107, '22520001', 'HK2-2627', '2026-04-10 08:30:00', 'Đã đăng ký', 'Demo: đăng ký bị hủy do lớp dưới 75%'),
(201, '22520001', 'HKH-2627', '2026-03-10 08:00:00', 'Đã đăng ký', 'Demo: phiếu thu chưa thanh toán'),
(202, '22520002', 'HKH-2627', '2026-03-10 08:10:00', 'Đã đăng ký', 'Demo: phiếu tiền mặt chờ xác nhận'),
(203, '22520003', 'HKH-2627', '2026-03-10 08:20:00', 'Đã đăng ký', 'Demo: phiếu đã thanh toán thành công'),
(204, '22520004', 'HKH-2627', '2026-03-10 08:30:00', 'Đã đăng ký', 'Demo: phiếu thanh toán thất bại')
ON CONFLICT ("SoPhieu") DO NOTHING;

INSERT INTO "CHITIETDANGKY" ("SoPhieu", "MaLop", "MaMonHoc", "LoaiDangKy", "SoTinChi", "LoaiMon", "DonGia", "ThanhTien", "TrangThai", "NgayDangKy", "NgayHuy", "LyDoHuy") VALUES
(101, 'IT002.2627A', 'IT002', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký', '2026-05-20 08:00:00', NULL, NULL),
(102, 'IT002.2627A', 'IT002', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký', '2026-05-20 08:10:00', NULL, NULL),
(103, 'IT002.2627A', 'IT002', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã đăng ký', '2026-05-20 08:20:00', NULL, NULL),
(104, 'IT006.2627B', 'IT006', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký', '2026-04-21 09:05:00', NULL, NULL),
(105, 'IT006.2627B', 'IT006', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký', '2026-04-10 08:10:00', NULL, NULL),
(106, 'IT006.2627B', 'IT006', 'hoc_moi', 1, 'LT', 27000, 27000, 'Đã đăng ký', '2026-04-10 08:20:00', NULL, NULL),
(107, 'IT005.2627B', 'IT005', 'hoc_moi', 3, 'LT', 27000, 81000, 'Đã hủy', '2026-04-10 08:30:00', '2026-04-21 09:10:00', 'Hủy do không đủ sinh viên đăng ký'),
(201, 'ENG02.2627H', 'ENG02', 'hoc_moi', 1, 'LT', 35000, 35000, 'Đã đăng ký', '2026-03-10 08:00:00', NULL, NULL),
(202, 'ENG02.2627H', 'ENG02', 'hoc_moi', 1, 'LT', 35000, 35000, 'Đã đăng ký', '2026-03-10 08:10:00', NULL, NULL),
(203, 'ENG02.2627H', 'ENG02', 'hoc_moi', 1, 'LT', 35000, 35000, 'Đã đăng ký', '2026-03-10 08:20:00', NULL, NULL),
(204, 'ENG02.2627H', 'ENG02', 'hoc_moi', 1, 'LT', 35000, 35000, 'Đã đăng ký', '2026-03-10 08:30:00', NULL, NULL)
ON CONFLICT ("SoPhieu", "MaMonHoc") DO NOTHING;

RESET app.finalize_registration;

INSERT INTO "DONCUUXETDANGKY" (
  "MaSv", "MaHocKy", "SoPhieu", "LoaiDon", "TrangThai", "MaLopHuy", "MaLopThem",
  "LyDo", "LyDoTuChoi", "NguoiDuyet", "NgayTao", "NgayCapNhat", "NgayDuyet"
)
SELECT v."MaSv", v."MaHocKy", v."SoPhieu", v."LoaiDon", v."TrangThai", v."MaLopHuy", v."MaLopThem",
       v."LyDo", v."LyDoTuChoi", v."NguoiDuyet", v."NgayTao", v."NgayCapNhat", v."NgayDuyet"
FROM (
  VALUES
  ('22520001', 'HK1-2627', 101, 'them', 'cho_duyet', NULL, 'MA004.2627A', 'Muốn học thêm môn Cấu trúc rời rạc sau khi đã cân đối lịch cá nhân.', NULL, NULL, '2026-06-02 09:00:00'::timestamp, NULL, NULL),
  ('22520002', 'HK1-2627', 102, 'huy', 'cho_duyet', 'IT002.2627A', NULL, 'Xin hủy vì trùng kế hoạch thực tập ngắn hạn.', NULL, NULL, '2026-06-02 09:10:00'::timestamp, NULL, NULL),
  ('22520003', 'HK1-2627', 103, 'doi', 'cho_duyet', 'IT002.2627A', 'IT003.2627A', 'Xin đổi lớp để phù hợp thời khóa biểu cá nhân.', NULL, NULL, '2026-06-02 09:20:00'::timestamp, NULL, NULL),
  ('22520004', 'HK2-2627', 104, 'them', 'da_duyet', NULL, 'IT006.2627B', 'Đã bổ sung lớp theo quyết định cứu xét.', NULL, (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'), '2026-04-12 08:00:00'::timestamp, '2026-04-21 09:05:00'::timestamp, '2026-04-21 09:05:00'::timestamp),
  ('22520005', 'HK2-2627', 105, 'them', 'tu_choi', NULL, 'MA004.2627A', 'Xin thêm lớp sau hạn.', 'Lớp không còn phù hợp kế hoạch mở lớp sau khi chốt đăng ký.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'), '2026-04-12 08:10:00'::timestamp, '2026-04-21 09:15:00'::timestamp, '2026-04-21 09:15:00'::timestamp),
  ('22520006', 'HK2-2627', 106, 'huy', 'da_huy', 'IT006.2627B', NULL, 'Sinh viên tự hủy đơn trước khi admin xử lý.', NULL, NULL, '2026-04-12 08:20:00'::timestamp, '2026-04-13 10:00:00'::timestamp, NULL)
) AS v("MaSv", "MaHocKy", "SoPhieu", "LoaiDon", "TrangThai", "MaLopHuy", "MaLopThem", "LyDo", "LyDoTuChoi", "NguoiDuyet", "NgayTao", "NgayCapNhat", "NgayDuyet")
WHERE NOT EXISTS (
  SELECT 1 FROM "DONCUUXETDANGKY" d
  WHERE d."MaSv" = v."MaSv"
    AND d."MaHocKy" = v."MaHocKy"
    AND d."LoaiDon" = v."LoaiDon"
    AND COALESCE(d."MaLopHuy", '') = COALESCE(v."MaLopHuy", '')
    AND COALESCE(d."MaLopThem", '') = COALESCE(v."MaLopThem", '')
    AND d."TrangThai" = v."TrangThai"
);

INSERT INTO "PHIEUTHUHOCPHI" (
  "SoPhieuThu", "SoPhieuDangKy", "MaSv", "NgayLap", "SoTienThu", "HinhThucThu",
  "MaGiaoDich", "NguoiThu", "PaymentProvider", "PaymentChannel", "GhiChu",
  "TrangThai", "NgayXacNhan", "NgayCapNhat", "CheckoutUrl", "QrPayload"
) VALUES
(101, 201, '22520001', '2026-03-22 09:00:00', 35000, 'Tiền mặt', NULL, 'Phòng tài chính', 'invoice', 'admin', 'Demo: admin đã tạo phiếu, sinh viên chưa checkout', 'Chưa thanh toán', NULL, '2026-03-22 09:00:00', NULL, NULL),
(102, 202, '22520002', '2026-03-22 09:10:00', 17500, 'Tiền mặt', 'CASH-DEMO-102', NULL, 'cash', 'student', 'Demo: sinh viên chọn đóng tiền mặt, chờ admin xác nhận', 'Chờ xác nhận', NULL, '2026-03-22 09:10:00', NULL, NULL),
(103, 203, '22520003', '2026-03-22 09:20:00', 17500, 'Chuyển khoản', 'BANK-DEMO-103', 'Cổng thanh toán demo', 'bank_qr', 'student', 'Demo: thanh toán sandbox thành công', 'Thành công', '2026-03-22 09:25:00', '2026-03-22 09:25:00', NULL, NULL),
(104, 204, '22520004', '2026-03-22 09:30:00', 24500, 'Ví điện tử', 'ZALO-DEMO-104', NULL, 'zalopay', 'student', 'Demo: thanh toán sandbox thất bại', 'Thất bại', NULL, '2026-03-22 09:35:00', NULL, NULL)
ON CONFLICT ("SoPhieuThu") DO NOTHING;

SELECT setval(pg_get_serial_sequence('"PHIEUDANGKY"', 'SoPhieu'), GREATEST((SELECT MAX("SoPhieu") FROM "PHIEUDANGKY"), 204), true);
SELECT setval(pg_get_serial_sequence('"PHIEUTHUHOCPHI"', 'SoPhieuThu'), GREATEST((SELECT MAX("SoPhieuThu") FROM "PHIEUTHUHOCPHI"), 104), true);

-- =====================================================
-- INSERT DATA - Thông báo cá nhân (Personal Notifications)
-- Số tiền trong thông báo phải khớp với dữ liệu thực tế
-- =====================================================
INSERT INTO "THONGBAO" ("TieuDe", "NoiDung", "MaTaiKhoanNhan", "DuongDan", "DaDoc") VALUES
-- Thông báo cho sinh viên 22520001 ("MaTaiKhoan" từ subquery)
('Đăng ký môn học thành công', 'Bạn đã đăng ký thành công 5 môn học cho HK2 2025-2026. Tổng số tín chỉ: 14. Học phí: 378,000 VNĐ.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520001'), '/phieu-dang-ky/1', TRUE),
('Thanh toán học phí thành công', 'Bạn đã thanh toán thành công 378,000 VNĐ học phí HK2 2025-2026.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520001'), '/phieu-thu/1', TRUE),
('Nhắc nhở lịch học', 'Môn Cấu trúc dữ liệu và giải thuật sẽ bắt đầu vào Thứ 6, Tiết 1-3 tại phòng C.0917.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520001'), '/lich-hoc', FALSE),
-- Thông báo cho sinh viên 22520002
('Đăng ký môn học thành công', 'Bạn đã đăng ký thành công 6 môn học cho HK2 2025-2026. Tổng số tín chỉ: 17. Được giảm 50% học phí do thuộc đối tượng vùng sâu vùng xa. Học phí sau giảm: 229,500 VNĐ.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520002'), '/phieu-dang-ky/2', TRUE),
('Thanh toán học phí thành công', 'Bạn đã thanh toán thành công 229,500 VNĐ học phí HK2 2025-2026 (sau giảm 50%).', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520002'), '/phieu-thu/2', TRUE),
-- Thông báo cho sinh viên 22520003
('Đăng ký môn học thành công', 'Bạn đã đăng ký thành công 5 môn học cho HK2 2025-2026. Tổng số tín chỉ: 14. Được giảm 50% học phí do thuộc hộ cận nghèo. Học phí sau giảm: 189,000 VNĐ.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520003'), '/phieu-dang-ky/3', TRUE),
('Nhắc nhở đóng học phí', 'Bạn còn nợ 39,000 VNĐ học phí HK2 2025-2026. Hạn đóng: 15/06/2026.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520003'), '/cong-no', FALSE),
-- Thông báo cho sinh viên 22520004
('Đăng ký môn học thành công', 'Bạn đã đăng ký thành công 5 môn học cho HK2 2025-2026. Tổng số tín chỉ: 14. Được giảm 30% học phí do thuộc diện con thương binh, bệnh binh. Học phí sau giảm: 264,600 VNĐ.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520004'), '/phieu-dang-ky/4', TRUE),
('Nhắc nhở đóng học phí', 'Bạn còn nợ 64,600 VNĐ học phí HK2 2025-2026. Hạn đóng: 15/06/2026.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520004'), '/cong-no', FALSE),
-- Thông báo cho sinh viên 22520005
('Đăng ký môn học thành công', 'Bạn đã đăng ký thành công 5 môn học cho HK2 2025-2026. Tổng số tín chỉ: 12. Được giảm 30% học phí do thuộc dân tộc thiểu số. Học phí sau giảm: 226,800 VNĐ.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520005'), '/phieu-dang-ky/5', TRUE),
('Thanh toán học phí thành công', 'Bạn đã thanh toán thành công 226,800 VNĐ học phí HK2 2025-2026 (sau giảm 30%).', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = '22520005'), '/phieu-thu/5', TRUE),
-- Thông báo cho tài khoản demo student / MSSV 22520006
('Đăng ký môn học thành công', 'Bạn đã đăng ký thành công 5 môn học cho HK2 2025-2026. Tổng số tín chỉ: 14. Được giảm 50% học phí do thuộc đối tượng sinh viên khuyết tật. Học phí sau giảm: 189,000 VNĐ.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'student'), '/phieu-dang-ky/6', TRUE),
('Thanh toán học phí thành công', 'Bạn đã thanh toán thành công 189,000 VNĐ học phí HK2 2025-2026 (sau giảm 50%).', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'student'), '/phieu-thu/6', TRUE),
('Nhắc nhở lịch học', 'Môn Lập trình hướng đối tượng sẽ học vào Thứ 4, Tiết 6-8 tại phòng E.0915.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'student'), '/lich-hoc', FALSE),
-- Thông báo cho Admin
('Báo cáo đăng ký HK2 2025-2026', 'Tổng số sinh viên đã đăng ký: 6. Tổng số lớp mở: 261. Tổng doanh thu dự kiến: 1,476,900 VNĐ.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'), '/bao-cao/dang-ky', FALSE),
('Cảnh báo sinh viên nợ học phí', 'Có 2 sinh viên chưa đóng đủ học phí HK2 2025-2026. Tổng công nợ còn lại: 103,600 VNĐ.', (SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'), '/bao-cao/cong-no', FALSE);

-- =====================================================
-- INSERT DATA - Môn đã học (Completed Courses)
-- Dữ liệu lịch sử cho học kỳ 1 năm 2024-2025, chỉ giữ kết quả qua/rớt
-- =====================================================
-- MONDAHOC seed was moved before PHIEUDANGKY so prerequisite triggers validate registrations against completed courses.

-- =====================================================
-- DATA COMPATIBILITY - Cập nhật dữ liệu cho các cột đã khai báo trong CREATE TABLE
-- =====================================================
-- HocKy is the canonical seed value from thong_ke_ctdt_uit_khoa_2023_da_sua.md;
-- keep HocKyDuKien synchronized so student curriculum grouping uses the source distribution.
UPDATE "CHUONGTRINHHOC"
SET "HocKyDuKien" = CASE
    WHEN "HocKyDuKien" IS NULL OR "HocKyDuKien" <> "HocKy" THEN "HocKy"
    ELSE "HocKyDuKien"
END;

UPDATE "CHITIETDANGKY" ctdk
SET
  "MaMonHoc" = COALESCE(ctdk."MaMonHoc", mh."MaMonHoc"),
  "SoTinChi" = COALESCE(ctdk."SoTinChi", mh."SoTinChi", 0),
  "LoaiMon" = COALESCE(ctdk."LoaiMon", mh."LoaiMon", 'LT')
FROM "LOP" l
JOIN "MONHOC" mh ON mh."MaMonHoc" = l."MaMonHoc"
WHERE l."MaLop" = ctdk."MaLop";

WITH totals AS (
  SELECT
    p."SoPhieu",
    p."MaSv",
    COALESCE(SUM(c."SoTinChi"), 0)::integer AS "TongTinChi",
    COALESCE(SUM(c."ThanhTien"), 0) AS "TongTienDangKy",
    COUNT(c.id) FILTER (WHERE c."LoaiDangKy" = 'hoc_moi')::integer AS "SoMonHocMoi",
    COALESCE(SUM(c."SoTinChi") FILTER (WHERE c."LoaiDangKy" = 'hoc_moi'), 0)::integer AS "SoTinChiHocMoi",
    COALESCE(SUM(c."ThanhTien") FILTER (WHERE c."LoaiDangKy" = 'hoc_moi'), 0) AS "TienHocMoi",
    COUNT(c.id) FILTER (WHERE c."LoaiDangKy" = 'hoc_lai')::integer AS "SoMonHocLai",
    COALESCE(SUM(c."SoTinChi") FILTER (WHERE c."LoaiDangKy" = 'hoc_lai'), 0)::integer AS "SoTinChiHocLai",
    COALESCE(SUM(c."ThanhTien") FILTER (WHERE c."LoaiDangKy" = 'hoc_lai'), 0) AS "TienHocLai",
    COUNT(c.id) FILTER (WHERE c."LoaiDangKy" = 'hoc_cai_thien')::integer AS "SoMonHocCaiThien",
    COALESCE(SUM(c."SoTinChi") FILTER (WHERE c."LoaiDangKy" = 'hoc_cai_thien'), 0)::integer AS "SoTinChiHocCaiThien",
    COALESCE(SUM(c."ThanhTien") FILTER (WHERE c."LoaiDangKy" = 'hoc_cai_thien'), 0) AS "TienHocCaiThien"
  FROM "PHIEUDANGKY" p
  LEFT JOIN "CHITIETDANGKY" c ON c."SoPhieu" = p."SoPhieu" AND c."TrangThai" = 'Đã đăng ký'
  GROUP BY p."SoPhieu", p."MaSv"
),
best_discount AS (
  SELECT "MaSv", "TiLeGiamHocPhi"
  FROM (
    SELECT
      dtsv."MaSv",
      dt."TiLeGiamHocPhi",
      ROW_NUMBER() OVER (PARTITION BY dtsv."MaSv" ORDER BY dt."DoUuTien" ASC) AS rn
    FROM "DOITUONGSINHVIEN" dtsv
    JOIN "DOITUONG" dt ON dt."MaDoiTuong" = dtsv."MaDoiTuong"
    WHERE COALESCE(dt."TrangThai", TRUE) = TRUE
  ) ranked
  WHERE rn = 1
)
UPDATE "PHIEUDANGKY" p
SET
  "TongTinChi" = totals."TongTinChi",
  "TongTienDangKy" = totals."TongTienDangKy",
  "SoMonHocMoi" = totals."SoMonHocMoi",
  "SoTinChiHocMoi" = totals."SoTinChiHocMoi",
  "TienHocMoi" = totals."TienHocMoi",
  "SoMonHocLai" = totals."SoMonHocLai",
  "SoTinChiHocLai" = totals."SoTinChiHocLai",
  "TienHocLai" = totals."TienHocLai",
  "SoMonHocCaiThien" = totals."SoMonHocCaiThien",
  "SoTinChiHocCaiThien" = totals."SoTinChiHocCaiThien",
  "TienHocCaiThien" = totals."TienHocCaiThien",
  "TiLeGiam" = COALESCE(best_discount."TiLeGiamHocPhi", 0),
  "TienMienGiam" = ROUND(totals."TongTienDangKy" * COALESCE(best_discount."TiLeGiamHocPhi", 0) / 100),
  "TongTienPhaiDong" = GREATEST(totals."TongTienDangKy" - ROUND(totals."TongTienDangKy" * COALESCE(best_discount."TiLeGiamHocPhi", 0) / 100), 0)
FROM totals
LEFT JOIN best_discount ON best_discount."MaSv" = totals."MaSv"
WHERE p."SoPhieu" = totals."SoPhieu";

UPDATE "SINHVIEN"
SET
  "Cccd" = COALESCE(NULLIF("Cccd", ''), 'CCCD-' || "MaSv"),
  "MaDanToc" = COALESCE("MaDanToc", (SELECT "MaDanToc" FROM "DANTOC" ORDER BY "MaDanToc" LIMIT 1)),
  "DiaChiLienHe" = COALESCE(NULLIF("DiaChiLienHe", ''), 'Chua cap nhat');

UPDATE "THAMSO"
SET
  "DanhSachMonAnhVanBatBuoc" = COALESCE(NULLIF("DanhSachMonAnhVanBatBuoc", ''), 'ENG01,ENG02,ENG03'),
  "NamKiemTraAnhVan" = COALESCE("NamKiemTraAnhVan", 2),
  "GioiHanTinChiChuaDatAnhVan" = COALESCE("GioiHanTinChiChuaDatAnhVan", 14),
  "GioiHanTinChiNoKhoaLuan" = COALESCE("GioiHanTinChiNoKhoaLuan", 8);

-- =====================================================
-- DATA COMPLETENESS - Điền đủ dữ liệu các trường đang hiển thị trên UI
-- =====================================================
WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "NGUOIDUNG" nd
SET
  "TrangThaiDuyet" = 'approved',
  "NgayDuyet" = COALESCE(nd."NgayDuyet", CURRENT_TIMESTAMP),
  "NguoiDuyet" = COALESCE(nd."NguoiDuyet", (SELECT "MaTaiKhoan" FROM admin_account))
WHERE nd."TenDangNhap" IN ('admin', 'student', '22520001', '22520002', '22520003', '22520004', '22520005');

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "SINHVIEN" sv
SET
  "DiaChiLienHe" = CASE sv."MaSv"
    WHEN '22520001' THEN '12 Nguyễn Thái Học, Phường Vũng Tàu, TP. Hồ Chí Minh'
    WHEN '22520002' THEN '45 Lê Lợi, Phường Tam Thắng, TP. Hồ Chí Minh'
    WHEN '22520003' THEN '78 Trần Phú, Phường Rạch Dừa, TP. Hồ Chí Minh'
    WHEN '22520004' THEN '23 Võ Thị Sáu, Phường Phước Thắng, TP. Hồ Chí Minh'
    WHEN '22520005' THEN '91 Điện Biên Phủ, Phường Bà Rịa, TP. Hồ Chí Minh'
    WHEN '22520006' THEN '16 Nguyễn Văn Cừ, Phường Vũng Tàu, TP. Hồ Chí Minh'
    ELSE COALESCE(NULLIF(sv."DiaChiLienHe", ''), 'Chưa cập nhật')
  END,
  "HoTenCha" = CASE sv."MaSv"
    WHEN '22520001' THEN 'Nguyễn Văn Hùng'
    WHEN '22520002' THEN 'Trần Minh Sơn'
    WHEN '22520003' THEN 'Lê Văn Thành'
    WHEN '22520004' THEN 'Phạm Quốc Huy'
    WHEN '22520005' THEN 'Hoàng Văn Lâm'
    WHEN '22520006' THEN 'Nguyễn Văn Thành'
    ELSE sv."HoTenCha"
  END,
  "SdtCha" = CASE sv."MaSv"
    WHEN '22520001' THEN '0901112233'
    WHEN '22520002' THEN '0902223344'
    WHEN '22520003' THEN '0903334455'
    WHEN '22520004' THEN '0904445566'
    WHEN '22520005' THEN '0905556677'
    WHEN '22520006' THEN '0906667788'
    ELSE sv."SdtCha"
  END,
  "HoTenMe" = CASE sv."MaSv"
    WHEN '22520001' THEN 'Phạm Thị Hoa'
    WHEN '22520002' THEN 'Nguyễn Thị Lan'
    WHEN '22520003' THEN 'Trần Thị Mai'
    WHEN '22520004' THEN 'Lê Thị Hạnh'
    WHEN '22520005' THEN 'Vàng Thị Dung'
    WHEN '22520006' THEN 'Trần Thị Hồng'
    ELSE sv."HoTenMe"
  END,
  "SdtMe" = CASE sv."MaSv"
    WHEN '22520001' THEN '0911112233'
    WHEN '22520002' THEN '0912223344'
    WHEN '22520003' THEN '0913334455'
    WHEN '22520004' THEN '0914445566'
    WHEN '22520005' THEN '0915556677'
    WHEN '22520006' THEN '0916667788'
    ELSE sv."SdtMe"
  END,
  "NguoiCapNhat" = COALESCE(sv."NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE(sv."NgayCapNhat", CURRENT_TIMESTAMP)
WHERE sv."MaSv" IN ('22520001', '22520002', '22520003', '22520004', '22520005', '22520006');

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "KHOA" k
SET
  "DiaChi" = CASE k."MaKhoa"
    WHEN 'CNTT' THEN 'Tòa E, Khu Công nghệ thông tin'
    WHEN 'KHMT' THEN 'Tòa C, Khu Khoa học máy tính'
    WHEN 'MMT' THEN 'Tòa N, Khu Mạng máy tính'
    WHEN 'HTTT' THEN 'Tòa I, Khu Hệ thống thông tin'
    ELSE COALESCE(k."DiaChi", 'Khu hành chính')
  END,
  "TruongKhoa" = CASE k."MaKhoa"
    WHEN 'CNTT' THEN 'PGS.TS Nguyễn Minh Khoa'
    WHEN 'KHMT' THEN 'PGS.TS Trần Quốc Việt'
    WHEN 'MMT' THEN 'TS Lê Hoàng Nam'
    WHEN 'HTTT' THEN 'TS Phạm Thu Hà'
    ELSE COALESCE(k."TruongKhoa", 'Đang cập nhật')
  END,
  "NguoiCapNhat" = COALESCE(k."NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE(k."NgayCapNhat", CURRENT_TIMESTAMP)
WHERE k."DaXoa" = FALSE;

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "NGANHHOC"
SET
  "NguoiCapNhat" = COALESCE("NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE("NgayCapNhat", CURRENT_TIMESTAMP)
WHERE "DaXoa" = FALSE;

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "MONHOC"
SET
  "NguoiCapNhat" = COALESCE("NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE("NgayCapNhat", CURRENT_TIMESTAMP)
WHERE "DaXoa" = FALSE;

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "LOP" l
SET
  "GiangVien" = COALESCE(NULLIF(l."GiangVien", ''), CASE
    WHEN l."MaMonHoc" LIKE 'IT%' THEN 'ThS. Nguyễn Hoàng Minh'
    WHEN l."MaMonHoc" LIKE 'SE%' THEN 'ThS. Lê Gia Bảo'
    WHEN l."MaMonHoc" LIKE 'CS%' THEN 'TS. Trần Hữu Phúc'
    WHEN l."MaMonHoc" LIKE 'IS%' THEN 'ThS. Phạm Ngọc Anh'
    WHEN l."MaMonHoc" LIKE 'NT%' THEN 'ThS. Võ Minh Quân'
    WHEN l."MaMonHoc" LIKE 'MA%' THEN 'ThS. Đặng Thanh Trúc'
    WHEN l."MaMonHoc" LIKE 'ENG%' THEN 'ThS. Nguyễn Thị Thu'
    ELSE COALESCE(l."GiangVien", 'Giảng viên thỉnh giảng')
  END),
  "NguoiCapNhat" = COALESCE(l."NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE(l."NgayCapNhat", CURRENT_TIMESTAMP)
WHERE l."DaXoa" = FALSE;

UPDATE "LOPMO" lm
SET
  "MaGiangVien" = COALESCE(lm."MaGiangVien", l."MaGiangVien"),
  "GiangVien" = COALESCE(lm."GiangVien", l."GiangVien")
FROM "LOP" l
WHERE l."MaLop" = lm."MaLop";

CREATE OR REPLACE FUNCTION fn_check_lop_catalog_only()
RETURNS TRIGGER AS $$
BEGIN
    IF NULLIF(TRIM(COALESCE(NEW."LichHoc", '')), '') IS NOT NULL
       OR NULLIF(TRIM(COALESCE(NEW."MaPhong", '')), '') IS NOT NULL
       OR NULLIF(TRIM(COALESCE(NEW."PhongHoc", '')), '') IS NOT NULL THEN
        RAISE EXCEPTION 'RBTV_LOP_DANHMUC: Lớp học chỉ lưu mã lớp, tên lớp và môn học. Giảng viên, phòng và lịch học phải khai báo khi mở lớp.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_lop_catalog_only ON "LOP";
DROP FUNCTION IF EXISTS fn_check_lop_catalog_only() CASCADE;

CREATE OR REPLACE FUNCTION fn_check_lop_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_giangvien VARCHAR(100);
    v_phong VARCHAR(50);
    v_bd_thutu INT;
    v_kt_thutu INT;
BEGIN
    IF COALESCE(NEW."DaXoa", FALSE) = TRUE OR COALESCE(NEW."TrangThai", TRUE) = FALSE THEN
        RETURN NEW;
    END IF;

    v_giangvien := NULLIF(TRIM(COALESCE(NEW."MaGiangVien", NEW."GiangVien", '')), '');
    v_phong := NULLIF(TRIM(COALESCE(NEW."MaPhong", NEW."PhongHoc", '')), '');

    IF v_giangvien IS NULL OR v_phong IS NULL
       OR NEW."ThuTrongTuan" IS NULL
       OR NULLIF(TRIM(COALESCE(NEW."MaTietBatDau", '')), '') IS NULL
       OR NULLIF(TRIM(COALESCE(NEW."MaTietKetThuc", '')), '') IS NULL THEN
        RAISE EXCEPTION 'RBTV_LOP_THONGTIN: Lop hoc phai co giang vien, phong hoc va lich hoc.';
    END IF;

    IF NEW."ThuTrongTuan" < 1 OR NEW."ThuTrongTuan" > 7 THEN
        RAISE EXCEPTION 'RBTV_LOP_THONGTIN: Thu trong tuan khong hop le.';
    END IF;

    SELECT "ThuTu" INTO v_bd_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
    SELECT "ThuTu" INTO v_kt_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";

    IF v_bd_thutu IS NULL OR v_kt_thutu IS NULL OR v_bd_thutu > v_kt_thutu THEN
        RAISE EXCEPTION 'RBTV_LOP_THONGTIN: Khoang tiet hoc cua lop khong hop le.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "LOP" l
        JOIN "TIETHOC" bd ON bd."MaTiet" = l."MaTietBatDau"
        JOIN "TIETHOC" kt ON kt."MaTiet" = l."MaTietKetThuc"
        WHERE l."MaLop" IS DISTINCT FROM NEW."MaLop"
          AND COALESCE(l."DaXoa", FALSE) = FALSE
          AND COALESCE(l."TrangThai", TRUE) = TRUE
          AND l."ThuTrongTuan" = NEW."ThuTrongTuan"
          AND COALESCE(l."MaPhong", l."PhongHoc") = v_phong
          AND v_bd_thutu <= kt."ThuTu"
          AND bd."ThuTu" <= v_kt_thutu
    ) THEN
        RAISE EXCEPTION 'RBTV_LOP_THONGTIN: Phong % bi trung lich voi lop khac.', v_phong;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "LOP" l
        JOIN "TIETHOC" bd ON bd."MaTiet" = l."MaTietBatDau"
        JOIN "TIETHOC" kt ON kt."MaTiet" = l."MaTietKetThuc"
        WHERE l."MaLop" IS DISTINCT FROM NEW."MaLop"
          AND COALESCE(l."DaXoa", FALSE) = FALSE
          AND COALESCE(l."TrangThai", TRUE) = TRUE
          AND l."ThuTrongTuan" = NEW."ThuTrongTuan"
          AND COALESCE(l."MaGiangVien", l."GiangVien") = v_giangvien
          AND v_bd_thutu <= kt."ThuTu"
          AND bd."ThuTu" <= v_kt_thutu
    ) THEN
        RAISE EXCEPTION 'RBTV_LOP_THONGTIN: Giang vien % bi trung lich voi lop khac.', v_giangvien;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_lop_assignment ON "LOP";
CREATE TRIGGER trg_check_lop_assignment
BEFORE INSERT OR UPDATE OF "MaGiangVien", "GiangVien", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "MaPhong", "PhongHoc", "TrangThai", "DaXoa"
ON "LOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_lop_assignment();
DROP TRIGGER IF EXISTS trg_check_lop_assignment ON "LOP";
DROP FUNCTION IF EXISTS fn_check_lop_assignment() CASCADE;

CREATE OR REPLACE FUNCTION fn_check_lopmo_opening_required(p_lopmo_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_lopmo RECORD;
BEGIN
    SELECT * INTO v_lopmo FROM "LOPMO" WHERE id = p_lopmo_id;
    IF NOT FOUND OR COALESCE(v_lopmo."TrangThai", FALSE) = FALSE THEN
        RETURN;
    END IF;

    IF NULLIF(TRIM(COALESCE(v_lopmo."MaGiangVien", v_lopmo."GiangVien", '')), '') IS NULL THEN
        RAISE EXCEPTION 'RBTV_LOPMO_THONGTIN: Lớp mở phải có giảng viên phụ trách.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM "LICHHOCLOP" lh
        WHERE lh."LopMoId" = p_lopmo_id
          AND COALESCE(lh."TrangThai", TRUE) = TRUE
          AND lh."ThuTrongTuan" IS NOT NULL
          AND NULLIF(TRIM(COALESCE(lh."MaTietBatDau", '')), '') IS NOT NULL
          AND NULLIF(TRIM(COALESCE(lh."MaTietKetThuc", '')), '') IS NOT NULL
          AND NULLIF(TRIM(COALESCE(lh."MaPhong", lh."PhongHoc", '')), '') IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'RBTV_LOPMO_THONGTIN: Lớp mở phải có ít nhất một lịch học kèm phòng học.';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_check_lopmo_opening_required_from_lopmo()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_check_lopmo_opening_required(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_check_lopmo_opening_required_from_schedule()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM fn_check_lopmo_opening_required(OLD."LopMoId");
        RETURN OLD;
    END IF;

    PERFORM fn_check_lopmo_opening_required(NEW."LopMoId");
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_lopmo_opening_required ON "LOPMO";
CREATE CONSTRAINT TRIGGER trg_check_lopmo_opening_required
AFTER INSERT OR UPDATE OF "TrangThai", "MaGiangVien", "GiangVien"
ON "LOPMO"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_check_lopmo_opening_required_from_lopmo();

DROP TRIGGER IF EXISTS trg_check_lopmo_opening_required_lhl_ins ON "LICHHOCLOP";
CREATE CONSTRAINT TRIGGER trg_check_lopmo_opening_required_lhl_ins
AFTER INSERT
ON "LICHHOCLOP"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_check_lopmo_opening_required_from_schedule();

DROP TRIGGER IF EXISTS trg_check_lopmo_opening_required_lhl_upd ON "LICHHOCLOP";
CREATE CONSTRAINT TRIGGER trg_check_lopmo_opening_required_lhl_upd
AFTER UPDATE OF "LopMoId", "TrangThai", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "MaPhong", "PhongHoc"
ON "LICHHOCLOP"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_check_lopmo_opening_required_from_schedule();

DROP TRIGGER IF EXISTS trg_check_lopmo_opening_required_lhl_del ON "LICHHOCLOP";
CREATE CONSTRAINT TRIGGER trg_check_lopmo_opening_required_lhl_del
AFTER DELETE
ON "LICHHOCLOP"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_check_lopmo_opening_required_from_schedule();

CREATE OR REPLACE FUNCTION fn_check_opened_schedule_conflict()
RETURNS TRIGGER AS $$
DECLARE
    v_mahocky VARCHAR(15);
    v_giangvien VARCHAR(100);
    v_phong VARCHAR(50);
    v_lopmo_active BOOLEAN;
    v_bd_thutu INT;
    v_kt_thutu INT;
BEGIN
    IF COALESCE(NEW."TrangThai", TRUE) = FALSE THEN
        RETURN NEW;
    END IF;

    SELECT
        lm."MaHocKy",
        COALESCE(lm."TrangThai", TRUE),
        NULLIF(TRIM(COALESCE(lm."MaGiangVien", lm."GiangVien", '')), '')
    INTO v_mahocky, v_lopmo_active, v_giangvien
    FROM "LOPMO" lm
    WHERE lm.id = NEW."LopMoId";

    IF v_mahocky IS NULL OR v_lopmo_active = FALSE THEN
        RETURN NEW;
    END IF;

    v_phong := NULLIF(TRIM(COALESCE(NEW."MaPhong", NEW."PhongHoc", '')), '');

    SELECT "ThuTu" INTO v_bd_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
    SELECT "ThuTu" INTO v_kt_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";

    IF v_bd_thutu IS NULL OR v_kt_thutu IS NULL OR v_bd_thutu > v_kt_thutu THEN
        RAISE EXCEPTION 'RBTV_LOPMO_LICH: Khoang tiet hoc khong hop le.';
    END IF;

    IF v_giangvien IS NULL OR v_phong IS NULL THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "LICHHOCLOP" lh
        JOIN "LOPMO" lm ON lm.id = lh."LopMoId"
        JOIN "TIETHOC" bd ON bd."MaTiet" = lh."MaTietBatDau"
        JOIN "TIETHOC" kt ON kt."MaTiet" = lh."MaTietKetThuc"
        WHERE lh.id IS DISTINCT FROM NEW.id
          AND lm."MaHocKy" = v_mahocky
          AND COALESCE(lm."TrangThai", TRUE) = TRUE
          AND COALESCE(lh."TrangThai", TRUE) = TRUE
          AND lh."ThuTrongTuan" = NEW."ThuTrongTuan"
          AND v_bd_thutu <= kt."ThuTu"
          AND bd."ThuTu" <= v_kt_thutu
          AND (
            NULLIF(TRIM(COALESCE(lm."MaGiangVien", lm."GiangVien", '')), '') = v_giangvien
            OR NULLIF(TRIM(COALESCE(lh."MaPhong", lh."PhongHoc", '')), '') = v_phong
          )
    ) THEN
        RAISE EXCEPTION 'RBTV_LOPMO_LICH: Giang vien hoac phong hoc bi trung lich trong hoc ky %.', v_mahocky;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv14_lichhoclop_ins_upd ON "LICHHOCLOP";
CREATE TRIGGER trg_rbtv14_lichhoclop_ins_upd
BEFORE INSERT OR UPDATE OF "LopMoId", "TrangThai", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "MaPhong", "PhongHoc"
ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_opened_schedule_conflict();

CREATE OR REPLACE FUNCTION fn_check_opened_class_conflict()
RETURNS TRIGGER AS $$
DECLARE
    v_giangvien VARCHAR(100);
BEGIN
    IF COALESCE(NEW."TrangThai", TRUE) = FALSE THEN
        RETURN NEW;
    END IF;

    v_giangvien := NULLIF(TRIM(COALESCE(NEW."MaGiangVien", NEW."GiangVien", '')), '');
    IF v_giangvien IS NULL THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "LICHHOCLOP" lh1
        JOIN "TIETHOC" bd1 ON bd1."MaTiet" = lh1."MaTietBatDau"
        JOIN "TIETHOC" kt1 ON kt1."MaTiet" = lh1."MaTietKetThuc"
        JOIN "LICHHOCLOP" lh2 ON lh2."ThuTrongTuan" = lh1."ThuTrongTuan"
        JOIN "LOPMO" lm2 ON lm2.id = lh2."LopMoId"
        JOIN "TIETHOC" bd2 ON bd2."MaTiet" = lh2."MaTietBatDau"
        JOIN "TIETHOC" kt2 ON kt2."MaTiet" = lh2."MaTietKetThuc"
        WHERE lh1."LopMoId" = NEW.id
          AND COALESCE(lh1."TrangThai", TRUE) = TRUE
          AND lh2."LopMoId" <> NEW.id
          AND COALESCE(lh2."TrangThai", TRUE) = TRUE
          AND COALESCE(lm2."TrangThai", TRUE) = TRUE
          AND lm2."MaHocKy" = NEW."MaHocKy"
          AND bd1."ThuTu" <= kt2."ThuTu"
          AND bd2."ThuTu" <= kt1."ThuTu"
          AND (
            NULLIF(TRIM(COALESCE(lm2."MaGiangVien", lm2."GiangVien", '')), '') = v_giangvien
            OR NULLIF(TRIM(COALESCE(lh2."MaPhong", lh2."PhongHoc", '')), '') = NULLIF(TRIM(COALESCE(lh1."MaPhong", lh1."PhongHoc", '')), '')
          )
    ) THEN
        RAISE EXCEPTION 'RBTV_LOPMO_LICH: Lop mo bi trung lich giang vien hoac phong trong hoc ky %.', NEW."MaHocKy";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv14_lopmo_upd ON "LOPMO";
CREATE TRIGGER trg_rbtv14_lopmo_upd
BEFORE INSERT OR UPDATE
ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_opened_class_conflict();

CREATE OR REPLACE FUNCTION fn_check_rbtv14_tiethoc()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."ThuTu" IS DISTINCT FROM OLD."ThuTu" THEN
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" lh1
            JOIN "LOPMO" lm1 ON lh1."LopMoId" = lm1.id
            JOIN "LICHHOCLOP" lh2 ON lh1."ThuTrongTuan" = lh2."ThuTrongTuan" AND lh1.id < lh2.id
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE lm1."MaHocKy" = lm2."MaHocKy"
              AND COALESCE(lm1."TrangThai", TRUE) = TRUE
              AND COALESCE(lm2."TrangThai", TRUE) = TRUE
              AND COALESCE(lh1."TrangThai", TRUE) = TRUE
              AND COALESCE(lh2."TrangThai", TRUE) = TRUE
              AND (
                NULLIF(TRIM(COALESCE(lm1."MaGiangVien", lm1."GiangVien", '')), '') = NULLIF(TRIM(COALESCE(lm2."MaGiangVien", lm2."GiangVien", '')), '')
                OR NULLIF(TRIM(COALESCE(lh1."MaPhong", lh1."PhongHoc", '')), '') = NULLIF(TRIM(COALESCE(lh2."MaPhong", lh2."PhongHoc", '')), '')
              )
              AND (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) <=
                  (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
              AND (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END) <=
                  (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END)
        ) THEN
            RAISE EXCEPTION 'RBTV14: Sua ThuTu tiet hoc lam trung lich giang vien hoac phong hoc.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "HOCKY" hk
SET
  "ThuTu" = CASE
    WHEN hk."LoaiHocKy" = 'Hè' THEN 3
    WHEN hk."TenHocKy" ILIKE '%II%' THEN 2
    ELSE 1
  END,
  "NguoiCapNhat" = COALESCE(hk."NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE(hk."NgayCapNhat", CURRENT_TIMESTAMP)
WHERE hk."DaXoa" = FALSE
  AND hk."MaHocKy" NOT LIKE 'HK-DEMO-%';

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "DOITUONG"
SET
  "NguoiCapNhat" = COALESCE("NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE("NgayCapNhat", CURRENT_TIMESTAMP)
WHERE "DaXoa" = FALSE
  AND "MaDoiTuong" <> 'DT06';

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "DONGIATINCHI"
SET
  "NguoiCapNhat" = COALESCE("NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE("NgayCapNhat", CURRENT_TIMESTAMP)
WHERE "DaXoa" = FALSE;

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "THONGBAO" tb
SET
  "Loai" = CASE
    WHEN tb."TieuDe" ILIKE '%học phí%' OR tb."NoiDung" ILIKE '%học phí%' THEN 'tai_chinh'
    WHEN tb."TieuDe" ILIKE '%đăng ký%' OR tb."TieuDe" ILIKE '%lịch học%' THEN 'hoc_vu'
    WHEN tb."TieuDe" ILIKE '%báo cáo%' OR tb."TieuDe" ILIKE '%cảnh báo%' THEN 'he_thong'
    ELSE 'chung'
  END,
  "LoaiThongBao" = CASE
    WHEN tb."TieuDe" ILIKE '%học phí%' OR tb."NoiDung" ILIKE '%học phí%' THEN 'Tài chính'
    WHEN tb."TieuDe" ILIKE '%đăng ký%' OR tb."TieuDe" ILIKE '%lịch học%' THEN 'Học vụ'
    WHEN tb."TieuDe" ILIKE '%báo cáo%' OR tb."TieuDe" ILIKE '%cảnh báo%' THEN 'Hệ thống'
    ELSE 'Chung'
  END,
  "DOITUONG" = CASE
    WHEN tb."MaTaiKhoanNhan" = (SELECT "MaTaiKhoan" FROM admin_account) THEN 'Admin'
    ELSE 'Sinh viên'
  END,
  "NgayHetHan" = COALESCE(tb."NgayHetHan", tb."NgayTao" + INTERVAL '60 days'),
  "NguoiTao" = COALESCE(tb."NguoiTao", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NguoiCapNhat" = COALESCE(tb."NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE(tb."NgayCapNhat", CURRENT_TIMESTAMP)
WHERE tb."DaXoa" = FALSE;

WITH admin_account AS (
  SELECT "MaTaiKhoan" FROM "NGUOIDUNG" WHERE "TenDangNhap" = 'admin'
)
UPDATE "MONDAHOC" mdh
SET
  "GhiChu" = COALESCE(mdh."GhiChu", CASE WHEN mdh."KetQua" = 'qua_mon' THEN 'Đạt yêu cầu tích lũy' ELSE 'Cần học lại để tích lũy' END),
  "NguoiCapNhat" = COALESCE(mdh."NguoiCapNhat", (SELECT "MaTaiKhoan" FROM admin_account)),
  "NgayCapNhat" = COALESCE(mdh."NgayCapNhat", CURRENT_TIMESTAMP)
WHERE mdh."DaXoa" = FALSE;

UPDATE "PHIEUTHUHOCPHI" p
SET
  "PaymentProvider" = COALESCE(p."PaymentProvider", CASE p."HinhThucThu"
    WHEN 'Tiền mặt' THEN 'cash'
    WHEN 'Chuyển khoản' THEN 'bank_transfer'
    WHEN 'Ví điện tử' THEN 'zalopay'
    WHEN 'Thẻ' THEN 'card'
    ELSE 'manual'
  END),
  "PaymentChannel" = COALESCE(p."PaymentChannel", 'admin'),
  "NguoiThu" = COALESCE(p."NguoiThu", CASE WHEN p."HinhThucThu" = 'Tiền mặt' THEN 'Phòng tài chính' ELSE 'Cổng thanh toán' END),
  "NgayXacNhan" = COALESCE(p."NgayXacNhan", CASE WHEN p."TrangThai" = 'Thành công' THEN p."NgayLap" ELSE NULL END),
  "NgayCapNhat" = COALESCE(p."NgayCapNhat", p."NgayLap");

-- Extra pending payment seed removed because payment references are generated above.

SELECT setval(pg_get_serial_sequence('"PHIEUTHUHOCPHI"', 'SoPhieuThu'), GREATEST((SELECT MAX("SoPhieuThu") FROM "PHIEUTHUHOCPHI"), 6), true);

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

INSERT INTO "MONHOCMO" ("MaHocKy", "MaMonHoc", "TrangThai", "GhiChu")
SELECT DISTINCT lm."MaHocKy", l."MaMonHoc", TRUE, 'Tu dong tao tu lop mo hien co'
FROM "LOPMO" lm
JOIN "LOP" l ON l."MaLop" = lm."MaLop"
JOIN "MONHOC" mh ON mh."MaMonHoc" = l."MaMonHoc"
WHERE COALESCE(lm."TrangThai", TRUE) = TRUE
  AND COALESCE(l."DaXoa", FALSE) = FALSE
  AND COALESCE(mh."DaXoa", FALSE) = FALSE
ON CONFLICT ("MaHocKy", "MaMonHoc") DO UPDATE SET
  "TrangThai" = TRUE,
  "DaXoa" = FALSE,
  "NguoiXoa" = NULL,
  "NgayXoa" = NULL;

CREATE OR REPLACE FUNCTION fn_check_lopmo_monhocmo()
RETURNS TRIGGER AS $$
DECLARE
  v_mamonhoc VARCHAR(15);
BEGIN
  IF COALESCE(NEW."TrangThai", TRUE) = FALSE THEN
    RETURN NEW;
  END IF;

  SELECT l."MaMonHoc" INTO v_mamonhoc
  FROM "LOP" l
  JOIN "MONHOC" mh ON mh."MaMonHoc" = l."MaMonHoc"
  WHERE l."MaLop" = NEW."MaLop"
    AND COALESCE(l."DaXoa", FALSE) = FALSE
    AND COALESCE(l."TrangThai", TRUE) = TRUE
    AND COALESCE(mh."DaXoa", FALSE) = FALSE
    AND COALESCE(mh."TrangThai", TRUE) = TRUE;

  IF v_mamonhoc IS NULL THEN
    RAISE EXCEPTION 'MONHOCMO: Lop % khong ton tai hoac mon hoc cua lop khong hoat dong.', NEW."MaLop";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "MONHOCMO" mhm
    WHERE mhm."MaHocKy" = NEW."MaHocKy"
      AND mhm."MaMonHoc" = v_mamonhoc
      AND COALESCE(mhm."DaXoa", FALSE) = FALSE
      AND COALESCE(mhm."TrangThai", TRUE) = TRUE
  ) THEN
    RAISE EXCEPTION 'MONHOCMO: Mon hoc % chua duoc mo trong hoc ky %, khong the mo lop %.', v_mamonhoc, NEW."MaHocKy", NEW."MaLop";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_lopmo_monhocmo ON "LOPMO";
CREATE TRIGGER trg_check_lopmo_monhocmo
BEFORE INSERT OR UPDATE OF "MaHocKy", "MaLop", "TrangThai"
ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_lopmo_monhocmo();

CREATE OR REPLACE FUNCTION fn_guard_monhocmo_active_lopmo()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO v_count
    FROM "LOPMO" lm
    JOIN "LOP" l ON l."MaLop" = lm."MaLop"
    WHERE lm."MaHocKy" = OLD."MaHocKy"
      AND l."MaMonHoc" = OLD."MaMonHoc"
      AND COALESCE(lm."TrangThai", TRUE) = TRUE;

    IF v_count > 0 THEN
      RAISE EXCEPTION 'MONHOCMO: Khong the tat hoac xoa mon hoc mo vi con lop mo dang hoat dong.';
    END IF;
    RETURN OLD;
  END IF;

  IF COALESCE(NEW."DaXoa", FALSE) = TRUE
     OR COALESCE(NEW."TrangThai", TRUE) = FALSE
     OR NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy"
     OR NEW."MaMonHoc" IS DISTINCT FROM OLD."MaMonHoc" THEN
    SELECT COUNT(*) INTO v_count
    FROM "LOPMO" lm
    JOIN "LOP" l ON l."MaLop" = lm."MaLop"
    WHERE lm."MaHocKy" = OLD."MaHocKy"
      AND l."MaMonHoc" = OLD."MaMonHoc"
      AND COALESCE(lm."TrangThai", TRUE) = TRUE;

    IF v_count > 0 THEN
      RAISE EXCEPTION 'MONHOCMO: Khong the tat hoac xoa mon hoc mo vi con lop mo dang hoat dong.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_monhocmo_active_lopmo ON "MONHOCMO";
CREATE TRIGGER trg_guard_monhocmo_active_lopmo
BEFORE DELETE OR UPDATE OF "MaHocKy", "MaMonHoc", "TrangThai", "DaXoa"
ON "MONHOCMO"
FOR EACH ROW
EXECUTE FUNCTION fn_guard_monhocmo_active_lopmo();

-- =====================================================
-- END OF INIT.SQL
-- =====================================================
