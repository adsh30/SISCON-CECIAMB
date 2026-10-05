import { NavLink, Outlet, useNavigate } from 'react-router'
import { useLogout, useSesion } from '../api/auth.js'
import { Button } from '../components/ui/Button.jsx'
import { Logo } from '../components/ui/Logo.jsx'
import { BarraTasas } from '../features/tasas/BarraTasas.jsx'

const navegacion = [
  { to: '/app', etiqueta: 'Inicio', fin: true },
  { etiqueta: 'Comprobantes' },
  { etiqueta: 'Libro Diario' },
  { etiqueta: 'Libro Mayor' },
  { etiqueta: 'Plan de cuentas' },
  { etiqueta: 'Bitácora' },
]

function iniciales(nombre = '') {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export default function AppLayout() {
  const { data: usuario } = useSesion()
  const logout = useLogout()
  const navigate = useNavigate()

  const salir = () =>
    logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-linea bg-white px-4 py-5 md:flex">
        <Logo />
        <nav className="mt-8 space-y-1 text-sm" aria-label="Principal">
          {navegacion.map((item) =>
            item.to ? (
              <NavLink
                key={item.etiqueta}
                to={item.to}
                end={item.fin}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 font-medium ${
                    isActive ? 'bg-salud-claro text-salud-oscuro' : 'text-tinta hover:bg-papel'
                  }`
                }
              >
                {item.etiqueta}
              </NavLink>
            ) : (
              <span
                key={item.etiqueta}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-pizarra/70"
                title="Disponible en una próxima versión"
              >
                {item.etiqueta}
                <span className="text-xs">pronto</span>
              </span>
            ),
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-linea bg-white px-4 py-3 sm:px-6">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden flex-1 justify-end md:flex">
            <BarraTasas />
          </div>
          <div className="flex items-center gap-3">
            <span
              className="grid size-9 place-items-center rounded-full bg-salud-claro text-sm font-semibold text-salud-oscuro"
              aria-hidden="true"
            >
              {iniciales(usuario?.nombre)}
            </span>
            <span className="hidden text-sm leading-tight sm:block">
              <span className="block font-medium">{usuario?.nombre}</span>
              <span className="block text-pizarra">{usuario?.rolNombre}</span>
            </span>
            <Button variante="fantasma" onClick={salir} disabled={logout.isPending}>
              Cerrar sesión
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
