/*
SQLyog Ultimate v8.32 
MySQL - 5.7.33-0ubuntu0.16.04.1 : Database - conta2024
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`conta2024` /*!40100 DEFAULT CHARACTER SET latin1 */;

USE `conta2024`;

/*Table structure for table `aa_plan` */

DROP TABLE IF EXISTS `aa_plan`;

CREATE TABLE `aa_plan` (
  `codigo` varchar(200) DEFAULT NULL,
  `Descripcion` varchar(200) DEFAULT NULL,
  `nivel` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `aa_tempo` */

DROP TABLE IF EXISTS `aa_tempo`;

CREATE TABLE `aa_tempo` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `numero_comprobante` int(11) NOT NULL DEFAULT '0',
  `saldo` double(12,2) NOT NULL DEFAULT '0.00',
  `tipo` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=228 DEFAULT CHARSET=latin1;

/*Table structure for table `aa_tempo1` */

DROP TABLE IF EXISTS `aa_tempo1`;

CREATE TABLE `aa_tempo1` (
  `id_t` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_t`)
) ENGINE=InnoDB AUTO_INCREMENT=165 DEFAULT CHARSET=latin1;

/*Table structure for table `asientosborradoscierre` */

DROP TABLE IF EXISTS `asientosborradoscierre`;

CREATE TABLE `asientosborradoscierre` (
  `numero_comprobante` int(10) unsigned NOT NULL DEFAULT '0',
  `cod_contable` varchar(20) DEFAULT '0',
  `detalles` mediumtext CHARACTER SET utf8,
  `tipo_operacion` varchar(10) DEFAULT '',
  `numero_documento` varchar(20) DEFAULT NULL,
  `numero_control` varchar(20) DEFAULT '',
  `fecha_documento` date DEFAULT NULL,
  `debe` decimal(20,2) DEFAULT '0.00',
  `haber` decimal(20,2) DEFAULT '0.00',
  `tipo_libro` char(7) DEFAULT 'Normal',
  `cod_proveedor` int(11) DEFAULT '0',
  `nombre_proveedor` varchar(100) DEFAULT ' ',
  `rif` varchar(20) DEFAULT '',
  `nit` varchar(20) DEFAULT '',
  `monto_gravado` double(20,2) DEFAULT '0.00',
  `monto_exento` double(20,2) DEFAULT '0.00',
  `ivap` double(8,2) DEFAULT '0.00',
  `monto_iva` double(20,2) DEFAULT '0.00',
  `monto_retencion_iva` double(20,2) DEFAULT '0.00',
  `rete_ivap` double(8,2) DEFAULT '0.00',
  `num_comprobante_retencion` varchar(20) NOT NULL DEFAULT '0',
  `genera_activo` char(2) DEFAULT 'No',
  `cod_centro_costo` int(10) DEFAULT '0',
  `tasa_aplicada` double(10,2) DEFAULT NULL,
  `cod_detalle` int(10) unsigned DEFAULT '0',
  `id` int(11) NOT NULL DEFAULT '0',
  `descripcion_codigo` varchar(100) DEFAULT NULL,
  `fecha_emision` date DEFAULT '0000-00-00',
  `genera_comp` varchar(2) DEFAULT 'No',
  `beneficiario` varchar(100) DEFAULT NULL,
  `contra_trans` varchar(45) DEFAULT NULL,
  `fecha_comprobante` date DEFAULT NULL,
  `id_maquina` int(11) DEFAULT NULL,
  `codigo_tercero` int(11) DEFAULT NULL,
  `id_registro` int(11) DEFAULT NULL,
  `iva_nodeducible` char(2) NOT NULL DEFAULT 'No'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `auxiliar` */

DROP TABLE IF EXISTS `auxiliar`;

CREATE TABLE `auxiliar` (
  `cod_contable` varchar(20) CHARACTER SET utf8 DEFAULT '0',
  `debe` double(20,2) DEFAULT '0.00',
  `haber` double(20,2) DEFAULT '0.00',
  `saldo` double(20,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_activos_fijos` */

DROP TABLE IF EXISTS `conta_activos_fijos`;

CREATE TABLE `conta_activos_fijos` (
  `cod_activo` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(300) CHARACTER SET utf8 DEFAULT NULL,
  `cod_tipo_activo` int(11) NOT NULL DEFAULT '0',
  `cod_departamento` int(11) NOT NULL DEFAULT '0',
  `depreciable` char(2) CHARACTER SET utf8 DEFAULT 'Si',
  `cantidad` double(17,2) NOT NULL,
  `fecha_incorporacion` date NOT NULL,
  `fecha_compras` date DEFAULT NULL,
  `vida_util_anos` int(11) NOT NULL DEFAULT '0',
  `valor_adquisicion` double(20,2) DEFAULT '0.00',
  `valor_real_activo` double(20,2) NOT NULL DEFAULT '0.00',
  `valor_rescate` double(20,2) DEFAULT '0.00',
  `valor_actual_activo` double(20,2) NOT NULL DEFAULT '0.00',
  `fecha_ultima_depreciacion` date DEFAULT NULL,
  `valor_mensual_depreciacion` double(20,2) NOT NULL DEFAULT '0.00',
  `mese_depreciados` int(11) DEFAULT '0',
  `valor_depreciacion_acumulada` double(17,2) DEFAULT '0.00',
  `depreciado` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `centro_costo` varchar(10) CHARACTER SET utf8 DEFAULT NULL,
  `cod_clasificacion` int(11) DEFAULT NULL,
  `id_activo` int(11) DEFAULT NULL,
  `tasa_compra` double(20,2) DEFAULT NULL,
  `identificador` varchar(20) DEFAULT NULL,
  `fecha_desincorporacion` date DEFAULT NULL,
  `desincorporado` char(2) NOT NULL DEFAULT 'No',
  `obs_desincorporacion` mediumtext,
  `marca` varchar(50) DEFAULT NULL,
  `modelo` varchar(50) DEFAULT NULL,
  `serial` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`cod_activo`),
  KEY `descripcion` (`descripcion`),
  KEY `cod_tipo_activo` (`cod_tipo_activo`),
  KEY `cod_departamento` (`cod_departamento`),
  KEY `depreciable` (`depreciable`),
  KEY `depreciado` (`depreciado`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_activos_historico_reubicacion` */

DROP TABLE IF EXISTS `conta_activos_historico_reubicacion`;

CREATE TABLE `conta_activos_historico_reubicacion` (
  `cod_activo` int(10) unsigned NOT NULL,
  `cod_departamento_anterior` int(10) unsigned DEFAULT NULL,
  `cod_departamento_nuevo` int(10) unsigned DEFAULT NULL,
  `fecha_cambio` date DEFAULT NULL,
  `usuario` varchar(45) DEFAULT NULL,
  `observacion` varchar(100) DEFAULT NULL,
  `nombre_dpto_anterior` varchar(45) DEFAULT NULL,
  `nombre_dpto_nuevo` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `conta_activos_historico_reubicacion_ccostos` */

DROP TABLE IF EXISTS `conta_activos_historico_reubicacion_ccostos`;

CREATE TABLE `conta_activos_historico_reubicacion_ccostos` (
  `cod_activo` int(10) unsigned NOT NULL,
  `cod_centro_anterior` int(10) unsigned DEFAULT NULL,
  `cod_centro_nuevo` int(10) unsigned DEFAULT NULL,
  `fecha_cambio` date DEFAULT NULL,
  `usuario` varchar(45) DEFAULT NULL,
  `observacion` varchar(45) DEFAULT NULL,
  `nombre_centro_anterior` varchar(45) DEFAULT NULL,
  `nombre_centro_nuevo` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `conta_asientos_borrados2020` */

DROP TABLE IF EXISTS `conta_asientos_borrados2020`;

CREATE TABLE `conta_asientos_borrados2020` (
  `numero_comprobante` int(10) unsigned NOT NULL DEFAULT '0',
  `cod_contable` varchar(20) DEFAULT '0',
  `detalles` mediumtext,
  `tipo_operacion` varchar(10) DEFAULT '',
  `numero_documento` varchar(20) DEFAULT NULL,
  `numero_control` varchar(20) DEFAULT '',
  `fecha_documento` date DEFAULT NULL,
  `debe` double(20,2) DEFAULT '0.00',
  `haber` double(20,2) DEFAULT '0.00',
  `tipo_libro` char(7) DEFAULT 'Normal',
  `cod_proveedor` int(11) DEFAULT '0',
  `nombre_proveedor` varchar(100) DEFAULT ' ',
  `rif` varchar(20) DEFAULT '',
  `nit` varchar(20) DEFAULT '',
  `monto_gravado` double(20,2) DEFAULT '0.00',
  `monto_exento` double(20,2) DEFAULT '0.00',
  `ivap` double(8,2) DEFAULT '0.00',
  `monto_iva` double(20,2) DEFAULT '0.00',
  `monto_retencion_iva` double(20,2) DEFAULT '0.00',
  `rete_ivap` double(8,2) DEFAULT '0.00',
  `num_comprobante_retencion` varchar(20) NOT NULL DEFAULT '0',
  `genera_activo` char(2) DEFAULT 'No',
  `cod_centro_costo` int(10) DEFAULT '0',
  `tasa_aplicada` double(10,2) DEFAULT NULL,
  `cod_detalle` int(10) unsigned DEFAULT '0',
  `id` int(11) NOT NULL DEFAULT '0',
  `descripcion_codigo` varchar(100) DEFAULT NULL,
  `fecha_emision` date DEFAULT '0000-00-00',
  `genera_comp` varchar(2) DEFAULT 'No',
  `beneficiario` varchar(100) DEFAULT NULL,
  `contra_trans` varchar(45) DEFAULT NULL,
  `fecha_comprobante` date DEFAULT NULL,
  `id_maquina` int(11) DEFAULT NULL,
  `codigo_tercero` int(11) DEFAULT NULL,
  `id_registro` int(11) DEFAULT NULL,
  `iva_nodeducible` char(2) NOT NULL DEFAULT 'No'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_asientos_cabezera` */

DROP TABLE IF EXISTS `conta_asientos_cabezera`;

CREATE TABLE `conta_asientos_cabezera` (
  `numero_comprobante` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `fecha_operacion` date NOT NULL DEFAULT '0000-00-00',
  `concepto` varchar(300) CHARACTER SET utf8 DEFAULT NULL,
  `anulado` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `pendiente` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `debe` double(20,2) DEFAULT '0.00',
  `haber` double(20,2) DEFAULT '0.00',
  `saldo` double(20,2) DEFAULT '0.00',
  `usuario` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `revisado` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `plantilla` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  PRIMARY KEY (`numero_comprobante`),
  KEY `concepto` (`concepto`),
  KEY `anulado` (`anulado`),
  KEY `pendiente` (`pendiente`),
  KEY `fecha_operacion` (`fecha_operacion`)
) ENGINE=InnoDB AUTO_INCREMENT=423283 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_asientos_detalles` */

DROP TABLE IF EXISTS `conta_asientos_detalles`;

CREATE TABLE `conta_asientos_detalles` (
  `numero_comprobante` int(10) unsigned NOT NULL DEFAULT '0',
  `cod_contable` varchar(20) DEFAULT '0',
  `detalles` mediumtext,
  `tipo_operacion` varchar(10) DEFAULT '',
  `numero_documento` varchar(20) DEFAULT NULL,
  `numero_control` varchar(20) DEFAULT '',
  `fecha_documento` date DEFAULT NULL,
  `debe` double(20,2) DEFAULT '0.00',
  `haber` double(20,2) DEFAULT '0.00',
  `tipo_libro` char(7) DEFAULT 'Normal',
  `cod_proveedor` int(11) DEFAULT '0',
  `nombre_proveedor` varchar(100) DEFAULT ' ',
  `rif` varchar(20) DEFAULT '',
  `nit` varchar(20) DEFAULT '',
  `monto_gravado` double(20,2) DEFAULT '0.00',
  `monto_exento` double(20,2) DEFAULT '0.00',
  `ivap` double(8,2) DEFAULT '0.00',
  `monto_iva` double(20,2) DEFAULT '0.00',
  `monto_retencion_iva` double(20,2) DEFAULT '0.00',
  `rete_ivap` double(8,2) DEFAULT '0.00',
  `num_comprobante_retencion` varchar(20) DEFAULT '0',
  `genera_activo` char(2) DEFAULT 'No',
  `cod_centro_costo` int(11) DEFAULT '0',
  `tasa_aplicada` double(10,2) DEFAULT NULL,
  `cod_detalle` int(10) unsigned DEFAULT '0',
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion_codigo` varchar(100) DEFAULT NULL,
  `fecha_emision` date DEFAULT '0000-00-00',
  `genera_comp` varchar(2) DEFAULT 'No',
  `beneficiario` varchar(100) DEFAULT NULL,
  `contra_trans` varchar(45) DEFAULT NULL,
  `fecha_comprobante` date DEFAULT NULL,
  `id_maquina` int(11) DEFAULT NULL,
  `codigo_tercero` int(11) DEFAULT NULL,
  `id_registro` int(11) DEFAULT NULL,
  `id_tercero` int(11) DEFAULT NULL,
  `maneja_terceros` varchar(2) DEFAULT 'No',
  `iva_nodeducible` varchar(2) DEFAULT 'No',
  PRIMARY KEY (`id`),
  KEY `cod_contable` (`cod_contable`),
  KEY `numero_documento` (`numero_documento`),
  KEY `tipo_libro` (`tipo_libro`),
  KEY `cod_detalle` (`cod_detalle`),
  KEY `proveedor` (`cod_proveedor`,`nombre_proveedor`,`numero_documento`,`numero_control`),
  KEY `cod_contable_fecha` (`cod_contable`),
  KEY `cod_centro_costo` (`cod_centro_costo`),
  KEY `numero_comprobante` (`numero_comprobante`),
  KEY `fecha` (`fecha_documento`)
) ENGINE=InnoDB AUTO_INCREMENT=3473981 DEFAULT CHARSET=utf8;

/*Table structure for table `conta_aux_balance` */

DROP TABLE IF EXISTS `conta_aux_balance`;

CREATE TABLE `conta_aux_balance` (
  `cod_contable` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `debe` double(20,2) DEFAULT '0.00',
  `haber` double(20,2) DEFAULT '0.00',
  `saldo` double(20,2) DEFAULT '0.00',
  `id` int(10) unsigned NOT NULL DEFAULT '0',
  `saldo_i` double(20,2) DEFAULT NULL,
  `usuario` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`,`usuario`),
  KEY `usuario` (`usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_aux_beneficiario` */

DROP TABLE IF EXISTS `conta_aux_beneficiario`;

CREATE TABLE `conta_aux_beneficiario` (
  `numero_documento` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `nombre_proveedor` varchar(80) CHARACTER SET utf8 DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_bloque_meses` */

DROP TABLE IF EXISTS `conta_bloque_meses`;

CREATE TABLE `conta_bloque_meses` (
  `numero` int(11) NOT NULL AUTO_INCREMENT,
  `mes` char(2) CHARACTER SET utf8 DEFAULT '',
  `bloqueado` char(2) CHARACTER SET utf8 DEFAULT 'No',
  PRIMARY KEY (`numero`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_centro_costos` */

DROP TABLE IF EXISTS `conta_centro_costos`;

CREATE TABLE `conta_centro_costos` (
  `cod_centro_costo` int(10) unsigned NOT NULL DEFAULT '0',
  `descripcion` varchar(300) CHARACTER SET utf8 DEFAULT NULL,
  `grupo` int(10) unsigned DEFAULT '0',
  `codigo` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`cod_centro_costo`),
  KEY `descripcion` (`descripcion`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_configura_balance_general` */

DROP TABLE IF EXISTS `conta_configura_balance_general`;

CREATE TABLE `conta_configura_balance_general` (
  `numero` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `activo1` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `activo2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `activo3` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `pasivo1` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `pasivo2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `pasivo3` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `capital1` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `capital2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `capital3` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `orden1` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `orden2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `orden3` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`numero`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_configuracion` */

DROP TABLE IF EXISTS `conta_configuracion`;

CREATE TABLE `conta_configuracion` (
  `iva_compra` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `iva_venta` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `iva` double(17,2) DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `enlace` varchar(2) CHARACTER SET utf8 DEFAULT 'Si',
  `cod_retencion` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `contribuyente` varchar(2) CHARACTER SET utf8 DEFAULT 'Si',
  `porc_retenc` double(17,2) DEFAULT '0.00',
  `mod_fecha` varchar(2) CHARACTER SET utf8 DEFAULT NULL,
  `db_adm` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `cuenta_retencion_ince` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `por_retencion_ince` double(17,2) DEFAULT NULL,
  `cod_contable_ventas` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `cod_contable_ingreso` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `maquina_fiscal` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `cuenta_gp` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `monto_activo` double(20,2) DEFAULT NULL,
  `cod_clasificacion` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_configuracion_activos_asientos` */

DROP TABLE IF EXISTS `conta_configuracion_activos_asientos`;

CREATE TABLE `conta_configuracion_activos_asientos` (
  `codigo` int(10) unsigned NOT NULL,
  `concepto_activo` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `detalle_asiento` varchar(300) CHARACTER SET utf8 DEFAULT NULL,
  `ultima_fecha_depreciacion` date DEFAULT NULL,
  `general` char(2) CHARACTER SET utf8 DEFAULT 'Si',
  `cod_tipo_activo` int(11) DEFAULT NULL,
  PRIMARY KEY (`codigo`),
  KEY `concepto_activo` (`concepto_activo`),
  KEY `detalle_asiento` (`detalle_asiento`),
  KEY `cod_tipo_activo` (`cod_tipo_activo`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_configuracion_ganancia_perdida` */

DROP TABLE IF EXISTS `conta_configuracion_ganancia_perdida`;

CREATE TABLE `conta_configuracion_ganancia_perdida` (
  `numero` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ingreso1` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `ingreso2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `ingreso3` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `costos1` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `costo2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `costo3` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `gastos1` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `gastos2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `gastos3` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `orden1` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `orden2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `orden3` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`numero`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_departamentos_activo` */

DROP TABLE IF EXISTS `conta_departamentos_activo`;

CREATE TABLE `conta_departamentos_activo` (
  `cod_departamento` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`cod_departamento`),
  KEY `descripcion` (`descripcion`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_detalle_informe` */

DROP TABLE IF EXISTS `conta_detalle_informe`;

CREATE TABLE `conta_detalle_informe` (
  `cod_detalle_informe` int(11) NOT NULL AUTO_INCREMENT,
  `cod_informe` int(11) NOT NULL DEFAULT '0',
  `abierto` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `descripcion` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `porcentaje` double(17,2) DEFAULT NULL,
  PRIMARY KEY (`cod_detalle_informe`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_detalles_comprobantes` */

DROP TABLE IF EXISTS `conta_detalles_comprobantes`;

CREATE TABLE `conta_detalles_comprobantes` (
  `cod_detalle` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(300) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`cod_detalle`),
  KEY `descripcion` (`descripcion`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_empresas` */

DROP TABLE IF EXISTS `conta_empresas`;

CREATE TABLE `conta_empresas` (
  `nombre` varchar(50) CHARACTER SET utf8 DEFAULT NULL,
  `db` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_imprimir_informe` */

DROP TABLE IF EXISTS `conta_imprimir_informe`;

CREATE TABLE `conta_imprimir_informe` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nivel1` varchar(20) CHARACTER SET utf8 DEFAULT '',
  `nivel2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `nivel3` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `monto1` double(20,2) DEFAULT NULL,
  `monto2` double(20,2) DEFAULT NULL,
  `monto3` double(20,2) DEFAULT NULL,
  `monto4` double(20,2) DEFAULT NULL,
  `monto5` double(20,2) DEFAULT NULL,
  `monto6` double(20,2) DEFAULT NULL,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `descripcion2` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `descripcion3` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `porc1` double(17,2) DEFAULT NULL,
  `porc2` double(17,2) DEFAULT NULL,
  `porc3` double(17,2) DEFAULT NULL,
  `porc4` double(17,2) DEFAULT NULL,
  `porc5` double(17,2) DEFAULT NULL,
  `porc6` double(17,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nivel1` (`nivel1`,`nivel2`,`nivel3`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_maquina_fiscal` */

DROP TABLE IF EXISTS `conta_maquina_fiscal`;

CREATE TABLE `conta_maquina_fiscal` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `proveedor` varchar(100) CHARACTER SET utf8 DEFAULT '',
  `codigo` varchar(45) CHARACTER SET utf8 DEFAULT '',
  `marca` varchar(45) CHARACTER SET utf8 DEFAULT '',
  `modelo` varchar(45) CHARACTER SET utf8 DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_partida_c_costo` */

DROP TABLE IF EXISTS `conta_partida_c_costo`;

CREATE TABLE `conta_partida_c_costo` (
  `cod_partida` int(11) NOT NULL DEFAULT '0',
  `cod_contable` varchar(20) CHARACTER SET utf8 NOT NULL DEFAULT '0',
  `cod_centro_costo` int(11) NOT NULL DEFAULT '0',
  `descripcion_centro` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `monto_asignado` double(20,2) DEFAULT NULL,
  PRIMARY KEY (`cod_partida`,`cod_contable`,`cod_centro_costo`),
  KEY `cod_partida` (`cod_partida`),
  KEY `descripcion_centro` (`descripcion_centro`),
  KEY `cod_centro_costo` (`cod_contable`),
  KEY `cod_contable` (`cod_contable`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_partida_cc` */

DROP TABLE IF EXISTS `conta_partida_cc`;

CREATE TABLE `conta_partida_cc` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(45) CHARACTER SET utf8 DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_partida_cc_det` */

DROP TABLE IF EXISTS `conta_partida_cc_det`;

CREATE TABLE `conta_partida_cc_det` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(45) CHARACTER SET utf8 DEFAULT '',
  `monto` double(17,2) DEFAULT '0.00',
  `numero` int(10) unsigned NOT NULL DEFAULT '0',
  `grupo` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `numero` (`numero`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_partida_cc_det_cc` */

DROP TABLE IF EXISTS `conta_partida_cc_det_cc`;

CREATE TABLE `conta_partida_cc_det_cc` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(45) CHARACTER SET utf8 DEFAULT '',
  `numero` int(10) unsigned NOT NULL DEFAULT '0',
  `cod_centro_costo` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `numero` (`numero`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_partida_cuentas` */

DROP TABLE IF EXISTS `conta_partida_cuentas`;

CREATE TABLE `conta_partida_cuentas` (
  `cod_partida` int(11) NOT NULL,
  `cod_contable` varchar(20) CHARACTER SET utf8 NOT NULL,
  `monto_asignado` double(20,2) DEFAULT '0.00',
  `descripcion_cuenta` varchar(50) CHARACTER SET utf8 DEFAULT NULL,
  `monto_distribuido` double(20,2) DEFAULT NULL,
  `saldo_disponible` double(20,2) DEFAULT NULL,
  PRIMARY KEY (`cod_partida`,`cod_contable`),
  KEY `cod_partida` (`cod_partida`),
  KEY `cod_contable` (`cod_contable`),
  KEY `descripcion_cuenta` (`descripcion_cuenta`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_partidas` */

DROP TABLE IF EXISTS `conta_partidas`;

CREATE TABLE `conta_partidas` (
  `cod_partida` int(11) NOT NULL,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `fecha_registro` date NOT NULL,
  `monto_asignado` double(20,2) DEFAULT '0.00',
  `monto_distribuido` double(20,2) DEFAULT '0.00',
  `saldo_disponible` double(20,2) DEFAULT '0.00',
  PRIMARY KEY (`cod_partida`),
  KEY `descripcion` (`descripcion`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_plan_de_cuentas` */

DROP TABLE IF EXISTS `conta_plan_de_cuentas`;

CREATE TABLE `conta_plan_de_cuentas` (
  `cod_contable` varchar(20) CHARACTER SET utf8 NOT NULL DEFAULT '0',
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT '',
  `debe` double(20,2) unsigned zerofill DEFAULT '00000000000000000.00',
  `haber` double(20,2) DEFAULT '0.00',
  `fecha_registro` date DEFAULT NULL,
  `grupo` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `cuenta_ince` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `maneja_activo` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `tipo_cuenta` varchar(20) CHARACTER SET utf8 DEFAULT 'No Monetaria',
  `maneja_centro_costo` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `Centro_costo_fijo` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `Maneja_presupuesto` char(2) CHARACTER SET utf8 DEFAULT 'No',
  `cod_centro_costo` varchar(10) CHARACTER SET utf8 DEFAULT '0',
  `nivel` char(1) CHARACTER SET utf8 DEFAULT '0',
  `saldo` double(20,2) DEFAULT '0.00',
  `cod_grupo` int(10) unsigned DEFAULT '0',
  `cuenta_abierta` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `codigo` int(11) DEFAULT NULL,
  `id_tercero` int(11) DEFAULT '0',
  `fuera_gyp` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `maneja_plantilla` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `cod_plantilla` int(11) DEFAULT NULL,
  `tipo_codigo` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `cod_tipo_cuenta` int(11) DEFAULT NULL,
  `maneja_terceros` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `antes1` varchar(20) DEFAULT NULL,
  `antes2` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`cod_contable`),
  KEY `descripcion` (`descripcion`),
  KEY `cuenta_ince` (`cuenta_ince`),
  KEY `grupo` (`grupo`),
  KEY `nivel` (`nivel`),
  KEY `cod_centro_costo` (`cod_centro_costo`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_resultado_consulta` */

DROP TABLE IF EXISTS `conta_resultado_consulta`;

CREATE TABLE `conta_resultado_consulta` (
  `id_renglon` int(10) unsigned NOT NULL,
  `tempo` int(10) unsigned NOT NULL,
  `resultado` double(17,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_saldos_iniciales_terceros` */

DROP TABLE IF EXISTS `conta_saldos_iniciales_terceros`;

CREATE TABLE `conta_saldos_iniciales_terceros` (
  `cod_contable` varchar(20) NOT NULL,
  `cod_tercero` int(10) unsigned NOT NULL,
  `saldo_inicial` decimal(17,2) NOT NULL,
  `id_tercero` int(10) unsigned NOT NULL,
  PRIMARY KEY (`cod_contable`,`cod_tercero`,`id_tercero`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `conta_tabla` */

DROP TABLE IF EXISTS `conta_tabla`;

CREATE TABLE `conta_tabla` (
  `valor1` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `valor2` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `valor3` varchar(20) DEFAULT NULL,
  `valor4` varchar(20) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_clasificacion` */

DROP TABLE IF EXISTS `conta_tabla_clasificacion`;

CREATE TABLE `conta_tabla_clasificacion` (
  `cod_clasificacion` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(50) DEFAULT NULL,
  `depreciable` char(2) DEFAULT 'No',
  UNIQUE KEY `cod_clasificacion` (`cod_clasificacion`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_clientes` */

DROP TABLE IF EXISTS `conta_tabla_clientes`;

CREATE TABLE `conta_tabla_clientes` (
  `cod_cliente` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8 DEFAULT '',
  `rif_cedula` varchar(12) CHARACTER SET utf8 DEFAULT '',
  PRIMARY KEY (`cod_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_conciliador` */

DROP TABLE IF EXISTS `conta_tabla_conciliador`;

CREATE TABLE `conta_tabla_conciliador` (
  `cod_informe` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(150) CHARACTER SET utf8 DEFAULT NULL,
  `vista_admin` mediumtext CHARACTER SET utf8,
  `vista_conta` mediumtext CHARACTER SET utf8,
  `consulta_admin` mediumtext CHARACTER SET utf8,
  `consulta_conta` mediumtext CHARACTER SET utf8,
  PRIMARY KEY (`cod_informe`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_detalle_conciliador` */

DROP TABLE IF EXISTS `conta_tabla_detalle_conciliador`;

CREATE TABLE `conta_tabla_detalle_conciliador` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cod_informe` int(11) DEFAULT NULL,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `cod_contable` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `debe` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `haber` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `cosulta` mediumtext CHARACTER SET utf8,
  `tipo` varchar(10) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `primario` (`cod_contable`,`cod_informe`),
  KEY `Index_3` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_detalle_procesos` */

DROP TABLE IF EXISTS `conta_tabla_detalle_procesos`;

CREATE TABLE `conta_tabla_detalle_procesos` (
  `cod_proceso` int(10) unsigned NOT NULL,
  `cod_detalle` int(10) unsigned NOT NULL,
  `descripcion` varchar(30) CHARACTER SET utf8 DEFAULT NULL,
  `desactivado` char(2) CHARACTER SET utf8 DEFAULT 'No',
  PRIMARY KEY (`cod_proceso`,`cod_detalle`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_grupo_cc` */

DROP TABLE IF EXISTS `conta_tabla_grupo_cc`;

CREATE TABLE `conta_tabla_grupo_cc` (
  `cod_grupo` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(150) DEFAULT NULL,
  `codigo` varchar(20) DEFAULT NULL,
  UNIQUE KEY `cod_grupo` (`cod_grupo`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_perfil_usuario` */

DROP TABLE IF EXISTS `conta_tabla_perfil_usuario`;

CREATE TABLE `conta_tabla_perfil_usuario` (
  `cod_perfil` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(30) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`cod_perfil`),
  KEY `descripcion` (`descripcion`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_plantillas` */

DROP TABLE IF EXISTS `conta_tabla_plantillas`;

CREATE TABLE `conta_tabla_plantillas` (
  `cod_plantilla` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`cod_plantilla`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_plantillas_det` */

DROP TABLE IF EXISTS `conta_tabla_plantillas_det`;

CREATE TABLE `conta_tabla_plantillas_det` (
  `cod_plantilla` int(11) NOT NULL DEFAULT '0',
  `cod_centro_costo` int(11) NOT NULL DEFAULT '0',
  `factor` double(12,4) NOT NULL DEFAULT '0.0000',
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cod_pla_cc` (`cod_plantilla`,`cod_centro_costo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_procesos` */

DROP TABLE IF EXISTS `conta_tabla_procesos`;

CREATE TABLE `conta_tabla_procesos` (
  `cod_proceso` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(30) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`cod_proceso`),
  KEY `descripcion` (`descripcion`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_procesos_perfil_usuarios` */

DROP TABLE IF EXISTS `conta_tabla_procesos_perfil_usuarios`;

CREATE TABLE `conta_tabla_procesos_perfil_usuarios` (
  `cod_proceso` int(10) unsigned NOT NULL,
  `cod_perfil` int(11) NOT NULL DEFAULT '0',
  `cod_detalle` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`cod_proceso`,`cod_perfil`,`cod_detalle`),
  KEY `cod_perfil` (`cod_perfil`),
  KEY `cod_detalle` (`cod_detalle`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_procesos_usuarios` */

DROP TABLE IF EXISTS `conta_tabla_procesos_usuarios`;

CREATE TABLE `conta_tabla_procesos_usuarios` (
  `cod_proceso` int(10) unsigned NOT NULL,
  `cod_usuario` int(10) unsigned NOT NULL,
  `cod_detalle` int(10) unsigned NOT NULL,
  PRIMARY KEY (`cod_proceso`,`cod_usuario`,`cod_detalle`),
  KEY `cod_usuario` (`cod_usuario`),
  KEY `cod_detalle` (`cod_detalle`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_proveedor` */

DROP TABLE IF EXISTS `conta_tabla_proveedor`;

CREATE TABLE `conta_tabla_proveedor` (
  `cod_proveedor` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT '',
  `rif_cedula` varchar(12) CHARACTER SET utf8 DEFAULT '',
  PRIMARY KEY (`cod_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_terceros` */

DROP TABLE IF EXISTS `conta_tabla_terceros`;

CREATE TABLE `conta_tabla_terceros` (
  `id_tercero` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) NOT NULL DEFAULT '',
  `nombre_tabla` varchar(100) NOT NULL DEFAULT '',
  `consulta` varchar(200) NOT NULL,
  `consulta2` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id_tercero`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;

/*Table structure for table `conta_tabla_usuarios` */

DROP TABLE IF EXISTS `conta_tabla_usuarios`;

CREATE TABLE `conta_tabla_usuarios` (
  `cod_usuario` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) CHARACTER SET utf8 DEFAULT NULL,
  `direccion` mediumtext CHARACTER SET utf8,
  `telefonos` varchar(30) CHARACTER SET utf8 DEFAULT NULL,
  `login` varchar(30) CHARACTER SET utf8 DEFAULT NULL,
  `pass` varchar(30) CHARACTER SET utf8 DEFAULT NULL,
  `foto` longblob,
  `email` varchar(50) CHARACTER SET utf8 DEFAULT NULL,
  `nivel` int(11) NOT NULL DEFAULT '0',
  `cod_perfil` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`cod_usuario`),
  KEY `nombre` (`nombre`),
  KEY `login` (`login`),
  KEY `pass` (`pass`),
  KEY `conta_tabla_usuarios_1` (`cod_perfil`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tabla_vendedores` */

DROP TABLE IF EXISTS `conta_tabla_vendedores`;

CREATE TABLE `conta_tabla_vendedores` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `responsable` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `cod_centro_costo` varchar(10) CHARACTER SET utf8 DEFAULT NULL,
  `porc_utilidad` double(10,2) DEFAULT '0.00',
  `vendedor` varchar(3) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tasas` */

DROP TABLE IF EXISTS `conta_tasas`;

CREATE TABLE `conta_tasas` (
  `cod_tasa` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripion` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `tasa` double(10,2) NOT NULL,
  `simbolo` varchar(10) CHARACTER SET utf8 DEFAULT NULL,
  `fecha_registro` date DEFAULT NULL,
  PRIMARY KEY (`cod_tasa`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tempo` */

DROP TABLE IF EXISTS `conta_tempo`;

CREATE TABLE `conta_tempo` (
  `cod_contable` varchar(20) CHARACTER SET utf8 NOT NULL DEFAULT '0',
  `debe` double(20,2) DEFAULT '0.00',
  `haber` double(20,2) DEFAULT '0.00',
  `saldo` double(20,2) DEFAULT NULL,
  PRIMARY KEY (`cod_contable`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tempo_librov` */

DROP TABLE IF EXISTS `conta_tempo_librov`;

CREATE TABLE `conta_tempo_librov` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `cod_cliente` varchar(10) CHARACTER SET utf8 DEFAULT NULL,
  `nombre` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `rif_cliente` varchar(12) CHARACTER SET utf8 DEFAULT NULL,
  `numero_documento` int(11) DEFAULT NULL,
  `fecha_ope` date DEFAULT NULL,
  `fecha_emision` date DEFAULT NULL,
  `numero_comprobante_ret` int(11) DEFAULT NULL,
  `monto_retencion_iva` double(12,2) DEFAULT NULL,
  `ivap` double(8,2) DEFAULT NULL,
  `monto` double(12,2) DEFAULT NULL,
  `iva` double(12,2) DEFAULT NULL,
  `monto_gravado` double(12,2) DEFAULT NULL,
  `monto_exento` double(12,2) DEFAULT NULL,
  `tipo` varchar(3) CHARACTER SET utf8 DEFAULT NULL,
  `numero_control` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=696 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tipo_cuenta` */

DROP TABLE IF EXISTS `conta_tipo_cuenta`;

CREATE TABLE `conta_tipo_cuenta` (
  `id_cuenta` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT '',
  `orden` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_cuenta`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tipo_cuenta_asociadas` */

DROP TABLE IF EXISTS `conta_tipo_cuenta_asociadas`;

CREATE TABLE `conta_tipo_cuenta_asociadas` (
  `id_cuenta` int(11) NOT NULL DEFAULT '0',
  `cod_unico` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_cuenta`,`cod_unico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `conta_tipo_informe` */

DROP TABLE IF EXISTS `conta_tipo_informe`;

CREATE TABLE `conta_tipo_informe` (
  `cod_informe` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`cod_informe`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tipos_activos` */

DROP TABLE IF EXISTS `conta_tipos_activos`;

CREATE TABLE `conta_tipos_activos` (
  `cod_tipo_activo` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `cod_contable_real` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `cod_contable_gastos` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `cod_contable_depreciacion` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `depreciable` char(2) CHARACTER SET utf8 DEFAULT 'Si',
  `vida_util_ano` int(11) DEFAULT NULL,
  `cod_contable_desincorporacion` varchar(20) DEFAULT '',
  PRIMARY KEY (`cod_tipo_activo`),
  KEY `descripcion` (`descripcion`),
  KEY `cod_contable_real` (`cod_contable_real`),
  KEY `cod_contable_gastos` (`cod_contable_gastos`),
  KEY `cod_contable_depreciacion` (`cod_contable_depreciacion`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;

/*Table structure for table `conta_tipos_operacion` */

DROP TABLE IF EXISTS `conta_tipos_operacion`;

CREATE TABLE `conta_tipos_operacion` (
  `cod_tipo` varchar(10) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `codigo` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`cod_tipo`),
  KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `conta_vend_responsables` */

DROP TABLE IF EXISTS `conta_vend_responsables`;

CREATE TABLE `conta_vend_responsables` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `porc_utilidad` double(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `plan2` */

DROP TABLE IF EXISTS `plan2`;

CREATE TABLE `plan2` (
  `codigo` varchar(200) DEFAULT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `Nivel` varchar(200) DEFAULT NULL,
  `grupo` varchar(200) DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1913 DEFAULT CHARSET=latin1;

/*Table structure for table `saldos_pasar` */

DROP TABLE IF EXISTS `saldos_pasar`;

CREATE TABLE `saldos_pasar` (
  `cod_contable` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `descripcion_codigo` varchar(100) CHARACTER SET utf8 DEFAULT '',
  `saldo` double(19,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*Table structure for table `saldos_pasar2011` */

DROP TABLE IF EXISTS `saldos_pasar2011`;

CREATE TABLE `saldos_pasar2011` (
  `cod_contable` varchar(20) DEFAULT NULL,
  `descripcion_codigo` varchar(100) DEFAULT '',
  `saldo` double(19,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `saldos_pasar20111` */

DROP TABLE IF EXISTS `saldos_pasar20111`;

CREATE TABLE `saldos_pasar20111` (
  `cod_contable` varchar(20) DEFAULT NULL,
  `descripcion_codigo` varchar(100) DEFAULT '',
  `saldo` double(19,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `tabla_visor_proceso` */

DROP TABLE IF EXISTS `tabla_visor_proceso`;

CREATE TABLE `tabla_visor_proceso` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `computador` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `ip` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `descripcion` mediumtext CHARACTER SET utf8,
  `fecha` datetime DEFAULT NULL,
  `nombre` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `cod_usuario` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cod_usuario` (`cod_usuario`,`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=58941 DEFAULT CHARSET=latin1;

/*Table structure for table `tipo_informe_movimientos` */

DROP TABLE IF EXISTS `tipo_informe_movimientos`;

CREATE TABLE `tipo_informe_movimientos` (
  `cod_detalle_movimientos` int(11) NOT NULL AUTO_INCREMENT,
  `cod_detalle_informe` int(11) DEFAULT NULL,
  `descripcion` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `cod_contable` varchar(20) CHARACTER SET utf8 DEFAULT NULL,
  `saldo_inicial` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `saldo_final` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `debe` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `haber` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  `centro_costo` varchar(2) CHARACTER SET utf8 DEFAULT 'No',
  PRIMARY KEY (`cod_detalle_movimientos`),
  UNIQUE KEY `primario` (`cod_contable`,`cod_detalle_informe`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
