--FILE TỔNG HỢP TRIGGER
--RBTV1:
CREATE OR REPLACE FUNCTION trg_func_sinhvien_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM "PHUONGXA" px
        JOIN "DANTOC" dt ON dt."MaDanToc" = NEW."MaDanToc"
        WHERE px."MaPhuongXa" = NEW."MaPhuongXa" 
          AND px."KhuVuc" = 'KV3' 
          AND dt."LaDanTocThieuSo" = TRUE
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM "DOITUONGSINHVIEN" 
            WHERE "MaSv" = NEW."MaSv" AND "MaDoiTuong" = 'DT06'
        ) THEN
            RAISE EXCEPTION 'Lỗi RBTV01: Sinh viên % thuộc vùng sâu vùng xa nhưng chưa được gán đối tượng DT06.', NEW."MaSv";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sinhvien_rbtv01 ON "SINHVIEN";
CREATE CONSTRAINT TRIGGER trg_sinhvien_rbtv01
AFTER INSERT OR UPDATE OF "MaPhuongXa", "MaDanToc" ON "SINHVIEN"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW 
EXECUTE FUNCTION trg_func_sinhvien_rbtv01();

CREATE OR REPLACE FUNCTION trg_func_phuongxa_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."KhuVuc" = 'KV3' AND OLD."KhuVuc" IS DISTINCT FROM NEW."KhuVuc" THEN
        IF EXISTS (
            SELECT 1 
            FROM "SINHVIEN" sv
            JOIN "DANTOC" dt ON sv."MaDanToc" = dt."MaDanToc"
            WHERE sv."MaPhuongXa" = NEW."MaPhuongXa"
              AND dt."LaDanTocThieuSo" = TRUE
              AND NOT EXISTS (
                  SELECT 1 FROM "DOITUONGSINHVIEN" dtsv 
                  WHERE dtsv."MaSv" = sv."MaSv" AND dtsv."MaDoiTuong" = 'DT06'
              )
        ) THEN
            RAISE EXCEPTION 'Lỗi RBTV01: Không thể cập nhật KhuVuc thành KV3 vì có sinh viên dân tộc thiểu số tại đây chưa có mã DT06.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_phuongxa_rbtv01 ON "PHUONGXA";
CREATE CONSTRAINT TRIGGER trg_phuongxa_rbtv01
AFTER UPDATE OF "KhuVuc" ON "PHUONGXA"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW 
EXECUTE FUNCTION trg_func_phuongxa_rbtv01();

CREATE OR REPLACE FUNCTION trg_func_dantoc_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."LaDanTocThieuSo" = TRUE AND OLD."LaDanTocThieuSo" IS DISTINCT FROM NEW."LaDanTocThieuSo" THEN
        IF EXISTS (
            SELECT 1 
            FROM "SINHVIEN" sv
            JOIN "PHUONGXA" px ON sv."MaPhuongXa" = px."MaPhuongXa"
            WHERE sv."MaDanToc" = NEW."MaDanToc"
              AND px."KhuVuc" = 'KV3'
              AND NOT EXISTS (
                  SELECT 1 FROM "DOITUONGSINHVIEN" dtsv 
                  WHERE dtsv."MaSv" = sv."MaSv" AND dtsv."MaDoiTuong" = 'DT06'
              )
        ) THEN
            RAISE EXCEPTION 'Lỗi RBTV01: Không thể cập nhật LaDanTocThieuSo thành TRUE vì có sinh viên ở KV3 thuộc dân tộc này chưa có mã DT06.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dantoc_rbtv01 ON "DANTOC";
CREATE CONSTRAINT TRIGGER trg_dantoc_rbtv01
AFTER UPDATE OF "LaDanTocThieuSo" ON "DANTOC"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW 
EXECUTE FUNCTION trg_func_dantoc_rbtv01();

CREATE OR REPLACE FUNCTION trg_func_doituongsinhvien_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD."MaDoiTuong" = 'DT06' AND NEW."MaDoiTuong" <> 'DT06') THEN
        IF OLD."MaDoiTuong" = 'DT06' THEN
            IF EXISTS (
                SELECT 1 
                FROM "SINHVIEN" sv
                JOIN "PHUONGXA" px ON sv."MaPhuongXa" = px."MaPhuongXa"
                JOIN "DANTOC" dt ON sv."MaDanToc" = dt."MaDanToc"
                WHERE sv."MaSv" = OLD."MaSv"
                  AND px."KhuVuc" = 'KV3'
                  AND dt."LaDanTocThieuSo" = TRUE
            ) THEN
                RAISE EXCEPTION 'Lỗi RBTV01: Không thể xóa/sửa đối tượng DT06 của sinh viên % vì sinh viên này thuộc vùng sâu vùng xa.', OLD."MaSv";
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_doituongsinhvien_rbtv01 ON "DOITUONGSINHVIEN";
CREATE CONSTRAINT TRIGGER trg_doituongsinhvien_rbtv01
AFTER INSERT OR UPDATE OR DELETE ON "DOITUONGSINHVIEN"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW 
EXECUTE FUNCTION trg_func_doituongsinhvien_rbtv01();

CREATE OR REPLACE FUNCTION trg_func_doituong_rbtv01()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD."MaDoiTuong" = 'DT06' THEN
            RAISE EXCEPTION 'Lỗi RBTV01: Không được phép xóa hoặc sửa mã đối tượng hệ thống DT06.';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD."MaDoiTuong" = 'DT06'
           AND NEW."MaDoiTuong" IS DISTINCT FROM OLD."MaDoiTuong" THEN
            RAISE EXCEPTION 'Lỗi RBTV01: Không được phép xóa hoặc sửa mã đối tượng hệ thống DT06.';
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_doituong_rbtv01 ON "DOITUONG";
CREATE TRIGGER trg_doituong_rbtv01
BEFORE UPDATE OR DELETE ON "DOITUONG"
FOR EACH ROW 
EXECUTE FUNCTION trg_func_doituong_rbtv01();
--RBTV2:
CREATE OR REPLACE FUNCTION function_calculate_max_discount(p_ma_sv VARCHAR)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_ti_le_giam DECIMAL(5,2);
BEGIN
    WITH student_objects AS (
        -- 1. Các đối tượng được gán trực tiếp (phải đang kích hoạt và chưa bị xóa)
        SELECT dt."TiLeGiamHocPhi", dt."DoUuTien"
        FROM "DOITUONGSINHVIEN" dtsv
        JOIN "DOITUONG" dt ON dtsv."MaDoiTuong" = dt."MaDoiTuong"
        WHERE dtsv."MaSv" = p_ma_sv
          AND dt."TrangThai" = TRUE 
          AND dt."DaXoa" = FALSE
        
        UNION ALL
        
        -- 2. Đối tượng DT06 tự động (nếu sinh viên ở Khu vực 3 và là Dân tộc thiểu số)
        SELECT dt."TiLeGiamHocPhi", dt."DoUuTien"
        FROM "SINHVIEN" sv
        JOIN "PHUONGXA" px ON sv."MaPhuongXa" = px."MaPhuongXa"
        JOIN "DANTOC" dc ON sv."MaDanToc" = dc."MaDanToc"
        JOIN "DOITUONG" dt ON dt."MaDoiTuong" = 'DT06'
        WHERE sv."MaSv" = p_ma_sv
          AND px."KhuVuc" = 'KV3'
          AND dc."LaDanTocThieuSo" = TRUE
          AND dt."TrangThai" = TRUE 
          AND dt."DaXoa" = FALSE
    )
    SELECT "TiLeGiamHocPhi"
    INTO v_ti_le_giam
    FROM student_objects
    ORDER BY "DoUuTien" ASC, "TiLeGiamHocPhi" DESC -- Ưu tiên DoUuTien nhỏ nhất, nếu bằng nhau lấy phần trăm cao nhất
    LIMIT 1;
    
    -- Nếu không thuộc đối tượng nào, tỷ lệ giảm mặc định là 0
    RETURN COALESCE(v_ti_le_giam, 0.00);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_fn_phieudangky_tilegiam()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        NEW."TiLeGiam" := function_calculate_max_discount(NEW."MaSv");
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_phieudangky_tilegiam ON "PHIEUDANGKY";
CREATE TRIGGER trg_phieudangky_tilegiam
BEFORE INSERT OR UPDATE OF "MaSv", "TrangThai", "TiLeGiam"
ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_phieudangky_tilegiam();

CREATE OR REPLACE FUNCTION trg_fn_doituongsinhvien_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE "PHIEUDANGKY"
        SET "TiLeGiam" = function_calculate_max_discount(NEW."MaSv")
        WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = 'Đã đăng ký';
    END IF;
    
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        UPDATE "PHIEUDANGKY"
        SET "TiLeGiam" = function_calculate_max_discount(OLD."MaSv")
        WHERE "MaSv" = OLD."MaSv" AND "TrangThai" = 'Đã đăng ký';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_doituongsinhvien_sync ON "DOITUONGSINHVIEN";
CREATE TRIGGER trg_doituongsinhvien_sync
AFTER INSERT OR UPDATE OR DELETE
ON "DOITUONGSINHVIEN"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_doituongsinhvien_sync();

CREATE OR REPLACE FUNCTION trg_fn_doituong_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD."TiLeGiamHocPhi" IS DISTINCT FROM NEW."TiLeGiamHocPhi") OR
       (OLD."DoUuTien" IS DISTINCT FROM NEW."DoUuTien") OR
       (OLD."TrangThai" IS DISTINCT FROM NEW."TrangThai") OR
       (OLD."DaXoa" IS DISTINCT FROM NEW."DaXoa") THEN
       
        -- Nếu chỉnh sửa cấu hình của DT06, quét toàn bộ sinh viên diện vùng sâu vùng xa
        IF NEW."MaDoiTuong" = 'DT06' THEN
            UPDATE "PHIEUDANGKY" p
            SET "TiLeGiam" = function_calculate_max_discount(p."MaSv")
            FROM "SINHVIEN" sv
            JOIN "PHUONGXA" px ON sv."MaPhuongXa" = px."MaPhuongXa"
            JOIN "DANTOC" dc ON sv."MaDanToc" = dc."MaDanToc"
            WHERE p."MaSv" = sv."MaSv"
              AND p."TrangThai" = 'Đã đăng ký'
              AND px."KhuVuc" = 'KV3'
              AND dc."LaDanTocThieuSo" = TRUE;
        END IF;

        -- Cập nhật cho những sinh viên được gán trực tiếp mã đối tượng này
        UPDATE "PHIEUDANGKY" p
        SET "TiLeGiam" = function_calculate_max_discount(p."MaSv")
        FROM "DOITUONGSINHVIEN" dtsv
        WHERE p."MaSv" = dtsv."MaSv"
          AND p."TrangThai" = 'Đã đăng ký'
          AND dtsv."MaDoiTuong" = NEW."MaDoiTuong";
          
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_doituong_sync ON "DOITUONG";
CREATE TRIGGER trg_doituong_sync
AFTER UPDATE ON "DOITUONG"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_doituong_sync();

CREATE OR REPLACE FUNCTION trg_fn_sinhvien_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD."MaPhuongXa" IS DISTINCT FROM NEW."MaPhuongXa") OR 
       (OLD."MaDanToc" IS DISTINCT FROM NEW."MaDanToc") THEN
        UPDATE "PHIEUDANGKY"
        SET "TiLeGiam" = function_calculate_max_discount(NEW."MaSv")
        WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = 'Đã đăng ký';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sinhvien_sync ON "SINHVIEN";
CREATE TRIGGER trg_sinhvien_sync
AFTER UPDATE OF "MaPhuongXa", "MaDanToc" ON "SINHVIEN"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sinhvien_sync();

-- Trigger cho bảng PHUONGXA
CREATE OR REPLACE FUNCTION trg_fn_phuongxa_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."KhuVuc" IS DISTINCT FROM NEW."KhuVuc" THEN
        UPDATE "PHIEUDANGKY" p
        SET "TiLeGiam" = function_calculate_max_discount(p."MaSv")
        FROM "SINHVIEN" sv
        WHERE p."MaSv" = sv."MaSv"
          AND p."TrangThai" = 'Đã đăng ký'
          AND sv."MaPhuongXa" = NEW."MaPhuongXa";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_phuongxa_sync ON "PHUONGXA";
CREATE TRIGGER trg_phuongxa_sync
AFTER UPDATE OF "KhuVuc" ON "PHUONGXA"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_phuongxa_sync();

-- Trigger cho bảng DANTOC
CREATE OR REPLACE FUNCTION trg_fn_dantoc_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."LaDanTocThieuSo" IS DISTINCT FROM NEW."LaDanTocThieuSo" THEN
        UPDATE "PHIEUDANGKY" p
        SET "TiLeGiam" = function_calculate_max_discount(p."MaSv")
        FROM "SINHVIEN" sv
        WHERE p."MaSv" = sv."MaSv"
          AND p."TrangThai" = 'Đã đăng ký'
          AND sv."MaDanToc" = NEW."MaDanToc";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dantoc_sync ON "DANTOC";
