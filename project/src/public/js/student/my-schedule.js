function parseScheduleText(text) {
  var source = String(text || '');
  var dayMatch = source.match(/Thứ\s*(\d)/i) || source.match(/T\s*(\d)/i);
  var timeMatch = source.match(/(\d{1,2})[:h](\d{2})\s*[-–]\s*(\d{1,2})[:h](\d{2})/i);
  return {
    day: dayMatch ? parseInt(dayMatch[1], 10) : null,
    start: timeMatch ? (parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10)) : null,
    end: timeMatch ? (parseInt(timeMatch[3], 10) * 60 + parseInt(timeMatch[4], 10)) : null
  };
}

function slotOverlapsCourse(slot, courseTime) {
  if (!courseTime || courseTime.start === null || courseTime.end === null) return false;
  return courseTime.start < slot.end && courseTime.end > slot.start;
}

async function loadAllRegisteredCourses(studentId) {
  var page = 1;
  var courses = [];
  var totalPages = 1;
  do {
    var res = await apiFetch('/api/registrations/student/' + studentId + '?page=' + page);
    if (!res.success || !res.data) return courses;
    courses = courses.concat(res.data.courses || []);
    totalPages = Number(res.pagination && res.pagination.totalPages || 1);
    page += 1;
  } while (page <= totalPages);
  return courses;
}

(async function() {
  try {
    var meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    var sid = meRes.data.student.MaSv;

    var courses = await loadAllRegisteredCourses(sid);
    document.getElementById('loading').classList.add('hidden');

    if (courses.length > 0) {
      document.getElementById('schedule-container').classList.remove('hidden');
      var grid = document.querySelector('.schedule-grid');
      var timeSlots = [
        { label: 'T1 7:30-8:15', start: 450, end: 495 },
        { label: 'T2 8:15-9:00', start: 495, end: 540 },
        { label: 'T3 9:15-10:00', start: 555, end: 600 },
        { label: 'T4 10:00-10:45', start: 600, end: 645 },
        { label: 'T5 13:30-14:15', start: 810, end: 855 },
        { label: 'T6 14:15-15:00', start: 855, end: 900 },
        { label: 'T7 15:15-16:00', start: 915, end: 960 },
        { label: 'T8 16:00-16:45', start: 960, end: 1005 },
        { label: 'T9 17:45-18:30', start: 1065, end: 1110 },
        { label: 'T10 18:30-19:15', start: 1110, end: 1155 }
      ];
      var schedule = {};
      for (var d = 2; d <= 7; d++) schedule[d] = [];

      courses.forEach(function(c) {
        var isCancelled = String(c.TrangThai || '').toLowerCase().indexOf('hủy') >= 0;
        if (!isCancelled && c.LOP && c.LOP.LichHoc) {
          var parsed = parseScheduleText(c.LOP.LichHoc);
          if (parsed.day && schedule[parsed.day]) {
            schedule[parsed.day].push({
              time: parsed,
              text: (c.LOP.MONHOC ? c.LOP.MONHOC.TenMonHoc : c.LOP.MaLop) + ' (' + (c.LOP.PhongHoc || '-') + ')',
              raw: c.LOP.LichHoc
            });
          }
        }
      });

      var hasItems = false;
      timeSlots.forEach(function(slot) {
        var timeEl = document.createElement('div');
        timeEl.className = 'schedule-time';
        timeEl.textContent = slot.label;
        grid.appendChild(timeEl);

        for (var day = 2; day <= 7; day++) {
          var cell = document.createElement('div');
          cell.className = 'schedule-cell';
          (schedule[day] || []).forEach(function(item) {
            if (item.time.start === null || slotOverlapsCourse(slot, item.time)) {
              hasItems = true;
              var el = document.createElement('div');
              el.className = 'schedule-item';
              el.textContent = item.text;
              el.title = item.raw || '';
              cell.appendChild(el);
            }
          });
          grid.appendChild(cell);
        }
      });

      if (!hasItems) {
        document.getElementById('schedule-container').classList.add('hidden');
        document.getElementById('schedule-message').classList.remove('hidden');
      }
    } else {
      document.getElementById('schedule-message').classList.remove('hidden');
    }
  } catch (e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('schedule-message').classList.remove('hidden');
  }
})();
