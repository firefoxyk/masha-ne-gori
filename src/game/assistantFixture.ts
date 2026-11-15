import type { GameState } from './state.ts'

// Достоверно завершённая история для проверок отбора событий.
export function withTrainedAssistant(game: GameState): GameState {
  return { ...game, projects: { ...game.projects, 'train-assistant': { status: 'completed', step: 2, story: { scenario: 0, startDay: 1, seen: 5, actual: { motivation: 8 }, edition: 2, choices: { '1': 'Попросить спокойный план', '2': 'Проверить рецепт', '3': 'Спокойный' } } } }, projectCompletions: { ...game.projectCompletions, 'train-assistant': 1 } }
}
