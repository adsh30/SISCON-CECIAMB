import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  useAnularConciliacion,
  useConciliacion,
  useDesemparejar,
  useEmparejar,
  useFinalizarConciliacion,
  useImportarBanco,
} from '../../api/conciliaciones.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx'
import { formatoFecha, formatoMonto } from '../../lib/formato.js'

export default function ConciliacionDetallePage() {
  const { id } = useParams()
  const avisar = useAvisos()

  const { data: c, isLoading } = useConciliacion(id)
  const emparejar = useEmparejar(id)
  const desemparejar = useDesemparejar(id)
  const finalizar = useFinalizarConciliacion(id)
  const anular = useAnularConciliacion(id)

  const [modalImportar, setModalImportar] = useState(false)
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false)
  const [confirmarAnular, setConfirmarAnular] = useState(false)
  const [motivoAnular, setMotivoAnular] = useState('')

  // Estado para emparejamiento manual
  const [seleccionLibro, setSeleccionLibro] = useState(null)
  const [seleccionBanco, setSeleccionBanco] = useState(null)

  // Filtros de vista
  const [verSoloPendientes, setVerSoloPendientes] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-pizarra">
        Cargando detalle de la conciliación…
      </div>
    )
  }

  if (!c) {
    return (
      <div className="rounded-xl border border-linea bg-superficie p-8 text-center">
        <p className="text-sm font-semibold text-tinta">Conciliación no encontrada</p>
        <Link to="/app/conciliaciones" className="mt-4 inline-block text-xs font-semibold text-marca">
          Volver a la lista
        </Link>
      </div>
    )
  }

  const esBorrador = c.estado === 'BORRADOR'
  const esConciliada = c.estado === 'CONCILIADA'
  const r = c.resumen || {}
  const cuadreExacto = Number(r.diferenciaConciliada) === 0

  const partidasLibro = verSoloPendientes
    ? c.partidasLibro.filter((p) => p.estado === 'PENDIENTE')
    : c.partidasLibro
  const partidasBanco = verSoloPendientes
    ? c.partidasBanco.filter((p) => p.estado === 'PENDIENTE')
    : c.partidasBanco

  const handleEmparejarManual = async () => {
    if (!seleccionLibro || !seleccionBanco) return
    try {
      await emparejar.mutateAsync({
        partidaLibroId: seleccionLibro,
        partidaBancoId: seleccionBanco,
      })
      avisar.exito('Partidas emparejadas exitosamente')
      setSeleccionLibro(null)
      setSeleccionBanco(null)
    } catch (err) {
      avisar.error(err.message || 'Error al emparejar partidas')
    }
  }

  const handleDesemparejar = async (partidaId) => {
    try {
      await desemparejar.mutateAsync({ partidaId })
      avisar.info('Emparejamiento deshecho')
    } catch (err) {
      avisar.error(err.message || 'Error al desemparejar')
    }
  }

  const handleFinalizar = async () => {
    try {
      await finalizar.mutateAsync()
      setConfirmarFinalizar(false)
      avisar.exito('Conciliación bancaria finalizada y aprobada')
    } catch (err) {
      avisar.error(err.message || 'Error al finalizar conciliación')
    }
  }

  const handleAnular = async () => {
    if (!motivoAnular.trim()) {
      avisar.error('Debe indicar un motivo de anulación')
      return
    }
    try {
      await anular.mutateAsync({ motivo: motivoAnular.trim() })
      setConfirmarAnular(false)
      avisar.info('Conciliación anulada')
    } catch (err) {
      avisar.error(err.message || 'Error al anular conciliación')
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/app/conciliaciones"
              className="inline-flex items-center gap-1 text-xs font-semibold text-pizarra hover:text-marca"
            >
              <Icono nombre="chevron" className="size-3.5 rotate-180" />
              Conciliaciones
            </Link>
            <span className="text-pizarra/40">•</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                esConciliada
                  ? 'bg-exito/10 text-exito ring-1 ring-exito/20'
                  : esBorrador
                    ? 'bg-aviso/10 text-aviso ring-1 ring-aviso/20'
                    : 'bg-pizarra/10 text-pizarra'
              }`}
            >
              {c.estado}
            </span>
          </div>

          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-tinta">
            Conciliación: {c.cuentaNombre}
          </h1>
          <p className="mt-1 text-xs font-mono text-pizarra">
            {c.cuentaCodigo} · Período {c.periodoNumero} ({c.periodoAnio}) · Fecha de corte: {formatoFecha(c.fechaCorte)}
          </p>
        </div>

        {esBorrador && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variante="secundario"
              onClick={() => setModalImportar(true)}
              className="text-xs"
            >
              <Icono nombre="subir" className="size-3.5" />
              Cargar Extracto Bancario
            </Button>

            <Button
              onClick={() => setConfirmarFinalizar(true)}
              className="text-xs"
              disabled={finalizar.isPending}
            >
              <Icono nombre="check" className="size-3.5" />
              Finalizar Conciliación
            </Button>

            <Button
              variante="peligro"
              onClick={() => setConfirmarAnular(true)}
              className="text-xs"
            >
              Anular
            </Button>
          </div>
        )}
      </div>

      {/* Resumen de Ecuación Contable de Conciliación */}
      <div className="rounded-xl border border-linea bg-superficie p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-pizarra mb-4">
          Resumen de Conciliación Bancaria al {formatoFecha(c.fechaCorte)}
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Bloque 1: Saldo según Banco */}
          <div className="rounded-xl border border-linea bg-superficie-2/50 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-linea">
              <span className="font-semibold text-tinta">Saldo según Estado de Cuenta:</span>
              <span className="font-mono font-bold text-tinta">{formatoMonto(c.saldoBanco)}</span>
            </div>
            <div className="flex justify-between items-center text-pizarra">
              <span>(+) Depósitos en tránsito ({c.partidasLibro.filter((p) => p.estado === 'PENDIENTE' && p.tipoMovimiento === 'DEBITO').length}):</span>
              <span className="font-mono">{formatoMonto(r.depositosEnTransito)}</span>
            </div>
            <div className="flex justify-between items-center text-pizarra">
              <span>(-) Cheques / Pagos en tránsito ({c.partidasLibro.filter((p) => p.estado === 'PENDIENTE' && p.tipoMovimiento === 'CREDITO').length}):</span>
              <span className="font-mono">-{formatoMonto(r.egresosEnTransito)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-linea font-bold">
              <span className="text-marca">(=) Saldo Banco Ajustado:</span>
              <span className="font-mono text-marca">{formatoMonto(r.saldoBancoAjustado)}</span>
            </div>
          </div>

          {/* Bloque 2: Saldo según Libros */}
          <div className="rounded-xl border border-linea bg-superficie-2/50 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-linea">
              <span className="font-semibold text-tinta">Saldo según Libro Mayor:</span>
              <span className="font-mono font-bold text-tinta">{formatoMonto(c.saldoLibros)}</span>
            </div>
            <div className="flex justify-between items-center text-pizarra">
              <span>(+) Abonos / Depósitos no en libros ({c.partidasBanco.filter((p) => p.estado === 'PENDIENTE' && p.tipoMovimiento === 'CREDITO').length}):</span>
              <span className="font-mono">{formatoMonto(r.creditosBancoPendientes)}</span>
            </div>
            <div className="flex justify-between items-center text-pizarra">
              <span>(-) Cargos / Comisiones no en libros ({c.partidasBanco.filter((p) => p.estado === 'PENDIENTE' && p.tipoMovimiento === 'DEBITO').length}):</span>
              <span className="font-mono">-{formatoMonto(r.cargosBancoPendientes)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-linea font-bold">
              <span className="text-marca">(=) Saldo Libros Ajustado:</span>
              <span className="font-mono text-marca">{formatoMonto(r.saldoLibrosAjustado)}</span>
            </div>
          </div>

          {/* Bloque 3: Diferencia Neta */}
          <div
            className={`flex flex-col justify-between rounded-xl border p-4 text-center ${
              cuadreExacto
                ? 'border-exito/30 bg-exito/5 text-exito'
                : 'border-acento/30 bg-acento/5 text-acento'
            }`}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                {cuadreExacto ? 'Conciliación Cuadrada' : 'Diferencia Pendiente'}
              </p>
              <div className="mt-2 text-2xl font-black font-mono">
                {formatoMonto(r.diferenciaConciliada)} Bs.
              </div>
            </div>
            <p className="mt-2 text-[11px] opacity-80">
              {cuadreExacto
                ? 'Todos los movimientos cuadran matemáticamente con el extracto.'
                : 'Existen diferencias o partidas sin emparejar entre libros y el banco.'}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Acciones de Emparejamiento Manual */}
      {esBorrador && (seleccionLibro || seleccionBanco) && (
        <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-marca bg-superficie p-3.5 shadow-lg animate-in fade-in">
          <div className="text-xs text-tinta">
            <span className="font-bold text-marca">Modo de emparejamiento manual: </span>
            {seleccionLibro ? 'Partida de Libro seleccionada' : 'Seleccione una partida de Libro'}
            {' · '}
            {seleccionBanco ? 'Partida de Banco seleccionada' : 'Seleccione una partida de Banco'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={!seleccionLibro || !seleccionBanco || emparejar.isPending}
              onClick={handleEmparejarManual}
              className="text-xs py-1.5"
            >
              <Icono nombre="check" className="size-3.5" />
              Emparejar Seleccionadas
            </Button>
            <Button
              variante="plano"
              onClick={() => {
                setSeleccionLibro(null)
                setSeleccionBanco(null)
              }}
              className="text-xs py-1.5"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Filtro de Partidas */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-bold uppercase tracking-wider text-pizarra">
          Cotejo Línea a Línea
        </div>
        <label className="flex items-center gap-2 text-xs text-tinta cursor-pointer">
          <input
            type="checkbox"
            checked={verSoloPendientes}
            onChange={(e) => setVerSoloPendientes(e.target.checked)}
            className="rounded border-linea text-marca focus:ring-marca"
          />
          Mostrar únicamente partidas pendientes
        </label>
      </div>

      {/* Grilla Dividida: Libro Mayor vs Extracto Bancario */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* COLUMNA IZQUIERDA: LIBRO MAYOR */}
        <div className="rounded-xl border border-linea bg-superficie overflow-hidden shadow-xs">
          <div className="flex items-center justify-between border-b border-linea bg-superficie-2 px-4 py-3">
            <div>
              <h3 className="text-xs font-bold text-tinta uppercase tracking-wider">
                Partidas en Libro Mayor ({partidasLibro.length})
              </h3>
              <p className="text-[11px] text-pizarra">Movimientos contables aprobados en el período</p>
            </div>
          </div>

          <div className="divide-y divide-linea max-h-[600px] overflow-y-auto">
            {partidasLibro.length === 0 ? (
              <div className="p-8 text-center text-xs text-pizarra">
                No hay partidas en el libro mayor para este corte.
              </div>
            ) : (
              partidasLibro.map((p) => {
                const esConciliado = p.estado === 'CONCILIADO'
                const estaSeleccionado = seleccionLibro === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!esBorrador || esConciliado) return
                      setSeleccionLibro(estaSeleccionado ? null : p.id)
                    }}
                    className={`flex items-center justify-between gap-3 p-3 text-xs transition-colors ${
                      estaSeleccionado
                        ? 'bg-marca/10 ring-1 ring-marca'
                        : esConciliado
                          ? 'bg-exito/5 opacity-70'
                          : esBorrador
                            ? 'hover:bg-superficie-2 cursor-pointer'
                            : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-pizarra">{formatoFecha(p.fecha)}</span>
                        {p.referencia && (
                          <span className="rounded bg-superficie-2 px-1.5 py-0.5 font-mono text-[10px] text-marca border border-linea">
                            {p.referencia}
                          </span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            p.tipoMovimiento === 'DEBITO' ? 'bg-marca/10 text-marca' : 'bg-aviso/10 text-aviso'
                          }`}
                        >
                          {p.tipoMovimiento === 'DEBITO' ? 'DEBE (+)' : 'HABER (-)'}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-medium text-tinta">{p.descripcion}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <div className="font-mono font-bold text-tinta">{formatoMonto(p.monto)}</div>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            esConciliado ? 'text-exito' : 'text-pizarra'
                          }`}
                        >
                          {p.estado}
                        </span>
                      </div>

                      {esBorrador && esConciliado && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDesemparejar(p.id)
                          }}
                          className="rounded p-1 text-pizarra hover:text-acento"
                          title="Desemparejar partida"
                        >
                          <Icono nombre="reverso" className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: EXTRACTO BANCARIO */}
        <div className="rounded-xl border border-linea bg-superficie overflow-hidden shadow-xs">
          <div className="flex items-center justify-between border-b border-linea bg-superficie-2 px-4 py-3">
            <div>
              <h3 className="text-xs font-bold text-tinta uppercase tracking-wider">
                Partidas del Extracto Bancario ({partidasBanco.length})
              </h3>
              <p className="text-[11px] text-pizarra">Movimientos reportados por el banco</p>
            </div>
            {esBorrador && (
              <Button
                variante="plano"
                onClick={() => setModalImportar(true)}
                className="text-[11px] py-1 px-2.5"
              >
                + Cargar
              </Button>
            )}
          </div>

          <div className="divide-y divide-linea max-h-[600px] overflow-y-auto">
            {partidasBanco.length === 0 ? (
              <div className="p-8 text-center text-xs text-pizarra">
                No hay movimientos bancarios cargados.{' '}
                {esBorrador && (
                  <button
                    type="button"
                    onClick={() => setModalImportar(true)}
                    className="font-bold text-marca underline"
                  >
                    Haga clic aquí para cargarlos.
                  </button>
                )}
              </div>
            ) : (
              partidasBanco.map((p) => {
                const esConciliado = p.estado === 'CONCILIADO'
                const estaSeleccionado = seleccionBanco === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!esBorrador || esConciliado) return
                      setSeleccionBanco(estaSeleccionado ? null : p.id)
                    }}
                    className={`flex items-center justify-between gap-3 p-3 text-xs transition-colors ${
                      estaSeleccionado
                        ? 'bg-marca/10 ring-1 ring-marca'
                        : esConciliado
                          ? 'bg-exito/5 opacity-70'
                          : esBorrador
                            ? 'hover:bg-superficie-2 cursor-pointer'
                            : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-pizarra">{formatoFecha(p.fecha)}</span>
                        {p.referencia && (
                          <span className="rounded bg-superficie-2 px-1.5 py-0.5 font-mono text-[10px] text-marca border border-linea">
                            {p.referencia}
                          </span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            p.tipoMovimiento === 'CREDITO' ? 'bg-exito/10 text-exito' : 'bg-acento/10 text-acento'
                          }`}
                        >
                          {p.tipoMovimiento === 'CREDITO' ? 'ABONO (+)' : 'CARGO (-)'}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-medium text-tinta">{p.descripcion}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <div className="font-mono font-bold text-tinta">{formatoMonto(p.monto)}</div>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            esConciliado ? 'text-exito' : 'text-pizarra'
                          }`}
                        >
                          {p.estado}
                        </span>
                      </div>

                      {esBorrador && esConciliado && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDesemparejar(p.id)
                          }}
                          className="rounded p-1 text-pizarra hover:text-acento"
                          title="Desemparejar partida"
                        >
                          <Icono nombre="reverso" className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Importar Extracto */}
      {modalImportar && (
        <ModalImportarExtracto
          conciliacionId={c.id}
          onClose={() => setModalImportar(false)}
          onImportado={() => {
            setModalImportar(false)
            avisar.exito('Extracto bancario importado y emparejado automáticamente')
          }}
        />
      )}

      {/* Confirmar Finalizar */}
      {confirmarFinalizar && (
        <ConfirmDialog
          titulo="¿Finalizar y Aprobar Conciliación?"
          mensaje={
            cuadreExacto
              ? 'La conciliación se encuentra perfectamente cuadrada (diferencia de 0.00 Bs). Al finalizar quedará registrada con estado CONCILIADA.'
              : `Atención: Existe una diferencia de ${formatoMonto(r.diferenciaConciliada)} Bs. ¿Desea finalizarla de todos modos dejando constancia en auditoría?`
          }
          textoConfirmar="Finalizar Conciliación"
          variante={cuadreExacto ? 'primario' : 'peligro'}
          onConfirm={handleFinalizar}
          onClose={() => setConfirmarFinalizar(false)}
        />
      )}

      {/* Confirmar Anular */}
      {confirmarAnular && (
        <Modal
          titulo="Anular Conciliación Bancaria"
          descripcion="Indique el motivo por el cual se anula este proceso de conciliación."
          tamano="sm"
          onClose={() => setConfirmarAnular(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-tinta">
                Motivo de anulación *
              </label>
              <textarea
                rows={3}
                value={motivoAnular}
                onChange={(e) => setMotivoAnular(e.target.value)}
                placeholder="Indique la justificación de la anulación…"
                className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-xs text-tinta focus:border-marca focus:outline-none"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variante="plano" onClick={() => setConfirmarAnular(false)}>
                Cancelar
              </Button>
              <Button variante="peligro" onClick={handleAnular} disabled={anular.isPending}>
                Confirmar Anulación
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ModalImportarExtracto({ conciliacionId, onClose, onImportado }) {
  const avisar = useAvisos()
  const importar = useImportarBanco(conciliacionId)
  const [textoCSV, setTextoCSV] = useState('')

  const handleProcesar = async (e) => {
    e.preventDefault()
    if (!textoCSV.trim()) {
      avisar.error('Pegue o escriba los datos del extracto bancario')
      return
    }

    try {
      const lineas = textoCSV.split('\n').filter((l) => l.trim())
      const movimientos = []

      for (const linea of lineas) {
        // Soporta delimitadores por coma, punto y coma o tabulación
        const partes = linea.includes('\t')
          ? linea.split('\t')
          : linea.includes(';')
            ? linea.split(';')
            : linea.split(',')

        const partesLimpias = partes.map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        if (partesLimpias.length < 4) continue

        // Formato esperado: Fecha (YYYY-MM-DD), Referencia, Descripción, Monto, Tipo (DEBITO/CREDITO o Cargo/Abono)
        let [fecha, ref, desc, monto, tipo] = partesLimpias
        if (!fecha || !desc || !monto) continue

        // Normalizar fecha si viene en DD/MM/YYYY
        if (fecha.includes('/')) {
          const [d, m, y] = fecha.split('/')
          fecha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        }

        monto = Math.abs(Number(monto.replace(/\./g, '').replace(',', '.')) || Number(monto)).toFixed(2)
        const tipoNorm =
          (tipo || '').toUpperCase().includes('ABON') ||
          (tipo || '').toUpperCase().includes('CRED') ||
          (tipo || '').toUpperCase().includes('DEP')
            ? 'CREDITO'
            : 'DEBITO'

        movimientos.push({
          fecha,
          referencia: ref || undefined,
          descripcion: desc,
          monto,
          tipoMovimiento: tipoNorm,
        })
      }

      if (movimientos.length === 0) {
        avisar.error('No se pudieron reconocer movimientos válidos en el texto ingresado.')
        return
      }

      const res = await importar.mutateAsync({ movimientos })
      onImportado(res)
    } catch (err) {
      avisar.error(err.message || 'Error al procesar el extracto bancario')
    }
  }

  return (
    <Modal
      titulo="Cargar Extracto Bancario"
      descripcion="Pegue las líneas copiadas de Excel o del archivo CSV provisto por su banco."
      tamano="lg"
      onClose={onClose}
    >
      <form onSubmit={handleProcesar} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-tinta">
            Líneas del Extracto (Fecha, Referencia, Descripción, Monto, Tipo)
          </label>
          <textarea
            rows={10}
            value={textoCSV}
            onChange={(e) => setTextoCSV(e.target.value)}
            placeholder={`2026-01-10\tDEP-1001\tTRANSFERENCIA APORTE\t10000.00\tCREDITO\n2026-01-16\tPAG-2002\tPAGO SERVICIOS\t2500.00\tDEBITO`}
            className="w-full rounded-lg border border-linea bg-superficie p-3 font-mono text-xs text-tinta focus:border-marca focus:outline-none"
            required
          />
          <p className="mt-1 text-[11px] text-pizarra">
            Formato: <code>Fecha | Referencia | Descripción | Monto | Tipo (Débito/Crédito)</code> separadas por tabulación, coma o punto y coma.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-linea">
          <Button type="button" variante="plano" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={importar.isPending}>
            {importar.isPending ? 'Procesando…' : 'Importar y Emparejar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
