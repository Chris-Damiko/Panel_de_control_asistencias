const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

function storageFor(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', subfolder)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${subfolder.slice(0, -1)}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      cb(null, name);
    },
  });
}

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error('Tipo de archivo no permitido. Usa PNG, JPG, SVG o ICO.'));
  }
  cb(null, true);
}

const uploadLogo = multer({
  storage: storageFor('logos'),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

const uploadFavicon = multer({
  storage: storageFor('favicons'),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

const ALLOWED_NOMINA_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];
const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png'];
const MAX_NOMINA_SIZE = 5 * 1024 * 1024; // 5MB

const uploadNomina = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_NOMINA_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'nomina' && !ALLOWED_NOMINA_MIME.includes(file.mimetype)) {
      return cb(new Error('La nómina debe ser .xlsx, .xls o .csv.'));
    }
    if (file.fieldname === 'fotos' && !ALLOWED_PHOTO_MIME.includes(file.mimetype)) {
      return cb(new Error('Las fotos deben ser JPG o PNG.'));
    }
    cb(null, true);
  },
}).fields([
  { name: 'nomina', maxCount: 1 },
  { name: 'fotos', maxCount: 300 },
]);

module.exports = { uploadLogo, uploadFavicon, uploadNomina };
