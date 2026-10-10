# Contexto del proyecto SISCON-CECIAMB

Documento para quien se suma al proyecto, sea una persona o un asistente de IA (Claude Code, Antigravity…). Resume qué es el sistema, cómo está hecho, en qué va, qué reglas no se rompen y cómo tener una copia funcionando **con los mismos datos** en un solo paso.

> Estado al 10/10/2026 · versión **0.4.0** (Fases 0 a 4 terminadas).

---

## 1. Qué es

Sistema contable web del **Hospital de Clínicas CECIAMB** (Ciudad Guayana, Bolívar). Reemplaza el uso diario de **CIACLI Contabilidad Sparrow** con una aplicación moderna, auditable y usable con teclado. Los datos son del hospital: Sparrow es solo la herramienta de donde se traerán después (Fase 7).

Funciona **en la red local**: un equipo hace de servidor (MariaDB + Node) y los demás entran por el navegador. El idioma de la interfaz, el código, los mensajes y los commits es **español**.

## 2. Tecnología

| Capa          | Herramientas                                                                              |
| ------------- | ----------------------------------------------------------------------------------------- |
| Servidor      | Node.js 24 (ESM), Express 5, knex 3 + mysql2, zod 4, jsonwebtoken, bcryptjs, helmet, pino |
| Base de datos | MariaDB 13 (compatible con 11.8+), InnoDB, utf8mb4                                        |
| Interfaz      | React 19, Vite 8, Tailwind CSS 4, TanStack Query 5, React Router 8, React Hook Form + zod |
| Calidad       | oxlint, Prettier, Vitest + Supertest (pruebas contra la base `siscon_test`)               |
| Monorepo      | npm workspaces: `server/` y `client/`                                                     |

### Plugins y librerías clave del proyecto

| Plugin / librería                  | Dónde                   | Para qué                                                          |
| ---------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| `@vitejs/plugin-react`             | `client/vite.config.js` | React con recarga en caliente                                     |
| `@tailwindcss/vite`                | `client/vite.config.js` | Tailwind 4 sin archivo de configuración (tokens en `index.css`)   |
| Proxy de Vite `/api → :4000`       | `client/vite.config.js` | En desarrollo, la página (5173) llama a la API (4000) sin CORS    |
| `@fontsource-variable/public-sans` | cliente                 | Tipografía local, sin depender de internet                        |
| `concurrently`                     | raíz                    | `npm run dev` levanta servidor y página juntos                    |
| `helmet` + CSP con hashes          | `server/src/app.js`     | Cabeceras de seguridad; en producción, la API sirve `client/dist` |
| `express-rate-limit`               | servidor                | Frena intentos de inicio de sesión                                |
| `pino` / `pino-pretty`             | servidor                | Registro de eventos                                               |

## 3. Estructura

```
server/
  migrations/        esquema y datos iniciales (knex); nombre AAAAMMDDHHMMSS_descripcion.js
  seeds/             roles y administrador inicial (01_roles_admin.js)
  src/
    app.js           monta /api/v1/* y, en producción, la interfaz compilada
    config/          env.js (lee el .env de la raíz), db.js (pool en UTC)
    middlewares/     auth (sesión + permisos), validate (zod), errorHandler
    utils/           money.js (montos exactos con BigInt), fechas.js (hora de Caracas)
    modules/<modulo>/  *.schema.js → *.repository.js → *.service.js → *.controller.js → *.routes.js
  tests/             una prueba por módulo; limpiar.js vacía comprobantes entre pruebas
client/
  public/manual.html manual de usuario (se actualiza con cada cambio)
  src/
    api/             hooks de TanStack Query por módulo; client.js traduce errores al español
    components/ui/   piezas compartidas: Modal, Avisos, AccountPicker, MontoInput, Graficas…
    features/<modulo>/ pantallas
    lib/             formato venezolano, money.js (copia idéntica del servidor), permisos, bitácora
scripts/
  bd/bd.mjs          crear, exportar e importar la base local (ver sección 8)
  despliegue/        bot que publica la rama main e instalador de producción
docs/                GOAL, REQUIREMENTS, PLAN, ROADMAP, DESPLIEGUE, INSTALACION, este archivo
.claude/skills/siscon-fullstack/  instrucciones del proyecto para Claude Code
```

