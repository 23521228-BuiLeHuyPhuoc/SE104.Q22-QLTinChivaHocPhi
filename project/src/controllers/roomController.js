const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { updateAudit, softDeleteAudit } = require('../utils/audit');
const { sendErrorResponse } = require('../utils/errorHandler');
const { getSearchRegexSource } = require('../utils/searchRegex');

const cleanText = (value) => {
  if (value === undefined) return undefined;
  const text = String(value || '').trim();
  return text || null;
};

const parseCapacity = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const vietnamToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date()).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
};

const semesterLabel = (row = {}) => [row.TenHocKy, row.TenNamHoc].filter(Boolean).join(' - ') || row.MaHocKy || '';

const resolveSemesterId = async (value) => {
  const requested = cleanText(value);
  if (requested) {
    const semester = await prisma.HOCKY.findFirst({ where: { MaHocKy: requested, DaXoa: false }, select: { MaHocKy: true } });
    if (!semester) {
      const error = new Error('Hoc ky khong ton tai hoac da bi xoa');
      error.status = 400;
      throw error;
    }
    return semester.MaHocKy;
  }

  const today = vietnamToday();
  const current = await prisma.HOCKY.findFirst({
    where: {
      DaXoa: false,
      NOT: { MaHocKy: { startsWith: 'HK-DEMO-' } },
      NgayBatDau: { lte: today },
      NgayKetThuc: { gte: today }
    },
    orderBy: [{ NgayBatDau: 'desc' }, { MaHocKy: 'desc' }],
    select: { MaHocKy: true }
  });
  if (current) return current.MaHocKy;

  const latest = await prisma.HOCKY.findFirst({
    where: { DaXoa: false, NOT: { MaHocKy: { startsWith: 'HK-DEMO-' } } },
    orderBy: [{ NgayBatDau: { sort: 'desc', nulls: 'last' } }, { MaHocKy: 'desc' }],
    select: { MaHocKy: true }
  });
  return latest?.MaHocKy || null;
};

const buildRoomSearchCondition = (search, searchField) => {
  const keyword = cleanText(search);
  if (!keyword) return null;
  const pattern = getSearchRegexSource(keyword);
  const field = ['MaPhong', 'TenPhong', 'ToaNha', 'LoaiPhong', 'MaHocKy'].includes(searchField) ? searchField : 'all';

  if (field === 'MaPhong') return Prisma.sql`p."MaPhong" ~* ${pattern}`;
  if (field === 'TenPhong') return Prisma.sql`p."TenPhong" ~* ${pattern}`;
  if (field === 'ToaNha') return Prisma.sql`COALESCE(p."ToaNha", '') ~* ${pattern}`;
  if (field === 'LoaiPhong') return Prisma.sql`COALESCE(p."LoaiPhong", '') ~* ${pattern}`;
  if (field === 'MaHocKy') {
    return Prisma.sql`(phk."MaHocKy" ~* ${pattern} OR hk."TenHocKy" ~* ${pattern} OR COALESCE(nh."TenNamHoc", '') ~* ${pattern})`;
  }

  return Prisma.sql`(
    p."MaPhong" ~* ${pattern}
    OR p."TenPhong" ~* ${pattern}
    OR COALESCE(p."ToaNha", '') ~* ${pattern}
    OR COALESCE(p."LoaiPhong", '') ~* ${pattern}
    OR phk."MaHocKy" ~* ${pattern}
    OR hk."TenHocKy" ~* ${pattern}
    OR COALESCE(nh."TenNamHoc", '') ~* ${pattern}
  )`;
};

const buildRoomConditions = ({ MaHocKy, search, searchField, LoaiPhong, TrangThai, usedStatus }) => {
  const conditions = [
    Prisma.sql`COALESCE(p."DaXoa", FALSE) = FALSE`,
    Prisma.sql`COALESCE(phk."DaXoa", FALSE) = FALSE`,
    Prisma.sql`COALESCE(phk."TrangThai", TRUE) = TRUE`,
    Prisma.sql`phk."MaHocKy" = ${MaHocKy}`
  ];
  const searchCondition = buildRoomSearchCondition(search, searchField);
  if (searchCondition) conditions.push(searchCondition);
  if (LoaiPhong) conditions.push(Prisma.sql`p."LoaiPhong" = ${LoaiPhong}`);
  if (TrangThai !== undefined && TrangThai !== '') conditions.push(Prisma.sql`COALESCE(p."TrangThai", TRUE) = ${String(TrangThai) === 'true'}`);
  if (usedStatus === 'in_use') conditions.push(Prisma.sql`COALESCE(u."ClassCount", 0) > 0`);
  if (usedStatus === 'free') conditions.push(Prisma.sql`COALESCE(u."ClassCount", 0) = 0`);
  return conditions;
};

