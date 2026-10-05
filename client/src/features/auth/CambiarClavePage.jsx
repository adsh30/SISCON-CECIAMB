import { Navigate, useNavigate } from 'react-router'
import { useLogout, useSesion } from '../../api/auth.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Logo } from '../../components/ui/Logo.jsx'
import { CambiarClaveForm } from './CambiarClaveForm.jsx'

/** Cambio de clave obligatorio tras recibir una clave temporal. */
export default function CambiarClavePage() {
  const { data: usuario, isPending } = useSesion()
  const logout = useLogout()
  const navigate = useNavigate()
  const avisar = useAvisos()

  if (isPending) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (!usuario.debeCambiarClave) return <Navigate to="/app" replace />

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-8 rounded-2xl border border-linea bg-superficie p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Cree su clave personal</h1>
          <p className="mt-2 text-pizarra">
            Hola, {usuario.nombre}. Está usando una clave temporal. Antes de continuar, elija una
            clave que solo usted conozca.
          </p>
          <div className="mt-6">
            <CambiarClaveForm
              textoBoton="Guardar y entrar"
              onListo={() => {
                avisar('Clave actualizada')
                navigate('/app', { replace: true })
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })
          }
          className="mt-4 text-sm text-pizarra hover:text-tinta"
        >
          Salir sin cambiar la clave
        </button>
      </div>
    </div>
  )
}
