import { Router } from 'express'
import { z } from 'zod'
import { AppError } from '../../middlewares/errorHandler.js'
import { auth, claveVigente, requestContext, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { CLAVES_MODULOS } from './permisos.catalogo.js'
import * as service from './roles.service.js'

const rolSchema = z.object({
  nombre: z.string().trim().min(2, 'Escriba el nombre del rol').max(60),
  descripcion: z
    .string()
    .trim()
    .max(255)
    .transform((v) => v || null)
    .nullable()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido')
    .default('#64748b'),
})

const nivel = z.object({ lectura: z.boolean(), escritura: z.boolean(), full: z.boolean() })
const permisosSchema = z.object({
  permisos: z.partialRecord(z.enum(CLAVES_MODULOS), nivel),
})

function idParam(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new AppError(400, 'ID_INVALIDO', 'Identificador inválido')
  return id
}

export const rolesRoutes = Router()

const leer = requirePermiso('usuarios', 'lectura')
const escribir = requirePermiso('usuarios', 'escritura')

rolesRoutes.use(auth, claveVigente)

rolesRoutes.get('/', leer, async (req, res) => {
  res.json(await service.listar())
})

rolesRoutes.post('/', escribir, validate(rolSchema), async (req, res) => {
  res.status(201).json({ data: await service.crear(req.body, req.user, requestContext(req)) })
})

rolesRoutes.put('/:id', escribir, validate(rolSchema), async (req, res) => {
  res.json({ data: await service.editar(idParam(req), req.body, req.user, requestContext(req)) })
})

rolesRoutes.delete('/:id', escribir, async (req, res) => {
  await service.eliminar(idParam(req), req.user, requestContext(req))
  res.status(204).end()
})

rolesRoutes.put('/:id/permisos', escribir, validate(permisosSchema), async (req, res) => {
  const data = await service.actualizarPermisos(
    idParam(req),
    req.body.permisos,
    req.user,
    requestContext(req),
  )
  res.json({ data })
})

rolesRoutes.post('/:id/permisos/restaurar', escribir, async (req, res) => {
  res.json({ data: await service.restaurarPermisos(idParam(req), req.user, requestContext(req)) })
})
