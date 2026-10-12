// Libros en Excel (RF-06.4): encabezado de la empresa, filtros, fecha de emisión y usuario.
// Los montos van como números con formato contable para que se puedan sumar y filtrar.
import writeExcelFile from 'write-excel-file/node'
import { fechaVE } from '../periodos/periodos.fechas.js'

const FORMATO_MONTO = '#,##0.00;-#,##0.00'
const GRIS = '#F3F4F6'
const AZUL = '#E0E7FF'

// Todo el sistema se ve en MAYÚSCULAS: el Excel también
const may = (v) => (v == null || v === '' ? null : String(v).toLocaleUpperCase('es-VE'))
const monto = (v, extra = {}) => ({
  value: Number(v),
  type: Number,
  format: FORMATO_MONTO,
  ...extra,
})
const montoOVacio = (v) => (Number(v) === 0 ? null : monto(v))
const negrita = (value, extra = {}) => ({ value: may(value), fontWeight: 'bold', ...extra })
/** Celda combinada: las que cubre van vacías en la fila */
const unir = (celda, columnas) => [
  { ...celda, columnSpan: columnas },
  ...Array(columnas - 1).fill(null),
]

/** Fecha y hora actuales de Caracas */
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

function filasEncabezado(titulo, cab, filtros, columnas) {
  const lineaFiltros = [
    `Desde ${fechaVE(filtros.desde)} hasta ${fechaVE(filtros.hasta)}`,
    filtros.cuentaDesde || filtros.cuentaHasta
      ? `Cuentas ${filtros.cuentaDesde ?? 'desde el inicio'} a ${filtros.cuentaHasta ?? 'el final'}`
      : null,
    cab.tipo ? `Tipo: ${cab.tipo.codigo} ${cab.tipo.nombre}` : null,
    cab.centro ? `Centro de costo: ${cab.centro.codigo} ${cab.centro.nombre}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return [
    unir(negrita(cab.razonSocial, { fontSize: 14 }), columnas),
    unir({ value: cab.rif ? `RIF ${cab.rif}` : null }, columnas),
    unir(negrita(titulo, { fontSize: 12 }), columnas),
    unir({ value: may(lineaFiltros) }, columnas),
    unir({ value: may(`Emitido el ${emitido()} por ${cab.usuario}`) }, columnas),
    [],
  ]
}

/** Fila de títulos; las últimas `montos` columnas van alineadas a la derecha */
const cabecera = (titulos, montos) =>
  titulos.map((t, i) =>
    negrita(t, {
      backgroundColor: GRIS,
      bottomBorderStyle: 'thin',
      align: i >= titulos.length - montos ? 'right' : 'left',
    }),
  )

const FILAS_FIJAS = 7 // encabezado + títulos: quedan fijos al desplazarse

export function diarioExcel({ data, meta }, filtros, cab) {
  const titulos = [
    'Fecha',
    'Comprobante',
    'Cuenta',
    'Nombre de la cuenta',
    'Descripción',
    'C. costo',
    'Debe',
    'Haber',
  ]
  const filas = [
    ...filasEncabezado('Libro Diario', cab, filtros, titulos.length),
    cabecera(titulos, 2),
  ]

  for (const c of data) {
    const resaltado = { backgroundColor: AZUL }
    filas.push([
      negrita(fechaVE(c.fecha), resaltado),
      negrita(c.codigo, resaltado),
      ...unir(negrita(c.concepto, resaltado), 6),
    ])
    for (const r of c.renglones) {
      filas.push([
        fechaVE(c.fecha),
        c.codigo,
        r.cuentaCodigo,
        may(r.cuentaNombre),
        may(r.descripcion),
        r.centroCodigo,
        montoOVacio(r.debe),
        montoOVacio(r.haber),
      ])
    }
  }
  filas.push([])
  filas.push([
    ...unir(
      negrita(`Totales: ${meta.total} comprobantes, ${meta.totales.renglones} renglones`, {
        align: 'right',
      }),
      6,
    ),
    monto(meta.totales.debe, { fontWeight: 'bold' }),
    monto(meta.totales.haber, { fontWeight: 'bold' }),
  ])

  return writeExcelFile(filas, {
    sheet: 'Libro Diario',
    columns: [12, 18, 16, 36, 36, 10, 16, 16].map((width) => ({ width })),
    stickyRowsCount: FILAS_FIJAS,
  }).toBuffer()
}

export function mayorExcel({ data, meta }, filtros, cab) {
  const titulos = [
    'Fecha',
    'Comprobante',
    'Concepto',
    'Descripción',
    'C. costo',
    'Debe',
    'Haber',
    'Saldo',
  ]
  const filas = [
    ...filasEncabezado('Libro Mayor', cab, filtros, titulos.length),
    cabecera(titulos, 3),
  ]

  for (const c of data) {
    const resaltado = { backgroundColor: AZUL }
    filas.push([
      ...unir(negrita(`${c.cuenta.codigo} — ${c.cuenta.nombre}`, resaltado), 6),
      ...unir(negrita(`Naturaleza ${c.cuenta.naturaleza}`, { ...resaltado, align: 'right' }), 2),
    ])
    filas.push([
      ...unir(negrita('Saldo anterior', { align: 'right' }), 7),
      monto(c.saldoAnterior, { fontWeight: 'bold' }),
    ])
    for (const m of c.movimientos) {
      filas.push([
        fechaVE(m.fecha),
        m.comprobante,
        may(m.concepto),
        may(m.descripcion),
        m.centroCodigo,
        montoOVacio(m.debe),
        montoOVacio(m.haber),
        monto(m.saldo),
      ])
    }
    filas.push([
      ...unir(negrita('Totales y saldo final', { align: 'right' }), 5),
      monto(c.totalDebe, { fontWeight: 'bold' }),
      monto(c.totalHaber, { fontWeight: 'bold' }),
      monto(c.saldoFinal, { fontWeight: 'bold' }),
    ])
    filas.push([])
  }
  filas.push([
    ...unir(
      negrita(`Totales generales: ${meta.total} cuentas, ${meta.totales.renglones} movimientos`, {
        align: 'right',
      }),
      5,
    ),
    monto(meta.totales.debe, { fontWeight: 'bold' }),
    monto(meta.totales.haber, { fontWeight: 'bold' }),
    null,
  ])

  return writeExcelFile(filas, {
    sheet: 'Libro Mayor',
    columns: [12, 18, 36, 36, 10, 16, 16, 16].map((width) => ({ width })),
    stickyRowsCount: FILAS_FIJAS,
  }).toBuffer()
}
