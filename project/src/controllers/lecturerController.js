const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { resolveSemesterId } = require('./roomController');
const { getSearchRegexSource } = require('../utils/searchRegex');

const ACADEMIC_RANKS = new Set(['', 'GS', 'PGS']);
const ACADEMIC_DEGREES = new Set(['', 'CN', 'KS', 'ThS', 'TS']);

const cleanText = (value) => {
  if (value === undefined) return undefined;
  const text = String(value || '').trim();
  return text || null;
};

const normalizeChoice = (value) => cleanText(value) || '';

const validateAcademicChoice = (field, value, allowed) => {
  const normalized = normalizeChoice(value);
  if (!allowed.has(normalized)) {
    const error = new Error(field + ' khong hop le');
    error.status = 400;
    throw error;
  }
  return normalized || null;
};

const buildAcademicTitle = (HocHam, HocVi) => [HocHam, HocVi].filter(Boolean).join('.') || null;

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const semesterLabel = (row = {}) => [row.TenHocKy, row.TenNamHoc].filter(Boolean).join(' - ') || row.MaHocKy || '';

const lecturerDisplayName = (row = {}) => [row.HocHamHocVi || buildAcademicTitle(row.HocHam, row.HocVi), row.HoTen].filter(Boolean).join(' ').trim();

const ensureFacultyExists = async (MaKhoa) => {
  if (!MaKhoa) return true;
  const faculty = await prisma.KHOA.findFirst({ where: { MaKhoa, DaXoa: false } });
  return Boolean(faculty);
};

const buildLecturerSearchCondition = (search, searchField) => {
  const keyword = cleanText(search);
  if (!keyword) return null;
  const pattern = getSearchRegexSource(keyword);
  const field = ['MaGiangVien', 'HoTen', 'Khoa', 'Email', 'MaHocKy'].includes(searchField) ? searchField : 'all';

  if (field === 'MaGiangVien') return Prisma.sql`gv."MaGiangVien" ~* ${pattern}`;
  if (field === 'HoTen') return Prisma.sql`gv."HoTen" ~* ${pattern}`;
  if (field === 'Khoa') return Prisma.sql`(COALESCE(gv."MaKhoa", '') ~* ${pattern} OR COALESCE(k."TenKhoa", '') ~* ${pattern})`;
  if (field === 'Email') return Prisma.sql`gv."Email" ~* ${pattern}`;
  if (field === 'MaHocKy') return Prisma.sql`(gvh."MaHocKy" ~* ${pattern} OR hk."TenHocKy" ~* ${pattern} OR COALESCE(nh."TenNamHoc", '') ~* ${pattern})`;

  return Prisma.sql`(
    gv."MaGiangVien" ~* ${pattern}
    OR gv."HoTen" ~* ${pattern}
    OR COALESCE(gv."Email", '') ~* ${pattern}
    OR COALESCE(gv."HocHam", '') ~* ${pattern}
    OR COALESCE(gv."HocVi", '') ~* ${pattern}
    OR COALESCE(gv."HocHamHocVi", '') ~* ${pattern}
    OR COALESCE(gv."MaKhoa", '') ~* ${pattern}
    OR COALESCE(k."TenKhoa", '') ~* ${pattern}
    OR gvh."MaHocKy" ~* ${pattern}
    OR hk."TenHocKy" ~* ${pattern}
    OR COALESCE(nh."TenNamHoc", '') ~* ${pattern}
  )`;
};

const buildLecturerConditions = ({ MaHocKy, search, searchField, MaKhoa, TrangThai }) => {
  const conditions = [
    Prisma.sql`COALESCE(gv."DaXoa", FALSE) = FALSE`,
    Prisma.sql`COALESCE(gvh."DaXoa", FALSE) = FALSE`,
    Prisma.sql`COALESCE(gvh."TrangThai", TRUE) = TRUE`,
    Prisma.sql`gvh."MaHocKy" = ${MaHocKy}`
  ];
  const searchCondition = buildLecturerSearchCondition(search, searchField);
  if (searchCondition) conditions.push(searchCondition);
  if (MaKhoa) conditions.push(Prisma.sql`gv."MaKhoa" = ${MaKhoa}`);
  if (TrangThai !== undefined && TrangThai !== '') conditions.push(Prisma.sql`COALESCE(gv."TrangThai", TRUE) = ${String(TrangThai) === 'true'}`);
  return conditions;
};

const lecturerUsageCte = (MaHocKy) => Prisma.sql`
  WITH usage AS (
    SELECT lm."MaGiangVien", lm."MaHocKy", COUNT(DISTINCT lm.id)::int AS "ClassCount"
    FROM "LOPMO" lm
    JOIN "LOP" l ON l."MaLop" = lm."MaLop"
    WHERE lm."MaHocKy" = ${MaHocKy}
      AND COALESCE(lm."TrangThai", TRUE) = TRUE
      AND COALESCE(l."DaXoa", FALSE) = FALSE
      AND NULLIF(TRIM(lm."MaGiangVien"), '') IS NOT NULL
    GROUP BY lm."MaGiangVien", lm."MaHocKy"
  )`;

