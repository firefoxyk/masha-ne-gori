import { useEffect, useRef } from 'react'
import { PROJECTS, projectReason } from './game/projects'
import type { ProjectCommand } from './game/projects'
import type { GameState, ProjectId } from './game/state'
import './projects.css'

export default function ProjectsDialog({ game, message, onCommand, onClose }: { game: GameState; message: string; onCommand: (id: ProjectId, command: ProjectCommand) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} className="projects-dialog" aria-labelledby="projects-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <h2 id="projects-title">Проекты Маши</h2>
    <p>Идеи и награды пока пробные. Начало и каждый шаг расходуют одно действие.</p>
    <p role="status">Маша: «{message}»</p>
    {PROJECTS.map((project) => {
      const progress = game.projects[project.id]
      const status = progress?.status ?? 'idea'
      const command: ProjectCommand = status === 'idea' ? 'start' : status === 'deferred' ? 'resume' : progress?.step === 1 ? 'step-1' : 'step-0'
      const step = progress && progress.step < 2 ? project.steps[progress.step] : null
      const reason = status === 'completed' ? null : projectReason(game, project.id, command)
      return <section className="project-card" key={project.id}>
        <h3>{project.title}</h3><p>{project.description}</p>
        <p>Состояние: {status === 'idea' ? 'идея' : status === 'started' ? 'начат' : status === 'deferred' ? 'отложен' : 'завершён'}{progress && status !== 'completed' ? `; шагов выполнено ${progress.step} из 2` : ''}</p>
        <p>Результат: +{project.reward.money} монет, +{project.reward.motivation} мотивации, +{project.reward.sanity} кукухи.</p>
        {status !== 'completed' && <>
          <p>{status === 'idea' ? 'Начало: 1 действие.' : status === 'deferred' ? 'Возобновить можно бесплатно.' : `Далее: ${step!.text} — 1 действие, ${step!.energy} энергии, ${step!.money} монет.`}</p>
          {reason && <p className="project-reason">{reason}</p>}
          <button type="button" disabled={!!reason} onClick={() => onCommand(project.id, command)}>{status === 'idea' ? 'Начать' : status === 'deferred' ? 'Продолжить' : step!.text}: {project.title}</button>
          {status === 'started' && <button type="button" onClick={() => onCommand(project.id, 'defer')}>Отложить: {project.title}</button>}
        </>}
        {status === 'completed' && <p>Маша: «{project.message}»</p>}
      </section>
    })}
    <button type="button" className="projects-close" onClick={onClose}>Вернуться в игру</button>
  </dialog>
}
