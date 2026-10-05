import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useActualizarPerfil, useLogout, useSesion } from '../../api/auth.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Campo, Interruptor, PuntoColor } from '../../components/ui/Formulario.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Icono } from '../../components/ui/Icono.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { formatoFechaHora } from '../../lib/formato.js'
import { usePreferencia } from '../../lib/preferencias.js'
import { CambiarClaveForm } from '../auth/CambiarClaveForm.jsx'

function Tarjeta({ titulo, descripcion, children }) {
  return (
    <section className="rounded-2xl border border-linea bg-superficie p-6">
      <h2 className="font-semibold">{titulo}</h2>
      {descripcion && <p className="ayuda mt-1 text-sm text-pizarra">{descripcion}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

const soloLetras = (v) => v.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]/g, '').toUpperCase()

function Perfil({ usuario }) {
  const actualizar = useActualizarPerfil()
  const avisar = useAvisos()
  const [datos, setDatos] = useState({
    nombre: usuario.nombre ?? '',
    apellido: usuario.apellido ?? '',
    telefono: usuario.telefono ?? '',
    departamento: usuario.departamento ?? '',
  })
  const campo = (k, filtro = (v) => v) => ({
    id: `perfil-${k}`,
    value: datos[k],
    onChange: (e) => setDatos((d) => ({ ...d, [k]: filtro(e.target.value) })),
  })
  const errorDe = (k) => actualizar.error?.details?.find((d) => d.campo === k)?.mensaje
  const borde = (k) => (errorDe(k) ? 'border-alerta' : 'border-linea')

  const guardar = (e) => {
    e.preventDefault()
    actualizar.mutate(datos, { onSuccess: () => avisar('Perfil actualizado') })
  }

  return (
    <Tarjeta titulo="Mi perfil" descripcion="Sus datos de contacto dentro del sistema.">
      <div className="flex items-center gap-4">
        <span
          className="grid size-14 place-items-center rounded-full text-lg font-semibold text-white"
          style={{ backgroundColor: usuario.rolColor }}
          aria-hidden="true"
        >
          {(usuario.nombre?.[0] ?? '') + (usuario.apellido?.[0] ?? '')}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {[usuario.nombre, usuario.apellido].filter(Boolean).join(' ')}
          </p>
          <p className="truncate text-sm text-pizarra">{usuario.email}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
            <PuntoColor color={usuario.rolColor} /> {usuario.rolNombre}
          </p>
        </div>
      </div>
      <form onSubmit={guardar} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" id="perfil-nombre" error={errorDe('nombre')}>
          <input className={`${claseCampo} ${borde('nombre')}`} {...campo('nombre', soloLetras)} />
        </Campo>
        <Campo etiqueta="Apellido" id="perfil-apellido" error={errorDe('apellido')}>
          <input
            className={`${claseCampo} ${borde('apellido')}`}
            {...campo('apellido', soloLetras)}
          />
        </Campo>
        <Campo etiqueta="Teléfono" id="perfil-telefono" error={errorDe('telefono')}>
          <input
            inputMode="tel"
            placeholder="04141234567"
            className={`cifras ${claseCampo} ${borde('telefono')}`}
            {...campo('telefono', (v) => v.replace(/\D/g, '').slice(0, 15))}
          />
        </Campo>
        <Campo etiqueta="Departamento" id="perfil-departamento" error={errorDe('departamento')}>
          <input
            placeholder="Opcional"
            className={`${claseCampo} ${borde('departamento')}`}
            {...campo('departamento')}
          />
        </Campo>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={actualizar.isPending}>
            {actualizar.isPending ? 'Guardando…' : 'Guardar perfil'}
          </Button>
          {actualizar.isError && !actualizar.error.details?.length && (
            <span className="ml-3 text-sm text-alerta">{actualizar.error.message}</span>
          )}
        </div>
      </form>
    </Tarjeta>
  )
}

const TEMAS = [
  { valor: 'claro', etiqueta: 'Claro', icono: 'sol' },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: 'luna' },
  { valor: 'sistema', etiqueta: 'Según el equipo', icono: 'monitor' },
]

function Apariencia() {
  const [tema, setTema] = usePreferencia('tema')
  const [ayudas, setAyudas] = usePreferencia('ayudasOcultas')
  const [menu, setMenu] = usePreferencia('menuContraido')

  return (
    <Tarjeta titulo="Apariencia" descripcion="Se guarda en este equipo y navegador.">
      <fieldset>
        <legend className="text-sm font-medium">Tema</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TEMAS.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => setTema(t.valor)}
              aria-pressed={tema === t.valor}
              className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-sm font-medium transition-colors ${
                tema === t.valor
                  ? 'border-marca bg-marca-claro text-marca'
                  : 'border-linea text-pizarra hover:border-marca/40 hover:text-tinta'
              }`}
            >
              <Icono nombre={t.icono} />
              {t.etiqueta}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-4">
        <Interruptor
          id="pref-ayudas"
          etiqueta="Mostrar ayudas"
          descripcion="Textos que explican cada pantalla. También se activan con el botón (?) de arriba."
          checked={ayudas !== '1'}
          onChange={(v) => setAyudas(v ? '0' : '1')}
        />
        <Interruptor
          id="pref-menu"
          etiqueta="Menú lateral contraído"
          descripcion="Muestra solo los íconos para ganar espacio."
          checked={menu === '1'}
          onChange={(v) => setMenu(v ? '1' : '0')}
        />
      </div>
    </Tarjeta>
  )
}

function Seguridad() {
  const [abierto, setAbierto] = useState(false)
  const avisar = useAvisos()
  return (
    <Tarjeta
      titulo="Seguridad"
      descripcion="Cambie su clave cuando lo crea necesario. Nunca la comparta con otras personas."
    >
      <Button variante="secundario" onClick={() => setAbierto(true)}>
        <Icono nombre="llave" className="size-4" /> Cambiar mi clave
      </Button>
      {abierto && (
        <Modal titulo="Cambiar mi clave" tamano="sm" onClose={() => setAbierto(false)}>
          <CambiarClaveForm
            onListo={() => {
              setAbierto(false)
              avisar('Clave actualizada')
            }}
          />
        </Modal>
      )}
    </Tarjeta>
  )
}

function Sesion({ usuario }) {
  const logout = useLogout()
  const navigate = useNavigate()
  return (
    <Tarjeta titulo="Sesión">
      <dl className="text-sm">
        {[
          ['Correo', usuario.email],
          ['Rol', usuario.rolNombre],
          ['Ingreso anterior', formatoFechaHora(usuario.ultimoAcceso) || '—'],
        ].map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between gap-4 border-b border-dashed border-linea py-2.5"
          >
            <dt className="text-pizarra">{k}</dt>
            <dd className="truncate text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <Button
        variante="peligro"
        className="mt-4"
        disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })
        }
      >
        <Icono nombre="salir" className="size-4" /> Cerrar sesión
      </Button>
    </Tarjeta>
  )
}

export default function AjustesPage() {
  const { data: usuario } = useSesion()
  if (!usuario) return null
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      <p className="ayuda mt-1 text-pizarra">Configure su perfil y las preferencias del sistema.</p>
      <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        <Perfil usuario={usuario} />
        <Apariencia />
        <Seguridad />
        <Sesion usuario={usuario} />
      </div>
    </div>
  )
}
