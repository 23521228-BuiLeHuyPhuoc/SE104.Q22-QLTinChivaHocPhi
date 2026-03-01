# 📋 PHÂN CÔNG CÔNG VIỆC - THAO TÁC FILE

## Hệ thống Quản lý Đăng ký Môn học và Thu Học phí

---

## 📌 TỔNG QUAN

Tài liệu này phân chia công việc chi tiết cho **4 thành viên** trong nhóm, bao gồm các công việc cần làm và các file cần thao tác trong cả Backend và Frontend.

---

## 👤 THÀNH VIÊN 1: Quản lý Sinh viên & Đối tượng ưu tiên

### Phụ trách: BM1 - Lập hồ sơ sinh viên, QĐ1 - Quê quán & Đối tượng ưu tiên

### 📁 Files Backend cần thao tác:

| STT | File | Công việc |
|-----|------|-----------|
| 1 | `backend/src/controllers/studentController.js` | Thêm/sửa API CRUD sinh viên, lấy tỷ lệ giảm HP |
| 2 | `backend/src/routes/studentRoutes.js` | Định nghĩa routes cho sinh viên |
| 3 | `backend/src/controllers/locationController.js` | **Tạo mới** - API quản lý Tỉnh/Huyện |
| 4 | `backend/src/routes/locationRoutes.js` | **Tạo mới** - Routes cho Tỉnh/Huyện |
| 5 | `backend/src/controllers/priorityObjectController.js` | **Tạo mới** - API quản lý đối tượng ưu tiên |
| 6 | `backend/src/routes/priorityObjectRoutes.js` | **Tạo mới** - Routes đối tượng ưu tiên |
| 7 | `backend/src/index.js` | Đăng ký routes mới |

### 📁 Files Frontend cần thao tác:

| STT | File | Công việc |
|-----|------|-----------|
| 1 | `frontend/src/pages/Students.jsx` | Cập nhật giao diện quản lý sinh viên theo BM1 |
| 2 | `frontend/src/pages/Students.css` | Styles cho trang sinh viên |
| 3 | `frontend/src/pages/admin/LocationManagement.jsx` | **Tạo mới** - Quản lý Tỉnh/Huyện |
| 4 | `frontend/src/pages/admin/LocationManagement.css` | **Tạo mới** - Styles |
| 5 | `frontend/src/pages/admin/PriorityObjects.jsx` | **Tạo mới** - Quản lý đối tượng ưu tiên |
| 6 | `frontend/src/pages/admin/PriorityObjects.css` | **Tạo mới** - Styles |
| 7 | `frontend/src/services/locationService.js` | **Tạo mới** - API service cho địa danh |
| 8 | `frontend/src/services/priorityObjectService.js` | **Tạo mới** - API service đối tượng |
| 9 | `frontend/src/App.jsx` | Thêm routes mới |

### 📝 Chi tiết công việc:

#### A. Backend Tasks:

##### 1. API Quản lý Tỉnh/Thành phố

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách tỉnh | GET | `/api/locations/provinces` | Trả về danh sách tất cả tỉnh/thành phố, có phân trang và tìm kiếm |
| Lấy chi tiết tỉnh | GET | `/api/locations/provinces/:id` | Trả về thông tin chi tiết 1 tỉnh kèm danh sách phường/xã |
| Thêm tỉnh | POST | `/api/locations/provinces` | Yêu cầu: `{ma_tinh, ten_tinh, loai_tinh}`. Kiểm tra mã không trùng |
| Sửa tỉnh | PUT | `/api/locations/provinces/:id` | Cập nhật tên tỉnh, không cho sửa mã |
| Xóa tỉnh | DELETE | `/api/locations/provinces/:id` | Kiểm tra không có phường/xã nào thuộc tỉnh trước khi xóa |

**Request/Response mẫu:**
```javascript
// GET /api/locations/provinces
// Response:
{
  "success": true,
  "data": [
    { "ma_tinh": "29", "ten_tinh": "Hồ Chí Minh", "loai_tinh": "Thành phố", "trang_thai": true, "so_phuong_xa": 168 },
    { "ma_tinh": "1", "ten_tinh": "Hà Nội", "loai_tinh": "Thành phố", "trang_thai": true, "so_phuong_xa": 125 }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 34 }
}

// POST /api/locations/provinces
// Request:
{ "ma_tinh": "35", "ten_tinh": "Bắc Giang", "loai_tinh": "Tỉnh" }
// Response:
{ "success": true, "message": "Thêm tỉnh thành công", "data": {...} }
```

##### 2. API Quản lý Phường/Xã

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách phường/xã | GET | `/api/locations/wards` | Trả về tất cả phường/xã, hỗ trợ filter theo tỉnh và khu vực |
| Lấy phường/xã theo tỉnh | GET | `/api/locations/wards/province/:id` | Lọc phường/xã theo mã tỉnh |
| Lấy chi tiết phường/xã | GET | `/api/locations/wards/:id` | Thông tin phường/xã kèm tên tỉnh |
| Thêm phường/xã | POST | `/api/locations/wards` | Yêu cầu: `{ma_phuong_xa, ten_phuong_xa, ma_tinh, loai, khu_vuc}` |
| Sửa phường/xã | PUT | `/api/locations/wards/:id` | Cập nhật thông tin, đặc biệt khu vực ưu tiên (KV1-KV3) |
| Xóa phường/xã | DELETE | `/api/locations/wards/:id` | Kiểm tra không có sinh viên nào thuộc phường/xã |

**Phân loại khu vực ưu tiên (theo tra-cuu-khu-vuc-uu-tien-2025.docx):**
- **KV1**: Thành phố, thị xã, vùng đồng bằng
- **KV2**: Vùng nông thôn, ngoại thành
- **KV2-NT**: Vùng nông thôn đặc biệt
- **KV3**: Vùng sâu, vùng xa, biên giới, hải đảo, vùng đồng bào dân tộc thiểu số

**Business Logic quan trọng:**
- Đối tượng "vùng sâu vùng xa" = sinh viên có `ma_phuong_xa` thuộc KV3 **VÀ** có `ma_dan_toc` là dân tộc thiểu số
- Khi cập nhật `khu_vuc` của phường/xã: Cần kiểm tra và cập nhật tỷ lệ giảm HP cho các SV thuộc vùng này

##### 3. API Quản lý Dân tộc

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách dân tộc | GET | `/api/ethnicities` | Danh sách dân tộc, có filter dân tộc thiểu số |
| Lấy chi tiết dân tộc | GET | `/api/ethnicities/:id` | Thông tin chi tiết 1 dân tộc |
| Thêm dân tộc | POST | `/api/ethnicities` | Yêu cầu: `{ma_dan_toc, ten_dan_toc, la_dan_toc_thieu_so}` |
| Sửa dân tộc | PUT | `/api/ethnicities/:id` | Cập nhật thông tin dân tộc |
| Xóa dân tộc | DELETE | `/api/ethnicities/:id` | Kiểm tra không có sinh viên nào thuộc dân tộc |

##### 4. API Quản lý Đối tượng ưu tiên

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách đối tượng | GET | `/api/priority-objects` | Danh sách đối tượng sắp xếp theo độ ưu tiên |
| Lấy chi tiết đối tượng | GET | `/api/priority-objects/:id` | Thông tin chi tiết 1 đối tượng |
| Thêm đối tượng | POST | `/api/priority-objects` | Yêu cầu: `{ma_doi_tuong, ten_doi_tuong, ti_le_giam_hoc_phi, do_uu_tien}` |
| Sửa đối tượng | PUT | `/api/priority-objects/:id` | Cập nhật, khi sửa tỷ lệ giảm cần cập nhật phiếu ĐK |
| Xóa đối tượng | DELETE | `/api/priority-objects/:id` | Kiểm tra không có SV nào đang được gán |

##### 4. API Gán đối tượng cho Sinh viên

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy đối tượng của SV | GET | `/api/priority-objects/student/:sv_id` | Danh sách đối tượng đã gán cho SV |
| Gán đối tượng | POST | `/api/priority-objects/assign` | Body: `{ma_sv, ma_doi_tuong, file_minh_chung}` |
| Xóa gán đối tượng | DELETE | `/api/priority-objects/student/:sv_id/:obj_id` | Hủy gán đối tượng |

**Business Logic:**
- Khi gán/xóa đối tượng: Gọi function `fn_lay_ti_le_giam_hoc_phi(ma_sv)` để tính lại tỷ lệ
- Cập nhật tất cả phiếu đăng ký của SV trong các HK đang active

##### 5. API Quản lý Sinh viên (cập nhật theo BM1)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách SV | GET | `/api/students` | Hỗ trợ filter: ngành, trạng thái, quê quán, đối tượng |
| Lấy chi tiết SV | GET | `/api/students/:id` | Bao gồm: thông tin cá nhân, quê quán, đối tượng, tỷ lệ giảm |
| Thêm SV | POST | `/api/students` | Theo BM1, tự động tạo tài khoản |
| Sửa SV | PUT | `/api/students/:id` | Cập nhật thông tin cá nhân |
| Xóa SV | DELETE | `/api/students/:id` | Soft delete (set trạng thái) |
| Lấy tỷ lệ giảm HP | GET | `/api/students/:id/discount-rate` | Gọi function SQL |
| Upload ảnh đại diện | POST | `/api/students/:id/avatar` | Upload file ảnh |

