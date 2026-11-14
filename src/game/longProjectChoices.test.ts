import { describe, expect, it } from 'vitest'
import { longStory } from '../content/projectStoriesV2'
import { advanceProject, nextProjectStory } from './projects'
import { finishDay, startNextDay } from './day'
import { createInitialGameState } from './state'
import { loadGame, saveGame } from '../storage/gameStorage'

const ids = ['ideal-sofa', 'train-assistant', 'goose-owner'] as const
const cases = ids.flatMap((id) => longStory(id)!.flatMap((episode, index) => (episode.choices ?? []).map((choice) => ({ id, index, choice }))))

describe('варианты в длинных проектах', () => {
  it.each(cases)('$id: выбор $choice.label даёт реакцию и не блокирует историю', ({ id, index, choice }) => {
    let game = { ...createInitialGameState(), money: 500 }
    game = advanceProject(game, id, 'start', () => 0).state
    game = advanceProject(game, id, 'step-0').state
    game = advanceProject(game, id, 'step-1').state
    for (let i = 0; i < 15; i++) game = startNextDay(finishDay(game))
    const episodes = longStory(id)!
    for (let i = 0; i < index; i++) game = advanceProject(game, id, 'story-next', () => 0, episodes[i].choices?.[0].label).state
    const result = advanceProject(game, id, 'story-next', () => 0, choice.label)
    expect(result.success).toBe(true)
    expect(result.message).toContain(choice.response)
    game = result.state
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(game, () => storage)).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('Сохранение не восстановлено')
    game = loaded.game
    expect(game.projects[id]?.story?.choices?.[index]).toBe(choice.label)
    for (let i = index + 1; i < episodes.length; i++) {
      expect(nextProjectStory(game, id)).toBeTruthy()
      const next = advanceProject(game, id, 'story-next', () => 0, episodes[i].choices?.[0].label)
      expect(next.success).toBe(true)
      game = next.state
    }
    expect(game.projects[id]?.status).toBe('completed')
    expect(game.unfinishedProjects).toBe(0)
    expect(advanceProject(game, id, 'story-next').state).toBe(game)
  })
})
