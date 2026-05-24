# Ràng buộc toàn vẹn cần bổ sung để viết trigger

Nguồn rà soát:

- `project/src/config/init.sql`
- `KE_HOACH_THUC_THI_YEU_CAU.md`
- `PHANCONG_TRIGGER.md`
- `PHANCONG_CONGVIEC (1).md`

Phạm vi file này: chỉ liệt kê các ràng buộc toàn vẹn **cần cho project nhưng hiện chưa được database đảm bảo đầy đủ**. Không liệt kê lại khóa chính, khóa ngoại, unique, `CHECK` cơ bản đã có trong `init.sql`.

Ghi chú:

- `init.sql` đã có trigger `trg_prevent_student_schedule_conflict` chặn sinh viên đăng ký lớp bị trùng lịch, nên không đưa lại vào danh sách cần bổ sung.
- Cột tổng hợp như `TongTinChi`, `TongTienDangKy`, `TienMienGiam`, `TongTienPhaiDong`, `SoLuongDaDangKy` hiện chỉ được cập nhật dữ liệu mẫu một lần trong `init.sql`; chưa có trigger duy trì khi dữ liệu thay đổi.

## Phân công 4 người

Nguyên tắc chia việc:

- Mỗi RBTV chỉ có **một người sở hữu chính**.
- Người sở hữu RBTV phải làm trọn phần đó: `trigger/function SQL` + `backend API/service` + `frontend admin` + `frontend user` nếu module đó có màn user.
- Các module chỉ giao tiếp qua hàm/API đã thống nhất, không sửa trực tiếp logic nội bộ của module người khác.
- `PHIEUDANGKY` và `CHITIETDANGKY` là lõi đăng ký nên Người 3 sở hữu chính; Người 1 chỉ cung cấp hàm miễn giảm, Người 4 chỉ đọc số tiền phải đóng để thu học phí.

| Người | Module sở hữu riêng | RBTV sở hữu | Admin phụ trách | User phụ trách | Interface cho người khác dùng |
| --- | --- | --- | --- | --- | --- |
| Người 1 | Sinh viên, tài khoản, đối tượng ưu tiên, miễn giảm học phí | `RBTV01` - `RBTV03`, `RBTV16` | Quản lý sinh viên, duyệt tài khoản, quản lý đối tượng ưu tiên, gán đối tượng cho sinh viên | Hồ sơ cá nhân, xem thông tin sinh viên và miễn giảm | `fn_lay_ti_le_giam_hoc_phi(MaSv)`, API lấy trạng thái sinh viên/tài khoản |
| Người 2 | Môn học, điều kiện môn học, chương trình đào tạo, môn đã học | `RBTV04` - `RBTV07`, `RBTV22`, `RBTV23` | Quản lý môn học, điều kiện tiên quyết/học trước, chương trình đào tạo, môn đã học | Xem chương trình đào tạo, tiến độ học, môn đã hoàn thành | `fn_kiem_tra_dieu_kien_mon_hoc(MaSv, MaMonHoc, MaHocKy)`, API lấy CTĐT |
| Người 3 | Năm học, học kỳ, lớp mở, lịch học, đăng ký học phần | `RBTV08` - `RBTV15`, `RBTV17` - `RBTV21`, `RBTV24` - `RBTV27` | Quản lý năm học, học kỳ, lớp mở, lịch học, phiếu đăng ký | Đăng ký môn, hủy đăng ký, xem môn đã đăng ký, xem thời khóa biểu | API/func tính phiếu đăng ký chuẩn: `TongTinChi`, `TongTienDangKy`, `TongTienPhaiDong`, `SoLuongDaDangKy` |
| Người 4 | Học phí, phiếu thu, báo cáo, thông báo, xóa mềm/trạng thái | `RBTV28` - `RBTV34` | Quản lý học phí, phiếu thu, xác nhận thanh toán, báo cáo nợ học phí, thông báo, thùng rác | Xem học phí, tạo yêu cầu thanh toán, xem lịch sử đóng tiền, nhận thông báo | `fn_tinh_tong_tien_da_thu(SoPhieu)`, `fn_tinh_so_tien_con_lai(SoPhieu)` |

### Ranh giới chống chồng chéo