CREATE TRIGGER trg_dantoc_sync
AFTER UPDATE OF "LaDanTocThieuSo" ON "DANTOC"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dantoc_sync();
--RBTV3:
CREATE OR REPLACE FUNCTION trg_fn_phieudangky_tinhtien()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Đảm bảo dữ liệu số không bị NULL để tránh lỗi tính toán
    NEW."TongTienDangKy" := COALESCE(NEW."TongTienDangKy", 0);
    NEW."TiLeGiam"       := COALESCE(NEW."TiLeGiam", 0.00);

    -- 2. Công thức 1: TienMienGiam = ROUND(TongTienDangKy * TiLeGiam / 100)
    NEW."TienMienGiam"   := ROUND(NEW."TongTienDangKy" * NEW."TiLeGiam" / 100);

    -- 3. Công thức 2: TongTienPhaiDong = GREATEST(TongTienDangKy - TienMienGiam, 0)
    NEW."TongTienPhaiDong" := GREATEST(NEW."TongTienDangKy" - NEW."TienMienGiam", 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger áp dụng cho cả hành động INSERT và UPDATE trên bảng PHIEUDANGKY
DROP TRIGGER IF EXISTS trg_phieudangky_tinhtien ON "PHIEUDANGKY";
CREATE TRIGGER trg_phieudangky_tinhtien
BEFORE INSERT OR UPDATE OF "TongTienDangKy", "TiLeGiam", "TienMienGiam", "TongTienPhaiDong"
ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_phieudangky_tinhtien();

--RBTV16:
CREATE OR REPLACE FUNCTION trg_fn_phieudangky_rbtv16()
RETURNS TRIGGER AS $$
DECLARE
    v_sv_trang_thai VARCHAR;
    v_nd_trang_thai BOOLEAN;
    v_ma_tk INTEGER;
BEGIN
    -- Lấy thông tin sinh viên
    SELECT "TrangThai", "MaTaiKhoan" INTO v_sv_trang_thai, v_ma_tk
    FROM "SINHVIEN" 
    WHERE "MaSv" = NEW."MaSv";

    -- Kiểm tra 1: Sinh viên phải ở trạng thái 'Đang học'
    IF v_sv_trang_thai IS DISTINCT FROM 'Đang học' THEN
        RAISE EXCEPTION 'Lỗi RBTV16: Sinh viên % đang ở trạng thái "%", không được phép lập phiếu đăng ký.', NEW."MaSv", v_sv_trang_thai;
    END IF;

    -- Kiểm tra 2: Nếu sinh viên có tài khoản, tài khoản đó phải đang Active (TRUE)
    IF v_ma_tk IS NOT NULL THEN
        SELECT "TrangThai" INTO v_nd_trang_thai
        FROM "NGUOIDUNG" 
        WHERE "MaTaiKhoan" = v_ma_tk;

        IF v_nd_trang_thai = FALSE THEN
            RAISE EXCEPTION 'Lỗi RBTV16: Tài khoản hệ thống của sinh viên % đã bị khóa, không thể lập phiếu đăng ký.', NEW."MaSv";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_phieudangky_rbtv16 ON "PHIEUDANGKY";
CREATE TRIGGER trg_phieudangky_rbtv16
BEFORE INSERT OR UPDATE OF "MaSv" ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_phieudangky_rbtv16();

CREATE OR REPLACE FUNCTION trg_fn_sinhvien_rbtv16()
RETURNS TRIGGER AS $$
DECLARE
    v_nd_trang_thai BOOLEAN;
BEGIN
    -- Chỉ kiểm tra nếu sinh viên này đã từng lập Phiếu đăng ký
    IF EXISTS (SELECT 1 FROM "PHIEUDANGKY" WHERE "MaSv" = NEW."MaSv") THEN
        
        -- Nếu định đổi trạng thái khác 'Đang học'
        IF NEW."TrangThai" IS DISTINCT FROM 'Đang học' THEN
            RAISE EXCEPTION 'Lỗi RBTV16: Sinh viên % đã có phiếu đăng ký, không thể chuyển trạng thái thành "%".', NEW."MaSv", NEW."TrangThai";
        END IF;

        -- Nếu cập nhật lại Mã tài khoản
        IF NEW."MaTaiKhoan" IS NOT NULL THEN
            SELECT "TrangThai" INTO v_nd_trang_thai
            FROM "NGUOIDUNG" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan";

            IF v_nd_trang_thai = FALSE THEN
                RAISE EXCEPTION 'Lỗi RBTV16: Sinh viên % đã có phiếu đăng ký, không thể gán một tài khoản đang bị khóa.', NEW."MaSv";
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sinhvien_rbtv16 ON "SINHVIEN";
CREATE TRIGGER trg_sinhvien_rbtv16
AFTER UPDATE OF "TrangThai", "MaTaiKhoan" ON "SINHVIEN"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sinhvien_rbtv16();

CREATE OR REPLACE FUNCTION trg_fn_nguoidung_rbtv16()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu thao tác là khóa tài khoản (TRUE -> FALSE)
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (
            SELECT 1 FROM "SINHVIEN" sv
            JOIN "PHIEUDANGKY" pdk ON sv."MaSv" = pdk."MaSv"
            WHERE sv."MaTaiKhoan" = NEW."MaTaiKhoan"
        ) THEN
            RAISE EXCEPTION 'Lỗi RBTV16: Không thể khóa tài khoản % vì sinh viên sở hữu đang có phiếu đăng ký.', NEW."TenDangNhap";
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nguoidung_rbtv16 ON "NGUOIDUNG";
CREATE TRIGGER trg_nguoidung_rbtv16
AFTER UPDATE OF "TrangThai" ON "NGUOIDUNG"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_nguoidung_rbtv16();

--Tạo Trigger RBTV04
-- 1. Tạo hàm thực hiện kiểm tra ràng buộc
CREATE OR REPLACE FUNCTION func_check_rbtv04_SoTiet()
RETURNS TRIGGER AS $$
BEGIN
    -- Kiểm tra điều kiện:
    -- (LoaiMon = 'LT' AND SoTiet chia hết cho 15) 
    -- OR (LoaiMon = 'TH' AND SoTiet chia hết cho 30)
    IF NOT (
        (NEW."LoaiMon" = 'LT' AND NEW."SoTiet" % 15 = 0) OR 
        (NEW."LoaiMon" = 'TH' AND NEW."SoTiet" % 30 = 0)
    ) THEN
        RAISE EXCEPTION 'Vi phạm RBTV04: Số tiết không hợp lệ. Mon Ly thuyet phai chia het cho 15, mon Thuc hanh phai chia het cho 30.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tạo trigger gắn hàm trên vào bảng MONHOC
DROP TRIGGER IF EXISTS trigger_rbtv04 ON "MONHOC"; 

CREATE TRIGGER trigger_rbtv04
BEFORE INSERT OR UPDATE OF "LoaiMon", "SoTiet" ON "MONHOC"
FOR EACH ROW
EXECUTE FUNCTION func_check_rbtv04_SoTiet();


--Tạo Trigger RBTV05
-- 1. Tạo hàm thực hiện kiểm tra ràng buộc
CREATE OR REPLACE FUNCTION func_check_rbtv05_DieuKienMonHoc()
RETURNS TRIGGER AS $$
BEGIN
    -- Kiểm tra điều kiện:
    -- Mã môn học phải khác Mã môn điều kiện
    IF NOT (
        NEW."MaMonHoc" <> NEW."MaMonDieuKien"
    ) THEN
        RAISE EXCEPTION 'Vi phạm RBTV05: Một môn học không được là điều kiện của chính nó.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tạo trigger gắn hàm trên vào bảng DIEUKIENMONHOC
DROP TRIGGER IF EXISTS trigger_rbtv05 ON "DIEUKIENMONHOC"; 

CREATE TRIGGER trigger_rbtv05
BEFORE INSERT OR UPDATE OF "MaMonHoc", "MaMonDieuKien" ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION func_check_rbtv05_DieuKienMonHoc();


--Tạo Trigger RBTV06
ALTER TABLE "DIEUKIENMONHOC" 
ADD COLUMN IF NOT EXISTS "TrangThai" BOOLEAN DEFAULT TRUE;

-- 1. Hàm kiểm tra đệ quy phát hiện chu trình đồ thị môn học
CREATE OR REPLACE FUNCTION func_check_rbtv06_DieuKienMonHoc()
RETURNS TRIGGER AS $$
DECLARE
    v_has_cycle BOOLEAN := FALSE;
    v_error_path TEXT;
BEGIN
    -- Nếu bản ghi bị tắt kích hoạt (TrangThai = FALSE) thì bỏ qua không xét
    IF NEW."TrangThai" = FALSE THEN
        RETURN NULL;
    END IF;

    -- Sử dụng Đệ quy kiểm tra bắt đầu từ môn học vừa được tác động
    WITH RECURSIVE CycleCheck AS (
        -- KHỞI TẠO: Lấy các môn điều kiện trực tiếp của MaMonHoc vừa thêm/sửa
        SELECT 
            "MaMonDieuKien", 
            ARRAY[NEW."MaMonHoc"::TEXT, "MaMonDieuKien"::TEXT] AS path,
            FALSE AS is_cycle
        FROM "DIEUKIENMONHOC"
        WHERE "MaMonHoc" = NEW."MaMonHoc" AND "TrangThai" = TRUE
        
        UNION ALL
        
        -- ĐỆ QUY: Đi tiếp sang các môn điều kiện tầng tiếp theo
        SELECT 
            d."MaMonDieuKien",
            c.path || d."MaMonDieuKien"::TEXT,
            (d."MaMonDieuKien"::TEXT = ANY(c.path)) AS is_cycle
        FROM "DIEUKIENMONHOC" d
        INNER JOIN CycleCheck c ON d."MaMonHoc" = c."MaMonDieuKien"
        WHERE d."TrangThai" = TRUE 
          AND NOT c.is_cycle -- Ngắt nhánh ngay lập tức nếu bước trước đã phát hiện vòng lặp
    )
    -- Lọc ra dòng đầu tiên tìm thấy chu trình
    SELECT TRUE, array_to_string(path, ' -> ')
    INTO v_has_cycle, v_error_path
    FROM CycleCheck
    WHERE is_cycle = TRUE OR "MaMonDieuKien" = NEW."MaMonHoc"
    LIMIT 1;

    -- Nếu tồn tại vòng lặp chu trình -> Tiến hành chặn và trả về thông tin sơ đồ lỗi
    IF v_has_cycle THEN
        RAISE EXCEPTION 'Vi phạm RBTV06: Không được tạo vòng lặp điều kiện môn học! Sơ đồ lỗi chu trình: %', v_error_path;
    END IF;

    RETURN NULL; -- AFTER trigger luôn trả về NULL
END;
$$ LANGUAGE plpgsql;

-- 2. Thiết lập AFTER trigger để bắt chính xác trạng thái thực tế sau thay đổi
DROP TRIGGER IF EXISTS trigger_rbtv06 ON "DIEUKIENMONHOC";

CREATE TRIGGER trigger_rbtv06
AFTER INSERT OR UPDATE OF "MaMonHoc", "MaMonDieuKien", "TrangThai" ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION func_check_rbtv06_DieuKienMonHoc();


--Tạo Trigger RBTV07
CREATE OR REPLACE FUNCTION func_check_rbtv07_ChuongTrinhHoc()
RETURNS TRIGGER AS $$
BEGIN
    -- THAO TÁC: INSERT hoặc UPDATE thông tin của chính môn học hiện tại (M)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD."MaNganh" <> NEW."MaNganh" OR OLD."MaMonHoc" <> NEW."MaMonHoc" OR OLD."HocKy" <> NEW."HocKy")) THEN
        -- Kiểm tra xem môn M vừa tác động có thỏa mãn toàn bộ môn điều kiện D đang hoạt động hay không
        IF EXISTS (
            SELECT 1 
            FROM "DIEUKIENMONHOC" dk
            LEFT JOIN "CHUONGTRINHHOC" ctdk 
                ON ctdk."MaNganh" = NEW."MaNganh" AND ctdk."MaMonHoc" = dk."MaMonDieuKien"
            WHERE dk."MaMonHoc" = NEW."MaMonHoc" AND dk."TrangThai" = TRUE
              AND (
                  ctdk."MaMonHoc" IS NULL -- Chưa xếp môn điều kiện D vào chương trình học của ngành N
                  OR (dk."LoaiDieuKien" = 'tien_quyet' AND ctdk."HocKy" >= NEW."HocKy") -- Vi phạm điều kiện Học kỳ môn tiên quyết phải nhỏ hơn (<)
                  OR (dk."LoaiDieuKien" = 'hoc_truoc' AND ctdk."HocKy" > NEW."HocKy")   -- Vi phạm điều kiện Học kỳ môn học trước phải nhỏ hơn hoặc bằng (<=)
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Môn học "%" thuộc ngành "%" xếp ở học kỳ % không hợp lý với cấu hình các môn điều kiện hiện tại.', 
                NEW."MaMonHoc", NEW."MaNganh", NEW."HocKy";
        END IF;
    END IF;

    -- THAO TÁC: DELETE hoặc UPDATE thông tin môn học đóng vai trò làm môn điều kiện (D) cho môn khác
    IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND (OLD."MaNganh" <> NEW."MaNganh" OR OLD."MaMonHoc" <> NEW."MaMonHoc" OR OLD."HocKy" <> NEW."HocKy")) THEN
        -- Kiểm tra xem môn học cũ (OLD) có đang làm môn điều kiện hoạt động cho bất kỳ môn M nào khác cùng ngành không
        IF EXISTS (
            SELECT 1
            FROM "CHUONGTRINHHOC" ctm
            JOIN "DIEUKIENMONHOC" dk ON ctm."MaMonHoc" = dk."MaMonHoc"
            WHERE ctm."MaNganh" = OLD."MaNganh" 
              AND dk."MaMonDieuKien" = OLD."MaMonHoc"
              AND dk."TrangThai" = TRUE
              AND (
                  TG_OP = 'DELETE' -- Xóa môn điều kiện ra khỏi ngành sẽ làm môn phụ thuộc thiếu điều kiện
                  OR OLD."MaNganh" <> NEW."MaNganh" -- Chuyển ngành môn điều kiện
                  OR OLD."MaMonHoc" <> NEW."MaMonHoc" -- Thay đổi mã môn
                  OR (dk."LoaiDieuKien" = 'tien_quyet' AND NEW."HocKy" >= ctm."HocKy") -- Sửa học kỳ mới làm vi phạm quy tắc môn tiên quyết
                  OR (dk."LoaiDieuKien" = 'hoc_truoc' AND NEW."HocKy" > ctm."HocKy")   -- Sửa học kỳ mới làm vi phạm quy tắc môn học trước
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Thao tác % môn "%" của ngành "%" gây ảnh hưởng hoặc làm sai lệch lộ trình học kỳ của môn phụ thuộc khác.', 
                CASE WHEN TG_OP = 'DELETE' THEN 'XÓA' ELSE 'CẬP NHẬT' END, OLD."MaMonHoc", OLD."MaNganh";
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- Thiết lập Trigger chạy BEFORE trên bảng CHUONGTRINHHOC
DROP TRIGGER IF EXISTS trigger_rbtv07_cth ON "CHUONGTRINHHOC";
CREATE TRIGGER trigger_rbtv07_cth
BEFORE INSERT OR UPDATE OR DELETE ON "CHUONGTRINHHOC"
FOR EACH ROW EXECUTE FUNCTION func_check_rbtv07_ChuongTrinhHoc();

CREATE OR REPLACE FUNCTION func_check_rbtv07_ChuongTrinhHoc()
RETURNS TRIGGER AS $$
BEGIN
    -- THAO TÁC: INSERT hoặc UPDATE thông tin của chính môn học hiện tại (M)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD."MaNganh" <> NEW."MaNganh" OR OLD."MaMonHoc" <> NEW."MaMonHoc" OR OLD."HocKy" <> NEW."HocKy")) THEN
        -- Kiểm tra xem môn M vừa tác động có thỏa mãn toàn bộ môn điều kiện D đang hoạt động hay không
        IF EXISTS (
            SELECT 1 
            FROM "DIEUKIENMONHOC" dk
            LEFT JOIN "CHUONGTRINHHOC" ctdk 
                ON ctdk."MaNganh" = NEW."MaNganh" AND ctdk."MaMonHoc" = dk."MaMonDieuKien"
            WHERE dk."MaMonHoc" = NEW."MaMonHoc" AND dk."TrangThai" = TRUE
              AND (
                  ctdk."MaMonHoc" IS NULL -- Chưa xếp môn điều kiện D vào chương trình học của ngành N
                  OR (dk."LoaiDieuKien" = 'tien_quyet' AND ctdk."HocKy" >= NEW."HocKy") -- Vi phạm điều kiện Học kỳ môn tiên quyết phải nhỏ hơn (<)
                  OR (dk."LoaiDieuKien" = 'hoc_truoc' AND ctdk."HocKy" > NEW."HocKy")   -- Vi phạm điều kiện Học kỳ môn học trước phải nhỏ hơn hoặc bằng (<=)
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Môn học "%" thuộc ngành "%" xếp ở học kỳ % không hợp lý với cấu hình các môn điều kiện hiện tại.', 
                NEW."MaMonHoc", NEW."MaNganh", NEW."HocKy";
        END IF;
    END IF;

    -- THAO TÁC: DELETE hoặc UPDATE thông tin môn học đóng vai trò làm môn điều kiện (D) cho môn khác
    IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND (OLD."MaNganh" <> NEW."MaNganh" OR OLD."MaMonHoc" <> NEW."MaMonHoc" OR OLD."HocKy" <> NEW."HocKy")) THEN
        -- Kiểm tra xem môn học cũ (OLD) có đang làm môn điều kiện hoạt động cho bất kỳ môn M nào khác cùng ngành không
        IF EXISTS (
            SELECT 1
            FROM "CHUONGTRINHHOC" ctm
            JOIN "DIEUKIENMONHOC" dk ON ctm."MaMonHoc" = dk."MaMonHoc"
            WHERE ctm."MaNganh" = OLD."MaNganh" 
              AND dk."MaMonDieuKien" = OLD."MaMonHoc"
              AND dk."TrangThai" = TRUE
              AND (
                  TG_OP = 'DELETE' -- Xóa môn điều kiện ra khỏi ngành sẽ làm môn phụ thuộc thiếu điều kiện
                  OR OLD."MaNganh" <> NEW."MaNganh" -- Chuyển ngành môn điều kiện
                  OR OLD."MaMonHoc" <> NEW."MaMonHoc" -- Thay đổi mã môn
                  OR (dk."LoaiDieuKien" = 'tien_quyet' AND NEW."HocKy" >= ctm."HocKy") -- Sửa học kỳ mới làm vi phạm quy tắc môn tiên quyết
                  OR (dk."LoaiDieuKien" = 'hoc_truoc' AND NEW."HocKy" > ctm."HocKy")   -- Sửa học kỳ mới làm vi phạm quy tắc môn học trước
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Thao tác % môn "%" của ngành "%" gây ảnh hưởng hoặc làm sai lệch lộ trình học kỳ của môn phụ thuộc khác.', 
                CASE WHEN TG_OP = 'DELETE' THEN 'XÓA' ELSE 'CẬP NHẬT' END, OLD."MaMonHoc", OLD."MaNganh";
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- Thiết lập Trigger chạy BEFORE trên bảng CHUONGTRINHHOC
DROP TRIGGER IF EXISTS trigger_rbtv07_cth ON "CHUONGTRINHHOC";
CREATE TRIGGER trigger_rbtv07_cth
BEFORE INSERT OR UPDATE OR DELETE ON "CHUONGTRINHHOC"
FOR EACH ROW EXECUTE FUNCTION func_check_rbtv07_ChuongTrinhHoc();

CREATE OR REPLACE FUNCTION func_check_rbtv07_DieuKienMonHoc()
RETURNS TRIGGER AS $$
BEGIN
    -- Ràng buộc chỉ cần kiểm tra khi dữ liệu mối quan hệ này ở trạng thái hoạt động (TrangThai = TRUE)
    IF NEW."TrangThai" = TRUE THEN
        -- Kiểm tra trên toàn bộ các ngành xem có ngành nào đang chứa môn M (NEW.MaMonHoc) nhưng vi phạm điều kiện mới này không
        IF EXISTS (
            SELECT 1
            FROM "CHUONGTRINHHOC" ctm
            LEFT JOIN "CHUONGTRINHHOC" ctdk 
                ON ctdk."MaNganh" = ctm."MaNganh" AND ctdk."MaMonHoc" = NEW."MaMonDieuKien"
            WHERE ctm."MaMonHoc" = NEW."MaMonHoc"
              AND (
                  ctdk."MaMonHoc" IS NULL -- Ngành đó có môn M nhưng chưa xếp môn điều kiện D vào chương trình học
                  OR (NEW."LoaiDieuKien" = 'tien_quyet' AND ctdk."HocKy" >= ctm."HocKy") -- Vi phạm học kỳ môn tiên quyết
                  OR (NEW."LoaiDieuKien" = 'hoc_truoc' AND ctdk."HocKy" > ctm."HocKy")   -- Vi phạm học kỳ môn học trước
              )
        ) THEN
            RAISE EXCEPTION 'Vi phạm RBTV07: Không thể thiết lập điều kiện (Môn "%" cần môn "%" là "%") vì phân bổ học kỳ hiện tại trong chương trình học của ngành không tương thích.', 
                NEW."MaMonHoc", NEW."MaMonDieuKien", NEW."LoaiDieuKien";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Thiết lập Trigger chạy BEFORE trên bảng DIEUKIENMONHOC
DROP TRIGGER IF EXISTS trigger_rbtv07_dkmh ON "DIEUKIENMONHOC";
CREATE TRIGGER trigger_rbtv07_dkmh
BEFORE INSERT OR UPDATE OF "MaMonHoc", "MaMonDieuKien", "LoaiDieuKien", "TrangThai" ON "DIEUKIENMONHOC"
FOR EACH ROW EXECUTE FUNCTION func_check_rbtv07_DieuKienMonHoc();


--Tạo Trigger RBV22
-- =====================================================
-- TRIGGER 1: Kiểm tra LoaiDangKy khi INSERT/UPDATE CHITIETDANGKY
-- =====================================================
-- Mục đích: Khi sinh viên đăng ký môn, kiểm tra LoaiDangKy có phù hợp 
-- với lịch sử học hay không
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv22_check_loai_dang_ky()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_sv VARCHAR(15);
    v_ma_mon_hoc VARCHAR(15);
    v_loai_dang_ky VARCHAR(20);
    v_count_rot INTEGER;
    v_count_qua_mon INTEGER;
    v_count_total INTEGER;
BEGIN
    -- Lấy thông tin sinh viên từ PHIEUDANGKY
    SELECT pd."MaSv"
    INTO v_ma_sv
    FROM "PHIEUDANGKY" pd
    WHERE pd."SoPhieu" = NEW."SoPhieu";

    v_ma_mon_hoc := NEW."MaMonHoc";
    v_loai_dang_ky := COALESCE(NEW."LoaiDangKy", 'hoc_moi');

    -- ===== KIỂM TRA LOẠI ĐĂNG KÝ =====
    IF v_loai_dang_ky = 'hoc_moi' THEN
        -- hoc_moi: Chưa có lịch sử học môn M
        SELECT COUNT(*)
        INTO v_count_total
        FROM "MONDAHOC" mdh
        WHERE mdh."MaSv" = v_ma_sv AND mdh."MaMonHoc" = v_ma_mon_hoc;

        IF v_count_total > 0 THEN
            RAISE EXCEPTION 'RBTV22: Loại đăng ký "hoc_moi" không hợp lệ. Sinh viên % đã có lịch sử học môn %',
                v_ma_sv, v_ma_mon_hoc;
        END IF;

    ELSIF v_loai_dang_ky = 'hoc_lai' THEN
        -- hoc_lai: Tồn tại MONDAHOC(SV, M, KetQua = 'rot')
        -- và chưa có lần qua_mon
        SELECT COUNT(*)
        INTO v_count_rot
        FROM "MONDAHOC" mdh
        WHERE mdh."MaSv" = v_ma_sv 
          AND mdh."MaMonHoc" = v_ma_mon_hoc 
          AND mdh."KetQua" = 'rot';

        SELECT COUNT(*)
        INTO v_count_qua_mon
        FROM "MONDAHOC" mdh
        WHERE mdh."MaSv" = v_ma_sv 
          AND mdh."MaMonHoc" = v_ma_mon_hoc 
          AND mdh."KetQua" = 'qua_mon';

        -- Phải có ít nhất 1 lần rớt và chưa qua
        IF v_count_rot = 0 THEN
            RAISE EXCEPTION 'RBTV22: Loại đăng ký "hoc_lai" không hợp lệ. Sinh viên % chưa rớt môn %',
                v_ma_sv, v_ma_mon_hoc;
        END IF;

        IF v_count_qua_mon > 0 THEN
            RAISE EXCEPTION 'RBTV22: Loại đăng ký "hoc_lai" không hợp lệ. Sinh viên % đã qua môn % rồi',
                v_ma_sv, v_ma_mon_hoc;
        END IF;

    ELSIF v_loai_dang_ky = 'hoc_cai_thien' THEN
        -- hoc_cai_thien: Tồn tại MONDAHOC(SV, M, KetQua = 'qua_mon')
        SELECT COUNT(*)
        INTO v_count_qua_mon
        FROM "MONDAHOC" mdh
        WHERE mdh."MaSv" = v_ma_sv 
          AND mdh."MaMonHoc" = v_ma_mon_hoc 
          AND mdh."KetQua" = 'qua_mon';

        IF v_count_qua_mon = 0 THEN
            RAISE EXCEPTION 'RBTV22: Loại đăng ký "hoc_cai_thien" không hợp lệ. Sinh viên % chưa qua môn %',
                v_ma_sv, v_ma_mon_hoc;
        END IF;

    ELSE
        RAISE EXCEPTION 'RBTV22: Loại đăng ký không hợp lệ: %', v_loai_dang_ky;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv22_check_loai_dang_ky ON "CHITIETDANGKY";

-- Tạo trigger cho INSERT và UPDATE
DROP TRIGGER IF EXISTS trg_rbtv22_check_loai_dang_ky ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv22_check_loai_dang_ky
BEFORE INSERT OR UPDATE ON "CHITIETDANGKY"
FOR EACH ROW
WHEN (NEW."TrangThai" = 'Đã đăng ký')
EXECUTE FUNCTION fn_rbtv22_check_loai_dang_ky();


-- =====================================================
-- TRIGGER 2: Kiểm tra lại CHITIETDANGKY khi INSERT/UPDATE/DELETE MONDAHOC
-- =====================================================
-- Mục đích: Khi thêm/sửa/xóa lịch sử học, kiểm tra các đăng ký hiện tại 
-- có còn hợp lệ không
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv22_validate_registrations_on_history_change()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_sv VARCHAR(15);
    v_ma_mon_hoc VARCHAR(15);
    v_ket_qua VARCHAR(20);
    v_registration RECORD;
    v_loai_dang_ky VARCHAR(20);
    v_count_rot INTEGER;
    v_count_qua_mon INTEGER;
    v_count_total INTEGER;
BEGIN
    -- Lấy thông tin từ MONDAHOC
    IF TG_OP = 'DELETE' THEN
        v_ma_sv := OLD."MaSv";
        v_ma_mon_hoc := OLD."MaMonHoc";
        v_ket_qua := OLD."KetQua";
    ELSE
        v_ma_sv := NEW."MaSv";
        v_ma_mon_hoc := NEW."MaMonHoc";
        v_ket_qua := NEW."KetQua";
    END IF;

    -- Tìm tất cả các đăng ký của sinh viên này để môn này
    FOR v_registration IN
        SELECT ctdk."SoPhieu", ctdk."LoaiDangKy"
        FROM "CHITIETDANGKY" ctdk
        INNER JOIN "PHIEUDANGKY" pd ON ctdk."SoPhieu" = pd."SoPhieu"
        WHERE pd."MaSv" = v_ma_sv 
          AND ctdk."MaMonHoc" = v_ma_mon_hoc
          AND ctdk."TrangThai" = 'Đã đăng ký'
    LOOP
        v_loai_dang_ky := v_registration."LoaiDangKy";

        -- Kiểm tra tính hợp lệ của loại đăng ký
        IF v_loai_dang_ky = 'hoc_moi' THEN
            -- hoc_moi: Chưa có lịch sử học môn
            SELECT COUNT(*)
            INTO v_count_total
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv 
              AND mdh."MaMonHoc" = v_ma_mon_hoc
              AND (TG_OP = 'DELETE' OR mdh."MaHocKy" != NEW."MaHocKy" OR mdh."MaSv" != NEW."MaSv");

            IF v_count_total > 0 THEN
                RAISE EXCEPTION 'RBTV22: Đăng ký "hoc_moi" của SV % môn % trở nên không hợp lệ',
                    v_ma_sv, v_ma_mon_hoc;
            END IF;

        ELSIF v_loai_dang_ky = 'hoc_lai' THEN
            -- hoc_lai: Phải có rớt và chưa qua
            SELECT COUNT(*)
            INTO v_count_rot
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv 
              AND mdh."MaMonHoc" = v_ma_mon_hoc 
              AND mdh."KetQua" = 'rot';

            SELECT COUNT(*)
            INTO v_count_qua_mon
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv 
              AND mdh."MaMonHoc" = v_ma_mon_hoc 
              AND mdh."KetQua" = 'qua_mon';

            IF v_count_rot = 0 THEN
                RAISE EXCEPTION 'RBTV22: Đăng ký "hoc_lai" của SV % môn % trở nên không hợp lệ (không có rớt)',
                    v_ma_sv, v_ma_mon_hoc;
            END IF;

            IF v_count_qua_mon > 0 THEN
                RAISE EXCEPTION 'RBTV22: Đăng ký "hoc_lai" của SV % môn % trở nên không hợp lệ (đã qua rồi)',
                    v_ma_sv, v_ma_mon_hoc;
            END IF;

        ELSIF v_loai_dang_ky = 'hoc_cai_thien' THEN
            -- hoc_cai_thien: Phải có qua_mon
            SELECT COUNT(*)
            INTO v_count_qua_mon
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv 
              AND mdh."MaMonHoc" = v_ma_mon_hoc 
              AND mdh."KetQua" = 'qua_mon';

            IF v_count_qua_mon = 0 THEN
                RAISE EXCEPTION 'RBTV22: Đăng ký "hoc_cai_thien" của SV % môn % trở nên không hợp lệ (chưa qua)',
                    v_ma_sv, v_ma_mon_hoc;
            END IF;
        END IF;
    END LOOP;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv22_mondahoc_insert ON "MONDAHOC";
DROP TRIGGER IF EXISTS trg_rbtv22_mondahoc_update ON "MONDAHOC";
DROP TRIGGER IF EXISTS trg_rbtv22_mondahoc_delete ON "MONDAHOC";

-- Tạo trigger
DROP TRIGGER IF EXISTS trg_rbtv22_mondahoc_insert ON "MONDAHOC";
CREATE TRIGGER trg_rbtv22_mondahoc_insert
AFTER INSERT ON "MONDAHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv22_validate_registrations_on_history_change();

DROP TRIGGER IF EXISTS trg_rbtv22_mondahoc_update ON "MONDAHOC";
CREATE TRIGGER trg_rbtv22_mondahoc_update
AFTER UPDATE ON "MONDAHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv22_validate_registrations_on_history_change();

DROP TRIGGER IF EXISTS trg_rbtv22_mondahoc_delete ON "MONDAHOC";
CREATE TRIGGER trg_rbtv22_mondahoc_delete
BEFORE DELETE ON "MONDAHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv22_validate_registrations_on_history_change();


--Tạo Trigger RBTV23
CREATE OR REPLACE FUNCTION fn_rbtv23_get_semester_order(p_ma_hoc_ky VARCHAR)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT CAST(SUBSTRING("MaNamHoc", 1, 4) AS INTEGER) * 10 + COALESCE("ThuTu", 1)
            FROM "HOCKY" WHERE "MaHocKy" = p_ma_hoc_ky);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- =====================================================
-- TRIGGER 1: Kiểm tra điều kiện khi INSERT/UPDATE CHITIETDANGKY
-- =====================================================
-- Mục đích: Khi sinh viên đăng ký một môn học, kiểm tra xem sinh viên có thỏa 
-- các điều kiện tiên quyết/học trước hay không.
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv23_check_prerequisite_on_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_sv VARCHAR(15);
    v_ma_mon_hoc VARCHAR(15);
    v_ma_hoc_ky VARCHAR(15);
    v_hoc_ky_dang_ky INTEGER;
    v_loai_dieu_kien VARCHAR(20);
    v_ma_mon_dieu_kien VARCHAR(15);
    v_count_tien_quyet INTEGER;
    v_count_hoc_truoc INTEGER;
    v_count_cung_phieu INTEGER;
    v_dieu_kien RECORD;
BEGIN
    -- Lấy thông tin từ PHIEUDANGKY
    SELECT pd."MaSv", pd."MaHocKy"
    INTO v_ma_sv, v_ma_hoc_ky
    FROM "PHIEUDANGKY" pd
    WHERE pd."SoPhieu" = NEW."SoPhieu";

    -- Lấy mã môn học từ NEW record
    v_ma_mon_hoc := NEW."MaMonHoc";

    -- Lấy thứ tự học kỳ đăng ký
    v_hoc_ky_dang_ky := fn_rbtv23_get_semester_order(v_ma_hoc_ky);

    -- ===== KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT/HỌC TRƯỚC =====
    -- Lặp qua tất cả các điều kiện của môn đăng ký
    FOR v_dieu_kien IN
        SELECT d."MaMonDieuKien", d."LoaiDieuKien"
        FROM "DIEUKIENMONHOC" d
        WHERE d."MaMonHoc" = v_ma_mon_hoc AND d."TrangThai" = TRUE
    LOOP
        v_ma_mon_dieu_kien := v_dieu_kien."MaMonDieuKien";
        v_loai_dieu_kien := v_dieu_kien."LoaiDieuKien";

        IF v_loai_dieu_kien = 'tien_quyet' THEN
            -- ===== KIỂM TRA TIÊN QUYẾT (tien_quyet) =====
            -- Sinh viên phải đã học xong môn D với kết quả "qua_mon" 
            -- TRONG HỌC KỲ TRƯỚC học kỳ đăng ký
            SELECT COUNT(*)
            INTO v_count_tien_quyet
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv
              AND mdh."MaMonHoc" = v_ma_mon_dieu_kien
              AND mdh."KetQua" = 'qua_mon'
              AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky;

            -- Nếu không có môn tiên quyết → Lỗi
            IF v_count_tien_quyet = 0 THEN
                RAISE EXCEPTION 'Vi phạm RBTV23: Sinh viên % chưa đạt tiên quyết % để đăng ký %',
                    v_ma_sv, v_ma_mon_dieu_kien, v_ma_mon_hoc;
            END IF;

        ELSIF v_loai_dieu_kien = 'hoc_truoc' THEN
            -- ===== KIỂM TRA HỌC TRƯỚC (hoc_truoc) =====
            -- Sinh viên phải từng học xong môn D TRƯỚC ĐÓ
            -- HOẶC đăng ký đồng thời môn D trong CÙNG phiếu/học kỳ

            -- Kiểm tra: Sinh viên đã học môn này trong học kỳ trước chưa?
            SELECT COUNT(*)
            INTO v_count_hoc_truoc
            FROM "MONDAHOC" mdh
            WHERE mdh."MaSv" = v_ma_sv
              AND mdh."MaMonHoc" = v_ma_mon_dieu_kien
              AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky;

            -- Nếu chưa học trước, kiểm tra có đăng ký cùng phiếu không
            IF v_count_hoc_truoc = 0 THEN
                SELECT COUNT(*)
                INTO v_count_cung_phieu
                FROM "CHITIETDANGKY" ctdk
                WHERE ctdk."SoPhieu" = NEW."SoPhieu"
                  AND ctdk."MaMonHoc" = v_ma_mon_dieu_kien
                  AND ctdk."TrangThai" = 'Đã đăng ký';

                -- Nếu không đăng ký cùng phiếu → Lỗi
                IF v_count_cung_phieu = 0 THEN
                    RAISE EXCEPTION 'Vi phạm RBTV23: Sinh viên % phải học trước hoặc đăng ký cùng lúc %',
                        v_ma_sv, v_ma_mon_dieu_kien;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv23_check_prerequisite_on_registration ON "CHITIETDANGKY";

-- Tạo trigger cho INSERT và UPDATE
DROP TRIGGER IF EXISTS trg_rbtv23_check_prerequisite_on_registration ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv23_check_prerequisite_on_registration
BEFORE INSERT OR UPDATE ON "CHITIETDANGKY"
FOR EACH ROW
WHEN (NEW."TrangThai" = 'Đã đăng ký')
EXECUTE FUNCTION fn_rbtv23_check_prerequisite_on_registration();


-- =====================================================
-- TRIGGER 2: Kiểm tra lại đăng ký hiện tại khi thay đổi DIEUKIENMONHOC
-- =====================================================
-- Mục đích: Khi thêm/sửa/xóa điều kiện, kiểm tra các đăng ký hiện tại có vi phạm không
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv23_validate_registrations_on_condition_change()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_mon_hoc VARCHAR(15);
    v_ma_mon_dieu_kien VARCHAR(15);
    v_loai_dieu_kien VARCHAR(20);
    v_registration RECORD;
    v_ma_sv VARCHAR(15);
    v_ma_hoc_ky VARCHAR(15);
    v_hoc_ky_dang_ky INTEGER;
    v_count_met INTEGER;
BEGIN
    -- Xác định môn học và điều kiện được thay đổi
    IF TG_OP = 'DELETE' THEN
        v_ma_mon_hoc := OLD."MaMonHoc";
        v_ma_mon_dieu_kien := OLD."MaMonDieuKien";
        v_loai_dieu_kien := OLD."LoaiDieuKien";
    ELSE
        v_ma_mon_hoc := NEW."MaMonHoc";
        v_ma_mon_dieu_kien := NEW."MaMonDieuKien";
        v_loai_dieu_kien := NEW."LoaiDieuKien";
    END IF;

    -- Chỉ kiểm tra nếu điều kiện đang hoạt động (hoặc được kích hoạt)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW."TrangThai" = TRUE) OR TG_OP = 'DELETE' THEN
        -- Lặp qua tất cả các đăng ký của môn này
        FOR v_registration IN
            SELECT ctdk."SoPhieu", pd."MaSv", pd."MaHocKy"
            FROM "CHITIETDANGKY" ctdk
            INNER JOIN "PHIEUDANGKY" pd ON ctdk."SoPhieu" = pd."SoPhieu"
            WHERE ctdk."MaMonHoc" = v_ma_mon_hoc
              AND ctdk."TrangThai" = 'Đã đăng ký'
        LOOP
            v_ma_sv := v_registration."MaSv";
            v_ma_hoc_ky := v_registration."MaHocKy";
            v_hoc_ky_dang_ky := fn_rbtv23_get_semester_order(v_ma_hoc_ky);

            -- Kiểm tra điều kiện
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW."TrangThai" = TRUE THEN
                IF v_loai_dieu_kien = 'tien_quyet' THEN
                    -- Kiểm tra tiên quyết
                    SELECT COUNT(*) INTO v_count_met
                    FROM "MONDAHOC" mdh
                    WHERE mdh."MaSv" = v_ma_sv
                      AND mdh."MaMonHoc" = v_ma_mon_dieu_kien
                      AND mdh."KetQua" = 'qua_mon'
                      AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky;

                    IF v_count_met = 0 THEN
                        RAISE EXCEPTION 'Vi phạm RBTV23: Điều kiện tiên quyết vi phạm - SV: % môn: %',
                            v_ma_sv, v_ma_mon_hoc;
                    END IF;

                ELSIF v_loai_dieu_kien = 'hoc_truoc' THEN
                    -- Kiểm tra học trước
                    SELECT COUNT(*) INTO v_count_met
                    FROM "MONDAHOC" mdh
                    WHERE mdh."MaSv" = v_ma_sv
                      AND mdh."MaMonHoc" = v_ma_mon_dieu_kien
                      AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky;

                    IF v_count_met = 0 THEN
                        -- Kiểm tra có đăng ký cùng phiếu không
                        SELECT COUNT(*) INTO v_count_met
                        FROM "CHITIETDANGKY" ctdk
                        WHERE ctdk."SoPhieu" = v_registration."SoPhieu"
                          AND ctdk."MaMonHoc" = v_ma_mon_dieu_kien
                          AND ctdk."TrangThai" = 'Đã đăng ký';

                        IF v_count_met = 0 THEN
                            RAISE EXCEPTION 'Vi phạm RBTV23: Điều kiện học trước vi phạm - SV: % môn: %',
                                v_ma_sv, v_ma_mon_hoc;
                        END IF;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv23_check_condition_insert ON "DIEUKIENMONHOC";
DROP TRIGGER IF EXISTS trg_rbtv23_check_condition_update ON "DIEUKIENMONHOC";
DROP TRIGGER IF EXISTS trg_rbtv23_check_condition_delete ON "DIEUKIENMONHOC";

-- Tạo trigger
DROP TRIGGER IF EXISTS trg_rbtv23_check_condition_insert ON "DIEUKIENMONHOC";
CREATE TRIGGER trg_rbtv23_check_condition_insert
BEFORE INSERT ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv23_validate_registrations_on_condition_change();

DROP TRIGGER IF EXISTS trg_rbtv23_check_condition_update ON "DIEUKIENMONHOC";
CREATE TRIGGER trg_rbtv23_check_condition_update
BEFORE UPDATE ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv23_validate_registrations_on_condition_change();

DROP TRIGGER IF EXISTS trg_rbtv23_check_condition_delete ON "DIEUKIENMONHOC";
CREATE TRIGGER trg_rbtv23_check_condition_delete
BEFORE DELETE ON "DIEUKIENMONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv23_validate_registrations_on_condition_change();


-- =====================================================
-- TRIGGER 3: Kiểm tra đăng ký tương lai khi thay đổi MONDAHOC
-- =====================================================
-- Mục đích: Khi thêm/sửa/xóa kết quả học, kiểm tra các đăng ký tương lai có ảnh hưởng không
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv23_validate_future_registrations()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_sv VARCHAR(15);
    v_ma_mon_hoc VARCHAR(15);
    v_hoc_ky_hoan_thanh INTEGER;
    v_dependent_mon RECORD;
    v_registration RECORD;
    v_loai_dieu_kien VARCHAR(20);
    v_ma_hoc_ky_dang_ky VARCHAR(15);
    v_hoc_ky_dang_ky INTEGER;
    v_count_met INTEGER;
BEGIN
    -- Lấy thông tin môn vừa hoàn thành/thay đổi
    IF TG_OP = 'DELETE' THEN
        v_ma_sv := OLD."MaSv";
        v_ma_mon_hoc := OLD."MaMonHoc";
    ELSE
        v_ma_sv := NEW."MaSv";
        v_ma_mon_hoc := NEW."MaMonHoc";
    END IF;

    -- Lấy thứ tự học kỳ hoàn thành
    IF TG_OP = 'DELETE' THEN
        v_hoc_ky_hoan_thanh := fn_rbtv23_get_semester_order(OLD."MaHocKy");
    ELSE
        v_hoc_ky_hoan_thanh := fn_rbtv23_get_semester_order(NEW."MaHocKy");
    END IF;

    -- Tìm tất cả các môn học có điều kiện phụ thuộc vào môn này
    FOR v_dependent_mon IN
        SELECT "MaMonHoc", "LoaiDieuKien"
        FROM "DIEUKIENMONHOC"
        WHERE "MaMonDieuKien" = v_ma_mon_hoc AND "TrangThai" = TRUE
    LOOP
        -- Tìm các đăng ký của môn phụ thuộc
        FOR v_registration IN
            SELECT ctdk."SoPhieu", pd."MaHocKy"
            FROM "CHITIETDANGKY" ctdk
            INNER JOIN "PHIEUDANGKY" pd ON ctdk."SoPhieu" = pd."SoPhieu"
            WHERE pd."MaSv" = v_ma_sv
              AND ctdk."MaMonHoc" = v_dependent_mon."MaMonHoc"
              AND ctdk."TrangThai" = 'Đã đăng ký'
        LOOP
            v_ma_hoc_ky_dang_ky := v_registration."MaHocKy";
            v_hoc_ky_dang_ky := fn_rbtv23_get_semester_order(v_ma_hoc_ky_dang_ky);
            v_loai_dieu_kien := v_dependent_mon."LoaiDieuKien";

            -- Chỉ kiểm tra nếu đăng ký này >= học kỳ hoàn thành
            IF v_hoc_ky_dang_ky >= v_hoc_ky_hoan_thanh THEN
                IF v_loai_dieu_kien = 'tien_quyet' THEN
                    -- Nếu xóa hoặc kết quả không phải qua_mon → kiểm tra lại
                    IF TG_OP = 'DELETE' OR NEW."KetQua" != 'qua_mon' THEN
                        SELECT COUNT(*) INTO v_count_met
                        FROM "MONDAHOC" mdh
                        WHERE mdh."MaSv" = v_ma_sv
                          AND mdh."MaMonHoc" = v_ma_mon_hoc
                          AND mdh."KetQua" = 'qua_mon'
                          AND fn_rbtv23_get_semester_order(mdh."MaHocKy") < v_hoc_ky_dang_ky
                          AND (TG_OP = 'DELETE' OR mdh.id != NEW.id);

                        IF v_count_met = 0 THEN
                            RAISE EXCEPTION 'RBTV23: Thay đổi kết quả vi phạm tiên quyết - SV: % môn: %',
                                v_ma_sv, v_dependent_mon."MaMonHoc";
                        END IF;
                    END IF;

                ELSIF v_loai_dieu_kien = 'hoc_truoc' THEN
                    -- Nếu xóa record → kiểm tra có đăng ký cùng phiếu không
                    IF TG_OP = 'DELETE' THEN
                        SELECT COUNT(*) INTO v_count_met
                        FROM "CHITIETDANGKY" ctdk
                        WHERE ctdk."SoPhieu" = v_registration."SoPhieu"
                          AND ctdk."MaMonHoc" = v_ma_mon_hoc
                          AND ctdk."TrangThai" = 'Đã đăng ký';

                        IF v_count_met = 0 THEN
                            RAISE EXCEPTION 'Vi phạm RBTV23: Xóa kết quả học vi phạm học trước - SV: % môn: %',
                                v_ma_sv, v_dependent_mon."MaMonHoc";
                        END IF;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu tồn tại
DROP TRIGGER IF EXISTS trg_rbtv23_check_mondahoc_change ON "MONDAHOC";

-- Tạo trigger
DROP TRIGGER IF EXISTS trg_rbtv23_check_mondahoc_change ON "MONDAHOC";
CREATE TRIGGER trg_rbtv23_check_mondahoc_change
BEFORE INSERT OR UPDATE OR DELETE ON "MONDAHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv23_validate_future_registrations();
--RBTV 08
-- Tạo function xử lý logic kiểm tra RBTV08 (Điều kiện nới lỏng)
CREATE OR REPLACE FUNCTION fn_check_rbtv08_namhoc_relaxed()
RETURNS TRIGGER AS $$
BEGIN
    -- Kiểm tra điều kiện NamKetThuc phải lớn hơn NamBatDau
    IF NEW."NamKetThuc" <= NEW."NamBatDau" THEN
        RAISE EXCEPTION 'Vi phạm RBTV08: Năm kết thúc (%) phải lớn hơn năm bắt đầu (%).', NEW."NamKetThuc", NEW."NamBatDau";
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger gắn vào bảng NAMHOC
DROP TRIGGER IF EXISTS trg_rbtv08_namhoc_relaxed ON "NAMHOC";

CREATE TRIGGER trg_rbtv08_namhoc_relaxed
BEFORE INSERT OR UPDATE OF "NamBatDau", "NamKetThuc"
ON "NAMHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv08_namhoc_relaxed();
--RBTV 09
-- Tạo function xử lý cho bảng HOCKY
CREATE OR REPLACE FUNCTION fn_check_rbtv09_hocky()
RETURNS TRIGGER AS $$
BEGIN
    /* 1. Kiểm tra thứ tự theo loại học kỳ */
    IF NEW."LoaiHocKy" = 'Chính' AND NEW."ThuTu" NOT IN (1, 2) THEN
        RAISE EXCEPTION 'RBTV09: Học kỳ Chính phải có ThuTu là 1 hoặc 2.';
    END IF;

    IF NEW."LoaiHocKy" = 'Hè' AND NEW."ThuTu" != 3 THEN
        RAISE EXCEPTION 'RBTV09: Học kỳ Hè phải có ThuTu là 3.';
    END IF;

    /* 2. Kiểm tra tính duy nhất UNIQUE(MaNamHoc, ThuTu) */
    IF EXISTS (
        SELECT 1 FROM "HOCKY"
        WHERE "MaNamHoc" = NEW."MaNamHoc"
          AND "ThuTu" = NEW."ThuTu"
          AND "MaHocKy" IS DISTINCT FROM NEW."MaHocKy"
    ) THEN
        RAISE EXCEPTION 'RBTV09: Học kỳ có thứ tự % đã tồn tại trong năm học %.', NEW."ThuTu", NEW."MaNamHoc";
    END IF;

    /* 3. Kiểm tra logic các mốc thời gian (bỏ qua nếu dữ liệu NULL) */
    IF NEW."NgayBatDau" IS NOT NULL AND NEW."NgayKetThuc" IS NOT NULL THEN
        IF NEW."NgayBatDau" >= NEW."NgayKetThuc" THEN
            RAISE EXCEPTION 'RBTV09: NgayBatDau phải nhỏ hơn NgayKetThuc.';
        END IF;
    END IF;

    IF NEW."NgayBatDauDangKy" IS NOT NULL AND NEW."NgayKetThucDangKy" IS NOT NULL THEN
        IF NEW."NgayBatDauDangKy" >= NEW."NgayKetThucDangKy" THEN
            RAISE EXCEPTION 'RBTV09: NgayBatDauDangKy phải nhỏ hơn NgayKetThucDangKy.';
        END IF;
    END IF;

    IF (NEW."NgayBatDauDangKy" IS NOT NULL OR NEW."NgayKetThucDangKy" IS NOT NULL)
       AND NEW."NgayBatDau" IS NULL THEN
        RAISE EXCEPTION 'RBTV09: Cần nhập NgayBatDau trước khi nhập thời gian đăng ký.';
    END IF;

    IF NEW."NgayBatDauDangKy" IS NOT NULL AND NEW."NgayBatDau" IS NOT NULL THEN
        /* Ép kiểu TIMESTAMP về DATE để so sánh chính xác với NgayBatDau (kiểu DATE) */
        IF NEW."NgayBatDauDangKy"::DATE >= NEW."NgayBatDau" THEN
            RAISE EXCEPTION 'RBTV09: NgayBatDauDangKy phải trước NgayBatDau.';
        END IF;
    END IF;

    IF NEW."NgayKetThucDangKy" IS NOT NULL AND NEW."NgayBatDau" IS NOT NULL THEN
        /* Ép kiểu TIMESTAMP về DATE để so sánh chính xác với NgayBatDau (kiểu DATE) */
        IF NEW."NgayKetThucDangKy"::DATE >= NEW."NgayBatDau" THEN
            RAISE EXCEPTION 'RBTV09: NgayKetThucDangKy phải trước NgayBatDau.';
        END IF;
    END IF;

    IF NEW."HanDongHocPhi" IS NOT NULL AND (NEW."NgayBatDau" IS NULL OR NEW."NgayKetThuc" IS NULL) THEN
        RAISE EXCEPTION 'RBTV09: Cần nhập NgayBatDau và NgayKetThuc trước khi nhập HanDongHocPhi.';
    END IF;

    IF NEW."HanDongHocPhi" IS NOT NULL AND NEW."NgayBatDau" IS NOT NULL AND NEW."NgayKetThuc" IS NOT NULL THEN
        IF NEW."HanDongHocPhi" < NEW."NgayBatDau" OR NEW."HanDongHocPhi" > NEW."NgayKetThuc" THEN
            RAISE EXCEPTION 'RBTV09: HanDongHocPhi phải nằm trong khoảng NgayBatDau đến NgayKetThuc.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng HOCKY
DROP TRIGGER IF EXISTS trg_rbtv09_hocky_ins_upd ON "HOCKY";
CREATE TRIGGER trg_rbtv09_hocky_ins_upd
BEFORE INSERT OR UPDATE ON "HOCKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv09_hocky();
-- Tạo function xử lý cho bảng NAMHOC
CREATE OR REPLACE FUNCTION fn_check_rbtv09_namhoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Kiểm tra nếu người dùng đổi MaNamHoc sang một mã khác có sẵn, 
     đảm bảo không bị gộp/trùng (UNIQUE MaNamHoc, ThuTu) ở bảng HOCKY.
    */
    IF NEW."MaNamHoc" IS DISTINCT FROM OLD."MaNamHoc" THEN
        IF EXISTS (
            SELECT "ThuTu"
            FROM "HOCKY"
            WHERE "MaNamHoc" = NEW."MaNamHoc"
            GROUP BY "ThuTu"
            HAVING COUNT(*) > 1
        ) THEN
            RAISE EXCEPTION 'RBTV09: Thay đổi MaNamHoc dẫn đến trùng lặp thứ tự học kỳ bên bảng HOCKY.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng NAMHOC
DROP TRIGGER IF EXISTS trg_rbtv09_namhoc_upd ON "NAMHOC";
CREATE TRIGGER trg_rbtv09_namhoc_upd
AFTER UPDATE OF "MaNamHoc" ON "NAMHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv09_namhoc();
--RBTV10
-- Tạo function xử lý cho bảng LOP
CREATE OR REPLACE FUNCTION fn_check_rbtv10_lop()
RETURNS TRIGGER AS $$
BEGIN
    /* Kiểm tra SoLuongToiDa phải dương (> 0) */
    IF NEW."SoLuongToiDa" IS NOT NULL AND NEW."SoLuongToiDa" <= 0 THEN
        RAISE EXCEPTION 'RBTV10: Sĩ số tối đa của lớp (%) phải lớn hơn 0.', NEW."SoLuongToiDa";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOP
DROP TRIGGER IF EXISTS trg_rbtv10_lop_ins_upd ON "LOP";
CREATE TRIGGER trg_rbtv10_lop_ins_upd
BEFORE INSERT OR UPDATE OF "SoLuongToiDa" ON "LOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv10_lop();
--RBTV11
CREATE OR REPLACE FUNCTION fn_check_rbtv11_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    thu_tu_bat_dau INTEGER;
    thu_tu_ket_thuc INTEGER;
BEGIN
    /* Lấy giá trị ThuTu của tiết bắt đầu từ bảng TIETHOC */
    SELECT "ThuTu" INTO thu_tu_bat_dau
    FROM "TIETHOC"
    WHERE "MaTiet" = NEW."MaTietBatDau";

    /* Lấy giá trị ThuTu của tiết kết thúc từ bảng TIETHOC */
    SELECT "ThuTu" INTO thu_tu_ket_thuc
    FROM "TIETHOC"
    WHERE "MaTiet" = NEW."MaTietKetThuc";

    /* Kiểm tra ràng buộc: Thứ tự tiết bắt đầu <= Thứ tự tiết kết thúc */
    IF thu_tu_bat_dau > thu_tu_ket_thuc THEN
        RAISE EXCEPTION 'RBTV11: Tiết bắt đầu (thứ tự %) không được sau tiết kết thúc (thứ tự %).', thu_tu_bat_dau, thu_tu_ket_thuc;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv11_lichhoclop_ins_upd ON "LICHHOCLOP";
CREATE TRIGGER trg_rbtv11_lichhoclop_ins_upd
BEFORE INSERT OR UPDATE OF "MaTietBatDau", "MaTietKetThuc" ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv11_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv11_tiethoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu giá trị ThuTu thực sự bị thay đổi */
    IF NEW."ThuTu" IS DISTINCT FROM OLD."ThuTu" THEN
        
        /* Trường hợp 1: Tiết đang sửa đóng vai trò là MaTietBatDau trong LICHHOCLOP.
           Thứ tự mới của nó không được lớn hơn thứ tự của tiết kết thúc tương ứng. 
        */
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" l
            JOIN "TIETHOC" t_kt ON l."MaTietKetThuc" = t_kt."MaTiet"
            WHERE l."MaTietBatDau" = NEW."MaTiet"
              AND NEW."ThuTu" > t_kt."ThuTu"
        ) THEN
            RAISE EXCEPTION 'RBTV11: Việc cập nhật ThuTu làm vi phạm lịch học hiện tại (tiết bắt đầu sau tiết kết thúc).';
        END IF;

        /* Trường hợp 2: Tiết đang sửa đóng vai trò là MaTietKetThuc trong LICHHOCLOP.
           Thứ tự mới của nó không được nhỏ hơn thứ tự của tiết bắt đầu tương ứng.
        */
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" l
            JOIN "TIETHOC" t_bd ON l."MaTietBatDau" = t_bd."MaTiet"
            WHERE l."MaTietKetThuc" = NEW."MaTiet"
              AND t_bd."ThuTu" > NEW."ThuTu"
        ) THEN
            RAISE EXCEPTION 'RBTV11: Việc cập nhật ThuTu làm vi phạm lịch học hiện tại (tiết kết thúc trước tiết bắt đầu).';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv11_tiethoc_upd ON "TIETHOC";
