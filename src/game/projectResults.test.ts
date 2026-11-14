import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './state'
import { advanceProject } from './projects'
import { createEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'

describe('итоги прежних проектов', () => {
  it('сохраняет фактическую награду после завершения и не выдаёт её повторно', () => {
    const start = { ...createInitialGameState(), sanity: 99, motivation: 99, money: 10, unfinishedProjects: 1, projects: { 'balcony-garden': { status: 'started' as const, step: 1 } } }
    const result = advanceProject(start, 'balcony-garden', 'step-1')
    expect(result.success).toBe(true)
    expect(result.state.projectJournal['balcony-garden']?.[0].legacyResult).toEqual({ message: 'Зелень посажена. Осталось договориться с ней о поливе.', actual: { motivation: 1, sanity: 1 } })
    expect(result.state.money).toBe(5)
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(result.state, () => storage)).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('Сохранение не восстановлено')
    expect(loaded.game.projectJournal).toEqual(result.state.projectJournal)
    expect(advanceProject(loaded.game, 'balcony-garden', 'step-1').state).toBe(loaded.game)
  })

  it('оставляет неизвестный старый итог неизвестным', () => {
    const game = { ...createInitialGameState(), projects: { 'recipe-book': { status: 'completed', step: 2 } } }
    const raw = JSON.stringify({ version: 8, game, events: createEventSession() })
    const loaded = loadGame(() => ({ getItem: () => raw, setItem: () => { throw new Error('неожиданная запись') } }))
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('Миграция не удалась')
    expect(loaded.game.projectJournal['recipe-book']?.[0]).toEqual({ finishedDay: 1, story: null })
  })
})