**Request/Response mẫu cho POST /api/students:**
```javascript
// Request (theo BM1):
{
  "ma_sv": "SV001",
  "ho_ten": "Nguyễn Văn An",
  "ngay_sinh": "2003-05-15",
  "gioi_tinh": "Nam",
  "ma_phuong_xa": "2659",      // Quê quán (phường/xã)
  "ma_dan_toc": "KINH",        // Dân tộc
  "ma_nganh": "KTPM",          // Ngành học
  "ma_doi_tuong": "DT03",      // Đối tượng ưu tiên (optional)
  "cccd": "001203012345",
  "sdt": "0901234567",
  "email": "an.nv@email.com"
}

// Response:
{
  "success": true,
  "message": "Tạo sinh viên thành công",
  "data": {
    "ma_sv": "SV001",
    "ho_ten": "Nguyễn Văn An",
    "que_quan": {
      "phuong_xa": "Vũng Tàu",
      "tinh": "Hồ Chí Minh",
      "khu_vuc": "KV1"
    },
    "dan_toc": { "ma_dan_toc": "KINH", "ten_dan_toc": "Kinh", "la_dan_toc_thieu_so": false },
    "la_vung_sau_vung_xa": false,  // true nếu: khu_vuc = KV3 VÀ la_dan_toc_thieu_so = true
    "nganh": { "ma_nganh": "KTPM", "ten_nganh": "Kỹ thuật Phần mềm" },
    "doi_tuong": [{ "ma_doi_tuong": "DT03", "ten_doi_tuong": "Hộ nghèo", "ti_le_giam": 70 }],
    "ti_le_giam_hoc_phi": 70,
    "tai_khoan": { "ten_dang_nhap": "sv001", "mat_khau_mac_dinh": "sv001@2003-05-15" }
  }
}
```

#### B. Frontend Tasks:

##### 1. Form lập hồ sơ sinh viên (theo BM1)

**Component:** `StudentForm.jsx`

**State cần quản lý:**
```javascript
const [formData, setFormData] = useState({
  ma_sv: '',
  ho_ten: '',
  ngay_sinh: '',
  gioi_tinh: 'Nam',
  ma_tinh: '',          // Dropdown tỉnh
  ma_phuong_xa: '',     // Dropdown phường/xã (load theo tỉnh)
  ma_dan_toc: 'KINH',   // Dropdown dân tộc (mặc định Kinh)
  ma_nganh: '',         // Dropdown ngành
  ma_doi_tuong: '',     // Dropdown đối tượng (optional)
  cccd: '',
  sdt: '',
  email: '',
  anh_dai_dien: null
});
const [tinhList, setTinhList] = useState([]);
const [phuongXaList, setPhuongXaList] = useState([]);
const [danTocList, setDanTocList] = useState([]);
const [nganhList, setNganhList] = useState([]);
const [doiTuongList, setDoiTuongList] = useState([]);
const [errors, setErrors] = useState({});
```

**Behavior:**
- Khi chọn Tỉnh → Load danh sách Phường/Xã tương ứng (cascade dropdown)
- Hiển thị badge khu vực ưu tiên (KV1/KV2/KV2-NT/KV3) khi chọn phường/xã
- Hiển thị badge "Vùng sâu vùng xa" nếu phường/xã thuộc KV3 VÀ dân tộc là dân tộc thiểu số
- Hiển thị tỷ lệ giảm HP dự kiến khi chọn đối tượng
- Validation: Mã SV không trùng, email đúng format, ngày sinh hợp lệ

##### 2. Trang quản lý Tỉnh/Phường xã

**Component:** `LocationManagement.jsx`

**Features:**
- Tab Tỉnh/Thành phố | Tab Phường/Xã | Tab Dân tộc
- Table với columns: Mã, Tên, Trạng thái, Số phường/xã (tab Tỉnh) / Khu vực ưu tiên (tab Phường/Xã) / DTTS (tab Dân tộc)
- Modal thêm/sửa
- Checkbox "Vùng sâu vùng xa" với cảnh báo khi thay đổi
- Search và filter

##### 3. Trang quản lý Đối tượng ưu tiên

**Component:** `PriorityObjects.jsx`

**Features:**
- Table: Mã, Tên, Tỷ lệ giảm, Độ ưu tiên, Số SV được gán
- Drag & drop để thay đổi độ ưu tiên
- Modal thêm/sửa với slider cho tỷ lệ giảm (0-100%)
- Tab phụ: Gán đối tượng cho SV (search SV, chọn đối tượng, upload minh chứng)

##### 4. Hiển thị tỷ lệ giảm HP

**Component:** `StudentDiscountBadge.jsx`
```jsx
// Hiển thị trong danh sách và chi tiết sinh viên
<Badge color={discountRate > 0 ? 'green' : 'gray'}>
  Giảm {discountRate}% học phí
</Badge>
{isVungSauXa && <Tag color="orange">Vùng sâu/xa (KV3 + DTTS)</Tag>}
```

### ✅ Acceptance Criteria:

1. **API Sinh viên:**
   - [ ] Có thể tạo sinh viên với đầy đủ thông tin theo BM1 (bao gồm dân tộc)
   - [ ] Tự động tạo tài khoản đăng nhập sau khi tạo sinh viên
   - [ ] API trả về tỷ lệ giảm HP chính xác theo đối tượng ưu tiên cao nhất
   - [ ] Xác định đúng đối tượng "vùng sâu vùng xa" (KV3 + dân tộc thiểu số)

2. **API Địa danh:**
   - [ ] Dropdown Tỉnh → Phường/Xã hoạt động đúng (cascade)
   - [ ] Phân loại khu vực ưu tiên đúng (KV1, KV2, KV2-NT, KV3)
   - [ ] Khi cập nhật khu vực, tự động tính lại tỷ lệ giảm cho SV

3. **API Dân tộc:**
   - [ ] CRUD dân tộc hoạt động đúng
   - [ ] Phân biệt dân tộc Kinh và dân tộc thiểu số

4. **API Đối tượng:**
   - [ ] CRUD đối tượng ưu tiên hoạt động đúng
   - [ ] Gán/xóa đối tượng cho SV hoạt động đúng
   - [ ] Tỷ lệ giảm luôn lấy từ đối tượng có độ ưu tiên cao nhất

5. **Frontend:**
   - [ ] Form tạo SV theo đúng BM1 (có thêm dropdown dân tộc)
   - [ ] Dropdown cascade Tỉnh → Phường/Xã
   - [ ] Hiển thị rõ ràng tỷ lệ giảm HP của từng sinh viên
   - [ ] Hiển thị khu vực ưu tiên (KV1-KV3) và badge "Vùng sâu vùng xa"

---

## 👤 THÀNH VIÊN 2: Quản lý Môn học & Chương trình học

### Phụ trách: BM2 - Nhập danh sách môn học, BM3 - Nhập chương trình học, QĐ2 - Loại môn & Số tín chỉ, QĐ3 - Kế hoạch đào tạo

### 📁 Files Backend cần thao tác:

| STT | File | Công việc |
|-----|------|-----------|
| 1 | `backend/src/controllers/courseController.js` | Cập nhật API môn học (loại môn, số tiết, số TC) |
| 2 | `backend/src/routes/courseRoutes.js` | Cập nhật routes môn học |
| 3 | `backend/src/controllers/classController.js` | Cập nhật API lớp học |
| 4 | `backend/src/routes/classRoutes.js` | Cập nhật routes lớp học |
| 5 | `backend/src/controllers/curriculumController.js` | **Tạo mới** - API chương trình học |
| 6 | `backend/src/routes/curriculumRoutes.js` | **Tạo mới** - Routes chương trình học |
| 7 | `backend/src/controllers/departmentController.js` | **Tạo mới** - API Khoa/Ngành |
| 8 | `backend/src/routes/departmentRoutes.js` | **Tạo mới** - Routes Khoa/Ngành |
| 9 | `backend/src/controllers/prerequisiteController.js` | **Tạo mới** - API điều kiện môn học |
| 10 | `backend/src/routes/prerequisiteRoutes.js` | **Tạo mới** - Routes điều kiện |
| 11 | `backend/src/index.js` | Đăng ký routes mới |

### 📁 Files Frontend cần thao tác:

| STT | File | Công việc |
|-----|------|-----------|
| 1 | `frontend/src/pages/Courses.jsx` | Cập nhật giao diện theo BM2 (loại môn, số tiết) |
| 2 | `frontend/src/pages/Courses.css` | Styles cho trang môn học |
| 3 | `frontend/src/pages/Classes.jsx` | Cập nhật giao diện quản lý lớp |
| 4 | `frontend/src/pages/Classes.css` | Styles cho trang lớp học |
| 5 | `frontend/src/pages/admin/Curriculum.jsx` | **Tạo mới** - Quản lý chương trình học theo BM3 |
| 6 | `frontend/src/pages/admin/Curriculum.css` | **Tạo mới** - Styles |
| 7 | `frontend/src/pages/admin/Departments.jsx` | **Tạo mới** - Quản lý Khoa/Ngành |
| 8 | `frontend/src/pages/admin/Departments.css` | **Tạo mới** - Styles |
| 9 | `frontend/src/services/curriculumService.js` | **Tạo mới** - API service chương trình học |
| 10 | `frontend/src/services/departmentService.js` | **Tạo mới** - API service Khoa/Ngành |
| 11 | `frontend/src/App.jsx` | Thêm routes mới |

### 📝 Chi tiết công việc:

#### A. Backend Tasks:

