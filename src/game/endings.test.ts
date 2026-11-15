import { describe, expect, it } from 'vitest'
import { availableEndings, isValidEndingsSeen } from './endings'
import { createInitialGameState } from './state'
import { createEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'
import { finishDay, startNextDay } from './day'
import { advanceProject, nextProjectStory, projectStoryOptions } from './projects'

describe('завершения прохождения', () => {
  it('проверяет реальные покупки и завершённые проекты независимо от номера дня', () => {
    const game = createInitialGameState()
    expect(availableEndings({ ...game, day: 50 })).toEqual([])
    expect(availableEndings({ ...game, ownedItems: ['pillow'] })).toEqual([])
    const project = { ...game, projectCompletions: { 'balcony-garden': 1 } }
    expect(availableEndings(project)).toEqual([])
    expect(availableEndings({ ...project, ownedItems: ['pillow'] })).toEqual(['home'])
    const goose = { ...game, projectCompletions: { 'goose-owner': 1 } }
    expect(availableEndings(goose)).toEqual(['goose'])
    expect(availableEndings({ ...goose, ownedItems: ['pillow'] })).toEqual(['home', 'goose'])
  })

  it('не считает начатый или отложенный проект завершённым', () => {
    const game = { ...createInitialGameState(), ownedItems: ['pillow'] as const }
    for (const status of ['started', 'deferred'] as const) {
      expect(availableEndings({ ...game, ownedItems: [...game.ownedItems], projects: { 'goose-owner': { status, step: 1 } } })).toEqual([])
    }
  })

  it('открывает необычную историю последовательным прохождением проекта гуся', () => {
    let game = createInitialGameState(() => 0.99)
    for (let i = 0; i < 4 && !game.projectIdeas.ids.includes('goose-owner'); i++) game = startNextDay(finishDay(game), () => 0.99)
    expect(game.projectIdeas.ids).toContain('goose-owner')
    const start = advanceProject(game, 'goose-owner', 'start', () => 0)
    expect(start.success).toBe(true)
    game = advanceProject(advanceProject(start.state, 'goose-owner', 'step-0').state, 'goose-owner', 'step-1').state
    for (let day = 0; day < 13; day++) {
      if (day) game = startNextDay(finishDay(game), () => 0.99)
      const story = game.projects['goose-owner']!.story!
      if (nextProjectStory(game, 'goose-owner')) {
        const options = projectStoryOptions('goose-owner', story, story.seen)
        const result = advanceProject(game, 'goose-owner', 'story-next', () => 0, options?.[0].label)
        expect(result.success).toBe(true)
        game = result.state
      }
    }
    expect(game.projects['goose-owner']?.status).toBe('completed')
    expect(availableEndings(game)).toContain('goose')
  })

  it('сохраняет просмотры и открывает старый формат без догадок и перезаписи', () => {
    const game = createInitialGameState()
    let raw = JSON.stringify({ version: 24, game, events: createEventSession() })
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const before = raw
    expect(loadGame(() => storage).kind).toBe('loaded')
    expect(raw).toBe(before)
    const events = { ...createEventSession(), endingsSeen: ['home' as const] }
    expect(saveGame(game, () => storage, events)).toBe(true)
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game, events })
    expect(isValidEndingsSeen(['home', 'home'])).toBe(false)
    expect(isValidEndingsSeen(['unknown'])).toBe(false)
  })
})
