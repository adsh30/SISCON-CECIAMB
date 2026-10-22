// Genera datos contables de demostración (Ejercicio 2026, períodos y comprobantes)
// para visualizar y probar el sistema con datos reales del Hospital CECIAMB.
//
// Uso:
//   npm run bd:demo  o  node scripts/bd/sembrar-demo.mjs

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const ENV = join(RAIZ, '.env')
if (existsSync(ENV)) process.loadEnvFile(ENV)

console.log('='.repeat(70))
console.log('  GENERACIÓN DE DATOS DEMO / EJEMPLO CONTABLE (SISCON-CECIAMB)')
console.log('='.repeat(70))

const db = await mysql.createConnection({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'siscon_app',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'siscon_db',
  multipleStatements: true,
})

console.log('✓ Conectado a la base de datos.')

try {
  // 1. Obtener usuario admin
  const [usuarios] = await db.query("SELECT id FROM usuarios WHERE email = 'admin@ceciamb.local' LIMIT 1")
  const adminId = usuarios[0]?.id || 1

  // 2. Crear Ejercicio 2026 si no existe
  console.log('• Verificando ejercicio contable 2026...')
  const [ejercicios] = await db.query('SELECT id FROM ejercicios WHERE anio = 2026')
  let ejercicioId = ejercicios[0]?.id

  if (!ejercicioId) {
    const [resEj] = await db.execute(
      `INSERT INTO ejercicios (anio, fecha_inicio, fecha_fin, creado_por)
       VALUES (2026, '2026-01-01', '2026-12-31', ?)`,
      [adminId],
    )
    ejercicioId = resEj.insertId

    // Crear los 12 períodos
    for (let m = 1; m <= 12; m++) {
      const mesStr = String(m).padStart(2, '0')
      const ultimoDia = new Date(2026, m, 0).getDate()
      await db.execute(
        `INSERT INTO periodos (ejercicio_id, numero, anio, mes, fecha_inicio, fecha_fin, estado)
         VALUES (?, ?, 2026, ?, ?, ?, 'ABIERTO')`,
        [ejercicioId, m, m, `2026-${mesStr}-01`, `2026-${mesStr}-${ultimoDia}`],
      )
    }
    console.log('  ✓ Ejercicio 2026 y 12 períodos mensuales creados exitosamente.')
  } else {
    console.log('  ✓ Ejercicio 2026 ya existía.')
  }

  // 3. Mapear tipos de comprobante y cuentas
  const [tiposRows] = await db.query('SELECT id, codigo FROM tipos_comprobante')
  const tipos = Object.fromEntries(tiposRows.map((t) => [t.codigo, t.id]))

  const [cuentasRows] = await db.query('SELECT id, codigo, nombre FROM cuentas WHERE es_movimiento = 1')
  const cuentas = Object.fromEntries(cuentasRows.map((c) => [c.codigo, c.id]))

  const [centrosRows] = await db.query('SELECT id, codigo FROM centros_costo')
  const centros = Object.fromEntries(centrosRows.map((c) => [c.codigo, c.id]))

  // Obtener período de octubre 2026 (mes 10)
  const [periodoOct] = await db.query('SELECT id FROM periodos WHERE ejercicio_id = ? AND mes = 10', [ejercicioId])
  const periodoId = periodoOct[0]?.id || 10

  console.log('• Insertando comprobantes contables de ejemplo...')

  const comprobantesDemo = [
    {
      tipo: 'VEN',
      numero: 1,
      codigo: 'VEN-000001',
      fecha: '2026-10-02',
      concepto: 'Facturación por servicios médicos y hospitalización a Seguros Caracas',
      referencia: 'FAC-0001540',
      beneficiario: 'Seguros Caracas, C.A.',
      estado: 'APROBADO',
      renglones: [
        { cuenta: '1.1.02.02', cc: 'HOS', desc: 'Factura 1540 - Seguros Caracas', ref: '0001540', debe: 1450000, haber: 0 },
        { cuenta: '1.1.01.01.001', cc: 'EME', desc: 'Deducible copago paciente en caja', ref: '0001540', debe: 150000, haber: 0 },
        { cuenta: '4.1.01.01', cc: 'HOS', desc: 'Ingreso por servicios de hospitalización', ref: '0001540', debe: 0, haber: 1600000 },
      ],
    },
    {
      tipo: 'COM',
      numero: 1,
      codigo: 'COM-000001',
      fecha: '2026-10-05',
      concepto: 'Compra de medicamentos para stock de Farmacia Hospitalaria',
      referencia: 'FACT-9923',
      beneficiario: 'Droguería Nena, C.A.',
      estado: 'APROBADO',
      renglones: [
        { cuenta: '1.1.03.01', cc: 'FAR', desc: 'Antibióticos y analgésicos según Fact 9923', ref: '0009923', debe: 850000, haber: 0 },
        { cuenta: '2.1.01.01', cc: 'ADM', desc: 'Cta por pagar Droguería Nena 30 días', ref: '0009923', debe: 0, haber: 850000 },
      ],
    },
    {
      tipo: 'HON',
      numero: 1,
      codigo: 'HON-000001',
      fecha: '2026-10-08',
      concepto: 'Honorarios médicos especialistas cirugías pabellón semana 40',
      referencia: 'REL-HON-40',
      beneficiario: 'Dr. Carlos Mendoza y equipo',
      estado: 'APROBADO',
      renglones: [
        { cuenta: '2.1.01.02', cc: 'QUI', desc: 'Honorarios cirugías traumatología', ref: 'REC-3301', debe: 920000, haber: 0 },
        { cuenta: '1.1.01.02.001', cc: 'ADM', desc: 'Transferencia Mercantil Ref 4839201', ref: 'TRF-4839', debe: 0, haber: 892400 },
        { cuenta: '2.1.02.01', cc: 'ADM', desc: 'Retención ISLR 3% sobre honorarios', ref: 'RET-019', debe: 0, haber: 27600 },
      ],
    },
    {
      tipo: 'NOM',
      numero: 1,
      codigo: 'NOM-000001',
      fecha: '2026-10-15',
      concepto: 'Nómina primera quincena de octubre personal asistencial y administrativo',
      referencia: 'QUINC-10-1',
      beneficiario: 'Personal CECIAMB',
      estado: 'APROBADO',
      renglones: [
        { cuenta: '6.1.01.01', cc: 'ADM', desc: 'Sueldos y salarios quincena 1', ref: 'Q1-OCT', debe: 2150000, haber: 0 },
        { cuenta: '1.1.01.02.002', cc: 'ADM', desc: 'Pago nómina Banesco lote 5542', ref: 'LOT-5542', debe: 0, haber: 2064000 },
        { cuenta: '2.1.02.02', cc: 'ADM', desc: 'Retención SSO y SPF empleados', ref: 'RET-SSO', debe: 0, haber: 86000 },
      ],
    },
    {
      tipo: 'EGR',
      numero: 1,
      codigo: 'EGR-000001',
      fecha: '2026-10-18',
      concepto: 'Pago mantenimiento preventivo de equipos de imagenología y tomógrafo',
      referencia: 'CHQ-8841',
      beneficiario: 'ServiMédica Guayana, C.A.',
      estado: 'APROBADO',
      renglones: [
        { cuenta: '6.1.02.01', cc: 'IMG', desc: 'Mantenimiento tomógrafo GE', ref: 'F-11029', debe: 420000, haber: 0 },
        { cuenta: '1.1.01.02.003', cc: 'ADM', desc: 'Pago Cta Cte Banco Venezuela', ref: 'ND-9921', debe: 0, haber: 420000 },
      ],
    },
    {
      tipo: 'ING',
      numero: 1,
      codigo: 'ING-000001',
      fecha: '2026-10-20',
      concepto: 'Cobro transferencia póliza colectiva Sidor - hospitalizaciones',
      referencia: 'TRF-SIDOR-11',
      beneficiario: 'Fondo Autoadministrado Salud Sidor',
      estado: 'APROBADO',
      renglones: [
        { cuenta: '1.1.01.02.001', cc: 'ADM', desc: 'Ingreso en Banco Mercantil', ref: 'DEP-88410', debe: 3200000, haber: 0 },
        { cuenta: '1.1.02.02', cc: 'HOS', desc: 'Cancelación facturas pacientes Sidor', ref: 'REL-0922', debe: 0, haber: 3200000 },
      ],
    },
    {
      tipo: 'DIA',
      numero: null,
      codigo: null,
      fecha: '2026-10-22',
      concepto: 'Asiento de ajuste por depreciación mensual de equipos médicos pabellón',
      referencia: 'AJU-DEP-OCT',
      beneficiario: null,
      estado: 'BORRADOR',
      renglones: [
        { cuenta: '6.1.03.01', cc: 'QUI', desc: 'Gasto depreciación equipos de quirófano', ref: 'TABLA-DEP', debe: 185000, haber: 0 },
        { cuenta: '1.2.01.04', cc: 'QUI', desc: 'Depreciación acumulada equipos médicos', ref: 'TABLA-DEP', debe: 0, haber: 185000 },
      ],
    },
  ]

  let creados = 0
  let renglonesCreados = 0

  for (const c of comprobantesDemo) {
    const tipoId = tipos[c.tipo] || 1
    // Verificar si ya existe por concepto
    const [existe] = await db.query('SELECT id FROM comprobantes WHERE concepto = ? LIMIT 1', [c.concepto])
    if (existe.length > 0) continue

    const totalDebe = c.renglones.reduce((acc, r) => acc + r.debe, 0)
    const totalHaber = c.renglones.reduce((acc, r) => acc + r.haber, 0)

    // Se crea primero como BORRADOR para cumplir con el trigger de auditoría contable
    const [resComp] = await db.execute(
      `INSERT INTO comprobantes (
        periodo_id, tipo_id, numero, codigo, fecha, 
        concepto, referencia, beneficiario, estado, total_debe, total_haber,
        creado_por
      ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, 'BORRADOR', ?, ?, ?)`,
      [
        periodoId,
        tipoId,
        c.fecha,
        c.concepto,
        c.referencia,
        c.beneficiario,
        totalDebe,
        totalHaber,
        adminId,
      ],
    )
    const compId = resComp.insertId

    let numReng = 1
    for (const r of c.renglones) {
      const ctaId = cuentas[r.cuenta] || Object.values(cuentas)[0]
      const ccId = centros[r.cc] || null

      await db.execute(
        `INSERT INTO comprobante_detalle (
          comprobante_id, renglon, cuenta_id, centro_costo_id, descripcion, referencia, debe, haber
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [compId, numReng++, ctaId, ccId, r.desc, r.ref, r.debe, r.haber],
      )
      renglonesCreados++
    }

    // Si debe quedar aprobado, se aprueba tras registrar sus renglones cuadrados
    if (c.estado === 'APROBADO') {
      await db.execute(
        `UPDATE comprobantes 
         SET estado = 'APROBADO', numero = ?, codigo = ?, aprobado_por = ?, aprobado_en = ?
         WHERE id = ?`,
        [c.numero, c.codigo, adminId, `${c.fecha} 10:00:00`, compId],
      )
    }

    creados++
  }

  console.log(`  ✓ ${creados} comprobantes contables creados.`)
  console.log(`  ✓ ${renglonesCreados} renglones contables creados.`)
  console.log('\n======================================================================')
  console.log('  ¡DATOS LISTOS! YA PUEDES VER LOS COMPROBANTES Y DETALLES EN LA APP')
  console.log('======================================================================\n')
} catch (error) {
  console.error('\n✗ Error al generar datos demo:', error.message)
} finally {
  await db.end()
}