##### 1. API Quản lý Khoa

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách khoa | GET | `/api/departments` | Danh sách khoa kèm số ngành, số môn học |
| Lấy chi tiết khoa | GET | `/api/departments/:id` | Thông tin khoa, danh sách ngành và môn |
| Thêm khoa | POST | `/api/departments` | Body: `{ma_khoa, ten_khoa, ten_viet_tat, email, sdt}` |
| Sửa khoa | PUT | `/api/departments/:id` | Cập nhật thông tin khoa |
| Xóa khoa | DELETE | `/api/departments/:id` | Kiểm tra không có ngành/môn thuộc khoa |

##### 2. API Quản lý Ngành học

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách ngành | GET | `/api/majors` | Filter theo khoa, kèm số SV, số môn CTĐT |
| Lấy ngành theo khoa | GET | `/api/majors/department/:id` | Lọc ngành theo mã khoa |
| Lấy chi tiết ngành | GET | `/api/majors/:id` | Thông tin ngành, CTĐT, danh sách SV |
| Thêm ngành | POST | `/api/majors` | Body: `{ma_nganh, ten_nganh, ma_khoa, so_tin_chi_toi_thieu, thoi_gian_dao_tao}` |
| Sửa ngành | PUT | `/api/majors/:id` | Cập nhật thông tin ngành |
| Xóa ngành | DELETE | `/api/majors/:id` | Kiểm tra không có SV nào thuộc ngành |

##### 3. API Quản lý Môn học (theo BM2, QĐ2)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách môn | GET | `/api/courses` | Filter: khoa, loại môn, tìm kiếm theo tên/mã |
| Lấy chi tiết môn | GET | `/api/courses/:id` | Kèm điều kiện tiên quyết, các lớp, CTĐT |
| Thêm môn học | POST | `/api/courses` | Theo BM2, tự động tính số tín chỉ theo QĐ2 |
| Sửa môn học | PUT | `/api/courses/:id` | Khi sửa số tiết → tự động tính lại số TC |
| Xóa môn học | DELETE | `/api/courses/:id` | Kiểm tra không có lớp mở, CTĐT |
| Lấy điều kiện | GET | `/api/courses/:id/prerequisites` | Danh sách môn tiên quyết/học trước |
| Thêm điều kiện | POST | `/api/courses/:id/prerequisites` | Body: `{ma_mon_dieu_kien, loai_dieu_kien}` |
| Xóa điều kiện | DELETE | `/api/courses/:id/prerequisites/:prereq_id` | Xóa điều kiện môn |

**Request/Response mẫu cho POST /api/courses (theo BM2):**
```javascript
// Request:
{
  "ma_mon_hoc": "CS106",
  "ten_mon_hoc": "Trí tuệ nhân tạo",
  "ma_khoa": "KHMT",
  "loai_mon": "LT",      // 'LT' hoặc 'TH' (QĐ2)
  "so_tiet": 45,         // Số tiết (BM2)
  "mo_ta": "Nhập môn về Trí tuệ nhân tạo"
}

// Response:
{
  "success": true,
  "data": {
    "ma_mon_hoc": "CS106",
    "ten_mon_hoc": "Trí tuệ nhân tạo",
    "loai_mon": "LT",
    "so_tiet": 45,
    "so_tin_chi": 3,     // Tự động tính: 45/15 = 3 (QĐ2)
    "khoa": { "ma_khoa": "KHMT", "ten_khoa": "Khoa học Máy tính" },
    "lop_mac_dinh": { "ma_lop": "CS106_01", "ten_lop": "Trí tuệ nhân tạo - Lớp 01" }
  }
}
```

**Business Logic quan trọng (QĐ2):**
```javascript
// Tính số tín chỉ tự động
const tinhSoTinChi = (loai_mon, so_tiet) => {
  if (loai_mon === 'LT') return Math.floor(so_tiet / 15);  // Lý thuyết: số tiết/15
  if (loai_mon === 'TH') return Math.floor(so_tiet / 30);  // Thực hành: số tiết/30
  throw new Error('Loại môn không hợp lệ');
};
```

##### 4. API Quản lý Lớp học

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách lớp | GET | `/api/classes` | Filter theo môn học, giảng viên |
| Lấy lớp theo môn | GET | `/api/classes/course/:id` | Tất cả lớp của 1 môn |
| Lấy chi tiết lớp | GET | `/api/classes/:id` | Thông tin lớp kèm danh sách SV đăng ký |
| Thêm lớp | POST | `/api/classes` | Body: `{ma_lop, ma_mon_hoc, giang_vien, lich_hoc, phong_hoc, so_luong_toi_da}` |
| Sửa lớp | PUT | `/api/classes/:id` | Cập nhật thông tin lớp |
| Xóa lớp | DELETE | `/api/classes/:id` | Kiểm tra không có SV đăng ký |

##### 5. API Chương trình học (theo BM3, QĐ3)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy CTĐT theo ngành | GET | `/api/curriculum/major/:id` | Danh sách môn sắp xếp theo học kỳ dự kiến |
| Thêm môn vào CTĐT | POST | `/api/curriculum` | Body: `{ma_nganh, ma_mon_hoc, hoc_ky_du_kien, bat_buoc, ghi_chu}` |
| Sửa CTĐT | PUT | `/api/curriculum/:id` | Cập nhật học kỳ dự kiến, bắt buộc |
| Xóa môn khỏi CTĐT | DELETE | `/api/curriculum/:id` | Xóa môn khỏi chương trình |
| Import CTĐT | POST | `/api/curriculum/import` | Import từ file Excel |

**Request/Response mẫu cho GET /api/curriculum/major/:id (theo BM3):**
```javascript
// GET /api/curriculum/major/KTPM
// Response:
{
  "success": true,
  "data": {
    "nganh": { "ma_nganh": "KTPM", "ten_nganh": "Kỹ thuật Phần mềm" },
    "khoa": { "ma_khoa": "CNPM", "ten_khoa": "Công nghệ Phần mềm" },
    "so_tin_chi_toi_thieu": 120,
    "thoi_gian_dao_tao": "4 năm",
    "chuong_trinh_hoc": [
      {
        "hoc_ky": 1,
        "mon_hoc": [
          { "ma_mon": "MA006", "ten_mon": "Giải tích", "so_tc": 4, "loai": "LT", "bat_buoc": true },
          { "ma_mon": "IT001", "ten_mon": "Nhập môn lập trình", "so_tc": 4, "loai": "LT", "bat_buoc": true }
        ],
        "tong_tin_chi": 18
      },
      {
        "hoc_ky": 2,
        "mon_hoc": [
          { "ma_mon": "IT003", "ten_mon": "CTDL&GT", "so_tc": 4, "loai": "LT", "bat_buoc": true },
          { "ma_mon": "IT004", "ten_mon": "Cơ sở dữ liệu", "so_tc": 4, "loai": "LT", "bat_buoc": true }
        ],
        "tong_tin_chi": 17
      }
      // ... các học kỳ khác
    ],
    "tong_tin_chi_bat_buoc": 100,
    "tong_tin_chi_tu_chon": 20
  }
}
```

#### B. Frontend Tasks:

##### 1. Form nhập môn học (theo BM2)

**Component:** `CourseForm.jsx`

**State:**
```javascript
const [formData, setFormData] = useState({
  ma_mon_hoc: '',
  ten_mon_hoc: '',
  ma_khoa: '',
  loai_mon: 'LT',    // Radio: LT/TH
  so_tiet: '',
  mo_ta: ''
});
const [soTinChi, setSoTinChi] = useState(0);  // Tự động tính
```

**Behavior:**
- Khi thay đổi `loai_mon` hoặc `so_tiet` → Tự động tính và hiển thị `soTinChi`
- Hiển thị công thức: "Số tín chỉ = [số tiết] / [15 hoặc 30] = [kết quả]"
- Validation: Mã môn không trùng, số tiết > 0

**UI Elements:**
```jsx
<Form>
  <Input label="Mã môn học" name="ma_mon_hoc" required />
  <Input label="Tên môn học" name="ten_mon_hoc" required />
  <Select label="Khoa quản lý" name="ma_khoa" options={khoaList} required />
  
  <RadioGroup label="Loại môn (QĐ2)" name="loai_mon">
    <Radio value="LT">Lý thuyết (LT)</Radio>
    <Radio value="TH">Thực hành (TH)</Radio>
  </RadioGroup>
  
  <Input label="Số tiết" name="so_tiet" type="number" min="15" required />
  
  {/* Hiển thị số tín chỉ tự động */}
  <InfoBox>
    <strong>Số tín chỉ (QĐ2):</strong> {soTinChi} TC
    <small>Công thức: {so_tiet} / {loai_mon === 'LT' ? 15 : 30} = {soTinChi}</small>
  </InfoBox>
  
  <TextArea label="Mô tả" name="mo_ta" />
  <Button type="submit">Thêm môn học</Button>
</Form>
```

##### 2. Giao diện quản lý Khoa/Ngành

**Component:** `Departments.jsx`

**Features:**
- 2 tabs: Quản lý Khoa | Quản lý Ngành
- **Tab Khoa:** Table với columns: Mã, Tên, Viết tắt, Số ngành, Số môn, Trưởng khoa
- **Tab Ngành:** Table với columns: Mã, Tên, Khoa, Số TC tối thiểu, Số SV, Số môn CTĐT
- Nút thêm/sửa/xóa với modal form
- Search và filter

