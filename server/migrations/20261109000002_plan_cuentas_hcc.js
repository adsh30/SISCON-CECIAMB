// Plan de cuentas real del Hospital de Clínicas CECIAMB (Sparrow, códigos compactos 1 → 111101)
// con sus saldos iniciales como comprobante de Apertura en borrador. Reemplaza el plan de
// ejemplo: borra sus cuentas sin movimientos y deja inactivas las que tienen alguno.
// Va como migración para que el bot de despliegue lo cargue también en producción.

import { cargarPlanHcc, crearAperturaHcc } from '../src/modules/cuentas/plan-hcc.js'

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  // Las pruebas automáticas trabajan con el plan de ejemplo (códigos con puntos)
  if (process.env.NODE_ENV === 'test') return
  const plan = await cargarPlanHcc(knex)
  if (plan.cargado) await crearAperturaHcc(knex)
}

/** Los datos contables no se deshacen: el plan y la apertura se editan desde el sistema */
export async function down() {}
