# QA Core Business Test Cases - Dang ky hoc phan va Hoc phi

Ngay lap: 2026-06-03  
Pham vi: audit source code trong `project/src`, `project/prisma`, `project/tests`, cac view Pug va client JavaScript lien quan nghiep vu dang ky hoc phan, cuu xet, hoc phi, thanh toan.

## 1. Business rule tim thay trong code

### Man hinh lien quan

| Nhom | Man hinh |
|---|---|
| Student | `/student/course-registration`, `/student/my-courses`, `/student/my-tuition`, `/student/my-payments`, `/student/my-schedule`, `/student/completed-courses`, `/student/curriculum` |
| Admin dao tao | `/admin/semesters`, `/admin/academic-years`, `/admin/open-courses`, `/admin/classes`, `/admin/periods`, `/admin/rooms`, `/admin/lecturers`, `/admin/registrations`, `/admin/appeals`, `/admin/prerequisites`, `/admin/completed-courses`, `/admin/curriculum-programs` |
| Admin tai chinh | `/admin/tuition`, `/admin/payments`, `/admin/pricing`, `/admin/beneficiaries`, `/admin/reports` |

### API lien quan

| Module | API chinh |
|---|---|
| Semesters | `GET/POST/PUT/DELETE /api/semesters`, `GET/POST/PUT/DELETE /api/semesters/years`, `POST /api/semesters/:id/finalize-registration`, `POST /api/semesters/:id/open-tuition-payment`, `POST /api/semesters/:id/close-tuition-payment` |
| Open courses | `GET/POST/PUT/DELETE /api/open-courses`, `GET /api/open-courses/available` |
| Classes | `GET/POST/PUT/DELETE /api/classes`, `POST /api/classes/open`, `DELETE /api/classes/opened/:id`, `POST /api/classes/validate-schedule`, `GET/POST/DELETE /api/classes/:id/schedules` |
| Registration | `GET /api/registrations/available`, `POST /api/registrations`, `PUT /api/registrations/:id/cancel`, `GET /api/registrations/student/:studentId`, admin list/export/stats/detail |
| Appeals | `GET /api/appeals/student/:studentId`, `POST /api/appeals`, `PUT /api/appeals/:id/cancel`, admin list/approve/reject |
| Tuition | `GET /api/tuition`, `GET /api/tuition/student/:studentId`, `GET /api/tuition/detail/:id`, `POST /api/tuition/calculate`, `GET /api/tuition/prices`, stats |
| Payments | `GET /api/payments/student/:studentId`, `POST /api/payments`, `POST /api/payments/bulk`, `POST /api/payments/:id/checkout`, `PUT /api/payments/:id/confirm`, `PUT /api/payments/:id/fail`, `PUT /api/payments/:id/cancel`, VNPAY/ZaloPay callback |
| Pricing/beneficiary | `GET/POST/PUT/DELETE /api/pricing`, `GET/POST/PUT/DELETE /api/beneficiaries`, `POST/DELETE /api/beneficiaries/:id/students` |

### Bang database lien quan

`HOCKY`, `NAMHOC`, `MONHOC`, `MONHOCMO`, `LOP`, `LOPMO`, `LICHHOCLOP`, `TIETHOC`, `PHONGHOC`, `GIANGVIEN`, `PHIEUDANGKY`, `CHITIETDANGKY`, `DONCUUXETDANGKY`, `DONGIATINCHI`, `DOITUONG`, `DOITUONGSINHVIEN`, `PHIEUTHUHOCPHI`, `THAMSO`, `DIEUKIENMONHOC`, `MONDAHOC`, `CHUONGTRINHHOC`, `SINHVIEN`, `TAIKHOAN`, `NHOMNGUOIDUNG`, `PHANQUYEN`.

### Business rule chinh da thay

| Nhom | Rule trong code |
|---|---|
| Hoc ky | `NgayBatDau < NgayKetThuc`; ngay dang ky phai truoc ngay bat dau hoc ky; cuu xet bat dau sau ket thuc dang ky; han dong hoc phi nam trong hoc ky; chi mot hoc ky `Dang dien ra`; finalize chi sau khi cuu xet ket thuc va khong con don pending; mo thu hoc phi chi sau finalize. |
| Dang ky | Sinh vien chi dang ky cho chinh minh; admin co the dang ky thay; chi dang ky trong registration window; khoa dang ky/huy khi phieu da co thanh toan `Thanh cong`; khong dang ky trung mon active; kiem tra trung lich theo thu va tiet overlap inclusive; kiem tra gioi han tin chi theo `THAMSO` va rule Anh Van; kiem tra lop con cho; sau sua co kiem tra mon tien quyet `tien_quyet`. |
| Huy dang ky | Chi huy trong han dang ky truc tiep; khong huy khi phieu da thanh toan thanh cong; huy cap nhat `CHITIETDANGKY`, giam `LOPMO.SoLuongDaDangKy`, tinh lai tong tien va tin chi. |
| Cuu xet | Sinh vien chi thao tac don cua minh; validate loai don `them/huy/doi`; chi gui trong appeal window; khong gui/duyet sau `NgayChotDangKy` hoac khi `MoThuHocPhi`; duyet them/doi chay lai rule lop day, trung mon, trung lich, tin chi, tien quyet, tinh hoc phi. |
| Lop/lop mo | Lop mo phai thuoc mon hoc da mo trong hoc ky; lich lop mo kiem tra trung phong, trung giang vien, trung lop theo overlap inclusive; tiet bat dau <= tiet ket thuc; thu trong tuan 1-7; phong/giang vien phai active. |
| Hoc phi | Tien tung dong = `SoTinChi * DonGia`; `LoaiHoc` tu lich su `MONDAHOC`: qua mon -> `hoc_cai_thien`, rot -> `hoc_lai`, mac dinh `hoc_moi`; hoc ky he doi `hoc_moi` thanh `hoc_he`; tong phieu chi tinh chi tiet active; mien giam chon doi tuong active co `DoUuTien` nho nhat. |
| Thanh toan | Admin tao phieu thu dung so tien con no; chi thanh toan sau khi het dang ky/cuu xet, da finalize, khong con don pending, `MoThuHocPhi=true`; checkout so tien phai bang phieu thu va bang con no; admin confirm chi cho receipt pending; success payment khoa dang ky/huy. |
| Permission | Student endpoints `student/:studentId` co `ensureStudentAccess`; admin route dung `adminMiddleware`; VNPAY/ZaloPay callback khong auth nhung co signature/mac. |

## 2. Cong thuc tinh hoc phi thuc te

| Buoc | Cong thuc/nguon |
|---|---|
| Xac dinh loai dang ky | `determineRegistrationType`: neu `MONDAHOC.KetQua='qua_mon'` -> `hoc_cai_thien`; neu co `rot` -> `hoc_lai`; con lai `hoc_moi`. |
| Xac dinh don gia | `getCreditPrice(LoaiMon, LoaiDangKy, MaHocKy)`: uu tien `DONGIATINCHI` theo hoc ky, neu khong co thi gia mac dinh `MaHocKy=null`; sau sua, thieu ca hai thi loi `MISSING_CREDIT_PRICE`, khong fallback 27000/37000. |
| Hoc ky he | Neu `HOCKY.LoaiHocKy` chua `he/hè` va loai dang ky la `hoc_moi` thi tinh don gia `hoc_he`. |
| Thanh tien dong | `ThanhTien = DonGia * SoTinChi`. |
| Tong phieu | Cong chi tiet co `TrangThai = 'Đã đăng ký'`. Tach `hoc_moi`, `hoc_lai`, `hoc_cai_thien`. |
| Mien giam | `TiLeGiam = DOITUONG.TiLeGiamHocPhi` cua doi tuong active co `DoUuTien` nho nhat. `TienMienGiam = round(TongTienDangKy * TiLeGiam / 100)`. |
| Phai dong | `TongTienPhaiDong = max(TongTienDangKy - TienMienGiam, 0)`. |
| Da dong/con no | Success payments tru refund. `ConNo = max(TongTienPhaiDong - TongTienDaDong + Refund, 0)`. |

## 3. Trang thai va han thoi gian

| Doi tuong | Trang thai/han |
|---|---|
| Hoc ky | `Sắp diễn ra`, `Đang diễn ra`, `Đã kết thúc`; `NgayBatDau`, `NgayKetThuc`, `NgayBatDauDangKy`, `NgayKetThucDangKy`, `NgayBatDauCuuXet`, `NgayKetThucCuuXet`, `NgayChotDangKy`, `MoThuHocPhi`, `NgayMoThuHocPhi`, `HanDongHocPhi`. |
| Dang ky | `Đã đăng ký`, `Đã hủy`. |
| Cuu xet | `cho_duyet`, `da_duyet`, `tu_choi`, `da_huy`. |
| Thanh toan | `Chưa thanh toán`, `Chờ xác nhận`, `Thành công`, `Thất bại`, `Đã hủy`, `Hoàn tiền`. |

## 4. Cac diem bat thuong/bug phat hien

