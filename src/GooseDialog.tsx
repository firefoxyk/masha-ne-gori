import { useLayoutEffect, useRef } from 'react'
import { GOOSE_CHOICES } from './game/gooseInteraction'
import type { GooseChoice, GooseSession } from './game/gooseInteraction'
import type { GameState } from './game/state'

export default function GooseDialog({ game, pending, onChoose, onContinue, saveProblem }: { game: GameState; pending: NonNullable<GooseSession['pending']>; onChoose: (id: GooseChoice) => void; onContinue: () => void; saveProblem: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const result = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => { const node = dialog.current; node?.showModal(); title.current?.focus(); return () => { if (node?.open) node.close() } }, [])
  useLayoutEffect(() => { if (pending.choice) result.current?.focus() }, [pending.choice])
  const choice = pending.choice && GOOSE_CHOICES[pending.choice]
  return <dialog ref={dialog} className="event-dialog panel" aria-labelledby="goose-title" onCancel={event => event.preventDefault()}>
    <h2 id="goose-title" ref={title} tabIndex={-1}>Гость с крыльями</h2>
    <p>Гусь заглянул в комнату и выжидательно смотрит на Машу.</p>
    {saveProblem && <p role="alert">Не удалось сохранить прогресс. Результат может не сохраниться после закрытия игры.</p>}
    {choice ? <section><h3 ref={result} tabIndex={-1}>Результат</h3><p>{choice.result}</p><p>Изменения: кукуха {pending.changes!.sanity > 0 ? '+' : ''}{pending.changes!.sanity}, мотивация {pending.changes!.motivation > 0 ? '+' : ''}{pending.changes!.motivation}, деньги {pending.changes!.money}.</p><button type="button" onClick={onContinue}>Продолжить игру</button></section> : <section><p>Одно общение за визит, игровое действие не расходуется.</p>{(Object.keys(GOOSE_CHOICES) as GooseChoice[]).map(id => {
      const item = GOOSE_CHOICES[id], unavailable = game.money < item.cost
      return <div key={id}><button type="button" disabled={unavailable} aria-describedby={unavailable ? 'goose-money-reason' : undefined} onClick={() => onChoose(id)}>{item.label}</button>{unavailable && <p id="goose-money-reason">Не хватает монет: нужно {item.cost}.</p>}</div>
    })}</section>}
  </dialog>
}