| Vấn đề dễ đụng nhau | Người làm chính | Người còn lại chỉ được dùng |
| --- | --- | --- |
| Tỷ lệ giảm học phí của sinh viên | Người 1 | Người 3 và Người 4 gọi hàm/API của Người 1 |
| Điều kiện tiên quyết/học trước | Người 2 | Người 3 gọi hàm/API của Người 2 khi đăng ký |
| Tổng tiền và tổng tín chỉ trên phiếu đăng ký | Người 3 | Người 4 đọc `PHIEUDANGKY.TongTienPhaiDong`, không tự tính lại từ chi tiết |
| Sĩ số lớp mở | Người 3 | Các module khác chỉ đọc `LOPMO.SoLuongDaDangKy` |
| Thu tiền, còn nợ, quá hạn | Người 4 | Các module khác chỉ đọc API học phí của Người 4 |
| Xóa mềm dữ liệu cha đang được dùng | Người 4 | Người 1, 2, 3 báo danh sách bảng cần bảo vệ, không tự viết trigger xóa mềm chung |

## Danh sách RBTV cần bổ sung

### Người 1

| Mã | Người phụ trách | Bảng liên quan | Mô tả | Công thức ràng buộc toàn vẹn | Thao tác cần xét khi lập bảng tầm ảnh hưởng |
| --- | --- | --- | --- | --- | --- |
| RBTV01 | Người 1 | `SINHVIEN`, `PHUONGXA`, `DANTOC`, `DOITUONGSINHVIEN`, `DOITUONG` | Sinh viên thuộc vùng sâu vùng xa phải được tính đúng đối tượng miễn giảm `DT06`. | Nếu `sv.MaPhuongXa = px.MaPhuongXa AND sv.MaDanToc = dt.MaDanToc AND px.KhuVuc = 'KV3' AND dt.LaDanTocThieuSo = TRUE` thì sinh viên phải được xem là thuộc đối tượng `DT06` khi tính học phí. Có thể lưu thật bằng `EXISTS DOITUONGSINHVIEN(MaSv = sv.MaSv, MaDoiTuong = 'DT06')` hoặc xử lý như đối tượng ảo trong hàm tính giảm. | `INSERT/UPDATE SINHVIEN`; `UPDATE PHUONGXA.KhuVuc`; `UPDATE DANTOC.LaDanTocThieuSo`; `INSERT/UPDATE/DELETE DOITUONGSINHVIEN` |
| RBTV02 | Người 1 | `PHIEUDANGKY`, `SINHVIEN`, `DOITUONGSINHVIEN`, `DOITUONG`, `PHUONGXA`, `DANTOC` | Tỷ lệ giảm học phí trên phiếu đăng ký phải luôn là tỷ lệ của đối tượng ưu tiên cao nhất của sinh viên. | Với mỗi `pdk.TrangThai = 'Đã đăng ký'`: `pdk.TiLeGiam = COALESCE(dt.TiLeGiamHocPhi của đối tượng có MIN(dt.DoUuTien) trong các đối tượng hợp lệ của pdk.MaSv, 0)`. Tập đối tượng hợp lệ gồm các dòng trong `DOITUONGSINHVIEN` đang hiệu lực và đối tượng vùng sâu vùng xa ở RBTV01. | `INSERT/UPDATE PHIEUDANGKY`; `INSERT/UPDATE/DELETE DOITUONGSINHVIEN`; `UPDATE DOITUONG.TiLeGiamHocPhi/DoUuTien/TrangThai`; `UPDATE SINHVIEN.MaPhuongXa/MaDanToc`; `UPDATE PHUONGXA.KhuVuc`; `UPDATE DANTOC.LaDanTocThieuSo` |
| RBTV03 | Người 1 | `PHIEUDANGKY` | Tiền miễn giảm và tiền phải đóng phải khớp với tổng tiền đăng ký và tỷ lệ giảm. | `TienMienGiam = ROUND(TongTienDangKy * TiLeGiam / 100)` và `TongTienPhaiDong = GREATEST(TongTienDangKy - TienMienGiam, 0)`. | `INSERT/UPDATE PHIEUDANGKY`; các thao tác làm đổi `TongTienDangKy` hoặc `TiLeGiam` |
| RBTV16 | Người 1 | `PHIEUDANGKY`, `SINHVIEN`, `NGUOIDUNG` | Chỉ sinh viên còn học và tài khoản đã duyệt mới được lập phiếu đăng ký. | Với mỗi `PHIEUDANGKY`: tồn tại `SINHVIEN sv` sao cho `sv.MaSv = pdk.MaSv AND sv.TrangThai = 'Đang học'`; nếu sinh viên có tài khoản thì tài khoản phải thỏa `NGUOIDUNG.TrangThai = TRUE AND NGUOIDUNG.TrangThaiDuyet = 'approved'`. | `INSERT/UPDATE PHIEUDANGKY`; `UPDATE SINHVIEN.TrangThai/MaTaiKhoan`; `UPDATE NGUOIDUNG.TrangThai/TrangThaiDuyet` |