const roomUsageCte = (MaHocKy) => Prisma.sql`
  WITH usage AS (
    SELECT
      COALESCE(lh."MaPhong", NULLIF(TRIM(lh."PhongHoc"), '')) AS "MaPhong",
      lm."MaHocKy",
      COUNT(DISTINCT lm.id)::int AS "ClassCount"
    FROM "LICHHOCLOP" lh
    JOIN "LOPMO" lm ON lm.id = lh."LopMoId"
    JOIN "LOP" l ON l."MaLop" = lm."MaLop"
    WHERE lm."MaHocKy" = ${MaHocKy}
      AND COALESCE(lm."TrangThai", TRUE) = TRUE
      AND COALESCE(lh."TrangThai", TRUE) = TRUE
      AND COALESCE(l."DaXoa", FALSE) = FALSE
      AND COALESCE(lh."MaPhong", NULLIF(TRIM(lh."PhongHoc"), '')) IS NOT NULL
    GROUP BY COALESCE(lh."MaPhong", NULLIF(TRIM(lh."PhongHoc"), '')), lm."MaHocKy"
  )`;

const getRoomRows = async ({ MaHocKy, search, searchField, LoaiPhong, TrangThai, usedStatus, skip, take, returnAll }) => {
  const conditions = buildRoomConditions({ MaHocKy, search, searchField, LoaiPhong, TrangThai, usedStatus });
  const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  const paginationSql = returnAll ? Prisma.empty : Prisma.sql`LIMIT ${take} OFFSET ${skip}`;

  const rows = await prisma.$queryRaw`
    ${roomUsageCte(MaHocKy)}
    SELECT
      p.*,
      phk.id AS "PhanBoId",
      phk."MaHocKy",
      hk."TenHocKy",
      nh."TenNamHoc",
      COALESCE(u."ClassCount", 0)::int AS "ClassCount"
    FROM "PHONGHOCHOCKY" phk
    JOIN "PHONGHOC" p ON p."MaPhong" = phk."MaPhong"
    JOIN "HOCKY" hk ON hk."MaHocKy" = phk."MaHocKy"
    LEFT JOIN "NAMHOC" nh ON nh."MaNamHoc" = hk."MaNamHoc"
    LEFT JOIN usage u ON u."MaPhong" = p."MaPhong" AND u."MaHocKy" = phk."MaHocKy"
    ${whereSql}
    ORDER BY p."MaPhong" ASC
    ${paginationSql}
  `;

  const [{ total }] = await prisma.$queryRaw`
    ${roomUsageCte(MaHocKy)}
    SELECT COUNT(*)::int AS total
    FROM "PHONGHOCHOCKY" phk
    JOIN "PHONGHOC" p ON p."MaPhong" = phk."MaPhong"
    JOIN "HOCKY" hk ON hk."MaHocKy" = phk."MaHocKy"
    LEFT JOIN "NAMHOC" nh ON nh."MaNamHoc" = hk."MaNamHoc"
    LEFT JOIN usage u ON u."MaPhong" = p."MaPhong" AND u."MaHocKy" = phk."MaHocKy"
    ${whereSql}
  `;

  return {
    rows: rows.map((row) => ({
      ...row,
      HocKyLabel: semesterLabel(row),
      IsInUse: Number(row.ClassCount || 0) > 0,
      _count: { LOP: Number(row.ClassCount || 0), LICHHOCLOP: Number(row.ClassCount || 0) }
    })),
    total: Number(total || 0)
  };
};

const upsertRoomSemester = async (client, MaPhong, MaHocKy, req) => {
  if (!MaPhong || !MaHocKy) return;
  const audit = updateAudit(req);
  await client.$executeRaw`
    INSERT INTO "PHONGHOCHOCKY" ("MaPhong", "MaHocKy", "TrangThai", "GhiChu", "NguoiCapNhat", "NgayCapNhat")
    VALUES (${MaPhong}, ${MaHocKy}, TRUE, 'Phan bo tu trang quan ly phong hoc', ${audit.NguoiCapNhat}, ${audit.NgayCapNhat})
    ON CONFLICT ("MaPhong", "MaHocKy") DO UPDATE SET
      "TrangThai" = TRUE,
      "DaXoa" = FALSE,
      "NguoiXoa" = NULL,
      "NgayXoa" = NULL,
      "NguoiCapNhat" = EXCLUDED."NguoiCapNhat",
      "NgayCapNhat" = EXCLUDED."NgayCapNhat"
  `;
};

