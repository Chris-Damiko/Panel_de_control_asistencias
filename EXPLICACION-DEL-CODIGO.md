# Explicación de todo el código — Panel Hikvision

Bueno mi rey, aquí te dejo la posta completa de todo lo que hay armado en este proyecto. Te lo juro que no me voy a guardar nada, vamos archivo por archivo para que cuando alguien pregunte "oe y esto cómo funciona" vos ya sepas contestar sin trabarte. Dale que empezamos.

## De qué se trata esto, bro

Es un panel web (Node.js + Express + EJS, sin ningún framework de frontend, CSS a mano) para reemplazar la interfaz nativa de HikCentral. La idea es tener nuestra propia pantalla, con la marca de la institución, y por debajo hablarle directo al lector biométrico DS-K1T320MFX (Hikvision) o a HikCentral OpenAPI, dependiendo de qué acceso tengamos. O sea: nosotros ponemos la cara bonita, Hikvision hace el trabajo sucio de control de acceso.

Todo el código vive sin un framework de frontend — vistas en EJS, un solo archivo CSS, cero React ni nada de eso. Bien a la antigua, bien mantenible, plena que sí.

---

## 1. `app.js` — el corazón que arranca todo

Este es el punto de entrada. Cuando corrés `npm run dev` o `npm start`, esto es lo que se ejecuta:

- Carga las variables de entorno con `dotenv` (el `.env`).
- Levanta Express, le dice que las vistas están en `views/` y que el motor de plantillas es EJS.
- Activa `express.urlencoded` y `express.json` para poder leer los formularios y JSON que lleguen.
- Sirve todo lo de `public/` como estático (ahí vive el CSS y las imágenes subidas).
- Configura `express-session` (para que el login se mantenga con una cookie, dura 8 horas) y `connect-flash` (aunque ojo, casi no lo usamos, la mayoría de mensajes van por query string tipo `?success=colores`).
- Hay un middleware clave que corre en CADA request: le mete a `res.locals` la configuración de branding (colores, logo, nombre de la institución), la sesión, y el `currentPath` (esto último lo agregamos para que el menú lateral sepa marcar en cuál página estás parado — el link activo).
- La ruta `/` te manda a `/dashboard` si estás logueado, o a `/login` si no.
- Registra todas las rutas: `authRoutes`, `dashboardRoutes`, `cmsRoutes`, `empleadosRoutes`, `dispositivosRoutes`, `asistenciaRoutes`.
- Al final tiene el manejador de 404 (página no encontrada) y el manejador de errores genérico (500), los dos renderizan `views/error.ejs`.

Bien simple la neta, es el típico esqueleto de Express pero bien ordenadito.

---

## 2. `config/` — la configuración

### `config/db.js`
No lo edité en esta sesión pero básicamente es la conexión a MariaDB/MySQL usando `mysql2` (seguramente con un pool de conexiones). Todos los modelos le hacen `require('../config/db')` y usan `db.query(...)`.

### `config/hikvisionConfig.js`
Este archivsito lee el `.env` y arma dos bloques de configuración:

```js
mode: process.env.HIKVISION_MODE // "isapi" o "openapi"
isapi: { host, port, user, password }
openapi: { host, port, appKey, appSecret }
```

O sea, según lo que digas en `HIKVISION_MODE`, el sistema sabe si tiene que hablarle directo al dispositivo (ISAPI) o a HikCentral por su API abierta (OpenAPI/Artemis). Ahorita en el `.env` está en `openapi`.

---

## 3. `database/` — todo lo de la base de datos

- **`schema.sql`**: el DDL de las tablas (`employees`, `institution_settings`, `sync_logs`, `users`).
- **`init.js`**: script para crear/inicializar la base desde cero (`npm run db:init`).
- **`seedAdmin.js`**: script para crear un usuario admin a mano desde consola: `node database/seedAdmin.js correo password nombre`. Le hace hash a la contraseña con `bcrypt` antes de guardarla. Si el correo ya existe, te tira error y no deja duplicar.

### Las tablas, para que las tengas claras:

- **`users`**: `id, full_name, email, password_hash, role (admin/operator), created_at`. Acá vive quién puede entrar al panel.
- **`institution_settings`**: `id, primary_color, secondary_color, accent_color, logo_path, favicon_path, institution_name, updated_at`. Esto es lo que pinta TODO el panel — branding dinámico, sin tocar código.
- **`employees`**: `id, employee_no, name, cedula, org_index_code, department, position, gender, card_no, photo_path, sync_status (pending/synced/error), created_at, updated_at`. Acá cae cada persona que importamos.
- **`sync_logs`**: `id, employee_id, action, adapter, status (success/error), message, created_at`. Es la bitácora de cada intento de hablar con Hikvision — para saber qué pasó y cuándo.

