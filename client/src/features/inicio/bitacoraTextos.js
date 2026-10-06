// Textos legibles para los eventos de la bitácora

export const ACCIONES = {
  LOGIN: { texto: 'Inició sesión', icono: 'llave', tono: 'marca' },
  LOGOUT: { texto: 'Cerró sesión', icono: 'salir', tono: 'pizarra' },
  LOGIN_FALLIDO: { texto: 'Intento de ingreso fallido', icono: 'escudo', tono: 'alerta' },
  LOGIN_BLOQUEADO: { texto: 'Usuario bloqueado por intentos', icono: 'escudo', tono: 'alerta' },
  CREAR: { texto: 'Creó', icono: 'mas', tono: 'exito' },
  EDITAR: { texto: 'Editó', icono: 'editar', tono: 'marca' },
  ACTUALIZAR: { texto: 'Actualizó', icono: 'restaurar', tono: 'marca' },
  ELIMINAR: { texto: 'Eliminó', icono: 'papelera', tono: 'alerta' },
  APROBAR: { texto: 'Aprobó', icono: 'check', tono: 'exito' },
  ANULAR: { texto: 'Anuló', icono: 'cerrar', tono: 'alerta' },
  CAMBIAR_CLAVE: { texto: 'Cambió su clave', icono: 'llave', tono: 'marca' },
  RESETEAR_CLAVE: { texto: 'Restableció la clave de', icono: 'llave', tono: 'aviso' },
  ACTIVAR: { texto: 'Habilitó', icono: 'check', tono: 'exito' },
  DESACTIVAR: { texto: 'Deshabilitó', icono: 'cerrar', tono: 'aviso' },
  ARCHIVAR: { texto: 'Archivó', icono: 'archivo', tono: 'pizarra' },
  DESARCHIVAR: { texto: 'Desarchivó', icono: 'restaurar', tono: 'marca' },
  PERMISOS: { texto: 'Cambió permisos de', icono: 'escudo', tono: 'aviso' },
}

const ENTIDADES = {
  usuarios: 'un usuario',
  roles: 'un rol',
  roles_permisos: 'un rol',
  tasas_cambio: 'las tasas de cambio',
}

// Acciones que se describen solas, sin decir sobre qué entidad
const SIN_ENTIDAD = new Set([
  'LOGIN',
  'LOGOUT',
  'LOGIN_FALLIDO',
  'LOGIN_BLOQUEADO',
  'CAMBIAR_CLAVE',
])

export function describirEvento(e) {
  const accion = ACCIONES[e.accion] ?? { texto: e.accion, icono: 'bitacora', tono: 'pizarra' }
  const texto = SIN_ENTIDAD.has(e.accion)
    ? accion.texto
    : `${accion.texto} ${ENTIDADES[e.entidad] ?? e.entidad}`
  return { ...accion, texto }
}
