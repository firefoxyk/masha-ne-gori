import { describe, expect, it } from 'vitest'
import { exampleEvents } from '../content/events'
import { createInitialGameState } from './state'
import { createEventHistory, eligibleEvents, recordEventCompleted, recordEventShown } from './eventSelection'
import { validateEvents } from './events'
import { chooseEvent, createEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'

const event = exampleEvents.find(item => item.id === 'rocking-chair-first-rest')!
describe('история кресла-качалки', () => {
  it('доступна после отдыха только при наличии кресла и остаётся доступной в последующие дни', () => {
    const game = createInitialGameState(), history = createEventHistory()
    expect(validateEvents([event])).toEqual([])
    expect(validateEvents([{ ...event, requiresItem: 'unknown' }])).not.toEqual([])
    expect(eligibleEvents([event], game, 'rest', history)).toHaveLength(0)
    const owner = { ...game, ownedItems: ['rocking-chair' as const] }
    expect(eligibleEvents([event], owner, 'work', history)).toHaveLength(0)
    expect(eligibleEvents([event], owner, 'rest', history)).toHaveLength(1)
    expect(eligibleEvents([event], { ...owner, day: 4 }, 'rest', history)).toHaveLength(1)
    expect(eligibleEvents([event], owner, 'rest', { ...history, shownDay: 1, shownCount: 1 })).toHaveLength(0)
  })
  it('сохраняет завершение и не выбирает историю повторно для прежней покупки', () => {
    const game = { ...createInitialGameState(), ownedItems: ['rocking-chair' as const], sanity: 50 }
    let raw = JSON.stringify({ version: 20, game, events: createEventSession() })
    const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value } }
    const old = loadGame(() => storage)
    expect(old.kind).toBe('loaded')
    if (old.kind !== 'loaded') throw Error('Старое сохранение не открылось')
    const session = { ...old.events, history: recordEventShown(old.events.history, event.id, 1), pending: { eventId: event.id, choiceId: null, changes: null } }
    const result = chooseEvent(session, old.game, 'pause')
    expect(result.game.sanity).toBe(53)
    expect(chooseEvent(result.events, result.game, 'pause').game).toBe(result.game)
    expect(saveGame(result.game, () => storage, result.events)).toBe(true)
    const restored = loadGame(() => storage)
    expect(restored.kind).toBe('loaded')
    if (restored.kind !== 'loaded') throw Error('Результат не восстановлен')
    expect(restored.game.sanity).toBe(53)
    expect(eligibleEvents([event], { ...restored.game, day: 2 }, 'rest', restored.events.history)).toHaveLength(0)
    expect(recordEventCompleted(result.events.history, event.id)).toBe(result.events.history)
  })
})
