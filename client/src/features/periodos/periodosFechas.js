// Vista previa de los períodos (misma regla que server/src/modules/periodos/periodos.fechas.js)

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const dos = (n) => String(n).padStart(2, '0')

export function periodosDe(anio, mesInicio) {
  return Array.from({ length: 12 }, (_, i) => {
    const indice = mesInicio - 1 + i
    const a = anio + Math.floor(indice / 12)
    const m = (indice % 12) + 1
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
    return {
      numero: i + 1,
      nombre: `${MESES[m - 1]} ${a}`,
      desde: `01/${dos(m)}/${a}`,
      hasta: `${dos(ultimo)}/${dos(m)}/${a}`,
    }
  })
}
