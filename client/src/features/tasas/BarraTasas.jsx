import { useEffect, useRef, useState } from 'react'
import { useTasas } from '../../api/tasas.js'
import {
  formatoFechaCorta,
  formatoHoraCaracas,
  formatoMonto,
  formatoPorcentaje,
} from '../../lib/formato.js'
import { ConversorTasas } from './ConversorTasas.jsx'

// Reloj con la hora oficial de Venezuela (Caracas, UTC−4), en formato de 12 h
function HoraCaracas() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <time
      dateTime={ahora.toISOString()}
      title="Hora de Caracas, Venezuela"
      className="hidden text-xs text-pizarra md:inline"
    >
      {formatoHoraCaracas(ahora)} <span className="font-semibold">CCS</span>
    </time>
  )
}

// Margen de ahorro pagando a tasa BCV en vez de Binance: (BIN − BCV) ÷ BIN × 100
function Margen({ valor }) {
  if (valor == null) return null
  return (
    <span
      className={`hidden sm:inline ${Number(valor) > 0 ? 'text-exito' : 'text-pizarra'}`}
      title="Margen de ahorro pagando a tasa BCV en vez de Binance"
    >
      ↓{formatoPorcentaje(valor)}
    </span>
  )
}

export function BarraTasas() {
  const { data, isPending, isError } = useTasas()
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !contenedor.current?.contains(e.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', cerrar)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', cerrar)
    }
  }, [abierto])

  if (isPending) {
    return (
      <span className="h-9 w-80 animate-pulse rounded-full bg-papel" aria-label="Cargando tasas" />
    )
  }
  if (isError || (!data?.bcv && !data?.binance)) {
    return (
      <span className="rounded-full border border-linea px-4 py-2 text-sm text-pizarra">
        Tasas no disponibles
      </span>
    )
  }

  const { bcv, binance, brecha, avisos } = data

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        title="Tasas de referencia en bolívares. Haga clic para convertir montos"
        className="cifras inline-flex items-center gap-x-3 rounded-lg border border-linea bg-papel px-3 py-2 text-sm whitespace-nowrap transition-colors hover:border-marca/40"
      >
        {bcv && (
          <span className="inline-flex items-center gap-2">
            <span className="font-semibold text-marca">BCV</span>
            <span>$ {formatoMonto(bcv.usd)}</span>
            {bcv.eur && <span className="hidden lg:inline">€ {formatoMonto(bcv.eur)}</span>}
          </span>
        )}
        {bcv && binance && (
          <span className="hidden h-4 w-px bg-linea sm:inline-block" aria-hidden="true" />
        )}
        {binance && (
          <span className="hidden items-center gap-2 sm:inline-flex">
            <span className="font-semibold text-acento">BIN</span>
            <span>Bs {formatoMonto(binance.usdt)}</span>
            <Margen valor={brecha} />
          </span>
        )}
        <span className="hidden text-xs text-pizarra lg:inline">
          {formatoFechaCorta(bcv?.fecha ?? binance?.fecha)}
        </span>
        <HoraCaracas />
        {avisos?.length > 0 && (
          <span className="size-2 rounded-full bg-aviso" title={avisos.join('\n')} />
        )}
      </button>

      {abierto && <ConversorTasas tasas={data} />}
    </div>
  )
}
