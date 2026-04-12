(async function() {
  try {
    const meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    const sid = meRes.data.student.MaSv;

    const res = await apiFetch('/api/registrations/student/' + sid);
    document.getElementById('loading').classList.add('hidden');

    if (res.success && res.data.courses && res.data.courses.length > 0) {
      document.getElementById('schedule-container').classList.remove('hidden');
      var grid = document.querySelector('.schedule-grid');

      // Time slots
      var timeSlots = [
        '7:30-8:15', '8:15-9:00', '9:15-10:00', '10:00-10:45',
        '13:30-14:15', '14:15-15:00', '15:15-16:00', '16:00-16:45',
        '17:45-18:30', '18:30-19:15'
      ];

      // Parse schedule data
      var schedule = {};
      for (var d = 2; d <= 7; d++) schedule[d] = {};

      res.data.courses.forEach(c => {
        if (c.LOP && c.LOP.LichHoc && c.TrangThai === 'Đã đăng ký') {
          // Try to parse "Thứ X (time)"
          var match = c.LOP.LichHoc.match(/Thứ\s*(\d)/);
          if (match) {
            var day = parseInt(match[1]);
            if (!schedule[day]) schedule[day] = {};
            schedule[day][c.LOP.MaLop] = (c.LOP.MONHOC ? c.LOP.MONHOC.TenMonHoc : '') + ' (' + (c.LOP.PhongHoc || '') + ')';
          }
        }
      });

      // Build grid rows
      timeSlots.forEach((slot, idx) => {
        var timeEl = document.createElement('div');
        timeEl.className = 'schedule-time';
        timeEl.textContent = 'T' + (idx + 1) + ' ' + slot;
        grid.appendChild(timeEl);

        for (var d = 2; d <= 7; d++) {
          var cell = document.createElement('div');
          cell.className = 'schedule-cell';
          if (schedule[d]) {
            Object.keys(schedule[d]).forEach(key => {
              var item = document.createElement('div');
              item.className = 'schedule-item';
              item.textContent = schedule[d][key];
              cell.appendChild(item);
            });
          }
          grid.appendChild(cell);
        }
      });
    } else {
      document.getElementById('schedule-message').classList.remove('hidden');
    }
  } catch(e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('schedule-message').classList.remove('hidden');
    console.error(e);
  }
})();
