# REQUIREMENTS — SISCON-CECIAMB

> Sistema contable moderno inspirado en CIACLI Contabilidad Sparrow.
> Prioridad: **M** = Must (MVP) · **S** = Should · **C** = Could

---

## 1. Actores y roles

| Rol | Descripción | Permisos principales |
|---|---|---|
| **Administrador** | Gestiona usuarios, roles, empresa, períodos | Todo, incluido configuración y reapertura de períodos |
| **Contador General** | Responsable contable | CRUD plan de cuentas, crear/aprobar/anular comprobantes, cerrar períodos, libros |
| **Analista Contable** | Carga operativa | Crear/editar comprobantes en borrador, consultar libros |
| **Auditor** (interno / SENIAT) | Solo lectura | Consultar comprobantes, libros y bitácora; exportar |

Usuarios previstos: ~3 contables + administrador(es) + auditoría.

---

## 2. Requisitos funcionales

### RF-01 Autenticación y usuarios (M)
- RF-01.1 Login con usuario/correo y contraseña (hash bcrypt), sesión con JWT en cookie httpOnly.
- RF-01.2 CRUD de usuarios (solo Admin), activar/desactivar, asignar rol.
- RF-01.3 Cambio de contraseña; bloqueo tras 5 intentos fallidos.
- RF-01.4 Autorización por rol en **cada endpoint** del backend y en las rutas del frontend.

### RF-02 Empresa y configuración (M)
- RF-02.1 Datos de la empresa: razón social, RIF, dirección, moneda base (Bs.), logo para reportes.
- RF-02.2 Ejercicio económico (año fiscal) y **períodos mensuales** con estado: Abierto / Cerrado.
- RF-02.3 No se puede registrar ni modificar comprobantes en períodos cerrados.
- RF-02.4 (S) Moneda secundaria (USD) con tasa de cambio por comprobante.

### RF-03 Plan de cuentas (M) — igual que Sparrow
- RF-03.1 Catálogo jerárquico con código por niveles (ej. `1`, `1.1`, `1.1.01`, `1.1.01.001`), máscara configurable.
- RF-03.2 Tipo de cuenta: Activo, Pasivo, Patrimonio, Ingreso, Costo, Gasto; naturaleza Deudora/Acreedora.
- RF-03.3 Cuentas **de grupo** (totalizadoras) vs. **de movimiento** (solo estas aceptan asientos).
- RF-03.4 Activar/desactivar cuenta; no se elimina si tiene movimientos.
- RF-03.5 Búsqueda rápida por código o nombre; importación inicial desde Excel/CSV (S).
- RF-03.6 (S) Centros de costo (ej. Farmacia, Laboratorio, Hospitalización).

### RF-04 Categorías / Tipos de comprobante (M)
- RF-04.1 Catálogo de tipos: **Ventas, Compras, Honorarios, Nómina, Diario, Ajuste, Ingreso, Egreso** (editable por Admin).
- RF-04.2 Cada tipo tiene prefijo y **correlativo propio** por período (ej. `VEN-2026-10-0001`).

### RF-05 Comprobantes / Asientos contables (M) — núcleo
- RF-05.1 Cabecera: tipo, número (automático), fecha, período, concepto/descripción, referencia/documento soporte, beneficiario/tercero (opcional), estado.
- RF-05.2 Detalle (renglones): cuenta, descripción, centro de costo (S), Debe, Haber, referencia.
- RF-05.3 **Validación de partida doble**: Σ Debe = Σ Haber, mínimo 2 renglones, cada renglón con Debe **o** Haber (> 0, no ambos). Validado en front, back y transacción SQL.
- RF-05.4 Estados: **Borrador → Aprobado (Actualizado) → Anulado**. Solo Contador/Admin aprueba o anula.
- RF-05.5 Aprobado = inmutable. Corrección solo mediante anulación (con motivo) o comprobante de ajuste/reverso.
- RF-05.6 Listado con filtros: **por categoría o todos**, rango de fechas, estado, número, cuenta, texto; paginado y ordenable.
- RF-05.7 Duplicar comprobante; generar comprobante de reverso (S).
- RF-05.8 Plantillas/comprobantes recurrentes (C).
- RF-05.9 Imprimir/exportar comprobante a PDF.
- RF-05.10 (S) Importar resumen de movimientos (CSV/Excel) de ventas, compras, honorarios o nómina para generar el comprobante en borrador.
- RF-05.11 (S) Adjuntar documento soporte (PDF/imagen).

### RF-06 Libros (M)
- RF-06.1 **Libro Diario**: comprobantes aprobados en orden cronológico, por rango de fechas/período, con totales Debe/Haber.
- RF-06.2 **Libro Mayor**: por cuenta (o rango de cuentas): saldo anterior, movimientos, saldo acumulado por línea, saldo final.
- RF-06.3 Filtro por categoría de comprobante (opcional) y por centro de costo (S).
- RF-06.4 Exportación a **PDF** y **Excel**, con encabezado de empresa, RIF, rango, fecha de emisión y usuario.
- RF-06.5 (S) Balance de Comprobación. (C) Balance General y Estado de Resultados.