CREATE TRIGGER trg_rbtv11_tiethoc_upd
BEFORE UPDATE OF "ThuTu" ON "TIETHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv11_tiethoc();
--RBTV12
CREATE OR REPLACE FUNCTION fn_check_rbtv12_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    new_bd_thutu INT;
    new_kt_thutu INT;
BEGIN
    /* 1. Lấy thứ tự (ThuTu) của tiết bắt đầu và tiết kết thúc của dòng đang thao tác */
    SELECT "ThuTu" INTO new_bd_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
    SELECT "ThuTu" INTO new_kt_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";

    /* 2. Kiểm tra xem có dòng nào khác cùng LopMoId, cùng ThuTrongTuan mà bị giao khoảng tiết hay không */
    IF EXISTS (
        SELECT 1 
        FROM "LICHHOCLOP" lh
        JOIN "TIETHOC" bd ON lh."MaTietBatDau" = bd."MaTiet"
        JOIN "TIETHOC" kt ON lh."MaTietKetThuc" = kt."MaTiet"
        WHERE lh."LopMoId" = NEW."LopMoId"
          AND lh."ThuTrongTuan" = NEW."ThuTrongTuan"
          -- Loại trừ chính dòng hiện tại khi thực hiện thao tác UPDATE
          AND lh.id IS DISTINCT FROM NEW.id
          -- Công thức kiểm tra giao nhau: bd1.ThuTu <= kt2.ThuTu AND bd2.ThuTu <= kt1.ThuTu
          AND new_bd_thutu <= kt."ThuTu"
          AND bd."ThuTu" <= new_kt_thutu
    ) THEN
        RAISE EXCEPTION 'RBTV12: Lớp mở này đã có lịch học khác trùng/giao khoảng tiết vào Thứ %.', NEW."ThuTrongTuan";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LICHHOCLOP
