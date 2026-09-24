const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const SyncLog = require('../models/SyncLog');
const hikvisionConfig = require('../config/hikvisionConfig');

const SHIFT_START_H = 16;
const SHIFT_END_H = 22;

const localDate = (d) => new Date(d).toLocaleDateString('en-CA');
const hm = (d) => new Date(d).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
const weekday = (d) => new Date(d).toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', '');

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  // Los nombres vienen "Apellido Apellido Nombre Nombre": inicial del apellido + primer nombre.
  const a = parts[0] || '';
  const b = parts[2] || parts[1] || '';
  return (a[0] || '') + (b[0] || '');
}

function displayName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length < 3) return name;
  return `${parts[2]} ${parts[0]}`;
}

function relativeDay(dateStr, today) {
  if (dateStr === today) return 'Hoy';
  const diff = Math.round((new Date(today) - new Date(dateStr)) / 86400000);
  if (diff === 1) return 'Ayer';
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
}

async function build() {
  const [employees, events, logs] = await Promise.all([
    Employee.findAll(),
    Attendance.findAll(),
    SyncLog.findRecent(200),
  ]);

  const now = new Date();
  const today = localDate(now);

  const byEmpDay = new Map();
  for (const ev of events) {
    const key = `${ev.employee_no}|${localDate(ev.event_at)}`;
    if (!byEmpDay.has(key)) byEmpDay.set(key, { entrada: null, salida: null });
    byEmpDay.get(key)[ev.event_type] = ev.event_at;
  }

  const shiftStart = new Date(now);
  shiftStart.setHours(SHIFT_START_H, 0, 0, 0);
  const shiftEnd = new Date(now);
  shiftEnd.setHours(SHIFT_END_H, 0, 0, 0);
  const shiftProgress = Math.min(1, Math.max(0, (now - shiftStart) / (shiftEnd - shiftStart)));

  const board = employees.map((emp, i) => {
    const rec = byEmpDay.get(`${emp.employee_no}|${today}`) || {};
    let state = 'waiting';
    if (rec.entrada && rec.salida) state = 'done';
    else if (rec.entrada) state = 'inside';
    return {
      id: emp.id,
      name: emp.name,
      short: displayName(emp.name),
      initials: initials(emp.name),
      tone: i % 4,
      subject: emp.department || '—',
      role: emp.position || '—',
      entrada: rec.entrada ? hm(rec.entrada) : null,
      salida: rec.salida ? hm(rec.salida) : null,
      state,
    };
  });

  const dates = [...new Set(events.map((e) => localDate(e.event_at)))].sort();
  const lastDates = dates.slice(-10);
  const series = lastDates.map((date) => {
    let present = 0;
    for (const emp of employees) {
      if (byEmpDay.get(`${emp.employee_no}|${date}`)?.entrada) present++;
    }
    return {
      date,
      label: `${weekday(`${date}T12:00:00`)} ${date.slice(8)}`,
      present,
      total: employees.length,
      isToday: date === today,
    };
  });

  let workedMs = 0;
  let entradaMinutes = 0;
  let entradaCount = 0;
  for (const rec of byEmpDay.values()) {
    if (rec.entrada) {
      const d = new Date(rec.entrada);
      entradaMinutes += d.getHours() * 60 + d.getMinutes();
      entradaCount++;
      if (rec.salida) workedMs += new Date(rec.salida) - d;
    }
  }
  const avgEntradaMin = entradaCount ? Math.round(entradaMinutes / entradaCount) : null;

  const present = board.filter((b) => b.state !== 'waiting').length;
  const synced = employees.filter((e) => e.sync_status === 'synced').length;

  const recentEvents = [...events]
    .sort((a, b) => new Date(b.event_at) - new Date(a.event_at))
    .slice(0, 8)
    .map((ev) => ({
      kind: ev.event_type,
      who: displayName(ev.employee_name),
      time: hm(ev.event_at),
      day: relativeDay(localDate(ev.event_at), today),
    }));

  const days = [...dates].reverse().map((date) => {
    const rows = employees.map((emp, i) => {
      const rec = byEmpDay.get(`${emp.employee_no}|${date}`) || {};
      const hours = rec.entrada && rec.salida ? (new Date(rec.salida) - new Date(rec.entrada)) / 3600000 : null;
      return {
        id: emp.id,
        short: displayName(emp.name),
        initials: initials(emp.name),
        tone: i % 4,
        entrada: rec.entrada ? hm(rec.entrada) : null,
        salida: rec.salida ? hm(rec.salida) : null,
        hours: hours == null ? null : hours.toFixed(1),
        hoursPct: hours == null ? 0 : Math.min(100, Math.round((hours / 6) * 100)),
      };
    });
    const long = new Date(`${date}T12:00:00`).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
    return {
      date,
      rel: relativeDay(date, today),
      label: long.charAt(0).toUpperCase() + long.slice(1),
      present: rows.filter((r) => r.entrada).length,
      total: employees.length,
      rows,
    };
  });

  const lastSync = logs[0] ? new Date(logs[0].created_at) : null;
  const sim = hikvisionConfig.simulated;

  return {
    now,
    today,
    shift: { start: '16:00', end: '22:00', progress: shiftProgress },
    board,
    days,
    series,
    stats: {
      employees: employees.length,
      present,
      synced,
      pending: employees.filter((e) => e.sync_status === 'pending').length,
      errors: employees.filter((e) => e.sync_status === 'error').length,
      hoursWorked: Math.round(workedMs / 3600000),
      daysRecorded: dates.length,
      avgEntrada: avgEntradaMin == null ? '—' : `${String(Math.floor(avgEntradaMin / 60)).padStart(2, '0')}:${String(avgEntradaMin % 60).padStart(2, '0')}`,
      totalEvents: events.length,
    },
    recentEvents,
    device: {
      name: sim.deviceName,
      model: sim.model,
      ip: sim.host,
      firmware: sim.firmwareVersion,
      serial: sim.serialNumber,
      mac: sim.macAddress,
      lastSync: lastSync ? hm(lastSync) : null,
    },
  };
}

module.exports = { build, initials, displayName, localDate, hm, relativeDay };
