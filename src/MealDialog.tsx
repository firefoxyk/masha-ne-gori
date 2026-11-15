import { useLayoutEffect, useRef } from 'react'
import { MEAL_OPTIONS } from './content/meals'
import type { MealId } from './content/meals'
import { mealReason } from './game/meals'
import type { MealSession } from './game/meals'
import { bonuses } from './game/shop'
import type { GameState } from './game/state'

export default function MealDialog({ meal, game, onChoose, onCancel, onContinue, saveProblem }: { meal: MealSession; game: GameState; onChoose: (id: MealId) => void; onCancel: () => void; onContinue: () => void; saveProblem: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const result = meal.pending?.result
  const option = result ? MEAL_OPTIONS.find((item) => item.id === result.id) : undefined
  useLayoutEffect(() => {
    const element = dialog.current
    element?.showModal()
    heading.current?.focus()
    return () => { if (element?.open) element.close() }
  }, [])
  useLayoutEffect(() => { if (result) resultHeading.current?.focus() }, [result])
  return <dialog ref={dialog} className="event-dialog panel" aria-labelledby="meal-title" onCancel={(event) => { event.preventDefault(); if (meal.pending?.freeSnack) onCancel() }}>
    <h2 id="meal-title" ref={heading} tabIndex={-1}>Как поест Маша?</h2>
    {saveProblem && <p role="alert">Не удалось сохранить прогресс. После закрытия игры результаты этой сессии могут не сохраниться.</p>}
    {result && option ? <section aria-labelledby="meal-result-title">
      <h3 id="meal-result-title" ref={resultHeading} tabIndex={-1}>Еда: {option.label}</h3>
      <p>{option.lines[result.line].text}</p>
      <p>{[result.money ? `Деньги: ${result.money}` : '', result.energy ? `Энергия: ${result.energy}` : '', result.satiety ? `Сытость: +${result.satiety}` : ''].filter(Boolean).join(', ') || 'Показатели не изменились.'}</p>
      <button type="button" onClick={onContinue}>Продолжить игру</button>
    </section> : <section aria-label="Способ еды">
      <p>{meal.pending?.freeSnack ? 'На обычную еду не хватает монет. Можно бесплатно перекусить: действие потратится после подтверждения.' : 'Действие уже потрачено. Деньги и энергия спишутся после выбора.'}</p>
      {MEAL_OPTIONS.filter((item) => !meal.pending?.freeSnack || item.id === 'snack').map((item) => {
        const reason = mealReason(game, item.id)
        return <div key={item.id}><button type="button" disabled={!!reason} aria-describedby={reason ? `meal-${item.id}-reason` : undefined} onClick={() => onChoose(item.id)}>{item.label} — {item.money ? `${item.money} монет` : 'бесплатно'}, {item.energy ? `−${item.energy} энергии, ` : ''}+{item.satiety + bonuses(game).eat} сытости</button>{reason && <p className="event-note" id={`meal-${item.id}-reason`}>{reason}</p>}</div>
      })}
      {meal.pending?.freeSnack && <button type="button" onClick={onCancel}>Вернуться без перекуса</button>}
    </section>}
  </dialog>
}