## 4. Módulos y estado

| Fase | Versión | Módulo                                                                                             | Estado       |
| ---- | ------- | -------------------------------------------------------------------------------------------------- | ------------ |
| 1    | 0.1.0   | Inicio de sesión, usuarios, roles y permisos, ajustes y tema oscuro, bitácora inmutable            | ✅           |
| 1b   | 0.1.x   | Tasas BCV (USD/EUR, 09:00 y 17:00, historial desde 2023) y Binance P2P; conversor Bs ⇄ $/€         | ✅           |
| 2    | 0.2.0   | Datos de la empresa (RIF, logo), ejercicios y 12 períodos, cierre en orden y reapertura con motivo | ✅           |
| 3    | 0.3.0   | Plan de cuentas jerárquico (VEN-NIF salud) y centros de costo                                      | ✅           |
| 4    | 0.4.0   | Comprobantes: borrador → aprobado → anulado, correlativos, duplicar, reverso, impresión/PDF        | ✅           |
| 5    | 0.5.0   | **Libro Diario y Libro Mayor** con PDF y Excel                                                     | ⬜ siguiente |
| 6    | 0.6.0   | Tablero contable, importar resúmenes (ventas, compras, honorarios, nómina), adjuntos               | ⬜           |
| 7    | 1.0.0   | Carga de los datos del hospital, respaldos automáticos, pruebas con los contadores                 | ⬜           |

Detalle en [ROADMAP.md](ROADMAP.md); requisitos en [REQUIREMENTS.md](REQUIREMENTS.md).

## 5. Reglas que no se rompen

**Contables**

- Partida doble: Σ Debe = Σ Haber, al menos 2 renglones, cada renglón con Debe **o** Haber mayor que cero (nunca ambos). Se valida en la pantalla, en el servidor y en la base (`CHECK`).
- Solo cuentas **de movimiento** y **activas**; la fecha debe caer en un **período abierto** (`exigirPeriodoAbierto`).
- El número (`VEN-2026-10-0001`) se asigna **al aprobar**, por tipo y período, con `SELECT … FOR UPDATE`; sin huecos. Esa transacción usa `READ COMMITTED` (ver sección 10).
- Aprobado = **inmutable**; solo se anula con motivo. Triggers de MariaDB lo impiden aunque se entre por fuera del sistema.
- No se cierra un período con borradores; no se elimina un ejercicio con comprobantes.
- Dinero **nunca en float**: viaja como texto (`'1500.50'`) y se opera con `money.js` (BigInt). `DECIMAL(18,2)` en la base.

**De auditoría**

- Toda escritura va en `db.transaction()` y registra en la bitácora (`registrar(trx, …)`) con datos de antes y después, en la misma transacción.
- La bitácora es solo inserción: triggers rechazan `UPDATE` y `DELETE`.

**Permisos** (matriz `roles_permisos`: ver / modificar / control total por módulo)

| Rol               | Comprobantes                   | Plan de cuentas | Períodos                       |
| ----------------- | ------------------------------ | --------------- | ------------------------------ |
| Administrador     | todo                           | todo            | todo (único que reabre)        |
| Contador general  | control total: aprueba y anula | control total   | crea ejercicios y cierra meses |
| Analista contable | registra y corrige borradores  | ver             | ver                            |
| Auditor           | ver                            | ver             | ver                            |

En el servidor: `requirePermiso('modulo', 'lectura'|'escritura'|'full')`. En la interfaz: `usePermisos().can()` y `<RequireModulo>`. Un módulo nuevo se agrega en `server/src/modules/roles/permisos.catalogo.js` **y** en su copia `client/src/lib/permisos.js`.

