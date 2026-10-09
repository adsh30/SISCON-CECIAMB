import { useLayoutEffect, useRef, useState } from 'react'
import { formatoMonto } from '../../lib/formato.js'
import { montoEditable, parsearMonto } from '../../lib/comprobantes.js'
import { bordeCampo, claseCampo } from './clasesCampo.js'

/**
 * Monto en bolívares. Muestra 1.234.567,89 y al editar acepta 1234,56 o 1234.56.
 * `value` y `onChange` usan el formato del servidor ('1234.56' o '').
 */
export function MontoInput({ value, onChange, error, className = '', ...props }) {
  const [texto, setTexto] = useState(null) // null = no se está editando
  const ref = useRef(null)
  const recienEnfocado = useRef(false)

  // Al entrar se selecciona todo para reemplazarlo. Va en un efecto de diseño, antes de que el
  // navegador procese la tecla siguiente: con un retraso, quien escribe rápido perdía cifras.
  useLayoutEffect(() => {
    if (recienEnfocado.current && texto !== null) {
      recienEnfocado.current = false
      ref.current?.select()
    }
  }, [texto])
  const invalido = texto !== null && parsearMonto(texto) === null

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={texto ?? (value && Number(value) !== 0 ? formatoMonto(value) : '')}
      placeholder="0,00"
      aria-invalid={invalido || error ? true : undefined}
      ref={ref}
      onFocus={() => {
        recienEnfocado.current = Number(value) !== 0 // con el campo vacío no hay nada que seleccionar
        setTexto(Number(value) ? montoEditable(value) : '')
      }}
      onChange={(e) => {
        setTexto(e.target.value)
        const m = parsearMonto(e.target.value)
        if (m !== null) onChange(m)
      }}
      onBlur={() => {
        if (!invalido) setTexto(null)
      }}
      className={`${claseCampo} ${bordeCampo(invalido || error)} cifras text-right ${className}`}
      {...props}
    />
  )
}