### Người 2

| Mã | Người phụ trách | Bảng liên quan | Mô tả | Công thức ràng buộc toàn vẹn | Thao tác cần xét khi lập bảng tầm ảnh hưởng |
| --- | --- | --- | --- | --- | --- |
| RBTV04 | Người 2 | `MONHOC` | Số tiết phải chia hết theo quy định tính tín chỉ, tránh `SoTinChi` bị làm tròn xuống do cột generated. | `(LoaiMon = 'LT' AND SoTiet % 15 = 0) OR (LoaiMon = 'TH' AND SoTiet % 30 = 0)`. | `INSERT/UPDATE MONHOC.LoaiMon/SoTiet` |
| RBTV05 | Người 2 | `DIEUKIENMONHOC` | Một môn học không được là điều kiện của chính nó. | `MaMonHoc <> MaMonDieuKien`. | `INSERT/UPDATE DIEUKIENMONHOC` |
| RBTV06 | Người 2 | `DIEUKIENMONHOC` | Không được tạo vòng lặp điều kiện môn học. | Không tồn tại đường đi điều kiện từ `MaMonDieuKien` quay lại `MaMonHoc`. Nói cách khác, khi thêm cạnh `A -> B`, không được tồn tại chuỗi `B -> ... -> A`. | `INSERT/UPDATE DIEUKIENMONHOC.MaMonHoc/MaMonDieuKien/LoaiDieuKien`; `UPDATE DIEUKIENMONHOC.TrangThai` |
| RBTV07 | Người 2 | `CHUONGTRINHHOC`, `DIEUKIENMONHOC`, `MONHOC`, `NGANHHOC` | Chương trình học của một ngành phải chứa các môn điều kiện ở học kỳ hợp lý. | Với mọi môn `M` trong `CHUONGTRINHHOC` của ngành `N`, nếu `DIEUKIENMONHOC(M, D, 'tien_quyet')` thì phải tồn tại `CHUONGTRINHHOC(N, D)` và `HocKy(D) < HocKy(M)`. Nếu `LoaiDieuKien = 'hoc_truoc'` thì `HocKy(D) <= HocKy(M)`. | `INSERT/UPDATE/DELETE CHUONGTRINHHOC`; `INSERT/UPDATE/DELETE DIEUKIENMONHOC` |
| RBTV22 | Người 2 | `CHITIETDANGKY`, `PHIEUDANGKY`, `MONDAHOC` | Loại đăng ký phải đúng với lịch sử học của sinh viên. | Với môn `M` của sinh viên `SV`: `hoc_moi` chỉ hợp lệ khi chưa có lịch sử học `M`; `hoc_lai` hợp lệ khi tồn tại `MONDAHOC(SV, M, KetQua = 'rot')` và chưa có lần `qua_mon`; `hoc_cai_thien` hợp lệ khi tồn tại `MONDAHOC(SV, M, KetQua = 'qua_mon')`. | `INSERT/UPDATE CHITIETDANGKY.LoaiDangKy/MaMonHoc/SoPhieu`; `INSERT/UPDATE/DELETE MONDAHOC` |
| RBTV23 | Người 2 | `CHITIETDANGKY`, `PHIEUDANGKY`, `DIEUKIENMONHOC`, `MONDAHOC` | Khi đăng ký môn, sinh viên phải thỏa điều kiện tiên quyết/học trước. | Với mỗi môn `M` đăng ký: nếu tồn tại `DIEUKIENMONHOC(M, D, 'tien_quyet')` thì phải tồn tại `MONDAHOC(MaSv, D, KetQua = 'qua_mon')` trước học kỳ đăng ký. Nếu `LoaiDieuKien = 'hoc_truoc'`, sinh viên phải từng đăng ký/học môn `D` trước đó hoặc đăng ký đồng thời môn `D` trong cùng phiếu/học kỳ. | `INSERT/UPDATE CHITIETDANGKY`; `INSERT/UPDATE/DELETE DIEUKIENMONHOC`; `INSERT/UPDATE/DELETE MONDAHOC` |

### Người 3

