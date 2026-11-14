import { ACTIONS_PER_DAY, STAT_MAX, STAT_MIN } from './state.ts'
import type { DayValues } from './state.ts'
import type { ActionId } from './actions.ts'

/** Данные события пока не выбираются и не применяются игровой логикой. */
export type EventNumberField = keyof DayValues | 'day' | 'actionsRemaining'
export type EventCondition = { field: EventNumberField; min?: number; max?: number }
export type EventEffects = Partial<DayValues>
export type EventTrigger = { type: 'after_action'; action: ActionId } | { type: 'state' }
export interface EventChoice {
  id: string
  text: string
  effects: EventEffects
  result: string
  conditions?: EventCondition[]
}
export interface GameEvent {
  id: string
  title: string
  text: string
  dialogue: { speaker: string; text: string }[]
  trigger: EventTrigger
  conditions: EventCondition[]
  repeat: 'once' | 'repeatable'
  continuation?: { eventId: string; choiceId: string; minDays: number }
  choices: [EventChoice, ...EventChoice[]]
}

const fields: EventNumberField[] = ['energy', 'satiety', 'sanity', 'money', 'motivation', 'unfinishedProjects', 'day', 'actionsRemaining']
const effectFields: (keyof DayValues)[] = ['energy', 'satiety', 'sanity', 'money', 'motivation', 'unfinishedProjects']
const statFields: EventNumberField[] = ['energy', 'satiety', 'sanity', 'motivation']
const integerFields: EventNumberField[] = ['day', 'actionsRemaining', 'unfinishedProjects']
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

/** Проверяет и данные из внешнего источника, не только типизированные литералы. */
export function validateEvents(input: unknown): string[] {
  const errors: string[] = []
  const error = (path: string, message: string) => errors.push(`${path}: ${message}`)
  const text = (value: unknown, path: string) => { if (!nonempty(value)) error(path, 'нужен непустой текст') }
  const id = (value: unknown, path: string, seen: Set<string>) => {
    if (typeof value !== 'string' || !idPattern.test(value)) error(path, 'нужен идентификатор в формате lower-kebab-case')
    else if (seen.has(value)) error(path, 'повторяющийся идентификатор')
    else seen.add(value)
  }
  const conditions = (value: unknown, path: string) => {
    if (!Array.isArray(value)) { error(path, 'нужен список условий'); return }
    value.forEach((condition: unknown, index: number) => {
      const at = `${path}[${index}]`
      if (!record(condition) || !fields.includes(condition.field as EventNumberField)) { error(at, 'неизвестное поле условия'); return }
      const field = condition.field as EventNumberField
      if (condition.min === undefined && condition.max === undefined) error(at, 'нужна хотя бы одна граница')
      for (const key of ['min', 'max'] as const) {
        const n = condition[key]
        if (n === undefined) continue
        if (typeof n !== 'number' || !Number.isFinite(n) || (integerFields.includes(field) && !Number.isSafeInteger(n))) { error(`${at}.${key}`, 'некорректное число'); continue }
        const min = field === 'day' ? 1 : STAT_MIN
        const max = statFields.includes(field) ? STAT_MAX : field === 'actionsRemaining' ? ACTIONS_PER_DAY : Infinity
        if (n < min || n > max) error(`${at}.${key}`, 'граница вне диапазона поля')
      }
      if (typeof condition.min === 'number' && typeof condition.max === 'number' && condition.min > condition.max) error(at, 'минимум больше максимума')
      if (Object.keys(condition).some((key) => !['field', 'min', 'max'].includes(key))) error(at, 'лишнее поле условия')
    })
  }
  const effects = (value: unknown, path: string) => {
    if (!record(value)) { error(path, 'нужен объект последствий'); return }
    for (const [field, delta] of Object.entries(value)) {
      if (!effectFields.includes(field as keyof DayValues)) error(`${path}.${field}`, 'неизвестный показатель')
      else if (typeof delta !== 'number' || !Number.isFinite(delta) || (field === 'unfinishedProjects' && !Number.isSafeInteger(delta))) error(`${path}.${field}`, 'некорректное изменение')
    }
  }
  if (!Array.isArray(input)) return ['events: нужен список событий']
  const eventIds = new Set<string>()
  input.forEach((event: unknown, index: number) => {
    const path = `events[${index}]`
    if (!record(event)) { error(path, 'нужен объект события'); return }
    id(event.id, `${path}.id`, eventIds)
    text(event.title, `${path}.title`); text(event.text, `${path}.text`)
    if (!Array.isArray(event.dialogue) || event.dialogue.length === 0) error(`${path}.dialogue`, 'нужна хотя бы одна реплика')
    else event.dialogue.forEach((line: unknown, i: number) => {
      if (!record(line)) { error(`${path}.dialogue[${i}]`, 'нужен объект реплики'); return }
      text(line.speaker, `${path}.dialogue[${i}].speaker`); text(line.text, `${path}.dialogue[${i}].text`)
    })
    if (!record(event.trigger) || (event.trigger.type !== 'state' && (event.trigger.type !== 'after_action' || !['work', 'eat', 'rest'].includes(event.trigger.action as string)))) error(`${path}.trigger`, 'неизвестный момент события')
    conditions(event.conditions, `${path}.conditions`)
    if (event.repeat !== 'once' && event.repeat !== 'repeatable') error(`${path}.repeat`, 'неизвестное правило повторения')
    if (event.continuation !== undefined) {
      const link = event.continuation
      if (!record(link) || typeof link.eventId !== 'string' || !idPattern.test(link.eventId) || typeof link.choiceId !== 'string' || !idPattern.test(link.choiceId) || !Number.isSafeInteger(link.minDays) || (link.minDays as number) < 1) error(`${path}.continuation`, 'некорректная связь')
      if (event.repeat !== 'once') error(`${path}.repeat`, 'продолжение должно быть уникальным')
    }
    if (!Array.isArray(event.choices) || event.choices.length === 0) { error(`${path}.choices`, 'нужен хотя бы один выбор'); return }
    const choiceIds = new Set<string>()
    event.choices.forEach((choice: unknown, i: number) => {
      const at = `${path}.choices[${i}]`
      if (!record(choice)) { error(at, 'нужен объект выбора'); return }
      id(choice.id, `${at}.id`, choiceIds)
      text(choice.text, `${at}.text`); text(choice.result, `${at}.result`)
      effects(choice.effects, `${at}.effects`)
      if (choice.conditions !== undefined) conditions(choice.conditions, `${at}.conditions`)
    })
  })
  input.forEach((event: unknown, index: number) => {
    if (!record(event) || !record(event.continuation)) return
    const link = event.continuation
    const previous = input.find((item: unknown) => record(item) && item.id === link.eventId)
    if (!record(previous) || previous.repeat !== 'once' || !Array.isArray(previous.choices) || !previous.choices.some((choice: unknown) => record(choice) && choice.id === link.choiceId) || previous.id === event.id) error(`events[${index}].continuation`, 'нужен уникальный предыдущий этап и существующий выбор')
  })
  return errors
}
