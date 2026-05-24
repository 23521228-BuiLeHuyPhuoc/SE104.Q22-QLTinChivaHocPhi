# Bảng tầm ảnh hưởng cơ sở dữ liệu

Nguồn phân tích: `project/src/config/init.sql` — **30 bảng, 40 quan hệ khóa ngoại**.

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

## Danh sách 30 bảng (đánh số thứ tự)

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
| 11 | `DATLAIMATKHAU` | DLMK | Đặt lại mật khẩu |
| 12 | `SINHVIEN` | SV | Sinh viên |
| 13 | `DOITUONGSINHVIEN` | DTSV | Đối tượng sinh viên |
| 14 | `QUANTRIVIEN` | QTV | Quản trị viên |
| 15 | `MONHOC` | MH | Môn học |
| 16 | `DIEUKIENMONHOC` | DKMH | Điều kiện môn học |
| 17 | `TIETHOC` | TIET | Tiết học |
| 18 | `THAMSO` | TS | Tham số hệ thống |
| 19 | `LOP` | LOP | Lớp học |
| 20 | `CHUONGTRINHHOC` | CTH | Chương trình học |
| 21 | `NAMHOC` | NAM | Năm học |
| 22 | `HOCKY` | HK | Học kỳ |
| 23 | `LOPMO` | LM | Lớp mở |
| 24 | `LICHHOCLOP` | LHL | Lịch học lớp |
| 25 | `DONGIATINCHI` | DGTC | Đơn giá tín chỉ |
| 26 | `PHIEUDANGKY` | PDK | Phiếu đăng ký |
| 27 | `CHITIETDANGKY` | CTDK | Chi tiết đăng ký |
| 28 | `MONDAHOC` | MDH | Môn đã học |
| 29 | `PHIEUTHUHOCPHI` | PTHP | Phiếu thu học phí |
| 30 | `THONGBAO` | TB | Thông báo |

---

## BẢNG MA TRẬN TẦM ẢNH HƯỞNG — THÊM (INSERT)

> Khi **thêm** bản ghi vào bảng ở **hàng**, bảng nào ở **cột** cần kiểm tra (FK phụ thuộc)?

| Hàng \ Cột | TINH | DT | PX | DTG | KHOA | NH | CN | NND | PQ | ND | DLMK | SV | DTSV | QTV | MH | DKMH | TIET | TS | LOP | CTH | NAM | HK | LM | LHL | DGTC | PDK | CTDK | MDH | PTHP | TB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **TINH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DT** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PX** | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DTG** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **KHOA** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NH** | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **CN** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NND** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PQ** | - | - | - | - | - | - | + | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **ND** | - | - | - | - | - | - | - | + | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DLMK** | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **SV** | - | + | + | - | - | + | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DTSV** | - | - | - | + | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **QTV** | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MH** | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DKMH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TIET** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TS** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **LOP** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **CTH** | - | - | - | - | - | + | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NAM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **HK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - |
| **LM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | + | - | - | - | - | - | - | - | - |
| **LHL** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | + | - | - | - | - | - | - | - |
| **DGTC** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - |
| **PDK** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - |
| **CTDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | + | - | - | - | - | - | - | + | - | - | - | - |
| **MDH** | - | - | - | - | - | - | - | - | - | + | - | + | - | - | + | - | - | - | + | - | - | + | - | - | - | - | - | - | - | - |
| **PTHP** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - |
| **TB** | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |

---

## BẢNG MA TRẬN TẦM ẢNH HƯỞNG — XÓA (DELETE)

> Khi **xóa** bản ghi ở bảng **hàng**, bảng nào ở **cột** bị ảnh hưởng?

