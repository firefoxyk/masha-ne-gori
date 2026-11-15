import { useLayoutEffect, useRef } from 'react'
import { exampleEvents } from './content/events'
import { workEvents } from './content/workEvents'
import { choiceUnavailableReason } from './game/eventSelection'
import type { EventSession } from './game/eventSession'
import type { GameState } from './game/state'

export default function EventDialog({ pending, game, onChoose, onContinue, saveProblem, work = false }: { pending: NonNullable<EventSession['pending']>; game: GameState; onChoose: (id: string) => void; onContinue: () => void; saveProblem: boolean; work?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const event = (work ? workEvents : exampleEvents).find((item) => item.id === pending.eventId)!
  const choice = event.choices.find((item) => item.id === pending.choiceId)
  useLayoutEffect(() => {
    const element = dialog.current
    if (!element) return
    element.showModal()
    title.current?.focus()
    return () => { if (element.open) element.close() }
  }, [])
  useLayoutEffect(() => { if (choice) resultRef.current?.focus() }, [choice])
  return <dialog className="event-dialog panel" ref={dialog} aria-labelledby="event-title" onCancel={(event) => event.preventDefault()}>
    <h2 id="event-title" tabIndex={-1} ref={title}>{event.title}</h2>
    <p className="event-story">{event.text}</p>
    {event.dialogue.map((line, index) => <p className="event-quote" key={`${line.speaker}-${index}`}><strong>{line.speaker}:</strong> «{line.text}»</p>)}
    {saveProblem && <p role="alert">Не удалось сохранить прогресс. После закрытия игры результаты этой сессии могут не сохраниться.</p>}
    {choice ? <section aria-labelledby="event-result-title">
      <h3 id="event-result-title" tabIndex={-1} ref={resultRef}>Результат</h3>
      <p>{choice.result}</p>
      {pending.changes === null ? <p className="event-note">Этот выбор сделан в предыдущей версии, когда последствия ещё не применялись.</p> : Object.keys(pending.changes).length === 0 ? <p className="event-note">Показатели не изменились.</p> : <div className="event-note"><p>Изменения:</p><ul>{Object.entries(pending.changes).map(([field, amount]) => <li key={field}>{({ energy: 'Энергия', satiety: 'Сытость', sanity: 'Кукуха', motivation: 'Мотивация', money: 'Деньги', unfinishedProjects: 'Незаконченные проекты', actionsRemaining: 'Осталось действий' } as Record<string, string>)[field]}: {amount > 0 ? '+' : ''}{amount}</li>)}</ul></div>}
      <button type="button" onClick={onContinue}>Продолжить игру</button>
    </section> : <section aria-labelledby="event-choice-title">
      <h3 id="event-choice-title">Что выберет Маша?</h3>
      {event.choices.map((item) => {
        const reason = choiceUnavailableReason(item, game)
        return <div key={item.id}><button type="button" disabled={!!reason} aria-describedby={reason ? `choice-${item.id}-reason` : undefined} onClick={() => onChoose(item.id)}>{item.text}</button>{reason && <p id={`choice-${item.id}-reason`} className="event-note">{reason}</p>}</div>
      })}
    </section>}
  </dialog>
}
