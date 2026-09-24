const store = require('../lib/jsonStore');

store.ensureFile('employees', []);

const Employee = {
  async findAll() {
    const rows = await store.read('employees');
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  },

  async findById(id) {
    const rows = await store.read('employees');
    return rows.find((e) => e.id === Number(id)) || null;
  },

  async findByEmployeeNo(employeeNo) {
    const rows = await store.read('employees');
    return rows.find((e) => e.employee_no === employeeNo) || null;
  },

  async upsertByEmployeeNo(data) {
    let resultId;
    await store.update('employees', (rows) => {
      const idx = rows.findIndex((e) => e.employee_no === data.employee_no);
      const now = new Date().toISOString();

      if (idx !== -1) {
        rows[idx] = {
          ...rows[idx],
          name: data.name,
          cedula: data.cedula,
          org_index_code: data.org_index_code,
          department: data.department,
          position: data.position,
          gender: data.gender,
          card_no: data.card_no,
          photo_path: data.photo_path,
          updated_at: now,
        };
        resultId = rows[idx].id;
        return rows;
      }

      const created = {
        id: store.nextId(rows),
        employee_no: data.employee_no,
        name: data.name,
        cedula: data.cedula,
        org_index_code: data.org_index_code,
        department: data.department,
        position: data.position,
        gender: data.gender || 'unknown',
        card_no: data.card_no,
        photo_path: data.photo_path || null,
        sync_status: 'pending',
        created_at: now,
        updated_at: now,
      };
      resultId = created.id;
      return [...rows, created];
    });
    return resultId;
  },

  async updateSyncStatus(id, status) {
    await store.update('employees', (rows) => {
      const idx = rows.findIndex((e) => e.id === Number(id));
      if (idx !== -1) {
        rows[idx] = { ...rows[idx], sync_status: status, updated_at: new Date().toISOString() };
      }
      return rows;
    });
  },

  async updatePhotoPath(id, photoPath) {
    await store.update('employees', (rows) => {
      const idx = rows.findIndex((e) => e.id === Number(id));
      if (idx !== -1) {
        rows[idx] = { ...rows[idx], photo_path: photoPath, updated_at: new Date().toISOString() };
      }
      return rows;
    });
  },
};

module.exports = Employee;
