import { db } from '../../config/db.js'

export async function crear(datos, trx = db) {
  const [id] = await trx('conciliaciones').insert({
    cuenta_id: datos.cuentaId,
    periodo_id: datos.periodoId,
    fecha_corte: datos.fechaCorte,
    saldo_banco: datos.saldoBanco,
    saldo_libros: datos.saldoLibros,
    diferencia: datos.diferencia,
    estado: 'BORRADOR',
    observaciones: datos.observaciones || null,
    creado_por: datos.creadoPor,
    creado_en: trx.fn.now(),
    actualizado_en: trx.fn.now(),
  })
  return id
}

export async function obtenerPorId(id, trx = db) {
  const row = await trx('conciliaciones as c')
    .leftJoin('cuentas as cu', 'c.cuenta_id', 'cu.id')
    .leftJoin('periodos as p', 'c.periodo_id', 'p.id')
    .leftJoin('usuarios as u', 'c.creado_por', 'u.id')
    .leftJoin('usuarios as uc', 'c.conciliado_por', 'uc.id')
    .where('c.id', id)
    .select(
      'c.*',
      'cu.codigo as cuenta_codigo',
      'cu.nombre as cuenta_nombre',
      'p.numero as periodo_numero',
      'p.anio as periodo_anio',
      'p.mes as periodo_mes',
      'u.nombre as creado_por_nombre',
      'u.apellido as creado_por_apellido',
      'uc.nombre as conciliado_por_nombre',
      'uc.apellido as conciliado_por_apellido',
    )
    .first()
  return row || null
}

export async function listar({ cuentaId, estado } = {}, trx = db) {
  const q = trx('conciliaciones as c')
    .join('cuentas as cu', 'c.cuenta_id', 'cu.id')
    .join('periodos as p', 'c.periodo_id', 'p.id')
    .select(
      'c.*',
      'cu.codigo as cuenta_codigo',
      'cu.nombre as cuenta_nombre',
      'p.numero as periodo_numero',
      'p.anio as periodo_anio',
      'p.mes as periodo_mes',
    )
    .orderBy('c.fecha_corte', 'desc')
    .orderBy('c.id', 'desc')

  if (cuentaId) q.where('c.cuenta_id', cuentaId)
  if (estado) q.where('c.estado', estado)

  return q
}

export async function obtenerMovimientosLibroAprobados(cuentaId, fechaDesde, fechaHasta, trx = db) {
  return trx('comprobante_detalle as cd')
    .join('comprobantes as c', 'cd.comprobante_id', 'c.id')
    .where('cd.cuenta_id', cuentaId)
    .where('c.estado', 'APROBADO')
    .whereBetween('c.fecha', [fechaDesde, fechaHasta])
    .select(
      'cd.id as comprobante_detalle_id',
      'c.fecha',
      'c.numero as referencia',
      'cd.descripcion',
      'cd.debe',
      'cd.haber',
    )
    .orderBy('c.fecha', 'asc')
    .orderBy('cd.id', 'asc')
}

export async function obtenerSaldoMayor(cuentaId, fechaHasta, trx = db) {
  // Suma de debe y haber para la cuenta hasta la fecha de corte
  const res = await trx('comprobante_detalle as cd')
    .join('comprobantes as c', 'cd.comprobante_id', 'c.id')
    .where('cd.cuenta_id', cuentaId)
    .where('c.estado', 'APROBADO')
    .where('c.fecha', '<=', fechaHasta)
    .select(
      trx.raw('COALESCE(SUM(cd.debe), 0) as total_debe'),
      trx.raw('COALESCE(SUM(cd.haber), 0) as total_haber'),
    )
    .first()

  return {
    totalDebe: res?.total_debe?.toString() || '0.00',
    totalHaber: res?.total_haber?.toString() || '0.00',
  }
}

export async function insertarPartidas(partidas, trx = db) {
  if (!partidas.length) return
  await trx('conciliacion_partidas').insert(partidas)
}

export async function listarPartidas(conciliacionId, trx = db) {
  return trx('conciliacion_partidas')
    .where('conciliacion_id', conciliacionId)
    .orderBy('fecha', 'asc')
    .orderBy('id', 'asc')
}

export async function obtenerPartidaPorId(id, trx = db) {
  return trx('conciliacion_partidas').where('id', id).first()
}

export async function emparejar(partidaLibroId, partidaBancoId, trx = db) {
  await trx('conciliacion_partidas')
    .where('id', partidaLibroId)
    .update({ estado: 'CONCILIADO', partida_emparejada_id: partidaBancoId })

  await trx('conciliacion_partidas')
    .where('id', partidaBancoId)
    .update({ estado: 'CONCILIADO', partida_emparejada_id: partidaLibroId })
}

export async function desemparejar(partidaId, partidaEmparejadaId, trx = db) {
  await trx('conciliacion_partidas')
    .where('id', partidaId)
    .update({ estado: 'PENDIENTE', partida_emparejada_id: null })

  if (partidaEmparejadaId) {
    await trx('conciliacion_partidas')
      .where('id', partidaEmparejadaId)
      .update({ estado: 'PENDIENTE', partida_emparejada_id: null })
  }
}

export async function actualizarTotales(id, { saldoLibros, diferencia }, trx = db) {
  await trx('conciliaciones').where('id', id).update({
    saldo_libros: saldoLibros,
    diferencia,
    actualizado_en: trx.fn.now(),
  })
}

export async function cambiarEstado(id, { estado, usuarioId, observaciones }, trx = db) {
  const updates = {
    estado,
    actualizado_en: trx.fn.now(),
  }
  if (observaciones !== undefined) updates.observaciones = observaciones
  if (estado === 'CONCILIADA') {
    updates.conciliado_por = usuarioId
    updates.conciliado_en = trx.fn.now()
  } else if (estado === 'BORRADOR') {
    updates.conciliado_por = null
    updates.conciliado_en = null
  }
  await trx('conciliaciones').where('id', id).update(updates)
}
