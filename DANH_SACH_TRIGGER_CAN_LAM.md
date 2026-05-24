# Danh sách trigger cần làm theo bảng tầm ảnh hưởng

Nguồn phân tích:

- `BANG_TAM_ANH_HUONG.md`
- `project/src/config/init.sql`

Phạm vi hiện tại: **29 bảng, 39 quan hệ khóa ngoại** theo schema hiện tại.

> **Lưu ý quan trọng:** Các trigger dưới đây là danh sách thiết kế nếu cần mô tả/triển khai trigger thủ công cho tầm ảnh hưởng FK. Với PostgreSQL hiện tại, các ràng buộc `FOREIGN KEY ... ON DELETE ... ON UPDATE ...` trong `init.sql` đã tự tạo constraint trigger nội bộ, nên không cần viết lại các trigger FK này nếu vẫn giữ nguyên FK.

---

## Quy ước trigger

| Ký hiệu | Ý nghĩa |
|---|---|
| `BIU` | `BEFORE INSERT OR UPDATE` trên bảng con để kiểm tra khóa ngoại |
| `BD` | `BEFORE DELETE` trên bảng cha để chặn xóa theo `RESTRICT` |
| `AD` | `AFTER DELETE` trên bảng cha để thực hiện `CASCADE` hoặc `SET NULL` |
| `AU_PK` | `AFTER UPDATE OF <khóa chính>` trên bảng cha để lan truyền `ON UPDATE CASCADE` |

Quy tắc đặt tên đề xuất:

```text
trg_biu_<bang_con>_<ten_fk>
trg_bd_<bang_cha>_<ten_fk>_restrict
trg_ad_<bang_cha>_<ten_fk>_cascade
trg_ad_<bang_cha>_<ten_fk>_set_null
trg_aupk_<bang_cha>_<ten_fk>_cascade
```

Số lượng logic nếu viết thủ công:

| Nhóm trigger | Số lượng logic | Ghi chú |
|---|---:|---|
| Kiểm tra FK khi thêm/sửa bảng con | 39 | Mỗi FK cần kiểm tra bảng cha tồn tại |
| Xử lý khi xóa khóa chính bảng cha | 39 | Theo `RESTRICT`, `CASCADE`, `SET NULL` |
| Xử lý khi sửa khóa chính bảng cha | 39 | Tất cả FK hiện tại đều `ON UPDATE CASCADE` |
| **Tổng logic cần bao phủ** | **117** | Có thể gộp nhiều logic cùng bảng vào ít trigger vật lý hơn |

---

## Phủ trigger theo 29 bảng

