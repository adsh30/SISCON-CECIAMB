import { AppError } from '../../middlewares/errorHandler.js'
import { sumar } from '../../utils/money.js'
import * as comp from '../comprobantes/comprobantes.service.js'
import { MAX_FILAS } from './importaciones.schema.js'
import { parsearCsv, parsearMonto } from './importaciones.csv.js'
import * as repo from './importaciones.repository.js'

const esCero = (m) => /^0+(\.0+)?$/.test(m)
const invalido = (mensaje, details) => new AppError(400, 'ARCHIVO_INVALIDO', mensaje, details)

/**
 * Ubica en el plan de cuentas y los centros de costo lo que dice el archivo.
 * Cada fila vuelve con su error (si lo tiene), sin lanzar: el borrador solo se
 * arma cuando todas las filas están sanas.
 */
export async function analizar(filas) {
  if (filas.length > MAX_FILAS) {
    throw invalido(`El archivo tiene ${filas.length} filas: el máximo es ${MAX_FILAS}`)
  }
  const codigosCuenta = [...new Set(filas.map((f) => f.cuenta).filter(Boolean))]
  const codigosCentro = [...new Set(filas.map((f) => f.centro).filter(Boolean))]
  const [cuentas, centros] = await Promise.all([
    codigosCuenta.length ? repo.cuentasPorCodigo(codigosCuenta) : [],
    codigosCentro.length ? repo.centrosPorCodigo(codigosCentro) : [],
  ])
  const porCodigoCuenta = new Map(cuentas.map((c) => [c.codigo, c]))
  const porCodigoCentro = new Map(centros.map((c) => [c.codigo, c]))

  const resultado = filas.map((f) => {
    const fila = {
      linea: f.linea,
      cuentaCodigo: f.cuenta || null,
      cuentaId: null,
      cuentaNombre: null,
      centroCodigo: f.centro || null,
      centroId: null,
      descripcion: f.descripcion || null,
      referencia: f.referencia || null,
      debe: '0',
      haber: '0',
      error: null,
    }

    const cu = f.cuenta ? porCodigoCuenta.get(f.cuenta) : null
    if (!f.cuenta) fila.error = 'Falta el código de la cuenta'
    else if (!cu) fila.error = `La cuenta ${f.cuenta} no existe en el plan de cuentas`
    else if (!cu.es_movimiento) {
      fila.error = `${cu.codigo} ${cu.nombre} es una cuenta de grupo: use una cuenta de movimiento`
    } else if (!cu.activa) fila.error = `La cuenta ${cu.codigo} ${cu.nombre} está inactiva`
    else {
      fila.cuentaId = cu.id
      fila.cuentaNombre = cu.nombre
    }

    if (f.centro) {
      const cc = porCodigoCentro.get(f.centro)
      if (!cc) fila.error ??= `El centro de costo ${f.centro} no existe`
      else if (!cc.activo) fila.error ??= `El centro de costo ${cc.codigo} está inactivo`
      else fila.centroId = cc.id
    }

    const debe = parsearMonto(f.debe)
    const haber = parsearMonto(f.haber)
    if (debe === null || haber === null) {
      fila.error ??= 'Monto inválido: use números con coma o punto decimal, como 1.234,56'
    } else if (!esCero(debe) && !esCero(haber)) {
      fila.error ??= 'Lleve el monto en Debe o en Haber, no en los dos'
    } else if (esCero(debe) && esCero(haber)) {
      fila.error ??= 'La fila no tiene monto en Debe ni en Haber'
    } else {
      fila.debe = debe
      fila.haber = haber
    }
    return fila
  })

  const sanas = resultado.filter((r) => !r.error)
  const totales = {
    debe: sumar('0', ...sanas.map((r) => r.debe)),
    haber: sumar('0', ...sanas.map((r) => r.haber)),
  }
  return { filas: resultado, totales, conErrores: resultado.length - sanas.length }
}

/** Análisis del texto del archivo: cabecera del CSV + validación fila por fila */
export async function previsualizar(textoCsv) {
  const { filas } = parsearCsv(textoCsv)
  const { filas: resultado, totales, conErrores } = await analizar(filas)
  return {
    filas: resultado,
    totales,
    conErrores,
    cuadrado: totales.debe === totales.haber && !esCero(totales.debe),
  }
}

/**
 * Arma el borrador con el archivo y delega en comprobantes: así la importación
 * respeta las mismas reglas (período abierto, cuentas de movimiento, bitácora).
 */
export async function crearBorrador(datos, actor, ctx) {
  const { filas } = parsearCsv(datos.csv)
  const { filas: resultado } = await analizar(filas)
  const conError = resultado.filter((r) => r.error)
  if (conError.length) {
    throw invalido(
      `El archivo tiene ${conError.length} fila(s) con errores: corríjalos en el resumen e importe de nuevo`,
      conError.slice(0, 20).map((r) => ({ campo: `fila ${r.linea}`, mensaje: r.error })),
    )
  }

  return comp.crear(
    {
      tipoId: datos.tipoId,
      fecha: datos.fecha,
      concepto: datos.concepto,
      referencia: datos.referencia,
      beneficiario: datos.beneficiario,
      renglones: resultado.map((r) => ({
        cuentaId: r.cuentaId,
        centroCostoId: r.centroId,
        descripcion: r.descripcion,
        debe: r.debe,
        haber: r.haber,
        referencia: r.referencia,
      })),
    },
    actor,
    ctx,
  )
}
