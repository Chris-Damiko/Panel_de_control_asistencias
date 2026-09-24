const store = require('../lib/jsonStore');

store.ensureFile('sync_logs', []);

const SyncLog = {
  async create({ employee_id = null, action, adapter, status, message = '' }) {
    await store.update('sync_logs', (rows) => {
      const created = {
        id: store.nextId(rows),
        employee_id,
        action,
        adapter,
        status,
        message,
        created_at: new Date().toISOString(),
      };
      return [...rows, created];
    });
  },

  async findRecent(limit = 50) {
    const rows = await store.read('sync_logs');
    return [...rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },
};

module.exports = SyncLog;
