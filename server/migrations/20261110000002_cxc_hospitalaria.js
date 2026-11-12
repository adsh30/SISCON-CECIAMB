// Fase 9: Cuentas por Cobrar (CxC Hospitalaria) para la Clínica CECIAMB.
// Control de pacientes, aseguradoras, facturación de servicios clínicos y cobranzas con asiento contable automático.

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  // 1. Clientes (Pacientes particulares, Aseguradoras, Convenios corporativos)
  await knex.schema.createTable('cxc_clientes', (t) => {
    t.increments('id').primary()
    t.string('tipo_persona', 10).notNullable().defaultTo('JURIDICA') // 'NATURAL' o 'JURIDICA'
    t.string('tipo_documento', 5).notNullable().defaultTo('J') // 'V', 'E', 'J', 'G', 'P'
    t.string('identificacion', 30).notNullable()
    t.string('razon_social', 200).notNullable()
    t.string('nombre_comercial', 200).nullable()
    t.string('categoria', 30).notNullable().defaultTo('ASEGURADORA') // 'ASEGURADORA', 'PARTICULAR', 'CORPORATIVO', 'CONVENIO'
    t.string('telefono', 50).nullable()
    t.string('email', 120).nullable()
    t.text('direccion').nullable()
    t.integer('dias_credito').unsigned().notNullable().defaultTo(30)
    t.decimal('limite_credito', 18, 2).notNullable().defaultTo(0)
    t.integer('cuenta_contable_id').unsigned().nullable().references('id').inTable('cuentas')
    t.boolean('activo').notNullable().defaultTo(true)
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())

    t.unique(['tipo_documento', 'identificacion'])
    t.index(['categoria'])
    t.index(['razon_social'])
  })

  // 2. Facturas de servicios hospitalarios y asistenciales
  await knex.schema.createTable('cxc_facturas', (t) => {
    t.increments('id').primary()
    t.string('numero_factura', 50).notNullable().unique()
    t.string('numero_control', 50).nullable() // Control fiscal exigido en Venezuela
    t.integer('cliente_id').unsigned().notNullable().references('id').inTable('cxc_clientes')
    t.string('paciente_nombre', 150).nullable()
    t.string('paciente_cedula', 30).nullable()
    t.string('historia_medica', 50).nullable()
    t.date('fecha_emision').notNullable()
    t.date('fecha_vencimiento').notNullable()
    t.string('servicio_departamento', 50).notNullable().defaultTo('HOSPITALIZACION')
    t.integer('centro_costo_id').unsigned().nullable().references('id').inTable('centros_costo')
    t.string('moneda', 3).notNullable().defaultTo('VES')
    t.decimal('tasa_cambio', 18, 4).notNullable().defaultTo(1.0)
    t.decimal('subtotal_exento', 18, 2).notNullable().defaultTo(0)
    t.decimal('subtotal_gravado', 18, 2).notNullable().defaultTo(0)
    t.decimal('alicuota_iva', 5, 2).notNullable().defaultTo(16.0)
    t.decimal('monto_iva', 18, 2).notNullable().defaultTo(0)
    t.decimal('total', 18, 2).notNullable().defaultTo(0)
    t.decimal('saldo_pendiente', 18, 2).notNullable().defaultTo(0)
    t.string('estado', 30).notNullable().defaultTo('PENDIENTE') // 'PENDIENTE', 'COBRADA_PARCIAL', 'COBRADA_TOTAL', 'ANULADA'
    t.integer('comprobante_id').unsigned().nullable().references('id').inTable('comprobantes').onDelete('SET NULL')
    t.text('observaciones').nullable()
    t.integer('creado_por').unsigned().nullable().references('id').inTable('usuarios')
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())
    t.datetime('actualizado_en').notNullable().defaultTo(knex.fn.now())

    t.index(['cliente_id', 'estado'])
    t.index(['fecha_emision'])
    t.index(['fecha_vencimiento'])
  })

  // 3. Renglones / Ítems de la factura
  await knex.schema.createTable('cxc_factura_items', (t) => {
    t.increments('id').primary()
    t.integer('factura_id').unsigned().notNullable().references('id').inTable('cxc_facturas').onDelete('CASCADE')
    t.string('codigo_servicio', 50).nullable()
    t.string('descripcion', 255).notNullable()
    t.decimal('cantidad', 12, 2).notNullable().defaultTo(1)
    t.decimal('precio_unitario', 18, 2).notNullable().defaultTo(0)
    t.boolean('exento').notNullable().defaultTo(false)
    t.decimal('total', 18, 2).notNullable().defaultTo(0)
    t.integer('cuenta_ingreso_id').unsigned().nullable().references('id').inTable('cuentas')

    t.index(['factura_id'])
  })

  // 4. Cobros / Recibos de caja aplicados a facturas
  await knex.schema.createTable('cxc_cobros', (t) => {
    t.increments('id').primary()
    t.string('numero_recibo', 50).notNullable().unique()
    t.integer('cliente_id').unsigned().notNullable().references('id').inTable('cxc_clientes')
    t.integer('factura_id').unsigned().notNullable().references('id').inTable('cxc_facturas')
    t.date('fecha_cobro').notNullable()
    t.string('forma_pago', 30).notNullable() // 'TRANSFERENCIA', 'PUNTO_VENTA', 'PAGO_MOVIL', 'EFECTIVO_USD', 'EFECTIVO_VES', 'RETENCION_IVA', 'RETENCION_ISLR'
    t.string('referencia', 100).nullable()
    t.decimal('monto', 18, 2).notNullable().defaultTo(0)
    t.integer('cuenta_destino_id').unsigned().nullable().references('id').inTable('cuentas')
    t.integer('comprobante_id').unsigned().nullable().references('id').inTable('comprobantes').onDelete('SET NULL')
    t.text('notas').nullable()
    t.integer('creado_por').unsigned().nullable().references('id').inTable('usuarios')
    t.datetime('creado_en').notNullable().defaultTo(knex.fn.now())

    t.index(['cliente_id'])
    t.index(['factura_id'])
    t.index(['fecha_cobro'])
  })

  // 5. Sembrar clientes iniciales habituales de CECIAMB (Aseguradoras y Pacientes)
  await knex('cxc_clientes').insert([
    {
      tipo_persona: 'JURIDICA',
      tipo_documento: 'J',
      identificacion: '000413093',
      razon_social: 'MERCANTIL SEGUROS C.A.',
      nombre_comercial: 'Seguros Mercantil',
      categoria: 'ASEGURADORA',
      dias_credito: 45,
      telefono: '0212-2770111',
      email: 'siniestros@mercantilseguros.com',
      direccion: 'Av. Andrés Bello, Edif. Mercantil, Caracas',
    },
    {
      tipo_persona: 'JURIDICA',
      tipo_documento: 'J',
      identificacion: '000350822',
      razon_social: 'C.A. DE SEGUROS LA OCCIDENTAL',
      nombre_comercial: 'Seguros La Occidental',
      categoria: 'ASEGURADORA',
      dias_credito: 30,
      telefono: '0500-6224368',
      email: 'facturacion@segurosoccidental.com',
      direccion: 'Torre Occidental, Av. 4 Bella Vista, Maracaibo',
    },
    {
      tipo_persona: 'JURIDICA',
      tipo_documento: 'J',
      identificacion: '000732865',
      razon_social: 'SEGUROS CARACAS C.A.',
      nombre_comercial: 'Seguros Caracas',
      categoria: 'ASEGURADORA',
      dias_credito: 45,
      telefono: '0500-7348767',
      email: 'atencionclinicas@seguroscaracas.com',
      direccion: 'Av. Francisco de Miranda, Los Palos Grandes, Caracas',
    },
    {
      tipo_persona: 'NATURAL',
      tipo_documento: 'V',
      identificacion: '00000000',
      razon_social: 'PACIENTES PARTICULARES - CONTADO / CRÉDITO DIRECTO',
      nombre_comercial: 'Particular Clínico',
      categoria: 'PARTICULAR',
      dias_credito: 0,
      telefono: '0286-9231122',
      direccion: 'Puerto Ordaz, Estado Bolívar',
    },
  ])
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTableIfExists('cxc_cobros')
  await knex.schema.dropTableIfExists('cxc_factura_items')
  await knex.schema.dropTableIfExists('cxc_facturas')
  await knex.schema.dropTableIfExists('cxc_clientes')
}
