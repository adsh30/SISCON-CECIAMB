import { useState } from 'react'
import { useSesion } from '../../api/auth.js'
import { useActualizarTasas } from '../../api/tasas.js'
import { formatoFecha, formatoHora, formatoMonto } from '../../lib/formato.js'
import { dividir, multiplicar } from '../../lib/money.js'

/** Acepta '1.234,56', '1234,56' o '1234.56' y devuelve '1234.56' (o null) */
function normalizarMonto(texto) {
  const limpio = texto.trim().replace(/\s/g, '')
  if (!limpio) return null
  const s = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio
  return /^\d+(\.\d+)?$/.test(s) ? s : null
}

const ROLES_ACTUALIZAN = ['ADMIN', 'CONTADOR']

export function ConversorTasas({ tasas }) {
  const { data: usuario } = useSesion()
  const actualizar = useActualizarTasas()
  const opciones = [
    tasas.bcv && { id: 'usd', etiqueta: 'Dólar BCV', simbolo: '$', tasa: tasas.bcv.usd },
    tasas.bcv?.eur && { id: 'eur', etiqueta: 'Euro BCV', simbolo: '€', tasa: tasas.bcv.eur },
    tasas.binance && {
      id: 'bin',
      etiqueta: 'Binance (USDT)',
      simbolo: '$',
      tasa: tasas.binance.usdt,
    },
  ].filter(Boolean)

  const [monedaId, setMonedaId] = useState(opciones[0]?.id)
  const [haciaBs, setHaciaBs] = useState(true)
  const [texto, setTexto] = useState('1')

  const moneda = opciones.find((o) => o.id === monedaId) ?? opciones[0]
  const monto = normalizarMonto(texto)
  const resultado =
    monto && moneda
      ? haciaBs
        ? multiplicar(monto, moneda.tasa)
        : dividir(monto, moneda.tasa)
      : null
  const [origen, destino] = haciaBs ? [moneda?.simbolo, 'Bs'] : ['Bs', moneda?.simbolo]

  const campo =
    'block w-full rounded-lg border border-linea bg-white px-3 py-2 focus:border-marca focus:ring-3 focus:ring-marca/15 focus:outline-none'

  return (
    <div
      role="dialog"
      aria-label="Conversor de tasas"
      className="absolute right-0 z-20 mt-2 w-[22rem] rounded-2xl border border-linea bg-white p-5 shadow-xl shadow-tinta/10"
    >
      <h2 className="font-semibold">Conversor</h2>

      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-2">
        <label className="text-sm">
          <span className="text-pizarra">Monto en {origen}</span>
          <input
            inputMode="decimal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`cifras mt-1 ${campo}`}
            autoFocus
          />
        </label>
        <button
          type="button"
          onClick={() => setHaciaBs((v) => !v)}
          className="rounded-lg border border-linea px-3 py-2 text-sm hover:bg-marca-claro/60"
          title="Invertir conversión"
        >
          ⇄
        </button>
      </div>

      <label className="mt-3 block text-sm">
        <span className="text-pizarra">Tasa</span>
        <select
          value={moneda?.id}
          onChange={(e) => setMonedaId(e.target.value)}
          className={`mt-1 ${campo}`}
        >
          {opciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.etiqueta}: Bs {formatoMonto(o.tasa)}
            </option>
          ))}
        </select>
      </label>

      <output className="cifras mt-4 block rounded-xl bg-marca-claro px-4 py-3">
        <span className="block text-sm text-pizarra">Equivale a</span>
        <span className="block text-2xl font-semibold text-marca-oscuro">
          {resultado ? `${destino} ${formatoMonto(resultado)}` : '—'}
        </span>
        {texto && !monto && (
          <span className="text-sm text-alerta">Escriba un monto válido, por ejemplo 1.250,50</span>
        )}
      </output>

      <div className="mt-4 space-y-1 border-t border-linea pt-3 text-xs text-pizarra">
        {tasas.bcv && (
          <p>
            BCV vigente para el {formatoFecha(tasas.bcv.fecha)}, consultada a las{' '}
            {formatoHora(tasas.bcv.obtenidaEn)}
          </p>
        )}
        {tasas.binance && (
          <p>Binance P2P consultada a las {formatoHora(tasas.binance.obtenidaEn)}</p>
        )}
        {tasas.avisos?.map((a) => (
          <p key={a} className="text-aviso">
            {a}
          </p>
        ))}
      </div>

      {ROLES_ACTUALIZAN.includes(usuario?.rol) && (
        <button
          type="button"
          onClick={() => actualizar.mutate()}
          disabled={actualizar.isPending}
          className="mt-3 text-sm font-semibold text-marca hover:text-marca-oscuro disabled:text-pizarra"
        >
          {actualizar.isPending ? 'Consultando tasas…' : 'Actualizar tasas ahora'}
        </button>
      )}
      {actualizar.isError && <p className="mt-1 text-sm text-alerta">{actualizar.error.message}</p>}
    </div>
  )
}
