import { describe, expect, it } from 'vitest'
import { longStory } from '../content/projectStoriesV2'
import { advanceProject, nextProjectStory } from './projects'
import { chooseProjectIdeas, createInitialGameState, nextProjectWaits, PROJECT_IDS } from './state'
import { finishDay, startNextDay } from './day'
import { loadGame, saveGame } from '../storage/gameStorage'

describe('ритм проектов', () => {
  it('даёт приоритет идее, пропущенной три дня, и сохраняет подборку', () => {
    let game = createInitialGameState(() => 0.99)
    const id = PROJECT_IDS.find((item) => !game.projectIdeas.ids.includes(item))!
    for (let day = 2; day <= 4; day++) {
      game = startNextDay(finishDay(game), () => 0.99)
      if (day < 4) expect(game.projectIdeas.ids).not.toContain(id)
    }
    expect(game.projectIdeas.ids).toContain(id)
    expect(game.projectWaits[id]).toBe(0)
    let value: string | null = null
    const storage = { getItem: () => value, setItem: (_key: string, next: string) => { value = next } }
    expect(saveGame(game, () => storage)).toBe(true)
    expect(loadGame(() => storage)).toMatchObject({ kind: 'loaded', game: { projectIdeas: game.projectIdeas, projectWaits: game.projectWaits } })
  })

  it('не увеличивает ожидание отложенных и исчерпанных проектов', () => {
    const initial = createInitialGameState()
    const projects = { 'balcony-garden': { status: 'deferred' as const, step: 0 } }
    const counts = { 'recipe-book': 5 }
    const data = { ...initial, projects, projectCompletions: counts, projectWaits: { 'balcony-garden': 2, 'recipe-book': 2 } }
    const ideas = chooseProjectIdeas(data, () => 0)
    const waits = nextProjectWaits(data, ideas)
    expect(ideas.ids).not.toContain('balcony-garden')
    expect(ideas.ids).not.toContain('recipe-book')
    expect(waits['balcony-garden']).toBe(0)
    expect(waits['recipe-book']).toBe(0)
  })

  it('не повторяет известный завершённый сценарий при новом запуске', () => {
    const game = { ...createInitialGameState(), projectSeenScenarios: { 'balcony-garden': [0, 2, 3, 4] } }
    const started = advanceProject(game, 'balcony-garden', 'start', () => 0).state
    expect(started.projects['balcony-garden']?.story?.scenario).toBe(1)
  })

  it.each(['ideal-sofa', 'train-assistant', 'goose-owner'] as const)('%s ждёт пропущенные эпизоды и сохраняет выборы', (id) => {
    let game = { ...createInitialGameState(), money: 500 }
    game = advanceProject(game, id, 'start', () => 0).state
    game = advanceProject(game, id, 'step-0').state
    game = advanceProject(game, id, 'step-1').state
    for (let i = 0; i < 15; i++) game = startNextDay(finishDay(game), () => 0.99)
    const episodes = longStory(id)!
    expect(episodes).toHaveLength(5)
    for (let i = 0; i < episodes.length; i++) {
      expect(nextProjectStory(game, id)).toBeTruthy()
      if (episodes[i].choices) expect(advanceProject(game, id, 'story-next').success).toBe(false)
      const selected = episodes[i].choices?.[0]
      const previous = game
      game = advanceProject(game, id, 'story-next', () => 0, selected?.label).state
      expect(game.projects[id]?.story?.seen).toBe(i + 1)
      if (selected?.cost) expect(game.money).toBe(previous.money - selected.cost)
    }
    expect(game.projects[id]?.status).toBe('completed')
    expect(game.unfinishedProjects).toBe(0)
    expect(game.projectJournal[id]).toHaveLength(1)
    expect(advanceProject(game, id, 'story-next').state).toBe(game)
  })

  it('не списывает деньги за недоступный диван и оставляет бесплатный вариант', () => {
    let game = { ...createInitialGameState(), money: 0 }
    game = advanceProject(game, 'ideal-sofa', 'start', () => 0).state
    game = advanceProject(game, 'ideal-sofa', 'story-next').state
    game = startNextDay(finishDay(game), () => 0)
    game = startNextDay(finishDay(game), () => 0)
    const blocked = advanceProject(game, 'ideal-sofa', 'story-next', () => 0, 'Красивый диван — 20 монет')
    expect(blocked.success).toBe(false)
    expect(blocked.state).toBe(game)
    const free = advanceProject(game, 'ideal-sofa', 'story-next', () => 0, 'Диван соседа — бесплатно')
    expect(free.success).toBe(true)
    expect(free.state.money).toBe(0)
  })

  it('переносит версию 9 и продолжает старую длинную историю без перемотки', () => {
    const initial = createInitialGameState()
    const legacy = { ...initial, day: 6, unfinishedProjects: 1, projectIdeas: { day: 6, ids: [] }, projectCompletions: { 'balcony-garden': 2 }, projects: {
      'ideal-sofa': { status: 'started', step: 1, story: { scenario: 0, startDay: 1, seen: 5, actual: null, choices: { '3': 'Продолжить поиск' } } },
      'balcony-garden': { status: 'completed', step: 2, story: { scenario: 3, startDay: 1, seen: 5, actual: { sanity: 8, money: -10 } } },
    } }
    const raw = JSON.stringify({ version: 9, game: legacy, events: { history: { shownDay: null, shownCount: 0, lastShownByEvent: {}, completedEventIds: [], completedChoices: {} }, pending: null } })
    const storage = { getItem: () => raw, setItem: () => { throw new Error('неожиданная запись') } }
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('миграция')
    expect(loaded.game.projects['ideal-sofa']?.story?.seen).toBe(5)
    expect(nextProjectStory(loaded.game, 'ideal-sofa')).toContain('Диван найден')
    expect(loaded.game.projectCompletions['balcony-garden']).toBe(2)
    expect(loaded.game.projectSeenScenarios['balcony-garden']).toEqual([3])
    expect(loaded.game.projectJournal['balcony-garden']).toHaveLength(1)
    expect(loaded.game.unfinishedProjects).toBe(1)
  })
})
