import { db } from '../../config/db.js'

export async function obtenerEstado() {
  const inicio = Date.now()
  try {
    const [rows] = await db.raw('SELECT VERSION() AS version, DATABASE() AS base_datos, NOW() AS hora')
    return {
      api: 'ok',
      baseDatos: {
        estado: 'ok',
        version: rows[0].version,
        nombre: rows[0].base_datos,
        horaServidor: rows[0].hora,
        latenciaMs: Date.now() - inicio,
      },
    }
  } catch (err) {
    return { api: 'ok', baseDatos: { estado: 'error', mensaje: err.code ?? err.message } }
  }
}
