import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { usePermisos } from '../../api/auth.js'
import { useCentrosCosto } from '../../api/centrosCosto.js'
import {
  useActualizarComprobante,
  useAprobarComprobante,
  useCrearComprobante,
  useEliminarComprobante,
  useTiposComprobante,
} from '../../api/comprobantes.js'
import { usePeriodos } from '../../api/periodos.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { bordeCampo, claseCampo } from '../../components/ui/clasesCampo.js'
import { Campo } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { ConfirmDialog } from '../../components/ui/Modal.jsx'
import { esCero, numeroComprobante, totalesRenglones } from '../../lib/comprobantes.js'
import { formatoMonto } from '../../lib/formato.js'
import { hoyCaracas } from '../../lib/series.js'
import { CopiarModal } from './AccionesComprobante.jsx'
import { GrillaRenglones } from './GrillaRenglones.jsx'
import { renglonVacio } from './renglones.js'

const desdeServidor = (r) =>
  renglonVacio({
    cuentaId: r.cuentaId,
    cuenta: { codigo: r.cuentaCodigo, nombre: r.cuentaNombre },
    centroCostoId: r.centroCostoId ? String(r.centroCostoId) : '',
    descripcion: r.descripcion ?? '',
    debe: esCero(r.debe) ? '' : r.debe,
    haber: esCero(r.haber) ? '' : r.haber,
    referencia: r.referencia ?? '',
  })

const vacio = (r) => !r.cuentaId && esCero(r.debe) && esCero(r.haber) && !r.descripcion.trim()

/** Período contable de una fecha, a partir de la lista de ejercicios */
function periodoDe(fecha, ejercicios) {
  for (const e of ejercicios ?? []) {
    const p = e.periodos.find((x) => x.fechaInicio <= fecha && fecha <= x.fechaFin)
    if (p) return p
  }
  return null
}

/** Convierte los errores del servidor en mensajes por campo y por renglón */
function erroresDe(error) {
  const cabecera = {}
  const renglones = {}
  for (const d of error?.details ?? []) {
    const [raiz, indice, campo] = d.campo.split('.')
    if (raiz === 'renglones' && indice !== undefined) {
      renglones[Number(indice)] ??= { mensaje: d.mensaje, campo }
    } else cabecera[raiz] ??= d.mensaje
  }
  const n = error?.message?.match(/^Renglón (\d+):/)
  if (n) renglones[Number(n[1]) - 1] = { mensaje: error.message, campo: 'cuentaId' }
  return { cabecera, renglones }
}

