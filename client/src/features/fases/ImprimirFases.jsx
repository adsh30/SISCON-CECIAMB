import { useEffect } from 'react'
import { useSesion } from '../../api/auth.js'
import { useEmpresa } from '../../api/empresa.js'
import { Icono } from '../../components/ui/Icono.jsx'
import { formatoFechaHoraCaracas, nombreCompleto } from '../../lib/formato.js'

const ahoraUtc = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

const FASES = [
  {
    numero: 'Fase 0',
    nombre: 'Setup y Arquitectura Base',
    release: 'v0.0.1',
    estado: 'COMPLETADO',
    lenguaje: 'Node.js 24 (ES Modules), JavaScript (JSX), CSS',
    frameworks: 'Express 5, React 19, Vite, Tailwind CSS 4, Knex.js',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'knex_migrations, knex_migrations_lock',
    resumen:
      'Monorepo npm workspaces, estructura base de carpetas, healthcheck /api/v1/health y pipeline CI en GitHub Actions.',
  },
  {
    numero: 'Fase 1 y 1b',
    nombre: 'Seguridad, Auditoría y Tasas Cambiarias',
    release: 'v0.1.1',
    estado: 'COMPLETADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Zod, bcrypt, JWT (httpOnly), TanStack Query',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'usuarios, roles, permisos_rol, bitacora, tasas_cambio',
    resumen:
      'Sesiones seguras, bloqueo por intentos, matriz dinámica de permisos por rol, bitácora inmutable con triggers e histórico oficial BCV.',
  },
  {
    numero: 'Fase 2',
    nombre: 'Entidad Hospitalaria, Ejercicios y Períodos',
    release: 'v0.2.0',
    estado: 'COMPLETADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Knex.js, React Hook Form, Zod',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'empresa, ejercicios, periodos',
    resumen:
      'Ficha institucional CECIAMB, RIF validado, 12 períodos mensuales por ejercicio, cierre secuencial estricto y reaperturas auditadas.',
  },
  {
    numero: 'Fase 3',
    nombre: 'Plan Único de Cuentas (VEN-NIF)',
    release: 'v0.3.0',
    estado: 'COMPLETADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Knex.js, Componente AccountPicker con teclado ágil',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'cuentas, centros_costo',
    resumen:
      'Estructura jerárquica de 6 niveles bajo VEN-NIF adaptada a salud, centros de costo departamentales y protección contra borrado con saldo.',
  },
  {
    numero: 'Fase 4',
    nombre: 'Motor Central de Comprobantes Contables',
    release: 'v0.4.0',
    estado: 'COMPLETADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Knex.js (Transacciones ACID), Zod, Formato Money',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'tipos_comprobante, correlativos, comprobantes, comprobante_detalle',
    resumen:
      'Asientos por partida doble con cuadre estricto (Debe = Haber), correlativos continuos (SELECT FOR UPDATE), triggers de inmutabilidad y vista analítica.',
  },
  {
    numero: 'Fase 5',
    nombre: 'Libros Legales (Diario y Mayor Analítico)',
    release: 'v0.5.0',
    estado: 'COMPLETADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'ExcelJS, PDFKit, TanStack Query',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'comprobantes, comprobante_detalle, cuentas',
    resumen:
      'Libro Diario y Mayor con arrastre progresivo de saldos según naturaleza, exportación nativa a Excel (.xlsx) y formatos de impresión PDF.',
  },
  {
    numero: 'Fase 6',
    nombre: 'Operación, Documentos Soporte y Dashboard',
    release: 'v0.6.0',
    estado: 'COMPLETADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Multer, Crypto (SHA-256), TanStack Query',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'comprobante_adjuntos, bitacora',
    resumen:
      'Dashboard con métricas y alertas de borradores, importador CSV de resúmenes (ventas, compras, nómina) y archivo de adjuntos con hash SHA-256.',
  },
  {
    numero: 'Fase 8 (A)',
    nombre: 'Estados Financieros y Balance de Comprobación',
    release: 'v0.6.5',
    estado: 'COMPLETADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'ExcelJS, PDFKit, Agregación patrimonial',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'cuentas, comprobantes, comprobante_detalle, periodos',
    resumen:
      'Balance de Comprobación a 8 columnas (3 pares certificados), Balance General clasificado VEN-NIF y Estado de Resultados detallado.',
  },
  {
    numero: 'Fase 8 (B)',
    nombre: 'Tesorería: Conciliación Bancaria y Multimoneda',
    release: 'v0.7.0',
    estado: 'COMPLETADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Algoritmo de emparejamiento automático, Knex.js',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'conciliaciones, conciliacion_partidas',
    resumen:
      'Cotejo inteligente entre extracto bancario y Libro Mayor, identificación de cheques en tránsito, notas de débito y reporte de conciliación formal.',
  },
  {
    numero: 'Fase 7',
    nombre: 'Carga Histórica Sparrow, Respaldo y UAT',
    release: 'v1.0.0',
    estado: 'EN CURSO / UAT',
    lenguaje: 'Node.js 24, JavaScript (ESM)',
    frameworks: 'mysql2, Scripts de importación y mysqldump',
    baseDatos: 'MariaDB 13 (siscon_db y conta2024)',
    tablas: '66 tablas Sparrow en conta2024 + migración a siscon_db',
    resumen:
      'Importación del plan real y asientos históricos de CECIAMB desde Sparrow, respaldos automáticos diarios y validación contable final.',
  },
  {
    numero: 'Fase 9',
    nombre: 'Cuentas por Cobrar (CxC Hospitalaria)',
    release: 'v1.1.0',
    estado: 'PLANIFICADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'React Hook Form, Zod, TanStack Query',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'clientes_aseguradoras, facturas_cxc, cobros_cxc',
    resumen:
      'Facturación a aseguradoras y pacientes particulares, recibos de caja, antigüedad de saldos y generación automática de asientos.',
  },
  {
    numero: 'Fase 10',
    nombre: 'Cuentas por Pagar (CxP) y Retenciones Fiscales',
    release: 'v1.2.0',
    estado: 'PLANIFICADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'ExcelJS, PDFKit, Zod',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'proveedores, facturas_cxp, retenciones_iva_islr',
    resumen:
      'Facturación de proveedores médicos, cálculo automático de retenciones de IVA/ISLR, comprobantes SENIAT y archivo TXT.',
  },
  {
    numero: 'Fase 11',
    nombre: 'Honorarios Médicos y Nómina Hospitalaria',
    release: 'v1.3.0',
    estado: 'PLANIFICADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Node.js, React 19, Zod',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'medicos_especialistas, liquidaciones_honorarios',
    resumen:
      'Liquidación a cirujanos y especialistas por procedimientos, retenciones profesionales y asientos clasificados por quirófano.',
  },
  {
    numero: 'Fase 12',
    nombre: 'Activos Fijos y Depreciación de Equipos Clínicos',
    release: 'v1.4.0',
    estado: 'PLANIFICADO',
    lenguaje: 'JavaScript (Node.js & React)',
    frameworks: 'Knex.js, Fórmulas de vida útil',
    baseDatos: 'MariaDB 13 (siscon_db)',
    tablas: 'activos_fijos, historico_depreciaciones',
    resumen:
      'Fichas de equipos médicos de alta tecnología, depreciación mensual automática en línea recta y asiento contable al cierre.',
  },
]

