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
