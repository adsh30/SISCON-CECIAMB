// Importador de datos históricos desde Sparrow Contabilidad (conta2024) hacia SISCON-CECIAMB.
//
// Uso:
//   node scripts/bd/importar-sparrow.mjs [ruta_archivo_sql]
//
// Ejemplo:
//   node scripts/bd/importar-sparrow.mjs respaldos/contabilidad.sql
//
// Lee la configuración del archivo .env en la raíz del proyecto.

import { existsSync, readFileSync } from 'node:fs'
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
console.log('  MIGRACIÓN / IMPORTADOR DE DATOS DESDE SPARROW (conta2024)')
console.log('='.repeat(70))
console.log(`Archivo objetivo: ${archivoSql}\n`)

if (!existsSync(archivoSql)) {
  console.error(`✗ Error: El archivo no existe: ${archivoSql}`)
  process.exit(1)
}

const contenido = readFileSync(archivoSql, 'utf8')
const tieneInserts = /insert\s+into/i.test(contenido)

if (!tieneInserts) {
  console.warn('⚠️  ATENCIÓN: EL ARCHIVO CONTIENE ÚNICAMENTE LA ESTRUCTURA DDL (CREATE TABLE).')
  console.warn('    No se encontraron sentencias INSERT con datos o registros de Sparrow.\n')
  console.log('Diagnóstico del volcado SQL:')
  console.log(`  • Tamaño del archivo: ${(contenido.length / 1024).toFixed(1)} KB`)
  console.log(`  • Líneas totales: ${contenido.split('\n').length}`)
  const tablas = [...contenido.matchAll(/CREATE TABLE `([^`]+)`/g)].map((m) => m[1])
  console.log(`  • Tablas detectadas (${tablas.length}): ${tablas.slice(0, 8).join(', ')}...`)

  console.log('\n' + '-'.repeat(70))
  console.log('INSTRUCCIONES PARA EXPORTAR CON DATOS DESDE SQLyog:')
  console.log('-'.repeat(70))
  console.log('1. Abra SQLyog y conéctese a la base de datos de Sparrow (conta2024).')
  console.log('2. En el panel izquierdo, haga clic derecho sobre la base de datos "conta2024".')
  console.log('3. Seleccione: Backup/Export -> "Backup Database As SQL Dump..." (o Ctrl+Alt+E).')
  console.log('4. En la ventana que aparece, en la sección "Export Options":')
  console.log('     [X] Structure and data    <-- SELECCIONAR ESTA OPCIÓN O "Data only"')
  console.log('5. Marque las tablas que desea exportar, principalmente:')
  console.log('     • conta_plan_de_cuentas')
  console.log('     • conta_centro_costos')
  console.log('     • conta_asientos_cabezera')
  console.log('     • conta_asientos_detalles')
  console.log(`6. Guarde el archivo en:`)
  console.log(`     ${archivoSql}`)
  console.log('7. Vuelva a ejecutar este comando:')
  console.log(`     node scripts/bd/importar-sparrow.mjs respaldos/contabilidad.sql`)
  console.log('-'.repeat(70) + '\n')
  process.exit(0)
}

// Proceso de importación cuando el archivo sí contiene sentencias INSERT
console.log('✓ Se detectaron sentencias INSERT en el archivo. Conectando a SISCON...')

const db = await mysql.createConnection({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'siscon_app',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'siscon_db',
  multipleStatements: true,
})

console.log('✓ Conexión establecida con la base de datos.')

try {
  // Parsing de bloques INSERT específicos
  // 1. Centros de costo
  console.log('• Procesando centros de costo...')
  const mCentros = contenido.match(/INSERT INTO `conta_centro_costos`[\s\S]*?;/gi)
  let countCentros = 0
  if (mCentros) {
    for (const bloque of mCentros) {
      // Parse values
      const valMatch = bloque.matchAll(/\(([^)]+)\)/g)
      for (const v of valMatch) {
        const partes = v[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        const codigo = partes[3] || partes[0]
        const nombre = partes[1] || `Centro ${codigo}`
        if (codigo && nombre) {
          await db.execute(
            `INSERT INTO centros_costo (codigo, nombre, activo) 
             VALUES (?, ?, 1) 
             ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
            [codigo.toUpperCase(), nombre.toUpperCase()],
          )
          countCentros++
        }
      }
    }
  }
  console.log(`  ✓ ${countCentros} centros de costo importados/actualizados.`)

  // 2. Plan de cuentas
  console.log('• Procesando plan de cuentas...')
  const mCuentas = contenido.match(/INSERT INTO `conta_plan_de_cuentas`[\s\S]*?;/gi)
  let countCuentas = 0
  if (mCuentas) {
    for (const bloque of mCuentas) {
      const valMatch = bloque.matchAll(/\(([^)]+)\)/g)
      for (const v of valMatch) {
        const partes = v[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        const codigo = partes[0]
        const nombre = partes[1]
        const grupo = (partes[5] || '').toLowerCase()
        const nivel = Number(partes[13]) || (codigo.split('.').length)
        const esMovimiento = grupo === 'no' || grupo === '0'

        let tipo = 'ACTIVO'
        let naturaleza = 'DEUDORA'
        const primerDigito = codigo.charAt(0)
        if (primerDigito === '1') {
          tipo = 'ACTIVO'
          naturaleza = 'DEUDORA'
        } else if (primerDigito === '2') {
          tipo = 'PASIVO'
          naturaleza = 'ACREEDORA'
        } else if (primerDigito === '3') {
          tipo = 'PATRIMONIO'
          naturaleza = 'ACREEDORA'
        } else if (primerDigito === '4') {
          tipo = 'INGRESO'
          naturaleza = 'ACREEDORA'
        } else if (primerDigito === '5') {
          tipo = 'COSTO'
          naturaleza = 'DEUDORA'
        } else if (primerDigito === '6') {
          tipo = 'GASTO'
          naturaleza = 'DEUDORA'
        } else if (primerDigito === '7') {
          tipo = 'ORDEN'
          naturaleza = 'DEUDORA'
        }

        if (codigo && nombre) {
          await db.execute(
            `INSERT INTO cuentas (codigo, nombre, tipo, naturaleza, nivel, es_movimiento, activa)
             VALUES (?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE 
               nombre = VALUES(nombre),
               tipo = VALUES(tipo),
               naturaleza = VALUES(naturaleza),
               es_movimiento = VALUES(es_movimiento)`,
            [codigo, nombre.toUpperCase(), tipo, naturaleza, nivel, esMovimiento ? 1 : 0],
          )
          countCuentas++
        }
      }
    }
  }
  console.log(`  ✓ ${countCuentas} cuentas contables importadas/actualizadas.`)

  console.log('\n✓ Migración finalizada con éxito.')
} catch (error) {
  console.error('\n✗ Error durante la migración:', error.message)
} finally {
  await db.end()
}