| Mã | Người phụ trách | Bảng liên quan | Mô tả | Công thức ràng buộc toàn vẹn | Thao tác cần xét khi lập bảng tầm ảnh hưởng |
| --- | --- | --- | --- | --- | --- |
| RBTV08 | Người 3 | `NAMHOC` | Năm học phải có khoảng năm hợp lệ. | `NamKetThuc = NamBatDau + 1`. Nếu project cho năm học khác chuẩn một năm thì dùng điều kiện yếu hơn: `NamKetThuc > NamBatDau`. | `INSERT/UPDATE NAMHOC.NamBatDau/NamKetThuc` |
| RBTV09 | Người 3 | `HOCKY`, `NAMHOC` | Học kỳ phải đúng thứ tự và khoảng thời gian. | `LoaiHocKy = 'Chính' -> ThuTu IN (1,2)`; `LoaiHocKy = 'Hè' -> ThuTu = 3`; `UNIQUE(MaNamHoc, ThuTu)`; nếu có ngày thì `NgayBatDau < NgayKetThuc`, `NgayBatDauDangKy <= NgayKetThucDangKy`, `NgayKetThucDangKy <= NgayKetThuc`, `HanDongHocPhi >= NgayBatDau`. | `INSERT/UPDATE HOCKY`; `UPDATE NAMHOC` nếu thay đổi năm học ảnh hưởng học kỳ |
| RBTV10 | Người 3 | `LOP` | Sĩ số tối đa của lớp phải dương. | `SoLuongToiDa > 0`. | `INSERT/UPDATE LOP.SoLuongToiDa` |
| RBTV11 | Người 3 | `LICHHOCLOP`, `TIETHOC` | Tiết bắt đầu của một lịch học không được sau tiết kết thúc. | Với `t_bd = TIETHOC(MaTietBatDau)`, `t_kt = TIETHOC(MaTietKetThuc)`: `t_bd.ThuTu <= t_kt.ThuTu`. | `INSERT/UPDATE LICHHOCLOP.MaTietBatDau/MaTietKetThuc`; `UPDATE TIETHOC.ThuTu` |
| RBTV12 | Người 3 | `LICHHOCLOP`, `LOPMO`, `TIETHOC` | Một lớp mở không được có hai lịch học tự trùng nhau. | Không tồn tại hai dòng `lh1`, `lh2` cùng `LopMoId`, cùng `ThuTrongTuan`, `lh1.id <> lh2.id`, có khoảng tiết giao nhau: `bd1.ThuTu <= kt2.ThuTu AND bd2.ThuTu <= kt1.ThuTu`. | `INSERT/UPDATE LICHHOCLOP`; `UPDATE TIETHOC.ThuTu` |
| RBTV13 | Người 3 | `LICHHOCLOP`, `LOPMO`, `TIETHOC` | Một phòng học không được được xếp cho hai lớp khác nhau cùng thời điểm trong cùng học kỳ. | Không tồn tại `lh1`, `lh2` có `lm1.MaHocKy = lm2.MaHocKy`, `lh1.PhongHoc = lh2.PhongHoc`, cùng `ThuTrongTuan`, `lh1.id <> lh2.id`, hai khoảng tiết giao nhau, và các lớp mở còn hoạt động. | `INSERT/UPDATE LICHHOCLOP.PhongHoc/ThuTrongTuan/MaTietBatDau/MaTietKetThuc`; `UPDATE LOPMO.MaHocKy/TrangThai`; `UPDATE TIETHOC.ThuTu` |
| RBTV14 | Người 3 | `LICHHOCLOP`, `LOPMO`, `LOP`, `TIETHOC` | Một giảng viên không được dạy hai lớp trùng lịch trong cùng học kỳ. | Không tồn tại `lh1`, `lh2` thuộc hai lớp mở cùng học kỳ, `lop1.GiangVien = lop2.GiangVien`, cùng `ThuTrongTuan`, khoảng tiết giao nhau, và `lop1.GiangVien IS NOT NULL`. | `INSERT/UPDATE LICHHOCLOP`; `UPDATE LOP.GiangVien`; `UPDATE LOPMO.MaHocKy/TrangThai`; `UPDATE TIETHOC.ThuTu` |
| RBTV15 | Người 3 | `LICHHOCLOP`, `LOPMO`, `PHIEUDANGKY`, `CHITIETDANGKY` | Không được đổi/xóa lịch học của lớp đã có sinh viên đăng ký đang hiệu lực, trừ khi có quy trình xử lý riêng. | Nếu tồn tại `CTDK.TrangThai = 'Đã đăng ký'` của `LOPMO.MaLop` trong `LOPMO.MaHocKy`, thì không cho `DELETE LICHHOCLOP` hoặc sửa các cột thời khóa biểu chính của lớp mở đó. | `UPDATE/DELETE LICHHOCLOP`; `UPDATE LOPMO.MaLop/MaHocKy`; `INSERT/UPDATE/DELETE CHITIETDANGKY` để xác định còn đăng ký hay không |
| RBTV17 | Người 3 | `PHIEUDANGKY`, `CHITIETDANGKY`, `HOCKY` | Chỉ cho tạo phiếu và thêm/hủy chi tiết đăng ký trong thời gian đăng ký của học kỳ. | Khi thêm phiếu hoặc thêm/chuyển chi tiết sang `Đã đăng ký`: `CURRENT_TIMESTAMP BETWEEN HOCKY.NgayBatDauDangKy AND HOCKY.NgayKetThucDangKy` và `HOCKY.TrangThai <> 'Đã kết thúc'`. Khi hủy chi tiết: `CURRENT_TIMESTAMP <= HOCKY.NgayKetThucDangKy`, trừ thao tác admin có quy trình riêng. | `INSERT PHIEUDANGKY`; `INSERT/UPDATE CHITIETDANGKY.TrangThai`; `UPDATE HOCKY.NgayBatDauDangKy/NgayKetThucDangKy/TrangThai` |
| RBTV18 | Người 3 | `CHITIETDANGKY`, `PHIEUDANGKY`, `LOPMO`, `LOP` | Sinh viên chỉ được đăng ký lớp đã được mở trong đúng học kỳ của phiếu đăng ký. | Với mỗi `ctdk.TrangThai = 'Đã đăng ký'`: tồn tại `LOPMO lm` sao cho `lm.MaHocKy = pdk.MaHocKy AND lm.MaLop = ctdk.MaLop AND lm.TrangThai = TRUE`. | `INSERT/UPDATE CHITIETDANGKY.MaLop/SoPhieu/TrangThai`; `UPDATE LOPMO.TrangThai/MaHocKy/MaLop`; `UPDATE PHIEUDANGKY.MaHocKy` |
| RBTV19 | Người 3 | `CHITIETDANGKY`, `LOP`, `MONHOC` | Mã môn học lưu trong chi tiết đăng ký phải khớp với môn học của lớp. | `CHITIETDANGKY.MaMonHoc = LOP.MaMonHoc` với `LOP.MaLop = CHITIETDANGKY.MaLop`. | `INSERT/UPDATE CHITIETDANGKY.MaLop/MaMonHoc`; `UPDATE LOP.MaMonHoc` |
| RBTV20 | Người 3 | `CHITIETDANGKY`, `LOP`, `MONHOC` | Số tín chỉ và loại môn trong chi tiết đăng ký phải là dữ liệu suy ra từ môn học. | Với `ctdk.MaLop = lop.MaLop` và `lop.MaMonHoc = mh.MaMonHoc`: `ctdk.SoTinChi = mh.SoTinChi` và `ctdk.LoaiMon = mh.LoaiMon`. | `INSERT/UPDATE CHITIETDANGKY`; `UPDATE MONHOC.LoaiMon/SoTiet`; `UPDATE LOP.MaMonHoc` |
| RBTV21 | Người 3 | `CHITIETDANGKY`, `PHIEUDANGKY`, `HOCKY`, `DONGIATINCHI`, `MONHOC` | Đơn giá và thành tiền của chi tiết đăng ký phải tính đúng theo loại môn, loại học và học kỳ. | `LoaiGia = CASE WHEN HOCKY.LoaiHocKy = 'Hè' AND LoaiDangKy = 'hoc_moi' THEN 'hoc_he' ELSE LoaiDangKy END`; `DonGia = fn_lay_don_gia(LoaiMon, LoaiGia, MaHocKy)`; `ThanhTien = SoTinChi * DonGia`. | `INSERT/UPDATE CHITIETDANGKY`; `UPDATE DONGIATINCHI.DonGia/TrangThai`; `UPDATE HOCKY.LoaiHocKy`; `UPDATE MONHOC.LoaiMon/SoTiet` |
| RBTV24 | Người 3 | `PHIEUDANGKY`, `CHITIETDANGKY`, `THAMSO`, `MONDAHOC` | Tổng tín chỉ đăng ký trong một học kỳ không được vượt giới hạn hệ thống. | `TongTinChiDangKy = SUM(ctdk.SoTinChi WHERE ctdk.TrangThai = 'Đã đăng ký')`. Phải có `TongTinChiDangKy <= GioiHan`, trong đó `GioiHan` lấy từ `THAMSO`: mặc định `SoTinChiDangKyToiDa`; nếu áp dụng luật chưa đạt các môn Anh văn bắt buộc thì dùng `GioiHanTinChiChuaDatAnhVan`; nếu project cho phép vượt thì tối đa không vượt `SoTinChiDangKyToiDaKhiVuot`. | `INSERT/UPDATE/DELETE CHITIETDANGKY`; `UPDATE THAMSO`; `INSERT/UPDATE/DELETE MONDAHOC` |
| RBTV25 | Người 3 | `PHIEUDANGKY`, `CHITIETDANGKY` | Các cột tổng hợp trên phiếu đăng ký phải luôn bằng tổng từ chi tiết đăng ký đang hiệu lực. | Với mỗi phiếu: `TongTinChi = SUM(SoTinChi)`, `TongTienDangKy = SUM(ThanhTien)`, `SoMonHocMoi = COUNT(LoaiDangKy='hoc_moi')`, `SoTinChiHocMoi = SUM(SoTinChi WHERE LoaiDangKy='hoc_moi')`, `TienHocMoi = SUM(ThanhTien WHERE LoaiDangKy='hoc_moi')`; tương tự cho `hoc_lai` và `hoc_cai_thien`; chỉ tính `CHITIETDANGKY.TrangThai = 'Đã đăng ký'`. | `INSERT/UPDATE/DELETE CHITIETDANGKY`; `UPDATE PHIEUDANGKY.TrangThai` |
| RBTV26 | Người 3 | `LOPMO`, `LOP`, `PHIEUDANGKY`, `CHITIETDANGKY` | Sĩ số đã đăng ký của lớp mở phải bằng số đăng ký thực tế và không vượt sức chứa. | Với mỗi `LOPMO lm`: `lm.SoLuongDaDangKy = COUNT(ctdk)` sao cho `ctdk.MaLop = lm.MaLop`, `pdk.MaHocKy = lm.MaHocKy`, `ctdk.TrangThai = 'Đã đăng ký'`; đồng thời `0 <= lm.SoLuongDaDangKy <= LOP.SoLuongToiDa`. | `INSERT/UPDATE/DELETE CHITIETDANGKY`; `UPDATE PHIEUDANGKY.MaHocKy/TrangThai`; `UPDATE LOP.SoLuongToiDa`; `UPDATE LOPMO.SoLuongDaDangKy/TrangThai` |
| RBTV27 | Người 3 | `PHIEUDANGKY`, `CHITIETDANGKY` | Trạng thái phiếu đăng ký phải nhất quán với trạng thái chi tiết. | Nếu `PHIEUDANGKY.TrangThai = 'Đã hủy'` thì không được tồn tại `CHITIETDANGKY.TrangThai = 'Đã đăng ký'` thuộc phiếu đó. Nếu còn chi tiết `Đã đăng ký` thì phiếu không được là `Đã hủy`. | `UPDATE PHIEUDANGKY.TrangThai`; `INSERT/UPDATE/DELETE CHITIETDANGKY` |

