import { db } from '../../config/db.js'

// --- Clientes ---
export async function listarClientes(filtros = {}, trx = db) {
  let q = trx('cxc_clientes as c')
    .leftJoin('cuentas as cu', 'c.cuenta_contable_id', 'cu.id')
    .select(
      'c.*',
      'cu.codigo as cuenta_codigo',
      'cu.nombre as cuenta_nombre',
      trx.raw(
        `(SELECT COALESCE(SUM(f.saldo_pendiente), 0) FROM cxc_facturas f WHERE f.cliente_id = c.id AND f.estado IN ('PENDIENTE', 'COBRADA_PARCIAL')) as saldo_total`,
      ),
    )
    .orderBy('c.razon_social', 'asc')

  if (filtros.categoria) {
    q = q.where('c.categoria', filtros.categoria)
  }
  if (filtros.activo !== undefined) {
    q = q.where('c.activo', filtros.activo)
  }
  if (filtros.busqueda) {
    const b = `%${filtros.busqueda.trim()}%`
    q = q.where((builder) => {
      builder
        .where('c.razon_social', 'like', b)
        .orWhere('c.nombre_comercial', 'like', b)
        .orWhere('c.identificacion', 'like', b)
    })
  }

  return q
}

export async function clientePorId(id, trx = db) {
  return trx('cxc_clientes as c')
    .leftJoin('cuentas as cu', 'c.cuenta_contable_id', 'cu.id')
    .select('c.*', 'cu.codigo as cuenta_codigo', 'cu.nombre as cuenta_nombre')
    .where('c.id', id)
    .first()
}

export async function clientePorDocumento(tipoDocumento, identificacion, trx = db) {
  return trx('cxc_clientes')
    .where({ tipo_documento: tipoDocumento, identificacion })
    .first()
}

export async function crearCliente(datos, trx = db) {
  const [id] = await trx('cxc_clientes').insert(datos)
  return id
}

export async function actualizarCliente(id, datos, trx = db) {
  await trx('cxc_clientes').where({ id }).update({
    ...datos,
    actualizado_en: trx.fn.now(),
  })
}

// --- Facturas ---
export async function listarFacturas(filtros = {}, trx = db) {
  let q = trx('cxc_facturas as f')
    .join('cxc_clientes as c', 'f.cliente_id', 'c.id')
    .leftJoin('centros_costo as cc', 'f.centro_costo_id', 'cc.id')
    .leftJoin('comprobantes as comp', 'f.comprobante_id', 'comp.id')
    .select(
      'f.*',
      'c.razon_social as cliente_nombre',
      'c.tipo_documento as cliente_tipo_doc',
      'c.identificacion as cliente_identificacion',
      'c.categoria as cliente_categoria',
      'cc.nombre as centro_costo_nombre',
      'comp.codigo as comprobante_codigo',
      'comp.estado as comprobante_estado',
    )
    .orderBy('f.fecha_emision', 'desc')
    .orderBy('f.id', 'desc')

  if (filtros.clienteId) q = q.where('f.cliente_id', filtros.clienteId)
  if (filtros.estado) q = q.where('f.estado', filtros.estado)
  if (filtros.desde) q = q.where('f.fecha_emision', '>=', filtros.desde)
  if (filtros.hasta) q = q.where('f.fecha_emision', '<=', filtros.hasta)
  if (filtros.servicio) q = q.where('f.servicio_departamento', filtros.servicio)
  if (filtros.busqueda) {
    const b = `%${filtros.busqueda.trim()}%`
    q = q.where((builder) => {
      builder
        .where('f.numero_factura', 'like', b)
        .orWhere('f.numero_control', 'like', b)
        .orWhere('f.paciente_nombre', 'like', b)
        .orWhere('f.paciente_cedula', 'like', b)
        .orWhere('c.razon_social', 'like', b)
    })
  }

  return q
}

export async function facturaPorId(id, trx = db) {
  return trx('cxc_facturas as f')
    .join('cxc_clientes as c', 'f.cliente_id', 'c.id')
    .leftJoin('centros_costo as cc', 'f.centro_costo_id', 'cc.id')
    .leftJoin('comprobantes as comp', 'f.comprobante_id', 'comp.id')
    .select(
      'f.*',
      'c.razon_social as cliente_nombre',
      'c.tipo_documento as cliente_tipo_doc',
      'c.identificacion as cliente_identificacion',
      'c.categoria as cliente_categoria',
      'c.dias_credito as cliente_dias_credito',
      'c.cuenta_contable_id as cliente_cuenta_id',
      'cc.nombre as centro_costo_nombre',
      'comp.codigo as comprobante_codigo',
      'comp.estado as comprobante_estado',
    )
    .where('f.id', id)
    .first()
}