DROP TRIGGER IF EXISTS trg_rbtv12_lichhoclop_ins_upd ON "LICHHOCLOP";
CREATE TRIGGER trg_rbtv12_lichhoclop_ins_upd
BEFORE INSERT OR UPDATE OF "LopMoId", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc" ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv12_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv12_tiethoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ xử lý kiểm tra nếu thứ tự của tiết học thực sự bị thay đổi */
    IF NEW."ThuTu" IS DISTINCT FROM OLD."ThuTu" THEN
        
        /* Kiểm tra xem việc đổi thứ tự tiết này có làm bất kỳ lớp mở nào bị tự trùng lịch hay không */
        IF EXISTS (
            SELECT 1
            -- Tự bắt cặp nối lhl1 và lhl2 để tìm cặp lịch học bị xung đột trong cùng một lớp mở
            FROM "LICHHOCLOP" lh1
            JOIN "LICHHOCLOP" lh2 ON lh1."LopMoId" = lh2."LopMoId" 
                                 AND lh1."ThuTrongTuan" = lh2."ThuTrongTuan" 
                                 AND lh1.id < lh2.id
            -- Tham chiếu thứ tự của ca học thứ nhất
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            -- Tham chiếu thứ tự của ca học thứ hai
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE 
                -- Áp dụng giá trị ThuTu mới nếu mã tiết trùng với tiết vừa sửa, ngược lại giữ nguyên ThuTu cũ
                (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) <= 
                (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
                AND
                (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END) <= 
                (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END)
        ) THEN
            RAISE EXCEPTION 'RBTV12: Không thể sửa ThuTu của tiết học này vì sẽ gián tiếp làm trùng lịch của một lớp mở đang vận hành.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng TIETHOC
DROP TRIGGER IF EXISTS trg_rbtv12_tiethoc_upd ON "TIETHOC";
CREATE TRIGGER trg_rbtv12_tiethoc_upd
BEFORE UPDATE OF "ThuTu" ON "TIETHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv12_tiethoc();
--RBTV13
CREATE OR REPLACE FUNCTION fn_check_rbtv13_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    v_mahocky VARCHAR(15);
    v_trangthai BOOLEAN;
    v_bd_thutu INT;
    v_kt_thutu INT;
BEGIN
    /* Bỏ qua kiểm tra nếu lịch học chưa được xếp phòng */
    IF NEW."PhongHoc" IS NULL OR TRIM(NEW."PhongHoc") = '' THEN
        RETURN NEW;
    END IF;

    /* Lấy thông tin Học kỳ và Trạng thái của Lớp mở hiện tại */
    SELECT "MaHocKy", "TrangThai" INTO v_mahocky, v_trangthai
    FROM "LOPMO"
    WHERE id = NEW."LopMoId";

    /* Bỏ qua nếu lớp mở này đã ngừng hoạt động */
    IF NOT v_trangthai THEN
        RETURN NEW;
    END IF;

    /* Lấy thứ tự (ThuTu) của tiết bắt đầu và kết thúc */
    SELECT "ThuTu" INTO v_bd_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
    SELECT "ThuTu" INTO v_kt_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";

    /* Kiểm tra trùng phòng học (Giao nhau về thời gian, cùng phòng, cùng thứ, cùng học kỳ) */
    IF EXISTS (
        SELECT 1
        FROM "LICHHOCLOP" lh
        JOIN "LOPMO" lm ON lh."LopMoId" = lm.id
        JOIN "TIETHOC" bd ON lh."MaTietBatDau" = bd."MaTiet"
        JOIN "TIETHOC" kt ON lh."MaTietKetThuc" = kt."MaTiet"
        WHERE lh.id IS DISTINCT FROM NEW.id -- Loại trừ chính nó khi UPDATE
          AND lh."PhongHoc" = NEW."PhongHoc"
          AND lh."ThuTrongTuan" = NEW."ThuTrongTuan"
          AND lm."MaHocKy" = v_mahocky
          AND lm."TrangThai" = TRUE -- Chỉ xét các lớp đang hoạt động
          -- Công thức kiểm tra giao khoảng tiết
          AND v_bd_thutu <= kt."ThuTu"
          AND bd."ThuTu" <= v_kt_thutu
    ) THEN
        RAISE EXCEPTION 'RBTV13: Phòng % đã có lớp khác học vào Thứ % (Học kỳ %).', NEW."PhongHoc", NEW."ThuTrongTuan", v_mahocky;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv13_lichhoclop_ins_upd ON "LICHHOCLOP";
CREATE TRIGGER trg_rbtv13_lichhoclop_ins_upd
BEFORE INSERT OR UPDATE OF "PhongHoc", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "LopMoId" ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv13_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv13_lopmo()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu lớp chuyển sang trạng thái HOẠT ĐỘNG, 
       và có sự thay đổi về Học kỳ hoặc Trạng thái. */
    IF NEW."TrangThai" = TRUE AND (NEW."TrangThai" IS DISTINCT FROM OLD."TrangThai" OR NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy") THEN
        
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" lh1
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            -- Tìm lịch học của lớp khác cùng phòng, cùng thứ
            JOIN "LICHHOCLOP" lh2 ON lh1."PhongHoc" = lh2."PhongHoc" 
                                 AND lh1."ThuTrongTuan" = lh2."ThuTrongTuan"
                                 AND lh1.id <> lh2.id
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE lh1."LopMoId" = NEW.id
              AND lh1."PhongHoc" IS NOT NULL AND TRIM(lh1."PhongHoc") <> ''
              AND lm2."MaHocKy" = NEW."MaHocKy"
              AND lm2."TrangThai" = TRUE
              -- Công thức kiểm tra giao khoảng tiết
              AND bd1."ThuTu" <= kt2."ThuTu"
              AND bd2."ThuTu" <= kt1."ThuTu"
        ) THEN
            RAISE EXCEPTION 'RBTV13: Cập nhật thông tin lớp mở (%) gây trùng lịch phòng học trong học kỳ %.', NEW.id, NEW."MaHocKy";
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv13_lopmo_upd ON "LOPMO";
CREATE TRIGGER trg_rbtv13_lopmo_upd
BEFORE UPDATE OF "MaHocKy", "TrangThai" ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv13_lopmo();
CREATE OR REPLACE FUNCTION fn_check_rbtv13_tiethoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ quét lại hệ thống nếu ThuTu thực sự bị thay đổi */
    IF NEW."ThuTu" IS DISTINCT FROM OLD."ThuTu" THEN
        
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" lh1
            JOIN "LOPMO" lm1 ON lh1."LopMoId" = lm1.id
            -- Tìm cặp lịch học bất kỳ trùng phòng, trùng thứ
            JOIN "LICHHOCLOP" lh2 ON lh1."PhongHoc" = lh2."PhongHoc"
                                  AND lh1."ThuTrongTuan" = lh2."ThuTrongTuan"
                                  AND lh1.id < lh2.id -- id < id để tránh bắt chéo 2 lần
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE lh1."PhongHoc" IS NOT NULL AND TRIM(lh1."PhongHoc") <> ''
              AND lm1."MaHocKy" = lm2."MaHocKy" -- Cùng học kỳ
              AND lm1."TrangThai" = TRUE 
              AND lm2."TrangThai" = TRUE -- Các lớp đều đang hoạt động
              -- Gắn ThuTu mới vào phép so sánh nếu mã tiết khớp với tiết đang sửa
              AND (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) <= 
                  (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
              AND (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END) <= 
                  (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END)
        ) THEN
            RAISE EXCEPTION 'RBTV13: Sửa ThuTu của tiết học này gián tiếp làm trùng phòng học giữa các lớp đang hoạt động.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv13_tiethoc_upd ON "TIETHOC";
CREATE TRIGGER trg_rbtv13_tiethoc_upd
BEFORE UPDATE OF "ThuTu" ON "TIETHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv13_tiethoc();
--RBTV14
CREATE OR REPLACE FUNCTION fn_check_rbtv14_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    v_mahocky VARCHAR(15);
    v_giangvien VARCHAR(100);
    v_trangthai BOOLEAN;
    v_bd_thutu INT;
    v_kt_thutu INT;
BEGIN
    /* Lấy thông tin Học kỳ, Trạng thái lớp mở và Giảng viên */
    SELECT lm."MaHocKy", lm."TrangThai", l."GiangVien" 
    INTO v_mahocky, v_trangthai, v_giangvien
    FROM "LOPMO" lm
    JOIN "LOP" l ON lm."MaLop" = l."MaLop"
    WHERE lm.id = NEW."LopMoId";

    /* Bỏ qua nếu không có giảng viên hoặc lớp mở đang bị vô hiệu hóa */
    IF v_giangvien IS NULL OR TRIM(v_giangvien) = '' OR NOT v_trangthai THEN
        RETURN NEW;
    END IF;

    /* Lấy thứ tự (ThuTu) của tiết bắt đầu và kết thúc */
    SELECT "ThuTu" INTO v_bd_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
    SELECT "ThuTu" INTO v_kt_thutu FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";

    /* Kiểm tra xem giảng viên có bị trùng lịch trong cùng học kỳ không */
    IF EXISTS (
        SELECT 1
        FROM "LICHHOCLOP" lh
        JOIN "LOPMO" lm ON lh."LopMoId" = lm.id
        JOIN "LOP" l ON lm."MaLop" = l."MaLop"
        JOIN "TIETHOC" bd ON lh."MaTietBatDau" = bd."MaTiet"
        JOIN "TIETHOC" kt ON lh."MaTietKetThuc" = kt."MaTiet"
        WHERE lh.id IS DISTINCT FROM NEW.id 
          AND l."GiangVien" = v_giangvien
          AND lh."ThuTrongTuan" = NEW."ThuTrongTuan"
          AND lm."MaHocKy" = v_mahocky
          AND lm."TrangThai" = TRUE
          -- Công thức kiểm tra giao khoảng tiết
          AND v_bd_thutu <= kt."ThuTu"
          AND bd."ThuTu" <= v_kt_thutu
    ) THEN
        RAISE EXCEPTION 'RBTV14: Giảng viên % đã có lịch dạy trùng thời gian vào Thứ % (Học kỳ %).', v_giangvien, NEW."ThuTrongTuan", v_mahocky;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv14_lichhoclop_ins_upd ON "LICHHOCLOP";
CREATE TRIGGER trg_rbtv14_lichhoclop_ins_upd
BEFORE INSERT OR UPDATE OF "LopMoId", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc" ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv14_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv14_lop()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu tên giảng viên có sự thay đổi và không rỗng */
    IF NEW."GiangVien" IS NOT NULL AND TRIM(NEW."GiangVien") <> '' 
       AND NEW."GiangVien" IS DISTINCT FROM OLD."GiangVien" THEN
        
        IF EXISTS (
            SELECT 1
            -- Các ca học thuộc về lớp đang được cập nhật giảng viên
            FROM "LICHHOCLOP" lh1
            JOIN "LOPMO" lm1 ON lh1."LopMoId" = lm1.id
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            -- Tham chiếu với các ca học của các lớp khác do chính GV này dạy
            JOIN "LICHHOCLOP" lh2 ON lh1."ThuTrongTuan" = lh2."ThuTrongTuan" AND lh1.id <> lh2.id
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id
            JOIN "LOP" l2 ON lm2."MaLop" = l2."MaLop"
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE lm1."MaLop" = NEW."MaLop" 
              AND lm1."TrangThai" = TRUE
              AND lm2."TrangThai" = TRUE
              AND lm1."MaHocKy" = lm2."MaHocKy"
              AND l2."GiangVien" = NEW."GiangVien"
              -- Công thức kiểm tra giao khoảng tiết
              AND bd1."ThuTu" <= kt2."ThuTu"
              AND bd2."ThuTu" <= kt1."ThuTu"
        ) THEN
            RAISE EXCEPTION 'RBTV14: Việc phân công giảng viên % cho lớp % gây trùng lịch dạy hiện hữu của giảng viên này.', NEW."GiangVien", NEW."MaLop";
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv14_lop_upd ON "LOP";
CREATE TRIGGER trg_rbtv14_lop_upd
BEFORE UPDATE OF "GiangVien" ON "LOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv14_lop();
CREATE OR REPLACE FUNCTION fn_check_rbtv14_lopmo()
RETURNS TRIGGER AS $$
DECLARE
    v_giangvien VARCHAR(100);
BEGIN
    /* Lấy tên giảng viên của lớp này */
    SELECT "GiangVien" INTO v_giangvien FROM "LOP" WHERE "MaLop" = NEW."MaLop";

    /* Tiến hành kiểm tra nếu lớp có giảng viên và lớp đang được kích hoạt hoặc dời học kỳ */
    IF v_giangvien IS NOT NULL AND TRIM(v_giangvien) <> '' 
       AND NEW."TrangThai" = TRUE 
       AND (NEW."TrangThai" IS DISTINCT FROM OLD."TrangThai" OR NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy") THEN
        
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" lh1
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            JOIN "LICHHOCLOP" lh2 ON lh1."ThuTrongTuan" = lh2."ThuTrongTuan" AND lh1.id <> lh2.id
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id
            JOIN "LOP" l2 ON lm2."MaLop" = l2."MaLop"
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            WHERE lh1."LopMoId" = NEW.id
              AND lm2."TrangThai" = TRUE
              AND lm2."MaHocKy" = NEW."MaHocKy"
              AND l2."GiangVien" = v_giangvien
              -- Công thức kiểm tra giao khoảng tiết
              AND bd1."ThuTu" <= kt2."ThuTu"
              AND bd2."ThuTu" <= kt1."ThuTu"
        ) THEN
            RAISE EXCEPTION 'RBTV14: Cập nhật lớp mở % gây trùng lịch dạy của giảng viên % trong học kỳ %.', NEW.id, v_giangvien, NEW."MaHocKy";
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv14_lopmo_upd ON "LOPMO";
CREATE TRIGGER trg_rbtv14_lopmo_upd
BEFORE UPDATE OF "MaHocKy", "TrangThai" ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv14_lopmo();
CREATE OR REPLACE FUNCTION fn_check_rbtv14_tiethoc()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ quét lại hệ thống nếu ThuTu thực sự bị cập nhật */
    IF NEW."ThuTu" IS DISTINCT FROM OLD."ThuTu" THEN
        IF EXISTS (
            SELECT 1
            FROM "LICHHOCLOP" lh1
            JOIN "LOPMO" lm1 ON lh1."LopMoId" = lm1.id
            JOIN "LOP" l1 ON lm1."MaLop" = l1."MaLop"
            -- Bắt cặp với các lịch học khác để tìm xung đột
            JOIN "LICHHOCLOP" lh2 ON lh1."ThuTrongTuan" = lh2."ThuTrongTuan" AND lh1.id < lh2.id
            JOIN "LOPMO" lm2 ON lh2."LopMoId" = lm2.id
            JOIN "LOP" l2 ON lm2."MaLop" = l2."MaLop"
            
            JOIN "TIETHOC" bd1 ON lh1."MaTietBatDau" = bd1."MaTiet"
            JOIN "TIETHOC" kt1 ON lh1."MaTietKetThuc" = kt1."MaTiet"
            JOIN "TIETHOC" bd2 ON lh2."MaTietBatDau" = bd2."MaTiet"
            JOIN "TIETHOC" kt2 ON lh2."MaTietKetThuc" = kt2."MaTiet"
            
            WHERE l1."GiangVien" IS NOT NULL AND TRIM(l1."GiangVien") <> ''
              AND l1."GiangVien" = l2."GiangVien"
              AND lm1."MaHocKy" = lm2."MaHocKy"
              AND lm1."TrangThai" = TRUE 
              AND lm2."TrangThai" = TRUE
              -- Gắn ThuTu mới vào phép đối chiếu
              AND (CASE WHEN lh1."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd1."ThuTu" END) <= 
                  (CASE WHEN lh2."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt2."ThuTu" END)
              AND (CASE WHEN lh2."MaTietBatDau" = NEW."MaTiet" THEN NEW."ThuTu" ELSE bd2."ThuTu" END) <= 
                  (CASE WHEN lh1."MaTietKetThuc" = NEW."MaTiet" THEN NEW."ThuTu" ELSE kt1."ThuTu" END)
        ) THEN
            RAISE EXCEPTION 'RBTV14: Sửa ThuTu của tiết học này gián tiếp làm trùng lịch dạy của giảng viên.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv14_tiethoc_upd ON "TIETHOC";
CREATE TRIGGER trg_rbtv14_tiethoc_upd
BEFORE UPDATE OF "ThuTu" ON "TIETHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv14_tiethoc();
--RBTV15
CREATE OR REPLACE FUNCTION fn_check_rbtv15_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    v_malop VARCHAR(20);
    v_mahocky VARCHAR(15);
BEGIN
    /* Lấy MaLop và MaHocKy của lớp mở đang bị ảnh hưởng (dựa trên dữ liệu cũ OLD) */
    SELECT "MaLop", "MaHocKy" INTO v_malop, v_mahocky
    FROM "LOPMO"
    WHERE id = OLD."LopMoId";

    /* Kiểm tra xem lớp mở này đã có sinh viên nào đăng ký thành công chưa */
    IF EXISTS (
        SELECT 1
        FROM "CHITIETDANGKY" ctdk
        JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
        WHERE ctdk."MaLop" = v_malop
          AND pdk."MaHocKy" = v_mahocky
          AND ctdk."TrangThai" = 'Đã đăng ký'
    ) THEN
        RAISE EXCEPTION 'RBTV15: Không thể sửa hoặc xóa lịch học. Lớp % trong học kỳ % đã có sinh viên đăng ký.', v_malop, v_mahocky;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LICHHOCLOP
DROP TRIGGER IF EXISTS trg_rbtv15_lichhoclop_del_upd ON "LICHHOCLOP";
CREATE TRIGGER trg_rbtv15_lichhoclop_del_upd
BEFORE DELETE OR UPDATE OF "LopMoId", "ThuTrongTuan", "MaTietBatDau", "MaTietKetThuc", "PhongHoc" 
ON "LICHHOCLOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv15_lichhoclop();
CREATE OR REPLACE FUNCTION fn_check_rbtv15_lopmo()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu thực sự có sự thay đổi về mã lớp hoặc mã học kỳ */
    IF NEW."MaLop" IS DISTINCT FROM OLD."MaLop" OR NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy" THEN
        
        /* Kiểm tra xem lớp mở này có đang chứa lịch học nào không */
        IF EXISTS (SELECT 1 FROM "LICHHOCLOP" WHERE "LopMoId" = OLD.id) THEN
            
            /* Nếu có lịch học, tiếp tục kiểm tra xem đã có sinh viên đăng ký chưa */
            IF EXISTS (
                SELECT 1
                FROM "CHITIETDANGKY" ctdk
                JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
                WHERE ctdk."MaLop" = OLD."MaLop"
                  AND pdk."MaHocKy" = OLD."MaHocKy"
                  AND ctdk."TrangThai" = 'Đã đăng ký'
            ) THEN
                RAISE EXCEPTION 'RBTV15: Không thể đổi MaLop hoặc MaHocKy vì lớp mở này đang chứa lịch học và đã có sinh viên chốt đăng ký.';
            END IF;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOPMO
DROP TRIGGER IF EXISTS trg_rbtv15_lopmo_upd ON "LOPMO";
CREATE TRIGGER trg_rbtv15_lopmo_upd
BEFORE UPDATE OF "MaLop", "MaHocKy" ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv15_lopmo();
--RBTV17
CREATE OR REPLACE FUNCTION fn_check_rbtv17_phieudangky()
RETURNS TRIGGER AS $$
DECLARE
    v_ngaybatdau TIMESTAMP;
    v_ngayketthuc TIMESTAMP;
    v_trangthai VARCHAR(20);
BEGIN
    /* Lấy thông tin thời gian và trạng thái của học kỳ */
    SELECT "NgayBatDauDangKy", "NgayKetThucDangKy", "TrangThai"
    INTO v_ngaybatdau, v_ngayketthuc, v_trangthai
    FROM "HOCKY"
    WHERE "MaHocKy" = NEW."MaHocKy";

    /* Kiểm tra điều kiện thời gian và trạng thái */
    IF CURRENT_TIMESTAMP < v_ngaybatdau OR CURRENT_TIMESTAMP > v_ngayketthuc OR v_trangthai = 'Đã kết thúc' THEN
        RAISE EXCEPTION 'RBTV17: Không thể tạo phiếu đăng ký. Hiện tại không nằm trong thời gian đăng ký hoặc học kỳ đã kết thúc.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng PHIEUDANGKY
DROP TRIGGER IF EXISTS trg_rbtv17_phieudangky_ins ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv17_phieudangky_ins
BEFORE INSERT ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv17_phieudangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv17_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_ngaybatdau TIMESTAMP;
    v_ngayketthuc TIMESTAMP;
    v_trangthai VARCHAR(20);
BEGIN
    /* Lấy thông tin thời gian của học kỳ thông qua PhieuDangKy */
    SELECT hk."NgayBatDauDangKy", hk."NgayKetThucDangKy", hk."TrangThai"
    INTO v_ngaybatdau, v_ngayketthuc, v_trangthai
    FROM "PHIEUDANGKY" pdk
    JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
    WHERE pdk."SoPhieu" = NEW."SoPhieu";

    /* TH 1: Thêm mới hoặc chuyển sang 'Đã đăng ký' */
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        IF CURRENT_TIMESTAMP < v_ngaybatdau OR CURRENT_TIMESTAMP > v_ngayketthuc OR v_trangthai = 'Đã kết thúc' THEN
            RAISE EXCEPTION 'RBTV17: Không thể đăng ký học phần ngoài khung thời gian quy định hoặc khi học kỳ đã kết thúc.';
        END IF;
        
    /* TH 2: Hủy chi tiết học phần */
    ELSIF NEW."TrangThai" = 'Đã hủy' THEN
        IF CURRENT_TIMESTAMP > v_ngayketthuc THEN
            RAISE EXCEPTION 'RBTV17: Không thể hủy học phần vì đã quá hạn kết thúc đăng ký của học kỳ.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng CHITIETDANGKY
DROP TRIGGER IF EXISTS trg_rbtv17_chitietdangky_ins_upd ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv17_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "TrangThai" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv17_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv17_hocky()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra khi có sự thay đổi thực sự về các cột thời gian hoặc trạng thái */
    IF NEW."NgayBatDauDangKy" IS DISTINCT FROM OLD."NgayBatDauDangKy"
       OR NEW."NgayKetThucDangKy" IS DISTINCT FROM OLD."NgayKetThucDangKy"
       OR NEW."TrangThai" IS DISTINCT FROM OLD."TrangThai" THEN

        /* 1. Kiểm tra mâu thuẫn với ngày lập của các Phiếu đăng ký hiện tại */
        IF EXISTS (
            SELECT 1 FROM "PHIEUDANGKY"
            WHERE "MaHocKy" = NEW."MaHocKy"
              AND ("NgayLap" < NEW."NgayBatDauDangKy" OR "NgayLap" > NEW."NgayKetThucDangKy" OR NEW."TrangThai" = 'Đã kết thúc')
        ) THEN
            RAISE EXCEPTION 'RBTV17: Không thể cập nhật học kỳ. Thời gian/Trạng thái mới gây mâu thuẫn với Ngày lập của các phiếu đăng ký hiện có.';
        END IF;

        /* 2. Kiểm tra mâu thuẫn với các Chi tiết Đã đăng ký */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            WHERE pdk."MaHocKy" = NEW."MaHocKy"
              AND ctdk."TrangThai" = 'Đã đăng ký'
              AND (ctdk."NgayDangKy" < NEW."NgayBatDauDangKy" OR ctdk."NgayDangKy" > NEW."NgayKetThucDangKy" OR NEW."TrangThai" = 'Đã kết thúc')
        ) THEN
            RAISE EXCEPTION 'RBTV17: Không thể cập nhật học kỳ. Thời gian mới gây mâu thuẫn với các chi tiết môn học đã đăng ký.';
        END IF;
        
        /* 3. Kiểm tra mâu thuẫn với các Chi tiết Đã hủy */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            WHERE pdk."MaHocKy" = NEW."MaHocKy"
              AND ctdk."TrangThai" = 'Đã hủy'
              AND ctdk."NgayHuy" > NEW."NgayKetThucDangKy"
        ) THEN
            RAISE EXCEPTION 'RBTV17: Không thể cập nhật học kỳ. Thời gian kết thúc mới gây mâu thuẫn với các chi tiết môn học đã bị hủy trước đó.';
        END IF;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng HOCKY
DROP TRIGGER IF EXISTS trg_rbtv17_hocky_upd ON "HOCKY";
CREATE TRIGGER trg_rbtv17_hocky_upd
BEFORE UPDATE OF "NgayBatDauDangKy", "NgayKetThucDangKy", "TrangThai" ON "HOCKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv17_hocky();
--RBTV18
CREATE OR REPLACE FUNCTION fn_check_rbtv18_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_mahocky VARCHAR(15);
BEGIN
    /* Chỉ kiểm tra nếu trạng thái của chi tiết là 'Đã đăng ký' */
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        
        /* Lấy MaHocKy từ phiếu đăng ký tương ứng */
        SELECT "MaHocKy" INTO v_mahocky
        FROM "PHIEUDANGKY"
        WHERE "SoPhieu" = NEW."SoPhieu";

        /* Kiểm tra sự tồn tại của lớp mở tương ứng */
        IF NOT EXISTS (
            SELECT 1 
            FROM "LOPMO"
            WHERE "MaHocKy" = v_mahocky
              AND "MaLop" = NEW."MaLop"
              AND "TrangThai" = TRUE
        ) THEN
            RAISE EXCEPTION 'RBTV18: Lớp % không được mở hoặc đã bị đóng trong học kỳ %.', NEW."MaLop", v_mahocky;
        END IF;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng CHITIETDANGKY
DROP TRIGGER IF EXISTS trg_rbtv18_chitietdangky_ins_upd ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv18_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "MaLop", "SoPhieu", "TrangThai" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv18_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv18_phieudangky()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu thực sự có sự thay đổi về học kỳ */
    IF NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy" THEN
        
        /* Kiểm tra xem có chi tiết đăng ký nào bị thiếu lớp mở tương ứng ở học kỳ mới không */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            WHERE ctdk."SoPhieu" = NEW."SoPhieu"
              AND ctdk."TrangThai" = 'Đã đăng ký'
              AND NOT EXISTS (
                  SELECT 1 
                  FROM "LOPMO" lm
                  WHERE lm."MaLop" = ctdk."MaLop"
                    AND lm."MaHocKy" = NEW."MaHocKy"
                    AND lm."TrangThai" = TRUE
              )
        ) THEN
            RAISE EXCEPTION 'RBTV18: Không thể chuyển phiếu % sang học kỳ %. Có lớp đăng ký chưa được mở trong học kỳ này.', NEW."SoPhieu", NEW."MaHocKy";
        END IF;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng PHIEUDANGKY
