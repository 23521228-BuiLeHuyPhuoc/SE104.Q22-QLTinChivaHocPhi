# Mô tả database `ql_dangky_hocphi`

Nguồn tham chiếu: `project/src/config/init.sql`.

Tài liệu này mô tả cấu trúc database sau khi chạy đầy đủ file `init.sql`, bao gồm phần tạo bảng, dữ liệu mẫu, các cột đã khai báo trực tiếp trong `CREATE TABLE`, chỉ mục, function và trigger hiện có.

## 1. Tổng quan

Database phục vụ hệ thống quản lý sinh viên, đăng ký học phần và thu học phí. Schema hiện tại có **29 bảng chính**.

| Thành phần | Ý nghĩa |
| --- | --- |
| Drop schema cũ | Xóa các bảng nếu đã tồn tại để khởi tạo lại database. Một số bảng cũ như `HUYEN`, `DIEMSINHVIEN`, `CAUHINHDANGKY` chỉ được drop để dọn schema cũ, không được tạo lại trong schema hiện tại. |
| Tạo bảng | Tạo các bảng danh mục, tài khoản, đào tạo, đăng ký học phần, học phí và thông báo. |
| Ràng buộc | Gồm khóa chính, khóa ngoại, unique, check và cột generated. |
| Dữ liệu mẫu | Chèn dữ liệu mẫu cho địa danh, dân tộc, đối tượng ưu tiên, môn học, lớp, đăng ký, học phí, thông báo. |
| Cột phục vụ ứng dụng | Các cột phục vụ giao diện và logic ứng dụng hiện tại đã được khai báo trực tiếp trong `CREATE TABLE`. |
| Trigger nghiệp vụ | Chặn sinh viên đăng ký lớp bị trùng lịch trong cùng học kỳ. |

## 2. Nhóm bảng chức năng

| Nhóm | Bảng |
| --- | --- |
| Địa danh, dân tộc | `TINH`, `PHUONGXA`, `DANTOC` |
| Đối tượng ưu tiên, miễn giảm | `DOITUONG`, `DOITUONGSINHVIEN` |
| Tổ chức đào tạo | `KHOA`, `NGANHHOC` |
| Môn học, chương trình | `MONHOC`, `DIEUKIENMONHOC`, `CHUONGTRINHHOC`, `MONDAHOC` |
| Tài khoản, phân quyền | `NGUOIDUNG`, `NHOMNGUOIDUNG`, `CHUCNANG`, `PHANQUYEN`, `QUANTRIVIEN` |
| Năm học, học kỳ, lớp | `NAMHOC`, `HOCKY`, `TIETHOC`, `LOP`, `LOPMO`, `LICHHOCLOP` |
| Đăng ký học phần | `PHIEUDANGKY`, `CHITIETDANGKY` |
| Học phí | `DONGIATINCHI`, `PHIEUTHUHOCPHI`, `THAMSO` |
| Thông báo | `THONGBAO` |

## 3. Quy ước

| Ký hiệu | Ý nghĩa |
| --- | --- |
| PK | Khóa chính, định danh duy nhất mỗi bản ghi. |
| FK | Khóa ngoại, tham chiếu sang bảng khác. |
| UNIQUE | Không cho trùng giá trị hoặc tổ hợp giá trị. |
| CHECK | Giới hạn miền giá trị hợp lệ. |
| DEFAULT | Giá trị mặc định khi thêm bản ghi. |
| GENERATED | Cột được tính tự động từ cột khác. |
| `TrangThai` | Trạng thái hoạt động hoặc trạng thái nghiệp vụ tùy bảng. |
| `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhóm cột xóa mềm, xuất hiện ở một số bảng. |
| `NguoiCapNhat`, `NgayCapNhat` | Nhóm cột audit cập nhật. |

## 4. Mô tả chi tiết các bảng

### 4.1. Bảng `TINH`

Lưu danh mục tỉnh/thành phố.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaTinh` | `VARCHAR(10)` | PK, mã tỉnh/thành phố. |
| `TenTinh` | `VARCHAR(100)` | Tên tỉnh/thành phố. |
| `LoaiTinh` | `VARCHAR(30)` | Loại địa phương, mặc định `Tỉnh`. |
| `TrangThai` | `BOOLEAN` | Trạng thái hoạt động. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |

Ràng buộc: PK `MaTinh`; `LoaiTinh IN ('Tỉnh', 'Thành phố')`.

### 4.2. Bảng `DANTOC`

Lưu danh mục dân tộc và đánh dấu dân tộc thiểu số.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaDanToc` | `VARCHAR(10)` | PK, mã dân tộc. |
| `TenDanToc` | `VARCHAR(100)` | Tên dân tộc. |
| `LaDanTocThieuSo` | `BOOLEAN` | Cho biết dân tộc này có phải dân tộc thiểu số hay không. |
| `TrangThai` | `BOOLEAN` | Trạng thái hoạt động. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |

Ràng buộc: PK `MaDanToc`.

### 4.3. Bảng `PHUONGXA`

Lưu danh mục phường/xã/thị trấn, phục vụ quản lý địa chỉ và khu vực ưu tiên.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaPhuongXa` | `VARCHAR(20)` | PK, mã phường/xã. |
| `TenPhuongXa` | `VARCHAR(100)` | Tên phường/xã. |
| `MaTinh` | `VARCHAR(10)` | FK đến `TINH.MaTinh`. |
| `Loai` | `VARCHAR(30)` | Loại đơn vị hành chính: `Phường`, `Xã`, `Thị trấn`. |
| `KhuVuc` | `VARCHAR(10)` | Khu vực ưu tiên: `KV1`, `KV2`, `KV2-NT`, `KV3`. |
| `TrangThai`, `NgayTao` | `BOOLEAN`, `TIMESTAMP` | Trạng thái và thời điểm tạo. |

