import { Router } from 'express'
import { auth, claveVigente, requirePermiso } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import * as c from './cxc.controller.js'
import {
  actualizarClienteSchema,
  crearClienteSchema,
  crearCobroSchema,
  crearFacturaSchema,
  filtrosClientesSchema,
  filtrosCobrosSchema,
  filtrosFacturasSchema,
} from './cxc.schema.js'

export const cxcRoutes = Router()

const ver = requirePermiso('comprobantes', 'lectura')
const modificar = requirePermiso('comprobantes', 'escritura')

cxcRoutes.use(auth, claveVigente)

// KPIs y Antigüedad de cartera
cxcRoutes.get('/kpis', ver, c.kpisCartera)
cxcRoutes.get('/antiguedad', ver, c.reporteAntiguedad)

// Clientes
cxcRoutes.get('/clientes', ver, validate(filtrosClientesSchema, 'query'), c.listarClientes)
cxcRoutes.get('/clientes/:id', ver, c.detalleCliente)
cxcRoutes.post('/clientes', modificar, validate(crearClienteSchema), c.crearCliente)
cxcRoutes.put('/clientes/:id', modificar, validate(actualizarClienteSchema), c.actualizarCliente)

// Facturas
cxcRoutes.get('/facturas', ver, validate(filtrosFacturasSchema, 'query'), c.listarFacturas)
cxcRoutes.get('/facturas/:id', ver, c.detalleFactura)
cxcRoutes.post('/facturas', modificar, validate(crearFacturaSchema), c.crearFactura)

// Cobros
cxcRoutes.get('/cobros', ver, validate(filtrosCobrosSchema, 'query'), c.listarCobros)
cxcRoutes.get('/cobros/:id', ver, c.detalleCobro)
cxcRoutes.post('/cobros', modificar, validate(crearCobroSchema), c.crearCobro)
