const ExcelJS = require('exceljs');
const { Readable } = require('stream');

// Encabezados aceptados (normalizados: minúsculas, sin acentos, sin símbolos) -> campo interno.
const HEADER_MAP = {
  numeroempleado: 'employee_no',
  nempleado: 'employee_no',
  employeeno: 'employee_no',
  codigo: 'employee_no',
  cedula: 'cedula',
  ci: 'cedula',
  nombre: 'name',
  name: 'name',
  departamento: 'department',
  orgindexcode: 'org_index_code',
  cargo: 'position',
  puesto: 'position',
  genero: 'gender',
  gender: 'gender',
  sexo: 'gender',
  ntarjeta: 'card_no',
  cardno: 'card_no',
  tarjeta: 'card_no',
};

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeGender(value) {
  const g = normalizeHeader(value);
  if (['f', 'femenino', 'female', 'mujer'].includes(g)) return 'female';
  if (['m', 'masculino', 'male', 'hombre'].includes(g)) return 'male';
  return 'unknown';
}

async function loadWorksheet(buffer, mimetype) {
  const workbook = new ExcelJS.Workbook();
  if (mimetype === 'text/csv') {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(buffer);
  }
  return workbook.worksheets[0];
}

// Parsea la nómina institucional y la mapea al formato interno (compatible con
// las columnas que espera la plantilla de importación de HikCentral).
async function parseNomina(buffer, mimetype) {
  const sheet = await loadWorksheet(buffer, mimetype);
  if (!sheet) throw new Error('El archivo no contiene hojas.');

  const columns = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const field = HEADER_MAP[normalizeHeader(cell.value)];
    if (field) columns[colNumber] = field;
  });

  const rows = [];
  const errors = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const data = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const field = columns[colNumber];
      if (field) data[field] = cell.value != null ? String(cell.value).trim() : '';
    });

    if (!data.name) {
      errors.push({ row: rowNumber, message: 'Falta nombre.' });
      return;
    }
    if (!data.employee_no) data.employee_no = data.cedula;
    if (!data.employee_no) {
      errors.push({ row: rowNumber, message: 'Falta número de empleado o cédula.' });
      return;
    }

    rows.push({
      employee_no: data.employee_no,
      name: data.name,
      cedula: data.cedula || null,
      org_index_code: data.org_index_code || data.department || null,
      department: data.department || null,
      position: data.position || null,
      gender: normalizeGender(data.gender),
      card_no: data.card_no || null,
      photo_path: null,
    });
  });

  return { rows, errors };
}

module.exports = { parseNomina };