DROP TRIGGER IF EXISTS trg_rbtv18_phieudangky_upd ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv18_phieudangky_upd
BEFORE UPDATE OF "MaHocKy" ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv18_phieudangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv18_lopmo()
RETURNS TRIGGER AS $$
BEGIN
    /* Xác định thao tác XÓA hoặc SỬA làm vô hiệu hóa lớp mở hiện tại */
    IF TG_OP = 'DELETE' OR 
       (TG_OP = 'UPDATE' AND (NEW."TrangThai" = FALSE OR NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy" OR NEW."MaLop" IS DISTINCT FROM OLD."MaLop")) THEN
        
        /* Quét xem có sinh viên nào đang giữ đăng ký môn học này ở học kỳ tương ứng không */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            WHERE ctdk."MaLop" = OLD."MaLop"
              AND pdk."MaHocKy" = OLD."MaHocKy"
              AND ctdk."TrangThai" = 'Đã đăng ký'
        ) THEN
            RAISE EXCEPTION 'RBTV18: Không thể thao tác trên lớp mở % (HK: %) vì đã có sinh viên đăng ký môn này.', OLD."MaLop", OLD."MaHocKy";
        END IF;
        
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOPMO
DROP TRIGGER IF EXISTS trg_rbtv18_lopmo_del_upd ON "LOPMO";
CREATE TRIGGER trg_rbtv18_lopmo_del_upd
BEFORE DELETE OR UPDATE OF "TrangThai", "MaHocKy", "MaLop" ON "LOPMO"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv18_lopmo();
--RBTV 19
CREATE OR REPLACE FUNCTION fn_check_rbtv19_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_mamonhoc_goc VARCHAR(15);
BEGIN
    /* Lấy Mã môn học gốc của lớp tương ứng từ bảng LOP */
    SELECT "MaMonHoc" INTO v_mamonhoc_goc
    FROM "LOP"
    WHERE "MaLop" = NEW."MaLop";

    /* Đối chiếu với Mã môn học trong chi tiết đăng ký */
    IF NEW."MaMonHoc" IS DISTINCT FROM v_mamonhoc_goc THEN
        RAISE EXCEPTION 'RBTV19: Mã môn học trong chi tiết đăng ký (%) không khớp với cấu hình môn học của lớp % (%).', NEW."MaMonHoc", NEW."MaLop", v_mamonhoc_goc;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng CHITIETDANGKY
DROP TRIGGER IF EXISTS trg_rbtv19_chitietdangky_ins_upd ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv19_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "MaLop", "MaMonHoc" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv19_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv19_lop()
RETURNS TRIGGER AS $$
BEGIN
    /* Chỉ kiểm tra nếu thực sự có sự thay đổi về Mã môn học */
    IF NEW."MaMonHoc" IS DISTINCT FROM OLD."MaMonHoc" THEN
        
        /* Kiểm tra xem có chi tiết đăng ký nào đang trỏ vào lớp này nhưng mang mã môn học cũ hay không */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY"
            WHERE "MaLop" = NEW."MaLop"
              AND "MaMonHoc" IS DISTINCT FROM NEW."MaMonHoc"
        ) THEN
            RAISE EXCEPTION 'RBTV19: Không thể đổi mã môn học của lớp % sang %. Lớp này đã có chi tiết đăng ký ghi nhận theo mã môn học cũ.', NEW."MaLop", NEW."MaMonHoc";
        END IF;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOP
DROP TRIGGER IF EXISTS trg_rbtv19_lop_upd ON "LOP";
CREATE TRIGGER trg_rbtv19_lop_upd
BEFORE UPDATE OF "MaMonHoc" ON "LOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv19_lop();
--RBTV 20
CREATE OR REPLACE FUNCTION fn_check_rbtv20_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_sotinchi_goc INT;
    v_loaimon_goc VARCHAR(5);
BEGIN
    /* Lấy thông tin SoTinChi và LoaiMon của môn học thông qua lớp đang đăng ký */
    SELECT mh."SoTinChi", mh."LoaiMon" 
    INTO v_sotinchi_goc, v_loaimon_goc
    FROM "LOP" l
    JOIN "MONHOC" mh ON l."MaMonHoc" = mh."MaMonHoc"
    WHERE l."MaLop" = NEW."MaLop";

    /* Đối chiếu dữ liệu được truyền vào với dữ liệu gốc */
    IF NEW."SoTinChi" IS DISTINCT FROM v_sotinchi_goc OR NEW."LoaiMon" IS DISTINCT FROM v_loaimon_goc THEN
        RAISE EXCEPTION 'RBTV20: Dữ liệu không khớp. Lớp % yêu cầu LoaiMon là % và SoTinChi là % (Dữ liệu nhập: %, %).', 
                        NEW."MaLop", v_loaimon_goc, v_sotinchi_goc, NEW."LoaiMon", NEW."SoTinChi";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng CHITIETDANGKY
DROP TRIGGER IF EXISTS trg_rbtv20_chitietdangky_ins_upd ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv20_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "MaLop", "SoTinChi", "LoaiMon" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv20_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv20_lop()
RETURNS TRIGGER AS $$
DECLARE
    v_sotinchi_moi INT;
    v_loaimon_moi VARCHAR(5);
BEGIN
    IF NEW."MaMonHoc" IS DISTINCT FROM OLD."MaMonHoc" THEN
        
        /* Lấy thông tin của môn học mới vừa được gán */
        SELECT "SoTinChi", "LoaiMon" INTO v_sotinchi_moi, v_loaimon_moi
        FROM "MONHOC" 
        WHERE "MaMonHoc" = NEW."MaMonHoc";

        /* Quét xem có chi tiết đăng ký nào của lớp này bị mâu thuẫn với môn mới không */
        IF EXISTS (
            SELECT 1 
            FROM "CHITIETDANGKY"
            WHERE "MaLop" = NEW."MaLop"
              AND ("SoTinChi" IS DISTINCT FROM v_sotinchi_moi OR "LoaiMon" IS DISTINCT FROM v_loaimon_moi)
        ) THEN
            RAISE EXCEPTION 'RBTV20: Không thể đổi môn học của lớp %. Lớp này đã có sinh viên đăng ký với Số tín chỉ/Loại môn của môn học cũ.', NEW."MaLop";
        END IF;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng LOP
DROP TRIGGER IF EXISTS trg_rbtv20_lop_upd ON "LOP";
CREATE TRIGGER trg_rbtv20_lop_upd
BEFORE UPDATE OF "MaMonHoc" ON "LOP"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv20_lop();
CREATE OR REPLACE FUNCTION fn_check_rbtv20_monhoc()
RETURNS TRIGGER AS $$
DECLARE
    v_sotinchi_moi INT;
BEGIN
    IF NEW."LoaiMon" IS DISTINCT FROM OLD."LoaiMon" OR NEW."SoTiet" IS DISTINCT FROM OLD."SoTiet" THEN
        
        /* Tính toán trước số tín chỉ mới để đối chiếu (vì Trigger BEFORE chưa cập nhật cột GENERATED) */
        IF NEW."LoaiMon" = 'LT' THEN
            v_sotinchi_moi := NEW."SoTiet" / 15;
        ELSIF NEW."LoaiMon" = 'TH' THEN
            v_sotinchi_moi := NEW."SoTiet" / 30;
        ELSE
            v_sotinchi_moi := 0;
        END IF;

        /* Quét các chi tiết đăng ký đang trỏ về các lớp thuộc môn học này */
        IF EXISTS (
            SELECT 1
            FROM "CHITIETDANGKY" ctdk
            JOIN "LOP" l ON ctdk."MaLop" = l."MaLop"
            WHERE l."MaMonHoc" = NEW."MaMonHoc"
              AND (ctdk."SoTinChi" IS DISTINCT FROM v_sotinchi_moi OR ctdk."LoaiMon" IS DISTINCT FROM NEW."LoaiMon")
        ) THEN
            RAISE EXCEPTION 'RBTV20: Không thể đổi Loại môn hoặc Số tiết. Hành động này làm sai lệch Số tín chỉ/Loại môn của sinh viên đã đăng ký môn này trước đó.';
        END IF;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng MONHOC
DROP TRIGGER IF EXISTS trg_rbtv20_monhoc_upd ON "MONHOC";
CREATE TRIGGER trg_rbtv20_monhoc_upd
BEFORE UPDATE OF "LoaiMon", "SoTiet" ON "MONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv20_monhoc();
--RBTV 21
CREATE OR REPLACE FUNCTION fn_lay_don_gia(
    p_LoaiMon VARCHAR,
    p_LoaiGia VARCHAR,
    p_MaHocKy VARCHAR
) RETURNS DECIMAL AS $$
DECLARE
    v_DonGia DECIMAL(12,0);
BEGIN
    SELECT "DonGia" INTO v_DonGia
    FROM "DONGIATINCHI"
    WHERE "LoaiMon" = p_LoaiMon
      AND "LoaiHoc" = p_LoaiGia
      AND "TrangThai" = TRUE
      AND ("MaHocKy" = p_MaHocKy OR "MaHocKy" IS NULL)
    ORDER BY "MaHocKy" DESC NULLS LAST
    LIMIT 1;

    IF v_DonGia IS NULL THEN
        RAISE EXCEPTION 'RBTV21: Không tìm thấy bảng giá áp dụng cho Loại môn: %, Loại học: %, Học kỳ: %.', p_LoaiMon, p_LoaiGia, p_MaHocKy;
    END IF;

    RETURN v_DonGia;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION fn_lay_don_gia(
    p_LoaiMon VARCHAR,
    p_LoaiGia VARCHAR,
    p_MaHocKy VARCHAR
) RETURNS DECIMAL AS $$
DECLARE
    v_DonGia DECIMAL(12,0);
BEGIN
    EXECUTE format(
        'SELECT %1$I FROM %2$I
         WHERE %3$I = $1
           AND %4$I = $2
           AND %5$I = TRUE
           AND COALESCE(%6$I, FALSE) = FALSE
           AND (%7$I = $3 OR %7$I IS NULL)
         ORDER BY CASE WHEN %7$I = $3 THEN 0 ELSE 1 END,
                  %8$I DESC NULLS LAST,
                  %9$I DESC
         LIMIT 1',
        'DonGia', 'DONGIATINCHI', 'LoaiMon', 'LoaiHoc', 'TrangThai', 'DaXoa', 'MaHocKy', 'NgayApDung', 'id'
    ) INTO v_DonGia
    USING p_LoaiMon, p_LoaiGia, p_MaHocKy;

    IF v_DonGia IS NULL THEN
        RAISE EXCEPTION 'RBTV21: Khong tim thay bang gia ap dung cho Loai mon: %, Loai hoc: %, Hoc ky: %.', p_LoaiMon, p_LoaiGia, p_MaHocKy;
    END IF;

    RETURN v_DonGia;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_check_rbtv21_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_MaHocKy VARCHAR(15);
    v_LoaiHocKy VARCHAR(20);
    v_LoaiGia VARCHAR(20);
    v_DonGia_Chuan DECIMAL(12,0);
    v_ThanhTien_Chuan DECIMAL(15,0);
BEGIN
    /* Lấy Học kỳ và Loại học kỳ từ Phiếu đăng ký gốc */
    SELECT pdk."MaHocKy", hk."LoaiHocKy" INTO v_MaHocKy, v_LoaiHocKy
    FROM "PHIEUDANGKY" pdk
    JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
    WHERE pdk."SoPhieu" = NEW."SoPhieu";

    /* BƯỚC 1: Xác định Loại Giá theo công thức */
    IF v_LoaiHocKy = 'Hè' AND NEW."LoaiDangKy" = 'hoc_moi' THEN
        v_LoaiGia := 'hoc_he';
    ELSE
        v_LoaiGia := NEW."LoaiDangKy";
    END IF;

    /* BƯỚC 2: Gọi hàm lấy Đơn giá chuẩn */
    v_DonGia_Chuan := fn_lay_don_gia(NEW."LoaiMon", v_LoaiGia, v_MaHocKy);

    /* BƯỚC 3: Tính Thành tiền chuẩn */
    v_ThanhTien_Chuan := NEW."SoTinChi" * v_DonGia_Chuan;

    /* BƯỚC 4: Đối chiếu */
    IF NEW."DonGia" != v_DonGia_Chuan OR NEW."ThanhTien" != v_ThanhTien_Chuan THEN
        RAISE EXCEPTION 'RBTV21: Sai lệch tài chính. Đơn giá yêu cầu: %, Thành tiền yêu cầu: % (Dữ liệu nhập: %, %)', 
                        v_DonGia_Chuan, v_ThanhTien_Chuan, NEW."DonGia", NEW."ThanhTien";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv21_chitietdangky_ins_upd ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv21_chitietdangky_ins_upd
BEFORE INSERT OR UPDATE OF "LoaiDangKy", "SoTinChi", "LoaiMon", "DonGia", "ThanhTien", "SoPhieu" ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_chitietdangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv21_phieudangky()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."MaHocKy" IS DISTINCT FROM OLD."MaHocKy" THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "SoPhieu" = NEW."SoPhieu") THEN
            RAISE EXCEPTION 'RBTV21: Không thể đổi Mã học kỳ. Phiếu % đã có môn đăng ký, thao tác này sẽ làm sai lệch Đơn giá và Thành tiền.', NEW."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv21_phieudangky_upd ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv21_phieudangky_upd
BEFORE UPDATE OF "MaHocKy" ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_phieudangky();
CREATE OR REPLACE FUNCTION fn_check_rbtv21_hocky()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."LoaiHocKy" IS DISTINCT FROM OLD."LoaiHocKy" THEN
        /* Chặn nếu đã có phiếu đăng ký chứa chi tiết học phần thuộc học kỳ này */
        IF EXISTS (
            SELECT 1 FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            WHERE pdk."MaHocKy" = NEW."MaHocKy"
        ) THEN
            RAISE EXCEPTION 'RBTV21: Không thể đổi Loại học kỳ. Đã có sinh viên đăng ký, thao tác này sẽ phá vỡ công thức tính Giá trị tín chỉ.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv21_hocky_upd ON "HOCKY";
CREATE TRIGGER trg_rbtv21_hocky_upd
BEFORE UPDATE OF "LoaiHocKy" ON "HOCKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_hocky();
CREATE OR REPLACE FUNCTION fn_check_rbtv21_dongiatinchi()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.bypass_pricing_guard', true) = '1' THEN
        RETURN NEW;
    END IF;

    IF NEW."DonGia" IS DISTINCT FROM OLD."DonGia" OR NEW."TrangThai" IS DISTINCT FROM OLD."TrangThai" THEN
        /* Quét xem có chi tiết đăng ký nào đang phụ thuộc vào cấu hình giá cũ này không */
        IF EXISTS (
            SELECT 1 FROM "CHITIETDANGKY" ctdk
            JOIN "PHIEUDANGKY" pdk ON ctdk."SoPhieu" = pdk."SoPhieu"
            JOIN "HOCKY" hk ON pdk."MaHocKy" = hk."MaHocKy"
            WHERE ctdk."LoaiMon" = OLD."LoaiMon"
              AND (CASE WHEN hk."LoaiHocKy" = 'Hè' AND ctdk."LoaiDangKy" = 'hoc_moi' THEN 'hoc_he' ELSE ctdk."LoaiDangKy" END) = OLD."LoaiHoc"
              AND (OLD."MaHocKy" IS NULL OR pdk."MaHocKy" = OLD."MaHocKy")
              AND ctdk."DonGia" = OLD."DonGia"
        ) THEN
            RAISE EXCEPTION 'RBTV21: Không thể sửa Đơn giá hoặc Trạng thái. Mức giá này đang được sử dụng trong các Phiếu đăng ký đã lưu.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv21_dongiatinchi_upd ON "DONGIATINCHI";
CREATE TRIGGER trg_rbtv21_dongiatinchi_upd
BEFORE UPDATE OF "DonGia", "TrangThai" ON "DONGIATINCHI"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_dongiatinchi();
CREATE OR REPLACE FUNCTION fn_check_rbtv21_monhoc()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."LoaiMon" IS DISTINCT FROM OLD."LoaiMon" OR NEW."SoTiet" IS DISTINCT FROM OLD."SoTiet" THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "MaMonHoc" = NEW."MaMonHoc") THEN
            RAISE EXCEPTION 'RBTV21: Không thể sửa Loại môn hoặc Số tiết. Việc này làm sai lệch công thức Đơn giá/Thành tiền của sinh viên đã đăng ký.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv21_monhoc_upd ON "MONHOC";
CREATE TRIGGER trg_rbtv21_monhoc_upd
BEFORE UPDATE OF "LoaiMon", "SoTiet" ON "MONHOC"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv21_monhoc();
--RBTV 24
CREATE OR REPLACE FUNCTION fn_check_rbtv24_gioihan_tinchi()
RETURNS TRIGGER AS $$
DECLARE
    v_MaSv VARCHAR(15);
    v_MaHocKy VARCHAR(15);
    v_TongTinChi INTEGER := 0;
    
    -- Bien luu tham so he thong
    v_SoTinChiDangKyToiDa INTEGER;
    v_SoTinChiDangKyToiDaKhiVuot INTEGER;
    v_NamKiemTraAnhVan INTEGER;
    v_GioiHanTinChiChuaDatAnhVan INTEGER;
    v_DanhSachMonAnhVanBatBuoc VARCHAR(200);
    
    -- Bien phuc vu logic kiem tra
    v_GioiHanHienTai INTEGER;
    v_NgayNhapHoc DATE;
    v_NamBatDauHocKy INTEGER;
    v_ThuTuHocKy INTEGER;
    v_MaxThuTuChinh INTEGER;
    v_NamThuHoc INTEGER;
    v_ToiHanKiemTra BOOLEAN := FALSE;
    v_SoMonAnhVanYeuCau INTEGER;
    v_SoMonAnhVanDaDat INTEGER;
