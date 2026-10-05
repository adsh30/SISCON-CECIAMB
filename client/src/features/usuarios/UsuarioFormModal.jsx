import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCrearUsuario, useDepartamentos, useEditarUsuario } from '../../api/usuarios.js'
import { Button } from '../../components/ui/Button.jsx'
import { Campo } from '../../components/ui/Formulario.jsx'
import { bordeCampo, claseCampo } from '../../components/ui/clasesCampo.js'
import { Modal } from '../../components/ui/Modal.jsx'

const soloLetras = (v) => v.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü' ]/g, '').toUpperCase()
const soloDigitos = (max) => (v) => v.replace(/\D/g, '').slice(0, max)

const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre'),
  apellido: z.string().trim().min(1, 'Escriba el apellido'),
  ci: z.string().regex(/^\d{6,9}$/, 'La cédula debe tener entre 6 y 9 dígitos'),
  email: z.string().trim().pipe(z.email('Escriba un correo válido')),
  telefono: z.union([z.literal(''), z.string().regex(/^\d{7,15}$/, 'Entre 7 y 15 dígitos')]),
  departamento: z.string().max(80),
  rolId: z.coerce.number().int().positive('Seleccione un rol'),
})

/** Crear (sin `usuario`) o editar un usuario. */
export function UsuarioFormModal({ usuario, roles, onClose, onCreado, onGuardado }) {
  const editando = !!usuario
  const crear = useCrearUsuario()
  const editar = useEditarUsuario()
  const { data: departamentos = [] } = useDepartamentos()
  const mutacion = editando ? editar : crear
  const rolPorDefecto = roles.find((r) => r.codigo === 'ANALISTA')?.id ?? roles[0]?.id

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: usuario?.nombre ?? '',
      apellido: usuario?.apellido ?? '',
      ci: usuario?.ci ?? '',
      email: usuario?.email ?? '',
      telefono: usuario?.telefono ?? '',
      departamento: usuario?.departamento ?? '',
      rolId: usuario?.rol.id ?? rolPorDefecto,
    },
  })

  // Filtra lo que se escribe, como en la pantalla original
  const filtrar = (campo, fn) => ({
    ...register(campo),
    onChange: (e) => setValue(campo, fn(e.target.value), { shouldValidate: !!errors[campo] }),
  })

  const onSubmit = (datos) => {
    const cuerpo = { ...datos, email: datos.email.toLowerCase() }
    const opciones = {
      onSuccess: (r) => (editando ? onGuardado(r) : onCreado(r)),
      onError: (err) =>
        err.details?.forEach((d) =>
          setError(d.campo, { message: d.mensaje }, { shouldFocus: true }),
        ),
    }
    if (editando) editar.mutate({ id: usuario.id, ...cuerpo }, opciones)
    else crear.mutate(cuerpo, opciones)
  }

  const errorGeneral =
    mutacion.isError && !mutacion.error.details?.length ? mutacion.error.message : null

  return (
    <Modal
      titulo={editando ? 'Editar usuario' : 'Agregar usuario'}
      descripcion={
        editando ? usuario.email : 'Complete los datos de la persona que usará el sistema.'
      }
      tamano="lg"
      onClose={onClose}
      pie={
        <>
          <Button variante="secundario" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-usuario" disabled={mutacion.isPending}>
            {mutacion.isPending
              ? editando
                ? 'Guardando…'
                : 'Creando…'
              : editando
                ? 'Guardar cambios'
                : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <form
        id="form-usuario"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
      >
        <Campo etiqueta="Nombre" id="nombre" error={errors.nombre?.message}>
          <input
            id="nombre"
            placeholder="Solo letras"
            autoFocus
            className={`${claseCampo} ${bordeCampo(errors.nombre)}`}
            {...filtrar('nombre', soloLetras)}
          />
        </Campo>
        <Campo etiqueta="Apellido" id="apellido" error={errors.apellido?.message}>
          <input
            id="apellido"
            placeholder="Solo letras"
            className={`${claseCampo} ${bordeCampo(errors.apellido)}`}
            {...filtrar('apellido', soloLetras)}
          />
        </Campo>
        <Campo etiqueta="Cédula" id="ci" error={errors.ci?.message}>
          <input
            id="ci"
            inputMode="numeric"
            placeholder="12345678"
            className={`cifras ${claseCampo} ${bordeCampo(errors.ci)}`}
            {...filtrar('ci', soloDigitos(9))}
          />
        </Campo>
        <Campo
          etiqueta="Correo"
          id="email"
          error={errors.email?.message}
          ayuda={
            editando
              ? 'Es el correo con el que inicia sesión. La clave no cambia.'
              : 'Será su usuario para iniciar sesión.'
          }
        >
          <input
            id="email"
            type="email"
            placeholder="nombre@ceciamb.com"
            className={`${claseCampo} ${bordeCampo(errors.email)}`}
            {...register('email')}
          />
        </Campo>
        <Campo etiqueta="Teléfono (opcional)" id="telefono" error={errors.telefono?.message}>
          <input
            id="telefono"
            inputMode="tel"
            placeholder="04141234567"
            className={`cifras ${claseCampo} ${bordeCampo(errors.telefono)}`}
            {...filtrar('telefono', soloDigitos(15))}
          />
        </Campo>
        <Campo
          etiqueta="Departamento (opcional)"
          id="departamento"
          error={errors.departamento?.message}
        >
          <input
            id="departamento"
            list="lista-departamentos"
            placeholder="Ej.: Contabilidad"
            className={`${claseCampo} ${bordeCampo(errors.departamento)}`}
            {...register('departamento')}
          />
          <datalist id="lista-departamentos">
            {departamentos.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </Campo>
        <Campo
          etiqueta="Rol"
          id="rolId"
          error={errors.rolId?.message}
          ayuda="Define qué módulos puede ver y modificar."
          className="sm:col-span-2"
        >
          <select
            id="rolId"
            className={`${claseCampo} ${bordeCampo(errors.rolId)}`}
            {...register('rolId')}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </Campo>

        {!editando && (
          <p className="ayuda rounded-lg bg-marca-claro px-4 py-3 text-sm text-marca sm:col-span-2">
            El sistema generará una clave temporal. Entréguela a la persona: en su primer ingreso
            deberá cambiarla por una propia.
          </p>
        )}
        {errorGeneral && (
          <p className="rounded-lg bg-alerta-claro px-4 py-3 text-sm text-alerta sm:col-span-2">
            {errorGeneral}
          </p>
        )}
      </form>
    </Modal>
  )
}
