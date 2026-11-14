import { exampleEvents } from '../content/events.ts'
import { availableEventChoices, createEventHistory, recordEventCompleted, recordEventShown, selectEvent } from './eventSelection.ts'
import type { EventHistory } from './eventSelection.ts'
import type { ActionId } from './actions.ts'
import type { GameState } from './state.ts'

export interface EventSession {
  history: EventHistory
  pending: { eventId: string; choiceId: string | null } | null
}

export function createEventSession(): EventSession {
  return { history: createEventHistory(), pending: null }
}

export function eventAfterAction(session: EventSession, result: { state: GameState; success: boolean }, action: ActionId, random: () => number): EventSession {
  if (session.pending) return session
  const event = selectEvent(exampleEvents, result, action, session.history, random)
  if (!event) return session
  return { history: recordEventShown(session.history, event.id, result.state.day), pending: { eventId: event.id, choiceId: null } }
}

export function chooseEvent(session: EventSession, game: GameState, choiceId: string): EventSession {
  if (!session.pending || session.pending.choiceId !== null) return session
  const event = exampleEvents.find((item) => item.id === session.pending!.eventId)
  if (!event || !availableEventChoices(event, game).some((choice) => choice.id === choiceId)) return session
  return { history: recordEventCompleted(session.history, event.id), pending: { eventId: event.id, choiceId } }
}

export function continueEvent(session: EventSession): EventSession {
  if (!session.pending?.choiceId) return session
  return { ...session, pending: null }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
export function isValidEventSession(value: unknown, game: GameState): value is EventSession {
  if (!record(value) || !record(value.history)) return false
  const h = value.history
  if (!(h.shownDay === null || Number.isSafeInteger(h.shownDay) && (h.shownDay as number) >= 1 && (h.shownDay as number) <= game.day)) return false
  if (!Number.isInteger(h.shownCount) || (h.shownCount as number) < 0 || (h.shownCount as number) > 1 || (h.shownDay === null) !== (h.shownCount === 0)) return false
  if (!record(h.lastShownByEvent) || !Array.isArray(h.completedEventIds)) return false
  const ids = new Set(exampleEvents.map((event) => event.id as string))
  if (!Object.entries(h.lastShownByEvent).every(([id, day]) => ids.has(id) && Number.isSafeInteger(day) && (day as number) >= 1 && (day as number) <= game.day && h.shownDay !== null && (day as number) <= (h.shownDay as number))) return false
  if (!h.completedEventIds.every((id) => typeof id === 'string' && ids.has(id) && h.lastShownByEvent && Object.hasOwn(h.lastShownByEvent, id))) return false
  if (new Set(h.completedEventIds).size !== h.completedEventIds.length) return false
  if (value.pending === null) return true
  if (!record(value.pending) || typeof value.pending.eventId !== 'string' || game.dayStatus !== 'active') return false
  const event = exampleEvents.find((item) => item.id === (value.pending as { eventId: string }).eventId)
  if (!event || h.shownDay !== game.day || h.lastShownByEvent[event.id] !== game.day) return false
  if (value.pending.choiceId === null) return !h.completedEventIds.includes(event.id) || event.repeat === 'repeatable'
  return typeof value.pending.choiceId === 'string' && event.choices.some((choice) => choice.id === (value.pending as { choiceId: string }).choiceId) && h.completedEventIds.includes(event.id)
}
