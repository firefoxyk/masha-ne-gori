import { describe, expect, it } from 'vitest'
import { loadGame, saveGame } from './gameStorage'
import v1 from '../../tests/fixtures/saves/v1.json'
import v6 from '../../tests/fixtures/saves/v6.json'
import v19 from '../../tests/fixtures/saves/v19.json'
import v23 from '../../tests/fixtures/saves/v23.json'

describe('сохранения, записанные прежними версиями игры', () => {
  it.each([v1, v6, v19, v23])('открывает версию $version без записи и сохраняет подтверждённые данные', (snapshot) => {
    const original = JSON.stringify(snapshot)
    let raw = original
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error(`Не загружена версия ${snapshot.version}`)
    expect(raw).toBe(original)
    expect(loaded.game.day).toBe(snapshot.game.day)
    expect(loaded.game.energy).toBe(snapshot.game.energy)
    expect(loaded.game.money).toBe(snapshot.game.money)
    expect(loaded.game.actionsRemaining).toBe(snapshot.game.actionsRemaining)
    if (snapshot.version === 6) {
      expect(loaded.game.ownedItems).toContain('pillow')
      expect(loaded.game.projects['balcony-garden']).toMatchObject({ status: 'started', step: 1 })
      expect(loaded.events.pending?.eventId).toBe('assistant-report')
    }
    if (snapshot.version === 19) expect(loaded.events.assistantJob).toMatchObject({ id: 'food', submittedDay: 13, actual: null, review: 'waiting' })
    if (snapshot.version === 23) {
      expect(loaded.game.ownedItems).toContain('pillow')
      expect(loaded.events.pending?.eventId).toBe('goose-note')
      expect(loaded.events.storyQueue).toEqual([{ type: 'work', id: 'work-01' }])
    }
    expect(saveGame(loaded.game, () => storage, loaded.events)).toBe(true)
    expect(loadGame(() => storage)).toEqual(loaded)
  })
})
