import { useEffect, useRef, useState } from 'react'
import { useTasas } from '../../api/tasas.js'
import { formatoFechaCorta, formatoMonto, formatoPorcentaje } from '../../lib/formato.js'
import { ConversorTasas } from './ConversorTasas.jsx'

function Brecha({ valor }) {
  if (valor == null) return null
  const sube = Number(valor) >= 0
  return (
    <span
      className={sube ? 'text-marca' : 'text-alerta'}
      title="Diferencia de Binance respecto a la tasa oficial del BCV"
    >
      <span aria-hidden="true">{sube ? '↓' : '↑'}</span>
      {formatoPorcentaje(Math.abs(Number(valor)))}
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
        className="cifras inline-flex items-center gap-x-3 rounded-full border border-linea bg-papel px-4 py-2 text-sm whitespace-nowrap transition-colors hover:border-marca/40"
      >
        {bcv && (
          <span className="inline-flex items-center gap-2">
            <span className="font-semibold text-marca">BCV</span>
            <span>$ {formatoMonto(bcv.usd)}</span>
            {bcv.eur && <span className="hidden lg:inline">€ {formatoMonto(bcv.eur)}</span>}
          </span>
        )}
        {bcv && binance && <span className="h-4 w-px bg-linea" aria-hidden="true" />}
        {binance && (
          <span className="inline-flex items-center gap-2">
            <span className="font-semibold text-acento">BIN</span>
            <span>Bs {formatoMonto(binance.usdt)}</span>
            <Brecha valor={brecha} />
          </span>
        )}
        <span className="hidden text-xs text-pizarra xl:inline">
          {formatoFechaCorta(bcv?.fecha ?? binance?.fecha)}
        </span>
        {avisos?.length > 0 && (
          <span className="size-2 rounded-full bg-aviso" title={avisos.join('\n')} />
        )}
      </button>

      {abierto && <ConversorTasas tasas={data} />}
    </div>
  )
}
