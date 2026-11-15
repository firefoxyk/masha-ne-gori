import { useEffect, useRef, useState } from 'react'
import { ENDINGS } from './game/endings'
import type { EndingId } from './game/endings'
import type { GameState } from './game/state'
import './projects.css'

export default function EndingDialog({ id, game, onContinue, onNewGame, saveProblem }: { id: EndingId; game: GameState; onContinue: () => void; onNewGame: () => void; saveProblem: boolean }) {
  const [confirm, setConfirm] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const confirmTitle = useRef<HTMLHeadingElement>(null)
  const newGameButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { const el = dialog.current; el?.showModal(); title.current?.focus(); return () => { if (el?.open) el.close() } }, [])
  useEffect(() => { if (confirm) confirmTitle.current?.focus() }, [confirm])
  function cancelNewGame() { setConfirm(false); requestAnimationFrame(() => newGameButton.current?.focus()) }
  const ending = ENDINGS[id]
  return <dialog ref={dialog} className="projects-dialog ending-dialog" aria-labelledby="ending-title" onCancel={event => { event.preventDefault(); if (confirm) cancelNewGame(); else onContinue() }}>
    <div className="projects-content">
      <h2 id="ending-title" ref={title} tabIndex={-1}>{ending.title}</h2>
      {saveProblem && <p role="alert">Прогресс этой вкладки не сохраняется. Вернитесь к игре, чтобы узнать подробности.</p>}
      <p>{ending.text}</p>
      <p>Маша: «{ending.quote}»</p>
      <p>Игровой день: {game.day}. Постоянных вещей: {game.ownedItems.length}. Достижений: {game.achievements.length}.</p>
      <p>История продолжается: можно вернуться к игре или начать заново.</p>
      {!confirm ? <><button className="projects-close" type="button" onClick={onContinue}>Продолжить игру</button><button ref={newGameButton} className="projects-close" type="button" onClick={() => setConfirm(true)}>Начать новую игру</button></> : <div className="ending-confirm" role="group" aria-labelledby="ending-confirm-title">
        <h3 id="ending-confirm-title" ref={confirmTitle} tabIndex={-1}>Начать новую игру?</h3>
        <p>Текущее прохождение будет сброшено вместе с покупками, проектами, историями и достижениями. Это нельзя отменить.</p>
        <button className="projects-close" type="button" onClick={cancelNewGame}>Отмена</button>
        <button className="projects-close" type="button" onClick={onNewGame}>Да, начать новую игру</button>
      </div>}
    </div>
  </dialog>
}
