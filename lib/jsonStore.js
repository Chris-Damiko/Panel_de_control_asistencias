const fs = require('fs');
const path = require('path');
const githubSync = require('./githubSync');

const DATA_DIR = path.join(__dirname, '..', 'data');
const queues = new Map();

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function ensureFile(name, defaultValue) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const p = filePath(name);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(defaultValue, null, 2));
  }
}

function readSync(name) {
  const raw = fs.readFileSync(filePath(name), 'utf8');
  return raw ? JSON.parse(raw) : null;
}

function writeSync(name, data) {
  const p = filePath(name);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

// Serializa lecturas/escrituras por colección para que dos requests concurrentes
// no se pisen al hacer read-modify-write sobre el mismo archivo.
function withLock(name, fn) {
  const prev = queues.get(name) || Promise.resolve();
  const next = prev.then(fn, fn);
  queues.set(name, next.catch(() => {}));
  return next;
}

async function read(name) {
  return withLock(name, () => readSync(name));
}

// updater(data) debe devolver el nuevo estado completo de la colección.
async function update(name, updater) {
  return withLock(name, () => {
    const data = readSync(name);
    const result = updater(data);
    writeSync(name, result);
    githubSync.schedulePush(filePath(name));
    return result;
  });
}

function nextId(rows) {
  return rows.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1;
}

module.exports = { ensureFile, read, update, nextId, DATA_DIR };
