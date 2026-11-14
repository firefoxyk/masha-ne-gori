import { describe, expect, it } from 'vitest'
import { performAction } from './actions'
import { createInitialGameState } from './state'
import { chooseEvent, continueEvent, createEventSession, eventAfterAction, isValidEventSession } from './eventSession'

describe('состояние карточки события', () => {
  it('создаёт один показ после работы и завершает его при выборе без изменения показателей', () => {
    const game = createInitialGameState()
    const action = performAction(game, 'work')
    const session = eventAfterAction(createEventSession(), action, 'work', () => 0)
    expect(session.pending).toEqual({ eventId: 'assistant-report', choiceId: null })
    expect(session.history.shownCount).toBe(1)
    const before = structuredClone(action.state)
    const selected = chooseEvent(session, action.state, 'review')
    expect(selected.pending?.choiceId).toBe('review')
    expect(selected.history.completedEventIds).toContain('assistant-report')
    expect(action.state).toEqual(before)
    expect(chooseEvent(selected, action.state, 'postpone')).toBe(selected)
    expect(eventAfterAction(selected, action, 'work', () => 0)).toBe(selected)
    expect(continueEvent(selected).pending).toBeNull()
    expect(isValidEventSession(selected, action.state)).toBe(true)
  })
  it('не показывает неподходящее событие и блокирует продолжение до выбора', () => {
    const start = createEventSession()
    const action = performAction(createInitialGameState(), 'rest')
    expect(eventAfterAction(start, action, 'rest', () => 0)).toBe(start)
    const work = performAction(createInitialGameState(), 'work')
    const shown = eventAfterAction(start, work, 'work', () => 0)
    expect(continueEvent(shown)).toBe(shown)
    expect(chooseEvent(shown, work.state, 'unknown')).toBe(shown)
  })
})
