// Diferencial cambiario (VEN-NIF / NIC 21): las cuentas de activo o pasivo pueden llevarse en
// una divisa (USD, EUR o USDT). Cada renglón en esas cuentas guarda también su monto en la
// divisa, y al cerrar el período el sistema registra un comprobante «DIF» que ajusta el saldo
// en bolívares de cada auxiliar a la tasa del cierre, contra las cuentas de ganancia y pérdida
// cambiaria configuradas en Empresa.

const MONEDAS = ['USD', 'EUR', 'USDT']

/** Agrega una subcuenta bajo `padreCodigo` si el padre es de grupo y el código está libre */
async function agregar(knex, padreCodigo, { codigo, nombre, moneda = null, movimiento = false }) {
  const padre = await knex('cuentas').where({ codigo: padreCodigo }).first()
  if (!padre || padre.es_movimiento) return null
  if (await knex('cuentas').where({ codigo }).first()) return null
  const [id] = await knex('cuentas').insert({
    codigo,
    nombre,
    tipo: padre.tipo,
    naturaleza: padre.naturaleza,
    nivel: padre.nivel + 1,
    padre_id: padre.id,
    es_movimiento: movimiento,
    activa: true,
    moneda,
  })
  return id
}

/** Cuentas que crea esta migración, de las hojas a la raíz (para revertirla) */
const CREADAS = [
  '1.1.01.03.001',
  '1.1.01.03',
  '1.1.01.04.001',
  '1.1.01.04',
  '4.2.01',
  '4.2',
  '6.2.01',
  '6.2',
]

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('cuentas', (t) => {
    t.enu('moneda', MONEDAS).nullable().after('naturaleza') // null = bolívares
  })
  await knex.schema.alterTable('comprobante_detalle', (t) => {
    t.decimal('monto_moneda', 18, 2).nullable().after('haber')
  })
  await knex.raw(`
    ALTER TABLE comprobante_detalle ADD CONSTRAINT monto_moneda_positivo
    CHECK (monto_moneda IS NULL OR monto_moneda > 0)
  `)
  await knex.schema.alterTable('empresa', (t) => {
    t.integer('cuenta_ganancia_cambiaria_id').unsigned().references('id').inTable('cuentas')
    t.integer('cuenta_perdida_cambiaria_id').unsigned().references('id').inTable('cuentas')
  })

  await knex('tipos_comprobante')
    .insert({
      codigo: 'DIF',
      nombre: 'Diferencial cambiario',
      descripcion: 'Ajuste de las cuentas en divisas a la tasa del cierre del período',
      orden: 90,
    })
    .onConflict('codigo')
    .ignore()

  // Cuentas de ejemplo en divisas y las de ganancia y pérdida cambiaria, solo si el plan
  // tiene los grupos de siempre y los códigos están libres
  if (
    await agregar(knex, '1.1.01', { codigo: '1.1.01.03', nombre: 'Caja en Divisas', moneda: 'USD' })
  ) {
    await agregar(knex, '1.1.01.03', {
      codigo: '1.1.01.03.001',
      nombre: 'Caja Principal en Dólares',
      moneda: 'USD',
      movimiento: true,
    })
  }
  if (
    await agregar(knex, '1.1.01', {
      codigo: '1.1.01.04',
      nombre: 'Activos Digitales',
      moneda: 'USDT',
    })
  ) {
    await agregar(knex, '1.1.01.04', {
      codigo: '1.1.01.04.001',
      nombre: 'Billetera Binance USDT',
      moneda: 'USDT',
      movimiento: true,
    })
  }
  const ganancia =
    (await agregar(knex, '4', { codigo: '4.2', nombre: 'Otros Ingresos' })) &&
    (await agregar(knex, '4.2', {
      codigo: '4.2.01',
      nombre: 'Ganancia en Diferencial Cambiario',
      movimiento: true,
    }))
  const perdida =
    (await agregar(knex, '6', { codigo: '6.2', nombre: 'Otros Gastos' })) &&
    (await agregar(knex, '6.2', {
      codigo: '6.2.01',
      nombre: 'Pérdida en Diferencial Cambiario',
      movimiento: true,
    }))
  if (ganancia)
    await knex('empresa').where({ id: 1 }).update({ cuenta_ganancia_cambiaria_id: ganancia })
  if (perdida)
    await knex('empresa').where({ id: 1 }).update({ cuenta_perdida_cambiaria_id: perdida })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('empresa', (t) => {
    t.dropForeign('cuenta_ganancia_cambiaria_id')
    t.dropForeign('cuenta_perdida_cambiaria_id')
    t.dropColumn('cuenta_ganancia_cambiaria_id')
    t.dropColumn('cuenta_perdida_cambiaria_id')
  })
  for (const codigo of CREADAS) {
    const c = await knex('cuentas').where({ codigo }).first()
    if (!c) continue
    const usada = await knex('comprobante_detalle').where({ cuenta_id: c.id }).first()
    const conHijos = await knex('cuentas').where({ padre_id: c.id }).first()
    if (!usada && !conHijos) await knex('cuentas').where({ id: c.id }).del()
  }
  const dif = await knex('tipos_comprobante').where({ codigo: 'DIF' }).first()
  if (dif && !(await knex('comprobantes').where({ tipo_id: dif.id }).first())) {
    await knex('correlativos').where({ tipo_id: dif.id }).del()
    await knex('tipos_comprobante').where({ id: dif.id }).del()
  }
  await knex.raw('ALTER TABLE comprobante_detalle DROP CONSTRAINT monto_moneda_positivo')
  await knex.schema.alterTable('comprobante_detalle', (t) => t.dropColumn('monto_moneda'))
  await knex.schema.alterTable('cuentas', (t) => t.dropColumn('moneda'))
}
