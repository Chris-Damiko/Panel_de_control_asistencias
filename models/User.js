const store = require('../lib/jsonStore');

store.ensureFile('users', []);

const User = {
  async findByEmail(email) {
    const rows = await store.read('users');
    return rows.find((u) => u.email === email) || null;
  },

  async findById(id) {
    const rows = await store.read('users');
    return rows.find((u) => u.id === Number(id)) || null;
  },

  async create({ full_name, email, password_hash, role = 'operator' }) {
    let created;
    await store.update('users', (rows) => {
      created = {
        id: store.nextId(rows),
        full_name,
        email,
        password_hash,
        role,
        created_at: new Date().toISOString(),
      };
      return [...rows, created];
    });
    return created.id;
  },

  async count() {
    const rows = await store.read('users');
    return rows.length;
  },
};

module.exports = User;
