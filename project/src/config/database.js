const { PrismaClient } = require('@prisma/client');
const { buildErrorResponse } = require('../utils/errorHandler');

const prisma = new PrismaClient({});

const DEFAULT_USER_GROUPS = [
  { MaNhom: 'ADMIN', TenNhom: 'Admin hệ thống' },
  { MaNhom: 'ADMIN_DAOTAO', TenNhom: 'Quản trị viên đào tạo' },
  { MaNhom: 'ADMIN_TAICHINH', TenNhom: 'Quản trị viên tài chính' },
  { MaNhom: 'SINHVIEN', TenNhom: 'Sinh viên' }
];

const AUDITED_SOFT_DELETE_TABLES = [
  'SINHVIEN',
  'MONHOC',
  'LOP',
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
  'TIETHOC'
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
    ALTER TABLE "NGUOIDUNG"
      ADD COLUMN IF NOT EXISTS "LanDangNhapCuoi" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "RefreshToken" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "AnhDaiDien" VARCHAR(500),
      ALTER COLUMN "AnhDaiDien" TYPE VARCHAR(500)
  `);

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
      ADD COLUMN IF NOT EXISTS "NgayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "HOCKY"
      ADD COLUMN IF NOT EXISTS "ThuTu" INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "NgayBatDauDangKy" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayKetThucDangKy" TIMESTAMP,
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
      ADD COLUMN IF NOT EXISTS "GioiHanTinChiChuaDatAnhVan" INTEGER DEFAULT 14
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
      "GioiHanTinChiChuaDatAnhVan" = COALESCE("GioiHanTinChiChuaDatAnhVan", 14)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PHIEUTHUHOCPHI"
      ADD COLUMN IF NOT EXISTS "PaymentProvider" VARCHAR(30),
      ADD COLUMN IF NOT EXISTS "PaymentChannel" VARCHAR(30),
      ADD COLUMN IF NOT EXISTS "CheckoutUrl" VARCHAR(1000),
      ADD COLUMN IF NOT EXISTS "QrPayload" TEXT,
      ADD COLUMN IF NOT EXISTS "NgayXacNhan" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "NgayCapNhat" TIMESTAMP
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
        ADD CONSTRAINT chk_trang_thai_pthp CHECK ("TrangThai" IN ('Chờ xác nhận', 'Thành công', 'Thất bại', 'Đã hủy'));
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
        AND tbn."ThuTu" <= teo."ThuTu"
        AND tbo."ThuTu" <= ten."ThuTu";

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
};

// Test connection on startup and bring older local databases up to the current auth schema.
prisma.ready = prisma.$connect()
  .then(async () => {
    console.log('Connected to PostgreSQL database via Prisma');
    await ensureAuthSchema();
    console.log('Auth schema is ready');
  })
  .catch(err => {
    const response = buildErrorResponse(err, 'Database connection error');
    console.error('Database connection error:', response.message);
  });

module.exports = prisma;
