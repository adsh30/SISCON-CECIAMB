import { useState } from 'react'
import { Link } from 'react-router'
import {
  useCrearCliente,
  useCrearCobro,
  useCrearFactura,
  useCxcAntiguedad,
  useCxcClientes,
  useCxcCobros,
  useCxcFacturas,
  useCxcKpis,
} from '../../api/cxc.js'
import { Button } from '../../components/ui/Button.jsx'
import { Campo, Insignia } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { formatoFecha, formatoMonto } from '../../lib/formato.js'

const SERVICIOS_CLINICOS = [
  'HOSPITALIZACION',
  'QUIROFANO',
  'EMERGENCIA',
  'CONSULTA',
  'LABORATORIO',
  'IMAGENOLOGIA',
  'FARMACIA',
]

const FORMAS_PAGO = [
  { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia Bancaria' },
  { valor: 'PUNTO_VENTA', etiqueta: 'Punto de Venta (Tarjeta)' },
  { valor: 'PAGO_MOVIL', etiqueta: 'Pago Móvil C2P / P2P' },
  { valor: 'EFECTIVO_USD', etiqueta: 'Efectivo Divisas ($/€)' },
  { valor: 'EFECTIVO_VES', etiqueta: 'Efectivo Bolívares' },
  { valor: 'RETENCION_IVA', etiqueta: 'Retención IVA Soportada (SENIAT)' },
  { valor: 'RETENCION_ISLR', etiqueta: 'Retención ISLR Soportada' },
]

export default function CxcPage() {
  const [pestana, setPestana] = useState('facturas')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Modales
  const [modalFactura, setModalFactura] = useState(false)
  const [modalCobro, setModalCobro] = useState(false)
  const [modalCliente, setModalCliente] = useState(false)

  // Consultas
  const { data: kpis } = useCxcKpis()
  const { data: facturas, isLoading: cargandoFacturas } = useCxcFacturas({
    estado: filtroEstado || undefined,
    busqueda: busqueda || undefined,
  })
  const { data: antiguedad, isLoading: cargandoAntiguedad } = useCxcAntiguedad()
  const { data: cobros, isLoading: cargandoCobros } = useCxcCobros()
  const { data: clientes } = useCxcClientes()

  // Mutaciones
  const crearFacturaMutation = useCrearFactura()
  const crearCobroMutation = useCrearCobro()
  const crearClienteMutation = useCrearCliente()

  // Formulario Factura
  const [formFac, setFormFac] = useState(() => ({
    numeroFactura: '',
    numeroControl: '',
    clienteId: '',
    pacienteNombre: '',
    pacienteCedula: '',
    historiaMedica: '',
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaVencimiento: '',
    servicioDepartamento: 'HOSPITALIZACION',
    alicuotaIva: 16,
    generarComprobante: true,
    items: [{ descripcion: 'Atención médica y servicios hospitalarios', cantidad: 1, precioUnitario: '', exento: false }],
  }))

  // Formulario Cobro
  const [formCobro, setFormCobro] = useState(() => ({
    numeroRecibo: '',
    clienteId: '',
    facturaId: '',
    fechaCobro: new Date().toISOString().slice(0, 10),
    formaPago: 'TRANSFERENCIA',
    referencia: '',
    monto: '',
    generarComprobante: true,
  }))

  // Formulario Cliente
  const [formCli, setFormCli] = useState({
    tipoPersona: 'JURIDICA',
    tipoDocumento: 'J',
    identificacion: '',
    razonSocial: '',
    nombreComercial: '',
    categoria: 'ASEGURADORA',
    telefono: '',
    email: '',
    diasCredito: 30,
    limiteCredito: 0,
  })

  // Handlers Factura
  const agregarItem = () => {
    setFormFac((prev) => ({
      ...prev,
      items: [...prev.items, { descripcion: '', cantidad: 1, precioUnitario: '', exento: false }],
    }))
  }

  const actualizarItem = (idx, campo, val) => {
    setFormFac((prev) => {
      const items = [...prev.items]
      items[idx] = { ...items[idx], [campo]: val }
      return { ...prev, items }
    })
  }

  const eliminarItem = (idx) => {
    setFormFac((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }))
  }

  const submitFactura = async (e) => {
    e.preventDefault()
    if (!formFac.clienteId || !formFac.numeroFactura) return
    try {
      await crearFacturaMutation.mutateAsync({
        ...formFac,
        clienteId: Number(formFac.clienteId),
        alicuotaIva: Number(formFac.alicuotaIva),
        items: formFac.items.map((it) => ({
          descripcion: it.descripcion,
          cantidad: Number(it.cantidad || 1),
          precioUnitario: Number(it.precioUnitario || 0),
          exento: Boolean(it.exento),
        })),
      })
      setModalFactura(false)
      setFormFac({
        numeroFactura: '',
        numeroControl: '',
        clienteId: '',
        pacienteNombre: '',
        pacienteCedula: '',
        historiaMedica: '',
        fechaEmision: new Date().toISOString().slice(0, 10),
        fechaVencimiento: '',
        servicioDepartamento: 'HOSPITALIZACION',
        alicuotaIva: 16,
        generarComprobante: true,
        items: [{ descripcion: 'Atención médica y servicios hospitalarios', cantidad: 1, precioUnitario: '', exento: false }],
      })
    } catch (err) {
      alert(err.message || 'Error al crear factura')
    }
  }

  // Handlers Cobro
  const submitCobro = async (e) => {
    e.preventDefault()
    if (!formCobro.facturaId || !formCobro.monto) return
    try {
      await crearCobroMutation.mutateAsync({
        ...formCobro,
        clienteId: Number(formCobro.clienteId),
        facturaId: Number(formCobro.facturaId),
        monto: Number(formCobro.monto),
      })
      setModalCobro(false)
      setFormCobro({
        numeroRecibo: '',
        clienteId: '',
        facturaId: '',
        fechaCobro: new Date().toISOString().slice(0, 10),
        formaPago: 'TRANSFERENCIA',
        referencia: '',
        monto: '',
        generarComprobante: true,
      })
    } catch (err) {
      alert(err.message || 'Error al registrar cobro')
    }
  }

  // Handlers Cliente
  const submitCliente = async (e) => {
    e.preventDefault()
    if (!formCli.identificacion || !formCli.razonSocial) return
    try {
      await crearClienteMutation.mutateAsync({
        ...formCli,
        diasCredito: Number(formCli.diasCredito || 0),
        limiteCredito: Number(formCli.limiteCredito || 0),
      })
      setModalCliente(false)
      setFormCli({
        tipoPersona: 'JURIDICA',
        tipoDocumento: 'J',
        identificacion: '',
        razonSocial: '',
        nombreComercial: '',
        categoria: 'ASEGURADORA',
        telefono: '',
        email: '',
        diasCredito: 30,
        limiteCredito: 0,
      })
    } catch (err) {
      alert(err.message || 'Error al registrar cliente')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-marca/10 px-3 py-1 text-xs font-semibold text-marca">
            <Icono nombre="cxc" className="size-3.5" />
            Fase 9 — Tesorería y Cobranzas
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-tinta md:text-3xl">
            Cuentas por Cobrar (CxC Hospitalaria)
          </h1>
          <p className="text-xs md:text-sm text-pizarra">
            Control integral de aseguradoras, pacientes, facturación asistencial y conciliación de cobranzas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variante="secundario" onClick={() => setModalCliente(true)}>
            <Icono nombre="usuarios" className="size-4" />
            <span>Aseguradora / Cliente</span>
          </Button>
          <Button variante="secundario" onClick={() => setModalCobro(true)}>
            <Icono nombre="mas" className="size-4" />
            <span>Registrar Cobro</span>
          </Button>
          <Button variante="primario" onClick={() => setModalFactura(true)}>
            <Icono nombre="cxc" className="size-4" />
            <span>Nueva Factura</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI de Cartera */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-linea bg-superficie p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-pizarra">Cartera Total Pendiente</span>
          <div className="mt-2 text-2xl font-black text-tinta">
            {formatoMonto(kpis?.saldoPendiente || 0)} <span className="text-xs font-normal text-pizarra">Bs</span>
          </div>
          <span className="mt-1 block text-xs text-pizarra">
            {kpis?.facturasPendientes || 0} facturas por conciliar
          </span>
        </div>

        <div className="rounded-2xl border border-linea bg-superficie p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-pizarra">Saldo Corriente (En plazo)</span>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatoMonto(kpis?.saldoCorriente || 0)} <span className="text-xs font-normal text-pizarra">Bs</span>
          </div>
          <span className="mt-1 block text-xs text-pizarra">Dentro del límite pactado</span>
        </div>

        <div className="rounded-2xl border border-linea bg-superficie p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-pizarra">Saldo Vencido</span>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatoMonto(kpis?.saldoVencido || 0)} <span className="text-xs font-normal text-pizarra">Bs</span>
          </div>
          <span className="mt-1 block text-xs text-pizarra">Exige gestión de cobro</span>
        </div>

        <div className="rounded-2xl border border-linea bg-superficie p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-pizarra">Aseguradoras y Pacientes</span>
          <div className="mt-2 text-2xl font-black text-marca">{kpis?.clientesActivos || 0}</div>
          <span className="mt-1 block text-xs text-pizarra">Convenios activos en clínica</span>
        </div>
      </div>

      {/* Pestañas de navegación */}
      <div className="flex border-b border-linea">
        <button
          onClick={() => setPestana('facturas')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            pestana === 'facturas'
              ? 'border-marca text-marca'
              : 'border-transparent text-pizarra hover:text-tinta'
          }`}
        >
          <Icono nombre="cxc" className="size-4" />
          <span>Facturación Asistencial</span>
        </button>

        <button
          onClick={() => setPestana('antiguedad')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            pestana === 'antiguedad'
              ? 'border-marca text-marca'
              : 'border-transparent text-pizarra hover:text-tinta'
          }`}
        >
          <Icono nombre="tendencia" className="size-4" />
          <span>Antigüedad de Saldos (Aging)</span>
        </button>

        <button
          onClick={() => setPestana('cobros')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            pestana === 'cobros'
              ? 'border-marca text-marca'
              : 'border-transparent text-pizarra hover:text-tinta'
          }`}
        >
          <Icono nombre="comprobantes" className="size-4" />
          <span>Recibos y Cobranzas</span>
        </button>

        <button
          onClick={() => setPestana('clientes')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            pestana === 'clientes'
              ? 'border-marca text-marca'
              : 'border-transparent text-pizarra hover:text-tinta'
          }`}
        >
          <Icono nombre="usuarios" className="size-4" />
          <span>Aseguradoras y Clientes</span>
        </button>
      </div>

      {/* PESTAÑA: FACTURAS */}
      {pestana === 'facturas' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="rounded-xl border border-linea bg-superficie px-3 py-1.5 text-xs text-tinta"
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="COBRADA_PARCIAL">Cobrada Parcial</option>
                <option value="COBRADA_TOTAL">Cobrada Total</option>
                <option value="ANULADA">Anuladas</option>
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar factura, aseguradora o paciente…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-linea bg-superficie px-3 py-1.5 pl-9 text-xs text-tinta"
              />
              <Icono nombre="buscar" className="absolute left-2.5 top-2 size-4 text-pizarra" />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-linea bg-superficie shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-linea bg-superficie-2/50 text-xs font-semibold uppercase text-pizarra">
                <tr>
                  <th className="px-4 py-3">Factura / Control</th>
                  <th className="px-4 py-3">Emisión / Venc.</th>
                  <th className="px-4 py-3">Aseguradora / Cliente</th>
                  <th className="px-4 py-3">Paciente / Servicio</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Saldo Pendiente</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea/60 text-xs">
                {cargandoFacturas ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-pizarra">
                      Cargando facturas hospitalarias…
                    </td>
                  </tr>
                ) : !facturas || facturas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-pizarra">
                      No se encontraron facturas registradas.
                    </td>
                  </tr>
                ) : (
                  facturas.map((f) => (
                    <tr key={f.id} className="hover:bg-superficie-2/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-tinta">
                        <div>{f.numero_factura}</div>
                        {f.numero_control && (
                          <div className="text-[11px] font-normal text-pizarra">Ctrl: {f.numero_control}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-pizarra">
                        <div>{formatoFecha(f.fecha_emision)}</div>
                        <div className="text-[11px]">Vence: {formatoFecha(f.fecha_vencimiento)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-tinta">{f.cliente_nombre}</div>
                        <div className="text-[11px] text-pizarra">
                          {f.cliente_tipo_doc}-{f.cliente_identificacion}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-tinta">{f.paciente_nombre || '—'}</div>
                        <div className="text-[11px] font-medium text-marca">{f.servicio_departamento}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-tinta">
                        {formatoMonto(f.total)} Bs
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={Number(f.saldo_pendiente) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}>
                          {formatoMonto(f.saldo_pendiente)} Bs
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Insignia
                          tono={
                            f.estado === 'COBRADA_TOTAL'
                              ? 'exito'
                              : f.estado === 'COBRADA_PARCIAL'
                                ? 'marca'
                                : f.estado === 'ANULADA'
                                  ? 'alerta'
                                  : 'aviso'
                          }
                        >
                          {f.estado}
                        </Insignia>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {f.comprobante_codigo ? (
                          <Link
                            to={`/app/comprobantes/${f.comprobante_id}`}
                            className="font-mono text-xs font-semibold text-marca hover:underline"
                          >
                            {f.comprobante_codigo}
                          </Link>
                        ) : (
                          <span className="text-pizarra/50">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: ANTIGÜEDAD DE SALDOS */}
      {pestana === 'antiguedad' && (
        <div className="overflow-hidden rounded-2xl border border-linea bg-superficie shadow-xs">
          <div className="border-b border-linea bg-superficie-2/50 px-5 py-3.5">
            <h2 className="text-sm font-bold text-tinta">Reporte de Antigüedad de Saldos por Aseguradora (Aging)</h2>
            <p className="text-xs text-pizarra">Clasificación de cuentas por cobrar según días de vencimiento contable.</p>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linea bg-superficie-2/30 text-xs font-semibold uppercase text-pizarra">
              <tr>
                <th className="px-4 py-3">Aseguradora / Cliente</th>
                <th className="px-4 py-3 text-center">Facturas</th>
                <th className="px-4 py-3 text-right">Corriente</th>
                <th className="px-4 py-3 text-right">1-30 Días</th>
                <th className="px-4 py-3 text-right">31-60 Días</th>
                <th className="px-4 py-3 text-right">61-90 Días</th>
                <th className="px-4 py-3 text-right">+90 Días</th>
                <th className="px-4 py-3 text-right">Total Deuda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea/60 text-xs">
              {cargandoAntiguedad ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-pizarra">
                    Calculando envejecimiento de cartera…
                  </td>
                </tr>
              ) : !antiguedad || antiguedad.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-pizarra">
                    No hay saldos pendientes en cartera actualmente.
                  </td>
                </tr>
              ) : (
                antiguedad.map((row) => (
                  <tr key={row.cliente_id} className="hover:bg-superficie-2/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-tinta">
                      {row.razon_social}
                      <span className="ml-2 font-normal text-pizarra text-[11px]">
                        ({row.tipo_documento}-{row.identificacion})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{row.cantidad_facturas}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">
                      {formatoMonto(row.corriente)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-600">
                      {formatoMonto(row.dias_1_30)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600">
                      {formatoMonto(row.dias_31_60)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-500">
                      {formatoMonto(row.dias_61_90)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-700 dark:text-rose-400">
                      {formatoMonto(row.mas_90_dias)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-tinta">
                      {formatoMonto(row.total_deuda)} Bs
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PESTAÑA: COBROS */}
      {pestana === 'cobros' && (
        <div className="overflow-hidden rounded-2xl border border-linea bg-superficie shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linea bg-superficie-2/50 text-xs font-semibold uppercase text-pizarra">
              <tr>
                <th className="px-4 py-3">Recibo</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente / Aseguradora</th>
                <th className="px-4 py-3">Factura Aplicada</th>
                <th className="px-4 py-3">Forma de Pago</th>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3 text-right">Monto Cobrado</th>
                <th className="px-4 py-3 text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea/60 text-xs">
              {cargandoCobros ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-pizarra">
                    Cargando recibos de cobro…
                  </td>
                </tr>
              ) : !cobros || cobros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-pizarra">
                    No hay recibos de cobro registrados.
                  </td>
                </tr>
              ) : (
                cobros.map((cb) => (
                  <tr key={cb.id} className="hover:bg-superficie-2/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-tinta">{cb.numero_recibo}</td>
                    <td className="px-4 py-3 text-pizarra">{formatoFecha(cb.fecha_cobro)}</td>
                    <td className="px-4 py-3 font-semibold text-tinta">{cb.cliente_nombre}</td>
                    <td className="px-4 py-3 font-mono text-marca">{cb.numero_factura}</td>
                    <td className="px-4 py-3 text-pizarra">{cb.forma_pago}</td>
                    <td className="px-4 py-3 font-mono text-pizarra">{cb.referencia || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                      {formatoMonto(cb.monto)} Bs
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cb.comprobante_codigo ? (
                        <Link
                          to={`/app/comprobantes/${cb.comprobante_id}`}
                          className="font-mono text-xs font-semibold text-marca hover:underline"
                        >
                          {cb.comprobante_codigo}
                        </Link>
                      ) : (
                        <span className="text-pizarra/50">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PESTAÑA: CLIENTES Y ASEGURADORAS */}
      {pestana === 'clientes' && (
        <div className="overflow-hidden rounded-2xl border border-linea bg-superficie shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linea bg-superficie-2/50 text-xs font-semibold uppercase text-pizarra">
              <tr>
                <th className="px-4 py-3">Razón Social / Nombre</th>
                <th className="px-4 py-3">RIF / Cédula</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-center">Días Crédito</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3 text-right">Saldo Actual</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea/60 text-xs">
              {!clientes || clientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-pizarra">
                    No hay clientes registrados.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-superficie-2/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-tinta">
                      <div>{c.razon_social}</div>
                      {c.nombre_comercial && (
                        <div className="text-[11px] font-normal text-pizarra">{c.nombre_comercial}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-pizarra">
                      {c.tipo_documento}-{c.identificacion}
                    </td>
                    <td className="px-4 py-3">
                      <Insignia tono={c.categoria === 'ASEGURADORA' ? 'marca' : 'exito'}>
                        {c.categoria}
                      </Insignia>
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{c.dias_credito} días</td>
                    <td className="px-4 py-3 text-pizarra">
                      <div>{c.telefono || '—'}</div>
                      <div className="text-[11px]">{c.email || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-tinta">
                      {formatoMonto(c.saldo_total || 0)} Bs
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Insignia tono={c.activo ? 'exito' : 'alerta'}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </Insignia>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: NUEVA FACTURA HOSPITALARIA */}
      {modalFactura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl border border-linea bg-superficie p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-linea pb-3">
              <div>
                <h3 className="text-lg font-bold text-tinta">Emitir Factura de Servicios Clínicos</h3>
                <p className="text-xs text-pizarra">Genera comprobante contable automático en partida doble.</p>
              </div>
              <button onClick={() => setModalFactura(false)} className="text-pizarra hover:text-tinta">
                <Icono nombre="cerrar" className="size-5" />
              </button>
            </div>

            <form onSubmit={submitFactura} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Campo label="Número de Factura *">
                  <input
                    type="text"
                    required
                    placeholder="FAC-000123"
                    value={formFac.numeroFactura}
                    onChange={(e) => setFormFac({ ...formFac, numeroFactura: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>
                <Campo label="Número de Control (Fiscal)">
                  <input
                    type="text"
                    placeholder="00-009941"
                    value={formFac.numeroControl}
                    onChange={(e) => setFormFac({ ...formFac, numeroControl: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>
                <Campo label="Aseguradora / Cliente *">
                  <select
                    required
                    value={formFac.clienteId}
                    onChange={(e) => setFormFac({ ...formFac, clienteId: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  >
                    <option value="">Seleccione cliente…</option>
                    {clientes?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razon_social} ({c.dias_credito} días)
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Campo label="Nombre del Paciente">
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={formFac.pacienteNombre}
                    onChange={(e) => setFormFac({ ...formFac, pacienteNombre: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>
                <Campo label="Cédula Paciente">
                  <input
                    type="text"
                    placeholder="V-12345678"
                    value={formFac.pacienteCedula}
                    onChange={(e) => setFormFac({ ...formFac, pacienteCedula: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>
                <Campo label="Departamento / Servicio Clínico">
                  <select
                    value={formFac.servicioDepartamento}
                    onChange={(e) => setFormFac({ ...formFac, servicioDepartamento: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  >
                    {SERVICIOS_CLINICOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="Fecha Emisión *">
                  <input
                    type="date"
                    required
                    value={formFac.fechaEmision}
                    onChange={(e) => setFormFac({ ...formFac, fechaEmision: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>
                <Campo label="Fecha Vencimiento (opcional)">
                  <input
                    type="date"
                    value={formFac.fechaVencimiento}
                    onChange={(e) => setFormFac({ ...formFac, fechaVencimiento: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>
              </div>

              {/* Renglones */}
              <div className="space-y-2 border-t border-linea pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-tinta">Servicios / Conceptos Facturados</span>
                  <button
                    type="button"
                    onClick={agregarItem}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-marca hover:underline cursor-pointer"
                  >
                    <Icono nombre="mas" className="size-3.5" />
                    <span>Agregar renglón</span>
                  </button>
                </div>

                {formFac.items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Descripción del procedimiento o insumo"
                      value={it.descripcion}
                      onChange={(e) => actualizarItem(idx, 'descripcion', e.target.value)}
                      className="flex-1 rounded-xl border border-linea bg-superficie-2 px-3 py-1.5 text-xs text-tinta"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={it.cantidad}
                      onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                      className="w-16 rounded-xl border border-linea bg-superficie-2 px-2 py-1.5 text-center text-xs text-tinta"
                    />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Precio Unitario"
                      value={it.precioUnitario}
                      onChange={(e) => actualizarItem(idx, 'precioUnitario', e.target.value)}
                      className="w-28 rounded-xl border border-linea bg-superficie-2 px-3 py-1.5 text-right text-xs text-tinta font-mono"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-pizarra cursor-pointer">
                      <input
                        type="checkbox"
                        checked={it.exento}
                        onChange={(e) => actualizarItem(idx, 'exento', e.target.checked)}
                        className="accent-marca rounded"
                      />
                      <span>Exento</span>
                    </label>
                    {formFac.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarItem(idx)}
                        className="text-pizarra hover:text-rose-600 p-1"
                      >
                        <Icono nombre="papelera" className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-linea pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-tinta font-medium">
                  <input
                    type="checkbox"
                    checked={formFac.generarComprobante}
                    onChange={(e) => setFormFac({ ...formFac, generarComprobante: e.target.checked })}
                    className="accent-marca rounded"
                  />
                  <span>Generar asiento contable automático (Ventas - Partida Doble)</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button variante="secundario" type="button" onClick={() => setModalFactura(false)}>
                    Cancelar
                  </Button>
                  <Button variante="primario" type="submit" disabled={crearFacturaMutation.isPending}>
                    {crearFacturaMutation.isPending ? 'Guardando…' : 'Emitir Factura'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR COBRO */}
      {modalCobro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-linea bg-superficie p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-linea pb-3">
              <div>
                <h3 className="text-lg font-bold text-tinta">Registrar Cobranza / Recibo</h3>
                <p className="text-xs text-pizarra">Aplica pago a factura y genera comprobante de ingreso.</p>
              </div>
              <button onClick={() => setModalCobro(false)} className="text-pizarra hover:text-tinta">
                <Icono nombre="cerrar" className="size-5" />
              </button>
            </div>

            <form onSubmit={submitCobro} className="mt-4 space-y-3 text-xs">
              <Campo label="Número de Recibo *">
                <input
                  type="text"
                  required
                  placeholder="REC-00045"
                  value={formCobro.numeroRecibo}
                  onChange={(e) => setFormCobro({ ...formCobro, numeroRecibo: e.target.value })}
                  className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                />
              </Campo>

              <Campo label="Factura a Cobrar *">
                <select
                  required
                  value={formCobro.facturaId}
                  onChange={(e) => {
                    const fid = e.target.value
                    const fac = facturas?.find((f) => String(f.id) === String(fid))
                    setFormCobro({
                      ...formCobro,
                      facturaId: fid,
                      clienteId: fac?.cliente_id || '',
                      monto: fac?.saldo_pendiente || '',
                    })
                  }}
                  className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                >
                  <option value="">Seleccione factura pendiente…</option>
                  {facturas
                    ?.filter((f) => ['PENDIENTE', 'COBRADA_PARCIAL'].includes(f.estado))
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.numero_factura} — {f.cliente_nombre} (Saldo: {formatoMonto(f.saldo_pendiente)} Bs)
                      </option>
                    ))}
                </select>
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Fecha Cobro *">
                  <input
                    type="date"
                    required
                    value={formCobro.fechaCobro}
                    onChange={(e) => setFormCobro({ ...formCobro, fechaCobro: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>

                <Campo label="Forma de Pago *">
                  <select
                    value={formCobro.formaPago}
                    onChange={(e) => setFormCobro({ ...formCobro, formaPago: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  >
                    {FORMAS_PAGO.map((fp) => (
                      <option key={fp.valor} value={fp.valor}>
                        {fp.etiqueta}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Referencia Bancaria / Operación">
                  <input
                    type="text"
                    placeholder="TRF-00123"
                    value={formCobro.referencia}
                    onChange={(e) => setFormCobro({ ...formCobro, referencia: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>

                <Campo label="Monto a Cobrar (Bs) *">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formCobro.monto}
                    onChange={(e) => setFormCobro({ ...formCobro, monto: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta font-mono font-bold"
                  />
                </Campo>
              </div>

              <div className="flex items-center justify-between border-t border-linea pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-tinta font-medium">
                  <input
                    type="checkbox"
                    checked={formCobro.generarComprobante}
                    onChange={(e) => setFormCobro({ ...formCobro, generarComprobante: e.target.checked })}
                    className="accent-marca rounded"
                  />
                  <span>Generar asiento de ingreso (Caja/Banco)</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button variante="secundario" type="button" onClick={() => setModalCobro(false)}>
                    Cancelar
                  </Button>
                  <Button variante="primario" type="submit" disabled={crearCobroMutation.isPending}>
                    {crearCobroMutation.isPending ? 'Guardando…' : 'Guardar Cobro'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA ASEGURADORA / CLIENTE */}
      {modalCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-linea bg-superficie p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-linea pb-3">
              <div>
                <h3 className="text-lg font-bold text-tinta">Registrar Aseguradora o Cliente</h3>
                <p className="text-xs text-pizarra">Configuración de términos de crédito y datos fiscales.</p>
              </div>
              <button onClick={() => setModalCliente(false)} className="text-pizarra hover:text-tinta">
                <Icono nombre="cerrar" className="size-5" />
              </button>
            </div>

            <form onSubmit={submitCliente} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <Campo label="Doc.">
                  <select
                    value={formCli.tipoDocumento}
                    onChange={(e) => setFormCli({ ...formCli, tipoDocumento: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  >
                    <option value="J">J (Jurídico)</option>
                    <option value="V">V (Venezolano)</option>
                    <option value="E">E (Extranjero)</option>
                    <option value="G">G (Gubernamental)</option>
                  </select>
                </Campo>

                <div className="col-span-2">
                  <Campo label="RIF / Identificación *">
                    <input
                      type="text"
                      required
                      placeholder="000123456"
                      value={formCli.identificacion}
                      onChange={(e) => setFormCli({ ...formCli, identificacion: e.target.value })}
                      className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta font-mono"
                    />
                  </Campo>
                </div>
              </div>

              <Campo label="Razón Social / Nombre Completo *">
                <input
                  type="text"
                  required
                  placeholder="Ej. Seguros Pirámide, C.A."
                  value={formCli.razonSocial}
                  onChange={(e) => setFormCli({ ...formCli, razonSocial: e.target.value })}
                  className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta font-medium"
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Categoría">
                  <select
                    value={formCli.categoria}
                    onChange={(e) => setFormCli({ ...formCli, categoria: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  >
                    <option value="ASEGURADORA">Aseguradora</option>
                    <option value="CORPORATIVO">Empresa / Corporativo</option>
                    <option value="PARTICULAR">Particular</option>
                    <option value="CONVENIO">Convenio Institucional</option>
                  </select>
                </Campo>

                <Campo label="Días de Crédito">
                  <input
                    type="number"
                    min="0"
                    placeholder="30"
                    value={formCli.diasCredito}
                    onChange={(e) => setFormCli({ ...formCli, diasCredito: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Teléfono">
                  <input
                    type="text"
                    placeholder="0212-1234567"
                    value={formCli.telefono}
                    onChange={(e) => setFormCli({ ...formCli, telefono: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>

                <Campo label="Correo Electrónico">
                  <input
                    type="email"
                    placeholder="facturacion@empresa.com"
                    value={formCli.email}
                    onChange={(e) => setFormCli({ ...formCli, email: e.target.value })}
                    className="w-full rounded-xl border border-linea bg-superficie-2 px-3 py-2 text-xs text-tinta"
                  />
                </Campo>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-linea pt-4">
                <Button variante="secundario" type="button" onClick={() => setModalCliente(false)}>
                  Cancelar
                </Button>
                <Button variante="primario" type="submit" disabled={crearClienteMutation.isPending}>
                  {crearClienteMutation.isPending ? 'Guardando…' : 'Registrar Cliente'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