---

## 4. `models/` — la capa que le habla a la base

Todos siguen el mismo patrón: un objeto plano con funciones `async` que hacen `db.query`. Nada de ORM, todo SQL a mano (más control, menos magia).

### `models/User.js`
Lo básico: buscar por correo (`findByEmail`), crear usuario (`create`). Lo usa `routes/auth.js` para el login.

### `models/InstitutionSettings.js`
`get()` trae la fila única de configuración (siempre hay una sola fila, es singleton de facto). `update(id, data)` actualiza nombre/colores/logo/favicon. Esto es lo que usa el CMS.

### `models/Employee.js`
El más cargado de lógica:

- `findAll()` — trae todos los empleados ordenados por nombre.
- `findById(id)` / `findByEmployeeNo(employeeNo)` — búsquedas puntuales.
- `upsertByEmployeeNo(data)` — esta es la estrella: si el `employee_no` ya existe, hace `UPDATE`; si no, hace `INSERT`. Así al importar una nómina dos veces no se duplica nadie, simplemente se actualiza. Retorna el `id` del empleado (nuevo o existente).
- `updateSyncStatus(id, status)` — cambia el estadito (`pending/synced/error`) después de intentar sincronizar con Hikvision.
- `updatePhotoPath(id, photoPath)` — guarda la ruta de la foto subida (esto lo agregué yo para lo del reconocimiento facial).

### `models/SyncLog.js`
`create({employee_id, action, adapter, status, message})` — mete una fila en la bitácora. `findRecent(limit)` — trae las últimas N filas, esto alimenta la tabla de "Actividad reciente" del dashboard.

---

## 5. `middlewares/` — los guardianes

### `middlewares/auth.js`
Dos funciones chiquitas pero clave:

- `requireAuth` — si no hay `req.session.userId`, te manda pa'l login. Se usa en CASI todas las rutas.
- `requireAdmin` — si tu `req.session.role` no es `'admin'`, te tira un 403 con página de error. Se usa para el CMS y para importar nómina (o sea, un operador normal no puede tocar el branding ni subir empleados masivamente).

### `middlewares/upload.js`
Todo lo que tiene que ver con subir archivos, usando `multer`:

- `uploadLogo` y `uploadFavicon` — guardan en disco (`public/uploads/logos` y `public/uploads/favicons`), validan que sea PNG/JPG/SVG/ICO y máximo 2MB. El nombre del archivo se genera con timestamp + bytes random para que nunca choquen dos subidas.
- `uploadNomina` — este lo agregué para la importación masiva. A diferencia de los de arriba, usa `memoryStorage` (o sea el archivo no se guarda solo en disco, se queda en memoria como buffer, porque lo vamos a procesar al toque, no a servir como estático). Acepta DOS campos en un mismo formulario: `nomina` (el Excel/CSV, máximo 1 archivo) y `fotos` (las fotos de los empleados, hasta 300 archivos). Valida que la nómina sea `.xlsx/.xls/.csv` y las fotos sean JPG/PNG.

---

## 6. `routes/` — acá está la chamba real

### `routes/auth.js`
- `GET /login` — muestra el formulario.
- `POST /login` — busca el usuario por correo, compara la contraseña con `bcrypt.compare`, si está bien le mete `userId`, `role` y `fullName` a la sesión y lo manda al dashboard. Si está mal, vuelve a mostrar el login con un mensaje de error.
- `POST /logout` — destruye la sesión y de vuelta al login.

### `routes/dashboard.js`
- `GET /dashboard` — trae todos los empleados y los últimos 10 logs de sincronización. Con los empleados calcula tres contadores: cuántos están `synced`, cuántos `pending`, cuántos `error` (esto lo agregué yo para las tarjetitas de resumen). Le pasa todo a la vista `dashboard.ejs`.

### `routes/cms.js`
Solo lo puede tocar un admin (`requireAdmin`):

- `GET /cms` — muestra el formulario de branding.
- `POST /cms/colors` — actualiza nombre + los 3 colores.
- `POST /cms/logo` — sube el logo con `uploadLogo.single('logo')`, guarda la ruta relativa en la base.
- `POST /cms/favicon` — mismo cuento pero para el favicon.

Cada uno redirige con un `?success=algo` en la URL, así la vista puede mostrar el mensajito de "listo, guardado".

### `routes/empleados.js`
Esta es la que más creció en esta sesión, la explico despacito:

