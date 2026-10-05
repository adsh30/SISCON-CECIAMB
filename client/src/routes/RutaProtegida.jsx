import { Navigate, Outlet, useLocation } from 'react-router'
import { usePermisos, useSesion } from '../api/auth.js'
import { LogoMark } from '../components/ui/Logo.jsx'

/** Exige sesión; con clave temporal solo permite ir a /cambiar-clave. */
export function RutaProtegida() {
  const { data: usuario, isPending } = useSesion()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LogoMark className="h-12 w-auto animate-pulse" />
      </div>
    )
  }
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (usuario.debeCambiarClave) return <Navigate to="/cambiar-clave" replace />
  return <Outlet />
}

/** Exige permiso de lectura sobre un módulo. */
export function RequireModulo({ modulo, children }) {
  const { can } = usePermisos()
  if (can(modulo)) return children
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-xl font-semibold">Sin acceso a esta sección</h1>
      <p className="mt-2 text-pizarra">
        Su rol no tiene permiso para ver este módulo. Si lo necesita, pídale al administrador que lo
        habilite en Usuarios y roles.
      </p>
    </div>
  )
}
