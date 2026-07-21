import { money, money2, signedMoney, kMoney, num } from '../../utils/currencyFormat'

// fr/de grouping can use a (narrow) no-break space (U+00A0 / U+202F); normalise it.
const norm = s => s.replace(/\s/g, ' ')

describe('money', () => {
  test('dollar family renders a plain "$", no decimals, grouped', () => {
    expect(money(1234567, 'NZD', 'en')).toBe('$1,234,567')
    expect(money(1234567, 'USD', 'en')).toBe('$1,234,567')
    expect(money(1000, 'AUD', 'en')).toBe('$1,000')
  })

  test('symbol follows the currency', () => {
    expect(money(1234, 'GBP', 'en')).toBe('£1,234')
    expect(norm(money(1234, 'EUR', 'en'))).toBe('€1,234')
  })

  test('grouping follows the reader language', () => {
    expect(norm(money(1234567, 'EUR', 'de'))).toBe('1.234.567 €')
    expect(norm(money(1234567, 'EUR', 'fr'))).toBe('1 234 567 €')
  })

  test('rounds to whole units and handles negatives', () => {
    expect(money(1234.6, 'NZD', 'en')).toBe('$1,235')
    expect(money(-500, 'NZD', 'en')).toBe('-$500')
  })

  test('blank / non-finite values render as an em dash, never "$0"', () => {
    expect(money(null, 'NZD', 'en')).toBe('—')
    expect(money(undefined, 'NZD', 'en')).toBe('—')
    expect(money(NaN, 'NZD', 'en')).toBe('—')
    expect(money('', 'NZD', 'en')).toBe('—')
  })

  test('falls back to NZD / en when currency or locale is missing', () => {
    expect(money(1000)).toBe('$1,000')
  })
})

describe('money2', () => {
  test('two decimals with the currency symbol', () => {
    expect(money2(0.9258, 'USD', 'en')).toBe('$0.93')
    expect(money2(12.5, 'GBP', 'en')).toBe('£12.50')
  })

  test('negative share price shows the sign before the symbol (fixes "$-0.93")', () => {
    expect(money2(-0.93, 'USD', 'en')).toBe('-$0.93')
  })

  test('blank renders as an em dash', () => {
    expect(money2(null, 'USD', 'en')).toBe('—')
  })
})

describe('signedMoney', () => {
  test('always shows a leading sign, zero as "+$0"', () => {
    expect(signedMoney(1500, 'NZD', 'en')).toBe('+$1,500')
    expect(signedMoney(-1500, 'NZD', 'en')).toBe('-$1,500')
    expect(signedMoney(0, 'NZD', 'en')).toBe('+$0')
  })
})

describe('kMoney', () => {
  test('abbreviates thousands with the currency symbol', () => {
    expect(kMoney(572000, 'NZD', 'en')).toBe('$572k')
    expect(kMoney(-3000, 'GBP', 'en')).toBe('-£3k')
  })
})

describe('num', () => {
  test('plain grouped number, no symbol, grouping by locale', () => {
    expect(num(1234, 'en')).toBe('1,234')
    expect(norm(num(1234, 'de'))).toBe('1.234')
  })

  test('honours a decimal count', () => {
    expect(num(1.25, 'en', 1)).toBe('1.3')
    expect(num(42, 'en', 0)).toBe('42')
  })

  test('blank renders as an em dash', () => {
    expect(num(null, 'en')).toBe('—')
  })
})
