import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import * as compService from '../comprobantes/comprobantes.service.js'
import * as repo from './cxc.repository.js'

const ENTIDAD_CLIENTES = 'cxc_clientes'
const ENTIDAD_FACTURAS = 'cxc_facturas'
const ENTIDAD_COBROS = 'cxc_cobros'

// --- Clientes ---
export async function listarClientes(filtros) {
  return repo.listarClientes(filtros)
}

export async function clientePorId(id) {
  const c = await repo.clientePorId(id)
  if (!c) throw new AppError(404, 'CLIENTE_NO_ENCONTRADO', 'El cliente no existe')
  return c
}

export async function crearCliente(datos, actor, ctx) {
  const existe = await repo.clientePorDocumento(datos.tipoDocumento, datos.identificacion)
  if (existe) {
    throw new AppError(
      409,
      'CLIENTE_DUPLICADO',
      `Ya existe un cliente registrado con ${datos.tipoDocumento}-${datos.identificacion}`,
    )
  }

  const id = await db.transaction(async (trx) => {
    const nuevoId = await repo.crearCliente(
      {
        tipo_persona: datos.tipoPersona,
        tipo_documento: datos.tipoDocumento,
        identificacion: datos.identificacion,
        razon_social: datos.razonSocial,
        nombre_comercial: datos.nombreComercial ?? null,
        categoria: datos.categoria,
        telefono: datos.telefono ?? null,
        email: datos.email || null,
        direccion: datos.direccion ?? null,
        dias_credito: datos.diasCredito ?? 30,
        limite_credito: datos.limiteCredito ?? 0,
        cuenta_contable_id: datos.cuentaContableId ?? null,
      },
      trx,
    )

    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.CREAR,
      entidad: ENTIDAD_CLIENTES,
      entidadId: nuevoId,
      despues: datos,
      ctx,
    })

    return nuevoId
  })

  return repo.clientePorId(id)
}

export async function actualizarCliente(id, datos, actor, ctx) {
  const actual = await clientePorId(id)

  await db.transaction(async (trx) => {
    const patch = {}
    if (datos.tipoPersona !== undefined) patch.tipo_persona = datos.tipoPersona
    if (datos.tipoDocumento !== undefined) patch.tipo_documento = datos.tipoDocumento
    if (datos.identificacion !== undefined) patch.identificacion = datos.identificacion
    if (datos.razonSocial !== undefined) patch.razon_social = datos.razonSocial
    if (datos.nombreComercial !== undefined) patch.nombre_comercial = datos.nombreComercial
    if (datos.categoria !== undefined) patch.categoria = datos.categoria
    if (datos.telefono !== undefined) patch.telefono = datos.telefono
    if (datos.email !== undefined) patch.email = datos.email || null
    if (datos.direccion !== undefined) patch.direccion = datos.direccion
    if (datos.diasCredito !== undefined) patch.dias_credito = datos.diasCredito
    if (datos.limiteCredito !== undefined) patch.limite_credito = datos.limiteCredito
    if (datos.cuentaContableId !== undefined) patch.cuenta_contable_id = datos.cuentaContableId
    if (datos.activo !== undefined) patch.activo = datos.activo

    await repo.actualizarCliente(id, patch, trx)

    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.EDITAR,
      entidad: ENTIDAD_CLIENTES,
      entidadId: id,
      antes: actual,
      despues: { ...actual, ...patch },
      ctx,
    })
  })

  return repo.clientePorId(id)
}

// --- Facturas ---
export async function listarFacturas(filtros) {
  return repo.listarFacturas(filtros)
}

export async function facturaPorId(id) {
  const f = await repo.facturaPorId(id)
  if (!f) throw new AppError(404, 'FACTURA_NO_ENCONTRADA', 'La factura no existe')
  const [items, cobros] = await Promise.all([repo.itemsFactura(id), repo.cobrosDeFactura(id)])
  return { ...f, items, cobros }
}

