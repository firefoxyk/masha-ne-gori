import { PROJECT_STORIES } from '../content/projectStories.ts'
import { PROJECT_CHOICES } from '../content/projectChoices.ts'
import { longStory } from '../content/projectStoriesV2.ts'
import { shortProjectChoice } from '../content/shortProjectChoices.ts'

// Рабочие значения для прототипа, не окончательный игровой баланс.
export const STAT_MIN = 0
export const STAT_MAX = 100
export const ACTIONS_PER_DAY = 5

export type DayStatus = 'active' | 'finished'
export const ITEM_IDS = ['plant', 'pillow', 'mug', 'blanket', 'chair', 'lamp', 'monitor', 'vine', 'garland', 'sofa', 'bookshelf', 'egg-pillow', 'pillow-set', 'nightstand', 'crystal-light', 'wall-photos', 'window-plant'] as const
export type ItemId = typeof ITEM_IDS[number]
export const CONSUMABLE_LIMIT = 2
export const PROJECT_IDS = ['balcony-garden', 'recipe-book', 'cozy-corner', 'ideal-sofa', 'train-assistant', 'goose-owner'] as const
export type ProjectId = typeof PROJECT_IDS[number]
export type ProjectStoryProgress = { scenario: number; startDay: number; seen: number; actual: Partial<Record<'money' | 'satiety' | 'sanity' | 'motivation', number>> | null; choices?: Record<string, string>; edition?: 2 | 3 }
export type ProjectProgress = { status: 'started' | 'deferred' | 'completed'; step: number; story?: ProjectStoryProgress }
export type ProjectJournalEntry = { finishedDay: number; story: ProjectStoryProgress | null; legacyResult?: { message: string; actual: Partial<Record<'money' | 'sanity' | 'motivation', number>> } }

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
  projectCompletions: Partial<Record<ProjectId, number>>
  projectIdeas: { day: number; ids: ProjectId[] }
  projectWaits: Partial<Record<ProjectId, number>>
  projectSeenScenarios: Partial<Record<ProjectId, number[]>>
  projectJournal: Partial<Record<ProjectId, ProjectJournalEntry[]>>
}

export function projectLimit(id: ProjectId): number { return PROJECT_IDS.indexOf(id) < 3 ? 5 : 1 }
export function chooseProjectIdeas(game: Pick<GameState, 'day' | 'projects' | 'projectCompletions'> & Partial<Pick<GameState, 'projectWaits'>>, random: () => number = Math.random): GameState['projectIdeas'] {
  const candidates = PROJECT_IDS.filter((id) => (!game.projects[id] || game.projects[id]?.status === 'completed') && (game.projectCompletions[id] ?? 0) < projectLimit(id))
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  candidates.sort((a, b) => {
    const wa = game.projectWaits?.[a] ?? 0
    const wb = game.projectWaits?.[b] ?? 0
    return (wb >= 3 ? wb : 0) - (wa >= 3 ? wa : 0)
  })
  return { day: game.day, ids: candidates.slice(0, 3) }
}

export function nextProjectWaits(game: Pick<GameState, 'projects' | 'projectCompletions' | 'projectWaits'>, ideas: GameState['projectIdeas']): GameState['projectWaits'] {
  const waits = { ...game.projectWaits }
  for (const id of PROJECT_IDS) {
    const eligible = (!game.projects[id] || game.projects[id]?.status === 'completed') && (game.projectCompletions[id] ?? 0) < projectLimit(id)
    if (!eligible || ideas.ids.includes(id)) waits[id] = 0
    else waits[id] = (waits[id] ?? 0) + 1
  }
  return waits
}

export function genericProjects(state: GameState): number {
  return state.unfinishedProjects - Object.values(state.projects).filter((project) => project?.status === 'started' || project?.status === 'deferred').length
}

export function getDayValues(state: DayValues): DayValues {
  const { energy, satiety, sanity, money, motivation, unfinishedProjects } = state
  return { energy, satiety, sanity, money, motivation, unfinishedProjects }
}