Ràng buộc: PK `MaPhuongXa`; FK `MaTinh`; check `Loai`; check `KhuVuc`.

### 4.4. Bảng `DOITUONG`

Lưu danh mục đối tượng ưu tiên và tỷ lệ giảm học phí.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaDoiTuong` | `VARCHAR(10)` | PK, mã đối tượng ưu tiên. |
| `TenDoiTuong` | `VARCHAR(100)` | Tên đối tượng ưu tiên. |
| `TiLeGiamHocPhi` | `DECIMAL(5,2)` | Tỷ lệ giảm học phí, từ 0 đến 100. |
| `DoUuTien` | `INTEGER` | Độ ưu tiên khi sinh viên thuộc nhiều đối tượng; số nhỏ hơn có ưu tiên cao hơn. |
| `MoTa` | `VARCHAR(300)` | Mô tả đối tượng. |
| `TrangThai` | `BOOLEAN` | Đối tượng còn áp dụng hay không. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaDoiTuong`; check `TiLeGiamHocPhi` trong khoảng 0..100.

### 4.5. Bảng `KHOA`

Lưu thông tin các khoa quản lý đào tạo.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaKhoa` | `VARCHAR(10)` | PK, mã khoa. |
| `TenKhoa` | `VARCHAR(100)` | Tên khoa. |
| `TenVietTat` | `VARCHAR(20)` | Tên viết tắt. |
| `Sdt` | `VARCHAR(15)` | Số điện thoại liên hệ. |
| `Email` | `VARCHAR(100)` | Email liên hệ. |
| `DiaChi` | `VARCHAR(200)` | Địa chỉ/khu nhà của khoa. |
| `TruongKhoa` | `VARCHAR(100)` | Họ tên trưởng khoa. |
| `TrangThai`, `NgayTao` | `BOOLEAN`, `TIMESTAMP` | Trạng thái và thời điểm tạo. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaKhoa`.

### 4.6. Bảng `NGANHHOC`

Lưu danh mục ngành học thuộc khoa.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaNganh` | `VARCHAR(10)` | PK, mã ngành. |
| `TenNganh` | `VARCHAR(100)` | Tên ngành học. |
| `MaKhoa` | `VARCHAR(10)` | FK đến `KHOA.MaKhoa`. |
| `SoTinChiToiThieu` | `INTEGER` | Số tín chỉ tối thiểu để hoàn thành ngành. |
| `ThoiGianDaoTao` | `DECIMAL(3,1)` | Thời gian đào tạo dự kiến theo năm. |
| `MoTa` | `VARCHAR(500)` | Mô tả ngành học. |
| `TrangThai`, `NgayTao` | `BOOLEAN`, `TIMESTAMP` | Trạng thái và thời điểm tạo. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaNganh`; FK `MaKhoa`.

### 4.7. Bảng `CHUCNANG`

Lưu danh mục chức năng hoặc màn hình của hệ thống.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaChucNang` | `VARCHAR(30)` | PK, mã chức năng. |
| `TenChucNang` | `VARCHAR(100)` | Tên chức năng hiển thị. |
| `TenManHinhDuocLoad` | `VARCHAR(100)` | Tên màn hình/component được load. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaChucNang`.

### 4.8. Bảng `NHOMNGUOIDUNG`

Lưu nhóm người dùng để phân quyền theo nhóm.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaNhom` | `VARCHAR(20)` | PK, mã nhóm người dùng. |
| `TenNhom` | `VARCHAR(100)` | Tên nhóm người dùng. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaNhom`; unique `TenNhom`.

### 4.9. Bảng `PHANQUYEN`

Lưu quan hệ nhiều-nhiều giữa nhóm người dùng và chức năng.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaNhom` | `VARCHAR(20)` | PK thành phần, FK đến `NHOMNGUOIDUNG.MaNhom`. |
| `MaChucNang` | `VARCHAR(30)` | PK thành phần, FK đến `CHUCNANG.MaChucNang`. |

Ràng buộc: PK (`MaNhom`, `MaChucNang`); FK đến `NHOMNGUOIDUNG` và `CHUCNANG`; khi xóa nhóm/chức năng thì xóa cascade quyền liên quan.

### 4.10. Bảng `NGUOIDUNG`

Lưu tài khoản đăng nhập, vai trò, trạng thái duyệt và thông tin phiên đăng nhập.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaTaiKhoan` | `SERIAL` | PK, mã tài khoản. |
| `TenDangNhap` | `VARCHAR(50)` | Tên đăng nhập, duy nhất. |
| `MatKhau` | `VARCHAR(255)` | Mật khẩu đã mã hóa. |
| `Role` | `VARCHAR(20)` | Vai trò: `admin` hoặc `student`. |
| `MaNhom` | `VARCHAR(20)` | FK đến `NHOMNGUOIDUNG.MaNhom`, mặc định `SINHVIEN`. |
| `MaSv` | `VARCHAR(15)` | FK đến `SINHVIEN.MaSv`, dùng cho tài khoản sinh viên. |
| `HoTen` | `VARCHAR(100)` | Họ tên người dùng. |
| `Email` | `VARCHAR(100)` | Email tài khoản. |
| `Sdt` | `VARCHAR(15)` | Số điện thoại. |
| `AnhDaiDien` | `VARCHAR(500)` | Đường dẫn ảnh đại diện. |
| `TrangThai` | `BOOLEAN` | Tài khoản đang hoạt động hay bị khóa. |
| `TrangThaiDuyet` | `VARCHAR(20)` | Trạng thái duyệt: `pending`, `approved`, `rejected`. |
| `NgayDuyet` | `TIMESTAMP` | Thời điểm duyệt tài khoản. |
| `NguoiDuyet` | `INTEGER` | Tài khoản admin duyệt. |
| `LyDoTuChoi` | `VARCHAR(300)` | Lý do từ chối nếu bị từ chối. |
| `NgayTao`, `NgayCapNhat` | `TIMESTAMP` | Thời điểm tạo/cập nhật. |
| `LanDangNhapCuoi` | `TIMESTAMP` | Lần đăng nhập gần nhất. |
| `RefreshToken` | `VARCHAR(500)` | Refresh token đăng nhập. |

