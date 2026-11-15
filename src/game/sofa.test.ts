import { describe, expect, it } from 'vitest'
import { advanceProject } from './projects'
import { finishDay, startNextDay } from './day'
import { bonuses, hasSofa, purchase, purchaseReason } from './shop'
import { createInitialGameState } from './state'
import { loadGame, saveGame } from '../storage/gameStorage'
import { longStory } from '../content/projectStoriesV2'

describe('диван из проекта и магазина', () => {
  it.each([0, 1, 2])('завершает вариант %i без повторных покупочных эффектов', (selection) => {
    let game = { ...createInitialGameState(), money: 1000, sanity: 50, motivation: 50 }
    game = advanceProject(game, 'ideal-sofa', 'start', () => 0).state
    game = advanceProject(game, 'ideal-sofa', 'step-0').state
    game = advanceProject(game, 'ideal-sofa', 'step-1').state
    for (let day = 1; day < 10; day++) game = startNextDay(finishDay(game), () => 0.99)
    const episodes = longStory('ideal-sofa')!
    for (let i = 0; i < episodes.length; i++) {
      const selected = episodes[i].choices?.[i === 1 ? selection : 0]
      game = advanceProject(game, 'ideal-sofa', 'story-next', () => 0, selected?.label).state
    }
    expect(hasSofa(game)).toBe(true)
    expect(game.unfinishedProjects).toBe(0)
    expect(game.projectJournal['ideal-sofa']?.[0].story?.choices?.['1']).toBe(episodes[1].choices![selection].label)
    expect(game.ownedItems).not.toContain('sofa')
    expect(bonuses(game).rest).toBe(0)
    const finished = finishDay(game)
    expect(purchaseReason(finished, 'sofa')).toContain('Получено в проекте')
    expect(purchase(finished, 'sofa')).toEqual({ success: false, state: finished })
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(game, () => storage)).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind === 'loaded') expect(hasSofa(loaded.game)).toBe(true)
  })
  it('сохраняет купленный до проекта диван без дополнительных списаний и бонусов', () => {
    const bought = purchase(finishDay({ ...createInitialGameState(), money: 500 }), 'sofa').state
    const before = startNextDay(bought)
    const completed = { ...before, projects: { 'ideal-sofa': { status: 'completed' as const, step: 2 } } }
    expect(hasSofa(completed)).toBe(true)
    expect(completed.money).toBe(before.money)
    expect(bonuses(completed).rest).toBe(5)
    expect(purchaseReason(finishDay(completed), 'sofa')).toBe('Куплено')
  })
  it('учитывает старое завершение, не выдаёт диван незавершённому проекту', () => {
    const initial = createInitialGameState()
    const completed = { ...initial, projects: { 'ideal-sofa': { status: 'completed' as const, step: 2 } }, projectCompletions: { 'ideal-sofa': 1 } }
    const raw = JSON.stringify({ version: 9, game: completed, events: { history: { shownDay: null, shownCount: 0, lastShownByEvent: {}, completedEventIds: [], completedChoices: {} }, pending: null } })
    const loaded = loadGame(() => ({ getItem: () => raw, setItem: () => { throw new Error('запись при чтении') } }))
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind === 'loaded') {
      expect(hasSofa(loaded.game)).toBe(true)
      expect(loaded.game.money).toBe(initial.money)
      expect(bonuses(loaded.game).rest).toBe(0)
    }
    expect(hasSofa({ ...initial, projects: { 'ideal-sofa': { status: 'started', step: 1 } } })).toBe(false)
  })
})
