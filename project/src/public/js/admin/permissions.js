var currentTab = 'groups';
var groupEditMode = false;
var groupEditId = null;
var funcEditMode = false;
var funcEditId = null;
var permGroupId = null;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-groups').style.display = tab === 'groups' ? '' : 'none';
  document.getElementById('tab-functions').style.display = tab === 'functions' ? '' : 'none';
}

function getGroupPortal(groupId) {
  return normalizeCode(groupId) === 'SINHVIEN' ? 'student' : 'admin';
}

function getFunctionPortal(func) {
  if (func && func.LoaiQuyen) return func.LoaiQuyen;
  var code = normalizeCode(func && func.MaChucNang);
  var screen = String((func && func.TenManHinhDuocLoad) || '');
  if (code.indexOf('STUDENT_') === 0 || screen.indexOf('/student') === 0) return 'student';
  if (code.indexOf('ADMIN_') === 0 || screen.indexOf('/admin') === 0 || screen.indexOf('/api') === 0) return 'admin';
  return 'shared';
}

function getPortalLabel(portal) {
  if (portal === 'student') return 'Cổng sinh viên';
  if (portal === 'admin') return 'Cổng quản trị';
  return 'Dùng chung';
}

function getPortalBadgeClass(portal) {
  if (portal === 'student') return 'badge-success';
  if (portal === 'admin') return 'badge-info';
  return 'badge-secondary';
}

function isFunctionAllowedForGroup(groupId, func) {
  var portal = getFunctionPortal(func);
  if (portal === 'shared') return true;
  return portal === getGroupPortal(groupId);
}

document.addEventListener('DOMContentLoaded', function() {
  var tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'functions') switchTab('functions');
});

function openGroupModal(mode, data) {
  groupEditMode = mode === 'edit';
  groupEditId = groupEditMode ? data.MaNhom : null;
  document.getElementById('group-modal-title').textContent = groupEditMode ? 'Sửa nhóm' : 'Thêm nhóm';
  document.getElementById('grp-ma').value = groupEditMode ? data.MaNhom : '';
  document.getElementById('grp-ten').value = groupEditMode ? data.TenNhom : '';
  document.getElementById('grp-ma').disabled = groupEditMode;
  document.getElementById('group-modal').classList.add('active');
}

function closeGroupModal() {
  document.getElementById('group-modal').classList.remove('active');
}

