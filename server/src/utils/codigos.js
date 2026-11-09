// Códigos de cuenta en dos formatos:
//   con puntos  1.1.01.01.001  (subcuenta = código del padre + '.' + número)
//   compacto    1 → 11 → 111 → 1111 → 111101  (plan HCC de Sparrow: subcuenta = padre + dígitos)
// Las subcuentas de un código siempre empiezan por el mismo prefijo.

/** Prefijo de todas las subcuentas: '1.1' → '1.1.'; '1112' → '1112' */
export const prefijoSubcuentas = (codigo) => (codigo.includes('.') ? `${codigo}.` : codigo)

/** ¿`codigo` está debajo de `padre` en el plan (a cualquier nivel)? */
export const esSubcuenta = (codigo, padre) =>
  codigo !== padre && codigo.startsWith(prefijoSubcuentas(padre))

/**
 * ¿Es válido `codigo` para una subcuenta directa de `padre`?
 * Con puntos: padre + '.' + número. Compacto (padre sin puntos): padre + uno o más dígitos.
 */
export function codigoDeSubcuentaValido(codigo, padre) {
  if (codigo.startsWith(`${padre}.`)) return /^\d+$/.test(codigo.slice(padre.length + 1))
  return (
    !padre.includes('.') &&
    /^\d+$/.test(codigo) &&
    codigo.length > padre.length &&
    codigo.startsWith(padre)
  )
}