const getLecturerRows = async ({ MaHocKy, search, searchField, MaKhoa, TrangThai, skip, take, returnAll }) => {
  const conditions = buildLecturerConditions({ MaHocKy, search, searchField, MaKhoa, TrangThai });
  const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  const paginationSql = returnAll ? Prisma.empty : Prisma.sql`LIMIT ${take} OFFSET ${skip}`;

  const rows = await prisma.$queryRaw`
    ${lecturerUsageCte(MaHocKy)}
    SELECT
      gv.*,
      gvh.id AS "PhanBoId",
      gvh."MaHocKy",
      hk."TenHocKy",
      nh."TenNamHoc",
      k."TenKhoa",
      COALESCE(u."ClassCount", 0)::int AS "ClassCount"
    FROM "GIANGVIENHOCKY" gvh
    JOIN "GIANGVIEN" gv ON gv."MaGiangVien" = gvh."MaGiangVien"
    JOIN "HOCKY" hk ON hk."MaHocKy" = gvh."MaHocKy"
    LEFT JOIN "NAMHOC" nh ON nh."MaNamHoc" = hk."MaNamHoc"
    LEFT JOIN "KHOA" k ON k."MaKhoa" = gv."MaKhoa"
    LEFT JOIN usage u ON u."MaGiangVien" = gv."MaGiangVien" AND u."MaHocKy" = gvh."MaHocKy"
    ${whereSql}
    ORDER BY gv."MaGiangVien" ASC
    ${paginationSql}
  `;

  const [{ total }] = await prisma.$queryRaw`
    ${lecturerUsageCte(MaHocKy)}
    SELECT COUNT(*)::int AS total
    FROM "GIANGVIENHOCKY" gvh
    JOIN "GIANGVIEN" gv ON gv."MaGiangVien" = gvh."MaGiangVien"
    JOIN "HOCKY" hk ON hk."MaHocKy" = gvh."MaHocKy"
    LEFT JOIN "NAMHOC" nh ON nh."MaNamHoc" = hk."MaNamHoc"
    LEFT JOIN "KHOA" k ON k."MaKhoa" = gv."MaKhoa"
    LEFT JOIN usage u ON u."MaGiangVien" = gv."MaGiangVien" AND u."MaHocKy" = gvh."MaHocKy"
    ${whereSql}
  `;

  return {
    rows: rows.map((row) => ({
      ...row,
      HocKyLabel: semesterLabel(row),
      GiangVienDisplay: lecturerDisplayName(row),
      KHOA: row.MaKhoa ? { MaKhoa: row.MaKhoa, TenKhoa: row.TenKhoa } : null,
      _count: { LOPMO: Number(row.ClassCount || 0) }
    })),
    total: Number(total || 0)
  };
};

const upsertLecturerSemester = async (client, MaGiangVien, MaHocKy, req) => {
  if (!MaGiangVien || !MaHocKy) return;
  const audit = updateAudit(req);
  await client.$executeRaw`
    INSERT INTO "GIANGVIENHOCKY" ("MaGiangVien", "MaHocKy", "TrangThai", "GhiChu", "NguoiCapNhat", "NgayCapNhat")
    VALUES (${MaGiangVien}, ${MaHocKy}, TRUE, 'Phan bo tu trang quan ly giang vien', ${audit.NguoiCapNhat}, ${audit.NgayCapNhat})
    ON CONFLICT ("MaGiangVien", "MaHocKy") DO UPDATE SET
      "TrangThai" = TRUE,
      "DaXoa" = FALSE,
      "NguoiXoa" = NULL,
      "NgayXoa" = NULL,
      "NguoiCapNhat" = EXCLUDED."NguoiCapNhat",
      "NgayCapNhat" = EXCLUDED."NgayCapNhat"
  `;
};

const getAllLecturers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, searchField, MaKhoa, TrangThai, all } = req.query;
    const MaHocKy = await resolveSemesterId(req.query.MaHocKy);
    if (!MaHocKy) return res.json({ success: true, data: [], pagination: getPaginationMeta(0, 1, limit), selectedSemester: '' });

    const returnAll = all === 'true';
    const { rows, total } = await getLecturerRows({ MaHocKy, search, searchField, MaKhoa, TrangThai, skip, take: limit, returnAll });

    res.json({
      success: true,
      data: rows,
      pagination: getPaginationMeta(total, returnAll ? 1 : page, returnAll ? Math.max(total, 1) : limit),
      selectedSemester: MaHocKy
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'getAllLecturers error:');
  }
};

