const { PrismaClient } = require('@prisma/client');
const { buildErrorResponse } = require('../utils/errorHandler');
const {
  DEFAULT_USER_GROUPS,
  DEFAULT_GROUP_PERMISSIONS,
  LEGACY_PERMISSION_CODES,
  PERMISSION_CATALOG
} = require('../utils/permissionCatalog');

const prisma = new PrismaClient({});

const AUDITED_SOFT_DELETE_TABLES = [
  'SINHVIEN',
  'MONHOC',
  'MONHOCMO',
  'LOP',
  'PHONGHOC',
  'GIANGVIEN',
  'PHONGHOCHOCKY',
  'GIANGVIENHOCKY',
  'HOCKY',
  'KHOA',
  'NGANHHOC',
  'MONDAHOC',
  'DIEUKIENMONHOC',
  'DONGIATINCHI',
  'DOITUONG',
  'THONGBAO',
  'CHUCNANG',
  'NHOMNGUOIDUNG',
  'TIETHOC',
  'TINH',
  'PHUONGXA'
];

const ensureDefaultAuthorizationData = async () => {
  for (const group of DEFAULT_USER_GROUPS) {
    await prisma.NHOMNGUOIDUNG.upsert({
      where: { MaNhom: group.MaNhom },
      create: group,
      update: { TenNhom: group.TenNhom }
    });
  }

  for (const permission of PERMISSION_CATALOG) {
    await prisma.CHUCNANG.upsert({
      where: { MaChucNang: permission.code },
      create: {
        MaChucNang: permission.code,
        TenChucNang: permission.name,
        TenManHinhDuocLoad: permission.screen,
        DaXoa: false
      },
      update: {
        TenChucNang: permission.name,
        TenManHinhDuocLoad: permission.screen,
        DaXoa: false,
        NguoiXoa: null,
        NgayXoa: null
      }
    });
  }

  await prisma.PHANQUYEN.deleteMany({
    where: { MaChucNang: { in: LEGACY_PERMISSION_CODES } }
  });

  await prisma.CHUCNANG.updateMany({
    where: { MaChucNang: { in: LEGACY_PERMISSION_CODES } },
    data: { DaXoa: true, NgayXoa: new Date() }
  });

  for (const [MaNhom, permissionCodes] of Object.entries(DEFAULT_GROUP_PERMISSIONS)) {
    if (!permissionCodes.length) continue;
    await prisma.PHANQUYEN.createMany({
      data: permissionCodes.map(MaChucNang => ({ MaNhom, MaChucNang })),
      skipDuplicates: true
    });
  }
};

