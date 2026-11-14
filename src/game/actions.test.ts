import { describe, expect, it } from 'vitest'
import { getActionUnavailableReason, performAction } from './actions'
import type { ActionId } from './actions'
import { createInitialGameState, isValidGameState } from './state'

describe('основные действия', () => {
  it.each([
    ['work', { money: 130, energy: 65, satiety: 60 }, 'Поработали!'],
    ['eat', { money: 75, satiety: 100 }, 'Поели!'],
    ['rest', { energy: 100, sanity: 90 }, 'Отдохнули.'],
  ] as const)('%s применяет эффект, тратит действие и не изменяет исходное состояние', (action, changes, message) => {
    const original = createInitialGameState()
    const snapshot = structuredClone(original)
    const result = performAction(original, action)
    expect(result.success).toBe(true)
    expect(result.message).toContain(message)
    expect(result.state).toEqual({ ...snapshot, ...changes, actionsRemaining: snapshot.actionsRemaining - 1 })
    expect(result.state).not.toBe(original)
    expect(original).toEqual(snapshot)
    expect(isValidGameState(result.state)).toBe(true)
  })

  it('не разрешает еду без достаточного количества денег и сохраняет состояние', () => {
    const state = { ...createInitialGameState(), money: 24 }
    const snapshot = structuredClone(state)
    const result = performAction(state, 'eat')
    expect(result).toEqual({ state, message: 'На еду нужно 25 денег.', success: false })
    expect(result.state).toEqual(snapshot)
    expect(state).toEqual(snapshot)
  })

  it('разрешает еду при точной стоимости', () => {
    const result = performAction({ ...createInitialGameState(), money: 25 }, 'eat')
    expect(result.success).toBe(true)
    expect(result.state.money).toBe(0)
  })

  it('не разрешает работу при нехватке энергии', () => {
    const state = { ...createInitialGameState(), energy: 14 }
    expect(getActionUnavailableReason(state, 'work')).toBe('Для работы нужно не меньше 15 энергии.')
    expect(performAction(state, 'work')).toEqual({ state, message: 'Для работы нужно не меньше 15 энергии.', success: false })
  })

  it('разрешает работу при точном запасе энергии и ограничивает сытость снизу', () => {
    const result = performAction({ ...createInitialGameState(), energy: 15, satiety: 3 }, 'work')
    expect(result.success).toBe(true)
    expect(result.state.energy).toBe(0)
    expect(result.state.satiety).toBe(0)
    expect(isValidGameState(result.state)).toBe(true)
  })

  it('ограничивает восстановление верхней границей', () => {
    const state = { ...createInitialGameState(), energy: 95, sanity: 99, satiety: 95 }
    const rested = performAction(state, 'rest').state
    expect(rested.energy).toBe(100)
    expect(rested.sanity).toBe(100)
    const fed = performAction(rested, 'eat').state
    expect(fed.satiety).toBe(100)
    expect(isValidGameState(fed)).toBe(true)
  })

  it.each(['work', 'eat', 'rest'] as ActionId[])('не выполняет %s без оставшихся действий', (action) => {
    const state = { ...createInitialGameState(), actionsRemaining: 0 }
    expect(performAction(state, action)).toEqual({ state, message: 'На сегодня действия закончились.', success: false })
  })

  it('не выполняет действия после завершения дня', () => {
    const state = { ...createInitialGameState(), dayStatus: 'finished' as const }
    expect(performAction(state, 'rest')).toEqual({ state, message: 'Игровой день уже завершён.', success: false })
  })
})
