// Base de datos local de SISCON-CECIAMB: crearla, exportarla y traer una copia en un paso.
//
//   npm run bd:crear                     crea siscon_db, siscon_test y el usuario siscon_app
//   npm run bd:exportar                  copia de la base a respaldos/siscon_db-AAAA-MM-DD-HHMM.sql
//   npm run bd:importar -- <archivo>     carga una copia (pide --reemplazar si la base tiene datos)
//   npm run bd:preparar [-- <archivo>]   todo de una vez: crear + importar la copia y ponerla al día;
//                                        sin archivo, crea las tablas y los datos iniciales vacíos
//
// Lee la conexión del .env de la raíz. Para crear bases y usuarios usa root (DB_ROOT_PASSWORD).
// Las claves viajan por la variable MYSQL_PWD, nunca en la línea de comandos.

import { spawn } from 'node:child_process'
import { createReadStream, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const ENV = join(RAIZ, '.env')
if (!existsSync(ENV)) salir('No existe el archivo .env. Cópielo de .env.example y complételo.')
process.loadEnvFile(ENV)

const cfg = {
  host: process.env.DB_HOST ?? 'localhost',
  port: process.env.DB_PORT ?? '3306',
  usuario: process.env.DB_USER ?? 'siscon_app',
  clave: process.env.DB_PASSWORD ?? '',
  base: process.env.DB_NAME ?? 'siscon_db',
  claveRoot: process.env.DB_ROOT_PASSWORD ?? '',
}
const BASES = [...new Set([cfg.base, 'siscon_test'])]

function salir(mensaje) {
  console.error(`\n✗ ${mensaje}\n`)
  process.exit(1)
}
const paso = (texto) => console.log(`• ${texto}`)

/** Carpeta bin de MariaDB: MARIADB_BIN, la de MARIADB_DUMP o la versión más nueva instalada */
function binMariaDB() {
  if (process.env.MARIADB_BIN) return process.env.MARIADB_BIN
  if (process.env.MARIADB_DUMP) return resolve(process.env.MARIADB_DUMP, '..')
  const base = 'C:/Program Files'
  const versiones = existsSync(base)
    ? readdirSync(base)
        .filter((d) => /^MariaDB \d/.test(d))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    : []
  return versiones.length ? join(base, versiones[0], 'bin') : '' // vacío = usar el PATH
}
const programa = (nombre) => {
  const bin = binMariaDB()
  const exe = process.platform === 'win32' ? `${nombre}.exe` : nombre
  return bin && existsSync(join(bin, exe)) ? join(bin, exe) : nombre
}

/** Ejecuta un programa; `entrada` es un archivo que se le pasa por la entrada estándar */
function ejecutar(cmd, args, { clave, entrada, silencioso = false } = {}) {
  return new Promise((ok, falla) => {
    const p = spawn(cmd, args, {
      env: { ...process.env, MYSQL_PWD: clave },
      stdio: [entrada ? 'pipe' : 'ignore', silencioso ? 'pipe' : 'inherit', 'pipe'],
    })
    let salida = ''
    let errores = ''
    p.stdout?.on('data', (d) => (salida += d))
    p.stderr.on('data', (d) => (errores += d))
    if (entrada) createReadStream(entrada).pipe(p.stdin)
    p.on('error', (e) =>
      falla(
        new Error(
          e.code === 'ENOENT'
            ? `No se encontró ${cmd}. Instale MariaDB o indique su carpeta bin en MARIADB_BIN (.env).`
            : e.message,
        ),
      ),
    )
    p.on('close', (codigo) =>
      codigo === 0
        ? ok(salida)
        : falla(new Error(errores.trim() || `${cmd} terminó con código ${codigo}`)),
    )
  })
}

const conexion = (usuario) => [`--host=${cfg.host}`, `--port=${cfg.port}`, `--user=${usuario}`]
const sqlRoot = (sql) => {
  if (!cfg.claveRoot) {
    salir(
      'Falta DB_ROOT_PASSWORD en .env: hace falta la clave de root de MariaDB para crear bases y usuarios.',
    )
  }
  return ejecutar(programa('mariadb'), [...conexion('root'), '-e', sql], { clave: cfg.claveRoot })
}
const comillas = (s) => `'${String(s).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
const nombreValido = (s) => /^[A-Za-z0-9_]+$/.test(s) || salir(`Nombre inválido en .env: ${s}`)

/** Tablas que ya tiene la base (0 si está vacía o no existe) */
async function tablasEn(base) {
  const salida = await ejecutar(
    programa('mariadb'),
    [
      ...conexion(cfg.usuario),
      '--batch',
      '--skip-column-names',
      '-e',
      `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ${comillas(base)}`,
    ],
    { clave: cfg.clave, silencioso: true },
  )
  return Number(salida.trim()) || 0
}

async function crear() {
  if (!cfg.clave) salir('Falta DB_PASSWORD en .env (la clave que tendrá el usuario siscon_app).')
  BASES.forEach(nombreValido)
  nombreValido(cfg.usuario)
  const u = `${comillas(cfg.usuario)}@'localhost'`
  await sqlRoot(
    [
      ...BASES.map(
        (b) =>
          `CREATE DATABASE IF NOT EXISTS \`${b}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      ),
      `CREATE USER IF NOT EXISTS ${u} IDENTIFIED BY ${comillas(cfg.clave)}`,
      // Si el usuario ya existía, su clave queda igual a la del .env
      `ALTER USER ${u} IDENTIFIED BY ${comillas(cfg.clave)}`,
      ...BASES.map((b) => `GRANT ALL PRIVILEGES ON \`${b}\`.* TO ${u}`),
      'FLUSH PRIVILEGES',
    ].join('; '),
  )
  paso(`Bases ${BASES.join(' y ')} y usuario ${cfg.usuario} listos`)
}

