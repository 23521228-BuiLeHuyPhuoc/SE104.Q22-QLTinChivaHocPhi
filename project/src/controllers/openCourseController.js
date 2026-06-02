const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { getActorId } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');

const cleanText = (value) => {
  if (value === undefined) return undefined;
  const text = String(value || '').trim();
  return text || null;
};

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};

const getOpenCourseRow = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT
      mhm.id,
      mhm."MaHocKy",
      hk."TenHocKy",
      nh."TenNamHoc",
      mhm."MaMonHoc",
      mh."TenMonHoc",
      mh."LoaiMon",
      mh."SoTinChi",
      mh."SoTiet",
      mh."MaKhoa",
      k."TenKhoa",
      mhm."GhiChu",
      mhm."TrangThai",
      mhm."NgayTao",
      mhm."NguoiCapNhat",
      mhm."NgayCapNhat",
      COALESCE(active_lopmo."SoLopMo", 0)::int AS "SoLopMo"
    FROM "MONHOCMO" mhm
    JOIN "HOCKY" hk ON hk."MaHocKy" = mhm."MaHocKy"
    LEFT JOIN "NAMHOC" nh ON nh."MaNamHoc" = hk."MaNamHoc"
    JOIN "MONHOC" mh ON mh."MaMonHoc" = mhm."MaMonHoc"
    LEFT JOIN "KHOA" k ON k."MaKhoa" = mh."MaKhoa"
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS "SoLopMo"
      FROM "LOPMO" lm
      JOIN "LOP" l ON l."MaLop" = lm."MaLop"
      WHERE lm."MaHocKy" = mhm."MaHocKy"
        AND l."MaMonHoc" = mhm."MaMonHoc"
        AND COALESCE(lm."TrangThai", TRUE) = TRUE
    ) active_lopmo ON TRUE
    WHERE mhm.id = ${id} AND COALESCE(mhm."DaXoa", FALSE) = FALSE
    LIMIT 1
  `;
  return rows[0] || null;
};

const buildOpenCourseWhere = (query = {}) => {
  const conditions = [
    Prisma.sql`COALESCE(mhm."DaXoa", FALSE) = FALSE`,
    Prisma.sql`COALESCE(hk."DaXoa", FALSE) = FALSE`,
    Prisma.sql`COALESCE(mh."DaXoa", FALSE) = FALSE`
  ];

  if (query.MaHocKy) conditions.push(Prisma.sql`mhm."MaHocKy" = ${query.MaHocKy}`);
  if (query.MaKhoa) conditions.push(Prisma.sql`mh."MaKhoa" = ${query.MaKhoa}`);
  if (query.TrangThai !== undefined && query.TrangThai !== '') {
    conditions.push(Prisma.sql`COALESCE(mhm."TrangThai", TRUE) = ${parseBoolean(query.TrangThai)}`);
  }
  if (query.search) {
    const term = `%${String(query.search).trim()}%`;
    conditions.push(Prisma.sql`(mhm."MaMonHoc" ILIKE ${term} OR mh."TenMonHoc" ILIKE ${term})`);
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
};

const assertActiveCourseAndSemester = async (MaHocKy, MaMonHoc) => {
  const [semester, course] = await Promise.all([
    prisma.HOCKY.findFirst({ where: { MaHocKy, DaXoa: false }, select: { MaHocKy: true } }),
    prisma.MONHOC.findFirst({ where: { MaMonHoc, DaXoa: false, TrangThai: true }, select: { MaMonHoc: true } })
  ]);

  if (!semester) throw { status: 404, message: 'Không tìm thấy học kỳ' };
  if (!course) throw { status: 400, message: 'Môn học không tồn tại hoặc đang bị khóa' };
};

const assertNoDuplicateOpenCourse = async (id, MaHocKy, MaMonHoc) => {
  const rows = await prisma.$queryRaw`
    SELECT id, COALESCE("DaXoa", FALSE) AS "DaXoa"
    FROM "MONHOCMO"
    WHERE "MaHocKy" = ${MaHocKy}
      AND "MaMonHoc" = ${MaMonHoc}
      AND id <> ${id}
    LIMIT 1
  `;

  if (!rows.length) return;
  throw {
    status: 409,
    message: rows[0].DaXoa
      ? 'Môn học này đã có bản ghi đã xóa trong học kỳ đã chọn. Hãy thêm mới để khôi phục.'
      : 'Môn học này đã được mở trong học kỳ đã chọn'
  };
};

const assertNoActiveOpenedClasses = async (MaHocKy, MaMonHoc) => {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "LOPMO" lm
    JOIN "LOP" l ON l."MaLop" = lm."MaLop"
    WHERE lm."MaHocKy" = ${MaHocKy}
      AND l."MaMonHoc" = ${MaMonHoc}
      AND COALESCE(lm."TrangThai", TRUE) = TRUE
  `;
  if (Number(rows[0]?.count || 0) > 0) {
    throw { status: 400, message: 'Môn học này đang có lớp mở trong học kỳ, vui lòng đóng các lớp trước' };
  }
};

