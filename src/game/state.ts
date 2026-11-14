// Рабочие значения для прототипа, не окончательный игровой баланс.
export const STAT_MIN = 0
export const STAT_MAX = 100
export const ACTIONS_PER_DAY = 5

export type DayStatus = 'active' | 'finished'
export const ITEM_IDS = ['plant', 'pillow', 'mug', 'blanket', 'chair', 'lamp', 'monitor', 'vine', 'garland', 'sofa', 'bookshelf'] as const
export type ItemId = typeof ITEM_IDS[number]
export const CONSUMABLE_LIMIT = 2
export const PROJECT_IDS = ['balcony-garden', 'recipe-book', 'cozy-corner'] as const
export type ProjectId = typeof PROJECT_IDS[number]
export type ProjectProgress = { status: 'started' | 'deferred' | 'completed'; step: number }

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
  dayEnd: DayValues | null
  ownedItems: ItemId[]
  consumablesBought: number
  projects: Partial<Record<ProjectId, ProjectProgress>>
}

export function genericProjects(state: GameState): number {
  return state.unfinishedProjects - Object.values(state.projects).filter((project) => project?.status === 'started' || project?.status === 'deferred').length
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
    dayEnd: null,
    ownedItems: [],
    consumablesBought: 0,
    projects: {},
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
  const projects = state.projects
  return (
    isValidDayValues(state) && isValidDayValues(state.dayStart) &&
    Number.isSafeInteger(state.day) && state.day >= 1 &&
    (state.dayStatus === 'active' || state.dayStatus === 'finished') &&
    (state.dayStatus === 'active' ? state.dayEnd === null : !!state.dayEnd && isValidDayValues(state.dayEnd)) &&
    Array.isArray(state.ownedItems) && state.ownedItems.every((id) => ITEM_IDS.includes(id)) && new Set(state.ownedItems).size === state.ownedItems.length &&
    Number.isInteger(state.consumablesBought) && state.consumablesBought >= 0 && state.consumablesBought <= CONSUMABLE_LIMIT &&
    !!projects && typeof projects === 'object' && !Array.isArray(projects) &&
    Object.entries(projects).every(([id, progress]) => PROJECT_IDS.includes(id as ProjectId) && !!progress && typeof progress === 'object' && ['started', 'deferred', 'completed'].includes(progress.status) && Number.isInteger(progress.step) && (progress.status === 'completed' ? progress.step === 2 : progress.step >= 0 && progress.step < 2)) &&
    genericProjects(state) >= 0 &&
    Number.isInteger(state.actionsRemaining) &&
    state.actionsRemaining >= 0 && state.actionsRemaining <= ACTIONS_PER_DAY
  )
}