##### 3. Giao diện Chương trình học (theo BM3)

**Component:** `Curriculum.jsx`

**Features:**
- Dropdown chọn Ngành học
- Hiển thị CTĐT theo dạng timeline/kanban theo học kỳ
- Mỗi học kỳ là 1 column, chứa danh sách môn học
- Drag & drop môn học giữa các học kỳ
- Badge "Bắt buộc" / "Tự chọn" cho mỗi môn
- Tổng tín chỉ của từng học kỳ và toàn bộ CTĐT
- Modal thêm môn vào CTĐT (chọn môn từ danh sách, chọn HK dự kiến)

**UI mockup:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Chương trình học: Kỹ thuật Phần mềm (KTPM) - 120 TC                    │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │  HK 1   │ │  HK 2   │ │  HK 3   │ │  HK 4   │ │  HK 5   │ │  HK 6   ││
│ │ 18 TC   │ │ 17 TC   │ │ 18 TC   │ │ 17 TC   │ │ 16 TC   │ │ 16 TC   ││
│ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤│
│ │ MA006   │ │ IT003   │ │ SE104   │ │ CS106   │ │ SE400   │ │ SE505   ││
│ │ Giải    │ │ CTDL&GT │ │ Nhập    │ │ Trí tuệ │ │ Seminar │ │ Khóa    ││
│ │ tích    │ │ 4TC [BB]│ │ môn     │ │ nhân    │ │ CNPM    │ │ luận    ││
│ │ 4TC [BB]│ │         │ │ CNPM    │ │ tạo     │ │ 4TC [TC]│ │ 10TC[BB]││
│ ├─────────┤ ├─────────┤ │ 3TC [BB]│ │ 4TC [TC]│ └─────────┘ └─────────┘│
│ │ IT001   │ │ IT004   │ └─────────┘ └─────────┘                        │
│ │ Nhập    │ │ Cơ sở   │                                                │
│ │ môn LP  │ │ dữ liệu │                                                │
│ │ 4TC [BB]│ │ 4TC [BB]│                                                │
│ └─────────┘ └─────────┘                                                │
│                                            [+ Thêm môn] [Import Excel] │
└─────────────────────────────────────────────────────────────────────────┘
```

##### 4. Giao diện quản lý Điều kiện môn học

**Component:** `Prerequisites.jsx` (có thể tích hợp trong CourseDetail)

**Features:**
- Hiển thị graph/tree điều kiện của môn
- Thêm môn tiên quyết hoặc môn học trước
- Cảnh báo nếu phát hiện vòng lặp điều kiện
- Hiển thị 2 loại:
  - **Tiên quyết:** Phải đạt môn này trước
  - **Học trước:** Phải đăng ký học môn này trước hoặc cùng lúc

### ✅ Acceptance Criteria:

1. **API Môn học (BM2, QĐ2):**
   - [ ] Tạo môn học với loại môn LT/TH
   - [ ] Số tín chỉ tự động tính: LT = số tiết/15, TH = số tiết/30
   - [ ] Tự động tạo lớp mặc định khi tạo môn
   - [ ] CRUD hoạt động đúng

2. **API Chương trình học (BM3, QĐ3):**
   - [ ] Lấy CTĐT theo ngành với danh sách môn theo học kỳ
   - [ ] Thêm/sửa/xóa môn trong CTĐT
   - [ ] Phân biệt môn bắt buộc và tự chọn

3. **API Điều kiện môn học:**
   - [ ] Thêm môn tiên quyết/học trước
   - [ ] Phát hiện và ngăn chặn vòng lặp điều kiện

4. **Frontend:**
   - [ ] Form nhập môn học theo BM2 với số TC tự động tính
   - [ ] Giao diện CTĐT hiển thị theo học kỳ
   - [ ] Quản lý Khoa/Ngành hoạt động đúng

---

## 👤 THÀNH VIÊN 3: Quản lý Học kỳ, Đăng ký môn học & Lịch học

### Phụ trách: BM4 - Môn học mở trong học kỳ, BM5 - Phiếu đăng ký học phần, QĐ4 - Học kỳ chính/hè, QĐ5 - Đơn giá & Đăng ký lớp mở, **Quản lý Lịch học & Giới hạn tín chỉ**

### 📁 Files Backend cần thao tác:

| STT | File | Công việc |
|-----|------|-----------|
| 1 | `backend/src/controllers/semesterController.js` | **Tạo mới** - API học kỳ (QĐ4) |
| 2 | `backend/src/routes/semesterRoutes.js` | **Tạo mới** - Routes học kỳ |
| 3 | `backend/src/controllers/academicYearController.js` | **Tạo mới** - API năm học |
| 4 | `backend/src/routes/academicYearRoutes.js` | **Tạo mới** - Routes năm học |
| 5 | `backend/src/controllers/openClassController.js` | **Tạo mới** - API lớp mở theo học kỳ (BM4) |
| 6 | `backend/src/routes/openClassRoutes.js` | **Tạo mới** - Routes lớp mở |
| 7 | `backend/src/controllers/registrationController.js` | Cập nhật API đăng ký (BM5, QĐ5) + **kiểm tra giới hạn tín chỉ** |
| 8 | `backend/src/routes/registrationRoutes.js` | Cập nhật routes đăng ký |
| 9 | `backend/src/controllers/priceController.js` | **Tạo mới** - API đơn giá tín chỉ (QĐ5) |
| 10 | `backend/src/routes/priceRoutes.js` | **Tạo mới** - Routes đơn giá |
| 11 | `backend/src/controllers/scheduleController.js` | **Tạo mới** - API quản lý tiết học và lịch học |
| 12 | `backend/src/routes/scheduleRoutes.js` | **Tạo mới** - Routes lịch học |
| 13 | `backend/src/controllers/configController.js` | **Tạo mới** - API cấu hình đăng ký (max TC, GPA vượt) |
| 14 | `backend/src/routes/configRoutes.js` | **Tạo mới** - Routes cấu hình |
| 15 | `backend/src/index.js` | Đăng ký routes mới |

### 📁 Files Frontend cần thao tác:

| STT | File | Công việc |
|-----|------|-----------|
| 1 | `frontend/src/pages/Semesters.jsx` | **Tạo mới** - Quản lý năm học và học kỳ |
| 2 | `frontend/src/pages/Semesters.css` | **Tạo mới** - Styles |
| 3 | `frontend/src/pages/admin/OpenClasses.jsx` | **Tạo mới** - Quản lý lớp mở theo BM4 |
| 4 | `frontend/src/pages/admin/OpenClasses.css` | **Tạo mới** - Styles |
| 5 | `frontend/src/pages/admin/UnitPrices.jsx` | **Tạo mới** - Quản lý đơn giá tín chỉ (QĐ5) |
| 6 | `frontend/src/pages/admin/UnitPrices.css` | **Tạo mới** - Styles |
| 7 | `frontend/src/pages/admin/ClassSchedule.jsx` | **Tạo mới** - Quản lý lịch học và tiết học |
| 8 | `frontend/src/pages/admin/ClassSchedule.css` | **Tạo mới** - Styles |
| 9 | `frontend/src/pages/admin/RegistrationConfig.jsx` | **Tạo mới** - Cấu hình giới hạn tín chỉ |
| 10 | `frontend/src/pages/admin/RegistrationConfig.css` | **Tạo mới** - Styles |
| 11 | `frontend/src/pages/Registrations.jsx` | Cập nhật giao diện đăng ký (admin) |
| 12 | `frontend/src/pages/Registrations.css` | Styles |
| 13 | `frontend/src/pages/CourseRegistration.jsx` | Cập nhật giao diện đăng ký (sinh viên) + **hiển thị giới hạn TC** |
| 14 | `frontend/src/pages/CourseRegistration.css` | Styles |
| 15 | `frontend/src/pages/MyCourses.jsx` | Cập nhật hiển thị môn đã đăng ký + **thời khóa biểu** |
| 16 | `frontend/src/pages/StudentSchedule.jsx` | **Tạo mới** - Thời khóa biểu sinh viên |
| 17 | `frontend/src/pages/StudentSchedule.css` | **Tạo mới** - Styles |
| 18 | `frontend/src/services/openClassService.js` | **Tạo mới** - API service lớp mở |
| 19 | `frontend/src/services/priceService.js` | **Tạo mới** - API service đơn giá |
| 20 | `frontend/src/services/scheduleService.js` | **Tạo mới** - API service lịch học |
| 21 | `frontend/src/services/configService.js` | **Tạo mới** - API service cấu hình |
| 22 | `frontend/src/App.jsx` | Thêm routes mới |

### 📝 Chi tiết công việc:

#### A. Backend Tasks:

##### 1. API Quản lý Năm học

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách năm học | GET | `/api/academic-years` | Danh sách năm học kèm số học kỳ |
| Lấy chi tiết năm học | GET | `/api/academic-years/:id` | Thông tin năm học và các học kỳ |
| Thêm năm học | POST | `/api/academic-years` | Body: `{ma_nam_hoc, ten_nam_hoc, ngay_bat_dau, ngay_ket_thuc}` |
| Sửa năm học | PUT | `/api/academic-years/:id` | Cập nhật thông tin |
| Xóa năm học | DELETE | `/api/academic-years/:id` | Kiểm tra không có học kỳ |

##### 2. API Quản lý Học kỳ (theo QĐ4)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách học kỳ | GET | `/api/semesters` | Filter: năm học, loại HK, trạng thái |
| Lấy HK đang diễn ra | GET | `/api/semesters/active` | HK có `trang_thai = 'Đang diễn ra'` |
| Lấy HK đăng ký được | GET | `/api/semesters/available` | HK trong thời gian đăng ký |
| Lấy chi tiết học kỳ | GET | `/api/semesters/:id` | Kèm danh sách lớp mở, thống kê đăng ký |
| Thêm học kỳ | POST | `/api/semesters` | Phân loại: Chính (HKI, HKII) hoặc Hè |
| Sửa học kỳ | PUT | `/api/semesters/:id` | Cập nhật ngày, hạn đăng ký, hạn đóng HP |
| Xóa học kỳ | DELETE | `/api/semesters/:id` | Kiểm tra không có lớp mở/đăng ký |

**Request/Response mẫu cho POST /api/semesters (theo QĐ4):**
```javascript
// Request:
{
  "ma_hoc_ky": "HK1-2526",
  "ten_hoc_ky": "Học kỳ I - 2025-2026",
  "ma_nam_hoc": "2025-2026",
  "loai_hoc_ky": "Chính",     // 'Chính' hoặc 'Hè' (QĐ4)
  "thu_tu": 1,                 // 1 = HK I, 2 = HK II, 3 = Hè
  "ngay_bat_dau": "2025-09-01",
  "ngay_ket_thuc": "2026-01-15",
  "ngay_bat_dau_dang_ky": "2025-08-15",
  "ngay_ket_thuc_dang_ky": "2025-08-30",
  "han_dong_hoc_phi": "2025-10-31"
}

