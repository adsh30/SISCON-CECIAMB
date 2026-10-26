import * as service from './cxc.service.js'

// Clientes
export async function listarClientes(req, res, next) {
  try {
    const data = await service.listarClientes(req.query)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function detalleCliente(req, res, next) {
  try {
    const data = await service.clientePorId(Number(req.params.id))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function crearCliente(req, res, next) {
  try {
    const data = await service.crearCliente(req.body, req.user, { ip: req.ip })
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export async function actualizarCliente(req, res, next) {
  try {
    const data = await service.actualizarCliente(Number(req.params.id), req.body, req.user, {
      ip: req.ip,
    })
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

// Facturas
export async function listarFacturas(req, res, next) {
  try {
    const data = await service.listarFacturas(req.query)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function detalleFactura(req, res, next) {
  try {
    const data = await service.facturaPorId(Number(req.params.id))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function crearFactura(req, res, next) {
  try {
    const data = await service.crearFactura(req.body, req.user, { ip: req.ip })
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

// Cobros
export async function listarCobros(req, res, next) {
  try {
    const data = await service.listarCobros(req.query)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function detalleCobro(req, res, next) {
  try {
    const data = await service.cobroPorId(Number(req.params.id))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function crearCobro(req, res, next) {
  try {
    const data = await service.crearCobro(req.body, req.user, { ip: req.ip })
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

// KPIs y Antigüedad de Cartera
export async function kpisCartera(req, res, next) {
  try {
    const data = await service.obtenerKpis()
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function reporteAntiguedad(req, res, next) {
  try {
    const data = await service.obtenerAntiguedad()
    res.json({ data })
  } catch (err) {
    next(err)
  }
}
