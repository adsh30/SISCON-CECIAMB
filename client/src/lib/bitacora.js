// Textos legibles para los eventos de la bitácora (Inicio y pantalla de Bitácora)

export const ACCIONES = {
  LOGIN: { nombre: 'Inicio de sesión', texto: 'Inició sesión', icono: 'llave', tono: 'marca' },
  LOGOUT: { nombre: 'Cierre de sesión', texto: 'Cerró sesión', icono: 'salir', tono: 'neutro' },
  LOGIN_FALLIDO: {
    nombre: 'Ingreso fallido',
    texto: 'Intento de ingreso fallido',
    icono: 'escudo',
    tono: 'alerta',
  },
  LOGIN_BLOQUEADO: {
    nombre: 'Bloqueo por intentos',
    texto: 'Usuario bloqueado por intentos',
    icono: 'escudo',
    tono: 'alerta',
  },
  CREAR: { nombre: 'Creación', texto: 'Creó', icono: 'mas', tono: 'exito' },
  EDITAR: { nombre: 'Edición', texto: 'Editó', icono: 'editar', tono: 'marca' },
  ACTUALIZAR: { nombre: 'Actualización', texto: 'Actualizó', icono: 'restaurar', tono: 'marca' },
  ELIMINAR: { nombre: 'Eliminación', texto: 'Eliminó', icono: 'papelera', tono: 'alerta' },
  APROBAR: { nombre: 'Aprobación', texto: 'Aprobó', icono: 'check', tono: 'exito' },
  ANULAR: { nombre: 'Anulación', texto: 'Anuló', icono: 'cerrar', tono: 'alerta' },
  CAMBIAR_CLAVE: {
    nombre: 'Cambio de clave',
    texto: 'Cambió su clave',
    icono: 'llave',
    tono: 'marca',
  },
  RESETEAR_CLAVE: {
    nombre: 'Clave restablecida',
    texto: 'Restableció la clave de',
    icono: 'llave',
    tono: 'aviso',
  },
  ACTIVAR: { nombre: 'Habilitación', texto: 'Habilitó', icono: 'check', tono: 'exito' },
  DESACTIVAR: { nombre: 'Deshabilitación', texto: 'Deshabilitó', icono: 'cerrar', tono: 'aviso' },
  ARCHIVAR: { nombre: 'Archivo', texto: 'Archivó', icono: 'archivo', tono: 'neutro' },
  DESARCHIVAR: {
    nombre: 'Desarchivo',
    texto: 'Desarchivó',
    icono: 'restaurar',
    tono: 'marca',
  },
  PERMISOS: {
    nombre: 'Cambio de permisos',
    texto: 'Cambió permisos de',
    icono: 'escudo',
    tono: 'aviso',
  },
  EXPORTAR: { nombre: 'Exportación', texto: 'Exportó', icono: 'archivo', tono: 'neutro' },
  REVERTIR: {
    nombre: 'Actualización rechazada',
    texto: 'Rechazó una actualización del sistema y mantuvo la versión anterior',
    icono: 'cerrar',
    tono: 'alerta',
  },
}

/** Módulo afectado: nombre para filtros y frase para describir el evento */
export const MODULOS = {
  usuarios: { nombre: 'Usuarios', frase: 'un usuario' },
  roles: { nombre: 'Roles', frase: 'un rol' },
  roles_permisos: { nombre: 'Permisos', frase: 'un rol' },
  tasas_cambio: { nombre: 'Tasas de cambio', frase: 'las tasas de cambio' },
  bitacora: { nombre: 'Bitácora', frase: 'la bitácora' },
  sistema: { nombre: 'Sistema', frase: 'el sistema a una nueva versión' },
}

export const nombreAccion = (a) => ACCIONES[a]?.nombre ?? a
export const nombreModulo = (m) => MODULOS[m]?.nombre ?? m

// Acciones que se describen solas, sin decir sobre qué módulo
const SIN_MODULO = new Set([
  'LOGIN',
  'LOGOUT',
  'LOGIN_FALLIDO',
  'LOGIN_BLOQUEADO',
  'CAMBIAR_CLAVE',
  'REVERTIR',
])

export function describirEvento(e) {
  const accion = ACCIONES[e.accion] ?? { texto: e.accion, icono: 'bitacora', tono: 'neutro' }
  const texto = SIN_MODULO.has(e.accion)
    ? accion.texto
    : `${accion.texto} ${MODULOS[e.entidad]?.frase ?? e.entidad}`
  return { ...accion, texto }
}

const CAMPOS = {
  nombre: 'Nombre',
  apellido: 'Apellido',
  email: 'Correo',
  ci: 'Cédula',
  telefono: 'Teléfono',
  departamento: 'Departamento',
  rol: 'Rol',
  rolId: 'Rol',
  activo: 'Habilitado',
  archivado: 'Archivado',
  codigo: 'Código',
  descripcion: 'Descripción',
  color: 'Color',
  intentos: 'Intentos fallidos',
  debeCambiarClave: 'Debe cambiar la clave',
  bcvUsd: 'BCV $',
  bcvEur: 'BCV €',
  binanceUsdt: 'Binance USDT',
  avisos: 'Avisos',
  filas: 'Filas exportadas',
  filtros: 'Filtros',
  lectura: 'ver',
  escritura: 'modificar',
  full: 'control total',
  desde: 'Desde',
  hasta: 'Hasta',
  usuarioId: 'Usuario',
  accion: 'Acción',
  entidad: 'Módulo',
  buscar: 'Búsqueda',
  version: 'Versión',
  resultado: 'Resultado',
  cambios: 'Cambios incluidos',
  motivo: 'Motivo',
}

/** Nombre legible de un campo; los anidados se unen con ' · ' (p. ej. 'Comprobantes · ver') */
export const nombreCampo = (ruta) =>
  ruta
    .split('.')
    .map((p) => CAMPOS[p] ?? MODULOS[p]?.nombre ?? p.charAt(0).toUpperCase() + p.slice(1))
    .join(' · ')

/** { a: { b: 1 } } → { 'a.b': 1 }. Las listas se dejan como valor. */
function aplanar(obj, prefijo = '', salida = {}) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefijo) salida[prefijo] = obj
    return salida
  }
  for (const [k, v] of Object.entries(obj)) aplanar(v, prefijo ? `${prefijo}.${k}` : k, salida)
  return salida
}

export function formatoValor(v) {
  if (v === undefined) return ''
  if (v === null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  return String(v)
}

/**
 * Compara los datos de antes y después de un evento:
 * [{ campo, antes, despues, cambio }] con los campos que cambiaron primero.
 */
export function compararDatos(antes, despues) {
  const a = aplanar(antes ?? {})
  const d = aplanar(despues ?? {})
  const filas = [...new Set([...Object.keys(a), ...Object.keys(d)])].map((campo) => ({
    campo,
    antes: a[campo],
    despues: d[campo],
    cambio:
      antes != null && despues != null && JSON.stringify(a[campo]) !== JSON.stringify(d[campo]),
  }))
  return filas.sort((x, y) => Number(y.cambio) - Number(x.cambio))
}

const LOCALES = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1'])

/** '::1' es el mismo equipo donde corre el sistema */
export const formatoIp = (ip) =>
  !ip ? '—' : LOCALES.has(ip) ? 'Este equipo' : ip.replace(/^::ffff:/, '')