| Hàng \ Cột | TINH | DT | PX | DTG | KHOA | NH | CN | NND | PQ | ND | DLMK | SV | DTSV | QTV | MH | DKMH | TIET | TS | LOP | CTH | NAM | HK | LM | LHL | DGTC | PDK | CTDK | MDH | PTHP | TB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **TINH** | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DT** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PX** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DTG** | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **KHOA** | - | - | - | - | - | + | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NH** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - |
| **CN** | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NND** | - | - | - | - | - | - | - | - | + | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PQ** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **ND** | - | - | - | - | - | - | - | - | - | - | + | + | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + |
| **DLMK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **SV** | - | - | - | - | - | - | - | - | - | + | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | + | - |
| **DTSV** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **QTV** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | + | + | - | - | - | - | - | - | + | + | - | - |
| **DKMH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TIET** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - |
| **TS** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **LOP** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | + | + | - | - |
| **CTH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NAM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - |
| **HK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | + | - | + | - | - |
| **LM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - |
| **LHL** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DGTC** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | - |
| **CTDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MDH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PTHP** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TB** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |

---

## BẢNG MA TRẬN TẦM ẢNH HƯỞNG — SỬA KHÓA CHÍNH (UPDATE PK)

> Khi **sửa khóa chính** của bảng ở **hàng**, bảng nào ở **cột** bị ảnh hưởng (ON UPDATE CASCADE)?

| Hàng \ Cột | TINH | DT | PX | DTG | KHOA | NH | CN | NND | PQ | ND | DLMK | SV | DTSV | QTV | MH | DKMH | TIET | TS | LOP | CTH | NAM | HK | LM | LHL | DGTC | PDK | CTDK | MDH | PTHP | TB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **TINH** | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DT** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PX** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DTG** | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **KHOA** | - | - | - | - | - | + | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NH** | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - |
| **CN** | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NND** | - | - | - | - | - | - | - | - | + | + | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PQ** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **ND** | - | - | - | - | - | - | - | - | - | - | + | + | - | + | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + |
| **DLMK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **SV** | - | - | - | - | - | - | - | - | - | + | - | - | + | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | + | - |
| **DTSV** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **QTV** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | + | + | - | - | - | - | - | - | + | + | - | - |
| **DKMH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TIET** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - |
| **TS** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **LOP** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | + | + | - | - |
| **CTH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **NAM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - | - | - |
| **HK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | + | - | + | - | - |
| **LM** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | - | - | - | - | - |
| **LHL** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **DGTC** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | + | - | + | - |
| **CTDK** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MDH** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **PTHP** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **TB** | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |

---

## CHÚ THÍCH CHI TIẾT — BẢNG TẦM ẢNH HƯỞNG TỪNG BẢNG

> **Cách đọc:** Mỗi hàng là một ràng buộc (quan hệ FK) liên quan đến bảng đang xét. Cột Thêm/Xóa/Sửa cho biết ảnh hưởng (`+`) hoặc không ảnh hưởng (`-`).

---

### 1. Bảng `TINH`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `PHUONGXA.MaTinh` → `TINH.MaTinh` | - | + RESTRICT: chặn xóa nếu còn PHUONGXA tham chiếu | + CASCADE: cập nhật `MaTinh` lan truyền đến PHUONGXA |

---

### 2. Bảng `DANTOC`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `SINHVIEN.MaDanToc` → `DANTOC.MaDanToc` | - | + SET NULL: đặt `MaDanToc` của SV thành NULL | + CASCADE: cập nhật `MaDanToc` lan truyền đến SINHVIEN |

---

### 3. Bảng `PHUONGXA`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `PHUONGXA.MaTinh` → `TINH.MaTinh` | + Kiểm tra `TINH.MaTinh` phải tồn tại | - | + Kiểm tra FK khi sửa `MaTinh` |
| R2: `SINHVIEN.MaPhuongXa` → `PHUONGXA.MaPhuongXa` | - | + RESTRICT: chặn xóa nếu còn SV tham chiếu | + CASCADE: cập nhật `MaPhuongXa` lan truyền đến SINHVIEN |

---

### 4. Bảng `DOITUONG`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `DOITUONGSINHVIEN.MaDoiTuong` → `DOITUONG.MaDoiTuong` | - | + RESTRICT: chặn xóa nếu còn DTSV tham chiếu | + CASCADE: cập nhật `MaDoiTuong` lan truyền đến DOITUONGSINHVIEN |

---

