# GOAL — SISCON-CECIAMB

## Objetivo general

Construir un **sistema contable web, moderno y auditable**, inspirado en **CIACLI Contabilidad Sparrow**, que permita registrar, validar y consultar los comprobantes contables del centro de salud, garantizando la **consistencia y veracidad** de los datos consolidados en una base de datos central (MariaDB local, compatible MySQL).

## Objetivos específicos

1. **Comprobantes contables**: registrar asientos de diario, ajustes, ingresos y egresos originados en ventas, compras, honorarios y nómina, con validación automática de partida doble (Debe = Haber).
2. **Consulta por categoría**: listar comprobantes filtrados por categoría (ventas, compras, honorarios, nómina…) o todos a la vez.
3. **Libros oficiales**: generar Libro Diario y Libro Mayor por período, exportables a PDF/Excel.
4. **Trazabilidad**: bitácora (audit trail) que identifique qué usuario registró, modificó, aprobó o anuló cada movimiento, con valores anteriores y nuevos.
5. **Seguridad**: acceso por usuario y rol (Administrador, Contador, Analista, Auditor).
6. **Experiencia moderna**: interfaz React + Tailwind rápida, clara y usable con teclado (como Sparrow), reemplazando la interfaz de escritorio antigua.

## Criterios de éxito (Definition of Done del proyecto)

- [ ] Ningún comprobante aprobado queda descuadrado (Debe ≠ Haber) — validado en backend y en base de datos.
- [ ] Un comprobante aprobado no se puede editar ni borrar; solo anular con motivo (queda en bitácora).
- [ ] Libro Diario y Mayor cuadran entre sí y con la suma de comprobantes del período.
- [ ] Toda acción de escritura deja registro en bitácora con usuario, fecha/hora, IP y cambios.
- [ ] Los 3 usuarios contables pueden operar el ciclo completo: plan de cuentas → comprobantes → libros.
- [ ] Cada funcionalidad se entrega con **backend y frontend** completos.

## Fuera de alcance

Citas/historias médicas/admisión/camas/altas · Facturación y POS · Inventario físico de farmacia · Cálculo de nómina/RRHH · Integración bancaria en tiempo real (APIs).
El sistema **solo recibe el resumen financiero** de esos procesos para generar el comprobante.
