import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useSesion } from '../../api/auth.js'
import { useDashboard } from '../../api/dashboard.js'
import {
  formatoEntero,
  formatoFechaCorta,
  formatoHoraCaracas,
  formatoMonto,
  formatoPorcentaje,
} from '../../lib/formato.js'
import { ActividadReciente } from './ActividadReciente.jsx'
import { GraficaActividad } from './GraficaActividad.jsx'
import { GraficaTasas } from './GraficaTasas.jsx'
import { Kpi } from './Kpi.jsx'
import { UsuariosPorRol } from './UsuariosPorRol.jsx'

const saludo = (fecha) => {
  const h = fecha.getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

/** '↑0,12 % vs 05-oct.' — la tasa sube cuando el bolívar se deprecia (rojo) */
function variacion(v) {
  if (!v?.porcentaje) return { texto: 'sin dato anterior', tono: 'text-pizarra' }
  const n = Number(v.porcentaje)
  const flecha = n > 0 ? '↑' : n < 0 ? '↓' : '='
  return {
    texto: `${flecha}${formatoPorcentaje(Math.abs(n))} vs ${formatoFechaCorta(v.fecha)}`,
    tono: n > 0 ? 'text-alerta' : n < 0 ? 'text-exito' : 'text-pizarra',
  }
}

function Esqueleto() {
  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))]">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl border border-linea bg-superficie" />
      ))}
    </div>
  )
}

export default function InicioPage() {
  const { data: usuario } = useSesion()
  const { data, isPending, isError } = useDashboard()
  const navigate = useNavigate()
  const [serie, setSerie] = useState('usd')
  const [hoy] = useState(() => new Date())
  const nombre = usuario?.nombre.split(' ')[0]

  const elegirSerie = (clave) => {
    setSerie(clave)
    document
      .getElementById('grafica-tasas')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const tasas = data?.tasas
  const usd = variacion(tasas?.variacion?.usd)
  const eur = variacion(tasas?.variacion?.eur)
  const usdt = variacion(tasas?.variacion?.usdt)

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {saludo(hoy)}, {nombre}
          </h1>
          <p className="mt-1 text-pizarra first-letter:uppercase">
            {hoy.toLocaleDateString('es-VE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <p className="ayuda text-sm text-pizarra">
          Resumen del sistema. Haga clic en una tasa para ver su evolución.
        </p>
      </div>

      <div className="mt-6">
        {isPending ? (
          <Esqueleto />
        ) : isError ? (
          <p className="rounded-2xl border border-alerta/40 bg-alerta-claro px-4 py-3 text-sm text-alerta">
            No se pudo cargar el resumen. Verifique que el sistema esté encendido y recargue la
            página.
          </p>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))]">
            <Kpi
              icono="dolar"
              etiqueta="Dólar BCV"
              valor={tasas.bcv ? `Bs ${formatoMonto(tasas.bcv.usd)}` : '—'}
              detalle={usd.texto}
              tonoDetalle={usd.tono}
              onClick={() => elegirSerie('usd')}
              activo={serie === 'usd'}
            />
            <Kpi
              icono="euro"
              etiqueta="Euro BCV"
              valor={tasas.bcv?.eur ? `Bs ${formatoMonto(tasas.bcv.eur)}` : '—'}
              detalle={eur.texto}
              tonoDetalle={eur.tono}
              onClick={() => elegirSerie('eur')}
              activo={serie === 'eur'}
            />
            <Kpi
              icono="tendencia"
              etiqueta="Binance USDT"
              valor={tasas.binance ? `Bs ${formatoMonto(tasas.binance.usdt)}` : '—'}
              detalle={
                tasas.brecha != null
                  ? `${usdt.texto.split(' vs ')[0]} · brecha ${formatoPorcentaje(tasas.brecha)}`
                  : usdt.texto
              }
              tonoDetalle={usdt.tono}
              onClick={() => elegirSerie('usdt')}
              activo={serie === 'usdt'}
            />
            {data.usuarios ? (
              <Kpi
                icono="usuarios"
                etiqueta="Usuarios habilitados"
                valor={formatoEntero(data.usuarios.activos)}
                detalle={`${formatoEntero(data.usuarios.inactivos)} deshabilitados · ${formatoEntero(data.usuarios.archivados)} archivados`}
                onClick={() => navigate('/app/usuarios')}
              />
            ) : (
              <Kpi
                icono="bitacora"
                etiqueta="Próxima tasa BCV"
                valor={
                  tasas.actualizacionBcv ? formatoHoraCaracas(tasas.actualizacionBcv.proxima) : '—'
                }
                detalle="actualización automática (hora de Caracas)"
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))]">
        <div id="grafica-tasas" className="scroll-mt-20">
          <GraficaTasas serie={serie} setSerie={setSerie} />
        </div>
        {data?.actividad && <GraficaActividad />}
      </div>

      {(data?.usuarios || data?.actividad) && (
        <div className="mt-4 grid items-start gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))]">
          {data.usuarios && <UsuariosPorRol usuarios={data.usuarios} />}
          {data.actividad && <ActividadReciente actividad={data.actividad} />}
        </div>
      )}
    </div>
  )
}
