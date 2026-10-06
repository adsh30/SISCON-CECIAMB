// Preferencias de interfaz guardadas en el navegador (tema, menú, ayudas).
import { useEffect, useSyncExternalStore } from 'react'

const CLAVES = {
  tema: 'siscon.tema', // 'claro' | 'oscuro' | 'sistema'
  menuContraido: 'siscon.menu.contraido', // '1' | '0'
  ayudasOcultas: 'siscon.ayudas.ocultas', // '1' | '0'
}

const DEFECTOS = { tema: 'sistema', menuContraido: '0', ayudasOcultas: '0' }
const oyentes = new Set()

function leer(nombre) {
  try {
    return localStorage.getItem(CLAVES[nombre]) ?? DEFECTOS[nombre]
  } catch {
    return DEFECTOS[nombre]
  }
}

function escribir(nombre, valor) {
  try {
    localStorage.setItem(CLAVES[nombre], valor)
  } catch {
    // almacenamiento no disponible: la preferencia dura solo esta sesión
  }
  aplicarPreferencias()
  oyentes.forEach((fn) => fn())
}

const medioOscuro = () => window.matchMedia?.('(prefers-color-scheme: dark)')

export function temaEfectivo(tema = leer('tema')) {
  if (tema === 'sistema') return medioOscuro()?.matches ? 'oscuro' : 'claro'
  return tema
}

export function aplicarPreferencias() {
  const html = document.documentElement
  html.dataset.tema = temaEfectivo()
  html.classList.toggle('ayudas-ocultas', leer('ayudasOcultas') === '1')
}

function suscribir(fn) {
  oyentes.add(fn)
  const medio = medioOscuro()
  const alCambiarSistema = () => {
    aplicarPreferencias()
    fn()
  }
  medio?.addEventListener('change', alCambiarSistema)
  return () => {
    oyentes.delete(fn)
    medio?.removeEventListener('change', alCambiarSistema)
  }
}

export function usePreferencia(nombre) {
  const valor = useSyncExternalStore(suscribir, () => leer(nombre))
  return [valor, (nuevo) => escribir(nombre, nuevo)]
}

/** Aplica tema y ayudas al montar la app. */
export function useAplicarPreferencias() {
  useEffect(() => {
    aplicarPreferencias()
  }, [])
}
