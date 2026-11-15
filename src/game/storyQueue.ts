import { LITTLE_STORIES } from '../content/littleStories.ts'
import { workEvents } from '../content/workEvents.ts'
import type { GameState } from './state.ts'
import { createWorkSession, selectWorkEvent } from './workEvents.ts'
import { createLittleStorySession, maybeStartLittleStory } from './littleStories.ts'
import type { EventSession } from './eventSession.ts'

export const STORY_QUEUE_LIMIT = 3
export type QueuedStory = { type: 'work' | 'little'; id: string }

export function startUnqueuedLittleStory(session: EventSession, game: GameState, success: boolean, roll: number, pick: number) {
  const little = session.littleStories ?? createLittleStorySession()
  const reservedIds = (session.storyQueue ?? []).filter(item => item.type === 'little').map(item => item.id)
  if (little.active.length + reservedIds.length >= 2) return little
  const reserved = { ...little, active: [...little.active, ...reservedIds.map(id => ({ id: id as typeof little.active[number]['id'], choice: null, dueDay: null }))] }
  const result = maybeStartLittleStory(reserved, success, roll, pick, game)
  return result === reserved ? little : { ...result, active: result.active.filter(item => !reservedIds.includes(item.id)) }
}

export function selectDeferredStory(session: EventSession, game: GameState, action: 'work' | 'eat' | 'rest', workRoll: number, workPick: number, storyRoll: number, storyPick: number): EventSession {
  const queue = session.storyQueue ?? []
  if (queue.length >= STORY_QUEUE_LIMIT) return session
  const oldWork = session.work ?? createWorkSession()
  const workIds = queue.filter(item => item.type === 'work').map(item => item.id)
  const candidate = action === 'work' ? selectWorkEvent({ ...oldWork, recent: [...oldWork.recent, ...workIds] }, game, true, workRoll, workPick) : oldWork
  if (candidate.pending) return { ...session, storyQueue: [...queue, { type: 'work', id: candidate.pending.eventId }] }
  const oldLittle = session.littleStories ?? createLittleStorySession()
  const queuedLittle = queue.filter(item => item.type === 'little')
  if (oldLittle.active.length + queuedLittle.length >= 2) return session
  const reserved = { ...oldLittle, active: [...oldLittle.active, ...queuedLittle.map(item => ({ id: item.id as typeof oldLittle.active[number]['id'], choice: null, dueDay: null }))] }
  const story = maybeStartLittleStory(reserved, true, storyRoll, storyPick, game)
  return story.pending ? { ...session, storyQueue: [...queue, { type: 'little', id: story.pending.id }] } : session
}

export function openDeferredStory(session: EventSession, game: GameState): EventSession {
  const [first, ...rest] = session.storyQueue ?? []
  if (!first || game.dayStatus !== 'active' || session.pending || session.work?.pending || session.littleStories?.pending || session.rest?.pending || session.meal?.pending || session.goose?.pending) return session
  if (first.type === 'work') {
    const work = session.work ?? createWorkSession()
    return { ...session, storyQueue: rest, work: { recent: [...work.recent.filter(id => id !== first.id), first.id].slice(-10), pending: { eventId: first.id, choiceId: null, changes: null } } }
  }
  const little = session.littleStories ?? createLittleStorySession()
  if (little.active.length >= 2) return session
  const id = first.id as typeof little.active[number]['id']
  return { ...session, storyQueue: rest, littleStories: { recent: [...little.recent.filter(value => value !== id), id].slice(-10), active: [...little.active, { id, choice: null, dueDay: null }], pending: { id, stage: 'start' } } }
}

export function isValidStoryQueue(value: unknown): value is QueuedStory[] {
  if (!Array.isArray(value) || value.length > STORY_QUEUE_LIMIT) return false
  const keys = new Set<string>()
  return value.every((item: QueuedStory) => {
    if (!item || typeof item !== 'object' || (item.type !== 'work' && item.type !== 'little') || typeof item.id !== 'string') return false
    const exists = item.type === 'work' ? workEvents.some(event => event.id === item.id) : LITTLE_STORIES.some(event => event.id === item.id)
    const key = `${item.type}:${item.id}`
    if (!exists || keys.has(key)) return false
    keys.add(key)
    return true
  })
}
