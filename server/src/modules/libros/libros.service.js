import { aEscalado, deEscalado, sumar } from '../../utils/money.js'
import * as empresaRepo from '../empresa/empresa.repository.js'
import * as repo from './libros.repository.js'

const paginas = (total, porPagina) => Math.max(1, Math.ceil(total / porPagina))

const aRenglon = (r) => ({
  renglon: r.renglon,
  cuentaId: r.cuenta_id,
  cuentaCodigo: r.cuenta_codigo,
  cuentaNombre: r.cuenta_nombre,
  centroCodigo: r.centro_codigo,
  centroNombre: r.centro_nombre,
  descripcion: r.descripcion,
  referencia: r.referencia,
  debe: r.debe,
  haber: r.haber,
})

function agrupar(filas, clave) {
  const grupos = new Map()
  for (const f of filas) {
    const lista = grupos.get(f[clave])
    if (lista) lista.push(f)
    else grupos.set(f[clave], [f])
  }
  return grupos
}

/** Libro Diario (RF-06.1): comprobantes aprobados en orden cronológico con totales Debe/Haber */
export async function diario(filtros) {
  const { pagina, porPagina, todo } = filtros
  const { comprobantes, renglones, total, sumas } = await repo.diario(filtros, {
    limite: todo ? null : porPagina,
    desplazamiento: (pagina - 1) * porPagina,
  })
  const porComprobante = agrupar(renglones, 'comprobante_id')

  const data = comprobantes.map((c) => {
    const propios = porComprobante.get(c.id) ?? []
    return {
      id: c.id,
      codigo: c.codigo,
      fecha: c.fecha,
      concepto: c.concepto,
      referencia: c.referencia,
      beneficiario: c.beneficiario,
      tipo: { codigo: c.tipo_codigo, nombre: c.tipo_nombre },
      // Con filtro de centro de costo solo se ven (y suman) los renglones de ese centro
      renglones: propios.map(aRenglon),
      totalDebe: sumar(...propios.map((r) => r.debe)),
      totalHaber: sumar(...propios.map((r) => r.haber)),
    }
  })

  return {
    data,
    meta: {
      total,
      pagina: todo ? 1 : pagina,
      porPagina: todo ? total : porPagina,
      paginas: todo ? 1 : paginas(total, porPagina),
      totales: {
        debe: sumar(sumas.debe),
        haber: sumar(sumas.haber),
        renglones: sumas.renglones,
      },
    },
  }
}

/** Saldo escalado según la naturaleza: deudora D − H, acreedora H − D (PLAN §5.7) */
const saldoSegun = (naturaleza, debe, haber) =>
  naturaleza === 'DEUDORA' ? aEscalado(debe) - aEscalado(haber) : aEscalado(haber) - aEscalado(debe)

/**
 * Libro Mayor (RF-06.2): por cuenta, saldo anterior, movimientos con saldo acumulado por
 * renglón y saldo final. El saldo anterior suma todo lo aprobado antes de la fecha inicial.
 */