export async function itemsFactura(facturaId, trx = db) {
  return trx('cxc_factura_items as i')
    .leftJoin('cuentas as cu', 'i.cuenta_ingreso_id', 'cu.id')
    .select('i.*', 'cu.codigo as cuenta_codigo', 'cu.nombre as cuenta_nombre')
    .where('i.factura_id', facturaId)
    .orderBy('i.id', 'asc')
}

export async function cobrosDeFactura(facturaId, trx = db) {
  return trx('cxc_cobros as cb')
    .leftJoin('cuentas as cu', 'cb.cuenta_destino_id', 'cu.id')
    .leftJoin('comprobantes as comp', 'cb.comprobante_id', 'comp.id')
    .select(
      'cb.*',
      'cu.codigo as cuenta_destino_codigo',
      'cu.nombre as cuenta_destino_nombre',
      'comp.codigo as comprobante_codigo',
    )
    .where('cb.factura_id', facturaId)
    .orderBy('cb.fecha_cobro', 'asc')
}

export async function crearFactura(datos, items, trx = db) {
  const [id] = await trx('cxc_facturas').insert(datos)
  if (items && items.length > 0) {
    const filasItems = items.map((it) => ({
      factura_id: id,
      codigo_servicio: it.codigoServicio ?? null,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precio_unitario: it.precioUnitario,
      exento: it.exento ?? false,
      total: it.total,
      cuenta_ingreso_id: it.cuentaIngresoId ?? null,
    }))
    await trx('cxc_factura_items').insert(filasItems)
  }
  return id
}

export async function actualizarSaldoFactura(facturaId, trx = db) {
  const cobradoRes = await trx('cxc_cobros')
    .where('factura_id', facturaId)
    .sum({ total: 'monto' })
    .first()

  const totalCobrado = Number(cobradoRes?.total || 0)
  const fac = await trx('cxc_facturas').where('id', facturaId).first()
  if (!fac) return

  const totalFactura = Number(fac.total)
  const saldoPendiente = Math.max(0, Number((totalFactura - totalCobrado).toFixed(2)))

  let nuevoEstado = fac.estado
  if (fac.estado !== 'ANULADA') {
    if (saldoPendiente === 0) {
      nuevoEstado = 'COBRADA_TOTAL'
    } else if (totalCobrado > 0) {
      nuevoEstado = 'COBRADA_PARCIAL'
    } else {
      nuevoEstado = 'PENDIENTE'
    }
  }

  await trx('cxc_facturas').where('id', facturaId).update({
    saldo_pendiente: saldoPendiente,
    estado: nuevoEstado,
    actualizado_en: trx.fn.now(),
  })
}

// --- Cobros ---
export async function listarCobros(filtros = {}, trx = db) {
  let q = trx('cxc_cobros as cb')
    .join('cxc_clientes as c', 'cb.cliente_id', 'c.id')
    .join('cxc_facturas as f', 'cb.factura_id', 'f.id')
    .leftJoin('cuentas as cu', 'cb.cuenta_destino_id', 'cu.id')
    .leftJoin('comprobantes as comp', 'cb.comprobante_id', 'comp.id')
    .select(
      'cb.*',
      'c.razon_social as cliente_nombre',
      'c.tipo_documento as cliente_tipo_doc',
      'c.identificacion as cliente_identificacion',
      'f.numero_factura',
      'f.paciente_nombre',
      'cu.codigo as cuenta_codigo',
      'cu.nombre as cuenta_nombre',
      'comp.codigo as comprobante_codigo',
    )
    .orderBy('cb.fecha_cobro', 'desc')
    .orderBy('cb.id', 'desc')

  if (filtros.clienteId) q = q.where('cb.cliente_id', filtros.clienteId)
  if (filtros.facturaId) q = q.where('cb.factura_id', filtros.facturaId)
  if (filtros.desde) q = q.where('cb.fecha_cobro', '>=', filtros.desde)
  if (filtros.hasta) q = q.where('cb.fecha_cobro', '<=', filtros.hasta)
  if (filtros.formaPago) q = q.where('cb.forma_pago', filtros.formaPago)

  return q
}