const getAllRooms = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, searchField, LoaiPhong, TrangThai, all } = req.query;
    const usedStatus = req.query.usedStatus || req.query.used || '';
    const MaHocKy = await resolveSemesterId(req.query.MaHocKy);
    if (!MaHocKy) return res.json({ success: true, data: [], pagination: getPaginationMeta(0, 1, limit), selectedSemester: '' });

    const returnAll = all === 'true';
    const { rows, total } = await getRoomRows({ MaHocKy, search, searchField, LoaiPhong, TrangThai, usedStatus, skip, take: limit, returnAll });

    res.json({
      success: true,
      data: rows,
      pagination: getPaginationMeta(total, returnAll ? 1 : page, returnAll ? Math.max(total, 1) : limit),
      selectedSemester: MaHocKy
    });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'getAllRooms error:');
  }
};

const createRoom = async (req, res) => {
  try {
    const MaPhong = cleanText(req.body.MaPhong);
    const TenPhong = cleanText(req.body.TenPhong);
    const MaHocKy = await resolveSemesterId(req.body.MaHocKy);
    if (!MaPhong || !TenPhong) return res.status(400).json({ success: false, message: 'Vui long nhap ma phong va ten phong' });
    if (!MaHocKy) return res.status(400).json({ success: false, message: 'Vui long chon hoc ky ap dung' });

    const existing = await prisma.PHONGHOC.findUnique({ where: { MaPhong } });
    if (existing && existing.DaXoa === false) {
      const duplicateAllocation = await prisma.$queryRaw`
        SELECT id FROM "PHONGHOCHOCKY"
        WHERE "MaPhong" = ${MaPhong}
          AND "MaHocKy" = ${MaHocKy}
          AND COALESCE("DaXoa", FALSE) = FALSE
        LIMIT 1
      `;
      if (duplicateAllocation.length) return res.status(400).json({ success: false, message: 'Phong hoc da ton tai trong hoc ky nay' });
    }

    const SucChua = parseCapacity(req.body.SucChua);
    if (req.body.SucChua !== undefined && req.body.SucChua !== '' && !SucChua) {
      return res.status(400).json({ success: false, message: 'Suc chua phai la so nguyen duong' });
    }

    const room = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.PHONGHOC.update({
          where: { MaPhong },
          data: {
            TenPhong,
            ToaNha: cleanText(req.body.ToaNha),
            SucChua: SucChua || 60,
            LoaiPhong: cleanText(req.body.LoaiPhong) || 'ly_thuyet',
            MoTa: cleanText(req.body.MoTa),
            TrangThai: req.body.TrangThai !== undefined ? req.body.TrangThai : true,
            DaXoa: false,
            NguoiXoa: null,
            NgayXoa: null,
            ...updateAudit(req)
          }
        })
        : await tx.PHONGHOC.create({
          data: {
            MaPhong,
            TenPhong,
            ToaNha: cleanText(req.body.ToaNha),
            SucChua: SucChua || 60,
            LoaiPhong: cleanText(req.body.LoaiPhong) || 'ly_thuyet',
            MoTa: cleanText(req.body.MoTa),
            TrangThai: req.body.TrangThai !== undefined ? req.body.TrangThai : true,
            ...updateAudit(req)
          }
        });
      await upsertRoomSemester(tx, MaPhong, MaHocKy, req);
      return saved;
    });

    res.status(201).json({ success: true, message: 'Tao phong hoc thanh cong', data: { ...room, MaHocKy } });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'createRoom error:');
  }
};