### RF-07 Bitácora / Auditoría (M)
- RF-07.1 Registrar: usuario, acción (CREAR, EDITAR, APROBAR, ANULAR, LOGIN, CERRAR_PERIODO…), entidad, id, fecha/hora, IP, valores **antes/después** (JSON).
- RF-07.2 La bitácora es de solo inserción (sin UPDATE/DELETE desde la app).
- RF-07.3 Pantalla de consulta con filtros (usuario, acción, entidad, fecha) y exportación.
- RF-07.4 En el detalle de cada comprobante: historial "creado por / modificado por / aprobado por".

### RF-08 Cierre de período (S)
- RF-08.1 Cerrar período mensual (no permite borradores pendientes o los advierte).
- RF-08.2 Reapertura solo por Admin, con motivo, registrada en bitácora.
- RF-08.3 (C) Cierre de ejercicio con asiento de cierre automático.

### RF-09 Dashboard (S)
- Comprobantes por estado y categoría del mes, borradores pendientes de aprobación, últimas acciones.

---

## 3. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | **Integridad**: toda escritura contable en transacción MariaDB (InnoDB); montos `DECIMAL(18,2)`, nunca `FLOAT`. |
| RNF-02 | **Seguridad**: bcrypt, JWT httpOnly + SameSite, helmet, CORS restringido, rate-limit en login, consultas parametrizadas (sin SQL concatenado), validación con zod en back. |
| RNF-03 | **Auditoría**: 100 % de operaciones de escritura en bitácora. |
| RNF-04 | **Rendimiento**: listados < 1 s con 100 000 renglones; libros de un año < 5 s. Índices en fecha, cuenta, tipo, estado. |
| RNF-05 | **Usabilidad**: español, formato numérico venezolano (`1.234.567,89`), fechas `dd/mm/aaaa`, captura de renglones con teclado (Tab/Enter, autocompletar cuenta). Responsive, prioridad escritorio. |
| RNF-06 | **Respaldo**: script de backup diario `mysqldump` documentado. |
| RNF-07 | **Mantenibilidad**: JavaScript (ESM), ESLint + Prettier, estructura por módulos, tests (Vitest/Supertest) en reglas contables críticas. |
| RNF-08 | **Despliegue**: local (red interna), Node 24 LTS + MariaDB 13 (compatible MySQL). |
| RNF-09 | **Normativa**: libros conforme a práctica venezolana (VEN-NIF / requerimientos SENIAT); comprobantes numerados correlativos sin huecos. |

---

## 4. Stack técnico

| Capa | Tecnología |
|---|---|
| Lenguaje | JavaScript (ES Modules) |
| Runtime | Node.js 24 LTS |
| Backend | Express 5, mysql2, Knex (migraciones/consultas), zod, bcrypt, jsonwebtoken, helmet, pino |
| Base de datos | **MariaDB Server 13** (local, GPL, compatible MySQL) + HeidiSQL |
| Frontend | React 19 + Vite, **Tailwind CSS v4**, React Router, TanStack Query, React Hook Form + zod |
| Reportes | pdfmake (PDF), exceljs (Excel) |
| Tests | Vitest, Supertest |
| Control de versiones | Git + **Gitflow** (`feature/*` → `dev` → `main`) |

---

## 5. Modelo de datos inicial (borrador)

```
usuarios(id, nombre, email, password_hash, rol_id, activo, intentos_fallidos, creado_en)
roles(id, nombre)
empresa(id, razon_social, rif, direccion, moneda_base, logo)
ejercicios(id, anio, fecha_inicio, fecha_fin, estado)
periodos(id, ejercicio_id, mes, fecha_inicio, fecha_fin, estado)
cuentas(id, codigo UNIQUE, nombre, nivel, padre_id, tipo, naturaleza, es_movimiento, activa)
centros_costo(id, codigo, nombre, activo)
tipos_comprobante(id, codigo, nombre, prefijo, activo)          -- VEN, COM, HON, NOM, DIA, AJU, ING, EGR
correlativos(tipo_id, periodo_id, ultimo_numero)                -- PK compuesta, SELECT ... FOR UPDATE
comprobantes(id, tipo_id, periodo_id, numero, fecha, concepto, referencia, tercero,
             estado, total_debe, total_haber,
             creado_por, creado_en, aprobado_por, aprobado_en, anulado_por, anulado_en, motivo_anulacion)
comprobante_detalle(id, comprobante_id, linea, cuenta_id, centro_costo_id, descripcion, debe, haber)
bitacora(id, usuario_id, accion, entidad, entidad_id, datos_antes JSON, datos_despues JSON, ip, fecha)
```

---

## 6. Preguntas abiertas (a confirmar con el cliente)

1. ¿Multimoneda Bs./USD obligatoria desde el MVP? ¿Fuente de la tasa (BCV)?
2. ¿Una sola empresa o varias (multiempresa como Sparrow)?
3. ¿Se dispone del plan de cuentas actual de Sparrow para migrarlo? ¿Y del histórico de comprobantes?
4. ¿Formato exacto de Libro Diario/Mayor exigido (modelo impreso actual)?
5. ¿Uso solo en una PC o en red local (varias PCs contra un servidor)?
6. ¿Formato de los archivos de resumen que llegarían de ventas/compras/nómina?
