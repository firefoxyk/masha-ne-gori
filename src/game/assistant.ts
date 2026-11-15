import type { GameState, ProjectStoryProgress } from './state.ts'
import { PROJECT_STORIES } from '../content/projectStories.ts'
import { longStory } from '../content/projectStoriesV2.ts'
import { ASSISTANT_REPORTS, reportsForJob } from '../content/assistantReports.ts'

export type AssistantTask = { submittedDay: number }
export const ASSISTANT_JOBS = {
  plan: { label: 'Помоги спланировать день', field: 'motivation', amount: 5, benefit: '+5 мотивации', lines: ['Начнём с одного дела и оставим время на отдых.', 'Одно дело, один отдых. План выжил!', 'Выбери одно дело и обязательно оставь время для себя.', 'Запланируй одно дело и время на отдых.'] },
  food: { label: 'Подскажи, что поесть', field: 'satiety', amount: 8, benefit: '+8 сытости', lines: ['Попробуй простой бутерброд с овощами.', 'Бутерброд: рецепт, который не просит созвон.', 'Приготовь что-нибудь простое и поешь спокойно.', 'Попробуй простой бутерброд.'] },
  work: { label: 'Помоги с рабочей задачей', field: 'money', amount: 8, benefit: '+8 монет', lines: ['Уточни задачу и выбери следующий маленький шаг.', 'Первый шаг: убедиться, что кнопка не убегает.', 'Разберём задачу на маленькие шаги. Ты справишься.', 'Выбери следующий небольшой рабочий шаг.'] },
  mood: { label: 'Подними настроение', field: 'sanity', amount: 6, benefit: '+6 кукухи', lines: ['Небольшой отдых тоже считается делом.', 'Гусь одобрил перерыв. Письменно он пока не умеет.', 'Ты уже многое сделала. Можно передохнуть.', 'Пауза — это тоже забота о себе.'] },
} as const
export type AssistantJobId = keyof typeof ASSISTANT_JOBS
export type AssistantJob = { id: AssistantJobId; submittedDay: number; actual: number | null; reportId?: string; read?: boolean; review?: 'waiting' | 'review' | 'noted' | 'correcting' | 'corrected' | 'resolved' | 'done'; correctionDay?: number; reviewChanges?: { sanity: number }; project?: { id: 'balcony-garden' | 'recipe-book'; step: 0; startDay: number; attempt: number } }

export function assistantStyle(game: GameState): 0 | 1 | 2 | 3 {
  const story = game.projects['train-assistant']?.story ?? game.projectJournal['train-assistant']?.at(-1)?.story
  const selected = story?.choices?.[story.edition === 2 ? '3' : '10']
  return selected === 'Спокойный' ? 0 : selected === 'Смешной' ? 1 : selected === 'Заботливый' ? 2 : 3
}

export function sendAssistantJob(game: GameState, job: AssistantJob | undefined, id: AssistantJobId, random: () => number = Math.random): { game: GameState; job: AssistantJob | undefined } {
  if (!assistantUnlocked(game) || !Object.hasOwn(ASSISTANT_JOBS, id) || game.dayStatus !== 'active' || game.actionsRemaining < 1 || (job && (job.actual === null || job.read === false || (job.reportId !== undefined && !job.read)))) return { game, job }
  const reports = reportsForJob(id)
  const pick = random()
  if (!Number.isFinite(pick) || pick < 0 || pick >= 1) throw new RangeError('Случайное число должно быть в диапазоне [0, 1)')
  return { game: { ...game, actionsRemaining: game.actionsRemaining - 1 }, job: { id, submittedDay: game.day, actual: null, reportId: reports[Math.floor(pick * reports.length)].id, read: false, review: 'waiting' } }
}

export function claimAssistantJob(game: GameState, job: AssistantJob | undefined): { game: GameState; job: AssistantJob | undefined } {
  if (!job || job.actual !== null || game.day <= job.submittedDay || game.dayStatus !== 'active') return { game, job }
  if (job.review === 'waiting') return { game: { ...game }, job: { ...job, review: 'review' } }
  if (job.review !== undefined) return { game, job }
  const item = ASSISTANT_JOBS[job.id]
  const value = Math.min(item.field === 'money' ? Number.MAX_VALUE : 100, game[item.field] + item.amount)
  return { game: { ...game, [item.field]: value }, job: { ...job, actual: value - game[item.field], read: false } }
}

