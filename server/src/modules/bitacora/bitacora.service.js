import { db } from '../../config/db.js'
import { AppError } from '../../middlewares/errorHandler.js'
import * as repo from './bitacora.repository.js'

export const ACCIONES = {
  LOGIN: 'LOGIN',
  LOGIN_FALLIDO: 'LOGIN_FALLIDO',
  LOGIN_BLOQUEADO: 'LOGIN_BLOQUEADO',
  LOGOUT: 'LOGOUT',
  CREAR: 'CREAR',
  EDITAR: 'EDITAR',
  APROBAR: 'APROBAR',
  ANULAR: 'ANULAR',
  ACTUALIZAR: 'ACTUALIZAR',
  ELIMINAR: 'ELIMINAR',
  CAMBIAR_CLAVE: 'CAMBIAR_CLAVE',
  RESETEAR_CLAVE: 'RESETEAR_CLAVE',
  ACTIVAR: 'ACTIVAR',
  DESACTIVAR: 'DESACTIVAR',
  ARCHIVAR: 'ARCHIVAR',
  DESARCHIVAR: 'DESARCHIVAR',
  PERMISOS: 'PERMISOS',
  EXPORTAR: 'EXPORTAR',
  REVERTIR: 'REVERTIR',
}

/**
 * Registra un evento en la bitácora (solo inserción).
 * Pasar `trx` para que quede dentro de la misma transacción que la operación.
 */
export async function registrar(
  trx,
  { usuarioId, accion, entidad, entidadId, antes, despues, ctx },
) {
  await (trx ?? db)('bitacora').insert({
    usuario_id: usuarioId ?? null,
    accion,
    entidad,
    entidad_id: entidadId != null ? String(entidadId) : null,
    datos_antes: antes ? JSON.stringify(antes) : null,
    datos_despues: despues ? JSON.stringify(despues) : null,
    ip: ctx?.ip ?? null,
    agente: ctx?.agente?.slice(0, 255) ?? null,
  })
}

// --- Consulta (solo lectura) ---

/** Las columnas JSON de MariaDB llegan como texto */
function json(valor) {
  if (valor == null || typeof valor === 'object') return valor ?? null
  try {
    return JSON.parse(valor)
  } catch {
    return valor
  }
}

export async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros)
  return {
    data: filas,
    meta: {
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      paginas: Math.max(1, Math.ceil(total / filtros.porPagina)),
    },
  }
}

export async function detalle(id) {
  const fila = await repo.porId(id)
  if (!fila) throw new AppError(404, 'NO_ENCONTRADO', 'El evento no existe')
  return { ...fila, antes: json(fila.antes), despues: json(fila.despues) }
}

export const opciones = () => repo.opciones()

const horaCaracas = new Intl.DateTimeFormat('es-VE', {
  timeZone: 'America/Caracas',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

/** 'YYYY-MM-DD HH:mm:ss.SSS' (UTC) → '06/10/2026, 12:33:50 p. m.' en hora de Caracas */
const aCaracas = (utc) => horaCaracas.format(new Date(`${utc.replace(' ', 'T')}Z`))

/** Campo CSV entre comillas; separador ';' para que Excel en español lo abra en columnas */
const celda = (v) => {
  const texto = v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')
  return `"${texto.replaceAll('"', '""')}"`
}

/**
 * CSV con los eventos filtrados (máximo `limite`). La exportación también queda en la bitácora.
 */
export async function exportarCsv(filtros, limite, usuarioId, ctx) {
  const filas = await repo.todas(filtros, limite)
  const encabezado = [
    'N.º',
    'Fecha y hora (Caracas)',
    'Usuario',
    'Correo',
    'Acción',
    'Módulo',
    'ID afectado',
    'IP',
    'Datos antes',
    'Datos después',
  ]
  const lineas = filas.map((f) =>
    [
      f.id,
      aCaracas(f.fecha),
      [f.nombre, f.apellido].filter(Boolean).join(' ') || 'Sistema',
      f.email,
      f.accion,
      f.entidad,
      f.entidadId,
      f.ip,
      f.antes,
      f.despues,
    ]
      .map(celda)
      .join(';'),
  )

  await registrar(null, {
    usuarioId,
    accion: ACCIONES.EXPORTAR,
    entidad: 'bitacora',
    despues: {
      filtros: { ...filtros, pagina: undefined, porPagina: undefined },
      filas: filas.length,
    },
    ctx,
  })

  // BOM para que Excel reconozca los acentos (UTF-8)
  const texto = [encabezado.map(celda).join(';'), ...lineas].join('\r\n')
  return { csv: `\uFEFF${texto}`, filas: filas.length }
}
