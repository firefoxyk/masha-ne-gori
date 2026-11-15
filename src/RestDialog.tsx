import { useLayoutEffect, useRef } from 'react'
import { REST_OPTIONS } from './content/rest'
import type { RestId } from './content/rest'
import type { RestSession } from './game/rest'
import { bonuses } from './game/shop'
import type { GameState } from './game/state'

export default function RestDialog({ rest, game, onChoose, onContinue, saveProblem }: { rest: RestSession; game: GameState; onChoose: (id: RestId) => void; onContinue: () => void; saveProblem: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const result = rest.pending?.result
  const option = result ? REST_OPTIONS.find((item) => item.id === result.id) : undefined
  useLayoutEffect(() => {
    const element = dialog.current
    element?.showModal()
    heading.current?.focus()
    return () => { if (element?.open) element.close() }
  }, [])
  useLayoutEffect(() => { if (result) resultHeading.current?.focus() }, [result])
  return <dialog ref={dialog} className="event-dialog panel" aria-labelledby="rest-title" onCancel={(event) => event.preventDefault()}>
    <h2 id="rest-title" ref={heading} tabIndex={-1}>Как отдохнёт Маша?</h2>
    {saveProblem && <p role="alert">Не удалось сохранить прогресс. После закрытия игры результаты этой сессии могут не сохраниться.</p>}
    {result && option ? <section aria-labelledby="rest-result-title">
      <h3 id="rest-result-title" ref={resultHeading} tabIndex={-1}>Отдых: {option.label}</h3>
      <p>{option.lines[result.line]}</p>
      <p>{result.energy || result.sanity ? [result.energy ? `Энергия: +${result.energy}` : '', result.sanity ? `Кукуха: +${result.sanity}` : ''].filter(Boolean).join(', ') : 'Показатели не изменились.'}</p>
      <button type="button" onClick={onContinue}>Продолжить игру</button>
    </section> : <section aria-label="Способ отдыха">
      <p>Действие уже потрачено. Выберите, как восстановить силы.</p>
      {REST_OPTIONS.map((item) => <button key={item.id} type="button" onClick={() => onChoose(item.id)}>{item.label} — энергия +{item.energy + bonuses(game).rest}, кукуха +{item.sanity}</button>)}
    </section>}
  </dialog>
}
