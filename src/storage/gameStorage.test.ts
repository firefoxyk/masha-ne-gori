import { describe, expect, it, vi } from 'vitest'
import { performAction } from '../game/actions'
import { finishDay, getDaySummary } from '../game/day'
import { createInitialGameState } from '../game/state'
import { purchase } from '../game/shop'
import { chooseEvent, createEventSession, eventAfterAction } from '../game/eventSession'
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
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game, events: createEventSession() })
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

  it.each(['active', 'finished'] as const)('открывает старый формат: день %s', (status) => {
    const original = status === 'finished' ? finishDay(performAction(createInitialGameState(), 'work').state) : performAction(createInitialGameState(), 'work').state
    const { dayEnd: _dayEnd, ownedItems: _ownedItems, consumablesBought: _consumablesBought, ...legacy } = original
    const raw = JSON.stringify({ version: 1, game: legacy })
    const storage = makeStorage(raw)
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game: original, events: createEventSession() })
    expect(storage.value()).toBe(raw)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('сохраняет покупки и лимит без повторного применения эффектов и с прежними итогами', () => {
    const storage = makeStorage()
    const finished = finishDay({ ...createInitialGameState(), satiety: 40, money: 200 })
    const summary = getDaySummary(finished)
    const bought = purchase(purchase(finished, 'treat').state, 'pillow').state
    expect(saveGame(bought, () => storage)).toBe(true)
    const restored = loadGame(() => storage)
    expect(restored).toEqual({ kind: 'loaded', game: bought, events: createEventSession() })
    if (restored.kind !== 'loaded') throw new Error('Сохранение не восстановлено')
    expect(getDaySummary(restored.game)).toEqual(summary)
    expect(restored.game.consumablesBought).toBe(1)
    expect(restored.game.ownedItems).toEqual(['pillow'])
    expect(loadGame(() => storage)).toEqual(restored)
  })

  it('открывает версию магазина 2 с покупками без записи и потери данных', () => {
    const game = { ...createInitialGameState(), ownedItems: ['pillow'] as const, money: 40 }
    const raw = JSON.stringify({ version: 2, game })
    const storage = makeStorage(raw)
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game, events: createEventSession() })
    expect(storage.value()).toBe(raw)
  })

  it('восстанавливает карточку и результат вместе с покупками и историей', () => {
    const storage = makeStorage()
    const game = { ...createInitialGameState(), ownedItems: ['pillow'] as const }
    const action = performAction({ ...game, ownedItems: [...game.ownedItems] }, 'work')
    const pending = eventAfterAction(createEventSession(), action, 'work', () => 0)
    expect(saveGame(action.state, () => storage, pending)).toBe(true)
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game: action.state, events: pending })
    const answered = chooseEvent(pending, action.state, 'review')
    expect(saveGame(action.state, () => storage, answered)).toBe(true)
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game: action.state, events: answered })
  })

  it('распознаёт отсутствие сохранения без записи', () => {
    const storage = makeStorage()
    expect(loadGame(() => storage)).toEqual({ kind: 'empty' })
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it.each([
    '{',
    'null',
    JSON.stringify({ version: 999, game: createInitialGameState() }),
    JSON.stringify({ version: 2, game: { ...createInitialGameState(), ownedItems: ['unknown'] } }),
    JSON.stringify({ version: 2, game: { ...createInitialGameState(), consumablesBought: 3 } }),
    JSON.stringify({ version: 3, game: createInitialGameState(), events: { history: {}, pending: null } }),
    JSON.stringify({ version: 3, game: createInitialGameState(), events: { ...createEventSession(), pending: { eventId: 'missing', choiceId: null } } }),
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
