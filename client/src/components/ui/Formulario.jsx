// Piezas de formulario con el estilo del sistema

export function Campo({ etiqueta, id, error, ayuda, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-sm text-alerta">{error}</p>
      ) : (
        ayuda && <p className="ayuda mt-1 text-xs text-pizarra">{ayuda}</p>
      )}
    </div>
  )
}

export function Interruptor({ checked, onChange, etiqueta, descripcion, id }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-linea py-3 last:border-0">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-medium">{etiqueta}</span>
        {descripcion && <span className="ayuda block text-sm text-pizarra">{descripcion}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-marca' : 'bg-linea'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

export function Insignia({ tono = 'neutro', children }) {
  const tonos = {
    neutro: 'bg-superficie-2 text-pizarra',
    exito: 'bg-exito-claro text-exito',
    alerta: 'bg-alerta-claro text-alerta',
    aviso: 'bg-aviso-claro text-aviso',
    marca: 'bg-marca-claro text-marca',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tonos[tono]}`}
    >
      {children}
    </span>
  )
}

export function PuntoColor({ color, className = 'size-2.5' }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  )
}