const getOpenCourses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const returnAll = req.query.all === 'true';
    const whereSql = buildOpenCourseWhere(req.query);
    const take = returnAll ? 10000 : limit;
    const offset = returnAll ? 0 : skip;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          mhm.id,
          mhm."MaHocKy",
          hk."TenHocKy",
          nh."TenNamHoc",
          mhm."MaMonHoc",
          mh."TenMonHoc",
          mh."LoaiMon",
          mh."SoTinChi",
          mh."SoTiet",
          mh."MaKhoa",
          k."TenKhoa",
          mhm."GhiChu",
          mhm."TrangThai",
          mhm."NgayTao",
          mhm."NguoiCapNhat",
          mhm."NgayCapNhat",
          COALESCE(active_lopmo."SoLopMo", 0)::int AS "SoLopMo"
        FROM "MONHOCMO" mhm
        JOIN "HOCKY" hk ON hk."MaHocKy" = mhm."MaHocKy"
        LEFT JOIN "NAMHOC" nh ON nh."MaNamHoc" = hk."MaNamHoc"
        JOIN "MONHOC" mh ON mh."MaMonHoc" = mhm."MaMonHoc"
        LEFT JOIN "KHOA" k ON k."MaKhoa" = mh."MaKhoa"
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS "SoLopMo"
          FROM "LOPMO" lm
          JOIN "LOP" l ON l."MaLop" = lm."MaLop"
          WHERE lm."MaHocKy" = mhm."MaHocKy"
            AND l."MaMonHoc" = mhm."MaMonHoc"
            AND COALESCE(lm."TrangThai", TRUE) = TRUE
        ) active_lopmo ON TRUE
        ${whereSql}
        ORDER BY hk."NgayBatDau" DESC NULLS LAST, mhm."MaHocKy" DESC, mh."MaMonHoc" ASC
        OFFSET ${offset}
        LIMIT ${take}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM "MONHOCMO" mhm
        JOIN "HOCKY" hk ON hk."MaHocKy" = mhm."MaHocKy"
        JOIN "MONHOC" mh ON mh."MaMonHoc" = mhm."MaMonHoc"
        ${whereSql}
      `
    ]);

    const total = Number(countRows[0]?.count || 0);
    res.json({ success: true, data: rows, pagination: getPaginationMeta(total, returnAll ? 1 : page, returnAll ? Math.max(total, 1) : limit) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'getOpenCourses error:');
  }
};

const createOpenCourse = async (req, res) => {
  try {
    const MaHocKy = cleanText(req.body.MaHocKy);
    const MaMonHoc = cleanText(req.body.MaMonHoc);
    const GhiChu = cleanText(req.body.GhiChu);
    const TrangThai = parseBoolean(req.body.TrangThai, true);
    if (!MaHocKy || !MaMonHoc) return res.status(400).json({ success: false, message: 'Vui lòng chọn học kỳ và môn học' });

    await assertActiveCourseAndSemester(MaHocKy, MaMonHoc);
    const actor = getActorId(req);
    const result = await prisma.$queryRaw`
      INSERT INTO "MONHOCMO" ("MaHocKy", "MaMonHoc", "GhiChu", "TrangThai", "NguoiCapNhat", "NgayCapNhat")
      VALUES (${MaHocKy}, ${MaMonHoc}, ${GhiChu}, ${TrangThai}, ${actor}, CURRENT_TIMESTAMP)
      ON CONFLICT ("MaHocKy", "MaMonHoc") DO UPDATE SET
        "GhiChu" = EXCLUDED."GhiChu",
        "TrangThai" = EXCLUDED."TrangThai",
        "DaXoa" = FALSE,
        "NguoiXoa" = NULL,
        "NgayXoa" = NULL,
        "NguoiCapNhat" = EXCLUDED."NguoiCapNhat",
        "NgayCapNhat" = CURRENT_TIMESTAMP
      RETURNING id
    `;
    const data = await getOpenCourseRow(result[0].id);
    res.status(201).json({ success: true, message: 'Lưu môn học mở thành công', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return sendErrorResponse(res, error, 'Lỗi server', 'createOpenCourse error:');
  }
};

const updateOpenCourse = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    const current = await getOpenCourseRow(id);
    if (!current) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học mở' });

    const nextMaHocKy = cleanText(req.body.MaHocKy) || current.MaHocKy;
    const nextMaMonHoc = cleanText(req.body.MaMonHoc) || current.MaMonHoc;
    const nextGhiChu = req.body.GhiChu !== undefined ? cleanText(req.body.GhiChu) : current.GhiChu;
    const nextTrangThai = parseBoolean(req.body.TrangThai, current.TrangThai !== false);
    const moving = nextMaHocKy !== current.MaHocKy || nextMaMonHoc !== current.MaMonHoc;
    const disabling = current.TrangThai !== false && nextTrangThai === false;

    if (moving || disabling) await assertNoActiveOpenedClasses(current.MaHocKy, current.MaMonHoc);
    await assertActiveCourseAndSemester(nextMaHocKy, nextMaMonHoc);
    if (moving) await assertNoDuplicateOpenCourse(id, nextMaHocKy, nextMaMonHoc);

    const actor = getActorId(req);
    const result = await prisma.$queryRaw`
      UPDATE "MONHOCMO"
      SET
        "MaHocKy" = ${nextMaHocKy},
        "MaMonHoc" = ${nextMaMonHoc},
        "GhiChu" = ${nextGhiChu},
        "TrangThai" = ${nextTrangThai},
        "NguoiCapNhat" = ${actor},
        "NgayCapNhat" = CURRENT_TIMESTAMP
      WHERE id = ${id} AND COALESCE("DaXoa", FALSE) = FALSE
      RETURNING id
    `;
    if (!result.length) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học mở' });
    const data = await getOpenCourseRow(result[0].id);
    res.json({ success: true, message: 'Cập nhật môn học mở thành công', data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return sendErrorResponse(res, error, 'Lỗi server', 'updateOpenCourse error:');
  }
};

const deleteOpenCourse = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    const current = await getOpenCourseRow(id);
    if (!current) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học mở' });
    await assertNoActiveOpenedClasses(current.MaHocKy, current.MaMonHoc);
    const actor = getActorId(req);
    await prisma.$executeRaw`
      UPDATE "MONHOCMO"
      SET "DaXoa" = TRUE,
          "TrangThai" = FALSE,
          "NguoiXoa" = ${actor},
          "NgayXoa" = CURRENT_TIMESTAMP,
          "NguoiCapNhat" = ${actor},
          "NgayCapNhat" = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
    res.json({ success: true, message: 'Đã xóa môn học mở' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return sendErrorResponse(res, error, 'Lỗi server', 'deleteOpenCourse error:');
  }
};