| ID bug | File/ham/API | Muc do | Mo ta bug | Bang chung tu code | Sua ngay hay can xac nhan | Cach sua |
|---|---|---|---|---|---|---|
| BUG-CORE-001 | `registrationController.getCreditPrice`; `POST /api/registrations`; `GET /api/registrations/available`; `pricingController` recalc | Critical | Thieu don gia van dung hard-code 27000/37000, co the tinh sai hoc phi thay vi bao loi. | `getCreditPrice` return `loaiMon === 'TH' ? 37000 : 27000`, trong khi DB function `fn_lay_don_gia` raise exception khi thieu bang gia. | Da sua | Bo fallback, throw `MISSING_CREDIT_PRICE`. |
| BUG-CORE-002 | `registrationController.registerCourse`; `appealController.approveAppeal/addClassToRegistration`; `DIEUKIENMONHOC` | High | Co bang/man hinh mon tien quyet nhung dang ky va duyet cuu xet them/doi khong kiem tra `tien_quyet`. | `registerCourse` chi check trung mon, lich, tin chi, lop day; khong query `DIEUKIENMONHOC`. | Da sua | Them `ensurePrerequisitesSatisfied` bat buoc co `MONDAHOC.KetQua='qua_mon'` cho `LoaiDieuKien='tien_quyet'`. |
| BUG-CORE-003 | `registrationController.registerCourse`; `appealController.addClassToRegistration`; `LOPMO.SoLuongDaDangKy` | Critical | Race condition/double submit co the vuot suc chua slot cuoi vi check truoc roi increment sau khong atomic. | Code doc `SoLuongDaDangKy`, sau do `updateMany increment` khong co dieu kien `< SoLuongToiDa`; transaction dang ky truc tiep khong dat isolation. | Da sua | Them count active, `reserveOpenedClassSeat` update co dieu kien, transaction `Serializable`, map `P2034` thanh 409. |
| BUG-CORE-004 | `paymentController.markOnlineResult`; VNPAY/ZaloPay callback | Critical | Callback online cu co the chuyen receipt `Thất bại`/`Chưa thanh toán` thanh `Thành công`, gay thanh toan trung sau khi co giao dich khac thanh cong. | `markOnlineResult` cho update neu status trong `[PENDING, FAILED, UNPAID]`; khong check cac success receipt khac cua phieu. | Da sua | Chi update receipt `Chờ xác nhận`; success callback kiem tra payment window va `SoTienThu == conNo` sau khi loai receipt hien tai. |
| BUG-REVIEW-001 | `paymentController.markOnlineResult`; `vnpayReturn`; `vnpayIpn`; `zalopayCallback` | Critical | Callback success tu VNPAY/ZaloPay chua doi chieu amount provider confirm voi `PHIEUTHUHOCPHI.SoTienThu`. | Review chi ra success callback chi check receipt amount voi remaining debt; neu gateway tra amount nho hon receipt van co the mark success. | Da sua | Parse `vnp_Amount / 100` cho VNPAY, parse `amount` tu ZaloPay `data`/body, truyen vao `markOnlineResult`, bat buoc provider amount bang receipt amount truoc khi mark success. |
| BUG-REVIEW-002 | `registrationController.ensurePrerequisitesSatisfied`; `appealController.addClassToRegistration` | High | `MONDAHOC.qua_mon` o cung hoc ky hoac hoc ky sau van duoc tinh la da dat tien quyet. | Review chi ra helper chi check co pass row, khong so sanh hoc ky cua pass row voi hoc ky dang ky. | Da sua | Check pass row phai thuoc hoc ky ket thuc truoc ngay bat dau hoc ky muc tieu, fallback `NAMHOC.NamBatDau` + `HOCKY.ThuTu`; khong du du lieu thi tra loi ro rang. |
| BUG-REVIEW-003 | `registrationController.reserveOpenedClassSeat`; `LOPMO.SoLuongDaDangKy` | High | Row `LOPMO.SoLuongDaDangKy = NULL` khong match dieu kien `< capacity`, lam fail reserve du con cho. | Review chi ra cot nullable va du lieu cu co the NULL, trong khi code cu coi NULL nhu 0. | Da sua | Reserve seat bang atomic SQL update dung `COALESCE(SoLuongDaDangKy, 0)` cho ca increment va dieu kien capacity. |

## 5. Loi da sua truc tiep trong source

| ID bug | File da sua | Backend/frontend | Logic cu bi loi | Logic moi sau khi sua | API/validation/tinh toan/permission | Anh huong du lieu cu | Can migration | Regression |
|---|---|---|---|---|---|---|---|---|
| BUG-CORE-001 | `src/controllers/registrationController.js` | Backend | Thieu `DONGIATINCHI` van tinh bang gia hard-code. | Throw 400 `MISSING_CREDIT_PRICE`. | API + tinh hoc phi | Khong sua data cu; ngan tao/tinh moi sai gia. | Khong | REG-037, TUI-031, skeleton `REG-BUG-001` |
| BUG-CORE-002 | `src/controllers/registrationController.js`, `src/controllers/appealController.js` | Backend | Dang ky/duyet cuu xet khong check mon tien quyet. | Check `DIEUKIENMONHOC.LoaiDieuKien='tien_quyet'` va `MONDAHOC.qua_mon`. | Business validation | Khong sua data cu; chi chan request moi. | Khong | REG-024..REG-026, APP-014, skeleton `REG-BUG-002` |
| BUG-CORE-003 | `src/controllers/registrationController.js`, `src/controllers/appealController.js`, `src/utils/errorHandler.js` | Backend | Check suc chua roi increment khong atomic. | Reserve seat bang conditional update, transaction serializable, conflict tra 409. | Business validation + concurrency | Khong sua data cu; neu counter da lech can job doi soat rieng. | Khong | REG-014, REG-036, APP-015, skeleton `REG-BUG-003` |
| BUG-CORE-004 | `src/controllers/paymentController.js` | Backend | Callback cu co the update failed/unpaid thanh success. | Chi callback receipt pending; check con no truoc success. | Payment + idempotency | Khong sua data cu; ngan callback moi gay double success. | Khong | PAY-021..PAY-024, skeleton `PAY-BUG-004` |
| BUG-REVIEW-001 | `src/controllers/paymentController.js` | Backend | Success callback chua verify provider-confirmed amount. | `markOnlineResult` nhan amount callback, validate provider amount == receipt amount va receipt amount == remaining debt. | Payment validation | Khong sua data cu; mismatch moi se bi tu choi. | Khong | PAY-031, skeleton `PAY-REVIEW-001` |
| BUG-REVIEW-002 | `src/controllers/registrationController.js`, `src/controllers/appealController.js` | Backend | Pass tien quyet o cung/sau hoc ky van duoc chap nhan. | `ensurePrerequisitesSatisfied` yeu cau pass row nam truoc hoc ky muc tieu theo date hoac nam hoc + thu tu. | Business validation | Khong sua data cu; chi chan request moi. | Khong | REG-041, APP-026, skeleton `REG-REVIEW-002` |
| BUG-REVIEW-003 | `src/controllers/registrationController.js` | Backend | `SoLuongDaDangKy` NULL lam atomic reserve fail. | Atomic SQL update dung `COALESCE` de coi NULL la 0 nhung van giu guard capacity. | Business validation + concurrency | Khong sua data cu hang loat; row reserve moi se duoc normalize khi increment. | Khong | REG-042, skeleton `REG-REVIEW-003` |

## 6. Can xac nhan nghiep vu

| ID | Noi dung | Ly do chua sua |
|---|---|---|
| CONF-001 | `DIEUKIENMONHOC.LoaiDieuKien='hoc_truoc'` khi dang ky co bat buoc da qua mon hay duoc hoc dong thoi trong cung hoc ky? | Source chi dung `hoc_truoc` de validate vi tri hoc ky trong CTDT (`<=`), chua co rule runtime ro rang; neu sua bua co the chan dang ky dung nghiep vu. |
| CONF-002 | Admin dao tao/tai chinh co bi gioi han API theo `ROLE_PERMISSIONS` hay chi gioi han menu/view? | `auth.js` co `checkAdminPermission` nhung route API chi dung `adminMiddleware`; ap dung ngay co the khoa nham tai khoan admin hien tai. |
| CONF-003 | Sau khi da thanh toan thanh cong co cho phep hoan tien roi mo lai huy/dang ky khong? | Code khoa theo success payment; co ham refund nhung route chua expose. Can xac nhan workflow tai chinh. |
| CONF-004 | Hoc ky khong cau hinh cuu xet co duoc finalize/mo thu hoc phi hay bat buoc cau hinh appeal window? | `paymentRules` va `registrationWindow` dang yeu cau appeal window closed. Can xac nhan day la nghiep vu bat buoc. |
| CONF-005 | LOP.SoLuongToiDa <= 0 co nghia la vo han hay du lieu loi? | Code hien coi capacity <=0 la khong gioi han o backend; UI lai khong cho dang ky khi max=0. Can xac nhan truoc khi doi. |

## 7. Luong nghiep vu can test theo source code

### A. Admin thiet lap hoc ky

