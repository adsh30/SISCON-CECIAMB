import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { usePermisos } from '../../api/auth.js'
import { useCrearBorradorImportacion, usePrevisualizarImportacion } from '../../api/importaciones.js'
import { useTiposComprobante } from '../../api/comprobantes.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { bordeCampo, claseCampo } from '../../components/ui/clasesCampo.js'
import { Campo } from '../../components/ui/Formulario.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { formatoMonto } from '../../lib/formato.js'
import { hoyCaracas } from '../../lib/series.js'

const PLANTILLA = [
  'cuenta;descripcion;debe;haber;centro;referencia',
  '1.1.01.01.001;Cobro en caja;1500,00;0;;FAC-0001',
  '4.1.01;Ingreso por hospitalización;0;1500,00;;FAC-0001',
].join('\r\n')

function descargarPlantilla() {
  const blob = new Blob(['﻿' + PLANTILLA], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla-importacion.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function leerArchivo(file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result))
    lector.onerror = () => reject(lector.error)
    lector.readAsText(file, 'utf-8')
  })
}

export default function ImportarPage() {
  const navigate = useNavigate()
  const avisar = useAvisos()
  const { can } = usePermisos()
  const inputRef = useRef(null)

  const { data: tipos = [] } = useTiposComprobante()
  const previsualizar = usePrevisualizarImportacion()
  const crear = useCrearBorradorImportacion()

  const [archivo, setArchivo] = useState(null) // { nombre, csv }
  const [resultado, setResultado] = useState(null) // { filas, totales, conErrores, cuadrado }
  const [cabecera, setCabecera] = useState({
    tipoId: '',
    fecha: hoyCaracas(),
    concepto: '',
    referencia: '',
    beneficiario: '',
  })

  if (!can('comprobantes', 'escritura')) {
    return (
      <p className="py-16 text-center text-pizarra">
        Su rol puede consultar comprobantes, pero no importar resúmenes.
      </p>
    )
  }

  const elegirArchivo = async (file) => {
    if (!file) return
    setResultado(null)
    previsualizar.reset()
    crear.reset()
    try {
      const csv = await leerArchivo(file)
      setArchivo({ nombre: file.name, csv })
      previsualizar.mutate(csv, { onSuccess: setResultado })
    } catch {
      avisar('No se pudo leer el archivo', 'alerta')
    }
  }

  const reiniciar = () => {
    setArchivo(null)
    setResultado(null)
    previsualizar.reset()
    crear.reset()
    if (inputRef.current) inputRef.current.value = ''
  }

  const listoParaCrear =
    resultado && resultado.conErrores === 0 && resultado.cuadrado && !!archivo && !!cabecera.tipoId && cabecera.concepto.trim().length >= 3

  const enviar = (e) => {
    e.preventDefault()
    if (!listoParaCrear) return
    crear.mutate(
      {
        csv: archivo.csv,
        tipoId: Number(cabecera.tipoId),
        fecha: cabecera.fecha,
        concepto: cabecera.concepto,
        referencia: cabecera.referencia || undefined,
        beneficiario: cabecera.beneficiario || undefined,
      },
      {
        onSuccess: (c) => {
          avisar('Borrador creado desde el resumen', 'exito', c.codigo ?? `Borrador #${c.id}`)
          navigate(`/app/comprobantes/${c.id}`)
        },
      },
    )
  }

  const errorArchivo = previsualizar.error
  const errorCrear = crear.error

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar resumen</h1>
          <p className="ayuda mt-1 max-w-2xl text-pizarra">
            Suba el resumen de ventas, compras, honorarios o nómina en CSV: el sistema ubica las
            cuentas por código y arma un comprobante en borrador. Encabezado requerido: «cuenta»,
            «debe» y «haber» (opcionales: «descripcion», «centro», «referencia»). Hasta 500 filas.
          </p>
        </div>
        <Button variante="secundario" onClick={descargarPlantilla}>
          <Icono nombre="descargar" className="size-4" />
          Descargar plantilla
        </Button>
      </div>

      {/* Paso 1: archivo */}
      <div className="mt-6 rounded-2xl border border-linea bg-superficie p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => elegirArchivo(e.target.files?.[0])}
            className="hidden"
            id="archivo-csv"
          />
          <label
            htmlFor="archivo-csv"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-linea bg-papel px-4 py-2.5 text-sm font-medium text-tinta hover:border-marca hover:text-marca"
          >
            <Icono nombre="subir" className="size-4" />
            {archivo ? 'Elegir otro archivo' : 'Elegir archivo CSV'}
          </label>
          {archivo && (
            <span className="flex items-center gap-2 text-sm text-pizarra">
              <Icono nombre="archivo" className="size-4" />
              {archivo.nombre}
              <button type="button" onClick={reiniciar} className="text-marca hover:underline">
                Quitar
              </button>
            </span>
          )}
          {previsualizar.isPending && (
            <span className="text-sm text-pizarra">Analizando archivo…</span>
          )}
        </div>
        {errorArchivo && (
          <div className="mt-3 rounded-lg bg-alerta-claro px-3 py-2 text-sm text-alerta">
            <p>{errorArchivo.message}</p>
            {errorArchivo.details?.length > 0 && (
              <ul className="mt-1 list-inside list-disc">
                {errorArchivo.details.map((d, i) => (
                  <li key={i}>{d.mensaje}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Paso 2: previsualización */}
      {resultado && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-linea bg-superficie">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-papel text-left text-pizarra">
              <tr>
                <th className="px-4 py-2.5 font-medium">Línea</th>
                <th className="px-4 py-2.5 font-medium">Cuenta</th>
                <th className="px-4 py-2.5 font-medium">Descripción</th>
                <th className="px-4 py-2.5 text-right font-medium">Debe</th>
                <th className="px-4 py-2.5 text-right font-medium">Haber</th>
              </tr>
            </thead>
            <tbody>
              {resultado.filas.map((f) => (
                <tr
                  key={f.linea}
                  className={`border-t border-linea ${f.error ? 'bg-alerta-claro/40' : ''}`}
                >
                  <td className="cifras px-4 py-2 whitespace-nowrap text-pizarra">{f.linea}</td>
                  <td className="px-4 py-2">
                    {f.error ? (
                      <span className="text-alerta">{f.error}</span>
                    ) : (
                      <>
                        <span className="cifras font-medium">{f.cuentaCodigo}</span>{' '}
                        <span className="text-pizarra">{f.cuentaNombre}</span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2 text-pizarra">{f.descripcion}</td>
                  <td className="cifras px-4 py-2 text-right whitespace-nowrap">
                    {f.error ? '—' : formatoMonto(f.debe)}
                  </td>
                  <td className="cifras px-4 py-2 text-right whitespace-nowrap">
                    {f.error ? '—' : formatoMonto(f.haber)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-linea bg-papel font-semibold">
                <td colSpan={3} className="px-4 py-2.5">
                  {resultado.conErrores > 0
                    ? `${resultado.conErrores} fila(s) con error: corríjalas en el archivo e importe de nuevo`
                    : resultado.cuadrado
                      ? 'Cuadrado'
                      : 'No cuadra: revise los montos'}
                </td>
                <td className="cifras px-4 py-2.5 text-right">
                  {formatoMonto(resultado.totales.debe)}
                </td>
                <td className="cifras px-4 py-2.5 text-right">
                  {formatoMonto(resultado.totales.haber)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Paso 3: datos del comprobante */}
      {resultado && (
        <form
          onSubmit={enviar}
          className="mt-4 grid gap-4 rounded-2xl border border-linea bg-superficie p-4 sm:grid-cols-2"
        >
          <Campo etiqueta="Tipo de comprobante" id="tipoId">
            <select
              id="tipoId"
              value={cabecera.tipoId}
              onChange={(e) => setCabecera({ ...cabecera, tipoId: e.target.value })}
              className={`${claseCampo} ${bordeCampo()}`}
            >
              <option value="">Elija el tipo…</option>
              {tipos
                .filter((t) => t.activo)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo etiqueta="Fecha" id="fecha">
            <input
              id="fecha"
              type="date"
              value={cabecera.fecha}
              onChange={(e) => setCabecera({ ...cabecera, fecha: e.target.value })}
              className={`${claseCampo} ${bordeCampo()}`}
            />
          </Campo>
          <Campo etiqueta="Concepto" id="concepto" className="sm:col-span-2">
            <input
              id="concepto"
              value={cabecera.concepto}
              onChange={(e) => setCabecera({ ...cabecera, concepto: e.target.value })}
              maxLength={255}
              placeholder="Resumen de ventas del día…"
              className={`${claseCampo} ${bordeCampo()}`}
            />
          </Campo>
          <Campo etiqueta="Referencia" id="referencia" ayuda="Opcional">
            <input
              id="referencia"
              value={cabecera.referencia}
              onChange={(e) => setCabecera({ ...cabecera, referencia: e.target.value })}
              maxLength={60}
              className={`${claseCampo} ${bordeCampo()}`}
            />
          </Campo>
          <Campo etiqueta="Beneficiario" id="beneficiario" ayuda="Opcional">
            <input
              id="beneficiario"
              value={cabecera.beneficiario}
              onChange={(e) => setCabecera({ ...cabecera, beneficiario: e.target.value })}
              maxLength={120}
              className={`${claseCampo} ${bordeCampo()}`}
            />
          </Campo>

          {errorCrear && (
            <div className="rounded-lg bg-alerta-claro px-3 py-2 text-sm text-alerta sm:col-span-2">
              <p>{errorCrear.message}</p>
              {errorCrear.details?.length > 0 && (
                <ul className="mt-1 list-inside list-disc">
                  {errorCrear.details.map((d, i) => (
                    <li key={i}>{d.mensaje}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variante="secundario" onClick={reiniciar} disabled={crear.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!listoParaCrear || crear.isPending}>
              {crear.isPending ? 'Creando…' : 'Crear borrador'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
