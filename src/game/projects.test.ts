import { describe, expect, it } from 'vitest'
import { advanceProject, projectReason, PROJECTS } from './projects'
import { createInitialGameState, genericProjects, isValidGameState } from './state'
import { finishDay, getDaySummary, startNextDay } from './day'
import { choiceUnavailableReason, createEventHistory, recordEventShown } from './eventSelection'
import { chooseEvent, createEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'
import type { GameState } from './state'

const id = 'balcony-garden'
const run = (game: GameState, command: 'start' | 'step-0' | 'step-1' | 'defer' | 'resume') => advanceProject(game, id, command).state

describe('проекты Маши', () => {
  it.each(PROJECTS.map((project) => project.id))('начинает, продвигает и завершает %s один раз', (projectId) => {
    const original = createInitialGameState()
    const started = advanceProject(original, projectId, 'start').state
    expect(started.actionsRemaining).toBe(4)
    expect(started.unfinishedProjects).toBe(1)
    expect(genericProjects(started)).toBe(0)
    const first = advanceProject(started, projectId, 'step-0').state
    expect(advanceProject(first, projectId, 'step-0').state).toBe(first)
    const completed = advanceProject(first, projectId, 'step-1').state
    expect(completed.projects[projectId]).toEqual({ status: 'completed', step: 2 })
    expect(completed.unfinishedProjects).toBe(0)
    expect(advanceProject(completed, projectId, 'step-1').state).toBe(completed)
    expect(isValidGameState(completed)).toBe(true)
    expect(original.projects).toEqual({})
  })

  it('не списывает действия и ресурсы при нехватке, позволяет отложить и вернуться', () => {
    const started = run(createInitialGameState(), 'start')
    for (const game of [{ ...started, energy: 4 }, { ...started, money: 4 }, { ...started, actionsRemaining: 0 }]) {
      expect(projectReason(game, id, 'step-0')).not.toBeNull()
      expect(advanceProject(game, id, 'step-0').state).toBe(game)
    }
    expect(advanceProject({ ...started, actionsRemaining: 0, projects: {} }, id, 'start').success).toBe(false)
    const deferred = run(started, 'defer')
    expect(deferred.projects[id]?.status).toBe('deferred')
    expect(deferred.unfinishedProjects).toBe(1)
    expect(run(deferred, 'resume').projects[id]?.status).toBe('started')
  })

  it('переносит прогресс на следующий день и учитывает последний ход в итогах', () => {
    const started = run(run(createInitialGameState(), 'start'), 'step-0')
    const nextDay = startNextDay(finishDay(started))
    expect(nextDay.projects).toEqual(started.projects)
    const last = run({ ...nextDay, actionsRemaining: 1 }, 'step-1')
    expect(last.actionsRemaining).toBe(0)
    const summary = getDaySummary(finishDay(last))
    expect(summary.changes.energy).toBe(-5)
    expect(summary.changes.money).toBe(-5)
    expect(summary.changes.unfinishedProjects).toBe(-1)
  })

  it('события могут тратить только обобщённые проекты', () => {
    const started = run(createInitialGameState(), 'start')
    const choice = { id: 'finish', text: 'Завершить', effects: { unfinishedProjects: -1 }, result: 'Готово' }
    expect(choiceUnavailableReason(choice, started)).toContain('обобщённых')
    const withGeneric = { ...started, unfinishedProjects: 2 }
    const events = { ...createEventSession(), history: recordEventShown(createEventHistory(), 'almost-done', 1), pending: { eventId: 'almost-done', choiceId: null, changes: null } }
    const chosen = chooseEvent(events, withGeneric, 'finish')
    expect(chosen.game.unfinishedProjects).toBe(1)
    expect(chosen.game.projects).toEqual(started.projects)
    expect(genericProjects(chosen.game)).toBe(0)
    expect(chooseEvent(events, started, 'finish').game).toBe(started)
  })

  it('восстанавливает шаг, покупки и активное событие, а старое число не теряется', () => {
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const old = { ...createInitialGameState(), unfinishedProjects: 3, ownedItems: ['pillow'] }
    raw = JSON.stringify({ version: 5, game: old, events: createEventSession() })
    const migrated = loadGame(() => storage)
    expect(migrated.kind).toBe('loaded')
    if (migrated.kind !== 'loaded') throw new Error('ошибка миграции')
    expect(genericProjects(migrated.game)).toBe(3)
    const game = run(migrated.game, 'start')
    const events = { ...createEventSession(), history: recordEventShown(createEventHistory(), 'assistant-report', 1), pending: { eventId: 'assistant-report', choiceId: null, changes: null } }
    expect(saveGame(game, () => storage, events)).toBe(true)
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game, events })
    expect(game.ownedItems).toEqual(['pillow'])
    expect(game.unfinishedProjects).toBe(4)
  })
})
