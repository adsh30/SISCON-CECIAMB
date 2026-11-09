// Diferencial cambiario al cierre de cada período (VEN-NIF / NIC 21).
// Cada auxiliar en divisas se reexpresa a la tasa del último día del período:
//   saldo ajustado = saldo en divisa × tasa;  diferencia = saldo ajustado − saldo en bolívares
// La diferencia se registra en un comprobante DIF aprobado, contra la cuenta de ganancia
// (si el saldo en bolívares sube) o de pérdida cambiaria (si baja). Como el cálculo parte
// de los saldos ya contabilizados, cerrar de nuevo un período reabierto solo registra lo nuevo.

import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { aEscalado, multiplicar, restar, sumar } from '../../utils/money.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import * as comprobantesRepo from '../comprobantes/comprobantes.repository.js'
import { TIPO_DIFERENCIAL } from '../comprobantes/comprobantes.schema.js'
import { fechaVE, nombrePeriodo } from '../periodos/periodos.fechas.js'
import * as repo from './diferencial.repository.js'

/** De dónde sale la tasa de cada divisa */
export const FUENTE_TASA = { USD: 'BCV', EUR: 'BCV', USDT: 'BINANCE' }

const TIPOS_GANANCIA = ['INGRESO']
const TIPOS_PERDIDA = ['GASTO', 'COSTO']

const conflicto = (code, message) => new AppError(409, code, message)
const invalido = (code, message) => new AppError(400, code, message)