// Response:
{
  "success": true,
  "data": {
    "ma_hoc_ky": "HK1-2526",
    "ten_hoc_ky": "Học kỳ I - 2025-2026",
    "loai_hoc_ky": "Chính",
    "trang_thai": "Sắp diễn ra",
    "thoi_gian_dang_ky": {
      "bat_dau": "2025-08-15",
      "ket_thuc": "2025-08-30",
      "dang_trong_thoi_gian": false
    },
    "han_dong_hoc_phi": "2025-10-31"
  }
}
```

##### 3. API Quản lý Lớp mở trong học kỳ (theo BM4)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách lớp mở | GET | `/api/open-classes` | Filter: học kỳ, môn học |
| Lấy lớp mở theo HK | GET | `/api/open-classes/semester/:id` | Tất cả lớp mở của 1 HK (BM4) |
| Lấy chi tiết lớp mở | GET | `/api/open-classes/:id` | Kèm sĩ số đã đăng ký |
| Mở lớp trong HK | POST | `/api/open-classes` | Body: `{ma_hoc_ky, ma_lop, ghi_chu}` |
| Sửa lớp mở | PUT | `/api/open-classes/:id` | Cập nhật ghi chú, trạng thái |
| Đóng lớp | DELETE | `/api/open-classes/:id` | Soft delete, kiểm tra SV đã ĐK |
| Mở nhiều lớp | POST | `/api/open-classes/bulk` | Mở nhiều lớp cùng lúc |
| Mở lớp theo CTĐT | POST | `/api/open-classes/from-curriculum` | Tự động mở lớp dựa trên CTĐT ngành |

**Request/Response mẫu cho GET /api/open-classes/semester/:id (theo BM4):**
```javascript
// GET /api/open-classes/semester/HK1-2526
// Response:
{
  "success": true,
  "data": {
    "hoc_ky": {
      "ma_hoc_ky": "HK1-2526",
      "ten_hoc_ky": "Học kỳ I - 2025-2026",
      "loai_hoc_ky": "Chính"
    },
    "lop_mo": [
      {
        "ma_lop_mo": 1,
        "lop": { "ma_lop": "CS106_01", "giang_vien": "TS. Nguyễn Văn A", "phong": "A101" },
        "mon_hoc": { "ma_mon": "CS106", "ten_mon": "Trí tuệ nhân tạo", "so_tc": 3, "loai_mon": "LT" },
        "si_so": { "da_dang_ky": 35, "toi_da": 50, "con_trong": 15 },
        "trang_thai": "Đang mở"
      }
    ],
    "thong_ke": {
      "tong_lop_mo": 50,
      "tong_mon": 30,
      "tong_sv_dang_ky": 1200
    }
  }
}
```

##### 4. API Quản lý Đơn giá tín chỉ (theo QĐ5)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách đơn giá | GET | `/api/unit-prices` | Tất cả đơn giá theo loại môn, loại học |
| Lấy chi tiết đơn giá | GET | `/api/unit-prices/:id` | Thông tin chi tiết |
| Thêm đơn giá | POST | `/api/unit-prices` | Body: `{loai_mon, loai_hoc, don_gia, hieu_luc_tu}` |
| Sửa đơn giá | PUT | `/api/unit-prices/:id` | Cập nhật đơn giá |
| Xóa đơn giá | DELETE | `/api/unit-prices/:id` | Soft delete |
| Tính giá | GET | `/api/unit-prices/calculate` | Query: `?loai_mon=LT&loai_hoc=hoc_moi&ma_hoc_ky=HK1-2526` |

**Bảng đơn giá mặc định (theo QĐ5):**

| Loại môn | Loại học | Đơn giá (VNĐ/TC) |
|----------|----------|------------------|
| LT | hoc_moi | 27,000 |
| TH | hoc_moi | 37,000 |
| LT | hoc_lai | 32,000 |
| TH | hoc_lai | 42,000 |
| LT | hoc_cai_thien | 30,000 |
| TH | hoc_cai_thien | 40,000 |
| LT | hoc_he | 35,000 |
| TH | hoc_he | 45,000 |

##### 5. API Đăng ký học phần (theo BM5, QĐ5)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy phiếu ĐK của SV | GET | `/api/registrations/student/:sv_id` | Danh sách phiếu ĐK của SV |
| Lấy phiếu ĐK trong HK | GET | `/api/registrations/student/:sv_id/semester/:hk_id` | Phiếu ĐK cụ thể |
| Lấy lớp có thể ĐK | GET | `/api/registrations/available` | Query: `?ma_sv=SV001&ma_hoc_ky=HK1-2526` |
| Đăng ký lớp | POST | `/api/registrations` | Đăng ký 1 hoặc nhiều lớp (BM5, QĐ5) |
| Hủy đăng ký | PUT | `/api/registrations/:id/cancel` | Hủy đăng ký lớp |
| Lấy chi tiết phiếu | GET | `/api/registrations/:id` | Chi tiết phiếu ĐK (BM5) |

**Request/Response mẫu cho POST /api/registrations (theo BM5):**
```javascript
// Request:
{
  "ma_sv": "SV001",
  "ma_hoc_ky": "HK1-2526",
  "lop_dang_ky": [
    { "ma_lop": "CS106_01", "loai_dang_ky": "hoc_moi" },
    { "ma_lop": "IT003_02", "loai_dang_ky": "hoc_lai" }
  ]
}

