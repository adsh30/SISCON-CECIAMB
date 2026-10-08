import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useCuentas } from '../../api/cuentas.js'
import { bordeCampo, claseCampo } from './clasesCampo.js'
import { Icono } from './Icono.jsx'

/**
 * Selector interactivo de cuentas contables optimizado para teclado:
 * Flecha abajo / arriba navega entre resultados, Enter selecciona, Escape cierra.
 */
export function AccountPicker({
  value, // id de la cuenta seleccionada o null
  onChange, // fn(cuenta) llamada al seleccionar
  soloMovimiento = true,
  soloActivas = true,
  placeholder = 'Buscar por código o nombre…',
  error,
  disabled = false,
  className = '',
}) {
  const idInput = useId()
  const contenedorRef = useRef(null)
  const inputRef = useRef(null)

  const [textoBusqueda, setTextoBusqueda] = useState(null)
  const [abierto, setAbierto] = useState(false)
  const [indiceResaltado, setIndiceResaltado] = useState(0)

  // Consultar cuentas disponibles
  const { data: cuentas = [], isLoading } = useCuentas({
    soloMovimiento: soloMovimiento ? true : undefined,
    soloActivas: soloActivas ? true : undefined,
  })

  // Encontrar la cuenta actualmente seleccionada por id
  const cuentaSeleccionada = useMemo(() => cuentas.find((c) => c.id === value), [cuentas, value])

  const texto =
    textoBusqueda !== null
      ? textoBusqueda
      : cuentaSeleccionada
        ? `${cuentaSeleccionada.codigo} — ${cuentaSeleccionada.nombre}`
        : ''

  // Filtrado de cuentas por el texto tipeado
  const filtradas = useMemo(() => {
    if (!texto.trim()) return cuentas.slice(0, 50)
    const t = texto.toLowerCase().trim()
    return cuentas
      .filter((c) => c.codigo.toLowerCase().includes(t) || c.nombre.toLowerCase().includes(t))
      .slice(0, 50)
  }, [cuentas, texto])

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false)
        setTextoBusqueda(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const seleccionar = (cuenta) => {
    onChange?.(cuenta)
    setTextoBusqueda(null)
    setAbierto(false)
  }

  const handleKeyDown = (e) => {
    if (!abierto) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setAbierto(true)
        e.preventDefault()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceResaltado((prev) => (prev + 1 < filtradas.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceResaltado((prev) => (prev - 1 >= 0 ? prev - 1 : filtradas.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtradas[indiceResaltado]) {
        seleccionar(filtradas[indiceResaltado])
      }
    } else if (e.key === 'Escape') {
      setAbierto(false)
      setTextoBusqueda(null)
    }
  }

  return (
    <div ref={contenedorRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          id={idInput}
          type="text"
          value={texto}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setTextoBusqueda(e.target.value)
            setAbierto(true)
            setIndiceResaltado(0)
            if (!e.target.value) onChange?.(null)
          }}
          onFocus={() => {
            setAbierto(true)
            inputRef.current?.select()
          }}
          onKeyDown={handleKeyDown}
          className={`${claseCampo} ${bordeCampo(error)} pr-9 text-sm`}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-pizarra">
          <Icono nombre="buscar" className="size-4 opacity-60" />
        </div>
      </div>

      {abierto && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-linea bg-superficie py-1 text-sm shadow-xl focus:outline-none"
        >
          {isLoading && <li className="px-3 py-2 text-xs text-pizarra">Cargando catálogo…</li>}
          {!isLoading && filtradas.length === 0 && (
            <li className="px-3 py-2 text-xs text-pizarra">
              No se encontraron cuentas coincidentes
            </li>
          )}
          {filtradas.map((c, idx) => {
            const activo = idx === indiceResaltado
            const seleccionada = c.id === value
            return (
              <li
                key={c.id}
                role="option"
                aria-selected={seleccionada}
                onMouseEnter={() => setIndiceResaltado(idx)}
                onClick={() => seleccionar(c)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 transition-colors ${
                  activo ? 'bg-marca-claro text-marca' : 'text-tinta hover:bg-superficie-2'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">{c.codigo}</span>
                    <span className="truncate">{c.nombre}</span>
                  </div>
                  {c.descripcion && (
                    <p className="truncate text-[11px] text-pizarra">{c.descripcion}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                      c.naturaleza === 'DEUDORA'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {c.naturaleza === 'DEUDORA' ? 'Deu' : 'Acr'}
                  </span>
                  {seleccionada && <Icono nombre="check" className="size-3.5 text-marca" />}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