/** '1.234,56' para los textos de los renglones */
const legible = (m, decimales = 2) => {
  const [ent, dec = ''] = String(m).replace('-', '').split('.')
  const signo = String(m).startsWith('-') ? '-' : ''
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${signo}${miles}${decimales ? `,${dec.padEnd(decimales, '0').slice(0, decimales)}` : ''}`
}

function cuentaConfigurada(fila, alias, tiposValidos) {
  const id = fila?.[`${alias}_id`]
  if (!id) return null
  const c = {
    id,
    codigo: fila[`${alias}_codigo`],
    nombre: fila[`${alias}_nombre`],
    tipo: fila[`${alias}_tipo`],
  }
  const valida =
    !!fila[`${alias}_es_movimiento`] &&
    !!fila[`${alias}_activa`] &&
    !fila[`${alias}_moneda`] &&
    tiposValidos.includes(c.tipo)
  return { ...c, valida }
}

export async function obtenerConfiguracion(trx = db) {
  const fila = await repo.configuracion(trx)
  return {
    ganancia: cuentaConfigurada(fila, 'g', TIPOS_GANANCIA),
    perdida: cuentaConfigurada(fila, 'p', TIPOS_PERDIDA),
  }
}

/**
 * Calcula el diferencial de un período (fila de `periodos`) con los saldos aprobados hasta su
 * último día. No escribe nada.
 */
export async function calcular(periodo, trx = db) {
  const fecha = periodo.fecha_fin
  const [cuentas, configuracion] = await Promise.all([
    repo.cuentasEnDivisa(trx),
    obtenerConfiguracion(trx),
  ])
  const saldos = cuentas.length
    ? new Map(
        (
          await repo.saldos(
            cuentas.map((c) => c.id),
            fecha,
            trx,
          )
        ).map((s) => [s.cuenta_id, s]),
      )
    : new Map()

  const tasas = {}
  for (const moneda of new Set(cuentas.map((c) => c.moneda))) {
    tasas[moneda] = await repo.tasaAl(moneda, FUENTE_TASA[moneda], fecha, trx)
  }

  const problemas = []
  const sinTasa = new Set()
  const filas = []
  for (const c of cuentas) {
    const s = saldos.get(c.id)
    if (!s) continue
    const saldoBs = sumar(s.saldo_bs)
    const saldoDivisa = sumar(s.saldo_divisa)
    if (saldoBs === '0.00' && saldoDivisa === '0.00') continue

    const t = tasas[c.moneda]
    const fila = {
      cuenta: {
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        moneda: c.moneda,
        grupo: c.grupo_codigo ? { codigo: c.grupo_codigo, nombre: c.grupo_nombre } : null,
      },
      saldoDivisa,
      saldoBs,
      fuente: FUENTE_TASA[c.moneda],
      tasa: t?.tasa ?? null,
      fechaTasa: t?.fecha ?? null,
      saldoAjustado: null,
      diferencia: null,
    }
    if (t) {
      fila.saldoAjustado = multiplicar(saldoDivisa, t.tasa)
      fila.diferencia = restar(fila.saldoAjustado, saldoBs)
    } else if (!sinTasa.has(c.moneda)) {
      sinTasa.add(c.moneda)
      problemas.push({
        codigo: 'SIN_TASA',
        mensaje: `No hay tasa ${FUENTE_TASA[c.moneda]} de ${c.moneda} registrada hasta el ${fechaVE(fecha)}`,
      })
    }
    filas.push(fila)
  }

  const positivas = filas.filter((f) => f.diferencia && aEscalado(f.diferencia) > 0n)
  const negativas = filas.filter((f) => f.diferencia && aEscalado(f.diferencia) < 0n)
  const ganancia = sumar('0', ...positivas.map((f) => f.diferencia))
  const perdida = sumar('0', ...negativas.map((f) => f.diferencia.slice(1)))

  if (positivas.length && !configuracion.ganancia?.valida) {
    problemas.push({
      codigo: 'SIN_CUENTA_GANANCIA',
      mensaje:
        'Falta una cuenta de ganancia cambiaria válida (de ingreso, de movimiento y activa) en Empresa → Diferencial cambiario',
    })
  }
  if (negativas.length && !configuracion.perdida?.valida) {
    problemas.push({
      codigo: 'SIN_CUENTA_PERDIDA',
      mensaje:
        'Falta una cuenta de pérdida cambiaria válida (de gasto o costo, de movimiento y activa) en Empresa → Diferencial cambiario',
    })
  }

  return {
    periodo: { id: periodo.id, nombre: nombrePeriodo(periodo), estado: periodo.estado },
    fecha,
    cuentas: filas,
    totales: { ganancia, perdida, neto: restar(ganancia, perdida) },
    configuracion,
    problemas,
  }
}

/** Vista previa para la pantalla de cierre */
export async function vistaPrevia(periodoId) {
  const periodo = await db('periodos').where({ id: periodoId }).first()
  if (!periodo) throw new AppError(404, 'NO_ENCONTRADO', 'El período no existe')
  return calcular(periodo)
}

const descripcionRenglon = (f) =>
  `${f.cuenta.moneda} ${legible(f.saldoDivisa)} × ${legible(f.tasa, 4)} (${f.fuente} ${fechaVE(f.fechaTasa)})`.slice(
    0,
    255,
  )

/**
 * Registra el comprobante DIF del período dentro de la transacción del cierre.
 * Devuelve { id, codigo, ganancia, perdida } o null si no hay diferencias.
 */
export async function generar(periodo, actor, ctx, trx) {
  const r = await calcular(periodo, trx)
  if (r.problemas.length) {
    throw conflicto(
      r.problemas[0].codigo,
      `No se puede registrar el diferencial cambiario: ${r.problemas.map((p) => p.mensaje).join('. ')}`,
    )
  }
  const conDiferencia = r.cuentas.filter((f) => aEscalado(f.diferencia) !== 0n)
  if (!conDiferencia.length) return null

  const tipo = await repo.tipoDiferencial(TIPO_DIFERENCIAL, trx)
  if (!tipo) {
    throw conflicto('SIN_TIPO_DIF', 'Falta el tipo de comprobante DIF (Diferencial cambiario)')
  }

  const { ganancia, perdida } = r.configuracion
  const renglones = conDiferencia.flatMap((f) => {
    const descripcion = descripcionRenglon(f)
    const sube = aEscalado(f.diferencia) > 0n
    const monto = sube ? f.diferencia : f.diferencia.slice(1)
    const cuenta = { cuentaId: f.cuenta.id, descripcion }
    const contra = {
      cuentaId: sube ? ganancia.id : perdida.id,
      descripcion: `${f.cuenta.codigo} · ${descripcion}`.slice(0, 255),
    }
    return sube
      ? [
          { ...cuenta, debe: monto, haber: '0' },
          { ...contra, debe: '0', haber: monto },
        ]
      : [
          { ...contra, debe: monto, haber: '0' },
          { ...cuenta, debe: '0', haber: monto },
        ]
  })
  const total = sumar('0', ...renglones.map((x) => x.debe))
  const nombre = nombrePeriodo(periodo)

  // Nace en borrador (los renglones solo se insertan en borradores) y se aprueba enseguida
  const [id] = await trx('comprobantes').insert({
    tipo_id: tipo.id,
    periodo_id: periodo.id,
    fecha: r.fecha,
    concepto: `Diferencial cambiario al cierre de ${nombre} (generado al cerrar el período)`,
    referencia: `Cierre ${nombre}`.slice(0, 60),
    total_debe: total,
    total_haber: total,
    creado_por: actor.id,
    actualizado_por: actor.id,
  })
  await comprobantesRepo.reemplazarRenglones(id, renglones, trx)
  const numero = await comprobantesRepo.siguienteNumero(tipo.id, periodo.id, trx)
  const codigo = `${tipo.codigo}-${periodo.anio}-${String(periodo.mes).padStart(2, '0')}-${String(numero).padStart(4, '0')}`
  await trx('comprobantes').where({ id }).update({
    estado: 'APROBADO',
    numero,
    codigo,
    aprobado_por: actor.id,
    aprobado_en: trx.fn.now(),
  })

  const filas = await comprobantesRepo.renglones(id, trx)
  const instantanea = {
    numero: codigo,
    tipo: tipo.codigo,
    fecha: fechaVE(r.fecha),
    concepto: `Diferencial cambiario al cierre de ${nombre}`,
    estado: 'APROBADO',
    totalDebe: total,
    totalHaber: total,
    ganancia: r.totales.ganancia,
    perdida: r.totales.perdida,
    renglones: filas.map((x) => ({
      cuenta: x.cuenta_codigo,
      debe: x.debe,
      haber: x.haber,
      descripcion: x.descripcion,
    })),
  }
  for (const accion of [ACCIONES.CREAR, ACCIONES.APROBAR]) {
    await registrar(trx, {
      usuarioId: actor.id,
      accion,
      entidad: 'comprobantes',
      entidadId: id,
      despues: instantanea,
      ctx,
    })
  }
  return { id, codigo, ganancia: r.totales.ganancia, perdida: r.totales.perdida }
}

/** Cuentas de ganancia y pérdida cambiaria (Empresa → Diferencial cambiario) */
export async function guardarConfiguracion({ cuentaGananciaId, cuentaPerdidaId }, actor, ctx) {
  return db.transaction(async (trx) => {
    const revisar = async (id, tipos, rol) => {
      if (!id) return null
      const c = await repo.cuentaPorId(id, trx)
      if (!c) throw invalido('CUENTA_INVALIDA', `La cuenta de ${rol} no existe`)
      const nombre = `${c.codigo} ${c.nombre}`
      if (!c.es_movimiento)
        throw invalido('CUENTA_DE_GRUPO', `${nombre} es una cuenta de grupo; elija un auxiliar`)
      if (!c.activa) throw invalido('CUENTA_INACTIVA', `${nombre} está inactiva`)
      if (c.moneda)
        throw invalido(
          'CUENTA_EN_DIVISA',
          `${nombre} se lleva en ${c.moneda}; la de ${rol} va en bolívares`,
        )
      if (!tipos.includes(c.tipo)) {
        throw invalido(
          'TIPO_INVALIDO',
          rol === 'ganancia'
            ? `La ganancia cambiaria va en una cuenta de ingreso; ${nombre} es de ${c.tipo.toLowerCase()}`
            : `La pérdida cambiaria va en una cuenta de gasto o costo; ${nombre} es de ${c.tipo.toLowerCase()}`,
        )
      }
      return c.id
    }
    const antes = await obtenerConfiguracion(trx)
    const g = await revisar(cuentaGananciaId, TIPOS_GANANCIA, 'ganancia')
    const p = await revisar(cuentaPerdidaId, TIPOS_PERDIDA, 'pérdida')
    await repo.guardarConfiguracion(g, p, actor.id, trx)
    const despues = await obtenerConfiguracion(trx)
    const resumen = (c) => (c ? `${c.codigo} ${c.nombre}` : null)
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.EDITAR,
      entidad: 'empresa',
      entidadId: 1,
      antes: {
        gananciaCambiaria: resumen(antes.ganancia),
        perdidaCambiaria: resumen(antes.perdida),
      },
      despues: {
        gananciaCambiaria: resumen(despues.ganancia),
        perdidaCambiaria: resumen(despues.perdida),
      },
      ctx,
    })
    return despues
  })
}