export default function ImprimirFases() {
  const { data: empresa } = useEmpresa()
  const { data: usuario } = useSesion()

  useEffect(() => {
    document.title = 'Arquitectura y Fases del Sistema · SISCON-CECIAMB'
  }, [])

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      {/* Barra superior de acciones (oculta al imprimir) */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3 shadow-xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <Icono nombre="imprimir" className="size-4 text-blue-700" />
          Vista Previa de Impresión / Guardar PDF
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors"
          >
            <Icono nombre="descargar" className="size-3.5" />
            Imprimir o Guardar como PDF
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Contenedor del documento tamaño Carta / A4 */}
      <article className="mx-auto max-w-[216mm] p-8 text-[11px] leading-snug print:p-0">
        {/* Encabezado Institucional */}
        <header className="flex items-start justify-between gap-6 border-b-2 border-gray-900 pb-4">
          <div className="flex items-center gap-4">
            {empresa?.tieneLogo && (
              <img
                src={`/api/v1/empresa/logo?v=${encodeURIComponent(empresa.actualizadoEn)}`}
                alt="Logo Institucional"
                className="h-16 w-auto max-w-[45mm] object-contain"
              />
            )}
            <div>
              <h1 className="text-[16px] font-bold text-gray-950">
                {empresa?.razonSocial || 'HOSPITAL DE CLÍNICAS CECIAMB, C.A.'}
              </h1>
              <p className="text-[12px] font-semibold text-gray-700">
                {empresa?.rif ? `RIF ${empresa.rif}` : 'Sistema Contable SISCON-CECIAMB'}
              </p>
              <p className="text-[10px] text-gray-500">
                {empresa?.direccion || 'Puerto Ordaz, Estado Bolívar, Venezuela'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-900 border border-blue-200">
              DOCUMENTO TÉCNICO OFICIAL
            </span>
            <p className="mt-1 text-[13px] font-bold text-gray-950">
              Arquitectura y Fases del Sistema
            </p>
            <p className="text-[10px] text-gray-500">
              Versión: v0.7.0 (Hacia v1.0.0 en producción)
            </p>
          </div>
        </header>

        {/* Resumen del Stack y Métricas */}
        <section className="mt-4 grid grid-cols-4 gap-3 border border-gray-200 bg-gray-50/60 p-3 rounded-lg text-center">
          <div className="border-r border-gray-200 pr-2">
            <span className="block text-[9px] font-bold uppercase text-gray-500">Progreso Global</span>
            <span className="text-[14px] font-black text-emerald-700">9 de 14 Fases (64%)</span>
          </div>
          <div className="border-r border-gray-200 pr-2">
            <span className="block text-[9px] font-bold uppercase text-gray-500">Capa Frontend</span>
            <span className="text-[11px] font-bold text-gray-800">React 19 · Vite 6 · Tailwind 4</span>
          </div>
          <div className="border-r border-gray-200 pr-2">
            <span className="block text-[9px] font-bold uppercase text-gray-500">Capa Backend</span>
            <span className="text-[11px] font-bold text-gray-800">Node.js 24 · Express 5 (ESM)</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase text-gray-500">Base de Datos</span>
            <span className="text-[11px] font-bold text-gray-800">MariaDB 13 (InnoDB ACID)</span>
          </div>
        </section>

        {/* Diagrama Conceptual de Capas */}
        <section className="mt-5 border border-gray-900 rounded-lg p-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-950 border-b border-gray-300 pb-1 mb-2">
            1. Diagrama de Arquitectura de Tres Capas
          </h2>
          <div className="grid grid-cols-3 gap-3 text-[10px]">
            <div className="rounded border border-gray-300 bg-blue-50/40 p-2 text-center">
              <span className="font-bold text-blue-900 block text-[11px]">CAPA 1: CLIENTE SPA</span>
              <span className="text-gray-600 block mt-0.5">Navegador Web (:5173 / Red Local)</span>
              <p className="mt-1 text-gray-800 text-[9px]">
                React 19 + Tailwind CSS 4 · TanStack Query · Validación cliente y navegación interactiva.
              </p>
            </div>
            <div className="rounded border border-gray-300 bg-emerald-50/40 p-2 text-center">
              <span className="font-bold text-emerald-900 block text-[11px]">CAPA 2: SERVIDOR REST</span>
              <span className="text-gray-600 block mt-0.5">Node.js 24 + Express 5 (:4000)</span>
              <p className="mt-1 text-gray-800 text-[9px]">
                API RESTful · Knex.js · Validación Zod · JWT httpOnly · Auditoría inmutable en bitácora.
              </p>
            </div>
            <div className="rounded border border-gray-300 bg-amber-50/40 p-2 text-center">
              <span className="font-bold text-amber-900 block text-[11px]">CAPA 3: BASE DE DATOS</span>
              <span className="text-gray-600 block mt-0.5">MariaDB Server 13 (:3306)</span>
              <p className="mt-1 text-gray-800 text-[9px]">
                Esquemas siscon_db y conta2024 · Transacciones ACID · Triggers de inmutabilidad · Bloqueo pesimista.
              </p>
            </div>
          </div>
        </section>

        {/* Tabla Detallada Fase a Fase */}
        <section className="mt-5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-950 mb-2">
            2. Matriz Cronológica Fase a Fase (Lenguaje, Base de Datos y Alcance)
          </h2>

          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-y-2 border-gray-950 bg-gray-100 text-left font-bold text-gray-900">
                <th className="py-1.5 px-2 w-[14%]">Fase / Versión</th>
                <th className="py-1.5 px-2 w-[22%]">Módulo Funcional</th>
                <th className="py-1.5 px-2 w-[18%]">Lenguaje / Stack</th>
                <th className="py-1.5 px-2 w-[20%]">Base de Datos (MariaDB)</th>
                <th className="py-1.5 px-2 w-[14%] text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {FASES.map((f, i) => (
                <tr key={i} className="align-top break-inside-avoid">
                  <td className="py-1.5 px-2 font-bold whitespace-nowrap">
                    <div>{f.numero}</div>
                    <div className="text-[9px] font-normal text-gray-500">{f.release}</div>
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="font-semibold text-gray-950">{f.nombre}</div>
                    <div className="text-[9px] text-gray-600 leading-tight mt-0.5">{f.resumen}</div>
                  </td>
                  <td className="py-1.5 px-2 text-[9px] text-gray-800">
                    <div className="font-medium">{f.lenguaje}</div>
                    <div className="text-gray-500">{f.frameworks}</div>
                  </td>
                  <td className="py-1.5 px-2 text-[9px] font-mono text-gray-800">
                    <div className="font-bold text-gray-900">{f.baseDatos}</div>
                    <div className="text-gray-600 text-[8.5px] truncate">{f.tablas}</div>
                  </td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase ${
                        f.estado === 'COMPLETADO'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : f.estado.includes('EN CURSO')
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}
                    >
                      {f.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Pie de Documento */}
        <footer className="mt-8 border-t border-gray-300 pt-3 text-[9px] text-gray-500 flex justify-between items-center">
          <div>
            Emitido el {formatoFechaHoraCaracas(ahoraUtc())} por {nombreCompleto(usuario) || 'Administrador'} · SISCON-CECIAMB
          </div>
          <div>Hospital de Clínicas CECIAMB · Control Contable Integral</div>
        </footer>
      </article>
    </div>
  )
}
