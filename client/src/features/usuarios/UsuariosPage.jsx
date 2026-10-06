import { useSearchParams } from 'react-router'
import { RolesTab } from './RolesTab.jsx'
import { UsuariosTab } from './UsuariosTab.jsx'

const PESTANAS = [
  {
    clave: 'usuarios',
    etiqueta: 'Usuarios',
    descripcion:
      'Cree cuentas para el personal, actualice sus datos, restablezca claves olvidadas y habilite o deshabilite el acceso.',
  },
  {
    clave: 'roles',
    etiqueta: 'Roles y permisos',
    descripcion: 'Defina qué puede ver y hacer cada rol en cada módulo del sistema.',
  },
]

export default function UsuariosPage() {
  const [params, setParams] = useSearchParams()
  const actual = PESTANAS.find((p) => p.clave === params.get('vista')) ?? PESTANAS[0]

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios y roles</h1>
          <p className="ayuda mt-1 max-w-2xl text-pizarra">{actual.descripcion}</p>
        </div>
        <div
          role="tablist"
          className="inline-flex rounded-xl border border-linea bg-superficie p-1"
        >
          {PESTANAS.map((p) => (
            <button
              key={p.clave}
              type="button"
              role="tab"
              aria-selected={actual.clave === p.clave}
              onClick={() => setParams(p.clave === 'usuarios' ? {} : { vista: p.clave })}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                actual.clave === p.clave
                  ? 'bg-marca text-white shadow-sm'
                  : 'text-pizarra hover:text-tinta'
              }`}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6" role="tabpanel">
        {actual.clave === 'usuarios' ? <UsuariosTab /> : <RolesTab />}
      </div>
    </div>
  )
}
