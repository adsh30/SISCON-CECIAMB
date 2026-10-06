import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { usePermisos } from '../../api/auth.js'
import { useActualizarEmpresa, useEmpresa, useQuitarLogo, useSubirLogo } from '../../api/empresa.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Campo, Insignia } from '../../components/ui/Formulario.jsx'
import { bordeCampo, claseCampo } from '../../components/ui/clasesCampo.js'
import { Icono } from '../../components/ui/Icono.jsx'
import { ConfirmDialog } from '../../components/ui/Modal.jsx'
import { formatoFechaHora } from '../../lib/formato.js'

// Mismas reglas que el servidor (empresa.schema.js); el servidor vuelve a validar
const esquema = z.object({
  razonSocial: z.string().trim().min(3, 'Escriba la razón social').max(160),
  nombreComercial: z.string().trim().max(120),
  rif: z
    .string()
    .trim()
    .refine(
      (v) => /^[JGVEPC]\d{7,9}$/.test(v.toUpperCase().replace(/[\s.-]/g, '')),
      'Escriba un RIF válido, por ejemplo J-12345678-9',
    ),
  direccion: z.string().trim().max(255),
  ciudad: z.string().trim().max(80),
  estado: z.string().trim().max(60),
  telefono: z
    .string()
    .trim()
    .refine((v) => !v || /^\+?\d{7,15}$/.test(v.replace(/[\s()-]/g, '')), 'Entre 7 y 15 dígitos'),
  email: z.union([z.literal(''), z.email('Escriba un correo válido')]),
  sitioWeb: z.union([z.literal(''), z.url('Escriba la dirección completa (https://…)')]),
})

const CAMPOS_TEXTO = [
  'razonSocial',
  'nombreComercial',
  'rif',
  'direccion',
  'ciudad',
  'estado',
  'telefono',
  'email',
  'sitioWeb',
]

const valoresDe = (e) => Object.fromEntries(CAMPOS_TEXTO.map((k) => [k, e?.[k] ?? '']))

const LOGO_MAX = 500 * 1024
const TIPOS = ['image/png', 'image/jpeg', 'image/webp']

function Logo({ empresa, puedeEditar }) {
  const subir = useSubirLogo()
  const quitar = useQuitarLogo()
  const avisar = useAvisos()
  const entrada = useRef(null)
  const [confirmar, setConfirmar] = useState(false)

  const elegir = (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    if (!TIPOS.includes(archivo.type)) return avisar('Use una imagen PNG, JPG o WEBP', 'alerta')
    if (archivo.size > LOGO_MAX) return avisar('El logo no puede pesar más de 500 KB', 'alerta')
    const lector = new FileReader()
    lector.onload = () =>
      subir.mutate(lector.result, {
        onSuccess: () => avisar('Logo actualizado', 'exito', archivo.name),
        onError: (err) => avisar(err.message, 'alerta'),
      })
    lector.readAsDataURL(archivo)
  }

  return (
    <section className="rounded-2xl border border-linea bg-superficie p-6">
      <h2 className="font-semibold">Logo para reportes</h2>
      <p className="ayuda mt-1 text-sm text-pizarra">
        Aparecerá en el encabezado de los libros y comprobantes impresos. PNG, JPG o WEBP de hasta
        500 KB; mejor si es horizontal y con fondo blanco o transparente.
      </p>
      <div className="mt-4 flex h-36 items-center justify-center overflow-hidden rounded-xl border border-dashed border-linea bg-papel p-4">
        {empresa.tieneLogo ? (
          <img
            src={`/api/v1/empresa/logo?v=${encodeURIComponent(empresa.actualizadoEn)}`}
            alt={`Logo de ${empresa.razonSocial}`}
            className="size-full object-contain"
          />
        ) : (
          <span className="text-sm text-pizarra">Sin logo cargado</span>
        )}
      </div>
      {puedeEditar && (
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={entrada}
            type="file"
            accept={TIPOS.join(',')}
            onChange={elegir}
            className="hidden"
          />
          <Button
            variante="secundario"
            onClick={() => entrada.current?.click()}
            disabled={subir.isPending}
          >
            <Icono nombre="archivo" className="size-4" />
            {subir.isPending ? 'Subiendo…' : empresa.tieneLogo ? 'Cambiar logo' : 'Subir logo'}
          </Button>
          {empresa.tieneLogo && (
            <Button variante="fantasma" onClick={() => setConfirmar(true)}>
              Quitar logo
            </Button>
          )}
        </div>
      )}
      {confirmar && (
        <ConfirmDialog
          titulo="Quitar logo"
          mensaje="Los reportes se imprimirán sin logo hasta que suba uno nuevo."
          textoConfirmar="Quitar logo"
          variante="peligro"
          pendiente={quitar.isPending}
          error={quitar.error?.message}
          onConfirm={() =>
            quitar.mutate(undefined, {
              onSuccess: () => {
                setConfirmar(false)
                avisar('Logo quitado')
              },
            })
          }
          onCancel={() => setConfirmar(false)}
        />
      )}
    </section>
  )
}