## 6. Convenciones de trabajo

- **Cada pedido se entrega completo: servidor + pantalla + manual** (`client/public/manual.html`, con los textos exactos de botones y mensajes). Si una capa no aplica, se dice.
- **Ramas:** `feature/*` o `fix/*` desde `dev` → se une a `dev` → `dev` se une a `main` y se suben **ambas** en cada entrega. El bot publica `main` en producción. Etiqueta `vX.Y.Z` solo al cerrar una fase.
- **Dos colaboradores en paralelo** (cada uno con su copia local y su rama). Para no pisarse:
  - Al empezar el día y **antes de unir a `dev`**: `npm run cotejar`. Muestra los commits que el otro subió a `dev`/`main` (autor y archivos) y, frente a la rama actual, los archivos que tocaron los dos, las migraciones nuevas de ambos lados y las copias que deben cambiar juntas (`money.js`, `permisos`).
  - Si `dev` avanzó: `git merge origin/dev` en la rama propia, luego `npm install`, `npm run db:migrate` y `npm test`. Los conflictos se resuelven en la rama propia, nunca en `dev` ni en `main`.
  - Leer lo del compañero en los archivos compartidos (`git log -p`) y comprobar que el cambio propio respeta lo suyo (reglas contables, permisos, manual) antes de unir.
  - Migraciones: la fecha del nombre de la propia debe ser posterior a la última que hay en `dev`; si no, se renombra mientras no esté publicada.
  - Una rama por pedido y corta; se une y se sube en cuanto pasa lint y pruebas, para que el otro la reciba pronto.
- **Commits** en español, estilo Conventional Commits (`feat(comprobantes): …`, `fix(ui): …`).
- Antes de unir: `npm run lint` y `npm test` sin errores, y probar el flujo en el navegador (claro, oscuro y ancho de teléfono).
- **Interfaz:**
  - Colores solo con los tokens del tema (`bg-superficie`, `text-tinta`, `text-marca`, `bg-alerta-claro`…), nunca `bg-white`.
  - Formato venezolano: `1.234.567,89` y `dd/mm/aaaa`; hora de Caracas en 12 h.
  - **Todo se ve en MAYÚSCULAS** (`text-transform` en `index.css`), excepto correos, claves y direcciones web. Para excluir algo: clase `sin-mayusculas`.
  - Avisos con `useAvisos()`: arriba al centro, 6 s, se cierran con un clic.
  - Errores de conexión: `client.js` los traduce y `EstadoConexion` muestra la franja «Sin conexión con el sistema».
- **Fechas:** la base guarda en **UTC** (el pool fuerza `time_zone = '+00:00'`); Venezuela es UTC−4 todo el año (`utils/fechas.js`). Las columnas `DATE` contables (`fecha`, `fecha_inicio`) son fechas de calendario sin hora.
- **API:** respuestas `{ data, meta }`; errores `{ error: { code, message, details } }` con mensajes para el usuario final, en español.

## 7. Base de datos

`siscon_db` (trabajo) y `siscon_test` (pruebas: se borra y rearma en cada `npm test`). Usuario de la aplicación: `siscon_app`.

| Tabla                                 | Contenido                                                            |
| ------------------------------------- | -------------------------------------------------------------------- |
| `usuarios`, `roles`, `roles_permisos` | acceso y matriz de permisos                                          |
| `bitacora`                            | auditoría, solo inserción (triggers `bitacora_sin_update/delete`)    |
| `tasas_cambio`                        | BCV y Binance; historial oficial desde 2023                          |
| `empresa`                             | una fila (id 1): razón social, RIF, logo (`MEDIUMBLOB`)              |
| `ejercicios`, `periodos`              | años contables y sus 12 meses (ABIERTO/CERRADO)                      |
| `cuentas`, `centros_costo`            | plan de cuentas jerárquico y áreas del hospital                      |
| `tipos_comprobante`, `correlativos`   | VEN, COM, HON, NOM, DIA, AJU, ING, EGR y su numeración por período   |
| `comprobantes`, `comprobante_detalle` | cabecera y renglones; triggers de inmutabilidad y `CHECK` Debe/Haber |
| `knex_migraciones`                    | control de migraciones                                               |