Admin tao nam hoc qua `/api/semesters/years`, tao hoc ky qua `/api/semesters`, validate day du moc ngay. Registration window phai co start/end; appeal window phai sau registration end; han dong hoc phi nam trong ngay bat dau/ket thuc hoc ky. Chuyen `TrangThai='Đang diễn ra'` bi chan neu co hoc ky khac ongoing. Finalize qua `/api/semesters/:id/finalize-registration`: chi sau appeal closed va khong co pending appeals; lop khong dat 75% capacity bi dong va cac chi tiet active cua lop do bi huy. Mo thu hoc phi qua `/open-tuition-payment`: chi sau finalize va het appeal/pending.

### B. Admin mo lop hoc phan

Mo mon hoc trong hoc ky qua `MONHOCMO`; mo lop qua `LOPMO` chi khi mon cua lop da mo. Lich hoc trong `LICHHOCLOP` phai co thu 1-7, tiet bat dau <= tiet ket thuc, phong active, giang vien active. Trung phong/giang vien/lop trong cung hoc ky bi chan bang overlap inclusive `start <= oldEnd && oldStart <= end`.

### C. Sinh vien dang ky hoc phan

Student xem `/api/registrations/available?MaHocKy=...`; backend chi tra khi dang ky/cuu xet dang mo. Dang ky `POST /api/registrations`: lay sinh vien tu token neu khong phai admin, assert window open, check payment lock, tao/lay `PHIEUDANGKY`, check trung mon, tinh loai dang ky, lay don gia, check tien quyet, trung lich, gioi han tin chi, reserve seat, tao/update `CHITIETDANGKY`, tinh lai tong.

### D. Sinh vien huy hoc phan

`PUT /api/registrations/:id/cancel`: owner/admin moi duoc huy, khong huy neu da huy, assert registration window open, khong huy neu co payment success, update detail sang canceled, giam seat neu active, tinh lai tong va trang thai phieu.

### E. Cuu xet dang ky

Student tao don `them/huy/doi` trong appeal window, khong sau chot/mo hoc phi, khong tao trung pending. Admin duyet trong transaction serializable, set bypass trigger registration window, nhung van check sau chot/mo hoc phi. Duyet them/doi chay lai rule gia, tien quyet, lich, tin chi, seat.

### F. Tinh hoc phi

Tinh trung tam tu `registrationController.recalculateRegistrationTotals`: chi lay detail active, cong tien theo loai dang ky, lay discount uu tien cao nhat, round mien giam, phai dong = max(tong - giam, 0). `tuitionController` tinh da dong/con no tu payment success/refund.

### G. Thanh toan hoc phi

Admin tao phieu thu dung con no sau khi payment window open. Student checkout receipt unpaid/failed, exact amount, thanh pending. Admin confirm chi pending va exact remaining. Callback VNPAY/ZaloPay verify signature/mac, parse amount provider confirm, chi cap nhat pending khi amount provider bang receipt va receipt bang con no hien tai.

## 8. Bang test case nghiep vu loi