Ràng buộc: PK `MaTaiKhoan`; unique `TenDangNhap`; unique `MaSv`; check `Role`; check `TrangThaiDuyet`; FK `MaNhom`; FK `MaSv`.

### 4.11. Bảng `SINHVIEN`

Lưu hồ sơ sinh viên, thông tin học tập, liên hệ và liên kết tài khoản.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaSv` | `VARCHAR(15)` | PK, mã sinh viên. |
| `MaTaiKhoan` | `INTEGER` | FK đến `NGUOIDUNG.MaTaiKhoan`, duy nhất. |
| `HoTen` | `VARCHAR(100)` | Họ tên sinh viên. |
| `NgaySinh` | `DATE` | Ngày sinh. |
| `GioiTinh` | `VARCHAR(5)` | Giới tính: `Nam` hoặc `Nữ`. |
| `Cccd` | `VARCHAR(20)` | Căn cước công dân, duy nhất; được khai báo `NOT NULL` trong schema hiện tại. |
| `MaPhuongXa` | `VARCHAR(20)` | FK đến `PHUONGXA.MaPhuongXa`. |
| `MaDanToc` | `VARCHAR(10)` | FK đến `DANTOC.MaDanToc`; được khai báo `NOT NULL` trong schema hiện tại. |
| `MaNganh` | `VARCHAR(10)` | FK đến `NGANHHOC.MaNganh`. |
| `DiaChiLienHe` | `VARCHAR(200)` | Địa chỉ liên hệ; được khai báo `NOT NULL` trong schema hiện tại. |
| `Sdt` | `VARCHAR(15)` | Số điện thoại. |
| `Email` | `VARCHAR(100)` | Email sinh viên. |
| `AnhDaiDien` | `VARCHAR(500)` | Đường dẫn ảnh đại diện. |
| `NgayNhapHoc` | `DATE` | Ngày nhập học, mặc định ngày hiện tại. |
| `TrangThai` | `VARCHAR(30)` | Trạng thái học tập: `Đang học`, `Bảo lưu`, `Nghỉ học`, `Tốt nghiệp`. |
| `GhiChu` | `VARCHAR(300)` | Ghi chú. |
| `HoTenCha`, `SdtCha`, `HoTenMe`, `SdtMe` | Nhiều kiểu | Thông tin phụ huynh. |
| `NgayTao`, `NgayCapNhat`, `NguoiCapNhat` | Nhiều kiểu | Thông tin tạo/cập nhật. |
| `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Thông tin xóa mềm. |

Ràng buộc: PK `MaSv`; unique `Cccd`; unique `MaTaiKhoan`; check `GioiTinh`; check `TrangThai`; FK đến `PHUONGXA`, `DANTOC`, `NGANHHOC`, `NGUOIDUNG`.

### 4.12. Bảng `DOITUONGSINHVIEN`

Lưu các đối tượng ưu tiên mà sinh viên được gán.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `id` | `SERIAL` | PK nội bộ. |
| `MaSv` | `VARCHAR(15)` | FK đến `SINHVIEN.MaSv`. |
| `MaDoiTuong` | `VARCHAR(10)` | FK đến `DOITUONG.MaDoiTuong`. |
| `FileMinhChung` | `VARCHAR(255)` | File minh chứng đối tượng ưu tiên. |
| `GhiChu` | `VARCHAR(200)` | Ghi chú. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |

Ràng buộc: PK `id`; unique (`MaSv`, `MaDoiTuong`); FK đến `SINHVIEN` và `DOITUONG`.

### 4.13. Bảng `QUANTRIVIEN`