async function saveGroup() {
  var MaNhom = normalizeCode(document.getElementById('grp-ma').value);
  var TenNhom = document.getElementById('grp-ten').value.trim();
  if (!MaNhom || !TenNhom) {
    showToast('Vui lòng nhập đầy đủ thông tin', 'error');
    return;
  }

  var url = groupEditMode ? '/api/permissions/groups/' + encodeURIComponent(groupEditId) : '/api/permissions/groups';
  var res = await apiFetch(url, { method: groupEditMode ? 'PUT' : 'POST', body: { MaNhom: MaNhom, TenNhom: TenNhom } });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

async function deleteGroup(id) {
  if (!confirm('Xóa nhóm "' + id + '"?')) return;
  var res = await apiFetch('/api/permissions/groups/' + encodeURIComponent(id), { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

function openFunctionModal(mode, data) {
  funcEditMode = mode === 'edit';
  funcEditId = funcEditMode ? data.MaChucNang : null;
  document.getElementById('function-modal-title').textContent = funcEditMode ? 'Sửa quyền' : 'Thêm quyền';
  document.getElementById('func-ma').value = funcEditMode ? data.MaChucNang : '';
  document.getElementById('func-ten').value = funcEditMode ? data.TenChucNang : '';
  document.getElementById('func-manhinh').value = funcEditMode ? data.TenManHinhDuocLoad : '';
  document.getElementById('func-ma').disabled = funcEditMode;
  document.getElementById('function-modal').classList.add('active');
}

function closeFunctionModal() {
  document.getElementById('function-modal').classList.remove('active');
}

async function saveFunction() {
  var MaChucNang = normalizeCode(document.getElementById('func-ma').value);
  var TenChucNang = document.getElementById('func-ten').value.trim();
  var TenManHinhDuocLoad = document.getElementById('func-manhinh').value.trim();
  if (!MaChucNang || !TenChucNang || !TenManHinhDuocLoad) {
    showToast('Vui lòng nhập đầy đủ thông tin', 'error');
    return;
  }

  var url = funcEditMode ? '/api/permissions/functions/' + encodeURIComponent(funcEditId) : '/api/permissions/functions';
  var res = await apiFetch(url, {
    method: funcEditMode ? 'PUT' : 'POST',
    body: { MaChucNang: MaChucNang, TenChucNang: TenChucNang, TenManHinhDuocLoad: TenManHinhDuocLoad }
  });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

async function deleteFunction(id) {
  if (!confirm('Xóa quyền "' + id + '"?')) return;
  var res = await apiFetch('/api/permissions/functions/' + encodeURIComponent(id), { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

function renderPermissionList(groupId, allFuncs, currentPerms) {
  var allowedFuncs = allFuncs.filter(function(func) {
    return isFunctionAllowedForGroup(groupId, func);
  });

  if (allowedFuncs.length === 0) {
    return '<div class="empty-state">Không có quyền phù hợp với nhóm này</div>';
  }

  var currentSet = new Set(currentPerms);
  var sections = allowedFuncs.reduce(function(map, func) {
    var portal = getFunctionPortal(func);
    if (!map[portal]) map[portal] = [];
    map[portal].push(func);
    return map;
  }, {});

  var portalOrder = ['admin', 'student', 'shared'];
  var html = '<div style="max-height:420px;overflow-y:auto">';

  portalOrder.forEach(function(portal) {
    var funcs = sections[portal] || [];
    if (funcs.length === 0) return;
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin:8px 0 6px">';
    html += '<span class="badge ' + getPortalBadgeClass(portal) + '">' + escapeHtml(getPortalLabel(portal)) + '</span>';
    html += '<small style="color:var(--text-muted)">' + funcs.length + ' quyền</small>';
    html += '</div>';

    funcs.forEach(function(func) {
      var code = normalizeCode(func.MaChucNang);
      var checked = currentSet.has(code) ? ' checked' : '';
      html += '<label style="display:flex;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border-light);gap:12px;cursor:pointer">';
      html += '<input type="checkbox" class="perm-checkbox" value="' + escapeHtml(code) + '"' + checked + ' style="width:18px;height:18px;margin-top:2px">';
      html += '<span style="display:block;min-width:0">';
      html += '<strong>' + escapeHtml(func.TenChucNang) + '</strong><br>';
      html += '<small style="color:var(--text-muted)">' + escapeHtml(code) + ' - ' + escapeHtml(func.TenManHinhDuocLoad) + '</small>';
      html += '</span>';
      html += '</label>';
    });
  });

  html += '</div>';
  return html;
}

async function openPermissionModal(groupId, groupName) {
  permGroupId = groupId;
  document.getElementById('permission-modal-title').textContent = 'Phân quyền: ' + groupName;
  document.getElementById('perm-group-label').textContent = 'Nhóm: ' + groupName + ' (' + groupId + ')';
  document.getElementById('permission-modal').classList.add('active');

  var listEl = document.getElementById('permission-list');
  listEl.innerHTML = '<div class="empty-state">Đang tải...</div>';

  try {
    var funcRes = await apiFetch('/api/permissions/functions?all=true');
    var permRes = await apiFetch('/api/permissions/groups/' + encodeURIComponent(groupId) + '/permissions');

    var allFuncs = funcRes.data || [];
    var currentPerms = (permRes.data || []).map(function(permission) {
      return normalizeCode(permission.MaChucNang);
    });

    if (allFuncs.length === 0) {
      listEl.innerHTML = '<div class="empty-state">Chưa có quyền nào trong hệ thống</div>';
      return;
    }

    listEl.innerHTML = renderPermissionList(groupId, allFuncs, currentPerms);
  } catch (e) {
    listEl.innerHTML = '<div class="empty-state">Lỗi tải dữ liệu</div>';
  }
}

function closePermissionModal() {
  document.getElementById('permission-modal').classList.remove('active');
}

async function savePermissions() {
  var checkboxes = document.querySelectorAll('.perm-checkbox');
  var permissions = [];
  checkboxes.forEach(function(cb) {
    if (cb.checked) permissions.push(normalizeCode(cb.value));
  });

  var res = await apiFetch('/api/permissions/groups/' + encodeURIComponent(permGroupId) + '/permissions', {
    method: 'PUT',
    body: { permissions: permissions }
  });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}
