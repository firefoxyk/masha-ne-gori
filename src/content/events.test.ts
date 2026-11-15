import { describe, expect, it } from 'vitest'
import { exampleEvents } from './events'
import { performAction } from '../game/actions'
import { availableEventChoices, createEventHistory, eligibleEvents, recordEventShown } from '../game/eventSelection'
import { validateEvents } from '../game/events'
import type { GameEvent } from '../game/events'
import { createInitialGameState } from '../game/state'
import { withTrainedAssistant } from '../game/assistantFixture'

describe('стартовая подборка историй', () => {
  it('проходит валидацию и сохраняет уникальные идентификаторы', () => {
    expect(validateEvents(exampleEvents)).toEqual([])
    expect(new Set(exampleEvents.map((event) => event.id)).size).toBe(exampleEvents.length)
    for (const event of exampleEvents) {
      expect(new Set(event.choices.map((choice) => choice.id)).size).toBe(event.choices.length)
    }
  })

  it('подбирает истории после разных действий и при голоде или наличии проекта', () => {
    const state = createInitialGameState()
    const history = createEventHistory()
    for (const action of ['work', 'eat', 'rest'] as const) {
      const result = performAction(state, action)
      expect(result.success).toBe(true)
      const eligible = eligibleEvents(exampleEvents, result.state, action, history)
      expect(eligible.some((event) => event.trigger.type === 'after_action' && event.trigger.action === action)).toBe(true)
      expect(eligible.every((event) => availableEventChoices(event, result.state).length > 0)).toBe(true)
    }
    expect(eligibleEvents(exampleEvents, { ...state, satiety: 30, money: 0 }, 'rest', history).map((event) => event.id)).toContain('hungry-fridge')
    expect(eligibleEvents(exampleEvents, { ...state, unfinishedProjects: 1 }, 'work', history).map((event) => event.id)).toContain('almost-done')
  })

  it('скрывает платные варианты при нехватке денег, сохраняя альтернативу', () => {
    const broke = { ...createInitialGameState(), money: 0, satiety: 30 }
    for (const event of (exampleEvents as readonly GameEvent[]).filter((item) => item.choices.some((choice) => (choice.effects.money ?? 0) < 0))) {
      const available = availableEventChoices(event, broke)
      expect(available.length).toBeGreaterThan(0)
      expect(available.every((choice) => (choice.effects.money ?? 0) >= 0)).toBe(true)
    }
  })

  it('сохраняет разнообразие повторяемых историй в обычной игре после нескольких показов', () => {
    const initial = withTrainedAssistant(createInitialGameState())
    let history = createEventHistory()
    const seen = new Set<string>()
    for (let day = 1; day <= 8; day++) {
      const state = { ...initial, day }
      const candidates = eligibleEvents(exampleEvents, state, 'work', history).filter((event) => event.repeat === 'repeatable')
      expect(candidates.length).toBeGreaterThanOrEqual(2)
      const selected = candidates.find((event) => !seen.has(event.id)) ?? candidates[0]
      seen.add(selected.id)
      history = recordEventShown(history, selected.id, day)
    }
    expect(seen.size).toBeGreaterThanOrEqual(3)
  })
})
