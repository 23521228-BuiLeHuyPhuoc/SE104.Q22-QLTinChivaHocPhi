/*
 * API regression skeleton for core registration, tuition, and payment bugs.
 * Requires installing a test runner and HTTP client, for example:
 *   npm i -D jest supertest
 *   npx jest tests/api/core-business-regression.skeleton.test.js
 *
 * Keep every test database isolated. Seed data should be reset in beforeEach or
 * wrapped in a transaction rollback to avoid touching real student/payment data.
 */

const request = require('supertest');

const ACTIVE_REGISTRATION_STATUS = '\u0110\u00e3 \u0111\u0103ng k\u00fd';
let app;
let prisma;

async function authTokenFor(_role, _studentId) {
  // TODO: create or seed account, then return a valid JWT.
  return 'Bearer <token>';
}

async function seedOpenClass(_overrides = {}) {
  // TODO: seed NAMHOC, HOCKY, MONHOC, MONHOCMO, LOP, LOPMO, LICHHOCLOP, TIETHOC.
  return { MaSv: 'SV_REG_001', MaHocKy: 'HK_REG_001', MaLop: 'L_REG_001', MaMonHoc: 'M_REG_001' };
}

describe.skip('core business regressions', () => {
  beforeAll(() => {
    app = require('../../src/index');
    prisma = require('../../src/config/database');
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  test('REG-BUG-001 missing DONGIATINCHI rejects registration instead of using a hard-coded fallback price', async () => {
    const seed = await seedOpenClass({ withoutPricing: true, LoaiMon: 'LT' });
    const token = await authTokenFor('student', seed.MaSv);

    await request(app)
      .post('/api/registrations')
      .set('Authorization', token)
      .send({ MaHocKy: seed.MaHocKy, MaLop: seed.MaLop })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('MISSING_CREDIT_PRICE');
      });
  });

  test('REG-BUG-002 tien_quyet prerequisite must be passed before registering the dependent course', async () => {
    const seed = await seedOpenClass({ prerequisite: { MaMonDieuKien: 'M_PRE_001', KetQua: null } });
    const token = await authTokenFor('student', seed.MaSv);

    await request(app)
      .post('/api/registrations')
      .set('Authorization', token)
      .send({ MaHocKy: seed.MaHocKy, MaLop: seed.MaLop })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('PREREQUISITE_NOT_SATISFIED');
      });
  });

  test('REG-REVIEW-002 tien_quyet pass row in the same or a later semester is rejected', async () => {
    const seed = await seedOpenClass({
      prerequisite: {
        MaMonDieuKien: 'M_PRE_001',
        KetQua: 'qua_mon',
        completedSemesterPosition: 'same-or-later'
      }
    });
    const token = await authTokenFor('student', seed.MaSv);

    await request(app)
      .post('/api/registrations')
      .set('Authorization', token)
      .send({ MaHocKy: seed.MaHocKy, MaLop: seed.MaLop })
      .expect(400)
      .expect((res) => {
        expect(['PREREQUISITE_NOT_SATISFIED', 'PREREQUISITE_SEMESTER_ORDER_UNKNOWN']).toContain(res.body.code);
      });
  });

  test('REG-BUG-003 two concurrent registrations for the final seat cannot both succeed', async () => {
    const seed = await seedOpenClass({ SoLuongToiDa: 1, SoLuongDaDangKy: 0 });
    const tokenA = await authTokenFor('student', 'SV_RACE_A');
    const tokenB = await authTokenFor('student', 'SV_RACE_B');

    const attempts = await Promise.allSettled([
      request(app).post('/api/registrations').set('Authorization', tokenA).send({ MaHocKy: seed.MaHocKy, MaLop: seed.MaLop }),
      request(app).post('/api/registrations').set('Authorization', tokenB).send({ MaHocKy: seed.MaHocKy, MaLop: seed.MaLop })
    ]);

    const statuses = attempts.map((item) => item.value?.status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.some((status) => [400, 409].includes(status))).toBe(true);

    const activeCount = await prisma.CHITIETDANGKY.count({
      where: { MaLop: seed.MaLop, TrangThai: ACTIVE_REGISTRATION_STATUS, PHIEUDANGKY: { MaHocKy: seed.MaHocKy } }
    });
    expect(activeCount).toBeLessThanOrEqual(1);
  });

  test('REG-REVIEW-003 null SoLuongDaDangKy is coalesced to zero during atomic seat reservation', async () => {
    const seed = await seedOpenClass({ SoLuongToiDa: 2, SoLuongDaDangKy: null });
    const token = await authTokenFor('student', seed.MaSv);

    await request(app)
      .post('/api/registrations')
      .set('Authorization', token)
      .send({ MaHocKy: seed.MaHocKy, MaLop: seed.MaLop })
      .expect(201);

    const opened = await prisma.LOPMO.findFirst({ where: { MaHocKy: seed.MaHocKy, MaLop: seed.MaLop } });
    expect(Number(opened.SoLuongDaDangKy)).toBe(1);
  });

  test('PAY-BUG-004 stale online callback cannot turn failed or unpaid receipt into success after another payment succeeded', async () => {
    // TODO: seed one PHIEUDANGKY with one failed receipt and one successful receipt.
    // TODO: call /api/payments/vnpay-ipn with a valid signed query for the failed receipt.
    // Expected: stale receipt remains failed, no additional successful payment is created.
  });

  test('PAY-REVIEW-001 provider callback amount mismatch is rejected before marking success', async () => {
    // TODO: seed one pending VNPAY/ZaloPay receipt where SoTienThu equals the remaining debt.
    // TODO: send a valid signed VNPAY IPN with vnp_Amount lower than SoTienThu * 100,
    //       and a valid ZaloPay callback whose signed data.amount is lower than SoTienThu.
    // Expected: VNPAY returns RspCode 04 or return API returns 400, ZaloPay returns failed,
    //           and PHIEUTHUHOCPHI.TrangThai stays pending instead of success.
  });
});