| STT | Bảng thao tác | Trigger khi thêm/sửa FK | Trigger khi xóa khóa chính | Trigger khi sửa khóa chính |
|---:|---|---|---|---|
| 1 | `TINH` | Không có | `RESTRICT` nếu còn `PHUONGXA.MaTinh` | `CASCADE` sang `PHUONGXA.MaTinh` |
| 2 | `DANTOC` | Không có | `SET NULL` `SINHVIEN.MaDanToc` | `CASCADE` sang `SINHVIEN.MaDanToc` |
| 3 | `PHUONGXA` | Kiểm tra `TINH.MaTinh` | `RESTRICT` nếu còn `SINHVIEN.MaPhuongXa` | `CASCADE` sang `SINHVIEN.MaPhuongXa` |
| 4 | `DOITUONG` | Không có | `RESTRICT` nếu còn `DOITUONGSINHVIEN.MaDoiTuong` | `CASCADE` sang `DOITUONGSINHVIEN.MaDoiTuong` |
| 5 | `KHOA` | Không có | `RESTRICT` nếu còn `NGANHHOC.MaKhoa`, `MONHOC.MaKhoa` | `CASCADE` sang `NGANHHOC.MaKhoa`, `MONHOC.MaKhoa` |
| 6 | `NGANHHOC` | Kiểm tra `KHOA.MaKhoa` | `RESTRICT` nếu còn `SINHVIEN.MaNganh`; `CASCADE` `CHUONGTRINHHOC.MaNganh` | `CASCADE` sang `SINHVIEN.MaNganh`, `CHUONGTRINHHOC.MaNganh` |
| 7 | `CHUCNANG` | Không có | `CASCADE` `PHANQUYEN.MaChucNang` | `CASCADE` sang `PHANQUYEN.MaChucNang` |
| 8 | `NHOMNGUOIDUNG` | Không có | `CASCADE` `PHANQUYEN.MaNhom`; `RESTRICT` nếu còn `NGUOIDUNG.MaNhom` | `CASCADE` sang `PHANQUYEN.MaNhom`, `NGUOIDUNG.MaNhom` |
| 9 | `PHANQUYEN` | Kiểm tra `NHOMNGUOIDUNG.MaNhom`, `CHUCNANG.MaChucNang` | Không có | Không có |
| 10 | `NGUOIDUNG` | Kiểm tra `NHOMNGUOIDUNG.MaNhom`, `SINHVIEN.MaSv` | `SET NULL` `SINHVIEN.MaTaiKhoan`; `CASCADE` `QUANTRIVIEN.MaTaiKhoan`; `SET NULL` `MONDAHOC.NguoiCapNhat`; `CASCADE` `THONGBAO.MaTaiKhoanNhan` | `CASCADE` sang `SINHVIEN.MaTaiKhoan`, `QUANTRIVIEN.MaTaiKhoan`, `MONDAHOC.NguoiCapNhat`, `THONGBAO.MaTaiKhoanNhan` |
| 11 | `SINHVIEN` | Kiểm tra `PHUONGXA.MaPhuongXa`, `DANTOC.MaDanToc`, `NGANHHOC.MaNganh`, `NGUOIDUNG.MaTaiKhoan` | `SET NULL` `NGUOIDUNG.MaSv`; `CASCADE` `DOITUONGSINHVIEN.MaSv`; `RESTRICT` nếu còn `PHIEUDANGKY.MaSv`; `CASCADE` `MONDAHOC.MaSv`; `RESTRICT` nếu còn `PHIEUTHUHOCPHI.MaSv` | `CASCADE` sang `NGUOIDUNG.MaSv`, `DOITUONGSINHVIEN.MaSv`, `PHIEUDANGKY.MaSv`, `MONDAHOC.MaSv`, `PHIEUTHUHOCPHI.MaSv` |
| 12 | `DOITUONGSINHVIEN` | Kiểm tra `SINHVIEN.MaSv`, `DOITUONG.MaDoiTuong` | Không có | Không có |
| 13 | `QUANTRIVIEN` | Kiểm tra `NGUOIDUNG.MaTaiKhoan` | Không có | Không có |
| 14 | `MONHOC` | Kiểm tra `KHOA.MaKhoa` | `CASCADE` `DIEUKIENMONHOC.MaMonHoc`, `DIEUKIENMONHOC.MaMonDieuKien`, `LOP.MaMonHoc`, `CHUONGTRINHHOC.MaMonHoc`; `RESTRICT` nếu còn `CHITIETDANGKY.MaMonHoc`, `MONDAHOC.MaMonHoc` | `CASCADE` sang `DIEUKIENMONHOC.MaMonHoc`, `DIEUKIENMONHOC.MaMonDieuKien`, `LOP.MaMonHoc`, `CHUONGTRINHHOC.MaMonHoc`, `CHITIETDANGKY.MaMonHoc`, `MONDAHOC.MaMonHoc` |
| 15 | `DIEUKIENMONHOC` | Kiểm tra `MONHOC.MaMonHoc`, `MONHOC.MaMonHoc` cho môn điều kiện | Không có | Không có |
| 16 | `TIETHOC` | Không có | `RESTRICT` nếu còn `LICHHOCLOP.MaTietBatDau`, `LICHHOCLOP.MaTietKetThuc` | `CASCADE` sang `LICHHOCLOP.MaTietBatDau`, `LICHHOCLOP.MaTietKetThuc` |
| 17 | `THAMSO` | Không có FK trực tiếp | Không có | Không có |
| 18 | `LOP` | Kiểm tra `MONHOC.MaMonHoc` | `CASCADE` `LOPMO.MaLop`; `RESTRICT` nếu còn `CHITIETDANGKY.MaLop`; `SET NULL` `MONDAHOC.MaLop` | `CASCADE` sang `LOPMO.MaLop`, `CHITIETDANGKY.MaLop`, `MONDAHOC.MaLop` |
| 19 | `CHUONGTRINHHOC` | Kiểm tra `NGANHHOC.MaNganh`, `MONHOC.MaMonHoc` | Không có | Không có |
| 20 | `NAMHOC` | Không có | `RESTRICT` nếu còn `HOCKY.MaNamHoc` | `CASCADE` sang `HOCKY.MaNamHoc` |
| 21 | `HOCKY` | Kiểm tra `NAMHOC.MaNamHoc` | `CASCADE` `LOPMO.MaHocKy`; `SET NULL` `DONGIATINCHI.MaHocKy`; `RESTRICT` nếu còn `PHIEUDANGKY.MaHocKy`, `MONDAHOC.MaHocKy` | `CASCADE` sang `LOPMO.MaHocKy`, `DONGIATINCHI.MaHocKy`, `PHIEUDANGKY.MaHocKy`, `MONDAHOC.MaHocKy` |
| 22 | `LOPMO` | Kiểm tra `HOCKY.MaHocKy`, `LOP.MaLop` | `CASCADE` `LICHHOCLOP.LopMoId` | `CASCADE` sang `LICHHOCLOP.LopMoId` |
| 23 | `LICHHOCLOP` | Kiểm tra `LOPMO.id`, `TIETHOC.MaTiet`, `TIETHOC.MaTiet` | Không có | Không có |
| 24 | `DONGIATINCHI` | Kiểm tra `HOCKY.MaHocKy` nếu khác `NULL` | Không có | Không có |
| 25 | `PHIEUDANGKY` | Kiểm tra `SINHVIEN.MaSv`, `HOCKY.MaHocKy` | `CASCADE` `CHITIETDANGKY.SoPhieu`; `RESTRICT` nếu còn `PHIEUTHUHOCPHI.SoPhieuDangKy` | `CASCADE` sang `CHITIETDANGKY.SoPhieu`, `PHIEUTHUHOCPHI.SoPhieuDangKy` |
| 26 | `CHITIETDANGKY` | Kiểm tra `PHIEUDANGKY.SoPhieu`, `LOP.MaLop`, `MONHOC.MaMonHoc` | Không có | Không có |
| 27 | `MONDAHOC` | Kiểm tra `SINHVIEN.MaSv`, `MONHOC.MaMonHoc`, `HOCKY.MaHocKy`, `LOP.MaLop`, `NGUOIDUNG.MaTaiKhoan` | Không có | Không có |
| 28 | `PHIEUTHUHOCPHI` | Kiểm tra `PHIEUDANGKY.SoPhieu`, `SINHVIEN.MaSv` | Không có | Không có |
| 29 | `THONGBAO` | Kiểm tra `NGUOIDUNG.MaTaiKhoan` | Không có | Không có |

