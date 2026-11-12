import { z } from 'zod'

const cuenta = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.coerce.number().int().positive('Elija la cuenta').nullable(),
)

export const configuracionSchema = z.object({
  cuentaGananciaId: cuenta,
  cuentaPerdidaId: cuenta,
})
