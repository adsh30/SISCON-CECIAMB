import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import { MODULOS, normalizar, permisosPorDefecto, ROL_SUPERUSUARIO } from './permisos.catalogo.js'
import { guardarPermisos, permisosDeRol } from './permisos.repository.js'

/** 'Supervisor de caja' → 'SUPERVISOR_DE_CAJA' */
export function codigoDesdeNombre(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)
}

async function obtener(id, trx = db) {
  const rol = await trx('roles').where({ id }).first()
  if (!rol) throw new AppError(404, 'NO_ENCONTRADO', 'El rol no existe')
  return rol
}

const contarUsuarios = async (rolId, trx = db) =>
  Number((await trx('usuarios').where({ rol_id: rolId }).count({ n: '*' }).first()).n)

function aPublico(rol, usuarios, permisos) {
  return {
    id: rol.id,
    codigo: rol.codigo,
    nombre: rol.nombre,
    descripcion: rol.descripcion,
    color: rol.color,
    sistema: !!rol.sistema,
    superusuario: rol.codigo === ROL_SUPERUSUARIO,
    usuarios,
    permisos,
  }
}

export async function listar() {
  const roles = await db('roles').orderBy([
    { column: 'sistema', order: 'desc' },
    { column: 'nombre', order: 'asc' },
  ])
  const conteos = await db('usuarios').select('rol_id').count({ n: '*' }).groupBy('rol_id')
  const porRol = Object.fromEntries(conteos.map((c) => [c.rol_id, Number(c.n)]))
  const data = await Promise.all(
    roles.map(async (r) => aPublico(r, porRol[r.id] ?? 0, await permisosDeRol(r.id))),
  )
  return { data, meta: { modulos: MODULOS } }
}

export async function crear({ nombre, descripcion, color }, actor, ctx) {
  const codigo = codigoDesdeNombre(nombre)
  if (!codigo) throw new AppError(400, 'VALIDACION', 'El nombre del rol no es válido')
  return db.transaction(async (trx) => {
    if (await trx('roles').where({ codigo }).first()) {
      throw new AppError(409, 'ROL_DUPLICADO', 'Ya existe un rol con ese nombre', [
        { campo: 'nombre', mensaje: 'Ya existe un rol con ese nombre' },
      ])
    }
    const [id] = await trx('roles').insert({ codigo, nombre, descripcion, color, sistema: false })
    const permisos = permisosPorDefecto(codigo)
    await guardarPermisos(id, permisos, actor.id, trx)
    const rol = await obtener(id, trx)
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.CREAR,
      entidad: 'roles',
      entidadId: id,
      despues: { codigo, nombre, descripcion, color },
      ctx,
    })
    return aPublico(rol, 0, permisos)
  })
}

export async function editar(id, { nombre, descripcion, color }, actor, ctx) {
  return db.transaction(async (trx) => {
    const antes = await obtener(id, trx)
    await trx('roles').where({ id }).update({ nombre, descripcion, color })
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.EDITAR,
      entidad: 'roles',
      entidadId: id,
      antes: { nombre: antes.nombre, descripcion: antes.descripcion, color: antes.color },
      despues: { nombre, descripcion, color },
      ctx,
    })
    const rol = await obtener(id, trx)
    return aPublico(rol, await contarUsuarios(id, trx), await permisosDeRol(id, trx))
  })
}

export async function eliminar(id, actor, ctx) {
  await db.transaction(async (trx) => {
    const rol = await obtener(id, trx)
    if (rol.sistema) {
      throw new AppError(409, 'ROL_SISTEMA', 'Los roles del sistema no se pueden eliminar')
    }
    const usuarios = await contarUsuarios(id, trx)
    if (usuarios > 0) {
      throw new AppError(
        409,
        'ROL_EN_USO',
        `No se puede eliminar: hay ${usuarios} usuario(s) con este rol`,
      )
    }
    await trx('roles').where({ id }).del()
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.ELIMINAR,
      entidad: 'roles',
      entidadId: id,
      antes: { codigo: rol.codigo, nombre: rol.nombre },
      ctx,
    })
  })
}

export async function actualizarPermisos(id, permisos, actor, ctx) {
  return db.transaction(async (trx) => {
    const rol = await obtener(id, trx)
    if (rol.codigo === ROL_SUPERUSUARIO) {
      throw new AppError(
        409,
        'ROL_SUPERUSUARIO',
        'El administrador siempre tiene control total; sus permisos no se modifican',
      )
    }
    const antes = await permisosDeRol(id, trx)
    const despues = normalizar(permisos)
    await guardarPermisos(id, despues, actor.id, trx)
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.PERMISOS,
      entidad: 'roles',
      entidadId: id,
      antes,
      despues,
      ctx,
    })
    return aPublico(rol, await contarUsuarios(id, trx), despues)
  })
}

export async function restaurarPermisos(id, actor, ctx) {
  const rol = await obtener(id)
  return actualizarPermisos(id, permisosPorDefecto(rol.codigo), actor, ctx)
}
