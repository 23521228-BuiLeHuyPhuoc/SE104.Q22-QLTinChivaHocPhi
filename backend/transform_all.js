/**
 * DEFINITIVE transformation script v2 - Placeholder approach
 * 
 * Strategy:
 *   1. Extract ALL string literals (template + single-quoted) → placeholders
 *   2. Transform remaining pure JS code (no quotes needed)
 *   3. Transform SQL strings IN placeholders (with double-quotes)
 *   4. Leave non-SQL strings in placeholders (with simple PascalCase, no double-quotes)
 *   5. Reconstruct the file
 */

const fs = require('fs');
const path = require('path');

// ===================================================================
// MAPPINGS
// ===================================================================
const TABLE_MAP = {
  'thong_bao':             'THONGBAO',
  'phieu_thu_hoc_phi':     'PHIEUTHUHOCPHI',
  'chi_tiet_dang_ky':      'CHITIETDANGKY',
  'phieu_dang_ky':         'PHIEUDANGKY',
  'diem_sinh_vien':        'DIEMSINHVIEN',
  'lich_hoc_lop':          'LICHHOCLOP',
  'don_gia_tin_chi':       'DONGIATINCHI',
  'lop_mo':                'LOPMO',
  'chuong_trinh_hoc':      'CHUONGTRINHHOC',
  'hoc_ky':                'HOCKY',
  'nam_hoc':               'NAMHOC',
  'cau_hinh_dang_ky':      'CAUHINHDANGKY',
  'tiet_hoc':              'TIETHOC',
  'dieu_kien_mon_hoc':     'DIEUKIENMONHOC',
  'mon_hoc':               'MONHOC',
  'quan_tri_vien':         'QUANTRIVIEN',
  'doi_tuong_sinh_vien':   'DOITUONGSINHVIEN',
  'sinh_vien':             'SINHVIEN',
  'tai_khoan':             'TAIKHOAN',
  'nganh_hoc':             'NGANHHOC',
  'doi_tuong':             'DOITUONG',
  'phuong_xa':             'PHUONGXA',
  'dan_toc':               'DANTOC',
  'khoa':                  'KHOA',
  'tinh':                  'TINH',
  'lop':                   'LOP',
  'huyen':                 'HUYEN',
};

