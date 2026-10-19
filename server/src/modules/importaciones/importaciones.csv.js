// Lector del CSV del resumen (ventas, compras, honorarios o nómina). Sin dependencias:
// admite delimitador «;» (el que produce Excel en español) o «,», montos con coma decimal
// y columnas en cualquier orden. El encabezado se reconoce por nombre, no por posición.

import { AppError } from '../../middlewares/errorHandler.js'

const ALIAS = {
  cuenta: ['cuenta', 'codigo', 'codigo cuenta', 'cuenta contable', 'cod cuenta'],
  descripcion: ['descripcion', 'detalle', 'concepto', 'glosa'],
  debe: ['debe'],
  haber: ['haber'],
  centro: ['centro', 'centro de costo', 'centro_costo', 'cc'],
  referencia: ['referencia', 'ref', 'documento'],
}

const invalido = (mensaje) => new AppError(400, 'CSV_INVALIDO', mensaje)

/** Quita acentos y pasa a minúsculas para comparar encabezados */
const normalizar = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Divide una línea en campos respetando comillas dobles (y «""» como comilla literal) */
export function partirCampos(linea, delim) {
  const campos = []
  let campo = ''
  let entreComillas = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]
    if (entreComillas) {
      if (ch === '"') {
        if (linea[i + 1] === '"') {
          campo += '"'
          i++
        } else entreComillas = false
      } else campo += ch
    } else if (ch === '"') entreComillas = true
    else if (ch === delim) {
      campos.push(campo)
      campo = ''
    } else campo += ch
  }
  campos.push(campo)
  return campos.map((c) => c.trim())
}

/**
 * Monto del archivo a '1234.56': acepta 1.234,56 · 1234,56 · 1234.56 · 1500.
 * Vacío = '0' (sin monto en esa columna); null si no es un monto válido.
 */
export function parsearMonto(texto) {
  let s = String(texto ?? '')
    .replace(/bs\.?|\s/gi, '')
    .trim()
  if (!s) return '0'
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '')
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(s)) return null
  const [ent, dec = ''] = s.split('.')
  return `${BigInt(ent)}.${dec.padEnd(2, '0')}`
}

const detectarDelimitador = (encabezado) =>
  encabezado.includes(';') ? ';' : encabezado.includes(',') ? ',' : ';'

/**
 * Lee el texto del CSV y devuelve sus filas de datos con las columnas ya ubicadas.
 * Lanza un error con `code: 'CSV_INVALIDO'` si el archivo no tiene lo mínimo.
 */
export function parsearCsv(texto) {
  const lineas = String(texto)
    .replace(/^\uFEFF/, '') // Excel en Windows agrega un BOM al inicio
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
  if (lineas.length < 2) {
    throw invalido(
      'El archivo debe tener una fila de encabezado y al menos un renglón de datos. Descargue la plantilla como guía',
    )
  }
  const delim = detectarDelimitador(lineas[0])
  const encabezado = partirCampos(lineas[0], delim).map(normalizar)

  const columnas = {}
  for (const [campo, alias] of Object.entries(ALIAS)) {
    columnas[campo] = encabezado.findIndex((h) => alias.includes(h))
  }
  if (columnas.cuenta < 0) {
    throw invalido(
      'El encabezado del archivo debe incluir una columna «cuenta» con los códigos del plan de cuentas',
    )
  }
  if (columnas.debe < 0 && columnas.haber < 0) {
    throw invalido('El encabezado del archivo debe incluir las columnas «debe» y «haber»')
  }

  const filas = lineas.slice(1).map((linea, i) => {
    const campos = partirCampos(linea, delim)
    const valor = (nombre) => (columnas[nombre] >= 0 ? (campos[columnas[nombre]] ?? '') : '')
    return {
      linea: i + 2, // 1 es el encabezado
      cuenta: valor('cuenta'),
      descripcion: valor('descripcion'),
      debe: valor('debe'),
      haber: valor('haber'),
      centro: valor('centro'),
      referencia: valor('referencia'),
    }
  })
  return { filas }
}
