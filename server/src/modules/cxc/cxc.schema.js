import { z } from 'zod'

export const tipoPersonaEnum = z.enum(['NATURAL', 'JURIDICA'])
export const tipoDocumentoEnum = z.enum(['V', 'E', 'J', 'G', 'P'])
export const categoriaClienteEnum = z.enum(['ASEGURADORA', 'PARTICULAR', 'CORPORATIVO', 'CONVENIO'])
export const formaPagoEnum = z.enum([
  'TRANSFERENCIA',
  'PUNTO_VENTA',
  'PAGO_MOVIL',
  'EFECTIVO_USD',
  'EFECTIVO_VES',
  'RETENCION_IVA',
  'RETENCION_ISLR',
])

// Clientes CxC
export const crearClienteSchema = z.object({
  tipoPersona: tipoPersonaEnum.default('JURIDICA'),
  tipoDocumento: tipoDocumentoEnum.default('J'),
  identificacion: z.string().trim().min(3).max(30),
  razonSocial: z.string().trim().min(2).max(200),
  nombreComercial: z.string().trim().max(200).optional().nullable(),
  categoria: categoriaClienteEnum.default('ASEGURADORA'),
  telefono: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email().max(120).optional().nullable().or(z.literal('')),
  direccion: z.string().trim().max(500).optional().nullable(),
  diasCredito: z.coerce.number().int().min(0).max(365).default(30),
  limiteCredito: z.coerce.number().min(0).default(0),
  cuentaContableId: z.coerce.number().int().positive().optional().nullable(),
})

export const actualizarClienteSchema = crearClienteSchema.partial()

export const filtrosClientesSchema = z.object({
  categoria: categoriaClienteEnum.optional(),
  busqueda: z.string().trim().optional(),
  activo: z.coerce.boolean().optional(),
})

// Renglón de factura
export const itemFacturaSchema = z.object({
  codigoServicio: z.string().trim().max(50).optional().nullable(),
  descripcion: z.string().trim().min(2).max(255),
  cantidad: z.coerce.number().positive().default(1),
  precioUnitario: z.coerce.number().min(0),
  exento: z.boolean().default(false),
  cuentaIngresoId: z.coerce.number().int().positive().optional().nullable(),
})

// Facturas CxC
export const crearFacturaSchema = z.object({
  numeroFactura: z.string().trim().min(1).max(50),
  numeroControl: z.string().trim().max(50).optional().nullable(),
  clienteId: z.coerce.number().int().positive(),
  pacienteNombre: z.string().trim().max(150).optional().nullable(),
  pacienteCedula: z.string().trim().max(30).optional().nullable(),
  historiaMedica: z.string().trim().max(50).optional().nullable(),
  fechaEmision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  fechaVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
  servicioDepartamento: z.string().trim().max(50).default('HOSPITALIZACION'),
  centroCostoId: z.coerce.number().int().positive().optional().nullable(),
  moneda: z.enum(['VES', 'USD']).default('VES'),
  tasaCambio: z.coerce.number().positive().default(1),
  alicuotaIva: z.coerce.number().min(0).max(100).default(16),
  items: z.array(itemFacturaSchema).min(1, 'La factura debe incluir al menos un servicio o ítem'),
  observaciones: z.string().trim().max(500).optional().nullable(),
  generarComprobante: z.boolean().default(true),
})

export const filtrosFacturasSchema = z.object({
  clienteId: z.coerce.number().int().positive().optional(),
  estado: z.enum(['PENDIENTE', 'COBRADA_PARCIAL', 'COBRADA_TOTAL', 'ANULADA']).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  servicio: z.string().trim().optional(),
  busqueda: z.string().trim().optional(),
})

// Cobros / Recibos
export const crearCobroSchema = z.object({
  numeroRecibo: z.string().trim().min(1).max(50),
  clienteId: z.coerce.number().int().positive(),
  facturaId: z.coerce.number().int().positive(),
  fechaCobro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  formaPago: formaPagoEnum,
  referencia: z.string().trim().max(100).optional().nullable(),
  monto: z.coerce.number().positive('El monto del cobro debe ser mayor a cero'),
  cuentaDestinoId: z.coerce.number().int().positive().optional().nullable(),
  notas: z.string().trim().max(500).optional().nullable(),
  generarComprobante: z.boolean().default(true),
})

export const filtrosCobrosSchema = z.object({
  clienteId: z.coerce.number().int().positive().optional(),
  facturaId: z.coerce.number().int().positive().optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  formaPago: formaPagoEnum.optional(),
})
