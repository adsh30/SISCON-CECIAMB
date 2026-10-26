import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const ENV = join(RAIZ, '.env')
if (existsSync(ENV)) process.loadEnvFile(ENV)

const archivoSql = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : join(RAIZ, 'respaldos', 'contabilidad.sql')

console.log('='.repeat(70))
console.log('  EJECUTOR DE SCRIPT SQL (Estructura y Datos)')
console.log('='.repeat(70))
console.log(`Archivo objetivo: ${archivoSql}\n`)

if (!existsSync(archivoSql)) {
  console.error(`✗ Error: Archivo no encontrado: ${archivoSql}`)
  process.exit(1)
}

const contenido = readFileSync(archivoSql, 'utf8')
console.log(`Tamaño del archivo: ${(contenido.length / 1024).toFixed(1)} KB`)

// Conectar como root a MariaDB
console.log('Conectando a MariaDB como root...')
const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: 'root',
  password: process.env.DB_ROOT_PASSWORD,
  multipleStatements: true,
})

console.log('✓ Conectado exitosamente como root.')

try {
  // Asegurar permisos para siscon_app en conta2024
  console.log('• Configurando base de datos conta2024 y permisos...')
  await connection.query('CREATE DATABASE IF NOT EXISTS `conta2024` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
  await connection.query(`GRANT ALL PRIVILEGES ON \`conta2024\`.* TO '${process.env.DB_USER || 'siscon_app'}'@'localhost';`)
  await connection.query('FLUSH PRIVILEGES;')
  console.log('✓ Base de datos conta2024 lista y permisos concedidos a siscon_app.')

  // Ejecutar el script SQL completo en conta2024
  console.log('• Ejecutando volcado SQL en conta2024...')
  await connection.changeUser({ database: 'conta2024' })

  // Dividir en sentencias o ejecutar directamente con multipleStatements
  await connection.query(contenido)
  console.log('✓ Sentencias del archivo SQL ejecutadas con éxito en conta2024.')

  // Verificar las tablas creadas
  const [tablas] = await connection.query('SHOW TABLES;')
  console.log(`\n✓ Total de tablas creadas en conta2024: ${tablas.length}`)
  console.log('Muestra de tablas creadas:')
  for (const t of tablas.slice(0, 10)) {
    console.log(`  - ${Object.values(t)[0]}`)
  }
  if (tablas.length > 10) {
    console.log(`  ... y ${tablas.length - 10} tablas más.`)
  }

  console.log('\n======================================================================')
  console.log('  EJECUCIÓN COMPLETADA CON ÉXITO')
  console.log('======================================================================\n')
} catch (err) {
  console.error('\n✗ Error al ejecutar el SQL:', err.message)
} finally {
  await connection.end()
}
