// Catálogo de módulos del sistema y permisos por defecto de cada rol.
// Mantener sincronizado con client/src/lib/permisos.js

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

export const CLAVES_MODULOS = MODULOS.map((m) => m.clave)
export const NIVELES = ['lectura', 'escritura', 'full']
export const ROL_SUPERUSUARIO = 'ADMIN'

const vacio = () => ({ lectura: false, escritura: false, full: false })
const L = { lectura: true, escritura: false, full: false }
const LE = { lectura: true, escritura: true, full: false }
const F = { lectura: true, escritura: true, full: true }

const DEFAULTS = {
  ADMIN: Object.fromEntries(CLAVES_MODULOS.map((m) => [m, F])),
  CONTADOR: {
    inicio: L,
    comprobantes: F,
    libros: F,
    plan_cuentas: F,
    periodos: F,
    tasas: LE,
    bitacora: L,
  },
  ANALISTA: { inicio: L, comprobantes: LE, libros: L, plan_cuentas: L, periodos: L, tasas: L },
  AUDITOR: {
    inicio: L,
    comprobantes: L,
    libros: L,
    plan_cuentas: L,
    periodos: L,
    tasas: L,
    bitacora: L,
    usuarios: L,
  },
}

/** Matriz completa (todos los módulos) con los valores por defecto del rol. */
export function permisosPorDefecto(codigoRol) {
  const base = DEFAULTS[codigoRol] ?? { inicio: L }
  return normalizar(base)
}

/** Rellena módulos faltantes y aplica: full ⇒ lectura y escritura. */
export function normalizar(permisos = {}) {
  return Object.fromEntries(
    CLAVES_MODULOS.map((m) => {
      const p = { ...vacio(), ...permisos[m] }
      if (p.full) Object.assign(p, { lectura: true, escritura: true })
      return [m, { lectura: !!p.lectura, escritura: !!p.escritura, full: !!p.full }]
    }),
  )
}

/** ¿El rol con esa matriz puede `nivel` sobre `modulo`? */
export function puede(rol, permisos, modulo, nivel = 'lectura') {
  if (rol === ROL_SUPERUSUARIO) return true
  const p = permisos?.[modulo]
  return !!p && (p.full || p[nivel])
}
