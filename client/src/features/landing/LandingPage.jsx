import { Link } from 'react-router'
import { useSesion } from '../../api/auth.js'
import { buttonClass } from '../../components/ui/buttonClass.js'
import { Logo } from '../../components/ui/Logo.jsx'
import { EstadoSistema } from './EstadoSistema.jsx'
import { ComprobanteVivo } from './ComprobanteVivo.jsx'

const modulos = [
  {
    titulo: 'Comprobantes',
    texto:
      'Asientos de ventas, compras, honorarios y nómina. Consúltelos por categoría o todos juntos, y apruébelos solo cuando cuadren.',
  },
  {
    titulo: 'Libro Diario y Libro Mayor',
    texto:
      'Generados a partir de los comprobantes aprobados, por período o rango de fechas, listos para imprimir en PDF o Excel.',
  },
  {
    titulo: 'Bitácora de auditoría',
    texto:
      'Cada registro, cambio, aprobación o anulación queda firmado con el usuario, la fecha y lo que cambió.',
  },
  {
    titulo: 'Bolívares y dólares',
    texto:
      'Tasa oficial del BCV del día y referencia del mercado para convertir montos entre Bs. y $.',
  },
]

export default function LandingPage() {
  const { data: usuario } = useSesion()
  const destino = usuario ? '/app' : '/login'
  const accion = usuario ? 'Ir al sistema' : 'Iniciar sesión'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link to={destino} className={buttonClass('secundario')}>
          {accion}
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-24">
          <div>
            <h1 className="max-w-xl text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl">
              La contabilidad del hospital, siempre cuadrada y con su historia.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-pizarra">
              Registre los comprobantes del día, consulte el Libro Diario y el Mayor, y sepa en todo
              momento quién hizo cada movimiento.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to={destino} className={buttonClass('primario', 'px-6 py-3 text-base')}>
                {accion}
              </Link>
              <span className="text-sm text-pizarra">
                Acceso exclusivo para el personal autorizado
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="renglones absolute -inset-6 -z-10 rounded-3xl bg-marca-claro/60" />
            <ComprobanteVivo />
          </div>
        </section>

        <section className="border-t border-linea bg-superficie">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight">Lo que hace el sistema</h2>
            <dl className="mt-8 grid gap-x-12 sm:grid-cols-2">
              {modulos.map((m) => (
                <div key={m.titulo} className="border-t border-linea py-6">
                  <dt className="font-semibold">{m.titulo}</dt>
                  <dd className="mt-2 max-w-md leading-relaxed text-pizarra">{m.texto}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-linea">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-pizarra sm:px-6">
          <span>Sistema contable de CECIAMB Hospital de Clínicas, de uso interno</span>
          <EstadoSistema />
        </div>
      </footer>
    </div>
  )
}
