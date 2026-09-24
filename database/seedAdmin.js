require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function seed() {
  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4] || 'Administrador';

  if (!email || !password) {
    console.error('Uso: node database/seedAdmin.js <email> <password> [nombre]');
    process.exit(1);
  }

  const existing = await User.findByEmail(email);
  if (existing) {
    console.error('Ya existe un usuario con ese correo.');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);
  await User.create({ full_name: fullName, email, password_hash, role: 'admin' });
  console.log(`Admin creado: ${email}`);
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
