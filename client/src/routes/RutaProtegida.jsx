import { Navigate, Outlet, useLocation } from 'react-router'
import { useSesion } from '../api/auth.js'
import { LogoMark } from '../components/ui/Logo.jsx'

export function RutaProtegida({ roles }) {
  const { data: usuario, isPending } = useSesion()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LogoMark className="size-10 animate-pulse" />
      </div>
    )
  }
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/app" replace />
  return <Outlet />
}
