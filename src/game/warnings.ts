import type { GameState } from './state'

// Временный порог для игровых проб, включительно.
export const LOW_STAT_THRESHOLD = 30

export function getDetailedStateWarnings(state: GameState): { stat: 'energy' | 'satiety' | 'sanity'; text: string }[] {
  const warnings: { stat: 'energy' | 'satiety' | 'sanity'; text: string }[] = []
  if (state.energy <= LOW_STAT_THRESHOLD) {
    warnings.push({ stat: 'energy', text: state.dayStatus === 'active' && state.actionsRemaining > 0 ? 'Энергия на исходе. Бесплатный отдых поможет набраться сил.' : 'Энергия на исходе. На следующий день можно будет отдохнуть.' })
  }
  if (state.satiety <= LOW_STAT_THRESHOLD) {
    warnings.push({ stat: 'satiety', text: state.dayStatus === 'active' && state.actionsRemaining > 0 ? state.money < 25 ? 'Маша проголодалась. Можно выбрать бесплатный перекус.' : 'Маша проголодалась. Можно поесть.' : 'Маша проголодалась. На следующий день можно будет поесть или выбрать бесплатный перекус.' })
  }
  if (state.sanity <= LOW_STAT_THRESHOLD) {
    warnings.push({ stat: 'sanity', text: state.dayStatus === 'active' && state.actionsRemaining > 0 ? 'Кукуха устала. Бесплатный отдых ей поможет.' : 'Кукуха устала. На следующий день можно будет отдохнуть.' })
  }
  return warnings
}

export function getStateWarnings(state: GameState): string[] {
  return getDetailedStateWarnings(state).map((warning) => warning.text)
}