function snakeToPascal(s) {
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

const ALL_SNAKE_COLS = [
  'so_tin_chi_hoc_cai_thien', 'so_mon_hoc_cai_thien', 'tien_hoc_cai_thien',
  'ngay_bat_dau_dang_ky', 'ngay_ket_thuc_dang_ky',
  'so_tin_chi_hoc_moi', 'so_tin_chi_hoc_lai', 'so_luong_da_dang_ky', 'so_luong_toi_da',
  'tong_tien_phai_dong', 'tong_tien_dang_ky', 'tong_tien_da_dong', 'han_dong_hoc_phi',
  'so_phieu_dang_ky', 'ma_tai_khoan_nhan', 'ma_mon_dieu_kien', 'diem_trung_binh',
  'nguoi_nhap_diem', 'ngay_nhap_diem', 'tien_mien_giam', 'dia_chi_lien_he',
  'la_dan_toc_thieu_so', 'so_tin_chi_toi_thieu', 'thoi_gian_dao_tao',
  'so_mon_hoc_moi', 'so_mon_hoc_lai', 'tien_hoc_moi', 'tien_hoc_lai',
  'lan_dang_nhap_cuoi', 'ma_quan_tri_vien', 'hoc_ky_du_kien', 'ngay_nhap_hoc',
  'ti_le_giam_hoc_phi', 'ma_tiet_bat_dau', 'ma_tiet_ket_thuc',
  'loai_dieu_kien', 'thu_trong_tuan', 'file_minh_chung', 'ma_phuong_xa',
  'ten_phuong_xa', 'ten_dang_nhap', 'hinh_thuc_thu', 'ngay_cap_nhat',
  'ngay_ket_thuc', 'ngay_bat_dau', 'loai_thong_bao', 'ten_doi_tuong',
  'ma_doi_tuong', 'ma_tai_khoan', 'so_phieu_thu', 'ten_mon_hoc', 'ma_mon_hoc',
  'ten_dan_toc', 'ma_dan_toc', 'ten_viet_tat', 'ngay_het_han', 'refresh_token',
  'ngay_dang_ky', 'ma_giao_dich', 'tong_tin_chi', 'loai_dang_ky', 'anh_dai_dien',
  'ngay_ap_dung', 'ti_le_giam', 'ma_thong_bao', 'gio_bat_dau',
  'gio_ket_thuc', 'ma_nam_hoc', 'ten_nam_hoc', 'so_tien_thu', 'ten_hoc_ky',
  'ma_hoc_ky', 'loai_hoc_ky', 'truong_khoa', 'do_uu_tien', 'nguoi_thu',
  'diem_qua_trinh', 'diem_giua_ky', 'diem_cuoi_ky',
  'trang_thai', 'ngay_sinh', 'gioi_tinh', 'duong_dan', 'noi_dung', 'tieu_de',
  'so_tin_chi', 'ten_nganh', 'ten_khoa', 'ten_tinh', 'ma_nganh', 'phong_hoc',
  'thanh_tien', 'lich_hoc', 'giang_vien', 'bat_buoc', 'nguoi_tao',
  'ho_ten_cha', 'ho_ten_me', 'sdt_cha', 'sdt_me', 'ngay_doc', 'ngay_huy',
  'ghim_top', 'loai_mon', 'loai_hoc', 'mat_khau', 'ma_tinh', 'ma_khoa',
  'ten_lop', 'doi_tuong', 'ma_lop_mo', 'lop_mo_id', 'ma_lop', 'khu_vuc',
  'ngay_tao', 'ngay_lap', 'don_gia', 'diem_chu', 'lan_hoc', 'ket_qua',
  'ghi_chu', 'so_phieu', 'phong_ban', 'chuc_vu', 'so_tien', 'da_doc',
  'ho_ten', 'so_tiet', 'thu_tu', 'dia_chi', 'mo_ta', 'ma_sv', 'email',
  'role', 'cccd', 'loai', 'sdt', 'ly_do_huy',
  'nam_bat_dau', 'nam_ket_thuc', 'ten_tiet', 'ma_tiet',
  'loai_tinh', 'ma_cau_hinh', 'ten_cau_hinh', 'gia_tri', 'gia_tri_so',
];

const COL_MAP = {};
for (const col of ALL_SNAKE_COLS) {
  COL_MAP[col] = snakeToPascal(col);
}

// Sort by length descending to avoid partial matches
const sortedTableEntries = Object.entries(TABLE_MAP).sort((a, b) => b[0].length - a[0].length);
const sortedColEntries = Object.entries(COL_MAP).sort((a, b) => b[0].length - a[0].length);

function hasSQL(str) {
  return /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|FROM|WHERE|JOIN|RETURNING|ROLLBACK|COMMIT|BEGIN)\b/i.test(str);
}