// Response (theo BM5):
{
  "success": true,
  "data": {
    "so_phieu": 1,
    "ma_sv": "SV001",
    "ho_ten": "Nguyễn Văn An",
    "ngay_lap": "2025-08-20T10:30:00",
    "hoc_ky": { "ma_hoc_ky": "HK1-2526", "ten_hoc_ky": "HK I - 2025-2026" },
    "chi_tiet": [
      {
        "ma_lop": "CS106_01",
        "mon_hoc": { "ma_mon": "CS106", "ten_mon": "Trí tuệ nhân tạo" },
        "loai_mon": "LT",
        "so_tin_chi": 3,
        "loai_dang_ky": "hoc_moi",
        "don_gia": 27000,
        "thanh_tien": 81000
      },
      {
        "ma_lop": "IT003_02",
        "mon_hoc": { "ma_mon": "IT003", "ten_mon": "CTDL&GT" },
        "loai_mon": "LT",
        "so_tin_chi": 4,
        "loai_dang_ky": "hoc_lai",
        "don_gia": 32000,
        "thanh_tien": 128000
      }
    ],
    "tong_ket": {
      "tong_tin_chi": 7,
      "tong_tien_dang_ky": 209000,
      "ti_le_giam": 50,
      "tien_mien_giam": 104500,
      "tong_tien_phai_dong": 104500
    }
  }
}
```

#### B. Frontend Tasks:

##### 1. Giao diện quản lý Năm học & Học kỳ (theo QĐ4)

**Component:** `Semesters.jsx`

**Features:**
- Dropdown chọn năm học
- Timeline hiển thị các học kỳ trong năm: HK I → HK II → (Hè)
- Badge trạng thái: "Sắp diễn ra", "Đang diễn ra", "Đã kết thúc"
- Hiển thị thời gian đăng ký, hạn đóng HP
- Modal thêm/sửa học kỳ với validation ngày tháng

##### 2. Giao diện Mở lớp trong học kỳ (theo BM4)

**Component:** `OpenClasses.jsx`

**Features:**
- Dropdown chọn học kỳ
- 2 panels: "Lớp chưa mở" | "Lớp đã mở"
- Drag & drop từ "Chưa mở" sang "Đã mở" để mở lớp
- Table lớp đã mở: Mã lớp, Môn học, Giảng viên, Phòng, Sĩ số, Trạng thái
- Nút "Mở lớp từ CTĐT" - Tự động mở tất cả lớp theo CTĐT của các ngành

##### 3. Giao diện quản lý Đơn giá tín chỉ (theo QĐ5)

**Component:** `UnitPrices.jsx`

**Features:**
- Table hiển thị đơn giá theo ma trận: Rows = Loại học, Columns = Loại môn
- Editable cells - click để sửa đơn giá trực tiếp
- Lịch sử thay đổi đơn giá

##### 4. Giao diện Đăng ký học phần (Sinh viên) theo BM5

**Component:** `CourseRegistration.jsx`

**Features:**
- Hiển thị danh sách lớp có thể đăng ký (đã mở trong HK, còn chỗ)
- Filter: Theo môn, theo khoa, tìm kiếm
- Chọn lớp để thêm vào giỏ đăng ký
- Chọn loại đăng ký: Học mới / Học lại / Cải thiện
- Hiển thị tóm tắt: Tổng TC, Tổng tiền, Tỷ lệ giảm, Tiền phải đóng
- Nút "Xác nhận đăng ký"

##### 5. Giao diện Môn học đã đăng ký (theo BM5)

**Component:** `MyCourses.jsx`

**Features:**
- Hiển thị phiếu đăng ký (BM5): Số phiếu, Ngày lập, Tổng TC, Tổng tiền
- Table chi tiết: Môn học, Lớp, Loại ĐK, Số TC, Thành tiền
- Trạng thái: "Đã đăng ký" / "Đã hủy"
- Nút "Hủy đăng ký" cho từng môn (trong thời gian cho phép)

### ✅ Acceptance Criteria:

1. **API Học kỳ (QĐ4):**
   - [ ] Tạo học kỳ với loại Chính (HKI, HKII) hoặc Hè
   - [ ] Quản lý thời gian đăng ký và hạn đóng HP
   - [ ] API lấy HK đang diễn ra hoạt động đúng

2. **API Lớp mở (BM4):**
   - [ ] Mở lớp trong học kỳ hoạt động đúng
   - [ ] Kiểm tra sĩ số khi mở lớp
   - [ ] API mở lớp theo CTĐT hoạt động đúng

3. **API Đơn giá (QĐ5):**
   - [ ] Quản lý đơn giá theo loại môn (LT/TH) và loại học
   - [ ] API tính giá trả về đúng đơn giá

4. **API Đăng ký (BM5, QĐ5):**
   - [ ] Chỉ cho đăng ký lớp có mở trong HK
   - [ ] Kiểm tra sĩ số trước khi đăng ký
   - [ ] Tự động tính tiền theo đơn giá và tỷ lệ giảm
   - [ ] Phiếu đăng ký có đầy đủ thông tin theo BM5

5. **Frontend:**
   - [ ] Giao diện học kỳ rõ ràng với timeline
   - [ ] Giao diện mở lớp dễ sử dụng
   - [ ] Giao diện đăng ký học phần hiển thị tóm tắt tiền

---

## 👤 THÀNH VIÊN 4: Quản lý Học phí & Báo cáo

### Phụ trách: BM6 - Lập phiếu thu học phí, BM7 - Báo cáo SV chưa đóng HP, QĐ6 - Đóng nhiều lần, QĐ7 - Miễn giảm, **Quản lý Điểm sinh viên**

### 📁 Files Backend cần thao tác:

| STT | File | Công việc |
|-----|------|-----------|
| 1 | `backend/src/controllers/tuitionController.js` | Cập nhật API học phí (tính miễn giảm) |
| 2 | `backend/src/routes/tuitionRoutes.js` | Cập nhật routes học phí |
| 3 | `backend/src/controllers/paymentController.js` | Cập nhật API phiếu thu theo BM6 |
| 4 | `backend/src/routes/paymentRoutes.js` | Cập nhật routes phiếu thu |
| 5 | `backend/src/controllers/reportController.js` | **Tạo mới** - API báo cáo theo BM7 |
| 6 | `backend/src/routes/reportRoutes.js` | **Tạo mới** - Routes báo cáo |
| 7 | `backend/src/controllers/notificationController.js` | Cập nhật API thông báo nhắc HP |
| 8 | `backend/src/routes/notificationRoutes.js` | Cập nhật routes thông báo |
| 9 | `backend/src/controllers/statisticsController.js` | **Tạo mới** - API thống kê tổng hợp |
| 10 | `backend/src/routes/statisticsRoutes.js` | **Tạo mới** - Routes thống kê |
| 11 | `backend/src/controllers/exportController.js` | **Tạo mới** - API xuất báo cáo Excel/PDF |
| 12 | `backend/src/routes/exportRoutes.js` | **Tạo mới** - Routes xuất báo cáo |
| 13 | `backend/src/controllers/gradeController.js` | **Tạo mới** - API quản lý điểm sinh viên |
| 14 | `backend/src/routes/gradeRoutes.js` | **Tạo mới** - Routes điểm sinh viên |
| 15 | `backend/src/controllers/roleController.js` | **Tạo mới** - API xem danh sách vai trò (admin/sinh_vien) |
| 16 | `backend/src/routes/roleRoutes.js` | **Tạo mới** - Routes vai trò |
| 17 | `backend/src/middleware/auth.js` | Cập nhật - Middleware phân quyền admin/sinh_vien |
| 18 | `backend/src/index.js` | Đăng ký routes mới |

### 📁 Files Frontend cần thao tác:

| STT | File | Công việc |
|-----|------|-----------|
| 1 | `frontend/src/pages/Tuition.jsx` | Cập nhật giao diện học phí (miễn giảm, còn lại) |
| 2 | `frontend/src/pages/Tuition.css` | Styles cho trang học phí |
| 3 | `frontend/src/pages/Payments.jsx` | Cập nhật giao diện phiếu thu theo BM6 |
| 4 | `frontend/src/pages/Payments.css` | Styles cho trang phiếu thu |
| 5 | `frontend/src/pages/Reports.jsx` | Cập nhật giao diện báo cáo theo BM7 |
| 6 | `frontend/src/pages/Reports.css` | Styles cho trang báo cáo |
| 7 | `frontend/src/pages/MyTuition.jsx` | Cập nhật giao diện xem học phí của SV |
| 8 | `frontend/src/pages/MyTuition.css` | Styles |
| 9 | `frontend/src/pages/MyPayments.jsx` | Cập nhật giao diện lịch sử thanh toán |
| 10 | `frontend/src/pages/MyPayments.css` | Styles |
| 11 | `frontend/src/pages/admin/Statistics.jsx` | **Tạo mới** - Giao diện thống kê tổng hợp |
| 12 | `frontend/src/pages/admin/Statistics.css` | **Tạo mới** - Styles cho trang thống kê |
| 13 | `frontend/src/pages/admin/GradeManagement.jsx` | **Tạo mới** - Quản lý nhập điểm sinh viên |
| 14 | `frontend/src/pages/admin/GradeManagement.css` | **Tạo mới** - Styles |
| 15 | `frontend/src/pages/MyGrades.jsx` | **Tạo mới** - Xem bảng điểm (SV) |
| 16 | `frontend/src/pages/MyGrades.css` | **Tạo mới** - Styles |
| 17 | `frontend/src/pages/StudentTranscript.jsx` | **Tạo mới** - Bảng điểm tích lũy toàn khóa |
| 18 | `frontend/src/pages/StudentTranscript.css` | **Tạo mới** - Styles |
| 19 | `frontend/src/services/reportService.js` | **Tạo mới** - API service báo cáo |
| 20 | `frontend/src/services/statisticsService.js` | **Tạo mới** - API service thống kê |
| 21 | `frontend/src/services/exportService.js` | **Tạo mới** - API service xuất báo cáo |
| 22 | `frontend/src/services/gradeService.js` | **Tạo mới** - API service điểm sinh viên |
| 23 | `frontend/src/App.jsx` | Cập nhật routes |

### 📝 Chi tiết công việc:

#### A. Backend Tasks:

##### 1. API Quản lý Học phí (theo QĐ7)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy học phí của SV | GET | `/api/tuition/student/:sv_id` | Tất cả học phí theo học kỳ |
| Lấy học phí theo HK | GET | `/api/tuition/student/:sv_id/semester/:hk_id` | Chi tiết học phí 1 HK |
| Tính học phí | POST | `/api/tuition/calculate` | Body: `{ma_sv, ma_hoc_ky}` |
| Lấy số tiền còn lại | GET | `/api/tuition/remaining/:sv_id/:hk_id` | Tiền còn phải đóng (QĐ7) |

**Logic tính học phí (QĐ7):**
```
Tổng tiền đăng ký = SUM(số tín chỉ × đơn giá) cho tất cả môn đã đăng ký
Tỷ lệ giảm = fn_lay_ti_le_giam_hoc_phi(ma_sv)  // Từ đối tượng ưu tiên
Tiền miễn giảm = Tổng tiền đăng ký × Tỷ lệ giảm / 100
Tiền phải đóng = Tổng tiền đăng ký - Tiền miễn giảm
Tiền còn lại = Tiền phải đóng - Tổng tiền đã thu
```

**Request/Response mẫu cho GET /api/tuition/student/:sv_id/semester/:hk_id (theo QĐ7):**
```javascript
// GET /api/tuition/student/SV001/semester/HK1-2526
// Response:
{
  "success": true,
  "data": {
    "sinh_vien": {
      "ma_sv": "SV001",
      "ho_ten": "Nguyễn Văn An",
      "doi_tuong": [{ "ten": "Con thương binh", "ti_le_giam": 50 }]
    },
    "hoc_ky": { "ma_hoc_ky": "HK1-2526", "ten_hoc_ky": "HK I - 2025-2026" },
    "phieu_dang_ky": {
      "so_phieu": 1,
      "ngay_lap": "2025-08-20",
      "tong_tin_chi": 7
    },
    "hoc_phi": {
      "tong_tien_dang_ky": 209000,      // Tổng tiền trước miễn giảm
      "ti_le_giam": 50,                  // % giảm theo đối tượng (QĐ7)
      "tien_mien_giam": 104500,          // Tiền được miễn giảm
      "tong_tien_phai_dong": 104500,     // Tiền phải đóng sau miễn giảm
      "tong_tien_da_dong": 50000,        // Tổng đã thanh toán
      "so_tien_con_lai": 54500,          // Còn phải đóng
      "trang_thai": "Còn nợ"             // 'Đã đóng đủ' / 'Còn nợ' / 'Quá hạn'
    },
    "han_dong": "2025-10-31",
    "con_so_ngay": 45,                   // Số ngày còn lại đến hạn
    "lich_su_dong": [
      { "so_phieu_thu": 1, "ngay": "2025-09-01", "so_tien": 50000, "hinh_thuc": "Chuyển khoản" }
    ]
  }
}
```

##### 2. API Lập phiếu thu học phí (theo BM6, QĐ6)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy danh sách phiếu thu | GET | `/api/payments` | Filter: học kỳ, ngày, sinh viên |
| Lấy phiếu thu của SV | GET | `/api/payments/student/:sv_id` | Lịch sử thanh toán của SV |
| Lấy chi tiết phiếu thu | GET | `/api/payments/:id` | Thông tin chi tiết phiếu thu |
| Lập phiếu thu | POST | `/api/payments` | Thu tiền, hỗ trợ đóng nhiều lần (QĐ6) |
| Sửa phiếu thu | PUT | `/api/payments/:id` | Cập nhật thông tin (chỉ admin) |
| Hủy phiếu thu | DELETE | `/api/payments/:id` | Soft delete với lý do |

**Request/Response mẫu cho POST /api/payments (theo BM6):**
```javascript
// Request:
{
  "ma_sv": "SV001",
  "ma_hoc_ky": "HK1-2526",
  "so_tien_thu": 54500,
  "hinh_thuc_thu": "Tiền mặt",      // 'Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử'
  "nguoi_thu": "Nguyễn Thị B",
  "ghi_chu": "Đóng đủ học phí",
  "ma_giao_dich": null               // Nếu chuyển khoản thì có mã GD
}