Lưu hồ sơ quản trị viên gắn với tài khoản admin.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaQuanTriVien` | `SERIAL` | PK, mã quản trị viên. |
| `MaTaiKhoan` | `INTEGER` | FK đến `NGUOIDUNG.MaTaiKhoan`, duy nhất. |
| `HoTen` | `VARCHAR(100)` | Họ tên quản trị viên. |
| `NgaySinh` | `DATE` | Ngày sinh. |
| `GioiTinh` | `VARCHAR(5)` | Giới tính. |
| `Sdt`, `Email`, `DiaChi` | Nhiều kiểu | Thông tin liên hệ. |
| `ChucVu`, `PhongBan` | `VARCHAR` | Chức vụ và phòng ban. |
| `AnhDaiDien` | `VARCHAR(500)` | Đường dẫn ảnh đại diện. |
| `GhiChu` | `VARCHAR(300)` | Ghi chú. |
| `TrangThai` | `BOOLEAN` | Trạng thái hoạt động. |
| `NgayTao`, `NgayCapNhat` | `TIMESTAMP` | Thời điểm tạo/cập nhật. |

Ràng buộc: PK `MaQuanTriVien`; unique `MaTaiKhoan`; check `GioiTinh`; FK `MaTaiKhoan`.

### 4.14. Bảng `MONHOC`

Lưu danh mục môn học, số tiết và số tín chỉ tự động.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaMonHoc` | `VARCHAR(15)` | PK, mã môn học. |
| `TenMonHoc` | `VARCHAR(150)` | Tên môn học. |
| `MaKhoa` | `VARCHAR(10)` | FK đến `KHOA.MaKhoa`. |
| `LoaiMon` | `VARCHAR(5)` | Loại môn: `LT` hoặc `TH`. |
| `SoTiet` | `INTEGER` | Số tiết học. |
| `SoTinChi` | `INTEGER GENERATED` | Số tín chỉ tự động: LT chia 15, TH chia 30. |
| `MoTa` | `VARCHAR(500)` | Mô tả môn học. |
| `TrangThai` | `BOOLEAN` | Trạng thái hoạt động. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaMonHoc`; FK `MaKhoa`; check `LoaiMon`; check `SoTiet > 0`.

### 4.15. Bảng `DIEUKIENMONHOC`

Lưu điều kiện tiên quyết hoặc học trước giữa các môn học.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `id` | `SERIAL` | PK nội bộ. |
| `MaMonHoc` | `VARCHAR(15)` | FK đến môn học chính. |
| `MaMonDieuKien` | `VARCHAR(15)` | FK đến môn học điều kiện. |
| `LoaiDieuKien` | `VARCHAR(20)` | Loại điều kiện: `tien_quyet` hoặc `hoc_truoc`. |
| `MoTa` | `VARCHAR(200)` | Mô tả điều kiện. |
| `TrangThai`, `NgayTao` | `BOOLEAN`, `TIMESTAMP` | Trạng thái và thời điểm tạo. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `id`; unique (`MaMonHoc`, `MaMonDieuKien`, `LoaiDieuKien`); check `LoaiDieuKien`; 2 FK đến `MONHOC`.

### 4.16. Bảng `TIETHOC`

Lưu danh mục tiết học trong ngày.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaTiet` | `VARCHAR(10)` | PK, mã tiết học. |
| `TenTiet` | `VARCHAR(50)` | Tên tiết học. |
| `GioBatDau` | `TIME` | Giờ bắt đầu. |
| `GioKetThuc` | `TIME` | Giờ kết thúc. |
| `ThuTu` | `INTEGER` | Thứ tự tiết trong ngày, từ 1 đến 11. |
| `MoTa` | `VARCHAR(200)` | Mô tả. |
| `TrangThai`, `NgayTao` | `BOOLEAN`, `TIMESTAMP` | Trạng thái và thời điểm tạo. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaTiet`; check `ThuTu` từ 1 đến 11.

### 4.17. Bảng `THAMSO`

Lưu tham số hệ thống dạng singleton.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `id` | `SMALLINT` | PK, chỉ cho giá trị 1. |
| `SoTinChiDangKyToiThieu` | `INTEGER` | Số tín chỉ đăng ký tối thiểu. |
| `SoTinChiDangKyToiDa` | `INTEGER` | Số tín chỉ đăng ký tối đa mặc định. |
| `SoTinChiDangKyToiDaKhiVuot` | `INTEGER` | Giới hạn tối đa khi được phép vượt. |
| `NgayCapNhat` | `TIMESTAMP` | Thời điểm cập nhật tham số. |
| `DanhSachMonAnhVanBatBuoc` | `VARCHAR(200)` | Danh sách mã môn Anh văn bắt buộc, cách nhau bằng dấu phẩy. |
| `NamKiemTraAnhVan` | `INTEGER` | Năm học dùng để kiểm tra điều kiện Anh văn. |
| `GioiHanTinChiChuaDatAnhVan` | `INTEGER` | Giới hạn tín chỉ nếu chưa đạt điều kiện Anh văn. |

Ràng buộc: PK `id`; check `id = 1`; check quan hệ các ngưỡng tín chỉ.

### 4.18. Bảng `LOP`

Lưu các lớp học theo môn học.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaLop` | `VARCHAR(20)` | PK, mã lớp. |
| `TenLop` | `VARCHAR(100)` | Tên lớp. |
| `MaMonHoc` | `VARCHAR(15)` | FK đến `MONHOC.MaMonHoc`. |
| `GiangVien` | `VARCHAR(100)` | Giảng viên phụ trách. |
| `LichHoc` | `VARCHAR(200)` | Mô tả lịch học tổng quát. |
| `PhongHoc` | `VARCHAR(50)` | Phòng học mặc định. |
| `SoLuongToiDa` | `INTEGER` | Sĩ số tối đa. |
| `MoTa` | `VARCHAR(300)` | Mô tả lớp. |
| `TrangThai`, `NgayTao` | `BOOLEAN`, `TIMESTAMP` | Trạng thái và thời điểm tạo. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaLop`; FK `MaMonHoc`.

### 4.19. Bảng `CHUONGTRINHHOC`

Lưu môn học trong chương trình đào tạo của từng ngành.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `id` | `SERIAL` | PK nội bộ. |
| `MaNganh` | `VARCHAR(10)` | FK đến `NGANHHOC.MaNganh`. |
| `MaMonHoc` | `VARCHAR(15)` | FK đến `MONHOC.MaMonHoc`. |
| `HocKy` | `INTEGER` | Học kỳ trong chương trình gốc. |
| `GhiChu` | `VARCHAR(200)` | Ghi chú. |
| `HocKyDuKien` | `INTEGER` | Học kỳ dự kiến hiển thị trên ứng dụng. |
| `BatBuoc` | `BOOLEAN` | Môn bắt buộc hay tự chọn. |
| `TrangThai` | `BOOLEAN` | Trạng thái hoạt động. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |

Ràng buộc: PK `id`; unique (`MaNganh`, `MaMonHoc`); check `HocKy` từ 1 đến 10; FK đến `NGANHHOC` và `MONHOC`.

### 4.20. Bảng `NAMHOC`

Lưu năm học.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaNamHoc` | `VARCHAR(15)` | PK, mã năm học. |
| `TenNamHoc` | `VARCHAR(50)` | Tên năm học. |
| `NamBatDau` | `INTEGER` | Năm bắt đầu. |
| `NamKetThuc` | `INTEGER` | Năm kết thúc. |
| `TrangThai` | `BOOLEAN` | Trạng thái hoạt động. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |

Ràng buộc: PK `MaNamHoc`. Ghi chú nghiệp vụ: RBTV08 yêu cầu `NamKetThuc = NamBatDau + 1` hoặc tối thiểu `NamKetThuc > NamBatDau`.

### 4.21. Bảng `HOCKY`

Lưu học kỳ thuộc năm học, gồm thời gian học, thời gian đăng ký và hạn đóng học phí.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaHocKy` | `VARCHAR(15)` | PK, mã học kỳ. |
| `TenHocKy` | `VARCHAR(50)` | Tên học kỳ. |
| `MaNamHoc` | `VARCHAR(15)` | FK đến `NAMHOC.MaNamHoc`. |
| `LoaiHocKy` | `VARCHAR(20)` | Loại học kỳ: `Chính` hoặc `Hè`. |
| `NgayBatDau` | `DATE` | Ngày bắt đầu học kỳ. |
| `NgayKetThuc` | `DATE` | Ngày kết thúc học kỳ. |
| `NgayBatDauDangKy` | `TIMESTAMP` | Thời điểm bắt đầu đăng ký học phần. |
| `NgayKetThucDangKy` | `TIMESTAMP` | Thời điểm kết thúc đăng ký học phần. |
| `HanDongHocPhi` | `DATE` | Hạn đóng học phí. |
| `TrangThai` | `VARCHAR(20)` | Trạng thái học kỳ: `Sắp diễn ra`, `Đang diễn ra`, `Đã kết thúc`. |
| `GhiChu` | `VARCHAR(300)` | Ghi chú. |
| `ThuTu` | `INTEGER` | Thứ tự học kỳ trong năm học. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaHocKy`; FK `MaNamHoc`; check `LoaiHocKy`; check `TrangThai`.

### 4.22. Bảng `LOPMO`

Lưu các lớp được mở trong từng học kỳ.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `id` | `SERIAL` | PK nội bộ của lớp mở. |
| `MaHocKy` | `VARCHAR(15)` | FK đến `HOCKY.MaHocKy`. |
| `MaLop` | `VARCHAR(20)` | FK đến `LOP.MaLop`. |
| `SoLuongDaDangKy` | `INTEGER` | Số sinh viên đã đăng ký lớp mở. |
| `GhiChu` | `VARCHAR(200)` | Ghi chú. |
| `TrangThai` | `BOOLEAN` | Lớp mở còn hoạt động hay không. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |

Ràng buộc: PK `id`; unique (`MaHocKy`, `MaLop`); FK đến `HOCKY` và `LOP`.

### 4.23. Bảng `LICHHOCLOP`

Lưu lịch học chi tiết của lớp mở theo thứ, tiết bắt đầu, tiết kết thúc và phòng học.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `id` | `SERIAL` | PK nội bộ lịch học. |
| `LopMoId` | `INTEGER` | FK đến `LOPMO.id`. |
| `ThuTrongTuan` | `INTEGER` | Thứ trong tuần, từ 2 đến 7. |
| `MaTietBatDau` | `VARCHAR(10)` | FK đến `TIETHOC.MaTiet`, tiết bắt đầu. |
| `MaTietKetThuc` | `VARCHAR(10)` | FK đến `TIETHOC.MaTiet`, tiết kết thúc. |
| `PhongHoc` | `VARCHAR(50)` | Phòng học. |
| `GhiChu` | `VARCHAR(200)` | Ghi chú. |
| `TrangThai`, `NgayTao` | `BOOLEAN`, `TIMESTAMP` | Trạng thái và thời điểm tạo. |

Ràng buộc: PK `id`; FK đến `LOPMO` và `TIETHOC`; check `ThuTrongTuan` từ 2 đến 7.

### 4.24. Bảng `DONGIATINCHI`

Lưu đơn giá tín chỉ theo loại môn, loại học và học kỳ.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `id` | `SERIAL` | PK nội bộ đơn giá. |
| `LoaiMon` | `VARCHAR(5)` | Loại môn: `LT` hoặc `TH`. |
| `LoaiHoc` | `VARCHAR(20)` | Loại học: `hoc_moi`, `hoc_lai`, `hoc_cai_thien`, `hoc_he`. |
| `DonGia` | `DECIMAL(12,0)` | Đơn giá một tín chỉ. |
| `MaHocKy` | `VARCHAR(15)` | FK đến `HOCKY.MaHocKy`, có thể NULL cho đơn giá chung. |
| `NgayApDung` | `DATE` | Ngày áp dụng đơn giá. |
| `TrangThai` | `BOOLEAN` | Đơn giá còn hiệu lực hay không. |
| `GhiChu` | `VARCHAR(200)` | Ghi chú. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `id`; unique (`LoaiMon`, `LoaiHoc`, `MaHocKy`); check `LoaiMon`; check `LoaiHoc`; FK `MaHocKy`.

