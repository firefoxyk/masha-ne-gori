import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './state.ts'
import { createEventSession } from './eventSession.ts'
import { createOnboarding, isValidOnboarding, nextTip } from './onboarding.ts'
import { finishDay } from './day.ts'
import { loadGame, saveGame } from '../storage/gameStorage.ts'

describe('контекстные подсказки', () => {
  it('показывает знакомство, затем подсказки по одной в подходящий момент', () => {
    const game = createInitialGameState()
    const events = { ...createEventSession(), onboarding: createOnboarding() }
    expect(nextTip(game, events)).toBe('intro')
    events.onboarding.intro = true
    expect(nextTip(game, events)).toBeNull()
    expect(nextTip({ ...game, actionsRemaining: 4 }, events)).toBe('projects')
    expect(nextTip(finishDay(game), events)).toBe('shop')
    expect(nextTip(game, { ...events, storyQueue: [{ type: 'work', id: 'work-01' }] })).toBe('queue')
    expect(nextTip(game, createEventSession())).toBeNull()
  })
  it('проверяет данные и сохраняет закрытые подсказки вместе с очередью и покупками', () => {
    expect(isValidOnboarding({ intro: true })).toBe(false)
    const game = { ...createInitialGameState(), ownedItems: ['rocking-chair' as const] }
    const events = { ...createEventSession(), storyQueue: [{ type: 'work' as const, id: 'work-01' }], onboarding: { ...createOnboarding(), intro: true } }
    let raw = ''
    const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value } }
    expect(saveGame(game, () => storage, events)).toBe(true)
    expect(loadGame(() => storage)).toEqual({ kind: 'loaded', game, events })
    expect(createOnboarding().intro).toBe(false)
  })
  it('старую версию открывает без вступления и сохраняет все данные', () => {
    const game = { ...createInitialGameState(), achievements: ['care' as const], ownedItems: ['rocking-chair' as const] }
    const events = { ...createEventSession(), storyQueue: [{ type: 'work' as const, id: 'work-01' }] }
    const raw = JSON.stringify({ version: 23, game, events })
    const loaded = loadGame(() => ({ getItem: () => raw, setItem: () => { throw Error('unexpected write') } }))
    expect(loaded).toEqual({ kind: 'loaded', game, events })
    if (loaded.kind === 'loaded') expect(nextTip(loaded.game, loaded.events)).toBeNull()
  })
})
