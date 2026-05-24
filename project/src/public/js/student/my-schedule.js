var DAYS = [2, 3, 4, 5, 6, 7];
var PERIODS = [
  { id: 'T1', label: 'T1', time: '7:30-8:15', start: 450, end: 495, order: 1 },
  { id: 'T2', label: 'T2', time: '8:15-9:00', start: 495, end: 540, order: 2 },
  { id: 'T3', label: 'T3', time: '9:00-9:45', start: 540, end: 585, order: 3 },
  { id: 'T4', label: 'T4', time: '9:45-10:30', start: 585, end: 630, order: 4 },
  { id: 'T5', label: 'T5', time: '10:45-11:30', start: 645, end: 690, order: 5 },
  { id: 'T6', label: 'T6', time: '13:00-13:45', start: 780, end: 825, order: 6 },
  { id: 'T7', label: 'T7', time: '13:45-14:30', start: 825, end: 870, order: 7 },
  { id: 'T8', label: 'T8', time: '14:30-15:15', start: 870, end: 915, order: 8 },
  { id: 'T9', label: 'T9', time: '15:30-16:15', start: 930, end: 975, order: 9 },
  { id: 'T10', label: 'T10', time: '16:15-17:00', start: 975, end: 1020, order: 10 },
  { id: 'TOI', label: 'Tối', time: '17:45-20:45', start: 1065, end: 1245, order: 11 }
];
var PERIOD_BY_ID = PERIODS.reduce(function(map, period, index) {
  map[period.id] = Object.assign({ index: index }, period);
  return map;
}, {});

function isCancelledStatus(value) {
  return String(value || '').toLowerCase().indexOf('hủy') >= 0;
}

function minutesFromParts(hour, minute) {
  return (parseInt(hour, 10) * 60) + parseInt(minute || '0', 10);
}

function parseLegacyScheduleText(text) {
  var source = String(text || '');
  var dayMatch = source.match(/Thứ\s*(\d)/i) || source.match(/\bT\s*(\d)\b/i);
  if (!dayMatch) return null;

  var periodMatch = source.match(/Tiết\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?/i);
  if (periodMatch) {
    return {
      day: parseInt(dayMatch[1], 10),
      startIndex: Math.max(parseInt(periodMatch[1], 10) - 1, 0),
      endIndex: Math.max(parseInt(periodMatch[2] || periodMatch[1], 10) - 1, 0)
    };
  }

  var timeMatch = source.match(/(\d{1,2})(?:[:h](\d{2}))?\s*[-–]\s*(\d{1,2})(?:[:h](\d{2}))?/i);
  if (!timeMatch) return null;

  var start = minutesFromParts(timeMatch[1], timeMatch[2] || '00');
  var end = minutesFromParts(timeMatch[3], timeMatch[4] || '00');
  if (end <= start) return null;

  var first = PERIODS.findIndex(function(period) { return start < period.end && end > period.start; });
  var last = -1;
  PERIODS.forEach(function(period, index) {
    if (start < period.end && end > period.start) last = index;
  });

  if (first < 0 || last < first) return null;
  return { day: parseInt(dayMatch[1], 10), startIndex: first, endIndex: last };
}

function getPeriodIndex(schedule, fieldName, relationName) {
  var periodId = schedule[fieldName];
  if (PERIOD_BY_ID[periodId]) return PERIOD_BY_ID[periodId].index;
  var order = schedule[relationName] && Number(schedule[relationName].ThuTu);
  if (Number.isFinite(order)) {
    var index = PERIODS.findIndex(function(period) { return period.order === order; });
    if (index >= 0) return index;
  }
  return -1;
}

function getCourseTitle(course) {
  var monHoc = course.LOP && course.LOP.MONHOC;
  return (monHoc && monHoc.TenMonHoc) || course.MaMonHoc || (course.LOP && course.LOP.MaLop) || 'Môn học';
}

function createScheduleItem(course, slot, colorIndex) {
  var startIndex = Math.max(slot.startIndex, 0);
  var endIndex = Math.max(slot.endIndex, startIndex);
  var room = slot.room || (course.LOP && course.LOP.PhongHoc) || '-';
  var startPeriod = PERIODS[startIndex];
  var endPeriod = PERIODS[endIndex];
  var maLop = course.LOP && course.LOP.MaLop;

  return {
    day: slot.day,
    startIndex: startIndex,
    span: endIndex - startIndex + 1,
    colorIndex: colorIndex,
    title: getCourseTitle(course),
    classCode: maLop || '',
    room: room,
    teacher: (course.LOP && course.LOP.GiangVien) || '',
    detail: [
      'Thứ ' + slot.day,
      startPeriod && endPeriod ? 'Tiết ' + startPeriod.order + '-' + endPeriod.order : '',
      room !== '-' ? 'Phòng ' + room : '',
      maLop || ''
    ].filter(Boolean).join(' | ')
  };
}