// Response (theo BM6):
{
  "success": true,
  "data": {
    "phieu_thu": {
      "so_phieu_thu": 2,
      "ngay_lap": "2025-09-15T14:30:00",
      "ma_sv": "SV001",
      "ho_ten": "Nguyễn Văn An",
      "so_tien_thu": 54500,
      "hinh_thuc_thu": "Tiền mặt",
      "nguoi_thu": "Nguyễn Thị B",
      "trang_thai": "Thành công"
    },
    "cap_nhat_hoc_phi": {
      "tong_da_dong": 104500,        // Sau khi thu
      "con_lai": 0,                   // Không còn nợ
      "trang_thai_moi": "Đã đóng đủ"
    },
    "message": "Sinh viên đã hoàn thành đóng học phí học kỳ HK I - 2025-2026"
  }
}
```

**Business Logic quan trọng (QĐ6 - Đóng nhiều lần):**
```javascript
// Kiểm tra số tiền thu
const kiemTraSoTienThu = async (ma_sv, ma_hoc_ky, so_tien_thu) => {
  const conLai = await tinhSoTienConLai(ma_sv, ma_hoc_ky);
  
  if (so_tien_thu > conLai) {
    return { 
      valid: true, 
      warning: `Số tiền thu (${so_tien_thu}) > số tiền còn lại (${conLai}). Có thể thu dư.`
    };
  }
  return { valid: true, warning: null };
};