### Người 4

| Mã | Người phụ trách | Bảng liên quan | Mô tả | Công thức ràng buộc toàn vẹn | Thao tác cần xét khi lập bảng tầm ảnh hưởng |
| --- | --- | --- | --- | --- | --- |
| RBTV28 | Người 4 | `PHIEUDANGKY`, `CHITIETDANGKY`, `PHIEUTHUHOCPHI` | Không được hủy/xóa đăng ký đã có phiếu thu thành công nếu chưa có cơ chế hoàn tiền. | Nếu tồn tại `PHIEUTHUHOCPHI(SoPhieuDangKy = pdk.SoPhieu, TrangThai = 'Thành công')` thì không cho chuyển `pdk.TrangThai = 'Đã hủy'`, không cho xóa phiếu, và không cho hủy/xóa chi tiết làm giảm học phí phải đóng, trừ khi các phiếu thu liên quan đã bị hủy hoặc có nghiệp vụ hoàn tiền. | `UPDATE/DELETE PHIEUDANGKY`; `UPDATE/DELETE CHITIETDANGKY`; `INSERT/UPDATE/DELETE PHIEUTHUHOCPHI` |
| RBTV29 | Người 4 | `PHIEUTHUHOCPHI`, `PHIEUDANGKY`, `SINHVIEN` | Sinh viên trên phiếu thu phải đúng là sinh viên của phiếu đăng ký. | `PHIEUTHUHOCPHI.MaSv = PHIEUDANGKY.MaSv` với `PHIEUTHUHOCPHI.SoPhieuDangKy = PHIEUDANGKY.SoPhieu`. | `INSERT/UPDATE PHIEUTHUHOCPHI.MaSv/SoPhieuDangKy`; `UPDATE PHIEUDANGKY.MaSv` |
| RBTV30 | Người 4 | `PHIEUTHUHOCPHI`, `PHIEUDANGKY` | Không thu vượt số tiền phải đóng nếu hệ thống không có nghiệp vụ xử lý tiền thừa. | Với mỗi phiếu đăng ký: `SUM(PHIEUTHUHOCPHI.SoTienThu WHERE TrangThai = 'Thành công') <= PHIEUDANGKY.TongTienPhaiDong`. Nếu project chấp nhận thu dư thì cần thêm bảng/thuộc tính xử lý hoàn tiền hoặc công nợ âm. | `INSERT/UPDATE/DELETE PHIEUTHUHOCPHI`; `UPDATE PHIEUDANGKY.TongTienPhaiDong` |
| RBTV31 | Người 4 | `PHIEUTHUHOCPHI` | Giao dịch không dùng tiền mặt phải có mã giao dịch và không được trùng giao dịch thành công. | Nếu `HinhThucThu <> 'Tiền mặt' AND TrangThai = 'Thành công'` thì `MaGiaoDich IS NOT NULL`; đồng thời không tồn tại hai phiếu thu thành công có cùng `MaGiaoDich`, cùng `PaymentProvider` nếu provider khác `NULL`. | `INSERT/UPDATE PHIEUTHUHOCPHI.HinhThucThu/MaGiaoDich/PaymentProvider/TrangThai` |
| RBTV32 | Người 4 | `PHIEUTHUHOCPHI` | Ngày xác nhận phải nhất quán với trạng thái thanh toán. | Nếu `TrangThai = 'Thành công'` thì `NgayXacNhan IS NOT NULL`. Nếu `TrangThai IN ('Chờ xác nhận', 'Thất bại', 'Đã hủy')` thì phiếu không được tính vào tổng đã thu. | `INSERT/UPDATE PHIEUTHUHOCPHI.TrangThai/NgayXacNhan` |
| RBTV33 | Người 4 | `PHIEUTHUHOCPHI` | Phiếu thu đã thành công không được sửa các thông tin định danh chính. | Khi `OLD.TrangThai = 'Thành công'`, không cho sửa `SoPhieuDangKy`, `MaSv`, `SoTienThu`, `HinhThucThu`, `MaGiaoDich`, trừ luồng chuyển trạng thái sang `Đã hủy` có lý do. | `UPDATE PHIEUTHUHOCPHI` |
| RBTV34 | Người 4 | Các bảng có `DaXoa`, `TrangThai` và các bảng con tham chiếu | Dữ liệu đang hoạt động không được tham chiếu đến bản ghi cha đã xóa mềm hoặc đã tắt trạng thái. | Với mỗi quan hệ nghiệp vụ đang dùng bản ghi hoạt động: nếu bảng con có `TrangThai = TRUE` hoặc trạng thái nghiệp vụ `Đã đăng ký`/`Thành công`, thì bản ghi cha được tham chiếu phải có `COALESCE(DaXoa, FALSE) = FALSE` và nếu có `TrangThai` boolean thì `TrangThai = TRUE`. Ví dụ: chi tiết đăng ký đang hiệu lực không được trỏ đến `LOP`, `MONHOC`, `HOCKY` đã xóa mềm/tắt. | `INSERT/UPDATE` trên các bảng con; `UPDATE DaXoa/TrangThai` trên bảng cha |