El esquema **solo** cambia con migraciones nuevas (`npm run db:make -w server -- nombre`); nunca se editan migraciones ya publicadas. Los datos iniciales que necesita producción (plan de cuentas base, tipos de comprobante) van **en migraciones**, porque el bot solo ejecuta `db:migrate`.

## 8. Base local: los mismos datos en un solo paso

### Quien ya tiene el sistema funcionando (exportar)

```powershell
npm run bd:exportar
```

Crea `respaldos/siscon_db-AAAA-MM-DD-HHMM.sql` con **todo**: tablas, datos, triggers y el logo. La carpeta `respaldos/` **no se sube a GitHub** a propósito: el archivo lleva los usuarios con sus claves cifradas y datos del hospital. Compártalo por un medio privado (USB, carpeta compartida de la red, Drive con acceso restringido).

> Consejo: antes de exportar, cree en **Usuarios y roles** el usuario de su compañero. Así, al cargar la copia, entra con su propio correo.

### Quien llega nuevo (preparar todo de una vez)

1. Instale Node.js 24+, Git y MariaDB 11.8+ (anote la clave de `root`).
2. Clone el proyecto e instale dependencias:

   ```powershell
   git clone https://github.com/adsh30/SISCON-CECIAMB.git
   cd SISCON-CECIAMB
   git checkout dev
   npm install
   copy .env.example .env
   ```

