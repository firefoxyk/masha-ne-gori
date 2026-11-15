import { useEffect, useRef, useState } from 'react'
import { PROJECTS, nextProjectStory, projectReason, projectStoryLength, projectStoryOptions, projectStoryText } from './game/projects'
import type { ProjectCommand } from './game/projects'
import { genericProjects, projectLimit } from './game/state'
import type { GameState, ProjectId } from './game/state'
import { ambiguousTraining } from './game/assistant'
import type { AssistantJob } from './game/assistant'
import { DELEGATED_PROJECTS, delegationReason, projectStepLocked } from './game/projectDelegation'
import type { DelegatedProject } from './game/projectDelegation'
import './projects.css'

type Status = 'idea' | 'started' | 'deferred' | 'completed'
const groups: { id: Status; title: string }[] = [
  { id: 'started', title: 'В работе' }, { id: 'deferred', title: 'Отложены' },
  { id: 'idea', title: 'Доступные идеи' }, { id: 'completed', title: 'Завершены' },
]
const labels = { money: 'монет', satiety: 'сытости', sanity: 'кукухи', motivation: 'мотивации' }

export default function ProjectsDialog({ game, message, onCommand, onClose, assistantJob, legacyBusy, onDelegate }: { game: GameState; message: string; onCommand: (id: ProjectId, command: ProjectCommand, choice?: string) => void; onClose: () => void; assistantJob?: AssistantJob; legacyBusy: boolean; onDelegate: (id: DelegatedProject) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    title.current?.focus()
    return () => { if (dialog?.open) dialog.close() }
  }, [])
  const oldCount = genericProjects(game)
  function perform(id: ProjectId, command: ProjectCommand, choice?: string) {
    if (command === 'start' || command === 'restart' || command === 'resume') setOpenId(`started:${id}`)
    if (command === 'defer') setOpenId(`deferred:${id}`)
    if (command === 'story-next') {
      const story = game.projects[id]?.story
      if (story && story.seen === projectStoryLength(id, story) - 1) setOpenId(`completed:${id}`)
    }
    if (command === 'step-1' && !game.projects[id]?.story) setOpenId(`completed:${id}`)
    onCommand(id, command, choice)
    if (['start', 'restart', 'defer', 'resume', 'story-next', 'step-1'].includes(command)) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[id^="project-summary-${id}-"]`)?.focus())
  }
  return <dialog ref={ref} className="projects-dialog" aria-labelledby="projects-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="projects-content">
      <h2 id="projects-title" ref={title} tabIndex={-1}>Проекты Маши</h2>
      <p>Начало и каждый шаг расходуют одно действие. Осталось действий: <strong>{game.actionsRemaining}</strong>.</p>
      <p className="projects-count">Незаконченных: {game.unfinishedProjects} — именованных {game.unfinishedProjects - oldCount}, обобщённых {oldCount}.</p>
      <p>Обобщённые проекты — прежнее количество без названий. События могут его менять; управлять им здесь нельзя.</p>
      <p className="project-notice" role="status" aria-live="polite">Маша: «{message}»</p>
      {groups.map((group) => {
        const visible = PROJECTS.filter((p) => group.id === 'idea' ? (game.projectIdeas.ids.includes(p.id) || (p.id === 'train-assistant' && !game.projects[p.id])) && (!game.projects[p.id] || game.projects[p.id]?.status === 'completed') && ((game.projectCompletions[p.id] ?? 0) < (['balcony-garden', 'recipe-book', 'cozy-corner'].includes(p.id) ? 5 : 1) || (p.id === 'train-assistant' && !game.projects[p.id] && ambiguousTraining(game))) : game.projects[p.id]?.status === group.id)
        return <section className="project-group" key={group.id} aria-labelledby={`project-group-${group.id}`}>
        <h3 id={`project-group-${group.id}`}>{group.title} <span>({visible.length})</span></h3>
        {group.id === 'idea' && visible.length === 0 && <p>Пока нет новых идей для проектов</p>}
        {visible.map((project) => {
          const progress = game.projects[project.id]
          const status = progress?.status ?? 'idea'
          const story = progress?.story
          const available = nextProjectStory(game, project.id)
          const command: ProjectCommand = status === 'idea' ? 'start' : status === 'completed' ? 'restart' : status === 'deferred' ? 'resume' : progress?.step === 1 ? 'step-1' : 'step-0'
          const step = progress && progress.step < project.steps.length ? project.steps[progress.step] : null
          const canCommand = group.id === 'completed' ? project.id === 'train-assistant' && ambiguousTraining(game) : status !== 'started' || !!step
          const locked = projectStepLocked(assistantJob, game, project.id)
          const reason = canCommand ? (command === 'step-0' && locked ? 'Шаг поручен помощнику. Дождитесь отчёта и проверьте его.' : projectReason(game, project.id, command)) : null
          const delegatable = status === 'started' && progress?.step === 0 && Object.hasOwn(DELEGATED_PROJECTS, project.id)
          const delegateId = project.id as DelegatedProject
          const delegateWhy = delegatable ? delegationReason(game, assistantJob, delegateId, legacyBusy) : null
          const storyReason = available ? projectReason(game, project.id, 'story-next') : null
          const actual = story?.actual && Object.entries(story.actual).map(([key, value]) => `${value > 0 ? '+' : ''}${value} ${labels[key as keyof typeof labels]}`).join(', ')
          const legacyResult = game.projectJournal[project.id]?.at(-1)?.legacyResult
          const legacyActual = legacyResult && Object.entries(legacyResult.actual).map(([key, value]) => `${value > 0 ? '+' : ''}${value} ${labels[key as keyof typeof labels]}`).join(', ')
          const choices = story && projectStoryOptions(project.id, story, story.seen)
          const previousChoice = story && story.seen > 0 ? projectStoryOptions(project.id, story, story.seen - 1)?.find((item) => item.label === story.choices?.[story.seen - 1]) : undefined
          const cardId = `${group.id}:${project.id}`
          return <details className="project-card" key={project.id} open={openId === cardId}>
            <summary id={`project-summary-${project.id}-${group.id}`} onClick={(event) => { event.preventDefault(); setOpenId(openId === cardId ? null : cardId) }}><span>{project.title}{available ? ' · Новое событие' : ''}</span><span className="project-progress">{progress?.step ?? 0} / {project.steps.length}</span></summary>
            <div className="project-details">
              <p>{project.description}</p>
              {project.id === 'train-assistant' && group.id === 'completed' && ambiguousTraining(game) && <p>В старом сохранении не осталось подтверждения прохождения истории обучения. Можно пройти её сейчас; прежние записи сохранятся.</p>}
              {group.id === 'idea' && <p>Продолжительность: {project.id === 'ideal-sofa' ? 'около 10' : project.id === 'train-assistant' ? 'около 12' : project.id === 'goose-owner' ? 'около 13' : '3–5'} игровых дней. {projectLimit(project.id) === 1 ? 'Одноразовый проект; предстоит несколько решений.' : 'Повторяемый проект; иногда нужно заглянуть в историю.'} Начало стоит 1 действие и добавит один незаконченный проект.</p>}
              <p>Состояние: {status === 'idea' ? 'идея' : status === 'started' ? 'начат' : status === 'deferred' ? 'отложен' : 'завершён'}; шагов выполнено {progress?.step ?? 0} из {project.steps.length}.</p>
              {story && <p>Игровой день истории: {game.day - story.startDay + 1}. {status === 'deferred' ? 'Проект отложен; события подождут.' : available ? 'Появилось новое событие.' : status === 'started' ? 'Ждём продолжения.' : 'История завершена.'}</p>}
              {story && story.seen > 0 && <p>История: {projectStoryText(project.id, story, story.seen - 1)} {previousChoice?.response}</p>}
              {status === 'completed' && (story ? actual && <p>Изменения: {actual}.</p> : legacyResult ? <><p>Маша: «{legacyResult.message}»</p>{legacyActual && <p>Изменения: {legacyActual}.</p>}</> : <p>Подробности прежнего завершения не сохранились.</p>)}
              {available && <>{choices ? <><p>{available}</p>{choices.map((item, index) => {
                const cost = 'cost' in item && typeof item.cost === 'number' ? item.cost : 0
                const why = cost > game.money ? `Не хватает монет: нужно ${cost}.` : storyReason
                return <div key={item.label}><button type="button" disabled={!!why} aria-describedby={why ? `choice-reason-${project.id}-${index}` : undefined} onClick={() => perform(project.id, 'story-next', item.label)}>{item.label}</button>{why && <p className="project-reason" id={`choice-reason-${project.id}-${index}`}>{why}</p>}</div>
              })}</> : <button type="button" disabled={!!storyReason} onClick={() => perform(project.id, 'story-next')}>Прочитать событие: {project.title}</button>}{storyReason && <p className="project-reason">{storyReason}</p>}</>}
              {canCommand && <>
                <p>{status === 'idea' ? 'Далее: начать — 1 действие.' : status === 'completed' ? 'Можно начать новую историю — 1 действие.' : status === 'deferred' ? 'Далее: продолжить — бесплатно.' : `Далее: ${step!.text} — 1 действие, ${step!.energy} энергии, ${step!.money} монет.`}</p>
                {reason && <p className="project-reason" id={`project-reason-${project.id}`}>{reason}</p>}
                <button type="button" disabled={!!reason} aria-describedby={reason ? `project-reason-${project.id}` : undefined} onClick={() => perform(project.id, command)}>{status === 'idea' ? 'Начать' : status === 'completed' ? 'Начать снова' : status === 'deferred' ? 'Продолжить' : step!.text}: {project.title}</button>
              </>}
              {locked && <p role="status">{assistantJob?.review === 'waiting' ? (game.day > assistantJob.submittedDay ? 'Отчёт готов.' : 'Шаг поручен; отчёт будет завтра.') : assistantJob?.review === 'correcting' ? 'Помощник готовит исправление.' : 'Отчёт ожидает проверки.'} Откройте «ИИ-помощник» на игровом экране.</p>}
              {delegatable && <div><p>Можно поручить помощнику: 1 действие, {DELEGATED_PROJECTS[delegateId].money} монет, отчёт на следующий день; энергия не расходуется.</p><button type="button" disabled={!!delegateWhy} aria-describedby={delegateWhy ? `delegate-reason-${project.id}` : undefined} onClick={() => onDelegate(delegateId)}>Поручить помощнику: {project.title}</button>{delegateWhy && <p className="project-reason" id={`delegate-reason-${project.id}`}>{delegateWhy}</p>}</div>}
              {status === 'started' && <button type="button" onClick={() => perform(project.id, 'defer')}>Отложить: {project.title}</button>}
            </div>
          </details>
        })}
      </section>})}
      {PROJECTS.some((project) => (game.projectJournal[project.id]?.length ?? 0) > 0) && <section className="project-group" aria-labelledby="project-journal-title">
        <h3 id="project-journal-title">Журнал историй</h3>
        {PROJECTS.flatMap((project) => (game.projectJournal[project.id] ?? []).map((entry, i) => <details className="project-card" key={`${project.id}-${i}`}><summary>{project.title} — прохождение {i + 1}</summary><div className="project-details">
          <p>Зафиксировано в день {entry.finishedDay}.</p>
          {entry.story ? <><p>{projectStoryText(project.id, entry.story, projectStoryLength(project.id, entry.story) - 1)}</p>{entry.story.choices && <p>Выборы: {Object.values(entry.story.choices).join('; ')}.</p>}{Object.keys(entry.story.actual ?? {}).length > 0 && <p>Изменения: {Object.entries(entry.story.actual ?? {}).map(([key, value]) => `${value > 0 ? '+' : ''}${value} ${labels[key as keyof typeof labels]}`).join(', ')}.</p>}</> : entry.legacyResult ? <><p>{entry.legacyResult.message}</p>{Object.keys(entry.legacyResult.actual).length > 0 && <p>Изменения: {Object.entries(entry.legacyResult.actual).map(([key, value]) => `${value > 0 ? '+' : ''}${value} ${labels[key as keyof typeof labels]}`).join(', ')}.</p>}</> : <p>Подробности прежнего завершения не сохранились.</p>}
        </div></details>))}
      </section>}
    </div>
    <div className="projects-footer"><button type="button" className="projects-close" onClick={onClose}>Вернуться в игру</button></div>
  </dialog>
}