| ID | Module | Luong nghiep vu | Chuc nang/rang buoc | Loai test | Tien dieu kien | Du lieu test | Cac buoc thuc hien | Ket qua mong doi | API/DB can kiem tra | Priority | Automation note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SEM-001 | Admin / Semesters | Tao nam hoc | NamKetThuc > NamBatDau | Validation | Admin token | 2026-2025 | POST year | 400 | `NAMHOC` khong tao | Critical | Supertest |
| SEM-002 | Admin / Semesters | Tao nam hoc | Dinh dang `YYYY-YYYY` | Validation | Admin token | `20262027` | POST year | 400 | `NAMHOC` | High | Supertest |
| SEM-003 | Admin / Semesters | Tao nam hoc | Trung ma nam hoc | Negative | Co nam 2025-2026 | same code | POST year | 409/400 | Unique `NAMHOC` | High | Supertest |
| SEM-004 | Admin / Semesters | Sua nam hoc | Ten rong bi chan | Validation | Co nam hoc | `TenNamHoc='   '` | PUT year | 400 | `NAMHOC` khong doi | High | Supertest |
| SEM-005 | Admin / Semesters | Xoa nam hoc | Nam hoc co hoc ky khong duoc xoa | Data integrity | Nam hoc co `HOCKY` | id nam hoc | DELETE year | 400 | `HOCKY` con | Critical | Supertest |
| SEM-006 | Admin / Semesters | Tao hoc ky | Required fields | Validation | Admin token | Thieu `MaHocKy/TenHocKy/MaNamHoc` | POST semester | 400 | `HOCKY` khong tao | Critical | Supertest |
| SEM-007 | Admin / Semesters | Tao hoc ky | Ngay bat dau < ngay ket thuc | Boundary | Admin token | start=end | POST semester | 400 | `HOCKY` | Critical | Supertest |
| SEM-008 | Admin / Semesters | Tao hoc ky | Dang ky start/end phai du cap | Validation | Admin token | chi start DK | POST semester | 400 | `HOCKY` | High | Supertest |
| SEM-009 | Admin / Semesters | Tao hoc ky | DK start < DK end | Boundary | Admin token | DK start sau DK end | POST semester | 400 | `HOCKY` | Critical | Supertest |
| SEM-010 | Admin / Semesters | Tao hoc ky | DK end truoc ngay bat dau hoc ky | Business rule | Admin token | DK end = ngay bat dau HK | POST semester | 400 | `HOCKY` | Critical | Supertest |
| SEM-011 | Admin / Semesters | Tao hoc ky | Cuu xet phai sau DK end | Business rule | Admin token | appeal start <= DK end | POST semester | 400 | `HOCKY` | High | Supertest |
| SEM-012 | Admin / Semesters | Tao hoc ky | Appeal end truoc ngay bat dau HK | Business rule | Admin token | appeal end = HK start | POST semester | 400 | `HOCKY` | High | Supertest |
| SEM-013 | Admin / Semesters | Tao hoc ky | Han dong HP trong hoc ky | Business rule | Admin token | due truoc HK start | POST semester | 400 | `HOCKY` | Critical | Supertest |
| SEM-014 | Admin / Semesters | Tao hoc ky | Chi mot hoc ky ongoing | Data integrity | Da co ongoing | Tao ongoing khac | POST semester | 400 `ONE_ACTIVE_SEMESTER` | `HOCKY` | Critical | Supertest |
| SEM-015 | Admin / Semesters | Sua hoc ky | Chuyen ongoing khi co ongoing khac | Data integrity | 2 hoc ky | PUT status | 400 | `HOCKY` | Critical | Supertest |
| SEM-016 | Admin / Semesters | Loc hoc ky | Tim theo ma/name/year/date | API | Co nhieu hoc ky | q/dateField | GET list | Tra dung page | `HOCKY` | Medium | Supertest |
| SEM-017 | Admin / Semesters | Registration options | Chi hoc ky co window DK | API | Co HK co/khong DK | GET options | Chi HK co start/end | `HOCKY` | High | Supertest |
| SEM-018 | Admin / Semesters | Finalize | Chua het appeal khong chot | Business rule | Appeal window open | POST finalize | 400 | `NgayChotDangKy` null | Critical | Supertest |
| SEM-019 | Admin / Semesters | Finalize | Pending appeals khong chot | Business rule | Co `DONCUUXETDANGKY.cho_duyet` | POST finalize | 400 | `HOCKY` | Critical | Supertest |
| SEM-020 | Admin / Semesters | Finalize | Lop du 75% duoc mo | Happy path | Lop capacity 40, reg 30 | POST finalize | Lop active | `LOPMO.TrangThai=true` | High | Supertest |
| SEM-021 | Admin / Semesters | Finalize | Lop duoi 75% bi dong | Business rule | Lop capacity 40, reg 20 | POST finalize | Detail bi huy | `CHITIETDANGKY`, `LOPMO` | Critical | Supertest |
| SEM-022 | Admin / Semesters | Finalize | Recalculate tuition sau huy lop | Data integrity | SV co lop bi dong | POST finalize | Tong tien giam | `PHIEUDANGKY` | Critical | Supertest |
| SEM-023 | Admin / Semesters | Finalize | Set `NgayChotDangKy`, `MoThuHocPhi=false` | Data integrity | HK hop le | POST finalize | Field dung | `HOCKY` | High | Supertest |
| SEM-024 | Admin / Semesters | Open tuition | Chua finalize khong mo thu | Business rule | `NgayChotDangKy=null` | POST open tuition | 400 | `MoThuHocPhi=false` | Critical | Supertest |
| SEM-025 | Admin / Semesters | Open tuition | Pending appeal khong mo thu | Business rule | Co pending | POST open tuition | 400 | `HOCKY` | Critical | Supertest |
| SEM-026 | Admin / Semesters | Open tuition | Happy path mo thu | Happy path | Da finalize, no pending | POST open tuition | `MoThuHocPhi=true` | `NgayMoThuHocPhi` | Critical | Supertest |
| SEM-027 | Admin / Semesters | Close tuition | Khoa thu | Happy path | `MoThuHocPhi=true` | POST close | `MoThuHocPhi=false` | `HOCKY` | High | Supertest |
| SEM-028 | Admin / Semesters | Xoa hoc ky | Hoc ky co PDK/LOPMO active bi trigger chan | Data integrity | Co child active | DELETE semester | 400/trigger | `HOCKY.DaXoa=false` | Critical | Supertest |
| SEM-029 | Admin / Semesters | Date parsing | Date khong ton tai | Validation | Admin | `2026-02-31` | POST/PUT | 400 | `HOCKY` | High | Supertest |
| SEM-030 | Admin / Semesters | Permission | Student khong tao/sua/chot | Permission | Student token | POST/PUT | 403 | API only | Critical | Supertest |
| CLS-001 | Admin / Classes | Tao lop | Required MaLop/TenLop/MaMonHoc | Validation | Admin | Thieu field | POST class | 400 | `LOP` | Critical | Supertest |
| CLS-002 | Admin / Classes | Tao lop | Mon hoc ton tai active | Validation | Admin | MaMonHoc sai | POST | 400 | `LOP` | High | Supertest |
| CLS-003 | Admin / Classes | Tao lop | Trung MaLop | Negative | Co lop | same MaLop | POST | 400 | `LOP` | High | Supertest |
| CLS-004 | Admin / Classes | Tao lop | Thu 1-7 | Validation | Admin | Thu=8 | POST | 400 | `LOP` | High | Supertest |
| CLS-005 | Admin / Classes | Tao lop | Tiet bat dau <= ket thuc | Boundary | Co TIETHOC | start after end | POST | 400 | `LOP` | High | Supertest |
| CLS-006 | Admin / Classes | Tao lop | Tiet ton tai active | Validation | Admin | MaTiet invalid | POST | 400 | `LOP` | High | Supertest |
| CLS-007 | Admin / Classes | Tao lop | Phong active | Validation | Admin | MaPhong khoa | POST | 400 | `LOP` | High | Supertest |
| CLS-008 | Admin / Classes | Tao lop | Giang vien active | Validation | Admin | MaGV khoa | POST | 400 | `LOP` | High | Supertest |
| CLS-009 | Admin / Classes | Catalog schedule | Trung phong cung tiet | Business rule | Lop A phong P tiet 1-3 | Tao B P tiet 2-4 | 409 | `LOP` | Critical | Supertest |
| CLS-010 | Admin / Classes | Catalog schedule | Trung GV cung tiet | Business rule | Lop A GV G tiet 1-3 | Tao B G tiet 3-5 | 409 inclusive | `LOP` | Critical | Supertest |
| CLS-011 | Admin / Classes | Catalog schedule | Giao bien tiet la trung | Boundary | A tiet 1-3 | B tiet 3-5 | 409 | `LOP` | Critical | Supertest |
| CLS-012 | Admin / Classes | Catalog schedule | Khac ngay khong trung | Happy path | A thu 2 | B thu 3 | 201 | `LOP` | Medium | Supertest |
| CLS-013 | Admin / Classes | Sua lop | Khong cho ten rong | Validation | Co lop | TenLop spaces | PUT | 400 | `LOP` | Medium | Supertest |
| CLS-014 | Admin / Classes | Xoa lop | Soft delete | Happy path | Lop chua dung | DELETE | `DaXoa=true` | `LOP` | Medium | Supertest |
| CLS-015 | Admin / Open Courses | Mo mon | Required hoc ky/mon | Validation | Admin | Thieu field | POST open-course | 400 | `MONHOCMO` | Critical | Supertest |
| CLS-016 | Admin / Open Courses | Mo mon | Hoc ky ton tai | Validation | Admin | MaHocKy sai | POST | 404 | `MONHOCMO` | High | Supertest |
| CLS-017 | Admin / Open Courses | Mo mon | Mon active | Validation | Mon khoa | POST | 400 | `MONHOCMO` | High | Supertest |
| CLS-018 | Admin / Open Courses | Mo mon | Trung mon/hoc ky | Data integrity | Da co MHM | POST | upsert/restore dung | `MONHOCMO` | High | Supertest |
| CLS-019 | Admin / Open Courses | Tat/xoa mon | Co lop mo active khong duoc tat/xoa | Business rule | Co LOPMO active | PUT/delete | 400 | `MONHOCMO` | Critical | Supertest |
| CLS-020 | Admin / Classes | Mo lop | Mon cua lop phai da mo | Business rule | Chua MONHOCMO | POST `/classes/open` | 400 | `LOPMO` | Critical | Supertest |
| CLS-021 | Admin / Classes | Mo lop | Required GV/phong/lich | Validation | Admin | Thieu MaPhong | POST open | 400 | `LOPMO` | High | Supertest |
| CLS-022 | Admin / Classes | Mo lop | Lop active ton tai | Validation | Lop deleted | POST open | 404 | `LOPMO` | High | Supertest |
| CLS-023 | Admin / Classes | Mo lop | Trung lop trong hoc ky | Negative | LOPMO active | POST open same | 400 | `LOPMO` | High | Supertest |
| CLS-024 | Admin / Classes | Mo lop | Trung phong lop mo | Business rule | Lop mo A phong P | Mo B phong P overlap | 409 | `LICHHOCLOP` | Critical | Supertest |
| CLS-025 | Admin / Classes | Mo lop | Trung GV lop mo | Business rule | Lop mo A GV G | Mo B GV G overlap | 409 | `LICHHOCLOP` | Critical | Supertest |
| CLS-026 | Admin / Classes | Lich lop mo | Them lich khac ngay | Happy path | LOPMO active | POST schedule | 200 | `LICHHOCLOP` | Medium | Supertest |
| CLS-027 | Admin / Classes | Lich lop mo | Sua lich exclude schedule id | Regression | Co schedule | PUT same id | 200 | `LICHHOCLOP` | Medium | Supertest |
| CLS-028 | Admin / Classes | Dong lop | Dong lich active | Data integrity | LOPMO co schedule | DELETE opened | `TrangThai=false` | `LOPMO`, `LICHHOCLOP` | High | Supertest |
| CLS-029 | Admin / Classes | Danh sach SV lop | Chi detail active | API | Co active+canceled | GET students | Chi active | `CHITIETDANGKY` | Medium | Supertest |
| CLS-030 | Admin / Classes | Permission | Student khong CRUD lop | Permission | Student token | POST/PUT/DELETE | 403 | API | Critical | Supertest |
| REG-001 | Student / Course Registration | Xem lop mo | Phai chon hoc ky | Validation | Student token | No MaHocKy | GET available | 400 | API | High | Supertest |
| REG-002 | Student / Course Registration | Xem lop mo | Hoc ky ton tai | Validation | Student | MaHocKy sai | GET | 404 | `HOCKY` | High | Supertest |
| REG-003 | Student / Course Registration | Xem lop mo | Ngoai window DK/cuu xet | Business rule | HK chua mo | GET | 400 `REGISTRATION_WINDOW_CLOSED` | API | High | Supertest |
| REG-004 | Student / Course Registration | Xem lop mo | Student khong tra cuu MaSv khac | Permission | SV A token | `MaSv=SVB` | GET | 403 | API | Critical | Supertest |
| REG-005 | Student / Course Registration | Xem lop mo | Loc theo mon | API | Co lop mo | search course | GET | Dung data | `LOPMO` | Medium | Supertest |
| REG-006 | Student / Course Registration | Xem lop mo | Loc theo giang vien | API | Co GV | searchScope lecturer | GET | Dung data | `LOPMO` | Medium | Supertest |
| REG-007 | Student / Course Registration | Xem lop mo | Loc theo tiet invalid | Validation | Student | MaTiet sai | GET | 400 | `TIETHOC` | Medium | Supertest |
| REG-008 | Student / Course Registration | Dang ky | Required MaHocKy/MaLop | Validation | Student | Thieu MaLop | POST | 400 | API | Critical | Supertest |
| REG-009 | Student / Course Registration | Dang ky | Student khong dang ky cho SV khac | Permission | SV A | body MaSv=SVB | POST | 403 | `PHIEUDANGKY` | Critical | Supertest |
| REG-010 | Student / Course Registration | Dang ky | Lop chua mo | Validation | Student | MaLop khong co LOPMO | POST | 404 | `LOPMO` | High | Supertest |
| REG-011 | Student / Course Registration | Dang ky | Ngoai han DK | Business rule | HK closed | POST | 400 | `PHIEUDANGKY` | Critical | Supertest |
| REG-012 | Student / Course Registration | Dang ky | Hoc ky da ket thuc | Business rule | `TrangThai=Đã kết thúc` | POST | 400 | `PHIEUDANGKY` | Critical | Supertest |
| REG-013 | Student / Course Registration | Dang ky | Lop day theo active count | Boundary | SoLuongToiDa=1, active=1 | POST | 400 | `CHITIETDANGKY` | Critical | Supertest |
| REG-014 | Student / Course Registration | Dang ky | Race slot cuoi | Concurrency | Capacity=1 | 2 POST song song | 1 success, 1 fail | `LOPMO`, detail <=1 | Critical | Regression for BUG-CORE-003; Supertest |
| REG-015 | Student / Course Registration | Dang ky | Trung mon khac lop | Business rule | Da DK mon M lop A | POST lop B cung mon | 400 | `CHITIETDANGKY` | Critical | Supertest |
| REG-016 | Student / Course Registration | Dang ky | Trung lop/double click | Regression | Da DK lop | POST lai | 400/409 | Unique `uq_ctdk` | Critical | Supertest |
| REG-017 | Student / Course Registration | Dang ky | Trung lich cung thu overlap | Business rule | Da DK tiet 1-3 | DK tiet 2-4 | 400 | `CHITIETDANGKY` | Critical | Supertest |
| REG-018 | Student / Course Registration | Dang ky | Giao bien tiet trung | Boundary | Da DK tiet 1-3 | DK tiet 3-5 | 400 | `CHITIETDANGKY` | Critical | Supertest |
| REG-019 | Student / Course Registration | Dang ky | Khac thu khong trung | Happy path | Da DK thu 2 | DK thu 3 | 201 | `CHITIETDANGKY` | High | Supertest |
| REG-020 | Student / Course Registration | Dang ky | Vuot max tin chi THAMSO | Boundary | SV da gan max | DK them | 400 | `PHIEUDANGKY.TongTinChi` | Critical | Supertest |
| REG-021 | Student / Course Registration | Dang ky | Anh Van chua dat bi gioi han tin chi | Business rule | Qua nam check, thieu ENG | DK vuot limit | 400 | `THAMSO`, `MONDAHOC` | High | Supertest |
| REG-022 | Student / Course Registration | Dang ky | Qua ENG duoc max binh thuong | Happy path | Da qua ENG | DK den normal max | 201 | `PHIEUDANGKY` | Medium | Supertest |
| REG-023 | Student / Course Registration | Dang ky | Hoc lai khi co `rot` | Business rule | `MONDAHOC.rot` | POST | `LoaiDangKy=hoc_lai` | `CHITIETDANGKY` | High | Supertest |
| REG-024 | Student / Course Registration | Dang ky | Cai thien khi da qua mon | Business rule | `MONDAHOC.qua_mon` | POST | `LoaiDangKy=hoc_cai_thien` | `CHITIETDANGKY` | High | Supertest |
| REG-025 | Student / Course Registration | Dang ky | Tien quyet chua qua bi chan | Regression | Co `DIEUKIENMONHOC.tien_quyet`, no qua_mon | POST | 400 `PREREQUISITE_NOT_SATISFIED` | `DIEUKIENMONHOC` | Critical | Regression for BUG-CORE-002; Supertest |
| REG-026 | Student / Course Registration | Dang ky | Tien quyet da qua cho dang ky | Happy path | `MONDAHOC.qua_mon` required | POST | 201 | `CHITIETDANGKY` | Critical | Supertest |
| REG-027 | Student / Course Registration | Dang ky | Hoc he dung don gia hoc_he | Business rule | HK he, hoc_moi | POST | DonGia hoc_he | `DONGIATINCHI` | Critical | Supertest |
| REG-028 | Student / Course Registration | Dang ky | Hoc lai dung don gia hoc_lai | Business rule | Co rot | POST | DonGia hoc_lai | `CHITIETDANGKY` | Critical | Supertest |
| REG-029 | Student / Course Registration | Dang ky | Cai thien dung don gia | Business rule | Co qua_mon | POST | DonGia hoc_cai_thien | `CHITIETDANGKY` | Critical | Supertest |
| REG-030 | Student / Course Registration | Dang ky | Tinh mien giam sau dang ky | Data integrity | SV co doi tuong | POST | TongTienPhaiDong dung | `PHIEUDANGKY` | Critical | Supertest |
| REG-031 | Student / Course Registration | Dang ky | Nhieu doi tuong lay uu tien nho nhat | Business rule | SV co 2 doi tuong | POST | TiLeGiam cua DoUuTien min | `DOITUONGSINHVIEN` | High | Supertest |
| REG-032 | Student / Course Registration | Dang ky | Payment success khoa dang ky them | Business rule | PDK co receipt success | POST them | 400 | `PHIEUTHUHOCPHI` | Critical | Supertest |
| REG-033 | Student / Course Registration | Dang ky | Admin dang ky thay | Permission | Admin token | Body MaSv | POST | 201 | `PHIEUDANGKY` | Medium | Supertest |
| REG-034 | Student / Course Registration | Dang ky | Phieu moi duoc tao dung hoc ky | Data integrity | SV chua PDK | POST | 1 PDK | `PHIEUDANGKY` unique | High | Supertest |
| REG-035 | Student / Course Registration | Dang ky | Phieu cu duoc dung lai | Data integrity | SV da co PDK | POST | Khong tao PDK moi | `PHIEUDANGKY` | High | Supertest |
| REG-036 | Student / Course Registration | Dang ky | `SoLuongDaDangKy` tang dung 1 | Regression | Lop con cho | POST | Counter +1 | `LOPMO` | High | Regression for BUG-CORE-003; Supertest |
| REG-037 | Student / Course Registration | Dang ky | Thieu don gia bi chan | Regression | Khong co price hoc ky/default | POST | 400 `MISSING_CREDIT_PRICE` | `DONGIATINCHI` | Critical | Regression for BUG-CORE-001; Supertest |
| REG-038 | Student / Course Registration | Dang ky | Don gia default duoc dung neu hoc ky khong co | Happy path | Co default price | POST | DonGia default | `CHITIETDANGKY` | High | Supertest |
| REG-039 | Student / Course Registration | Dang ky | API fail hien message UI | UI/API | Mock 400 | Click dang ky | Toast loi | Browser | Medium | Playwright |
| REG-040 | Student / Course Registration | Dang ky | Token invalid bi 401 | Permission | No/invalid token | GET/POST | 401 | API | Critical | Supertest |
| REG-041 | Student / Course Registration | Dang ky | Pass tien quyet cung/sau hoc ky khong hop le | Regression | `MONDAHOC.qua_mon` cua prereq nam cung hoac sau target HK | POST | 400 `PREREQUISITE_NOT_SATISFIED` hoac `PREREQUISITE_SEMESTER_ORDER_UNKNOWN` neu thieu du lieu thu tu | `MONDAHOC.HOCKY`, `DIEUKIENMONHOC` | Critical | Regression for BUG-REVIEW-002; Supertest |
| REG-042 | Student / Course Registration | Dang ky | `SoLuongDaDangKy` NULL van reserve duoc neu con cho | Regression | Lop capacity > active count, `LOPMO.SoLuongDaDangKy=NULL` | POST | 201, counter thanh 1, khong vuot capacity | `LOPMO`, `CHITIETDANGKY` | High | Regression for BUG-REVIEW-003; Supertest |
| CAN-001 | Student / My Courses | Xem mon da DK | Chi xem cua minh | Permission | SV A, SV B | GET SVB | 403 | API | Critical | Supertest |
| CAN-002 | Student / My Courses | Xem mon da DK | Loc theo hoc ky | API | SV nhieu HK | MaHocKy | Chi HK do | `PHIEUDANGKY` | Medium | Supertest |
| CAN-003 | Student / My Courses | Xem mon da DK | Khong tinh canceled khi includeCancelled=false | API | Co canceled | GET | Chi active | `CHITIETDANGKY` | High | Supertest |
| CAN-004 | Student / My Courses | Huy | Owner huy trong han | Happy path | Active detail, window open | PUT cancel | 200 | detail canceled | Critical | Supertest |
| CAN-005 | Student / My Courses | Huy | Huy detail khong ton tai | Negative | id sai | PUT | 404 | DB | High | Supertest |
| CAN-006 | Student / My Courses | Huy | Huy cua SV khac bi chan | Permission | SV A token, detail SV B | PUT | 403 | DB | Critical | Supertest |
| CAN-007 | Student / My Courses | Huy | Huy ngoai han DK | Business rule | Window closed | PUT | 400 | Detail active | Critical | Supertest |
| CAN-008 | Student / My Courses | Huy | Huy khi da payment success | Business rule | PDK success | PUT | 400 | Detail active | Critical | Supertest |
| CAN-009 | Student / My Courses | Huy | Huy khi hoc ky ended | Business rule | HK ended | PUT | 400 | Detail active | High | Supertest |
| CAN-010 | Student / My Courses | Huy | Huy lai detail da huy | Negative | Detail canceled | PUT | 400 | DB | Medium | Supertest |
| CAN-011 | Student / My Courses | Huy | Giam SoLuongDaDangKy dung 1 | Data integrity | Counter >0 | PUT | Counter -1 | `LOPMO` | Critical | Supertest |
| CAN-012 | Student / My Courses | Huy | Khong giam counter am | Boundary | Counter 0 | PUT canceled/admin? | Khong am | `LOPMO` | High | Supertest |
| CAN-013 | Student / My Courses | Huy | Tinh lai tong tien | Data integrity | PDK 2 mon | Huy 1 | Tong giam | `PHIEUDANGKY` | Critical | Supertest |
| CAN-014 | Student / My Courses | Huy | Huy mon cuoi doi trang thai phieu | Boundary | PDK 1 mon | Huy | PDK canceled | `PHIEUDANGKY.TrangThai` | High | Supertest |
| CAN-015 | Student / My Courses | Huy | Huy 1 trong nhieu mon | Happy path | PDK 3 mon | Huy 1 | Con 2 active | `CHITIETDANGKY` | High | Supertest |
| CAN-016 | Student / My Courses | Huy | Admin huy thay | Permission | Admin token | PUT | 200 | `LyDoHuy=Admin` | Medium | Supertest |
| CAN-017 | Student / My Courses | Huy | UI nut huy an khi payment lock | UI | PDK success | Load page | Nut disabled | Browser | High | Playwright |
| CAN-018 | Student / My Courses | Huy | UI goi cuu xet khi ngoai han nhung appeal open | UI | Appeal open | Load page | Nut gui don | Browser | Medium | Playwright |
| CAN-019 | Student / My Courses | Huy | API fail hien toast | UI/API | Mock 400 | Click huy | Toast loi | Browser | Medium | Playwright |
| CAN-020 | Student / My Courses | Huy | Double click huy khong loi data | Concurrency | Active detail | 2 PUT song song | 1 success, 1 400 | Detail canceled 1 lan | High | Supertest |
| APP-001 | Appeals | Tao don | Required MaSv/MaHocKy/LyDo | Validation | Student | Thieu LyDo | POST | 400 | `DONCUUXETDANGKY` | High | Supertest |
| APP-002 | Appeals | Tao don | LoaiDon hop le | Validation | Student | `LoaiDon=x` | POST | 400 | DB | High | Supertest |
| APP-003 | Appeals | Tao them | Can MaLopThem, khong MaLopHuy | Validation | Student | Sai payload | POST | 400 | DB | High | Supertest |
| APP-004 | Appeals | Tao huy | Can MaLopHuy, khong MaLopThem | Validation | Student | Sai payload | POST | 400 | DB | High | Supertest |
| APP-005 | Appeals | Tao doi | Can ca hai lop | Validation | Student | Thieu MaLopThem | POST | 400 | DB | High | Supertest |
| APP-006 | Appeals | Tao don | Student khong gui cho SV khac | Permission | SV A | MaSv SVB | POST | 403 | DB | Critical | Supertest |
| APP-007 | Appeals | Tao don | Ngoai appeal window | Business rule | Appeal closed | POST | 400 | DB | Critical | Supertest |
| APP-008 | Appeals | Tao don | Sau chot DK bi chan | Business rule | `NgayChotDangKy` set | POST | 400 | DB | Critical | Supertest |
| APP-009 | Appeals | Tao don | Sau mo thu hoc phi bi chan | Business rule | `MoThuHocPhi=true` | POST | 400 | DB | Critical | Supertest |
| APP-010 | Appeals | Tao huy | Lop huy phai thuoc PDK active | Business rule | MaLopHuy khong active | POST | 400 | DB | High | Supertest |
| APP-011 | Appeals | Tao them | Lop them phai mo | Business rule | Lop chua mo | POST | 404 | `LOPMO` | High | Supertest |
| APP-012 | Appeals | Tao don | Khong tao trung pending | Data integrity | Co pending same | POST | 400 | Unique partial | High | Supertest |
| APP-013 | Appeals | Duyet them | Chay rule trung mon | Business rule | Da DK mon | Approve them same mon | 400 | DB rollback | Critical | Supertest |
| APP-014 | Appeals | Duyet them | Chay rule tien quyet | Regression | Thieu prereq | Approve | 400 `PREREQUISITE_NOT_SATISFIED` | DB rollback | Critical | Regression for BUG-CORE-002 |
| APP-015 | Appeals | Duyet them | Chay rule lop day atomic | Regression | Slot cuoi | 2 approve/add | 1 success | `LOPMO` <= capacity | Critical | Regression for BUG-CORE-003 |
| APP-016 | Appeals | Duyet them | Chay rule trung lich | Business rule | Existing overlap | Approve | 400 | DB rollback | Critical | Supertest |
| APP-017 | Appeals | Duyet them | Chay rule vuot tin chi | Business rule | Near max | Approve | 400 | DB rollback | Critical | Supertest |
| APP-018 | Appeals | Duyet huy | Huy detail va tinh lai tong | Happy path | Don huy pending | PUT approve | Detail canceled | `PHIEUDANGKY` | High | Supertest |
| APP-019 | Appeals | Duyet doi | Cancel old, add new trong transaction | Happy path | Don doi pending | Approve | Old canceled, new active | DB | High | Supertest |
| APP-020 | Appeals | Duyet doi | Add fail thi old rollback | Data integrity | New class invalid | Approve | Old van active | DB | Critical | Supertest |
| APP-021 | Appeals | Reject | Bat buoc ly do tu choi | Validation | Pending | PUT reject no reason | 400 | DB | Medium | Supertest |
| APP-022 | Appeals | Reject | Chi reject pending | Negative | Approved | PUT reject | 400 | DB | Medium | Supertest |
| APP-023 | Appeals | Cancel | Student chi huy don minh | Permission | SV A, don SV B | PUT cancel | 403 | DB | Critical | Supertest |
| APP-024 | Appeals | Cancel | Chi huy pending | Business rule | Approved/rejected | PUT cancel | 400 | DB | High | Supertest |
| APP-025 | Appeals | List | Admin loc MaHocKy/TrangThai/search | API | Nhieu don | GET | Dung pagination | `DONCUUXETDANGKY` | Medium | Supertest |
| APP-026 | Appeals | Duyet them | Tien quyet phai truoc hoc ky target | Regression | Don them lop, prereq pass cung/sau HK | Approve | 400, don khong duyet, DB rollback | `DONCUUXETDANGKY`, `MONDAHOC.HOCKY` | Critical | Regression for BUG-REVIEW-002; Supertest |
| TUI-001 | Tuition | Admin list | Loc hoc ky | API | Co PDK nhieu HK | GET `MaHocKy` | Dung rows | `PHIEUDANGKY` | Medium | Supertest |
| TUI-002 | Tuition | Admin list | Loc status paid | API | Co success | status=paid | Chi da dong du | Payments | Medium | Supertest |
| TUI-003 | Tuition | Student list | Student chi xem minh | Permission | SV A/B | GET SVB | 403 | API | Critical | Supertest |
| TUI-004 | Tuition | Detail | Owner/admin duoc xem | Permission | PDK SV A | GET detail | 200 | API | High | Supertest |
| TUI-005 | Tuition | Detail | Student khong xem detail SV khac | Permission | SV B token | GET detail SV A | 403 | API | Critical | Supertest |
| TUI-006 | Tuition | Calculate | Required MaSv/MaHocKy | Validation | Admin | Thieu field | POST calculate | 400 | API | High | Supertest |
| TUI-007 | Tuition | Calculate | PDK khong ton tai | Negative | No PDK | POST | 404 | DB | Medium | Supertest |
| TUI-008 | Tuition | Formula | Tong dong = SoTinChi*DonGia | Data integrity | PDK 2 mon | calculate | Tong dung | `CHITIETDANGKY` | Critical | Unit/Supertest |
| TUI-009 | Tuition | Formula | Canceled detail khong tinh | Data integrity | 1 active 1 canceled | calculate | Chi active | `PHIEUDANGKY` | Critical | Supertest |
| TUI-010 | Tuition | Formula | Hoc moi bucket dung | Data integrity | hoc_moi | calculate | `SoTinChiHocMoi` dung | DB | High | Supertest |
| TUI-011 | Tuition | Formula | Hoc lai bucket dung | Data integrity | hoc_lai | calculate | `TienHocLai` dung | DB | High | Supertest |
| TUI-012 | Tuition | Formula | Cai thien bucket dung | Data integrity | hoc_cai_thien | calculate | `TienHocCaiThien` dung | DB | High | Supertest |
| TUI-013 | Tuition | Don gia | Loai LT dung gia LT | Business rule | Gia LT | Register/calc | DonGia LT | DB | Critical | Supertest |
| TUI-014 | Tuition | Don gia | Loai TH dung gia TH | Business rule | Gia TH | Register/calc | DonGia TH | DB | Critical | Supertest |
| TUI-015 | Tuition | Don gia | Hoc he dung hoc_he | Business rule | HK he | Register/calc | DonGia hoc_he | DB | Critical | Supertest |
| TUI-016 | Tuition | Don gia | Gia hoc ky uu tien default | Business rule | Co default + HK | Register | Dung HK price | DB | Critical | Supertest |
| TUI-017 | Tuition | Don gia | Default dung khi khong co HK price | Happy path | Co default | Register | Dung default | DB | High | Supertest |
| TUI-018 | Tuition | Mien giam | SV khong doi tuong ti le 0 | Business rule | No DTSV | calculate | TiLeGiam=0 | DB | High | Supertest |
| TUI-019 | Tuition | Mien giam | Giam 50% | Business rule | DTSV 50 | calculate | PhaiDong 50% | DB | Critical | Supertest |
| TUI-020 | Tuition | Mien giam | Giam 100% | Boundary | DTSV 100 | calculate | PhaiDong 0 | DB | Critical | Supertest |
| TUI-021 | Tuition | Mien giam | Nhieu doi tuong lay uu tien | Business rule | 2 DTSV | calculate | Ti le cua priority min | DB | High | Supertest |
| TUI-022 | Tuition | Mien giam | Doi tuong inactive khong tinh | Business rule | DTSV inactive | calculate | TiLeGiam 0/doi tuong khac | DB | High | Supertest |
| TUI-023 | Tuition | Rounding | Round tien mien giam | Boundary | Tong le | calculate | round dung | DB | Medium | Unit |
| TUI-024 | Tuition | Paid | Success payment cong da dong | Data integrity | Receipt success | GET tuition | DaDong dung | `PHIEUTHUHOCPHI` | Critical | Supertest |
| TUI-025 | Tuition | Refund | Refund tru da dong | Data integrity | Success+refund | GET | DaDong net | DB | High | Supertest |
| TUI-026 | Tuition | Con no | Da dong + con no = phai dong | Data integrity | Partial if co | GET | Equation dung | DB | Critical | Supertest |
| TUI-027 | Tuition | Qua han | Due date qua han | Business rule | HanDong < now, con no | GET | TrangThai Qua han | API | High | Supertest |
| TUI-028 | Tuition | Gia han | Hoc lai/cai thien them 2 thang | Business rule | Detail hoc_lai | GET | Han effective +2 months | API | Medium | Supertest |
| TUI-029 | Tuition | Payment window | CoTheThanhToan false khi chua mo | Business rule | MoThu=false | GET | false + reason | API | Critical | Supertest |
| TUI-030 | Tuition | Payment window | CoTheThanhToan true khi mo va co receipt | Happy path | Open + unpaid receipt | GET | true | API | Critical | Supertest |
| TUI-031 | Tuition | Missing price | Thieu don gia khong tinh fallback | Regression | No price | Register/calc | 400 | DB | Critical | Regression for BUG-CORE-001 |
| TUI-032 | Tuition | Reprice | Sua price recalc detail active | Data integrity | Detail active | PUT pricing | Detail updated | DB | High | Supertest |
| TUI-033 | Tuition | Reprice | Canceled detail khong recalc/tinh | Data integrity | Detail canceled | PUT pricing | Tong khong tinh | DB | Medium | Supertest |
| TUI-034 | Tuition | Detail | Courses include LoaiDangKyLabel | API | PDK active | GET detail | Label dung | API | Low | Supertest |
| TUI-035 | Tuition | Stats | Tong amount/paid/remaining | API | Nhieu PDK | GET stats | Sum dung | DB | High | Supertest |
| TUI-036 | Tuition | Admin calculate | Sau huy cap nhat tien | Regression | Huy 1 mon | calculate | Tong giam | DB | Critical | Supertest |
| TUI-037 | Tuition | Cuu xet add | Mon duyet them duoc tinh | Business rule | Appeal add approved | GET tuition | Include new detail | DB | High | Supertest |
| TUI-038 | Tuition | Cuu xet rejected | Don tu choi khong tinh | Business rule | Appeal rejected | GET tuition | No change | DB | High | Supertest |
| TUI-039 | Tuition | Finalize cancel | Lop bi dong khong tinh | Regression | Finalize closed class | GET tuition | Detail canceled excluded | DB | Critical | Supertest |
| TUI-040 | Tuition | Permission | Student khong call admin list/calculate | Permission | Student token | GET `/api/tuition`/POST calc | 403 | API | Critical | Supertest |
| PAY-001 | Payments | Admin create receipt | Required PDK or MaSv+MaHocKy | Validation | Admin | Empty body | POST | 400 | DB | Critical | Supertest |
| PAY-002 | Payments | Admin create receipt | Registration ton tai | Validation | Admin | SoPhieu sai | POST | 404 | DB | High | Supertest |
| PAY-003 | Payments | Admin create receipt | Amount >0 | Validation | Admin | 0/-1/NaN | POST | 400 | DB | Critical | Supertest |
| PAY-004 | Payments | Admin create receipt | Amount phai bang con no | Business rule | Con no 1tr | SoTien 500k | 400 | DB | Critical | Supertest |
| PAY-005 | Payments | Admin create receipt | Chua finalize khong tao | Business rule | No NgayChot | POST | 400 | DB | Critical | Supertest |
| PAY-006 | Payments | Admin create receipt | Chua mo thu khong tao | Business rule | MoThu=false | POST | 400 | DB | Critical | Supertest |
| PAY-007 | Payments | Admin create receipt | Con pending appeal khong tao | Business rule | Pending appeal | POST | 400 | DB | Critical | Supertest |
| PAY-008 | Payments | Admin create receipt | Trung active receipt bi chan | Data integrity | Co unpaid/pending/success | POST | 400 | `PHIEUTHUHOCPHI` | Critical | Supertest |
| PAY-009 | Payments | Bulk create | Tao receipt cho SV con no | Happy path | Nhieu PDK | POST bulk | Created count | DB | High | Supertest |
| PAY-010 | Payments | Bulk create | Bo qua PDK khong no | Business rule | Paid PDK | POST bulk | skipped | DB | Medium | Supertest |
| PAY-011 | Payments | Student payments | Student chi xem minh | Permission | SV A/B | GET SVB | 403 | API | Critical | Supertest |
| PAY-012 | Payments | Checkout | Receipt ton tai | Validation | Student | id sai | POST checkout | 404 | DB | High | Supertest |
| PAY-013 | Payments | Checkout | Owner receipt | Permission | SV B | Checkout receipt SV A | 403 | DB | Critical | Supertest |
| PAY-014 | Payments | Checkout | Success receipt khong checkout lai | Negative | Receipt success | POST | 400 | DB | Critical | Supertest |
| PAY-015 | Payments | Checkout | Pending receipt khong checkout lai | Negative | Receipt pending | POST | 400 | DB | High | Supertest |
| PAY-016 | Payments | Checkout | Canceled receipt khong checkout | Negative | Receipt canceled | POST | 400 | DB | High | Supertest |
| PAY-017 | Payments | Checkout | Requested amount phai bang receipt | Validation | Receipt 1tr | SoTien 999k | 400 | DB | Critical | Supertest |
| PAY-018 | Payments | Checkout | Receipt amount phai bang con no | Data integrity | Con no doi sau receipt | POST | 400 | DB | Critical | Supertest |
| PAY-019 | Payments | Checkout | QR tao pending | Happy path | unpaid receipt | method qr | Pending + qrPayload | DB | High | Supertest |
| PAY-020 | Payments | Checkout | VNPAY tao URL | Happy path | unpaid receipt | method vnpay | Pending + checkoutUrl | DB | High | Supertest |
| PAY-021 | Payments | Callback | VNPAY signature sai bi tu choi | Security | Pending receipt | Bad signature | 400/Rsp97 | DB no change | Critical | Supertest |
| PAY-022 | Payments | Callback | Pending success thanh success | Happy path | Pending receipt | Valid callback 00 | Success | DB | Critical | Supertest |
| PAY-023 | Payments | Callback | Callback lap lai success idempotent | Regression | Already success | Valid callback | Khong double | DB one success | Critical | Regression for BUG-CORE-004 |
| PAY-024 | Payments | Callback | Failed/unpaid khong bi stale callback doi success | Regression | Failed receipt + paid other | Valid old callback | Failed giu nguyen | DB | Critical | Regression for BUG-CORE-004 |
| PAY-031 | Payments | Callback | Provider amount mismatch bi tu choi | Regression | Pending receipt 1,000,000; gateway callback amount 900,000 | VNPAY/ZaloPay success callback hop le signature/mac | Khong mark success, receipt van pending, VNPAY IPN tra `RspCode=04` hoac return API 400 | `PHIEUTHUHOCPHI` | Critical | Regression for BUG-REVIEW-001; Supertest |
| PAY-025 | Payments | Confirm | Chi pending duoc confirm | Business rule | unpaid receipt | PUT confirm | 400 | DB | High | Supertest |
| PAY-026 | Payments | Confirm | Amount phai bang con no | Data integrity | Pending stale amount | PUT confirm | 400 | DB | Critical | Supertest |
| PAY-027 | Payments | Confirm | Success khoa dang ky/huy | Business rule | Confirm success | Try register/cancel | 400 | DB | Critical | Supertest |
| PAY-028 | Payments | Fail | Chi pending duoc fail | Business rule | unpaid/success/cancel | PUT fail | 400 | DB | High | Supertest |
| PAY-029 | Payments | Cancel | Khong cancel success | Business rule | success receipt | PUT cancel | 400 | DB | Critical | Supertest |
| PAY-030 | Payments | Export/stats | Sum success only | API | Mixed statuses | GET stats/export | Sum dung | DB | Medium | Supertest |
| PRC-001 | Pricing | Create | Required LoaiMon/LoaiHoc/DonGia | Validation | Admin | Missing | POST | 400 | `DONGIATINCHI` | Critical | Supertest |
| PRC-002 | Pricing | Create | DonGia >0 | Validation | Admin | 0/-1/NaN | POST | 400 | DB | Critical | Supertest |
| PRC-003 | Pricing | Create | LoaiMon LT/TH | Validation | Admin | `BT` | POST | 400 | DB | High | Supertest |
| PRC-004 | Pricing | Create | LoaiHoc hop le | Validation | Admin | `abc` | POST | 400 | DB | High | Supertest |
| PRC-005 | Pricing | Create | Trung active scope bi chan | Data integrity | Co price | POST same | 400/P2002 | DB | Critical | Supertest |
| PRC-006 | Pricing | Create | Restore soft-deleted/inactive scope | Happy path | DaXoa/inactive | POST | Row active | DB | Medium | Supertest |
| PRC-007 | Pricing | Create | Toi da 4 loai hoc/scope | Business rule | Da du 4 | POST loai nua | 400 | DB | Medium | Supertest |
| PRC-008 | Pricing | Update | DonGia invalid bi chan | Validation | Price row | PUT DonGia 0 | 400 | DB | Critical | Supertest |
| PRC-009 | Pricing | Update | Duplicate scope bi chan | Data integrity | 2 rows | Move to duplicate | 400 | DB | Critical | Supertest |
| PRC-010 | Pricing | Update | Recalculate registration active | Regression | Detail active | PUT DonGia | Detail/tong updated | DB | High | Supertest |
| PRC-011 | Pricing | Delete | Delete price in use without replacement bi chan | Data integrity | Detail uses only price | DELETE | 400/rollback | DB | Critical | Supertest |
| PRC-012 | Pricing | Delete | Delete with replacement recalc | Happy path | Co fallback replacement | DELETE | Tong dung | DB | High | Supertest |
| PRC-013 | Pricing | List | Loc scope/search | API | Nhieu price | GET filters | Dung page | DB | Low | Supertest |
| PRC-014 | Pricing | Permission | Student khong CRUD pricing | Permission | Student token | POST/PUT/DELETE | 403 | API | Critical | Supertest |
| PRC-015 | Pricing | Hoc ky null | Default price dung `MaHocKy=null` | Business rule | Default price | Register | Dung fallback default | DB | High | Supertest |
| BEN-001 | Beneficiaries | Create | Required Ma/Ten/TiLe/DoUuTien | Validation | Admin | Missing | POST | 400 | `DOITUONG` | High | Supertest |
| BEN-002 | Beneficiaries | Create | TiLe 0-100 | Boundary | Admin | -1/101 | POST | 400 | DB | Critical | Supertest |
| BEN-003 | Beneficiaries | Create | DoUuTien nguyen duong | Validation | Admin | 0/1.5 | POST | 400 | DB | High | Supertest |
| BEN-004 | Beneficiaries | Create | Trung MaDoiTuong | Data integrity | Co DT | POST same | 400/P2002 | DB | High | Supertest |
| BEN-005 | Beneficiaries | Update | Ten rong bi chan | Validation | Co DT | spaces | PUT | 400 | DB | Medium | Supertest |
| BEN-006 | Beneficiaries | Update | TiLe 100 tinh phai dong 0 | Regression | SV gan DT 100 | Register/calc | PhaiDong 0 | DB | Critical | Supertest |
| BEN-007 | Beneficiaries | Student map | Add SV ton tai | Happy path | SV active | POST students | 201 | `DOITUONGSINHVIEN` | High | Supertest |
| BEN-008 | Beneficiaries | Student map | Add SV khong ton tai | Validation | MaSv sai | POST | 404 | DB | High | Supertest |
| BEN-009 | Beneficiaries | Student map | Add trung bi chan | Data integrity | Map exists | POST | 400/P2002 | DB | High | Supertest |
| BEN-010 | Beneficiaries | Permission | Student khong quan ly doi tuong | Permission | Student token | CRUD | 403 | API | Critical | Supertest |