### 5. Bảng `KHOA`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `NGANHHOC.MaKhoa` → `KHOA.MaKhoa` | - | + RESTRICT: chặn xóa nếu còn ngành thuộc khoa | + CASCADE: cập nhật `MaKhoa` lan truyền đến NGANHHOC |
| R2: `MONHOC.MaKhoa` → `KHOA.MaKhoa` | - | + RESTRICT: chặn xóa nếu còn môn thuộc khoa | + CASCADE: cập nhật `MaKhoa` lan truyền đến MONHOC |

---

### 6. Bảng `NGANHHOC`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `NGANHHOC.MaKhoa` → `KHOA.MaKhoa` | + Kiểm tra `KHOA.MaKhoa` phải tồn tại | - | + Kiểm tra FK khi sửa `MaKhoa` |
| R2: `SINHVIEN.MaNganh` → `NGANHHOC.MaNganh` | - | + RESTRICT: chặn xóa nếu còn SV thuộc ngành | + CASCADE: cập nhật `MaNganh` lan truyền đến SINHVIEN |
| R3: `CHUONGTRINHHOC.MaNganh` → `NGANHHOC.MaNganh` | - | + CASCADE: xóa chương trình học liên quan | + CASCADE: cập nhật `MaNganh` lan truyền đến CHUONGTRINHHOC |

---

### 7. Bảng `CHUCNANG`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `PHANQUYEN.MaChucNang` → `CHUCNANG.MaChucNang` | - | + CASCADE: xóa phân quyền liên quan | + CASCADE: cập nhật `MaChucNang` lan truyền đến PHANQUYEN |

---

### 8. Bảng `NHOMNGUOIDUNG`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `PHANQUYEN.MaNhom` → `NHOMNGUOIDUNG.MaNhom` | - | + CASCADE: xóa phân quyền liên quan | + CASCADE: cập nhật `MaNhom` lan truyền đến PHANQUYEN |
| R2: `NGUOIDUNG.MaNhom` → `NHOMNGUOIDUNG.MaNhom` | - | + RESTRICT: chặn xóa nếu còn người dùng thuộc nhóm | + CASCADE: cập nhật `MaNhom` lan truyền đến NGUOIDUNG |

---

### 9. Bảng `PHANQUYEN`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `PHANQUYEN.MaNhom` → `NHOMNGUOIDUNG.MaNhom` | + Kiểm tra `NHOMNGUOIDUNG.MaNhom` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNhom` |
| R2: `PHANQUYEN.MaChucNang` → `CHUCNANG.MaChucNang` | + Kiểm tra `CHUCNANG.MaChucNang` phải tồn tại | - | + Kiểm tra FK khi sửa `MaChucNang` |

---

### 10. Bảng `NGUOIDUNG`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `NGUOIDUNG.MaNhom` → `NHOMNGUOIDUNG.MaNhom` | + Kiểm tra `NHOMNGUOIDUNG.MaNhom` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNhom` |
| R2: `NGUOIDUNG.MaSv` → `SINHVIEN.MaSv` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `MaSv` |
| R3: `DATLAIMATKHAU.MaTaiKhoan` → `NGUOIDUNG.MaTaiKhoan` | - | + CASCADE: xóa tất cả token đặt lại MK | + CASCADE: cập nhật `MaTaiKhoan` lan truyền đến DATLAIMATKHAU |
| R4: `SINHVIEN.MaTaiKhoan` → `NGUOIDUNG.MaTaiKhoan` | - | + SET NULL: đặt `MaTaiKhoan` của SV thành NULL | + CASCADE: cập nhật `MaTaiKhoan` lan truyền đến SINHVIEN |
| R5: `QUANTRIVIEN.MaTaiKhoan` → `NGUOIDUNG.MaTaiKhoan` | - | + CASCADE: xóa quản trị viên liên quan | + CASCADE: cập nhật `MaTaiKhoan` lan truyền đến QUANTRIVIEN |
| R6: `MONDAHOC.NguoiCapNhat` → `NGUOIDUNG.MaTaiKhoan` | - | + SET NULL: đặt `NguoiCapNhat` thành NULL | + CASCADE: cập nhật `NguoiCapNhat` lan truyền đến MONDAHOC |
| R7: `THONGBAO.MaTaiKhoanNhan` → `NGUOIDUNG.MaTaiKhoan` | - | + CASCADE: xóa thông báo cá nhân | + CASCADE: cập nhật `MaTaiKhoanNhan` lan truyền đến THONGBAO |

