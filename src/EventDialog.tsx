import { useLayoutEffect, useRef } from 'react'
import { exampleEvents } from './content/events'
import { availableEventChoices } from './game/eventSelection'
import type { EventSession } from './game/eventSession'
import type { GameState } from './game/state'

export default function EventDialog({ pending, game, onChoose, onContinue, saveProblem }: { pending: NonNullable<EventSession['pending']>; game: GameState; onChoose: (id: string) => void; onContinue: () => void; saveProblem: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const event = exampleEvents.find((item) => item.id === pending.eventId)!
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
      <p className="event-note">В этой версии выбор пока не изменяет показатели и деньги.</p>
      <button type="button" onClick={onContinue}>Продолжить игру</button>
    </section> : <section aria-labelledby="event-choice-title">
      <h3 id="event-choice-title">Что выберет Маша?</h3>
      {availableEventChoices(event, game).map((item) => <button type="button" key={item.id} onClick={() => onChoose(item.id)}>{item.text}</button>)}
    </section>}
  </dialog>
}
