import { describe, expect, it } from 'vitest'
import { validateEvents } from '../game/events'
import { workEvents } from './workEvents'

describe('подготовленные рабочие ситуации', () => {
  it('содержат сорок разных событий с двумя вариантами и допустимыми последствиями', () => {
    expect(workEvents).toHaveLength(40)
    expect(validateEvents(workEvents)).toEqual([])
    expect(workEvents.every((event) => event.choices.length === 2)).toBe(true)
    expect(workEvents.flatMap((event) => event.choices).every((choice) => !/Маша сделала свой выбор|заглушка|адаптируй|TODO/i.test(choice.result))).toBe(true)
    expect(workEvents.every((event) => event.choices[0].result !== event.choices[1].result)).toBe(true)
    expect(workEvents.slice(0, 30).every((event) => !event.requiresAssistant)).toBe(true)
    expect(workEvents.slice(30).every((event) => event.requiresAssistant)).toBe(true)
  })
})