export function ComprobanteEditor({ comprobante, tipoInicial }) {
  const navigate = useNavigate()
  const avisar = useAvisos()
  const { can } = usePermisos()
  const puedeAprobar = can('comprobantes', 'full')

  const { data: tipos = [] } = useTiposComprobante()
  const { data: centros = [] } = useCentrosCosto({ soloActivos: true })
  const { data: periodos } = usePeriodos({ enabled: can('periodos') })

  const [cabecera, setCabecera] = useState(() => ({
    tipoId: String(comprobante?.tipo.id ?? tipoInicial ?? ''),
    fecha: comprobante?.fecha ?? hoyCaracas(),
    concepto: comprobante?.concepto ?? '',
    referencia: comprobante?.referencia ?? '',
    beneficiario: comprobante?.beneficiario ?? '',
  }))
  const [renglones, setRenglones] = useState(() =>
    comprobante?.renglones.length
      ? comprobante.renglones.map(desdeServidor)
      : [renglonVacio(), renglonVacio()],
  )
  const [sucio, setSucio] = useState(false)
  const [errores, setErrores] = useState({ cabecera: {}, renglones: {} })
  const [general, setGeneral] = useState(null)
  const [dialogo, setDialogo] = useState(null) // 'eliminar' | 'duplicar'

  const crear = useCrearComprobante()
  const actualizar = useActualizarComprobante()
  const aprobar = useAprobarComprobante()
  const eliminar = useEliminarComprobante()
  const guardando = crear.isPending || actualizar.isPending || aprobar.isPending

  // Sin tipo elegido (p. ej. desde la pestaña Todos) se propone el primero activo
  const tipoId = cabecera.tipoId || String(tipos.find((t) => t.activo)?.id ?? '')
  const tiposActivos = tipos.filter((t) => t.activo || String(t.id) === tipoId)
  const usados = renglones.filter((r) => !vacio(r))
  const totales = totalesRenglones(usados)
  const periodo = periodos ? periodoDe(cabecera.fecha, periodos.ejercicios) : undefined
  const listoParaAprobar = totales.cuadrado && usados.length >= 2

  // Avisar antes de cerrar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!sucio) return
    const avisarSalida = (e) => e.preventDefault()
    window.addEventListener('beforeunload', avisarSalida)
    return () => window.removeEventListener('beforeunload', avisarSalida)
  }, [sucio])

  const cambiarCabecera = (campo) => (e) => {
    setCabecera((c) => ({ ...c, [campo]: e.target.value }))
    setSucio(true)
  }
  const cambiarRenglones = (nuevos) => {
    setRenglones(nuevos)
    setSucio(true)
  }

  const datos = useMemo(
    () => ({
      tipoId: Number(tipoId),
      fecha: cabecera.fecha,
      concepto: cabecera.concepto,
      referencia: cabecera.referencia,
      beneficiario: cabecera.beneficiario,
      renglones: usados.map((r) => ({
        cuentaId: r.cuentaId,
        centroCostoId: r.centroCostoId ? Number(r.centroCostoId) : null,
        descripcion: r.descripcion,
        debe: r.debe || '0',
        haber: r.haber || '0',
        referencia: r.referencia,
      })),
    }),
    [cabecera, tipoId, usados],
  )

  /** Revisión rápida antes de enviar; el servidor vuelve a validar todo */
  function revisar(paraAprobar) {
    const renglonesConError = {}
    usados.forEach((r, i) => {
      if (!r.cuentaId)
        renglonesConError[i] = { mensaje: `Renglón ${i + 1}: elija la cuenta`, campo: 'cuentaId' }
      else if (esCero(r.debe) === esCero(r.haber)) {
        renglonesConError[i] = {
          mensaje: `Renglón ${i + 1}: escriba el monto en Debe o en Haber`,
          campo: 'debe',
        }
      }
    })
    const cab = {}
    if (!tipoId) cab.tipoId = 'Elija el tipo de comprobante'
    if (cabecera.concepto.trim().length < 3)
      cab.concepto = 'Escriba el concepto (al menos 3 caracteres)'
    setErrores({ cabecera: cab, renglones: renglonesConError })
    if (Object.keys(cab).length || Object.keys(renglonesConError).length) return false
    if (paraAprobar && !listoParaAprobar) {
      setGeneral(
        usados.length < 2
          ? 'Para aprobar hacen falta al menos 2 renglones.'
          : `El comprobante no cuadra: falta ${formatoMonto(totales.diferencia.replace('-', ''))} para que Debe y Haber sean iguales.`,
      )
      return false
    }
    return true
  }

  async function guardar(paraAprobar = false) {
    setGeneral(null)
    // Los renglones vacíos no se envían; la grilla se reacomoda para que los errores
    // del renglón N caigan en el renglón N que ve el usuario
    if (usados.length !== renglones.length) setRenglones(usados.length ? usados : [renglonVacio()])
    if (!revisar(paraAprobar)) return

    let guardado
    try {
      guardado = comprobante
        ? await actualizar.mutateAsync({ id: comprobante.id, datos })
        : await crear.mutateAsync(datos)
    } catch (e) {
      setErrores(erroresDe(e))
      setGeneral(e.message)
      return
    }
    setSucio(false)
    setErrores({ cabecera: {}, renglones: {} })

    if (paraAprobar) {
      try {
        const aprobado = await aprobar.mutateAsync(guardado.id)
        avisar('Comprobante aprobado', 'exito', `${aprobado.codigo} · ${aprobado.concepto}`)
      } catch (e) {
        avisar('Se guardó como borrador, pero no se pudo aprobar', 'alerta', e.message)
      }
    } else {
      avisar(
        comprobante ? 'Borrador actualizado' : 'Borrador guardado',
        'exito',
        `Borrador #${guardado.id} · ${guardado.concepto}`,
      )
    }
    if (!comprobante) navigate(`/app/comprobantes/${guardado.id}`, { replace: true })
  }

  // Ctrl+S guarda el borrador
  useEffect(() => {
    const atajo = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!guardando) guardar(false)
      }
    }
    window.addEventListener('keydown', atajo)
    return () => window.removeEventListener('keydown', atajo)
  })

  const borrar = () =>
    eliminar.mutate(comprobante.id, {
      onSuccess: () => {
        avisar('Borrador eliminado', 'info', `Borrador #${comprobante.id}`)
        setSucio(false)
        navigate('/app/comprobantes')
      },
    })

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/app/comprobantes" className="text-sm font-semibold text-marca hover:underline">
            ← Comprobantes
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {comprobante ? numeroComprobante(comprobante) : 'Nuevo comprobante'}
          </h1>
          <p className="ayuda mt-1 max-w-2xl text-pizarra">
            Se guarda como <strong>borrador</strong>: puede modificarlo cuantas veces haga falta. Al
            aprobarlo recibe su número y ya no se puede cambiar.
          </p>
        </div>
        {comprobante && (
          <div className="flex flex-wrap gap-2">
            <a
              href={`/imprimir/comprobantes/${comprobante.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-linea bg-superficie px-3 py-1.5 text-sm font-semibold hover:border-marca/40"
            >
              <Icono nombre="imprimir" className="size-4" />
              Imprimir
            </a>
            <Button variante="secundario" tamano="sm" onClick={() => setDialogo('duplicar')}>
              <Icono nombre="copiar" className="size-4" />
              Duplicar
            </Button>
            <Button variante="fantasma" tamano="sm" onClick={() => setDialogo('eliminar')}>
              <Icono nombre="papelera" className="size-4" />
              Eliminar borrador
            </Button>
          </div>
        )}
      </div>

      {/* Cabecera */}
      <section className="mt-6 grid gap-4 rounded-2xl border border-linea bg-superficie p-5 md:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Tipo de comprobante" id="tipo" error={errores.cabecera.tipoId}>
          <select
            id="tipo"
            value={tipoId}
            onChange={cambiarCabecera('tipoId')}
            className={`${claseCampo} ${bordeCampo(errores.cabecera.tipoId)}`}
          >
            <option value="" disabled>
              Elija…
            </option>
            {tiposActivos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} · {t.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta="Fecha"
          id="fecha"
          error={errores.cabecera.fecha}
          ayuda={
            periodo === undefined
              ? null
              : periodo
                ? `Período ${periodo.nombre} · ${periodo.estado === 'ABIERTO' ? 'abierto' : 'cerrado'}`
                : 'No hay período contable para esta fecha'
          }
        >
          <input
            id="fecha"
            type="date"
            value={cabecera.fecha}
            onChange={cambiarCabecera('fecha')}
            className={`${claseCampo} ${bordeCampo(
              errores.cabecera.fecha || (periodo !== undefined && periodo?.estado !== 'ABIERTO'),
            )}`}
          />
        </Campo>
        <Campo
          etiqueta="Referencia o documento"
          id="referencia"
          error={errores.cabecera.referencia}
        >
          <input
            id="referencia"
            value={cabecera.referencia}
            maxLength={60}
            onChange={cambiarCabecera('referencia')}
            placeholder="Ej. Factura 000123"
            className={`${claseCampo} ${bordeCampo(errores.cabecera.referencia)}`}
          />
        </Campo>
        <Campo
          etiqueta="Beneficiario o tercero"
          id="beneficiario"
          error={errores.cabecera.beneficiario}
        >
          <input
            id="beneficiario"
            value={cabecera.beneficiario}
            maxLength={120}
            onChange={cambiarCabecera('beneficiario')}
            placeholder="Opcional"
            className={`${claseCampo} ${bordeCampo(errores.cabecera.beneficiario)}`}
          />
        </Campo>
        <Campo
          etiqueta="Concepto"
          id="concepto"
          error={errores.cabecera.concepto}
          className="md:col-span-2 lg:col-span-4"
        >
          <input
            id="concepto"
            value={cabecera.concepto}
            maxLength={255}
            onChange={cambiarCabecera('concepto')}
            placeholder="Ej. Cobro de servicios de hospitalización del día"
            className={`${claseCampo} ${bordeCampo(errores.cabecera.concepto)}`}
          />
        </Campo>
      </section>

      {/* Renglones */}
      <h2 className="mt-6 mb-2 font-semibold">Renglones</h2>
      <GrillaRenglones
        renglones={renglones}
        onChange={cambiarRenglones}
        centros={centros}
        errores={errores.renglones}
      />

      {general && (
        <p role="alert" className="mt-4 rounded-xl bg-alerta-claro px-4 py-3 text-sm text-alerta">
          {general}
        </p>
      )}

      {/* Totales y acciones, siempre a la vista */}
      {/* En el teléfono va al final del formulario; fija taparía media pantalla */}
      <div className="z-30 mt-6 -mx-1 rounded-2xl md:sticky md:bottom-0 border border-linea bg-superficie/95 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <dl className="cifras flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <dt className="text-xs text-pizarra">Total Debe</dt>
              <dd className="font-semibold">{formatoMonto(totales.debe)}</dd>
            </div>
            <div>
              <dt className="text-xs text-pizarra">Total Haber</dt>
              <dd className="font-semibold">{formatoMonto(totales.haber)}</dd>
            </div>
            <div>
              <dt className="text-xs text-pizarra">Diferencia</dt>
              <dd
                className={`font-semibold ${totales.diferencia === '0.00' ? 'text-exito' : 'text-alerta'}`}
              >
                {formatoMonto(totales.diferencia)}
                {totales.cuadrado && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs">
                    <Icono nombre="check" className="size-3.5" /> Cuadrado
                  </span>
                )}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              variante="secundario"
              onClick={() => navigate('/app/comprobantes')}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button variante="secundario" onClick={() => guardar(false)} disabled={guardando}>
              {crear.isPending || actualizar.isPending ? 'Guardando…' : 'Guardar borrador'}
            </Button>
            {puedeAprobar && (
              <Button
                variante="exito"
                onClick={() => guardar(true)}
                disabled={guardando || !listoParaAprobar}
                title={listoParaAprobar ? undefined : 'Debe cuadrar y tener al menos 2 renglones'}
              >
                <Icono nombre="check" className="size-4" />
                {aprobar.isPending ? 'Aprobando…' : 'Guardar y aprobar'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {dialogo === 'eliminar' && (
        <ConfirmDialog
          titulo="Eliminar borrador"
          mensaje={`Se eliminará el borrador #${comprobante.id} con sus renglones. Quedará registrado en la bitácora.`}
          textoConfirmar="Eliminar borrador"
          variante="peligro"
          pendiente={eliminar.isPending}
          error={eliminar.error?.message}
          onConfirm={borrar}
          onCancel={() => setDialogo(null)}
        />
      )}
      {dialogo === 'duplicar' && (
        <CopiarModal comprobante={comprobante} tipo="duplicar" onClose={() => setDialogo(null)} />
      )}
    </div>
  )
}
