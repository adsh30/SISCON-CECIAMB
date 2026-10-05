// Copia de server/src/modules/roles/permisos.catalogo.js (solo lo que usa el cliente): mantener sincronizado.
export const MODULOS = [
  { clave: 'inicio', nombre: 'Inicio' },
  { clave: 'comprobantes', nombre: 'Comprobantes' },
  { clave: 'libros', nombre: 'Libro Diario y Mayor' },
  { clave: 'plan_cuentas', nombre: 'Plan de cuentas' },
  { clave: 'periodos', nombre: 'Ejercicios y períodos' },
  { clave: 'tasas', nombre: 'Tasas de cambio' },
  { clave: 'bitacora', nombre: 'Bitácora de auditoría' },
  { clave: 'usuarios', nombre: 'Usuarios y roles' },
]

export const ROL_SUPERUSUARIO = 'ADMIN'

/** ¿El usuario puede `nivel` ('lectura' | 'escritura' | 'full') sobre `modulo`? */
export function puede(usuario, modulo, nivel = 'lectura') {
  if (!usuario) return false
  if (usuario.rol === ROL_SUPERUSUARIO) return true
  const p = usuario.permisos?.[modulo]
  return !!p && (p.full || p[nivel])
}