const createLecturer = async (req, res) => {
  try {
    const MaGiangVien = cleanText(req.body.MaGiangVien);
    const HoTen = cleanText(req.body.HoTen);
    const MaKhoa = cleanText(req.body.MaKhoa);
    const Email = cleanText(req.body.Email);
    const MaHocKy = await resolveSemesterId(req.body.MaHocKy);
    const HocHam = validateAcademicChoice('Hoc ham', req.body.HocHam, ACADEMIC_RANKS);
    const HocVi = validateAcademicChoice('Hoc vi', req.body.HocVi, ACADEMIC_DEGREES);

    if (!MaGiangVien || !HoTen) return res.status(400).json({ success: false, message: 'Vui long nhap ma giang vien va ho ten' });
    if (!MaHocKy) return res.status(400).json({ success: false, message: 'Vui long chon hoc ky ap dung' });
    if (!Email || !isValidEmail(Email)) return res.status(400).json({ success: false, message: 'Email giang vien khong duoc thieu va phai hop le' });

    const existing = await prisma.GIANGVIEN.findUnique({ where: { MaGiangVien } });
    if (existing && existing.DaXoa === false) {
      const duplicateAllocation = await prisma.$queryRaw`
        SELECT id FROM "GIANGVIENHOCKY"
        WHERE "MaGiangVien" = ${MaGiangVien}
          AND "MaHocKy" = ${MaHocKy}
          AND COALESCE("DaXoa", FALSE) = FALSE
        LIMIT 1
      `;
      if (duplicateAllocation.length) return res.status(400).json({ success: false, message: 'Giang vien da ton tai trong hoc ky nay' });
    }
    if (!(await ensureFacultyExists(MaKhoa))) return res.status(400).json({ success: false, message: 'Khoa khong ton tai' });

    const title = buildAcademicTitle(HocHam, HocVi);
    const lecturer = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.GIANGVIEN.update({
          where: { MaGiangVien },
          data: {
            HoTen,
            HocHam,
            HocVi,
            HocHamHocVi: title,
            MaKhoa,
            Email,
            Sdt: cleanText(req.body.Sdt),
            MoTa: cleanText(req.body.MoTa),
            TrangThai: req.body.TrangThai !== undefined ? req.body.TrangThai : true,
            DaXoa: false,
            NguoiXoa: null,
            NgayXoa: null,
            ...updateAudit(req)
          }
        })
        : await tx.GIANGVIEN.create({
          data: {
            MaGiangVien,
            HoTen,
            HocHam,
            HocVi,
            HocHamHocVi: title,
            MaKhoa,
            Email,
            Sdt: cleanText(req.body.Sdt),
            MoTa: cleanText(req.body.MoTa),
            TrangThai: req.body.TrangThai !== undefined ? req.body.TrangThai : true,
            ...updateAudit(req)
          }
        });
      await upsertLecturerSemester(tx, MaGiangVien, MaHocKy, req);
      return saved;
    });

    res.status(201).json({ success: true, message: 'Tao giang vien thanh cong', data: { ...lecturer, MaHocKy } });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'createLecturer error:');
  }
};

