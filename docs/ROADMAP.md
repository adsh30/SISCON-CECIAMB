# ROADMAP — SISCON-CECIAMB

Cada entregable incluye **backend + frontend**. Cada fase se trabaja en ramas `feature/*` → `dev`; al cerrar la fase, `dev` → `main` con tag.

| Fase | Release | Contenido | Estado |
|---|---|---|---|
| 0 | v0.0.1 | Setup | ✅ |
| 1 | v0.1.0 | Autenticación, usuarios, roles, bitácora base | ✅ |
| 1b | v0.1.1 | Tasas BCV/Binance y conversor Bs ⇄ $/€ | ✅ |
| 2 | v0.2.0 | Empresa, ejercicios y períodos | ⬜ |
| 3 | v0.3.0 | Plan de cuentas | ⬜ |
| 4 | v0.4.0 | Comprobantes (núcleo) — **MVP interno** | ⬜ |
| 5 | v0.5.0 | Libro Diario y Libro Mayor (PDF/Excel) — **MVP usable** | ⬜ |
| 6 | v0.6.0 | Cierre de período, dashboard, importación de resúmenes | ⬜ |
| 7 | v1.0.0 | Endurecimiento, carga de los datos contables del Hospital CECIAMB, capacitación | ⬜ |
| 8 | v1.x | Extras: Balance de Comprobación, Estados Financieros, multimoneda, conciliación | ⬜ |

---

## Fase 0 — Setup
- [x] Instalar MariaDB 13 (servicio Windows `MariaDB`); crear `siscon_db` y usuario `siscon_app`.
- [x] Commit inicial en `main`, crear rama `dev`.
- [x] Monorepo npm workspaces (`server/`, `client/`), oxlint + Prettier, `.env.example`, `.gitignore`.
- [x] Server: Express 5, knex + mysql2, healthcheck `GET /api/v1/health` que consulta la BD.
- [x] Client: React + Vite + Tailwind v4, layout base (sidebar), estado del sistema (healthcheck) en la landing.
- [x] Script `npm run dev` que levanta ambos.

## Fase 1 — Seguridad y auditoría
- [x] Migraciones: `roles`, `usuarios`, `bitacora`. Seed: roles + admin.
- [x] Login/logout/me con cookie httpOnly, bloqueo tras 5 intentos, registro en bitácora.
- [x] UI: landing page, login, pantalla interna protegida.
- [x] API: login/logout/me, CRUD usuarios, roles dinámicos y matriz de permisos por módulo (ver/modificar/control total) verificada en el servidor, `bitacora.registrar()`.
- [x] UI: gestión de usuarios (crear con clave temporal, editar, habilitar/deshabilitar, archivar, restablecer clave), roles y permisos, cambio de clave obligatorio, Ajustes (perfil, tema claro/oscuro, ayudas), menú lateral estilo MGG.
- [x] UI: consulta de bitácora (filtros, detalle antes/después, exportar CSV) y bitácora inmutable en la BD (triggers).

## Fase 2 — Empresa y períodos
- [ ] API + UI: datos de empresa, ejercicios, generación de 12 períodos, abrir/cerrar.

## Fase 3 — Plan de cuentas
- [ ] API: CRUD jerárquico, validación de códigos y niveles, búsqueda, bloqueo de borrado con movimientos.
- [ ] UI: árbol de cuentas expandible, formulario, buscador; componente `AccountPicker` reutilizable.
- [ ] Seed: plan de cuentas base para centro de salud (VEN-NIF).
- [ ] (S) Centros de costo.

## Fase 4 — Comprobantes
- [ ] Migraciones: `tipos_comprobante`, `correlativos`, `comprobantes`, `comprobante_detalle`.
- [ ] API: crear/editar borrador, aprobar, anular, duplicar, listar con filtros (**por categoría o todos**), detalle, PDF.
- [ ] Tests de reglas: cuadre, período abierto, cuentas de movimiento, correlativo, inmutabilidad, bitácora.
- [ ] UI: listado con pestañas por categoría (Todos · Ventas · Compras · Honorarios · Nómina · Diario · Ajustes…), grilla de captura de renglones con teclado, totales y diferencia en vivo, historial de auditoría.

## Fase 5 — Libros
- [ ] API: Libro Diario (rango/período/categoría), Libro Mayor (cuenta o rango, saldo anterior y acumulado); exportar PDF y Excel.
- [ ] UI: filtros, vista previa en pantalla, botones de exportación.
- [ ] Test: Σ Diario = Σ Mayor = Σ comprobantes aprobados.

## Fase 6 — Operación
- [ ] Cierre/reapertura de período con validaciones.
- [x] Tablero de inicio base (estilo MGG): KPIs de tasas con variación, evolución BCV con historial oficial desde 2023, actividad de bitácora, usuarios por rol.
- [ ] Dashboard contable (pendientes por aprobar, comprobantes por categoría).
- [ ] Importación CSV/Excel de resúmenes (ventas, compras, honorarios, nómina) → comprobante en borrador.
- [ ] Adjuntos de documentos soporte.

## Operación continua
- [x] Bot de despliegue: publica solo cada cambio de `main` en la PC servidor (respaldo, pruebas, migración, verificación y vuelta atrás). Ver `docs/DESPLIEGUE.md`.
- [x] CI en GitHub Actions: lint, pruebas con MariaDB y compilación en cada cambio a `dev`/`main`.
- [x] Modo producción: el servidor entrega la interfaz compilada en un solo puerto, apto para http en la red interna.

## Fase 7 — Release v1.0
- [ ] Carga de los datos contables del Hospital CECIAMB (plan de cuentas, saldos e histórico). Los datos son del hospital: Sparrow es solo la herramienta que los usa hoy y de donde se exportarán.
- [ ] Revisión de seguridad, backups automáticos con `mysqldump`, manual de usuario.
- [ ] Pruebas de aceptación con los contadores.