- `GET /personas` — trae todos los empleados y le pasa también el modo actual de Hikvision (`openapi` o `isapi`) para mostrarlo en pantalla.
- `POST /personas/importar` — el flujo completo de importación, paso a paso:
  1. Corre el middleware `uploadNomina` a mano (no como middleware normal de Express, sino envuelto en una función para poder capturar el error de multer y redirigir con mensaje bonito en vez de tirar un error feo).
  2. Si no llegó archivo de nómina, redirige con error.
  3. Llama a `parseNomina()` (esto vive en `services/importer/employeeImporter.js`) para convertir el Excel/CSV en un arreglo de filas ya mapeadas.
  4. Arma un `Map` de las fotos que llegaron, usando el nombre del archivo (sin extensión) como llave — así después puede buscar "¿esta persona tiene foto?" por su número de empleado.
  5. Por cada fila: hace `upsertByEmployeeNo` (guarda en la base local). Si eso falla, cuenta error y sigue con la próxima.
  6. Si se guardó bien, intenta `hikvisionClient.addOrUpdatePerson(row)` — o sea, mandarlo a Hikvision de una. Si funciona, marca `synced` y logea éxito. Si falla (por ejemplo, no hay conexión), marca `error` y logea el mensaje técnico.
  7. Si la persona SÍ se sincronizó y además tiene foto, guarda la foto en `public/uploads/empleados/`, actualiza `photo_path`, y llama a `hikvisionClient.addFace()` para subir la cara al sistema de reconocimiento facial. Esto también se logea.
  8. Al final, redirige a `/personas` con un resumen en la URL: cuántos se importaron, cuántos sincronizaron, cuántas fotos subieron, cuántos errores hubo.

Bien completo el flujo, de verdad que sí.

### `routes/dispositivos.js`
Por ahora bien simple: `GET /dispositivos` renderiza una tabla vacía. Está comentado que falta conectar `hikvisionClient.getDeviceInfo()` cuando se valide el adaptador. O sea, esto es un placeholder a propósito.

### `routes/asistencia.js`
Mismo cuento: `GET /asistencia` renderiza tabla vacía, pendiente de conectar polling o webhooks del dispositivo para traer los eventos reales de entrada/salida.

---

## 7. `services/hikvision/` — acá se habla con el hierro de verdad

Esta carpeta es EL corazón técnico del proyecto, el "adaptador dual" que menciona el documento original.

### `services/hikvision/hikvisionClient.js`
Es la fachada única. No le importa a nadie más si estamos en modo ISAPI u OpenAPI — todo el resto del código solo le habla a este archivo:

```js
const adapter = mode === 'openapi' ? openApiAdapter : isapiAdapter;
```

Y expone tres funciones que simplemente delegan al adaptador que corresponda: `addOrUpdatePerson`, `getDeviceInfo`, `addFace`. Si el adaptador activo no tiene esa función, tira un error claro en vez de explotar feo.

### `services/hikvision/isapiAdapter.js`
Esto le habla DIRECTO al dispositivo (el DS-K1T320MFX), sin pasar por HikCentral:

- `client()` — arma un cliente de `axios` con autenticación básica. **Ojo bro, esto tiene un problema conocido**: el dispositivo real exige autenticación "digest" (más segura, con un challenge/response), no básica. Axios no hace digest solo. Está comentado en el código como pendiente — hay que envolver esto con un manejo manual del challenge `WWW-Authenticate` o usar una librería tipo `http-digest-client`. O sea, en teoría esto no le va a funcionar al dispositivo real tal como está ahorita.
- `addOrUpdatePerson(person)` — hace un `PUT` a `/ISAPI/AccessControl/UserInfo/Record?format=json` con los datos de la persona en el formato que espera Hikvision (`employeeNo`, `name`, `userType`, `Valid` con fechas de vigencia, `gender`).
- `getDeviceInfo()` — un `GET` a `/ISAPI/System/deviceInfo?format=json`, para preguntarle al dispositivo quién es (IP, firmware, etc).
- `addFace(employeeNo, photoBuffer, mimeType)` — esto lo agregué yo para el reconocimiento facial. Arma un `FormData` (usando las clases nativas de Node, sin librerías externas) con los datos de la cara y la imagen, y hace un `POST` con `fetch` nativo a `/ISAPI/Intelligent/FDLib/FDSetUp?format=json`. **Doble ojo acá**: este endpoint es "best effort" — no está verificado contra el dispositivo real, varía mucho según firmware, y además hereda el mismo problema de autenticación básica vs digest de arriba. Está clarito comentado en el código como pendiente de probar con hardware real.

### `services/hikvision/openApiAdapter.js`
Este le habla a HikCentral por su API abierta (Artemis), que es el modo que está activo ahorita en el `.env`:

- `baseUrl()` — arma la URL con host y puerto de Artemis.
- `sign(method, path, headers)` — esta es la parte más peluda: Artemis exige firmar cada request con HMAC-SHA256. Arma un "string a firmar" con el método HTTP, el Accept, el Content-Type, la llave de la app y el path, y lo firma con el `appSecret` usando el módulo `crypto` de Node. Esto es EXACTAMENTE como lo pide la documentación de Artemis, no me lo inventé.
- `buildHeaders(method, path)` — arma los headers necesarios: `X-Ca-Key`, `X-Ca-Timestamp`, y la firma que sale de `sign()`.
- `addOrUpdatePerson(person)` — `POST` a `/artemis/api/resource/v1/person/single/add` con `personCode`, `personName`, `orgIndexCode`, `gender` (mapeado a 1/2 según sea hombre/mujer). Usa un `httpsAgent` que ignora certificados SSL inválidos (`rejectUnauthorized: false`) porque HikCentral local normalmente usa certificado autofirmado.
- `addFace(personCode, photoBuffer)` — lo agregué yo, `POST` a `/artemis/api/resource/v1/face/single/addFace` con la foto en base64. Este endpoint SÍ es un endpoint real y documentado de Artemis para dar de alta caras, a diferencia del de ISAPI que es más incierto.

**Resumen de la posta con esto**: el modo OpenAPI está mejor armado y es más confiable ahorita mismo. El modo ISAPI tiene dos huecos pendientes (digest auth y el endpoint de cara) que hay que resolver antes de usarlo en serio con el dispositivo físico.

---

## 8. `services/importer/employeeImporter.js` — el traductor de Excel

Este archivo lo armé para la importación de nómina, usa la librería `exceljs`:

- `HEADER_MAP` — un diccionario que mapea un montón de posibles nombres de columna (en español, con o sin acentos, mayúsculas o minúsculas) al campo interno que usamos. Por ejemplo: "Número Empleado", "N° Empleado", "Código" todos apuntan a `employee_no`. Esto es para que no le tengas que pedir a la institución que use exactamente tal o cual palabra en su Excel — el sistema es flexible con los nombres de columna.
- `normalizeHeader(value)` — le quita acentos, pasa a minúsculas, y le saca cualquier símbolo que no sea letra o número. Así "Número Empleado", "número empleado", "NUMERO EMPLEADO" todos terminan siendo la misma llave `numeroempleado`.
- `normalizeGender(value)` — convierte cualquier variante ("F", "Femenino", "Mujer", "female") a `'female'`, y lo mismo para hombre, si no reconoce nada pone `'unknown'`.
- `loadWorksheet(buffer, mimetype)` — si el archivo es CSV, lo lee como stream de texto; si es Excel, lo carga directo con `exceljs`. Devuelve la primera hoja.
- `parseNomina(buffer, mimetype)` — la función principal:
  1. Lee la primera fila (encabezados) y arma un mapa de "columna número tal = campo interno tal".
  2. Recorre todas las demás filas.
  3. Si a una fila le falta el nombre, la marca como error y sigue (no rompe todo el import por una fila mala).
  4. Si no tiene número de empleado, usa la cédula como número de empleado (fallback).
  5. Si no tiene `org_index_code`, usa el departamento como valor por defecto.
  6. Devuelve `{ rows, errors }` — las filas válidas listas para guardar, y la lista de errores con el número de fila y el motivo.

O sea bro, este archivo es el que hace toda la magia de "agarra cualquier Excel medio desordenado de la institución y conviértelo en algo que el sistema entienda".

---

## 9. `views/` — todo lo que se ve en pantalla

Usa EJS, un motor de plantillas bien directo (HTML con `<% %>` para lógica y `<%= %>` para imprimir valores escapados).

### `views/partials/header.ejs` y `views/partials/footer.ejs`
Estos dos arman el "molde" que envuelve casi todas las páginas (menos login y error, que son standalone). El header trae:

- Metadatos, título dinámico según el nombre de la institución, favicon (o uno por defecto si no hay).
- Fuentes de Google Fonts (Outfit para títulos, Work Sans para texto normal, JetBrains Mono para números).
- Un `<style>` inline que define las variables CSS `--primary`, `--secondary`, `--accent` con los colores que vengan de la base de datos — esto es lo que hace que el branding sea dinámico sin tocar el CSS.
- El `<aside class="sidebar">` con el logo, nombre de la institución, y el menú de navegación (con iconitos SVG hechos a mano, no de ninguna librería). Cada link se marca como "activo" comparando `currentPath` con la ruta.
- El link a "Branding (CMS)" solo aparece si `session.role === 'admin'`.
- Un "skip link" para accesibilidad (usuarios de teclado pueden saltar directo al contenido).