export async function cobroPorId(id, trx = db) {
  return trx('cxc_cobros as cb')
    .join('cxc_clientes as c', 'cb.cliente_id', 'c.id')
    .join('cxc_facturas as f', 'cb.factura_id', 'f.id')
    .leftJoin('cuentas as cu', 'cb.cuenta_destino_id', 'cu.id')
    .leftJoin('comprobantes as comp', 'cb.comprobante_id', 'comp.id')
    .select(
      'cb.*',
      'c.razon_social as cliente_nombre',
      'c.tipo_documento as cliente_tipo_doc',
      'c.identificacion as cliente_identificacion',
      'f.numero_factura',
      'f.paciente_nombre',
      'cu.codigo as cuenta_codigo',
      'cu.nombre as cuenta_nombre',
      'comp.codigo as comprobante_codigo',
    )
    .where('cb.id', id)
    .first()
}

export async function crearCobro(datos, trx = db) {
  const [id] = await trx('cxc_cobros').insert(datos)
  return id
}

// --- Reporte de Antigüedad de Saldos (Aging) y KPIs ---
export async function obtenerKpisCartera(trx = db) {
  const [res] = await trx('cxc_facturas')
    .whereIn('estado', ['PENDIENTE', 'COBRADA_PARCIAL'])
    .select(
      trx.raw('COUNT(*) as total_facturas_pendientes'),
      trx.raw('COALESCE(SUM(saldo_pendiente), 0) as total_saldo_pendiente'),
      trx.raw(
        'COALESCE(SUM(CASE WHEN fecha_vencimiento < CURDATE() THEN saldo_pendiente ELSE 0 END), 0) as total_saldo_vencido',
      ),
      trx.raw(
        'COALESCE(SUM(CASE WHEN fecha_vencimiento >= CURDATE() THEN saldo_pendiente ELSE 0 END), 0) as total_saldo_corriente',
      ),
    )

  const clientesCount = await trx('cxc_clientes').where('activo', true).count({ total: '*' }).first()

  return {
    facturasPendientes: Number(res.total_facturas_pendientes || 0),
    saldoPendiente: Number(res.total_saldo_pendiente || 0),
    saldoVencido: Number(res.total_saldo_vencido || 0),
    saldoCorriente: Number(res.total_saldo_corriente || 0),
    clientesActivos: Number(clientesCount?.total || 0),
  }
}

export async function reporteAntiguedadSaldos(trx = db) {
  // Buckets de vencimiento: Corriente (por vencer), 1-30 días, 31-60 días, 61-90 días, +90 días
  return trx('cxc_facturas as f')
    .join('cxc_clientes as c', 'f.cliente_id', 'c.id')
    .whereIn('f.estado', ['PENDIENTE', 'COBRADA_PARCIAL'])
    .groupBy('c.id', 'c.razon_social', 'c.tipo_documento', 'c.identificacion', 'c.categoria')
    .select(
      'c.id as cliente_id',
      'c.razon_social',
      'c.tipo_documento',
      'c.identificacion',
      'c.categoria',
      trx.raw('COUNT(f.id) as cantidad_facturas'),
      trx.raw('COALESCE(SUM(f.saldo_pendiente), 0) as total_deuda'),
      trx.raw(
        'COALESCE(SUM(CASE WHEN f.fecha_vencimiento >= CURDATE() THEN f.saldo_pendiente ELSE 0 END), 0) as corriente',
      ),
      trx.raw(
        'COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) BETWEEN 1 AND 30 THEN f.saldo_pendiente ELSE 0 END), 0) as dias_1_30',
      ),
      trx.raw(
        'COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) BETWEEN 31 AND 60 THEN f.saldo_pendiente ELSE 0 END), 0) as dias_31_60',
      ),
      trx.raw(
        'COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) BETWEEN 61 AND 90 THEN f.saldo_pendiente ELSE 0 END), 0) as dias_61_90',
      ),
      trx.raw(
        'COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) > 90 THEN f.saldo_pendiente ELSE 0 END), 0) as mas_90_dias',
      ),
    )
    .orderBy('total_deuda', 'desc')
}
