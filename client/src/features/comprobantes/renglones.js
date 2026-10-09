// Renglones de la grilla de captura (estado de pantalla, no del servidor)

let siguienteClave = 1
const nuevaClave = () => `n${siguienteClave++}`

export const renglonVacio = (base = {}) => ({
  clave: nuevaClave(),
  cuentaId: null,
  cuenta: null,
  centroCostoId: '',
  descripcion: '',
  debe: '',
  haber: '',
  referencia: '',
  ...base,
})
