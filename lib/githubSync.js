// Respaldo opcional de los datos de la app en un repositorio de GitHub (API de
// contenidos). Pensado para hosts con disco efímero (Render free): al arrancar
// se descargan los archivos del repo, y cada cambio local se sube como commit.
// Se sincronizan data/*.json y las imágenes de public/uploads/. Se activa solo
// si GITHUB_TOKEN y GITHUB_DATA_REPO están definidos; si no, no hace nada.
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_DATA_REPO; // "usuario/repo"
const BRANCH = process.env.GITHUB_DATA_BRANCH || '';
const DEBOUNCE_MS = Number(process.env.GITHUB_SYNC_DEBOUNCE_MS) || 30 * 1000;

const ROOT = path.join(__dirname, '..');
// Carpetas sincronizadas; en el repo se usan las mismas rutas que en local, así
// que el repo de datos puede ser el mismo repo del código.
const FOLDERS = [
  { local: 'data', remote: 'data', ext: '.json' },
  { local: 'public/uploads/logos', remote: 'public/uploads/logos' },
  { local: 'public/uploads/favicons', remote: 'public/uploads/favicons' },
  { local: 'public/uploads/empleados', remote: 'public/uploads/empleados' },
];

const enabled = Boolean(TOKEN && REPO);
const shas = new Map();
const timers = new Map();
const pushing = new Map();

function api(url, options = {}) {
  return fetch(`https://api.github.com/repos/${REPO}/contents/${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
}

function refQuery() {
  return BRANCH ? `?ref=${encodeURIComponent(BRANCH)}` : '';
}

// Ruta absoluta local -> ruta en el repo (o null si no se sincroniza).
function remotePathFor(absPath) {
  const rel = path.relative(ROOT, absPath).split(path.sep).join('/');
  for (const f of FOLDERS) {
    if (path.posix.dirname(rel) !== f.local) continue;
    if (f.ext && !rel.endsWith(f.ext)) return null;
    return `${f.remote}/${path.posix.basename(rel)}`;
  }
  return null;
}

function wanted(folder, name) {
  return !name.startsWith('.') && (!folder.ext || name.endsWith(folder.ext));
}

// Descarga todo lo del repo. Lo que exista solo en local (p. ej. valores por
// defecto creados por ensureFile) se sube para dejar el repo completo.
async function pullAll() {
  if (!enabled) return;

  let downloaded = 0;
  for (const folder of FOLDERS) {
    const localDir = path.join(ROOT, folder.local);
    fs.mkdirSync(localDir, { recursive: true });

    const res = await api(`${folder.remote}${refQuery()}`);
    let remote = [];
    if (res.status === 200) {
      remote = (await res.json()).filter((f) => f.type === 'file' && wanted(folder, f.name));
    } else if (res.status !== 404) {
      throw new Error(`githubSync: no se pudo listar ${REPO}/${folder.remote} (${res.status})`);
    }

    for (const file of remote) {
      const fileRes = await api(`${file.path}${refQuery()}`, {
        headers: { Accept: 'application/vnd.github.raw+json' },
      });
      if (!fileRes.ok) throw new Error(`githubSync: no se pudo leer ${file.path} (${fileRes.status})`);
      fs.writeFileSync(path.join(localDir, file.name), Buffer.from(await fileRes.arrayBuffer()));
      shas.set(file.path, file.sha);
      downloaded++;
    }

    const remoteNames = new Set(remote.map((f) => f.name));
    for (const name of fs.readdirSync(localDir)) {
      if (wanted(folder, name) && !remoteNames.has(name)) schedulePush(path.join(localDir, name), 0);
    }
  }

  console.log(`githubSync: ${downloaded} archivo(s) descargado(s) de ${REPO}.`);
}

async function fetchSha(remotePath) {
  const res = await api(`${remotePath}${refQuery()}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`githubSync: no se pudo leer sha de ${remotePath} (${res.status})`);
  return (await res.json()).sha;
}

async function push(absPath, remotePath) {
  const content = fs.readFileSync(absPath);
  for (let attempt = 0; attempt < 3; attempt++) {
    const body = {
      // [skip render] evita que Render redespliegue por cada commit de datos.
      message: `data: actualizar ${remotePath} [skip render]`,
      content: content.toString('base64'),
      sha: shas.get(remotePath),
      ...(BRANCH ? { branch: BRANCH } : {}),
    };
    const res = await api(remotePath, { method: 'PUT', body: JSON.stringify(body) });
    if (res.ok) {
      shas.set(remotePath, (await res.json()).content.sha);
      return;
    }
    // 409/422: el sha local quedó desactualizado; se relee y se reintenta.
    if (res.status === 409 || res.status === 422) {
      shas.set(remotePath, await fetchSha(remotePath));
      continue;
    }
    throw new Error(`githubSync: fallo al subir ${remotePath} (${res.status}) ${await res.text()}`);
  }
  throw new Error(`githubSync: no se pudo subir ${remotePath} tras 3 intentos`);
}

// Serializa los pushes por archivo para no competir por el mismo sha.
function runPush(absPath, remotePath) {
  const prev = pushing.get(remotePath) || Promise.resolve();
  const next = prev.then(() => push(absPath, remotePath)).catch((err) => console.error(err.message));
  pushing.set(remotePath, next);
  return next;
}

// Programa la subida de un archivo local. Los JSON cambian seguido, así que se
// agrupan con un debounce; las imágenes se suben con delay 0.
function schedulePush(absPath, delay = DEBOUNCE_MS) {
  if (!enabled) return;
  const remotePath = remotePathFor(absPath);
  if (!remotePath) return;
  clearTimeout(timers.get(remotePath)?.timer);
  const timer = setTimeout(() => {
    timers.delete(remotePath);
    runPush(absPath, remotePath);
  }, delay);
  timers.set(remotePath, { timer, absPath });
}

function pushFile(absPath) {
  schedulePush(absPath, 0);
}

// Sube de inmediato lo pendiente (se llama al recibir SIGTERM en un redeploy).
async function flush() {
  for (const [remotePath, { timer, absPath }] of timers) {
    clearTimeout(timer);
    timers.delete(remotePath);
    runPush(absPath, remotePath);
  }
  await Promise.all(pushing.values());
}

module.exports = { enabled, pullAll, schedulePush, pushFile, flush };