async function exportar() {
  const carpeta = join(RAIZ, 'respaldos')
  mkdirSync(carpeta, { recursive: true })
  const ahora = new Date()
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(ahora)
  const hora = ahora
    .toLocaleTimeString('en-GB', {
      timeZone: 'America/Caracas',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(':', '')
  const archivo = join(carpeta, `${cfg.base}-${fecha}-${hora}.sql`)
  await ejecutar(
    programa('mariadb-dump'),
    [
      ...conexion(cfg.usuario),
      '--single-transaction',
      '--routines',
      '--triggers',
      '--hex-blob', // el logo de la empresa es binario: así viaja sin dañarse
      '--default-character-set=utf8mb4',
      `--result-file=${archivo}`,
      cfg.base,
    ],
    { clave: cfg.clave },
  )
  const kb = Math.ceil(statSync(archivo).size / 1024)
  paso(`Copia creada: ${relative(RAIZ, archivo)} (${kb.toLocaleString('es-VE')} KB)`)
  console.log(
    '\n  Contiene usuarios (con sus claves cifradas) y datos del hospital: compártala solo por un medio privado.',
  )
  return archivo
}

async function importar(archivo, { reemplazar }) {
  if (!archivo) salir('Indique el archivo: npm run bd:importar -- respaldos/siscon_db-....sql')
  const ruta = resolve(RAIZ, archivo)
  if (!existsSync(ruta)) salir(`No existe el archivo ${ruta}`)
  const tablas = await tablasEn(cfg.base)
  if (tablas > 0 && !reemplazar) {
    salir(
      `La base ${cfg.base} ya tiene ${tablas} tablas. Para reemplazar su contenido por la copia, agregue --reemplazar:\n  npm run bd:importar -- ${archivo} --reemplazar`,
    )
  }
  // Con root, los triggers de la copia se crean aunque MariaDB tenga activado el registro binario
  const usuario = cfg.claveRoot ? 'root' : cfg.usuario
  const clave = cfg.claveRoot || cfg.clave
  paso(`Cargando ${relative(RAIZ, ruta)} en ${cfg.base}…`)
  await ejecutar(
    programa('mariadb'),
    [...conexion(usuario), '--default-character-set=utf8mb4', cfg.base],
    { clave, entrada: ruta },
  )
  paso('Copia cargada')
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npmRun = (script) =>
  new Promise((ok, falla) => {
    // Un solo texto con shell: pasar argumentos sueltos con shell está obsoleto en Node 24
    const p = spawn(`${npm} run ${script}`, { cwd: RAIZ, stdio: 'inherit', shell: true })
    p.on('close', (c) => (c === 0 ? ok() : falla(new Error(`npm run ${script} falló`))))
  })

async function preparar(archivo, opciones) {
  await crear()
  if (archivo) {
    await importar(archivo, opciones)
    // Si la copia es de una versión anterior, se completan las migraciones que falten
    await npmRun('db:migrate')
    paso(
      'Listo: la base tiene los mismos datos que la copia. Entre con los mismos usuarios y claves.',
    )
  } else {
    await npmRun('db:migrate')
    await npmRun('db:seed')
    paso('Listo: base nueva. Entre con ADMIN_EMAIL y ADMIN_PASSWORD del .env.')
  }
  console.log('\n  Arranque el sistema con: npm run dev  →  http://localhost:5173\n')
}

const [comando, ...resto] = process.argv.slice(2)
const archivo = resto.find((a) => !a.startsWith('--'))
const opciones = { reemplazar: resto.includes('--reemplazar') }

try {
  if (comando === 'crear') await crear()
  else if (comando === 'exportar') await exportar()
  else if (comando === 'importar') await importar(archivo, opciones)
  else if (comando === 'preparar') await preparar(archivo, opciones)
  else
    salir('Comandos: crear | exportar | importar <archivo> [--reemplazar] | preparar [<archivo>]')
} catch (e) {
  salir(e.message)
}
