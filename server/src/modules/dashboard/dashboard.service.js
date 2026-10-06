import { puede } from '../roles/permisos.catalogo.js'
import { permisosDeRol } from '../roles/permisos.repository.js'
import { fechaHoyVE, resumen as resumenTasas } from '../tasas/tasas.service.js'
import * as repo from './dashboard.repository.js'

/**
 * Datos del tablero de inicio. Cada bloque se incluye solo si el rol puede ver ese módulo,
 * para no exponer información de usuarios o bitácora a quien no tiene permiso.
 */
export async function obtener(usuario) {
  const permisos = await permisosDeRol(usuario.rolId)
  const ve = (modulo) => puede(usuario.rol, permisos, modulo, 'lectura')

  const [tasas, usuarios, recientes, hoy] = await Promise.all([
    resumenTasas(),
    ve('usuarios') ? repo.conteoUsuarios() : null,
    ve('bitacora') ? repo.actividadReciente() : null,
    ve('bitacora') ? repo.resumenDia(fechaHoyVE()) : null,
  ])

  return {
    fecha: fechaHoyVE(),
    tasas,
    usuarios,
    actividad: recientes ? { recientes, hoy } : null,
  }
}

export const actividadPorDia = ({ desde, hasta }) => repo.actividadPorDia(desde, hasta)
