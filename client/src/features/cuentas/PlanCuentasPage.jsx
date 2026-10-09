import { useMemo, useState } from 'react'
import { usePermisos } from '../../api/auth.js'
import {
  useActualizarCentroCosto,
  useCentrosCosto,
  useEliminarCentroCosto,
} from '../../api/centrosCosto.js'
import { useArbolCuentas, useCuentas, useEliminarCuenta } from '../../api/cuentas.js'
import { useAvisos } from '../../components/ui/Avisos.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ConfirmDialog } from '../../components/ui/Modal.jsx'
import { Icono } from '../../components/ui/Icono.jsx'
import { ModalCentroCosto } from './ModalCentroCosto.jsx'
import { ModalCuenta } from './ModalCuenta.jsx'

// Solo tokens del tema para que se lea bien en claro y oscuro
const COLORES_TIPO = {
  ACTIVO: 'border-marca/25 bg-marca-claro text-marca',
  PASIVO: 'border-aviso/25 bg-aviso-claro text-aviso',
  PATRIMONIO: 'border-acento/25 bg-acento-claro text-acento',
  INGRESO: 'border-exito/25 bg-exito-claro text-exito',
  COSTO: 'border-alerta/25 bg-alerta-claro text-alerta',
  GASTO: 'border-alerta/25 bg-alerta-claro text-alerta',
  ORDEN: 'border-linea bg-superficie-2 text-pizarra',
}

/** Siguiente código libre bajo un padre: 1.1.01, 1.1.02… respetando el ancho de los hermanos */
function siguienteCodigo(padre, cuentas) {
  const hermanos = cuentas
    .filter((c) => c.padreId === padre.id)
    .map((c) => c.codigo.slice(padre.codigo.length + 1))
    .filter((seg) => /^d+$/.test(seg))
  const ancho = hermanos.length ? Math.max(...hermanos.map((h) => h.length)) : 2
  const mayor = hermanos.length ? Math.max(...hermanos.map(Number)) : 0
  return `${padre.codigo}.${String(mayor + 1).padStart(ancho, '0')}`
}

