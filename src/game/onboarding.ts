import type { GameState } from './state.ts'
import type { EventSession } from './eventSession.ts'
import { ACTIONS_PER_DAY } from './state.ts'

export const TIP_IDS = ['intro', 'projects', 'shop', 'queue'] as const
export type TipId = typeof TIP_IDS[number]
export type Onboarding = Record<TipId, boolean>
export const createOnboarding = (): Onboarding => ({ intro: false, projects: false, shop: false, queue: false })

export function nextTip(game: GameState, events: EventSession): TipId | null {
  const hints = events.onboarding
  if (!hints) return null
  if (!hints.intro) return 'intro'
  if (game.dayStatus === 'finished') return hints.shop ? null : 'shop'
  if (events.storyQueue?.length && !hints.queue) return 'queue'
  if ((game.day > 1 || game.actionsRemaining < ACTIONS_PER_DAY) && !hints.projects) return 'projects'
  return null
}

export function isValidOnboarding(value: unknown): value is Onboarding {
  return !!value && typeof value === 'object' && !Array.isArray(value) && TIP_IDS.every(id => typeof (value as Onboarding)[id] === 'boolean') && Object.keys(value).every(id => TIP_IDS.includes(id as TipId))
}
