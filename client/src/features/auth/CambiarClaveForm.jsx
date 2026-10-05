import { useState } from 'react'
import { useCambiarClave } from '../../api/auth.js'
import { Button } from '../../components/ui/Button.jsx'
import { Campo } from '../../components/ui/Formulario.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'

const REGLAS = [
  { texto: 'Al menos 8 caracteres', ok: (c) => c.length >= 8 },
  { texto: 'Al menos una letra', ok: (c) => /[A-Za-z]/.test(c) },
  { texto: 'Al menos un número', ok: (c) => /[0-9]/.test(c) },
]

/** Formulario de cambio de clave con validación en vivo. */
export function CambiarClaveForm({ onListo, textoBoton = 'Cambiar clave' }) {
  const cambiar = useCambiarClave()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')

  const reglasOk = REGLAS.every((r) => r.ok(nueva))
  const coinciden = confirmacion.length > 0 && nueva === confirmacion
  const errorDe = (campo) => cambiar.error?.details?.find((d) => d.campo === campo)?.mensaje

  const enviar = (e) => {
    e.preventDefault()
    cambiar.mutate({ actual, nueva, confirmacion }, { onSuccess: onListo })
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <Campo
        etiqueta="Clave actual"
        id="clave-actual"
        error={errorDe('actual')}
        ayuda="Si es su primer ingreso, es la clave temporal que le entregaron."
      >
        <input
          id="clave-actual"
          type="password"
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          className={`${claseCampo} ${errorDe('actual') ? 'border-alerta' : 'border-linea'}`}
        />
      </Campo>
      <Campo etiqueta="Clave nueva" id="clave-nueva" error={errorDe('nueva')}>
        <input
          id="clave-nueva"
          type="password"
          autoComplete="new-password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          className={`${claseCampo} ${errorDe('nueva') ? 'border-alerta' : 'border-linea'}`}
        />
      </Campo>
      <ul className="space-y-1 text-sm">
        {REGLAS.map((r) => (
          <li key={r.texto} className={r.ok(nueva) ? 'text-exito' : 'text-pizarra'}>
            {r.ok(nueva) ? '✓' : '○'} {r.texto}
          </li>
        ))}
      </ul>
      <Campo
        etiqueta="Repita la clave nueva"
        id="clave-confirmacion"
        error={confirmacion && !coinciden ? 'Las claves no coinciden' : errorDe('confirmacion')}
      >
        <input
          id="clave-confirmacion"
          type="password"
          autoComplete="new-password"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          className={`${claseCampo} ${confirmacion && !coinciden ? 'border-alerta' : 'border-linea'}`}
        />
      </Campo>
      {cambiar.isError && !cambiar.error.details?.length && (
        <p className="rounded-lg bg-alerta-claro px-3 py-2 text-sm text-alerta">
          {cambiar.error.message}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={!actual || !reglasOk || !coinciden || cambiar.isPending}
      >
        {cambiar.isPending ? 'Guardando…' : textoBoton}
      </Button>
    </form>
  )
}
