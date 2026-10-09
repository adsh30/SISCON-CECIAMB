import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAnularComprobante, useCopiarComprobante } from '../../api/comprobantes.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Campo } from '../../components/ui/Formulario.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { numeroComprobante } from '../../lib/comprobantes.js'
import { hoyCaracas } from '../../lib/series.js'

const COPIAS = {
  duplicar: {
    titulo: 'Duplicar comprobante',
    texto:
      'Se crea un borrador nuevo con la misma cabecera y los mismos renglones. Podrá revisarlo antes de aprobarlo.',
    boton: 'Duplicar',
    aviso: 'Comprobante duplicado',
  },
  reversar: {
    titulo: 'Generar reverso',
    texto:
      'Se crea un borrador con los mismos renglones pero con Debe y Haber invertidos, para anular el efecto contable del comprobante en la fecha que elija.',
    boton: 'Generar reverso',
    aviso: 'Reverso generado',
  },
}

/** Duplicar o reversar: pide la fecha del borrador nuevo y abre el resultado */
export function CopiarModal({ comprobante, tipo, onClose }) {
  const copia = COPIAS[tipo]
  const [fecha, setFecha] = useState(hoyCaracas())
  const copiar = useCopiarComprobante()
  const navigate = useNavigate()
  const avisar = useAvisos()

  const confirmar = () =>
    copiar.mutate(
      { id: comprobante.id, tipo, fecha },
      {
        onSuccess: (nuevo) => {
          avisar(copia.aviso, 'exito', `Borrador #${nuevo.id} · revíselo y apruébelo`)
          onClose()
          navigate(`/app/comprobantes/${nuevo.id}`)
        },
      },
    )

  return (
    <Modal
      titulo={copia.titulo}
      descripcion={numeroComprobante(comprobante)}
      tamano="sm"
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" onClick={onClose} disabled={copiar.isPending}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={copiar.isPending || !fecha}>
            {copiar.isPending ? 'Creando…' : copia.boton}
          </Button>
        </>
      }
    >
      <p className="text-sm text-pizarra">{copia.texto}</p>
      <Campo etiqueta="Fecha del borrador nuevo" id="fecha-copia" className="mt-4">
        <input
          id="fecha-copia"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={`${claseCampo} border-linea`}
        />
      </Campo>
      {copiar.error && <p className="mt-3 text-sm text-alerta">{copiar.error.message}</p>}
    </Modal>
  )
}

/** Anular un comprobante aprobado: motivo obligatorio (10 caracteres o más) */
export function AnularModal({ comprobante, onClose }) {
  const [motivo, setMotivo] = useState('')
  const anular = useAnularComprobante()
  const avisar = useAvisos()
  const valido = motivo.trim().length >= 10

  const confirmar = () =>
    anular.mutate(
      { id: comprobante.id, motivo: motivo.trim() },
      {
        onSuccess: (c) => {
          avisar('Comprobante anulado', 'info', c.codigo)
          onClose()
        },
      },
    )

  return (
    <Modal
      titulo={`Anular ${comprobante.codigo}`}
      descripcion="El comprobante deja de contar en los libros. Conserva su número y no se puede deshacer."
      tamano="sm"
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" onClick={onClose} disabled={anular.isPending}>
            Cancelar
          </Button>
          <Button variante="peligro" onClick={confirmar} disabled={!valido || anular.isPending}>
            {anular.isPending ? 'Anulando…' : 'Anular comprobante'}
          </Button>
        </>
      }
    >
      <Campo
        etiqueta="Motivo de la anulación"
        id="motivo-anulacion"
        ayuda={`${motivo.trim().length}/255 · mínimo 10 caracteres`}
      >
        <textarea
          id="motivo-anulacion"
          rows={3}
          maxLength={255}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. La factura se registró dos veces"
          className={`${claseCampo} border-linea`}
        />
      </Campo>
      {anular.error && <p className="mt-3 text-sm text-alerta">{anular.error.message}</p>}
    </Modal>
  )
}
