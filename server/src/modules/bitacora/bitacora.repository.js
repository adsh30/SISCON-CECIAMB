import { db } from '../../config/db.js'
import { entreDiasCaracas } from '../../utils/fechas.js'

const COLUMNAS = [
  'b.id',
  'b.fecha',
  'b.accion',
  'b.entidad',
  'b.entidad_id as entidadId',
  'b.ip',
  'b.usuario_id as usuarioId',
  'u.nombre',
  'u.apellido',
  'u.email',
]

/** Escapa % y _ para usarlos en LIKE */
const comoLike = (texto) => `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

function filtrada({ desde, hasta, usuarioId, accion, entidad, buscar }) {
  const q = db('bitacora as b').leftJoin('usuarios as u', 'u.id', 'b.usuario_id')
  entreDiasCaracas(q, 'b.fecha', { desde, hasta }, db)
  if (usuarioId) q.where('b.usuario_id', usuarioId)
  if (accion) q.where('b.accion', accion)
  if (entidad) q.where('b.entidad', entidad)
  if (buscar) {
    const like = comoLike(buscar)
    q.where((w) =>
      w
        .where('u.nombre', 'like', like)
        .orWhere('u.apellido', 'like', like)
        .orWhere('u.email', 'like', like)
        .orWhere('b.entidad_id', 'like', like)
        .orWhere('b.ip', 'like', like)
        // Los datos de antes/después incluyen, por ejemplo, el correo de un ingreso fallido
        .orWhere('b.datos_antes', 'like', like)
        .orWhere('b.datos_despues', 'like', like),
    )
  }
  return q
}

export async function listar(filtros) {
  const { pagina, porPagina } = filtros
  const [filas, total] = await Promise.all([
    filtrada(filtros)
      .select(COLUMNAS)
      .orderBy('b.id', 'desc')
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),
    filtrada(filtros).count({ n: '*' }).first(),
  ])
  return { filas, total: Number(total.n) }
}

/** Para exportar: incluye los datos de antes y después */
export function todas(filtros, limite) {
  return filtrada(filtros)
    .select([...COLUMNAS, 'b.datos_antes as antes', 'b.datos_despues as despues', 'b.agente'])
    .orderBy('b.id', 'desc')
    .limit(limite)
}

export function porId(id) {
  return db('bitacora as b')
    .leftJoin('usuarios as u', 'u.id', 'b.usuario_id')
    .select([...COLUMNAS, 'b.datos_antes as antes', 'b.datos_despues as despues', 'b.agente'])
    .where('b.id', id)
    .first()
}

/** Valores presentes en la bitácora, para llenar los filtros */
export async function opciones() {
  const [usuarios, acciones, entidades] = await Promise.all([
    db('usuarios as u')
      .whereIn('u.id', db('bitacora').distinct('usuario_id').whereNotNull('usuario_id'))
      .select('u.id', 'u.nombre', 'u.apellido', 'u.email')
      .orderBy('u.nombre'),
    db('bitacora').distinct('accion').orderBy('accion').pluck('accion'),
    db('bitacora').distinct('entidad').orderBy('entidad').pluck('entidad'),
  ])
  return { usuarios, acciones, entidades }
}