### 4.25. Bảng `PHIEUDANGKY`

Lưu phiếu đăng ký học phần của sinh viên trong một học kỳ, gồm các cột tổng hợp tín chỉ và học phí.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `SoPhieu` | `SERIAL` | PK, số phiếu đăng ký. |
| `MaSv` | `VARCHAR(15)` | FK đến `SINHVIEN.MaSv`. |
| `MaHocKy` | `VARCHAR(15)` | FK đến `HOCKY.MaHocKy`. |
| `NgayLap` | `TIMESTAMP` | Thời điểm lập phiếu. |
| `TongTinChi` | `INTEGER` | Tổng tín chỉ đăng ký hiệu lực. |
| `TongTienDangKy` | `DECIMAL(15,0)` | Tổng học phí trước miễn giảm. |
| `TienMienGiam` | `DECIMAL(15,0)` | Số tiền được miễn giảm. |
| `TrangThai` | `VARCHAR(30)` | Trạng thái phiếu: `Đã đăng ký` hoặc `Đã hủy`. |
| `GhiChu` | `VARCHAR(300)` | Ghi chú. |
| `NgayCapNhat` | `TIMESTAMP` | Thời điểm cập nhật phiếu. |
| `SoMonHocMoi`, `SoTinChiHocMoi`, `TienHocMoi` | Nhiều kiểu | Thống kê số môn, tín chỉ và tiền học mới. |
| `SoMonHocLai`, `SoTinChiHocLai`, `TienHocLai` | Nhiều kiểu | Thống kê số môn, tín chỉ và tiền học lại. |
| `SoMonHocCaiThien`, `SoTinChiHocCaiThien`, `TienHocCaiThien` | Nhiều kiểu | Thống kê số môn, tín chỉ và tiền học cải thiện. |
| `TiLeGiam` | `NUMERIC(5,2)` | Tỷ lệ giảm học phí áp dụng cho phiếu. |
| `TongTienPhaiDong` | `NUMERIC(15,0)` | Số tiền phải đóng sau miễn giảm. |

Ràng buộc: PK `SoPhieu`; unique (`MaSv`, `MaHocKy`); check `TrangThai`; FK đến `SINHVIEN` và `HOCKY`.

### 4.26. Bảng `CHITIETDANGKY`

Lưu các lớp/môn cụ thể trong một phiếu đăng ký.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `id` | `SERIAL` | PK nội bộ chi tiết đăng ký. |
| `SoPhieu` | `INTEGER` | FK đến `PHIEUDANGKY.SoPhieu`. |
| `MaLop` | `VARCHAR(20)` | FK đến `LOP.MaLop`. |
| `MaMonHoc` | `VARCHAR(15)` | FK đến `MONHOC.MaMonHoc`, môn học của lớp đăng ký. |
| `LoaiDangKy` | `VARCHAR(20)` | Loại đăng ký: `hoc_moi`, `hoc_lai`, `hoc_cai_thien`. |
| `DonGia` | `DECIMAL(12,0)` | Đơn giá áp dụng. |
| `ThanhTien` | `DECIMAL(15,0)` | Thành tiền chi tiết. |
| `TrangThai` | `VARCHAR(30)` | Trạng thái chi tiết: `Đã đăng ký` hoặc `Đã hủy`. |
| `NgayDangKy` | `TIMESTAMP` | Thời điểm đăng ký. |
| `NgayHuy` | `TIMESTAMP` | Thời điểm hủy. |
| `LyDoHuy` | `VARCHAR(200)` | Lý do hủy. |
| `SoTinChi` | `INTEGER` | Số tín chỉ tại thời điểm đăng ký. |
| `LoaiMon` | `VARCHAR(5)` | Loại môn tại thời điểm đăng ký. |

Ràng buộc: PK `id`; unique (`SoPhieu`, `MaMonHoc`); check `TrangThai`; check `LoaiDangKy`; FK đến `PHIEUDANGKY`, `LOP`, `MONHOC`.

### 4.27. Bảng `MONDAHOC`

