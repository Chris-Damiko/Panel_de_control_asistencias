const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { requireAuth } = require('../middlewares/auth');
const Attendance = require('../models/Attendance');
const attendanceStats = require('../services/attendanceStats');

router.get('/asistencia', requireAuth, async (req, res) => {
  const data = await attendanceStats.build();
  res.render('asistencia/index', { days: data.days, stats: data.stats, employees: data.board });
});

router.get('/asistencia/exportar', requireAuth, async (req, res) => {
  const records = await Attendance.findAll();

  const byKey = new Map();
  for (const rec of records) {
    // Fecha en zona horaria local del servidor, no UTC crudo: la salida (22:00)
    // cae después de medianoche UTC y quedaría agrupada en el día siguiente si
    // se usa el string ISO tal cual.
    const date = new Date(rec.event_at).toLocaleDateString('en-CA');
    const key = `${rec.employee_no}|${date}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        date,
        employee_no: rec.employee_no,
        employee_name: rec.employee_name,
        entrada: '',
        salida: '',
      });
    }
    const row = byKey.get(key);
    const time = new Date(rec.event_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (rec.event_type === 'entrada') row.entrada = time;
    else row.salida = time;
  }

  const rows = [...byKey.values()].sort((a, b) =>
    a.date === b.date ? a.employee_name.localeCompare(b.employee_name) : a.date.localeCompare(b.date)
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Asistencia');
  sheet.columns = [
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'N° Empleado', key: 'employee_no', width: 16 },
    { header: 'Nombre', key: 'employee_name', width: 34 },
    { header: 'Entrada', key: 'entrada', width: 12 },
    { header: 'Salida', key: 'salida', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));

  const filename = `asistencia_${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;
