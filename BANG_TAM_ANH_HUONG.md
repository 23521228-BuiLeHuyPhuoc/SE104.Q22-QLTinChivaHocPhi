# Bảng tầm ảnh hưởng cơ sở dữ liệu

Nguồn phân tích: `project/src/config/init.sql` — **29 bảng, 39 quan hệ khóa ngoại**.

## Quy ước

### Ký hiệu trong bảng ma trận

- `+` : Có ảnh hưởng (xem chú thích thuộc tính ảnh hưởng bên dưới)
- `-` : Không ảnh hưởng

### Hành vi ràng buộc

| Hành vi | Ý nghĩa |
|---------|---------|
| `CASCADE` | Xóa/sửa lan truyền sang bảng con |
| `RESTRICT` | Chặn xóa nếu còn bản ghi tham chiếu |
| `SET NULL` | Đặt FK ở bảng con thành NULL |

### Cách đọc bảng ma trận

- **Hàng** = bảng đang thao tác (Thêm/Xóa/Sửa PK)
- **Cột** = bảng bị ảnh hưởng bởi thao tác đó
- `+` tại ô (hàng X, cột Y) = khi thao tác trên bảng X, bảng Y bị ảnh hưởng

---

## Danh sách 29 bảng (đánh số thứ tự)

| STT | Tên bảng | Viết tắt | Mô tả |
|-----|----------|----------|-------|
| 1 | `TINH` | TINH | Tỉnh/Thành phố |
| 2 | `DANTOC` | DT | Dân tộc |
| 3 | `PHUONGXA` | PX | Phường/Xã |
| 4 | `DOITUONG` | DTG | Đối tượng ưu tiên |
| 5 | `KHOA` | KHOA | Khoa |
| 6 | `NGANHHOC` | NH | Ngành học |
| 7 | `CHUCNANG` | CN | Chức năng |
| 8 | `NHOMNGUOIDUNG` | NND | Nhóm người dùng |
| 9 | `PHANQUYEN` | PQ | Phân quyền |
| 10 | `NGUOIDUNG` | ND | Người dùng (tài khoản) |
| 11 | `SINHVIEN` | SV | Sinh viên |
| 12 | `DOITUONGSINHVIEN` | DTSV | Đối tượng sinh viên |
| 13 | `QUANTRIVIEN` | QTV | Quản trị viên |
| 14 | `MONHOC` | MH | Môn học |
| 15 | `DIEUKIENMONHOC` | DKMH | Điều kiện môn học |
| 16 | `TIETHOC` | TIET | Tiết học |
| 17 | `THAMSO` | TS | Tham số hệ thống |
| 18 | `LOP` | LOP | Lớp học |
| 19 | `CHUONGTRINHHOC` | CTH | Chương trình học |
| 20 | `NAMHOC` | NAM | Năm học |
| 21 | `HOCKY` | HK | Học kỳ |
| 22 | `LOPMO` | LM | Lớp mở |
| 23 | `LICHHOCLOP` | LHL | Lịch học lớp |
| 24 | `DONGIATINCHI` | DGTC | Đơn giá tín chỉ |
| 25 | `PHIEUDANGKY` | PDK | Phiếu đăng ký |
| 26 | `CHITIETDANGKY` | CTDK | Chi tiết đăng ký |
| 27 | `MONDAHOC` | MDH | Môn đã học |
| 28 | `PHIEUTHUHOCPHI` | PTHP | Phiếu thu học phí |
| 29 | `THONGBAO` | TB | Thông báo |

---

## BẢNG MA TRẬN TẦM ẢNH HƯỞNG — THÊM (INSERT)

> Khi **thêm** bản ghi vào bảng ở **hàng**, bảng nào ở **cột** cần kiểm tra (FK phụ thuộc)?

