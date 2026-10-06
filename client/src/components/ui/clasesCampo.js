export const claseCampo =
  'block w-full rounded-lg border bg-superficie px-3 py-2 text-tinta placeholder:text-pizarra/60 transition-colors focus:border-marca focus:ring-3 focus:ring-marca/15 focus:outline-none disabled:bg-superficie-2 disabled:text-pizarra'

export const bordeCampo = (error) => (error ? 'border-alerta' : 'border-linea')
