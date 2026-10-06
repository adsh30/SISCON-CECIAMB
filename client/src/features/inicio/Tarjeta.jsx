export function Tarjeta({ titulo, extra, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-linea bg-superficie p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{titulo}</h2>
        {extra && <span className="text-xs text-pizarra">{extra}</span>}
      </div>
      {children}
    </section>
  )
}
