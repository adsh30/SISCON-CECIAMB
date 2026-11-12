// Plan de cuentas real del Hospital de Clínicas CECIAMB (exportado de Sparrow: plan-hcc.json,
// generado desde docs/plan de cuentas HCC.XLS) y sus saldos iniciales.
//
// Lo usan la migración que lo carga en cada instalación y el script npm run bd:plan-hcc.
// Recibe la conexión (knex o una transacción) para no abrir otra.

import { readFileSync } from 'node:fs'
import { aEscalado, dividir, sumar } from '../../utils/money.js'
import { fechaHoyVE } from '../../utils/fechas.js'

export const PLAN_HCC = JSON.parse(
  readFileSync(new URL('./plan-hcc.json', import.meta.url), 'utf8'),
)

/** El primer dígito del código da el tipo. En HCC, 7 = Otros ingresos y 8 = Otros egresos */
const TIPO_RAIZ = {
  1: 'ACTIVO',
  2: 'PASIVO',
  3: 'PATRIMONIO',
  4: 'INGRESO',
  5: 'COSTO',
  6: 'GASTO',
  7: 'INGRESO',
  8: 'GASTO',
}
const NATURALEZA = {
  ACTIVO: 'DEUDORA',
  PASIVO: 'ACREEDORA',
  PATRIMONIO: 'ACREEDORA',
  INGRESO: 'ACREEDORA',
  COSTO: 'DEUDORA',
  GASTO: 'DEUDORA',
}

/**
 * Cuentas reguladoras: su saldo va al lado contrario del de su grupo. Depreciaciones y
 * amortizaciones acumuladas (activo, acreedoras), descuentos y devoluciones en ventas
 * (ingreso, deudoras), descuentos y devoluciones en compras e inventario final (costo, acreedoras).
 */
export const esReguladora = (codigo) =>
  codigo.startsWith('1212') ||
  codigo.startsWith('42') ||
  codigo.startsWith('43') ||
  ['122102', '142102', '511104', '511105', '511107'].includes(codigo)

/** Cuentas de efectivo en divisas: se llevan en USD y se ajustan por diferencial cambiario */
export const CUENTAS_EN_DOLARES = ['111105', '111206', '111207', '111211', '111216', '111222']

/** Cuentas que el plan HCC no trae y el diferencial cambiario necesita */
export const CUENTAS_DIFERENCIAL = {
  ganancia: { codigo: '711108', nombre: 'GANANCIA EN DIFERENCIAL CAMBIARIO', padre: '7111' },
  perdida: { codigo: '811106', nombre: 'PERDIDA EN DIFERENCIAL CAMBIARIO', padre: '8111' },
}

const TIPO_APERTURA = {
  codigo: 'APE',
  nombre: 'Apertura',
  descripcion: 'Saldos iniciales de las cuentas al comenzar a usar el sistema',
  orden: 5,
}

/** Cuenta superior de cada código: el prefijo más largo que también es cuenta del plan */
function armarJerarquia(cuentas) {
  const codigos = new Set(cuentas.map((c) => c.codigo))
  const padreDe = new Map()
  for (const { codigo } of cuentas) {
    for (let largo = codigo.length - 1; largo >= 1; largo--) {
      if (codigos.has(codigo.slice(0, largo))) {
        padreDe.set(codigo, codigo.slice(0, largo))
        break
      }
    }
  }
  const conHijos = new Set(padreDe.values())
  return { padreDe, esHoja: (codigo) => !conHijos.has(codigo) }
}

/**
 * Carga el plan HCC. Retira el plan de ejemplo (códigos con puntos): borra las cuentas sin
 * movimientos y deja inactivas las que tienen alguno (los comprobantes aprobados no se tocan).
 * Si el plan ya está cargado no hace nada.
 */
