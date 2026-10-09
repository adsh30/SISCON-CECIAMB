import { useDeferredValue, useState } from 'react'
import { usePermisos } from '../../api/auth.js'
import { useRoles } from '../../api/roles.js'
import {
  useArchivarUsuario,
  useEstadoUsuario,
  useResetearClave,
  useUsuarios,
} from '../../api/usuarios.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { PuntoColor } from '../../components/ui/Formulario.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Icono } from '../../components/ui/Icono.jsx'
import { ConfirmDialog } from '../../components/ui/Modal.jsx'
import { formatoFechaHora, nombreCompleto } from '../../lib/formato.js'
import { ClaveTemporalModal } from './ClaveTemporalModal.jsx'
import { EstadoUsuario, UsuarioDetalleModal } from './UsuarioDetalleModal.jsx'
import { UsuarioFormModal } from './UsuarioFormModal.jsx'

function Indicador({ etiqueta, valor, detalle, tono, activo, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-xl border bg-superficie p-4 text-left transition-colors hover:border-marca/40 ${
        activo ? 'border-marca ring-2 ring-marca/15' : 'border-linea'
      }`}
    >
      <span className="block text-sm text-pizarra">{etiqueta}</span>
      <span className={`cifras mt-1 block text-2xl font-bold ${tono}`}>{valor ?? '…'}</span>
      <span className="ayuda block text-xs text-pizarra">{detalle}</span>
    </button>
  )
}

const CONFIRMACIONES = {
  resetear: (u) => ({
    titulo: 'Restablecer clave',
    mensaje: `Se generará una clave temporal nueva para ${u.email}. Su clave actual dejará de funcionar y deberá cambiarla al ingresar.`,
    textoConfirmar: 'Restablecer clave',
  }),
  deshabilitar: (u) => ({
    titulo: 'Deshabilitar usuario',
    mensaje: `${nombreCompleto(u)} dejará de tener acceso al sistema de inmediato, incluso si tiene la sesión abierta.`,
    textoConfirmar: 'Deshabilitar',
    variante: 'peligro',
  }),
  habilitar: (u) => ({
    titulo: 'Habilitar usuario',
    mensaje: `${nombreCompleto(u)} podrá volver a ingresar al sistema${u.archivadoEn ? ' y saldrá del archivo' : ''}.`,
    textoConfirmar: 'Habilitar',
    variante: 'exito',
  }),
  archivar: (u) => ({
    titulo: 'Archivar usuario',
    mensaje: `${nombreCompleto(u)} saldrá de la lista principal y pasará a Archivados. Seguirá deshabilitado y su historial se conserva.`,
    textoConfirmar: 'Archivar',
  }),
}

export function UsuariosTab() {
  const { usuario: yo, can } = usePermisos()
  const puedeEscribir = can('usuarios', 'escritura')
  const avisar = useAvisos()

  const [buscar, setBuscar] = useState('')
  const [rolId, setRolId] = useState('')
  const [estado, setEstado] = useState('todos')
  const buscarDiferido = useDeferredValue(buscar)

  const { data, isPending, isError, error } = useUsuarios({ buscar: buscarDiferido, rolId, estado })
  const { data: rolesResp } = useRoles()
  const roles = rolesResp?.data ?? []
  const usuarios = data?.data ?? []
  const resumen = data?.meta.resumen

  // Un solo modal abierto a la vez
  const [modal, setModalBase] = useState({ tipo: null })
  const cambiarEstado = useEstadoUsuario()
  const archivar = useArchivarUsuario()
  const resetear = useResetearClave()

  // Al cambiar de modal se limpian errores de acciones anteriores
  const setModal = (m) => {
    ;[cambiarEstado, archivar, resetear].forEach((mut) => mut.reset())
    setModalBase(m)
  }
  const cerrar = () => setModal({ tipo: null })

  const confirmar = () => {
    const { usuario: u, accion } = modal
    const alTerminar = (texto) => () => {
      avisar(texto, 'exito', nombreCompleto(u))
      cerrar()
    }
    if (accion === 'resetear') {
      resetear.mutate(u.id, {
        onSuccess: (r) =>
          setModal({ tipo: 'clave', email: u.email, clave: r.claveTemporal, motivo: 'reseteada' }),
      })
    } else if (accion === 'archivar') {
      archivar.mutate({ id: u.id, archivar: true }, { onSuccess: alTerminar('Usuario archivado') })
    } else {
      const activo = accion === 'habilitar'
      cambiarEstado.mutate(
        { id: u.id, activo },
        { onSuccess: alTerminar(activo ? 'Usuario habilitado' : 'Usuario deshabilitado') },
      )
    }
  }

  const mutacionConfirmar =
    modal.accion === 'resetear' ? resetear : modal.accion === 'archivar' ? archivar : cambiarEstado

  const filtrarEstado = (e) => setEstado((actual) => (actual === e ? 'todos' : e))

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          etiqueta="Usuarios activos"
          valor={resumen?.activos}
          detalle="Con acceso al sistema"
          tono="text-exito"
          activo={estado === 'activos'}
          onClick={() => filtrarEstado('activos')}
        />
        <Indicador
          etiqueta="Deshabilitados"
          valor={resumen?.inactivos}
          detalle="No pueden ingresar"
          tono="text-alerta"
          activo={estado === 'inactivos'}
          onClick={() => filtrarEstado('inactivos')}
        />
        <Indicador
          etiqueta="Archivados"
          valor={resumen?.archivados}
          detalle="Fuera de la lista principal"
          tono="text-pizarra"
          activo={estado === 'archivados'}
          onClick={() => filtrarEstado('archivados')}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Buscar usuarios</span>
          <Icono
            nombre="buscar"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-pizarra"
          />
          <input
            type="search"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre, cédula, correo o rol…"
            className={`${claseCampo} border-linea pl-9`}
          />
        </label>
        <select
          value={rolId}
          onChange={(e) => setRolId(e.target.value)}
          className={`${claseCampo} border-linea sm:w-52`}
          aria-label="Filtrar por rol"
        >
          <option value="">Todos los roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className={`${claseCampo} border-linea sm:w-52`}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Activos y deshabilitados</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo deshabilitados</option>
          <option value="archivados">Archivados</option>
        </select>
        {puedeEscribir && (
          <Button onClick={() => setModal({ tipo: 'crear' })}>
            <Icono nombre="mas" className="size-4" /> Agregar usuario
          </Button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-linea bg-superficie">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-papel text-left text-pizarra">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre completo</th>
              <th className="px-4 py-3 font-medium">Cédula</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Último ingreso</th>
              <th className="px-4 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isPending && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-pizarra">
                  Cargando usuarios…
                </td>
              </tr>
            )}
            {isError && !data && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-alerta">
                  {error.message}
                </td>
              </tr>
            )}
            {!isPending && !isError && usuarios.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-pizarra">
                  {buscar || rolId || estado !== 'todos'
                    ? 'Ningún usuario coincide con los filtros.'
                    : 'Aún no hay usuarios. Use “Agregar usuario” para crear el primero.'}
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-linea hover:bg-superficie-2/60">
                <td className="px-4 py-3">
                  <span className="font-medium">{nombreCompleto(u)}</span>
                  {u.debeCambiarClave && (
                    <span className="block text-xs text-aviso">
                      Debe cambiar la clave al ingresar
                    </span>
                  )}
                </td>
                <td className="cifras px-4 py-3">{u.ci ?? '—'}</td>
                <td className="sin-mayusculas px-4 py-3 text-pizarra">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <PuntoColor color={u.rol.color} />
                    {u.rol.nombre}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <EstadoUsuario usuario={u} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-pizarra">
                  {formatoFechaHora(u.ultimoAcceso) || 'Nunca'}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {puedeEscribir && (
                    <Button
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => setModal({ tipo: 'editar', usuario: u })}
                    >
                      Editar
                    </Button>
                  )}
                  <Button
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => setModal({ tipo: 'detalle', usuario: u })}
                  >
                    Ver
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.tipo === 'crear' && (
        <UsuarioFormModal
          roles={roles}
          onClose={cerrar}
          onCreado={(r) =>
            setModal({
              tipo: 'clave',
              email: r.usuario.email,
              clave: r.claveTemporal,
              motivo: 'creado',
            })
          }
        />
      )}
      {modal.tipo === 'editar' && (
        <UsuarioFormModal
          usuario={modal.usuario}
          roles={roles}
          onClose={cerrar}
          onGuardado={(u) => {
            if (u)
              avisar(
                'Usuario actualizado',
                'exito',
                <>
                  {nombreCompleto(u)} · <span className="sin-mayusculas">{u.email}</span>
                </>,
              )
            else avisar('No había cambios que guardar', 'info')
            cerrar()
          }}
        />
      )}
      {modal.tipo === 'detalle' && (
        <UsuarioDetalleModal
          usuario={modal.usuario}
          puedeEscribir={puedeEscribir}
          esUnoMismo={modal.usuario.id === yo?.id}
          onClose={cerrar}
          onAccion={(accion) =>
            setModal(
              accion === 'editar'
                ? { tipo: 'editar', usuario: modal.usuario }
                : { tipo: 'confirmar', usuario: modal.usuario, accion },
            )
          }
        />
      )}
      {modal.tipo === 'confirmar' && (
        <ConfirmDialog
          {...CONFIRMACIONES[modal.accion](modal.usuario)}
          pendiente={mutacionConfirmar.isPending}
          error={mutacionConfirmar.error?.message}
          onConfirm={confirmar}
          onCancel={() => setModal({ tipo: 'detalle', usuario: modal.usuario })}
        />
      )}
      {modal.tipo === 'clave' && (
        <ClaveTemporalModal
          email={modal.email}
          clave={modal.clave}
          motivo={modal.motivo}
          onClose={cerrar}
        />
      )}
    </>
  )
}