function getDetailedSlots(course) {
  var openedClasses = (course.LOP && course.LOP.LOPMO) || [];
  return openedClasses.reduce(function(slots, openedClass) {
    (openedClass.LICHHOCLOP || []).forEach(function(schedule) {
      var day = parseInt(schedule.ThuTrongTuan, 10);
      var startIndex = getPeriodIndex(schedule, 'MaTietBatDau', 'TIETHOC_LICHHOCLOP_MaTietBatDauToTIETHOC');
      var endIndex = getPeriodIndex(schedule, 'MaTietKetThuc', 'TIETHOC_LICHHOCLOP_MaTietKetThucToTIETHOC');
      if (DAYS.indexOf(day) >= 0 && startIndex >= 0) {
        slots.push({
          day: day,
          startIndex: startIndex,
          endIndex: endIndex >= startIndex ? endIndex : startIndex,
          room: schedule.PhongHoc
        });
      }
    });
    return slots;
  }, []);
}

function getCourseScheduleItems(courses) {
  var items = [];
  courses.forEach(function(course, index) {
    if (isCancelledStatus(course.TrangThai)) return;
    var slots = getDetailedSlots(course);
    if (!slots.length && course.LOP && course.LOP.LichHoc) {
      var parsed = parseLegacyScheduleText(course.LOP.LichHoc);
      if (parsed && DAYS.indexOf(parsed.day) >= 0) slots.push(parsed);
    }
    slots.forEach(function(slot) {
      items.push(createScheduleItem(course, slot, (index % 6) + 1));
    });
  });
  return items.sort(function(a, b) {
    return a.startIndex - b.startIndex || a.day - b.day || a.title.localeCompare(b.title);
  });
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

function appendText(parent, className, text) {
  var el = document.createElement('div');
  if (className) el.className = className;
  el.textContent = text || '';
  parent.appendChild(el);
}

function renderScheduleGrid(items) {
  var grid = document.querySelector('.schedule-grid');
  grid.innerHTML = '';
  grid.style.setProperty('--schedule-row-count', PERIODS.length);

  appendText(grid, 'schedule-header', 'Tiết');
  DAYS.forEach(function(day) {
    appendText(grid, 'schedule-header', 'Thứ ' + day);
  });

  PERIODS.forEach(function(period, index) {
    var row = index + 2;
    var timeEl = document.createElement('div');
    timeEl.className = 'schedule-time';
    timeEl.style.gridColumn = '1';
    timeEl.style.gridRow = String(row);
    appendText(timeEl, 'schedule-time-label', period.label);
    appendText(timeEl, 'schedule-time-range', period.time);
    grid.appendChild(timeEl);

    DAYS.forEach(function(day) {
      var cell = document.createElement('div');
      cell.className = 'schedule-cell';
      cell.style.gridColumn = String(day);
      cell.style.gridRow = String(row);
      grid.appendChild(cell);
    });
  });

  items.forEach(function(item) {
    var el = document.createElement('div');
    el.className = 'schedule-item schedule-item-block color-' + item.colorIndex;
    el.style.gridColumn = String(item.day);
    el.style.gridRow = (item.startIndex + 2) + ' / span ' + item.span;
    el.title = item.detail;

    appendText(el, 'schedule-item-title', item.title);
    appendText(el, 'schedule-item-meta', [item.classCode, item.room !== '-' ? item.room : ''].filter(Boolean).join(' | '));
    if (item.teacher) appendText(el, 'schedule-item-teacher', item.teacher);
    grid.appendChild(el);
  });
}

(async function() {
  try {
    var meRes = await apiFetch('/api/auth/me');
    if (!meRes.success || !meRes.data.student) return;
    var sid = meRes.data.student.MaSv;

    var courses = await loadAllRegisteredCourses(sid);
    var items = getCourseScheduleItems(courses);
    document.getElementById('loading').classList.add('hidden');

    if (items.length > 0) {
      document.getElementById('schedule-container').classList.remove('hidden');
      renderScheduleGrid(items);
    } else {
      document.getElementById('schedule-message').classList.remove('hidden');
    }
  } catch (e) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('schedule-message').classList.remove('hidden');
  }
})();
