import { useState } from 'react'
import { Icono } from '../../components/ui/Icono.jsx'

const FASES = [
  {
    id: 0,
    numero: 'Fase 0',
    nombre: 'Setup y Arquitectura Base',
    release: 'v0.0.1',
    estado: 'completado',
    lenguaje: 'Node.js 24 (ES Modules), JavaScript (JSX), CSS',
    frameworks: 'Express 5, React 19, Vite, Tailwind CSS 4, Knex.js',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['knex_migrations', 'knex_migrations_lock'],
    descripcion:
      'Configuración inicial del monorepo con npm workspaces (server y client), base de datos MariaDB con collation utf8mb4_unicode_ci, healthcheck de conexión y pipeline de integración continua (CI) en GitHub Actions.',
    caracteristicas: [
      'Monorepo con workspaces estructurados y scripts unificados',
      'Configuración de MariaDB Server 13 y usuario de aplicación',
      'Linter Oxlint y formateador Prettier configurados',
      'Verificación continua de salud en /api/v1/health',
    ],
  },
  {
    id: 1,
    numero: 'Fase 1 y 1b',
    nombre: 'Seguridad, Auditoría y Tasas Cambiarias',
    release: 'v0.1.1',
    estado: 'completado',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Zod, bcrypt, JSON Web Token (JWT httpOnly), TanStack Query',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['usuarios', 'roles', 'permisos_rol', 'bitacora', 'tasas_cambio'],
    descripcion:
      'Autenticación robusta con cookies httpOnly, bloqueo tras 5 intentos fallidos, matriz dinámica de permisos por módulo (ver, editar, control total), bitácora inmutable protegida por triggers en base de datos y sincronización de tasas oficiales BCV / Binance.',
    caracteristicas: [
      'Triggers en MariaDB para prohibir modificación o borrado en bitácora',
      'Matriz de permisos en tiempo real sin requerir re-login',
      'Histórico de tasas BCV y conversor bidireccional Bs ⇄ USD / EUR',
      'Auditoría con registro de dirección IP y cambios antes/después en JSON',
    ],
  },
  {
    id: 2,
    numero: 'Fase 2',
    nombre: 'Entidad Hospitalaria, Ejercicios y Períodos',
    release: 'v0.2.0',
    estado: 'completado',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Knex.js, React Hook Form, Zod',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['empresa', 'ejercicios', 'periodos'],
    descripcion:
      'Ficha institucional de la clínica CECIAMB (RIF, datos fiscales, logotipo oficial para reportes), generación automática de ejercicios de 12 períodos mensuales y reglas de cierre cronológico estricto con reapertura auditada.',
    caracteristicas: [
      'Validación de RIF venezolano y formato institucional',
      'Cierre secuencial obligatorio (no permite saltar meses)',
      'Reapertura justificada con registro en bitácora y permisos de control total',
      'Regla exigirPeriodoAbierto integrada en el motor contable',
    ],
  },
  {
    id: 3,
    numero: 'Fase 3',
    nombre: 'Plan Único de Cuentas (VEN-NIF)',
    release: 'v0.3.0',
    estado: 'completado',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Knex.js, Tailwind CSS, Componente AccountPicker',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['cuentas', 'centros_costo'],
    descripcion:
      'Estructura jerárquica de 6 niveles bajo principios VEN-NIF para instituciones hospitalarias (Activo, Pasivo, Patrimonio, Ingresos, Costos, Gastos, Cuentas de Orden), centros de costo por departamento clínico y validador de cuentas de movimiento.',
    caracteristicas: [
      'Árbol contable interactivo con búsqueda predictiva instantánea',
      'Protección referencial: bloqueo de eliminación en cuentas con saldo o movimientos',
      'Centros de costo asignables a quirófanos, hospitalización y consultas',
      'Componente selector AccountPicker integrado con teclado rápido',
    ],
  },
  {
    id: 4,
    numero: 'Fase 4',
    nombre: 'Motor Central de Comprobantes por Partida Doble',
    release: 'v0.4.0',
    estado: 'completado',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Knex.js (Transacciones ACID), Zod, Formato Money',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['tipos_comprobante', 'correlativos', 'comprobantes', 'comprobante_detalle'],
    descripcion:
      'El núcleo contable del sistema: captura ágil por teclado, cuadre estricto obligatorio (Debe = Haber), correlativos continuos por tipo sin huecos mediante bloqueo pesimista en base de datos, inmutabilidad tras aprobación y consulta analítica estilo Sparrow.',
    caracteristicas: [
      'Bloqueo SELECT ... FOR UPDATE en MariaDB para numeración correlativa segura',
      'Triggers en MariaDB para evitar alteraciones en comprobantes aprobados o anulados',
      'Soporte completo de borradores, anulación justificada, reverso y duplicación',
      'Pantalla analítica de detalles con filtros por cuenta, tercero y montos',
    ],
  },
  {
    id: 5,
    numero: 'Fase 5',
    nombre: 'Libros Legales (Diario y Mayor Analítico)',
    release: 'v0.5.0',
    estado: 'completado',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'ExcelJS, PDFKit, TanStack Query',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['comprobantes', 'comprobante_detalle', 'cuentas'],
    descripcion:
      'Generación de los libros obligatorios del Código de Comercio y la legislación tributaria venezolana. Libro Diario cronológico y Libro Mayor analítico con saldo anterior, movimientos del período y saldo final acumulado según naturaleza.',
    caracteristicas: [
      'Exportación oficial a Excel (.xlsx) con celdas numéricas y fórmulas',
      'Formato de impresión PDF tamaño carta y orientación horizontal optimizada',
      'Navegación fluida con enlaces directos desde el renglón al comprobante fuente',
      'Cuadre verificado: Suma Libro Diario = Suma Libro Mayor = Total Aprobados',
    ],
  },
  {
    id: 6,
    numero: 'Fase 6',
    nombre: 'Operación, Documentos Adjuntos e Importación',
    release: 'v0.6.0',
    estado: 'completado',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Multer, Node.js Crypto (SHA-256), TanStack Query',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['comprobante_adjuntos', 'bitacora'],
    descripcion:
      'Herramientas operativas avanzadas: dashboard contable con métricas operativas y comprobantes por categoría, módulo de importación de resúmenes de compras, ventas y nómina desde CSV/Excel, y archivo digital de soportes con hash criptográfico.',
    caracteristicas: [
      'Carga de documentos soporte (PDF, JPG, PNG) con verificación de integridad SHA-256',
      'Tablero de control con alertas automáticas de borradores pendientes de aprobación',
      'Importador de plantillas CSV para conversión automática a comprobante en borrador',
      'Descarga segura y visualización protegida por permisos de usuario',
    ],
  },
  {
    id: 81,
    numero: 'Fase 8 (Parte A)',
    nombre: 'Estados Financieros y Balance de Comprobación',
    release: 'v0.6.5',
    estado: 'completado',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'ExcelJS, PDFKit, Algoritmos de agregación patrimonial',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['cuentas', 'comprobantes', 'comprobante_detalle', 'periodos'],
    descripcion:
      'Emisión formal del Balance de Comprobación (Sumas y Saldos a 8 columnas con certificación de 3 pares de cuadre), Balance General clasificado bajo VEN-NIF (Activo, Pasivo y Patrimonio con verificación de ecuación patrimonial) y Estado de Resultados.',
    caracteristicas: [
      'Balance a 8 columnas: Saldos Anteriores, Movimientos y Saldos Actuales certificados',
      'Balance General clasificado: Corriente y No Corriente con cálculo de resultado del ejercicio',
      'Estado de Resultados con Utilidad Bruta, Operativa y Neta',
      'Exportación en hoja de cálculo Excel (.xlsx) y formatos de impresión formal',
    ],
  },
  {
    id: 7,
    numero: 'Fase 7',
    nombre: 'Carga Histórica Sparrow, Respaldo y Puesta en Producción',
    release: 'v1.0.0',
    estado: 'en_progreso',
    lenguaje: 'Node.js 24, JavaScript (ESM)',
    frameworks: 'mysql2, Scripts de automatización en PowerShell y cron de Windows',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['cuentas', 'centros_costo', 'comprobantes', 'comprobante_detalle'],
    descripcion:
      'Fase actual de transición operativa: migración definitiva de catálogo de cuentas, saldos iniciales y asientos históricos de CECIAMB desde Sparrow (conta2024), automatización de respaldos diarios con mysqldump y pruebas de aceptación contable (UAT).',
    caracteristicas: [
      'Script especializado scripts/bd/importar-sparrow.mjs listo para procesar datos',
      'Cotejo cruzado de sumas y saldos para validar 100% de coincidencia',
      'Rutina desatendida de respaldos con mysqldump y compresión diaria',
      'Capacitación y despliegue final en la red local de Hospital CECIAMB',
    ],
  },
  {
    id: 82,
    numero: 'Fase 8 (Parte B)',
    nombre: 'Tesorería: Conciliación Bancaria y Multimoneda',
    release: 'v1.1.0',
    estado: 'pendiente',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Algoritmos de coincidencia difusa, Knex.js',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['conciliaciones_bancarias', 'extractos_bancarios_lineas', 'ajustes_cambiarios'],
    descripcion:
      'Carga de estados de cuenta electrónicos de bancos venezolanos (Banesco, Mercantil, BDV, etc.), cotejo automatizado contra los movimientos contables de la cuenta de banco y generación de asientos por ajuste de diferencial cambiario según tasas BCV.',
    caracteristicas: [
      'Conciliación por monto, fecha y número de referencia bancaria',
      'Identificación de débitos no registrados (comisiones bancarias) con generación de asiento',
      'Hoja de trabajo de conciliación formal imprimible',
      'Reexpresión automática de saldos en moneda extranjera al cierre de período',
    ],
  },
  {
    id: 9,
    numero: 'Fase 9',
    nombre: 'Cuentas por Cobrar (CxC Hospitalaria)',
    release: 'v1.2.0',
    estado: 'pendiente',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'React Hook Form, Zod, TanStack Query',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['clientes_aseguradoras', 'facturas_cxc', 'cobros_cxc', 'retenciones_cxc'],
    descripcion:
      'Control de facturación emitida a empresas aseguradoras y pacientes particulares. Seguimiento de estados de cuenta por cliente, registro de cobranza, anticipos y generación automática del comprobante contable respectivo.',
    caracteristicas: [
      'Catálogo de pólizas y aseguradoras con días de crédito pactados',
      'Control de retenciones soportadas y emisión de recibos de caja',
      'Antigüedad de saldos (30, 60, 90, 120+ días)',
      'Generación automática de asientos contables de venta y cobranza',
    ],
  },
  {
    id: 10,
    numero: 'Fase 10',
    nombre: 'Cuentas por Pagar (CxP) y Retenciones Tributarias',
    release: 'v1.3.0',
    estado: 'pendiente',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'ExcelJS, PDFKit, Zod',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['proveedores', 'facturas_cxp', 'pagos_cxp', 'retenciones_iva_islr'],
    descripcion:
      'Gestión de facturas por insumos médicos, medicamentos y servicios generales. Emisión automática de comprobantes de retención de IVA e ISLR (formato oficial SENIAT) y programación de pagos a proveedores.',
    caracteristicas: [
      'Cálculo y retención automática de IVA (75% / 100%) e ISLR según decretos',
      'Generación del archivo TXT de retenciones de IVA para declaración en el portal SENIAT',
      'Generación de comprobantes XML para retenciones de ISLR',
      'Programación de pagos y generación de asientos contables de egreso',
    ],
  },
  {
    id: 11,
    numero: 'Fase 11',
    nombre: 'Honorarios Médicos y Nómina Hospitalaria',
    release: 'v1.4.0',
    estado: 'pendiente',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Node.js, React 19, Zod',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['medicos_especialistas', 'liquidaciones_honorarios', 'resumen_nomina'],
    descripcion:
      'Módulo especializado para la liquidación de honorarios profesionales a médicos especialistas por procedimientos quirúrgicos, emergencias y consultas, con enlace contable a los centros de costo respectivos.',
    caracteristicas: [
      'Baremos de honorarios por cirujano, anestesiólogo y ayudante',
      'Retención de ISLR profesional según normativa vigente',
      'Liquidación periódica y emisión de recibo de pago médico',
      'Distribución de gasto por centro de costo clínico en el comprobante',
    ],
  },
  {
    id: 12,
    numero: 'Fase 12',
    nombre: 'Activos Fijos y Depreciación de Equipos Clínicos',
    release: 'v1.5.0',
    estado: 'pendiente',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Knex.js, Math, Tablas de vida útil',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: ['activos_fijos', 'categorias_activos', 'historico_depreciaciones'],
    descripcion:
      'Control de equipamiento médico de alta tecnología (tomógrafos, quirófanos, monitores, mobiliario clínico), cálculo mensual automático de depreciación acumulada y generación desatendida del asiento contable al cierre.',
    caracteristicas: [
      'Ficha técnica del equipo médico con número de serie, ubicación y valor inicial',
      'Métodos de depreciación en línea recta según normativa fiscal y VEN-NIF',
      'Generación automática del asiento contable de depreciación en cada cierre',
      'Reporte consolidado de inventario de activos fijos para auditoría externa',
    ],
  },
]

