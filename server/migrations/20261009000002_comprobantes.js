// Fase 4: comprobantes contables (RF-04, RF-05).
// Un comprobante nace en BORRADOR sin número; al aprobarlo recibe el correlativo de su tipo
// y período (sin huecos) y queda inmutable. Solo puede pasar a ANULADO, con motivo.

const TIPOS = [
  ['VEN', 'Ventas', 'Facturación de servicios médicos y ventas del hospital'],
  ['COM', 'Compras', 'Compras de insumos, medicinas y servicios'],
  ['HON', 'Honorarios', 'Honorarios profesionales de médicos y especialistas'],
  ['NOM', 'Nómina', 'Registro contable de la nómina del personal'],
  ['DIA', 'Diario', 'Asientos de diario de uso general'],
  ['AJU', 'Ajuste', 'Ajustes y correcciones contables'],
  ['ING', 'Ingreso', 'Cobros y entradas de dinero'],
  ['EGR', 'Egreso', 'Pagos y salidas de dinero'],
]

const PROTEGIDO = "SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT ="

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('tipos_comprobante', (t) => {
    t.increments('id').primary()
    t.string('codigo', 6).notNullable().unique() // también es el prefijo del número
    t.string('nombre', 60).notNullable()
    t.string('descripcion', 255)
    t.smallint('orden').unsigned().notNullable().defaultTo(0)
    t.boolean('activo').notNullable().defaultTo(true)
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('actualizado_por').unsigned().references('id').inTable('usuarios')
  })
  await knex('tipos_comprobante').insert(
    TIPOS.map(([codigo, nombre, descripcion], i) => ({
      codigo,
      nombre,
      descripcion,
      orden: (i + 1) * 10,
    })),
  )

  await knex.schema.createTable('correlativos', (t) => {
    t.integer('tipo_id').unsigned().notNullable().references('id').inTable('tipos_comprobante')
    t.integer('periodo_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('periodos')
      .onDelete('CASCADE')
    t.integer('ultimo').unsigned().notNullable().defaultTo(0)
    t.primary(['tipo_id', 'periodo_id'])
  })

  await knex.schema.createTable('comprobantes', (t) => {
    t.increments('id').primary()
    t.integer('tipo_id').unsigned().notNullable().references('id').inTable('tipos_comprobante')
    t.integer('periodo_id').unsigned().notNullable().references('id').inTable('periodos')
    t.integer('numero').unsigned() // se asigna al aprobar
    t.string('codigo', 30).unique() // VEN-2026-10-0001
    t.date('fecha').notNullable()
    t.string('concepto', 255).notNullable()
    t.string('referencia', 60)
    t.string('beneficiario', 120)
    t.enu('estado', ['BORRADOR', 'APROBADO', 'ANULADO']).notNullable().defaultTo('BORRADOR')
    t.decimal('total_debe', 18, 2).notNullable().defaultTo(0)
    t.decimal('total_haber', 18, 2).notNullable().defaultTo(0)
    t.integer('origen_id').unsigned().references('id').inTable('comprobantes')
    t.enu('origen_tipo', ['DUPLICADO', 'REVERSO'])
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('creado_por').unsigned().references('id').inTable('usuarios')
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())
    t.integer('actualizado_por').unsigned().references('id').inTable('usuarios')
    t.datetime('aprobado_en')
    t.integer('aprobado_por').unsigned().references('id').inTable('usuarios')
    t.datetime('anulado_en')
    t.integer('anulado_por').unsigned().references('id').inTable('usuarios')
    t.string('motivo_anulacion', 255)

    t.unique(['tipo_id', 'periodo_id', 'numero'])
    t.index(['estado', 'fecha'])
    t.index(['tipo_id', 'fecha'])
    t.index(['periodo_id', 'estado'])
    t.index(['fecha', 'id'])
  })

  await knex.schema.createTable('comprobante_detalle', (t) => {
    t.increments('id').primary()
    t.integer('comprobante_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('comprobantes')
      .onDelete('CASCADE') // solo se borran borradores (ver triggers)
    t.smallint('renglon').unsigned().notNullable()
    t.integer('cuenta_id').unsigned().notNullable().references('id').inTable('cuentas')
    t.integer('centro_costo_id').unsigned().references('id').inTable('centros_costo')
    t.string('descripcion', 255)
    t.decimal('debe', 18, 2).notNullable().defaultTo(0)
    t.decimal('haber', 18, 2).notNullable().defaultTo(0)
    t.string('referencia', 60)

    t.unique(['comprobante_id', 'renglon'])
    t.index(['cuenta_id'])
    t.index(['centro_costo_id'])
  })
  // Cada renglón lleva Debe o Haber, mayor que cero y nunca ambos
  await knex.raw(`
    ALTER TABLE comprobante_detalle ADD CONSTRAINT renglon_debe_o_haber
    CHECK ((debe > 0 AND haber = 0) OR (haber > 0 AND debe = 0))
  `)

  // Inmutabilidad en la propia base de datos, aunque se entre por fuera del sistema
  await knex.raw(`
    CREATE TRIGGER comprobantes_inmutables
    BEFORE UPDATE ON comprobantes
    FOR EACH ROW
    BEGIN
      IF OLD.estado = 'ANULADO' THEN
        ${PROTEGIDO} 'Un comprobante anulado no se puede modificar';
      END IF;
      IF OLD.estado = 'APROBADO' AND (
        NEW.estado <> 'ANULADO'
        OR NEW.fecha <> OLD.fecha
        OR NEW.tipo_id <> OLD.tipo_id
        OR NEW.periodo_id <> OLD.periodo_id
        OR NOT (NEW.numero <=> OLD.numero)
        OR NOT (NEW.codigo <=> OLD.codigo)
        OR NEW.concepto <> OLD.concepto
        OR NEW.total_debe <> OLD.total_debe
        OR NEW.total_haber <> OLD.total_haber
      ) THEN
        ${PROTEGIDO} 'Un comprobante aprobado solo se puede anular';
      END IF;
    END
  `)
  await knex.raw(`
    CREATE TRIGGER comprobantes_sin_borrar
    BEFORE DELETE ON comprobantes
    FOR EACH ROW
    BEGIN
      IF OLD.estado <> 'BORRADOR' THEN
        ${PROTEGIDO} 'Solo se pueden eliminar comprobantes en borrador';
      END IF;
    END
  `)
  // Los renglones solo cambian mientras el comprobante es borrador.
  // (El borrado en cascada de un borrador no dispara triggers en MariaDB.)
  for (const [evento, fila] of [
    ['INSERT', 'NEW'],
    ['UPDATE', 'OLD'],
    ['DELETE', 'OLD'],
  ]) {
    await knex.raw(`
      CREATE TRIGGER detalle_solo_borrador_${evento.toLowerCase()}
      BEFORE ${evento} ON comprobante_detalle
      FOR EACH ROW
      BEGIN
        IF (SELECT estado FROM comprobantes WHERE id = ${fila}.comprobante_id) <> 'BORRADOR' THEN
          ${PROTEGIDO} 'Los renglones de un comprobante aprobado o anulado no se pueden modificar';
        END IF;
      END
    `)
  }
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  for (const t of [
    'detalle_solo_borrador_insert',
    'detalle_solo_borrador_update',
    'detalle_solo_borrador_delete',
    'comprobantes_sin_borrar',
    'comprobantes_inmutables',
  ]) {
    await knex.raw(`DROP TRIGGER IF EXISTS ${t}`)
  }
  await knex.schema.dropTableIfExists('comprobante_detalle')
  await knex.schema.dropTableIfExists('comprobantes')
  await knex.schema.dropTableIfExists('correlativos')
  await knex.schema.dropTableIfExists('tipos_comprobante')
}