export async function mayor(filtros) {
  const { pagina, porPagina, todo } = filtros
  const resumen = await repo.resumenMayor(filtros)
  const visibles = todo ? resumen : resumen.slice((pagina - 1) * porPagina, pagina * porPagina)

  const movimientos = visibles.length
    ? await repo.movimientosMayor(filtros, todo ? null : visibles.map((c) => c.id))
    : []
  const porCuenta = agrupar(movimientos, 'cuenta_id')

  const data = visibles.map((c) => {
    const anterior = saldoSegun(c.naturaleza, c.debe_anterior, c.haber_anterior)
    let saldo = anterior
    const lineas = (porCuenta.get(c.id) ?? []).map((m) => {
      saldo += saldoSegun(c.naturaleza, m.debe, m.haber)
      return {
        comprobanteId: m.comprobante_id,
        comprobante: m.comprobante_codigo,
        fecha: m.fecha,
        concepto: m.concepto,
        descripcion: m.descripcion,
        referencia: m.referencia,
        centroCodigo: m.centro_codigo,
        debe: m.debe,
        haber: m.haber,
        saldo: deEscalado(saldo),
      }
    })
    return {
      cuenta: { id: c.id, codigo: c.codigo, nombre: c.nombre, naturaleza: c.naturaleza },
      saldoAnterior: deEscalado(anterior),
      movimientos: lineas,
      totalDebe: sumar(c.debe),
      totalHaber: sumar(c.haber),
      saldoFinal: deEscalado(anterior + saldoSegun(c.naturaleza, c.debe, c.haber)),
    }
  })

  const total = resumen.length
  return {
    data,
    meta: {
      total,
      pagina: todo ? 1 : pagina,
      porPagina: todo ? total : porPagina,
      paginas: todo ? 1 : paginas(total, porPagina),
      totales: {
        debe: sumar(...resumen.map((c) => c.debe)),
        haber: sumar(...resumen.map((c) => c.haber)),
        renglones: resumen.reduce((n, c) => n + Number(c.movimientos), 0),
      },
    },
  }
}

/** Encabezado de las exportaciones (RF-06.4): empresa, RIF, filtros y quién lo emite */
export async function encabezado(filtros, usuarioId) {
  const [empresa, nombres, usuario] = await Promise.all([
    empresaRepo.obtener(),
    repo.nombresFiltros(filtros),
    repo.nombreUsuario(usuarioId),
  ])
  return {
    razonSocial: empresa?.razon_social ?? 'SISCON-CECIAMB',
    rif: empresa?.rif ?? null,
    tipo: nombres.tipo,
    centro: nombres.centro,
    usuario: [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' '),
  }
}

/**
 * Balance de Comprobación (Sumas y Saldos a 8 Columnas):
 * Verifica la partida doble y el cuadre contable en tres momentos:
 * Saldo Anterior (Deudor/Acreedor), Movimientos del período (Debe/Haber) y Saldo Actual (Deudor/Acreedor).
 */
