import { describe, expect, it } from 'vitest'
import { performAction } from './actions'
import { finishDay, getDaySummary, startNextDay } from './day'
import { ACTIONS_PER_DAY, createInitialGameState, getDayValues, isValidGameState } from './state'

describe('игровой день', () => {
  it('завершает день без действий, не расходуя их и не изменяя исходное состояние', () => {
    const initial = createInitialGameState()
    const snapshot = structuredClone(initial)
    const finished = finishDay(initial)
    expect(finished).not.toBe(initial)
    expect(initial).toEqual(snapshot)
    expect(finished.dayStatus).toBe('finished')
    expect(finished.actionsRemaining).toBe(ACTIONS_PER_DAY)
    expect(getDaySummary(finished)).toEqual({
      day: 1,
      actionsUsed: 0,
      changes: { energy: 0, satiety: 0, sanity: 0, money: 0, motivation: 0, unfinishedProjects: 0 },
      endValues: getDayValues(initial),
    })
  })

  it('подводит итог действий и запрещает их после завершения', () => {
    const initial = createInitialGameState()
    const worked = performAction(initial, 'work').state
    const finished = finishDay(worked)
    expect(getDaySummary(finished)).toEqual({
      day: 1,
      actionsUsed: 1,
      changes: { energy: -15, satiety: -10, sanity: 0, money: 30, motivation: 0, unfinishedProjects: 0 },
      endValues: getDayValues(worked),
    })
    expect(finished.actionsRemaining).toBe(4)
    expect(performAction(finished, 'rest')).toEqual({ state: finished, message: 'Игровой день уже завершён.', success: false })
    expect(finishDay(finished)).toBe(finished)
  })

  it('переносит все показатели, деньги и проекты и не пропускает день при повторном переходе', () => {
    const initial = createInitialGameState()
    const withProjects = { ...performAction(initial, 'work').state, unfinishedProjects: 3 }
    const finished = finishDay(withProjects)
    const snapshot = structuredClone(finished)
    const next = startNextDay(finished)
    expect(finished).toEqual(snapshot)
    expect(getDayValues(next)).toEqual(getDayValues(finished))
    expect(next.dayStart).toEqual(getDayValues(finished))
    expect(next.dayStart).not.toBe(finished.dayStart)
    expect(next.day).toBe(2)
    expect(next.dayStatus).toBe('active')
    expect(next.actionsRemaining).toBe(ACTIONS_PER_DAY)
    expect(startNextDay(next)).toBe(next)
    expect(isValidGameState(next)).toBe(true)
  })

  it('считает каждый день относительно его начала, включая пустой день', () => {
    const first = finishDay(performAction(createInitialGameState(), 'work').state)
    const secondStart = startNextDay(first)
    const second = finishDay(performAction(secondStart, 'eat').state)
    expect(getDaySummary(second).day).toBe(2)
    expect(getDaySummary(second).actionsUsed).toBe(1)
    expect(getDaySummary(second).changes).toEqual({ energy: 0, satiety: 30, sanity: 0, money: -25, motivation: 0, unfinishedProjects: 0 })
    const thirdStart = startNextDay(second)
    const third = finishDay(thirdStart)
    expect(getDaySummary(third).day).toBe(3)
    expect(getDaySummary(third).actionsUsed).toBe(0)
    expect(getDaySummary(third).changes).toEqual({ energy: 0, satiety: 0, sanity: 0, money: 0, motivation: 0, unfinishedProjects: 0 })
    expect(getDayValues(third)).toEqual(getDayValues(second))
  })
})
