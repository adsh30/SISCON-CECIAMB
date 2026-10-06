import { useState } from 'react'
import { useCrearEjercicio } from '../../api/periodos.js'
import { Button } from '../../components/ui/Button.jsx'
import { Campo } from '../../components/ui/Formulario.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { MESES, periodosDe } from './periodosFechas.js'

export function NuevoEjercicioModal({ anioSugerido, mesSugerido, onClose, onCreado }) {
  const [anio, setAnio] = useState(String(anioSugerido))
  const [mesInicio, setMesInicio] = useState(mesSugerido)
  const crear = useCrearEjercicio()

  const anioNum = Number(anio)
  const valido = Number.isInteger(anioNum) && anioNum >= 2000 && anioNum <= 2100
  const vista = valido ? periodosDe(anioNum, mesInicio) : []

  const enviar = (e) => {
    e.preventDefault()
    if (!valido) return
    crear.mutate({ anio: anioNum, mesInicio }, { onSuccess: onCreado })
  }

  return (
    <Modal
      titulo="Nuevo ejercicio económico"
      descripcion="Se crean sus 12 períodos mensuales, todos abiertos."
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-ejercicio" disabled={!valido || crear.isPending}>
            {crear.isPending ? 'Creando…' : 'Crear ejercicio'}
          </Button>
        </>
      }
    >
      <form id="form-ejercicio" onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Año"
          id="ejercicio-anio"
          error={anio && !valido ? 'Escriba un año entre 2000 y 2100' : undefined}
        >
          <input
            id="ejercicio-anio"
            inputMode="numeric"
            value={anio}
            onChange={(e) => setAnio(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={`cifras ${claseCampo} border-linea`}
            autoFocus
          />
        </Campo>
        <Campo
          etiqueta="Mes de inicio"
          id="ejercicio-mes"
          ayuda="Enero si el año fiscal coincide con el calendario"
        >
          <select
            id="ejercicio-mes"
            value={mesInicio}
            onChange={(e) => setMesInicio(Number(e.target.value))}
            className={`${claseCampo} border-linea`}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </Campo>
      </form>

      {vista.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-pizarra">
            Del <strong className="text-tinta">{vista[0].desde}</strong> al{' '}
            <strong className="text-tinta">{vista[11].hasta}</strong>
          </p>
          <ol className="mt-2 grid grid-cols-2 gap-1.5 text-sm sm:grid-cols-3">
            {vista.map((p) => (
              <li key={p.numero} className="rounded-lg bg-papel px-2.5 py-1.5">
                <span className="cifras text-xs text-pizarra">
                  {String(p.numero).padStart(2, '0')}
                </span>{' '}
                {p.nombre}
              </li>
            ))}
          </ol>
        </div>
      )}

      {crear.isError && (
        <p className="mt-4 rounded-lg bg-alerta-claro px-3 py-2 text-sm text-alerta">
          {crear.error.message}
        </p>
      )}
    </Modal>
  )
}
