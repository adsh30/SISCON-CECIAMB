---
name: siscon-fullstack
description: Use when implementing ANY feature, fix or change in SISCON-CECIAMB (contabilidad, comprobantes, libros, plan de cuentas, usuarios, bitácora). Enforces delivering backend (Node/Express/MariaDB-MySQL) AND frontend (React/Tailwind) together, Gitflow to dev, and accounting integrity rules.
---

# SISCON-CECIAMB — Desarrollo full-stack

Sistema contable moderno inspirado en CIACLI Contabilidad Sparrow. Lee `docs/REQUIREMENTS.md` y `docs/PLAN.md` si necesitas contexto.

## Regla #1: SIEMPRE front y back
Toda petición se entrega completa. Nunca solo API ni solo UI. Si una capa no aplica, dilo explícitamente.

## Checklist por petición
1. **Rama**: `git checkout dev && git pull` → `git checkout -b feature/<modulo>-<desc>` (o `fix/*`). Nunca commitear en `main`.
2. **BD** (si aplica): migración Knex en `server/migrations/` — montos `DECIMAL(18,2)`, InnoDB, utf8mb4, FKs e índices.
3. **Backend** en `server/src/modules/<modulo>/`:
   - `*.schema.js` (zod) → `*.repository.js` (knex) → `*.service.js` (reglas) → `*.controller.js` → `*.routes.js`
   - Middlewares `auth` + `requireRole(...)` + `validate(schema)`.
   - Escrituras dentro de `knex.transaction()` y con `bitacora.registrar(trx, {...})` en la misma transacción.
   - Respuesta `{ data, meta }`; errores `{ error: { code, message, details } }`.
4. **Frontend** en `client/src/features/<modulo>/`:
   - Hook TanStack Query en `client/src/api/`.
   - Pantalla/componentes con Tailwind, reutilizando `components/ui/` (MoneyInput, AccountPicker, Table…).
   - Validación con React Hook Form + el mismo esquema zod; formato `1.234.567,89` y `dd/mm/aaaa`; ruta protegida por rol.
5. **Tests**: Vitest/Supertest para reglas de negocio del backend.
6. **Verificar**: `npm run lint && npm test` y probar el flujo en el navegador.
7. **Commit** (Conventional Commits en español) → PR a `dev`. `dev` → `main` solo en releases.

## Reglas contables no negociables
- Σ Debe = Σ Haber; ≥ 2 líneas; cada línea Debe XOR Haber > 0.
- Solo cuentas de movimiento activas; fecha en período abierto.
- Correlativo por tipo + período con `SELECT … FOR UPDATE`, sin huecos.
- Comprobante aprobado = inmutable; solo anular con motivo (Contador/Admin).
- Nunca usar float para dinero; usar strings/centavos y el helper `money.js`.
- Bitácora solo inserción, con datos antes/después.

## Fuera de alcance (rechazar o consultar)
Citas/historias médicas, facturación/POS, inventario físico, cálculo de nómina, APIs bancarias.