---

### 11. Bảng `DATLAIMATKHAU`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `DATLAIMATKHAU.MaTaiKhoan` → `NGUOIDUNG.MaTaiKhoan` | + Kiểm tra `NGUOIDUNG.MaTaiKhoan` phải tồn tại | - | + Kiểm tra FK khi sửa `MaTaiKhoan` |

---

### 12. Bảng `SINHVIEN`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `SINHVIEN.MaPhuongXa` → `PHUONGXA.MaPhuongXa` | + Kiểm tra `PHUONGXA.MaPhuongXa` phải tồn tại | - | + Kiểm tra FK khi sửa `MaPhuongXa` |
| R2: `SINHVIEN.MaDanToc` → `DANTOC.MaDanToc` | + Kiểm tra `DANTOC.MaDanToc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaDanToc` |
| R3: `SINHVIEN.MaNganh` → `NGANHHOC.MaNganh` | + Kiểm tra `NGANHHOC.MaNganh` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNganh` |
| R4: `SINHVIEN.MaTaiKhoan` → `NGUOIDUNG.MaTaiKhoan` | + Kiểm tra `NGUOIDUNG.MaTaiKhoan` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `MaTaiKhoan` |
| R5: `NGUOIDUNG.MaSv` → `SINHVIEN.MaSv` | - | + SET NULL: đặt `MaSv` trong NGUOIDUNG thành NULL | + CASCADE: cập nhật `MaSv` lan truyền đến NGUOIDUNG |
| R6: `DOITUONGSINHVIEN.MaSv` → `SINHVIEN.MaSv` | - | + CASCADE: xóa tất cả đối tượng SV liên quan | + CASCADE: cập nhật `MaSv` lan truyền đến DOITUONGSINHVIEN |
| R7: `PHIEUDANGKY.MaSv` → `SINHVIEN.MaSv` | - | + RESTRICT: chặn xóa nếu còn phiếu đăng ký | + CASCADE: cập nhật `MaSv` lan truyền đến PHIEUDANGKY |
| R8: `MONDAHOC.MaSv` → `SINHVIEN.MaSv` | - | + CASCADE: xóa tất cả môn đã học liên quan | + CASCADE: cập nhật `MaSv` lan truyền đến MONDAHOC |
| R9: `PHIEUTHUHOCPHI.MaSv` → `SINHVIEN.MaSv` | - | + RESTRICT: chặn xóa nếu còn phiếu thu HP | + CASCADE: cập nhật `MaSv` lan truyền đến PHIEUTHUHOCPHI |

---

### 13. Bảng `DOITUONGSINHVIEN`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `DOITUONGSINHVIEN.MaSv` → `SINHVIEN.MaSv` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại | - | + Kiểm tra FK khi sửa `MaSv` |
| R2: `DOITUONGSINHVIEN.MaDoiTuong` → `DOITUONG.MaDoiTuong` | + Kiểm tra `DOITUONG.MaDoiTuong` phải tồn tại | - | + Kiểm tra FK khi sửa `MaDoiTuong` |

---

### 14. Bảng `QUANTRIVIEN`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `QUANTRIVIEN.MaTaiKhoan` → `NGUOIDUNG.MaTaiKhoan` | + Kiểm tra `NGUOIDUNG.MaTaiKhoan` phải tồn tại | - | + Kiểm tra FK khi sửa `MaTaiKhoan` |

---

### 15. Bảng `MONHOC`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `MONHOC.MaKhoa` → `KHOA.MaKhoa` | + Kiểm tra `KHOA.MaKhoa` phải tồn tại | - | + Kiểm tra FK khi sửa `MaKhoa` |
| R2: `DIEUKIENMONHOC.MaMonHoc` → `MONHOC.MaMonHoc` | - | + CASCADE: xóa điều kiện môn học liên quan | + CASCADE: cập nhật `MaMonHoc` lan truyền đến DIEUKIENMONHOC |
| R3: `DIEUKIENMONHOC.MaMonDieuKien` → `MONHOC.MaMonHoc` | - | + CASCADE: xóa điều kiện môn học liên quan | + CASCADE: cập nhật `MaMonDieuKien` lan truyền đến DIEUKIENMONHOC |
| R4: `LOP.MaMonHoc` → `MONHOC.MaMonHoc` | - | + CASCADE: xóa tất cả lớp của môn | + CASCADE: cập nhật `MaMonHoc` lan truyền đến LOP |
| R5: `CHUONGTRINHHOC.MaMonHoc` → `MONHOC.MaMonHoc` | - | + CASCADE: xóa khỏi chương trình học | + CASCADE: cập nhật `MaMonHoc` lan truyền đến CHUONGTRINHHOC |
| R6: `CHITIETDANGKY.MaMonHoc` → `MONHOC.MaMonHoc` | - | + RESTRICT: chặn xóa nếu còn chi tiết đăng ký | + CASCADE: cập nhật `MaMonHoc` lan truyền đến CHITIETDANGKY |
| R7: `MONDAHOC.MaMonHoc` → `MONHOC.MaMonHoc` | - | + RESTRICT: chặn xóa nếu còn môn đã học | + CASCADE: cập nhật `MaMonHoc` lan truyền đến MONDAHOC |

---

### 16. Bảng `DIEUKIENMONHOC`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `DIEUKIENMONHOC.MaMonHoc` → `MONHOC.MaMonHoc` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại (môn chính) | - | + Kiểm tra FK khi sửa `MaMonHoc` |
| R2: `DIEUKIENMONHOC.MaMonDieuKien` → `MONHOC.MaMonHoc` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại (môn điều kiện) | - | + Kiểm tra FK khi sửa `MaMonDieuKien` |

---

### 17. Bảng `TIETHOC`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `LICHHOCLOP.MaTietBatDau` → `TIETHOC.MaTiet` | - | + RESTRICT: chặn xóa nếu còn lịch học tham chiếu (tiết bắt đầu) | + CASCADE: cập nhật `MaTietBatDau` lan truyền đến LICHHOCLOP |
| R2: `LICHHOCLOP.MaTietKetThuc` → `TIETHOC.MaTiet` | - | + RESTRICT: chặn xóa nếu còn lịch học tham chiếu (tiết kết thúc) | + CASCADE: cập nhật `MaTietKetThuc` lan truyền đến LICHHOCLOP |

---

### 18. Bảng `THAMSO`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| *(Không có ràng buộc FK)* | - | - | - |

> **Lưu ý:** THAMSO là bảng singleton (CHECK id = 1), không có FK. Ảnh hưởng gián tiếp đến logic nghiệp vụ (quy định số tín chỉ đăng ký) nhưng **không** có ràng buộc FK trực tiếp.

---

### 19. Bảng `LOP`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `LOP.MaMonHoc` → `MONHOC.MaMonHoc` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaMonHoc` |
| R2: `LOPMO.MaLop` → `LOP.MaLop` | - | + CASCADE: xóa tất cả lớp mở liên quan | + CASCADE: cập nhật `MaLop` lan truyền đến LOPMO |
| R3: `CHITIETDANGKY.MaLop` → `LOP.MaLop` | - | + RESTRICT: chặn xóa nếu còn chi tiết đăng ký | + CASCADE: cập nhật `MaLop` lan truyền đến CHITIETDANGKY |
| R4: `MONDAHOC.MaLop` → `LOP.MaLop` | - | + SET NULL: đặt `MaLop` trong MONDAHOC thành NULL | + CASCADE: cập nhật `MaLop` lan truyền đến MONDAHOC |