## Nhóm trigger theo phân công chính thức

Mỗi người chỉ viết trigger cho RBTV mình sở hữu. Nếu trigger cần dữ liệu của module khác thì chỉ gọi hàm/API đã thống nhất, không viết lại logic của người khác.

| Người | File SQL trigger đề xuất | RBTV gom trong file | Trigger/hàm chính cần làm |
| --- | --- | --- | --- |
| Người 1 | `triggers_student_discount.sql` | `RBTV01`, `RBTV02`, `RBTV03`, `RBTV16` | `fn_lay_ti_le_giam_hoc_phi`, trigger cập nhật miễn giảm trên `SINHVIEN`, `DOITUONGSINHVIEN`, `DOITUONG`, `PHUONGXA`, `DANTOC`, trigger kiểm tra sinh viên/tài khoản khi lập phiếu |
| Người 2 | `triggers_course_curriculum.sql` | `RBTV04`, `RBTV05`, `RBTV06`, `RBTV07`, `RBTV22`, `RBTV23` | Trigger kiểm tra môn học, điều kiện môn học, CTĐT; hàm kiểm tra loại đăng ký và điều kiện tiên quyết/học trước |
| Người 3 | `triggers_registration_schedule.sql` | `RBTV08` - `RBTV15`, `RBTV17` - `RBTV21`, `RBTV24` - `RBTV27` | Trigger kiểm tra học kỳ, lịch học, lớp mở, đăng ký học phần; trigger duy trì `TongTinChi`, `TongTienDangKy`, `TongTienPhaiDong`, `SoLuongDaDangKy` |
| Người 4 | `triggers_tuition_payment.sql` | `RBTV28` - `RBTV34` | Trigger kiểm tra phiếu thu, tổng đã thu, số tiền còn lại, chặn sửa phiếu thu thành công, cảnh báo/xử lý quá hạn, trigger xóa mềm/trạng thái |

