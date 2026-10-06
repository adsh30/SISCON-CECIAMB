import { Icono } from '../../components/ui/Icono.jsx'

/** Tarjeta de indicador al estilo del tablero de MGG, con los colores de CECIAMB */
export function Kpi({
  icono,
  etiqueta,
  valor,
  detalle,
  tonoDetalle = 'text-pizarra',
  onClick,
  activo,
}) {
  const Elemento = onClick ? 'button' : 'div'
  return (
    <Elemento
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!activo : undefined}
      className={`group relative overflow-hidden rounded-2xl border bg-superficie py-4 pr-16 pl-5 text-left transition-colors ${
        activo ? 'border-marca ring-3 ring-marca/10' : 'border-linea'
      } ${onClick ? 'cursor-pointer hover:border-marca/50' : ''}`}
    >
      {/* Brillo sutil en la esquina, como el radial del kpi de MGG */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-marca/10 blur-2xl"
      />
      <span className="block text-xs font-bold tracking-wider text-pizarra uppercase">
        {etiqueta}
      </span>
      <span className="cifras mt-1.5 block truncate text-2xl font-bold tracking-tight">
        {valor}
      </span>
      <span className={`mt-1 block text-xs font-semibold ${tonoDetalle}`}>{detalle}</span>
      <span
        aria-hidden="true"
        className="absolute top-1/2 right-4 grid size-10 -translate-y-1/2 place-items-center rounded-xl bg-marca-claro text-marca"
      >
        <Icono nombre={icono} className="size-5" />
      </span>
    </Elemento>
  )
}