## 9. Seed data/test scenario can co

| Nhom | Seed de xuat |
|---|---|
| Hoc ky | `HK_NOT_OPEN`, `HK_REG_OPEN`, `HK_REG_CLOSED`, `HK_APPEAL_OPEN`, `HK_FINALIZED`, `HK_TUITION_OPEN`, `HK_TUITION_OVERDUE`. Moi HK co nam hoc, ngay start/end, registration/appeal/payment deadlines khac nhau. |
| Sinh vien | `SV_NORMAL`, `SV_DISCOUNT50`, `SV_MULTI_DISCOUNT`, `SV_PASSED_PREREQ`, `SV_MISSING_PREREQ`, `SV_NEAR_MAX_CREDIT`, `SV_PAID`, `SV_DEBT`. Moi SV co account token rieng. |
| Mon/lop | Mon LT, TH; mon co `tien_quyet`; lop con cho, lop day, cung mon khac lop, trung lich hoan toan, trung lich giao bien, khac lich, lop thieu don gia. |
| Don gia | Default LT/TH cho `hoc_moi/hoc_lai/hoc_cai_thien/hoc_he`; price hoc ky override; scope thieu gia de test `MISSING_CREDIT_PRICE`. |
| Mien giam | DT 0%, 50%, 100%, inactive, nhieu DT voi `DoUuTien` khac nhau. |
| Thanh toan | Receipt unpaid, pending, success, failed, canceled, refund; receipt stale amount; VNPAY/ZaloPay signed payload sandbox. |