const ensureAuthSchema = async () => {
  const qi = String.fromCharCode(34);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE ${qi}DONGIATINCHI${qi}
      ADD COLUMN IF NOT EXISTS ${qi}NgayApDung${qi} DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS ${qi}TrangThai${qi} BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS ${qi}DaXoa${qi} BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_lay_don_gia(
      p_LoaiMon VARCHAR,
      p_LoaiGia VARCHAR,
      p_MaHocKy VARCHAR
    ) RETURNS DECIMAL AS $$
    DECLARE
      v_DonGia DECIMAL(12,0);
    BEGIN
      SELECT ${qi}DonGia${qi} INTO v_DonGia
      FROM ${qi}DONGIATINCHI${qi}
      WHERE ${qi}LoaiMon${qi} = p_LoaiMon
        AND ${qi}LoaiHoc${qi} = p_LoaiGia
        AND COALESCE(${qi}DaXoa${qi}, FALSE) = FALSE
        AND ${qi}TrangThai${qi} = TRUE
        AND (${qi}MaHocKy${qi} = p_MaHocKy OR ${qi}MaHocKy${qi} IS NULL)
      ORDER BY
        CASE WHEN ${qi}MaHocKy${qi} = p_MaHocKy THEN 0 ELSE 1 END,
        ${qi}NgayApDung${qi} DESC NULLS LAST,
        ${qi}id${qi} DESC
      LIMIT 1;

      IF v_DonGia IS NULL THEN
        RAISE EXCEPTION 'RBTV21: Khong tim thay bang gia ap dung cho Loai mon: %, Loai hoc: %, Hoc ky: %.', p_LoaiMon, p_LoaiGia, p_MaHocKy;
      END IF;

      RETURN v_DonGia;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_check_rbtv21_dongiatinchi()
    RETURNS TRIGGER AS $fn$
    BEGIN
      IF current_setting('app.bypass_pricing_guard', true) = '1' THEN
        RETURN NEW;
      END IF;

      IF NEW.${qi}DonGia${qi} IS DISTINCT FROM OLD.${qi}DonGia${qi} OR NEW.${qi}TrangThai${qi} IS DISTINCT FROM OLD.${qi}TrangThai${qi} THEN
        IF EXISTS (
          SELECT 1 FROM ${qi}CHITIETDANGKY${qi} ctdk
          JOIN ${qi}PHIEUDANGKY${qi} pdk ON ctdk.${qi}SoPhieu${qi} = pdk.${qi}SoPhieu${qi}
          JOIN ${qi}HOCKY${qi} hk ON pdk.${qi}MaHocKy${qi} = hk.${qi}MaHocKy${qi}
          WHERE ctdk.${qi}LoaiMon${qi} = OLD.${qi}LoaiMon${qi}
            AND (CASE WHEN hk.${qi}LoaiHocKy${qi} = U&'H\\00E8' AND ctdk.${qi}LoaiDangKy${qi} = 'hoc_moi' THEN 'hoc_he' ELSE ctdk.${qi}LoaiDangKy${qi} END) = OLD.${qi}LoaiHoc${qi}
            AND (OLD.${qi}MaHocKy${qi} IS NULL OR pdk.${qi}MaHocKy${qi} = OLD.${qi}MaHocKy${qi})
            AND ctdk.${qi}DonGia${qi} = OLD.${qi}DonGia${qi}
        ) THEN
          RAISE EXCEPTION 'RBTV21: Khong the sua DonGia hoac TrangThai. Muc gia nay dang duoc su dung trong cac phieu dang ky da luu.';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE TRIGGER trg_rbtv21_dongiatinchi_upd
    BEFORE UPDATE OF ${qi}DonGia${qi}, ${qi}TrangThai${qi} ON ${qi}DONGIATINCHI${qi}
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_rbtv21_dongiatinchi();
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NGUOIDUNG"
      ADD COLUMN IF NOT EXISTS "TrangThaiDuyet" VARCHAR(20) NOT NULL DEFAULT 'approved',
      ADD COLUMN IF NOT EXISTS "NgayDuyet" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NguoiDuyet" INTEGER,
      ADD COLUMN IF NOT EXISTS "LyDoTuChoi" VARCHAR(300)
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_trang_thai_duyet'
      ) THEN
        ALTER TABLE "NGUOIDUNG"
          ADD CONSTRAINT chk_trang_thai_duyet
          CHECK ("TrangThaiDuyet" IN ('pending', 'approved', 'rejected'));
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "NGUOIDUNG"
    SET "TrangThaiDuyet" = 'approved'
    WHERE "TrangThaiDuyet" IS NULL
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NGUOIDUNG"
      ADD COLUMN IF NOT EXISTS "LanDangNhapCuoi" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "RefreshToken" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "AnhDaiDien" VARCHAR(500),
      ALTER COLUMN "AnhDaiDien" TYPE VARCHAR(500)
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MATKHAUTAMTAIKHOAN" (
      id SERIAL NOT NULL,
      "MaTaiKhoan" INTEGER NOT NULL,
      "MaSv" VARCHAR(15) NOT NULL,
      "TenDangNhap" VARCHAR(50) NOT NULL,
      "MatKhauTam" VARCHAR(100) NOT NULL,
      "Email" VARCHAR(100),
      "TrangThaiGuiEmail" VARCHAR(30) DEFAULT 'pending',
      "LoiGuiEmail" VARCHAR(300),
      "NguoiTao" INTEGER,
      "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT mat_khau_tam_tai_khoan_pkey PRIMARY KEY (id)
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MATKHAUTAMTAIKHOAN"
      ADD COLUMN IF NOT EXISTS "MaTaiKhoan" INTEGER,
      ADD COLUMN IF NOT EXISTS "MaSv" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "TenDangNhap" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "MatKhauTam" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "Email" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "TrangThaiGuiEmail" VARCHAR(30) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "LoiGuiEmail" VARCHAR(300),
      ADD COLUMN IF NOT EXISTS "NguoiTao" INTEGER,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mkttk_tk') THEN
        ALTER TABLE "MATKHAUTAMTAIKHOAN"
          ADD CONSTRAINT fk_mkttk_tk FOREIGN KEY ("MaTaiKhoan")
          REFERENCES "NGUOIDUNG"("MaTaiKhoan") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_mkttk_masv ON "MATKHAUTAMTAIKHOAN" ("MaSv")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_mkttk_ngaytao ON "MATKHAUTAMTAIKHOAN" ("NgayTao")');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SINHVIEN"
      ADD COLUMN IF NOT EXISTS "HoTenCha" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "SdtCha" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "HoTenMe" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "SdtMe" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "AnhDaiDien" VARCHAR(500),
      ALTER COLUMN "AnhDaiDien" TYPE VARCHAR(500)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "QUANTRIVIEN"
      ADD COLUMN IF NOT EXISTS "AnhDaiDien" VARCHAR(500),
      ALTER COLUMN "AnhDaiDien" TYPE VARCHAR(500)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "KHOA"
      ADD COLUMN IF NOT EXISTS "DiaChi" VARCHAR(200),
      ADD COLUMN IF NOT EXISTS "TruongKhoa" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NGANHHOC"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MONHOC"
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NAMHOC"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NguoiCapNhat" INTEGER,
      ADD COLUMN IF NOT EXISTS "NgayCapNhat" TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "HOCKY"
      ADD COLUMN IF NOT EXISTS "ThuTu" INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "NgayBatDauDangKy" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayKetThucDangKy" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayBatDauCuuXet" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayKetThucCuuXet" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayChotDangKy" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "MoThuHocPhi" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "NgayMoThuHocPhi" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DONCUUXETDANGKY" (
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
      CONSTRAINT don_cuu_xet_dang_ky_pkey PRIMARY KEY (id)
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DONCUUXETDANGKY"
      ADD COLUMN IF NOT EXISTS "MaSv" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "MaHocKy" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "SoPhieu" INTEGER,
      ADD COLUMN IF NOT EXISTS "LoaiDon" VARCHAR(10) NOT NULL DEFAULT 'them',
      ADD COLUMN IF NOT EXISTS "TrangThai" VARCHAR(20) NOT NULL DEFAULT 'cho_duyet',
      ADD COLUMN IF NOT EXISTS "MaLopHuy" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "MaLopThem" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "LyDo" VARCHAR(500) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "LyDoTuChoi" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "NguoiDuyet" INTEGER,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayCapNhat" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayDuyet" TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dcx_loai_don') THEN
        ALTER TABLE "DONCUUXETDANGKY"
          ADD CONSTRAINT chk_dcx_loai_don CHECK ("LoaiDon" IN ('them', 'huy', 'doi'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dcx_trang_thai') THEN
        ALTER TABLE "DONCUUXETDANGKY"
          ADD CONSTRAINT chk_dcx_trang_thai CHECK ("TrangThai" IN ('cho_duyet', 'da_duyet', 'tu_choi', 'da_huy'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dcx_lop_theo_loai') THEN
        ALTER TABLE "DONCUUXETDANGKY"
          ADD CONSTRAINT chk_dcx_lop_theo_loai CHECK (
            ("LoaiDon" = 'them' AND "MaLopThem" IS NOT NULL AND "MaLopHuy" IS NULL)
            OR ("LoaiDon" = 'huy' AND "MaLopHuy" IS NOT NULL AND "MaLopThem" IS NULL)
            OR ("LoaiDon" = 'doi' AND "MaLopHuy" IS NOT NULL AND "MaLopThem" IS NOT NULL)
          );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dcx_sinhvien') THEN
        ALTER TABLE "DONCUUXETDANGKY" ADD CONSTRAINT fk_dcx_sinhvien FOREIGN KEY ("MaSv") REFERENCES "SINHVIEN"("MaSv") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dcx_hocky') THEN
        ALTER TABLE "DONCUUXETDANGKY" ADD CONSTRAINT fk_dcx_hocky FOREIGN KEY ("MaHocKy") REFERENCES "HOCKY"("MaHocKy") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dcx_phieudangky') THEN
        ALTER TABLE "DONCUUXETDANGKY" ADD CONSTRAINT fk_dcx_phieudangky FOREIGN KEY ("SoPhieu") REFERENCES "PHIEUDANGKY"("SoPhieu") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dcx_lop_huy') THEN
        ALTER TABLE "DONCUUXETDANGKY" ADD CONSTRAINT fk_dcx_lop_huy FOREIGN KEY ("MaLopHuy") REFERENCES "LOP"("MaLop") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dcx_lop_them') THEN
        ALTER TABLE "DONCUUXETDANGKY" ADD CONSTRAINT fk_dcx_lop_them FOREIGN KEY ("MaLopThem") REFERENCES "LOP"("MaLop") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dcx_nguoi_duyet') THEN
        ALTER TABLE "DONCUUXETDANGKY" ADD CONSTRAINT fk_dcx_nguoi_duyet FOREIGN KEY ("NguoiDuyet") REFERENCES "NGUOIDUNG"("MaTaiKhoan") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_dcx_sv_hk ON "DONCUUXETDANGKY" ("MaSv", "MaHocKy")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_dcx_hk_trangthai ON "DONCUUXETDANGKY" ("MaHocKy", "TrangThai")');
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_dcx_pending
    ON "DONCUUXETDANGKY" ("MaSv", "MaHocKy", "LoaiDon", COALESCE("MaLopHuy", ''), COALESCE("MaLopThem", ''))
    WHERE "TrangThai" = 'cho_duyet'
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PHONGHOC" (
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
      CONSTRAINT phong_hoc_pkey PRIMARY KEY ("MaPhong")
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PHONGHOC"
      ADD COLUMN IF NOT EXISTS "TenPhong" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "ToaNha" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "SucChua" INTEGER DEFAULT 60,
      ADD COLUMN IF NOT EXISTS "LoaiPhong" VARCHAR(30) DEFAULT 'ly_thuyet',
      ADD COLUMN IF NOT EXISTS "MoTa" VARCHAR(300),
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NguoiCapNhat" INTEGER,
      ADD COLUMN IF NOT EXISTS "NgayCapNhat" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "NguoiXoa" INTEGER,
      ADD COLUMN IF NOT EXISTS "NgayXoa" TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GIANGVIEN" (
      "MaGiangVien" VARCHAR(20) NOT NULL,
      "HoTen" VARCHAR(100) NOT NULL,
      "HocHam" VARCHAR(20),
      "HocVi" VARCHAR(20),
      "HocHamHocVi" VARCHAR(50),
      "MaKhoa" VARCHAR(10),
      "Email" VARCHAR(100) NOT NULL,
      "Sdt" VARCHAR(15),
      "MoTa" VARCHAR(300),
      "TrangThai" BOOLEAN DEFAULT TRUE,
      "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "NguoiCapNhat" INTEGER,
      "NgayCapNhat" TIMESTAMP,
      "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
      "NguoiXoa" INTEGER,
      "NgayXoa" TIMESTAMP,
      CONSTRAINT giang_vien_pkey PRIMARY KEY ("MaGiangVien")
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "GIANGVIEN"
      ADD COLUMN IF NOT EXISTS "HoTen" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "HocHam" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "HocVi" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "HocHamHocVi" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "MaKhoa" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "Email" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "Sdt" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "MoTa" VARCHAR(300),
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NguoiCapNhat" INTEGER,
      ADD COLUMN IF NOT EXISTS "NgayCapNhat" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "NguoiXoa" INTEGER,
      ADD COLUMN IF NOT EXISTS "NgayXoa" TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PHONGHOCHOCKY" (
      id SERIAL NOT NULL,
      "MaPhong" VARCHAR(50) NOT NULL,
      "MaHocKy" VARCHAR(15) NOT NULL,
      "TrangThai" BOOLEAN DEFAULT TRUE,
      "GhiChu" VARCHAR(200),
      "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "NguoiCapNhat" INTEGER,
      "NgayCapNhat" TIMESTAMP,
      "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
      "NguoiXoa" INTEGER,
      "NgayXoa" TIMESTAMP,
      CONSTRAINT phong_hoc_hoc_ky_pkey PRIMARY KEY (id),
      CONSTRAINT uq_phong_hoc_hoc_ky UNIQUE ("MaPhong", "MaHocKy")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GIANGVIENHOCKY" (
      id SERIAL NOT NULL,
      "MaGiangVien" VARCHAR(20) NOT NULL,
      "MaHocKy" VARCHAR(15) NOT NULL,
      "TrangThai" BOOLEAN DEFAULT TRUE,
      "GhiChu" VARCHAR(200),
      "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "NguoiCapNhat" INTEGER,
      "NgayCapNhat" TIMESTAMP,
      "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
      "NguoiXoa" INTEGER,
      "NgayXoa" TIMESTAMP,
      CONSTRAINT giang_vien_hoc_ky_pkey PRIMARY KEY (id),
      CONSTRAINT uq_giang_vien_hoc_ky UNIQUE ("MaGiangVien", "MaHocKy")
    )
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_phong_hoc_hoc_ky_hk ON "PHONGHOCHOCKY" ("MaHocKy")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_giang_vien_hoc_ky_hk ON "GIANGVIENHOCKY" ("MaHocKy")');

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_phong_hoc_hoc_ky_phong') THEN
        ALTER TABLE "PHONGHOCHOCKY"
          ADD CONSTRAINT fk_phong_hoc_hoc_ky_phong
          FOREIGN KEY ("MaPhong") REFERENCES "PHONGHOC"("MaPhong")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_phong_hoc_hoc_ky_hoc_ky') THEN
        ALTER TABLE "PHONGHOCHOCKY"
          ADD CONSTRAINT fk_phong_hoc_hoc_ky_hoc_ky
          FOREIGN KEY ("MaHocKy") REFERENCES "HOCKY"("MaHocKy")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_giang_vien_hoc_ky_giang_vien') THEN
        ALTER TABLE "GIANGVIENHOCKY"
          ADD CONSTRAINT fk_giang_vien_hoc_ky_giang_vien
          FOREIGN KEY ("MaGiangVien") REFERENCES "GIANGVIEN"("MaGiangVien")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_giang_vien_hoc_ky_hoc_ky') THEN
        ALTER TABLE "GIANGVIENHOCKY"
          ADD CONSTRAINT fk_giang_vien_hoc_ky_hoc_ky
          FOREIGN KEY ("MaHocKy") REFERENCES "HOCKY"("MaHocKy")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_phong_hoc_suc_chua'
      ) THEN
        ALTER TABLE "PHONGHOC"
          ADD CONSTRAINT chk_phong_hoc_suc_chua
          CHECK ("SucChua" IS NULL OR "SucChua" > 0);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_giangvien_khoa'
      ) THEN
        ALTER TABLE "GIANGVIEN"
          ADD CONSTRAINT fk_giangvien_khoa
          FOREIGN KEY ("MaKhoa") REFERENCES "KHOA"("MaKhoa")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LOP"
      ADD COLUMN IF NOT EXISTS "MaGiangVien" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "GiangVien" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "LichHoc" VARCHAR(200),
      ADD COLUMN IF NOT EXISTS "ThuTrongTuan" INTEGER,
      ADD COLUMN IF NOT EXISTS "MaTietBatDau" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "MaTietKetThuc" VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "MaPhong" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "PhongHoc" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LOPMO"
      ADD COLUMN IF NOT EXISTS "MaGiangVien" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "GiangVien" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MONHOCMO" (
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
      CONSTRAINT mon_hoc_mo_pkey PRIMARY KEY (id)
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MONHOCMO"
      ADD COLUMN IF NOT EXISTS "MaHocKy" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "MaMonHoc" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "GhiChu" VARCHAR(200),
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NguoiCapNhat" INTEGER,
      ADD COLUMN IF NOT EXISTS "NgayCapNhat" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "NguoiXoa" INTEGER,
      ADD COLUMN IF NOT EXISTS "NgayXoa" TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_monhocmo'
      ) THEN
        ALTER TABLE "MONHOCMO"
          ADD CONSTRAINT uq_monhocmo UNIQUE ("MaHocKy", "MaMonHoc");
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_monhocmo_hocky'
      ) THEN
        ALTER TABLE "MONHOCMO"
          ADD CONSTRAINT fk_monhocmo_hocky
          FOREIGN KEY ("MaHocKy") REFERENCES "HOCKY"("MaHocKy")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_monhocmo_monhoc'
      ) THEN
        ALTER TABLE "MONHOCMO"
          ADD CONSTRAINT fk_monhocmo_monhoc
          FOREIGN KEY ("MaMonHoc") REFERENCES "MONHOC"("MaMonHoc")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_monhocmo_hocky ON "MONHOCMO" ("MaHocKy")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_monhocmo_monhoc ON "MONHOCMO" ("MaMonHoc")');

  await prisma.$executeRawUnsafe(`
    INSERT INTO "MONHOCMO" ("MaHocKy", "MaMonHoc", "TrangThai", "GhiChu")
    SELECT DISTINCT lm."MaHocKy", l."MaMonHoc", TRUE, 'Tu dong tao tu lop mo hien co'
    FROM "LOPMO" lm
    JOIN "LOP" l ON l."MaLop" = lm."MaLop"
    JOIN "MONHOC" mh ON mh."MaMonHoc" = l."MaMonHoc"
    WHERE COALESCE(lm."TrangThai", TRUE) = TRUE
      AND lm."MaHocKy" NOT LIKE 'HK-DEMO-%'
      AND COALESCE(l."DaXoa", FALSE) = FALSE
      AND COALESCE(mh."DaXoa", FALSE) = FALSE
    ON CONFLICT ("MaHocKy", "MaMonHoc") DO UPDATE SET
      "TrangThai" = TRUE,
      "DaXoa" = FALSE,
      "NguoiXoa" = NULL,
      "NgayXoa" = NULL
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_lopmo_monhocmo ON "LOPMO"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_check_lopmo_monhocmo
    BEFORE INSERT OR UPDATE OF "MaHocKy", "MaLop", "TrangThai"
    ON "LOPMO"
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_lopmo_monhocmo();
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_guard_monhocmo_active_lopmo ON "MONHOCMO"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_guard_monhocmo_active_lopmo
    BEFORE DELETE OR UPDATE OF "MaHocKy", "MaMonHoc", "TrangThai", "DaXoa"
    ON "MONHOCMO"
    FOR EACH ROW
    EXECUTE FUNCTION fn_guard_monhocmo_active_lopmo();
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LICHHOCLOP"
      ADD COLUMN IF NOT EXISTS "MaPhong" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "PhongHoc" VARCHAR(50)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LICHHOCLOP"
      DROP CONSTRAINT IF EXISTS chk_thu_trong_tuan,
      ADD CONSTRAINT chk_thu_trong_tuan CHECK ("ThuTrongTuan" >= 1 AND "ThuTrongTuan" <= 7)
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lop_giangvien'
      ) THEN
        ALTER TABLE "LOP"
          ADD CONSTRAINT fk_lop_giangvien
          FOREIGN KEY ("MaGiangVien") REFERENCES "GIANGVIEN"("MaGiangVien")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lop_phonghoc'
      ) THEN
        ALTER TABLE "LOP"
          ADD CONSTRAINT fk_lop_phonghoc
          FOREIGN KEY ("MaPhong") REFERENCES "PHONGHOC"("MaPhong")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lop_tiet_bat_dau'
      ) THEN
        ALTER TABLE "LOP"
          ADD CONSTRAINT fk_lop_tiet_bat_dau
          FOREIGN KEY ("MaTietBatDau") REFERENCES "TIETHOC"("MaTiet")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lop_tiet_ket_thuc'
      ) THEN
        ALTER TABLE "LOP"
          ADD CONSTRAINT fk_lop_tiet_ket_thuc
          FOREIGN KEY ("MaTietKetThuc") REFERENCES "TIETHOC"("MaTiet")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lopmo_giangvien'
      ) THEN
        ALTER TABLE "LOPMO"
          ADD CONSTRAINT fk_lopmo_giangvien
          FOREIGN KEY ("MaGiangVien") REFERENCES "GIANGVIEN"("MaGiangVien")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lhl_phonghoc'
      ) THEN
        ALTER TABLE "LICHHOCLOP"
          ADD CONSTRAINT fk_lhl_phonghoc
          FOREIGN KEY ("MaPhong") REFERENCES "PHONGHOC"("MaPhong")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_lop_catalog_only ON "LOP"');
  await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS fn_check_lop_catalog_only() CASCADE');
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_lop_assignment ON "LOP"');

  await prisma.$executeRawUnsafe(`
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
      'Phong ' || "MaPhong",
      NULLIF(split_part("MaPhong", '.', 1), ''),
      "SucChua",
      CASE WHEN "LaPhongThucHanh" THEN 'thuc_hanh' ELSE 'ly_thuyet' END,
      TRUE
    FROM phong_nguon
    ON CONFLICT ("MaPhong") DO UPDATE SET
      "TenPhong" = COALESCE("PHONGHOC"."TenPhong", EXCLUDED."TenPhong"),
      "ToaNha" = COALESCE("PHONGHOC"."ToaNha", EXCLUDED."ToaNha"),
      "SucChua" = GREATEST(COALESCE("PHONGHOC"."SucChua", 0), COALESCE(EXCLUDED."SucChua", 0)),
      "LoaiPhong" = COALESCE("PHONGHOC"."LoaiPhong", EXCLUDED."LoaiPhong"),
      "DaXoa" = FALSE,
      "NguoiXoa" = NULL,
      "NgayXoa" = NULL
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "LOP"
    SET "MaPhong" = TRIM("PhongHoc")
    WHERE "MaPhong" IS NULL
      AND "PhongHoc" IS NOT NULL
      AND TRIM("PhongHoc") <> ''
      AND EXISTS (
        SELECT 1 FROM "PHONGHOC" p WHERE p."MaPhong" = TRIM("LOP"."PhongHoc")
      )
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "LOP"
    SET
      "ThuTrongTuan" = COALESCE("ThuTrongTuan", CASE
        WHEN "LichHoc" ~ '^Thu [2-7] T[0-9]+-T[0-9]+$'
          THEN regexp_replace("LichHoc", '^Thu ([2-7]) T([0-9]+)-T([0-9]+)$', '\\1')::int
        ELSE NULL
      END),
      "MaTietBatDau" = COALESCE("MaTietBatDau", CASE
        WHEN "LichHoc" ~ '^Thu [2-7] T[0-9]+-T[0-9]+$'
          THEN 'T' || regexp_replace("LichHoc", '^Thu ([2-7]) T([0-9]+)-T([0-9]+)$', '\\2')
        ELSE NULL
      END),
      "MaTietKetThuc" = COALESCE("MaTietKetThuc", CASE
        WHEN "LichHoc" ~ '^Thu [2-7] T[0-9]+-T[0-9]+$'
          THEN 'T' || regexp_replace("LichHoc", '^Thu ([2-7]) T([0-9]+)-T([0-9]+)$', '\\3')
        ELSE NULL
      END)
    WHERE "LichHoc" ~ '^Thu [2-7] T[0-9]+-T[0-9]+$'
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      has_lop_giangvien BOOLEAN;
      has_lop_magiangvien BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'LOP' AND column_name = 'GiangVien'
      ) INTO has_lop_giangvien;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'LOP' AND column_name = 'MaGiangVien'
      ) INTO has_lop_magiangvien;

      IF has_lop_giangvien THEN
        IF has_lop_magiangvien THEN
          EXECUTE $sql$
            WITH giang_vien_nguon_raw AS (
              SELECT
                TRIM(l."GiangVien") AS "GiangVienDayDu",
                COALESCE(NULLIF(TRIM(l."MaGiangVien"), ''), 'GV' || UPPER(substr(md5(TRIM(l."GiangVien")), 1, 8))) AS "MaGiangVien",
                MIN(mh."MaKhoa") AS "MaKhoa"
              FROM "LOP" l
              JOIN "MONHOC" mh ON mh."MaMonHoc" = l."MaMonHoc"
              WHERE l."GiangVien" IS NOT NULL AND TRIM(l."GiangVien") <> ''
              GROUP BY TRIM(l."GiangVien"), COALESCE(NULLIF(TRIM(l."MaGiangVien"), ''), 'GV' || UPPER(substr(md5(TRIM(l."GiangVien")), 1, 8)))
            ),
            giang_vien_nguon AS (
              SELECT DISTINCT ON ("MaGiangVien")
                "GiangVienDayDu",
                "MaGiangVien",
                "MaKhoa"
              FROM giang_vien_nguon_raw
              ORDER BY "MaGiangVien", "GiangVienDayDu"
            )
            INSERT INTO "GIANGVIEN" ("MaGiangVien", "HoTen", "HocHam", "HocVi", "HocHamHocVi", "MaKhoa", "Email", "TrangThai")
            SELECT
              "MaGiangVien",
              NULLIF(TRIM(regexp_replace("GiangVienDayDu", '^(GS\.TS|PGS\.TS|GS\.|PGS\.|TS\.|ThS\.)\s+', '')), ''),
              CASE
                WHEN "GiangVienDayDu" LIKE 'GS.%' THEN 'GS'
                WHEN "GiangVienDayDu" LIKE 'PGS.%' THEN 'PGS'
                ELSE NULL
              END,
              CASE
                WHEN "GiangVienDayDu" LIKE 'GS.TS %' THEN 'TS'
                WHEN "GiangVienDayDu" LIKE 'PGS.TS %' THEN 'TS'
                WHEN "GiangVienDayDu" LIKE 'TS. %' THEN 'TS'
                WHEN "GiangVienDayDu" LIKE 'ThS. %' THEN 'ThS'
                ELSE NULL
              END,
              CASE
                WHEN "GiangVienDayDu" LIKE 'GS.TS %' THEN 'GS.TS'
                WHEN "GiangVienDayDu" LIKE 'PGS.TS %' THEN 'PGS.TS'
                WHEN "GiangVienDayDu" LIKE 'GS. %' THEN 'GS'
                WHEN "GiangVienDayDu" LIKE 'PGS. %' THEN 'PGS'
                WHEN "GiangVienDayDu" LIKE 'TS. %' THEN 'TS'
                WHEN "GiangVienDayDu" LIKE 'ThS. %' THEN 'ThS'
                ELSE NULL
              END,
              "MaKhoa",
              LOWER("MaGiangVien") || '@uit.edu.vn',
              TRUE
            FROM giang_vien_nguon
            ON CONFLICT ("MaGiangVien") DO UPDATE SET
              "HoTen" = COALESCE("GIANGVIEN"."HoTen", EXCLUDED."HoTen"),
              "HocHam" = COALESCE("GIANGVIEN"."HocHam", EXCLUDED."HocHam"),
              "HocVi" = COALESCE("GIANGVIEN"."HocVi", EXCLUDED."HocVi"),
              "HocHamHocVi" = COALESCE("GIANGVIEN"."HocHamHocVi", EXCLUDED."HocHamHocVi"),
              "Email" = COALESCE(NULLIF("GIANGVIEN"."Email", ''), EXCLUDED."Email"),
              "MaKhoa" = COALESCE("GIANGVIEN"."MaKhoa", EXCLUDED."MaKhoa"),
              "DaXoa" = FALSE,
              "NguoiXoa" = NULL,
              "NgayXoa" = NULL
          $sql$;

          EXECUTE $sql$
            UPDATE "LOPMO" lm
            SET
              "MaGiangVien" = COALESCE(lm."MaGiangVien", NULLIF(TRIM(l."MaGiangVien"), ''), CASE WHEN l."GiangVien" IS NOT NULL AND TRIM(l."GiangVien") <> '' THEN 'GV' || UPPER(substr(md5(TRIM(l."GiangVien")), 1, 8)) ELSE NULL END),
              "GiangVien" = COALESCE(lm."GiangVien", NULLIF(TRIM(l."GiangVien"), ''))
            FROM "LOP" l
            WHERE l."MaLop" = lm."MaLop"
          $sql$;
        ELSE
          EXECUTE $sql$
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
            INSERT INTO "GIANGVIEN" ("MaGiangVien", "HoTen", "HocHam", "HocVi", "HocHamHocVi", "MaKhoa", "Email", "TrangThai")
            SELECT
              "MaGiangVien",
              NULLIF(TRIM(regexp_replace("GiangVienDayDu", '^(GS\.TS|PGS\.TS|GS\.|PGS\.|TS\.|ThS\.)\s+', '')), ''),
              CASE
                WHEN "GiangVienDayDu" LIKE 'GS.%' THEN 'GS'
                WHEN "GiangVienDayDu" LIKE 'PGS.%' THEN 'PGS'
                ELSE NULL
              END,
              CASE
                WHEN "GiangVienDayDu" LIKE 'GS.TS %' THEN 'TS'
                WHEN "GiangVienDayDu" LIKE 'PGS.TS %' THEN 'TS'
                WHEN "GiangVienDayDu" LIKE 'TS. %' THEN 'TS'
                WHEN "GiangVienDayDu" LIKE 'ThS. %' THEN 'ThS'
                ELSE NULL
              END,
              CASE
                WHEN "GiangVienDayDu" LIKE 'GS.TS %' THEN 'GS.TS'
                WHEN "GiangVienDayDu" LIKE 'PGS.TS %' THEN 'PGS.TS'
                WHEN "GiangVienDayDu" LIKE 'GS. %' THEN 'GS'
                WHEN "GiangVienDayDu" LIKE 'PGS. %' THEN 'PGS'
                WHEN "GiangVienDayDu" LIKE 'TS. %' THEN 'TS'
                WHEN "GiangVienDayDu" LIKE 'ThS. %' THEN 'ThS'
                ELSE NULL
              END,
              "MaKhoa",
              LOWER("MaGiangVien") || '@uit.edu.vn',
              TRUE
            FROM giang_vien_nguon
            ON CONFLICT ("MaGiangVien") DO UPDATE SET
              "HoTen" = COALESCE("GIANGVIEN"."HoTen", EXCLUDED."HoTen"),
              "HocHam" = COALESCE("GIANGVIEN"."HocHam", EXCLUDED."HocHam"),
              "HocVi" = COALESCE("GIANGVIEN"."HocVi", EXCLUDED."HocVi"),
              "HocHamHocVi" = COALESCE("GIANGVIEN"."HocHamHocVi", EXCLUDED."HocHamHocVi"),
              "Email" = COALESCE(NULLIF("GIANGVIEN"."Email", ''), EXCLUDED."Email"),
              "MaKhoa" = COALESCE("GIANGVIEN"."MaKhoa", EXCLUDED."MaKhoa"),
              "DaXoa" = FALSE,
              "NguoiXoa" = NULL,
              "NgayXoa" = NULL
          $sql$;

          EXECUTE $sql$
            UPDATE "LOPMO" lm
            SET
              "MaGiangVien" = COALESCE(lm."MaGiangVien", CASE WHEN l."GiangVien" IS NOT NULL AND TRIM(l."GiangVien") <> '' THEN 'GV' || UPPER(substr(md5(TRIM(l."GiangVien")), 1, 8)) ELSE NULL END),
              "GiangVien" = COALESCE(lm."GiangVien", NULLIF(TRIM(l."GiangVien"), ''))
            FROM "LOP" l
            WHERE l."MaLop" = lm."MaLop"
          $sql$;
        END IF;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_check_rbtv14_lichhoclop()
    RETURNS TRIGGER AS $$
    DECLARE
      v_mahocky VARCHAR(15);
      v_giangvien VARCHAR(100);
      v_trangthai BOOLEAN;
      v_bd_thutu INT;
      v_kt_thutu INT;
    BEGIN
      SELECT lm."MaHocKy", lm."TrangThai", COALESCE(lm."MaGiangVien", lm."GiangVien")
      INTO v_mahocky, v_trangthai, v_giangvien
      FROM "LOPMO" lm
      WHERE lm.id = NEW."LopMoId";

      IF v_giangvien IS NULL OR TRIM(v_giangvien) = '' OR NOT v_trangthai THEN
        RETURN NEW;
      END IF;

      SELECT "ThuTu" INTO v_bd_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
      SELECT "ThuTu" INTO v_kt_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";

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
          AND (
            (v_bd_thutu < kt."ThuTu" AND bd."ThuTu" < v_kt_thutu)
            OR (bd."ThuTu" = v_bd_thutu AND kt."ThuTu" = v_kt_thutu)
          )
      ) THEN
        RAISE EXCEPTION 'RBTV14: Giang vien % bi trung lich day thu % hoc ky %.', v_giangvien, NEW."ThuTrongTuan", v_mahocky;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_rbtv14_lichhoclop_ins_upd ON "LICHHOCLOP"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_rbtv14_lichhoclop_ins_upd
    BEFORE INSERT OR UPDATE OF "LopMoId", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc"
    ON "LICHHOCLOP"
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_rbtv14_lichhoclop();
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_check_rbtv14_lopmo()
    RETURNS TRIGGER AS $$
    DECLARE
      v_giangvien VARCHAR(100);
    BEGIN
      v_giangvien := COALESCE(NEW."MaGiangVien", NEW."GiangVien");

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
            AND (
              (bd1."ThuTu" < kt2."ThuTu" AND bd2."ThuTu" < kt1."ThuTu")
              OR (bd1."ThuTu" = bd2."ThuTu" AND kt1."ThuTu" = kt2."ThuTu")
            )
        ) THEN
          RAISE EXCEPTION 'RBTV14: Lop mo % gay trung lich day cua giang vien % trong hoc ky %.', NEW.id, v_giangvien, NEW."MaHocKy";
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_rbtv14_lopmo_upd ON "LOPMO"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_rbtv14_lopmo_upd
    BEFORE UPDATE OF "MaHocKy", "TrangThai", "MaGiangVien", "GiangVien"
    ON "LOPMO"
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_rbtv14_lopmo();
  `);

  await prisma.$executeRawUnsafe(`
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
          WHERE COALESCE(lm1."MaGiangVien", lm1."GiangVien") IS NOT NULL
            AND TRIM(COALESCE(lm1."MaGiangVien", lm1."GiangVien")) <> ''
            AND COALESCE(lm1."MaGiangVien", lm1."GiangVien") = COALESCE(lm2."MaGiangVien", lm2."GiangVien")
            AND lm1."MaHocKy" = lm2."MaHocKy"
            AND lm1."TrangThai" = TRUE
            AND lm2."TrangThai" = TRUE
            AND (
              (
                (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) <
                (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
                AND (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END) <
                (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END)
              )
              OR (
                (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) =
                (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END)
                AND (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END) =
                (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
              )
            )
        ) THEN
          RAISE EXCEPTION 'RBTV14: Sua ThuTu tiet hoc lam trung lich day cua giang vien.';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_rbtv14_tiethoc_upd ON "TIETHOC"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_rbtv14_tiethoc_upd
    BEFORE UPDATE OF "ThuTu"
    ON "TIETHOC"
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_rbtv14_tiethoc();
  `);

  await prisma.$executeRawUnsafe(`
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
          AND (
            (v_bd_thutu < kt."ThuTu" AND bd."ThuTu" < v_kt_thutu)
            OR (bd."ThuTu" = v_bd_thutu AND kt."ThuTu" = v_kt_thutu)
          )
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
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_rbtv14_lichhoclop_ins_upd ON "LICHHOCLOP"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_rbtv14_lichhoclop_ins_upd
    BEFORE INSERT OR UPDATE OF "LopMoId", "TrangThai", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "MaPhong", "PhongHoc"
    ON "LICHHOCLOP"
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_opened_schedule_conflict();
  `);

  await prisma.$executeRawUnsafe(`
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
          AND (
            (bd1."ThuTu" < kt2."ThuTu" AND bd2."ThuTu" < kt1."ThuTu")
            OR (bd1."ThuTu" = bd2."ThuTu" AND kt1."ThuTu" = kt2."ThuTu")
          )
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
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_rbtv14_lopmo_upd ON "LOPMO"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_rbtv14_lopmo_upd
    BEFORE INSERT OR UPDATE
    ON "LOPMO"
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_opened_class_conflict();
  `);

  await prisma.$executeRawUnsafe(`
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
            AND (
              (
                (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) <
                (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
                AND (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END) <
                (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END)
              )
              OR (
                (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) =
                (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END)
                AND (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END) =
                (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
              )
            )
        ) THEN
          RAISE EXCEPTION 'RBTV14: Sua ThuTu tiet hoc lam trung lich giang vien hoac phong hoc.';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // RBTV lịch học được kiểm tra ở service/API để frontend và backend dùng cùng logic.
  // Gỡ trigger lịch cũ để DB không chặn trường hợp hai khoảng tiết chỉ chạm biên.
  for (const [tableName, triggerName] of [
    ['LICHHOCLOP', 'trg_rbtv12_lichhoclop_ins_upd'],
    ['TIETHOC', 'trg_rbtv12_tiethoc_upd'],
    ['LICHHOCLOP', 'trg_rbtv13_lichhoclop_ins_upd'],
    ['LOPMO', 'trg_rbtv13_lopmo_upd'],
    ['TIETHOC', 'trg_rbtv13_tiethoc_upd'],
    ['LICHHOCLOP', 'trg_rbtv14_lichhoclop_ins_upd'],
    ['LOPMO', 'trg_rbtv14_lopmo_upd'],
    ['TIETHOC', 'trg_rbtv14_tiethoc_upd']
  ]) {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "${tableName}"`);
  }

  await prisma.$executeRawUnsafe(`
    WITH phong_lich AS (
      SELECT DISTINCT TRIM("PhongHoc") AS "MaPhong"
      FROM "LICHHOCLOP" lh
      JOIN "LOPMO" lm ON lm.id = lh."LopMoId"
      WHERE lh."PhongHoc" IS NOT NULL AND TRIM(lh."PhongHoc") <> ''
        AND lm."MaHocKy" NOT LIKE 'HK-DEMO-%'
    )
    INSERT INTO "PHONGHOC" ("MaPhong", "TenPhong", "ToaNha", "SucChua", "LoaiPhong", "TrangThai")
    SELECT
      "MaPhong",
      'Phong ' || "MaPhong",
      NULLIF(split_part("MaPhong", '.', 1), ''),
      60,
      'ly_thuyet',
      TRUE
    FROM phong_lich
    ON CONFLICT ("MaPhong") DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "LICHHOCLOP" lh
    SET "MaPhong" = TRIM(lh."PhongHoc")
    FROM "LOPMO" lm
    WHERE lm.id = lh."LopMoId"
      AND lm."MaHocKy" NOT LIKE 'HK-DEMO-%'
      AND lh."MaPhong" IS NULL
      AND lh."PhongHoc" IS NOT NULL
      AND TRIM(lh."PhongHoc") <> ''
      AND EXISTS (
        SELECT 1 FROM "PHONGHOC" p WHERE p."MaPhong" = TRIM(lh."PhongHoc")
      )
  `);

  await prisma.$executeRawUnsafe(`
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
      AND COALESCE(lm."TrangThai", TRUE) = TRUE
  `);

  await prisma.$executeRawUnsafe(`
    WITH ranked_rooms AS (
      SELECT p."MaPhong", ROW_NUMBER() OVER (ORDER BY p."MaPhong") AS rn
      FROM "PHONGHOC" p
      WHERE COALESCE(p."DaXoa", FALSE) = FALSE
    ), semester_room_limit AS (
      SELECT hk."MaHocKy", COALESCE(hk."ThuTu", 1) AS "ThuTu"
      FROM "HOCKY" hk
      WHERE COALESCE(hk."DaXoa", FALSE) = FALSE
        AND hk."MaHocKy" NOT LIKE 'HK-DEMO-%'
    ), used_rooms AS (
      SELECT DISTINCT COALESCE(lh."MaPhong", NULLIF(TRIM(lh."PhongHoc"), '')) AS "MaPhong", lm."MaHocKy"
      FROM "LICHHOCLOP" lh
      JOIN "LOPMO" lm ON lm.id = lh."LopMoId"
      WHERE COALESCE(lh."TrangThai", TRUE) = TRUE
        AND COALESCE(lm."TrangThai", TRUE) = TRUE
        AND COALESCE(lh."MaPhong", NULLIF(TRIM(lh."PhongHoc"), '')) IS NOT NULL
    ), room_allocations AS (
      SELECT rr."MaPhong", srl."MaHocKy", 'Seed theo tap phong hoc cua hoc ky' AS "GhiChu"
      FROM ranked_rooms rr
      CROSS JOIN semester_room_limit srl
      WHERE rr.rn <= CASE WHEN srl."ThuTu" = 3 THEN 4 WHEN srl."ThuTu" = 2 THEN 7 ELSE 9 END
      UNION
      SELECT ur."MaPhong", ur."MaHocKy", 'Tu dong them vi co lich lop dang dung phong'
      FROM used_rooms ur
      JOIN "PHONGHOC" p ON p."MaPhong" = ur."MaPhong"
    )
    INSERT INTO "PHONGHOCHOCKY" ("MaPhong", "MaHocKy", "TrangThai", "GhiChu")
    SELECT "MaPhong", "MaHocKy", TRUE, MAX("GhiChu")
    FROM room_allocations
    GROUP BY "MaPhong", "MaHocKy"
    ON CONFLICT ("MaPhong", "MaHocKy") DO UPDATE SET
      "TrangThai" = TRUE,
      "DaXoa" = FALSE,
      "NguoiXoa" = NULL,
      "NgayXoa" = NULL,
      "GhiChu" = COALESCE("PHONGHOCHOCKY"."GhiChu", EXCLUDED."GhiChu")
  `);

  await prisma.$executeRawUnsafe(`
    WITH ranked_lecturers AS (
      SELECT gv."MaGiangVien", ROW_NUMBER() OVER (ORDER BY gv."MaGiangVien") AS rn
      FROM "GIANGVIEN" gv
      WHERE COALESCE(gv."DaXoa", FALSE) = FALSE
    ), semester_lecturer_limit AS (
      SELECT hk."MaHocKy", COALESCE(hk."ThuTu", 1) AS "ThuTu"
      FROM "HOCKY" hk
      WHERE COALESCE(hk."DaXoa", FALSE) = FALSE
        AND hk."MaHocKy" NOT LIKE 'HK-DEMO-%'
    ), used_lecturers AS (
      SELECT DISTINCT lm."MaGiangVien", lm."MaHocKy"
      FROM "LOPMO" lm
      WHERE COALESCE(lm."TrangThai", TRUE) = TRUE
        AND NULLIF(TRIM(lm."MaGiangVien"), '') IS NOT NULL
    ), lecturer_allocations AS (
      SELECT rl."MaGiangVien", sll."MaHocKy", 'Seed theo tap giang vien cua hoc ky' AS "GhiChu"
      FROM ranked_lecturers rl
      CROSS JOIN semester_lecturer_limit sll
      WHERE rl.rn <= CASE WHEN sll."ThuTu" = 3 THEN 6 WHEN sll."ThuTu" = 2 THEN 12 ELSE 16 END
      UNION
      SELECT ul."MaGiangVien", ul."MaHocKy", 'Tu dong them vi co lop mo dang phan cong'
      FROM used_lecturers ul
      JOIN "GIANGVIEN" gv ON gv."MaGiangVien" = ul."MaGiangVien"
    )
    INSERT INTO "GIANGVIENHOCKY" ("MaGiangVien", "MaHocKy", "TrangThai", "GhiChu")
    SELECT "MaGiangVien", "MaHocKy", TRUE, MAX("GhiChu")
    FROM lecturer_allocations
    GROUP BY "MaGiangVien", "MaHocKy"
    ON CONFLICT ("MaGiangVien", "MaHocKy") DO UPDATE SET
      "TrangThai" = TRUE,
      "DaXoa" = FALSE,
      "NguoiXoa" = NULL,
      "NgayXoa" = NULL,
      "GhiChu" = COALESCE("GIANGVIENHOCKY"."GhiChu", EXCLUDED."GhiChu")
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "GIANGVIEN"
    SET
      "HocHam" = COALESCE("HocHam", CASE
        WHEN "HocHamHocVi" ILIKE 'GS.%' OR "HocHamHocVi" = 'GS' THEN 'GS'
        WHEN "HocHamHocVi" ILIKE 'PGS.%' OR "HocHamHocVi" = 'PGS' THEN 'PGS'
        ELSE NULL
      END),
      "HocVi" = COALESCE("HocVi", CASE
        WHEN "HocHamHocVi" ILIKE '%TS%' THEN 'TS'
        WHEN "HocHamHocVi" ILIKE '%ThS%' THEN 'ThS'
        ELSE NULL
      END),
      "Email" = COALESCE(NULLIF(TRIM("Email"), ''), LOWER("MaGiangVien") || '@uit.edu.vn')
    WHERE NULLIF(TRIM(COALESCE("Email", '')), '') IS NULL
       OR "HocHam" IS NULL
       OR "HocVi" IS NULL
  `);

  await prisma.$executeRawUnsafe('ALTER TABLE "GIANGVIEN" ALTER COLUMN "Email" SET NOT NULL');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LOPMO"
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LICHHOCLOP"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
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
          AND v_bd_thutu < CASE WHEN kt."ThuTu" > bd."ThuTu" THEN kt."ThuTu" ELSE bd."ThuTu" + 1 END
          AND bd."ThuTu" < CASE WHEN v_kt_thutu > v_bd_thutu THEN v_kt_thutu ELSE v_bd_thutu + 1 END
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
          AND v_bd_thutu < CASE WHEN kt."ThuTu" > bd."ThuTu" THEN kt."ThuTu" ELSE bd."ThuTu" + 1 END
          AND bd."ThuTu" < CASE WHEN v_kt_thutu > v_bd_thutu THEN v_kt_thutu ELSE v_bd_thutu + 1 END
      ) THEN
        RAISE EXCEPTION 'RBTV_LOP_THONGTIN: Giang vien % bi trung lich voi lop khac.', v_giangvien;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_lop_assignment ON "LOP"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_check_lop_assignment
    BEFORE INSERT OR UPDATE OF "MaGiangVien", "GiangVien", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "MaPhong", "PhongHoc", "TrangThai", "DaXoa"
    ON "LOP"
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_lop_assignment();
  `);
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_lop_assignment ON "LOP"');
  await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS fn_check_lop_assignment() CASCADE');

  await prisma.$executeRawUnsafe(`
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
        RAISE EXCEPTION 'RBTV_LOPMO_THONGTIN: Lop mo phai co giang vien phu trach.';
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
        RAISE EXCEPTION 'RBTV_LOPMO_THONGTIN: Lop mo phai co it nhat mot lich hoc kem phong hoc.';
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_check_lopmo_opening_required_from_lopmo()
    RETURNS TRIGGER AS $$
    BEGIN
      PERFORM fn_check_lopmo_opening_required(NEW.id);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_lopmo_opening_required ON "LOPMO"');
  await prisma.$executeRawUnsafe(`
    CREATE CONSTRAINT TRIGGER trg_check_lopmo_opening_required
    AFTER INSERT OR UPDATE OF "TrangThai", "MaGiangVien", "GiangVien"
    ON "LOPMO"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_lopmo_opening_required_from_lopmo();
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_lopmo_opening_required_lhl_ins ON "LICHHOCLOP"');
  await prisma.$executeRawUnsafe(`
    CREATE CONSTRAINT TRIGGER trg_check_lopmo_opening_required_lhl_ins
    AFTER INSERT
    ON "LICHHOCLOP"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_lopmo_opening_required_from_schedule();
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_lopmo_opening_required_lhl_upd ON "LICHHOCLOP"');
  await prisma.$executeRawUnsafe(`
    CREATE CONSTRAINT TRIGGER trg_check_lopmo_opening_required_lhl_upd
    AFTER UPDATE OF "LopMoId", "TrangThai", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "MaPhong", "PhongHoc"
    ON "LICHHOCLOP"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_lopmo_opening_required_from_schedule();
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_check_lopmo_opening_required_lhl_del ON "LICHHOCLOP"');
  await prisma.$executeRawUnsafe(`
    CREATE CONSTRAINT TRIGGER trg_check_lopmo_opening_required_lhl_del
    AFTER DELETE
    ON "LICHHOCLOP"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_lopmo_opening_required_from_schedule();
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LOPMO"
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LICHHOCLOP"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CHUONGTRINHHOC"
      ADD COLUMN IF NOT EXISTS "HocKyDuKien" INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CHUONGTRINHHOC"
      DROP COLUMN IF EXISTS "BatBuoc"
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "CHUONGTRINHHOC"
    SET "HocKyDuKien" = COALESCE("HocKyDuKien", "HocKy", 1)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "THAMSO"
      DROP COLUMN IF EXISTS "GPAQuaMon",
      DROP COLUMN IF EXISTS "GPADangKyVuot"
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "THAMSO"
      ADD COLUMN IF NOT EXISTS "GioiHanTinChiNoKhoaLuan" INTEGER DEFAULT 8
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "THAMSO"
    SET "GioiHanTinChiNoKhoaLuan" = COALESCE("GioiHanTinChiNoKhoaLuan", 8)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CHITIETDANGKY"
      ADD COLUMN IF NOT EXISTS "MaMonHoc" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "SoTinChi" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "LoaiMon" VARCHAR(5) DEFAULT 'LT'
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF to_regclass('"MONDAHOC"') IS NOT NULL THEN
        WITH history AS (
          SELECT
            "MaSv",
            "MaMonHoc",
            BOOL_OR("KetQua" = 'qua_mon') AS has_pass,
            BOOL_OR("KetQua" = 'rot') AS has_fail
          FROM "MONDAHOC"
          WHERE COALESCE("DaXoa", FALSE) = FALSE
          GROUP BY "MaSv", "MaMonHoc"
        ), candidates AS (
          SELECT
            c.id,
            p."MaHocKy",
            hk."LoaiHocKy",
            CASE
              WHEN h.has_pass THEN 'hoc_cai_thien'
              WHEN h.has_fail THEN 'hoc_lai'
              ELSE c."LoaiDangKy"
            END AS next_type
          FROM "CHITIETDANGKY" c
          JOIN "PHIEUDANGKY" p ON p."SoPhieu" = c."SoPhieu"
          JOIN "HOCKY" hk ON hk."MaHocKy" = p."MaHocKy"
          JOIN history h ON h."MaSv" = p."MaSv" AND h."MaMonHoc" = c."MaMonHoc"
          WHERE c."MaMonHoc" IS NOT NULL
            AND c."TrangThai" = 'Đã đăng ký'
            AND c."LoaiDangKy" = 'hoc_moi'
            AND (h.has_pass OR h.has_fail)
        )
        UPDATE "CHITIETDANGKY" c
        SET
          "LoaiDangKy" = candidates.next_type,
          "DonGia" = fn_lay_don_gia(
            c."LoaiMon",
            CASE WHEN candidates."LoaiHocKy" = U&'H\\00E8' AND candidates.next_type = 'hoc_moi' THEN 'hoc_he' ELSE candidates.next_type END,
            candidates."MaHocKy"
          ),
          "ThanhTien" = COALESCE(c."SoTinChi", 0) * fn_lay_don_gia(
            c."LoaiMon",
            CASE WHEN candidates."LoaiHocKy" = U&'H\\00E8' AND candidates.next_type = 'hoc_moi' THEN 'hoc_he' ELSE candidates.next_type END,
            candidates."MaHocKy"
          )
        FROM candidates
        WHERE c.id = candidates.id
          AND candidates.next_type <> c."LoaiDangKy";
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "CHITIETDANGKY" ctdk
    SET
      "SoTinChi" = COALESCE(ctdk."SoTinChi", mh."SoTinChi", 0),
      "LoaiMon" = COALESCE(ctdk."LoaiMon", mh."LoaiMon", 'LT')
    FROM "LOP" l
    JOIN "MONHOC" mh ON mh."MaMonHoc" = l."MaMonHoc"
    WHERE l."MaLop" = ctdk."MaLop"
  `);

  await prisma.$executeRawUnsafe(`
    WITH history AS (
      SELECT
        "MaSv",
        "MaMonHoc",
        BOOL_OR("KetQua" = 'qua_mon') AS has_pass,
        BOOL_OR("KetQua" = 'rot') AS has_fail
      FROM "MONDAHOC"
      WHERE COALESCE("DaXoa", FALSE) = FALSE
      GROUP BY "MaSv", "MaMonHoc"
    ), candidates AS (
      SELECT
        c.id,
        l."MaMonHoc",
        CASE
          WHEN c."LoaiDangKy" = 'hoc_moi' AND h.has_pass THEN 'hoc_cai_thien'
          WHEN c."LoaiDangKy" = 'hoc_moi' AND h.has_fail THEN 'hoc_lai'
          ELSE c."LoaiDangKy"
        END AS next_type
      FROM "CHITIETDANGKY" c
      JOIN "LOP" l ON l."MaLop" = c."MaLop"
      JOIN "PHIEUDANGKY" p ON p."SoPhieu" = c."SoPhieu"
      LEFT JOIN history h ON h."MaSv" = p."MaSv" AND h."MaMonHoc" = l."MaMonHoc"
      WHERE c."MaMonHoc" IS NULL
    )
    UPDATE "CHITIETDANGKY" ctdk
    SET
      "MaMonHoc" = candidates."MaMonHoc",
      "LoaiDangKy" = candidates.next_type
    FROM candidates
    WHERE ctdk.id = candidates.id
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM "CHITIETDANGKY" WHERE "MaMonHoc" IS NULL
      ) THEN
        ALTER TABLE "CHITIETDANGKY"
          ALTER COLUMN "MaMonHoc" SET NOT NULL;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_ctdk'
          AND conrelid = '"CHITIETDANGKY"'::regclass
      ) THEN
        ALTER TABLE "CHITIETDANGKY" DROP CONSTRAINT uq_ctdk;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_ctdk'
          AND conrelid = '"CHITIETDANGKY"'::regclass
      ) THEN
        ALTER TABLE "CHITIETDANGKY"
          ADD CONSTRAINT uq_ctdk UNIQUE ("SoPhieu", "MaMonHoc");
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_ctdk_monhoc'
          AND conrelid = '"CHITIETDANGKY"'::regclass
      ) THEN
        ALTER TABLE "CHITIETDANGKY"
          ADD CONSTRAINT fk_ctdk_monhoc FOREIGN KEY ("MaMonHoc")
          REFERENCES "MONHOC"("MaMonHoc") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MONDAHOC" (
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
    )
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_mdh_sv_mon ON "MONDAHOC"("MaSv", "MaMonHoc")');

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF to_regclass('"DIEMSINHVIEN"') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rbtv22_mondahoc_insert' AND tgrelid = '"MONDAHOC"'::regclass) THEN
          ALTER TABLE "MONDAHOC" DISABLE TRIGGER trg_rbtv22_mondahoc_insert;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rbtv22_mondahoc_update' AND tgrelid = '"MONDAHOC"'::regclass) THEN
          ALTER TABLE "MONDAHOC" DISABLE TRIGGER trg_rbtv22_mondahoc_update;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rbtv22_mondahoc_delete' AND tgrelid = '"MONDAHOC"'::regclass) THEN
          ALTER TABLE "MONDAHOC" DISABLE TRIGGER trg_rbtv22_mondahoc_delete;
        END IF;

        INSERT INTO "MONDAHOC" ("MaSv", "MaMonHoc", "MaHocKy", "MaLop", "LanHoc", "KetQua", "GhiChu", "NguoiCapNhat", "NgayTao", "NgayCapNhat")
        SELECT
          d."MaSv",
          d."MaMonHoc",
          d."MaHocKy",
          d."MaLop",
          COALESCE(d."LanHoc", 1),
          CASE
            WHEN d."KetQua" IN ('Đậu', 'Đạt') THEN 'qua_mon'
            WHEN d."KetQua" IN ('Rớt', 'Không đạt', 'Vắng thi', 'Cấm thi') THEN 'rot'
            WHEN d."DiemTrungBinh" IS NOT NULL AND d."DiemTrungBinh" >= 5 THEN 'qua_mon'
            ELSE 'rot'
          END,
          d."GhiChu",
          d."NguoiNhapDiem",
          COALESCE(d."NgayTao", d."NgayNhapDiem", CURRENT_TIMESTAMP),
          d."NgayCapNhat"
        FROM "DIEMSINHVIEN" d
        ON CONFLICT ("MaSv", "MaMonHoc", "MaHocKy", "LanHoc") DO NOTHING;

        WITH history AS (
          SELECT
            "MaSv",
            "MaMonHoc",
            BOOL_OR("KetQua" = 'qua_mon') AS has_pass,
            BOOL_OR("KetQua" = 'rot') AS has_fail
          FROM "MONDAHOC"
          WHERE COALESCE("DaXoa", FALSE) = FALSE
          GROUP BY "MaSv", "MaMonHoc"
        ), candidates AS (
          SELECT
            c.id,
            p."MaHocKy",
            hk."LoaiHocKy",
            CASE
              WHEN h.has_pass THEN 'hoc_cai_thien'
              WHEN h.has_fail THEN 'hoc_lai'
              ELSE c."LoaiDangKy"
            END AS next_type
          FROM "CHITIETDANGKY" c
          JOIN "PHIEUDANGKY" p ON p."SoPhieu" = c."SoPhieu"
          JOIN "LOP" l ON l."MaLop" = c."MaLop"
          JOIN "HOCKY" hk ON hk."MaHocKy" = p."MaHocKy"
          JOIN history h ON h."MaSv" = p."MaSv" AND h."MaMonHoc" = COALESCE(c."MaMonHoc", l."MaMonHoc")
          WHERE c."TrangThai" = 'Đã đăng ký'
            AND c."LoaiDangKy" = 'hoc_moi'
            AND (h.has_pass OR h.has_fail)
        )
        UPDATE "CHITIETDANGKY" c
        SET
          "LoaiDangKy" = candidates.next_type,
          "DonGia" = fn_lay_don_gia(
            c."LoaiMon",
            CASE WHEN candidates."LoaiHocKy" = U&'H\\00E8' AND candidates.next_type = 'hoc_moi' THEN 'hoc_he' ELSE candidates.next_type END,
            candidates."MaHocKy"
          ),
          "ThanhTien" = COALESCE(c."SoTinChi", 0) * fn_lay_don_gia(
            c."LoaiMon",
            CASE WHEN candidates."LoaiHocKy" = U&'H\\00E8' AND candidates.next_type = 'hoc_moi' THEN 'hoc_he' ELSE candidates.next_type END,
            candidates."MaHocKy"
          )
        FROM candidates
        WHERE c.id = candidates.id
          AND candidates.next_type <> c."LoaiDangKy";

        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rbtv22_mondahoc_insert' AND tgrelid = '"MONDAHOC"'::regclass) THEN
          ALTER TABLE "MONDAHOC" ENABLE TRIGGER trg_rbtv22_mondahoc_insert;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rbtv22_mondahoc_update' AND tgrelid = '"MONDAHOC"'::regclass) THEN
          ALTER TABLE "MONDAHOC" ENABLE TRIGGER trg_rbtv22_mondahoc_update;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rbtv22_mondahoc_delete' AND tgrelid = '"MONDAHOC"'::regclass) THEN
          ALTER TABLE "MONDAHOC" ENABLE TRIGGER trg_rbtv22_mondahoc_delete;
        END IF;

        DROP TABLE "DIEMSINHVIEN" CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PHIEUDANGKY"
      ADD COLUMN IF NOT EXISTS "SoMonHocMoi" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "SoTinChiHocMoi" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "TienHocMoi" NUMERIC(15,0) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "SoMonHocLai" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "SoTinChiHocLai" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "TienHocLai" NUMERIC(15,0) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "SoMonHocCaiThien" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "SoTinChiHocCaiThien" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "TienHocCaiThien" NUMERIC(15,0) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "TiLeGiam" NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "TongTienPhaiDong" NUMERIC(15,0) DEFAULT 0
  `);

  await prisma.$executeRawUnsafe(`
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
    WHERE p."SoPhieu" = totals."SoPhieu"
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PHIEUTHUHOCPHI"
      ADD COLUMN IF NOT EXISTS "NguoiThu" VARCHAR(100)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DOITUONG"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DIEUKIENMONHOC"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DANTOC"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "TINH"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PHUONGXA"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "PHUONGXA"
    SET "Loai" = 'Xã'
    WHERE "Loai" = 'Thị trấn'
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PHUONGXA"
      DROP CONSTRAINT IF EXISTS chk_loai_phuong_xa,
      ADD CONSTRAINT chk_loai_phuong_xa CHECK ("Loai" IN ('Phường', 'Xã'))
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "TIETHOC"
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "THONGBAO"
      ADD COLUMN IF NOT EXISTS "Loai" VARCHAR(20) DEFAULT 'chung',
      ADD COLUMN IF NOT EXISTS "LoaiThongBao" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "DOITUONG" VARCHAR(30) DEFAULT 'Tất cả',
      ADD COLUMN IF NOT EXISTS "GhimTop" BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "NgayHetHan" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NguoiTao" INTEGER,
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "THONGBAO"
      ALTER COLUMN "MaTaiKhoanNhan" DROP NOT NULL
  `);

  for (const tableName of AUDITED_SOFT_DELETE_TABLES) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${tableName}"
        ADD COLUMN IF NOT EXISTS "NguoiCapNhat" INTEGER,
        ADD COLUMN IF NOT EXISTS "NgayCapNhat" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "DaXoa" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "NguoiXoa" INTEGER,
        ADD COLUMN IF NOT EXISTS "NgayXoa" TIMESTAMP
    `);
    await prisma.$executeRawUnsafe(`UPDATE "${tableName}" SET "DaXoa" = FALSE WHERE "DaXoa" IS NULL`);
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "SINHVIEN"
    SET
      "Cccd" = COALESCE(NULLIF("Cccd", ''), 'CCCD-' || "MaSv"),
      "MaDanToc" = COALESCE("MaDanToc", (SELECT "MaDanToc" FROM "DANTOC" ORDER BY "MaDanToc" LIMIT 1)),
      "DiaChiLienHe" = COALESCE(NULLIF("DiaChiLienHe", ''), 'Chua cap nhat')
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM "SINHVIEN" WHERE "Cccd" IS NULL OR "MaDanToc" IS NULL OR "DiaChiLienHe" IS NULL) THEN
        ALTER TABLE "SINHVIEN"
          ALTER COLUMN "Cccd" SET NOT NULL,
          ALTER COLUMN "MaDanToc" SET NOT NULL,
          ALTER COLUMN "DiaChiLienHe" SET NOT NULL;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "THAMSO"
      ADD COLUMN IF NOT EXISTS "DanhSachMonAnhVanBatBuoc" VARCHAR(200) DEFAULT 'ENG01,ENG02,ENG03',
      ADD COLUMN IF NOT EXISTS "NamKiemTraAnhVan" INTEGER DEFAULT 2,
      ADD COLUMN IF NOT EXISTS "GioiHanTinChiChuaDatAnhVan" INTEGER DEFAULT 14,
      ADD COLUMN IF NOT EXISTS "GioiHanTinChiNoKhoaLuan" INTEGER DEFAULT 8
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_loai_hoc') THEN
        ALTER TABLE "DONGIATINCHI" DROP CONSTRAINT chk_loai_hoc;
      END IF;
      ALTER TABLE "DONGIATINCHI"
        ADD CONSTRAINT chk_loai_hoc CHECK ("LoaiHoc" IN ('hoc_moi', 'hoc_lai', 'hoc_cai_thien', 'hoc_he'));
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "THAMSO"
    SET
      "DanhSachMonAnhVanBatBuoc" = COALESCE(NULLIF("DanhSachMonAnhVanBatBuoc", ''), 'ENG01,ENG02,ENG03'),
      "NamKiemTraAnhVan" = COALESCE("NamKiemTraAnhVan", 2),
      "GioiHanTinChiChuaDatAnhVan" = COALESCE("GioiHanTinChiChuaDatAnhVan", 14),
      "GioiHanTinChiNoKhoaLuan" = COALESCE("GioiHanTinChiNoKhoaLuan", 8)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PHIEUTHUHOCPHI"
      ADD COLUMN IF NOT EXISTS "PaymentProvider" VARCHAR(30),
      ADD COLUMN IF NOT EXISTS "PaymentChannel" VARCHAR(30),
      ADD COLUMN IF NOT EXISTS "CheckoutUrl" VARCHAR(1000),
      ADD COLUMN IF NOT EXISTS "QrPayload" TEXT,
      ADD COLUMN IF NOT EXISTS "NgayXacNhan" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayCapNhat" TIMESTAMP,
      ALTER COLUMN "TrangThai" SET DEFAULT 'Chưa thanh toán'
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_hinh_thuc_thu') THEN
        ALTER TABLE "PHIEUTHUHOCPHI" DROP CONSTRAINT chk_hinh_thuc_thu;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_trang_thai_pthp') THEN
        ALTER TABLE "PHIEUTHUHOCPHI" DROP CONSTRAINT chk_trang_thai_pthp;
      END IF;
      ALTER TABLE "PHIEUTHUHOCPHI"
        ADD CONSTRAINT chk_hinh_thuc_thu CHECK ("HinhThucThu" IN ('Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử')),
        ADD CONSTRAINT chk_trang_thai_pthp CHECK ("TrangThai" IN ('Chưa thanh toán', 'Chờ xác nhận', 'Thành công', 'Thất bại', 'Đã hủy', 'Hoàn tiền'));
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
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
      JOIN "LOPMO" lm_new
        ON lm_new."MaHocKy" = p_new."MaHocKy"
       AND lm_new."MaLop" = NEW."MaLop"
       AND COALESCE(lm_new."TrangThai", TRUE) = TRUE
      JOIN "LICHHOCLOP" lh_new
        ON lh_new."LopMoId" = lm_new.id
       AND COALESCE(lh_new."TrangThai", TRUE) = TRUE
      JOIN "TIETHOC" tbn ON tbn."MaTiet" = lh_new."MaTietBatDau"
      JOIN "TIETHOC" ten ON ten."MaTiet" = lh_new."MaTietKetThuc"
      JOIN "PHIEUDANGKY" p_old
        ON p_old."MaSv" = p_new."MaSv"
       AND p_old."MaHocKy" = p_new."MaHocKy"
      JOIN "CHITIETDANGKY" c_old
        ON c_old."SoPhieu" = p_old."SoPhieu"
       AND c_old.id <> NEW.id
       AND COALESCE(c_old."TrangThai", '') = 'Đã đăng ký'
      JOIN "LOPMO" lm_old
        ON lm_old."MaHocKy" = p_old."MaHocKy"
       AND lm_old."MaLop" = c_old."MaLop"
       AND COALESCE(lm_old."TrangThai", TRUE) = TRUE
      JOIN "LICHHOCLOP" lh_old
        ON lh_old."LopMoId" = lm_old.id
       AND COALESCE(lh_old."TrangThai", TRUE) = TRUE
      JOIN "TIETHOC" tbo ON tbo."MaTiet" = lh_old."MaTietBatDau"
      JOIN "TIETHOC" teo ON teo."MaTiet" = lh_old."MaTietKetThuc"
      WHERE p_new."SoPhieu" = NEW."SoPhieu"
        AND lh_new."ThuTrongTuan" = lh_old."ThuTrongTuan"
        AND tbn."ThuTu" < CASE WHEN teo."ThuTu" > tbo."ThuTu" THEN teo."ThuTu" ELSE tbo."ThuTu" + 1 END
        AND tbo."ThuTu" < CASE WHEN ten."ThuTu" > tbn."ThuTu" THEN ten."ThuTu" ELSE tbn."ThuTu" + 1 END;

      IF conflict_count > 0 THEN
        RAISE EXCEPTION 'Sinh vien bi trung lich hoc trong hoc ky nay';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_prevent_student_schedule_conflict ON "CHITIETDANGKY"');

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_student_schedule_conflict
    BEFORE INSERT OR UPDATE OF "SoPhieu", "MaLop", "TrangThai"
    ON "CHITIETDANGKY"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_student_schedule_conflict();
  `);

  await prisma.$executeRawUnsafe(`
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

      SELECT "NgayBatDauDangKy", "NgayKetThucDangKy", "TrangThai"
      INTO v_ngaybatdau, v_ngayketthuc, v_trangthai
      FROM "HOCKY"
      WHERE "MaHocKy" = NEW."MaHocKy";

      v_deadline := CASE
        WHEN v_ngayketthuc IS NOT NULL AND v_ngayketthuc::time = TIME '00:00:00'
          THEN v_ngayketthuc + INTERVAL '1 day' - INTERVAL '1 millisecond'
        ELSE v_ngayketthuc
      END;

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
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_rbtv17_phieudangky_ins ON "PHIEUDANGKY"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_rbtv17_phieudangky_ins
    BEFORE INSERT ON "PHIEUDANGKY"
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_rbtv17_phieudangky();
  `);

  await prisma.$executeRawUnsafe(`
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

      IF NEW."TrangThai" = 'Đã đăng ký' THEN
        IF v_ngaybatdau IS NULL
           OR v_deadline IS NULL
           OR CURRENT_TIMESTAMP < v_ngaybatdau
           OR CURRENT_TIMESTAMP > v_deadline
           OR v_trangthai = 'Đã kết thúc' THEN
          RAISE EXCEPTION 'RBTV17: Không thể đăng ký học phần ngoài khung thời gian quy định hoặc khi học kỳ đã kết thúc.';
        END IF;
      ELSIF NEW."TrangThai" = 'Đã hủy' THEN
        IF v_deadline IS NULL OR (CURRENT_TIMESTAMP > v_deadline AND NOT v_is_finalize_cancel) THEN
          RAISE EXCEPTION 'RBTV17: Không thể hủy học phần vì đã quá hạn kết thúc đăng ký của học kỳ.';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_rbtv17_chitietdangky_ins_upd ON "CHITIETDANGKY"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_rbtv17_chitietdangky_ins_upd
    BEFORE INSERT OR UPDATE OF "TrangThai"
    ON "CHITIETDANGKY"
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_rbtv17_chitietdangky();
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_chk_rbtv34_hocky_parent()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW."DaXoa" = TRUE AND COALESCE(OLD."DaXoa", FALSE) = FALSE THEN
        IF EXISTS (
          SELECT 1 FROM "PHIEUDANGKY"
          WHERE "MaHocKy" = NEW."MaHocKy" AND "TrangThai" = 'Đã đăng ký'
        ) THEN
          RAISE EXCEPTION 'RBTV34 Lỗi: PHIEUDANGKY con hoat dong.';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "LOPMO"
          WHERE "MaHocKy" = NEW."MaHocKy" AND "TrangThai" = TRUE
        ) THEN
          RAISE EXCEPTION 'RBTV34 Lỗi: LOPMO con hoat dong.';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "MONDAHOC"
          WHERE "MaHocKy" = NEW."MaHocKy" AND "DaXoa" = FALSE
        ) THEN
          RAISE EXCEPTION 'RBTV34 Lỗi: MONDAHOC con hoat dong.';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "DONGIATINCHI"
          WHERE "MaHocKy" = NEW."MaHocKy"
            AND "DaXoa" = FALSE
            AND "TrangThai" = TRUE
        ) THEN
          RAISE EXCEPTION 'RBTV34 Lỗi: DONGIATINCHI con hoat dong.';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_chk_one_ongoing_hocky()
    RETURNS TRIGGER AS $$
    BEGIN
      IF COALESCE(NEW."DaXoa", FALSE) = FALSE AND NEW."TrangThai" = 'Đang diễn ra' THEN
        IF EXISTS (
          SELECT 1
          FROM "HOCKY"
          WHERE "MaHocKy" IS DISTINCT FROM NEW."MaHocKy"
            AND COALESCE("DaXoa", FALSE) = FALSE
            AND "TrangThai" = 'Đang diễn ra'
        ) THEN
          RAISE EXCEPTION 'RBTV_HOCKY_01: Chỉ được có một học kỳ đang diễn ra.';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_chk_one_ongoing_hocky ON "HOCKY"');

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_chk_one_ongoing_hocky
    BEFORE INSERT OR UPDATE OF "TrangThai", "DaXoa"
    ON "HOCKY"
    FOR EACH ROW
    EXECUTE FUNCTION fn_chk_one_ongoing_hocky();
  `);

  for (const group of DEFAULT_USER_GROUPS) {
    await prisma.NHOMNGUOIDUNG.upsert({
      where: { MaNhom: group.MaNhom },
      create: group,
      update: { TenNhom: group.TenNhom }
    });
  }

  for (const permission of PERMISSION_CATALOG) {
    await prisma.CHUCNANG.upsert({
      where: { MaChucNang: permission.code },
      create: {
        MaChucNang: permission.code,
        TenChucNang: permission.name,
        TenManHinhDuocLoad: permission.screen,
        DaXoa: false
      },
      update: {
        TenChucNang: permission.name,
        TenManHinhDuocLoad: permission.screen,
        DaXoa: false,
        NguoiXoa: null,
        NgayXoa: null
      }
    });
  }

  await prisma.PHANQUYEN.deleteMany({
    where: { MaChucNang: { in: LEGACY_PERMISSION_CODES } }
  });

  await prisma.CHUCNANG.updateMany({
    where: { MaChucNang: { in: LEGACY_PERMISSION_CODES } },
    data: { DaXoa: true, NgayXoa: new Date() }
  });

  for (const [MaNhom, permissionCodes] of Object.entries(DEFAULT_GROUP_PERMISSIONS)) {
    if (!permissionCodes.length) continue;
    await prisma.PHANQUYEN.createMany({
      data: permissionCodes.map(MaChucNang => ({ MaNhom, MaChucNang })),
      skipDuplicates: true
    });
  }
};

// Test connection on startup and bring older local databases up to the current auth schema.
prisma.ready = prisma.$connect()
  .then(async () => {
    console.log('Connected to PostgreSQL database via Prisma');
    await ensureDefaultAuthorizationData()
      .then(() => console.log('Authorization defaults are ready'))
      .catch(err => {
        const response = buildErrorResponse(err, 'Authorization defaults sync warning');
        console.error('Authorization defaults sync warning:', response.message);
      });
    await ensureAuthSchema();
    console.log('Auth schema is ready');
  })
  .catch(err => {
    const response = buildErrorResponse(err, 'Database connection error');
    console.error('Database connection error:', response.message);
  });

module.exports = prisma;
