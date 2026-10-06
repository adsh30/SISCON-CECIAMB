// Isotipo de CECIAMB Hospital de Clínicas, redibujado en vectores desde public/logo1.jpeg
const piezasRojas = [
  '5,21 17,5 73,5 85,21 73,37 17,37',
  '5,145.5 17,129.5 73,129.5 85,145.5 73,161.5 17,161.5',
  '178,145.5 190,129.5 246,129.5 258,145.5 246,161.5 190,161.5',
  '178,270 190,254 246,254 258,270 246,286 190,286',
]
const piezasAzules = [
  '88,31 99,41 99,125 88,135 77,125 77,41',
  '175,32 186,42 186,124 175,134 164,124 164,42',
  '92,145.5 104,129.5 158,129.5 170,145.5 158,161.5 104,161.5',
  '87.5,156 98.5,166 98.5,249 87.5,259 76.5,249 76.5,166',
  '174.5,156 185.5,166 185.5,249 174.5,259 163.5,249 163.5,166',
]

// fijo: colores oficiales sin adaptar al tema (sobre fondos blancos o fotos)
export function LogoMark({ className = 'h-10 w-auto', fijo = false }) {
  return (
    <svg viewBox="0 0 264 292" className={className} aria-hidden="true">
      <g className={fijo ? 'fill-[#e2001a]' : 'fill-acento'}>
        {piezasRojas.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
      <g className={fijo ? 'fill-[#004191]' : 'fill-marca'}>
        {piezasAzules.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
    </svg>
  )
}

export function Logo({ size = 'md', fijo = false }) {
  const grande = size === 'lg'
  return (
    <span
      className="inline-flex items-center gap-3"
      aria-label="CECIAMB Hospital de Clínicas, sistema contable"
    >
      <LogoMark className={grande ? 'h-14 w-auto' : 'h-10 w-auto'} fijo={fijo} />
      <span className="leading-none">
        <span
          className={`block font-extrabold tracking-tight ${fijo ? 'text-[#004191]' : 'text-marca'} ${grande ? 'text-2xl' : 'text-lg'}`}
        >
          CECIAMB
        </span>
        <span
          className={`block ${fijo ? 'text-[#5a6782]' : 'text-pizarra'} ${grande ? 'mt-1 text-sm' : 'mt-0.5 text-xs'}`}
        >
          Sistema contable
        </span>
      </span>
    </span>
  )
}
