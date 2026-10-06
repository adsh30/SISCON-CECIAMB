import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import * as c from './usuarios.controller.js'
import { estadoSchema, usuarioSchema } from './usuarios.schema.js'

export const usuariosRoutes = Router()

const leer = requirePermiso('usuarios', 'lectura')
const escribir = requirePermiso('usuarios', 'escritura')

usuariosRoutes.use(auth, claveVigente)
usuariosRoutes.get('/', leer, c.getListado)
usuariosRoutes.get('/departamentos', leer, c.getDepartamentos)
usuariosRoutes.get('/:id', leer, c.getDetalle)
usuariosRoutes.post('/', escribir, validate(usuarioSchema), c.postCrear)
usuariosRoutes.put('/:id', escribir, validate(usuarioSchema), c.putEditar)
usuariosRoutes.patch('/:id/estado', escribir, validate(estadoSchema), c.patchEstado)
usuariosRoutes.post('/:id/archivar', escribir, c.postArchivar)
usuariosRoutes.post('/:id/desarchivar', escribir, c.postDesarchivar)
usuariosRoutes.post('/:id/resetear-clave', escribir, c.postResetearClave)