| Hàng \ Cột | TINH | DT | PX | DTG | KHOA | NH | CN | NND | PQ | ND | SV | DTSV | QTV | MH | DKMH | TIET | TS | LOP | CTH | NAM | HK | LM | LHL | DGTC | PDK | CTDK | MDH | PTHP | TB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TINH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DT** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PX** | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DTG** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **KHOA** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NH** | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **CN** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NND** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PQ** | - | - | - | - | - | - | + | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **ND** | - | - | - | - | - | - | - | + | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **SV** | - | + | + | - | - | + | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DTSV** | - | - | - | + | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **QTV** | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MH** | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DKMH** | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TIET** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TS** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **LOP** | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **CTH** | - | - | - | - | - | + | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NAM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **HK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - |
| **LM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | + | - | - | - | - | - | - | - | - |
| **LHL** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | + | - | - | - | - | - | - | - |
| **DGTC** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - |
| **PDK** | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - |
| **CTDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | + | - | - | - | - | - | - | + | - | - | - | - |
| **MDH** | - | - | - | - | - | - | - | - | - | + | + | - | - | + | - | - | - | + | - | - | + | - | - | - | - | - | - | - | - |
| **PTHP** | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - |
| **TB** | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |

---

## BẢNG MA TRẬN TẦM ẢNH HƯỞNG — XÓA (DELETE)

> Khi **xóa** bản ghi ở bảng **hàng**, bảng nào ở **cột** bị ảnh hưởng?

| Hàng \ Cột | TINH | DT | PX | DTG | KHOA | NH | CN | NND | PQ | ND | SV | DTSV | QTV | MH | DKMH | TIET | TS | LOP | CTH | NAM | HK | LM | LHL | DGTC | PDK | CTDK | MDH | PTHP | TB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TINH** | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DT** | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PX** | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DTG** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **KHOA** | - | - | - | - | - | + | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NH** | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - |
| **CN** | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NND** | - | - | - | - | - | - | - | - | + | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PQ** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **ND** | - | - | - | - | - | - | - | - | - | - | + | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + |
| **SV** | - | - | - | - | - | - | - | - | - | + | - | + | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | + | - |
| **DTSV** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **QTV** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | + | + | - | - | - | - | - | - | + | + | - | - |
| **DKMH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TIET** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - |
| **TS** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **LOP** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | + | + | - | - |
| **CTH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NAM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - |
| **HK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | + | - | + | - | - |
| **LM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - |
| **LHL** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DGTC** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | - |
| **CTDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MDH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PTHP** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TB** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |

---

## BẢNG MA TRẬN TẦM ẢNH HƯỞNG — SỬA KHÓA CHÍNH (UPDATE PK)

> Khi **sửa khóa chính** của bảng ở **hàng**, bảng nào ở **cột** bị ảnh hưởng (ON UPDATE CASCADE)?

| Hàng \ Cột | TINH | DT | PX | DTG | KHOA | NH | CN | NND | PQ | ND | SV | DTSV | QTV | MH | DKMH | TIET | TS | LOP | CTH | NAM | HK | LM | LHL | DGTC | PDK | CTDK | MDH | PTHP | TB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TINH** | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DT** | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PX** | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DTG** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **KHOA** | - | - | - | - | - | + | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NH** | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - |
| **CN** | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NND** | - | - | - | - | - | - | - | - | + | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PQ** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **ND** | - | - | - | - | - | - | - | - | - | - | + | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + |
| **SV** | - | - | - | - | - | - | - | - | - | + | - | + | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | + | - |
| **DTSV** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **QTV** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | + | + | - | - | - | - | - | - | + | + | - | - |
| **DKMH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TIET** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - |
| **TS** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **LOP** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | + | + | - | - |
| **CTH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NAM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - |
| **HK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | + | - | + | - | - |
| **LM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - |
| **LHL** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DGTC** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | - |
| **CTDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MDH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PTHP** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TB** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |

---

## CHÚ THÍCH CHI TIẾT — BẢNG TẦM ẢNH HƯỞNG TỪNG BẢNG

> **Cách đọc:** Cột **Tên Bảng** là bảng được kiểm tra khi thêm hoặc bị ảnh hưởng khi xóa/sửa từ thao tác trên bảng đang xét.

---

### 1. Bảng `TINH`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `PHUONGXA` | - | + RESTRICT: chặn xóa nếu còn PHUONGXA tham chiếu | + CASCADE: cập nhật `MaTinh` lan truyền đến PHUONGXA |

