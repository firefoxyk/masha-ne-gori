import { projectLimit, STAT_MAX } from './state.ts'
import { PROJECT_STORIES } from '../content/projectStories.ts'
import { ASSISTANT_STYLES, PROJECT_CHOICES } from '../content/projectChoices.ts'
import { longStory, longStoryDetail } from '../content/projectStoriesV2.ts'
import { shortProjectChoice } from '../content/shortProjectChoices.ts'
import type { GameState, ProjectId, ProjectStoryProgress } from './state.ts'
import { ambiguousTraining } from './assistant.ts'

type Step = { text: string; energy: number; money: number }
type Project = { id: ProjectId; title: string; description: string; steps: [Step, Step]; reward: { money: number; motivation: number; sanity: number }; message: string }

// Баланс и описания временные. Каждый этап расходует одно действие.
export const PROJECTS: Project[] = [
  { id: 'balcony-garden', title: 'Зелёный уголок', description: 'Вырастить немного зелени для домашнего уюта.', steps: [{ text: 'Подготовить горшок', energy: 5, money: 5 }, { text: 'Посадить семена', energy: 5, money: 5 }], reward: { money: 0, motivation: 2, sanity: 8 }, message: 'Зелень посажена. Осталось договориться с ней о поливе.' },
  { id: 'recipe-book', title: 'Книга простых рецептов', description: 'Собрать идеи для быстрых домашних обедов.', steps: [{ text: 'Записать любимые блюда', energy: 5, money: 0 }, { text: 'Проверить один рецепт', energy: 5, money: 10 }], reward: { money: 10, motivation: 5, sanity: 0 }, message: 'Рецепты собраны. Холодильник впечатлён.' },
  { id: 'cozy-corner', title: 'Открытка для соседа', description: 'Нарисовать открытку и порадовать кого-нибудь.', steps: [{ text: 'Придумать рисунок', energy: 5, money: 0 }, { text: 'Нарисовать открытку', energy: 10, money: 0 }], reward: { money: 5, motivation: 6, sanity: 3 }, message: 'Открытка готова, а сосед оставил монетку на новые карандаши.' },
  { id: 'ideal-sofa', title: 'Найти идеальный диван', description: 'Найти диван и доставить его домой.', steps: [{ text: 'Измерить комнату', energy: 5, money: 0 }, { text: 'Подготовиться к доставке', energy: 5, money: 5 }], reward: { money: 0, motivation: 0, sanity: 0 }, message: '' },
  { id: 'train-assistant', title: 'Обучить домашнего ИИ-помощника', description: 'Настроить полезные напоминания.', steps: [{ text: 'Объяснить задачу', energy: 5, money: 0 }, { text: 'Проверить настройки', energy: 5, money: 0 }], reward: { money: 0, motivation: 0, sanity: 0 }, message: '' },
  { id: 'goose-owner', title: 'Выяснить, чей это гусь', description: 'Выяснить, откуда появился гость у окна.', steps: [{ text: 'Опросить соседей', energy: 5, money: 0 }, { text: 'Проверить приметы', energy: 5, money: 0 }], reward: { money: 0, motivation: 0, sanity: 0 }, message: '' },
]

