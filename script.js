let appointments = JSON.parse(localStorage.getItem('capminds') || '[]');
let editingId = null;

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function save() {
  localStorage.setItem('capminds', JSON.stringify(appointments));
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'dashboard') filterTable();
}

function renderCalendar() {
  document.getElementById('month-label').textContent = MONTHS[currentMonth] + ' ' + currentYear;

  const headEl = document.getElementById('cal-head');
  headEl.innerHTML = DAYS.map((d, i) => {
    const isToday = i === today.getDay() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear();
    return `<div class="cal-head-cell ${isToday ? 'today-col' : ''}">${d}</div>`;
  }).join('');

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  let html = '';

  for (let i = 0; i < totalCells; i++) {
    let day, month, year, other = false;

    if (i < firstDay) {
      day = daysInPrev - firstDay + i + 1;
      month = currentMonth - 1;
      year = currentYear;
      if (month < 0) { month = 11; year--; }
      other = true;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      month = currentMonth + 1;
      year = currentYear;
      if (month > 11) { month = 0; year++; }
      other = true;
    } else {
      day = i - firstDay + 1;
      month = currentMonth;
      year = currentYear;
    }

    const dateStr = year + '-' + pad(month + 1) + '-' + pad(day);
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    const dayAppts = appointments.filter(a => a.date === dateStr);

    const chips = dayAppts.map(a => `
      <div class="appt-chip">
        <div class="chip-top">
          <span class="chip-name">${a.patient}</span>
          <span class="chip-time">${fmtTime(a.time)}</span>
        </div>
        <div class="chip-actions">
          <button class="chip-btn" onclick="editAppt('${a.id}', event)" title="Edit">&#9998;</button>
          <button class="chip-btn" onclick="deleteAppt('${a.id}', event)" title="Delete">&#128465;</button>
        </div>
      </div>
    `).join('');

    const dateLabel = isToday
      ? `<div class="cell-date today-date">${day}</div>`
      : `<div class="cell-date">${day}</div>`;

    html += `
      <div class="cal-cell ${other ? 'other-month' : ''}" onclick="cellClick('${dateStr}')">
        ${dateLabel}
        ${chips}
      </div>
    `;
  }

  document.getElementById('cal-body').innerHTML = html;

  const last = appointments[appointments.length - 1];
  document.getElementById('doctor-name').textContent = last ? last.doctor : 'James Marry';
}

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
}

function goToday() {
  currentMonth = today.getMonth();
  currentYear = today.getFullYear();
  renderCalendar();
}

function cellClick(dateStr) {
  document.getElementById('f-date').value = dateStr;
  openModal();
}

function openModal(appt) {
  editingId = appt ? appt.id : null;
  clearForm();
  if (appt) {
    document.getElementById('f-patient').value = appt.patient;
    document.getElementById('f-doctor').value = appt.doctor;
    document.getElementById('f-hospital').value = appt.hospital;
    document.getElementById('f-specialty').value = appt.specialty;
    document.getElementById('f-date').value = appt.date;
    document.getElementById('f-time').value = appt.time;
    document.getElementById('f-reason').value = appt.reason || '';
  }
  document.getElementById('overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  editingId = null;
  clearForm();
}

function overlayClose(e) {
  if (e.target === document.getElementById('overlay')) closeModal();
}

function clearForm() {
  ['patient', 'doctor', 'hospital', 'specialty', 'date', 'time', 'reason'].forEach(id => {
    const el = document.getElementById('f-' + id);
    if (el) el.value = '';
    el && el.classList.remove('err');
  });
  ['patient', 'doctor', 'hospital', 'specialty', 'date', 'time'].forEach(id => {
    const e = document.getElementById('e-' + id);
    if (e) e.textContent = '';
  });
}

function saveAppointment() {
  if (!validate()) return;

  const appt = {
    id: editingId || ('id_' + Date.now()),
    patient: document.getElementById('f-patient').value,
    doctor: document.getElementById('f-doctor').value,
    hospital: document.getElementById('f-hospital').value,
    specialty: document.getElementById('f-specialty').value,
    date: document.getElementById('f-date').value,
    time: document.getElementById('f-time').value,
    reason: document.getElementById('f-reason').value,
  };

  if (editingId) {
    const idx = appointments.findIndex(a => a.id === editingId);
    if (idx > -1) appointments[idx] = appt;
    showToast('Appointment updated!');
  } else {
    appointments.push(appt);
    showToast('Appointment booked!');
  }

  save();
  closeModal();
  renderCalendar();

  if (document.getElementById('page-dashboard').classList.contains('active')) {
    filterTable();
  }
}

function validate() {
  const required = ['patient', 'doctor', 'hospital', 'specialty', 'date', 'time'];
  let valid = true;
  required.forEach(id => {
    const el = document.getElementById('f-' + id);
    const err = document.getElementById('e-' + id);
    if (!el.value.trim()) {
      err.textContent = 'This field is required';
      el.classList.add('err');
      valid = false;
    } else {
      err.textContent = '';
      el.classList.remove('err');
    }
  });
  return valid;
}

function editAppt(id, e) {
  if (e) e.stopPropagation();
  const appt = appointments.find(a => a.id === id);
  if (appt) openModal(appt);
}

function deleteAppt(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('Delete this appointment?')) return;
  appointments = appointments.filter(a => a.id !== id);
  save();
  renderCalendar();
  if (document.getElementById('page-dashboard').classList.contains('active')) filterTable();
  showToast('Appointment deleted.');
}

function filterTable() {
  const patient = document.getElementById('f-search-patient').value.toLowerCase();
  const doctor = document.getElementById('f-search-doctor').value.toLowerCase();
  const from = document.getElementById('f-from').value;
  const to = document.getElementById('f-to').value;

  const filtered = appointments.filter(a => {
    if (patient && !a.patient.toLowerCase().includes(patient)) return false;
    if (doctor && !a.doctor.toLowerCase().includes(doctor)) return false;
    if (from && a.date < from) return false;
    if (to && a.date > to) return false;
    return true;
  });

  renderTable(filtered);
}

function renderTable(data) {
  const tbody = document.getElementById('table-body');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data">No appointments found.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(a => `
    <tr>
      <td class="td-link">${a.patient}</td>
      <td class="td-link">${a.doctor}</td>
      <td>${a.hospital}</td>
      <td>${a.specialty}</td>
      <td>${fmtDate(a.date)}</td>
      <td class="td-link">${fmtTime(a.time)}</td>
      <td>
        <div class="td-actions">
          <button class="td-btn edit" onclick="editAppt('${a.id}')" title="Edit">&#9998;</button>
          <button class="td-btn del" onclick="deleteAppt('${a.id}')" title="Delete">&#128465;</button>
        </div>
      </td>
    </tr>
  `).join('');
}


function pad(n) {
  return String(n).padStart(2, '0');
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return hr + ':' + pad(m) + ' ' + ampm;
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return day + '/' + m + '/' + y;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

if (!appointments.length) {
  appointments = [
    {
      id: 'id_1',
      patient: 'Henry James',
      doctor: 'James Marry',
      hospital: 'Salus Center',
      specialty: 'Dermatology',
      date: '2025-12-18',
      time: '09:00',
      reason: 'Skin checkup'
    }
  ];
  save();
}

renderCalendar();