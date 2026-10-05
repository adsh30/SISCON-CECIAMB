# PLAN — SISCON-CECIAMB

Plan técnico de implementación. Ver [GOAL](GOAL.md), [REQUIREMENTS](REQUIREMENTS.md) y [ROADMAP](ROADMAP.md).

## 1. Arquitectura

```
┌──────────────────────┐   HTTP/JSON (cookie JWT)   ┌───────────────────────┐   mysql2/Knex   ┌──────────────┐
│ client/  React+Vite   │ ─────────────────────────▶ │ server/  Node+Express │ ──────────────▶ │ MariaDB 13   │
│ Tailwind, TanStack Q. │ ◀───────────────────────── │ rutas→controlador→    │                 │ siscon_db    │
└──────────────────────┘                             │ servicio→repositorio  │                 └──────────────┘
                                                     └───────────────────────┘
```

Monorepo con **npm workspaces**:

```
SISCON-CECIAMB/
├─ package.json              # workspaces: ["server", "client"], scripts dev/lint/test
├─ .env.example
├─ docs/                     # GOAL, REQUIREMENTS, PLAN, ROADMAP
├─ .claude/skills/           # skill del proyecto (convenciones front+back)
├─ server/
│  ├─ knexfile.js
│  ├─ src/
│  │  ├─ app.js, server.js
│  │  ├─ config/             # env, db (knex), logger
│  │  ├─ middlewares/        # auth, requireRole, validate(zod), errorHandler, auditContext
│  │  ├─ modules/
│  │  │  ├─ auth/            # *.routes.js, *.controller.js, *.service.js, *.repository.js, *.schema.js
│  │  │  ├─ usuarios/
│  │  │  ├─ periodos/
│  │  │  ├─ cuentas/
│  │  │  ├─ tipos-comprobante/
│  │  │  ├─ comprobantes/
│  │  │  ├─ libros/
│  │  │  └─ bitacora/
│  │  └─ utils/              # money, dates, pagination, pdf, excel
│  ├─ migrations/
│  ├─ seeds/                 # roles, admin, tipos de comprobante, plan de cuentas base
│  └─ tests/
└─ client/
   ├─ vite.config.js         # proxy /api → localhost:4000
   └─ src/
      ├─ main.jsx, App.jsx, index.css (@import "tailwindcss")
      ├─ api/                # cliente fetch + hooks TanStack Query por módulo
      ├─ components/ui/      # Button, Input, Table, Modal, MoneyInput, AccountPicker…
      ├─ layouts/            # AppLayout (sidebar + topbar)
      ├─ features/           # mismo nombre que módulos del server
      └─ routes/             # rutas protegidas por rol
```

## 2. Convenciones

- **Toda petición = Backend + Frontend**: migración (si aplica) → repositorio → servicio → ruta con zod + rol → bitácora → hook de API → pantalla React/Tailwind → prueba.
- API REST bajo `/api/v1`. Respuestas `{ data, meta }` / errores `{ error: { code, message, details } }`.
- Montos: `DECIMAL(18,2)` en BD; en JS se manejan como **string** o centavos enteros (nunca suma con float). Helper `money.js`.
- Escrituras contables siempre en `knex.transaction()`; correlativos con `SELECT … FOR UPDATE`.
- Nombres de tablas/columnas en español, snake_case. Código JS en camelCase.
- Commits: Conventional Commits en español (`feat(comprobantes): …`).

## 3. Gitflow

```
main ──●────────────────────────●──────  (releases etiquetadas v0.1.0, v0.2.0…)
        \                      /
dev ─────●────●──────●────────●────────  (integración)
              \     / \      /
feature/xxx    ●───●   ●────●
```

- `main`: solo código liberado. `dev`: integración. `feature/<modulo>-<desc>` desde `dev`.
- Flujo: `feature/*` → PR a `dev` → pruebas → PR `dev` → `main` + tag.
- `hotfix/*` desde `main`, se fusiona a `main` **y** `dev`.

## 4. Base de datos: instalación y conexión

**Motor:** **MariaDB Server 13** — gratis (GPL), 100 % compatible con MySQL. Instalado con `winget install MariaDB.Server`.
- Servicio de Windows `MariaDB`, inicio automático, puerto 3306.
- Ruta: `C:\Program Files\MariaDB 13.0\` (cliente de consola: `bin\mariadb.exe`).
- Gestor visual: **HeidiSQL** (`winget install HeidiSQL.HeidiSQL`) o DBeaver Community.
- BD y usuario de la app (ya creados; credenciales reales en `.env`, ignorado por git):

```sql
CREATE DATABASE siscon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'siscon_app'@'localhost' IDENTIFIED BY '********';
GRANT ALL PRIVILEGES ON siscon_db.* TO 'siscon_app'@'localhost';
FLUSH PRIVILEGES;
```

**Driver Node:** `mysql2` (con promesas) + `knex` para migraciones y query builder.

`.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=siscon_app
DB_PASSWORD=********
DB_NAME=siscon_db
JWT_SECRET=...
PORT=4000
```

## 5. Reglas de negocio críticas (con tests obligatorios)

1. Comprobante cuadrado (Σ Debe = Σ Haber, ≥ 2 líneas, cada línea Debe XOR Haber > 0).
2. Solo cuentas de movimiento y activas.
3. Fecha dentro de un período **abierto**.
4. Correlativo único por tipo + período, sin huecos.
5. Aprobado ⇒ inmutable; anular requiere motivo y rol.
6. Toda escritura ⇒ registro en bitácora dentro de la **misma transacción**.
7. Mayor: saldo según naturaleza (deudora: D − H; acreedora: H − D).

## 6. Orden de ejecución

Ver fases detalladas en [ROADMAP.md](ROADMAP.md). Resumen:
0. Setup (monorepo, Tailwind, MariaDB, Gitflow) → 1. Auth/usuarios/bitácora base → 2. Empresa, ejercicios, períodos → 3. Plan de cuentas → 4. Comprobantes → 5. Libro Diario y Mayor → 6. Cierre, dashboard, importaciones → 7. Endurecimiento y release v1.0.
