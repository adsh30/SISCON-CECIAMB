import { formatoMonto } from '../../lib/formato.js'

// Comprobante de ejemplo: honorarios médicos con retención de ISLR
const renglones = [
  { cuenta: '5.2.01.001', nombre: 'Honorarios médicos', debe: '12450.00', haber: null },
  { cuenta: '2.1.03.002', nombre: 'Retención ISLR por pagar', debe: null, haber: '373.50' },
  { cuenta: '1.1.02.001', nombre: 'Banco de Venezuela', debe: null, haber: '12076.50' },
]

const total = '12450.00'

// Cada renglón entra en secuencia; al final aparece el sello de cuadre.
const retraso = (i) => ({ animationDelay: `${300 + i * 450}ms` })
const entrada = 'motion-safe:animate-[renglon-entra_500ms_ease-out_both]'

export function ComprobanteVivo() {
  return (
    <figure
      className="relative rounded-2xl border border-linea bg-white p-5 shadow-xl shadow-tinta/5 sm:p-6"
      aria-label="Ejemplo de comprobante contable cuadrado"
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 border-b border-linea pb-4">
        <span>
          <span className="block text-sm text-pizarra">Comprobante de honorarios</span>
          <span className="cifras block font-semibold">HON-2026-10-0007</span>
        </span>
        <span className="cifras text-sm text-pizarra">05/10/2026</span>
      </figcaption>

      <table className="cifras mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-pizarra">
            <th className="py-2 font-medium">Cuenta</th>
            <th className="py-2 text-right font-medium">Debe</th>
            <th className="py-2 text-right font-medium">Haber</th>
          </tr>
        </thead>
        <tbody>
          {renglones.map((r, i) => (
            <tr key={r.cuenta} className={`border-t border-linea/70 ${entrada}`} style={retraso(i)}>
              <td className="py-2.5 pr-2">
                <span className="block text-xs text-pizarra">{r.cuenta}</span>
                <span className="block">{r.nombre}</span>
              </td>
              <td className="py-2.5 text-right align-bottom">{formatoMonto(r.debe)}</td>
              <td className="py-2.5 text-right align-bottom">{formatoMonto(r.haber)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr
            className={`border-t-2 border-tinta/80 font-semibold ${entrada}`}
            style={retraso(renglones.length)}
          >
            <td className="py-3">Totales</td>
            <td className="py-3 text-right">{formatoMonto(total)}</td>
            <td className="py-3 text-right">{formatoMonto(total)}</td>
          </tr>
        </tfoot>
      </table>

      <p
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-marca-claro px-3 py-1.5 text-sm font-semibold text-marca-oscuro motion-safe:animate-[sello_400ms_ease-out_both]"
        style={retraso(renglones.length + 1)}
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
          <path
            d="M5 10.5l3 3 7-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Cuadrado: el debe y el haber suman lo mismo
      </p>
    </figure>
  )
}
