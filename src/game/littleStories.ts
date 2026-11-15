import { LITTLE_STORIES } from '../content/littleStories.ts'
import type { GameState } from './state.ts'
import { assistantUnlocked } from './assistant.ts'

export const LITTLE_STORY_CHANCE = 0.1
export type LittleStoryId = typeof LITTLE_STORIES[number]['id']
type ActiveStory = { id: LittleStoryId; choice: 0 | 1 | null; dueDay: number | null }
type PendingStory = { id: LittleStoryId; stage: 'start' | 'reaction' | 'ending' }
export type LittleStorySession = { recent: LittleStoryId[]; active: ActiveStory[]; pending: PendingStory | null }
export function createLittleStorySession(): LittleStorySession { return { recent: [], active: [], pending: null } }

export function eligibleLittleStories(session: LittleStorySession, game?: GameState): typeof LITTLE_STORIES[number][] {
  const available = LITTLE_STORIES.filter((story) => (!story.requiresAssistant || (game && assistantUnlocked(game))) && !session.active.some((active) => active.id === story.id))
  let recent = session.recent
  let filtered = available.filter((story) => !recent.includes(story.id))
  while (!filtered.length && recent.length) {
    recent = recent.slice(1)
    filtered = available.filter((story) => !recent.includes(story.id))
  }
  return filtered
}

export function maybeStartLittleStory(session: LittleStorySession, success: boolean, roll: number, selection: number, game?: GameState): LittleStorySession {
  if (!success || session.pending || session.active.length >= 2 || roll >= LITTLE_STORY_CHANCE) return session
  const eligible = eligibleLittleStories(session, game)
  if (!eligible.length) return session
  const story = eligible[Math.min(eligible.length - 1, Math.max(0, Math.floor(selection * eligible.length)))]
  return { recent: [...session.recent, story.id].slice(-10), active: [...session.active, { id: story.id, choice: null, dueDay: null }], pending: { id: story.id, stage: 'start' } }
}

export function chooseLittleStory(session: LittleStorySession, choice: 0 | 1, day: number): LittleStorySession {
  const pending = session.pending
  if (!pending || pending.stage !== 'start') return session
  const story = LITTLE_STORIES.find((item) => item.id === pending.id)!
  return { ...session, active: session.active.map((item) => item.id === story.id ? { ...item, choice, dueDay: day + story.delay } : item), pending: { id: story.id, stage: 'reaction' } }
}

export function surfaceLittleStory(session: LittleStorySession, day: number): LittleStorySession {
  if (session.pending) return session
  const ready = session.active.filter((item) => item.dueDay !== null && item.dueDay <= day).sort((a, b) => a.dueDay! - b.dueDay!)[0]
  return ready ? { ...session, pending: { id: ready.id, stage: 'ending' } } : session
}

export function continueLittleStory(session: LittleStorySession, day: number): LittleStorySession {
  if (!session.pending || session.pending.stage === 'start') return session
  const active = session.pending.stage === 'ending' ? session.active.filter((item) => item.id !== session.pending!.id) : session.active
  return surfaceLittleStory({ ...session, active, pending: null }, day)
}

export function knowsGooseName(game: GameState): boolean {
  const story = game.projects['goose-owner']?.story
  if (story && (story.edition === 2 ? story.seen >= 4 : story.seen >= 10)) return true
  return (game.projectJournal['goose-owner'] ?? []).some((entry) => !!entry.story && (entry.story.edition === 2 ? entry.story.seen >= 4 : entry.story.seen >= 10))
}

export function isValidLittleStorySession(value: unknown, game: GameState): value is LittleStorySession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const session = value as LittleStorySession
  const exists = (id: unknown) => LITTLE_STORIES.some((story) => story.id === id)
  if (!Array.isArray(session.recent) || session.recent.length > 10 || !session.recent.every(exists)) return false
  if (!Array.isArray(session.active) || session.active.length > 2 || new Set(session.active.map((item) => item?.id)).size !== session.active.length) return false
  if (!session.active.every((item) => item && exists(item.id) && ((item.choice === null && item.dueDay === null) || ((item.choice === 0 || item.choice === 1) && Number.isSafeInteger(item.dueDay) && item.dueDay! >= 2)))) return false
  if (session.pending === null) return !session.active.some((item) => item.choice === null)
  const pending = session.pending
  if (!pending || !exists(pending.id) || !['start', 'reaction', 'ending'].includes(pending.stage) || game.dayStatus !== 'active') return false
  const item = session.active.find((active) => active.id === pending.id)
  if (!item || session.active.some((active) => active.choice === null && active.id !== pending.id)) return false
  return pending.stage === 'start' ? item.choice === null : item.choice !== null && (pending.stage !== 'ending' || item.dueDay! <= game.day)
}