export type ProjectCommand = 'start' | 'restart' | 'step-0' | 'step-1' | 'defer' | 'resume' | 'story-next'
export function projectStoryLength(id: ProjectId, story: ProjectStoryProgress): number { return story.edition === 2 ? longStory(id)!.length : PROJECT_STORIES[id][story.scenario].days.length }
export function projectStoryOptions(id: ProjectId, story: ProjectStoryProgress, index: number) { return story.edition === 2 ? longStory(id)?.[index]?.choices : story.edition === 3 ? shortProjectChoice(id, story.scenario, index)?.options : PROJECT_CHOICES[id]?.[index] }
export function projectStoryText(id: ProjectId, story: ProjectStoryProgress, index: number): string {
  const script = PROJECT_STORIES[id][story.scenario]
  if (story.edition === 3) {
    const choice = shortProjectChoice(id, story.scenario, 1)!
    const later = index === script.days.length - 1 ? choice.options.find((option) => option.label === story.choices?.['1'])?.later : undefined
    return `${script.days[index]}${index === 1 ? ` ${choice.question}` : ''}${later ? ` ${later}` : ''}`
  }
  if (story.edition !== 2) {
    const prefix = id === 'train-assistant' && index === script.days.length - 1 ? `ИИ: «${ASSISTANT_STYLES[story.choices?.['10'] ?? ''] ?? ''}» ` : ''
    return prefix + script.days[index]
  }
  const episodes = longStory(id)!
  const final = index === episodes.length - 1
  let context = ''
  if (id === 'ideal-sofa' && index === 2) context = story.choices?.['1']?.startsWith('Красивый') ? 'Красивый вариант понравился Маше, но стоил дороже. ' : story.choices?.['1']?.startsWith('Загадочный') ? 'Продавец загадочного дивана пообещал сюрприз. ' : 'Сосед готовит свой диван и инструменты. '
  if (id === 'ideal-sofa' && index === 3) context = story.choices?.['2'] === 'Измерить дверь' ? 'Благодаря замеру Маша заранее подготовила съёмные ножки. ' : 'Сосед пришёл с обещанными инструментами. '
  if (id === 'train-assistant' && index === 2) context = story.choices?.['1'] === 'Попросить спокойный план' ? 'В новом расписании осталось время на отдых. ' : 'Плотный план пришлось смягчить. '
  if (id === 'goose-owner' && index === 3) context = story.choices?.['2'] === 'Написать с юмором' ? 'На шуточное объявление пришёл ответ: «Белый — моя единственная примета». ' : 'На серьёзное объявление откликнулись соседи. '
  const style = final && id === 'train-assistant' ? `ИИ: «${ASSISTANT_STYLES[story.choices?.['3'] ?? ''] ?? ''}» ` : ''
  const ending = final ? ` ${script.days[script.days.length - 1]} ${longStoryDetail(id, story.choices, true)}` : ''
  return context + style + episodes[index].text + ending
}
export function nextProjectStory(game: GameState, id: ProjectId): string | null {
  const progress = game.projects[id]
  const story = progress?.story
  if (!story || progress.status !== 'started' || story.seen >= projectStoryLength(id, story)) return null
  const due = story.edition === 2 ? longStory(id)![story.seen].day : story.seen + 1
  if (story.startDay + due - 1 > game.day) return null
  return projectStoryText(id, story, story.seen)
}
export function projectReason(game: GameState, id: ProjectId, command: ProjectCommand): string | null {
  const project = PROJECTS.find((item) => item.id === id)
  if (!project) return 'Проект не найден.'
  if (game.dayStatus !== 'active') return 'День уже завершён.'
  const progress = game.projects[id]
  if (command === 'start' && progress) return 'Проект уже начат.'
  if (command === 'restart' && progress?.status !== 'completed') return 'Проект ещё не завершён.'
  if ((command === 'start' || command === 'restart') && (game.projectCompletions[id] ?? 0) >= projectLimit(id) && !(id === 'train-assistant' && ambiguousTraining(game))) return 'Проект больше недоступен: лимит прохождений исчерпан.'
  if (command === 'defer' && progress?.status !== 'started') return 'Проект сейчас нельзя отложить.'
  if (command === 'resume' && progress?.status !== 'deferred') return 'Проект сейчас не отложен.'
  if (command.startsWith('step-') && (progress?.status !== 'started' || command !== `step-${progress.step}`)) return 'Этот шаг уже выполнен или недоступен.'
  if (command === 'story-next') {
    if (!nextProjectStory(game, id)) return 'Пока нет нового события.'
    if (progress!.story!.seen === projectStoryLength(id, progress!.story!) - 1 && progress!.step < 2) return 'Сначала выполните оба шага проекта.'
    return null
  }
  if (command === 'defer' || command === 'resume') return null
  if (game.actionsRemaining < 1) return 'На сегодня действия закончились.'
  if (command !== 'start' && command !== 'restart') {
    const step = project.steps[progress!.step]
    if (game.energy < step.energy) return `Нужно ${step.energy} энергии.`
    if (game.money < step.money) return `Нужно ${step.money} монет.`
  }
  return null
}

