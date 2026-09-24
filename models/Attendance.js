const store = require('../lib/jsonStore');

store.ensureFile('attendance_events', []);

const Attendance = {
  async findRecent(limit = 100) {
    const [events, employees] = await Promise.all([
      store.read('attendance_events'),
      store.read('employees'),
    ]);
    const byId = new Map(employees.map((e) => [e.id, e]));

    return [...events]
      .sort((a, b) => new Date(b.event_at) - new Date(a.event_at))
      .slice(0, limit)
      .map((ev) => {
        const emp = byId.get(ev.employee_id);
        return {
          id: ev.id,
          event_type: ev.event_type,
          event_at: ev.event_at,
          employee_name: emp ? emp.name : '—',
          employee_no: emp ? emp.employee_no : null,
        };
      });
  },

  async findAll() {
    const [events, employees] = await Promise.all([
      store.read('attendance_events'),
      store.read('employees'),
    ]);
    const byId = new Map(employees.map((e) => [e.id, e]));

    return [...events]
      .sort((a, b) => new Date(a.event_at) - new Date(b.event_at))
      .map((ev) => {
        const emp = byId.get(ev.employee_id);
        return {
          id: ev.id,
          event_type: ev.event_type,
          event_at: ev.event_at,
          employee_name: emp ? emp.name : '—',
          employee_no: emp ? emp.employee_no : null,
        };
      });
  },

  async existsForDate(employee_id, event_type, dateStr) {
    const events = await store.read('attendance_events');
    return events.some(
      (ev) =>
        ev.employee_id === employee_id &&
        ev.event_type === event_type &&
        new Date(ev.event_at).toLocaleDateString('en-CA') === dateStr
    );
  },

  async create({ employee_id, event_type, event_at }) {
    await store.update('attendance_events', (rows) => {
      const created = {
        id: store.nextId(rows),
        employee_id,
        event_type,
        event_at,
        created_at: new Date().toISOString(),
      };
      return [...rows, created];
    });
  },
};

module.exports = Attendance;
