// Gráficas SVG livianas (líneas y barras), basadas en las del sistema MGG.
// Usan los tokens del tema, así se ven bien en modo claro y oscuro.
import { useMemo, useState } from 'react'

const ANCHO = 720
const PAD = { arriba: 16, derecha: 14, abajo: 34, izquierda: 84 }

/** Escala "redonda" para el eje Y: { min, max, ticks } */
function escala(minimo, maximo, cantidad = 4) {
  if (minimo === maximo) {
    const holgura = Math.abs(minimo) * 0.05 || 1
    minimo -= holgura
    maximo += holgura
  }
  const paso0 = (maximo - minimo) / cantidad
  const mag = 10 ** Math.floor(Math.log10(paso0))
  const norm = paso0 / mag
  const paso = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag
  const min = Math.floor(minimo / paso) * paso
  const max = Math.ceil(maximo / paso) * paso
  const ticks = []
  for (let t = min; t <= max + paso / 2; t += paso) ticks.push(Number(t.toFixed(10)))
  return { min, max, ticks }
}

function Vacio({ mensaje }) {
  return (
    <div className="grid h-48 place-items-center text-sm text-pizarra">
      {mensaje ?? 'Sin datos para el período seleccionado.'}
    </div>
  )
}

function Ejes({ ticks, y, alto, formato }) {
  return ticks
    .map((t) => (
      <g key={t}>
        <line
          x1={PAD.izquierda}
          x2={ANCHO - PAD.derecha}
          y1={y(t)}
          y2={y(t)}
          stroke="var(--color-linea)"
          strokeDasharray="3 3"
        />
        <text
          x={PAD.izquierda - 8}
          y={y(t) + 4}
          fontSize="11"
          textAnchor="end"
          fill="var(--color-pizarra)"
        >
          {formato(t)}
        </text>
      </g>
    ))
    .concat(
      <line
        key="base"
        x1={PAD.izquierda}
        x2={ANCHO - PAD.derecha}
        y1={alto - PAD.abajo}
        y2={alto - PAD.abajo}
        stroke="var(--color-linea)"
      />,
    )
}

/** Recuadro con el valor del punto bajo el cursor */
function Globo({ x, y, texto }) {
  const ancho = Math.max(90, texto.length * 6.6 + 16)
  const izquierda = Math.min(Math.max(x - ancho / 2, PAD.izquierda), ANCHO - PAD.derecha - ancho)
  const arriba = Math.max(y - 38, 2)
  return (
    <g pointerEvents="none">
      <rect
        x={izquierda}
        y={arriba}
        width={ancho}
        height={26}
        rx={6}
        fill="var(--color-tinta)"
        opacity="0.92"
      />
      <text
        x={izquierda + ancho / 2}
        y={arriba + 17}
        fontSize="12"
        fontWeight="600"
        textAnchor="middle"
        fill="var(--color-papel)"
      >
        {texto}
      </text>
    </g>
  )
}

/**
 * Gráfica de líneas. `datos`: [{ etiqueta, valor, detalle? }].
 * El eje Y se ajusta al rango de los datos (no parte de cero) para que se note la tendencia.
 */