## 10. Top 20 test case rui ro cao chay truoc

1. REG-037 - Missing price khong fallback.
2. PAY-024 - Stale callback khong tao success trung.
3. REG-014 - Race slot cuoi.
4. REG-025 - Tien quyet chua dat bi chan.
5. PAY-004 - Amount phai bang con no.
6. PAY-027 - Sau payment success khoa dang ky/huy.
7. SEM-019 - Pending appeal khong finalize.
8. SEM-024 - Chua finalize khong mo thu.
9. TUI-009 - Canceled detail khong tinh hoc phi.
10. CLS-024 - Trung phong lop mo.
11. CLS-025 - Trung giang vien lop mo.
12. REG-017 - Trung lich sinh vien.
13. CAN-008 - Khong huy sau thanh toan.
14. APP-020 - Duyet doi rollback neu add fail.
15. TUI-021 - Nhieu doi tuong mien giam.
16. PRC-011 - Xoa price in-use bi chan.
17. SEM-021 - Finalize huy lop duoi 75%.
18. TUI-026 - Da dong + con no = phai dong.
19. PAY-021/PAY-031 - Callback sai signature hoac sai amount bi tu choi.
20. REG-009/CAN-006/TUI-003/PAY-011 - Student khong truy cap SV khac.

## 11. Coverage matrix

