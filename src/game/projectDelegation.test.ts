import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './state'
import { withTrainedAssistant } from './assistantFixture'
import { advanceProject } from './projects'
import { claimAssistantJob, isValidAssistantJob } from './assistant'
import { delegateProject, delegationReason, projectStepLocked } from './projectDelegation'
import { noteAssistantReport, openAssistantCorrection, requestAssistantCorrection, resolveAssistantReport } from './assistantReview'
import { createEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'
import { eligibleEvents, createEventHistory } from './eventSelection'
import { exampleEvents } from '../content/events'

function started(id: 'balcony-garden' | 'recipe-book') {
  const initial = withTrainedAssistant(createInitialGameState())
  const game = { ...initial, day: 12, projectIdeas: { ...initial.projectIdeas, day: 12 }, money: 100 }
  return advanceProject(game, id, 'start', () => 0).state
}
function persist(game: ReturnType<typeof started>, job: NonNullable<ReturnType<typeof delegateProject>['job']>) {
  let raw = ''
  const storage = { getItem: () => raw || null, setItem: (_: string, value: string) => { raw = value } }
  expect(saveGame(game, () => storage, { ...createEventSession(), assistantJob: job })).toBe(true)
  const loaded = loadGame(() => storage)
  expect(loaded.kind).toBe('loaded')
  if (loaded.kind !== 'loaded') throw Error('Ошибка восстановления')
  expect(loaded.events.assistantJob).toEqual(job)
  return loaded
}
describe('шаг проекта, порученный помощнику', () => {
  it.each(['balcony-garden', 'recipe-book'] as const)('позволяет выполнить %s самостоятельно или поручить после обучения', (id) => {
    const game = started(id)
    expect(advanceProject(game, id, 'step-0').state.projects[id]?.step).toBe(1)
    expect(delegationReason(createInitialGameState(), undefined, id)).toMatch(/обучение/)
    const sent = delegateProject(game, undefined, id, () => 0)
    expect(sent.game.actionsRemaining).toBe(game.actionsRemaining - 1)
    expect(sent.game.money).toBe(game.money - (id === 'balcony-garden' ? 5 : 0))
    expect(projectStepLocked(sent.job, sent.game, id)).toBe(true)
    expect(delegateProject(sent.game, sent.job, id, () => 0).game).toBe(sent.game)
    persist(sent.game, sent.job!)
  })
  it.each([['balcony-garden', 0], ['balcony-garden', 0.99], ['recipe-book', 0], ['recipe-book', 0.99]] as const)('принимает отчёт %s ровно один раз; ошибка даёт последствие (%s)', (id, roll) => {
    const sent = delegateProject(started(id), undefined, id, () => roll)
    const tomorrow = { ...sent.game, day: sent.game.day + 1, projectIdeas: { ...sent.game.projectIdeas, day: sent.game.day + 1 } }
    const opened = claimAssistantJob(tomorrow, sent.job)
    persist(opened.game, opened.job!)
    const resolved = resolveAssistantReport(opened.game, opened.job!)
    expect(resolved.game.projects[id]?.step).toBe(1)
    expect(resolved.game.sanity).toBe(tomorrow.sanity - (roll ? 3 : 0))
    expect(resolveAssistantReport(resolved.game, resolved.job).game).toBe(resolved.game)
    persist(resolved.game, resolved.job)
  })
  it('сохраняет исправление и не продвигает отложенный проект до его возобновления', () => {
    const sent = delegateProject(started('recipe-book'), undefined, 'recipe-book', () => 0.99)
    const tomorrow = { ...sent.game, day: sent.game.day + 1, projectIdeas: { ...sent.game.projectIdeas, day: sent.game.day + 1 } }
    const opened = claimAssistantJob(tomorrow, sent.job)
    const deferred = advanceProject(opened.game, 'recipe-book', 'defer').state
    const noted = noteAssistantReport(opened.job!)
    const correcting = requestAssistantCorrection(deferred, noted)
    persist(deferred, correcting)
    const later = { ...deferred, day: deferred.day + 1, projectIdeas: { ...deferred.projectIdeas, day: deferred.day + 1 } }
    const corrected = openAssistantCorrection(later, correcting)
    expect(resolveAssistantReport(later, corrected).game).toBe(later)
    const resumed = advanceProject(later, 'recipe-book', 'resume').state
    const result = resolveAssistantReport(resumed, corrected)
    expect(result.game.projects['recipe-book']?.step).toBe(1)
    expect(result.game.sanity).toBe(resumed.sanity)
    persist(result.game, result.job)
  })
  it('не переносит ожидающий отчёт на другую попытку и не открывает событие до обучения', () => {
    const sent = delegateProject(started('recipe-book'), undefined, 'recipe-book', () => 0)
    expect(isValidAssistantJob(sent.job, { ...sent.game, projectCompletions: { ...sent.game.projectCompletions, 'recipe-book': 1 } })).toBe(false)
    const event = exampleEvents.find((item) => item.id === 'assistant-project-tea')!
    expect(eligibleEvents([event], createInitialGameState(), 'work', createEventHistory())).toHaveLength(0)
    expect(eligibleEvents([event], sent.game, 'work', createEventHistory())).toHaveLength(1)
  })
})
