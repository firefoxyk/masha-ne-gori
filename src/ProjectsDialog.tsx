import { useEffect, useRef, useState } from 'react'
import { PROJECTS, projectReason } from './game/projects'
import type { ProjectCommand } from './game/projects'
import { genericProjects } from './game/state'
import type { GameState, ProjectId } from './game/state'
import './projects.css'

type Status = 'idea' | 'started' | 'deferred' | 'completed'
const groups: { id: Status; title: string }[] = [
  { id: 'started', title: 'В работе' }, { id: 'deferred', title: 'Отложены' },
  { id: 'idea', title: 'Доступные идеи' }, { id: 'completed', title: 'Завершены' },
]

export default function ProjectsDialog({ game, message, onCommand, onClose }: { game: GameState; message: string; onCommand: (id: ProjectId, command: ProjectCommand) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const previousGame = useRef(game)
  const [openId, setOpenId] = useState<ProjectId | null>(null)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    title.current?.focus()
    return () => { if (dialog?.open) dialog.close() }
  }, [])
  useEffect(() => {
    const previous = previousGame.current
    for (const project of PROJECTS) {
      if (previous.projects[project.id]?.status === 'started' && game.projects[project.id]?.status === 'completed') {
        const lastStep = project.steps[project.steps.length - 1]
        const earned = [
          game.money - previous.money + lastStep.money && `${game.money - previous.money + lastStep.money} монет`,
          game.motivation - previous.motivation && `${game.motivation - previous.motivation} мотивации`,
          game.sanity - previous.sanity && `${game.sanity - previous.sanity} кукухи`,
        ].filter(Boolean).join(', ')
        setNotice(`Проект «${project.title}» завершён. Получено: ${earned || 'показатели не изменились из-за их границ'}.`)
      }
    }
    previousGame.current = game
  }, [game])
  const oldCount = genericProjects(game)
  const namedCount = game.unfinishedProjects - oldCount
  function perform(id: ProjectId, command: ProjectCommand) {
    setNotice('')
    onCommand(id, command)
    if (command === 'start' || command === 'defer' || command === 'resume' || command === 'step-1') {
      requestAnimationFrame(() => document.getElementById(`project-summary-${id}`)?.focus())
    }
  }
  return <dialog ref={ref} className="projects-dialog" aria-labelledby="projects-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="projects-content">
      <h2 id="projects-title" ref={title} tabIndex={-1}>Проекты Маши</h2>
      <p>Начало и каждый шаг расходуют одно действие. Осталось действий: <strong>{game.actionsRemaining}</strong>.</p>
      <p className="projects-count">Незаконченных: {game.unfinishedProjects} — именованных {namedCount}, обобщённых {oldCount}.</p>
      <p>Обобщённые проекты — прежнее количество без названий. События могут его менять; управлять им здесь нельзя.</p>
      <p className="project-notice" role="status" aria-live="polite">{notice || `Маша: «${message}»`}</p>
      {groups.map((group) => {
        const projects = PROJECTS.filter((project) => (game.projects[project.id]?.status ?? 'idea') === group.id)
        return <section className="project-group" key={group.id} aria-labelledby={`project-group-${group.id}`}>
          <h3 id={`project-group-${group.id}`}>{group.title} <span>({projects.length})</span></h3>
          {projects.length === 0 && <p className="project-empty">Пока нет</p>}
          {projects.map((project) => {
            const progress = game.projects[project.id]
            const status = progress?.status ?? 'idea'
            const command: ProjectCommand = status === 'idea' ? 'start' : status === 'deferred' ? 'resume' : progress?.step === 1 ? 'step-1' : 'step-0'
            const step = progress && progress.step < project.steps.length ? project.steps[progress.step] : null
            const reason = status === 'completed' ? null : projectReason(game, project.id, command)
            const completed = progress?.step ?? 0
            const reward = [[project.reward.money, 'монет'], [project.reward.motivation, 'мотивации'], [project.reward.sanity, 'кукухи']].filter(([amount]) => amount !== 0).map(([amount, label]) => `+${amount} ${label}`).join(', ')
            return <details className="project-card" key={project.id} open={openId === project.id}>
              <summary id={`project-summary-${project.id}`} onClick={(event) => { event.preventDefault(); setOpenId(openId === project.id ? null : project.id) }}>
                <span>{project.title}</span><span className="project-progress">{completed} / {project.steps.length}</span>
              </summary>
              <div className="project-details">
                <p>{project.description}</p>
                <p>Состояние: {status === 'idea' ? 'идея' : status === 'started' ? 'начат' : status === 'deferred' ? 'отложен' : 'завершён'}; шагов выполнено {completed} из {project.steps.length}.</p>
                <p>{status === 'completed' ? 'Награда при завершении' : 'Награда за завершение'}: {reward}. Шкалы ограничены 100.</p>
                {status !== 'completed' && <>
                  <p>{status === 'idea' ? 'Далее: начать — 1 действие.' : status === 'deferred' ? 'Далее: продолжить — бесплатно.' : `Далее: ${step!.text} — 1 действие, ${step!.energy} энергии, ${step!.money} монет.`}</p>
                  {reason && <p className="project-reason" id={`project-reason-${project.id}`}>{reason}</p>}
                  <button type="button" disabled={!!reason} aria-describedby={reason ? `project-reason-${project.id}` : undefined} onClick={() => perform(project.id, command)}>{status === 'idea' ? 'Начать' : status === 'deferred' ? 'Продолжить' : step!.text}: {project.title}</button>
                  {status === 'started' && <button type="button" onClick={() => perform(project.id, 'defer')}>Отложить: {project.title}</button>}
                </>}
                {status === 'completed' && <p>Маша: «{project.message}»</p>}
              </div>
            </details>
          })}
        </section>
      })}
    </div>
    <div className="projects-footer"><button type="button" className="projects-close" onClick={onClose}>Вернуться в игру</button></div>
  </dialog>
}
