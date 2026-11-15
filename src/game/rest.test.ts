import { describe, expect, it } from 'vitest'
import { REST_OPTIONS } from '../content/rest'
import { loadGame, saveGame } from '../storage/gameStorage'
import { createEventSession } from './eventSession'
import { chooseRest, createRestSession, startSpecialRest } from './rest'
import { createInitialGameState } from './state'

describe('выбор отдыха', () => {
  it('показывает выбор с вероятностью 25% только при доступном действии', () => {
    const game = createInitialGameState()
    const session = createRestSession()
    expect(startSpecialRest(game, session, 0.25).started).toBe(false)
    const start = startSpecialRest(game, session, 0.249)
    expect(start.started).toBe(true)
    expect(start.game.actionsRemaining).toBe(game.actionsRemaining - 1)
    expect(start.game.energy).toBe(game.energy)
    expect(start.game.sanity).toBe(game.sanity)
    expect(startSpecialRest({ ...game, actionsRemaining: 0 }, session, 0).started).toBe(false)
    expect(startSpecialRest({ ...game, dayStatus: 'finished' }, session, 0).started).toBe(false)
  })

  it.each(REST_OPTIONS)('$id применяет один эффект, сохраняет бонусы и не тратит дополнительное действие', (option) => {
    const initial = { ...createInitialGameState(), energy: 20, sanity: 20, ownedItems: ['pillow'] as const }
    const game = { ...initial, ownedItems: [...initial.ownedItems] }
    const started = startSpecialRest(game, createRestSession(), 0)
    const chosen = chooseRest(started.game, started.rest, option.id, 0)
    expect(chosen.game.energy).toBe(20 + option.energy + 3)
    expect(chosen.game.sanity).toBe(20 + option.sanity)
    expect(chosen.game.actionsRemaining).toBe(4)
    expect(chosen.rest.pending?.result?.line).toBe(0)
    expect(chooseRest(chosen.game, chosen.rest, option.id, 0).game).toBe(chosen.game)
  })

  it('ограничивает фактическое восстановление и избегает повтора реплики', () => {
    const game = { ...createInitialGameState(), energy: 99, sanity: 99 }
    const start = startSpecialRest(game, createRestSession(), 0)
    const first = chooseRest(start.game, start.rest, 'grass', 0)
    expect(first.rest.pending?.result).toMatchObject({ energy: 1, sanity: 1, line: 0 })
    const next = startSpecialRest(first.game, { ...first.rest, pending: null }, 0)
    expect(chooseRest(next.game, next.rest, 'grass', 0).rest.pending?.result?.line).toBe(1)
    expect(REST_OPTIONS.every((option) => option.lines.length === 20)).toBe(true)
  })

  it('сохраняет выбор и результат без повторного применения', () => {
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const start = startSpecialRest(createInitialGameState(), createRestSession(), 0)
    const events = { ...createEventSession(), rest: start.rest }
    expect(saveGame(start.game, () => storage, events)).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded' || !loaded.events.rest) return
    const choice = chooseRest(loaded.game, loaded.events.rest, 'sleep', 0)
    expect(saveGame(choice.game, () => storage, { ...loaded.events, rest: choice.rest })).toBe(true)
    const again = loadGame(() => storage)
    expect(again.kind).toBe('loaded')
    if (again.kind === 'loaded' && again.events.rest) expect(chooseRest(again.game, again.events.rest, 'sleep', 0).game).toEqual(choice.game)
  })

  it('открывает прежнюю версию 11 с покупками и не принимает повреждённый выбор', () => {
    const game = { ...createInitialGameState(), ownedItems: ['pillow'] }
    let raw = JSON.stringify({ version: 11, game, events: createEventSession() })
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const old = loadGame(() => storage)
    expect(old.kind).toBe('loaded')
    if (old.kind !== 'loaded') return
    expect(old.game.ownedItems).toEqual(['pillow'])
    raw = JSON.stringify({ version: 12, game: old.game, events: { ...old.events, rest: { pending: { result: null }, last: { sleep: 100 } } } })
    expect(loadGame(() => storage)).toEqual({ kind: 'invalid' })
  })
})
