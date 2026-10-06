import { db } from '../../config/db.js'
import { entreDiasCaracas } from '../../utils/fechas.js'

// La bitácora se guarda en UTC; Venezuela es UTC−4 todo el año
const FECHA_CARACAS = "DATE_FORMAT(b.fecha - INTERVAL 4 HOUR, '%Y-%m-%d')"

export async function conteoUsuarios() {
  const [estados, porRol] = await Promise.all([
    db('usuarios')
      .select(
        db.raw('SUM(activo = 1 AND archivado_en IS NULL) AS activos'),
        db.raw('SUM(activo = 0 AND archivado_en IS NULL) AS inactivos'),
        db.raw('SUM(archivado_en IS NOT NULL) AS archivados'),
      )
      .first(),
    db('roles as r')
      .leftJoin('usuarios as u', function () {
        this.on('u.rol_id', 'r.id').andOnNull('u.archivado_en')
      })
      .select('r.id', 'r.codigo', 'r.nombre', 'r.color')
      .count({ total: 'u.id' })
      .select(db.raw('COALESCE(SUM(u.activo), 0) AS activos'))
      .groupBy('r.id', 'r.codigo', 'r.nombre', 'r.color')
      .orderBy('r.id'),
  ])
  return {
    activos: Number(estados?.activos ?? 0),
    inactivos: Number(estados?.inactivos ?? 0),
    archivados: Number(estados?.archivados ?? 0),
    porRol: porRol.map((r) => ({ ...r, total: Number(r.total), activos: Number(r.activos) })),
  }
}

export function actividadReciente(limite = 8) {
  return db('bitacora as b')
    .leftJoin('usuarios as u', 'u.id', 'b.usuario_id')
    .select(
      'b.id',
      'b.accion',
      'b.entidad',
      'b.entidad_id as entidadId',
      'b.fecha',
      'u.nombre',
      'u.apellido',
    )
    .orderBy('b.id', 'desc')
    .limit(limite)
}

/** Eventos de la bitácora del día de Caracas indicado, por tipo. */
export async function resumenDia(fecha) {
  const filas = await db('bitacora as b')
    .select('b.accion')
    .count({ n: '*' })
    .modify((q) => entreDiasCaracas(q, 'b.fecha', { desde: fecha, hasta: fecha }, db))
    .groupBy('b.accion')
  const por = Object.fromEntries(filas.map((f) => [f.accion, Number(f.n)]))
  return {
    eventos: filas.reduce((s, f) => s + Number(f.n), 0),
    ingresos: por.LOGIN ?? 0,
    fallidos: (por.LOGIN_FALLIDO ?? 0) + (por.LOGIN_BLOQUEADO ?? 0),
  }
}

// Alias `dia` (no `fecha`): MariaDB resolvería GROUP BY fecha con la columna b.fecha
/** Cantidad de eventos por día de Caracas entre dos fechas (inclusive). */
export async function actividadPorDia(desde, hasta) {
  const filas = await db('bitacora as b')
    .select(db.raw(`${FECHA_CARACAS} AS dia`))
    .count({ total: '*' })
    .modify((q) => entreDiasCaracas(q, 'b.fecha', { desde, hasta }, db))
    .groupBy('dia')
    .orderBy('dia')
  return filas.map((f) => ({ fecha: f.dia, total: Number(f.total) }))
}
