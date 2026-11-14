import { STAT_MAX, STAT_MIN } from './state'
import type { GameState } from './state'

export type ActionId = 'work' | 'eat' | 'rest'

// Временные эффекты для первых игровых проб.
export const ACTIONS = {
  work: { label: 'Поработать', description: '+30 денег, −15 энергии, −10 сытости', message: 'Поработали! Можно и передохнуть.' },
  eat: { label: 'Поесть', description: '−25 денег, +30 сытости', message: 'Поели! Кофе всё-таки не считается супом.' },
  rest: { label: 'Отдохнуть', description: '+20 энергии, +10 кукухи', message: 'Отдохнули. Пять минут тишины — уже победа.' },
} satisfies Record<ActionId, { label: string; description: string; message: string }>

export function getActionUnavailableReason(state: GameState, action: ActionId): string | null {
  if (state.dayStatus !== 'active') return 'Игровой день уже завершён.'
  if (state.actionsRemaining <= 0) return 'На сегодня действия закончились.'
  if (action === 'work' && state.energy < 15) return 'Для работы нужно не меньше 15 энергии.'
  if (action === 'eat' && state.money < 25) return 'На еду нужно 25 денег.'
  return null
}

function clampStat(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value))
}

export function performAction(state: GameState, action: ActionId): { state: GameState; message: string; success: boolean } {
  const reason = getActionUnavailableReason(state, action)
  if (reason) return { state, message: reason, success: false }

  const next = { ...state, actionsRemaining: state.actionsRemaining - 1 }
  switch (action) {
    case 'work':
      next.money += 30
      next.energy = clampStat(next.energy - 15)
      next.satiety = clampStat(next.satiety - 10)
      break
    case 'eat':
      next.money -= 25
      next.satiety = clampStat(next.satiety + 30)
      break
    case 'rest':
      next.energy = clampStat(next.energy + 20)
      next.sanity = clampStat(next.sanity + 10)
      break
  }
  return { state: next, message: ACTIONS[action].message, success: true }
}
