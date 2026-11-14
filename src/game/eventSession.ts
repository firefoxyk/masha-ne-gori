import { exampleEvents } from '../content/events.ts'
import { choiceUnavailableReason, createEventHistory, recordEventCompleted, recordEventShown, selectEvent } from './eventSelection.ts'
import type { EventHistory } from './eventSelection.ts'
import type { ActionId } from './actions.ts'
import { STAT_MAX, STAT_MIN } from './state.ts'
import type { DayValues, GameState } from './state.ts'
import { advanceProject } from './projects.ts'
import type { EventChoice } from './events.ts'

type EventChanges = Partial<DayValues> & { actionsRemaining?: number }

export interface EventSession {
  history: EventHistory
  pending: { eventId: string; choiceId: string | null; changes: EventChanges | null } | null
}

export function createEventSession(): EventSession {
  return { history: createEventHistory(), pending: null }
}

export function eventAfterAction(session: EventSession, result: { state: GameState; success: boolean }, action: ActionId, random: () => number): EventSession {
  if (session.pending) return session
  const event = selectEvent(exampleEvents, result, action, session.history, random)
  if (!event) return session
  return { history: recordEventShown(session.history, event.id, result.state.day), pending: { eventId: event.id, choiceId: null, changes: null } }
}

export function chooseEvent(session: EventSession, game: GameState, choiceId: string): { events: EventSession; game: GameState } {
  const unchanged = { events: session, game }
  if (!session.pending || session.pending.choiceId !== null) return unchanged
  const event = exampleEvents.find((item) => item.id === session.pending!.eventId)
  const choice: EventChoice | undefined = event?.choices.find((item) => item.id === choiceId)
  if (!event || !choice || choiceUnavailableReason(choice, game)) return unchanged
  const started = choice.projectStart ? advanceProject(game, choice.projectStart, 'start') : null
  if (started && !started.success) return unchanged
  const next = { ...(started?.state ?? game) }
  const changes: EventChanges = {}
  const fields: (keyof DayValues)[] = ['energy', 'satiety', 'sanity', 'motivation', 'money', 'unfinishedProjects']
  for (const field of fields) {
    const delta = (choice.effects as Partial<DayValues>)[field] ?? 0
    const max = field === 'money' ? Number.MAX_VALUE : field === 'unfinishedProjects' ? Number.MAX_SAFE_INTEGER : STAT_MAX
    next[field] = Math.min(max, Math.max(STAT_MIN, next[field] + delta))
    const actual = next[field] - game[field]
    if (actual !== 0) changes[field] = actual
  }
  if (next.actionsRemaining !== game.actionsRemaining) changes.actionsRemaining = next.actionsRemaining - game.actionsRemaining
  return { game: next, events: { history: recordEventCompleted(session.history, event.id, choiceId, game.day), pending: { eventId: event.id, choiceId, changes } } }
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
  if (!record(h.completedChoices)) return false
  for (const [id, completion] of Object.entries(h.completedChoices)) {
    const event = exampleEvents.find((item) => item.id === id)
    if (!event || !h.completedEventIds.includes(id) || !record(completion) || typeof completion.choiceId !== 'string' || !event.choices.some((choice) => choice.id === completion.choiceId) || !Number.isSafeInteger(completion.day) || (completion.day as number) < 1 || (completion.day as number) > game.day || (completion.day as number) > (h.lastShownByEvent[id] as number)) return false
  }
  if (value.pending === null) return true
  if (!record(value.pending) || typeof value.pending.eventId !== 'string' || game.dayStatus !== 'active') return false
  const event = exampleEvents.find((item) => item.id === (value.pending as { eventId: string }).eventId)
  if (!event || h.shownDay !== game.day || h.lastShownByEvent[event.id] !== game.day) return false
  const changes = value.pending.changes
  if (value.pending.choiceId === null) return changes === null && (!h.completedEventIds.includes(event.id) || event.repeat === 'repeatable')
  if (changes !== null && (!record(changes) || !Object.entries(changes).every(([field, delta]) => ['energy', 'satiety', 'sanity', 'motivation', 'money', 'unfinishedProjects', 'actionsRemaining'].includes(field) && typeof delta === 'number' && Number.isFinite(delta) && (!['unfinishedProjects', 'actionsRemaining'].includes(field) || Number.isSafeInteger(delta))))) return false
  const selected: EventChoice | undefined = event.choices.find((choice) => choice.id === (value.pending as { choiceId: string }).choiceId)
  if (!selected || !h.completedEventIds.includes(event.id)) return false
  if (selected.projectStart) {
    const project = game.projects[selected.projectStart]
    return project?.status === 'started' && project.step === 0 && record(changes) && changes.actionsRemaining === -1 && changes.unfinishedProjects === 1
  }
  return !record(changes) || changes.actionsRemaining === undefined
}
