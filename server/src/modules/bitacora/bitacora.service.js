import { db } from '../../config/db.js'

export const ACCIONES = {
  LOGIN: 'LOGIN',
  LOGIN_FALLIDO: 'LOGIN_FALLIDO',
  LOGIN_BLOQUEADO: 'LOGIN_BLOQUEADO',
  LOGOUT: 'LOGOUT',
  CREAR: 'CREAR',
  EDITAR: 'EDITAR',
  APROBAR: 'APROBAR',
  ANULAR: 'ANULAR',
  ACTUALIZAR: 'ACTUALIZAR',
  ELIMINAR: 'ELIMINAR',
  CAMBIAR_CLAVE: 'CAMBIAR_CLAVE',
  RESETEAR_CLAVE: 'RESETEAR_CLAVE',
  ACTIVAR: 'ACTIVAR',
  DESACTIVAR: 'DESACTIVAR',
  ARCHIVAR: 'ARCHIVAR',
  DESARCHIVAR: 'DESARCHIVAR',
  PERMISOS: 'PERMISOS',
}

/**
 * Registra un evento en la bitácora (solo inserción).
 * Pasar `trx` para que quede dentro de la misma transacción que la operación.
 */
export async function registrar(
  trx,
  { usuarioId, accion, entidad, entidadId, antes, despues, ctx },
) {
  await (trx ?? db)('bitacora').insert({
    usuario_id: usuarioId ?? null,
    accion,
    entidad,
    entidad_id: entidadId != null ? String(entidadId) : null,
    datos_antes: antes ? JSON.stringify(antes) : null,
    datos_despues: despues ? JSON.stringify(despues) : null,
    ip: ctx?.ip ?? null,
    agente: ctx?.agente?.slice(0, 255) ?? null,
  })
}
