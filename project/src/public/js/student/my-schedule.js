(async function() {
  try {
    var meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    var sid = meRes.data.student.MaSv;

    var res = await apiFetch('/api/registrations/student/' + sid);
    document.getElementById('loading').classList.add('hidden');

    if (res.success && res.data.courses && res.data.courses.length > 0) {
      document.getElementById('schedule-container').classList.remove('hidden');
      var grid = document.querySelector('.schedule-grid');
      var timeSlots = [
        '7:30-8:15', '8:15-9:00', '9:15-10:00', '10:00-10:45',
        '13:30-14:15', '14:15-15:00', '15:15-16:00', '16:00-16:45',
        '17:45-18:30', '18:30-19:15'
      ];
      var schedule = {};
      for (var d = 2; d <= 7; d++) schedule[d] = [];

      res.data.courses.forEach(function(c) {
        var isCancelled = String(c.TrangThai || '').toLowerCase().indexOf('hủy') >= 0;
        if (!isCancelled && c.LOP && c.LOP.LichHoc) {
          var match = c.LOP.LichHoc.match(/Thứ\s*(\d)/i);
          if (match) {
            var day = parseInt(match[1], 10);
            if (!schedule[day]) schedule[day] = [];
            schedule[day].push((c.LOP.MONHOC ? c.LOP.MONHOC.TenMonHoc : c.LOP.MaLop) + ' (' + (c.LOP.PhongHoc || '-') + ')');
          }
        }
      });

      timeSlots.forEach(function(slot, idx) {
        var timeEl = document.createElement('div');
        timeEl.className = 'schedule-time';
        timeEl.textContent = 'T' + (idx + 1) + ' ' + slot;
        grid.appendChild(timeEl);

        for (var day = 2; day <= 7; day++) {
          var cell = document.createElement('div');
          cell.className = 'schedule-cell';
          (schedule[day] || []).forEach(function(text) {
            var item = document.createElement('div');
            item.className = 'schedule-item';
            item.textContent = text;
            cell.appendChild(item);
          });
          grid.appendChild(cell);
        }
      });
    } else {
      document.getElementById('schedule-message').classList.remove('hidden');
    }
  } catch (e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('schedule-message').classList.remove('hidden');
  }
})();
