import { useRef, useState } from 'react'
import {
  useAdjuntos,
  useEliminarAdjunto,
  useSubirAdjunto,
} from '../../api/comprobantes.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { ConfirmDialog } from '../../components/ui/Modal.jsx'
import { formatoFechaHoraCaracas } from '../../lib/formato.js'

function formatoBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function iconoTipo(mime) {
  if (mime === 'application/pdf') return 'manual'
  if (mime?.startsWith('image/')) return 'monitor'
  return 'archivo'
}

/**
 * Sección de documentos soporte adjuntos (RF-05.11):
 * Permite visualizar, previsualizar/descargar, adjuntar y eliminar facturas,
 * transferencias o recibos en formato PDF o imagen.
 */
export function AdjuntosComprobante({ comprobante, puedeModificar = true }) {
  const avisar = useAvisos()
  const archivoInputRef = useRef(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [adjuntoAEliminar, setAdjuntoAEliminar] = useState(null)

  const { data: adjuntos = [], isLoading } = useAdjuntos(comprobante.id)
  const subir = useSubirAdjunto()
  const eliminar = useEliminarAdjunto()

  const bloqueado = comprobante.estado === 'ANULADO' || !puedeModificar

  const procesarArchivo = (archivo) => {
    if (!archivo) return

    // Validar formato (PDF o imagen)
    const tiposPermitidos = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
    if (!tiposPermitidos.includes(archivo.type)) {
      avisar(
        'Formato no permitido',
        'alerta',
        'Solo se admiten documentos PDF e imágenes PNG, JPG o WEBP',
      )
      return
    }

    // Validar tamaño (máximo 10 MB)
    const maxBytes = 10 * 1024 * 1024
    if (archivo.size > maxBytes) {
      avisar('Archivo muy pesado', 'alerta', 'El documento no puede superar 10 MB')
      return
    }

    const lector = new FileReader()
    lector.onload = async () => {
      try {
        const contenidoBase64 = lector.result
        await subir.mutateAsync({
          comprobanteId: comprobante.id,
          nombre: archivo.name,
          contenido: contenidoBase64,
        })
        avisar('Documento soporte adjuntado', 'exito', archivo.name)
      } catch (err) {
        avisar('Error al adjuntar', 'alerta', err.message || 'No se pudo subir el archivo')
      } finally {
        if (archivoInputRef.current) archivoInputRef.current.value = ''
      }
    }
    lector.readAsDataURL(archivo)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) procesarArchivo(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setArrastrando(false)
    if (bloqueado) return
    const file = e.dataTransfer.files?.[0]
    if (file) procesarArchivo(file)
  }

  const confirmarEliminar = async () => {
    if (!adjuntoAEliminar) return
    try {
      await eliminar.mutateAsync({
        comprobanteId: comprobante.id,
        adjuntoId: adjuntoAEliminar.id,
      })
      avisar('Documento soporte eliminado', 'exito', adjuntoAEliminar.nombre)
      setAdjuntoAEliminar(null)
    } catch (err) {
      avisar('Error al eliminar adjunto', 'alerta', err.message)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-linea bg-superficie p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-tinta">Documentos soporte</h2>
          <p className="mt-0.5 text-xs text-pizarra">
            Facturas, recibos, transferencias o comprobantes de retención en PDF o imagen (máx. 10 MB)
          </p>
        </div>

        {!bloqueado && (
          <div>
            <input
              ref={archivoInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="input-adjunto"
            />
            <Button
              variante="secundario"
              tamano="sm"
              disabled={subir.isPending}
              onClick={() => archivoInputRef.current?.click()}
            >
              <Icono nombre="mas" className="size-4" />
              {subir.isPending ? 'Subiendo…' : 'Adjuntar documento'}
            </Button>
          </div>
        )}
      </div>

      {/* Zona de arrastrar y soltar */}
      {!bloqueado && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={handleDrop}
          className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            arrastrando
              ? 'border-marca bg-marca-claro/40'
              : 'border-linea bg-superficie-2/40 hover:bg-superficie-2/70'
          }`}
        >
          <Icono nombre="archivo" className="size-8 text-pizarra/60" />
          <p className="mt-2 text-sm font-medium text-tinta">
            Arrastre y suelte su documento aquí o haga clic en{' '}
            <button
              type="button"
              onClick={() => archivoInputRef.current?.click()}
              className="text-marca underline hover:text-marca-oscuro"
            >
              adjuntar
            </button>
          </p>
          <p className="mt-1 text-xs text-pizarra">Formatos admitidos: PDF, PNG, JPG, WEBP</p>
        </div>
      )}

      {/* Lista de adjuntos */}
      <div className="mt-4">
        {isLoading ? (
          <p className="py-4 text-center text-sm text-pizarra">Cargando documentos…</p>
        ) : adjuntos.length === 0 ? (
          <p className="py-4 text-center text-sm text-pizarra">
            No hay documentos soporte adjuntos a este comprobante
          </p>
        ) : (
          <ul className="divide-y divide-linea rounded-xl border border-linea">
            {adjuntos.map((adj) => (
              <li
                key={adj.id}
                className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-superficie-2/40 transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-marca-claro text-marca">
                    <Icono nombre={iconoTipo(adj.tipo)} className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/api/v1/comprobantes/${comprobante.id}/adjuntos/${adj.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-marca hover:underline truncate block"
                      title={adj.nombre}
                    >
                      {adj.nombre}
                    </a>
                    <p className="text-xs text-pizarra">
                      {formatoBytes(adj.tamano)} · {adj.creadoPor} · {formatoFechaHoraCaracas(adj.creadoEn)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/api/v1/comprobantes/${comprobante.id}/adjuntos/${adj.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-linea px-2.5 py-1 text-xs font-semibold hover:bg-superficie-2"
                  >
                    <Icono nombre="manual" className="size-3.5" />
                    Ver
                  </a>

                  {!bloqueado && (
                    <button
                      type="button"
                      onClick={() => setAdjuntoAEliminar(adj)}
                      className="rounded-lg p-1.5 text-pizarra hover:bg-alerta-claro hover:text-alerta"
                      title="Eliminar documento"
                      aria-label="Eliminar documento"
                    >
                      <Icono nombre="papelera" className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {adjuntoAEliminar && (
        <ConfirmDialog
          titulo="Eliminar documento soporte"
          mensaje={`¿Está seguro de que desea eliminar el archivo "${adjuntoAEliminar.nombre}"? Esta acción quedará registrada en la bitácora de auditoría.`}
          textoConfirmar="Eliminar archivo"
          variante="peligro"
          pendiente={eliminar.isPending}
          onConfirm={confirmarEliminar}
          onCancel={() => setAdjuntoAEliminar(null)}
        />
      )}
    </section>
  )
}