function NodoCuenta({
  cuenta,
  expandidos,
  forzarAbierto,
  onToggle,
  onEditar,
  onNuevaSubcuenta,
  onEliminar,
  canEscritura,
  canEliminar,
}) {
  const tieneHijos = cuenta.hijos && cuenta.hijos.length > 0
  const abierto = forzarAbierto || expandidos.has(cuenta.id)

  const claseTipo = COLORES_TIPO[cuenta.tipo] || 'bg-superficie-2 text-pizarra'

  return (
    <div className="select-none">
      <div
        className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-superficie-2 ${
          !cuenta.activa ? 'opacity-55' : ''
        }`}
        style={{ paddingLeft: `${Math.max(0.75, (cuenta.nivel - 1) * 1.5 + 0.75)}rem` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {tieneHijos ? (
            <button
              type="button"
              onClick={() => onToggle(cuenta.id)}
              className="grid size-6 shrink-0 place-items-center rounded-md text-pizarra hover:bg-superficie hover:text-tinta"
              title={abierto ? 'Colapsar subcuentas' : 'Expandir subcuentas'}
            >
              <Icono
                nombre="chevron"
                className={`size-3.5 transition-transform ${abierto ? 'rotate-90' : ''}`}
              />
            </button>
          ) : (
            <span className="inline-block size-6 shrink-0 text-center text-pizarra/30">•</span>
          )}

          <span className="font-mono text-xs font-semibold tracking-tight text-marca">
            {cuenta.codigo}
          </span>

          <span
            className={`truncate font-medium ${cuenta.nivel <= 2 ? 'font-semibold text-tinta' : 'text-tinta'}`}
          >
            {cuenta.nombre}
          </span>

          <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
            {cuenta.esMovimiento ? (
              <span className="rounded-md border border-linea bg-superficie px-1.5 py-0.5 font-medium text-pizarra">
                Auxiliar
              </span>
            ) : (
              <span className="rounded-md bg-superficie-2 px-1.5 py-0.5 text-pizarra/75">
                Grupo
              </span>
            )}

            <span className={`rounded-md border px-1.5 py-0.5 font-medium uppercase ${claseTipo}`}>
              {cuenta.tipo}
            </span>

            <span
              className={`rounded-md px-1.5 py-0.5 font-medium uppercase ${
                cuenta.naturaleza === 'DEUDORA'
                  ? 'bg-marca-claro text-marca'
                  : 'bg-exito-claro text-exito'
              }`}
              title={
                cuenta.naturaleza === 'DEUDORA' ? 'Naturaleza deudora' : 'Naturaleza acreedora'
              }
            >
              {cuenta.naturaleza === 'DEUDORA' ? 'Deu' : 'Acr'}
            </span>

            {!cuenta.activa && (
              <span className="rounded-md bg-alerta-claro px-1.5 py-0.5 text-alerta">Inactiva</span>
            )}
          </div>
        </div>

        {canEscritura && (
          <div className="flex shrink-0 items-center gap-1 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-fine:opacity-0">
            {!cuenta.esMovimiento && (
              <button
                type="button"
                onClick={() => onNuevaSubcuenta(cuenta)}
                className="rounded-lg p-1 text-pizarra hover:bg-superficie hover:text-marca"
                title="Crear subcuenta"
              >
                <Icono nombre="mas" className="size-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onEditar(cuenta)}
              className="rounded-lg p-1 text-pizarra hover:bg-superficie hover:text-tinta"
              title="Editar cuenta"
            >
              <Icono nombre="editar" className="size-4" />
            </button>

            {canEliminar && !tieneHijos && (
              <button
                type="button"
                onClick={() => onEliminar(cuenta)}
                className="rounded-lg p-1 text-pizarra hover:bg-alerta-claro hover:text-alerta"
                title="Eliminar cuenta"
              >
                <Icono nombre="papelera" className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {tieneHijos && abierto && (
        <div className="border-l border-linea/60 ml-3">
          {cuenta.hijos.map((hijo) => (
            <NodoCuenta
              key={hijo.id}
              cuenta={hijo}
              expandidos={expandidos}
              forzarAbierto={forzarAbierto}
              onToggle={onToggle}
              onEditar={onEditar}
              onNuevaSubcuenta={onNuevaSubcuenta}
              onEliminar={onEliminar}
              canEscritura={canEscritura}
              canEliminar={canEliminar}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PlanCuentasPage() {
  const avisar = useAvisos()
  const { can } = usePermisos()
  const canEscritura = can('plan_cuentas', 'escritura')
  const canEliminar = can('plan_cuentas', 'full')

  const [pestana, setPestana] = useState('cuentas') // 'cuentas' | 'centros'
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  // Modales Cuentas
  const [modalCuenta, setModalCuenta] = useState(null) // null | { cuenta, padre }
  const [cuentaAEliminar, setCuentaAEliminar] = useState(null)

  // Modales Centros de Costo
  const [modalCentroCosto, setModalCentroCosto] = useState(null) // null | centroCosto
  const [centroAEliminar, setCentroAEliminar] = useState(null)

  // Consultas
  const { data: arbol = [], isLoading: cargandoArbol } = useArbolCuentas()
  const { data: todasCuentas = [] } = useCuentas()
  const { data: centrosCosto = [], isLoading: cargandoCentros } = useCentrosCosto()

  const eliminarCuentaMut = useEliminarCuenta()
  const eliminarCentroMut = useEliminarCentroCosto()
  const actualizarCentroMut = useActualizarCentroCosto()

  // Nodos expandidos; null = aún no se ha tocado, se muestran abiertas las cuentas raíz
  const [expandidosManual, setExpandidos] = useState(null)
  const expandidos = useMemo(
    () => expandidosManual ?? new Set(arbol.map((raiz) => raiz.id)),
    [expandidosManual, arbol],
  )

  const alternarNodo = (id) => {
    setExpandidos(() => {
      const nuevo = new Set(expandidos)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  const expandirTodo = () => {
    const todos = new Set(todasCuentas.map((c) => c.id))
    setExpandidos(todos)
  }

  const colapsarTodo = () => {
    setExpandidos(new Set())
  }

  // Al buscar se abre todo el camino hasta cada coincidencia
  const filtrando = Boolean(busqueda.trim() || filtroTipo)

  // Filtrado reactivo en el árbol
  const arbolFiltrado = useMemo(() => {
    if (!busqueda.trim() && !filtroTipo) return arbol

    const b = busqueda.toLowerCase().trim()

    function filtrarNodo(nodo) {
      const coincideBusqueda =
        !b || nodo.codigo.toLowerCase().includes(b) || nodo.nombre.toLowerCase().includes(b)
      const coincideTipo = !filtroTipo || nodo.tipo === filtroTipo

      const hijosFiltrados = (nodo.hijos || []).map(filtrarNodo).filter(Boolean)

      if ((coincideBusqueda && coincideTipo) || hijosFiltrados.length > 0) {
        return { ...nodo, hijos: hijosFiltrados }
      }
      return null
    }

    return arbol.map(filtrarNodo).filter(Boolean)
  }, [arbol, busqueda, filtroTipo])

  // Confirmar eliminación de cuenta
  const confirmarEliminarCuenta = async () => {
    if (!cuentaAEliminar) return
    try {
      await eliminarCuentaMut.mutateAsync(cuentaAEliminar.id)
      avisar('Cuenta eliminada del catálogo', 'exito', cuentaAEliminar.codigo)
      setCuentaAEliminar(null)
    } catch (err) {
      avisar('No se pudo eliminar la cuenta', 'alerta', err.message)
    }
  }

  // Confirmar eliminación de centro de costo
  const confirmarEliminarCentro = async () => {
    if (!centroAEliminar) return
    try {
      await eliminarCentroMut.mutateAsync(centroAEliminar.id)
      avisar('Centro de costo eliminado', 'exito', centroAEliminar.codigo)
      setCentroAEliminar(null)
    } catch (err) {
      avisar('No se pudo eliminar el centro de costo', 'alerta', err.message)
    }
  }

  const alternarActivoCentro = async (cc) => {
    try {
      await actualizarCentroMut.mutateAsync({
        id: cc.id,
        datos: { activo: !cc.activo },
      })
      avisar(
        cc.activo ? 'Centro de costo desactivado' : 'Centro de costo activado',
        'exito',
        cc.nombre,
      )
    } catch (err) {
      avisar('Error al actualizar centro de costo', 'alerta', err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta">
            Plan de Cuentas y Maestros
          </h1>
          <p className="mt-1 text-sm text-pizarra">
            Catálogo contable jerárquico VEN-NIF y centros de costo operativos de CECIAMB
          </p>
        </div>

        {canEscritura && (
          <div className="flex items-center gap-2">
            {pestana === 'cuentas' ? (
              <Button
                variante="primario"
                onClick={() => setModalCuenta({ cuenta: null, padre: null })}
              >
                <Icono nombre="mas" className="size-4" />
                Nueva Cuenta
              </Button>
            ) : (
              <Button variante="primario" onClick={() => setModalCentroCosto({})}>
                <Icono nombre="mas" className="size-4" />
                Nuevo Centro de Costo
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-linea">
        <button
          type="button"
          onClick={() => setPestana('cuentas')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            pestana === 'cuentas'
              ? 'border-marca text-marca'
              : 'border-transparent text-pizarra hover:text-tinta'
          }`}
        >
          <Icono nombre="cuentas" className="size-4.5" />
          <span>Plan de Cuentas</span>
          <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-xs text-pizarra">
            {todasCuentas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPestana('centros')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            pestana === 'centros'
              ? 'border-marca text-marca'
              : 'border-transparent text-pizarra hover:text-tinta'
          }`}
        >
          <Icono nombre="edificio" className="size-4.5" />
          <span>Centros de Costo</span>
          <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-xs text-pizarra">
            {centrosCosto.length}
          </span>
        </button>
      </div>

      {/* Contenido de la pestaña: Plan de Cuentas */}
      {pestana === 'cuentas' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Herramientas */}
          <div className="flex flex-col gap-3 rounded-2xl border border-linea bg-superficie p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por código o nombre…"
                  className="w-full rounded-lg border border-linea bg-superficie px-3 py-1.5 pr-8 text-sm text-tinta placeholder:text-pizarra/60 focus:border-marca focus:outline-none"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-pizarra hover:text-tinta"
                  >
                    <Icono nombre="cerrar" className="size-3.5" />
                  </button>
                )}
              </div>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="rounded-lg border border-linea bg-superficie px-3 py-1.5 text-sm text-tinta focus:border-marca focus:outline-none"
              >
                <option value="">Todos los grupos</option>
                <option value="ACTIVO">1. Activo</option>
                <option value="PASIVO">2. Pasivo</option>
                <option value="PATRIMONIO">3. Patrimonio</option>
                <option value="INGRESO">4. Ingreso</option>
                <option value="COSTO">5. Costo</option>
                <option value="GASTO">6. Gasto</option>
                <option value="ORDEN">7. Orden</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button variante="secundario" tamano="sm" onClick={expandirTodo}>
                Expandir todo
              </Button>
              <Button variante="secundario" tamano="sm" onClick={colapsarTodo}>
                Colapsar todo
              </Button>
            </div>
          </div>

          {/* Árbol Jerárquico */}
          <div className="rounded-2xl border border-linea bg-superficie p-4 shadow-xs">
            {cargandoArbol ? (
              <div className="py-12 text-center text-sm text-pizarra">
                Cargando estructura contable…
              </div>
            ) : arbolFiltrado.length === 0 ? (
              <div className="py-12 text-center text-sm text-pizarra">
                No se encontraron cuentas con los filtros seleccionados
              </div>
            ) : (
              <div className="space-y-1">
                {arbolFiltrado.map((raiz) => (
                  <NodoCuenta
                    key={raiz.id}
                    cuenta={raiz}
                    expandidos={expandidos}
                    forzarAbierto={filtrando}
                    onToggle={alternarNodo}
                    onEditar={(cuenta) => setModalCuenta({ cuenta, padre: null })}
                    onNuevaSubcuenta={(padre) => setModalCuenta({ cuenta: null, padre })}
                    onEliminar={(cuenta) => setCuentaAEliminar(cuenta)}
                    canEscritura={canEscritura}
                    canEliminar={canEliminar}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contenido de la pestaña: Centros de Costo */}
      {pestana === 'centros' && (
        <div className="rounded-2xl border border-linea bg-superficie shadow-xs overflow-hidden">
          {cargandoCentros ? (
            <div className="py-12 text-center text-sm text-pizarra">Cargando centros de costo…</div>
          ) : centrosCosto.length === 0 ? (
            <div className="py-12 text-center text-sm text-pizarra">
              No hay centros de costo registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-linea bg-superficie-2 text-xs font-semibold uppercase text-pizarra">
                  <tr>
                    <th className="px-5 py-3">Código</th>
                    <th className="px-5 py-3">Área / Nombre</th>
                    <th className="px-5 py-3">Descripción</th>
                    <th className="px-5 py-3">Estado</th>
                    {canEscritura && <th className="px-5 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {centrosCosto.map((cc) => (
                    <tr key={cc.id} className="hover:bg-superficie-2/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-marca">
                        {cc.codigo}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-tinta">{cc.nombre}</td>
                      <td className="px-5 py-3.5 text-pizarra">{cc.descripcion || '—'}</td>
                      <td className="px-5 py-3.5">
                        {cc.activo ? (
                          <span className="inline-flex items-center rounded-full bg-exito-claro px-2.5 py-0.5 text-xs font-semibold text-exito">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs font-medium text-pizarra">
                            Inactivo
                          </span>
                        )}
                      </td>
                      {canEscritura && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => alternarActivoCentro(cc)}
                              className="rounded-lg p-1.5 text-pizarra hover:bg-superficie-2 hover:text-tinta"
                              title={cc.activo ? 'Desactivar' : 'Activar'}
                            >
                              <Icono
                                nombre={cc.activo ? 'candado' : 'abierto'}
                                className="size-4"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalCentroCosto(cc)}
                              className="rounded-lg p-1.5 text-pizarra hover:bg-superficie-2 hover:text-tinta"
                              title="Editar"
                            >
                              <Icono nombre="editar" className="size-4" />
                            </button>
                            {canEliminar && (
                              <button
                                type="button"
                                onClick={() => setCentroAEliminar(cc)}
                                className="rounded-lg p-1.5 text-pizarra hover:bg-alerta-claro hover:text-alerta"
                                title="Eliminar"
                              >
                                <Icono nombre="papelera" className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {modalCuenta && (
        <ModalCuenta
          cuenta={modalCuenta.cuenta}
          padre={modalCuenta.padre}
          codigoSugerido={
            modalCuenta.padre ? siguienteCodigo(modalCuenta.padre, todasCuentas) : undefined
          }
          onClose={() => setModalCuenta(null)}
        />
      )}

      {modalCentroCosto && (
        <ModalCentroCosto
          centroCosto={modalCentroCosto.id ? modalCentroCosto : null}
          onClose={() => setModalCentroCosto(null)}
        />
      )}

      {cuentaAEliminar && (
        <ConfirmDialog
          titulo="Eliminar Cuenta Contable"
          mensaje={`¿Está seguro de que desea eliminar la cuenta "${cuentaAEliminar.codigo} — ${cuentaAEliminar.nombre}"? Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar Cuenta"
          variante="peligro"
          pendiente={eliminarCuentaMut.isPending}
          onConfirm={confirmarEliminarCuenta}
          onCancel={() => setCuentaAEliminar(null)}
        />
      )}

      {centroAEliminar && (
        <ConfirmDialog
          titulo="Eliminar Centro de Costo"
          mensaje={`¿Está seguro de que desea eliminar el centro de costo "${centroAEliminar.codigo} — ${centroAEliminar.nombre}"?`}
          textoConfirmar="Eliminar"
          variante="peligro"
          pendiente={eliminarCentroMut.isPending}
          onConfirm={confirmarEliminarCentro}
          onCancel={() => setCentroAEliminar(null)}
        />
      )}
    </div>
  )
}
