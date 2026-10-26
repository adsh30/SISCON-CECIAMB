import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import { restar, sumar } from '../../utils/money.js'
import { ACCIONES, registrar } from '../bitacora/bitacora.service.js'
import * as repo from './conciliaciones.repository.js'

const noEncontrado = (msg) => new AppError(404, 'NO_ENCONTRADO', msg)
const conflicto = (code, msg) => new AppError(409, code, msg)
const badRequest = (code, msg) => new AppError(400, code, msg)

export async function listar(filtros = {}) {
  const lista = await repo.listar(filtros)
  return lista.map((c) => ({
    id: c.id,
    cuentaId: c.cuenta_id,
    cuentaCodigo: c.cuenta_codigo,
    cuentaNombre: c.cuenta_nombre,
    periodoId: c.periodo_id,
    periodoNumero: c.periodo_numero,
    periodoAnio: c.periodo_anio,
    periodoMes: c.periodo_mes,
    fechaCorte: c.fecha_corte,
    saldoBanco: c.saldo_banco,
    saldoLibros: c.saldo_libros,
    diferencia: c.diferencia,
    estado: c.estado,
    observaciones: c.observaciones,
    creadoEn: c.creado_en,
  }))
}

export async function obtener(id) {
  const c = await repo.obtenerPorId(id)
  if (!c) throw noEncontrado('Conciliación no encontrada')

  const partidas = await repo.listarPartidas(id)

  const partidasLibro = partidas.filter((p) => p.origen === 'LIBRO')
  const partidasBanco = partidas.filter((p) => p.origen === 'BANCO')

  // Cálculos matemáticos de la conciliación
  // 1. Cheques y egresos en tránsito (Libro CREDITO no emparejado en Banco)
  const egresosEnTransito = partidasLibro
    .filter((p) => p.estado === 'PENDIENTE' && p.tipo_movimiento === 'CREDITO')
    .reduce((acc, p) => sumar(acc, p.monto), '0.00')

  // 2. Depósitos en tránsito (Libro DEBITO no emparejado en Banco)
  const depositosEnTransito = partidasLibro
    .filter((p) => p.estado === 'PENDIENTE' && p.tipo_movimiento === 'DEBITO')
    .reduce((acc, p) => sumar(acc, p.monto), '0.00')

  // 3. Cargos / Notas de débito del banco no registradas en libros
  const cargosBancoPendientes = partidasBanco
    .filter((p) => p.estado === 'PENDIENTE' && p.tipo_movimiento === 'DEBITO')
    .reduce((acc, p) => sumar(acc, p.monto), '0.00')

  // 4. Créditos / Depósitos del banco no registrados en libros
  const creditosBancoPendientes = partidasBanco
    .filter((p) => p.estado === 'PENDIENTE' && p.tipo_movimiento === 'CREDITO')
    .reduce((acc, p) => sumar(acc, p.monto), '0.00')

  // Saldo banco conciliado = Saldo Banco + Depósitos en tránsito - Cheques en tránsito
  const saldoBancoAjustado = restar(
    sumar(c.saldo_banco, depositosEnTransito),
    egresosEnTransito,
  )

  // Saldo libros conciliado = Saldo Libros + Créditos Banco - Cargos Banco
  const saldoLibrosAjustado = restar(
    sumar(c.saldo_libros, creditosBancoPendientes),
    cargosBancoPendientes,
  )

  const diferenciaConciliada = restar(saldoBancoAjustado, saldoLibrosAjustado)

  return {
    id: c.id,
    cuentaId: c.cuenta_id,
    cuentaCodigo: c.cuenta_codigo,
    cuentaNombre: c.cuenta_nombre,
    periodoId: c.periodo_id,
    periodoNumero: c.periodo_numero,
    periodoAnio: c.periodo_anio,
    periodoMes: c.periodo_mes,
    fechaCorte: c.fecha_corte,
    saldoBanco: c.saldo_banco,
    saldoLibros: c.saldo_libros,
    diferencia: c.diferencia,
    estado: c.estado,
    observaciones: c.observaciones,
    creadoEn: c.creado_en,
    creadoPor: c.creado_por_nombre ? `${c.creado_por_nombre} ${c.creado_por_apellido || ''}`.trim() : null,
    conciliadoEn: c.conciliado_en,
    conciliadoPor: c.conciliado_por_nombre ? `${c.conciliado_por_nombre} ${c.conciliado_por_apellido || ''}`.trim() : null,
    resumen: {
      depositosEnTransito,
      egresosEnTransito,
      cargosBancoPendientes,
      creditosBancoPendientes,
      saldoBancoAjustado,
      saldoLibrosAjustado,
      diferenciaConciliada,
      totalPartidasLibro: partidasLibro.length,
      totalPartidasBanco: partidasBanco.length,
      conciliadasLibro: partidasLibro.filter((p) => p.estado === 'CONCILIADO').length,
      conciliadasBanco: partidasBanco.filter((p) => p.estado === 'CONCILIADO').length,
    },
    partidasLibro: partidasLibro.map(aPartida),
    partidasBanco: partidasBanco.map(aPartida),
  }
}