---

### 2. Bảng `DANTOC`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `SINHVIEN` | - | + SET NULL: đặt `MaDanToc` của SV thành NULL | + CASCADE: cập nhật `MaDanToc` lan truyền đến SINHVIEN |

---

### 3. Bảng `PHUONGXA`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `TINH` | + Kiểm tra `TINH.MaTinh` phải tồn tại | - | + Kiểm tra FK khi sửa `MaTinh` |
| `SINHVIEN` | - | + RESTRICT: chặn xóa nếu còn SV tham chiếu | + CASCADE: cập nhật `MaPhuongXa` lan truyền đến SINHVIEN |

---

### 4. Bảng `DOITUONG`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `DOITUONGSINHVIEN` | - | + RESTRICT: chặn xóa nếu còn DTSV tham chiếu | + CASCADE: cập nhật `MaDoiTuong` lan truyền đến DOITUONGSINHVIEN |

---

### 5. Bảng `KHOA`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `NGANHHOC` | - | + RESTRICT: chặn xóa nếu còn ngành thuộc khoa | + CASCADE: cập nhật `MaKhoa` lan truyền đến NGANHHOC |
| `MONHOC` | - | + RESTRICT: chặn xóa nếu còn môn thuộc khoa | + CASCADE: cập nhật `MaKhoa` lan truyền đến MONHOC |

---

### 6. Bảng `NGANHHOC`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `KHOA` | + Kiểm tra `KHOA.MaKhoa` phải tồn tại | - | + Kiểm tra FK khi sửa `MaKhoa` |
| `SINHVIEN` | - | + RESTRICT: chặn xóa nếu còn SV thuộc ngành | + CASCADE: cập nhật `MaNganh` lan truyền đến SINHVIEN |
| `CHUONGTRINHHOC` | - | + CASCADE: xóa chương trình học liên quan | + CASCADE: cập nhật `MaNganh` lan truyền đến CHUONGTRINHHOC |

---

### 7. Bảng `CHUCNANG`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `PHANQUYEN` | - | + CASCADE: xóa phân quyền liên quan | + CASCADE: cập nhật `MaChucNang` lan truyền đến PHANQUYEN |

---

### 8. Bảng `NHOMNGUOIDUNG`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `PHANQUYEN` | - | + CASCADE: xóa phân quyền liên quan | + CASCADE: cập nhật `MaNhom` lan truyền đến PHANQUYEN |
| `NGUOIDUNG` | - | + RESTRICT: chặn xóa nếu còn người dùng thuộc nhóm | + CASCADE: cập nhật `MaNhom` lan truyền đến NGUOIDUNG |

---

### 9. Bảng `PHANQUYEN`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `NHOMNGUOIDUNG` | + Kiểm tra `NHOMNGUOIDUNG.MaNhom` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNhom` |
| `CHUCNANG` | + Kiểm tra `CHUCNANG.MaChucNang` phải tồn tại | - | + Kiểm tra FK khi sửa `MaChucNang` |

---

### 10. Bảng `NGUOIDUNG`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `NHOMNGUOIDUNG` | + Kiểm tra `NHOMNGUOIDUNG.MaNhom` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNhom` |
| `SINHVIEN` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `MaSv` |
| `SINHVIEN` | - | + SET NULL: đặt `MaTaiKhoan` của SV thành NULL | + CASCADE: cập nhật `MaTaiKhoan` lan truyền đến SINHVIEN |
| `QUANTRIVIEN` | - | + CASCADE: xóa quản trị viên liên quan | + CASCADE: cập nhật `MaTaiKhoan` lan truyền đến QUANTRIVIEN |
| `MONDAHOC` | - | + SET NULL: đặt `NguoiCapNhat` thành NULL | + CASCADE: cập nhật `NguoiCapNhat` lan truyền đến MONDAHOC |
| `THONGBAO` | - | + CASCADE: xóa thông báo cá nhân | + CASCADE: cập nhật `MaTaiKhoanNhan` lan truyền đến THONGBAO |

---