export async function cargarPlanHcc(knex) {
  if (await knex('cuentas').where({ codigo: '111101' }).first('id')) return { cargado: false }

  // La configuración del diferencial apunta a cuentas del plan de ejemplo
  await knex('empresa')
    .where({ id: 1 })
    .update({ cuenta_ganancia_cambiaria_id: null, cuenta_perdida_cambiaria_id: null })

  let retiradas = 0
  let inactivas = 0
  const viejas = await knex('cuentas')
    .where('codigo', 'like', '%.%')
    .orderBy([{ column: 'nivel', order: 'desc' }, { column: 'codigo' }])
  for (const c of viejas) {
    const usada = await knex('comprobante_detalle').where({ cuenta_id: c.id }).first('id')
    const conHijos = await knex('cuentas').where({ padre_id: c.id }).first('id')
    if (!usada && !conHijos) {
      await knex('cuentas').where({ id: c.id }).del()
      retiradas++
    } else {
      await knex('cuentas').where({ id: c.id }).update({ activa: false })
      inactivas++
    }
  }

  const extras = Object.values(CUENTAS_DIFERENCIAL).map((c) => ({ ...c, nivel: 5 }))
  const cuentas = [...PLAN_HCC.cuentas, ...extras].sort(
    (a, b) => a.codigo.length - b.codigo.length || a.codigo.localeCompare(b.codigo),
  )
  const { padreDe, esHoja } = armarJerarquia(cuentas)
  const ids = new Map((await knex('cuentas').select('id', 'codigo')).map((c) => [c.codigo, c.id]))

  for (const c of cuentas) {
    const tipo = TIPO_RAIZ[c.codigo[0]]
    const natural = NATURALEZA[tipo]
    const fila = {
      nombre: c.nombre,
      tipo,
      naturaleza: esReguladora(c.codigo)
        ? natural === 'DEUDORA'
          ? 'ACREEDORA'
          : 'DEUDORA'
        : natural,
      nivel: c.nivel,
      padre_id: padreDe.has(c.codigo) ? ids.get(padreDe.get(c.codigo)) : null,
      es_movimiento: esHoja(c.codigo),
      activa: true,
      moneda: CUENTAS_EN_DOLARES.includes(c.codigo) ? 'USD' : null,
    }
    if (ids.has(c.codigo)) {
      // Raíces 1 a 6 del plan de ejemplo: se conservan (pueden tener subcuentas viejas)
      await knex('cuentas')
        .where({ id: ids.get(c.codigo) })
        .update({ ...fila, es_movimiento: false })
    } else {
      const [id] = await knex('cuentas').insert({ codigo: c.codigo, ...fila })
      ids.set(c.codigo, id)
    }
  }

  await knex('empresa')
    .where({ id: 1 })
    .update({
      cuenta_ganancia_cambiaria_id: ids.get(CUENTAS_DIFERENCIAL.ganancia.codigo),
      cuenta_perdida_cambiaria_id: ids.get(CUENTAS_DIFERENCIAL.perdida.codigo),
    })

  return { cargado: true, cuentas: cuentas.length, retiradas, inactivas }
}

/**
 * Fecha de la apertura: el inicio del ejercicio en curso si ese mes está abierto; si no, el
 * inicio del primer período abierto. null si no hay ninguno (falta crear el ejercicio).
 */
async function periodoDeApertura(knex, fecha) {
  if (fecha) {
    const p = await knex('periodos')
      .where('fecha_inicio', '<=', fecha)
      .where('fecha_fin', '>=', fecha)
      .first()
    return p?.estado === 'ABIERTO' ? { periodo: p, fecha } : null
  }
  const hoy = fechaHoyVE()
  const ejercicio = await knex('ejercicios')
    .where('fecha_inicio', '<=', hoy)
    .where('fecha_fin', '>=', hoy)
    .first()
  const desde = ejercicio?.fecha_inicio ?? '0000-01-01'
  const p =
    (await knex('periodos')
      .where({ estado: 'ABIERTO' })
      .where('fecha_inicio', '>=', desde)
      .orderBy('fecha_inicio')
      .first()) ??
    (await knex('periodos').where({ estado: 'ABIERTO' }).orderBy('fecha_inicio').first())
  return p ? { periodo: p, fecha: p.fecha_inicio } : null
}

