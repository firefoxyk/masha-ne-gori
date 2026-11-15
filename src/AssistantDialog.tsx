import { useLayoutEffect, useRef } from 'react'
import { assistantStyle, ASSISTANT_JOBS } from './game/assistant'
import type { AssistantTask, AssistantJob, AssistantJobId } from './game/assistant'
import type { GameState } from './game/state'
import { ASSISTANT_REPORTS, REPORT_REVIEW, reportsForJob } from './content/assistantReports'

export default function AssistantDialog({ game, task, job, legacyRead, onJob, onClaim, onRead, onReview, onLegacyRead, onClose, saveProblem }: { game: GameState; task: AssistantTask | undefined; job: AssistantJob | undefined; legacyRead?: boolean; onJob: (id: AssistantJobId) => void; onClaim: () => void; onRead: () => void; onReview: (command: 'note' | 'correct' | 'open-correction' | 'accept') => void; onLegacyRead: () => void; onClose: () => void; saveProblem: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const jobHeading = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const element = dialog.current
    element?.showModal()
    heading.current?.focus()
    return () => { if (element?.open) element.close() }
  }, [])
  useLayoutEffect(() => { if (job?.review && job.review !== 'waiting') jobHeading.current?.focus() }, [job?.review])
  const waitingLegacy = !!task && !legacyRead
  const waitingJob = !!job && (job.actual === null || job.read === false || (job.reportId !== undefined && !job.read))
  const report = job?.reportId ? ASSISTANT_REPORTS.find((item) => item.id === job.reportId) : undefined
  const review = report ? REPORT_REVIEW[report.id] : undefined
  const deferred = !!job?.project && game.projects[job.project.id]?.status === 'deferred'
  return <dialog ref={dialog} className="event-dialog panel" aria-labelledby="assistant-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <h2 id="assistant-title" ref={heading} tabIndex={-1}>ИИ-помощник</h2>
    {saveProblem && <p role="alert">Не удалось сохранить прогресс. После закрытия игры результаты этой сессии могут не сохраниться.</p>}
    {task && <><p>Прежнее пробное поручение: план спокойного вечера.</p>{game.day <= task.submittedDay ? <p role="status">Помощник: «Задачу принял! План будет готов завтра».</p> : <section aria-label="Результат поручения"><h3>План готов</h3><p>Помощник: «Поешь, отдохни и выбери одно небольшое дело. Остальное подождёт. Хотите уточнить, сколько времени у вас есть?»</p>{!legacyRead && <button type="button" onClick={onLegacyRead}>Закрыть прочитанный план</button>}</section>}</>}
    {job && <section aria-label="Новое поручение"><h3 ref={jobHeading} tabIndex={-1}>{job.project ? 'Шаг проекта для помощника' : ASSISTANT_JOBS[job.id].label}</h3>{report && <p>Поручение: {report.request}</p>}{deferred && <p>Проект отложен. Отчёт можно прочитать и проверить сейчас; чтобы принять результат и продвинуть шаг, сначала продолжите проект в списке.</p>}
      {game.day <= job.submittedDay ? <p role="status">Помощник готовит ответ к следующему дню.</p> : job.review === 'waiting' || (job.review === undefined && job.actual === null) ? <button type="button" onClick={onClaim}>Открыть отчёт</button> : <>
        <p>Помощник: «{ASSISTANT_JOBS[job.id].lines[assistantStyle(game)]}»</p>
        {report && <p>{job.correctionDay !== undefined && ['corrected', 'resolved', 'done'].includes(job.review ?? '') ? review?.correction : report.answer}</p>}
        {job.review === 'review' && <><button type="button" disabled={deferred} onClick={() => onReview('accept')}>Принять результат</button>{review && <button type="button" onClick={() => onReview('note')}>{review.remark}</button>}</>}
        {job.review === 'noted' && <><p role="status">Помощник: «{review?.reply}»</p>{review?.correction ? <><p>Исправление бесплатно; новый ответ будет готов на следующий игровой день.</p><button type="button" onClick={() => onReview('correct')}>Попросить исправить</button></> : <button type="button" disabled={deferred} onClick={() => onReview('accept')}>Принять результат</button>}</>}
        {job.review === 'correcting' && (job.correctionDay !== undefined && game.day > job.correctionDay ? <button type="button" onClick={() => onReview('open-correction')}>Открыть исправленный ответ</button> : <p role="status">Помощник готовит исправление к следующему дню. Можно заниматься другими делами.</p>)}
        {job.review === 'corrected' && <button type="button" disabled={deferred} onClick={() => onReview('accept')}>Завершить проверку</button>}
        {(job.review === 'resolved' || job.review === 'done') && <><p role="status">{job.reviewChanges ? `${review?.failure} Кукуха: ${job.reviewChanges.sanity}.${job.project ? ' Шаг проекта выполнен.' : ''}` : job.project ? 'Шаг проекта выполнен. Вернитесь к списку проектов, чтобы продолжить.' : `Результат получен: ${job.actual ? '+' : ''}${job.actual} (возможный эффект: ${ASSISTANT_JOBS[job.id].benefit}).`}</p>{job.review === 'resolved' && <button type="button" onClick={onRead}>Завершить проверку</button>}</>}
        {job.review === undefined && job.actual !== null && <><p role="status">Получено: {job.actual > 0 ? '+' : ''}{job.actual} (возможный эффект: {ASSISTANT_JOBS[job.id].benefit}).</p>{waitingJob && <button type="button" onClick={onRead}>Закрыть прочитанный отчёт</button>}</>}
      </>}
    </section>}
    {!waitingLegacy && !waitingJob && <section aria-label="Поручения помощнику"><h3>Небольшие поручения</h3><p>Каждое стоит 1 действие. Ответ и польза будут готовы на следующий день.</p>{Object.entries(ASSISTANT_JOBS).map(([id, item]) => <div key={id}><p>{reportsForJob(id as AssistantJobId)[0].request}</p><button type="button" disabled={game.actionsRemaining < 1} onClick={() => onJob(id as AssistantJobId)}>{item.label} — {item.benefit}</button></div>)}{game.actionsRemaining < 1 && <p>На сегодня действия закончились.</p>}</section>}
    <button type="button" onClick={onClose}>{job?.review && !['done', 'resolved'].includes(job.review) ? 'Отложить и вернуться в игру' : 'Вернуться в игру'}</button>
  </dialog>
}
