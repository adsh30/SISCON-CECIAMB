import { useState } from 'react'
import { usePermisos } from '../../api/auth.js'
import {
  useEliminarRol,
  useGuardarPermisos,
  useRestaurarPermisos,
  useRoles,
} from '../../api/roles.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Insignia } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { ConfirmDialog } from '../../components/ui/Modal.jsx'
import { RolFormModal } from './RolFormModal.jsx'

const NIVELES = [
  { clave: 'lectura', etiqueta: 'Ver' },
  { clave: 'escritura', etiqueta: 'Modificar' },
  { clave: 'full', etiqueta: 'Control total' },
]

/** Aplica las reglas de la matriz al marcar o desmarcar una casilla. */
function alternar(actual, nivel) {
  const p = { ...actual, [nivel]: !actual[nivel] }
  if (nivel === 'full' && p.full) Object.assign(p, { lectura: true, escritura: true })
  if (nivel === 'escritura' && p.escritura) p.lectura = true
  if (nivel === 'lectura' && !p.lectura) Object.assign(p, { escritura: false, full: false })
  if (nivel === 'escritura' && !p.escritura) p.full = false
  return p
}

function TarjetaRol({ rol, modulos, soloLectura, onEditar, onEliminar }) {
  const guardar = useGuardarPermisos()
  const restaurar = useRestaurarPermisos()
  const avisar = useAvisos()
  const bloqueado = soloLectura || rol.superusuario

  const cambiar = (modulo, nivel) => {
    const permisos = { ...rol.permisos, [modulo]: alternar(rol.permisos[modulo], nivel) }
    guardar.mutate({ id: rol.id, permisos }, { onError: (err) => avisar(err.message, 'alerta') })
  }

  const estadoGuardado = guardar.isPending
    ? 'Guardando…'
    : guardar.isError
      ? 'No se pudo guardar'
      : guardar.isSuccess
        ? 'Guardado'
        : null

  return (
    <article
      className="overflow-hidden rounded-xl border border-linea bg-superficie"
      style={{ borderTop: `3px solid ${rol.color}` }}
    >
      <header className="flex flex-wrap items-start justify-between gap-2 px-5 pt-4">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 font-semibold">
            {rol.nombre}
            {rol.sistema && <Insignia tono="marca">Sistema</Insignia>}
          </h3>
          {rol.descripcion && <p className="mt-0.5 text-sm text-pizarra">{rol.descripcion}</p>}
          <p className="mt-1 text-xs text-pizarra">
            {rol.usuarios === 0
              ? 'Sin usuarios asignados'
              : `${rol.usuarios} usuario${rol.usuarios === 1 ? '' : 's'} asignado${rol.usuarios === 1 ? '' : 's'}`}
            {estadoGuardado && <span className="ml-2 text-marca">· {estadoGuardado}</span>}
          </p>
        </div>
        {!soloLectura && (
          <div className="flex gap-1">
            <Button
              variante="fantasma"
              tamano="sm"
              onClick={onEditar}
              title="Editar nombre y color"
            >
              <Icono nombre="editar" className="size-4" />
              <span className="sr-only">Editar</span>
            </Button>
            {!rol.superusuario && (
              <Button
                variante="fantasma"
                tamano="sm"
                title="Volver a los permisos por defecto"
                disabled={restaurar.isPending}
                onClick={() =>
                  restaurar.mutate(rol.id, {
                    onSuccess: () => avisar('Permisos por defecto restaurados'),
                  })
                }
              >
                <Icono nombre="restaurar" className="size-4" />
                <span className="sr-only">Restaurar permisos</span>
              </Button>
            )}
            {!rol.sistema && rol.usuarios === 0 && (
              <Button variante="fantasma" tamano="sm" onClick={onEliminar} title="Eliminar rol">
                <Icono nombre="papelera" className="size-4 text-alerta" />
                <span className="sr-only">Eliminar</span>
              </Button>
            )}
          </div>
        )}
      </header>

      {rol.superusuario && (
        <p className="ayuda mx-5 mt-3 rounded-lg bg-marca-claro px-3 py-2 text-xs text-marca">
          El administrador siempre tiene control total sobre todo el sistema.
        </p>
      )}

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-y border-linea bg-papel text-pizarra">
            <th className="px-5 py-2 text-left font-medium">Módulo</th>
            {NIVELES.map((n) => (
              <th key={n.clave} className="w-20 px-1 py-2 text-center text-xs font-medium">
                {n.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modulos.map((m) => (
            <tr key={m.clave} className="border-t border-linea/60 first:border-0">
              <td className="px-5 py-2">{m.nombre}</td>
              {NIVELES.map((n) => (
                <td key={n.clave} className="text-center">
                  <input
                    type="checkbox"
                    checked={!!rol.permisos[m.clave]?.[n.clave]}
                    disabled={bloqueado || guardar.isPending}
                    onChange={() => cambiar(m.clave, n.clave)}
                    aria-label={`${n.etiqueta} ${m.nombre} para ${rol.nombre}`}
                    className="size-4 cursor-pointer accent-marca disabled:cursor-not-allowed"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export function RolesTab() {
  const { can } = usePermisos()
  const soloLectura = !can('usuarios', 'escritura')
  const { data, isPending, isError, error } = useRoles()
  const eliminar = useEliminarRol()
  const avisar = useAvisos()
  const [modal, setModal] = useState({ tipo: null })
  const cerrar = () => setModal({ tipo: null })

  if (isPending) return <p className="text-pizarra">Cargando roles…</p>
  if (isError && !data) return <p className="text-alerta">{error.message}</p>

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="ayuda max-w-2xl text-sm leading-relaxed text-pizarra">
          Marque qué puede hacer cada rol en cada módulo. <strong>Ver</strong> permite consultar,{' '}
          <strong>Modificar</strong> permite registrar y editar, y <strong>Control total</strong>{' '}
          además permite aprobar, anular y eliminar. Los cambios se guardan al instante y aplican de
          inmediato a los usuarios con ese rol.
        </p>
        {!soloLectura && (
          <Button onClick={() => setModal({ tipo: 'crear' })}>
            <Icono nombre="mas" className="size-4" /> Nuevo rol
          </Button>
        )}
      </div>

      <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        {data.data.map((rol) => (
          <TarjetaRol
            key={rol.id}
            rol={rol}
            modulos={data.meta.modulos}
            soloLectura={soloLectura}
            onEditar={() => setModal({ tipo: 'editar', rol })}
            onEliminar={() => setModal({ tipo: 'eliminar', rol })}
          />
        ))}
      </div>

      {(modal.tipo === 'crear' || modal.tipo === 'editar') && (
        <RolFormModal
          rol={modal.rol}
          onClose={cerrar}
          onGuardado={() => {
            avisar(modal.tipo === 'crear' ? 'Rol creado' : 'Rol actualizado')
            cerrar()
          }}
        />
      )}
      {modal.tipo === 'eliminar' && (
        <ConfirmDialog
          titulo="Eliminar rol"
          mensaje={`Se eliminará el rol “${modal.rol.nombre}” junto con su matriz de permisos.`}
          textoConfirmar="Eliminar rol"
          variante="peligro"
          pendiente={eliminar.isPending}
          error={eliminar.error?.message}
          onCancel={() => {
            eliminar.reset()
            cerrar()
          }}
          onConfirm={() =>
            eliminar.mutate(modal.rol.id, {
              onSuccess: () => {
                avisar('Rol eliminado')
                cerrar()
              },
            })
          }
        />
      )}
    </>
  )
}