const updateRoom = async (req, res) => {
  try {
    if (req.body.MaPhong && req.body.MaPhong !== req.params.id) return res.status(400).json({ success: false, message: 'Khong duoc sua ma phong hoc' });
    const existing = await prisma.PHONGHOC.findFirst({ where: { MaPhong: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay phong hoc' });

    const MaHocKy = await resolveSemesterId(req.body.MaHocKy || req.query.MaHocKy);
    const data = { ...updateAudit(req) };
    if (req.body.TenPhong !== undefined && !cleanText(req.body.TenPhong)) return res.status(400).json({ success: false, message: 'Ten phong khong duoc de trong' });
    ['TenPhong', 'ToaNha', 'LoaiPhong', 'MoTa'].forEach((field) => {
      if (req.body[field] !== undefined) data[field] = cleanText(req.body[field]);
    });
    if (req.body.SucChua !== undefined) {
      const SucChua = parseCapacity(req.body.SucChua);
      if (req.body.SucChua !== '' && !SucChua) return res.status(400).json({ success: false, message: 'Suc chua phai la so nguyen duong' });
      data.SucChua = SucChua;
    }
    if (req.body.TrangThai !== undefined) data.TrangThai = req.body.TrangThai;

    const room = await prisma.$transaction(async (tx) => {
      const saved = await tx.PHONGHOC.update({ where: { MaPhong: req.params.id }, data });
      if (MaHocKy) await upsertRoomSemester(tx, req.params.id, MaHocKy, req);
      return saved;
    });
    res.json({ success: true, message: 'Cap nhat phong hoc thanh cong', data: { ...room, MaHocKy } });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'updateRoom error:');
  }
};

const deleteRoom = async (req, res) => {
  try {
    const existing = await prisma.PHONGHOC.findFirst({ where: { MaPhong: req.params.id, DaXoa: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Khong tim thay phong hoc' });
    await prisma.$transaction(async (tx) => {
      await tx.PHONGHOC.update({ where: { MaPhong: req.params.id }, data: softDeleteAudit(req) });
      const audit = softDeleteAudit(req);
      await tx.$executeRaw`
        UPDATE "PHONGHOCHOCKY"
        SET "DaXoa" = TRUE, "NguoiXoa" = ${audit.NguoiXoa}, "NgayXoa" = ${audit.NgayXoa}
        WHERE "MaPhong" = ${req.params.id}
      `;
    });
    res.json({ success: true, message: 'Da chuyen phong hoc vao thung rac' });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'deleteRoom error:');
  }
};

const getRoomClasses = async (req, res) => {
  try {
    const MaPhong = cleanText(req.params.id);
    const MaHocKy = await resolveSemesterId(req.query.MaHocKy);
    if (!MaPhong || !MaHocKy) return res.json({ success: true, data: [], selectedSemester: MaHocKy || '' });

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
        lm."MaGiangVien",
        COALESCE(gv."HoTen", lm."GiangVien", l."GiangVien") AS "HoTenGiangVien",
        COALESCE(gv."HocHamHocVi", CONCAT_WS('.', NULLIF(gv."HocHam", ''), NULLIF(gv."HocVi", ''))) AS "HocHamHocVi",
        lm."SoLuongDaDangKy",
        lh."ThuTrongTuan",
        lh."MaTietBatDau",
        lh."MaTietKetThuc",
        bd."ThuTu" AS "TietBatDau",
        kt."ThuTu" AS "TietKetThuc"
      FROM "LICHHOCLOP" lh
      JOIN "LOPMO" lm ON lm.id = lh."LopMoId"
      JOIN "LOP" l ON l."MaLop" = lm."MaLop"
      JOIN "MONHOC" mh ON mh."MaMonHoc" = l."MaMonHoc"
      JOIN "HOCKY" hk ON hk."MaHocKy" = lm."MaHocKy"
      LEFT JOIN "NAMHOC" nh ON nh."MaNamHoc" = hk."MaNamHoc"
      LEFT JOIN "GIANGVIEN" gv ON gv."MaGiangVien" = lm."MaGiangVien"
      LEFT JOIN "TIETHOC" bd ON bd."MaTiet" = lh."MaTietBatDau"
      LEFT JOIN "TIETHOC" kt ON kt."MaTiet" = lh."MaTietKetThuc"
      WHERE lm."MaHocKy" = ${MaHocKy}
        AND COALESCE(lm."TrangThai", TRUE) = TRUE
        AND COALESCE(lh."TrangThai", TRUE) = TRUE
        AND COALESCE(l."DaXoa", FALSE) = FALSE
        AND COALESCE(lh."MaPhong", NULLIF(TRIM(lh."PhongHoc"), '')) = ${MaPhong}
      ORDER BY l."MaLop" ASC, lh."ThuTrongTuan" ASC, bd."ThuTu" ASC
    `;

    const data = rows.map((row) => ({
      ...row,
      HocKyLabel: semesterLabel(row),
      GiangVienDisplay: [row.HocHamHocVi, row.HoTenGiangVien].filter(Boolean).join(' ').trim(),
      LichHocDisplay: row.ThuTrongTuan ? 'Thu ' + row.ThuTrongTuan + ', tiet ' + (row.TietBatDau || row.MaTietBatDau) + '-' + (row.TietKetThuc || row.MaTietKetThuc) : '-'
    }));

    res.json({ success: true, data, selectedSemester: MaHocKy });
  } catch (error) {
    return sendErrorResponse(res, error, 'Loi server', 'getRoomClasses error:');
  }
};

module.exports = {
  getAllRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomClasses,
  resolveSemesterId,
  getRoomRows
};
