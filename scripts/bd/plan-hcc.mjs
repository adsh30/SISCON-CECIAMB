// Plan de cuentas HCC y comprobante de apertura con los saldos iniciales.
//
//   npm run bd:plan-hcc                       carga el plan (si falta) y crea la apertura
//   npm run bd:plan-hcc -- --fecha 2026-01-01 apertura con esa fecha (período abierto)
//
// La migración 20261109000002 ya lo hace al instalar o actualizar. Este comando sirve cuando
// en ese momento no había un período abierto (falta el ejercicio) y la apertura quedó pendiente,
// o si se eliminó el borrador de apertura y se quiere generar de nuevo.

import knex from 'knex'
import config from '../../server/knexfile.js'
import { cargarPlanHcc, crearAperturaHcc } from '../../server/src/modules/cuentas/plan-hcc.js'

const args = process.argv.slice(2)
const fecha = args.includes('--fecha') ? args[args.indexOf('--fecha') + 1] : undefined
if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
  console.error('\n✗ Use la fecha como AAAA-MM-DD, por ejemplo --fecha 2026-01-01\n')
  process.exit(1)
}

const db = knex(config)
try {
  await db.transaction(async (trx) => {
    const plan = await cargarPlanHcc(trx)
    console.log(
      plan.cargado
        ? `• Plan HCC cargado: ${plan.cuentas} cuentas (${plan.retiradas} del plan de ejemplo borradas, ${plan.inactivas} inactivas por tener movimientos)`
        : '• El plan HCC ya estaba cargado',
    )
    const apertura = await crearAperturaHcc(trx, { fecha })
    console.log(
      apertura
        ? `• Apertura creada como Borrador #${apertura.id} del ${apertura.fecha}: ${apertura.renglones} renglones, Bs ${apertura.totalDebe}. Revísela en Comprobantes y apruébela.`
        : '• No se creó la apertura: ya existe un comprobante de Apertura o no hay un período abierto (cree el ejercicio en Períodos).',
    )
  })
} catch (e) {
  console.error(`\n✗ ${e.message}\n`)
  process.exitCode = 1
} finally {
  await db.destroy()
}
