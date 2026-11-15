import { ASSISTANT_REPORTS, REPORT_REVIEW } from '../content/assistantReports.ts'
import { ASSISTANT_JOBS } from './assistant.ts'
import type { AssistantJob } from './assistant.ts'
import type { GameState } from './state.ts'

const getReport = (job: AssistantJob) => ASSISTANT_REPORTS.find((report) => report.id === job.reportId)

export function noteAssistantReport(job: AssistantJob): AssistantJob {
  if (job.review !== 'review' || !job.reportId || !REPORT_REVIEW[job.reportId]) return job
  return { ...job, review: 'noted' }
}

export function requestAssistantCorrection(game: GameState, job: AssistantJob): AssistantJob {
  if (game.dayStatus !== 'active' || job.review !== 'noted' || !job.reportId || !REPORT_REVIEW[job.reportId]?.correction) return job
  return { ...job, review: 'correcting', correctionDay: game.day }
}

export function openAssistantCorrection(game: GameState, job: AssistantJob): AssistantJob {
  if (game.dayStatus !== 'active' || job.review !== 'correcting' || job.correctionDay === undefined || game.day <= job.correctionDay) return job
  return { ...job, review: 'corrected' }
}

export function resolveAssistantReport(game: GameState, job: AssistantJob): { game: GameState; job: AssistantJob } {
  const report = getReport(job)
  if (game.dayStatus !== 'active' || !report || !['review', 'noted', 'corrected'].includes(job.review ?? '')) return { game, job }
  const isCorrected = job.review === 'corrected'
  const hasProblem = ['error', 'partial', 'misleading'].includes(report.outcome)
  // После обнаружения проблемы предложено исправление, а не принятие старого ответа.
  if (job.review === 'noted' && hasProblem) return { game, job }
  if (job.project) {
    const p = job.project
    const progress = game.projects[p.id]
    if (!progress || progress.status !== 'started' || progress.step !== p.step || progress.story?.startDay !== p.startDay || (game.projectCompletions[p.id] ?? 0) !== p.attempt) return { game, job }
    const sanity = hasProblem && !isCorrected ? Math.max(0, game.sanity - 3) : game.sanity
    return { game: { ...game, sanity, projects: { ...game.projects, [p.id]: { ...progress, step: 1 } } }, job: { ...job, review: 'resolved', actual: 0, ...(sanity !== game.sanity || (hasProblem && !isCorrected) ? { reviewChanges: { sanity: sanity - game.sanity } } : {}) } }
  }
  if (hasProblem && !isCorrected) {
    const sanity = Math.max(0, game.sanity - 3)
    return { game: { ...game, sanity }, job: { ...job, review: 'resolved', actual: 0, reviewChanges: { sanity: sanity - game.sanity } } }
  }
  const item = ASSISTANT_JOBS[job.id]
  const next = Math.min(item.field === 'money' ? Number.MAX_VALUE : 100, game[item.field] + item.amount)
  return { game: { ...game, [item.field]: next }, job: { ...job, review: 'resolved', actual: next - game[item.field] } }
}