// Kiểm tra đã đóng đủ chưa
const kiemTraDaDongDu = async (so_phieu_dang_ky) => {
  const tongDaThu = await tinhTongDaThu(so_phieu_dang_ky);
  const tongPhaiDong = await layTongPhaiDong(so_phieu_dang_ky);
  return tongDaThu >= tongPhaiDong;
};
```

##### 3. API Báo cáo SV chưa đóng HP (theo BM7)

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Lấy báo cáo | GET | `/api/reports/unpaid-tuition/:semester_id` | Danh sách SV chưa đóng đủ HP |
| Lấy thống kê báo cáo | GET | `/api/reports/unpaid-tuition/:semester_id/stats` | Tổng hợp số liệu |
| Xuất báo cáo Excel | GET | `/api/reports/export/unpaid-tuition/:semester_id/excel` | Download file Excel |
| Xuất báo cáo PDF | GET | `/api/reports/export/unpaid-tuition/:semester_id/pdf` | Download file PDF |

**Request/Response mẫu cho GET /api/reports/unpaid-tuition/:semester_id (theo BM7):**
```javascript
// GET /api/reports/unpaid-tuition/HK1-2526
// Response:
{
  "success": true,
  "data": {
    "tieu_de": "BÁO CÁO SINH VIÊN CHƯA HOÀN THÀNH ĐÓNG HỌC PHÍ",
    "hoc_ky": { "ma_hoc_ky": "HK1-2526", "ten_hoc_ky": "HK I - 2025-2026" },
    "han_dong_hoc_phi": "2025-10-31",
    "ngay_lap_bao_cao": "2025-11-01T09:00:00",
    "danh_sach": [
      {
        "stt": 1,
        "ma_sv": "SV001",
        "ho_ten": "Nguyễn Văn An",
        "nganh": "Kỹ thuật Phần mềm",
        "khoa": "Công nghệ Phần mềm",
        "so_tien_dang_ky": 209000,           // BM7: Số tiền đăng ký
        "so_tien_phai_dong": 104500,         // BM7: Số tiền phải đóng (sau giảm)
        "so_tien_da_dong": 50000,            // Đã đóng
        "so_tien_con_lai": 54500,            // BM7: Số tiền còn lại
        "ti_le_giam": 50,                    // % giảm
        "trang_thai": "Quá hạn",             // 'Còn nợ' / 'Quá hạn'
        "so_ngay_qua_han": 1                 // Số ngày quá hạn
      },
      {
        "stt": 2,
        "ma_sv": "SV003",
        "ho_ten": "Trần Thị Hoa",
        "nganh": "Khoa học Máy tính",
        "khoa": "Khoa học Máy tính",
        "so_tien_dang_ky": 800000,
        "so_tien_phai_dong": 800000,
        "so_tien_da_dong": 0,
        "so_tien_con_lai": 800000,
        "ti_le_giam": 0,
        "trang_thai": "Quá hạn",
        "so_ngay_qua_han": 1
      }
    ],
    "tong_ket": {
      "tong_sinh_vien_chua_dong": 25,
      "tong_tien_con_no": 15000000,
      "sv_qua_han": 10,
      "sv_chua_qua_han": 15
    }
  }
}
```

##### 4. API Thống kê tổng hợp

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Thống kê đăng ký | GET | `/api/reports/registration-stats/:semester_id` | Thống kê số SV đăng ký, tổng TC |
| Thống kê học phí | GET | `/api/reports/tuition-stats/:semester_id` | Thống kê thu chi học phí |
| Dashboard | GET | `/api/statistics/dashboard` | Tổng hợp cho admin dashboard |

##### 5. API Gửi thông báo nhắc HP

| API | Method | Endpoint | Mô tả chi tiết |
|-----|--------|----------|----------------|
| Gửi nhắc nhở | POST | `/api/notifications/remind-tuition` | Gửi thông báo nhắc đóng HP |
| Gửi cảnh báo | POST | `/api/notifications/warn-tuition` | Gửi cảnh báo quá hạn |

#### B. Frontend Tasks:

##### 1. Giao diện Học phí Admin

**Component:** `Tuition.jsx`

**Features:**
- Dropdown chọn học kỳ
- Table danh sách SV với các cột:
  - MSSV, Họ tên, Ngành
  - Tiền đăng ký, Tỷ lệ giảm, Tiền phải đóng, Đã đóng, Còn lại
  - Trạng thái (badge màu)
  - Action: Xem chi tiết, Lập phiếu thu
- Filter: Trạng thái, Ngành, Tìm kiếm
- Summary cards: Tổng SV, Đã đóng đủ, Còn nợ, Quá hạn

##### 2. Form Lập phiếu thu (theo BM6)

**Component:** `PaymentForm.jsx`

**Features:**
- Tìm kiếm sinh viên (autocomplete)
- Hiển thị thông tin: Họ tên, Học kỳ, Tiền còn nợ
- Input số tiền thu (với suggestion = số tiền còn nợ)
- Select hình thức thu: Tiền mặt / Chuyển khoản / Thẻ / Ví điện tử
- Input mã giao dịch (nếu chuyển khoản)
- Input ghi chú
- Preview phiếu thu trước khi xác nhận
- Nút "Lập phiếu thu"

##### 3. Giao diện Báo cáo (theo BM7)

**Component:** `Reports.jsx`

**Features:**
- Dropdown chọn học kỳ
- Bảng báo cáo theo đúng format BM7:
  - STT, MSSV, Họ tên, Ngành
  - Số tiền đăng ký, Số tiền phải đóng, Số tiền còn lại
- Summary: Tổng SV, Tổng tiền còn nợ
- Nút xuất Excel, xuất PDF
- Nút "Gửi thông báo nhắc" cho tất cả SV trong danh sách

##### 4. Giao diện Xem học phí (Sinh viên)

**Component:** `MyTuition.jsx`

**Features:**
- Card tổng quan: Học kỳ hiện tại, Tiền phải đóng, Đã đóng, Còn lại
- Progress bar hiển thị % đã đóng
- Thông tin đối tượng ưu tiên và tỷ lệ giảm
- Chi tiết từng môn đăng ký: Môn, Số TC, Đơn giá, Thành tiền
- Hạn đóng HP (highlight nếu sắp đến hạn)
- Lịch sử thanh toán

**UI mockup:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  HỌC PHÍ - Học kỳ I (2025-2026)                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  TỔNG QUAN HỌC PHÍ                                                  ││
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━││
│  │                                                                      ││
│  │  Tiền đăng ký:       209,000 đ                                       ││
│  │  Giảm 50% (Con TB):  -104,500 đ   ← [Đối tượng: Con thương binh]    ││
│  │  ────────────────────────────────                                    ││
│  │  Phải đóng:          104,500 đ                                       ││
│  │                                                                      ││
│  │  ████████████████░░░░░░░░░░░░░░░░░  48% (50,000 / 104,500 đ)        ││
│  │                                                                      ││
│  │  Đã đóng:             50,000 đ                                       ││
│  │  CÒN LẠI:             54,500 đ                                       ││
│  │                                                                      ││
│  │  ⚠️ Hạn đóng: 31/10/2025 (còn 45 ngày)                              ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─ CHI TIẾT MÔN HỌC ─────────────────────────────────────────────────┐│
│  │ Môn học              │ Loại │ Số TC │ Đơn giá  │ Thành tiền        ││
│  │──────────────────────┼──────┼───────┼──────────┼───────────────────││
│  │ Trí tuệ nhân tạo     │ Mới  │   3   │  27,000  │      81,000       ││
│  │ CTDL&GT              │ Lại  │   4   │  32,000  │     128,000       ││
│  │──────────────────────┼──────┼───────┼──────────┼───────────────────││
│  │                      │      │   7   │          │     209,000       ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─ LỊCH SỬ THANH TOÁN ───────────────────────────────────────────────┐│
│  │ #   │ Ngày       │ Số tiền   │ Hình thức      │ Trạng thái        ││
│  │─────┼────────────┼───────────┼────────────────┼───────────────────││
│  │ 1   │ 01/09/2025 │   50,000  │ Chuyển khoản   │ ✓ Thành công      ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### ✅ Acceptance Criteria:

1. **API Học phí (QĐ7):**
   - [ ] Tính đúng tiền miễn giảm theo đối tượng ưu tiên
   - [ ] Công thức: Tiền phải đóng = Tiền đăng ký - Tiền miễn giảm
   - [ ] API trả về số tiền còn lại chính xác

2. **API Phiếu thu (BM6, QĐ6):**
   - [ ] Lập phiếu thu với đầy đủ thông tin theo BM6
   - [ ] Hỗ trợ đóng nhiều lần cho 1 phiếu đăng ký (QĐ6)
   - [ ] Cập nhật trạng thái khi đóng đủ
   - [ ] Kiểm tra số tiền thu hợp lệ

3. **API Báo cáo (BM7):**
   - [ ] Báo cáo theo đúng format BM7: MSSV, Tiền đăng ký, Tiền phải đóng, Tiền còn lại
   - [ ] Filter theo học kỳ
   - [ ] Xuất Excel/PDF hoạt động đúng

4. **Frontend:**
   - [ ] Giao diện học phí hiển thị rõ ràng: đăng ký, giảm, phải đóng, đã đóng, còn lại
   - [ ] Form lập phiếu thu dễ sử dụng
   - [ ] Báo cáo SV chưa đóng HP theo BM7
   - [ ] Sinh viên xem được học phí và lịch sử thanh toán

---

## 📊 TỔNG HỢP FILES

| Thành viên | Files Backend | Files Frontend | Files Tạo Mới |
|------------|---------------|----------------|---------------|
| **TV1** | 7 | 9 | 8 |
| **TV2** | 11 | 11 | 10 |
| **TV3** | 11 | 13 | 10 |
| **TV4** | 16 | 21 | 15 |

---

## 📁 CẤU TRÚC THƯ MỤC SAU KHI HOÀN THÀNH

```
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── init.sql (cập nhật trigger)
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── studentController.js ✏️
│   │   │   ├── courseController.js ✏️
│   │   │   ├── classController.js ✏️
│   │   │   ├── semesterController.js ✏️
│   │   │   ├── registrationController.js ✏️
│   │   │   ├── tuitionController.js ✏️
│   │   │   ├── paymentController.js ✏️
│   │   │   ├── notificationController.js ✏️
│   │   │   ├── locationController.js 🆕
│   │   │   ├── priorityObjectController.js 🆕
│   │   │   ├── curriculumController.js 🆕
│   │   │   ├── departmentController.js 🆕
│   │   │   ├── prerequisiteController.js 🆕
│   │   │   ├── openClassController.js 🆕
│   │   │   ├── priceController.js 🆕
│   │   │   ├── academicYearController.js 🆕
│   │   │   ├── reportController.js 🆕
│   │   │   ├── statisticsController.js 🆕
│   │   │   ├── exportController.js 🆕
│   │   │   └── roleController.js ✏️
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── studentRoutes.js ✏️
│   │   │   ├── courseRoutes.js ✏️
│   │   │   ├── classRoutes.js ✏️
│   │   │   ├── semesterRoutes.js ✏️
│   │   │   ├── registrationRoutes.js ✏️
│   │   │   ├── tuitionRoutes.js ✏️
│   │   │   ├── paymentRoutes.js ✏️
│   │   │   ├── notificationRoutes.js ✏️
│   │   │   ├── locationRoutes.js 🆕
│   │   │   ├── priorityObjectRoutes.js 🆕
│   │   │   ├── curriculumRoutes.js 🆕
│   │   │   ├── departmentRoutes.js 🆕
│   │   │   ├── prerequisiteRoutes.js 🆕
│   │   │   ├── openClassRoutes.js 🆕
│   │   │   ├── priceRoutes.js 🆕
│   │   │   ├── academicYearRoutes.js 🆕
│   │   │   ├── reportRoutes.js 🆕
│   │   │   ├── statisticsRoutes.js 🆕
│   │   │   ├── exportRoutes.js 🆕
│   │   │   └── roleRoutes.js ✏️
│   │   └── index.js ✏️
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Students.jsx ✏️
│   │   │   ├── Courses.jsx ✏️
│   │   │   ├── Classes.jsx ✏️
│   │   │   ├── Semesters.jsx ✏️
│   │   │   ├── Registrations.jsx ✏️
│   │   │   ├── CourseRegistration.jsx ✏️
│   │   │   ├── Tuition.jsx ✏️
│   │   │   ├── Payments.jsx ✏️
│   │   │   ├── Reports.jsx ✏️
│   │   │   ├── MyTuition.jsx ✏️
│   │   │   ├── MyPayments.jsx ✏️
│   │   │   ├── admin/
│   │   │   │   ├── LocationManagement.jsx 🆕
│   │   │   │   ├── PriorityObjects.jsx 🆕
│   │   │   │   ├── Curriculum.jsx 🆕
│   │   │   │   ├── Departments.jsx 🆕
│   │   │   │   ├── OpenClasses.jsx 🆕
│   │   │   │   ├── UnitPrices.jsx 🆕
│   │   │   │   └── Statistics.jsx 🆕
│   │   │   └── student/
│   │   ├── services/
│   │   │   ├── locationService.js 🆕
│   │   │   ├── priorityObjectService.js 🆕
│   │   │   ├── curriculumService.js 🆕
│   │   │   ├── departmentService.js 🆕
│   │   │   ├── openClassService.js 🆕
│   │   │   ├── priceService.js 🆕
│   │   │   ├── reportService.js 🆕
│   │   │   ├── statisticsService.js 🆕
│   │   │   └── exportService.js 🆕
│   │   └── App.jsx ✏️
```

**Chú thích:**
- 🆕 File tạo mới
- ✏️ File cần chỉnh sửa

---

## ⏰ TIMELINE CÔNG VIỆC

| Tuần | Công việc | Thành viên |
|------|-----------|------------|
| **Tuần 1** | Phân tích yêu cầu, thiết kế API | Tất cả |
| **Tuần 2** | Backend: Tạo controllers và routes | TV1, TV2 |
| **Tuần 3** | Backend: Hoàn thiện API | TV3, TV4 |
| **Tuần 4** | Frontend: Tạo giao diện admin | TV1, TV2 |
| **Tuần 5** | Frontend: Hoàn thiện giao diện | TV3, TV4 |
| **Tuần 6** | Test và tích hợp | Tất cả |
| **Tuần 7** | Review và hoàn thiện | Tất cả |

---

## 📌 QUY TẮC LÀM VIỆC

1. **Git Branch**: Mỗi thành viên tạo branch riêng: `feature/tv1-student`, `feature/tv2-course`...
2. **Code Review**: Merge vào `develop` phải có review từ 1 thành viên khác
3. **Commit Message**: Tuân theo format: `[TV1] feat: Thêm API đối tượng ưu tiên`
4. **API Documentation**: Cập nhật README hoặc Swagger khi thêm API mới
5. **Testing**: Viết test cho các API quan trọng
