import { STAT_MAX } from './state.ts'
import type { GameState, ProjectId } from './state.ts'

type Step = { text: string; energy: number; money: number }
type Project = { id: ProjectId; title: string; description: string; steps: [Step, Step]; reward: { money: number; motivation: number; sanity: number }; message: string }

// Баланс и описания временные. Каждый этап расходует одно действие.
export const PROJECTS: Project[] = [
  { id: 'balcony-garden', title: 'Зелёный уголок', description: 'Вырастить немного зелени для домашнего уюта.', steps: [{ text: 'Подготовить горшок', energy: 5, money: 5 }, { text: 'Посадить семена', energy: 5, money: 5 }], reward: { money: 0, motivation: 2, sanity: 8 }, message: 'Зелень посажена. Осталось договориться с ней о поливе.' },
  { id: 'recipe-book', title: 'Книга простых рецептов', description: 'Собрать идеи для быстрых домашних обедов.', steps: [{ text: 'Записать любимые блюда', energy: 5, money: 0 }, { text: 'Проверить один рецепт', energy: 5, money: 10 }], reward: { money: 10, motivation: 5, sanity: 0 }, message: 'Рецепты собраны. Холодильник впечатлён.' },
  { id: 'cozy-corner', title: 'Открытка для соседа', description: 'Нарисовать открытку и порадовать кого-нибудь.', steps: [{ text: 'Придумать рисунок', energy: 5, money: 0 }, { text: 'Нарисовать открытку', energy: 10, money: 0 }], reward: { money: 5, motivation: 6, sanity: 3 }, message: 'Открытка готова, а сосед оставил монетку на новые карандаши.' },
]

export type ProjectCommand = 'start' | 'step-0' | 'step-1' | 'defer' | 'resume'
export function projectReason(game: GameState, id: ProjectId, command: ProjectCommand): string | null {
  const project = PROJECTS.find((item) => item.id === id)
  if (!project) return 'Проект не найден.'
  if (game.dayStatus !== 'active') return 'День уже завершён.'
  const progress = game.projects[id]
  if (command === 'start' && progress) return 'Проект уже начат.'
  if (command === 'defer' && progress?.status !== 'started') return 'Проект сейчас нельзя отложить.'
  if (command === 'resume' && progress?.status !== 'deferred') return 'Проект сейчас не отложен.'
  if (command.startsWith('step-') && (progress?.status !== 'started' || command !== `step-${progress.step}`)) return 'Этот шаг уже выполнен или недоступен.'
  if (command === 'defer' || command === 'resume') return null
  if (game.actionsRemaining < 1) return 'На сегодня действия закончились.'
  if (command !== 'start') {
    const step = project.steps[progress!.step]
    if (game.energy < step.energy) return `Нужно ${step.energy} энергии.`
    if (game.money < step.money) return `Нужно ${step.money} монет.`
  }
  return null
}

export function advanceProject(game: GameState, id: ProjectId, command: ProjectCommand): { state: GameState; success: boolean; message: string } {
  const reason = projectReason(game, id, command)
  if (reason) return { state: game, success: false, message: reason }
  const project = PROJECTS.find((item) => item.id === id)!
  const progress = game.projects[id]
  if (command === 'defer' || command === 'resume') return { state: { ...game, projects: { ...game.projects, [id]: { ...progress!, status: command === 'defer' ? 'deferred' : 'started' } } }, success: true, message: command === 'defer' ? 'Проект подождёт.' : 'Вернёмся к проекту.' }
  if (command === 'start') return { state: { ...game, actionsRemaining: game.actionsRemaining - 1, unfinishedProjects: game.unfinishedProjects + 1, projects: { ...game.projects, [id]: { status: 'started', step: 0 } } }, success: true, message: 'Проект начат. Маленький шаг тоже считается!' }
  const step = project.steps[progress!.step]
  const complete = progress!.step === project.steps.length - 1
  const next: GameState = { ...game, actionsRemaining: game.actionsRemaining - 1, energy: game.energy - step.energy, money: game.money - step.money, projects: { ...game.projects, [id]: { status: complete ? 'completed' : 'started', step: progress!.step + 1 } } }
  if (complete) {
    next.unfinishedProjects -= 1
    next.money += project.reward.money
    next.motivation = Math.min(STAT_MAX, next.motivation + project.reward.motivation)
    next.sanity = Math.min(STAT_MAX, next.sanity + project.reward.sanity)
  }
  return { state: next, success: true, message: complete ? project.message : 'Шаг готов. Можно продолжить позже.' }
}
