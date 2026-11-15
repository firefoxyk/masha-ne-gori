/** Временные правила появления: один успешный бросок за день в текущей вкладке. */
export const GOOSE_CHANCE = 0.2
export const GOOSE_VISIT_MS = 8000

export function shouldShowGoose(day: number, lastShownDay: number | null, random: () => number = Math.random): boolean {
  if (lastShownDay === day) return false
  const roll = random()
  return Number.isFinite(roll) && roll >= 0 && roll < GOOSE_CHANCE
}
