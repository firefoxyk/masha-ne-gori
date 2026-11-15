import { describe, expect, it, vi } from 'vitest'
import { exampleEvents } from '../content/events'
import { performAction } from './actions'
import type { GameEvent } from './events'
import { createInitialGameState } from './state'
import { availableEventChoices, conditionsMatch, createEventHistory, eligibleEvents, EVENT_RULES, recordEventCompleted, recordEventShown, selectEvent } from './eventSelection'

const [assistantEvent, hunger, goose] = exampleEvents
const work = { ...assistantEvent, id: 'test-work' }
const state = () => createInitialGameState()
const result = (day = 1) => ({ success: true, state: { ...state(), day } })
const always = () => 0

describe('отбор событий после действия', () => {
  it('не рассматривает неуспешное действие и не вызывает случайность без подходящих событий', () => {
    const random = vi.fn(always)
    const failed = performAction({ ...state(), money: 0 }, 'eat')
    expect(failed.success).toBe(false)
    expect(selectEvent([hunger], failed, 'eat', createEventHistory(), random)).toBeNull()
    expect(selectEvent([], result(), 'work', createEventHistory(), random)).toBeNull()
    expect(selectEvent([work], result(), 'eat', createEventHistory(), random)).toBeNull()
    expect(random).not.toHaveBeenCalled()
  })

  it('использует состояние после действия и учитывает тип действия и границы включительно', () => {
    const before = { ...state(), satiety: 40 }
    const after = performAction(before, 'work')
    expect(after.state.satiety).toBe(30)
    expect(eligibleEvents([hunger], before, 'work', createEventHistory())).toEqual([])
    expect(eligibleEvents([hunger], after.state, 'work', createEventHistory())).toEqual([hunger])
    expect(eligibleEvents([work], after.state, 'rest', createEventHistory())).toEqual([])
    expect(eligibleEvents([work], after.state, 'work', createEventHistory())).toEqual([work])
    expect(conditionsMatch([{ field: 'satiety', min: 30, max: 30 }, { field: 'day', min: 1 }], after.state)).toBe(true)
    expect(conditionsMatch([{ field: 'satiety', min: 30 }, { field: 'money', max: 0 }], after.state)).toBe(false)
    expect(selectEvent([work], { ...after, state: { ...after.state, dayStatus: 'finished' } }, 'work', createEventHistory(), always)).toBeNull()
  })

  it('с вероятностью 50% выбирает равномерно среди подходящих событий', () => {
    const game = { ...state(), day: 2, satiety: 30 }
    const success = { success: true, state: game }
    const history = createEventHistory()
    const first = vi.fn().mockReturnValueOnce(0.499).mockReturnValueOnce(0)
    const last = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.999)
    const candidates = [work, hunger, goose]
    expect(selectEvent(candidates, success, 'work', history, first)).toBe(work)
    expect(selectEvent(candidates, success, 'work', history, last)).toBe(goose)
    expect(selectEvent(candidates, success, 'work', history, () => 0.5)).toBeNull()
    expect(EVENT_RULES.chance).toBe(0.5)
    expect(() => selectEvent([work], success, 'work', history, () => 1)).toThrow(RangeError)
  })

  it('не предлагает событие без доступных по условиям вариантов', () => {
    const gated: GameEvent = { ...work, choices: [
      { ...work.choices[0], conditions: [{ field: 'money', min: 150 }] },
      { ...work.choices[1], conditions: [{ field: 'energy', max: 10 }] },
    ] }
    expect(availableEventChoices(gated, state())).toHaveLength(0)
    expect(selectEvent([gated], result(), 'work', createEventHistory(), always)).toBeNull()
    const richer = { ...state(), money: 150 }
    expect(availableEventChoices(gated, richer).map((choice) => choice.id)).toEqual(['review'])
    expect(selectEvent([gated], { success: true, state: richer }, 'work', createEventHistory(), always)).toBe(gated)
  })

  it('ограничивает количество показов в день и разрешает событие в следующем', () => {
    const original = createEventHistory()
    const selected = selectEvent([work], result(2), 'work', original, always)
    expect(selected).toBe(work)
    expect(original).toEqual(createEventHistory())
    const shown = recordEventShown(original, work.id, 2)
    expect(shown.shownCount).toBe(1)
    expect(selectEvent([goose], result(2), 'rest', original, always)).toBe(goose)
    expect(selectEvent([goose], result(2), 'rest', shown, always)).toBeNull()
    expect(selectEvent([goose], result(3), 'rest', shown, always)).toBe(goose)
    const next = recordEventShown(shown, goose.id, 3)
    expect(next.shownCount).toBe(1)
    expect(next.shownDay).toBe(3)
  })

  it('не показывает повторяемое событие в два следующих дня после показа', () => {
    const shown = recordEventShown(createEventHistory(), work.id, 2)
    for (const day of [2, 3, 4]) expect(selectEvent([work], result(day), 'work', shown, always)).toBeNull()
    expect(selectEvent([work], result(5), 'work', shown, always)).toBe(work)
    expect(EVENT_RULES.repeatCooldownDays).toBe(2)
  })

  it('исключает уникальное событие только после явного завершения показанного', () => {
    const history = createEventHistory()
    const before = selectEvent([goose], result(2), 'work', history, always)
    expect(before).toBe(goose)
    expect(recordEventCompleted(history, goose.id)).toBe(history)
    expect(selectEvent([goose], result(2), 'work', history, always)).toBe(goose)
    const shown = recordEventShown(history, goose.id, 2)
    expect(selectEvent([goose], result(3), 'work', shown, always)).toBe(goose)
    const completed = recordEventCompleted(shown, goose.id)
    expect(completed.completedEventIds).toEqual([goose.id])
    expect(recordEventCompleted(completed, goose.id)).toBe(completed)
    expect(selectEvent([goose], result(3), 'work', completed, always)).toBeNull()
    expect(history.completedEventIds).toEqual([])
  })
})