### 11. Bảng `SINHVIEN`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `PHUONGXA` | + Kiểm tra `PHUONGXA.MaPhuongXa` phải tồn tại | - | + Kiểm tra FK khi sửa `MaPhuongXa` |
| `DANTOC` | + Kiểm tra `DANTOC.MaDanToc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaDanToc` |
| `NGANHHOC` | + Kiểm tra `NGANHHOC.MaNganh` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNganh` |
| `NGUOIDUNG` | + Kiểm tra `NGUOIDUNG.MaTaiKhoan` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `MaTaiKhoan` |
| `NGUOIDUNG` | - | + SET NULL: đặt `MaSv` trong NGUOIDUNG thành NULL | + CASCADE: cập nhật `MaSv` lan truyền đến NGUOIDUNG |
| `DOITUONGSINHVIEN` | - | + CASCADE: xóa tất cả đối tượng SV liên quan | + CASCADE: cập nhật `MaSv` lan truyền đến DOITUONGSINHVIEN |
| `PHIEUDANGKY` | - | + RESTRICT: chặn xóa nếu còn phiếu đăng ký | + CASCADE: cập nhật `MaSv` lan truyền đến PHIEUDANGKY |
| `MONDAHOC` | - | + CASCADE: xóa tất cả môn đã học liên quan | + CASCADE: cập nhật `MaSv` lan truyền đến MONDAHOC |
| `PHIEUTHUHOCPHI` | - | + RESTRICT: chặn xóa nếu còn phiếu thu HP | + CASCADE: cập nhật `MaSv` lan truyền đến PHIEUTHUHOCPHI |

---

### 12. Bảng `DOITUONGSINHVIEN`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `SINHVIEN` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại | - | + Kiểm tra FK khi sửa `MaSv` |
| `DOITUONG` | + Kiểm tra `DOITUONG.MaDoiTuong` phải tồn tại | - | + Kiểm tra FK khi sửa `MaDoiTuong` |

---

### 13. Bảng `QUANTRIVIEN`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `NGUOIDUNG` | + Kiểm tra `NGUOIDUNG.MaTaiKhoan` phải tồn tại | - | + Kiểm tra FK khi sửa `MaTaiKhoan` |

---

### 14. Bảng `MONHOC`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `KHOA` | + Kiểm tra `KHOA.MaKhoa` phải tồn tại | - | + Kiểm tra FK khi sửa `MaKhoa` |
| `DIEUKIENMONHOC` | - | + CASCADE: xóa điều kiện môn học liên quan | + CASCADE: cập nhật `MaMonHoc` lan truyền đến DIEUKIENMONHOC |
| `DIEUKIENMONHOC` | - | + CASCADE: xóa điều kiện môn học liên quan | + CASCADE: cập nhật `MaMonDieuKien` lan truyền đến DIEUKIENMONHOC |
| `LOP` | - | + CASCADE: xóa tất cả lớp của môn | + CASCADE: cập nhật `MaMonHoc` lan truyền đến LOP |
| `CHUONGTRINHHOC` | - | + CASCADE: xóa khỏi chương trình học | + CASCADE: cập nhật `MaMonHoc` lan truyền đến CHUONGTRINHHOC |
| `CHITIETDANGKY` | - | + RESTRICT: chặn xóa nếu còn chi tiết đăng ký | + CASCADE: cập nhật `MaMonHoc` lan truyền đến CHITIETDANGKY |
| `MONDAHOC` | - | + RESTRICT: chặn xóa nếu còn môn đã học | + CASCADE: cập nhật `MaMonHoc` lan truyền đến MONDAHOC |

---

### 15. Bảng `DIEUKIENMONHOC`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `MONHOC` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại (môn chính) | - | + Kiểm tra FK khi sửa `MaMonHoc` |
| `MONHOC` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại (môn điều kiện) | - | + Kiểm tra FK khi sửa `MaMonDieuKien` |

---

### 16. Bảng `TIETHOC`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `LICHHOCLOP` | - | + RESTRICT: chặn xóa nếu còn lịch học tham chiếu (tiết bắt đầu) | + CASCADE: cập nhật `MaTietBatDau` lan truyền đến LICHHOCLOP |
| `LICHHOCLOP` | - | + RESTRICT: chặn xóa nếu còn lịch học tham chiếu (tiết kết thúc) | + CASCADE: cập nhật `MaTietKetThuc` lan truyền đến LICHHOCLOP |

---

### 17. Bảng `THAMSO`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| *(Không có ràng buộc FK)* | - | - | - |

> **Lưu ý:** THAMSO là bảng singleton (CHECK id = 1), không có FK. Ảnh hưởng gián tiếp đến logic nghiệp vụ (quy định số tín chỉ đăng ký) nhưng **không** có ràng buộc FK trực tiếp.

---

### 18. Bảng `LOP`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `MONHOC` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaMonHoc` |
| `LOPMO` | - | + CASCADE: xóa tất cả lớp mở liên quan | + CASCADE: cập nhật `MaLop` lan truyền đến LOPMO |
| `CHITIETDANGKY` | - | + RESTRICT: chặn xóa nếu còn chi tiết đăng ký | + CASCADE: cập nhật `MaLop` lan truyền đến CHITIETDANGKY |
| `MONDAHOC` | - | + SET NULL: đặt `MaLop` trong MONDAHOC thành NULL | + CASCADE: cập nhật `MaLop` lan truyền đến MONDAHOC |