const getAvailableCourses = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const returnAll = req.query.all === 'true';
    const conditions = [Prisma.sql`COALESCE(mh."DaXoa", FALSE) = FALSE`, Prisma.sql`COALESCE(mh."TrangThai", TRUE) = TRUE`];
    if (req.query.MaKhoa) conditions.push(Prisma.sql`mh."MaKhoa" = ${req.query.MaKhoa}`);
    if (req.query.search) {
      const term = `%${String(req.query.search).trim()}%`;
      conditions.push(Prisma.sql`(mh."MaMonHoc" ILIKE ${term} OR mh."TenMonHoc" ILIKE ${term})`);
    }
    if (req.query.MaHocKy) {
      conditions.push(Prisma.sql`NOT EXISTS (
        SELECT 1 FROM "MONHOCMO" mhm
        WHERE mhm."MaHocKy" = ${req.query.MaHocKy}
          AND mhm."MaMonHoc" = mh."MaMonHoc"
          AND COALESCE(mhm."DaXoa", FALSE) = FALSE
      )`);
    }
    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const take = returnAll ? 10000 : limit;
    const offset = returnAll ? 0 : skip;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT mh."MaMonHoc", mh."TenMonHoc", mh."LoaiMon", mh."SoTinChi", mh."SoTiet", mh."MaKhoa", k."TenKhoa"
        FROM "MONHOC" mh
        LEFT JOIN "KHOA" k ON k."MaKhoa" = mh."MaKhoa"
        ${whereSql}
        ORDER BY mh."MaMonHoc" ASC
        OFFSET ${offset}
        LIMIT ${take}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM "MONHOC" mh
        LEFT JOIN "KHOA" k ON k."MaKhoa" = mh."MaKhoa"
        ${whereSql}
      `
    ]);
    const total = Number(countRows[0]?.count || 0);
    res.json({ success: true, data: rows, pagination: getPaginationMeta(total, returnAll ? 1 : page, returnAll ? Math.max(total, 1) : limit) });
  } catch (error) {
    return sendErrorResponse(res, error, 'Lỗi server', 'getAvailableOpenCourses error:');
  }
};

module.exports = {
  getOpenCourses,
  createOpenCourse,
  updateOpenCourse,
  deleteOpenCourse,
  getAvailableCourses
};
