// Рабочие значения для прототипа, не окончательный игровой баланс.
export const STAT_MIN = 0
export const STAT_MAX = 100
export const ACTIONS_PER_DAY = 5

export type DayStatus = 'active' | 'finished'

export interface DayValues {
  energy: number
  satiety: number
  sanity: number
  money: number
  motivation: number
  unfinishedProjects: number
}

export interface GameState extends DayValues {
  day: number
  dayStatus: DayStatus
  actionsRemaining: number
  dayStart: DayValues
}

export function getDayValues(state: DayValues): DayValues {
  const { energy, satiety, sanity, money, motivation, unfinishedProjects } = state
  return { energy, satiety, sanity, money, motivation, unfinishedProjects }
}

export function createInitialGameState(): GameState {
  const values: DayValues = {
    energy: 80,
    satiety: 70,
    sanity: 80,
    money: 100,
    motivation: 70,
    unfinishedProjects: 0,
  }
  return {
    day: 1,
    ...values,
    dayStatus: 'active',
    actionsRemaining: ACTIONS_PER_DAY,
    dayStart: { ...values },
  }
}

function isValidDayValues(values: DayValues): boolean {
  const stats = [values.energy, values.satiety, values.sanity, values.motivation]
  return (
    stats.every((value) => Number.isFinite(value) && value >= STAT_MIN && value <= STAT_MAX) &&
    Number.isFinite(values.money) && values.money >= 0 &&
    Number.isSafeInteger(values.unfinishedProjects) && values.unfinishedProjects >= 0
  )
}

// Проверяет допустимость данных состояния.
export function isValidGameState(state: GameState): boolean {
  return (
    isValidDayValues(state) && isValidDayValues(state.dayStart) &&
    Number.isSafeInteger(state.day) && state.day >= 1 &&
    (state.dayStatus === 'active' || state.dayStatus === 'finished') &&
    Number.isInteger(state.actionsRemaining) &&
    state.actionsRemaining >= 0 && state.actionsRemaining <= ACTIONS_PER_DAY
  )
}
