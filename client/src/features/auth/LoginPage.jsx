import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { useLogin, useSesion } from '../../api/auth.js'
import { Button } from '../../components/ui/Button.jsx'
import { Logo } from '../../components/ui/Logo.jsx'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Escriba su correo').pipe(z.email('Escriba un correo válido')),
  password: z.string().min(1, 'Escriba su contraseña'),
})

const campo =
  'mt-1.5 block w-full rounded-lg border bg-superficie px-3.5 py-2.5 text-tinta placeholder:text-pizarra/60 transition-colors focus:border-marca focus:ring-3 focus:ring-marca/15 focus:outline-none'

export default function LoginPage() {
  const { data: usuario } = useSesion()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const [verClave, setVerClave] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) })

  const destino = location.state?.desde ?? '/app'
  if (usuario) return <Navigate to={destino} replace />

  const onSubmit = (datos) =>
    login.mutate(datos, { onSuccess: () => navigate(destino, { replace: true }) })

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        {/* Fachada del hospital bajo un velo azul de la marca */}
        <img
          src="/img/fachada-hospital.webp"
          alt=""
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-[#00214a]/95 via-[#003272]/70 to-[#004191]/35" />
        <Link to="/" className="self-start rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
          <Logo fijo />
        </Link>
        <div className="max-w-sm text-white">
          <p className="text-2xl leading-snug font-semibold text-balance">
            Cada comprobante cuadrado, cada cambio registrado.
          </p>
          <p className="mt-3 leading-relaxed text-white/80">
            Hospital de Clínicas CECIAMB. Salud total y accesible con sensibilidad humana.
          </p>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold tracking-tight">Iniciar sesión</h1>
          <p className="mt-2 text-pizarra">
            Use el correo y la contraseña que le asignó el administrador.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            {login.isError && (
              <div
                role="alert"
                className={`rounded-lg px-4 py-3 text-sm ${
                  login.error.status === 423
                    ? 'bg-aviso-claro text-aviso'
                    : 'bg-alerta-claro text-alerta'
                }`}
              >
                {!login.error.status || login.error.code === 'ERROR'
                  ? 'No hay conexión con el servidor. Verifique que el sistema esté encendido.'
                  : login.error.message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Correo
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="nombre@ceciamb.com"
                aria-invalid={!!errors.email}
                className={`${campo} ${errors.email ? 'border-alerta' : 'border-linea'}`}
                {...register('email')}
              />
              {errors.email && <p className="mt-1.5 text-sm text-alerta">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  className="text-sm text-marca hover:text-marca-oscuro"
                >
                  {verClave ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <input
                id="password"
                type={verClave ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className={`${campo} ${errors.password ? 'border-alerta' : 'border-linea'}`}
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-alerta">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={login.isPending} className="w-full py-3">
              {login.isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-8 text-sm text-pizarra">
            ¿Olvidó su contraseña? Pida al administrador del sistema que se la restablezca.{' '}
            <a
              href="/manual.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-marca hover:underline"
            >
              Ver el manual
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