## Backend/frontend theo phân công

| Người | Backend cần làm | Admin UI cần làm | User UI cần làm |
| --- | --- | --- | --- |
| Người 1 | API sinh viên, tài khoản, duyệt tài khoản, đối tượng ưu tiên, gán đối tượng, tính miễn giảm | Trang quản lý sinh viên, duyệt tài khoản, quản lý đối tượng ưu tiên | Trang hồ sơ sinh viên, xem thông tin miễn giảm |
| Người 2 | API môn học, điều kiện môn học, chương trình học, môn đã học, hàm kiểm tra điều kiện đăng ký | Trang quản lý môn học, CTĐT, điều kiện tiên quyết/học trước, môn đã học | Trang xem chương trình đào tạo, tiến độ học tập, môn đã hoàn thành |
| Người 3 | API năm học, học kỳ, lớp mở, lịch học, đăng ký/hủy đăng ký, tính tổng phiếu | Trang quản lý học kỳ, lớp mở, lịch học, phiếu đăng ký | Trang đăng ký môn, môn đã đăng ký, thời khóa biểu |
| Người 4 | API học phí, phiếu thu, xác nhận thanh toán, báo cáo nợ học phí, thông báo, thùng rác | Trang quản lý học phí, phiếu thu, báo cáo, thông báo, thùng rác | Trang học phí cá nhân, tạo yêu cầu thanh toán, lịch sử thanh toán, thông báo |

