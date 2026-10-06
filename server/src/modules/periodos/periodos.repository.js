import { db } from '../../config/db.js'

const COLUMNAS_PERIODO = [
  'p.id',
  'p.ejercicio_id',
  'p.numero',
  'p.anio',
  'p.mes',
  'p.fecha_inicio',
  'p.fecha_fin',
  'p.estado',
  'p.cerrado_en',
  'p.reabierto_en',
  'p.motivo_reapertura',
  'c.nombre as cerrado_por_nombre',
  'c.apellido as cerrado_por_apellido',
  'r.nombre as reabierto_por_nombre',
  'r.apellido as reabierto_por_apellido',
]

const conUsuarios = (trx = db) =>
  trx('periodos as p')
    .leftJoin('usuarios as c', 'c.id', 'p.cerrado_por')
    .leftJoin('usuarios as r', 'r.id', 'p.reabierto_por')
    .select(COLUMNAS_PERIODO)

export function ejercicios(trx = db) {
  return trx('ejercicios').select('*').orderBy('fecha_inicio', 'desc')
}

export function periodos(trx = db) {
  return conUsuarios(trx).orderBy('p.fecha_inicio')
}

export function ejercicioPorId(id, trx = db) {
  return trx('ejercicios').where({ id }).first()
}

export function periodoPorId(id, trx = db) {
  return conUsuarios(trx).where('p.id', id).first()
}

/** Período que contiene la fecha 'YYYY-MM-DD' */
export function periodoDeFecha(fecha, trx = db) {
  return conUsuarios(trx)
    .where('p.fecha_inicio', '<=', fecha)
    .where('p.fecha_fin', '>=', fecha)
    .first()
}

/** Bloquea todas las filas de períodos: cierres y reaperturas se aplican de a uno */
export function bloquearPeriodos(trx) {
  return trx('periodos').select('id').forUpdate()
}

export function limites(trx = db) {
  return trx('ejercicios')
    .min({ inicio: 'fecha_inicio' })
    .max({ fin: 'fecha_fin' })
    .count({ total: '*' })
    .first()
}

/** Primer período abierto anterior a la fecha */
export function primerAbiertoAntes(fecha, trx) {
  return trx('periodos')
    .where('estado', 'ABIERTO')
    .where('fecha_inicio', '<', fecha)
    .orderBy('fecha_inicio')
    .first()
}

/** Último período cerrado posterior a la fecha */
export function ultimoCerradoDespues(fecha, trx) {
  return trx('periodos')
    .where('estado', 'CERRADO')
    .where('fecha_inicio', '>', fecha)
    .orderBy('fecha_inicio', 'desc')
    .first()
}

export function cambiarEstado(id, cambios, trx) {
  return trx('periodos').where({ id }).update(cambios)
}
