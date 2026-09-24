// Simula al dispositivo empujando eventos de asistencia EN VIVO mientras el
// servidor está corriendo: no pre-genera el futuro, espera a que el reloj real
// pase la hora de entrada/salida para recién ahí crear el evento. Así, si mirás
// el panel a mitad de tarde, ya hay entrada pero todavía no hay salida - igual
// que pasaría con el lector biométrico real. Se apaga solo si HIKVISION_MODE no
// es "simulated" (con dispositivo real, los eventos los generaría el propio
// dispositivo vía webhook/polling, no este simulador).
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { mode } = require('../config/hikvisionConfig');

const ENTRADA_HOUR = 16;
const SALIDA_HOUR = 22;
const CHECK_INTERVAL_MS = 60 * 1000;

function isWeekday(d) {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

// Desfase de 0-6 minutos, estable por empleado+día (no cambia en cada chequeo).
function stableOffsetMinutes(employeeId, dateStr, salt) {
  let hash = salt;
  const s = `${employeeId}-${dateStr}`;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return hash % 6;
}

async function tick() {
  const now = new Date();
  if (!isWeekday(now)) return;

  const employees = await Employee.findAll();
  const nightShift = employees.filter((e) => e.org_index_code === 'JORNADA NOCTURNA');
  if (nightShift.length === 0) return;

  const todayStr = now.toLocaleDateString('en-CA');

  for (const emp of nightShift) {
    const entradaAt = new Date(now);
    entradaAt.setHours(ENTRADA_HOUR, stableOffsetMinutes(emp.id, todayStr, 17), 0, 0);

    const salidaAt = new Date(now);
    salidaAt.setHours(SALIDA_HOUR, stableOffsetMinutes(emp.id, todayStr, 41), 0, 0);

    if (now >= entradaAt && !(await Attendance.existsForDate(emp.id, 'entrada', todayStr))) {
      await Attendance.create({ employee_id: emp.id, event_type: 'entrada', event_at: entradaAt.toISOString() });
    }
    if (now >= salidaAt && !(await Attendance.existsForDate(emp.id, 'salida', todayStr))) {
      await Attendance.create({ employee_id: emp.id, event_type: 'salida', event_at: salidaAt.toISOString() });
    }
  }
}

function start() {
  if (mode !== 'simulated') return;
  tick().catch((err) => console.error('attendanceSimulator:', err.message));
  setInterval(() => tick().catch((err) => console.error('attendanceSimulator:', err.message)), CHECK_INTERVAL_MS);
  console.log('Simulador de asistencia en vivo activo (jornada nocturna 16:00-22:00).');
}

module.exports = { start, tick };