## Quy tắc bàn giao giữa 4 người

| Bên cung cấp | Bên sử dụng | Dữ liệu/hàm bàn giao | Quy tắc |
| --- | --- | --- | --- |
| Người 1 | Người 3, Người 4 | `fn_lay_ti_le_giam_hoc_phi(MaSv)` | Người 3 và Người 4 không tự tính lại miễn giảm |
| Người 2 | Người 3 | `fn_kiem_tra_dieu_kien_mon_hoc(MaSv, MaMonHoc, MaHocKy)` | Người 3 gọi hàm này trước khi cho đăng ký môn |
| Người 3 | Người 4 | `PHIEUDANGKY.TongTienPhaiDong`, `TongTienDangKy`, `TienMienGiam` | Người 4 chỉ thu theo số tiền Người 3 duy trì trên phiếu đăng ký |
| Người 3 | Người 1, Người 2, Người 4 | API đọc phiếu đăng ký, lớp mở, lịch học | Các người khác chỉ đọc, không tự cập nhật tổng đăng ký/sĩ số |
| Người 4 | Người 1, Người 2, Người 3 | API trạng thái học phí, còn nợ, quá hạn | Các người khác chỉ đọc trạng thái học phí, không sửa phiếu thu |

## Những ràng buộc không cần đưa vào danh sách trigger bổ sung

Các nhóm sau đã được database đảm bảo trực tiếp trong `init.sql`, nên không cần viết trigger thủ công trừ khi giảng viên yêu cầu mô phỏng FK bằng trigger:

- Khóa chính của 29 bảng.
- Khóa ngoại giữa các bảng.
- Unique cơ bản như `UNIQUE(MaSv, MaHocKy)`, `UNIQUE(MaHocKy, MaLop)`, `UNIQUE(SoPhieu, MaMonHoc)`.
- Các `CHECK` miền giá trị như loại môn, trạng thái phiếu, khu vực, giới tính.
- Trigger `trg_prevent_student_schedule_conflict` chống sinh viên bị trùng lịch trong cùng học kỳ.
