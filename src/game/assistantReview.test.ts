import { describe, expect, it } from 'vitest'
import { claimAssistantJob, sendAssistantJob } from './assistant'
import { noteAssistantReport, openAssistantCorrection, requestAssistantCorrection, resolveAssistantReport } from './assistantReview'
import { withTrainedAssistant } from './assistantFixture'
import { createInitialGameState } from './state'
import { createEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'
import { finishDay, getDaySummary } from './day'

function ready(id: 'plan' | 'food', random: number) {
  const game = { ...withTrainedAssistant(createInitialGameState()), day: 12, projectIdeas: { day: 12, ids: [] }, sanity: 50, satiety: 50, motivation: 50 }
  const sent = sendAssistantJob(game, undefined, id, () => random)
  const next = { ...sent.game, day: 13, projectIdeas: { day: 13, ids: [] } }
  return claimAssistantJob(next, sent.job)
}
function persist(game: ReturnType<typeof ready>['game'], job: NonNullable<ReturnType<typeof ready>['job']>) {
  let raw: string | null = null
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
  expect(saveGame(game, () => storage, { ...createEventSession(), assistantJob: job })).toBe(true)
  const loaded = loadGame(() => storage)
  expect(loaded.kind).toBe('loaded')
  if (loaded.kind !== 'loaded') throw new Error('Ошибка восстановления')
  expect(loaded.events.assistantJob).toEqual(job)
  return loaded
}
describe('проверка отчёта помощника', () => {
  it('принимает правильный отчёт и применяет пользу однократно', () => {
    const opened = ready('food', 0)
    expect(opened.game.satiety).toBe(50)
    const resolved = resolveAssistantReport(opened.game, opened.job!)
    expect(resolved.game.satiety).toBe(58)
    expect(getDaySummary(finishDay(resolved.game)).endValues.satiety).toBe(58)
    expect(resolveAssistantReport(resolved.game, resolved.job).game).toBe(resolved.game)
    persist(resolved.game, resolved.job)
  })
  it('принятие ошибки даёт небольшое ограниченное последствие', () => {
    const opened = ready('food', 0.99)
    const resolved = resolveAssistantReport({ ...opened.game, sanity: 1 }, opened.job!)
    expect(resolved.game.sanity).toBe(0)
    expect(resolved.job.reviewChanges).toEqual({ sanity: -1 })
    expect(getDaySummary(finishDay(resolved.game)).endValues.sanity).toBe(0)
    expect(resolved.game.satiety).toBe(50)
    persist(resolved.game, resolved.job)
  })
  it('ошибочное замечание позволяет принять правильный отчёт', () => {
    const opened = ready('food', 0)
    const noted = noteAssistantReport(opened.job!)
    expect(requestAssistantCorrection(opened.game, noted)).toBe(noted)
    expect(resolveAssistantReport(opened.game, noted).game.satiety).toBe(58)
  })
  it('сохраняет замечание, бесплатное исправление, переход дня и готовый ответ', () => {
    const opened = ready('food', 0.99)
    persist(opened.game, opened.job!)
    const noted = noteAssistantReport(opened.job!)
    persist(opened.game, noted)
    expect(resolveAssistantReport(opened.game, noted).job).toBe(noted)
    const correcting = requestAssistantCorrection(opened.game, noted)
    expect(opened.game.actionsRemaining).toBe(4)
    persist(opened.game, correcting)
    expect(requestAssistantCorrection(opened.game, correcting)).toBe(correcting)
    expect(openAssistantCorrection(opened.game, correcting)).toBe(correcting)
    const next = { ...opened.game, day: 14, projectIdeas: { day: 14, ids: [] } }
    const corrected = openAssistantCorrection(next, correcting)
    persist(next, corrected)
    const resolved = resolveAssistantReport(next, corrected)
    expect(resolved.game.satiety).toBe(58)
    expect(resolved.game.actionsRemaining).toBe(4)
    persist(resolved.game, resolved.job)
  })
  it('не переигрывает закрытый отчёт старого формата и сохраняет покупки и проекты', () => {
    const game = { ...withTrainedAssistant(createInitialGameState()), day: 13, projectIdeas: { day: 13, ids: [] }, ownedItems: ['sofa' as const], money: 75 }
    const job = { id: 'food' as const, submittedDay: 12, actual: 8, reportId: 'food-sandwich', read: true }
    const raw = JSON.stringify({ version: 17, game, events: { ...createEventSession(), assistantJob: job } })
    const loaded = loadGame(() => ({ getItem: () => raw, setItem: () => { throw new Error('неожиданная запись') } }))
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') return
    expect(loaded.game.money).toBe(75)
    expect(loaded.game.ownedItems).toContain('sofa')
    expect(loaded.events.assistantJob).toEqual(job)
    expect(claimAssistantJob(loaded.game, loaded.events.assistantJob).game).toBe(loaded.game)
    expect(sendAssistantJob(loaded.game, loaded.events.assistantJob, 'plan', () => 0).game.actionsRemaining).toBe(4)
  })
})
