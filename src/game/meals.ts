import { MEAL_OPTIONS } from '../content/meals.ts'
import type { MealId } from '../content/meals.ts'
import { getActionUnavailableReason } from './actions.ts'
import { bonuses } from './shop.ts'
import { STAT_MAX } from './state.ts'
import type { GameState } from './state.ts'
import { assistantUnlocked } from './assistant.ts'

export const SPECIAL_MEAL_CHANCE = 0.25
type MealResult = { id: MealId; line: number; money: number; energy: number; satiety: number }
export type MealSession = { pending: { result: MealResult | null; freeSnack?: true } | null; last: Partial<Record<MealId, number>> }
export function createMealSession(): MealSession { return { pending: null, last: {} } }

export function mealReason(game: GameState, id: MealId): string | null {
  const option = MEAL_OPTIONS.find((item) => item.id === id)
  if (!option) return 'Блюдо не найдено.'
  if (game.money < option.money) return `Нужно ${option.money} монет.`
  if (game.energy < option.energy) return `Нужно ${option.energy} энергии.`
  return null
}

export function startSpecialMeal(game: GameState, meal: MealSession, random: number): { game: GameState; meal: MealSession; started: boolean } {
  if (meal.pending || getActionUnavailableReason(game, 'eat') || random >= SPECIAL_MEAL_CHANCE) return { game, meal, started: false }
  return { game: { ...game, actionsRemaining: game.actionsRemaining - 1 }, meal: { ...meal, pending: { result: null } }, started: true }
}

export function startFreeSnack(game: GameState, meal: MealSession): MealSession {
  if (meal.pending || game.dayStatus !== 'active' || game.actionsRemaining <= 0 || game.money >= 25) return meal
  return { ...meal, pending: { result: null, freeSnack: true } }
}

export function chooseMeal(game: GameState, meal: MealSession, id: MealId, random: number): { game: GameState; meal: MealSession } {
  const option = MEAL_OPTIONS.find((item) => item.id === id)
  if (!meal.pending || meal.pending.result || !option || game.dayStatus !== 'active' || mealReason(game, id) || (meal.pending.freeSnack && (id !== 'snack' || game.actionsRemaining <= 0))) return { game, meal }
  const candidates = option.lines.map((line, index) => ({ ...line, index })).filter((line) => (!line.requiresAssistant || assistantUnlocked(game)) && line.index !== meal.last[id])
  const line = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random * candidates.length)))].index
  const satiety = Math.min(STAT_MAX, game.satiety + option.satiety + bonuses(game).eat) - game.satiety
  const result = { id, line, money: -option.money, energy: -option.energy, satiety }
  return { game: { ...game, actionsRemaining: game.actionsRemaining - (meal.pending.freeSnack ? 1 : 0), money: game.money + result.money, energy: game.energy + result.energy, satiety: game.satiety + satiety }, meal: { last: { ...meal.last, [id]: line }, pending: { result } } }
}

export function isValidMealSession(value: unknown, game: GameState): value is MealSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const meal = value as MealSession
  if (!meal.last || typeof meal.last !== 'object' || Array.isArray(meal.last)) return false
  if (!Object.entries(meal.last).every(([id, line]) => MEAL_OPTIONS.some((option) => option.id === id && Number.isInteger(line) && line! >= 0 && line! < option.lines.length))) return false
  if (meal.pending === null) return true
  if (!meal.pending || typeof meal.pending !== 'object' || game.dayStatus !== 'active') return false
  if (meal.pending.freeSnack !== undefined && meal.pending.freeSnack !== true) return false
  if (meal.pending.freeSnack) return meal.pending.result === null && game.actionsRemaining > 0 && game.money < 25
  if (game.actionsRemaining >= 5) return false
  const result = meal.pending.result
  if (result === null) return true
  if (!result || typeof result !== 'object') return false
  const option = MEAL_OPTIONS.find((item) => item.id === result.id)
  return !!option && Number.isInteger(result.line) && result.line >= 0 && result.line < option.lines.length && meal.last[result.id] === result.line && result.money === -option.money && result.energy === -option.energy && Number.isFinite(result.satiety) && result.satiety >= 0 && result.satiety <= game.satiety
}
