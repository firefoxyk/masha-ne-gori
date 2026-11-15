import { describe, expect, it } from 'vitest'
import { chooseGoose, isValidGooseSession, openGoose } from './gooseInteraction'
import { createInitialGameState } from './state'
import { createEventSession, isValidEventSession } from './eventSession'
import { loadGame, saveGame } from '../storage/gameStorage'

describe('взаимодействие с гусём', () => {
  it.each([['talk', 3, 0, 0], ['treat', 0, 3, -5], ['search', 0, 2, 0]] as const)('применяет %s один раз и сохраняет результат', (id, sanity, motivation, money) => {
    const initial = { ...createInitialGameState(), sanity: 50, motivation: 50 }
    const opened = openGoose(initial)!
    const chosen = chooseGoose(initial, opened, id)
    expect(chosen.game.actionsRemaining).toBe(initial.actionsRemaining)
    expect(chosen.game.sanity).toBe(50 + sanity)
    expect(chosen.game.motivation).toBe(50 + motivation)
    expect(chosen.game.money).toBe(initial.money + money)
    expect(chooseGoose(chosen.game, chosen.session, id).game).toBe(chosen.game)
    let raw = ''
    const storage = { getItem: () => raw || null, setItem: (_: string, value: string) => { raw = value } }
    expect(saveGame(chosen.game, () => storage, { ...createEventSession(), goose: chosen.session })).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw Error('Не удалось восстановить')
    expect(loaded.events.goose).toEqual(chosen.session)
    expect(chooseGoose(loaded.game, loaded.events.goose!, id).game).toBe(loaded.game)
    expect(openGoose(loaded.game, { ...chosen.session, pending: null })?.pending).toBeNull()
  })
  it('объяснимо блокирует угощение без денег и ограничивает показатели', () => {
    const game = { ...createInitialGameState(), money: 4, sanity: 99 }
    const opened = openGoose(game)!
    expect(chooseGoose(game, opened, 'treat')).toEqual({ game, session: opened })
    expect(chooseGoose(game, opened, 'talk').game.sanity).toBe(100)
    expect(isValidGooseSession(opened, game)).toBe(true)
    expect(isValidGooseSession({ ...opened, usedDay: game.day + 1 }, game)).toBe(false)
  })
  it('не допускает одновременной открытой карточки и читает старое сохранение', () => {
    const game = createInitialGameState()
    const events = { ...createEventSession(), goose: openGoose(game)! }
    expect(isValidEventSession(events, game)).toBe(true)
    expect(isValidEventSession({ ...events, pending: { eventId: 'anything', choiceId: null, changes: null } }, game)).toBe(false)
    const old = JSON.stringify({ version: 20, game, events: createEventSession() })
    expect(loadGame(() => ({ getItem: () => old, setItem: () => {} })).kind).toBe('loaded')
    const next = { ...game, day: game.day + 1 }
    expect(openGoose(next, { usedDay: game.day, pending: null })?.usedDay).toBe(next.day)
  })
})