export function createInitialGameState(random: () => number = Math.random): GameState {
  const values: DayValues = {
    energy: 80,
    satiety: 70,
    sanity: 80,
    money: 100,
    motivation: 70,
    unfinishedProjects: 0,
  }
  const projectIdeas = chooseProjectIdeas({ day: 1, projects: {}, projectCompletions: {} }, random)
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
    projectCompletions: {},
    projectIdeas,
    projectWaits: nextProjectWaits({ projects: {}, projectCompletions: {}, projectWaits: {} }, projectIdeas),
    projectSeenScenarios: {},
    projectJournal: {},
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

function isValidJournalEntry(id: ProjectId, entry: ProjectJournalEntry, day: number): boolean {
  if (!entry || !Number.isSafeInteger(entry.finishedDay) || entry.finishedDay < 1 || entry.finishedDay > day) return false
  const story = entry.story
  if (entry.legacyResult !== undefined && (story !== null || !entry.legacyResult || typeof entry.legacyResult.message !== 'string' || !entry.legacyResult.message.trim() || !entry.legacyResult.actual || typeof entry.legacyResult.actual !== 'object' || Array.isArray(entry.legacyResult.actual) || !Object.entries(entry.legacyResult.actual).every(([key, value]) => ['money', 'sanity', 'motivation'].includes(key) && typeof value === 'number' && Number.isFinite(value)))) return false
  if (story === null) return true
  if (!story || !Number.isSafeInteger(story.startDay) || story.startDay < 1 || story.startDay > entry.finishedDay || !Number.isInteger(story.scenario) || story.scenario < 0 || story.scenario >= PROJECT_STORIES[id].length) return false
  const episodes = story.edition === 2 ? longStory(id) : undefined
  if (story.edition !== undefined && !((story.edition === 2 && !!episodes) || (story.edition === 3 && !!shortProjectChoice(id, story.scenario, 1)))) return false
  const length = episodes?.length ?? PROJECT_STORIES[id][story.scenario].days.length
  if (story.seen !== length || !story.actual || typeof story.actual !== 'object' || Array.isArray(story.actual) || !Object.entries(story.actual).every(([key, value]) => ['money', 'satiety', 'sanity', 'motivation'].includes(key) && typeof value === 'number' && Number.isFinite(value))) return false
  const options = (index: number) => episodes ? episodes[index]?.choices : story.edition === 3 ? shortProjectChoice(id, story.scenario, index)?.options : PROJECT_CHOICES[id]?.[index]
  if (story.choices !== undefined && (!story.choices || typeof story.choices !== 'object' || Array.isArray(story.choices) || !Object.entries(story.choices).every(([index, choice]) => Number.isInteger(Number(index)) && Number(index) >= 0 && Number(index) < length && options(Number(index))?.some((item) => item.label === choice)))) return false
  return !Array.from({ length }, (_, index) => index).some((index) => options(index) && !story.choices?.[index])
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
    !!state.projectCompletions && typeof state.projectCompletions === 'object' && !Array.isArray(state.projectCompletions) && Object.entries(state.projectCompletions).every(([id, n]) => PROJECT_IDS.includes(id as ProjectId) && Number.isInteger(n) && n! >= 0 && n! <= projectLimit(id as ProjectId)) &&
    !!state.projectIdeas && state.projectIdeas.day === state.day && Array.isArray(state.projectIdeas.ids) && state.projectIdeas.ids.length <= 3 && new Set(state.projectIdeas.ids).size === state.projectIdeas.ids.length && state.projectIdeas.ids.every((id) => PROJECT_IDS.includes(id)) &&
    !!state.projectWaits && typeof state.projectWaits === 'object' && !Array.isArray(state.projectWaits) && Object.entries(state.projectWaits).every(([id, n]) => PROJECT_IDS.includes(id as ProjectId) && Number.isSafeInteger(n) && n! >= 0) &&
    !!state.projectSeenScenarios && typeof state.projectSeenScenarios === 'object' && !Array.isArray(state.projectSeenScenarios) && Object.entries(state.projectSeenScenarios).every(([id, list]) => PROJECT_IDS.includes(id as ProjectId) && Array.isArray(list) && new Set(list).size === list.length && list.every((n) => Number.isInteger(n) && n >= 0 && n < PROJECT_STORIES[id as ProjectId].length)) &&
    !!state.projectJournal && typeof state.projectJournal === 'object' && !Array.isArray(state.projectJournal) && Object.entries(state.projectJournal).every(([id, list]) => PROJECT_IDS.includes(id as ProjectId) && Array.isArray(list) && list.length <= projectLimit(id as ProjectId) + (id === 'train-assistant' ? 1 : 0) && list.every((entry) => isValidJournalEntry(id as ProjectId, entry, state.day))) &&
    Object.entries(projects).every(([id, progress]) => {
      if (!PROJECT_IDS.includes(id as ProjectId) || !progress || typeof progress !== 'object' || !['started', 'deferred', 'completed'].includes(progress.status) || !Number.isInteger(progress.step)) return false
      const story = progress.story
      if (!story) return progress.status === 'completed' ? progress.step === 2 : progress.step >= 0 && progress.step < 2
      if (!Number.isInteger(story.scenario) || story.scenario < 0 || story.scenario >= PROJECT_STORIES[id as ProjectId].length || !Number.isSafeInteger(story.startDay) || story.startDay < 1 || story.startDay > state.day || !Number.isInteger(story.seen)) return false
      const episodes = story.edition === 2 ? longStory(id as ProjectId) : undefined
      if (story.edition !== undefined && !((story.edition === 2 && !!episodes) || (story.edition === 3 && !!shortProjectChoice(id as ProjectId, story.scenario, 1)))) return false
      const length = episodes?.length ?? PROJECT_STORIES[id as ProjectId][story.scenario].days.length
      if (story.seen < 0 || story.seen > length || (story.seen > 0 && (episodes ? episodes[story.seen - 1].day : story.seen) > state.day - story.startDay + 1) || progress.step < 0 || progress.step > 2) return false
      const options = (day: number) => episodes ? episodes[day]?.choices : story.edition === 3 ? shortProjectChoice(id as ProjectId, story.scenario, day)?.options : PROJECT_CHOICES[id as ProjectId]?.[day]
      if (story.choices !== undefined && (!story.choices || typeof story.choices !== 'object' || Array.isArray(story.choices) || !Object.entries(story.choices).every(([day, choice]) => Number.isInteger(Number(day)) && Number(day) >= 0 && Number(day) < story.seen && options(Number(day))?.some((option) => option.label === choice)))) return false
      if (Array.from({ length: story.seen }, (_, day) => day).some((day) => options(day) && !story.choices?.[day])) return false
      if (progress.status === 'completed') return progress.step === 2 && story.seen === length && !!story.actual && typeof story.actual === 'object' && !Array.isArray(story.actual) && Object.entries(story.actual).every(([key, value]) => ['money', 'satiety', 'sanity', 'motivation'].includes(key) && typeof value === 'number' && Number.isFinite(value))
      return story.seen < length && story.actual === null
    }) &&
    genericProjects(state) >= 0 &&
    Number.isInteger(state.actionsRemaining) &&
    state.actionsRemaining >= 0 && state.actionsRemaining <= ACTIONS_PER_DAY
  )
}
