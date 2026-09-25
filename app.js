require('dotenv').config({ quiet: true });
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

const bcrypt = require('bcrypt');

const InstitutionSettings = require('./models/InstitutionSettings');
const User = require('./models/User');
const githubSync = require('./lib/githubSync');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const cmsRoutes = require('./routes/cms');
const empleadosRoutes = require('./routes/empleados');
const dispositivosRoutes = require('./routes/dispositivos');
const asistenciaRoutes = require('./routes/asistencia');
const attendanceSimulator = require('./services/attendanceSimulator');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },
}));
app.use(flash());

// Inyecta branding + sesión en todas las vistas (mini CMS)
app.use(async (req, res, next) => {
  try {
    res.locals.settings = await InstitutionSettings.get() || {
      institution_name: 'Institución',
      primary_color: '#1f2937',
      secondary_color: '#374151',
      accent_color: '#2563eb',
      logo_path: null,
      favicon_path: null,
    };
    res.locals.session = req.session;
    res.locals.currentPath = req.path;
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/', (req, res) => res.redirect(req.session.userId ? '/dashboard' : '/login'));

app.use(authRoutes);
app.use(dashboardRoutes);
app.use(cmsRoutes);
app.use(empleadosRoutes);
app.use(dispositivosRoutes);
app.use(asistenciaRoutes);

app.use((req, res) => {
  res.status(404).render('error', { message: 'Página no encontrada.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { message: 'Error interno del servidor.' });
});

// Si no hay usuarios (p. ej. primer arranque en un host sin shell), crea el
// admin a partir de ADMIN_EMAIL / ADMIN_PASSWORD.
async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || await User.count() > 0) return;
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({ full_name: ADMIN_NAME || 'Administrador', email: ADMIN_EMAIL, password_hash, role: 'admin' });
  console.log(`Admin creado: ${ADMIN_EMAIL}`);
}

async function start() {
  await githubSync.pullAll();
  await ensureAdmin();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
  attendanceSimulator.start();
}

process.on('SIGTERM', async () => {
  await githubSync.flush();
  process.exit(0);
});

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