export function advanceProject(game: GameState, id: ProjectId, command: ProjectCommand, random: () => number = Math.random, choice?: string): { state: GameState; success: boolean; message: string } {
  const reason = projectReason(game, id, command)
  if (reason) return { state: game, success: false, message: reason }
  const project = PROJECTS.find((item) => item.id === id)!
  const progress = game.projects[id]
  if (command === 'defer' || command === 'resume') return { state: { ...game, projects: { ...game.projects, [id]: { ...progress!, status: command === 'defer' ? 'deferred' : 'started' } } }, success: true, message: command === 'defer' ? 'Проект подождёт.' : 'Вернёмся к проекту.' }
  if (command === 'start' || command === 'restart') {
    const all = PROJECT_STORIES[id].map((_, i) => i)
    const remaining = projectLimit(id) === 5 ? all.filter((i) => !(game.projectSeenScenarios[id] ?? []).includes(i)) : all
    const candidates = remaining.length ? remaining : all
    const scenario = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))]
    const story: ProjectStoryProgress = { scenario, startDay: game.day, seen: 0, actual: null, edition: longStory(id) ? 2 : 3 }
    return { state: { ...game, actionsRemaining: game.actionsRemaining - 1, unfinishedProjects: game.unfinishedProjects + 1, projectWaits: { ...game.projectWaits, [id]: 0 }, projectIdeas: { ...game.projectIdeas, ids: game.projectIdeas.ids.filter((idea) => idea !== id) }, projects: { ...game.projects, [id]: { status: 'started', step: 0, story } } }, success: true, message: 'Проект начат. Появилось первое событие.' }
  }
  if (command === 'story-next') {
    const story = progress!.story!
    const script = PROJECT_STORIES[id][story.scenario]
    const options = projectStoryOptions(id, story, story.seen)
    const selected = options?.find((option) => option.label === choice)
    if (options && !selected) return { state: game, success: false, message: 'Выберите вариант.' }
    const cost = selected && 'cost' in selected && typeof selected.cost === 'number' ? selected.cost : 0
    if (game.money < cost) return { state: game, success: false, message: `Нужно ${cost} монет.` }
    const choices = selected ? { ...story.choices, [story.seen]: selected.label } : story.choices
    let message = projectStoryText(id, { ...story, choices }, story.seen) + (selected ? ` ${selected.response}` : '')
    const final = story.seen === projectStoryLength(id, story) - 1
    const actual: NonNullable<typeof story.actual> = {}
    const next = { ...game }
    next.money -= cost
    if (final) {
      for (const key of ['money', 'satiety', 'sanity', 'motivation'] as const) {
        const delta = script.effect[key] ?? 0
        next[key] = Math.max(0, Math.min(key === 'money' ? Infinity : STAT_MAX, game[key] + delta))
        if (delta) actual[key] = next[key] - game[key]
      }
      next.unfinishedProjects -= 1
      next.projectCompletions = { ...game.projectCompletions, [id]: Math.min(projectLimit(id), (game.projectCompletions[id] ?? 0) + 1) }
      if (id === 'train-assistant') message += ' Маша: «Теперь у меня есть помощник!» Помощник: «Готов помогать и задавать вопросы». Открыта панель ИИ-помощника.'
      if (projectLimit(id) === 5) next.projectSeenScenarios = { ...game.projectSeenScenarios, [id]: [...new Set([...(game.projectSeenScenarios[id] ?? []), story.scenario])] }
    }
    next.projects = { ...game.projects, [id]: { ...progress!, status: final ? 'completed' : 'started', story: { ...story, seen: story.seen + 1, actual: final ? actual : null, ...(choices ? { choices } : {}) } } }
    if (final) next.projectJournal = { ...game.projectJournal, [id]: [...(game.projectJournal[id] ?? []), { finishedDay: game.day, story: next.projects[id]!.story! }] }
    return { state: next, success: true, message }
  }
  const step = project.steps[progress!.step]
  const complete = !progress!.story && progress!.step === project.steps.length - 1
  const next: GameState = { ...game, actionsRemaining: game.actionsRemaining - 1, energy: game.energy - step.energy, money: game.money - step.money, projects: { ...game.projects, [id]: { ...progress!, status: complete ? 'completed' : 'started', step: progress!.step + 1 } } }
  if (complete) {
    next.unfinishedProjects -= 1
    next.projectCompletions = { ...game.projectCompletions, [id]: (game.projectCompletions[id] ?? 0) + 1 }
    next.money += project.reward.money
    next.motivation = Math.min(STAT_MAX, next.motivation + project.reward.motivation)
    next.sanity = Math.min(STAT_MAX, next.sanity + project.reward.sanity)
    const actual: NonNullable<import('./state.ts').ProjectJournalEntry['legacyResult']>['actual'] = {}
    if (project.reward.money) actual.money = next.money - game.money + step.money
    if (project.reward.motivation) actual.motivation = next.motivation - game.motivation
    if (project.reward.sanity) actual.sanity = next.sanity - game.sanity
    next.projectJournal = { ...game.projectJournal, [id]: [...(game.projectJournal[id] ?? []), { finishedDay: game.day, story: null, legacyResult: { message: project.message, actual } }] }
  }
  if (complete) {
    const earned = [next.money - game.money + step.money && `${next.money - game.money + step.money} монет`, next.motivation - game.motivation && `${next.motivation - game.motivation} мотивации`, next.sanity - game.sanity && `${next.sanity - game.sanity} кукухи`].filter(Boolean).join(', ')
    return { state: next, success: true, message: `${project.message} Получено: ${earned || 'показатели не изменились'}.` }
  }
  return { state: next, success: true, message: 'Шаг готов. Можно продолжить позже.' }
}
