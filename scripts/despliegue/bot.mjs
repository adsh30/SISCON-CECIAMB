#!/usr/bin/env node
// Bot de despliegue de SISCON-CECIAMB
// ------------------------------------------------------------
// Corre en la copia de PRODUCCIÓN (rama main). Hace dos cosas:
//  1. Mantiene el sistema encendido (lo reinicia si se cae).
//  2. Cada BOT_INTERVALO_MIN minutos revisa si hay cambios nuevos en origin/main y, si los hay:
//     respaldo de la BD → actualiza el código → instala → lint y pruebas → compila →
//     migra → reinicia → verifica que responda. Si algo falla, vuelve a la versión anterior.
// Cada actualización (o vuelta atrás) queda en la bitácora del sistema y en logs/bot.log.
//
// Uso: npm run produccion   (o: node scripts/despliegue/bot.mjs)
//      node scripts/despliegue/bot.mjs --una-vez   → revisa y despliega una sola vez y sale

import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../..', import.meta.url))
const archivoEnv = join(RAIZ, '.env')
if (existsSync(archivoEnv)) process.loadEnvFile(archivoEnv)

const CFG = {
  rama: process.env.BOT_RAMA ?? 'main',
  intervaloMin: Number(process.env.BOT_INTERVALO_MIN ?? 5),
  pruebas: process.env.BOT_PRUEBAS !== 'false',
  puerto: Number(process.env.PORT ?? 8080),
  respaldos: join(RAIZ, process.env.BOT_RESPALDOS ?? 'respaldos'),
  mariadbDump: process.env.MARIADB_DUMP ?? 'C:\\Program Files\\MariaDB 13.0\\bin\\mariadb-dump.exe',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: process.env.DB_PORT ?? '3306',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    nombre: process.env.DB_NAME,
  },
}
const LOGS = join(RAIZ, 'logs')
mkdirSync(LOGS, { recursive: true })
mkdirSync(CFG.respaldos, { recursive: true })

// ---------- utilidades ----------

const horaCaracas = () =>
  new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas', hour12: true })

function log(mensaje, nivel = 'INFO') {
  const linea = `[${horaCaracas()}] ${nivel.padEnd(5)} ${mensaje}`
  console.log(linea)
  appendFileSync(join(LOGS, 'bot.log'), `${linea}\n`)
}

/** Ejecuta un comando; rechaza con las últimas líneas de salida si falla. */
function ejecutar(comando, args, { env } = {}) {
  return new Promise((resolve, reject) => {
    // npm en Windows es un .cmd: necesita shell
    const esNpm = comando === 'npm'
    const hijo = spawn(esNpm && process.platform === 'win32' ? 'npm.cmd' : comando, args, {
      cwd: RAIZ,
      env: { ...process.env, ...env },
      shell: esNpm && process.platform === 'win32',
      windowsHide: true,
    })
    let salida = ''
    hijo.stdout.on('data', (d) => (salida += d))
    hijo.stderr.on('data', (d) => (salida += d))
    hijo.on('error', reject)
    hijo.on('close', (codigo) => {
      if (codigo === 0) return resolve(salida.trim())
      const cola = salida.trim().split('\n').slice(-15).join('\n')
      reject(new Error(`${comando} ${args.join(' ')} terminó con código ${codigo}\n${cola}`))
    })
  })
}

const git = (...args) => ejecutar('git', args)
const npm = (...args) => ejecutar('npm', args)
const corto = (sha) => sha.slice(0, 7)

// ---------- servidor supervisado ----------

let servidor = null
let deteniendo = false
let esperaReinicio = 5000