// ===================================================================
// TRANSFORM init.sql (pure SQL file - everything gets double-quoted)
// ===================================================================
function transformInitSQL(content) {
  for (const [old, newName] of sortedTableEntries) {
    content = content.replace(new RegExp(`\\b${old}\\b`, 'g'), `"${newName}"`);
  }
  for (const [old, newName] of sortedColEntries) {
    content = content.replace(new RegExp(`\\b${old}\\b`, 'g'), `"${newName}"`);
  }
  content = content.replace(/""(\w+)""/g, '"$1"');
  
  // DIEMSINHVIEN: remove columns
  content = content.replace(/\s+"DiemQuaTrinh"\s+DECIMAL\(4,2\),?\r?\n/g, '\n');
  content = content.replace(/\s+"DiemGiuaKy"\s+DECIMAL\(4,2\),?\r?\n/g, '\n');
  content = content.replace(/\s+"DiemCuoiKy"\s+DECIMAL\(4,2\),?\r?\n/g, '\n');
  content = content.replace(/\s+"SoTinChi"\s+INTEGER\s+NOT\s+NULL,?\r?\n/g, '\n');
  content = content.replace(/\s+CONSTRAINT\s+chk_diem_qua_trinh\s+CHECK\s+\([^)]+\),?\r?\n/g, '\n');
  content = content.replace(/\s+CONSTRAINT\s+chk_diem_giua_ky\s+CHECK\s+\([^)]+\),?\r?\n/g, '\n');
  content = content.replace(/\s+CONSTRAINT\s+chk_diem_cuoi_ky\s+CHECK\s+\([^)]+\),?\r?\n/g, '\n');
  
  // Fix DIEMSINHVIEN INSERT column list & data
  content = content.replace(
    /INSERT INTO "DIEMSINHVIEN" \("Id", "MaSv", "MaMonHoc", "MaHocKy", "MaLop", "DiemQuaTrinh", "DiemGiuaKy", "DiemCuoiKy", "DiemTrungBinh", "DiemChu", "SoTinChi", "LanHoc", "KetQua", "GhiChu", "NgayNhapDiem", "NguoiNhapDiem"\)/g,
    'INSERT INTO "DIEMSINHVIEN" ("Id", "MaSv", "MaMonHoc", "MaHocKy", "MaLop", "DiemTrungBinh", "DiemChu", "LanHoc", "KetQua", "GhiChu", "NgayNhapDiem", "NguoiNhapDiem")'
  );
  
  // Fix data VALUES - remove positions 5,6,7 (diem_qua_trinh, diem_giua_ky, diem_cuoi_ky) and 10 (so_tin_chi)
  // Pattern: (id, 'maSv', 'maMh', 'maHk', 'maLop', dqt, dgk, dck, dtb, 'dc', stc, lh, 'kq', gc, 'nnd', nnd2)
  const dsvRe = /\((\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*([\d.]+|NULL),\s*([\d.]+|NULL),\s*([\d.]+|NULL),\s*([\d.]+|NULL),\s*('[^']*'|NULL),\s*(\d+),\s*(\d+),\s*'([^']*)',\s*(NULL|'[^']*'),\s*('[^']*'|NULL),\s*(\d+|NULL)\)/g;
  content = content.replace(dsvRe, (match, id, maSv, maMh, maHk, maLop, dqt, dgk, dck, dtb, dc, stc, lh, kq, gc, nnd, nnd2) => {
    return `(${id}, '${maSv}', '${maMh}', '${maHk}', '${maLop}', ${dtb}, ${dc}, ${lh}, '${kq}', ${gc}, ${nnd}, ${nnd2})`;
  });
  
  return content;
}

// ===================================================================
// TRANSFORM JS files using placeholder approach
// ===================================================================
function transformJSFile(content) {
  const placeholders = [];
  
  // Step 1: Extract template literals (backtick strings)
  // Handle ${...} inside them by tracking brace depth
  let result = '';
  let i = 0;
  while (i < content.length) {
    if (content[i] === '`') {
      let tpl = '`';
      i++;
      while (i < content.length && content[i] !== '`') {
        if (content[i] === '\\') {
          tpl += content[i] + (content[i+1] || '');
          i += 2;
        } else if (content[i] === '$' && i+1 < content.length && content[i+1] === '{') {
          tpl += '${';
          i += 2;
          let depth = 1;
          while (i < content.length && depth > 0) {
            if (content[i] === '{') depth++;
            else if (content[i] === '}') { depth--; if (depth === 0) break; }
            tpl += content[i];
            i++;
          }
          tpl += '}';
          i++; // skip closing }
        } else {
          tpl += content[i];
          i++;
        }
      }
      if (i < content.length) { tpl += '`'; i++; }
      const idx = placeholders.length;
      placeholders.push(tpl);
      result += `__TPL_${idx}__`;
    } else {
      result += content[i];
      i++;
    }
  }
  
  // Step 2: Extract single-quoted strings that contain SQL
  result = result.replace(/'([^'\\]|\\.)*'/g, (match) => {
    if (hasSQL(match)) {
      const idx = placeholders.length;
      placeholders.push(match);
      return `__TPL_${idx}__`;
    }
    return match; // Non-SQL single-quoted string: leave as-is
  });
  
  // Step 3: Transform pure JS code (replace snake_case → PascalCase, NO quotes)
  for (const [old, newName] of sortedColEntries) {
    result = result.replace(new RegExp(`\\b${old}\\b`, 'g'), newName);
  }
  // Table names rarely appear in JS code outside strings, but just in case
  // DON'T replace table names in JS code - they only appear in SQL strings
  // BUT 'sinh_vien' might appear as a role value - it's NOT a table ref
  // We don't want to replace it in JS context 
  
  // Step 4: Transform SQL placeholders (add double-quotes for identifiers)
  for (let p = 0; p < placeholders.length; p++) {
    let sql = placeholders[p];
    for (const [old, newName] of sortedTableEntries) {
      sql = sql.replace(new RegExp(`\\b${old}\\b`, 'g'), `"${newName}"`);
    }
    for (const [old, newName] of sortedColEntries) {
      sql = sql.replace(new RegExp(`\\b${old}\\b`, 'g'), `"${newName}"`);
    }
    sql = sql.replace(/""(\w+)""/g, '"$1"');
    placeholders[p] = sql;
  }
  
  // Step 5: Reconstruct
  for (let p = 0; p < placeholders.length; p++) {
    result = result.replace(`__TPL_${p}__`, placeholders[p]);
  }
  
  return result;
}