---

## Chi tiết trigger theo từng quan hệ FK

| # | Quan hệ FK | Trigger kiểm tra khi thêm/sửa bảng con | Trigger khi xóa bảng cha | Trigger khi sửa khóa chính bảng cha |
|---:|---|---|---|---|
| 1 | `PHUONGXA.MaTinh` -> `TINH.MaTinh` | `trg_biu_phuongxa_fk_phuong_xa_tinh`: kiểm tra `TINH.MaTinh` tồn tại | `trg_bd_tinh_fk_phuong_xa_tinh_restrict`: chặn xóa nếu còn `PHUONGXA` | `trg_aupk_tinh_fk_phuong_xa_tinh_cascade`: cập nhật `PHUONGXA.MaTinh` |
| 2 | `NGANHHOC.MaKhoa` -> `KHOA.MaKhoa` | `trg_biu_nganhhoc_fk_nganh_khoa`: kiểm tra `KHOA.MaKhoa` tồn tại | `trg_bd_khoa_fk_nganh_khoa_restrict`: chặn xóa nếu còn `NGANHHOC` | `trg_aupk_khoa_fk_nganh_khoa_cascade`: cập nhật `NGANHHOC.MaKhoa` |
| 3 | `PHANQUYEN.MaNhom` -> `NHOMNGUOIDUNG.MaNhom` | `trg_biu_phanquyen_fk_pq_nhom`: kiểm tra `NHOMNGUOIDUNG.MaNhom` tồn tại | `trg_ad_nhomnguoidung_fk_pq_nhom_cascade`: xóa `PHANQUYEN` liên quan | `trg_aupk_nhomnguoidung_fk_pq_nhom_cascade`: cập nhật `PHANQUYEN.MaNhom` |
| 4 | `PHANQUYEN.MaChucNang` -> `CHUCNANG.MaChucNang` | `trg_biu_phanquyen_fk_pq_chuc_nang`: kiểm tra `CHUCNANG.MaChucNang` tồn tại | `trg_ad_chucnang_fk_pq_chuc_nang_cascade`: xóa `PHANQUYEN` liên quan | `trg_aupk_chucnang_fk_pq_chuc_nang_cascade`: cập nhật `PHANQUYEN.MaChucNang` |
| 5 | `NGUOIDUNG.MaNhom` -> `NHOMNGUOIDUNG.MaNhom` | `trg_biu_nguoidung_fk_nd_nhom`: kiểm tra `NHOMNGUOIDUNG.MaNhom` tồn tại | `trg_bd_nhomnguoidung_fk_nd_nhom_restrict`: chặn xóa nếu còn `NGUOIDUNG` | `trg_aupk_nhomnguoidung_fk_nd_nhom_cascade`: cập nhật `NGUOIDUNG.MaNhom` |
| 6 | `SINHVIEN.MaPhuongXa` -> `PHUONGXA.MaPhuongXa` | `trg_biu_sinhvien_fk_sv_phuong_xa`: kiểm tra `PHUONGXA.MaPhuongXa` tồn tại | `trg_bd_phuongxa_fk_sv_phuong_xa_restrict`: chặn xóa nếu còn `SINHVIEN` | `trg_aupk_phuongxa_fk_sv_phuong_xa_cascade`: cập nhật `SINHVIEN.MaPhuongXa` |
| 7 | `SINHVIEN.MaDanToc` -> `DANTOC.MaDanToc` | `trg_biu_sinhvien_fk_sv_dan_toc`: kiểm tra `DANTOC.MaDanToc` tồn tại nếu khác `NULL` | `trg_ad_dantoc_fk_sv_dan_toc_set_null`: đặt `SINHVIEN.MaDanToc = NULL` | `trg_aupk_dantoc_fk_sv_dan_toc_cascade`: cập nhật `SINHVIEN.MaDanToc` |
| 8 | `SINHVIEN.MaNganh` -> `NGANHHOC.MaNganh` | `trg_biu_sinhvien_fk_sv_nganh`: kiểm tra `NGANHHOC.MaNganh` tồn tại | `trg_bd_nganhhoc_fk_sv_nganh_restrict`: chặn xóa nếu còn `SINHVIEN` | `trg_aupk_nganhhoc_fk_sv_nganh_cascade`: cập nhật `SINHVIEN.MaNganh` |
| 9 | `SINHVIEN.MaTaiKhoan` -> `NGUOIDUNG.MaTaiKhoan` | `trg_biu_sinhvien_fk_sv_tk`: kiểm tra `NGUOIDUNG.MaTaiKhoan` tồn tại nếu khác `NULL` | `trg_ad_nguoidung_fk_sv_tk_set_null`: đặt `SINHVIEN.MaTaiKhoan = NULL` | `trg_aupk_nguoidung_fk_sv_tk_cascade`: cập nhật `SINHVIEN.MaTaiKhoan` |
| 10 | `NGUOIDUNG.MaSv` -> `SINHVIEN.MaSv` | `trg_biu_nguoidung_fk_tk_sv`: kiểm tra `SINHVIEN.MaSv` tồn tại nếu khác `NULL` | `trg_ad_sinhvien_fk_tk_sv_set_null`: đặt `NGUOIDUNG.MaSv = NULL` | `trg_aupk_sinhvien_fk_tk_sv_cascade`: cập nhật `NGUOIDUNG.MaSv` |
| 11 | `DOITUONGSINHVIEN.MaSv` -> `SINHVIEN.MaSv` | `trg_biu_doituongsinhvien_fk_dtsv_sv`: kiểm tra `SINHVIEN.MaSv` tồn tại | `trg_ad_sinhvien_fk_dtsv_sv_cascade`: xóa `DOITUONGSINHVIEN` liên quan | `trg_aupk_sinhvien_fk_dtsv_sv_cascade`: cập nhật `DOITUONGSINHVIEN.MaSv` |
| 12 | `DOITUONGSINHVIEN.MaDoiTuong` -> `DOITUONG.MaDoiTuong` | `trg_biu_doituongsinhvien_fk_dtsv_dt`: kiểm tra `DOITUONG.MaDoiTuong` tồn tại | `trg_bd_doituong_fk_dtsv_dt_restrict`: chặn xóa nếu còn `DOITUONGSINHVIEN` | `trg_aupk_doituong_fk_dtsv_dt_cascade`: cập nhật `DOITUONGSINHVIEN.MaDoiTuong` |
| 13 | `QUANTRIVIEN.MaTaiKhoan` -> `NGUOIDUNG.MaTaiKhoan` | `trg_biu_quantrivien_fk_qtv_tk`: kiểm tra `NGUOIDUNG.MaTaiKhoan` tồn tại | `trg_ad_nguoidung_fk_qtv_tk_cascade`: xóa `QUANTRIVIEN` liên quan | `trg_aupk_nguoidung_fk_qtv_tk_cascade`: cập nhật `QUANTRIVIEN.MaTaiKhoan` |
| 14 | `MONHOC.MaKhoa` -> `KHOA.MaKhoa` | `trg_biu_monhoc_fk_monhoc_khoa`: kiểm tra `KHOA.MaKhoa` tồn tại | `trg_bd_khoa_fk_monhoc_khoa_restrict`: chặn xóa nếu còn `MONHOC` | `trg_aupk_khoa_fk_monhoc_khoa_cascade`: cập nhật `MONHOC.MaKhoa` |
| 15 | `DIEUKIENMONHOC.MaMonHoc` -> `MONHOC.MaMonHoc` | `trg_biu_dieukienmonhoc_fk_dkmh_monhoc`: kiểm tra `MONHOC.MaMonHoc` tồn tại | `trg_ad_monhoc_fk_dkmh_monhoc_cascade`: xóa `DIEUKIENMONHOC` liên quan | `trg_aupk_monhoc_fk_dkmh_monhoc_cascade`: cập nhật `DIEUKIENMONHOC.MaMonHoc` |
| 16 | `DIEUKIENMONHOC.MaMonDieuKien` -> `MONHOC.MaMonHoc` | `trg_biu_dieukienmonhoc_fk_dkmh_monhoc_dk`: kiểm tra `MONHOC.MaMonHoc` tồn tại | `trg_ad_monhoc_fk_dkmh_monhoc_dk_cascade`: xóa `DIEUKIENMONHOC` liên quan | `trg_aupk_monhoc_fk_dkmh_monhoc_dk_cascade`: cập nhật `DIEUKIENMONHOC.MaMonDieuKien` |
| 17 | `LOP.MaMonHoc` -> `MONHOC.MaMonHoc` | `trg_biu_lop_fk_lop_monhoc`: kiểm tra `MONHOC.MaMonHoc` tồn tại | `trg_ad_monhoc_fk_lop_monhoc_cascade`: xóa `LOP` liên quan | `trg_aupk_monhoc_fk_lop_monhoc_cascade`: cập nhật `LOP.MaMonHoc` |
| 18 | `CHUONGTRINHHOC.MaNganh` -> `NGANHHOC.MaNganh` | `trg_biu_chuongtrinhhoc_fk_cth_nganh`: kiểm tra `NGANHHOC.MaNganh` tồn tại | `trg_ad_nganhhoc_fk_cth_nganh_cascade`: xóa `CHUONGTRINHHOC` liên quan | `trg_aupk_nganhhoc_fk_cth_nganh_cascade`: cập nhật `CHUONGTRINHHOC.MaNganh` |
| 19 | `CHUONGTRINHHOC.MaMonHoc` -> `MONHOC.MaMonHoc` | `trg_biu_chuongtrinhhoc_fk_cth_mon`: kiểm tra `MONHOC.MaMonHoc` tồn tại | `trg_ad_monhoc_fk_cth_mon_cascade`: xóa `CHUONGTRINHHOC` liên quan | `trg_aupk_monhoc_fk_cth_mon_cascade`: cập nhật `CHUONGTRINHHOC.MaMonHoc` |
| 20 | `HOCKY.MaNamHoc` -> `NAMHOC.MaNamHoc` | `trg_biu_hocky_fk_hk_namhoc`: kiểm tra `NAMHOC.MaNamHoc` tồn tại | `trg_bd_namhoc_fk_hk_namhoc_restrict`: chặn xóa nếu còn `HOCKY` | `trg_aupk_namhoc_fk_hk_namhoc_cascade`: cập nhật `HOCKY.MaNamHoc` |
| 21 | `LOPMO.MaHocKy` -> `HOCKY.MaHocKy` | `trg_biu_lopmo_fk_lopmo_hocky`: kiểm tra `HOCKY.MaHocKy` tồn tại | `trg_ad_hocky_fk_lopmo_hocky_cascade`: xóa `LOPMO` liên quan | `trg_aupk_hocky_fk_lopmo_hocky_cascade`: cập nhật `LOPMO.MaHocKy` |
| 22 | `LOPMO.MaLop` -> `LOP.MaLop` | `trg_biu_lopmo_fk_lopmo_lop`: kiểm tra `LOP.MaLop` tồn tại | `trg_ad_lop_fk_lopmo_lop_cascade`: xóa `LOPMO` liên quan | `trg_aupk_lop_fk_lopmo_lop_cascade`: cập nhật `LOPMO.MaLop` |
| 23 | `LICHHOCLOP.LopMoId` -> `LOPMO.id` | `trg_biu_lichhoclop_fk_lhl_lopmo`: kiểm tra `LOPMO.id` tồn tại | `trg_ad_lopmo_fk_lhl_lopmo_cascade`: xóa `LICHHOCLOP` liên quan | `trg_aupk_lopmo_fk_lhl_lopmo_cascade`: cập nhật `LICHHOCLOP.LopMoId` |
| 24 | `LICHHOCLOP.MaTietBatDau` -> `TIETHOC.MaTiet` | `trg_biu_lichhoclop_fk_lhl_tiet_bat_dau`: kiểm tra `TIETHOC.MaTiet` tồn tại | `trg_bd_tiethoc_fk_lhl_tiet_bat_dau_restrict`: chặn xóa nếu còn `LICHHOCLOP` | `trg_aupk_tiethoc_fk_lhl_tiet_bat_dau_cascade`: cập nhật `LICHHOCLOP.MaTietBatDau` |
| 25 | `LICHHOCLOP.MaTietKetThuc` -> `TIETHOC.MaTiet` | `trg_biu_lichhoclop_fk_lhl_tiet_ket_thuc`: kiểm tra `TIETHOC.MaTiet` tồn tại | `trg_bd_tiethoc_fk_lhl_tiet_ket_thuc_restrict`: chặn xóa nếu còn `LICHHOCLOP` | `trg_aupk_tiethoc_fk_lhl_tiet_ket_thuc_cascade`: cập nhật `LICHHOCLOP.MaTietKetThuc` |
| 26 | `DONGIATINCHI.MaHocKy` -> `HOCKY.MaHocKy` | `trg_biu_dongiatinchi_fk_dgtc_hk`: kiểm tra `HOCKY.MaHocKy` tồn tại nếu khác `NULL` | `trg_ad_hocky_fk_dgtc_hk_set_null`: đặt `DONGIATINCHI.MaHocKy = NULL` | `trg_aupk_hocky_fk_dgtc_hk_cascade`: cập nhật `DONGIATINCHI.MaHocKy` |
| 27 | `PHIEUDANGKY.MaSv` -> `SINHVIEN.MaSv` | `trg_biu_phieudangky_fk_pdk_sv`: kiểm tra `SINHVIEN.MaSv` tồn tại | `trg_bd_sinhvien_fk_pdk_sv_restrict`: chặn xóa nếu còn `PHIEUDANGKY` | `trg_aupk_sinhvien_fk_pdk_sv_cascade`: cập nhật `PHIEUDANGKY.MaSv` |
| 28 | `PHIEUDANGKY.MaHocKy` -> `HOCKY.MaHocKy` | `trg_biu_phieudangky_fk_pdk_hk`: kiểm tra `HOCKY.MaHocKy` tồn tại | `trg_bd_hocky_fk_pdk_hk_restrict`: chặn xóa nếu còn `PHIEUDANGKY` | `trg_aupk_hocky_fk_pdk_hk_cascade`: cập nhật `PHIEUDANGKY.MaHocKy` |
| 29 | `CHITIETDANGKY.SoPhieu` -> `PHIEUDANGKY.SoPhieu` | `trg_biu_chitietdangky_fk_ctdk_phieu`: kiểm tra `PHIEUDANGKY.SoPhieu` tồn tại | `trg_ad_phieudangky_fk_ctdk_phieu_cascade`: xóa `CHITIETDANGKY` liên quan | `trg_aupk_phieudangky_fk_ctdk_phieu_cascade`: cập nhật `CHITIETDANGKY.SoPhieu` |
| 30 | `CHITIETDANGKY.MaLop` -> `LOP.MaLop` | `trg_biu_chitietdangky_fk_ctdk_lop`: kiểm tra `LOP.MaLop` tồn tại | `trg_bd_lop_fk_ctdk_lop_restrict`: chặn xóa nếu còn `CHITIETDANGKY` | `trg_aupk_lop_fk_ctdk_lop_cascade`: cập nhật `CHITIETDANGKY.MaLop` |
| 31 | `CHITIETDANGKY.MaMonHoc` -> `MONHOC.MaMonHoc` | `trg_biu_chitietdangky_fk_ctdk_monhoc`: kiểm tra `MONHOC.MaMonHoc` tồn tại | `trg_bd_monhoc_fk_ctdk_monhoc_restrict`: chặn xóa nếu còn `CHITIETDANGKY` | `trg_aupk_monhoc_fk_ctdk_monhoc_cascade`: cập nhật `CHITIETDANGKY.MaMonHoc` |
| 32 | `MONDAHOC.MaSv` -> `SINHVIEN.MaSv` | `trg_biu_mondahoc_fk_mdh_sv`: kiểm tra `SINHVIEN.MaSv` tồn tại | `trg_ad_sinhvien_fk_mdh_sv_cascade`: xóa `MONDAHOC` liên quan | `trg_aupk_sinhvien_fk_mdh_sv_cascade`: cập nhật `MONDAHOC.MaSv` |
| 33 | `MONDAHOC.MaMonHoc` -> `MONHOC.MaMonHoc` | `trg_biu_mondahoc_fk_mdh_mh`: kiểm tra `MONHOC.MaMonHoc` tồn tại | `trg_bd_monhoc_fk_mdh_mh_restrict`: chặn xóa nếu còn `MONDAHOC` | `trg_aupk_monhoc_fk_mdh_mh_cascade`: cập nhật `MONDAHOC.MaMonHoc` |
| 34 | `MONDAHOC.MaHocKy` -> `HOCKY.MaHocKy` | `trg_biu_mondahoc_fk_mdh_hk`: kiểm tra `HOCKY.MaHocKy` tồn tại | `trg_bd_hocky_fk_mdh_hk_restrict`: chặn xóa nếu còn `MONDAHOC` | `trg_aupk_hocky_fk_mdh_hk_cascade`: cập nhật `MONDAHOC.MaHocKy` |
| 35 | `MONDAHOC.MaLop` -> `LOP.MaLop` | `trg_biu_mondahoc_fk_mdh_lop`: kiểm tra `LOP.MaLop` tồn tại nếu khác `NULL` | `trg_ad_lop_fk_mdh_lop_set_null`: đặt `MONDAHOC.MaLop = NULL` | `trg_aupk_lop_fk_mdh_lop_cascade`: cập nhật `MONDAHOC.MaLop` |
| 36 | `MONDAHOC.NguoiCapNhat` -> `NGUOIDUNG.MaTaiKhoan` | `trg_biu_mondahoc_fk_mdh_nguoi_cap_nhat`: kiểm tra `NGUOIDUNG.MaTaiKhoan` tồn tại nếu khác `NULL` | `trg_ad_nguoidung_fk_mdh_nguoi_cap_nhat_set_null`: đặt `MONDAHOC.NguoiCapNhat = NULL` | `trg_aupk_nguoidung_fk_mdh_nguoi_cap_nhat_cascade`: cập nhật `MONDAHOC.NguoiCapNhat` |
| 37 | `PHIEUTHUHOCPHI.SoPhieuDangKy` -> `PHIEUDANGKY.SoPhieu` | `trg_biu_phieuthu_hocphi_fk_pthp_pdk`: kiểm tra `PHIEUDANGKY.SoPhieu` tồn tại | `trg_bd_phieudangky_fk_pthp_pdk_restrict`: chặn xóa nếu còn `PHIEUTHUHOCPHI` | `trg_aupk_phieudangky_fk_pthp_pdk_cascade`: cập nhật `PHIEUTHUHOCPHI.SoPhieuDangKy` |
| 38 | `PHIEUTHUHOCPHI.MaSv` -> `SINHVIEN.MaSv` | `trg_biu_phieuthu_hocphi_fk_pthp_sv`: kiểm tra `SINHVIEN.MaSv` tồn tại | `trg_bd_sinhvien_fk_pthp_sv_restrict`: chặn xóa nếu còn `PHIEUTHUHOCPHI` | `trg_aupk_sinhvien_fk_pthp_sv_cascade`: cập nhật `PHIEUTHUHOCPHI.MaSv` |
| 39 | `THONGBAO.MaTaiKhoanNhan` -> `NGUOIDUNG.MaTaiKhoan` | `trg_biu_thongbao_fk_tb_nguoinhan`: kiểm tra `NGUOIDUNG.MaTaiKhoan` tồn tại | `trg_ad_nguoidung_fk_tb_nguoinhan_cascade`: xóa `THONGBAO` liên quan | `trg_aupk_nguoidung_fk_tb_nguoinhan_cascade`: cập nhật `THONGBAO.MaTaiKhoanNhan` |

---

## Trigger nghiệp vụ ngoài tầm ảnh hưởng FK

Trong `init.sql` hiện đã có trigger nghiệp vụ:

| Trigger | Bảng | Mục đích |
|---|---|---|
| `trg_prevent_student_schedule_conflict` | `CHITIETDANGKY` | Chặn đăng ký lớp bị trùng lịch học trong cùng học kỳ |

Các trigger FK ở trên chỉ bao phủ tầm ảnh hưởng khóa ngoại. Những trigger nghiệp vụ khác như cập nhật sĩ số lớp mở, tính lại tổng tiền phiếu đăng ký, cập nhật trạng thái học phí, hoặc audit `NgayCapNhat` nên được thiết kế riêng theo yêu cầu nghiệp vụ, không trộn vào danh sách FK này.
