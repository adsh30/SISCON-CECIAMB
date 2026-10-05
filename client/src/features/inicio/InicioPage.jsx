import { useState } from 'react'
import { useSesion } from '../../api/auth.js'

const saludo = (fecha) => {
  const h = fecha.getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default function InicioPage() {
  const { data: usuario } = useSesion()
  const nombre = usuario?.nombre.split(' ')[0]
  const [hoy] = useState(() => new Date())

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight">
        {saludo(hoy)}, {nombre}
      </h1>
      <p className="mt-2 text-pizarra">
        {hoy.toLocaleDateString('es-VE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      <section className="mt-10 rounded-2xl border border-linea bg-superficie p-6">
        <h2 className="font-semibold">El sistema está listo para empezar</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-pizarra">
          Los módulos de comprobantes, libros, plan de cuentas y bitácora se irán habilitando en el
          menú a medida que estén disponibles.
        </p>
      </section>
    </div>
  )
}
