import { describe, expect, it } from 'vitest'
import { dividir, multiplicar, redondear, sumar } from '../src/utils/money.js'

describe('money (aritmética decimal exacta)', () => {
  it('evita los errores de float', () => {
    expect(sumar('0.1', '0.2')).toBe('0.30')
    expect(sumar('12076.50', '373.50')).toBe('12450.00')
  })

  it('convierte dólares a bolívares con la tasa BCV', () => {
    expect(multiplicar('100', '871.3689')).toBe('87136.89')
    expect(multiplicar('1.005', '1', 2)).toBe('1.01') // half-up
  })

  it('convierte bolívares a dólares', () => {
    expect(dividir('87136.89', '871.3689')).toBe('100.00')
    expect(() => dividir('1', '0')).toThrow('División entre cero')
  })

  it('maneja negativos y redondeo a 4 decimales', () => {
    expect(sumar('986.85', '-871.37')).toBe('115.48')
    expect(redondear('871.36894', 4)).toBe('871.3689')
    expect(redondear('981.17880877', 4)).toBe('981.1788')
  })

  it('rechaza valores no numéricos', () => {
    expect(() => sumar('abc')).toThrow('Número inválido')
  })
})
