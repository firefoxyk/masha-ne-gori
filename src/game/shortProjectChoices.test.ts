import { describe, expect, it } from 'vitest'
import { shortProjectChoice } from '../content/shortProjectChoices'
import { PROJECT_STORIES } from '../content/projectStories'
import { advanceProject, nextProjectStory } from './projects'
import { finishDay, startNextDay } from './day'
import { createInitialGameState, PROJECT_IDS } from './state'
import { createEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'

const cases = PROJECT_IDS.slice(0, 3).flatMap((id) => PROJECT_STORIES[id].flatMap((_, scenario) => [0, 1].map((option) => ({ id, scenario, option }))))

describe('выборы в коротких историях', () => {
  it.each(cases)('$id: сценарий $scenario, вариант $option сохраняется и влияет на финал', ({ id, scenario, option }) => {
    let game = { ...createInitialGameState(), money: 500 }
    game = advanceProject(game, id, 'start', () => (scenario + .1) / 5).state
    game = advanceProject(game, id, 'step-0').state
    game = advanceProject(game, id, 'step-1').state
    game = advanceProject(game, id, 'story-next').state
    game = startNextDay(finishDay(game))
    const choice = shortProjectChoice(id, scenario, 1)!
    expect(nextProjectStory(game, id)).toContain(choice.question)
    expect(advanceProject(game, id, 'story-next').state).toBe(game)
    const result = advanceProject(game, id, 'story-next', () => 0, choice.options[option].label)
    expect(result.message).toContain(choice.options[option].response)
    game = result.state
    expect(game.projects[id]?.story?.choices?.['1']).toBe(choice.options[option].label)
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(game, () => storage)).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('Сохранение не восстановлено')
    game = loaded.game
    const length = PROJECT_STORIES[id][scenario].days.length
    for (let i = 2; i < length; i++) {
      game = startNextDay(finishDay(game))
      const next = advanceProject(game, id, 'story-next')
      expect(next.success).toBe(true)
      if (i === length - 1) expect(next.message).toContain(choice.options[option].later)
      game = next.state
    }
    expect(game.projects[id]?.status).toBe('completed')
    expect(game.unfinishedProjects).toBe(0)
    expect(game.projectJournal[id]?.[0].story?.choices?.['1']).toBe(choice.options[option].label)
    expect(advanceProject(game, id, 'story-next').state).toBe(game)
  })

  it('старое прохождение версии 10 не получает пропущенный выбор задним числом', () => {
    const initial = createInitialGameState()
    const game = { ...initial, day: 3, unfinishedProjects: 1, projectIdeas: { day: 3, ids: [] }, projects: { 'recipe-book': { status: 'started', step: 2, story: { scenario: 0, startDay: 1, seen: 2, actual: null } } } }
    const raw = JSON.stringify({ version: 10, game, events: createEventSession() })
    const loaded = loadGame(() => ({ getItem: () => raw, setItem: () => { throw new Error('неожиданная запись') } }))
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('Миграция не удалась')
    expect(loaded.game.projects['recipe-book']?.story?.seen).toBe(2)
    const result = advanceProject(loaded.game, 'recipe-book', 'story-next')
    expect(result.success).toBe(true)
    expect(result.state.projects['recipe-book']?.status).toBe('completed')
  })
})
