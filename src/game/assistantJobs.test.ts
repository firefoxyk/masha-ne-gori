import { describe, expect, it } from 'vitest'
import { ASSISTANT_JOBS, assistantStyle, claimAssistantJob, sendAssistantJob } from './assistant'
import type { AssistantJobId } from './assistant'
import { withTrainedAssistant } from './assistantFixture'
import { createInitialGameState } from './state'
import { createEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'
import { ASSISTANT_REPORTS, reportsForJob } from '../content/assistantReports'
import { resolveAssistantReport } from './assistantReview'

describe('новые поручения помощника', () => {
  it('содержит уникальные содержательные отчёты всех пяти видов', () => {
    expect(new Set(ASSISTANT_REPORTS.map((report) => report.id)).size).toBe(ASSISTANT_REPORTS.length)
    expect(new Set(ASSISTANT_REPORTS.map((report) => report.outcome))).toEqual(new Set(['correct', 'error', 'partial', 'limited', 'misleading']))
    for (const report of ASSISTANT_REPORTS) expect(report.request && report.answer && report.explanation).toBeTruthy()
    for (const id of Object.keys(ASSISTANT_JOBS) as AssistantJobId[]) {
      expect(reportsForJob(id).length).toBeGreaterThanOrEqual(2)
      expect(new Set(reportsForJob(id).map((report) => report.request)).size).toBe(1)
    }
  })
  it.each(Object.keys(ASSISTANT_JOBS) as AssistantJobId[])('%s стоит действие и выдаёт пользу на следующий день один раз', (id) => {
    const initial = createInitialGameState()
    expect(sendAssistantJob(initial, undefined, id).game).toBe(initial)
    const game = { ...withTrainedAssistant(initial), day: 12, projectIdeas: { day: 12, ids: [] }, satiety: 50, sanity: 50, motivation: 50 }
    const sent = sendAssistantJob(game, undefined, id, () => 0)
    expect(sent.game.actionsRemaining).toBe(4)
    expect(reportsForJob(id).some((report) => report.id === sent.job?.reportId)).toBe(true)
    expect(sendAssistantJob(sent.game, sent.job, id).game).toBe(sent.game)
    expect(claimAssistantJob(sent.game, sent.job).game).toBe(sent.game)
    const next = { ...sent.game, day: 13, projectIdeas: { day: 13, ids: [] } }
    const opened = claimAssistantJob(next, sent.job)
    expect(opened.job?.review).toBe('review')
    expect(opened.game[ASSISTANT_JOBS[id].field]).toBe(next[ASSISTANT_JOBS[id].field])
    const claimed = resolveAssistantReport(opened.game, opened.job!)
    expect(claimed.job?.actual).toBe(ASSISTANT_JOBS[id].amount)
    expect(claimAssistantJob(claimed.game, claimed.job).game).toBe(claimed.game)
    expect(sendAssistantJob(claimed.game, claimed.job, id).game).toBe(claimed.game)
    expect(sendAssistantJob(claimed.game, { ...claimed.job!, review: 'done', read: true }, id, () => 0).game.actionsRemaining).toBe(3)
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(claimed.game, () => storage, { ...createEventSession(), assistantJob: claimed.job })).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind === 'loaded') expect(loaded.events.assistantJob).toEqual(claimed.job)
  })
  it('сохраняет выбранный отчёт и старые поручения версии 16', () => {
    const game = { ...withTrainedAssistant(createInitialGameState()), day: 12, projectIdeas: { day: 12, ids: [] } }
    const sent = sendAssistantJob(game, undefined, 'plan', () => 0.99)
    expect(sent.job?.reportId).toBe('plan-overfilled')
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(sent.game, () => storage, { ...createEventSession(), assistantJob: sent.job })).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind === 'loaded') expect(loaded.events.assistantJob?.reportId).toBe('plan-overfilled')
    raw = JSON.stringify({ version: 16, game: sent.game, events: { ...createEventSession(), assistantJob: { id: 'food', submittedDay: 12, actual: null } } })
    const old = loadGame(() => storage)
    expect(old.kind).toBe('loaded')
    if (old.kind === 'loaded') {
      expect(old.events.assistantJob).toEqual({ id: 'food', submittedDay: 12, actual: null })
      const nextDay = { ...old.game, day: 13, projectIdeas: { day: 13, ids: [] } }
      const claimed = claimAssistantJob(nextDay, old.events.assistantJob)
      expect(claimed.job?.actual).not.toBeNull()
      expect(sendAssistantJob(claimed.game, claimed.job, 'work').game).toBe(claimed.game)
    }
  })
  it('учитывает три сохранённых стиля и не придумывает неизвестный', () => {
    const game = withTrainedAssistant(createInitialGameState())
    const progress = game.projects['train-assistant']!
    for (const [label, expected] of [['Спокойный', 0], ['Смешной', 1], ['Заботливый', 2], ['неизвестен', 3]] as const) {
      const modified = { ...game, projects: { ...game.projects, 'train-assistant': { ...progress, story: { ...progress.story!, choices: { ...progress.story!.choices, '3': label } } } } }
      expect(assistantStyle(modified)).toBe(expected)
      for (const job of Object.values(ASSISTANT_JOBS)) expect(job.lines[expected]).toBeTruthy()
    }
  })
  it('загружает прежнее пробное поручение из формата 15 без выдуманного результата', () => {
    const game = { ...withTrainedAssistant(createInitialGameState()), day: 12, projectIdeas: { day: 12, ids: [] } }
    const events = { ...createEventSession(), assistantTask: { submittedDay: 12 } }
    const raw = JSON.stringify({ version: 15, game, events })
    const loaded = loadGame(() => ({ getItem: () => raw, setItem: () => { throw new Error('неожиданная запись') } }))
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind === 'loaded') expect(loaded.events.assistantTask).toEqual({ submittedDay: 12 })
  })
})
