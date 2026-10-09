import { Button } from '../../components/ui/Button.jsx'
import { Insignia, PuntoColor } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { formatoFechaHora, nombreCompleto } from '../../lib/formato.js'

export function EstadoUsuario({ usuario }) {
  if (usuario.archivadoEn) return <Insignia>Archivado</Insignia>
  return usuario.activo ? (
    <Insignia tono="exito">Activo</Insignia>
  ) : (
    <Insignia tono="alerta">Deshabilitado</Insignia>
  )
}

function Fila({ etiqueta, children }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-dashed border-linea py-2.5 text-sm last:border-0">
      <dt className="text-pizarra">{etiqueta}</dt>
      <dd className="min-w-0 break-words">{children || <span className="text-pizarra">—</span>}</dd>
    </div>
  )
}

export function UsuarioDetalleModal({ usuario, puedeEscribir, esUnoMismo, onClose, onAccion }) {
  const u = usuario
  return (
    <Modal
      titulo={nombreCompleto(u)}
      descripcion={<span className="sin-mayusculas">{u.email}</span>}
      tamano="md"
      onClose={onClose}
      pie={
        puedeEscribir ? (
          <>
            <Button variante="secundario" tamano="sm" onClick={() => onAccion('editar')}>
              <Icono nombre="editar" className="size-4" /> Editar datos
            </Button>
            <Button variante="secundario" tamano="sm" onClick={() => onAccion('resetear')}>
              <Icono nombre="llave" className="size-4" /> Restablecer clave
            </Button>
            {!u.activo && !u.archivadoEn && (
              <Button variante="secundario" tamano="sm" onClick={() => onAccion('archivar')}>
                <Icono nombre="archivo" className="size-4" /> Archivar
              </Button>
            )}
            {u.activo ? (
              !esUnoMismo && (
                <Button variante="peligro" tamano="sm" onClick={() => onAccion('deshabilitar')}>
                  Deshabilitar usuario
                </Button>
              )
            ) : (
              <Button variante="exito" tamano="sm" onClick={() => onAccion('habilitar')}>
                Habilitar usuario
              </Button>
            )}
          </>
        ) : (
          <Button variante="secundario" onClick={onClose}>
            Cerrar
          </Button>
        )
      }
    >
      <dl>
        <Fila etiqueta="Cédula">
          <span className="cifras">{u.ci}</span>
        </Fila>
        <Fila etiqueta="Teléfono">
          <span className="cifras">{u.telefono}</span>
        </Fila>
        <Fila etiqueta="Departamento">{u.departamento}</Fila>
        <Fila etiqueta="Rol">
          <span className="inline-flex items-center gap-2">
            <PuntoColor color={u.rol.color} />
            {u.rol.nombre}
          </span>
        </Fila>
        <Fila etiqueta="Estado">
          <EstadoUsuario usuario={u} />
        </Fila>
        <Fila etiqueta="Cambio de clave">
          {u.debeCambiarClave ? (
            <Insignia tono="aviso">Pendiente en el próximo ingreso</Insignia>
          ) : (
            <Insignia tono="exito">Al día</Insignia>
          )}
        </Fila>
        <Fila etiqueta="Último ingreso">
          {formatoFechaHora(u.ultimoAcceso) || 'Nunca ha ingresado'}
        </Fila>
        <Fila etiqueta="Registrado">{formatoFechaHora(u.creadoEn)}</Fila>
        {u.archivadoEn && (
          <Fila etiqueta="Archivado">
            {formatoFechaHora(u.archivadoEn)}
            {u.archivadoPor && ` por ${u.archivadoPor}`}
          </Fila>
        )}
      </dl>
    </Modal>
  )
}
