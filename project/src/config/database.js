const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({});

const DEFAULT_USER_GROUPS = [
  { MaNhom: 'ADMIN', TenNhom: 'Admin hệ thống' },
  { MaNhom: 'ADMIN_DAOTAO', TenNhom: 'Quản trị viên đào tạo' },
  { MaNhom: 'ADMIN_TAICHINH', TenNhom: 'Quản trị viên tài chính' },
  { MaNhom: 'SINHVIEN', TenNhom: 'Sinh viên' }
];

const ensureAuthSchema = async () => {
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
    CREATE TABLE IF NOT EXISTS "DATLAIMATKHAU" (
      "MaToken" SERIAL NOT NULL,
      "MaTaiKhoan" INTEGER NOT NULL,
      "TokenHash" VARCHAR(255) NOT NULL,
      "HetHanLuc" TIMESTAMP NOT NULL,
      "DaSuDung" BOOLEAN DEFAULT FALSE,
      "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "NgaySuDung" TIMESTAMP,
      CONSTRAINT dat_lai_mat_khau_pkey PRIMARY KEY ("MaToken"),
      CONSTRAINT dat_lai_mat_khau_token_hash_key UNIQUE ("TokenHash"),
      CONSTRAINT fk_dlmk_tk FOREIGN KEY ("MaTaiKhoan")
        REFERENCES "NGUOIDUNG"("MaTaiKhoan") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_dlmk_taikhoan ON "DATLAIMATKHAU"("MaTaiKhoan")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_dlmk_hethan ON "DATLAIMATKHAU"("HetHanLuc")');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NGUOIDUNG"
      ADD COLUMN IF NOT EXISTS "LanDangNhapCuoi" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "RefreshToken" VARCHAR(500)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SINHVIEN"
      ADD COLUMN IF NOT EXISTS "HoTenCha" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "SdtCha" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "HoTenMe" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "SdtMe" VARCHAR(15)
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
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "HOCKY"
      ADD COLUMN IF NOT EXISTS "ThuTu" INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "LOP"
      ADD COLUMN IF NOT EXISTS "GiangVien" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      ADD COLUMN IF NOT EXISTS "BatBuoc" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    ALTER TABLE "CHITIETDANGKY"
      ADD COLUMN IF NOT EXISTS "MaMonHoc" VARCHAR(15),
      ADD COLUMN IF NOT EXISTS "SoTinChi" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "LoaiMon" VARCHAR(5) DEFAULT 'LT'
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
    UPDATE "CHITIETDANGKY" ctdk
    SET "MaMonHoc" = l."MaMonHoc"
    FROM "LOP" l
    WHERE l."MaLop" = ctdk."MaLop"
      AND ctdk."MaMonHoc" IS NULL
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

  for (const group of DEFAULT_USER_GROUPS) {
    await prisma.NHOMNGUOIDUNG.upsert({
      where: { MaNhom: group.MaNhom },
      create: group,
      update: { TenNhom: group.TenNhom }
    });
  }
};

// Test connection on startup and bring older local databases up to the current auth schema.
prisma.ready = prisma.$connect()
  .then(async () => {
    console.log('Connected to PostgreSQL database via Prisma');
    await ensureAuthSchema();
    console.log('Auth schema is ready');
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
  });

module.exports = prisma;
