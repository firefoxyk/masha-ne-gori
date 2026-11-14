// Рабочие значения для прототипа, не окончательный игровой баланс.
export const STAT_MIN = 0
export const STAT_MAX = 100
export const ACTIONS_PER_DAY = 5

export type DayStatus = 'active' | 'finished'

export interface GameState {
  day: number
  energy: number
  satiety: number
  sanity: number
  money: number
  motivation: number
  unfinishedProjects: number
  dayStatus: DayStatus
  actionsRemaining: number
}

export function createInitialGameState(): GameState {
  return {
    day: 1,
    energy: 80,
    satiety: 70,
    sanity: 80,
    money: 100,
    motivation: 70,
    unfinishedProjects: 0,
    dayStatus: 'active',
    actionsRemaining: ACTIONS_PER_DAY,
  }
}

// Проверяет границы данных; применение и изменение состояния появятся позже.
export function isValidGameState(state: GameState): boolean {
  const stats = [state.energy, state.satiety, state.sanity, state.motivation]
  return (
    stats.every((value) => Number.isFinite(value) && value >= STAT_MIN && value <= STAT_MAX) &&
    Number.isSafeInteger(state.day) && state.day >= 1 &&
    Number.isFinite(state.money) && state.money >= 0 &&
    Number.isSafeInteger(state.unfinishedProjects) && state.unfinishedProjects >= 0 &&
    (state.dayStatus === 'active' || state.dayStatus === 'finished') &&
    Number.isInteger(state.actionsRemaining) &&
    state.actionsRemaining >= 0 && state.actionsRemaining <= ACTIONS_PER_DAY
  )
}