export async function crearFactura(datos, actor, ctx) {
  const cliente = await clientePorId(datos.clienteId)
  if (!cliente.activo) {
    throw new AppError(400, 'CLIENTE_INACTIVO', 'No se puede facturar a un cliente inactivo')
  }

  // Calcular fecha de vencimiento si no fue indicada
  let fechaVencimiento = datos.fechaVencimiento
  if (!fechaVencimiento) {
    const d = new Date(`${datos.fechaEmision}T00:00:00`)
    d.setDate(d.getDate() + (cliente.dias_credito || 0))
    fechaVencimiento = d.toISOString().slice(0, 10)
  }

  // Calcular montos de ítems
  let subtotalExento = 0
  let subtotalGravado = 0
  const itemsProcesados = datos.items.map((it) => {
    const totalItem = Number((it.cantidad * it.precioUnitario).toFixed(2))
    if (it.exento) {
      subtotalExento += totalItem
    } else {
      subtotalGravado += totalItem
    }
    return { ...it, total: totalItem }
  })

  subtotalExento = Number(subtotalExento.toFixed(2))
  subtotalGravado = Number(subtotalGravado.toFixed(2))
  const alicuota = Number(datos.alicuotaIva || 16)
  const montoIva = Number(((subtotalGravado * alicuota) / 100).toFixed(2))
  const total = Number((subtotalExento + subtotalGravado + montoIva).toFixed(2))

  const id = await db.transaction(async (trx) => {
    // 1. Guardar factura
    const facturaId = await repo.crearFactura(
      {
        numero_factura: datos.numeroFactura,
        numero_control: datos.numeroControl || null,
        cliente_id: cliente.id,
        paciente_nombre: datos.pacienteNombre || null,
        paciente_cedula: datos.pacienteCedula || null,
        historia_medica: datos.historiaMedica || null,
        fecha_emision: datos.fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        servicio_departamento: datos.servicioDepartamento || 'HOSPITALIZACION',
        centro_costo_id: datos.centroCostoId || null,
        moneda: datos.moneda || 'VES',
        tasa_cambio: datos.tasaCambio || 1,
        subtotal_exento: subtotalExento,
        subtotal_gravado: subtotalGravado,
        alicuota_iva: alicuota,
        monto_iva: montoIva,
        total,
        saldo_pendiente: total,
        estado: 'PENDIENTE',
        observaciones: datos.observaciones || null,
        creado_por: actor.id,
      },
      itemsProcesados,
      trx,
    )

    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.CREAR,
      entidad: ENTIDAD_FACTURAS,
      entidadId: facturaId,
      despues: { numeroFactura: datos.numeroFactura, total, clienteId: cliente.id },
      ctx,
    })

    return facturaId
  })

  // 2. Si se solicita comprobante automático, generar asiento contable
  if (datos.generarComprobante) {
    try {
      const tipoVenta = await db('tipos_comprobante').where({ codigo: 'VEN' }).first()
      if (tipoVenta) {
        // Determinar cuenta deudor (CxC)
        let ctaCxCId = cliente.cuenta_contable_id
        if (!ctaCxCId) {
          const cuentaCodigo = cliente.categoria === 'ASEGURADORA' ? '1.1.02.02' : '1.1.02.01'
          const cta = await db('cuentas').where({ codigo: cuentaCodigo }).first()
          ctaCxCId = cta?.id
        }

        // Determinar cuenta ingreso
        let ctaIngresoId = itemsProcesados[0]?.cuentaIngresoId
        if (!ctaIngresoId) {
          const ctaIng = await db('cuentas')
            .where('codigo', 'like', '4.1%')
            .where('es_movimiento', true)
            .first()
          ctaIngresoId = ctaIng?.id
        }

        // Cuenta débito fiscal IVA
        const ctaIva = await db('cuentas').where({ codigo: '2.1.02.01' }).first()

        if (ctaCxCId && ctaIngresoId) {
          const renglones = [
            {
              cuentaId: ctaCxCId,
              centroCostoId: datos.centroCostoId || null,
              descripcion: `Factura ${datos.numeroFactura} - ${cliente.razon_social}`,
              debe: total,
              haber: 0,
            },
          ]

          const subtotalTotal = Number((subtotalExento + subtotalGravado).toFixed(2))
          if (subtotalTotal > 0) {
            renglones.push({
              cuentaId: ctaIngresoId,
              centroCostoId: datos.centroCostoId || null,
              descripcion: `Ingreso por atención clínica - Fac. ${datos.numeroFactura}`,
              debe: 0,
              haber: subtotalTotal,
            })
          }

          if (montoIva > 0 && ctaIva?.id) {
            renglones.push({
              cuentaId: ctaIva.id,
              centroCostoId: null,
              descripcion: `Débito fiscal IVA 16% - Fac. ${datos.numeroFactura}`,
              debe: 0,
              haber: montoIva,
            })
          }

          const comprobante = await compService.crear(
            {
              tipoId: tipoVenta.id,
              fecha: datos.fechaEmision,
              concepto: `Facturación de servicios asistenciales ${datos.numeroFactura} a ${cliente.razon_social}`,
              referencia: datos.numeroFactura,
              beneficiario: cliente.razon_social,
              renglones,
            },
            actor,
            ctx,
          )

          await db('cxc_facturas')
            .where({ id })
            .update({ comprobante_id: comprobante.id })
        }
      }
    } catch (err) {
      console.warn('No se pudo generar el comprobante automático de venta:', err.message)
    }
  }

  return facturaPorId(id)
}

