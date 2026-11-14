import { describe, expect, it } from 'vitest'
import { exampleEvents } from '../content/events'
import { loadGame, saveGame } from '../storage/gameStorage'
import { performAction } from './actions'
import { availableEventChoices, createEventHistory, eligibleEvents, recordEventShown, selectEvent } from './eventSelection'
import { chooseEvent, createEventSession } from './eventSession'
import type { EventSession } from './eventSession'
import type { GameEvent } from './events'
import { validateEvents } from './events'
import { createInitialGameState, genericProjects } from './state'
import type { GameState } from './state'

const cases = [
  ['idea-garden', 'balcony-garden', 'rest'],
  ['idea-recipes', 'recipe-book', 'eat'],
  ['idea-postcard', 'cozy-corner', 'work'],
] as const
const find = (id: string): GameEvent => {
  const event = exampleEvents.find((item) => item.id === id)
  if (!event) throw new Error(`Нет события ${id}`)
  return event
}
const shown = (id: string, game: GameState): EventSession => ({ ...createEventSession(), history: recordEventShown(createEventHistory(), id, game.day), pending: { eventId: id, choiceId: null, changes: null } })
function storage() {
  let raw: string | null = null
  return { getItem: () => raw, setItem: (_: string, value: string) => { raw = value }, raw: () => raw }
}

describe('идеи проектов в событиях', () => {
  it('проходит валидацию, включая ссылки на проект', () => {
    expect(validateEvents(exampleEvents)).toEqual([])
    const broken = { ...find('idea-garden'), requiresIdea: 'missing' }
    expect(validateEvents([broken])).not.toEqual([])
    const wrongChoice = { ...find('idea-garden'), choices: [{ ...find('idea-garden').choices[0], projectStart: 'recipe-book' }] }
    expect(validateEvents([wrongChoice])).not.toEqual([])
  })

  it.each(cases)('%s: начало списывает одно действие и учитывает конкретный проект', (eventId, projectId, action) => {
    const before = { ...createInitialGameState(), unfinishedProjects: 2, ownedItems: ['pillow' as const] }
    const performed = performAction(before, action)
    const event = find(eventId)
    expect(eligibleEvents([event], performed.state, action, createEventHistory())).toEqual([event])
    expect(selectEvent([event], performed, action, createEventHistory(), () => 0)).toBe(event)
    const opened = shown(eventId, performed.state)
    const selected = chooseEvent(opened, performed.state, 'start')
    expect(selected.game.projects[projectId]).toMatchObject({ status: 'started', step: 0, story: { startDay: 1, seen: 0, actual: null } })
    expect(selected.game.actionsRemaining).toBe(performed.state.actionsRemaining - 1)
    expect(selected.game.unfinishedProjects).toBe(3)
    expect(genericProjects(selected.game)).toBe(2)
    expect(selected.events.pending?.changes).toEqual({ unfinishedProjects: 1, actionsRemaining: -1 })
    expect(chooseEvent(selected.events, selected.game, 'start')).toEqual(selected)
    expect(performed.state.projects).toEqual({})
    const store = storage()
    expect(saveGame(selected.game, () => store, selected.events)).toBe(true)
    expect(loadGame(() => store)).toEqual({ kind: 'loaded', game: selected.game, events: selected.events })
    const restored = loadGame(() => store)
    if (restored.kind !== 'loaded') throw new Error('не восстановлено')
    expect(chooseEvent(restored.events, restored.game, 'start')).toEqual(selected)
  })

  it.each(cases.flatMap(([eventId, projectId]) => [['later', eventId, projectId], ['decline', eventId, projectId]] as const))('%s: %s оставляет идею доступной без затрат', (choice, eventId, projectId) => {
    const game = { ...createInitialGameState(), actionsRemaining: 0, unfinishedProjects: 3 }
    const opened = shown(eventId, game)
    const selected = chooseEvent(opened, game, choice)
    expect(selected.game).toEqual(game)
    expect(selected.game.projects[projectId]).toBeUndefined()
    expect(selected.events.pending?.changes).toEqual({})
    expect(selected.events.pending?.choiceId).toBe(choice)
  })

  it.each(cases)('%s не мешает продолжить день после последнего действия', (eventId, _projectId, action) => {
    const before = { ...createInitialGameState(), actionsRemaining: 1 }
    const result = performAction(before, action)
    expect(result.state.actionsRemaining).toBe(0)
    const event = find(eventId)
    expect(eligibleEvents([event], result.state, action, createEventHistory())).toEqual([event])
    expect(availableEventChoices(event, result.state).map((choice) => choice.id)).toEqual(['later', 'decline'])
    const session = shown(eventId, result.state)
    expect(chooseEvent(session, result.state, 'start')).toEqual({ events: session, game: result.state })
    expect(chooseEvent(session, result.state, 'later').events.pending?.choiceId).toBe('later')
  })

  it.each(cases.flatMap(([eventId, projectId, action]) => (['started', 'deferred', 'completed'] as const).map((status) => [eventId, projectId, action, status] as const)))('%s не предлагается при состоянии проекта %s / %s / %s', (eventId, projectId, action, status) => {
    const state: GameState = { ...createInitialGameState(), unfinishedProjects: status === 'completed' ? 0 : 1, projects: { [projectId]: { status, step: status === 'completed' ? 2 : 0 } } }
    expect(eligibleEvents([find(eventId)], state, action, createEventHistory())).toEqual([])
    expect(availableEventChoices(find(eventId), state).map((choice) => choice.id)).not.toContain('start')
  })

  it('загружает версию 6 с покупками, обобщёнными и именованными проектами и открытой карточкой', () => {
    const game = { ...createInitialGameState(), unfinishedProjects: 4, ownedItems: ['pillow' as const], projects: { 'recipe-book': { status: 'deferred' as const, step: 1 } } }
    const events = shown('assistant-report', game)
    const original = JSON.stringify({ version: 6, game, events })
    const store = { getItem: () => original, setItem: () => { throw new Error('нельзя перезаписать при чтении') } }
    expect(loadGame(() => store)).toEqual({ kind: 'loaded', game: { ...game, projectIdeas: expect.any(Object), projectWaits: {} }, events })
    expect(genericProjects(game)).toBe(3)
  })

  it('не принимает повреждённый результат начала проекта', () => {
    const game = { ...createInitialGameState(), actionsRemaining: 2 }
    const selected = chooseEvent(shown('idea-garden', game), game, 'start')
    for (const corrupted of [
      { ...selected, game: { ...selected.game, projects: {} } },
      { ...selected, events: { ...selected.events, pending: { ...selected.events.pending!, changes: { unfinishedProjects: 1, actionsRemaining: -2 } } } },
    ]) {
      const raw = JSON.stringify({ version: 7, ...corrupted })
      expect(loadGame(() => ({ getItem: () => raw, setItem: () => { throw new Error('нельзя менять повреждённое сохранение') } }))).toEqual({ kind: 'invalid' })
    }
  })
})
