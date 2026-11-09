// Códigos de cuenta con puntos (1.1.01.001) o compactos (1 → 11 → 111 → 1111 → 111101, plan HCC).
// Mismas reglas que el servidor (server/src/utils/codigos.js).

/** Prefijo de todas las subcuentas: '1.1' → '1.1.'; '1112' → '1112' */
export const prefijoSubcuentas = (codigo) => (codigo.includes('.') ? `${codigo}.` : codigo)

/** ¿`codigo` está debajo de `padre` en el plan (a cualquier nivel)? */
export const esSubcuenta = (codigo, padre) =>
  codigo !== padre && codigo.startsWith(prefijoSubcuentas(padre))

/** En un rango de cuentas, ¿`codigo` queda después de `hasta` (sin ser subcuenta suya)? */
export const despuesDe = (codigo, hasta) => codigo > hasta && !esSubcuenta(codigo, hasta)

/** ¿Es válido `codigo` para una subcuenta directa de `padre`? */
export function codigoDeSubcuentaValido(codigo, padre) {
  if (codigo.startsWith(`${padre}.`)) return /^\d+$/.test(codigo.slice(padre.length + 1))
  return (
    !padre.includes('.') &&
    /^\d+$/.test(codigo) &&
    codigo.length > padre.length &&
    codigo.startsWith(padre)
  )
}