3. En `.env` complete `DB_PASSWORD` (la clave que tendrá `siscon_app`, la elige usted), `DB_ROOT_PASSWORD` (la de root de MariaDB) y `JWT_SECRET` (genérela con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
4. Copie el archivo `.sql` recibido en la carpeta `respaldos\` del proyecto y ejecute:

   ```powershell
   npm run bd:preparar -- respaldos\siscon_db-2026-10-10-1707.sql
   ```

   Esto crea las bases `siscon_db` y `siscon_test`, crea el usuario `siscon_app` con sus permisos, carga la copia y aplica las migraciones que falten si la copia es de una versión anterior.

5. `npm run dev` y abra <http://localhost:5173>. Se entra con los **mismos usuarios y claves** que en el equipo de origen.

Sin copia, `npm run bd:preparar` deja una base nueva con roles, plan de cuentas base y el administrador de `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

| Comando                            | Qué hace                                                    |
| ---------------------------------- | ----------------------------------------------------------- |
| `npm run bd:crear`                 | Bases y usuario (no toca datos; se puede repetir)           |
| `npm run bd:exportar`              | Copia completa a `respaldos/`                               |
| `npm run bd:importar -- <archivo>` | Carga una copia; si la base tiene datos pide `--reemplazar` |
| `npm run bd:preparar -- <archivo>` | Todo de una vez (crear + importar + migrar)                 |

Más detalles (acceso desde otra PC, firewall, problemas comunes) en [INSTALACION.md](INSTALACION.md).

## 9. Herramientas de IA (plugins de Claude Code)

El repositorio trae la habilidad del proyecto **`.claude/skills/siscon-fullstack/SKILL.md`**: Claude Code la carga sola dentro de esta carpeta y recuerda el checklist (rama, migración, servidor, interfaz, pruebas, manual, subir a dev y main) y las reglas contables. Antigravity u otros asistentes deben leer este archivo y esa habilidad antes de empezar.

Plugins del marketplace oficial (`claude-plugins-official`) usados en el proyecto. Se instalan desde Claude Code con `/plugin` (o `/plugin install <nombre>@claude-plugins-official`):

| Plugin                                                | Uso en SISCON                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `superpowers`                                         | Disciplina de trabajo: planificar, depurar con método, verificar antes de dar por terminado |
| `frontend-design`                                     | Criterio visual para pantallas nuevas                                                       |
| `feature-dev`                                         | Exploración del código y diseño de funcionalidades grandes                                  |
| `code-review`, `pr-review-toolkit`, `code-simplifier` | Revisión de cambios antes de unirlos                                                        |
| `security-guidance`                                   | Avisos de seguridad al editar (sesiones, permisos, SQL)                                     |
| `playwright`, `chrome-devtools-mcp`                   | Probar las pantallas en un navegador real (capturas, flujo completo)                        |
| `commit-commands`                                     | Commits y ramas                                                                             |
| `remember`                                            | Memoria entre sesiones (carpeta `.remember/`, fuera de git)                                 |
| `claude-md-management`, `skill-creator`               | Mantener la habilidad del proyecto y las instrucciones                                      |
| `context7`                                            | Documentación actualizada de librerías (requiere autorizarlo en claude.ai)                  |
| `github`                                              | Operaciones en GitHub (requiere un token válido; hoy no conecta)                            |

Instalados en el equipo original pero **sin uso en este proyecto** (son de otros sistemas): `supabase`, `vercel`, `auth0`, `expo`, `telegram`, `typescript-lsp`, `pyright-lsp`, `agent-sdk-dev`, `plugin-dev`, `ralph-loop`, `playground`, `session-report`, `desktop-commander`, `browser-use`, `ai-plugins`, `claude-code-setup`.

Si los navegadores de los plugins no conectan, el recorrido se puede probar con `playwright-core` y el Chrome instalado (así se verificó la Fase 4).

## 10. Lecciones aprendidas (evitan horas de depuración)

- **MariaDB 11.8+ trae `innodb_snapshot_isolation` activo.** En `REPEATABLE READ`, bloquear una fila que otra transacción cambió después de la primera lectura da «Record has changed since last read». Las transacciones que comparten un contador (correlativos) usan `{ isolationLevel: 'read committed' }` y bloquean la fila del tipo antes de tocar el correlativo.
- **Express 5:** `req.query` es de solo lectura; la consulta validada queda en `req.consulta`.
- **Zod 4:** los mensajes se pasan como texto (`z.string('mensaje')`), no con `required_error`/`errorMap`. `z.coerce.boolean()` convierte `'false'` en `true`: para la URL se usa `booleanoConsulta`.
- **knex + MariaDB:** `select(lista, 'otra')` ignora el segundo argumento (usar `select([...lista, 'otra'])`); en `GROUP BY` un alias igual a una columna toma la columna.
- **mysql2 entrega las columnas JSON ya convertidas**; `DECIMAL` llega como texto (bien, no tocar).
- **Los respaldos llevan `--hex-blob`**, o el logo binario puede dañarse al restaurar.
- **Triggers y borrado en cascada:** el `ON DELETE CASCADE` no dispara triggers en MariaDB; por eso los renglones de un borrador se borran con él, y los de un aprobado no se pueden tocar.
- En Windows, si `npm run dev` deja de mostrar la página («Failed to fetch» o «Sin conexión»), suele ser que se cayó la parte `[client]` (Vite): Ctrl+C y `npm run dev` de nuevo.

## 11. Comandos de uso diario

```powershell
npm run cotejar        # qué subió el compañero y qué archivos tocaron los dos
npm run dev            # servidor :4000 + página :5173
npm run lint           # revisión de código
npm test               # pruebas (unas 130, ~90 s)
npm run build          # compila la interfaz para producción
npm run db:migrate     # aplica migraciones pendientes
npm run bd:exportar    # copia de la base para compartir o respaldar
npm run produccion     # bot de despliegue (solo en el equipo servidor)
```
