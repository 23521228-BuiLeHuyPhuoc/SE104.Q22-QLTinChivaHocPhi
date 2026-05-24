# Hệ thống Quản lý Tín chỉ và Học phí

## Các bước triển khai chi tiết

### 1. Mở Visual Studio Code

<img width="444" height="814" alt="Mở Visual Studio Code" src="https://github.com/user-attachments/assets/02545952-c547-4fb5-a1a2-5d584d16d32c" />

---

### 2. Mở thư mục mới

<img width="962" height="603" alt="Mở thư mục mới" src="https://github.com/user-attachments/assets/4f81fa98-65d0-491c-abb7-ea41a5bc601c" />

---

### 3. Mở Terminal

<img width="807" height="512" alt="image" src="https://github.com/user-attachments/assets/9a335aac-6564-4abb-b917-5a4270b69651" />

---

### 4. Clone source code từ GitHub

Chạy lệnh sau trong Terminal:

```bash
git clone https://github.com/23521228-BuiLeHuyPhuoc/SE104.Q22-QLTinChivaHocPhi.git
```

<img width="1356" height="1001" alt="Clone source code từ GitHub" src="https://github.com/user-attachments/assets/63f0fcfc-395c-4631-bc9f-f362898267b0" />

---

### 5. Copy file `init.sql`

<img width="1341" height="1001" alt="Copy file init.sql" src="https://github.com/user-attachments/assets/dd63b023-37dc-4d3d-a6db-7a3fc46a1f6f" />

---

### 6. Cài đặt và chạy pgAdmin 4 / PostgreSQL

Xem hướng dẫn chạy pgAdmin 4 tại đây:

[Hướng dẫn chạy pgAdmin 4 / PostgreSQL](https://docs.google.com/document/d/1RLNevMQh6RfSKUcBv-jGTPgr_KV-jmhjgybFUHP6EQg/edit?tab=t.h47f3rcg9etq)

---

### 7. Cài đặt thư viện bằng `yarn install`

Nhấn vào Terminal như hình dưới:

<img width="641" height="747" alt="Mở Terminal để chạy yarn install" src="https://github.com/user-attachments/assets/31b3156e-fe2a-43b0-a2c6-92ecc3b00e82" />

Sau đó gõ lệnh:

```bash
yarn install
```

<img width="1065" height="325" alt="Chạy yarn install" src="https://github.com/user-attachments/assets/9b74118d-9e4a-4343-bcc2-baafd21137ec" />

---

### 8. Tạo file `.env`

Tạo file mới tên là `.env`.

> Lưu ý: file `.env` cần nằm cùng cấp với thư mục `/project`.

<img width="597" height="828" alt="Tạo file .env" src="https://github.com/user-attachments/assets/0ae40948-947e-472f-8c13-558e1884ce81" />

---

### 9. Copy nội dung từ `.env.example` sang `.env`

Mở file `.env.example`, copy toàn bộ nội dung và dán sang file `.env`.

<img width="1317" height="973" alt="Copy file .env.example sang .env" src="https://github.com/user-attachments/assets/907597c9-17be-403f-9816-f597bf125248" />

---

### 10. Cấu hình tài khoản PostgreSQL trong file `.env`

Một số thông tin trong file `.env` cần được chỉnh lại cho đúng với máy của bạn.

Đây phải là **tài khoản** và **mật khẩu PostgreSQL** mà bạn đã đặt khi cài PostgreSQL / pgAdmin 4.

<img width="1072" height="602" alt="Cấu hình tài khoản PostgreSQL trong file .env" src="https://github.com/user-attachments/assets/546369c9-9f40-417f-9310-a35bb1d73d87" />

---

### 11. Chạy project

Sau khi cài đặt xong, chạy lệnh:

```bash
yarn start
```

<img width="1036" height="352" alt="Chạy yarn start" src="https://github.com/user-attachments/assets/4122825b-196e-48d2-8bc7-9f9cbc3a9c9a" />

Nếu chạy thành công, website sẽ hoạt động tại:

```text
http://localhost:5000
```

---

### 12. Đăng nhập để xem giao diện

<img width="1918" height="1078" alt="Giao diện đăng nhập hệ thống" src="https://github.com/user-attachments/assets/12b48ea1-85ec-4944-8dfb-d4190336e878" />

---

## Bản quyền & Đóng góp

- Đồ án phát triển Hệ thống Môn học `SE104.Q22`.
- Người đóng góp chính: **Bui Le Huy Phuoc** và các thành viên nhóm.