---

### 20. Bảng `CHUONGTRINHHOC`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `CHUONGTRINHHOC.MaNganh` → `NGANHHOC.MaNganh` | + Kiểm tra `NGANHHOC.MaNganh` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNganh` |
| R2: `CHUONGTRINHHOC.MaMonHoc` → `MONHOC.MaMonHoc` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaMonHoc` |

---

### 21. Bảng `NAMHOC`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `HOCKY.MaNamHoc` → `NAMHOC.MaNamHoc` | - | + RESTRICT: chặn xóa nếu còn học kỳ thuộc năm | + CASCADE: cập nhật `MaNamHoc` lan truyền đến HOCKY |

---

### 22. Bảng `HOCKY`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `HOCKY.MaNamHoc` → `NAMHOC.MaNamHoc` | + Kiểm tra `NAMHOC.MaNamHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaNamHoc` |
| R2: `LOPMO.MaHocKy` → `HOCKY.MaHocKy` | - | + CASCADE: xóa tất cả lớp mở trong HK | + CASCADE: cập nhật `MaHocKy` lan truyền đến LOPMO |
| R3: `DONGIATINCHI.MaHocKy` → `HOCKY.MaHocKy` | - | + SET NULL: đặt `MaHocKy` thành NULL | + CASCADE: cập nhật `MaHocKy` lan truyền đến DONGIATINCHI |
| R4: `PHIEUDANGKY.MaHocKy` → `HOCKY.MaHocKy` | - | + RESTRICT: chặn xóa nếu còn phiếu đăng ký | + CASCADE: cập nhật `MaHocKy` lan truyền đến PHIEUDANGKY |
| R5: `MONDAHOC.MaHocKy` → `HOCKY.MaHocKy` | - | + RESTRICT: chặn xóa nếu còn môn đã học | + CASCADE: cập nhật `MaHocKy` lan truyền đến MONDAHOC |

---

### 23. Bảng `LOPMO`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `LOPMO.MaHocKy` → `HOCKY.MaHocKy` | + Kiểm tra `HOCKY.MaHocKy` phải tồn tại | - | + Kiểm tra FK khi sửa `MaHocKy` |
| R2: `LOPMO.MaLop` → `LOP.MaLop` | + Kiểm tra `LOP.MaLop` phải tồn tại | - | + Kiểm tra FK khi sửa `MaLop` |
| R3: `LICHHOCLOP.LopMoId` → `LOPMO.id` | - | + CASCADE: xóa tất cả lịch học liên quan | + CASCADE: cập nhật `LopMoId` lan truyền đến LICHHOCLOP |

---

### 24. Bảng `LICHHOCLOP`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `LICHHOCLOP.LopMoId` → `LOPMO.id` | + Kiểm tra `LOPMO.id` phải tồn tại | - | + Kiểm tra FK khi sửa `LopMoId` |
| R2: `LICHHOCLOP.MaTietBatDau` → `TIETHOC.MaTiet` | + Kiểm tra `TIETHOC.MaTiet` phải tồn tại (tiết bắt đầu) | - | + Kiểm tra FK khi sửa `MaTietBatDau` |
| R3: `LICHHOCLOP.MaTietKetThuc` → `TIETHOC.MaTiet` | + Kiểm tra `TIETHOC.MaTiet` phải tồn tại (tiết kết thúc) | - | + Kiểm tra FK khi sửa `MaTietKetThuc` |

---

### 25. Bảng `DONGIATINCHI`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `DONGIATINCHI.MaHocKy` → `HOCKY.MaHocKy` | + Kiểm tra `HOCKY.MaHocKy` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `MaHocKy` |

---

### 26. Bảng `PHIEUDANGKY`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `PHIEUDANGKY.MaSv` → `SINHVIEN.MaSv` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại | - | + Kiểm tra FK khi sửa `MaSv` |
| R2: `PHIEUDANGKY.MaHocKy` → `HOCKY.MaHocKy` | + Kiểm tra `HOCKY.MaHocKy` phải tồn tại | - | + Kiểm tra FK khi sửa `MaHocKy` |
| R3: `CHITIETDANGKY.SoPhieu` → `PHIEUDANGKY.SoPhieu` | - | + CASCADE: xóa tất cả chi tiết đăng ký | + CASCADE: cập nhật `SoPhieu` lan truyền đến CHITIETDANGKY |
| R4: `PHIEUTHUHOCPHI.SoPhieuDangKy` → `PHIEUDANGKY.SoPhieu` | - | + RESTRICT: chặn xóa nếu còn phiếu thu HP | + CASCADE: cập nhật `SoPhieuDangKy` lan truyền đến PHIEUTHUHOCPHI |

---

### 27. Bảng `CHITIETDANGKY`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `CHITIETDANGKY.SoPhieu` → `PHIEUDANGKY.SoPhieu` | + Kiểm tra `PHIEUDANGKY.SoPhieu` phải tồn tại | - | + Kiểm tra FK khi sửa `SoPhieu` |
| R2: `CHITIETDANGKY.MaLop` → `LOP.MaLop` | + Kiểm tra `LOP.MaLop` phải tồn tại | - | + Kiểm tra FK khi sửa `MaLop` |
| R3: `CHITIETDANGKY.MaMonHoc` → `MONHOC.MaMonHoc` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaMonHoc` |

