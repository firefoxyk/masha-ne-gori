import type { GameState } from './state'

// Временный порог для игровых проб, включительно.
export const LOW_STAT_THRESHOLD = 30

export function getDetailedStateWarnings(state: GameState): { stat: 'energy' | 'satiety' | 'sanity'; text: string }[] {
  const warnings: { stat: 'energy' | 'satiety' | 'sanity'; text: string }[] = []
  if (state.energy <= LOW_STAT_THRESHOLD) {
    warnings.push({ stat: 'energy', text: 'Энергия на исходе. Пора отдохнуть и набраться сил.' })
  }
  if (state.satiety <= LOW_STAT_THRESHOLD) {
    warnings.push({ stat: 'satiety', text: 'Маша проголодалась. Пора поесть; если денег мало, можно поработать.' })
  }
  if (state.sanity <= LOW_STAT_THRESHOLD) {
    warnings.push({ stat: 'sanity', text: 'Кукуха устала. Немного отдыха ей точно пригодится.' })
  }
  return warnings
}

export function getStateWarnings(state: GameState): string[] {
  return getDetailedStateWarnings(state).map((warning) => warning.text)
}
