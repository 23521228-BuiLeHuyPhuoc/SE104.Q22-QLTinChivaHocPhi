const getActorId = (req) => {
  const raw = req?.user?.MaTaiKhoan || req?.user?.id || null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const getActorName = (req) => (
  req?.user?.HoTen ||
  req?.user?.username ||
  req?.user?.TenDangNhap ||
  'He thong'
);

const updateAudit = (req) => ({
  NguoiCapNhat: getActorId(req),
  NgayCapNhat: new Date()
});

const softDeleteAudit = (req) => ({
  DaXoa: true,
  NguoiXoa: getActorId(req),
  NgayXoa: new Date()
});

module.exports = {
  getActorId,
  getActorName,
  updateAudit,
  softDeleteAudit
};