BEGIN
    -- 1. Xac dinh MaSv va MaHocKy tuong ung voi bang dang thao tac
    IF TG_TABLE_NAME = 'CHITIETDANGKY' THEN
        SELECT "MaSv", "MaHocKy" INTO v_MaSv, v_MaHocKy
        FROM "PHIEUDANGKY" WHERE "SoPhieu" = NEW."SoPhieu";
    ELSIF TG_TABLE_NAME = 'PHIEUDANGKY' THEN
        v_MaSv := NEW."MaSv";
        v_MaHocKy := NEW."MaHocKy";
    END IF;

    IF v_MaSv IS NULL OR v_MaHocKy IS NULL THEN
        RETURN NEW;
    END IF;

    -- 2. Lay cac tham so he thong
    SELECT "SoTinChiDangKyToiDa", "SoTinChiDangKyToiDaKhiVuot", "NamKiemTraAnhVan", "GioiHanTinChiChuaDatAnhVan", "DanhSachMonAnhVanBatBuoc"
    INTO v_SoTinChiDangKyToiDa, v_SoTinChiDangKyToiDaKhiVuot, v_NamKiemTraAnhVan, v_GioiHanTinChiChuaDatAnhVan, v_DanhSachMonAnhVanBatBuoc
    FROM "THAMSO" WHERE id = 1;

    -- 3. Tinh TongTinChiDangKy hien tai
    SELECT COALESCE(SUM(ct."SoTinChi"), 0) INTO v_TongTinChi
    FROM "CHITIETDANGKY" ct
    JOIN "PHIEUDANGKY" p ON ct."SoPhieu" = p."SoPhieu"
    WHERE p."MaSv" = v_MaSv AND p."MaHocKy" = v_MaHocKy
      AND ct."TrangThai" = 'Đã đăng ký'
      AND (TG_TABLE_NAME <> 'CHITIETDANGKY' OR ct.id <> NEW.id);

    -- Cong them tin chi cua ban ghi dang them/sua neu no co trang thai 'Đã đăng ký'
    IF TG_TABLE_NAME = 'CHITIETDANGKY' AND NEW."TrangThai" = 'Đã đăng ký' THEN
        v_TongTinChi := v_TongTinChi + NEW."SoTinChi";
    END IF;

    -- 4. Kiem tra lo trinh Anh van
    SELECT "NgayNhapHoc" INTO v_NgayNhapHoc FROM "SINHVIEN" WHERE "MaSv" = v_MaSv;

    SELECT n."NamBatDau", hk."ThuTu"
    INTO v_NamBatDauHocKy, v_ThuTuHocKy
    FROM "HOCKY" hk
    JOIN "NAMHOC" n ON hk."MaNamHoc" = n."MaNamHoc"
    WHERE hk."MaHocKy" = v_MaHocKy;

    -- Tinh nam hoc hien tai cua sinh vien (tu ngay nhap hoc)
    v_NamThuHoc := v_NamBatDauHocKy - EXTRACT(YEAR FROM v_NgayNhapHoc) + 1;

    -- Lay thu tu hoc ky chinh cuoi cung trong nam hoc de xet "hoc ky cuoi"
    SELECT COALESCE(MAX(hk2."ThuTu"), 2) INTO v_MaxThuTuChinh
    FROM "HOCKY" hk2
    JOIN "NAMHOC" n2 ON hk2."MaNamHoc" = n2."MaNamHoc"
    WHERE n2."NamBatDau" = v_NamBatDauHocKy AND hk2."LoaiHocKy" = 'Chính';

    -- Xac dinh xem sinh vien da cham moc "hoc ky cuoi cua nam thu X" chua
    IF v_NamThuHoc > v_NamKiemTraAnhVan OR (v_NamThuHoc = v_NamKiemTraAnhVan AND v_ThuTuHocKy >= v_MaxThuTuChinh) THEN
        v_ToiHanKiemTra := TRUE;
    END IF;

    v_GioiHanHienTai := v_SoTinChiDangKyToiDa;

    -- 5. Kiem tra danh sach mon Anh van neu da toi han
    IF v_ToiHanKiemTra THEN
        -- Dem so luong mon bat buoc (xu ly mang an toan loai bo khoang trang)
        v_SoMonAnhVanYeuCau := array_length(string_to_array(REPLACE(v_DanhSachMonAnhVanBatBuoc, ' ', ''), ','), 1);

        -- Dem so luong mon Anh van da 'qua_mon'
        SELECT COUNT(DISTINCT "MaMonHoc") INTO v_SoMonAnhVanDaDat
        FROM "MONDAHOC"
        WHERE "MaSv" = v_MaSv
          AND "KetQua" = 'qua_mon'
          AND "MaMonHoc" = ANY(string_to_array(REPLACE(v_DanhSachMonAnhVanBatBuoc, ' ', ''), ','));

        -- Ap dung phat neu chua du
        IF COALESCE(v_SoMonAnhVanDaDat, 0) < COALESCE(v_SoMonAnhVanYeuCau, 0) THEN
            v_GioiHanHienTai := v_GioiHanTinChiChuaDatAnhVan;
        END IF;
    END IF;

    -- 6. Danh gia vi pham
    IF v_TongTinChi > v_SoTinChiDangKyToiDaKhiVuot THEN
        RAISE EXCEPTION 'Tong tin chi (%) vuot qua gioi han he thong cho phep (%).', v_TongTinChi, v_SoTinChiDangKyToiDaKhiVuot;
    END IF;

    IF v_TongTinChi > v_GioiHanHienTai THEN
        RAISE EXCEPTION 'Tong tin chi (%) vuot qua gioi han (%). SV co the chua dat dieu kien Anh van bat buoc.', v_TongTinChi, v_GioiHanHienTai;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv24_chitietdangky ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv24_chitietdangky
BEFORE INSERT OR UPDATE OF "TrangThai", "SoTinChi", "SoPhieu"
ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv24_gioihan_tinchi();
DROP TRIGGER IF EXISTS trg_rbtv24_phieudangky ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv24_phieudangky
BEFORE UPDATE OF "MaSv", "MaHocKy", "TrangThai"
ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_check_rbtv24_gioihan_tinchi();
--RBTV 25
CREATE OR REPLACE FUNCTION fn_rbtv25_sync_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_SoPhieu INTEGER;
BEGIN
    -- 1. Xac dinh SoPhieu can dong bo
    IF TG_OP = 'DELETE' THEN
        v_SoPhieu := OLD."SoPhieu";
    ELSE
        v_SoPhieu := NEW."SoPhieu";
    END IF;

    -- 2. Thuc hien cap nhat lai toan bo cot tong hop tren PHIEUDANGKY
    UPDATE "PHIEUDANGKY"
    SET 
        "TongTinChi" = agg.tong_tc,
        "TongTienDangKy" = agg.tong_tien,
        "SoMonHocMoi" = agg.sm_moi,
        "SoTinChiHocMoi" = agg.stc_moi,
        "TienHocMoi" = agg.tien_moi,
        "SoMonHocLai" = agg.sm_lai,
        "SoTinChiHocLai" = agg.stc_lai,
        "TienHocLai" = agg.tien_lai,
        "SoMonHocCaiThien" = agg.sm_ct,
        "SoTinChiHocCaiThien" = agg.stc_ct,
        "TienHocCaiThien" = agg.tien_ct
    FROM (
        SELECT 
            COALESCE(SUM("SoTinChi"), 0)::INTEGER AS tong_tc,
            COALESCE(SUM("ThanhTien"), 0)::DECIMAL AS tong_tien,
            
            COUNT(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN 1 END)::INTEGER AS sm_moi,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_moi,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_moi,
            
            COUNT(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN 1 END)::INTEGER AS sm_lai,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_lai,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_lai,
            
            COUNT(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN 1 END)::INTEGER AS sm_ct,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_ct,
            COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_ct
        FROM "CHITIETDANGKY"
        WHERE "SoPhieu" = v_SoPhieu AND "TrangThai" = 'Đã đăng ký'
    ) agg
    WHERE "PHIEUDANGKY"."SoPhieu" = v_SoPhieu;

    -- 3. Xu ly rieng truong hop UPDATE thay doi SoPhieu (chuyen chi tiet tu phieu cu sang phieu moi)
    IF TG_OP = 'UPDATE' AND OLD."SoPhieu" <> NEW."SoPhieu" THEN
        UPDATE "PHIEUDANGKY"
        SET 
            "TongTinChi" = agg.tong_tc,
            "TongTienDangKy" = agg.tong_tien,
            "SoMonHocMoi" = agg.sm_moi,
            "SoTinChiHocMoi" = agg.stc_moi,
            "TienHocMoi" = agg.tien_moi,
            "SoMonHocLai" = agg.sm_lai,
            "SoTinChiHocLai" = agg.stc_lai,
            "TienHocLai" = agg.tien_lai,
            "SoMonHocCaiThien" = agg.sm_ct,
            "SoTinChiHocCaiThien" = agg.stc_ct,
            "TienHocCaiThien" = agg.tien_ct
        FROM (
            SELECT 
                COALESCE(SUM("SoTinChi"), 0)::INTEGER AS tong_tc,
                COALESCE(SUM("ThanhTien"), 0)::DECIMAL AS tong_tien,
                COUNT(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN 1 END)::INTEGER AS sm_moi,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_moi,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_moi,
                COUNT(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN 1 END)::INTEGER AS sm_lai,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_lai,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_lai,
                COUNT(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN 1 END)::INTEGER AS sm_ct,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "SoTinChi" ELSE 0 END), 0)::INTEGER AS stc_ct,
                COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "ThanhTien" ELSE 0 END), 0)::DECIMAL AS tien_ct
            FROM "CHITIETDANGKY"
            WHERE "SoPhieu" = OLD."SoPhieu" AND "TrangThai" = 'Đã đăng ký'
        ) agg
        WHERE "PHIEUDANGKY"."SoPhieu" = OLD."SoPhieu";
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gan Trigger vao cac thao tac thay doi du lieu chi tiet
DROP TRIGGER IF EXISTS trg_rbtv25_sync_chitietdangky ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv25_sync_chitietdangky
AFTER INSERT OR DELETE OR UPDATE OF "SoPhieu", "SoTinChi", "ThanhTien", "LoaiDangKy", "TrangThai"
ON "CHITIETDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv25_sync_chitietdangky();
CREATE OR REPLACE FUNCTION fn_rbtv25_check_phieudangky()
RETURNS TRIGGER AS $$
DECLARE
    v_TongTinChi INTEGER;
    v_TongTienDangKy DECIMAL;
    v_SoMonHocMoi INTEGER;
    v_SoTinChiHocMoi INTEGER;
    v_TienHocMoi DECIMAL;
    v_SoMonHocLai INTEGER;
    v_SoTinChiHocLai INTEGER;
    v_TienHocLai DECIMAL;
    v_SoMonHocCaiThien INTEGER;
    v_SoTinChiHocCaiThien INTEGER;
    v_TienHocCaiThien DECIMAL;
BEGIN
    -- Query lai cac con so thuc te dang ton tai o CHITIETDANGKY
    SELECT 
        COALESCE(SUM("SoTinChi"), 0),
        COALESCE(SUM("ThanhTien"), 0),
        COUNT(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN 1 END),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "SoTinChi" ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_moi' THEN "ThanhTien" ELSE 0 END), 0),
        COUNT(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN 1 END),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "SoTinChi" ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_lai' THEN "ThanhTien" ELSE 0 END), 0),
        COUNT(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN 1 END),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "SoTinChi" ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN "LoaiDangKy" = 'hoc_cai_thien' THEN "ThanhTien" ELSE 0 END), 0)
    INTO 
        v_TongTinChi, v_TongTienDangKy,
        v_SoMonHocMoi, v_SoTinChiHocMoi, v_TienHocMoi,
        v_SoMonHocLai, v_SoTinChiHocLai, v_TienHocLai,
        v_SoMonHocCaiThien, v_SoTinChiHocCaiThien, v_TienHocCaiThien
    FROM "CHITIETDANGKY"
    WHERE "SoPhieu" = NEW."SoPhieu" AND "TrangThai" = 'Đã đăng ký';

    -- So sanh voi gia tri NEW ma cau lennh UPDATE dinh cap nhat vao PHIEUDANGKY
    IF NEW."TongTinChi" <> v_TongTinChi OR 
       NEW."TongTienDangKy" <> v_TongTienDangKy OR
       NEW."SoMonHocMoi" <> v_SoMonHocMoi OR 
       NEW."SoTinChiHocMoi" <> v_SoTinChiHocMoi OR 
       NEW."TienHocMoi" <> v_TienHocMoi OR
       NEW."SoMonHocLai" <> v_SoMonHocLai OR 
       NEW."SoTinChiHocLai" <> v_SoTinChiHocLai OR 
       NEW."TienHocLai" <> v_TienHocLai OR
       NEW."SoMonHocCaiThien" <> v_SoMonHocCaiThien OR 
       NEW."SoTinChiHocCaiThien" <> v_SoTinChiHocCaiThien OR 
       NEW."TienHocCaiThien" <> v_TienHocCaiThien
    THEN
        RAISE EXCEPTION 'Loi RBTV25: Cac cot tong hop tren PHIEUDANGKY (SoPhieu: %) khong khop voi tong chi tiet thuc te.', NEW."SoPhieu";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gan Trigger check vao thao tac UPDATE cot tong hop
DROP TRIGGER IF EXISTS trg_rbtv25_check_phieudangky ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv25_check_phieudangky
BEFORE UPDATE OF "TrangThai", "TongTinChi", "TongTienDangKy", "SoMonHocMoi", "SoTinChiHocMoi", "TienHocMoi", "SoMonHocLai", "SoTinChiHocLai", "TienHocLai", "SoMonHocCaiThien", "SoTinChiHocCaiThien", "TienHocCaiThien"
ON "PHIEUDANGKY"
FOR EACH ROW
EXECUTE FUNCTION fn_rbtv25_check_phieudangky();
--RBTV 26
CREATE OR REPLACE FUNCTION check_rbtv26_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_ma_hoc_ky VARCHAR(15);
    v_sl_thuc_te INT;
    v_sl_dang_ky INT;
    v_sl_toi_da INT;
    v_ma_lop_check VARCHAR(20);
    v_so_phieu_check INT;
BEGIN
    -- Lấy thông tin dựa trên thao tác (OLD cho DELETE, NEW cho INSERT/UPDATE)
    IF TG_OP = 'DELETE' THEN
        v_ma_lop_check := OLD."MaLop";
        v_so_phieu_check := OLD."SoPhieu";
    ELSE
        v_ma_lop_check := NEW."MaLop";
        v_so_phieu_check := NEW."SoPhieu";
    END IF;

    -- Lấy MaHocKy từ phiếu đăng ký tương ứng
    SELECT "MaHocKy" INTO v_ma_hoc_ky
    FROM "PHIEUDANGKY"
    WHERE "SoPhieu" = v_so_phieu_check;

    -- Đếm số lượng thực tế
    SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
    FROM "CHITIETDANGKY" ct
    JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
    WHERE ct."MaLop" = v_ma_lop_check
      AND pdk."MaHocKy" = v_ma_hoc_ky
      AND ct."TrangThai" = 'Đã đăng ký';

    -- Lấy thông tin từ LOPMO và LOP
    SELECT "SoLuongDaDangKy" INTO v_sl_dang_ky
    FROM "LOPMO"
    WHERE "MaHocKy" = v_ma_hoc_ky AND "MaLop" = v_ma_lop_check;

    SELECT "SoLuongToiDa" INTO v_sl_toi_da
    FROM "LOP"
    WHERE "MaLop" = v_ma_lop_check;

    -- Kiểm tra điều kiện RBTV
    IF v_sl_dang_ky IS DISTINCT FROM v_sl_thuc_te THEN
        RAISE EXCEPTION 'RBTV26: Sĩ số đã đăng ký (%) không khớp số đăng ký thực tế (%) của lớp %.', v_sl_dang_ky, v_sl_thuc_te, v_ma_lop_check;
    END IF;

    IF v_sl_dang_ky < 0 OR v_sl_dang_ky > v_sl_toi_da THEN
        RAISE EXCEPTION 'RBTV26: Sĩ số (%) vượt quá sức chứa tối đa (%) của lớp %.', v_sl_dang_ky, v_sl_toi_da, v_ma_lop_check;
    END IF;

    -- Nếu là UPDATE và đổi lớp, cần kiểm tra thêm lớp cũ
    IF TG_OP = 'UPDATE' AND OLD."MaLop" <> NEW."MaLop" THEN
        -- Đếm thực tế lớp cũ
        SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
        FROM "CHITIETDANGKY" ct
        JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
        WHERE ct."MaLop" = OLD."MaLop"
          AND pdk."MaHocKy" = v_ma_hoc_ky
          AND ct."TrangThai" = 'Đã đăng ký';

        SELECT "SoLuongDaDangKy" INTO v_sl_dang_ky
        FROM "LOPMO"
        WHERE "MaHocKy" = v_ma_hoc_ky AND "MaLop" = OLD."MaLop";

        IF v_sl_dang_ky IS DISTINCT FROM v_sl_thuc_te THEN
            RAISE EXCEPTION 'RBTV26: Sĩ số đã đăng ký lớp cũ không khớp thực tế do đổi mã lớp.';
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chk_rbtv26_ctdk ON "CHITIETDANGKY";
CREATE CONSTRAINT TRIGGER trg_chk_rbtv26_ctdk
AFTER INSERT OR DELETE OR UPDATE OF "MaLop", "TrangThai"
ON "CHITIETDANGKY"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv26_chitietdangky();
CREATE OR REPLACE FUNCTION check_rbtv26_lopmo()
RETURNS TRIGGER AS $$
DECLARE
    v_sl_thuc_te INT;
    v_sl_toi_da INT;
BEGIN
    SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
    FROM "CHITIETDANGKY" ct
    JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
    WHERE ct."MaLop" = NEW."MaLop"
      AND pdk."MaHocKy" = NEW."MaHocKy"
      AND ct."TrangThai" = 'Đã đăng ký';

    SELECT "SoLuongToiDa" INTO v_sl_toi_da
    FROM "LOP"
    WHERE "MaLop" = NEW."MaLop";

    IF NEW."SoLuongDaDangKy" != v_sl_thuc_te THEN
        RAISE EXCEPTION 'RBTV26: Sĩ số trong LOPMO (%) không khớp với số đăng ký thực tế (%).', NEW."SoLuongDaDangKy", v_sl_thuc_te;
    END IF;

    IF NEW."SoLuongDaDangKy" < 0 OR NEW."SoLuongDaDangKy" > v_sl_toi_da THEN
        RAISE EXCEPTION 'RBTV26: Sĩ số cập nhật (%) vi phạm giới hạn của lớp (Tối đa: %).', NEW."SoLuongDaDangKy", v_sl_toi_da;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chk_rbtv26_lopmo ON "LOPMO";
CREATE CONSTRAINT TRIGGER trg_chk_rbtv26_lopmo
AFTER UPDATE OF "SoLuongDaDangKy", "TrangThai"
ON "LOPMO"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv26_lopmo();
CREATE OR REPLACE FUNCTION check_rbtv26_lop()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN (
        SELECT "MaHocKy", "SoLuongDaDangKy"
        FROM "LOPMO"
        WHERE "MaLop" = NEW."MaLop"
    ) LOOP
        IF rec."SoLuongDaDangKy" > NEW."SoLuongToiDa" THEN
            RAISE EXCEPTION 'RBTV26: Sức chứa mới (%) nhỏ hơn số sinh viên đã đăng ký (%) ở học kỳ %.', NEW."SoLuongToiDa", rec."SoLuongDaDangKy", rec."MaHocKy";
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chk_rbtv26_lop ON "LOP";
CREATE CONSTRAINT TRIGGER trg_chk_rbtv26_lop
AFTER UPDATE OF "SoLuongToiDa"
ON "LOP"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv26_lop();
CREATE OR REPLACE FUNCTION check_rbtv26_phieudangky()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
    v_sl_thuc_te INT;
    v_sl_dang_ky INT;
BEGIN
    -- Kiểm tra tất cả các lớp liên quan đến phiếu đăng ký bị cập nhật
    FOR rec IN (
        SELECT "MaLop" 
        FROM "CHITIETDANGKY" 
        WHERE "SoPhieu" = NEW."SoPhieu" AND "TrangThai" = 'Đã đăng ký'
    ) LOOP
        -- Kiểm tra thực tế ở học kỳ mới (hoặc cùng kỳ nếu chỉ đổi TrangThai)
        SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
        FROM "CHITIETDANGKY" ct
        JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
        WHERE ct."MaLop" = rec."MaLop"
          AND pdk."MaHocKy" = NEW."MaHocKy"
          AND ct."TrangThai" = 'Đã đăng ký';

        SELECT "SoLuongDaDangKy" INTO v_sl_dang_ky
        FROM "LOPMO"
        WHERE "MaHocKy" = NEW."MaHocKy" AND "MaLop" = rec."MaLop";

        IF v_sl_dang_ky IS DISTINCT FROM v_sl_thuc_te THEN
            RAISE EXCEPTION 'RBTV26: Cập nhật PHIEUDANGKY làm sai lệch tổng đăng ký.';
        END IF;
    END LOOP;
    
    -- Nếu thay đổi MaHocKy, phải kiểm tra lại cả các lớp ở Học kỳ cũ
    IF OLD."MaHocKy" <> NEW."MaHocKy" THEN
        FOR rec IN (
            SELECT "MaLop" 
            FROM "CHITIETDANGKY" 
            WHERE "SoPhieu" = OLD."SoPhieu" AND "TrangThai" = 'Đã đăng ký'
        ) LOOP
            SELECT COALESCE(COUNT(ct.id), 0) INTO v_sl_thuc_te
            FROM "CHITIETDANGKY" ct
            JOIN "PHIEUDANGKY" pdk ON ct."SoPhieu" = pdk."SoPhieu"
            WHERE ct."MaLop" = rec."MaLop"
              AND pdk."MaHocKy" = OLD."MaHocKy"
              AND ct."TrangThai" = 'Đã đăng ký';

            SELECT "SoLuongDaDangKy" INTO v_sl_dang_ky
            FROM "LOPMO"
            WHERE "MaHocKy" = OLD."MaHocKy" AND "MaLop" = rec."MaLop";

            IF v_sl_dang_ky IS DISTINCT FROM v_sl_thuc_te THEN
                RAISE EXCEPTION 'RBTV26: Đổi học kỳ làm sai lệch tổng đăng ký của học kỳ cũ.';
            END IF;
        END LOOP;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chk_rbtv26_pdk ON "PHIEUDANGKY";
