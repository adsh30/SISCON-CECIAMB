import * as service from './conciliaciones.service.js'

export async function listar(req, res, next) {
  try {
    const data = await service.listar(req.query)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function obtener(req, res, next) {
  try {
    const data = await service.obtener(Number(req.params.id))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function iniciar(req, res, next) {
  try {
    const id = await service.iniciarConciliacion(req.user, req.body)
    const data = await service.obtener(id)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export async function importarBanco(req, res, next) {
  try {
    const resultado = await service.importarMovimientosBanco(
      req.user,
      Number(req.params.id),
      req.body,
    )
    const data = await service.obtener(Number(req.params.id))
    res.json({ data, meta: resultado })
  } catch (err) {
    next(err)
  }
}

export async function emparejar(req, res, next) {
  try {
    await service.emparejarManualmente(req.user, Number(req.params.id), req.body)
    const data = await service.obtener(Number(req.params.id))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function desemparejar(req, res, next) {
  try {
    await service.desemparejar(req.user, Number(req.params.id), req.body)
    const data = await service.obtener(Number(req.params.id))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function finalizar(req, res, next) {
  try {
    await service.finalizar(req.user, Number(req.params.id), req.body)
    const data = await service.obtener(Number(req.params.id))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function anular(req, res, next) {
  try {
    await service.anular(req.user, Number(req.params.id), req.body)
    const data = await service.obtener(Number(req.params.id))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}
