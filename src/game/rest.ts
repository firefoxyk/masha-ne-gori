import { REST_OPTIONS } from '../content/rest.ts'
import type { RestId } from '../content/rest.ts'
import { getActionUnavailableReason } from './actions.ts'
import { bonuses } from './shop.ts'
import { STAT_MAX } from './state.ts'
import type { GameState } from './state.ts'

export const SPECIAL_REST_CHANCE = 0.25
type RestResult = { id: RestId; line: number; energy: number; sanity: number }
export type RestSession = { pending: { result: RestResult | null } | null; last: Partial<Record<RestId, number>> }

export function createRestSession(): RestSession { return { pending: null, last: {} } }

export function startSpecialRest(game: GameState, rest: RestSession, random: number): { game: GameState; rest: RestSession; started: boolean } {
  if (rest.pending || getActionUnavailableReason(game, 'rest') || random >= SPECIAL_REST_CHANCE) return { game, rest, started: false }
  return { game: { ...game, actionsRemaining: game.actionsRemaining - 1 }, rest: { ...rest, pending: { result: null } }, started: true }
}

export function chooseRest(game: GameState, rest: RestSession, id: RestId, random: number): { game: GameState; rest: RestSession } {
  const option = REST_OPTIONS.find((item) => item.id === id)
  if (!rest.pending || rest.pending.result || !option || game.dayStatus !== 'active') return { game, rest }
  const candidates = option.lines.map((_, i) => i).filter((i) => i !== rest.last[id])
  const line = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random * candidates.length)))]
  const energy = Math.min(STAT_MAX, game.energy + option.energy + bonuses(game).rest) - game.energy
  const sanity = Math.min(STAT_MAX, game.sanity + option.sanity) - game.sanity
  return { game: { ...game, energy: game.energy + energy, sanity: game.sanity + sanity }, rest: { last: { ...rest.last, [id]: line }, pending: { result: { id, line, energy, sanity } } } }
}

export function isValidRestSession(value: unknown, game: GameState): value is RestSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const rest = value as RestSession
  if (!rest.last || typeof rest.last !== 'object' || Array.isArray(rest.last)) return false
  if (!Object.entries(rest.last).every(([id, line]) => REST_OPTIONS.some((option) => option.id === id && Number.isInteger(line) && line! >= 0 && line! < option.lines.length))) return false
  if (rest.pending === null) return true
  if (!rest.pending || typeof rest.pending !== 'object' || game.dayStatus !== 'active' || game.actionsRemaining >= 5) return false
  const result = rest.pending.result
  if (result === null) return true
  if (!result || typeof result !== 'object') return false
  const option = REST_OPTIONS.find((item) => item.id === result.id)
  return !!option && Number.isInteger(result.line) && result.line >= 0 && result.line < option.lines.length && rest.last[result.id] === result.line && Number.isFinite(result.energy) && result.energy >= 0 && result.energy <= game.energy && Number.isFinite(result.sanity) && result.sanity >= 0 && result.sanity <= game.sanity
}