---

### 28. Bảng `MONDAHOC`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `MONDAHOC.MaSv` → `SINHVIEN.MaSv` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại | - | + Kiểm tra FK khi sửa `MaSv` |
| R2: `MONDAHOC.MaMonHoc` → `MONHOC.MaMonHoc` | + Kiểm tra `MONHOC.MaMonHoc` phải tồn tại | - | + Kiểm tra FK khi sửa `MaMonHoc` |
| R3: `MONDAHOC.MaHocKy` → `HOCKY.MaHocKy` | + Kiểm tra `HOCKY.MaHocKy` phải tồn tại | - | + Kiểm tra FK khi sửa `MaHocKy` |
| R4: `MONDAHOC.MaLop` → `LOP.MaLop` | + Kiểm tra `LOP.MaLop` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `MaLop` |
| R5: `MONDAHOC.NguoiCapNhat` → `NGUOIDUNG.MaTaiKhoan` | + Kiểm tra `NGUOIDUNG.MaTaiKhoan` phải tồn tại (nếu NOT NULL) | - | + Kiểm tra FK khi sửa `NguoiCapNhat` |

---

### 29. Bảng `PHIEUTHUHOCPHI`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `PHIEUTHUHOCPHI.SoPhieuDangKy` → `PHIEUDANGKY.SoPhieu` | + Kiểm tra `PHIEUDANGKY.SoPhieu` phải tồn tại | - | + Kiểm tra FK khi sửa `SoPhieuDangKy` |
| R2: `PHIEUTHUHOCPHI.MaSv` → `SINHVIEN.MaSv` | + Kiểm tra `SINHVIEN.MaSv` phải tồn tại | - | + Kiểm tra FK khi sửa `MaSv` |

