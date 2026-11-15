import type { GameState } from './state.ts'

export const ENDING_IDS = ['home', 'goose'] as const
export type EndingId = typeof ENDING_IDS[number]

export const ENDINGS: Record<EndingId, { title: string; text: string; quote: string }> = {
  home: {
    title: 'Место для себя',
    text: 'Комната постепенно обжилась, а одна из задумок Маши наконец стала настоящим делом. Между работой и планами теперь можно оставлять место для простых радостей и передышки. Не каждый день идеален, зато он по-настоящему её.',
    quote: 'Оказывается, отдых тоже можно вписать в планы. Даже первым пунктом.',
  },
  goose: {
    title: 'Гусиные полномочия',
    text: 'Поиски хозяина гуся закончились, но у комнаты появился новый почётный инспектор по важным делам. Он проверяет порядок, настроение и, кажется, содержимое холодильника. Документы на должность гусь принёс сам. Вероятно.',
    quote: 'Главное, чтобы он не назначил совещание на мой обед.',
  },
}

export function availableEndings(game: GameState): EndingId[] {
  const completed = Object.values(game.projectCompletions).some(count => (count ?? 0) > 0) || Object.values(game.projects).some(project => project?.status === 'completed')
  const gooseCompleted = (game.projectCompletions['goose-owner'] ?? 0) > 0 || game.projects['goose-owner']?.status === 'completed'
  return [...(completed && game.ownedItems.length > 0 ? ['home' as const] : []), ...(gooseCompleted ? ['goose' as const] : [])]
}

export function isValidEndingsSeen(value: unknown): value is EndingId[] {
  return Array.isArray(value) && value.every(id => ENDING_IDS.includes(id)) && new Set(value).size === value.length
}