// --- Cobros ---
export async function listarCobros(filtros) {
  return repo.listarCobros(filtros)
}

export async function cobroPorId(id) {
  const c = await repo.cobroPorId(id)
  if (!c) throw new AppError(404, 'COBRO_NO_ENCONTRADO', 'El registro de cobro no existe')
  return c
}

export async function crearCobro(datos, actor, ctx) {
  const factura = await repo.facturaPorId(datos.facturaId)
  if (!factura) {
    throw new AppError(404, 'FACTURA_NO_ENCONTRADA', 'La factura asociada no existe')
  }
  if (factura.estado === 'ANULADA') {
    throw new AppError(400, 'FACTURA_ANULADA', 'No se puede cobrar una factura anulada')
  }
  if (Number(datos.monto) > Number(factura.saldo_pendiente) + 0.01) {
    throw new AppError(
      400,
      'MONTO_EXCEDE_SALDO',
      `El monto (${datos.monto} Bs) supera el saldo pendiente de la factura (${factura.saldo_pendiente} Bs)`,
    )
  }

  const id = await db.transaction(async (trx) => {
    const cobroId = await repo.crearCobro(
      {
        numero_recibo: datos.numeroRecibo,
        cliente_id: datos.clienteId,
        factura_id: datos.facturaId,
        fecha_cobro: datos.fechaCobro,
        forma_pago: datos.formaPago,
        referencia: datos.referencia || null,
        monto: datos.monto,
        cuenta_destino_id: datos.cuentaDestinoId || null,
        notas: datos.notas || null,
        creado_por: actor.id,
      },
      trx,
    )

    // Recalcular saldo pendiente y estado de la factura
    await repo.actualizarSaldoFactura(datos.facturaId, trx)

    // Si se solicita comprobante de cobro automático (Tipo ING)
    await registrar(trx, {
      usuarioId: actor.id,
      accion: ACCIONES.CREAR,
      entidad: ENTIDAD_COBROS,
      entidadId: cobroId,
      despues: { numeroRecibo: datos.numeroRecibo, monto: datos.monto, facturaId: datos.facturaId },
      ctx,
    })

    return cobroId
  })

  // Si se solicita comprobante de cobro automático (Tipo ING)
  if (datos.generarComprobante) {
    try {
      const tipoIng = await db('tipos_comprobante').where({ codigo: 'ING' }).first()
      const cliente = await db('cxc_clientes').where({ id: datos.clienteId }).first()

      let ctaDebeId = datos.cuentaDestinoId
      if (!ctaDebeId) {
        // Por defecto: Banco Mercantil (1.1.01.02.001) o Caja (1.1.01.01.001)
        const ctaBanco = await db('cuentas')
          .where('codigo', 'like', '1.1.01%')
          .where('es_movimiento', true)
          .first()
        ctaDebeId = ctaBanco?.id
      }

      let ctaHaberId = cliente?.cuenta_contable_id
      if (!ctaHaberId) {
        const cuentaCodigo = cliente?.categoria === 'ASEGURADORA' ? '1.1.02.02' : '1.1.02.01'
        const cta = await db('cuentas').where({ codigo: cuentaCodigo }).first()
        ctaHaberId = cta?.id
      }

      if (tipoIng && ctaDebeId && ctaHaberId) {
        const renglones = [
          {
            cuentaId: ctaDebeId,
            centroCostoId: null,
            descripcion: `Ingreso cobro Fac. ${factura.numero_factura} (${datos.formaPago})`,
            debe: datos.monto,
            haber: 0,
          },
          {
            cuentaId: ctaHaberId,
            centroCostoId: null,
            descripcion: `Abono a cuenta por cobrar Fac. ${factura.numero_factura}`,
            debe: 0,
            haber: datos.monto,
          },
        ]

        const comprobante = await compService.crear(
          {
            tipoId: tipoIng.id,
            fecha: datos.fechaCobro,
            concepto: `Recibo de Cobro ${datos.numeroRecibo} - Fac. ${factura.numero_factura} - ${cliente?.razon_social}`,
            referencia: datos.referencia || datos.numeroRecibo,
            beneficiario: cliente?.razon_social,
            renglones,
          },
          actor,
          ctx,
        )

        await db('cxc_cobros').where({ id }).update({ comprobante_id: comprobante.id })
      }
    } catch (err) {
      console.warn('No se pudo generar el comprobante automático de ingreso:', err.message)
    }
  }

  return cobroPorId(id)
}

// --- Métricas y Reporte de Antigüedad de Saldos ---
export async function obtenerKpis() {
  return repo.obtenerKpisCartera()
}

export async function obtenerAntiguedad() {
  return repo.reporteAntiguedadSaldos()
}
