import { describe, expect, it, vi } from 'vitest'
import { performAction } from '../game/actions'
import { finishDay, getDaySummary } from '../game/day'
import { createInitialGameState } from '../game/state'
import { loadGame, SAVE_KEY, saveGame } from './gameStorage'

function makeStorage(initial: string | null = null) {
  let value = initial
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => { value = next }),
    value: () => value,
  }
}

describe('локальное сохранение', () => {
  it('сохраняет и восстанавливает активный день с исходной точкой отсчёта', () => {
    const storage = makeStorage()
    const game = performAction(createInitialGameState(), 'work').state
    expect(saveGame(game, () => storage)).toBe(true)
    expect(storage.setItem).toHaveBeenCalledWith(SAVE_KEY, expect.any(String))
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game })
  })

  it('восстанавливает завершённый день и те же итоги', () => {
    const storage = makeStorage()
    const game = finishDay(performAction(createInitialGameState(), 'work').state)
    expect(saveGame(game, () => storage)).toBe(true)
    const restored = loadGame(() => storage)
    expect(restored.kind).toBe('loaded')
    if (restored.kind !== 'loaded') throw new Error('Сохранение не восстановлено')
    expect(restored.game.dayStatus).toBe('finished')
    expect(getDaySummary(restored.game)).toEqual(getDaySummary(game))
  })

  it('распознаёт отсутствие сохранения без записи', () => {
    const storage = makeStorage()
    expect(loadGame(() => storage)).toEqual({ kind: 'empty' })
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it.each([
    '{',
    'null',
    JSON.stringify({ version: 2, game: createInitialGameState() }),
    JSON.stringify({ version: 1, game: { day: 1 } }),
    JSON.stringify({ version: 1, game: { ...createInitialGameState(), money: -1 } }),
    JSON.stringify({ version: 1, game: { ...createInitialGameState(), dayStart: null } }),
  ])('не изменяет повреждённое, неполное или неизвестное сохранение', (raw) => {
    const storage = makeStorage(raw)
    expect(loadGame(() => storage)).toEqual({ kind: 'invalid' })
    expect(storage.value()).toBe(raw)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('сообщает об ошибке чтения и не пытается записать данные', () => {
    const storage = { getItem: vi.fn(() => { throw new Error('read') }), setItem: vi.fn() }
    expect(loadGame(() => storage)).toEqual({ kind: 'unavailable' })
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(loadGame(() => { throw new Error('access') })).toEqual({ kind: 'unavailable' })
  })

  it('сообщает об ошибке записи', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn(() => { throw new Error('write') }) }
    expect(saveGame(createInitialGameState(), () => storage)).toBe(false)
  })
})
