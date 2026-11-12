import { useState } from 'react'
import { Link } from 'react-router'
import { useConciliaciones, useIniciarConciliacion } from '../../api/conciliaciones.js'
import { usePeriodos } from '../../api/periodos.js'
import { AccountPicker } from '../../components/ui/AccountPicker.jsx'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { formatoFecha, formatoMonto } from '../../lib/formato.js'

export default function ConciliacionesPage() {
  const avisar = useAvisos()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)

  const { data: conciliaciones = [], isLoading } = useConciliaciones({
    estado: filtroEstado || undefined,
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pizarra">
            <Icono nombre="balance" className="size-4 text-marca" />
            Tesorería y Control de Bancos
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-tinta">
            Conciliaciones Bancarias
          </h1>
          <p className="mt-1 text-sm text-pizarra">
            Cotejo sistemático entre el Libro Mayor de bancos y los estados de cuenta bancarios oficiales.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setModalNuevo(true)}>
            <Icono nombre="mas" className="size-4" />
            Nueva Conciliación
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-4 border-b border-linea pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltroEstado('')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              !filtroEstado
                ? 'bg-marca text-white shadow-xs'
                : 'text-pizarra hover:bg-superficie-2 hover:text-tinta'
            }`}
          >
            Todas ({conciliaciones.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('BORRADOR')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filtroEstado === 'BORRADOR'
                ? 'bg-marca text-white shadow-xs'
                : 'text-pizarra hover:bg-superficie-2 hover:text-tinta'
            }`}
          >
            En Borrador
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('CONCILIADA')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filtroEstado === 'CONCILIADA'
                ? 'bg-marca text-white shadow-xs'
                : 'text-pizarra hover:bg-superficie-2 hover:text-tinta'
            }`}
          >
            Conciliadas
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('ANULADA')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filtroEstado === 'ANULADA'
                ? 'bg-marca text-white shadow-xs'
                : 'text-pizarra hover:bg-superficie-2 hover:text-tinta'
            }`}
          >
            Anuladas
          </button>
        </div>
      </div>

      {/* Tabla de Conciliaciones */}
      <div className="overflow-hidden rounded-xl border border-linea bg-superficie shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-linea bg-superficie-2 text-[11px] font-bold uppercase tracking-wider text-pizarra">
            <tr>
              <th className="px-4 py-3">Cuenta Bancaria</th>
              <th className="px-4 py-3">Período / Corte</th>
              <th className="px-4 py-3 text-right">Saldo Banco</th>
              <th className="px-4 py-3 text-right">Saldo Libros</th>
              <th className="px-4 py-3 text-right">Diferencia</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-pizarra">
                  Cargando conciliaciones bancarias…
                </td>
              </tr>
            ) : conciliaciones.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-pizarra">
                  No hay conciliaciones registradas. Haga clic en <strong>Nueva Conciliación</strong> para iniciar una.
                </td>
              </tr>
            ) : (
              conciliaciones.map((c) => {
                const esConciliada = c.estado === 'CONCILIADA'
                const esBorrador = c.estado === 'BORRADOR'
                return (
                  <tr key={c.id} className="hover:bg-superficie-2/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-tinta">{c.cuentaNombre}</div>
                      <div className="font-mono text-[11px] text-pizarra">{c.cuentaCodigo}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-tinta">
                        Período {c.periodoNumero} ({c.periodoAnio})
                      </div>
                      <div className="text-[11px] text-pizarra">
                        Corte: {formatoFecha(c.fechaCorte)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-tinta">
                      {formatoMonto(c.saldoBanco)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-tinta">
                      {formatoMonto(c.saldoLibros)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold">
                      <span
                        className={
                          Number(c.diferencia) === 0
                            ? 'text-exito'
                            : 'text-acento'
                        }
                      >
                        {formatoMonto(c.diferencia)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          esConciliada
                            ? 'bg-exito/10 text-exito ring-1 ring-exito/20'
                            : esBorrador
                              ? 'bg-aviso/10 text-aviso ring-1 ring-aviso/20'
                              : 'bg-pizarra/10 text-pizarra'
                        }`}
                      >
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        to={`/app/conciliaciones/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-linea bg-superficie px-3 py-1.5 text-xs font-semibold text-marca hover:bg-superficie-2 hover:border-marca/40 transition-all"
                      >
                        {esBorrador ? 'Conciliar' : 'Ver Detalle'}
                        <Icono nombre="chevron" className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nueva Conciliación */}
      {modalNuevo && (
        <ModalNuevaConciliacion
          onClose={() => setModalNuevo(false)}
          onCreada={() => {
            setModalNuevo(false)
            avisar.exito('Conciliación iniciada con éxito')
          }}
        />
      )}
    </div>
  )
}

function ModalNuevaConciliacion({ onClose, onCreada }) {
  const avisar = useAvisos()
  const iniciar = useIniciarConciliacion()
  const { data: periodosData = [] } = usePeriodos()

  // Extraer lista plana de períodos abiertos
  const todosPeriodos = periodosData.flatMap((e) => e.periodos || [])

  const [cuentaId, setCuentaId] = useState(null)
  const [periodoId, setPeriodoId] = useState(todosPeriodos[0]?.id || '')
  const [fechaCorte, setFechaCorte] = useState(() => new Date().toISOString().slice(0, 10))
  const [saldoBanco, setSaldoBanco] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const periodoSeleccionado = todosPeriodos.find((p) => p.id === Number(periodoId))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cuentaId) {
      avisar.error('Debe seleccionar la cuenta bancaria a conciliar')
      return
    }
    if (!periodoId) {
      avisar.error('Debe seleccionar el período fiscal')
      return
    }
    if (!saldoBanco.trim() || isNaN(Number(saldoBanco))) {
      avisar.error('Indique un saldo bancario válido según el extracto')
      return
    }

    try {
      const res = await iniciar.mutateAsync({
        cuentaId,
        periodoId: Number(periodoId),
        fechaCorte,
        saldoBanco: Number(saldoBanco).toFixed(2),
        observaciones: observaciones.trim() || undefined,
      })
      onCreada(res.id)
    } catch (err) {
      avisar.error(err.message || 'Error al iniciar la conciliación')
    }
  }

  return (
    <Modal
      titulo="Iniciar Conciliación Bancaria"
      descripcion="Seleccione la cuenta bancaria y el saldo reportado por el extracto oficial a la fecha de corte."
      tamano="md"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-tinta">
            Cuenta Bancaria (Activo · Bancos) *
          </label>
          <AccountPicker
            value={cuentaId}
            onChange={(c) => {
              setCuentaId(c?.id || null)
            }}
            placeholder="Seleccione cuenta de banco (ej. Banesco, Mercantil)…"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-tinta">
              Período Fiscal *
            </label>
            <select
              value={periodoId}
              onChange={(e) => {
                const pid = Number(e.target.value)
                setPeriodoId(pid)
                const p = todosPeriodos.find((x) => x.id === pid)
                if (p) setFechaCorte(p.fechaFin)
              }}
              className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-xs text-tinta focus:border-marca focus:outline-none"
            >
              {todosPeriodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.anio})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-tinta">
              Fecha de Corte *
            </label>
            <input
              type="date"
              value={fechaCorte}
              min={periodoSeleccionado?.fechaInicio}
              max={periodoSeleccionado?.fechaFin}
              onChange={(e) => setFechaCorte(e.target.value)}
              className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-xs text-tinta focus:border-marca focus:outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-tinta">
            Saldo según Estado de Cuenta Bancario (Bs.) *
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={saldoBanco}
            onChange={(e) => setSaldoBanco(e.target.value)}
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 font-mono text-sm text-tinta focus:border-marca focus:outline-none"
            required
          />
          <p className="mt-1 text-[11px] text-pizarra">
            Saldo final que reporta el banco en el estado de cuenta a la fecha de corte.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-tinta">
            Observaciones o Notas
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ejemplo: Conciliación regular mensual Banesco cuenta corriente..."
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-xs text-tinta focus:border-marca focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-linea">
          <Button type="button" variante="plano" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={iniciar.isPending}>
            {iniciar.isPending ? 'Iniciando…' : 'Iniciar Conciliación'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