| Nghiep vu | Happy path | Validation | Boundary | Negative | Permission | API | UI | Concurrency | Data integrity | Regression | Du coverage chua |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hoc ky/nam hoc | Co | Co | Co | Co | Co | Co | Mot phan | Khong ap dung | Co | Co | Du API, can them Playwright |
| Mo mon/lop/lich | Co | Co | Co | Co | Co | Co | Mot phan | Mot phan | Co | Co | Du API, can them E2E |
| Dang ky hoc phan | Co | Co | Co | Co | Co | Co | Co | Co | Co | Co | Du thiet ke, skeleton can seed |
| Huy hoc phan | Co | Co | Co | Co | Co | Co | Co | Co | Co | Co | Du thiet ke |
| Cuu xet | Co | Co | Co | Co | Co | Co | Co | Co | Co | Co | Du thiet ke |
| Hoc phi | Co | Co | Co | Co | Co | Co | Co | Khong ap dung | Co | Co | Du thiet ke |
| Thanh toan | Co | Co | Co | Co | Co | Co | Co | Co | Co | Co | Du thiet ke, callback can sandbox |
| Don gia/doi tuong | Co | Co | Co | Co | Co | Co | Mot phan | Khong ap dung | Co | Co | Du thiet ke |
| Role dao tao/tai chinh | Mot phan | Mot phan | Khong | Co | Can xac nhan | Co | Co | Khong | Mot phan | Chua | Chua du, xem CONF-002 |