export async function balance(filtros) {
  const { pagina, porPagina, todo, modo, incluirCeros } = filtros
  const cuentas = await repo.resumenBalance(filtros)

  const cuentasMap = new Map()
  const cuentasMovimiento = []

  for (const c of cuentas) {
    const obj = {
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      tipo: c.tipo,
      naturaleza: c.naturaleza,
      nivel: c.nivel,
      padreId: c.padre_id,
      esMovimiento: Boolean(c.es_movimiento),
      antD: aEscalado(c.debe_anterior),
      antH: aEscalado(c.haber_anterior),
      movD: aEscalado(c.debe),
      movH: aEscalado(c.haber),
      movimientos: Number(c.movimientos),
    }
    cuentasMap.set(c.codigo, obj)
    if (obj.esMovimiento) {
      cuentasMovimiento.push(obj)
    }
  }

  if (modo === 'completo') {
    for (const c of cuentas) {
      if (!c.es_movimiento) {
        let antD = 0n
        let antH = 0n
        let movD = 0n
        let movH = 0n
        let movCount = 0

        const prefijo = `${c.codigo}.`
        for (const mov of cuentasMovimiento) {
          if (mov.codigo.startsWith(prefijo)) {
            antD += mov.antD
            antH += mov.antH
            movD += mov.movD
            movH += mov.movH
            movCount += mov.movimientos
          }
        }
        const obj = cuentasMap.get(c.codigo)
        if (obj) {
          obj.antD = antD
          obj.antH = antH
          obj.movD = movD
          obj.movH = movH
          obj.movimientos = movCount
        }
      }
    }
  }

  const procesadas = []
  for (const c of cuentas) {
    const obj = cuentasMap.get(c.codigo)
    if (!obj) continue

    if (modo === 'movimiento' && !obj.esMovimiento) continue

    const netoAnt = obj.antD - obj.antH
    const saldoAnteriorDeudor = netoAnt > 0n ? netoAnt : 0n
    const saldoAnteriorAcreedor = netoAnt < 0n ? -netoAnt : 0n

    const movimientoDebe = obj.movD
    const movimientoHaber = obj.movH

    const netoAct = obj.antD + obj.movD - (obj.antH + obj.movH)
    const saldoActualDeudor = netoAct > 0n ? netoAct : 0n
    const saldoActualAcreedor = netoAct < 0n ? -netoAct : 0n

    const esCero =
      saldoAnteriorDeudor === 0n &&
      saldoAnteriorAcreedor === 0n &&
      movimientoDebe === 0n &&
      movimientoHaber === 0n &&
      saldoActualDeudor === 0n &&
      saldoActualAcreedor === 0n

    if (!incluirCeros && esCero) continue

    procesadas.push({
      id: obj.id,
      codigo: obj.codigo,
      nombre: obj.nombre,
      tipo: obj.tipo,
      naturaleza: obj.naturaleza,
      nivel: obj.nivel,
      esMovimiento: obj.esMovimiento,
      saldoAnteriorDeudor: deEscalado(saldoAnteriorDeudor),
      saldoAnteriorAcreedor: deEscalado(saldoAnteriorAcreedor),
      movimientoDebe: deEscalado(movimientoDebe),
      movimientoHaber: deEscalado(movimientoHaber),
      saldoActualDeudor: deEscalado(saldoActualDeudor),
      saldoActualAcreedor: deEscalado(saldoActualAcreedor),
      movimientos: obj.movimientos,
    })
  }

  let totAntDeudor = 0n
  let totAntAcreedor = 0n
  let totMovDebe = 0n
  let totMovHaber = 0n
  let totActDeudor = 0n
  let totActAcreedor = 0n
  let totMovimientos = 0

  for (const m of cuentasMovimiento) {
    const netoAnt = m.antD - m.antH
    totAntDeudor += netoAnt > 0n ? netoAnt : 0n
    totAntAcreedor += netoAnt < 0n ? -netoAnt : 0n

    totMovDebe += m.movD
    totMovHaber += m.movH

    const netoAct = m.antD + m.movD - (m.antH + m.movH)
    totActDeudor += netoAct > 0n ? netoAct : 0n
    totActAcreedor += netoAct < 0n ? -netoAct : 0n

    totMovimientos += m.movimientos
  }

  const cuadradoAnterior = totAntDeudor === totAntAcreedor
  const cuadradoMovimientos = totMovDebe === totMovHaber
  const cuadradoActual = totActDeudor === totActAcreedor
  const cuadrado = cuadradoAnterior && cuadradoMovimientos && cuadradoActual

  const absBigInt = (n) => (n < 0n ? -n : n)

  const totales = {
    saldoAnteriorDeudor: deEscalado(totAntDeudor),
    saldoAnteriorAcreedor: deEscalado(totAntAcreedor),
    movimientoDebe: deEscalado(totMovDebe),
    movimientoHaber: deEscalado(totMovHaber),
    saldoActualDeudor: deEscalado(totActDeudor),
    saldoActualAcreedor: deEscalado(totActAcreedor),
    cuadradoAnterior,
    cuadradoMovimientos,
    cuadradoActual,
    cuadrado,
    diferenciaAnterior: deEscalado(absBigInt(totAntDeudor - totAntAcreedor)),
    diferenciaMovimientos: deEscalado(absBigInt(totMovDebe - totMovHaber)),
    diferenciaActual: deEscalado(absBigInt(totActDeudor - totActAcreedor)),
    renglones: totMovimientos,
  }

  const total = procesadas.length
  const visibles = todo
    ? procesadas
    : procesadas.slice((pagina - 1) * porPagina, pagina * porPagina)

  return {
    data: visibles,
    meta: {
      total,
      pagina: todo ? 1 : pagina,
      porPagina: todo ? total : porPagina,
      paginas: todo ? 1 : paginas(total, porPagina),
      totales,
    },
  }
}
