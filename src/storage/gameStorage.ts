import { getDayValues, isValidGameState } from '../game/state.ts'
import type { GameState } from '../game/state.ts'
import { createEventSession, isValidEventSession } from '../game/eventSession.ts'
import type { EventSession } from '../game/eventSession.ts'

export const SAVE_KEY = 'masha-ne-gori.save'
const SAVE_VERSION = 3
type StorageProvider = () => Pick<Storage, 'getItem' | 'setItem'>
const browserStorage: StorageProvider = () => window.localStorage

export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'loaded'; game: GameState; events: EventSession }
  | { kind: 'invalid' }
  | { kind: 'unavailable' }

export function loadGame(getStorage: StorageProvider = browserStorage): LoadResult {
  let raw: string | null
  try {
    raw = getStorage().getItem(SAVE_KEY)
  } catch {
    return { kind: 'unavailable' }
  }
  if (raw === null) return { kind: 'empty' }
  try {
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { kind: 'invalid' }
    const record = data as Record<string, unknown>
    if ((record.version !== 1 && record.version !== 2 && record.version !== SAVE_VERSION) || !record.game || typeof record.game !== 'object' || Array.isArray(record.game)) return { kind: 'invalid' }
    const candidate = record.game as Record<string, unknown>
    if (!candidate.dayStart || typeof candidate.dayStart !== 'object' || Array.isArray(candidate.dayStart)) return { kind: 'invalid' }
    const game = (record.version === 1
      ? { ...candidate, ownedItems: [], consumablesBought: 0, dayEnd: candidate.dayStatus === 'finished' ? getDayValues(candidate as unknown as GameState) : null }
      : candidate) as unknown as GameState
    if (!isValidGameState(game)) return { kind: 'invalid' }
    const events = record.version === SAVE_VERSION ? record.events : createEventSession()
    if (!isValidEventSession(events, game)) return { kind: 'invalid' }
    return {
      kind: 'loaded',
      game: { ...getDayValues(game), day: game.day, dayStatus: game.dayStatus, actionsRemaining: game.actionsRemaining, dayStart: getDayValues(game.dayStart), dayEnd: game.dayEnd ? getDayValues(game.dayEnd) : null, ownedItems: [...game.ownedItems], consumablesBought: game.consumablesBought },
      events,
    }
  } catch {
    return { kind: 'invalid' }
  }
}

export function saveGame(game: GameState, getStorage: StorageProvider = browserStorage, events: EventSession = createEventSession()): boolean {
  try {
    getStorage().setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, game, events }))
    return true
  } catch {
    return false
  }
}
