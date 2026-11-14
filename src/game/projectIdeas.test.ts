import { describe, expect, it } from 'vitest'
import { longStory } from '../content/projectStoriesV2'
import { PROJECT_STORIES } from '../content/projectStories'
import { advanceProject, projectReason, projectStoryOptions } from './projects'
import { chooseProjectIdeas, createInitialGameState, projectLimit, PROJECT_IDS } from './state'
import { finishDay, startNextDay } from './day'
import { loadGame, saveGame } from '../storage/gameStorage'

describe('ежедневные идеи и длинные проекты', () => {
  it('выбирает не более трёх разных идей, сохраняет день и не подменяет начатое', () => {
    let game = createInitialGameState(() => 0)
    expect(game.projectIdeas.ids).toHaveLength(3)
    expect(new Set(game.projectIdeas.ids).size).toBe(3)
    const [first, ...rest] = game.projectIdeas.ids
    game = advanceProject(game, first, 'start', () => 0).state
    expect(game.projectIdeas.ids).toEqual(rest)
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(game, () => storage)).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('сохранение')
    expect(loaded.game.projectIdeas).toEqual(game.projectIdeas)
    game = advanceProject(loaded.game, first, 'defer').state
    const next = startNextDay(finishDay(game), () => 0.99)
    expect(next.projectIdeas.day).toBe(2)
    expect(next.projectIdeas.ids).not.toContain(first)
    expect(next.projects[first]?.status).toBe('deferred')
  })

  it('учитывает лимиты и случай, когда идей осталось мало', () => {
    const initial = createInitialGameState()
    const projectCompletions = Object.fromEntries(PROJECT_IDS.map((id) => [id, projectLimit(id)]))
    const exhausted = { ...initial, projectCompletions }
    expect(chooseProjectIdeas(exhausted).ids).toEqual([])
    expect(projectReason(exhausted, 'ideal-sofa', 'start')).toContain('лимит')
    const available = { ...exhausted, projectCompletions: { ...projectCompletions, 'balcony-garden': 4 } }
    expect(chooseProjectIdeas(available).ids).toEqual(['balcony-garden'])
    expect(projectReason(available, 'balcony-garden', 'start')).toBeNull()
    expect(projectReason(exhausted, 'balcony-garden', 'start')).toContain('лимит')
  })

  it.each(['ideal-sofa', 'train-assistant', 'goose-owner'] as const)('сохраняет выборы и финал проекта %s', (id) => {
    let game = { ...createInitialGameState(), money: 500 }
    game = advanceProject(game, id, 'start', () => .5).state
    game = advanceProject(game, id, 'step-0').state
    game = advanceProject(game, id, 'step-1').state
    const episodes = longStory(id)!
    for (let i = 0; i < episodes.length; i++) {
      while (game.day < episodes[i].day) game = startNextDay(finishDay(game), () => 0)
      const option = episodes[i].choices?.at(-1)?.label
      const result = advanceProject(game, id, 'story-next', () => 0, option)
      expect(result.success).toBe(true)
      if (id === 'train-assistant' && i === episodes.length - 1) expect(result.message).toContain('Давай сначала отдохнём')
      game = result.state
    }
    expect(game.projects[id]?.status).toBe('completed')
    expect(game.projectCompletions[id]).toBe(1)
    expect(game.unfinishedProjects).toBe(0)
    expect(advanceProject(game, id, 'restart').success).toBe(false)
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(game, () => storage)).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('сохранение')
    expect(loaded.game).toEqual(game)
    expect(advanceProject(loaded.game, id, 'story-next').state).toBe(loaded.game)
  })

  it('разрешает пять завершений обычного проекта и запрещает шестое', () => {
    const id = 'balcony-garden'
    let game = { ...createInitialGameState(), money: 1000, energy: 100 }
    const seen = new Set<number>()
    for (let run = 0; run < 5; run++) {
      game = { ...game, actionsRemaining: 5, energy: 100 }
      game = advanceProject(game, id, run === 0 ? 'start' : 'restart', () => 0).state
      seen.add(game.projects[id]!.story!.scenario)
      game = advanceProject(game, id, 'step-0').state
      game = advanceProject(game, id, 'step-1').state
      const length = PROJECT_STORIES[id][game.projects[id]!.story!.scenario].days.length
      for (let i = 0; i < length; i++) {
        if (i) game = startNextDay(finishDay(game), () => 0)
        game = advanceProject(game, id, 'story-next', () => 0, projectStoryOptions(id, game.projects[id]!.story!, i)?.[0].label).state
      }
      expect(game.projectCompletions[id]).toBe(run + 1)
    }
    expect(advanceProject(game, id, 'restart').success).toBe(false)
    expect(seen.size).toBe(5)
    expect(chooseProjectIdeas(game, () => 0).ids).not.toContain(id)
  })
})