function aPartida(p) {
  return {
    id: p.id,
    conciliacionId: p.conciliacion_id,
    origen: p.origen,
    comprobanteDetalleId: p.comprobante_detalle_id,
    fecha: p.fecha,
    referencia: p.referencia,
    descripcion: p.descripcion,
    monto: p.monto,
    tipoMovimiento: p.tipo_movimiento,
    estado: p.estado,
    partidaEmparejadaId: p.partida_emparejada_id,
    notas: p.notas,
  }
}

export async function iniciarConciliacion(usuario, datos) {
  return db.transaction(async (trx) => {
    // 1. Validar cuenta
    const cuenta = await trx('cuentas').where('id', datos.cuentaId).first()
    if (!cuenta) throw noEncontrado('Cuenta no encontrada')
    if (!cuenta.es_movimiento) {
      throw badRequest('CUENTA_NO_MOVIMIENTO', 'La cuenta debe ser de movimiento')
    }

    // 2. Validar período
    const periodo = await trx('periodos').where('id', datos.periodoId).first()
    if (!periodo) throw noEncontrado('Período no encontrado')

    // 3. Validar que fechaCorte corresponda al período o sea posterior al inicio
    if (datos.fechaCorte < periodo.fecha_inicio || datos.fechaCorte > periodo.fecha_fin) {
      throw badRequest(
        'FECHA_FUERA_PERIODO',
        `La fecha de corte debe estar entre ${periodo.fecha_inicio} y ${periodo.fecha_fin}`,
      )
    }

    // 4. Calcular Saldo de Libros a la fecha de corte
    const { totalDebe, totalHaber } = await repo.obtenerSaldoMayor(
      datos.cuentaId,
      datos.fechaCorte,
      trx,
    )
    const saldoLibros = cuenta.naturaleza === 'ACREEDORA'
      ? restar(totalHaber, totalDebe)
      : restar(totalDebe, totalHaber)

    const diferencia = restar(datos.saldoBanco, saldoLibros)

    // 5. Crear cabecera de conciliación
    const conciliacionId = await repo.crear(
      {
        cuentaId: datos.cuentaId,
        periodoId: datos.periodoId,
        fechaCorte: datos.fechaCorte,
        saldoBanco: datos.saldoBanco,
        saldoLibros,
        diferencia,
        observaciones: datos.observaciones,
        creadoPor: usuario.id,
      },
      trx,
    )

    // 6. Cargar movimientos contables del período en conciliacion_partidas
    const movsLibro = await repo.obtenerMovimientosLibroAprobados(
      datos.cuentaId,
      periodo.fecha_inicio,
      datos.fechaCorte,
      trx,
    )

    const partidasAInsertar = []
    for (const m of movsLibro) {
      const debe = Number(m.debe)
      const haber = Number(m.haber)
      if (debe > 0) {
        partidasAInsertar.push({
          conciliacion_id: conciliacionId,
          origen: 'LIBRO',
          comprobante_detalle_id: m.comprobante_detalle_id,
          fecha: m.fecha,
          referencia: m.referencia,
          descripcion: m.descripcion || 'Movimiento contable',
          monto: m.debe.toString(),
          tipo_movimiento: 'DEBITO',
          estado: 'PENDIENTE',
        })
      }
      if (haber > 0) {
        partidasAInsertar.push({
          conciliacion_id: conciliacionId,
          origen: 'LIBRO',
          comprobante_detalle_id: m.comprobante_detalle_id,
          fecha: m.fecha,
          referencia: m.referencia,
          descripcion: m.descripcion || 'Movimiento contable',
          monto: m.haber.toString(),
          tipo_movimiento: 'CREDITO',
          estado: 'PENDIENTE',
        })
      }
    }

    if (partidasAInsertar.length > 0) {
      await repo.insertarPartidas(partidasAInsertar, trx)
    }

    await registrar(trx, {
      usuarioId: usuario.id,
      accion: ACCIONES.CREAR,
      entidad: 'conciliaciones',
      entidadId: conciliacionId,
      despues: {
        cuentaId: datos.cuentaId,
        periodoId: datos.periodoId,
        fechaCorte: datos.fechaCorte,
        saldoBanco: datos.saldoBanco,
        saldoLibros,
        partidasLibro: partidasAInsertar.length,
      },
    })

    return conciliacionId
  })
}