El footer simplemente cierra todos los divs que el header abrió (`content-inner`, `content`, `app-shell`, `body`, `html`).

### `views/partials/status-pill.ejs`
Un partial chiquito y reusable: le pasás un `status` (puede ser `synced`, `pending`, `error`, `success`) y te devuelve un pill de colorcito con un punto — verde para bien, naranja para pendiente, rojo para error. Se usa tanto en la tabla de empleados como en la de actividad reciente del dashboard.

### `views/login.ejs`
Standalone (no usa el header/footer normal, es su propio HTML completo). Formulario de correo + contraseña, con un fondo oscuro con degradado y textura sutil.

### `views/error.ejs`
También standalone. Se usa para el 404 y para el 403 (acceso restringido) y cualquier error 500. Muestra el mensaje que le pases y un botón para volver al dashboard.

### `views/dashboard.ejs`
Usa el header/footer. Muestra:
- 4 tarjetas de resumen (total empleados, sincronizados, pendientes, con error).
- La tabla de "Actividad reciente" con los últimos logs, usando el partial de status-pill para pintar el estado.

### `views/empleados/index.ejs`
La página más cargada:
- Mensaje de resultado arriba (si acabás de importar algo, te dice cuántos importó/sincronizó/con foto/con error).
- El formulario de importación (con explicación de qué columnas espera el Excel y cómo nombrar las fotos).
- La tabla de todos los empleados con su estado de sincronización.

### `views/cms.ejs`
Tres secciones: colores (con inputs tipo `color` + el código hex al lado + una vista previa en vivo), logo (con el logo actual si existe) y favicon (igual).

### `views/dispositivos/index.ejs` y `views/asistencia/index.ejs`
Bien simples, tablas vacías con su mensajito de "todavía no hay nada acá", esperando que se conecte la integración real.

---

## 10. `public/css/app.css` — todo el diseño en un solo archivo

Sin ningún framework (nada de Bootstrap, Tailwind, nada), CSS puro con variables (`:root`) para colores, tipografías, sombras y radios de borde. Algunos puntos clave:

- Usa `color-mix()` de CSS moderno para hacer sombras y focos que combinan con el color de acento sin tener que calcular el color a mano.
- Tiene clases para: la barra lateral, las tarjetas de estadísticas, las tablas de datos, los pills de estado, los formularios (inputs, botones, hasta el botón feo de `<input type="file">` se le puso estilo con `::file-selector-button`), las alertas de éxito/error, la tarjeta de login, la página de error, el CMS.
- Tiene una media query para pantallas chicas (menos de 860px) que convierte la barra lateral vertical en una barra horizontal con solo iconos (sin texto), para que no se vea feo en celular.

---

## 11. `package.json` — las dependencias

- `express` — el framework web.
- `ejs` — motor de plantillas.
- `express-session` + `connect-flash` — sesiones y mensajes flash.
- `bcrypt` — hashear contraseñas.
- `mysql2` — conectar a la base.
- `multer` — subir archivos.
- `exceljs` — leer/escribir Excel.
- `axios` — cliente HTTP para hablar con Hikvision.
- `dotenv` — leer el `.env`.
- `nodemon` (solo en desarrollo) — reinicia el servidor solo cuando cambia un archivo.

Scripts importantes: `npm start` (producción), `npm run dev` (desarrollo con nodemon), `npm run db:init` (crear la base), `npm run db:seed-admin` (crear el primer admin).

---

## Resumen de la posta, para que no se te olvide

1. **`app.js`** arranca todo y conecta las rutas.
2. **`config/`** dice cómo conectarse a la base y a Hikvision.
3. **`database/`** tiene el esquema y los scripts de setup.
4. **`models/`** son las únicas partes que le hablan directo a la base.
5. **`middlewares/`** cuidan quién entra y validan archivos subidos.
6. **`routes/`** son el tráfico: reciben el request, llaman a los models y a los services, y deciden qué vista mostrar.
7. **`services/hikvision/`** es el puente hacia el mundo real (el dispositivo o HikCentral) — acá está toda la parte más delicada y menos probada.
8. **`services/importer/`** convierte Excel desordenado en datos limpios.
9. **`views/`** es todo lo visual, con EJS y CSS puro, sin frameworks de frontend.

Y así se arma todo el rompecabezas, mi rey. Cualquier cosa rara que se te presente, siempre seguí el hilo: ruta → modelo/servicio → vista, y ahí vas a encontrar la respuesta. O plena que sí, así de directo es esto.
