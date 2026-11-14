import { ACTIONS_PER_DAY, getDayValues } from './state'
import type { DayValues, GameState } from './state'

export interface DaySummary {
  day: number
  actionsUsed: number
  changes: DayValues
  endValues: DayValues
}

export function finishDay(state: GameState): GameState {
  if (state.dayStatus !== 'active') return state
  return { ...state, dayStatus: 'finished' }
}

export function getDaySummary(state: GameState): DaySummary {
  const endValues = getDayValues(state)
  return {
    day: state.day,
    actionsUsed: ACTIONS_PER_DAY - state.actionsRemaining,
    changes: {
      energy: endValues.energy - state.dayStart.energy,
      satiety: endValues.satiety - state.dayStart.satiety,
      sanity: endValues.sanity - state.dayStart.sanity,
      money: endValues.money - state.dayStart.money,
      motivation: endValues.motivation - state.dayStart.motivation,
      unfinishedProjects: endValues.unfinishedProjects - state.dayStart.unfinishedProjects,
    },
    endValues,
  }
}

export function startNextDay(state: GameState): GameState {
  if (state.dayStatus !== 'finished') return state
  return {
    ...state,
    day: state.day + 1,
    dayStatus: 'active',
    actionsRemaining: ACTIONS_PER_DAY,
    dayStart: getDayValues(state),
  }
}
