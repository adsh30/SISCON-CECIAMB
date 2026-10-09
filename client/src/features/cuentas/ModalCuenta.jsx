import { useState } from 'react'
import { useActualizarCuenta, useCrearCuenta } from '../../api/cuentas.js'
import { Button } from '../../components/ui/Button.jsx'
import { claseCampo } from '../../components/ui/clasesCampo.js'
import { Campo, Interruptor } from '../../components/ui/Formulario.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { useAvisos } from '../../components/ui/Avisos.jsx'

const TIPOS = [
  { clave: 'ACTIVO', nombre: '1. Activo', naturaleza: 'DEUDORA' },
  { clave: 'PASIVO', nombre: '2. Pasivo', naturaleza: 'ACREEDORA' },
  { clave: 'PATRIMONIO', nombre: '3. Patrimonio', naturaleza: 'ACREEDORA' },
  { clave: 'INGRESO', nombre: '4. Ingresos', naturaleza: 'ACREEDORA' },
  { clave: 'COSTO', nombre: '5. Costos', naturaleza: 'DEUDORA' },
  { clave: 'GASTO', nombre: '6. Gastos', naturaleza: 'DEUDORA' },
  { clave: 'ORDEN', nombre: '7. Cuentas de Orden', naturaleza: 'DEUDORA' },
]

/** Mismas reglas de código que el servidor, para avisar antes de enviar */
function errorCodigo(codigo, padre) {
  if (!codigo) return 'Escriba el código de la cuenta'
  if (!/^[0-9]+(.[0-9]+)*$/.test(codigo)) {
    return 'El código va en números separados por puntos, por ejemplo 1.1.01'
  }
  if (padre) {
    const resto = codigo.slice(padre.codigo.length + 1)
    if (!codigo.startsWith(`${padre.codigo}.`) || resto.includes('.')) {
      return `El código debe ser ${padre.codigo}. seguido de un número, por ejemplo ${padre.codigo}.01`
    }
  } else if (codigo.includes('.')) {
    return 'Una cuenta sin cuenta superior lleva un código de un solo número, por ejemplo 7'
  }
  return null
}

