const store = require('../lib/jsonStore');

const DEFAULT_SETTINGS = {
  id: 1,
  institution_name: 'Institución',
  primary_color: '#1f2937',
  secondary_color: '#374151',
  accent_color: '#2563eb',
  logo_path: null,
  favicon_path: null,
  updated_at: new Date().toISOString(),
};

store.ensureFile('institution_settings', DEFAULT_SETTINGS);

const ALLOWED = ['institution_name', 'primary_color', 'secondary_color', 'accent_color', 'logo_path', 'favicon_path'];

const InstitutionSettings = {
  async get() {
    return store.read('institution_settings');
  },

  async update(id, fields) {
    const keys = Object.keys(fields).filter((k) => ALLOWED.includes(k));
    if (keys.length === 0) return;

    await store.update('institution_settings', (current) => ({
      ...current,
      ...Object.fromEntries(keys.map((k) => [k, fields[k]])),
      updated_at: new Date().toISOString(),
    }));
  },
};

module.exports = InstitutionSettings;