---

### 19. Bảng `CHUONGTRINHHOC`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `NGANHHOC` | + Kiểm tra `NGANHHOC.MaNganh` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNganh` |
| `MONHOC` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaMonHoc` |

---

### 20. Bảng `NAMHOC`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `HOCKY` | - | + RESTRICT: chặn xóa nếu còn học kỳ thuộc năm | + CASCADE: cập nhật `MaNamHoc` lan truyền đến HOCKY |

---

### 21. Bảng `HOCKY`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `NAMHOC` | + Kiểm tra `NAMHOC.MaNamHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNamHoc` |
| `LOPMO` | - | + CASCADE: xóa tất cả lớp mở trong HK | + CASCADE: cập nhật `MaHocKy` lan truyền đến LOPMO |
| `DONGIATINCHI` | - | + SET NULL: đặt `MaHocKy` thành NULL | + CASCADE: cập nhật `MaHocKy` lan truyền đến DONGIATINCHI |
| `PHIEUDANGKY` | - | + RESTRICT: chặn xóa nếu còn phiếu đăng ký | + CASCADE: cập nhật `MaHocKy` lan truyền đến PHIEUDANGKY |
| `MONDAHOC` | - | + RESTRICT: chặn xóa nếu còn môn đã học | + CASCADE: cập nhật `MaHocKy` lan truyền đến MONDAHOC |

---

### 22. Bảng `LOPMO`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `HOCKY` | + Kiểm tra `HOCKY.MaHocKy` phải tồn tại | - | + Kiểm tra FK khi sửa `MaHocKy` |
| `LOP` | + Kiểm tra `LOP.MaLop` phải tồn tại | - | + Kiểm tra FK khi sửa `MaLop` |
| `LICHHOCLOP` | - | + CASCADE: xóa tất cả lịch học liên quan | + CASCADE: cập nhật `LopMoId` lan truyền đến LICHHOCLOP |

---

### 23. Bảng `LICHHOCLOP`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `LOPMO` | + Kiểm tra `LOPMO.id` phải tồn tại | - | + Kiểm tra FK khi sửa `LopMoId` |
| `TIETHOC` | + Kiểm tra `TIETHOC.MaTiet` phải tồn tại (tiết bắt đầu) | - | + Kiểm tra FK khi sửa `MaTietBatDau` |
| `TIETHOC` | + Kiểm tra `TIETHOC.MaTiet` phải tồn tại (tiết kết thúc) | - | + Kiểm tra FK khi sửa `MaTietKetThuc` |

---

### 24. Bảng `DONGIATINCHI`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `HOCKY` | + Kiểm tra `HOCKY.MaHocKy` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `MaHocKy` |

---

### 25. Bảng `PHIEUDANGKY`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `SINHVIEN` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại | - | + Kiểm tra FK khi sửa `MaSv` |
| `HOCKY` | + Kiểm tra `HOCKY.MaHocKy` phải tồn tại | - | + Kiểm tra FK khi sửa `MaHocKy` |
| `CHITIETDANGKY` | - | + CASCADE: xóa tất cả chi tiết đăng ký | + CASCADE: cập nhật `SoPhieu` lan truyền đến CHITIETDANGKY |
| `PHIEUTHUHOCPHI` | - | + RESTRICT: chặn xóa nếu còn phiếu thu HP | + CASCADE: cập nhật `SoPhieuDangKy` lan truyền đến PHIEUTHUHOCPHI |

---

### 26. Bảng `CHITIETDANGKY`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `PHIEUDANGKY` | + Kiểm tra `PHIEUDANGKY.SoPhieu` phải tồn tại | - | + Kiểm tra FK khi sửa `SoPhieu` |
| `LOP` | + Kiểm tra `LOP.MaLop` phải tồn tại | - | + Kiểm tra FK khi sửa `MaLop` |
| `MONHOC` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaMonHoc` |

