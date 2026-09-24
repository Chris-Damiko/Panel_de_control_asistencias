const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs/promises');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { uploadNomina } = require('../middlewares/upload');
const Employee = require('../models/Employee');
const SyncLog = require('../models/SyncLog');
const hikvisionClient = require('../services/hikvision/hikvisionClient');
const { parseNomina } = require('../services/importer/employeeImporter');
const attendanceStats = require('../services/attendanceStats');

router.get('/personas', requireAuth, async (req, res) => {
  const [employees, stats] = await Promise.all([Employee.findAll(), attendanceStats.build()]);
  const boardById = new Map(stats.board.map((b) => [b.id, b]));

  const people = employees.map((emp, i) => {
    const b = boardById.get(emp.id) || {};
    return {
      ...emp,
      initials: attendanceStats.initials(emp.name),
      short: attendanceStats.displayName(emp.name),
      tone: i % 4,
      today: b.state || 'waiting',
      entrada: b.entrada || null,
    };
  });

  res.render('empleados/index', {
    people,
    stats: stats.stats,
    result: req.query,
    hikvisionMode: hikvisionClient.mode,
  });
});

router.post(
  '/personas/importar',
  requireAuth,
  requireAdmin,
  (req, res, next) => {
    uploadNomina(req, res, (err) => {
      if (err) return res.redirect('/personas?error=' + encodeURIComponent(err.message));
      next();
    });
  },
  async (req, res) => {
    const nominaFile = req.files?.nomina?.[0];
    if (!nominaFile) {
      return res.redirect('/personas?error=' + encodeURIComponent('Debes adjuntar el archivo de nómina.'));
    }

    let parsed;
    try {
      parsed = await parseNomina(nominaFile.buffer, nominaFile.mimetype);
    } catch (err) {
      return res.redirect('/personas?error=' + encodeURIComponent('No se pudo leer el archivo: ' + err.message));
    }

    const fotos = req.files?.fotos || [];
    const fotosByKey = new Map(fotos.map((f) => [path.parse(f.originalname).name.trim(), f]));

    let imported = 0;
    let synced = 0;
    let faceSynced = 0;
    let errors = parsed.errors.length;

    for (const row of parsed.rows) {
      let employeeId;
      try {
        employeeId = await Employee.upsertByEmployeeNo(row);
        imported++;
      } catch (err) {
        errors++;
        await SyncLog.create({ action: 'import', adapter: 'db', status: 'error', message: `${row.employee_no}: ${err.message}` });
        continue;
      }

      try {
        await hikvisionClient.addOrUpdatePerson(row);
        await Employee.updateSyncStatus(employeeId, 'synced');
        await SyncLog.create({ employee_id: employeeId, action: 'addOrUpdatePerson', adapter: hikvisionClient.mode, status: 'success' });
        synced++;
      } catch (err) {
        await Employee.updateSyncStatus(employeeId, 'error');
        await SyncLog.create({ employee_id: employeeId, action: 'addOrUpdatePerson', adapter: hikvisionClient.mode, status: 'error', message: err.message });
        errors++;
        continue; // sin persona creada en Hikvision, no intentar foto
      }

      const foto = fotosByKey.get(String(row.employee_no));
      if (foto) {
        try {
          const ext = path.extname(foto.originalname) || '.jpg';
          const filename = `emp-${row.employee_no}${ext}`;
          const destDir = path.join(__dirname, '..', 'public', 'uploads', 'empleados');
          await fs.mkdir(destDir, { recursive: true });
          await fs.writeFile(path.join(destDir, filename), foto.buffer);
          await Employee.updatePhotoPath(employeeId, path.posix.join('/uploads/empleados', filename));

          await hikvisionClient.addFace(row.employee_no, foto.buffer, foto.mimetype);
          await SyncLog.create({ employee_id: employeeId, action: 'addFace', adapter: hikvisionClient.mode, status: 'success' });
          faceSynced++;
        } catch (err) {
          await SyncLog.create({ employee_id: employeeId, action: 'addFace', adapter: hikvisionClient.mode, status: 'error', message: err.message });
          errors++;
        }
      }
    }

    const qs = new URLSearchParams({ imported, synced, faceSynced, errors }).toString();
    res.redirect('/personas?' + qs);
  }
);

module.exports = router;