function iniciarServidor(version) {
  deteniendo = false
  const salida = join(LOGS, 'servidor.log')
  servidor = spawn(process.execPath, ['server/src/server.js'], {
    cwd: RAIZ,
    env: { ...process.env, NODE_ENV: 'production', SISCON_VERSION: version },
    windowsHide: true,
  })
  const escribir = (d) => appendFileSync(salida, d)
  servidor.stdout.on('data', escribir)
  servidor.stderr.on('data', escribir)
  servidor.on('exit', (codigo) => {
    servidor = null
    if (deteniendo) return
    log(
      `El sistema se detuvo (código ${codigo}); se reinicia en ${esperaReinicio / 1000} s`,
      'AVISO',
    )
    setTimeout(() => iniciarServidor(version), esperaReinicio)
    esperaReinicio = Math.min(esperaReinicio * 2, 60_000)
  })
  log(`Sistema encendido en http://localhost:${CFG.puerto} (versión ${corto(version)})`)
}

function detenerServidor() {
  if (!servidor) return Promise.resolve()
  deteniendo = true
  return new Promise((resolve) => {
    servidor.once('exit', () => resolve())
    servidor.kill()
  })
}

/** Espera a que /api/v1/health responda con la base de datos en línea. */
async function esperarSalud(segundos = 60) {
  const limite = Date.now() + segundos * 1000
  while (Date.now() < limite) {
    try {
      const res = await fetch(`http://127.0.0.1:${CFG.puerto}/api/v1/health`)
      const cuerpo = await res.json()
      if (res.ok && cuerpo.data?.baseDatos?.estado === 'ok') {
        esperaReinicio = 5000
        return true
      }
    } catch {
      // todavía arrancando
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}

// ---------- pasos del despliegue ----------

async function respaldarBaseDatos(version) {
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date())
  const hora = new Date()
    .toLocaleTimeString('en-GB', { timeZone: 'America/Caracas' })
    .replaceAll(':', '')
  const archivo = join(
    CFG.respaldos,
    `${CFG.db.nombre}-${fecha}-${hora}-antes-de-${corto(version)}.sql`,
  )
  await ejecutar(
    CFG.mariadbDump,
    [
      `--host=${CFG.db.host}`,
      `--port=${CFG.db.port}`,
      `--user=${CFG.db.user}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      `--result-file=${archivo}`,
      CFG.db.nombre,
    ],
    // La clave va por variable de entorno, no en la línea de comandos
    { env: { MYSQL_PWD: CFG.db.password } },
  )
  return archivo
}

async function registrarEnBitacora({ de, a, cambios, resultado, motivo }) {
  try {
    await ejecutar(process.execPath, [
      'server/scripts/registrar-despliegue.js',
      JSON.stringify({ de, a, cambios, resultado, motivo }),
    ])
  } catch (err) {
    log(`No se pudo anotar en la bitácora: ${err.message}`, 'AVISO')
  }
}

async function compilar() {
  // --include=dev: con NODE_ENV=production npm omitiría vite, vitest y oxlint
  await npm('ci', '--include=dev', '--no-audit', '--no-fund')
  await npm('run', 'build')
}

// Versiones que ya fallaron: no se reintentan hasta que llegue otro cambio a main
const fallidas = new Set()

async function volverA(anterior, nuevo, motivo) {
  log(`Volviendo a la versión ${corto(anterior)}: ${motivo}`, 'ERROR')
  fallidas.add(nuevo)
  await git('reset', '--hard', anterior)
  try {
    await compilar()
  } catch (err) {
    // El código ya volvió atrás; si recompilar falla, el sistema sigue con lo que tenía cargado
    log(`No se pudo recompilar la versión anterior: ${err.message}`, 'ERROR')
  }
  if (!servidor) iniciarServidor(anterior)
  await registrarEnBitacora({ de: anterior, a: nuevo, resultado: 'revertido', motivo })
}

async function desplegar(anterior, nuevo) {
  const cambios = (await git('log', '--format=%s', `${anterior}..${nuevo}`))
    .split('\n')
    .filter(Boolean)
    .slice(0, 10)
  log(
    `Nueva versión en ${CFG.rama}: ${corto(anterior)} → ${corto(nuevo)} (${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'})`,
  )
  cambios.forEach((c) => log(`  · ${c}`))

  const respaldo = await respaldarBaseDatos(nuevo)
  log(`Respaldo de la base de datos: ${respaldo}`)

  try {
    await git('merge', '--ff-only', `origin/${CFG.rama}`)
  } catch (err) {
    fallidas.add(nuevo)
    log(
      `No se pudo actualizar el código (¿cambios locales en producción?): ${err.message}`,
      'ERROR',
    )
    return
  }

  try {
    await compilar()
    if (CFG.pruebas) {
      log('Revisando el código y ejecutando las pruebas…')
      await npm('run', 'lint')
      await npm('test')
    }
  } catch (err) {
    return volverA(anterior, nuevo, `falló la compilación o las pruebas\n${err.message}`)
  }

  await detenerServidor()
  try {
    await npm('run', 'db:migrate')
  } catch (err) {
    log(`Si la base quedó a medias, restaure el respaldo: ${respaldo}`, 'ERROR')
    return volverA(anterior, nuevo, `falló la migración de la base de datos\n${err.message}`)
  }

  iniciarServidor(nuevo)
  if (!(await esperarSalud())) {
    await detenerServidor()
    return volverA(anterior, nuevo, 'el sistema no respondió después de actualizar')
  }

  log(`Sistema actualizado a la versión ${corto(nuevo)} ✔`)
  await registrarEnBitacora({ de: anterior, a: nuevo, cambios, resultado: 'actualizado' })
}

let revisando = false

async function revisar() {
  if (revisando) return
  revisando = true
  try {
    await git('fetch', '--quiet', 'origin', CFG.rama)
    const actual = await git('rev-parse', 'HEAD')
    const remoto = await git('rev-parse', `origin/${CFG.rama}`)
    if (actual !== remoto && !fallidas.has(remoto)) await desplegar(actual, remoto)
  } catch (err) {
    log(`Revisión fallida: ${err.message}`, 'ERROR')
  } finally {
    revisando = false
  }
}

// ---------- arranque ----------

function tomarCandado() {
  const candado = join(LOGS, 'bot.pid')
  if (existsSync(candado)) {
    const pid = Number(readFileSync(candado, 'utf8'))
    try {
      process.kill(pid, 0)
      console.error(`El bot ya está corriendo (proceso ${pid}).`)
      process.exit(1)
    } catch {
      // el proceso anterior ya no existe
    }
  }
  writeFileSync(candado, String(process.pid))
  const soltar = () => rmSync(candado, { force: true })
  process.on('exit', soltar)
  for (const senal of ['SIGINT', 'SIGTERM']) {
    process.on(senal, async () => {
      log('Bot detenido; apagando el sistema')
      await detenerServidor()
      process.exit(0)
    })
  }
}

async function main() {
  const unaVez = process.argv.includes('--una-vez')
  const rama = await git('rev-parse', '--abbrev-ref', 'HEAD')
  if (rama !== CFG.rama) {
    console.error(
      `Esta copia está en la rama "${rama}". El bot solo corre en la copia de producción (rama ${CFG.rama}).`,
    )
    process.exit(1)
  }
  if (!CFG.db.user || !CFG.db.nombre) {
    console.error('Falta configurar la base de datos en .env (DB_USER, DB_NAME…).')
    process.exit(1)
  }
  tomarCandado()
  log(`Bot iniciado: revisa origin/${CFG.rama} cada ${CFG.intervaloMin} min`)

  const version = await git('rev-parse', 'HEAD')
  if (
    !existsSync(join(RAIZ, 'node_modules')) ||
    !existsSync(join(RAIZ, 'client/dist/index.html'))
  ) {
    log('Preparando la instalación (dependencias y compilación)…')
    await compilar()
  }
  await npm('run', 'db:migrate')

  if (unaVez) {
    await revisar()
    await detenerServidor()
    process.exit(0)
  }
  iniciarServidor(version)
  await revisar()
  setInterval(revisar, CFG.intervaloMin * 60_000)
}

main().catch((err) => {
  log(err.stack ?? err.message, 'ERROR')
  process.exit(1)
})