## 12. De xuat automation

| Lop test | Cong cu | Noi dung |
|---|---|---|
| API/business | Jest/Vitest + Supertest | Registration, cancel, appeals, tuition, payment, pricing, permission. Can seed DB test rieng va reset sau moi test. |
| Unit | Jest/Vitest | `getCreditPrice`, `determineRegistrationType`, `ensurePrerequisitesSatisfied`, `recalculateRegistrationTotals`, `getRemainingAmount`, payment window rules. Can mock Prisma transaction client. |
| E2E | Playwright | Admin tao hoc ky -> mo mon -> mo lop -> student dang ky -> admin finalize -> mo hoc phi -> tao receipt -> student checkout -> admin confirm -> student thu huy bi chan. |
| Concurrency | Jest/Supertest + DB test | Chay 2 request song song cho slot cuoi, 2 approve cuu xet song song, 2 callback payment lap lai. |

Skeleton da them: `tests/api/core-business-regression.skeleton.test.js`. Repo hien chua cai Jest/Supertest va `npm test` van la placeholder nen skeleton dang `describe.skip`.

## 13. Ket qua check sau sua

| Lenh | Ket qua |
|---|---|
| `node --check src/controllers/registrationController.js` | Pass sau review fix |
| `node --check src/controllers/appealController.js` | Pass sau review fix |
| `node --check src/controllers/paymentController.js` | Pass sau review fix |
| `node --check tests/api/core-business-regression.skeleton.test.js` | Pass sau review fix |
| `npm test` | Fail dung theo script placeholder hien co: `Error: no test specified` va exit 1. Chua co test runner that trong `package.json`. |
| `git diff --check` | Pass, khong co whitespace error; co warning line ending LF se duoc Git chuyen CRLF tren Windows. |
| `npm run lint/build/typecheck` | Khong co script trong `package.json`. |
