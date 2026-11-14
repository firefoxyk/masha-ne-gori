import { describe, expect, it } from 'vitest'
import { PROJECT_STORIES } from '../content/projectStories'
import { advanceProject, nextProjectStory, projectReason, projectStoryOptions } from './projects'
import { finishDay, startNextDay } from './day'
import { createInitialGameState, genericProjects, PROJECT_IDS } from './state'
import { loadGame, saveGame } from '../storage/gameStorage'
import { createEventSession } from './eventSession'

describe('истории проектов', () => {
  it.each(PROJECT_IDS.slice(0, 3).flatMap((id) => PROJECT_STORIES[id].map((story, scenario) => ({ id, story, scenario }))))('$id: сценарий $scenario сохраняет порядок и завершается один раз', ({ id, story, scenario }) => {
    let game = { ...createInitialGameState(), money: 500, unfinishedProjects: 2 }
    game = advanceProject(game, id, 'start', () => (scenario + 0.1) / PROJECT_STORIES[id].length).state
    expect(game.projects[id]?.story?.scenario).toBe(scenario)
    expect(genericProjects(game)).toBe(2)
    game = advanceProject(game, id, 'step-0').state
    game = advanceProject(game, id, 'step-1').state
    for (let i = 0; i < story.days.length; i++) {
      if (i) game = startNextDay(finishDay(game))
      expect(nextProjectStory(game, id)).toContain(story.days[i])
      const result = advanceProject(game, id, 'story-next', () => 0, projectStoryOptions(id, game.projects[id]!.story!, i)?.[0].label)
      expect(result.message).toContain(story.days[i])
      game = result.state
      expect(game.projects[id]?.story?.seen).toBe(i + 1)
      if (i < story.days.length - 1) expect(game.unfinishedProjects).toBe(3)
    }
    expect(game.projects[id]?.status).toBe('completed')
    expect(game.unfinishedProjects).toBe(2)
    expect(advanceProject(game, id, 'story-next').state).toBe(game)
    const restarted = advanceProject(game, id, 'restart', () => 0.9)
    if (PROJECT_STORIES[id].length === 5) {
      expect(restarted.state.projects[id]?.story?.scenario).not.toBe(scenario)
      expect(restarted.state.projects[id]?.story?.seen).toBe(0)
      expect(restarted.state.unfinishedProjects).toBe(3)
    } else expect(restarted.success).toBe(false)
  })

  it('сохраняет непрочитанные события при пропуске дней и не теряет отложенный проект', () => {
    let game = advanceProject(createInitialGameState(), 'recipe-book', 'start', () => 0).state
    game = advanceProject(game, 'recipe-book', 'defer').state
    for (let i = 0; i < 5; i++) game = startNextDay(finishDay(game))
    expect(game.unfinishedProjects).toBe(1)
    expect(nextProjectStory(game, 'recipe-book')).toBeNull()
    game = advanceProject(game, 'recipe-book', 'resume').state
    expect(nextProjectStory(game, 'recipe-book')).toBe(PROJECT_STORIES['recipe-book'][0].days[0])
    game = advanceProject(game, 'recipe-book', 'story-next').state
    expect(nextProjectStory(game, 'recipe-book')).toContain(PROJECT_STORIES['recipe-book'][0].days[1])
  })

  it('ограничивает отрицательный результат деньгами и положительный границей шкалы', () => {
    for (const [id, scenario, field, value] of [['recipe-book', 2, 'money', 0], ['recipe-book', 0, 'satiety', 99]] as const) {
      let game = { ...createInitialGameState(), money: 100 }
      game = advanceProject(game, id, 'start', () => (scenario + .1) / 5).state
      game = advanceProject(game, id, 'step-0').state
      game = advanceProject(game, id, 'step-1').state
      game = { ...game, [field]: value }
      for (let i = 0; i < PROJECT_STORIES[id][scenario].days.length; i++) {
        if (i) game = startNextDay(finishDay(game))
        game = advanceProject(game, id, 'story-next', () => 0, projectStoryOptions(id, game.projects[id]!.story!, i)?.[0].label).state
      }
      expect(game.projects[id]?.story?.actual?.[field]).toBe(field === 'money' ? 0 : 1)
    }
  })

  it('восстанавливает историю, покупки и события, а старые проекты продолжаются по старым правилам', () => {
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const legacy = { ...createInitialGameState(), unfinishedProjects: 4, ownedItems: ['plant'], projects: { 'balcony-garden': { status: 'started', step: 1 }, 'recipe-book': { status: 'deferred', step: 0 }, 'cozy-corner': { status: 'completed', step: 2 } } }
    raw = JSON.stringify({ version: 7, game: legacy, events: createEventSession() })
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('миграция')
    expect(genericProjects(loaded.game)).toBe(2)
    expect(loaded.game.ownedItems).toEqual(['plant'])
    expect(advanceProject(loaded.game, 'balcony-garden', 'step-1').state.projects['balcony-garden']?.status).toBe('completed')
    let game = advanceProject(loaded.game, 'cozy-corner', 'restart', () => .4).state
    game = advanceProject(game, 'cozy-corner', 'story-next').state
    expect(saveGame(game, () => storage, loaded.events)).toBe(true)
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game, events: loaded.events })
    expect(projectReason(game, 'cozy-corner', 'story-next')).toContain('нет нового')
  })

  it('независимо сохраняет несколько активных историй', () => {
    let game = { ...createInitialGameState(), money: 500 }
    game = advanceProject(game, 'balcony-garden', 'start', () => 0).state
    game = advanceProject(game, 'recipe-book', 'start', () => .3).state
    game = advanceProject(game, 'balcony-garden', 'story-next').state
    expect(game.projects['recipe-book']?.story?.seen).toBe(0)
    expect(game.projects['balcony-garden']?.story?.seen).toBe(1)
    expect(game.unfinishedProjects).toBe(2)
    game = startNextDay(finishDay(game))
    expect(nextProjectStory(game, 'balcony-garden')).toContain(PROJECT_STORIES['balcony-garden'][0].days[1])
    expect(nextProjectStory(game, 'recipe-book')).toBe(PROJECT_STORIES['recipe-book'][1].days[0])
  })

  it('восстанавливает историю перед финалом и после него без повторного результата', () => {
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    let game = { ...createInitialGameState(), money: 500, sanity: 50 }
    game = advanceProject(game, 'cozy-corner', 'start', () => 0).state
    game = advanceProject(game, 'cozy-corner', 'step-0').state
    game = advanceProject(game, 'cozy-corner', 'step-1').state
    for (let day = 0; day < 3; day++) {
      if (day) game = startNextDay(finishDay(game))
      game = advanceProject(game, 'cozy-corner', 'story-next', () => 0, projectStoryOptions('cozy-corner', game.projects['cozy-corner']!.story!, day)?.[0].label).state
    }
    game = startNextDay(finishDay(game))
    expect(saveGame(game, () => storage)).toBe(true)
    let loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('до финала')
    expect(nextProjectStory(loaded.game, 'cozy-corner')).toContain(PROJECT_STORIES['cozy-corner'][0].days[3])
    game = advanceProject(loaded.game, 'cozy-corner', 'story-next').state
    expect(game.sanity).toBe(56)
    expect(saveGame(game, () => storage)).toBe(true)
    loaded = loadGame(() => storage)
    if (loaded.kind !== 'loaded') throw new Error('после финала')
    expect(loaded.game).toEqual(game)
    expect(advanceProject(loaded.game, 'cozy-corner', 'story-next').state).toBe(loaded.game)
  })
})