export async function importarMovimientosBanco(usuario, conciliacionId, { movimientos }) {
  return db.transaction(async (trx) => {
    const c = await repo.obtenerPorId(conciliacionId, trx)
    if (!c) throw noEncontrado('Conciliación no encontrada')
    if (c.estado !== 'BORRADOR') {
      throw conflicto('ESTADO_INVALIDO', 'Solo se pueden importar movimientos a una conciliación en BORRADOR')
    }

    const partidasBanco = movimientos.map((m) => ({
      conciliacion_id: conciliacionId,
      origen: 'BANCO',
      fecha: m.fecha,
      referencia: m.referencia || null,
      descripcion: m.descripcion,
      monto: m.monto,
      tipo_movimiento: m.tipoMovimiento,
      estado: 'PENDIENTE',
      notas: m.notas || null,
    }))

    await repo.insertarPartidas(partidasBanco, trx)

    // Algoritmo de emparejamiento automático:
    // En banco: CREDITO (abono) empareja con LIBRO: DEBITO
    // En banco: DEBITO (cargo) empareja con LIBRO: CREDITO
    const todasPartidas = await repo.listarPartidas(conciliacionId, trx)
    const libros = todasPartidas.filter((p) => p.origen === 'LIBRO' && p.estado === 'PENDIENTE')
    const bancos = todasPartidas.filter((p) => p.origen === 'BANCO' && p.estado === 'PENDIENTE')

    let emparejados = 0
    for (const b of bancos) {
      if (b.estado === 'CONCILIADO') continue
      const tipoBuscado = b.tipo_movimiento === 'CREDITO' ? 'DEBITO' : 'CREDITO'

      // 1. Coincidencia por Monto + Referencia exacta
      let match = libros.find(
        (l) =>
          l.estado === 'PENDIENTE' &&
          l.tipo_movimiento === tipoBuscado &&
          Number(l.monto) === Number(b.monto) &&
          b.referencia &&
          l.referencia &&
          (l.referencia.includes(b.referencia) || b.referencia.includes(l.referencia)),
      )

      // 2. Si no hubo coincidencia por referencia, por Monto y Fecha (±4 días)
      if (!match) {
        match = libros.find((l) => {
          if (l.estado !== 'PENDIENTE' || l.tipo_movimiento !== tipoBuscado) return false
          if (Number(l.monto) !== Number(b.monto)) return false
          const diffDias = Math.abs((new Date(l.fecha) - new Date(b.fecha)) / (1000 * 60 * 60 * 24))
          return diffDias <= 4
        })
      }

      if (match) {
        await repo.emparejar(match.id, b.id, trx)
        match.estado = 'CONCILIADO'
        b.estado = 'CONCILIADO'
        emparejados++
      }
    }

    await registrar(trx, {
      usuarioId: usuario.id,
      accion: ACCIONES.EDITAR,
      entidad: 'conciliaciones',
      entidadId: conciliacionId,
      despues: {
        movimientosBancoImportados: partidasBanco.length,
        emparejadosAutomaticamente: emparejados,
      },
    })

    return { totalImportados: partidasBanco.length, emparejados }
  })
}

