import { ASSISTANT_REPORTS } from '../content/assistantReports.ts'
import { assistantUnlocked } from './assistant.ts'
import type { AssistantJob } from './assistant.ts'
import type { GameState, ProjectId } from './state.ts'

export const DELEGATED_PROJECTS = {
  'balcony-garden': { job: 'work', money: 5 },
  'recipe-book': { job: 'food', money: 0 },
} as const
export type DelegatedProject = keyof typeof DELEGATED_PROJECTS

export function projectStepLocked(job: AssistantJob | undefined, game: GameState, id: ProjectId): boolean {
  const p = job?.project
  return !!p && p.id === id && !['resolved', 'done'].includes(job?.review ?? '') && game.projects[id]?.story?.startDay === p.startDay && (game.projectCompletions[id] ?? 0) === p.attempt
}

export function delegationReason(game: GameState, job: AssistantJob | undefined, id: DelegatedProject, legacyBusy = false): string | null {
  if (!assistantUnlocked(game)) return 'Сначала завершите обучение помощника.'
  const progress = game.projects[id]
  if (!progress || progress.status !== 'started' || progress.step !== 0 || !progress.story) return 'Поручить можно первый шаг начатого проекта.'
  if (projectStepLocked(job, game, id)) return 'Этот шаг уже поручен помощнику.'
  if (legacyBusy || (job && (job.actual === null || job.read === false || (job.reportId && !job.read)))) return 'Помощник занят другим поручением.'
  if (game.dayStatus !== 'active') return 'Игровой день завершён.'
  if (game.actionsRemaining < 1) return 'На сегодня действия закончились.'
  if (game.money < DELEGATED_PROJECTS[id].money) return `Не хватает монет: нужно ${DELEGATED_PROJECTS[id].money}.`
  return null
}

export function delegateProject(game: GameState, job: AssistantJob | undefined, id: DelegatedProject, random: () => number, legacyBusy = false): { game: GameState; job: AssistantJob | undefined } {
  if (delegationReason(game, job, id, legacyBusy)) return { game, job }
  const roll = random()
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new RangeError('Случайное число должно быть в диапазоне [0, 1)')
  const config = DELEGATED_PROJECTS[id]
  const reports = ASSISTANT_REPORTS.filter((report) => report.project === id)
  return { game: { ...game, actionsRemaining: game.actionsRemaining - 1, money: game.money - config.money }, job: { id: config.job, submittedDay: game.day, actual: null, read: false, review: 'waiting', reportId: reports[Math.floor(roll * reports.length)].id, project: { id, step: 0, startDay: game.projects[id]!.story!.startDay, attempt: game.projectCompletions[id] ?? 0 } } }
}
