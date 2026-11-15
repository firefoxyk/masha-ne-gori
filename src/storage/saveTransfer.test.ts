import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadGame, parseSaveFile, serializeGame } from './gameStorage'
import v6 from '../../tests/fixtures/saves/v6.json'
import v19 from '../../tests/fixtures/saves/v19.json'
import v23 from '../../tests/fixtures/saves/v23.json'

describe('перенос сохранений', () => {
  afterEach(() => vi.restoreAllMocks())
  it.each([v6, v19, v23])('проверяет и мигрирует исторический формат $version без потери данных', snapshot => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const raw = JSON.stringify(snapshot)
    const legacy = loadGame(() => ({ getItem: () => raw, setItem: () => { throw new Error('запись недопустима') } }))
    const imported = parseSaveFile(raw)
    expect(imported).toEqual(legacy)
    expect(imported.kind).toBe('loaded')
    if (imported.kind !== 'loaded') throw new Error('исторический файл не открыт')
    expect(parseSaveFile(serializeGame(imported.game, imported.events))).toEqual(imported)
  })

  it.each(['{', JSON.stringify({ version: 999, game: {} }), JSON.stringify({ version: 24, game: { day: 1 }, events: {} })])('отклоняет неподходящий файл без записи', raw => {
    expect(parseSaveFile(raw).kind).toBe('invalid')
  })
})
