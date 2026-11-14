import { describe, expect, it } from 'vitest'
import { exampleEvents } from '../content/events'
import { validateEvents } from './events'

describe('проверка данных событий', () => {
  it('принимает все примеры историй', () => {
    expect(validateEvents(exampleEvents)).toEqual([])
  })

  it('проверяет обязательные поля, реплики и хотя бы один выбор', () => {
    const event = { ...exampleEvents[0], title: ' ', text: '', dialogue: [], choices: [] }
    const errors = validateEvents([event]).join('\n')
    for (const field of ['title', 'text', 'dialogue', 'choices']) expect(errors).toContain(field)
    expect(validateEvents(null)).not.toEqual([])
    expect(validateEvents([null])).not.toEqual([])
  })

  it('отклоняет повторные и некорректные идентификаторы событий и вариантов', () => {
    const event = structuredClone(exampleEvents[0])
    const invalid = { ...event, choices: [event.choices[0], event.choices[0], { ...event.choices[0], id: 'Bad id' }] }
    const errors = validateEvents([invalid, event]).join('\n')
    expect(errors).toContain('events[1].id')
    expect(errors).toContain('choices[1].id')
    expect(errors).toContain('choices[2].id')
  })

  it.each([
    [{ field: 'satiety', min: 31, max: 30 }],
    [{ field: 'energy', max: 101 }],
    [{ field: 'day', min: 1.5 }],
    [{ field: 'money', min: -1 }],
    [{ field: 'actionsRemaining', max: 6 }],
    [{ field: 'unknown', min: 1 }],
    [{ field: 'sanity' }],
    [{ field: 'sanity', min: NaN }],
  ])('отклоняет неверные условия %o', (conditions) => {
    expect(validateEvents([{ ...exampleEvents[0], conditions }])).not.toEqual([])
    const choice = { ...exampleEvents[0].choices[0], conditions }
    expect(validateEvents([{ ...exampleEvents[0], choices: [choice] }])).not.toEqual([])
  })

  it.each([{ energy: Infinity }, { unfinishedProjects: 0.5 }, { day: 1 }, { money: NaN }, null])('отклоняет неверные последствия %o', (effects) => {
    const event = { ...exampleEvents[0], choices: [{ ...exampleEvents[0].choices[0], effects }] }
    expect(validateEvents([event])).not.toEqual([])
  })

  it('проверяет момент, повторяемость и содержимое выбора', () => {
    const event = { ...exampleEvents[0], trigger: { type: 'after_action', action: 'sleep' }, repeat: 'sometimes', choices: [{ id: 'ok', text: '', result: '', effects: {} }] }
    const errors = validateEvents([event]).join('\n')
    for (const field of ['trigger', 'repeat', '.text', '.result']) expect(errors).toContain(field)
  })
})
