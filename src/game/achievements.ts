import type { AchievementId, GameState } from './state'

export const ACHIEVEMENTS: { id: AchievementId; title: string; description: string }[] = [
  { id: 'care', title: 'Пауза для себя', description: 'Отдохните любым способом.' },
  { id: 'review', title: 'Доверяй, но проверяй', description: 'Проверьте отчёт помощника и отметьте замечание.' },
  { id: 'project', title: 'Дело сделано', description: 'Завершите именованный проект.' },
  { id: 'rocking-chair', title: 'Место для мечтаний', description: 'Купите кресло-качалку.' },
  { id: 'goose', title: 'Дипломатия с крыльями', description: 'Взаимодействуйте с гостем в комнате.' },
]

export function awardAchievements(game: GameState, ...ids: AchievementId[]): GameState {
  const additions = ids.filter((id) => !game.achievements.includes(id))
  return additions.length ? { ...game, achievements: [...new Set([...game.achievements, ...additions])] } : game
}