export function GraficaLineas({
  datos,
  alto = 240,
  color = 'var(--color-marca)',
  formato = String,
  vacio,
}) {
  const [activo, setActivo] = useState(null)
  const internoAncho = ANCHO - PAD.izquierda - PAD.derecha
  const internoAlto = alto - PAD.arriba - PAD.abajo

  const calc = useMemo(() => {
    if (!datos.length) return null
    const valores = datos.map((d) => d.valor)
    const { min, max, ticks } = escala(Math.min(...valores), Math.max(...valores))
    const y = (v) => PAD.arriba + internoAlto - ((v - min) / (max - min)) * internoAlto
    const paso = datos.length === 1 ? 0 : internoAncho / (datos.length - 1)
    const puntos = datos.map((d, i) => ({
      x: PAD.izquierda + (datos.length === 1 ? internoAncho / 2 : i * paso),
      y: y(d.valor),
      d,
    }))
    const trazo = puntos
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')
    return { y, ticks, puntos, trazo, paso }
  }, [datos, internoAlto, internoAncho])

  if (!calc) return <Vacio mensaje={vacio} />
  const { y, ticks, puntos, trazo, paso } = calc
  const base = PAD.arriba + internoAlto
  const cadaCuanto = Math.max(1, Math.ceil(puntos.length / 8))
  const p = activo != null ? puntos[activo] : null

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${alto}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label="Gráfica de líneas"
      onMouseLeave={() => setActivo(null)}
    >
      <Ejes ticks={ticks} y={y} alto={alto} formato={formato} />
      <path
        d={`${trazo} L${puntos.at(-1).x.toFixed(1)} ${base} L${puntos[0].x.toFixed(1)} ${base} Z`}
        fill={color}
        opacity="0.08"
      />
      <path d={trazo} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      {puntos.length <= 60 &&
        puntos.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r="2.8" fill={color} />)}
      {puntos.map(
        (pt, i) =>
          (i % cadaCuanto === 0 || i === puntos.length - 1) && (
            <text
              key={`x${i}`}
              x={pt.x}
              y={alto - PAD.abajo + 18}
              fontSize="11"
              textAnchor={i === puntos.length - 1 && puntos.length > 1 ? 'end' : 'middle'}
              fill="var(--color-pizarra)"
            >
              {pt.d.etiqueta}
            </text>
          ),
      )}
      {/* Zonas invisibles para el cursor */}
      {puntos.map((pt, i) => (
        <rect
          key={`h${i}`}
          x={pt.x - Math.max(paso, 8) / 2}
          y={PAD.arriba}
          width={Math.max(paso, 8)}
          height={internoAlto}
          fill="transparent"
          onMouseEnter={() => setActivo(i)}
        />
      ))}
      {p && (
        <>
          <line
            x1={p.x}
            x2={p.x}
            y1={PAD.arriba}
            y2={base}
            stroke={color}
            strokeOpacity="0.35"
            pointerEvents="none"
          />
          <circle
            cx={p.x}
            cy={p.y}
            r="5"
            fill="var(--color-superficie)"
            stroke={color}
            strokeWidth="2.5"
            pointerEvents="none"
          />
          <Globo x={p.x} y={p.y} texto={p.d.detalle ?? `${p.d.etiqueta}: ${formato(p.d.valor)}`} />
        </>
      )}
    </svg>
  )
}

/** Gráfica de barras verticales. `datos`: [{ etiqueta, valor, detalle? }] */
export function GraficaBarras({
  datos,
  alto = 240,
  color = 'var(--color-exito)',
  formato = String,
  vacio,
}) {
  const [activo, setActivo] = useState(null)
  const internoAncho = ANCHO - PAD.izquierda - PAD.derecha
  const internoAlto = alto - PAD.arriba - PAD.abajo

  const calc = useMemo(() => {
    if (!datos.length) return null
    const { max, ticks } = escala(0, Math.max(1, ...datos.map((d) => d.valor)))
    const y = (v) => PAD.arriba + internoAlto - (v / max) * internoAlto
    const ranura = internoAncho / datos.length
    const ancho = Math.max(3, Math.min(ranura * 0.7, 48))
    const barras = datos.map((d, i) => ({
      x: PAD.izquierda + ranura * i + (ranura - ancho) / 2,
      y: y(d.valor),
      ancho,
      ranura,
      d,
    }))
    return { y, ticks: ticks.filter((t) => Number.isInteger(t)), barras }
  }, [datos, internoAlto, internoAncho])

  if (!calc || datos.every((d) => !d.valor)) return <Vacio mensaje={vacio} />
  const { y, ticks, barras } = calc
  const base = PAD.arriba + internoAlto
  const cadaCuanto = Math.max(1, Math.ceil(barras.length / 10))
  const b = activo != null ? barras[activo] : null

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${alto}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label="Gráfica de barras"
      onMouseLeave={() => setActivo(null)}
    >
      <Ejes ticks={ticks} y={y} alto={alto} formato={formato} />
      {barras.map((br, i) => (
        <g key={i} onMouseEnter={() => setActivo(i)}>
          <rect
            x={br.x - (br.ranura - br.ancho) / 2}
            y={PAD.arriba}
            width={br.ranura}
            height={internoAlto}
            fill="transparent"
          />
          <rect
            x={br.x}
            y={br.y}
            width={br.ancho}
            height={Math.max(0, base - br.y)}
            rx="3"
            fill={color}
            opacity={activo == null || activo === i ? 1 : 0.55}
          />
          {(i % cadaCuanto === 0 || i === barras.length - 1) && (
            <text
              x={br.x + br.ancho / 2}
              y={alto - PAD.abajo + 18}
              fontSize="11"
              textAnchor="middle"
              fill="var(--color-pizarra)"
            >
              {br.d.etiqueta}
            </text>
          )}
        </g>
      ))}
      {b && (
        <Globo
          x={b.x + b.ancho / 2}
          y={b.y}
          texto={b.d.detalle ?? `${b.d.etiqueta}: ${formato(b.d.valor)}`}
        />
      )}
    </svg>
  )
}