---

### 30. Bảng `THONGBAO`

| Ràng buộc R<sub>i</sub> | Thêm | Xóa | Sửa |
|---|---|---|---|
| R1: `THONGBAO.MaTaiKhoanNhan` → `NGUOIDUNG.MaTaiKhoan` | + Kiểm tra `NGUOIDUNG.MaTaiKhoan` phải tồn tại | - | + Kiểm tra FK khi sửa `MaTaiKhoanNhan` |

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
| 10 | `NGUOIDUNG` | 2 (NND, SV) | 5 (DLMK, SV, QTV, MDH, TB) | 5 (DLMK, SV, QTV, MDH, TB) |
| 11 | `DATLAIMATKHAU` | 1 (ND) | 0 | 0 |
| 12 | `SINHVIEN` | 4 (PX, DT, NH, ND) | 5 (ND, DTSV, PDK, MDH, PTHP) | 5 (ND, DTSV, PDK, MDH, PTHP) |
| 13 | `DOITUONGSINHVIEN` | 2 (SV, DTG) | 0 | 0 |
| 14 | `QUANTRIVIEN` | 1 (ND) | 0 | 0 |
| 15 | `MONHOC` | 1 (KHOA) | 5 (DKMH, LOP, CTH, CTDK, MDH) | 5 (DKMH, LOP, CTH, CTDK, MDH) |
| 16 | `DIEUKIENMONHOC` | 1 (MH) | 0 | 0 |
| 17 | `TIETHOC` | 0 | 1 (LHL) | 1 (LHL) |
| 18 | `THAMSO` | 0 | 0 | 0 |
| 19 | `LOP` | 1 (MH) | 3 (LM, CTDK, MDH) | 3 (LM, CTDK, MDH) |
| 20 | `CHUONGTRINHHOC` | 2 (NH, MH) | 0 | 0 |
| 21 | `NAMHOC` | 0 | 1 (HK) | 1 (HK) |
| 22 | `HOCKY` | 1 (NAM) | 4 (LM, DGTC, PDK, MDH) | 4 (LM, DGTC, PDK, MDH) |
| 23 | `LOPMO` | 2 (HK, LOP) | 1 (LHL) | 1 (LHL) |
| 24 | `LICHHOCLOP` | 2 (LM, TIET) | 0 | 0 |
| 25 | `DONGIATINCHI` | 1 (HK) | 0 | 0 |
| 26 | `PHIEUDANGKY` | 2 (SV, HK) | 2 (CTDK, PTHP) | 2 (CTDK, PTHP) |
| 27 | `CHITIETDANGKY` | 3 (PDK, LOP, MH) | 0 | 0 |
| 28 | `MONDAHOC` | 5 (SV, MH, HK, LOP, ND) | 0 | 0 |
| 29 | `PHIEUTHUHOCPHI` | 2 (PDK, SV) | 0 | 0 |
| 30 | `THONGBAO` | 1 (ND) | 0 | 0 |