export function isValidAssistantJob(value: unknown, game: GameState): value is AssistantJob {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const job = value as AssistantJob
  const stages = ['waiting', 'review', 'noted', 'correcting', 'corrected', 'resolved', 'done']
  if (job.review !== undefined && (!stages.includes(job.review) || !job.reportId || (job.review === 'done') !== (job.read === true) || (['resolved', 'done'].includes(job.review) !== (job.actual !== null)) || (job.review !== 'waiting' && game.day <= job.submittedDay))) return false
  if (job.correctionDay !== undefined && (!Number.isSafeInteger(job.correctionDay) || job.correctionDay < job.submittedDay || job.correctionDay > game.day)) return false
  if (['correcting', 'corrected'].includes(job.review ?? '') && job.correctionDay === undefined) return false
  if (job.reviewChanges !== undefined && (!job.reviewChanges || typeof job.reviewChanges.sanity !== 'number' || !Number.isFinite(job.reviewChanges.sanity) || job.reviewChanges.sanity < -3 || job.reviewChanges.sanity > 0)) return false
  if (job.project !== undefined) {
    const p = job.project
    if (!p || !['balcony-garden', 'recipe-book'].includes(p.id) || p.step !== 0 || !Number.isSafeInteger(p.startDay) || p.startDay < 1 || p.startDay > job.submittedDay || !Number.isSafeInteger(p.attempt) || p.attempt < 0) return false
    if (!ASSISTANT_REPORTS.some((report) => report.id === job.reportId && report.job === job.id && report.project === p.id)) return false
    if (job.review !== 'done' && job.review !== 'resolved') {
      const current = game.projects[p.id]
      if (!current || !['started', 'deferred'].includes(current.status) || current.story?.startDay !== p.startDay || (game.projectCompletions[p.id] ?? 0) !== p.attempt || current.step !== 0) return false
    }
  }
  return assistantUnlocked(game) && Object.hasOwn(ASSISTANT_JOBS, job.id) && (job.reportId === undefined || (typeof job.reportId === 'string' && (job.project ? ASSISTANT_REPORTS.some((report) => report.id === job.reportId && report.job === job.id && report.project === job.project?.id) : reportsForJob(job.id).some((report) => report.id === job.reportId)))) && (job.read === undefined || typeof job.read === 'boolean') && !(job.read && job.actual === null) && Number.isSafeInteger(job.submittedDay) && job.submittedDay >= 1 && job.submittedDay <= game.day && (job.actual === null || (typeof job.actual === 'number' && Number.isFinite(job.actual) && job.actual >= 0 && job.actual <= ASSISTANT_JOBS[job.id].amount && game.day > job.submittedDay))
}

function completedTraining(story: ProjectStoryProgress | null | undefined): boolean {
  if (!story || !story.actual) return false
  const length = story.edition === 2 ? longStory('train-assistant')!.length : PROJECT_STORIES['train-assistant'][story.scenario]?.days.length
  return !!length && story.seen === length
}

export function assistantUnlocked(game: GameState): boolean {
  const project = game.projects['train-assistant']
  return !!(project?.status === 'completed' && completedTraining(project.story)) || (game.projectJournal['train-assistant'] ?? []).some((entry) => completedTraining(entry.story))
}

export function ambiguousTraining(game: GameState): boolean {
  const project = game.projects['train-assistant']
  return !assistantUnlocked(game) && ((project?.status === 'completed' && !project.story) || (!project && (game.projectCompletions['train-assistant'] ?? 0) > 0))
}

export function assistantTaskReason(game: GameState, task: AssistantTask | undefined): string | null {
  if (!assistantUnlocked(game)) return 'Сначала завершите обучение помощника.'
  if (task) return 'Пробное поручение уже отправлено.'
  if (game.dayStatus !== 'active') return 'День уже завершён.'
  if (game.actionsRemaining < 1) return 'На сегодня действия закончились.'
  return null
}

export function sendAssistantTask(game: GameState, task: AssistantTask | undefined): { game: GameState; task: AssistantTask | undefined } {
  if (assistantTaskReason(game, task)) return { game, task }
  return { game: { ...game, actionsRemaining: game.actionsRemaining - 1 }, task: { submittedDay: game.day } }
}

export function isValidAssistantTask(value: unknown, game: GameState): value is AssistantTask {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const task = value as AssistantTask
  return assistantUnlocked(game) && Number.isSafeInteger(task.submittedDay) && task.submittedDay >= 1 && task.submittedDay <= game.day
}
