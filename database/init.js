require('dotenv').config({ quiet: true });

// Requerir cada modelo ya crea su archivo data/*.json con valores por defecto
// si todavía no existe (ver lib/jsonStore.js -> ensureFile).
require('../models/User');
require('../models/InstitutionSettings');
require('../models/Employee');
require('../models/SyncLog');
require('../models/Attendance');

console.log('Almacenamiento JSON inicializado en data/.');