### Bảng có tầm ảnh hưởng lớn nhất (khi Xóa/Sửa PK)

1. **`NGUOIDUNG`** — ảnh hưởng 5 bảng: DATLAIMATKHAU, SINHVIEN, QUANTRIVIEN, MONDAHOC, THONGBAO
2. **`SINHVIEN`** — ảnh hưởng 5 bảng: NGUOIDUNG, DOITUONGSINHVIEN, PHIEUDANGKY, MONDAHOC, PHIEUTHUHOCPHI
3. **`MONHOC`** — ảnh hưởng 5 bảng: DIEUKIENMONHOC, LOP, CHUONGTRINHHOC, CHITIETDANGKY, MONDAHOC
4. **`HOCKY`** — ảnh hưởng 4 bảng: LOPMO, DONGIATINCHI, PHIEUDANGKY, MONDAHOC

### Bảng phụ thuộc nhiều nhất (khi Thêm — cần kiểm tra FK)

1. **`MONDAHOC`** — phụ thuộc 5 bảng: SINHVIEN, MONHOC, HOCKY, LOP, NGUOIDUNG
2. **`SINHVIEN`** — phụ thuộc 4 bảng: PHUONGXA, DANTOC, NGANHHOC, NGUOIDUNG
3. **`CHITIETDANGKY`** — phụ thuộc 3 bảng: PHIEUDANGKY, LOP, MONHOC

### Bảng lá (không ảnh hưởng bảng nào khi Xóa/Sửa PK)

`PHANQUYEN`, `DATLAIMATKHAU`, `DOITUONGSINHVIEN`, `QUANTRIVIEN`, `DIEUKIENMONHOC`, `THAMSO`, `CHUONGTRINHHOC`, `LICHHOCLOP`, `DONGIATINCHI`, `CHITIETDANGKY`, `MONDAHOC`, `PHIEUTHUHOCPHI`, `THONGBAO`

### Quan hệ vòng (Circular FK)

**NGUOIDUNG ↔ SINHVIEN** là quan hệ FK hai chiều duy nhất:
- `SINHVIEN.MaTaiKhoan` → `NGUOIDUNG.MaTaiKhoan` (ON DELETE SET NULL, ON UPDATE CASCADE)
- `NGUOIDUNG.MaSv` → `SINHVIEN.MaSv` (ON DELETE SET NULL, ON UPDATE CASCADE)