/**
 * Registra los saldos iniciales del plan HCC como un comprobante de Apertura en BORRADOR:
 * se puede revisar, modificar o eliminar desde Comprobantes, y se aprueba cuando esté conforme.
 * En las cuentas en dólares el monto en USD se calcula con la tasa BCV de la fecha.
 * Devuelve { id, fecha } o null si ya existe una apertura o no hay período abierto.
 */
export async function crearAperturaHcc(knex, { fecha } = {}) {
  await knex('tipos_comprobante').insert(TIPO_APERTURA).onConflict('codigo').ignore()
  const tipo = await knex('tipos_comprobante').where({ codigo: TIPO_APERTURA.codigo }).first()
  if (await knex('comprobantes').where({ tipo_id: tipo.id }).first('id')) return null

  const destino = await periodoDeApertura(knex, fecha)
  if (!destino) return null

  const ids = new Map((await knex('cuentas').select('id', 'codigo')).map((c) => [c.codigo, c.id]))
  const tasaUsd = await knex('tasas_cambio')
    .where({ moneda: 'USD', fuente: 'BCV' })
    .where('fecha', '<=', destino.fecha)
    .orderBy('fecha', 'desc')
    .first('fecha', 'tasa')

  const renglones = PLAN_HCC.cuentas
    .filter((c) => aEscalado(c.debe) !== 0n || aEscalado(c.haber) !== 0n)
    .map((c) => {
      const enDolares = CUENTAS_EN_DOLARES.includes(c.codigo)
      const bs = aEscalado(c.debe) !== 0n ? c.debe : c.haber
      const usd = enDolares && tasaUsd ? dividir(bs, tasaUsd.tasa) : null
      return {
        cuenta_id: ids.get(c.codigo),
        descripcion: !enDolares
          ? 'Saldo inicial'
          : usd
            ? `Saldo inicial · USD calculado con la tasa BCV ${tasaUsd.tasa} del ${tasaUsd.fecha}: verifíquelo`
            : 'Saldo inicial · indique el monto en USD',
        debe: c.debe,
        haber: c.haber,
        monto_moneda: usd && aEscalado(usd) > 0n ? usd : null,
      }
    })
  if (renglones.some((r) => !r.cuenta_id)) {
    throw new Error('Plan HCC incompleto: cargue el plan antes de la apertura')
  }
  const totalDebe = sumar('0', ...renglones.map((r) => r.debe))
  const totalHaber = sumar('0', ...renglones.map((r) => r.haber))

  const [id] = await knex('comprobantes').insert({
    tipo_id: tipo.id,
    periodo_id: destino.periodo.id,
    fecha: destino.fecha,
    concepto: 'Saldos iniciales del plan de cuentas HCC (Sparrow)',
    referencia: 'Apertura HCC',
    total_debe: totalDebe,
    total_haber: totalHaber,
  })
  await knex('comprobante_detalle').insert(
    renglones.map((r, i) => ({ comprobante_id: id, renglon: i + 1, ...r })),
  )
  await knex('bitacora').insert({
    usuario_id: null,
    accion: 'CREAR',
    entidad: 'comprobantes',
    entidad_id: String(id),
    datos_despues: JSON.stringify({
      numero: `Borrador #${id}`,
      tipo: TIPO_APERTURA.codigo,
      fecha: destino.fecha,
      concepto: 'Saldos iniciales del plan de cuentas HCC (Sparrow)',
      estado: 'BORRADOR',
      totalDebe,
      totalHaber,
      renglones: renglones.length,
    }),
  })
  return { id, fecha: destino.fecha, renglones: renglones.length, totalDebe }
}