// ===================================================================
// MAIN
// ===================================================================
console.log('=== Definitive Transform v2 ===\n');

// 1. Transform init.sql
console.log('1. Transforming init.sql...');
const sqlPath = path.join(__dirname, 'src', 'config', 'init.sql');
fs.writeFileSync(sqlPath, transformInitSQL(fs.readFileSync(sqlPath, 'utf-8')), 'utf-8');
console.log('   OK');

// 2. Transform controllers
const controllerDir = path.join(__dirname, 'src', 'controllers');
const controllerFiles = fs.readdirSync(controllerDir).filter(f => f.endsWith('.js'));
console.log(`\n2. Transforming ${controllerFiles.length} controllers...`);
for (const file of controllerFiles) {
  const fp = path.join(controllerDir, file);
  fs.writeFileSync(fp, transformJSFile(fs.readFileSync(fp, 'utf-8')), 'utf-8');
  console.log(`   ${file}`);
}

// 3. Transform viewRoutes.js
console.log('\n3. Transforming viewRoutes.js...');
const vrPath = path.join(__dirname, 'src', 'routes', 'viewRoutes.js');
if (fs.existsSync(vrPath)) {
  fs.writeFileSync(vrPath, transformJSFile(fs.readFileSync(vrPath, 'utf-8')), 'utf-8');
  console.log('   OK');
}

// 4. Fix auth middleware
console.log('\n4. Fixing auth middleware...');
const authPath = path.join(__dirname, 'src', 'middleware', 'auth.js');
if (fs.existsSync(authPath)) {
  let auth = fs.readFileSync(authPath, 'utf-8');
  auth = auth.replace(
    /req\.user\.role\s*===\s*'admin'/g,
    "(req.user.Role === 'admin' || req.user.role === 'admin')"
  );
  fs.writeFileSync(authPath, auth, 'utf-8');
  console.log('   OK');
}

// 5. Verify syntax
console.log('\n5. Verifying syntax...');
let errors = 0;
const allJSFiles = [
  ...controllerFiles.map(f => path.join(controllerDir, f)),
  vrPath, authPath,
].filter(f => fs.existsSync(f));
for (const file of allJSFiles) {
  try {
    new Function(fs.readFileSync(file, 'utf-8'));
    console.log(`   OK  ${path.basename(file)}`);
  } catch (e) {
    errors++;
    // Find the line number
    const m = e.message.match(/(\d+)/);
    const lineInfo = m ? ` (near line ~${m[1]})` : '';
    console.error(`   ERR ${path.basename(file)}: ${e.message}${lineInfo}`);
  }
}

if (errors === 0) {
  console.log('\n✅ All files transformed and syntax-verified!');
} else {
  console.error(`\n❌ ${errors} file(s) have syntax errors.`);
}