export default function EmpresaPage() {
  const { data: empresa, isPending, isError, error } = useEmpresa()
  const { can } = usePermisos()
  const puedeEditar = can('empresa', 'escritura')
  const guardar = useActualizarEmpresa()
  const avisar = useAvisos()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(esquema), values: valoresDe(empresa) }) // se sincroniza con el servidor

  if (isPending) return <p className="py-10 text-center text-pizarra">Cargando…</p>
  if (isError) return <p className="py-10 text-center text-alerta">{error.message}</p>

  const onSubmit = (datos) => {
    if (!isDirty) return avisar('No había cambios que guardar', 'info')
    guardar.mutate(datos, {
      onSuccess: (e) =>
        avisar('Datos de la empresa actualizados', 'exito', `${e.razonSocial} · ${e.rif}`),
      onError: (err) => {
        if (err.details?.length) {
          err.details.forEach((d) =>
            setError(d.campo, { message: d.mensaje }, { shouldFocus: true }),
          )
        } else avisar(err.message, 'alerta')
      },
    })
  }

  const campo = (k, props = {}) => ({
    id: `empresa-${k}`,
    className: `${claseCampo} ${bordeCampo(errors[k])}`,
    'aria-invalid': !!errors[k],
    ...register(k),
    ...props,
  })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Datos de la empresa</h1>
          <p className="ayuda mt-1 max-w-2xl text-pizarra">
            Identificación del hospital que aparecerá en los libros, comprobantes y reportes.
          </p>
        </div>
        {empresa.completa ? (
          <Insignia tono="exito">Datos completos</Insignia>
        ) : (
          <Insignia tono="aviso">Falta el RIF</Insignia>
        )}
      </div>

      {!empresa.completa && (
        <p className="mt-4 rounded-xl border border-aviso/30 bg-aviso-claro px-4 py-3 text-sm text-aviso">
          Para imprimir libros y comprobantes hace falta la razón social y el RIF.
          {puedeEditar
            ? ' Complételos abajo y pulse Guardar datos.'
            : ' Pídale al administrador que los complete.'}
        </p>
      )}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="rounded-2xl border border-linea bg-superficie p-6"
        >
          <fieldset disabled={!puedeEditar} className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Razón social"
              id="empresa-razonSocial"
              error={errors.razonSocial?.message}
              className="sm:col-span-2"
            >
              <input {...campo('razonSocial')} placeholder="Hospital de Clínicas CECIAMB, C.A." />
            </Campo>
            <Campo
              etiqueta="Nombre comercial"
              id="empresa-nombreComercial"
              error={errors.nombreComercial?.message}
            >
              <input {...campo('nombreComercial')} placeholder="Opcional" />
            </Campo>
            <Campo
              etiqueta="RIF"
              id="empresa-rif"
              error={errors.rif?.message}
              ayuda="Se guarda con el formato J-12345678-9"
            >
              <input
                {...campo('rif')}
                placeholder="J-12345678-9"
                className={`cifras uppercase ${claseCampo} ${bordeCampo(errors.rif)}`}
              />
            </Campo>
            <Campo
              etiqueta="Dirección fiscal"
              id="empresa-direccion"
              error={errors.direccion?.message}
              className="sm:col-span-2"
            >
              <input {...campo('direccion')} />
            </Campo>
            <Campo etiqueta="Ciudad" id="empresa-ciudad" error={errors.ciudad?.message}>
              <input {...campo('ciudad')} />
            </Campo>
            <Campo etiqueta="Estado" id="empresa-estado" error={errors.estado?.message}>
              <input {...campo('estado')} />
            </Campo>
            <Campo etiqueta="Teléfono" id="empresa-telefono" error={errors.telefono?.message}>
              <input
                {...campo('telefono')}
                inputMode="tel"
                placeholder="0286-1234567"
                className={`cifras ${claseCampo} ${bordeCampo(errors.telefono)}`}
              />
            </Campo>
            <Campo etiqueta="Correo" id="empresa-email" error={errors.email?.message}>
              <input {...campo('email')} type="email" placeholder="contabilidad@ceciamb.com" />
            </Campo>
            <Campo
              etiqueta="Sitio web"
              id="empresa-sitioWeb"
              error={errors.sitioWeb?.message}
              className="sm:col-span-2"
            >
              <input {...campo('sitioWeb')} placeholder="https://ceciamb.com" />
            </Campo>
            <Campo etiqueta="Moneda base" id="empresa-moneda">
              <input
                id="empresa-moneda"
                value="Bolívares (Bs.)"
                readOnly
                disabled
                className={`${claseCampo} border-linea text-pizarra`}
              />
            </Campo>
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-4">
            <p className="text-xs text-pizarra">
              {empresa.actualizadoPor
                ? `Última modificación: ${formatoFechaHora(empresa.actualizadoEn)} por ${empresa.actualizadoPor}`
                : 'Datos iniciales del sistema'}
            </p>
            {puedeEditar && (
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? 'Guardando…' : 'Guardar datos'}
              </Button>
            )}
          </div>
        </form>

        <Logo empresa={empresa} puedeEditar={puedeEditar} />
      </div>
    </div>
  )
}
