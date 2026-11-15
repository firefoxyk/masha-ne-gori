import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, awardAchievements } from './achievements'
import { createInitialGameState } from './state'
import { createEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'

describe('достижения', () => {
  it('открываются один раз, в том числе несколько сразу', () => {
    const game = createInitialGameState()
    expect(game.achievements).toEqual([])
    expect(ACHIEVEMENTS).toHaveLength(5)
    const next = awardAchievements(game, 'care', 'goose', 'care')
    expect(next.achievements).toEqual(['care', 'goose'])
    expect(awardAchievements(next, 'care')).toBe(next)
    expect(game.achievements).toEqual([])
  })
  it('восстанавливает подтверждённые достижения из старой версии без повторных эффектов', () => {
    const original = { ...createInitialGameState(), money: 9, ownedItems: ['rocking-chair'] as const, projectCompletions: { 'balcony-garden': 1 } }
    let raw = JSON.stringify({ version: 21, game: original, events: createEventSession() })
    const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value } }
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw Error('invalid')
    expect(loaded.game.achievements).toEqual(['rocking-chair', 'project'])
    expect(loaded.game.money).toBe(9)
    expect(loaded.game.projectCompletions).toEqual(original.projectCompletions)
    expect(saveGame(loaded.game, () => storage, loaded.events)).toBe(true)
    expect(loadGame(() => storage)).toEqual(loaded)
    expect(createInitialGameState().achievements).toEqual([])
  })
  it('не угадывает заботу, проверку и встречу по старому сохранению', () => {
    const game = createInitialGameState()
    const raw = JSON.stringify({ version: 21, game, events: createEventSession() })
    const loaded = loadGame(() => ({ getItem: () => raw, setItem: () => {} }))
    expect(loaded.kind === 'loaded' && loaded.game.achievements).toEqual([])
  })
})
