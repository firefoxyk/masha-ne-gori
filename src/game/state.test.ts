import { describe, expect, it } from 'vitest'
import { ACTIONS_PER_DAY, createInitialGameState, isValidGameState } from './state'

describe('начальное состояние игры', () => {
  it('создаёт новую игру с временными начальными значениями', () => {
    const state = createInitialGameState()
    expect(state).toEqual({
      day: 1,
      energy: 80,
      satiety: 70,
      sanity: 80,
      money: 100,
      motivation: 70,
      unfinishedProjects: 0,
      dayStatus: 'active',
      actionsRemaining: 5,
      dayStart: { energy: 80, satiety: 70, sanity: 80, money: 100, motivation: 70, unfinishedProjects: 0 },
      dayEnd: null,
      ownedItems: [],
      consumablesBought: 0,
    })
    expect(isValidGameState(state)).toBe(true)
  })

  it('создаёт независимые состояния для разных игр', () => {
    const first = createInitialGameState()
    first.energy = 0
    first.dayStart.energy = 0
    expect(createInitialGameState().energy).toBe(80)
    expect(createInitialGameState().dayStart.energy).toBe(80)
  })
})

describe('границы состояния', () => {
  it('допускает крайние значения шкал, нулевые ресурсы и отсутствие действий', () => {
    expect(isValidGameState({
      ...createInitialGameState(),
      energy: 0,
      satiety: 100,
      sanity: 0,
      motivation: 100,
      money: 0,
      unfinishedProjects: 0,
      actionsRemaining: 0,
      dayStatus: 'finished',
      dayEnd: createInitialGameState().dayStart,
    })).toBe(true)
  })

  it.each(['energy', 'satiety', 'sanity', 'motivation'] as const)(
    'отклоняет выход шкалы %s за границы и некорректные числа',
    (field) => {
      for (const value of [-1, 101, NaN, Infinity]) {
        expect(isValidGameState({ ...createInitialGameState(), [field]: value })).toBe(false)
      }
    },
  )

  it.each([
    { day: 0 },
    { day: 1.5 },
    { money: -1 },
    { money: Infinity },
    { unfinishedProjects: -1 },
    { unfinishedProjects: 0.5 },
    { actionsRemaining: -1 },
    { actionsRemaining: ACTIONS_PER_DAY + 1 },
    { actionsRemaining: 0.5 },
  ])('отклоняет недопустимые данные: %o', (change) => {
    expect(isValidGameState({ ...createInitialGameState(), ...change })).toBe(false)
  })
})