Lưu lịch sử môn sinh viên đã học và kết quả qua/rớt.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `id` | `SERIAL` | PK nội bộ. |
| `MaSv` | `VARCHAR(15)` | FK đến `SINHVIEN.MaSv`. |
| `MaMonHoc` | `VARCHAR(15)` | FK đến `MONHOC.MaMonHoc`. |
| `MaHocKy` | `VARCHAR(15)` | FK đến `HOCKY.MaHocKy`. |
| `MaLop` | `VARCHAR(20)` | FK đến `LOP.MaLop`, có thể NULL. |
| `LanHoc` | `INTEGER` | Lần học của môn. |
| `KetQua` | `VARCHAR(20)` | Kết quả: `qua_mon` hoặc `rot`. |
| `GhiChu` | `VARCHAR(300)` | Ghi chú kết quả. |
| `NguoiCapNhat` | `INTEGER` | FK đến `NGUOIDUNG.MaTaiKhoan`, người cập nhật kết quả. |
| `NgayTao`, `NgayCapNhat` | `TIMESTAMP` | Thời điểm tạo/cập nhật. |
| `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Thông tin xóa mềm. |

Ràng buộc: PK `id`; unique (`MaSv`, `MaMonHoc`, `MaHocKy`, `LanHoc`); check `KetQua`; FK đến `SINHVIEN`, `MONHOC`, `HOCKY`, `LOP`, `NGUOIDUNG`. Chỉ mục: `idx_mdh_sv_mon` trên (`MaSv`, `MaMonHoc`).

### 4.28. Bảng `PHIEUTHUHOCPHI`

Lưu phiếu thu học phí và thông tin thanh toán.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `SoPhieuThu` | `SERIAL` | PK, số phiếu thu. |
| `SoPhieuDangKy` | `INTEGER` | FK đến `PHIEUDANGKY.SoPhieu`. |
| `MaSv` | `VARCHAR(15)` | FK đến `SINHVIEN.MaSv`. |
| `NgayLap` | `TIMESTAMP` | Thời điểm lập phiếu thu. |
| `SoTienThu` | `DECIMAL(15,0)` | Số tiền thu. |
| `HinhThucThu` | `VARCHAR(50)` | Hình thức thu: `Tiền mặt`, `Chuyển khoản`, `Thẻ`, `Ví điện tử`. |
| `MaGiaoDich` | `VARCHAR(100)` | Mã giao dịch thanh toán. |
| `GhiChu` | `VARCHAR(300)` | Ghi chú phiếu thu. |
| `TrangThai` | `VARCHAR(20)` | Trạng thái thanh toán: `Chờ xác nhận`, `Thành công`, `Thất bại`, `Đã hủy`. |
| `NguoiThu` | `VARCHAR(100)` | Người hoặc kênh thu tiền. |
| `PaymentProvider` | `VARCHAR(30)` | Nhà cung cấp/loại thanh toán. |
| `PaymentChannel` | `VARCHAR(30)` | Kênh tạo thanh toán, ví dụ admin/student. |
| `CheckoutUrl` | `VARCHAR(1000)` | URL thanh toán nếu có. |
| `QrPayload` | `TEXT` | Nội dung QR/thông tin thanh toán. |
| `NgayXacNhan` | `TIMESTAMP` | Thời điểm xác nhận thanh toán. |
| `NgayCapNhat` | `TIMESTAMP` | Thời điểm cập nhật. |

Ràng buộc: PK `SoPhieuThu`; check `SoTienThu > 0`; check `HinhThucThu`; check `TrangThai`; FK đến `PHIEUDANGKY` và `SINHVIEN`.

### 4.29. Bảng `THONGBAO`

Lưu thông báo cá nhân hoặc thông báo được phân loại trong hệ thống.

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa |
| --- | --- | --- |
| `MaThongBao` | `SERIAL` | PK, mã thông báo. |
| `MaTaiKhoanNhan` | `INTEGER` | FK đến `NGUOIDUNG.MaTaiKhoan`, tài khoản nhận thông báo. |
| `TieuDe` | `VARCHAR(200)` | Tiêu đề thông báo. |
| `NoiDung` | `TEXT` | Nội dung thông báo. |
| `DuongDan` | `VARCHAR(255)` | Đường dẫn liên quan. |
| `DaDoc` | `BOOLEAN` | Đã đọc hay chưa. |
| `NgayDoc` | `TIMESTAMP` | Thời điểm đọc. |
| `NgayTao` | `TIMESTAMP` | Thời điểm tạo. |
| `Loai` | `VARCHAR(20)` | Loại thông báo kỹ thuật: `chung`, `hoc_vu`, `tai_chinh`, `he_thong`, ... |
| `LoaiThongBao` | `VARCHAR(50)` | Tên loại thông báo hiển thị. |
| `DOITUONG` | `VARCHAR(30)` | Đối tượng nhận thông báo theo UI, ví dụ `Tất cả`, `Admin`, `Sinh viên`. |
| `GhimTop` | `BOOLEAN` | Có ghim thông báo lên đầu danh sách hay không. |
| `NgayHetHan` | `TIMESTAMP` | Ngày hết hạn thông báo. |
| `NguoiTao` | `INTEGER` | Tài khoản tạo thông báo. |
| `TrangThai` | `BOOLEAN` | Trạng thái hiển thị/hoạt động. |
| `NguoiCapNhat`, `NgayCapNhat`, `DaXoa`, `NguoiXoa`, `NgayXoa` | Nhiều kiểu | Nhóm cột audit/xóa mềm. |

Ràng buộc: PK `MaThongBao`; FK `MaTaiKhoanNhan`.

## 5. Quan hệ khóa ngoại chính

| Bảng con | Bảng cha | Ý nghĩa |
| --- | --- | --- |
| `PHUONGXA.MaTinh` | `TINH.MaTinh` | Phường/xã thuộc tỉnh/thành phố. |
| `NGANHHOC.MaKhoa` | `KHOA.MaKhoa` | Ngành học thuộc khoa. |
| `SINHVIEN.MaPhuongXa` | `PHUONGXA.MaPhuongXa` | Địa bàn của sinh viên. |
| `SINHVIEN.MaDanToc` | `DANTOC.MaDanToc` | Dân tộc của sinh viên. |
| `SINHVIEN.MaNganh` | `NGANHHOC.MaNganh` | Ngành học của sinh viên. |
| `SINHVIEN.MaTaiKhoan` | `NGUOIDUNG.MaTaiKhoan` | Tài khoản đăng nhập của sinh viên. |
| `NGUOIDUNG.MaSv` | `SINHVIEN.MaSv` | Liên kết ngược tài khoản với sinh viên. |
| `DOITUONGSINHVIEN.MaSv` | `SINHVIEN.MaSv` | Sinh viên thuộc đối tượng ưu tiên. |
| `DOITUONGSINHVIEN.MaDoiTuong` | `DOITUONG.MaDoiTuong` | Đối tượng ưu tiên của sinh viên. |
| `MONHOC.MaKhoa` | `KHOA.MaKhoa` | Khoa quản lý môn học. |
| `DIEUKIENMONHOC.MaMonHoc` | `MONHOC.MaMonHoc` | Môn học chính. |
| `DIEUKIENMONHOC.MaMonDieuKien` | `MONHOC.MaMonHoc` | Môn học điều kiện. |
| `CHUONGTRINHHOC.MaNganh` | `NGANHHOC.MaNganh` | Chương trình của ngành. |
| `CHUONGTRINHHOC.MaMonHoc` | `MONHOC.MaMonHoc` | Môn trong chương trình. |
| `HOCKY.MaNamHoc` | `NAMHOC.MaNamHoc` | Học kỳ thuộc năm học. |
| `LOPMO.MaHocKy` | `HOCKY.MaHocKy` | Lớp được mở trong học kỳ. |
| `LOPMO.MaLop` | `LOP.MaLop` | Lớp học được mở. |
| `LICHHOCLOP.LopMoId` | `LOPMO.id` | Lịch học của lớp mở. |
| `LICHHOCLOP.MaTietBatDau`, `MaTietKetThuc` | `TIETHOC.MaTiet` | Khung tiết học của lịch. |
| `PHIEUDANGKY.MaSv` | `SINHVIEN.MaSv` | Phiếu đăng ký của sinh viên. |
| `PHIEUDANGKY.MaHocKy` | `HOCKY.MaHocKy` | Phiếu đăng ký trong học kỳ. |
| `CHITIETDANGKY.SoPhieu` | `PHIEUDANGKY.SoPhieu` | Chi tiết thuộc phiếu đăng ký. |
| `CHITIETDANGKY.MaLop` | `LOP.MaLop` | Lớp sinh viên đăng ký. |
| `CHITIETDANGKY.MaMonHoc` | `MONHOC.MaMonHoc` | Môn học đăng ký. |
| `MONDAHOC.MaSv` | `SINHVIEN.MaSv` | Lịch sử học của sinh viên. |
| `MONDAHOC.MaMonHoc` | `MONHOC.MaMonHoc` | Môn đã học. |
| `MONDAHOC.MaHocKy` | `HOCKY.MaHocKy` | Học kỳ đã học. |
| `PHIEUTHUHOCPHI.SoPhieuDangKy` | `PHIEUDANGKY.SoPhieu` | Thu học phí theo phiếu đăng ký. |
| `PHIEUTHUHOCPHI.MaSv` | `SINHVIEN.MaSv` | Sinh viên đóng học phí. |
| `THONGBAO.MaTaiKhoanNhan` | `NGUOIDUNG.MaTaiKhoan` | Tài khoản nhận thông báo. |

## 6. Dữ liệu mẫu trong `init.sql`

| Nhóm dữ liệu | Bảng liên quan |
| --- | --- |
| Địa danh, dân tộc | `TINH`, `PHUONGXA`, `DANTOC` |
| Đối tượng ưu tiên | `DOITUONG`, `DOITUONGSINHVIEN` |
| Phân quyền | `NHOMNGUOIDUNG`, `CHUCNANG`, `PHANQUYEN`, `NGUOIDUNG`, `QUANTRIVIEN` |
| Đào tạo | `KHOA`, `NGANHHOC`, `MONHOC`, `DIEUKIENMONHOC`, `CHUONGTRINHHOC` |
| Học kỳ, lớp, lịch | `NAMHOC`, `HOCKY`, `LOP`, `LOPMO`, `LICHHOCLOP`, `TIETHOC` |
| Đăng ký và học phí | `PHIEUDANGKY`, `CHITIETDANGKY`, `DONGIATINCHI`, `PHIEUTHUHOCPHI` |
| Lịch sử học và thông báo | `MONDAHOC`, `THONGBAO` |

## 7. Index, function và trigger

| Thành phần | Vị trí | Ý nghĩa |
| --- | --- | --- |
| `idx_mdh_sv_mon` | `MONDAHOC(MaSv, MaMonHoc)` | Tăng tốc truy vấn lịch sử học theo sinh viên và môn học. |
| `prevent_student_schedule_conflict()` | Function PL/pgSQL | Kiểm tra lớp mới đăng ký có trùng lịch với lớp đã đăng ký của cùng sinh viên trong cùng học kỳ hay không. |
| `trg_prevent_student_schedule_conflict` | Trigger trên `CHITIETDANGKY` | Chạy trước `INSERT` hoặc `UPDATE OF SoPhieu, MaLop, TrangThai`; nếu trùng lịch thì báo lỗi. |

## 8. Ghi chú nghiệp vụ quan trọng

- Vùng sâu vùng xa được suy ra từ sinh viên có `PHUONGXA.KhuVuc = 'KV3'` và `DANTOC.LaDanTocThieuSo = TRUE`.
- `MONHOC.SoTinChi` là cột generated, tính từ `LoaiMon` và `SoTiet`; nếu `SoTiet` không chia hết theo quy tắc thì số tín chỉ có thể bị làm tròn do phép chia số nguyên.
- `PHIEUDANGKY` có nhiều cột tổng hợp học phí. Trong `init.sql`, các cột này được tính lại một lần bằng câu `UPDATE`; nếu dữ liệu thay đổi sau đó thì cần trigger/service duy trì.
- `LOPMO.SoLuongDaDangKy` là số lượng đăng ký hiện tại của lớp mở; cần được đồng bộ với `CHITIETDANGKY`.
- `PHIEUTHUHOCPHI.TrangThai` chấp nhận 4 trạng thái: `Chờ xác nhận`, `Thành công`, `Thất bại`, `Đã hủy`.
- Các bảng có `DaXoa` dùng xóa mềm; khi truy vấn dữ liệu đang hoạt động nên lọc `DaXoa = FALSE` nếu cột này tồn tại.
