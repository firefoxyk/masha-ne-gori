import { describe, expect, it } from 'vitest'
import { createEventSession } from './eventSession.ts'
import { createInitialGameState } from './state.ts'
import { isValidStoryQueue, openDeferredStory, selectDeferredStory } from './storyQueue.ts'
import { createLittleStorySession, maybeStartLittleStory } from './littleStories.ts'
import { workEvents } from '../content/workEvents.ts'
import { saveGame, loadGame } from '../storage/gameStorage.ts'

describe('очередь историй', () => {
  it('запоминает выбор без показа и открывает тот же рассказ по запросу', () => {
    const game = createInitialGameState()
    const initial = createEventSession()
    const queued = selectDeferredStory(initial, game, 'work', 0, 0, 1, 1)
    expect(queued.storyQueue).toEqual([{ type: 'work', id: workEvents[0].id }])
    expect(queued.work).toBeUndefined()
    const opened = openDeferredStory(queued, game)
    expect(opened.work?.pending?.eventId).toBe(workEvents[0].id)
    expect(opened.storyQueue).toEqual([])
    expect(openDeferredStory(opened, game)).toBe(opened)
  })
  it('сохраняет порядок, не дублирует выбранную историю и не отбирает при заполнении', () => {
    const game = createInitialGameState()
    let session = createEventSession()
    for (let i = 0; i < 3; i++) session = selectDeferredStory(session, game, 'work', 0, 0, 1, 1)
    expect(new Set(session.storyQueue?.map(item => item.id)).size).toBe(3)
    expect(selectDeferredStory(session, game, 'work', 0, 0, 0, 0)).toBe(session)
    const first = session.storyQueue![0].id
    const opened = openDeferredStory(session, game)
    expect(opened.work?.pending?.eventId).toBe(first)
    expect(opened.storyQueue).toEqual(session.storyQueue!.slice(1))
  })
  it('не помечает короткую историю начатой до открытия и сохраняет её через хранилище', () => {
    const game = createInitialGameState()
    const queued = selectDeferredStory(createEventSession(), game, 'rest', 1, 1, 0, 0)
    expect(queued.littleStories).toBeUndefined()
    expect(queued.storyQueue?.[0].type).toBe('little')
    let raw = ''
    const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value } }
    expect(saveGame(game, () => storage, queued)).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw Error('load')
    const opened = openDeferredStory(loaded.events, loaded.game)
    expect(opened.littleStories?.pending?.id).toBe(queued.storyQueue?.[0].id)
    expect(opened.littleStories?.active).toHaveLength(1)
  })
  it('проверяет ошибки очереди и не вытесняет существующие цепочки', () => {
    expect(isValidStoryQueue([{ type: 'work', id: 'bad' }])).toBe(false)
    const game = createInitialGameState()
    let little = maybeStartLittleStory(createLittleStorySession(), true, 0, 0, game)
    little = { ...little, pending: null, active: little.active.map(item => ({ ...item, choice: 0, dueDay: 2 })) }
    const queued = selectDeferredStory({ ...createEventSession(), littleStories: little }, game, 'rest', 1, 1, 0, 0)
    expect(queued.littleStories).toEqual(little)
    expect(queued.storyQueue?.[0].id).not.toBe(little.active[0].id)
  })
  it('загружает версию 22 с достижениями и покупками без записи', () => {
    const game = { ...createInitialGameState(), achievements: ['care' as const], ownedItems: ['rocking-chair' as const] }
    const events = createEventSession()
    const raw = JSON.stringify({ version: 22, game, events })
    const loaded = loadGame(() => ({ getItem: () => raw, setItem: () => { throw Error('unexpected write') } }))
    expect(loaded).toEqual({ kind: 'loaded', game, events })
  })
})
