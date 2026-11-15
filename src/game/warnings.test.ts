import { describe, expect, it } from 'vitest'
import { performAction } from './actions'
import { finishDay, finishExhaustedDay, getDaySummary, startNextDay } from './day'
import { createInitialGameState, isValidGameState } from './state'
import { getStateWarnings } from './warnings'

describe('предупреждения о состоянии', () => {
  it.each([
    ['energy', 'Энергия на исходе. Бесплатный отдых поможет набраться сил.'],
    ['satiety', 'Маша проголодалась. Можно поесть.'],
    ['sanity', 'Кукуха устала. Бесплатный отдых ей поможет.'],
  ] as const)('показывает %s при 30 и ниже и убирает при 31', (field, message) => {
    const initial = createInitialGameState()
    expect(getStateWarnings({ ...initial, [field]: 31 })).not.toContain(message)
    expect(getStateWarnings({ ...initial, [field]: 30 })).toContain(message)
    expect(getStateWarnings({ ...initial, [field]: 0 })).toContain(message)
  })

  it('показывает несколько предупреждений и обновляет их после отдыха и еды', () => {
    const state = { ...createInitialGameState(), energy: 20, sanity: 25, satiety: 20 }
    expect(getStateWarnings(state)).toHaveLength(3)
    const rested = performAction(state, 'rest').state
    expect(getStateWarnings(rested)).toEqual(['Маша проголодалась. Можно поесть.'])
    const fed = performAction(rested, 'eat').state
    expect(getStateWarnings(fed)).toEqual([])
  })

  it('сохраняет предупреждения после перехода дня, пока показатели не восстановлены', () => {
    const state = { ...createInitialGameState(), energy: 10, satiety: 10, sanity: 10 }
    const next = startNextDay(finishDay(state))
    expect(getStateWarnings(next)).toEqual(getStateWarnings(state))
  })
})

describe('выход из тяжёлого состояния', () => {
  it('при нуле энергии по выбору завершает день, учитывает передышку в итогах и не повторяет её', () => {
    const state = { ...createInitialGameState(), energy: 0, actionsRemaining: 2, money: 0, satiety: 0 }
    expect(finishExhaustedDay({ ...state, energy: 1 }).dayStatus).toBe('active')
    const finished = finishExhaustedDay(state)
    expect(state.energy).toBe(0)
    expect(finished.energy).toBe(10)
    expect(finished.actionsRemaining).toBe(2)
    expect(getDaySummary(finished).endValues.energy).toBe(10)
    expect(getDaySummary(finished).actionsUsed).toBe(3)
    expect(finishExhaustedDay(finished)).toBe(finished)
    const next = startNextDay(finished)
    expect(next.energy).toBe(10)
    expect(performAction(next, 'rest').success).toBe(true)
  })
  it('предлагает доступный бесплатный перекус и учитывает отсутствие ходов', () => {
    const state = { ...createInitialGameState(), energy: 0, satiety: 0, money: 0 }
    expect(getStateWarnings(state).join(' ')).toContain('бесплатный перекус')
    expect(getStateWarnings({ ...state, actionsRemaining: 0 }).join(' ')).toContain('На следующий день')
  })
  it('без денег и сил может отдохнуть, заработать и поесть', () => {
    let state = { ...createInitialGameState(), energy: 0, satiety: 0, sanity: 0, money: 0 }
    const initial = structuredClone(state)
    const work = performAction(state, 'work')
    const eat = performAction(state, 'eat')
    expect(work.success).toBe(false)
    expect(eat.success).toBe(false)
    expect(state).toEqual(initial)
    expect(work.state.actionsRemaining).toBe(initial.actionsRemaining)
    expect(eat.state.actionsRemaining).toBe(initial.actionsRemaining)
    for (const action of ['rest', 'work', 'eat'] as const) {
      const result = performAction(state, action)
      expect(result.success).toBe(true)
      state = result.state
      expect(isValidGameState(state)).toBe(true)
      expect(state.money).toBeGreaterThanOrEqual(0)
      expect(state.unfinishedProjects).toBeGreaterThanOrEqual(0)
    }
    expect(state.satiety).toBe(30)
    expect(state.money).toBe(5)
    expect(state.actionsRemaining).toBe(2)
  })

  it('после расхода ходов позволяет перейти к новому дню и восстановиться', () => {
    const exhausted = { ...createInitialGameState(), energy: 0, satiety: 0, sanity: 0, money: 0, actionsRemaining: 0 }
    const rejected = performAction(exhausted, 'rest')
    expect(rejected.success).toBe(false)
    expect(rejected.state).toEqual(exhausted)
    let state = startNextDay(finishDay(exhausted))
    for (const action of ['rest', 'work', 'eat'] as const) {
      const result = performAction(state, action)
      expect(result.success).toBe(true)
      state = result.state
      expect(isValidGameState(state)).toBe(true)
    }
    expect(state.satiety).toBe(30)
  })

  it('сохраняет допустимые значения при повторении действий на протяжении нескольких дней', () => {
    let state = createInitialGameState()
    for (let day = 0; day < 8; day++) {
      for (const action of ['work', 'work', 'rest', 'eat', 'rest'] as const) {
        const result = performAction(state, action)
        expect(result.success).toBe(true)
        state = result.state
        expect(isValidGameState(state)).toBe(true)
      }
      state = startNextDay(finishDay(state))
      expect(isValidGameState(state)).toBe(true)
    }
    expect(state.day).toBe(9)
  })
})