const updateLecturer = async (req, res) => {
  try {
    if (req.body.MaGiangVien && req.body.MaGiangVien !== req.params.id) return res.status(400).json({ success: false, message: 'Khong duoc sua ma giang vien' });
    const existing = await prisma.GIANGVIEN.findFirst({ where: { MaGiangVien: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay giang vien' });

    const MaHocKy = await resolveSemesterId(req.body.MaHocKy || req.query.MaHocKy);
    const data = { ...updateAudit(req) };
    if (req.body.HoTen !== undefined && !cleanText(req.body.HoTen)) return res.status(400).json({ success: false, message: 'Ho ten giang vien khong duoc de trong' });
    if (req.body.HoTen !== undefined) data.HoTen = cleanText(req.body.HoTen);
    if (req.body.HocHam !== undefined) data.HocHam = validateAcademicChoice('Hoc ham', req.body.HocHam, ACADEMIC_RANKS);
    if (req.body.HocVi !== undefined) data.HocVi = validateAcademicChoice('Hoc vi', req.body.HocVi, ACADEMIC_DEGREES);
    if (req.body.HocHam !== undefined || req.body.HocVi !== undefined) {
      data.HocHamHocVi = buildAcademicTitle(data.HocHam ?? existing.HocHam, data.HocVi ?? existing.HocVi);
    }
    if (req.body.Email !== undefined) {
      const Email = cleanText(req.body.Email);
      if (!Email || !isValidEmail(Email)) return res.status(400).json({ success: false, message: 'Email giang vien khong duoc thieu va phai hop le' });
      data.Email = Email;
    }
    ['Sdt', 'MoTa'].forEach((field) => {
      if (req.body[field] !== undefined) data[field] = cleanText(req.body[field]);
    });
    if (req.body.MaKhoa !== undefined) {
      const MaKhoa = cleanText(req.body.MaKhoa);
      if (!(await ensureFacultyExists(MaKhoa))) return res.status(400).json({ success: false, message: 'Khoa khong ton tai' });
      data.MaKhoa = MaKhoa;
    }
    if (req.body.TrangThai !== undefined) data.TrangThai = req.body.TrangThai;

    const lecturer = await prisma.$transaction(async (tx) => {
      const saved = await tx.GIANGVIEN.update({ where: { MaGiangVien: req.params.id }, data });
      if (MaHocKy) await upsertLecturerSemester(tx, req.params.id, MaHocKy, req);
      return saved;
    });
    res.json({ success: true, message: 'Cap nhat giang vien thanh cong', data: { ...lecturer, MaHocKy } });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'updateLecturer error:');
  }
};

const deleteLecturer = async (req, res) => {
  try {
    const existing = await prisma.GIANGVIEN.findFirst({ where: { MaGiangVien: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay giang vien' });
    await prisma.$transaction(async (tx) => {
      await tx.GIANGVIEN.update({ where: { MaGiangVien: req.params.id }, data: softDeleteAudit(req) });
      const audit = softDeleteAudit(req);
      await tx.$executeRaw`
        UPDATE "GIANGVIENHOCKY"
        SET "DaXoa" = TRUE, "NguoiXoa" = ${audit.NguoiXoa}, "NgayXoa" = ${audit.NgayXoa}
        WHERE "MaGiangVien" = ${req.params.id}
      `;
    });
    res.json({ success: true, message: 'Da chuyen giang vien vao thung rac' });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'deleteLecturer error:');
  }
};

const getLecturerClasses = async (req, res) => {
  try {
    const MaGiangVien = cleanText(req.params.id);
    const MaHocKy = await resolveSemesterId(req.query.MaHocKy);
    if (!MaGiangVien || !MaHocKy) return res.json({ success: true, data: [], selectedSemester: MaHocKy || '' });

    const rows = await prisma.$queryRaw`
      SELECT
        lm.id AS "LopMoId",
        lm."MaHocKy",
        hk."TenHocKy",
        nh."TenNamHoc",
        l."MaLop",
        l."TenLop",
        l."MaMonHoc",
        mh."TenMonHoc",
        lm."SoLuongDaDangKy",
        STRING_AGG(DISTINCT COALESCE(lh."MaPhong", lh."PhongHoc", '-'), ', ') AS "PhongHocDisplay",
        STRING_AGG(DISTINCT ('Thu ' || lh."ThuTrongTuan" || ', tiet ' || COALESCE(bd."ThuTu"::text, lh."MaTietBatDau") || '-' || COALESCE(kt."ThuTu"::text, lh."MaTietKetThuc")), '; ') AS "LichHocDisplay"
      FROM "LOPMO" lm
      JOIN "LOP" l ON l."MaLop" = lm."MaLop"
      JOIN "MONHOC" mh ON mh."MaMonHoc" = l."MaMonHoc"
      JOIN "HOCKY" hk ON hk."MaHocKy" = lm."MaHocKy"
      LEFT JOIN "NAMHOC" nh ON nh."MaNamHoc" = hk."MaNamHoc"
      LEFT JOIN "LICHHOCLOP" lh ON lh."LopMoId" = lm.id AND COALESCE(lh."TrangThai", TRUE) = TRUE
      LEFT JOIN "TIETHOC" bd ON bd."MaTiet" = lh."MaTietBatDau"
      LEFT JOIN "TIETHOC" kt ON kt."MaTiet" = lh."MaTietKetThuc"
      WHERE lm."MaHocKy" = ${MaHocKy}
        AND lm."MaGiangVien" = ${MaGiangVien}
        AND COALESCE(lm."TrangThai", TRUE) = TRUE
        AND COALESCE(l."DaXoa", FALSE) = FALSE
      GROUP BY lm.id, lm."MaHocKy", hk."TenHocKy", nh."TenNamHoc", l."MaLop", l."TenLop", l."MaMonHoc", mh."TenMonHoc", lm."SoLuongDaDangKy"
      ORDER BY l."MaLop" ASC
    `;

    const data = rows.map((row) => ({ ...row, HocKyLabel: semesterLabel(row) }));
    res.json({ success: true, data, selectedSemester: MaHocKy });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'getLecturerClasses error:');
  }
};

module.exports = {
  getAllLecturers,
  createLecturer,
  updateLecturer,
  deleteLecturer,
  getLecturerClasses,
  getLecturerRows,
  buildAcademicTitle
};
