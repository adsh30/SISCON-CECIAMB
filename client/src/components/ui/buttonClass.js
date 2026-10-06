const variantes = {
  primario:
    'bg-marca text-white hover:bg-marca-oscuro disabled:opacity-60 shadow-sm shadow-marca/20',
  secundario:
    'border border-linea bg-superficie text-tinta hover:border-marca/40 hover:bg-marca-claro/60 disabled:opacity-60',
  fantasma: 'text-pizarra hover:bg-superficie-2 hover:text-tinta disabled:opacity-60',
  peligro: 'bg-alerta text-white hover:opacity-90 disabled:opacity-60',
  exito: 'bg-exito text-white hover:opacity-90 disabled:opacity-60',
}

const tamanos = {
  md: 'px-4 py-2.5 text-sm',
  sm: 'px-3 py-1.5 text-sm',
}

export function buttonClass(variante = 'primario', extra = '', tamano = 'md') {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${tamanos[tamano]} ${variantes[variante]} ${extra}`
}
