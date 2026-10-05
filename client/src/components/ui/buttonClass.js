const variantes = {
  primario:
    'bg-salud text-white hover:bg-salud-oscuro disabled:bg-salud/60 shadow-sm shadow-salud/20',
  secundario: 'border border-linea bg-white text-tinta hover:border-salud/40 hover:bg-salud-claro/50',
  fantasma: 'text-pizarra hover:bg-salud-claro/60 hover:text-tinta',
}

export function buttonClass(variante = 'primario', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variantes[variante]} ${extra}`
}
