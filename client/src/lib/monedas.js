// Divisas en que se puede llevar una cuenta (mismas que el servidor: cuentas.schema.js)

export const MONEDAS = {
  USD: { nombre: 'Dólar estadounidense', fuente: 'BCV' },
  EUR: { nombre: 'Euro', fuente: 'BCV' },
  USDT: { nombre: 'Tether (USDT)', fuente: 'Binance' },
}

/** Solo las partidas monetarias se reexpresan por diferencial cambiario */
export const TIPOS_CON_MONEDA = ['ACTIVO', 'PASIVO']

/** Bs ÷ divisa con 4 decimales, para mostrar la tasa implícita de un renglón */
export function tasaImplicita(bs, divisa) {
  const b = Number(bs)
  const d = Number(divisa)
  return b > 0 && d > 0 ? (b / d).toFixed(4) : null
}