export async function emparejarManualmente(usuario, conciliacionId, { partidaLibroId, partidaBancoId }) {
  return db.transaction(async (trx) => {
    const c = await repo.obtenerPorId(conciliacionId, trx)
    if (!c) throw noEncontrado('Conciliación no encontrada')
    if (c.estado !== 'BORRADOR') {
      throw conflicto('ESTADO_INVALIDO', 'La conciliación debe estar en BORRADOR')
    }

    const pLibro = await repo.obtenerPartidaPorId(partidaLibroId, trx)
    const pBanco = await repo.obtenerPartidaPorId(partidaBancoId, trx)

    if (!pLibro || pLibro.conciliacion_id !== conciliacionId || pLibro.origen !== 'LIBRO') {
      throw badRequest('PARTIDA_INVALIDA', 'Partida de libro inválida')
    }
    if (!pBanco || pBanco.conciliacion_id !== conciliacionId || pBanco.origen !== 'BANCO') {
      throw badRequest('PARTIDA_INVALIDA', 'Partida de banco inválida')
    }

    await repo.emparejar(pLibro.id, pBanco.id, trx)
    return { ok: true }
  })
}

export async function desemparejar(usuario, conciliacionId, { partidaId }) {
  return db.transaction(async (trx) => {
    const c = await repo.obtenerPorId(conciliacionId, trx)
    if (!c) throw noEncontrado('Conciliación no encontrada')
    if (c.estado !== 'BORRADOR') {
      throw conflicto('ESTADO_INVALIDO', 'La conciliación debe estar en BORRADOR')
    }

    const p = await repo.obtenerPartidaPorId(partidaId, trx)
    if (!p || p.conciliacion_id !== conciliacionId) {
      throw noEncontrado('Partida no encontrada')
    }

    await repo.desemparejar(p.id, p.partida_emparejada_id, trx)
    return { ok: true }
  })
}

export async function finalizar(usuario, conciliacionId, { observaciones } = {}) {
  return db.transaction(async (trx) => {
    const c = await repo.obtenerPorId(conciliacionId, trx)
    if (!c) throw noEncontrado('Conciliación no encontrada')
    if (c.estado !== 'BORRADOR') {
      throw conflicto('ESTADO_INVALIDO', 'La conciliación ya no está en borrador')
    }

    await repo.cambiarEstado(
      conciliacionId,
      {
        estado: 'CONCILIADA',
        usuarioId: usuario.id,
        observaciones: observaciones || c.observaciones,
      },
      trx,
    )

    await registrar(trx, {
      usuarioId: usuario.id,
      accion: ACCIONES.EDITAR,
      entidad: 'conciliaciones',
      entidadId: conciliacionId,
      despues: { estado: 'CONCILIADA' },
    })

    return { ok: true }
  })
}

export async function anular(usuario, conciliacionId, { motivo }) {
  return db.transaction(async (trx) => {
    const c = await repo.obtenerPorId(conciliacionId, trx)
    if (!c) throw noEncontrado('Conciliación no encontrada')
    if (c.estado === 'ANULADA') {
      throw conflicto('ESTADO_INVALIDO', 'La conciliación ya se encuentra anulada')
    }

    await repo.cambiarEstado(
      conciliacionId,
      {
        estado: 'ANULADA',
        usuarioId: usuario.id,
        observaciones: motivo ? `ANULADA: ${motivo}` : c.observaciones,
      },
      trx,
    )

    await registrar(trx, {
      usuarioId: usuario.id,
      accion: ACCIONES.ANULAR,
      entidad: 'conciliaciones',
      entidadId: conciliacionId,
      despues: { estado: 'ANULADA', motivo },
    })

    return { ok: true }
  })
}