CREATE CONSTRAINT TRIGGER trg_chk_rbtv26_pdk
AFTER UPDATE OF "MaHocKy", "TrangThai"
ON "PHIEUDANGKY"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv26_phieudangky();
--RBTV 27
CREATE OR REPLACE FUNCTION check_rbtv27_phieudangky()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ cần kiểm tra khi phiếu có trạng thái 'Đã hủy'
    IF NEW."TrangThai" = 'Đã hủy' THEN
        -- Tìm xem có chi tiết nào còn 'Đã đăng ký' thuộc phiếu này không
        IF EXISTS (
            SELECT 1 
            FROM "CHITIETDANGKY" 
            WHERE "SoPhieu" = NEW."SoPhieu" 
              AND "TrangThai" = 'Đã đăng ký'
        ) THEN
            RAISE EXCEPTION 'RBTV27: Lỗi! Không thể lưu trạng thái "Đã hủy" cho phiếu % vì vẫn còn môn học ở trạng thái "Đã đăng ký".', NEW."SoPhieu";
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Tạo Constraint Trigger (Hoãn kiểm tra đến cuối transaction)
DROP TRIGGER IF EXISTS trg_chk_rbtv27_pdk ON "PHIEUDANGKY";
CREATE CONSTRAINT TRIGGER trg_chk_rbtv27_pdk
AFTER UPDATE OF "TrangThai"
ON "PHIEUDANGKY"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv27_phieudangky();
CREATE OR REPLACE FUNCTION check_rbtv27_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_trang_thai_phieu VARCHAR(30);
BEGIN
    -- Chỉ cần kiểm tra khi chi tiết đang ở trạng thái 'Đã đăng ký'
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        -- Lấy trạng thái của phiếu đăng ký chứa môn học này
        SELECT "TrangThai" INTO v_trang_thai_phieu
        FROM "PHIEUDANGKY"
        WHERE "SoPhieu" = NEW."SoPhieu";

        -- Nếu phiếu mẹ đã hủy thì không cho phép chi tiết đăng ký
        IF v_trang_thai_phieu = 'Đã hủy' THEN
            RAISE EXCEPTION 'RBTV27: Lỗi! Không thể thêm hoặc giữ trạng thái "Đã đăng ký" cho chi tiết vì phiếu % đã bị "Đã hủy".', NEW."SoPhieu";
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Tạo Constraint Trigger (Hoãn kiểm tra đến cuối transaction)
DROP TRIGGER IF EXISTS trg_chk_rbtv27_ctdk ON "CHITIETDANGKY";
CREATE CONSTRAINT TRIGGER trg_chk_rbtv27_ctdk
AFTER INSERT OR UPDATE OF "SoPhieu", "TrangThai"
ON "CHITIETDANGKY"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_rbtv27_chitietdangky();
-- =====================================================
-- RBTV28: Không được hủy/xóa đăng ký đã có phiếu thu thành công
-- Bảng liên quan: PHIEUDANGKY, CHITIETDANGKY, PHIEUTHUHOCPHI
-- =====================================================

-- Hàm kiểm tra dùng chung: có tồn tại phiếu thu thành công cho phiếu đăng ký không?
CREATE OR REPLACE FUNCTION fn_rbtv28_co_phieu_thu_thanh_cong(p_so_phieu INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "PHIEUTHUHOCPHI"
        WHERE "SoPhieuDangKy" = p_so_phieu AND "TrangThai" = 'Thành công'
    );
END;
$$ LANGUAGE plpgsql;

-- [RBTV28 - PHIEUDANGKY] Chặn DELETE phiếu đăng ký
CREATE OR REPLACE FUNCTION trg_fn_rbtv28_phieudangky_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF fn_rbtv28_co_phieu_thu_thanh_cong(OLD."SoPhieu") THEN
        RAISE EXCEPTION '[RBTV28] Không thể xóa phiếu đăng ký SoPhieu=% vì đã có phiếu thu học phí thành công. Vui lòng hủy phiếu thu trước.', OLD."SoPhieu";
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv28_phieudangky_delete ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv28_phieudangky_delete BEFORE DELETE ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv28_phieudangky_delete();

-- [RBTV28 - PHIEUDANGKY] Chặn UPDATE TrangThai thành Đã hủy
CREATE OR REPLACE FUNCTION trg_fn_rbtv28_phieudangky_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Đã hủy' AND OLD."TrangThai" <> 'Đã hủy' AND fn_rbtv28_co_phieu_thu_thanh_cong(OLD."SoPhieu") THEN
        RAISE EXCEPTION '[RBTV28] Không thể hủy phiếu đăng ký SoPhieu=% vì đã có phiếu thu học phí thành công. Vui lòng hủy phiếu thu trước.', OLD."SoPhieu";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv28_phieudangky_update ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv28_phieudangky_update BEFORE UPDATE OF "TrangThai" ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv28_phieudangky_update();

-- [RBTV28 - CHITIETDANGKY] Chặn DELETE chi tiết đăng ký
CREATE OR REPLACE FUNCTION trg_fn_rbtv28_chitietdangky_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF fn_rbtv28_co_phieu_thu_thanh_cong(OLD."SoPhieu") THEN
        RAISE EXCEPTION '[RBTV28] Không thể xóa chi tiết id=% (SoPhieu=%) vì phiếu đăng ký đã có phiếu thu thành công.', OLD.id, OLD."SoPhieu";
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv28_chitietdangky_delete ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv28_chitietdangky_delete BEFORE DELETE ON "CHITIETDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv28_chitietdangky_delete();

-- [RBTV28 - CHITIETDANGKY] Chặn UPDATE hủy hoặc giảm tiền/tín chỉ
CREATE OR REPLACE FUNCTION trg_fn_rbtv28_chitietdangky_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."TrangThai" = 'Đã hủy' AND OLD."TrangThai" = 'Đã đăng ký')
       OR (NEW."ThanhTien" < OLD."ThanhTien")
       OR (NEW."SoTinChi" < OLD."SoTinChi")
    THEN
        IF fn_rbtv28_co_phieu_thu_thanh_cong(OLD."SoPhieu") THEN
            RAISE EXCEPTION '[RBTV28] Không thể hủy hoặc giảm học phí/tín chỉ cho id=% (SoPhieu=%) vì đã có phiếu thu thành công.', OLD.id, OLD."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv28_chitietdangky_update ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv28_chitietdangky_update BEFORE UPDATE OF "TrangThai", "ThanhTien", "SoTinChi" ON "CHITIETDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv28_chitietdangky_update();


-- =====================================================
-- RBTV29: Sinh viên trên phiếu thu phải đúng là sinh viên của phiếu đăng ký
-- Bảng liên quan: PHIEUTHUHOCPHI, PHIEUDANGKY
-- =====================================================

-- [RBTV29 - PHIEUTHUHOCPHI] Kiểm tra MaSv khi INSERT/UPDATE
CREATE OR REPLACE FUNCTION trg_fn_rbtv29_phieuthuhocphi()
RETURNS TRIGGER AS $$
DECLARE v_masv_pdk VARCHAR(15);
BEGIN
    SELECT "MaSv" INTO v_masv_pdk FROM "PHIEUDANGKY" WHERE "SoPhieu" = NEW."SoPhieuDangKy";
    IF NOT FOUND THEN
        RAISE EXCEPTION '[RBTV29] Phiếu đăng ký SoPhieu=% không tồn tại.', NEW."SoPhieuDangKy";
    END IF;
    IF NEW."MaSv" <> v_masv_pdk THEN
        RAISE EXCEPTION '[RBTV29] MaSv trên phiếu thu (%) không khớp với MaSv trên phiếu đăng ký SoPhieu=% (%).', NEW."MaSv", NEW."SoPhieuDangKy", v_masv_pdk;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv29_phieuthuhocphi ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv29_phieuthuhocphi BEFORE INSERT OR UPDATE OF "MaSv", "SoPhieuDangKy" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv29_phieuthuhocphi();

-- [RBTV29 - PHIEUDANGKY] Chặn sửa MaSv nếu đã có phiếu thu
CREATE OR REPLACE FUNCTION trg_fn_rbtv29_phieudangky_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."MaSv" <> OLD."MaSv" THEN
        IF EXISTS (SELECT 1 FROM "PHIEUTHUHOCPHI" WHERE "SoPhieuDangKy" = OLD."SoPhieu") THEN
            RAISE EXCEPTION '[RBTV29] Không thể đổi MaSv phiếu đăng ký SoPhieu=% vì đã có phiếu thu liên kết.', OLD."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv29_phieudangky_update ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv29_phieudangky_update BEFORE UPDATE OF "MaSv" ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv29_phieudangky_update();


-- =====================================================
-- RBTV30: Tổng tiền thu thành công <= TongTienPhaiDong
-- Bảng liên quan: PHIEUTHUHOCPHI, PHIEUDANGKY
-- =====================================================

CREATE OR REPLACE FUNCTION fn_rbtv30_kiem_tra_tong_thu(p_so_phieu INTEGER)
RETURNS VOID AS $$
DECLARE
    v_tong_phai_dong NUMERIC(15,0);
    v_tong_da_thu NUMERIC(15,0);
BEGIN
    SELECT "TongTienPhaiDong" INTO v_tong_phai_dong FROM "PHIEUDANGKY" WHERE "SoPhieu" = p_so_phieu;
    IF NOT FOUND THEN RETURN; END IF;

    -- Tính tổng TẤT CẢ phiếu thu thành công 
    -- (đã bao gồm dòng vừa Insert/Update vì đây là AFTER trigger)
    SELECT COALESCE(SUM("SoTienThu"), 0) INTO v_tong_da_thu 
    FROM "PHIEUTHUHOCPHI"
    WHERE "SoPhieuDangKy" = p_so_phieu AND "TrangThai" = 'Thành công';

    IF v_tong_da_thu > v_tong_phai_dong THEN
        RAISE EXCEPTION '[RBTV30] Tổng tiền đã thu thành công (%) vượt quá TongTienPhaiDong (%) của phiếu đăng ký SoPhieu=%.', v_tong_da_thu, v_tong_phai_dong, p_so_phieu;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- [RBTV30 - PHIEUTHUHOCPHI] AFTER INSERT
CREATE OR REPLACE FUNCTION trg_fn_rbtv30_phieuthuhocphi_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Thành công' THEN
        PERFORM fn_rbtv30_kiem_tra_tong_thu(NEW."SoPhieuDangKy");
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv30_phieuthuhocphi_insert ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv30_phieuthuhocphi_insert AFTER INSERT ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv30_phieuthuhocphi_insert();

-- [RBTV30 - PHIEUTHUHOCPHI] AFTER UPDATE
CREATE OR REPLACE FUNCTION trg_fn_rbtv30_phieuthuhocphi_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Thành công' THEN
        PERFORM fn_rbtv30_kiem_tra_tong_thu(NEW."SoPhieuDangKy");
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv30_phieuthuhocphi_update ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv30_phieuthuhocphi_update AFTER UPDATE OF "SoTienThu", "TrangThai", "SoPhieuDangKy" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv30_phieuthuhocphi_update();

-- [RBTV30 - PHIEUDANGKY] BEFORE UPDATE TongTienPhaiDong
CREATE OR REPLACE FUNCTION trg_fn_rbtv30_phieudangky_update()
RETURNS TRIGGER AS $$
DECLARE v_tong_da_thu NUMERIC(15,0);
BEGIN
    IF NEW."TongTienPhaiDong" < OLD."TongTienPhaiDong" THEN
        SELECT COALESCE(SUM("SoTienThu"), 0) INTO v_tong_da_thu 
        FROM "PHIEUTHUHOCPHI" 
        WHERE "SoPhieuDangKy" = OLD."SoPhieu" AND "TrangThai" = 'Thành công';
        
        IF v_tong_da_thu > NEW."TongTienPhaiDong" THEN
            RAISE EXCEPTION '[RBTV30] Không thể giảm TongTienPhaiDong xuống % vì tổng đã thu thành công là % (SoPhieu=%).', NEW."TongTienPhaiDong", v_tong_da_thu, OLD."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv30_phieudangky_update ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv30_phieudangky_update BEFORE UPDATE OF "TongTienPhaiDong" ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv30_phieudangky_update();


-- =====================================================
-- RBTV31: Giao dịch không tiền mặt phải có MaGiaoDich; không trùng lặp
-- Bảng liên quan: PHIEUTHUHOCPHI
-- =====================================================

CREATE OR REPLACE FUNCTION trg_fn_rbtv31_phieuthuhocphi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."HinhThucThu" <> 'Tiền mặt' AND NEW."TrangThai" = 'Thành công' AND NEW."MaGiaoDich" IS NULL THEN
        RAISE EXCEPTION '[RBTV31] Giao dịch không phải tiền mặt với trạng thái Thành công phải có MaGiaoDich (SoPhieuThu=%).', NEW."SoPhieuThu";
    END IF;

    IF NEW."TrangThai" = 'Thành công' AND NEW."MaGiaoDich" IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM "PHIEUTHUHOCPHI"
            WHERE "TrangThai" = 'Thành công'
              AND "MaGiaoDich" = NEW."MaGiaoDich"
              AND ((NEW."PaymentProvider" IS NOT NULL AND "PaymentProvider" = NEW."PaymentProvider") OR (NEW."PaymentProvider" IS NULL AND "PaymentProvider" IS NULL))
              AND "SoPhieuThu" <> COALESCE(NEW."SoPhieuThu", -1)
        ) THEN
            RAISE EXCEPTION '[RBTV31] MaGiaoDich=% đã tồn tại trong một phiếu thu thành công khác (PaymentProvider=%).', NEW."MaGiaoDich", NEW."PaymentProvider";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv31_phieuthuhocphi ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv31_phieuthuhocphi BEFORE INSERT OR UPDATE OF "HinhThucThu", "MaGiaoDich", "PaymentProvider", "TrangThai" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv31_phieuthuhocphi();

-- =====================================================
-- RBTV32: Ngày xác nhận phải nhất quán với trạng thái thanh toán
-- Bảng liên quan: PHIEUTHUHOCPHI
-- =====================================================

CREATE OR REPLACE FUNCTION trg_fn_rbtv32_phieuthuhocphi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Thành công' AND NEW."NgayXacNhan" IS NULL THEN
        RAISE EXCEPTION '[RBTV32] Phiếu thu SoPhieuThu=% có TrangThai Thành công nhưng NgayXacNhan đang NULL.', NEW."SoPhieuThu";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv32_phieuthuhocphi ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv32_phieuthuhocphi BEFORE INSERT OR UPDATE OF "TrangThai", "NgayXacNhan" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv32_phieuthuhocphi();


-- =====================================================
-- RBTV33: Phiếu thu đã thành công không được sửa thông tin định danh chính
-- Bảng liên quan: PHIEUTHUHOCPHI
-- =====================================================

CREATE OR REPLACE FUNCTION trg_fn_rbtv33_phieuthuhocphi()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."TrangThai" <> 'Thành công' THEN RETURN NEW; END IF;

    IF NEW."TrangThai" = 'Đã hủy' THEN
        IF NEW."GhiChu" IS NULL OR TRIM(NEW."GhiChu") = '' THEN
            RAISE EXCEPTION '[RBTV33] Khi hủy phiếu thu đã thành công (SoPhieuThu=%), bắt buộc phải ghi lý do vào GhiChu.', OLD."SoPhieuThu";
        END IF;
        IF NEW."SoPhieuDangKy" <> OLD."SoPhieuDangKy" OR NEW."MaSv" <> OLD."MaSv" OR NEW."SoTienThu" <> OLD."SoTienThu" OR NEW."HinhThucThu" <> OLD."HinhThucThu" OR (NEW."MaGiaoDich" IS DISTINCT FROM OLD."MaGiaoDich") THEN
            RAISE EXCEPTION '[RBTV33] Khi hủy phiếu thu (SoPhieuThu=%), không được thay đổi các trường định danh.', OLD."SoPhieuThu";
        END IF;
        RETURN NEW;
    END IF;

    IF NEW."SoPhieuDangKy" <> OLD."SoPhieuDangKy" OR NEW."MaSv" <> OLD."MaSv" OR NEW."SoTienThu" <> OLD."SoTienThu" OR NEW."HinhThucThu" <> OLD."HinhThucThu" OR (NEW."MaGiaoDich" IS DISTINCT FROM OLD."MaGiaoDich") THEN
        RAISE EXCEPTION '[RBTV33] Không thể sửa thông tin định danh của phiếu thu đã thành công (SoPhieuThu=%).', OLD."SoPhieuThu";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv33_phieuthuhocphi ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv33_phieuthuhocphi BEFORE UPDATE ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION trg_fn_rbtv33_phieuthuhocphi();




-- KỊCH BẢN TỔNG HỢP TRIGGER RBTV34
-- CHÚ Ý: ĐÃ LOẠI BỎ TOÀN BỘ KÝ HIỆU // THEO YÊU CẦU

-- ==============================================================================
-- PHẦN 1: BẢO VỆ TỪ PHÍA BẢNG CON (KHI INSERT HOẶC UPDATE LÊN TRẠNG THÁI HOẠT ĐỘNG)
-- ==============================================================================

-- 1. CHITIETDANGKY
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_chitietdangky()
RETURNS TRIGGER AS $$
DECLARE
    v_Lop_DaXoa BOOLEAN; v_Lop_TrangThai BOOLEAN;
    v_Mon_DaXoa BOOLEAN; v_Mon_TrangThai BOOLEAN;
    v_Phieu_TrangThai VARCHAR;