export function ModalCuenta({ cuenta, padre, codigoSugerido, onClose }) {
  const avisar = useAvisos()
  const esEdicion = !!cuenta
  const crear = useCrearCuenta()
  const actualizar = useActualizarCuenta()

  const [codigo, setCodigo] = useState(
    cuenta?.codigo || codigoSugerido || (padre ? `${padre.codigo}.` : ''),
  )
  const [nombre, setNombre] = useState(cuenta?.nombre || '')
  const [descripcion, setDescripcion] = useState(cuenta?.descripcion || '')
  const [tipo, setTipo] = useState(cuenta?.tipo || padre?.tipo || 'ACTIVO')
  const [naturaleza, setNaturaleza] = useState(cuenta?.naturaleza || padre?.naturaleza || 'DEUDORA')
  const [esMovimiento, setEsMovimiento] = useState(cuenta ? !!cuenta.esMovimiento : Boolean(padre))
  const [activa, setActiva] = useState(cuenta ? !!cuenta.activa : true)
  const [error, setError] = useState(null)

  const cambiarTipo = (nuevoTipo) => {
    setTipo(nuevoTipo)
    const def = TIPOS.find((t) => t.clave === nuevoTipo)?.naturaleza || 'DEUDORA'
    setNaturaleza(def)
  }

  const pendiente = crear.isPending || actualizar.isPending

  const guardar = async (e) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre de la cuenta es obligatorio')
      return
    }

    try {
      if (esEdicion) {
        await actualizar.mutateAsync({
          id: cuenta.id,
          datos: {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || null,
            naturaleza,
            esMovimiento,
            activa,
          },
        })
        avisar('Cuenta actualizada correctamente', 'exito', `${cuenta.codigo} — ${nombre}`)
      } else {
        const problema = errorCodigo(codigo.trim(), padre)
        if (problema) {
          setError(problema)
          return
        }
        await crear.mutateAsync({
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          tipo,
          naturaleza,
          padreId: padre?.id ?? null,
          esMovimiento,
          activa,
        })
        avisar('Cuenta creada con éxito', 'exito', `${codigo} — ${nombre}`)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Error al guardar la cuenta')
    }
  }

  return (
    <Modal
      titulo={
        esEdicion
          ? `Editar Cuenta ${cuenta.codigo}`
          : padre
            ? `Nueva Subcuenta de ${padre.codigo}`
            : 'Nueva Cuenta Raíz'
      }
      descripcion={
        esEdicion
          ? 'Modifique la descripción, naturaleza o comportamiento de la cuenta'
          : padre
            ? `Creando subcuenta bajo "${padre.nombre}"`
            : 'Creando cuenta de nivel 1 en el catálogo'
      }
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" onClick={onClose} disabled={pendiente}>
            Cancelar
          </Button>
          <Button variante="primario" onClick={guardar} disabled={pendiente}>
            {pendiente ? 'Guardando…' : esEdicion ? 'Guardar Cambios' : 'Crear Cuenta'}
          </Button>
        </>
      }
    >
      <form onSubmit={guardar} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-alerta-claro px-4 py-2.5 text-sm text-alerta">{error}</div>
        )}

        {padre && !esEdicion && (
          <div className="rounded-xl border border-linea bg-superficie-2 p-3 text-xs">
            <span className="font-semibold text-pizarra">Cuenta Superior:</span>
            <div className="mt-0.5 flex items-center gap-2 font-medium text-tinta">
              <span className="font-mono">{padre.codigo}</span>
              <span>—</span>
              <span>{padre.nombre}</span>
              <span className="rounded bg-marca-claro px-1.5 py-0.5 text-[10px] text-marca">
                Nivel {padre.nivel}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Código de la cuenta"
            id="codigo"
            ayuda={
              esEdicion
                ? 'El código contable no puede modificarse'
                : padre
                  ? `${padre.codigo}. seguido de un número`
                  : 'Un solo número, por ejemplo 7'
            }
          >
            <input
              id="codigo"
              type="text"
              value={codigo}
              disabled={esEdicion}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej. 1.1.01.01"
              className={`${claseCampo} font-mono`}
            />
          </Campo>

          <Campo etiqueta="Tipo de cuenta" id="tipo">
            {esEdicion || padre ? (
              <input
                id="tipo"
                type="text"
                value={tipo}
                disabled
                className={`${claseCampo} uppercase opacity-70`}
              />
            ) : (
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => cambiarTipo(e.target.value)}
                className={claseCampo}
              >
                {TIPOS.map((t) => (
                  <option key={t.clave} value={t.clave}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </div>

        <Campo etiqueta="Nombre de la cuenta" id="nombre">
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Banco Mercantil Cta. Cte."
            className={claseCampo}
          />
        </Campo>

        {esEdicion && cuenta.esMovimiento !== esMovimiento && (
          <p className="rounded-lg bg-aviso-claro px-4 py-2.5 text-sm text-aviso">
            {esMovimiento
              ? 'Solo se puede convertir en cuenta de movimiento si no tiene subcuentas.'
              : 'Solo se puede convertir en cuenta de grupo si no tiene movimientos en comprobantes.'}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Naturaleza del saldo" id="naturaleza">
            <select
              id="naturaleza"
              value={naturaleza}
              onChange={(e) => setNaturaleza(e.target.value)}
              className={claseCampo}
            >
              <option value="DEUDORA">Deudora (aumenta al Debe)</option>
              <option value="ACREEDORA">Acreedora (aumenta al Haber)</option>
            </select>
          </Campo>

          <div className="flex flex-col justify-end">
            <Interruptor
              id="esMovimiento"
              checked={esMovimiento}
              onChange={setEsMovimiento}
              etiqueta="Cuenta de movimiento"
              descripcion="Solo las cuentas de movimiento aceptan asientos contables"
            />
          </div>
        </div>

        <Campo etiqueta="Descripción u observaciones" id="descripcion">
          <textarea
            id="descripcion"
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Opcional. Notas adicionales sobre el uso de esta cuenta"
            className={claseCampo}
          />
        </Campo>

        <Interruptor
          id="activa"
          checked={activa}
          onChange={setActiva}
          etiqueta="Cuenta activa"
          descripcion="Las cuentas inactivas no aparecerán en el selector de comprobantes"
        />
      </form>
    </Modal>
  )
}