---

### 27. Bảng `MONDAHOC`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `SINHVIEN` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại | - | + Kiểm tra FK khi sửa `MaSv` |
| `MONHOC` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaMonHoc` |
| `HOCKY` | + Kiểm tra `HOCKY.MaHocKy` phải tồn tại | - | + Kiểm tra FK khi sửa `MaHocKy` |
| `LOP` | + Kiểm tra `LOP.MaLop` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `MaLop` |
| `NGUOIDUNG` | + Kiểm tra `NGUOIDUNG.MaTaiKhoan` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `NguoiCapNhat` |

---

### 28. Bảng `PHIEUTHUHOCPHI`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `PHIEUDANGKY` | + Kiểm tra `PHIEUDANGKY.SoPhieu` phải tồn tại | - | + Kiểm tra FK khi sửa `SoPhieuDangKy` |
| `SINHVIEN` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại | - | + Kiểm tra FK khi sửa `MaSv` |

---

### 29. Bảng `THONGBAO`

| Tên Bảng | Thêm | Xóa | Sửa |
|---|---|---|---|
| `NGUOIDUNG` | + Kiểm tra `NGUOIDUNG.MaTaiKhoan` phải tồn tại | - | + Kiểm tra FK khi sửa `MaTaiKhoanNhan` |

---

## TỔNG KẾT

### Thống kê tầm ảnh hưởng

| STT | Bảng | Thêm (kiểm tra FK) | Xóa (ảnh hưởng) | Sửa PK (ảnh hưởng) |
|-----|------|---------------------|------------------|---------------------|
| 1 | `TINH` | 0 | 1 (PX) | 1 (PX) |
| 2 | `DANTOC` | 0 | 1 (SV) | 1 (SV) |
| 3 | `PHUONGXA` | 1 (TINH) | 1 (SV) | 1 (SV) |
| 4 | `DOITUONG` | 0 | 1 (DTSV) | 1 (DTSV) |
| 5 | `KHOA` | 0 | 2 (NH, MH) | 2 (NH, MH) |
| 6 | `NGANHHOC` | 1 (KHOA) | 2 (SV, CTH) | 2 (SV, CTH) |
| 7 | `CHUCNANG` | 0 | 1 (PQ) | 1 (PQ) |
| 8 | `NHOMNGUOIDUNG` | 0 | 2 (PQ, ND) | 2 (PQ, ND) |
| 9 | `PHANQUYEN` | 2 (CN, NND) | 0 | 0 |
| 10 | `NGUOIDUNG` | 2 (NND, SV) | 4 (SV, QTV, MDH, TB) | 4 (SV, QTV, MDH, TB) |
| 11 | `SINHVIEN` | 4 (PX, DT, NH, ND) | 5 (ND, DTSV, PDK, MDH, PTHP) | 5 (ND, DTSV, PDK, MDH, PTHP) |
| 12 | `DOITUONGSINHVIEN` | 2 (SV, DTG) | 0 | 0 |
| 13 | `QUANTRIVIEN` | 1 (ND) | 0 | 0 |
| 14 | `MONHOC` | 1 (KHOA) | 5 (DKMH, LOP, CTH, CTDK, MDH) | 5 (DKMH, LOP, CTH, CTDK, MDH) |
| 15 | `DIEUKIENMONHOC` | 1 (MH) | 0 | 0 |
| 16 | `TIETHOC` | 0 | 1 (LHL) | 1 (LHL) |
| 17 | `THAMSO` | 0 | 0 | 0 |
| 18 | `LOP` | 1 (MH) | 3 (LM, CTDK, MDH) | 3 (LM, CTDK, MDH) |
| 19 | `CHUONGTRINHHOC` | 2 (NH, MH) | 0 | 0 |
| 20 | `NAMHOC` | 0 | 1 (HK) | 1 (HK) |
| 21 | `HOCKY` | 1 (NAM) | 4 (LM, DGTC, PDK, MDH) | 4 (LM, DGTC, PDK, MDH) |
| 22 | `LOPMO` | 2 (HK, LOP) | 1 (LHL) | 1 (LHL) |
| 23 | `LICHHOCLOP` | 2 (LM, TIET) | 0 | 0 |
| 24 | `DONGIATINCHI` | 1 (HK) | 0 | 0 |
| 25 | `PHIEUDANGKY` | 2 (SV, HK) | 2 (CTDK, PTHP) | 2 (CTDK, PTHP) |
| 26 | `CHITIETDANGKY` | 3 (PDK, LOP, MH) | 0 | 0 |
| 27 | `MONDAHOC` | 5 (SV, MH, HK, LOP, ND) | 0 | 0 |
| 28 | `PHIEUTHUHOCPHI` | 2 (PDK, SV) | 0 | 0 |
| 29 | `THONGBAO` | 1 (ND) | 0 | 0 |

### Bảng có tầm ảnh hưởng lớn nhất (khi Xóa/Sửa PK)

1. **`SINHVIEN`** — ảnh hưởng 5 bảng: NGUOIDUNG, DOITUONGSINHVIEN, PHIEUDANGKY, MONDAHOC, PHIEUTHUHOCPHI
2. **`MONHOC`** — ảnh hưởng 5 bảng: DIEUKIENMONHOC, LOP, CHUONGTRINHHOC, CHITIETDANGKY, MONDAHOC
3. **`NGUOIDUNG`** — ảnh hưởng 4 bảng: SINHVIEN, QUANTRIVIEN, MONDAHOC, THONGBAO
4. **`HOCKY`** — ảnh hưởng 4 bảng: LOPMO, DONGIATINCHI, PHIEUDANGKY, MONDAHOC

### Bảng phụ thuộc nhiều nhất (khi Thêm — cần kiểm tra FK)

1. **`MONDAHOC`** — phụ thuộc 5 bảng: SINHVIEN, MONHOC, HOCKY, LOP, NGUOIDUNG
2. **`SINHVIEN`** — phụ thuộc 4 bảng: PHUONGXA, DANTOC, NGANHHOC, NGUOIDUNG
3. **`CHITIETDANGKY`** — phụ thuộc 3 bảng: PHIEUDANGKY, LOP, MONHOC

### Bảng lá (không ảnh hưởng bảng nào khi Xóa/Sửa PK)

`PHANQUYEN`, `DOITUONGSINHVIEN`, `QUANTRIVIEN`, `DIEUKIENMONHOC`, `THAMSO`, `CHUONGTRINHHOC`, `LICHHOCLOP`, `DONGIATINCHI`, `CHITIETDANGKY`, `MONDAHOC`, `PHIEUTHUHOCPHI`, `THONGBAO`

### Quan hệ vòng (Circular FK)

**NGUOIDUNG ↔ SINHVIEN** là quan hệ FK hai chiều duy nhất:
- `SINHVIEN.MaTaiKhoan` → `NGUOIDUNG.MaTaiKhoan` (ON DELETE SET NULL, ON UPDATE CASCADE)
- `NGUOIDUNG.MaSv` → `SINHVIEN.MaSv` (ON DELETE SET NULL, ON UPDATE CASCADE)