BEGIN
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        SELECT "DaXoa", "TrangThai" INTO v_Lop_DaXoa, v_Lop_TrangThai FROM "LOP" WHERE "MaLop" = NEW."MaLop";
        IF COALESCE(v_Lop_DaXoa, FALSE) = TRUE OR COALESCE(v_Lop_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: LOP % khong hop le.', NEW."MaLop";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Mon_DaXoa, v_Mon_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;

        SELECT "TrangThai" INTO v_Phieu_TrangThai FROM "PHIEUDANGKY" WHERE "SoPhieu" = NEW."SoPhieu";
        IF COALESCE(v_Phieu_TrangThai, '') != 'Đã đăng ký' THEN
            RAISE EXCEPTION 'RBTV34: PHIEUDANGKY % khong hop le.', NEW."SoPhieu";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_chitietdangky ON "CHITIETDANGKY";
CREATE TRIGGER trg_rbtv34_chitietdangky
BEFORE INSERT OR UPDATE OF "MaLop", "MaMonHoc", "SoPhieu", "TrangThai" ON "CHITIETDANGKY"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_chitietdangky();

-- 2. PHIEUDANGKY
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_phieudangky()
RETURNS TRIGGER AS $$
DECLARE
    v_Sv_DaXoa BOOLEAN; v_Sv_TrangThai VARCHAR;
    v_Hk_DaXoa BOOLEAN; v_Hk_TrangThai VARCHAR;
BEGIN
    IF NEW."TrangThai" = 'Đã đăng ký' THEN
        SELECT "DaXoa", "TrangThai" INTO v_Sv_DaXoa, v_Sv_TrangThai FROM "SINHVIEN" WHERE "MaSv" = NEW."MaSv";
        IF COALESCE(v_Sv_DaXoa, FALSE) = TRUE OR v_Sv_TrangThai != 'Đang học' THEN
            RAISE EXCEPTION 'RBTV34: SINHVIEN % khong hop le.', NEW."MaSv";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Hk_DaXoa, v_Hk_TrangThai FROM "HOCKY" WHERE "MaHocKy" = NEW."MaHocKy";
        IF COALESCE(v_Hk_DaXoa, FALSE) = TRUE OR v_Hk_TrangThai = 'Đã kết thúc' THEN
            RAISE EXCEPTION 'RBTV34: HOCKY % khong hop le.', NEW."MaHocKy";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_phieudangky ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv34_phieudangky
BEFORE INSERT OR UPDATE OF "MaSv", "MaHocKy", "TrangThai" ON "PHIEUDANGKY"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_phieudangky();

-- 3. PHIEUTHUHOCPHI
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_phieuthuhocphi()
RETURNS TRIGGER AS $$
DECLARE
    v_Phieu_TrangThai VARCHAR;
    v_Sv_DaXoa BOOLEAN;
BEGIN
    IF NEW."TrangThai" = 'Thành công' THEN
        SELECT "TrangThai" INTO v_Phieu_TrangThai FROM "PHIEUDANGKY" WHERE "SoPhieu" = NEW."SoPhieuDangKy";
        IF COALESCE(v_Phieu_TrangThai, '') != 'Đã đăng ký' THEN
            RAISE EXCEPTION 'RBTV34: PHIEUDANGKY % khong hop le.', NEW."SoPhieuDangKy";
        END IF;

        SELECT "DaXoa" INTO v_Sv_DaXoa FROM "SINHVIEN" WHERE "MaSv" = NEW."MaSv";
        IF COALESCE(v_Sv_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: SINHVIEN % khong hop le.', NEW."MaSv";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_phieuthuhocphi ON "PHIEUTHUHOCPHI";
CREATE TRIGGER trg_rbtv34_phieuthuhocphi
BEFORE INSERT OR UPDATE OF "SoPhieuDangKy", "MaSv", "TrangThai" ON "PHIEUTHUHOCPHI"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_phieuthuhocphi();

-- 4. LOPMO
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lopmo()
RETURNS TRIGGER AS $$
DECLARE
    v_Hk_DaXoa BOOLEAN; v_Lop_DaXoa BOOLEAN; v_Lop_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa" INTO v_Hk_DaXoa FROM "HOCKY" WHERE "MaHocKy" = NEW."MaHocKy";
        IF COALESCE(v_Hk_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: HOCKY % khong hop le.', NEW."MaHocKy";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Lop_DaXoa, v_Lop_TrangThai FROM "LOP" WHERE "MaLop" = NEW."MaLop";
        IF COALESCE(v_Lop_DaXoa, FALSE) = TRUE OR COALESCE(v_Lop_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: LOP % khong hop le.', NEW."MaLop";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_lopmo ON "LOPMO";
CREATE TRIGGER trg_rbtv34_lopmo
BEFORE INSERT OR UPDATE OF "MaHocKy", "MaLop", "TrangThai" ON "LOPMO"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lopmo();

-- 5. MONDAHOC
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_mondahoc()
RETURNS TRIGGER AS $$
DECLARE
    v_Sv_DaXoa BOOLEAN; v_Mon_DaXoa BOOLEAN; v_Mon_TrangThai BOOLEAN;
    v_Hk_DaXoa BOOLEAN; v_Lop_DaXoa BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE THEN
        SELECT "DaXoa" INTO v_Sv_DaXoa FROM "SINHVIEN" WHERE "MaSv" = NEW."MaSv";
        IF COALESCE(v_Sv_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: SINHVIEN % khong hop le.', NEW."MaSv";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Mon_DaXoa, v_Mon_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;

        SELECT "DaXoa" INTO v_Hk_DaXoa FROM "HOCKY" WHERE "MaHocKy" = NEW."MaHocKy";
        IF COALESCE(v_Hk_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: HOCKY % khong hop le.', NEW."MaHocKy";
        END IF;

        IF NEW."MaLop" IS NOT NULL THEN
            SELECT "DaXoa" INTO v_Lop_DaXoa FROM "LOP" WHERE "MaLop" = NEW."MaLop";
            IF COALESCE(v_Lop_DaXoa, FALSE) = TRUE THEN
                RAISE EXCEPTION 'RBTV34: LOP % khong hop le.', NEW."MaLop";
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_mondahoc ON "MONDAHOC";
CREATE TRIGGER trg_rbtv34_mondahoc
BEFORE INSERT OR UPDATE OF "MaSv", "MaMonHoc", "MaHocKy", "MaLop", "DaXoa" ON "MONDAHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_mondahoc();

-- 6. PHUONGXA
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_phuongxa()
RETURNS TRIGGER AS $$
DECLARE v_Tinh_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "TrangThai" INTO v_Tinh_TrangThai FROM "TINH" WHERE "MaTinh" = NEW."MaTinh";
        IF COALESCE(v_Tinh_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: TINH % khong hop le.', NEW."MaTinh";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_phuongxa ON "PHUONGXA";
CREATE TRIGGER trg_rbtv34_phuongxa
BEFORE INSERT OR UPDATE OF "MaTinh", "TrangThai" ON "PHUONGXA"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_phuongxa();

-- 7. NGANHHOC & MONHOC
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_khoa_ref()
RETURNS TRIGGER AS $$
DECLARE v_Khoa_DaXoa BOOLEAN; v_Khoa_TrangThai BOOLEAN;
BEGIN
    IF (NEW."DaXoa" IS NULL OR NEW."DaXoa" = FALSE) AND NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa", "TrangThai" INTO v_Khoa_DaXoa, v_Khoa_TrangThai FROM "KHOA" WHERE "MaKhoa" = NEW."MaKhoa";
        IF COALESCE(v_Khoa_DaXoa, FALSE) = TRUE OR COALESCE(v_Khoa_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: KHOA % khong hop le.', NEW."MaKhoa";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_nganhhoc ON "NGANHHOC";
CREATE TRIGGER trg_rbtv34_nganhhoc
BEFORE INSERT OR UPDATE OF "MaKhoa", "TrangThai", "DaXoa" ON "NGANHHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_khoa_ref();

DROP TRIGGER IF EXISTS trg_rbtv34_monhoc ON "MONHOC";
CREATE TRIGGER trg_rbtv34_monhoc
BEFORE INSERT OR UPDATE OF "MaKhoa", "TrangThai", "DaXoa" ON "MONHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_khoa_ref();

-- 8. DIEUKIENMONHOC
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_dieukienmonhoc()
RETURNS TRIGGER AS $$
DECLARE
    v_Mon1_DaXoa BOOLEAN; v_Mon1_TrangThai BOOLEAN;
    v_Mon2_DaXoa BOOLEAN; v_Mon2_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa", "TrangThai" INTO v_Mon1_DaXoa, v_Mon1_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon1_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon1_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Mon2_DaXoa, v_Mon2_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonDieuKien";
        IF COALESCE(v_Mon2_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon2_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC dieu kien % khong hop le.', NEW."MaMonDieuKien";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_dieukienmonhoc ON "DIEUKIENMONHOC";
CREATE TRIGGER trg_rbtv34_dieukienmonhoc
BEFORE INSERT OR UPDATE OF "MaMonHoc", "MaMonDieuKien", "TrangThai", "DaXoa" ON "DIEUKIENMONHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_dieukienmonhoc();

-- 9. LOP
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lop()
RETURNS TRIGGER AS $$
DECLARE v_Mon_DaXoa BOOLEAN; v_Mon_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa", "TrangThai" INTO v_Mon_DaXoa, v_Mon_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_lop ON "LOP";
CREATE TRIGGER trg_rbtv34_lop
BEFORE INSERT OR UPDATE OF "MaMonHoc", "TrangThai", "DaXoa" ON "LOP"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lop();

-- 10. CHUONGTRINHHOC
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_chuongtrinhhoc()
RETURNS TRIGGER AS $$
DECLARE
    v_Nganh_DaXoa BOOLEAN; v_Nganh_TrangThai BOOLEAN;
    v_Mon_DaXoa BOOLEAN; v_Mon_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa", "TrangThai" INTO v_Nganh_DaXoa, v_Nganh_TrangThai FROM "NGANHHOC" WHERE "MaNganh" = NEW."MaNganh";
        IF COALESCE(v_Nganh_DaXoa, FALSE) = TRUE OR COALESCE(v_Nganh_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NGANHHOC % khong hop le.', NEW."MaNganh";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Mon_DaXoa, v_Mon_TrangThai FROM "MONHOC" WHERE "MaMonHoc" = NEW."MaMonHoc";
        IF COALESCE(v_Mon_DaXoa, FALSE) = TRUE OR COALESCE(v_Mon_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: MONHOC % khong hop le.', NEW."MaMonHoc";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_chuongtrinhhoc ON "CHUONGTRINHHOC";
CREATE TRIGGER trg_rbtv34_chuongtrinhhoc
BEFORE INSERT OR UPDATE OF "MaNganh", "MaMonHoc", "TrangThai" ON "CHUONGTRINHHOC"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_chuongtrinhhoc();

-- 11. HOCKY
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_hocky()
RETURNS TRIGGER AS $$
DECLARE v_Nam_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" != 'Đã kết thúc' THEN
        SELECT "TrangThai" INTO v_Nam_TrangThai FROM "NAMHOC" WHERE "MaNamHoc" = NEW."MaNamHoc";
        IF COALESCE(v_Nam_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NAMHOC % khong hop le.', NEW."MaNamHoc";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_hocky ON "HOCKY";
CREATE TRIGGER trg_rbtv34_hocky
BEFORE INSERT OR UPDATE OF "MaNamHoc", "TrangThai", "DaXoa" ON "HOCKY"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_hocky();

-- 12. LICHHOCLOP
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lichhoclop()
RETURNS TRIGGER AS $$
DECLARE
    v_LopMo_TrangThai BOOLEAN;
    v_Tiet1_DaXoa BOOLEAN; v_Tiet1_TrangThai BOOLEAN;
    v_Tiet2_DaXoa BOOLEAN; v_Tiet2_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "TrangThai" INTO v_LopMo_TrangThai FROM "LOPMO" WHERE id = NEW."LopMoId";
        IF COALESCE(v_LopMo_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: LOPMO % khong hop le.', NEW."LopMoId";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Tiet1_DaXoa, v_Tiet1_TrangThai FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietBatDau";
        IF COALESCE(v_Tiet1_DaXoa, FALSE) = TRUE OR COALESCE(v_Tiet1_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: TIETHOC bat dau % khong hop le.', NEW."MaTietBatDau";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Tiet2_DaXoa, v_Tiet2_TrangThai FROM "TIETHOC" WHERE "MaTiet" = NEW."MaTietKetThuc";
        IF COALESCE(v_Tiet2_DaXoa, FALSE) = TRUE OR COALESCE(v_Tiet2_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: TIETHOC ket thuc % khong hop le.', NEW."MaTietKetThuc";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_lichhoclop ON "LICHHOCLOP";
CREATE TRIGGER trg_rbtv34_lichhoclop
BEFORE INSERT OR UPDATE OF "LopMoId", "MaTietBatDau", "MaTietKetThuc", "TrangThai" ON "LICHHOCLOP"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lichhoclop();

-- 13. DONGIATINCHI
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_dongiatinchi()
RETURNS TRIGGER AS $$
DECLARE v_Hk_DaXoa BOOLEAN; v_Hk_TrangThai VARCHAR;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = TRUE AND NEW."MaHocKy" IS NOT NULL THEN
        SELECT "DaXoa", "TrangThai" INTO v_Hk_DaXoa, v_Hk_TrangThai FROM "HOCKY" WHERE "MaHocKy" = NEW."MaHocKy";
        IF COALESCE(v_Hk_DaXoa, FALSE) = TRUE OR v_Hk_TrangThai = 'Đã kết thúc' THEN
            RAISE EXCEPTION 'RBTV34: HOCKY % khong hop le.', NEW."MaHocKy";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_dongiatinchi ON "DONGIATINCHI";
CREATE TRIGGER trg_rbtv34_dongiatinchi
BEFORE INSERT OR UPDATE OF "MaHocKy", "TrangThai", "DaXoa" ON "DONGIATINCHI"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_dongiatinchi();

-- 14. SINHVIEN
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_sinhvien()
RETURNS TRIGGER AS $$
DECLARE
    v_Px_TrangThai BOOLEAN; v_Dt_TrangThai BOOLEAN;
    v_Ng_DaXoa BOOLEAN; v_Ng_TrangThai BOOLEAN;
    v_Nd_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = 'Đang học' THEN
        SELECT "TrangThai" INTO v_Px_TrangThai FROM "PHUONGXA" WHERE "MaPhuongXa" = NEW."MaPhuongXa";
        IF COALESCE(v_Px_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: PHUONGXA % khong hop le.', NEW."MaPhuongXa";
        END IF;

        SELECT "TrangThai" INTO v_Dt_TrangThai FROM "DANTOC" WHERE "MaDanToc" = NEW."MaDanToc";
        IF COALESCE(v_Dt_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: DANTOC % khong hop le.', NEW."MaDanToc";
        END IF;

        SELECT "DaXoa", "TrangThai" INTO v_Ng_DaXoa, v_Ng_TrangThai FROM "NGANHHOC" WHERE "MaNganh" = NEW."MaNganh";
        IF COALESCE(v_Ng_DaXoa, FALSE) = TRUE OR COALESCE(v_Ng_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NGANHHOC % khong hop le.', NEW."MaNganh";
        END IF;

        IF NEW."MaTaiKhoan" IS NOT NULL THEN
            SELECT "TrangThai" INTO v_Nd_TrangThai FROM "NGUOIDUNG" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan";
            IF COALESCE(v_Nd_TrangThai, TRUE) = FALSE THEN
                RAISE EXCEPTION 'RBTV34: NGUOIDUNG % khong hop le.', NEW."MaTaiKhoan";
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_sinhvien ON "SINHVIEN";
CREATE TRIGGER trg_rbtv34_sinhvien
BEFORE INSERT OR UPDATE OF "MaPhuongXa", "MaDanToc", "MaNganh", "MaTaiKhoan", "TrangThai", "DaXoa" ON "SINHVIEN"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_sinhvien();

-- 15. NGUOIDUNG
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_nguoidung()
RETURNS TRIGGER AS $$
DECLARE
    v_Nhom_DaXoa BOOLEAN; v_Sv_DaXoa BOOLEAN; v_Sv_TrangThai VARCHAR;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "DaXoa" INTO v_Nhom_DaXoa FROM "NHOMNGUOIDUNG" WHERE "MaNhom" = NEW."MaNhom";
        IF COALESCE(v_Nhom_DaXoa, FALSE) = TRUE THEN
            RAISE EXCEPTION 'RBTV34: NHOMNGUOIDUNG % khong hop le.', NEW."MaNhom";
        END IF;

        IF NEW."MaSv" IS NOT NULL THEN
            SELECT "DaXoa", "TrangThai" INTO v_Sv_DaXoa, v_Sv_TrangThai FROM "SINHVIEN" WHERE "MaSv" = NEW."MaSv";
            IF COALESCE(v_Sv_DaXoa, FALSE) = TRUE OR v_Sv_TrangThai != 'Đang học' THEN
                RAISE EXCEPTION 'RBTV34: SINHVIEN % khong hop le.', NEW."MaSv";
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_nguoidung ON "NGUOIDUNG";
CREATE TRIGGER trg_rbtv34_nguoidung
BEFORE INSERT OR UPDATE OF "MaNhom", "MaSv", "TrangThai" ON "NGUOIDUNG"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_nguoidung();

-- 16. QUANTRIVIEN
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_quantrivien()
RETURNS TRIGGER AS $$
DECLARE v_Nd_TrangThai BOOLEAN;
BEGIN
    IF NEW."TrangThai" = TRUE THEN
        SELECT "TrangThai" INTO v_Nd_TrangThai FROM "NGUOIDUNG" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan";
        IF COALESCE(v_Nd_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NGUOIDUNG % khong hop le.', NEW."MaTaiKhoan";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_quantrivien ON "QUANTRIVIEN";
CREATE TRIGGER trg_rbtv34_quantrivien
BEFORE INSERT OR UPDATE OF "MaTaiKhoan", "TrangThai" ON "QUANTRIVIEN"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_quantrivien();

-- 17. THONGBAO
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_thongbao()
RETURNS TRIGGER AS $$
DECLARE v_Nd_TrangThai BOOLEAN;
BEGIN
    IF NEW."DaXoa" = FALSE AND NEW."TrangThai" = TRUE THEN
        SELECT "TrangThai" INTO v_Nd_TrangThai FROM "NGUOIDUNG" WHERE "MaTaiKhoan" = NEW."MaTaiKhoanNhan";
        IF COALESCE(v_Nd_TrangThai, TRUE) = FALSE THEN
            RAISE EXCEPTION 'RBTV34: NGUOIDUNG % khong hop le.', NEW."MaTaiKhoanNhan";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rbtv34_thongbao ON "THONGBAO";
CREATE TRIGGER trg_rbtv34_thongbao
BEFORE INSERT OR UPDATE OF "MaTaiKhoanNhan", "TrangThai", "DaXoa" ON "THONGBAO"
FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_thongbao();


-- ==============================================================================
-- PHẦN 2: BẢO VỆ TỪ PHÍA BẢNG CHA (KHI UPDATE XÓA MỀM HOẶC TẮT TRẠNG THÁI)
-- ==============================================================================

-- 1. LOP (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lop_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "MaLop" = NEW."MaLop" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHITIETDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "LOPMO" WHERE "MaLop" = NEW."MaLop" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LOPMO con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONDAHOC" WHERE "MaLop" = NEW."MaLop" AND "DaXoa" = FALSE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONDAHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "LICHHOCLOP" ll JOIN "LOPMO" lm ON ll."LopMoId" = lm.id WHERE lm."MaLop" = NEW."MaLop" AND ll."TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LICHHOCLOP con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_lop_parent ON "LOP";
CREATE TRIGGER trg_rbtv34_lop_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "LOP" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lop_parent();

-- 2. MONHOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_monhoc_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "MaMonHoc" = NEW."MaMonHoc" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHITIETDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONDAHOC" WHERE "MaMonHoc" = NEW."MaMonHoc" AND "DaXoa" = FALSE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONDAHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "DIEUKIENMONHOC" WHERE ("MaMonHoc" = NEW."MaMonHoc" OR "MaMonDieuKien" = NEW."MaMonHoc") AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: DIEUKIENMONHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "LOP" WHERE "MaMonHoc" = NEW."MaMonHoc" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LOP con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "CHUONGTRINHHOC" WHERE "MaMonHoc" = NEW."MaMonHoc" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHUONGTRINHHOC con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_monhoc_parent ON "MONHOC";
CREATE TRIGGER trg_rbtv34_monhoc_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "MONHOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_monhoc_parent();

-- 3. HOCKY (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_hocky_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."DaXoa" = TRUE AND COALESCE(OLD."DaXoa", FALSE) = FALSE THEN
        IF EXISTS (SELECT 1 FROM "PHIEUDANGKY" WHERE "MaHocKy" = NEW."MaHocKy" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHIEUDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "LOPMO" WHERE "MaHocKy" = NEW."MaHocKy" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LOPMO con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONDAHOC" WHERE "MaHocKy" = NEW."MaHocKy" AND "DaXoa" = FALSE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONDAHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "DONGIATINCHI" WHERE "MaHocKy" = NEW."MaHocKy" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: DONGIATINCHI con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_hocky_parent ON "HOCKY";
CREATE TRIGGER trg_rbtv34_hocky_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "HOCKY" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_hocky_parent();

CREATE OR REPLACE FUNCTION fn_chk_one_ongoing_hocky()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(NEW."DaXoa", FALSE) = FALSE AND NEW."TrangThai" = 'Đang diễn ra' THEN
        IF EXISTS (
            SELECT 1
            FROM "HOCKY"
            WHERE "MaHocKy" IS DISTINCT FROM NEW."MaHocKy"
              AND COALESCE("DaXoa", FALSE) = FALSE
              AND "TrangThai" = 'Đang diễn ra'
        ) THEN
            RAISE EXCEPTION 'RBTV_HOCKY_01: Chỉ được có một học kỳ đang diễn ra.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chk_one_ongoing_hocky ON "HOCKY";
CREATE TRIGGER trg_chk_one_ongoing_hocky
BEFORE INSERT OR UPDATE OF "TrangThai", "DaXoa" ON "HOCKY"
FOR EACH ROW EXECUTE FUNCTION fn_chk_one_ongoing_hocky();

-- 4. SINHVIEN (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_sinhvien_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" != 'Đang học' AND OLD."TrangThai" = 'Đang học') THEN
        IF EXISTS (SELECT 1 FROM "PHIEUDANGKY" WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHIEUDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "PHIEUTHUHOCPHI" WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = 'Thành công') THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHIEUTHUHOCPHI con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONDAHOC" WHERE "MaSv" = NEW."MaSv" AND "DaXoa" = FALSE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONDAHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "NGUOIDUNG" WHERE "MaSv" = NEW."MaSv" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: NGUOIDUNG con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_sinhvien_parent ON "SINHVIEN";
CREATE TRIGGER trg_rbtv34_sinhvien_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "SINHVIEN" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_sinhvien_parent();

-- 5. PHIEUDANGKY (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_phieudangky_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = 'Đã hủy' AND OLD."TrangThai" != 'Đã hủy' THEN
        IF EXISTS (SELECT 1 FROM "CHITIETDANGKY" WHERE "SoPhieu" = NEW."SoPhieu" AND "TrangThai" = 'Đã đăng ký') THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHITIETDANGKY con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "PHIEUTHUHOCPHI" WHERE "SoPhieuDangKy" = NEW."SoPhieu" AND "TrangThai" = 'Thành công') THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHIEUTHUHOCPHI con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_phieudangky_parent ON "PHIEUDANGKY";
CREATE TRIGGER trg_rbtv34_phieudangky_parent BEFORE UPDATE OF "TrangThai" ON "PHIEUDANGKY" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_phieudangky_parent();

-- 6. TINH (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_tinh_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (SELECT 1 FROM "PHUONGXA" WHERE "MaTinh" = NEW."MaTinh" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: PHUONGXA con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_tinh_parent ON "TINH";
CREATE TRIGGER trg_rbtv34_tinh_parent BEFORE UPDATE OF "TrangThai" ON "TINH" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_tinh_parent();

-- 7. KHOA (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_khoa_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "NGANHHOC" WHERE "MaKhoa" = NEW."MaKhoa" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: NGANHHOC con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "MONHOC" WHERE "MaKhoa" = NEW."MaKhoa" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: MONHOC con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_khoa_parent ON "KHOA";
CREATE TRIGGER trg_rbtv34_khoa_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "KHOA" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_khoa_parent();

-- 8. NAMHOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_namhoc_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (SELECT 1 FROM "HOCKY" WHERE "MaNamHoc" = NEW."MaNamHoc" AND "DaXoa" = FALSE AND "TrangThai" != 'Đã kết thúc') THEN RAISE EXCEPTION 'RBTV34 Lỗi: HOCKY con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_namhoc_parent ON "NAMHOC";
CREATE TRIGGER trg_rbtv34_namhoc_parent BEFORE UPDATE OF "TrangThai" ON "NAMHOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_namhoc_parent();

-- 9. LOPMO (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_lopmo_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (SELECT 1 FROM "LICHHOCLOP" WHERE "LopMoId" = NEW.id AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LICHHOCLOP con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_lopmo_parent ON "LOPMO";
CREATE TRIGGER trg_rbtv34_lopmo_parent BEFORE UPDATE OF "TrangThai" ON "LOPMO" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_lopmo_parent();

-- 10. TIETHOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_tiethoc_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "LICHHOCLOP" WHERE ("MaTietBatDau" = NEW."MaTiet" OR "MaTietKetThuc" = NEW."MaTiet") AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: LICHHOCLOP con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_tiethoc_parent ON "TIETHOC";
CREATE TRIGGER trg_rbtv34_tiethoc_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "TIETHOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_tiethoc_parent();

-- 11. PHUONGXA & DANTOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_px_dt_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF TG_TABLE_NAME = 'PHUONGXA' THEN
            IF EXISTS (SELECT 1 FROM "SINHVIEN" WHERE "MaPhuongXa" = NEW."MaPhuongXa" AND "DaXoa" = FALSE AND "TrangThai" = 'Đang học') THEN RAISE EXCEPTION 'RBTV34 Lỗi: SINHVIEN con hoat dong.'; END IF;
        ELSIF TG_TABLE_NAME = 'DANTOC' THEN
            IF EXISTS (SELECT 1 FROM "SINHVIEN" WHERE "MaDanToc" = NEW."MaDanToc" AND "DaXoa" = FALSE AND "TrangThai" = 'Đang học') THEN RAISE EXCEPTION 'RBTV34 Lỗi: SINHVIEN con hoat dong.'; END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_phuongxa_parent ON "PHUONGXA";
CREATE TRIGGER trg_rbtv34_phuongxa_parent BEFORE UPDATE OF "TrangThai" ON "PHUONGXA" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_px_dt_parent();
DROP TRIGGER IF EXISTS trg_rbtv34_dantoc_parent ON "DANTOC";
CREATE TRIGGER trg_rbtv34_dantoc_parent BEFORE UPDATE OF "TrangThai" ON "DANTOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_px_dt_parent();

-- 12. NGANHHOC (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_nganhhoc_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE) OR (NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE) THEN
        IF EXISTS (SELECT 1 FROM "SINHVIEN" WHERE "MaNganh" = NEW."MaNganh" AND "DaXoa" = FALSE AND "TrangThai" = 'Đang học') THEN RAISE EXCEPTION 'RBTV34 Lỗi: SINHVIEN con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "CHUONGTRINHHOC" WHERE "MaNganh" = NEW."MaNganh" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: CHUONGTRINHHOC con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_nganhhoc_parent ON "NGANHHOC";
CREATE TRIGGER trg_rbtv34_nganhhoc_parent BEFORE UPDATE OF "DaXoa", "TrangThai" ON "NGANHHOC" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_nganhhoc_parent();

-- 13. NHOMNGUOIDUNG (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_nhomnguoidung_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."DaXoa" = TRUE AND OLD."DaXoa" = FALSE THEN
        IF EXISTS (SELECT 1 FROM "NGUOIDUNG" WHERE "MaNhom" = NEW."MaNhom" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: NGUOIDUNG con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_nhomnguoidung_parent ON "NHOMNGUOIDUNG";
CREATE TRIGGER trg_rbtv34_nhomnguoidung_parent BEFORE UPDATE OF "DaXoa" ON "NHOMNGUOIDUNG" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_nhomnguoidung_parent();

-- 14. NGUOIDUNG (Cha)
CREATE OR REPLACE FUNCTION fn_chk_rbtv34_nguoidung_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."TrangThai" = FALSE AND OLD."TrangThai" = TRUE THEN
        IF EXISTS (SELECT 1 FROM "SINHVIEN" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan" AND "DaXoa" = FALSE AND "TrangThai" = 'Đang học') THEN RAISE EXCEPTION 'RBTV34 Lỗi: SINHVIEN con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "QUANTRIVIEN" WHERE "MaTaiKhoan" = NEW."MaTaiKhoan" AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: QUANTRIVIEN con hoat dong.'; END IF;
        IF EXISTS (SELECT 1 FROM "THONGBAO" WHERE "MaTaiKhoanNhan" = NEW."MaTaiKhoan" AND "DaXoa" = FALSE AND "TrangThai" = TRUE) THEN RAISE EXCEPTION 'RBTV34 Lỗi: THONGBAO con hoat dong.'; END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rbtv34_nguoidung_parent ON "NGUOIDUNG";
CREATE TRIGGER trg_rbtv34_nguoidung_parent BEFORE UPDATE OF "TrangThai" ON "NGUOIDUNG" FOR EACH ROW EXECUTE FUNCTION fn_chk_rbtv34_nguoidung_parent();
