import writeExcelFile from 'write-excel-file/node'
import { fechaVE } from '../periodos/periodos.fechas.js'

const FORMATO_MONTO = '#,##0.00;-#,##0.00'
const GRIS = '#F3F4F6'
const AZUL = '#E0E7FF'

const may = (v) => (v == null || v === '' ? null : String(v).toLocaleUpperCase('es-VE'))
const monto = (v, extra = {}) => ({
  value: Number(v),
  type: Number,
  format: FORMATO_MONTO,
  ...extra,
})
const montoOVacio = (v) => (Number(v) === 0 ? null : monto(v))
const negrita = (value, extra = {}) => ({ value: may(value), fontWeight: 'bold', ...extra })
const unir = (celda, columnas) => [
  { ...celda, columnSpan: columnas },
  ...Array(columnas - 1).fill(null),
]

function emitido() {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())
}

export async function exportarDetallesExcel({ filas, totales, filtros, empresa, usuario }) {
  const COLUMNAS = 10

  const lineaFiltros = [
    filtros.desde && filtros.hasta
      ? `Desde ${fechaVE(filtros.desde)} hasta ${fechaVE(filtros.hasta)}`
      : filtros.desde
        ? `Desde ${fechaVE(filtros.desde)}`
        : filtros.hasta
          ? `Hasta ${fechaVE(filtros.hasta)}`
          : null,
    filtros.criterio && filtros.busqueda
      ? `Filtro (${filtros.criterio}): "${filtros.busqueda}"`
      : filtros.busqueda
        ? `Búsqueda: "${filtros.busqueda}"`
        : null,
    filtros.estado ? `Estado: ${filtros.estado}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const cabecera = [
    unir(negrita(empresa?.razonSocial || 'SISCON-CECIAMB', { fontSize: 14 }), COLUMNAS),
    unir({ value: empresa?.rif ? `RIF ${empresa.rif}` : null }, COLUMNAS),
    unir(negrita('CONSULTA DE DETALLES DE COMPROBANTES', { fontSize: 12 }), COLUMNAS),
    unir({ value: may(lineaFiltros || 'Todos los registros') }, COLUMNAS),
    unir({ value: may(`Emitido el ${emitido()} por ${usuario}`) }, COLUMNAS),
    [],
  ]

  const titulos = [
    negrita('COMPROBANTE', { backgroundColor: AZUL }),
    negrita('FECHA', { backgroundColor: AZUL }),
    negrita('TIPO', { backgroundColor: AZUL }),
    negrita('CÓDIGO', { backgroundColor: AZUL }),
    negrita('CUENTA', { backgroundColor: AZUL }),
    negrita('N° DOC', { backgroundColor: AZUL }),
    negrita('DETALLE / CONCEPTO', { backgroundColor: AZUL }),
    negrita('CENTRO COSTO', { backgroundColor: AZUL }),
    negrita('DEBE (BS.)', { backgroundColor: AZUL, align: 'right' }),
    negrita('HABER (BS.)', { backgroundColor: AZUL, align: 'right' }),
  ]

  const filasDatos = filas.map((r) => [
    { value: r.comprobante_codigo || String(r.comprobante_numero || '') },
    { value: r.comprobante_fecha ? fechaVE(r.comprobante_fecha) : '' },
    { value: r.tipo_codigo || '' },
    { value: r.cuenta_codigo || '' },
    { value: may(r.cuenta_nombre || '') },
    { value: r.referencia || '' },
    { value: may(r.descripcion || r.comprobante_concepto || '') },
    { value: r.centro_codigo ? `${r.centro_codigo} · ${r.centro_nombre || ''}` : '' },
    montoOVacio(r.debe),
    montoOVacio(r.haber),
  ])

  const totalDebe = totales?.totalDebe ?? filas.reduce((a, f) => a + Number(f.debe || 0), 0)
  const totalHaber = totales?.totalHaber ?? filas.reduce((a, f) => a + Number(f.haber || 0), 0)

  const filaTotales = [
    negrita('TOTALES', { backgroundColor: GRIS }),
    ...Array(7).fill({ backgroundColor: GRIS }),
    monto(totalDebe, { fontWeight: 'bold', backgroundColor: GRIS }),
    monto(totalHaber, { fontWeight: 'bold', backgroundColor: GRIS }),
  ]

  const data = [...cabecera, titulos, ...filasDatos, [], filaTotales]

  const columns = [
    { width: 16 }, // Comprobante
    { width: 13 }, // Fecha
    { width: 10 }, // Tipo
    { width: 16 }, // Código
    { width: 34 }, // Cuenta
    { width: 16 }, // N° Doc
    { width: 38 }, // Detalle
    { width: 22 }, // Centro
    { width: 18 }, // Debe
    { width: 18 }, // Haber
  ]

  return writeExcelFile(data, {
    columns,
    sheet: 'Detalles de Comprobantes',
  }).toBuffer()
}
