import type { GameState } from './state'

// Временный порог для игровых проб, включительно.
export const LOW_STAT_THRESHOLD = 30

export function getStateWarnings(state: GameState): string[] {
  const warnings: string[] = []
  if (state.energy <= LOW_STAT_THRESHOLD) {
    warnings.push('Энергия на исходе. Пора отдохнуть и набраться сил.')
  }
  if (state.satiety <= LOW_STAT_THRESHOLD) {
    warnings.push('Маша проголодалась. Пора поесть; если денег мало, можно поработать.')
  }
  if (state.sanity <= LOW_STAT_THRESHOLD) {
    warnings.push('Кукуха устала. Немного отдыха ей точно пригодится.')
  }
  return warnings
}
