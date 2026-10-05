import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useLogout, usePermisos } from '../api/auth.js'
import { Icono } from '../components/ui/Icono.jsx'
import { LogoMark } from '../components/ui/Logo.jsx'
import { BarraTasas } from '../features/tasas/BarraTasas.jsx'
import { usePreferencia } from '../lib/preferencias.js'

// Menú: `modulo` controla la visibilidad por permiso; sin `to` = disponible próximamente
const SECCIONES = [
  {
    titulo: 'Contabilidad',
    items: [
      { to: '/app', etiqueta: 'Inicio', icono: 'inicio', modulo: 'inicio', fin: true },
      { etiqueta: 'Comprobantes', icono: 'comprobantes', modulo: 'comprobantes' },
      { etiqueta: 'Libro Diario', icono: 'libros', modulo: 'libros' },
      { etiqueta: 'Libro Mayor', icono: 'mayor', modulo: 'libros' },
      { etiqueta: 'Plan de cuentas', icono: 'cuentas', modulo: 'plan_cuentas' },
      { etiqueta: 'Períodos', icono: 'periodos', modulo: 'periodos' },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      { to: '/app/usuarios', etiqueta: 'Usuarios y roles', icono: 'usuarios', modulo: 'usuarios' },
      { etiqueta: 'Bitácora', icono: 'bitacora', modulo: 'bitacora' },
      { to: '/app/ajustes', etiqueta: 'Ajustes', icono: 'ajustes' },
      { href: '/manual.html', etiqueta: 'Manual del sistema', icono: 'manual' },
    ],
  },
]

const iniciales = (u) =>
  [u?.nombre, u?.apellido]
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

function ItemMenu({ item, contraido }) {
  const base =
    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'
  const contenido = (
    <>
      <Icono nombre={item.icono} className="size-4.5 shrink-0" />
      <span className={contraido ? 'md:sr-only' : ''}>{item.etiqueta}</span>
    </>
  )

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        title={item.etiqueta}
        className={`${base} text-pizarra hover:bg-superficie-2 hover:text-tinta`}
      >
        {contenido}
      </a>
    )
  }
  if (!item.to) {
    return (
      <span
        title={`${item.etiqueta}: disponible en una próxima versión`}
        className={`${base} cursor-default text-pizarra/55`}
      >
        {contenido}
        <span className={`ml-auto text-[11px] font-normal ${contraido ? 'md:hidden' : ''}`}>
          pronto
        </span>
      </span>
    )
  }
  return (
    <NavLink
      to={item.to}
      end={item.fin}
      title={item.etiqueta}
      className={({ isActive }) =>
        `${base} ${
          isActive
            ? 'bg-marca-claro text-marca before:absolute before:top-1/4 before:bottom-1/4 before:-left-2 before:w-0.75 before:rounded-full before:bg-marca'
            : 'text-pizarra hover:bg-superficie-2 hover:text-tinta'
        }`
      }
    >
      {contenido}
    </NavLink>
  )
}

export default function AppLayout() {
  const { usuario, can } = usePermisos()
  const logout = useLogout()
  const navigate = useNavigate()
  const location = useLocation()
  const [contraidoPref, setContraido] = usePreferencia('menuContraido')
  const [ayudasOcultas, setAyudasOcultas] = usePreferencia('ayudasOcultas')
  // El cajón móvil queda abierto solo en la ruta donde se abrió: al navegar se cierra
  const [cajonEn, setCajonEn] = useState(null)
  const cajonAbierto = cajonEn === location.pathname
  const setCajonAbierto = (abrir) => setCajonEn(abrir ? location.pathname : null)
  const contraido = contraidoPref === '1'

  const alternarMenu = () => {
    if (window.matchMedia('(max-width: 767px)').matches) setCajonAbierto(!cajonAbierto)
    else setContraido(contraido ? '0' : '1')
  }

  const salir = () =>
    logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })

  const secciones = SECCIONES.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.modulo || can(i.modulo)),
  })).filter((s) => s.items.length)

  return (
    <div className="min-h-screen md:flex">
      {/* Fondo del cajón móvil */}
      <div
        onClick={() => setCajonAbierto(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-[#0b1426]/45 transition-opacity md:hidden ${
          cajonAbierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-68 max-w-[84vw] flex-col border-r border-linea bg-superficie transition-transform duration-200 md:sticky md:top-0 md:h-screen md:max-w-none md:translate-x-0 md:transition-[width] ${
          cajonAbierto ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${contraido ? 'md:w-18' : 'md:w-64'}`}
        aria-label="Menú principal"
      >
        <div className="flex h-16 shrink-0 items-center border-b border-linea px-4">
          <NavLink to="/app" className="flex items-center gap-3" title="Inicio">
            <LogoMark className="h-9 w-auto shrink-0" />
            <span className={`leading-none ${contraido ? 'md:hidden' : ''}`}>
              <span className="block text-lg font-extrabold tracking-tight text-marca">
                CECIAMB
              </span>
              <span className="mt-0.5 block text-xs text-pizarra">Sistema contable</span>
            </span>
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {secciones.map((s) => (
            <div key={s.titulo} className="mt-3">
              <p
                className={`px-3 pb-1.5 text-xs font-semibold text-pizarra/80 ${contraido ? 'md:hidden' : ''}`}
              >
                {s.titulo}
              </p>
              <div className="flex flex-col gap-0.5">
                {s.items.map((item) => (
                  <ItemMenu key={item.etiqueta} item={item} contraido={contraido} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-linea p-3">
          <div
            className={`flex items-center gap-2.5 rounded-xl border border-linea bg-papel p-2 ${contraido ? 'md:justify-center' : ''}`}
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: usuario?.rolColor ?? 'var(--color-marca)' }}
              title={contraido ? usuario?.nombre : undefined}
              aria-hidden="true"
            >
              {iniciales(usuario)}
            </span>
            <span className={`min-w-0 flex-1 leading-tight ${contraido ? 'md:hidden' : ''}`}>
              <span className="block truncate text-sm font-semibold">
                {[usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ')}
              </span>
              <span className="block truncate text-xs text-pizarra">{usuario?.rolNombre}</span>
            </span>
            <button
              type="button"
              onClick={salir}
              disabled={logout.isPending}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className={`rounded-lg p-2 text-pizarra hover:bg-superficie-2 hover:text-acento ${contraido ? 'md:hidden' : ''}`}
            >
              <Icono nombre="salir" className="size-4.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-linea bg-superficie/85 px-3 backdrop-blur sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={alternarMenu}
              title={contraido ? 'Mostrar menú' : 'Ocultar menú'}
              aria-label="Mostrar u ocultar el menú"
              className="rounded-lg p-2 text-pizarra hover:bg-superficie-2 hover:text-tinta"
            >
              <Icono nombre="menu" />
            </button>
            <span className="hidden text-sm text-pizarra lg:inline">
              CECIAMB <span className="text-linea">/</span>{' '}
              <strong className="font-semibold text-tinta">Sistema contable</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BarraTasas />
            <button
              type="button"
              onClick={() => setAyudasOcultas(ayudasOcultas === '1' ? '0' : '1')}
              aria-pressed={ayudasOcultas !== '1'}
              title={
                ayudasOcultas === '1'
                  ? 'Mostrar las ayudas (textos explicativos)'
                  : 'Ocultar las ayudas (textos explicativos)'
              }
              className={`rounded-lg border border-linea p-2 hover:bg-superficie-2 ${
                ayudasOcultas === '1' ? 'text-pizarra/60' : 'text-marca'
              }`}
            >
              <Icono nombre="ayuda" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
