import { describe, expect, it } from 'vitest'
import { LITTLE_STORIES } from '../content/littleStories'
import { littleStoryEnding } from '../content/littleStoryEndings'
import { loadGame, saveGame } from '../storage/gameStorage'
import { createEventSession } from './eventSession'
import { chooseLittleStory, continueLittleStory, createLittleStorySession, eligibleLittleStories, knowsGooseName, maybeStartLittleStory, surfaceLittleStory } from './littleStories'
import { createInitialGameState } from './state'

describe('небольшие истории', () => {
  it('содержит 50 уникальных историй, две развилки и сроки', () => {
    expect(LITTLE_STORIES).toHaveLength(50)
    expect(new Set(LITTLE_STORIES.map((s) => s.id)).size).toBe(50)
    expect(LITTLE_STORIES.every((s) => s.choices.length === 2 && s.start && s.ending && s.delay > 0)).toBe(true)
    expect(eligibleLittleStories(createLittleStorySession())).toHaveLength(40)
  })
  it('начинается только после успеха с шансом 10% и ограничением двух цепочек', () => {
    const start = createLittleStorySession()
    expect(maybeStartLittleStory(start, false, 0, 0)).toBe(start)
    expect(maybeStartLittleStory(start, true, 0.1, 0)).toBe(start)
    let session = maybeStartLittleStory(start, true, 0.099, 0)
    session = chooseLittleStory(session, 0, 1)
    session = continueLittleStory(session, 1)
    session = maybeStartLittleStory(session, true, 0, 0)
    session = chooseLittleStory(session, 1, 1)
    session = continueLittleStory(session, 1)
    expect(session.active).toHaveLength(2)
    expect(maybeStartLittleStory(session, true, 0, 0)).toBe(session)
    expect(session.active[0].id).not.toBe(session.active[1].id)
  })
  it('ждёт ответ и срок, показывает готовые продолжения по очереди', () => {
    let session = maybeStartLittleStory(createLittleStorySession(), true, 0, 0)
    expect(surfaceLittleStory(session, 99)).toBe(session)
    session = chooseLittleStory(session, 1, 1)
    expect(session.active[0]).toMatchObject({ choice: 1, dueDay: 3 })
    expect(chooseLittleStory(session, 0, 1)).toBe(session)
    session = continueLittleStory(session, 1)
    expect(surfaceLittleStory(session, 2)).toBe(session)
    session = surfaceLittleStory(session, 3)
    expect(session.pending?.stage).toBe('ending')
    session = continueLittleStory(session, 3)
    expect(session.active).toHaveLength(0)
    expect(eligibleLittleStories(session).some((story) => story.id === 'little-01')).toBe(false)
  })
  it.each(LITTLE_STORIES)('$id сохраняет оба варианта и завершается в срок', (story) => {
    expect(littleStoryEnding(story.id, 0)).not.toEqual(littleStoryEnding(story.id, 1))
    for (const choice of [0, 1] as const) {
      expect(littleStoryEnding(story.id, choice)).not.toMatch(/адаптируй|заглушка|TODO/i)
      if (story.goose) expect(littleStoryEnding(story.id, choice)).not.toMatch(/Пельмень/)
    }
    for (const choice of [0, 1] as const) {
      let session = { recent: [story.id], active: [{ id: story.id, choice: null, dueDay: null }], pending: { id: story.id, stage: 'start' as const } }
      const answered = chooseLittleStory(session, choice, 5)
      expect(answered.active[0]).toMatchObject({ choice, dueDay: 5 + story.delay })
      const waiting = continueLittleStory(answered, 5)
      expect(surfaceLittleStory(waiting, 5 + story.delay - 1)).toBe(waiting)
      const ending = surfaceLittleStory(waiting, 5 + story.delay)
      expect(ending.pending?.stage).toBe('ending')
      let raw: string | null = null
      const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
      const game = { ...createInitialGameState(), day: 5 + story.delay, projectIdeas: { day: 5 + story.delay, ids: [] } }
      expect(saveGame(game, () => storage, { ...createEventSession(), littleStories: ending })).toBe(true)
      const loaded = loadGame(() => storage)
      expect(loaded.kind).toBe('loaded')
      if (loaded.kind === 'loaded') {
        expect(loaded.events.littleStories?.active[0].choice).toBe(choice)
        expect(littleStoryEnding(story.id, loaded.events.littleStories!.active[0].choice!)).toBe(littleStoryEnding(story.id, choice))
      }
      expect(continueLittleStory(ending, 5 + story.delay).active).toHaveLength(0)
    }
  })
  it('ставит два готовых продолжения в последовательную очередь', () => {
    let session = maybeStartLittleStory(createLittleStorySession(), true, 0, 0)
    session = continueLittleStory(chooseLittleStory(session, 0, 1), 1)
    session = maybeStartLittleStory(session, true, 0, 0)
    session = continueLittleStory(chooseLittleStory(session, 1, 1), 1)
    session = surfaceLittleStory(session, 10)
    const first = session.pending!.id
    session = continueLittleStory(session, 10)
    expect(session.pending?.stage).toBe('ending')
    expect(session.pending?.id).not.toBe(first)
    expect(continueLittleStory(session, 10).active).toHaveLength(0)
  })
  it('сохраняет ожидание и выбранный вариант в формате 14', () => {
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const game = createInitialGameState()
    let stories = maybeStartLittleStory(createLittleStorySession(), true, 0, 0)
    expect(saveGame(game, () => storage, { ...createEventSession(), littleStories: stories })).toBe(true)
    let loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    stories = chooseLittleStory(stories, 1, 1)
    expect(saveGame(game, () => storage, { ...createEventSession(), littleStories: stories })).toBe(true)
    loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind === 'loaded') expect(loaded.events.littleStories).toEqual(stories)
    raw = JSON.stringify({ version: 13, game, events: createEventSession() })
    expect(loadGame(() => storage).kind).toBe('loaded')
  })
  it('не раскрывает имя гуся до сюжетного знакомства', () => {
    const game = createInitialGameState()
    expect(knowsGooseName(game)).toBe(false)
    const story = { scenario: 0, startDay: 1, seen: 4, actual: null, edition: 2 as const }
    expect(knowsGooseName({ ...game, projects: { 'goose-owner': { status: 'started', step: 1, story } } })).toBe(true)
  })
})
