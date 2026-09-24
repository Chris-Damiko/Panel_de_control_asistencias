# Graph Report - hikvision_proyecto_pannel_web  (2026-09-11)

## Corpus Check
- Corpus is ~3,256 words - fits in a single context window. You may not need a graph.

## Summary
- 168 nodes · 218 edges · 9 communities
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.86)
- Token cost: 0 input · 61,470 output

## Community Hubs (Navigation)
- Adaptador Dual Hikvision
- Rutas y Middleware Auth
- Metadata package.json
- Modelos y Conexion BD
- Concepto Proyecto Hikvision CMS
- CMS Branding y Uploads
- App Bootstrap Express
- Dependencias npm
- Inicializacion de BD

## God Nodes (most connected - your core abstractions)
1. `Estructura de carpetas propuesta` - 9 edges
2. `express` - 8 edges
3. `requireAuth()` - 6 edges
4. `scripts` - 6 edges
5. `Node.js + Express` - 6 edges
6. `Plataforma Web de Control de Acceso Personalizada` - 5 edges
7. `client()` - 4 edges
8. `Mini CMS (branding institucional)` - 4 edges
9. `Push directo vía API` - 4 edges
10. `axios` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Push directo vía API` --references--> `HikCentral OpenAPI`  [EXTRACTED]
  proyecto-hikvision-cms-istlt.md → proyecto-hikvision-cms-istlt.md  _Bridges community 0 → community 4_

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Patrón de Adaptador Dual Hikvision (ISAPI/OpenAPI)** — services_hikvision_hikvisionclient, services_hikvision_isapiadapter, services_hikvision_openapiadapter, proyecto_hikvision_cms_istlt_arquitectura_adaptador_dual [EXTRACTED 1.00]
- **Flujo de Sincronización de Empleados (doble vía)** — proyecto_hikvision_cms_istlt_employee_module, proyecto_hikvision_cms_istlt_export_template, proyecto_hikvision_cms_istlt_push_api_directo, proyecto_hikvision_cms_istlt_hikcentral_openapi, proyecto_hikvision_cms_istlt_isapi [EXTRACTED 1.00]
- **Flujo de Branding del Mini CMS** — proyecto_hikvision_cms_istlt_mini_cms, proyecto_hikvision_cms_istlt_institution_settings_table, proyecto_hikvision_cms_istlt_multer, proyecto_hikvision_cms_istlt_css_theming [EXTRACTED 1.00]

## Communities (9 total, 0 thin omitted)

### Community 0 - "Adaptador Dual Hikvision"
Cohesion: 0.11
Nodes (25): Arquitectura de Integración Dual (Adaptador ISAPI/OpenAPI), Artemis API (HMAC-SHA256), Employee (model), Estructura de carpetas propuesta, HikCentral OpenAPI, InstitutionSettings (model), Middlewares (auth, upload validation), Routes (dashboard, personas, dispositivos, asistencia, cms, empleados) (+17 more)

### Community 1 - "Rutas y Middleware Auth"
Cohesion: 0.10
Nodes (20): requireAdmin(), requireAuth(), db, Employee, express, express, { requireAuth }, router (+12 more)

### Community 2 - "Metadata package.json"
Cohesion: 0.08
Nodes (23): allowScripts, bcrypt@6.0.0, author, description, devDependencies, nodemon, keywords, license (+15 more)

### Community 3 - "Modelos y Conexion BD"
Cohesion: 0.09
Nodes (16): mysql, pool, bcrypt, db, User, db, InstitutionSettings, db (+8 more)

### Community 4 - "Concepto Proyecto Hikvision CMS"
Cohesion: 0.15
Nodes (18): bcrypt, Biblioteca Digital de ISTLT, Theming CSS dinámico (variables inyectadas), Dashboard espejo, DS-K1T320MFX (lector biométrico), EJS (vistas), Módulo de empleados (doble vía), ExcelJS / SheetJS (+10 more)

### Community 5 - "CMS Branding y Uploads"
Cohesion: 0.13
Nodes (13): ALLOWED_MIME, crypto, multer, path, uploadFavicon, uploadLogo, multer, express (+5 more)

### Community 6 - "App Bootstrap Express"
Cohesion: 0.13
Nodes (14): app, asistenciaRoutes, authRoutes, cmsRoutes, dashboardRoutes, dispositivosRoutes, empleadosRoutes, express (+6 more)

### Community 7 - "Dependencias npm"
Cohesion: 0.18
Nodes (11): dependencies, axios, bcrypt, connect-flash, dotenv, ejs, exceljs, express (+3 more)

### Community 8 - "Inicializacion de BD"
Cohesion: 0.40
Nodes (3): fs, mysql, path

## Ambiguous Edges - Review These
- `bcrypt` → `Biblioteca Digital de ISTLT`  [AMBIGUOUS]
  proyecto-hikvision-cms-istlt.md · relation: conceptually_related_to

## Knowledge Gaps
- **101 isolated node(s):** `express`, `path`, `session`, `flash`, `InstitutionSettings` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 105 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `bcrypt` and `Biblioteca Digital de ISTLT`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `axios` connect `Adaptador Dual Hikvision` to `Metadata package.json`?**
  _High betweenness centrality (0.385) - this node is a cross-community bridge._
- **Why does `express` connect `Rutas y Middleware Auth` to `Metadata package.json`, `Modelos y Conexion BD`, `CMS Branding y Uploads`, `App Bootstrap Express`?**
  _High betweenness centrality (0.294) - this node is a cross-community bridge._
- **Why does `DS-K1T320MFX (lector biométrico)` connect `Concepto Proyecto Hikvision CMS` to `Adaptador Dual Hikvision`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **What connects `express`, `path`, `session` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Adaptador Dual Hikvision` be split into smaller, more focused modules?**
  _Cohesion score 0.10591133004926108 - nodes in this community are weakly interconnected._
- **Should `Rutas y Middleware Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.10153846153846154 - nodes in this community are weakly interconnected._