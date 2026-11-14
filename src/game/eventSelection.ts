import type { ActionId } from './actions'
import type { EventChoice, EventCondition, GameEvent } from './events'
import type { GameState } from './state'

// Временные настройки для будущих игровых проб.
export const EVENT_RULES = { chance: 0.5, maxPerDay: 1, repeatCooldownDays: 2 } as const

/** Отдельная история: пока не включена в GameState или сохранение. */
export interface EventHistory {
  shownDay: number | null
  shownCount: number
  lastShownByEvent: Record<string, number>
  completedEventIds: string[]
}

export function createEventHistory(): EventHistory {
  return { shownDay: null, shownCount: 0, lastShownByEvent: {}, completedEventIds: [] }
}

export function conditionsMatch(conditions: readonly EventCondition[], state: GameState): boolean {
  return conditions.every(({ field, min, max }) =>
    (min === undefined || state[field] >= min) && (max === undefined || state[field] <= max),
  )
}

export function availableEventChoices(event: GameEvent, state: GameState): EventChoice[] {
  return event.choices.filter((choice) => conditionsMatch(choice.conditions ?? [], state))
}

/** Чистый отбор: не записывает ни показ, ни завершение. */
export function eligibleEvents(events: readonly GameEvent[], state: GameState, action: ActionId, history: EventHistory): GameEvent[] {
  if (state.dayStatus !== 'active' || (history.shownDay === state.day && history.shownCount >= EVENT_RULES.maxPerDay)) return []
  return events.filter((event) => {
    if (event.trigger.type === 'after_action' && event.trigger.action !== action) return false
    if (!conditionsMatch(event.conditions, state) || availableEventChoices(event, state).length === 0) return false
    if (event.repeat === 'once' && history.completedEventIds.includes(event.id)) return false
    const lastDay = history.lastShownByEvent[event.id]
    if (event.repeat === 'repeatable' && lastDay !== undefined && state.day - lastDay <= EVENT_RULES.repeatCooldownDays) return false
    return true
  })
}

type ActionResult = { success: boolean; state: GameState }
type RandomSource = () => number

function draw(random: RandomSource): number {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Случайное число должно быть в диапазоне [0, 1)')
  return value
}

/** Рассматривает только успешное действие и его состояние после выполнения. */
export function selectEvent(events: readonly GameEvent[], result: ActionResult, action: ActionId, history: EventHistory, random: RandomSource = Math.random): GameEvent | null {
  if (!result.success) return null
  const eligible = eligibleEvents(events, result.state, action, history)
  if (eligible.length === 0 || draw(random) >= EVENT_RULES.chance) return null
  return eligible.length === 1 ? eligible[0] : eligible[Math.floor(draw(random) * eligible.length)]
}

/** Вызвать только когда карточка действительно показана игроку. */
export function recordEventShown(history: EventHistory, eventId: string, day: number): EventHistory {
  return {
    ...history,
    shownDay: day,
    shownCount: history.shownDay === day ? history.shownCount + 1 : 1,
    lastShownByEvent: { ...history.lastShownByEvent, [eventId]: day },
  }
}

/** Вызвать после фактического завершения показанного события, а не при отборе. */
export function recordEventCompleted(history: EventHistory, eventId: string): EventHistory {
  if (history.lastShownByEvent[eventId] === undefined || history.completedEventIds.includes(eventId)) return history
  return { ...history, completedEventIds: [...history.completedEventIds, eventId] }
}
