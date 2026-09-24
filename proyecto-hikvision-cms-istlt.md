# Proyecto: Plataforma Web de Control de Acceso Personalizada (Hikvision/HikCentral)

## Contexto

Institución educativa con un dispositivo Hikvision **DS-K1T320MFX** (lector biométrico de control de acceso) ya configurado y funcionando en **HikCentral Access Control**, IP `192.168.1.10`, firmware `V3.5.20 build 241227`, accesible vía `https://127.0.0.1/#/accessControl/home`.

Se requiere construir una **plataforma web propia** que replique la funcionalidad de HikCentral (Dispositivo, Persona, Control de acceso, Asistencia) pero con:
- Interfaz personalizada para la institución (no la UI genérica de HikCentral)
- Un **mini CMS** para gestionar la identidad visual
- Un módulo de **gestión e importación de empleados** compatible con el formato que Hikvision espera

## Stack técnico

- **Backend**: Node.js + Express
- **Vistas**: EJS (mismo enfoque que la biblioteca digital de ISTLT ya construida)
- **Base de datos**: MariaDB/MySQL
- **Subida de archivos**: Multer (logo, favicon)
- **Parseo de Excel/CSV**: ExcelJS o SheetJS
- **Autenticación**: bcrypt (mismo patrón que otros proyectos ISTLT)
- **Theming**: variables CSS inyectadas dinámicamente desde configuración en BD

## Arquitectura de integración con Hikvision (adaptador dual)

No está confirmado aún si hay acceso a **HikCentral OpenAPI** (AppKey/AppSecret vía Artemis) o solo al dispositivo directo. Por eso la integración se construye desacoplada:

```
/services/hikvision/
  ├── isapiAdapter.js      → ISAPI directo al DS-K1T320MFX (digest auth, JSON/XML)
  ├── openApiAdapter.js    → HikCentral OpenAPI/Artemis (firma HMAC-SHA256, AppKey/Secret)
  └── hikvisionClient.js   → interfaz única; elige adaptador según config (.env)
```

**Verificación pendiente**: revisar en HikCentral → Sistema → Ajustes de API abierta / Open Platform si existe generación de AppKey/AppSecret. Si sí → integración completa (personas, asistencia, registros, eventos). Si no → solo ISAPI al dispositivo.

## Mini CMS (branding institucional)

Tabla `institution_settings`:
```
id | primary_color | secondary_color | accent_color | logo_path | favicon_path | institution_name | updated_at
```

- Panel admin con selector de colores + preview en vivo
- Subida de logo y favicon (Multer, validación de tipo/tamaño)
- `layout.ejs` inyecta los colores como variables CSS (`--primary`, `--secondary`, `--accent`) en un `<style>` inline — cambia el theme de todo el dashboard sin recompilar

## Módulo de empleados (doble vía, ambas requeridas)

1. **Exportación a plantilla HikCentral**: parser que lee el Excel/CSV institucional (nombre, cédula, departamento, cargo, foto opcional) y lo mapea a las columnas exactas de la plantilla oficial de importación de personas de HikCentral (`employeeNo`, `name`, `orgIndexCode`, `gender`, `cardNo`, etc.) para descarga y carga manual en HikCentral.
2. **Push directo vía API**: mismo mapeo, enviado como:
   - `POST /artemis/api/resource/v1/person/single/add` (si hay OpenAPI), o
   - `PUT /ISAPI/AccessControl/UserInfo/Record?format=json` (si es directo al dispositivo)
   - Incluye manejo de fotos para reconocimiento facial si el terminal lo soporta

## Dashboard espejo

Réplica de las secciones vistas en HikCentral (Dispositivo, Persona, Control de acceso, Asistencia), con datos:
- Cacheados localmente en BD propia
- Refrescados por polling periódico o webhooks/eventos (si HikCentral los soporta)
- Para evitar golpear la API del dispositivo/HikCentral en cada request

## Estructura de carpetas propuesta

```
/proyecto-control-acceso/
  ├── /config/              → .env, conexión BD, config de adaptador Hikvision
  ├── /models/               → InstitutionSettings, Employee, SyncLog, User(admin)
  ├── /services/
  │    └── /hikvision/       → isapiAdapter.js, openApiAdapter.js, hikvisionClient.js
  ├── /routes/                → dashboard, personas, dispositivos, asistencia, cms, empleados
  ├── /views/                 → EJS (layout.ejs con variables CSS dinámicas)
  ├── /public/
  │    ├── /uploads/logos/
  │    └── /uploads/favicons/
  ├── /middlewares/           → auth, upload validation
  └── package.json
```

## Próximos pasos al iniciar en Claude Code

1. Confirmar si hay AppKey/AppSecret de HikCentral OpenAPI (o trabajar solo con ISAPI por ahora)
2. Inicializar el proyecto Node/Express con la estructura de carpetas anterior
3. Modelar la BD (`institution_settings`, `employees`, `sync_logs`)
4. Construir el `hikvisionClient.js` con ambos adaptadores y modo de selección por `.env`
5. Construir el mini CMS de branding primero (es independiente de la integración Hikvision)
6. Construir el parser/mapeador de empleados (Excel → formato HikCentral)
7. Conectar el dashboard espejo una vez validada la conexión con el dispositivo/HikCentral
