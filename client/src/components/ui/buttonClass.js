const variantes = {
  primario:
    'bg-marca text-white hover:bg-marca-oscuro disabled:bg-marca/60 shadow-sm shadow-marca/20',
  secundario:
    'border border-linea bg-white text-tinta hover:border-marca/40 hover:bg-marca-claro/50',
  fantasma: 'text-pizarra hover:bg-marca-claro/60 hover:text-tinta',
}

export function buttonClass(variante = 'primario', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variantes[variante]} ${extra}`
}
