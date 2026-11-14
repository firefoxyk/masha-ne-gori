import { describe, expect, it } from 'vitest'
import { exampleEvents } from '../content/events'
import { loadGame, saveGame } from '../storage/gameStorage'
import { createInitialGameState } from './state'
import type { GameState } from './state'
import { availableEventChoices, createEventHistory, eligibleEvents, recordEventCompleted, recordEventShown } from './eventSelection'
import { chooseEvent, continueEvent } from './eventSession'
import type { EventSession } from './eventSession'
import type { GameEvent } from './events'
import { validateEvents } from './events'

const event = (id: string): GameEvent => {
  const found = exampleEvents.find((item) => item.id === id)
  if (!found) throw new Error(`Событие ${id} не найдено`)
  return found
}
const initial = (): GameState => ({ ...createInitialGameState(), day: 2, ownedItems: ['pillow'] })
const storage = () => {
  let value: string | null = null
  return { getItem: () => value, setItem: (_key: string, next: string) => { value = next } }
}

describe('истории с продолжением', () => {
  it.each([
    ['goose-gift-start', 'accept', 'goose-gift-accepted', 'goose-gift-declined'],
    ['goose-gift-start', 'decline', 'goose-gift-declined', 'goose-gift-accepted'],
    ['assistant-help-start', 'shopping', 'assistant-shopping', 'assistant-break'],
    ['assistant-help-start', 'break', 'assistant-break', 'assistant-shopping'],
  ])('проходит %s / %s и восстанавливает карточки и последствия', (startId, choiceId, nextId, otherId) => {
    let game = initial()
    const saved = storage()
    const next = event(nextId)
    const other = event(otherId)
    const has = (history: EventSession['history'], day: number, id: string) => eligibleEvents([event(id)], { ...game, day }, 'rest', history).length > 0
    const blank = createEventHistory()
    expect(has(blank, 5, nextId)).toBe(false)
    const shown = recordEventShown(blank, startId, game.day)
    expect(has(shown, 5, nextId)).toBe(false)
    let session: EventSession = { history: shown, pending: { eventId: startId, choiceId: null, changes: null } }
    expect(saveGame(game, () => saved, session)).toBe(true)
    let loaded = loadGame(() => saved)
    expect(loaded).toEqual({ kind: 'loaded', game, events: session })
    let result = chooseEvent(session, game, choiceId)
    game = result.game; session = result.events
    expect(saveGame(game, () => saved, session)).toBe(true)
    loaded = loadGame(() => saved)
    expect(loaded).toEqual({ kind: 'loaded', game, events: session })
    if (loaded.kind !== 'loaded') throw new Error('Ошибка восстановления')
    expect(chooseEvent(loaded.events, loaded.game, choiceId)).toEqual({ events: session, game })
    session = continueEvent(loaded.events)
    expect(has(session.history, 2, nextId)).toBe(false)
    expect(has(session.history, 3, nextId)).toBe(true)
    expect(has(session.history, 6, nextId)).toBe(true)
    expect(has(session.history, 3, otherId)).toBe(false)
    game = { ...game, day: 3 }
    session = { history: recordEventShown(session.history, nextId, game.day), pending: { eventId: nextId, choiceId: null, changes: null } }
    expect(eligibleEvents([other, event('work-list')], game, 'work', session.history)).toEqual([])
    expect(saveGame(game, () => saved, session)).toBe(true)
    loaded = loadGame(() => saved)
    expect(loaded).toEqual({ kind: 'loaded', game, events: session })
    const finalChoice = availableEventChoices(next, game)[0]
    result = chooseEvent(session, game, finalChoice.id)
    game = result.game; session = result.events
    expect(saveGame(game, () => saved, session)).toBe(true)
    loaded = loadGame(() => saved)
    expect(loaded).toEqual({ kind: 'loaded', game, events: session })
    if (loaded.kind !== 'loaded') throw new Error('Ошибка восстановления')
    expect(chooseEvent(loaded.events, loaded.game, finalChoice.id)).toEqual({ events: session, game })
    expect(has(session.history, 5, nextId)).toBe(false)
    expect(eligibleEvents([event('work-list')], { ...game, day: 4 }, 'work', session.history)).toHaveLength(1)
    expect(game.ownedItems).toEqual(['pillow'])
  })

  it('проверяет ссылки и интервалы в данных', () => {
    expect(validateEvents(exampleEvents)).toEqual([])
    const broken = { ...event('goose-gift-accepted'), continuation: { eventId: 'goose-gift-start', choiceId: 'missing', minDays: 1 } }
    expect(validateEvents([event('goose-gift-start'), broken])).not.toEqual([])
    expect(validateEvents([{ ...broken, continuation: { eventId: 'goose-gift-start', choiceId: 'accept', minDays: 0 } }, event('goose-gift-start')])).not.toEqual([])
  })

  it('не теряет продолжение из-за временно неподходящего состояния', () => {
    let history = recordEventShown(createEventHistory(), 'goose-gift-start', 2)
    history = recordEventCompleted(history, 'goose-gift-start', 'accept', 2)
    const gated: GameEvent = { ...event('goose-gift-accepted'), conditions: [{ field: 'energy', min: 50 }] }
    expect(eligibleEvents([gated], { ...initial(), day: 3, energy: 20 }, 'rest', history)).toEqual([])
    expect(eligibleEvents([gated], { ...initial(), day: 6, energy: 50 }, 'rest', history)).toEqual([gated])
  })

  it.each([3, 4])('мигрирует историю версии %i без выдуманного выбора', (version) => {
    const game = initial()
    let history = recordEventShown(createEventHistory(), 'goose-note', 1)
    history = recordEventCompleted(history, 'goose-note')
    const { completedChoices: _choices, ...legacy } = history
    const raw = JSON.stringify({ version, game, events: { history: legacy, pending: null } })
    const store = { getItem: () => raw, setItem: () => { throw new Error('не должна происходить запись') } }
    const loaded = loadGame(() => store)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('Ошибка миграции')
    expect(loaded.game.ownedItems).toEqual(['pillow'])
    expect(loaded.events.history.completedEventIds).toEqual(['goose-note'])
    expect(loaded.events.history.lastShownByEvent).toEqual({ 'goose-note': 1 })
    expect(loaded.events.history.completedChoices).toEqual({})
    expect(eligibleEvents([event('goose-gift-start')], game, 'rest', loaded.events.history)).toHaveLength(1)
  })
})
