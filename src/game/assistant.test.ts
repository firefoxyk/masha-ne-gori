import { describe, expect, it } from 'vitest'
import { exampleEvents } from '../content/events'
import { loadGame, saveGame } from '../storage/gameStorage'
import { assistantTaskReason, assistantUnlocked, sendAssistantTask } from './assistant'
import { withTrainedAssistant } from './assistantFixture'
import { createEventHistory, eligibleEvents, recordEventCompleted, recordEventShown } from './eventSelection'
import { createEventSession } from './eventSession'
import { advanceProject } from './projects'
import { createInitialGameState, isValidGameState } from './state'
import { createMealSession, chooseMeal, startSpecialMeal } from './meals'
import { createLittleStorySession, eligibleLittleStories } from './littleStories'

describe('обучение и игровой помощник', () => {
  it.each([0, 1, 2])('считает завершённым сценарий %i', (scenario) => {
    const game = withTrainedAssistant(createInitialGameState())
    const progress = game.projects['train-assistant']!
    const updated = { ...game, projects: { ...game.projects, 'train-assistant': { ...progress, story: { ...progress.story!, scenario } } } }
    expect(assistantUnlocked(updated)).toBe(true)
  })
  it('позволяет отложить обучение и открывает агента только после полного финала', () => {
    let game = createInitialGameState()
    expect(assistantUnlocked(game)).toBe(false)
    expect(assistantTaskReason(game, undefined)).toContain('обучение')
    game = advanceProject(game, 'train-assistant', 'start', () => 0).state
    game = advanceProject(game, 'train-assistant', 'defer').state
    expect(assistantUnlocked(game)).toBe(false)
    game = advanceProject(game, 'train-assistant', 'resume').state
    game = advanceProject(game, 'train-assistant', 'step-0').state
    game = advanceProject(game, 'train-assistant', 'step-1').state
    game = { ...game, day: 12, projectIdeas: { ...game.projectIdeas, day: 12 } }
    for (const choice of [undefined, 'Попросить спокойный план', 'Проверить рецепт', 'Спокойный'] as const) {
      expect(assistantUnlocked(game)).toBe(false)
      const result = advanceProject(game, 'train-assistant', 'story-next', () => 0, choice)
      expect(result.success).toBe(true)
      game = result.state
    }
    const final = advanceProject(game, 'train-assistant', 'story-next')
    expect(final.success).toBe(true)
    expect(final.message).toContain('Открыта панель ИИ-помощника')
    expect(assistantUnlocked(final.state)).toBe(true)
    expect(isValidGameState(final.state)).toBe(true)
    expect(advanceProject(final.state, 'train-assistant', 'story-next').state).toBe(final.state)
  })

  it('различает завершённую, начатую и неоднозначную старую историю', () => {
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const initial = createInitialGameState()
    const finished = { ...withTrainedAssistant(initial), day: 12, projectIdeas: { ...initial.projectIdeas, day: 12 } }
    raw = JSON.stringify({ version: 14, game: finished, events: createEventSession() })
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind === 'loaded') expect(assistantUnlocked(loaded.game)).toBe(true)
    const active = advanceProject(initial, 'train-assistant', 'start', () => 0).state
    raw = JSON.stringify({ version: 14, game: active, events: createEventSession() })
    const loadedActive = loadGame(() => storage)
    expect(loadedActive.kind).toBe('loaded')
    if (loadedActive.kind === 'loaded') expect(assistantUnlocked(loadedActive.game)).toBe(false)
    const ambiguous = { ...initial, projects: { 'train-assistant': { status: 'completed' as const, step: 2 } }, projectCompletions: { 'train-assistant': 1 }, projectJournal: { 'train-assistant': [{ finishedDay: 1, story: null }] } }
    raw = JSON.stringify({ version: 14, game: ambiguous, events: createEventSession() })
    const old = loadGame(() => storage)
    expect(old.kind).toBe('loaded')
    if (old.kind !== 'loaded') return
    expect(assistantUnlocked(old.game)).toBe(false)
    const restarted = advanceProject(old.game, 'train-assistant', 'restart', () => 0)
    expect(restarted.success).toBe(true)
    let retraining = advanceProject(restarted.state, 'train-assistant', 'step-0').state
    retraining = advanceProject(retraining, 'train-assistant', 'step-1').state
    retraining = { ...retraining, day: 12, projectIdeas: { ...retraining.projectIdeas, day: 12 } }
    for (const choice of [undefined, 'Попросить спокойный план', 'Проверить рецепт', 'Спокойный', undefined] as const) {
      const result = advanceProject(retraining, 'train-assistant', 'story-next', () => 0, choice)
      expect(result.success).toBe(true)
      retraining = result.state
    }
    expect(assistantUnlocked(retraining)).toBe(true)
    expect(retraining.projectCompletions['train-assistant']).toBe(1)
    expect(retraining.projectJournal['train-assistant']).toHaveLength(2)
    expect(isValidGameState(retraining)).toBe(true)
    const missing = { ...initial, projectCompletions: { 'train-assistant': 1 } }
    expect(assistantUnlocked(missing)).toBe(false)
    expect(advanceProject(missing, 'train-assistant', 'start', () => 0).success).toBe(true)
  })

  it('принимает поручение один раз и сохраняет его', () => {
    const initial = createInitialGameState()
    expect(sendAssistantTask(initial, undefined).game).toBe(initial)
    const game = { ...withTrainedAssistant(initial), day: 12, projectIdeas: { ...initial.projectIdeas, day: 12 } }
    const sent = sendAssistantTask(game, undefined)
    expect(sent.game.actionsRemaining).toBe(game.actionsRemaining - 1)
    expect(sendAssistantTask(sent.game, sent.task).game).toBe(sent.game)
    expect(assistantTaskReason({ ...game, actionsRemaining: 0 }, undefined)).toContain('действия')
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(sent.game, () => storage, { ...createEventSession(), assistantTask: sent.task })).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind === 'loaded') expect(loaded.events.assistantTask).toEqual({ submittedDay: 12 })
  })

  it('скрывает новые события до обучения, но сохраняет начатую ветку', () => {
    const initial = createInitialGameState()
    const before = eligibleEvents(exampleEvents, { ...initial, day: 2 }, 'work', createEventHistory())
    expect(before.some((event) => event.id.startsWith('assistant-'))).toBe(false)
    const after = eligibleEvents(exampleEvents, { ...withTrainedAssistant(initial), day: 2 }, 'work', createEventHistory())
    expect(after.some((event) => event.id === 'assistant-report')).toBe(true)
    const shown = recordEventShown(createEventHistory(), 'assistant-help-start', 1)
    const history = recordEventCompleted(shown, 'assistant-help-start', 'shopping', 1)
    expect(eligibleEvents(exampleEvents, { ...initial, day: 2 }, 'rest', history).some((event) => event.id === 'assistant-shopping')).toBe(true)
    expect(eligibleLittleStories(createLittleStorySession(), initial)).toHaveLength(40)
    expect(eligibleLittleStories(createLittleStorySession(), withTrainedAssistant(initial))).toHaveLength(50)
    const game = withTrainedAssistant(initial)
    const meal = startSpecialMeal(game, createMealSession(), 0)
    expect(chooseMeal(meal.game, meal.meal, 'cook', 0.9).meal.pending!.result!.line).toBe(18)
  })
})
