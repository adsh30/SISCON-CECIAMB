import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { hoyCaracas } from '../../lib/series.js'

export const POR_PAGINA = [10, 25, 50, 100]
const POR_PAGINA_INICIAL = 25

const dos = (n) => String(n).padStart(2, '0')

/** Primer y último día del mes en curso (Caracas) */
export function mesEnCurso(hoy = hoyCaracas()) {
  const [anio, mes] = hoy.split('-').map(Number)
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  return { desde: `${anio}-${dos(mes)}-01`, hasta: `${anio}-${dos(mes)}-${dos(ultimo)}` }
}

/**
 * Filtros del libro guardados en la dirección: se conservan al recargar, al volver de un
 * comprobante y al abrir la impresión. Sin fechas, el libro muestra el mes en curso.
 */
export function useFiltrosLibro(claves) {
  const [params, setParams] = useSearchParams()
  const [inicial] = useState(mesEnCurso)
  const filtros = Object.fromEntries(claves.map((k) => [k, params.get(k) ?? '']))
  filtros.desde ||= inicial.desde
  filtros.hasta ||= inicial.hasta
  filtros.pagina = Number(params.get('pagina')) || 1
  filtros.porPagina = POR_PAGINA.includes(Number(params.get('porPagina')))
    ? Number(params.get('porPagina'))
    : POR_PAGINA_INICIAL

  const cambiar = (cambios, { conservarPagina = false } = {}) => {
    const nuevo = { ...filtros, ...cambios }
    if (!conservarPagina) nuevo.pagina = 1
    setParams(
      Object.fromEntries(
        Object.entries(nuevo).filter(
          ([k, v]) =>
            v !== '' &&
            v != null &&
            !(k === 'pagina' && v === 1) &&
            !(k === 'porPagina' && v === POR_PAGINA_INICIAL),
        ),
      ),
      { replace: true },
    )
  }
  return [filtros, cambiar]
}

/** Saldo con signo: negativo = saldo contrario a la naturaleza de la cuenta */
export const esNegativo = (monto) => String(monto).startsWith('-')
