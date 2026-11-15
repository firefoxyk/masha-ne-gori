import { describe, expect, it } from 'vitest'
import { MEAL_OPTIONS } from '../content/meals'
import { loadGame, saveGame } from '../storage/gameStorage'
import { createEventSession } from './eventSession'
import { chooseMeal, createMealSession, mealReason, startFreeSnack, startSpecialMeal } from './meals'
import { createInitialGameState } from './state'

describe('выбор еды', () => {
  it.each([0, 24])('предлагает бесплатный перекус при %i монетах и тратит действие после выбора', (money) => {
    const game = { ...createInitialGameState(), money, satiety: 40 }
    const meal = startFreeSnack(game, createMealSession())
    expect(meal.pending?.freeSnack).toBe(true)
    expect(game.actionsRemaining).toBe(5)
    expect(chooseMeal(game, meal, 'cook', 0).game).toBe(game)
    const chosen = chooseMeal(game, meal, 'snack', 0)
    expect(chosen.game).toMatchObject({ money, satiety: 55, actionsRemaining: 4 })
    expect(chooseMeal(chosen.game, chosen.meal, 'snack', 0).game).toBe(chosen.game)
  })
  it('не открывает бесплатное предложение при достаточных деньгах или без действий', () => {
    const meal = createMealSession()
    for (const game of [{ ...createInitialGameState(), money: 25 }, { ...createInitialGameState(), money: 100 }, { ...createInitialGameState(), money: 0, actionsRemaining: 0 }, { ...createInitialGameState(), money: 0, dayStatus: 'finished' as const }]) {
      expect(startFreeSnack(game, meal)).toBe(meal)
    }
  })
  it('восстанавливает неподтверждённый перекус и результат без повторного применения', () => {
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const game = { ...createInitialGameState(), money: 0, satiety: 40 }
    const meal = startFreeSnack(game, createMealSession())
    expect(saveGame(game, () => storage, { ...createEventSession(), meal })).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded' || !loaded.events.meal) return
    expect(loaded.game.actionsRemaining).toBe(5)
    const chosen = chooseMeal(loaded.game, loaded.events.meal, 'snack', 0)
    expect(saveGame(chosen.game, () => storage, { ...loaded.events, meal: chosen.meal })).toBe(true)
    const restored = loadGame(() => storage)
    expect(restored.kind).toBe('loaded')
    if (restored.kind === 'loaded' && restored.events.meal) {
      expect(restored.game).toMatchObject({ money: 0, satiety: 55, actionsRemaining: 4 })
      expect(chooseMeal(restored.game, restored.events.meal, 'snack', 0).game).toBe(restored.game)
    }
  })
  it('использует 25% и не запускается при недоступной еде', () => {
    const game = createInitialGameState()
    const session = createMealSession()
    expect(startSpecialMeal(game, session, 0.25).started).toBe(false)
    const start = startSpecialMeal(game, session, 0.249)
    expect(start.started).toBe(true)
    expect(start.game).toEqual({ ...game, actionsRemaining: 4 })
    expect(startSpecialMeal({ ...game, money: 24 }, session, 0).started).toBe(false)
    expect(startSpecialMeal({ ...game, actionsRemaining: 0 }, session, 0).started).toBe(false)
    for (const money of [25, 100]) {
      const funded = { ...game, money }
      expect(startSpecialMeal(funded, session, 0.249).started).toBe(true)
      expect(startSpecialMeal(funded, session, 0.25).started).toBe(false)
    }
  })
  it.each(MEAL_OPTIONS)('$id применяет стоимость, сытость и бонус кружки один раз', (option) => {
    const game = { ...createInitialGameState(), money: 100, energy: 50, satiety: 30, ownedItems: ['mug'] as ('mug')[] }
    const start = startSpecialMeal(game, createMealSession(), 0)
    const chosen = chooseMeal(start.game, start.meal, option.id, 0)
    expect(chosen.game.money).toBe(100 - option.money)
    expect(chosen.game.energy).toBe(50 - option.energy)
    expect(chosen.game.satiety).toBe(30 + option.satiety + 3)
    expect(chosen.game.actionsRemaining).toBe(4)
    expect(chooseMeal(chosen.game, chosen.meal, option.id, 0).game).toBe(chosen.game)
  })
  it('сохраняет бесплатный выход при нехватке ресурсов', () => {
    const start = startSpecialMeal({ ...createInitialGameState(), money: 25, energy: 0 }, createMealSession(), 0)
    expect(mealReason(start.game, 'cook')).toContain('энергии')
    expect(mealReason(start.game, 'delivery')).toContain('монет')
    expect(mealReason(start.game, 'snack')).toBeNull()
    expect(chooseMeal(start.game, start.meal, 'cook', 0).game).toBe(start.game)
    expect(chooseMeal(start.game, start.meal, 'snack', 0).game.money).toBe(25)
  })
  it('содержит все истории, скрывает шесть про ИИ и не повторяет предыдущую', () => {
    for (const option of MEAL_OPTIONS) {
      expect(option.lines).toHaveLength(20)
      expect(option.lines.filter((line) => line.requiresAssistant)).toHaveLength(2)
      const seen = new Set<number>()
      for (let index = 0; index < 18; index++) {
        const game = { ...createInitialGameState(), money: 100 }
        const start = startSpecialMeal(game, createMealSession(), 0)
        const result = chooseMeal(start.game, start.meal, option.id, (index + 0.1) / 18)
        const line = result.meal.pending!.result!.line
        expect(option.lines[line].requiresAssistant).toBe(false)
        seen.add(line)
      }
      expect(seen.size).toBe(18)
      const start = startSpecialMeal({ ...createInitialGameState(), money: 100 }, { pending: null, last: { [option.id]: 0 } }, 0)
      expect(chooseMeal(start.game, start.meal, option.id, 0).meal.pending!.result!.line).not.toBe(0)
    }
  })
  it('ограничивает сытость и сохраняет выбор и результат без двойного списания', () => {
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const start = startSpecialMeal({ ...createInitialGameState(), satiety: 99 }, createMealSession(), 0)
    expect(saveGame(start.game, () => storage, { ...createEventSession(), meal: start.meal })).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded' || !loaded.events.meal) return
    const choice = chooseMeal(loaded.game, loaded.events.meal, 'cook', 0)
    expect(choice.meal.pending!.result!.satiety).toBe(1)
    expect(saveGame(choice.game, () => storage, { ...loaded.events, meal: choice.meal })).toBe(true)
    const again = loadGame(() => storage)
    expect(again.kind).toBe('loaded')
    if (again.kind === 'loaded' && again.events.meal) expect(chooseMeal(again.game, again.events.meal, 'cook', 0).game).toEqual(choice.game)
  })
})