export default function FasesSistemaPage() {
  const [pestana, setPestana] = useState('fases')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [faseExpandida, setFaseExpandida] = useState(7) // Fase 7 abierta por defecto

  const fasesFiltradas = FASES.filter((f) => {
    if (filtroEstado === 'completado' && f.estado !== 'completado') return false
    if (filtroEstado === 'en_progreso' && f.estado !== 'en_progreso') return false
    if (filtroEstado === 'pendiente' && f.estado !== 'pendiente') return false
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      return (
        f.nombre.toLowerCase().includes(q) ||
        f.numero.toLowerCase().includes(q) ||
        f.descripcion.toLowerCase().includes(q) ||
        f.lenguaje.toLowerCase().includes(q) ||
        f.baseDatos.toLowerCase().includes(q) ||
        f.tablas.some((t) => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  const totalCompletadas = FASES.filter((f) => f.estado === 'completado').length
  const totalEnProgreso = FASES.filter((f) => f.estado === 'en_progreso').length
  const totalPendientes = FASES.filter((f) => f.estado === 'pendiente').length
  const porcentaje = Math.round((totalCompletadas / FASES.length) * 100)

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado Institucional */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-marca to-marca/80 p-6 text-white shadow-lg md:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <Icono nombre="capas" className="size-3.5" />
              Arquitectura Técnica y Ruta de Crecimiento
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Fases del Sistema SISCON-CECIAMB
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-white/85 md:text-base">
              Estructura integral por capas de software, modelos de base de datos relacional MariaDB,
              lenguajes aplicados y hoja de ruta para la clínica CECIAMB.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-xl bg-white/10 p-3.5 text-center backdrop-blur-md">
              <div className="text-2xl font-black text-white">{porcentaje}%</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-white/75">
                Progreso Global
              </div>
            </div>
            <div className="rounded-xl bg-white/10 p-3.5 text-center backdrop-blur-md">
              <div className="text-2xl font-black text-white">{totalCompletadas}/{FASES.length}</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-white/75">
                Fases Listas
              </div>
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="relative z-10 mt-6">
          <div className="flex justify-between text-xs font-medium text-white/80">
            <span>Avance general de desarrollo e implantación</span>
            <span>{totalCompletadas} fases certificadas · {totalEnProgreso} en transición · {totalPendientes} planificadas</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-exito transition-all duration-500 ease-out"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>

        {/* Efecto decorativo de fondo */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-white/5 blur-2xl" />
      </div>

      {/* KPI Cards de Arquitectura */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-linea bg-superficie p-4.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-marca/10 text-marca">
              <Icono nombre="monitor" className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-pizarra">Capa de Presentación</p>
              <h2 className="text-base font-bold text-tinta">React 19 + Tailwind 4</h2>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-pizarra">
            JavaScript (ESM, JSX), Vite 6, componentes modulares y diseño institucional.
          </p>
        </div>

        <div className="rounded-xl border border-linea bg-superficie p-4.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-exito/10 text-exito">
              <Icono nombre="ajustes" className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-pizarra">Capa de Servidor</p>
              <h2 className="text-base font-bold text-tinta">Node.js 24 + Express 5</h2>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-pizarra">
            JavaScript estricto, Knex.js, Zod, middleware de auditoría y transacciones ACID.
          </p>
        </div>

        <div className="rounded-xl border border-linea bg-superficie p-4.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-aviso/10 text-aviso">
              <Icono nombre="baseDatos" className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-pizarra">Base de Datos</p>
              <h2 className="text-base font-bold text-tinta">MariaDB Server 13</h2>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-pizarra">
            Motor InnoDB, UTF-8 mb4, triggers de inmutabilidad y SELECT ... FOR UPDATE.
          </p>
        </div>

        <div className="rounded-xl border border-linea bg-superficie p-4.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-marca/10 text-marca">
              <Icono nombre="balance" className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-pizarra">Reglas Contables</p>
              <h2 className="text-base font-bold text-tinta">Normativa VEN-NIF</h2>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-pizarra">
            Partida doble, decimales exactos DECIMAL(18,2) y correlativos sin saltos.
          </p>
        </div>
      </div>

      {/* Selector de pestañas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPestana('fases')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              pestana === 'fases'
                ? 'bg-marca text-white shadow-xs'
                : 'text-pizarra hover:bg-superficie-2 hover:text-tinta'
            }`}
          >
            <Icono nombre="capas" className="size-4" />
            Fases Detalladas ({FASES.length})
          </button>
          <button
            type="button"
            onClick={() => setPestana('diagrama')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              pestana === 'diagrama'
                ? 'bg-marca text-white shadow-xs'
                : 'text-pizarra hover:bg-superficie-2 hover:text-tinta'
            }`}
          >
            <Icono nombre="diagrama" className="size-4" />
            Diagrama de Arquitectura
          </button>
          <button
            type="button"
            onClick={() => setPestana('migracion')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              pestana === 'migracion'
                ? 'bg-marca text-white shadow-xs'
                : 'text-pizarra hover:bg-superficie-2 hover:text-tinta'
            }`}
          >
            <Icono nombre="archivo" className="size-4" />
            Migración Sparrow
          </button>
        </div>

        {pestana === 'fases' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar fase, tabla o lenguaje..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-56 rounded-lg border border-linea bg-superficie px-3 py-1.5 text-xs text-tinta placeholder-pizarra/60 focus:border-marca focus:outline-none"
              />
              <Icono
                nombre="buscar"
                className="pointer-events-none absolute right-2.5 top-2 size-3.5 text-pizarra"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="rounded-lg border border-linea bg-superficie px-3 py-1.5 text-xs font-medium text-tinta focus:border-marca focus:outline-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="completado">Completadas ({totalCompletadas})</option>
              <option value="en_progreso">En progreso ({totalEnProgreso})</option>
              <option value="pendiente">Próximas ({totalPendientes})</option>
            </select>
          </div>
        )}
      </div>

      {/* PESTAÑA 1: FASES DETALLADAS */}
      {pestana === 'fases' && (
        <div className="space-y-4">
          {fasesFiltradas.map((fase) => {
            const estaExpandida = faseExpandida === fase.id
            const esCompletada = fase.estado === 'completado'
            const esEnProgreso = fase.estado === 'en_progreso'

            return (
              <div
                key={fase.id}
                className={`overflow-hidden rounded-xl border transition-all ${
                  estaExpandida
                    ? 'border-marca/40 bg-superficie shadow-md'
                    : 'border-linea bg-superficie hover:border-marca/30 hover:shadow-xs'
                }`}
              >
                {/* Cabecera de la fase */}
                <div
                  onClick={() => setFaseExpandida(estaExpandida ? null : fase.id)}
                  className="flex cursor-pointer items-center justify-between gap-4 p-5 select-none"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                        esCompletada
                          ? 'bg-exito/15 text-exito'
                          : esEnProgreso
                            ? 'bg-marca/15 text-marca animate-pulse'
                            : 'bg-superficie-2 text-pizarra'
                      }`}
                    >
                      {esCompletada ? (
                        <Icono nombre="check" className="size-5" />
                      ) : (
                        <span>{fase.release}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold tracking-wider text-pizarra uppercase">
                          {fase.numero} · {fase.release}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            esCompletada
                              ? 'bg-exito/10 text-exito'
                              : esEnProgreso
                                ? 'bg-marca/10 text-marca ring-1 ring-marca/20'
                                : 'bg-pizarra/10 text-pizarra'
                          }`}
                        >
                          {esCompletada
                            ? 'Completado'
                            : esEnProgreso
                              ? 'En Curso / UAT'
                              : 'Planificado'}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-tinta">{fase.nombre}</h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="hidden text-xs text-pizarra md:inline-block">
                      {fase.tablas.length} {fase.tablas.length === 1 ? 'tabla' : 'tablas'} en BD
                    </span>
                    <div
                      className={`rounded-lg p-1.5 text-pizarra transition-transform duration-200 ${
                        estaExpandida ? 'rotate-90 text-marca' : ''
                      }`}
                    >
                      <Icono nombre="chevron" className="size-5" />
                    </div>
                  </div>
                </div>

                {/* Contenido expandible de la fase */}
                {estaExpandida && (
                  <div className="border-t border-linea/70 bg-superficie-2/40 p-5 space-y-4">
                    <p className="text-sm text-tinta leading-relaxed">{fase.descripcion}</p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Lenguajes y Stack */}
                      <div className="rounded-lg border border-linea bg-superficie p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-marca uppercase tracking-wider">
                          <Icono nombre="ajustes" className="size-4" />
                          Lenguajes y Tecnologías
                        </div>
                        <div className="mt-2 space-y-1.5 text-xs text-tinta">
                          <p>
                            <span className="font-semibold text-pizarra">Lenguaje: </span>
                            {fase.lenguaje}
                          </p>
                          <p>
                            <span className="font-semibold text-pizarra">Frameworks / Librerías: </span>
                            {fase.frameworks}
                          </p>
                        </div>
                      </div>

                      {/* Base de Datos y Tablas */}
                      <div className="rounded-lg border border-linea bg-superficie p-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-aviso uppercase tracking-wider">
                          <Icono nombre="baseDatos" className="size-4" />
                          Base de Datos MariaDB ({fase.baseDatos})
                        </div>
                        <div className="mt-2 text-xs text-tinta">
                          <span className="font-semibold text-pizarra">Modelos / Tablas involucradas:</span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {fase.tablas.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-superficie-2 px-2 py-0.5 font-mono text-[11px] text-marca border border-linea"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Características y Entregables */}
                    <div className="rounded-lg border border-linea bg-superficie p-3.5">
                      <div className="text-xs font-bold text-pizarra uppercase tracking-wider">
                        Entregables y Reglas de Negocio
                      </div>
                      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs text-tinta">
                        {fase.caracteristicas.map((c, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-exito font-bold">✓</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* PESTAÑA 2: DIAGRAMA DE ARQUITECTURA */}
      {pestana === 'diagrama' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-linea bg-superficie p-6 shadow-xs">
            <h2 className="text-lg font-bold text-tinta">Diagrama de Arquitectura por Capas</h2>
            <p className="mt-1 text-sm text-pizarra">
              Flujo de comunicación sincrónico y asíncrono entre el navegador cliente, el servidor Express y el motor MariaDB.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Capa 1 */}
              <div className="rounded-xl border-2 border-marca/30 bg-marca/5 p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-marca text-white px-2.5 py-0.5 text-xs font-bold">
                    Capa 1
                  </span>
                  <span className="text-xs font-mono text-marca">Puerto :5173</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-tinta">Cliente Web SPA</h3>
                <p className="mt-1 text-xs text-pizarra">
                  Interfaz de usuario reactiva ejecutada en el navegador del usuario.
                </p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="rounded-md bg-superficie p-2.5 border border-linea">
                    <span className="font-semibold text-tinta">Tecnología:</span> React 19 + Vite 6
                  </div>
                  <div className="rounded-md bg-superficie p-2.5 border border-linea">
                    <span className="font-semibold text-tinta">Diseño:</span> Tailwind CSS 4 + Iconografía SVG
                  </div>
                  <div className="rounded-md bg-superficie p-2.5 border border-linea">
                    <span className="font-semibold text-tinta">Estado de Red:</span> TanStack Query v5
                  </div>
                </div>
              </div>

              {/* Capa 2 */}
              <div className="rounded-xl border-2 border-exito/30 bg-exito/5 p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-exito text-white px-2.5 py-0.5 text-xs font-bold">
                    Capa 2
                  </span>
                  <span className="text-xs font-mono text-exito">Puerto :4000</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-tinta">Servidor API REST</h3>
                <p className="mt-1 text-xs text-pizarra">
                  Lógica contable, middlewares de seguridad y transacciones de negocio.
                </p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="rounded-md bg-superficie p-2.5 border border-linea">
                    <span className="font-semibold text-tinta">Runtime:</span> Node.js 24 + Express 5
                  </div>
                  <div className="rounded-md bg-superficie p-2.5 border border-linea">
                    <span className="font-semibold text-tinta">Seguridad:</span> JWT httpOnly + Zod schemas
                  </div>
                  <div className="rounded-md bg-superficie p-2.5 border border-linea">
                    <span className="font-semibold text-tinta">Query Builder:</span> Knex.js + mysql2
                  </div>
                </div>
              </div>

              {/* Capa 3 */}
              <div className="rounded-xl border-2 border-aviso/30 bg-aviso/5 p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-aviso text-white px-2.5 py-0.5 text-xs font-bold">
                    Capa 3
                  </span>
                  <span className="text-xs font-mono text-aviso">Puerto :3306</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-tinta">MariaDB Server 13</h3>
                <p className="mt-1 text-xs text-pizarra">
                  Persistencia relacional, integridad referencial y auditoría inmutable.
                </p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="rounded-md bg-superficie p-2.5 border border-linea">
                    <span className="font-semibold text-tinta">Esquema:</span> siscon_db (utf8mb4_unicode_ci)
                  </div>
                  <div className="rounded-md bg-superficie p-2.5 border border-linea">
                    <span className="font-semibold text-tinta">Triggers:</span> Inmutabilidad de comprobantes y bitácora
                  </div>
                  <div className="rounded-md bg-superficie p-2.5 border border-linea">
                    <span className="font-semibold text-tinta">Concurrencia:</span> SELECT ... FOR UPDATE sin huecos
                  </div>
                </div>
              </div>
            </div>

            {/* Flujo de datos */}
            <div className="mt-8 rounded-xl bg-superficie-2 p-5 border border-linea">
              <h4 className="text-xs font-bold uppercase tracking-wider text-pizarra">
                Flujo Operativo de un Asiento Contable
              </h4>
              <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3 text-center text-xs text-tinta">
                <div className="rounded-lg bg-superficie p-3 border border-linea shadow-xs w-full md:w-auto">
                  1. Captura rápida con teclado en React
                </div>
                <span className="text-marca font-bold hidden md:inline">➔</span>
                <div className="rounded-lg bg-superficie p-3 border border-linea shadow-xs w-full md:w-auto">
                  2. Validación Zod y cálculo de cuadre
                </div>
                <span className="text-marca font-bold hidden md:inline">➔</span>
                <div className="rounded-lg bg-superficie p-3 border border-linea shadow-xs w-full md:w-auto">
                  3. Transacción Knex con correlativo sin huecos
                </div>
                <span className="text-marca font-bold hidden md:inline">➔</span>
                <div className="rounded-lg bg-superficie p-3 border border-linea shadow-xs w-full md:w-auto">
                  4. Triggers MariaDB y auditoría en bitácora
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: MIGRACIÓN SPARROW */}
      {pestana === 'migracion' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-linea bg-superficie p-6 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-marca/15 text-marca">
                <Icono nombre="archivo" className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-tinta">
                  Estado de la Migración desde Sparrow (conta2024)
                </h2>
                <p className="text-xs text-pizarra">
                  Herramienta de importación masiva de datos contables para SISCON-CECIAMB.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-aviso/40 bg-aviso-claro/50 p-4">
              <div className="flex items-start gap-3">
                <Icono nombre="ayuda" className="size-5 text-aviso shrink-0 mt-0.5" />
                <div className="text-xs text-tinta space-y-1">
                  <p className="font-bold text-aviso">Diagnóstico del archivo de volcado actual:</p>
                  <p>
                    El archivo <code className="font-mono bg-white/70 dark:bg-black/20 px-1 py-0.5 rounded">respaldos/contabilidad.sql</code> fue revisado.
                    Contiene la estructura DDL completa de las 66 tablas de Sparrow (<code className="font-mono">CREATE TABLE</code>), pero fue exportado en modo <strong>Structure only</strong> (sin registros ni sentencias <code className="font-mono">INSERT INTO</code>).
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-bold text-tinta">
                Instrucciones para generar el respaldo con datos desde SQLyog:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-tinta bg-superficie-2 p-4 rounded-xl border border-linea">
                <li>Abra SQLyog en la computadora donde está instalado Sparrow.</li>
                <li>Conéctese a la base de datos de Sparrow (usualmente llamada <code className="font-mono font-semibold">conta2024</code>).</li>
                <li>Haga clic derecho sobre la base de datos y seleccione: <strong>Backup/Export ➔ Backup Database As SQL Dump...</strong></li>
                <li>En la ventana emergente, en la sección <strong>Export Options</strong>, seleccione: <span className="font-bold text-marca">[X] Structure and data</span> o <span className="font-bold text-marca">[X] Data only</span>.</li>
                <li>Marque las tablas principales: <code className="font-mono">conta_plan_de_cuentas</code>, <code className="font-mono">conta_centro_costos</code>, <code className="font-mono">conta_asientos_cabezera</code> y <code className="font-mono">conta_asientos_detalles</code>.</li>
                <li>Guarde el archivo resultante reemplazando <code className="font-mono">respaldos/contabilidad.sql</code>.</li>
                <li>Ejecute en la terminal: <code className="font-mono bg-white dark:bg-black/30 px-2 py-1 rounded border border-linea">npm run bd:importar-sparrow</code>.</li>
              </ol>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl bg-superficie-2 p-4 border border-linea">
              <div>
                <p className="text-xs font-semibold text-tinta">Script automatizado disponible</p>
                <p className="text-xs text-pizarra">
                  Ubicación: <code className="font-mono">scripts/bd/importar-sparrow.mjs</code>
                </p>
              </div>
              <span className="rounded-lg bg-exito/15 text-exito font-semibold text-xs px-3 py-1.5">
                Listo para procesar
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
