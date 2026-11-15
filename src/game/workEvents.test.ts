import { describe, expect, it } from 'vitest'
import { workEvents } from '../content/workEvents'
import { loadGame, saveGame } from '../storage/gameStorage'
import { createEventSession } from './eventSession'
import { createInitialGameState } from './state'
import { withTrainedAssistant } from './assistantFixture'
import { chooseWorkEvent, createWorkSession, selectWorkEvent } from './workEvents'

describe('рабочие ситуации', () => {
  it('использует вероятность 20%, успех действия и доступ помощника', () => {
    const game = createInitialGameState()
    const session = createWorkSession()
    expect(selectWorkEvent(session, game, false, 0, 0)).toBe(session)
    expect(selectWorkEvent(session, game, true, 0.2, 0)).toBe(session)
    expect(selectWorkEvent(session, game, true, 0.199, 0.999).pending?.eventId).toBe('work-30')
    expect(selectWorkEvent(session, withTrainedAssistant(game), true, 0, 0.999).pending?.eventId).toBe('work-40')
  })
  it('исключает последние десять и ослабляет историю при отсутствии альтернатив', () => {
    const game = createInitialGameState()
    const recent = workEvents.slice(0, 10).map((item) => item.id)
    expect(selectWorkEvent({ recent, pending: null }, game, true, 0, 0).pending?.eventId).toBe('work-11')
    const all = workEvents.slice(0, 30).map((item) => item.id)
    expect(selectWorkEvent({ recent: all, pending: null }, game, true, 0, 0).pending?.eventId).toBe('work-01')
  })
  it.each(workEvents)('$id оба ответа применяются однократно и сохраняются', (event) => {
    for (const choice of event.choices) {
      const game = { ...withTrainedAssistant(createInitialGameState()), day: 12, projectIdeas: { day: 12, ids: [] }, energy: 1, sanity: 99, motivation: 99, money: 100, actionsRemaining: 4 }
      const session = { recent: [event.id], pending: { eventId: event.id, choiceId: null, changes: null } }
      const result = chooseWorkEvent(session, game, choice.id)
      expect(result.session.pending?.choiceId).toBe(choice.id)
      expect(result.game.actionsRemaining).toBe(4)
      expect(result.game.energy).toBeGreaterThanOrEqual(0)
      expect(result.game.sanity).toBeLessThanOrEqual(100)
      expect(chooseWorkEvent(result.session, result.game, choice.id).game).toBe(result.game)
      let raw: string | null = null
      const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
      expect(saveGame(result.game, () => storage, { ...createEventSession(), work: result.session })).toBe(true)
      const loaded = loadGame(() => storage)
      expect(loaded.kind).toBe('loaded')
      if (loaded.kind === 'loaded') expect(loaded.events.work).toEqual(result.session)
    }
  })
})
