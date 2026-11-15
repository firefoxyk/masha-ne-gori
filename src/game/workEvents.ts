import { workEvents } from '../content/workEvents.ts'
import { assistantUnlocked } from './assistant.ts'
import { choiceUnavailableReason } from './eventSelection.ts'
import type { DayValues, GameState } from './state.ts'

export type WorkSession = { recent: string[]; pending: { eventId: string; choiceId: string | null; changes: Partial<DayValues> | null } | null }
export function createWorkSession(): WorkSession { return { recent: [], pending: null } }
export function selectWorkEvent(session: WorkSession, game: GameState, success: boolean, roll: number, pick: number): WorkSession {
  if (!success || session.pending || roll >= 0.2) return session
  const eligible = workEvents.filter((event) => !event.requiresAssistant || assistantUnlocked(game))
  let recent = session.recent
  let candidates = eligible.filter((event) => !recent.includes(event.id))
  while (!candidates.length && recent.length) { recent = recent.slice(1); candidates = eligible.filter((event) => !recent.includes(event.id)) }
  if (!candidates.length) return session
  const event = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(pick * candidates.length)))]
  return { recent: [...recent, event.id].slice(-10), pending: { eventId: event.id, choiceId: null, changes: null } }
}
export function chooseWorkEvent(session: WorkSession, game: GameState, id: string): { session: WorkSession; game: GameState } {
  const pending = session.pending
  const event = workEvents.find((item) => item.id === pending?.eventId)
  const choice = event?.choices.find((item) => item.id === id)
  if (!pending || pending.choiceId || game.dayStatus !== 'active' || !choice || choiceUnavailableReason(choice, game)) return { session, game }
  const next = { ...game }
  const changes: Partial<DayValues> = {}
  for (const [key, delta] of Object.entries(choice.effects) as [keyof DayValues, number][]) {
    next[key] = Math.max(0, Math.min(key === 'money' || key === 'unfinishedProjects' ? Number.MAX_SAFE_INTEGER : 100, next[key] + delta))
    if (next[key] !== game[key]) changes[key] = next[key] - game[key]
  }
  return { game: next, session: { ...session, pending: { ...pending, choiceId: id, changes } } }
}
export function isValidWorkSession(value: unknown, game: GameState): value is WorkSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const session = value as WorkSession
  if (!Array.isArray(session.recent) || session.recent.length > 10 || new Set(session.recent).size !== session.recent.length || !session.recent.every((id) => workEvents.some((event) => event.id === id))) return false
  if (session.pending === null) return true
  const pending = session.pending
  if (!pending || game.dayStatus !== 'active' || !session.recent.includes(pending.eventId)) return false
  const event = workEvents.find((item) => item.id === pending.eventId)
  if (!event || (event.requiresAssistant && !assistantUnlocked(game))) return false
  if (pending.choiceId === null) return pending.changes === null
  if (!event.choices.some((choice) => choice.id === pending.choiceId) || !pending.changes || typeof pending.changes !== 'object' || Array.isArray(pending.changes)) return false
  return Object.entries(pending.changes).every(([field, n]) => ['energy', 'satiety', 'sanity', 'motivation', 'money', 'unfinishedProjects'].includes(field) && typeof n === 'number' && Number.isFinite(n))
}
