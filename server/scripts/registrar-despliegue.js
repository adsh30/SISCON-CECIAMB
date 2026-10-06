// Lo usa el bot de despliegue para dejar constancia en la bitácora de cada actualización
// (o vuelta atrás) del sistema. Recibe un JSON: { de, a, cambios, resultado, motivo }
import { db } from '../src/config/db.js'
import { ACCIONES, registrar } from '../src/modules/bitacora/bitacora.service.js'

const { de, a, cambios = [], resultado, motivo } = JSON.parse(process.argv[2] ?? '{}')
const corto = (sha) => sha?.slice(0, 7) ?? null

try {
  await registrar(null, {
    usuarioId: null,
    accion: resultado === 'revertido' ? ACCIONES.REVERTIR : ACCIONES.ACTUALIZAR,
    entidad: 'sistema',
    entidadId: corto(a),
    antes: { version: corto(de) },
    despues: {
      version: resultado === 'actualizado' ? corto(a) : corto(de),
      resultado,
      ...(cambios.length ? { cambios } : {}),
      ...(motivo ? { motivo: motivo.split('\n')[0] } : {}),
    },
    ctx: { ip: null, agente: 'Bot de despliegue' },
  })
} finally {
  await db.destroy()
}
