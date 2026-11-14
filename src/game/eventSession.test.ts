import { describe, expect, it } from 'vitest'
import { performAction } from './actions'
import { createInitialGameState } from './state'
import { exampleEvents } from '../content/events'
import { availableEventChoices, choiceUnavailableReason, eligibleEvents } from './eventSelection'
import type { EventChoice, GameEvent } from './events'
import { chooseEvent, continueEvent, createEventSession, eventAfterAction, isValidEventSession } from './eventSession'

describe('состояние карточки события', () => {
  it('создаёт один показ и применяет последствия выбора один раз', () => {
    const game = createInitialGameState()
    const action = performAction(game, 'work')
    const session = eventAfterAction(createEventSession(), action, 'work', () => 0)
    expect(session.pending).toEqual({ eventId: 'assistant-report', choiceId: null, changes: null })
    expect(session.history.shownCount).toBe(1)
    const before = structuredClone(action.state)
    const selected = chooseEvent(session, action.state, 'review')
    expect(selected.events.pending?.choiceId).toBe('review')
    expect(selected.events.pending?.changes).toEqual({ energy: -5, motivation: 3 })
    expect(selected.game.energy).toBe(before.energy - 5)
    expect(selected.events.history.completedEventIds).toContain('assistant-report')
    expect(action.state).toEqual(before)
    expect(chooseEvent(selected.events, selected.game, 'postpone')).toEqual(selected)
    expect(eventAfterAction(selected.events, action, 'work', () => 0)).toBe(selected.events)
    expect(continueEvent(selected.events).pending).toBeNull()
    expect(isValidEventSession(selected.events, selected.game)).toBe(true)
  })
  it('не показывает неподходящее событие и блокирует продолжение до выбора', () => {
    const start = createEventSession()
    const action = performAction(createInitialGameState(), 'rest')
    expect(eventAfterAction(start, action, 'rest', () => 0)).toBe(start)
    const work = performAction(createInitialGameState(), 'work')
    const shown = eventAfterAction(start, work, 'work', () => 0)
    expect(continueEvent(shown)).toBe(shown)
    expect(chooseEvent(shown, work.state, 'unknown')).toEqual({ events: shown, game: work.state })
  })
  it('разные варианты меняют проекты или ограничивают шкалы и фиксируют фактические изменения', () => {
    const game = { ...createInitialGameState(), energy: 3, motivation: 99 }
    const shown = eventAfterAction(createEventSession(), { success: true, state: game }, 'work', () => 0)
    const review = chooseEvent(shown, game, 'review')
    expect(review.game.energy).toBe(0)
    expect(review.game.motivation).toBe(100)
    expect(review.events.pending?.changes).toEqual({ energy: -3, motivation: 1 })
    const postpone = chooseEvent(shown, game, 'postpone')
    expect(postpone.game.unfinishedProjects).toBe(1)
    expect(postpone.events.pending?.changes).toEqual({ unfinishedProjects: 1 })
  })
  it('блокирует недостающие деньги и проекты и не выбирает событие без доступных вариантов', () => {
    const moneyChoice: EventChoice = { id: 'pay', text: 'Купить', result: 'Готово', effects: { money: -10, unfinishedProjects: -1 } }
    const game = { ...createInitialGameState(), money: 9, unfinishedProjects: 0 }
    expect(choiceUnavailableReason(moneyChoice, game)).toContain('денег')
    expect(choiceUnavailableReason(moneyChoice, { ...game, money: 10 })).toContain('проектов')
    expect(choiceUnavailableReason(moneyChoice, { ...game, money: 10, unfinishedProjects: 1 })).toBeNull()
    const event: GameEvent = { ...exampleEvents[0], choices: [moneyChoice] }
    expect(availableEventChoices(event, game)).toEqual([])
    expect(eligibleEvents([event], game, 'work', createEventSession().history)).toEqual([])
  })
  it('еда меняет состояние для последующего отбора, а при нехватке денег вариант недоступен', () => {
    const game = { ...createInitialGameState(), satiety: 20, money: 10 }
    const shown = eventAfterAction(createEventSession(), { success: true, state: game }, 'rest', () => 0)
    expect(shown.pending?.eventId).toBe('hungry-fridge')
    const failed = chooseEvent(shown, { ...game, money: 0 }, 'snack')
    expect(failed.events).toBe(shown)
    const selected = chooseEvent(shown, game, 'snack')
    expect(selected.game.money).toBe(0)
    expect(selected.game.satiety).toBe(35)
    expect(selected.events.pending?.changes).toEqual({ money: -10, satiety: 15 })
    expect(eligibleEvents([exampleEvents[1]], { ...selected.game, day: 4 }, 'rest', selected.events.history)).toEqual([])
  })
})
