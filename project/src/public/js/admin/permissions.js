var currentTab = 'groups';
var groupEditMode = false;
var groupEditId = null;
var funcEditMode = false;
var funcEditId = null;
var permGroupId = null;

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-groups').style.display = tab === 'groups' ? '' : 'none';
  document.getElementById('tab-functions').style.display = tab === 'functions' ? '' : 'none';
}

// ── Group Modal ──
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
  var MaNhom = document.getElementById('grp-ma').value.trim();
  var TenNhom = document.getElementById('grp-ten').value.trim();
  if (!MaNhom || !TenNhom) { showToast('Vui lòng nhập đầy đủ thông tin', 'error'); return; }

  var url = groupEditMode ? '/api/permissions/groups/' + groupEditId : '/api/permissions/groups';
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
  var res = await apiFetch('/api/permissions/groups/' + id, { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

// ── Function Modal ──
function openFunctionModal(mode, data) {
  funcEditMode = mode === 'edit';
  funcEditId = funcEditMode ? data.MaChucNang : null;
  document.getElementById('function-modal-title').textContent = funcEditMode ? 'Sửa chức năng' : 'Thêm chức năng';
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
  var MaChucNang = document.getElementById('func-ma').value.trim();
  var TenChucNang = document.getElementById('func-ten').value.trim();
  var TenManHinhDuocLoad = document.getElementById('func-manhinh').value.trim();
  if (!MaChucNang || !TenChucNang || !TenManHinhDuocLoad) { showToast('Vui lòng nhập đầy đủ', 'error'); return; }

  var url = funcEditMode ? '/api/permissions/functions/' + funcEditId : '/api/permissions/functions';
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
  if (!confirm('Xóa chức năng "' + id + '"?')) return;
  var res = await apiFetch('/api/permissions/functions/' + id, { method: 'DELETE' });
  if (res.success) {
    showToast(res.message, 'success');
    setTimeout(function() { location.reload(); }, 500);
  } else {
    showToast(res.message || 'Lỗi', 'error');
  }
}

// ── Permission Modal ──
async function openPermissionModal(groupId, groupName) {
  permGroupId = groupId;
  document.getElementById('permission-modal-title').textContent = 'Phân quyền: ' + groupName;
  document.getElementById('perm-group-label').textContent = 'Nhóm: ' + groupName + ' (' + groupId + ')';
  document.getElementById('permission-modal').classList.add('active');

  var listEl = document.getElementById('permission-list');
  listEl.innerHTML = '<div class="empty-state">Đang tải...</div>';

  try {
    var funcRes = await apiFetch('/api/permissions/functions');
    var permRes = await apiFetch('/api/permissions/groups/' + groupId + '/permissions');

    var allFuncs = funcRes.data || [];
    var currentPerms = (permRes.data || []).map(function(p) { return p.MaChucNang; });

    if (allFuncs.length === 0) {
      listEl.innerHTML = '<div class="empty-state">Chưa có chức năng nào trong hệ thống</div>';
      return;
    }

    var html = '<div style="max-height:400px;overflow-y:auto">';
    allFuncs.forEach(function(f) {
      var checked = currentPerms.indexOf(f.MaChucNang) >= 0 ? ' checked' : '';
      html += '<label style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-light);gap:12px;cursor:pointer">';
      html += '<input type="checkbox" class="perm-checkbox" value="' + f.MaChucNang + '"' + checked + ' style="width:18px;height:18px">';
      html += '<div><strong>' + f.TenChucNang + '</strong><br><small style="color:var(--text-muted)">' + f.MaChucNang + ' — ' + f.TenManHinhDuocLoad + '</small></div>';
      html += '</label>';
    });
    html += '</div>';
    listEl.innerHTML = html;
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
    if (cb.checked) permissions.push(cb.value);
  });

  var res = await apiFetch('/api/permissions/groups/' + permGroupId + '/permissions', {
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
