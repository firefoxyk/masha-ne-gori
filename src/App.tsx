import roomImage from './assets/starter-room.webp'
import plantImage from './assets/room-items/plant.png'
import pillowImage from './assets/room-items/pillow.png'
import blanketImage from './assets/room-items/blanket.png'
import lampImage from './assets/room-items/lamp.png'
import { useEffect, useRef, useState } from 'react'
import { STAT_MAX } from './game/state'
import { ACTIONS, getActionDescription, getActionUnavailableReason } from './game/actions'
import type { ActionId } from './game/actions'
import { getDaySummary } from './game/day'
import { getDetailedStateWarnings } from './game/warnings'
import { useGame } from './storage/useGame'
import DaySummaryPanel from './DaySummaryDialog'
import ShopDialog from './ShopDialog'
import EventDialog from './EventDialog'

export default function App() {
  const { game, events, message, storage, writeFailed, handleAction, handleFinishDay, handleNextDay, handlePurchase, handleEventChoice, handleEventContinue, startNewGame } = useGame()
  const actionIds: ActionId[] = ['work', 'eat', 'rest']
  const [openWarning, setOpenWarning] = useState<string | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const returnFocus = useRef(false)
  const focusSummary = useRef(false)
  function nextDay() { setShopOpen(false); focusSummary.current = false; returnFocus.current = true; handleNextDay() }
  function closeShop() { setShopOpen(false); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.shop-open')?.focus()) }
  function closeEvent() { handleEventContinue(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus()) }
  useEffect(() => {
    if (returnFocus.current && game.dayStatus === 'active') {
      returnFocus.current = false
      document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus()
    }
  }, [game.dayStatus])
  const summary = game.dayStatus === 'finished' ? getDaySummary(game) : null
  const warnings = getDetailedStateWarnings(game)
  const selectedWarning = warnings.find((warning) => warning.stat === openWarning)
  function closeWarning() {
    const stat = selectedWarning?.stat
    setOpenWarning(null)
    if (stat) document.getElementById(`warning-${stat}`)?.focus()
  }
  const commonReason = game.actionsRemaining === 0 ? 'Действия на сегодня закончились. Можно завершить день.' : null
  const stats = [
    { label: 'Энергия', value: game.energy, icon: '✦', color: 'energy' },
    { label: 'Сытость', value: game.satiety, icon: '●', color: 'satiety' },
    { label: 'Кукуха', value: game.sanity, icon: '♥', color: 'sanity' },
    { label: 'Мотивация', value: game.motivation, icon: '✿', color: 'motivation' },
  ]

  if (storage === 'invalid') {
    return (
      <main className="game-shell">
        <section className="panel day-summary" aria-labelledby="save-error-title">
          <h1 id="save-error-title">Не удалось открыть сохранение</h1>
          <p>Сохранение повреждено или создано другой версией игры. Оно не будет изменено без вашего решения.</p>
          <p>Можно начать новую игру. При этом старое сохранение будет заменено.</p>
          <button className="next-day" type="button" onClick={startNewGame}>Начать новую игру</button>
        </section>
      </main>
    )
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <h1>Маша, не гори</h1>
        </div>
        <p className="day-badge">День {game.day}</p>
      </header>

      {(storage === 'unavailable' || writeFailed) && (
        <p className="day-finished" role="alert">Не удалось {storage === 'unavailable' ? 'прочитать сохранение' : 'сохранить прогресс'}. Можно играть дальше, но прогресс этой сессии не сохранится.</p>
      )}

      <div className="game-layout">
        <div className="story-column">
          <section className="room" aria-label="Комната Маши: временная иллюстрация">
            <div className="room-art">
              <img src={roomImage} alt="Маша за рабочим столом в уютной комнате с кроватью, кухней и растением; в дверь заглядывает гусь" />
              {game.ownedItems.includes('plant') && <img className="room-item room-item-plant" src={plantImage} alt="Купленное растение у стены" />}
              {game.ownedItems.includes('blanket') && <img className="room-item room-item-blanket" src={blanketImage} alt="Купленный плед на кровати" />}
              {game.ownedItems.includes('pillow') && <img className="room-item room-item-pillow" src={pillowImage} alt="Купленная подушка на кровати" />}
              {game.ownedItems.includes('lamp') && <img className="room-item room-item-lamp" src={lampImage} alt="Купленная лампа на рабочем столе" />}
              <section className="speech" aria-label="Реплика Маши">
                <p aria-live="polite">{message}</p>
              </section>
            </div>
          </section>
        </div>

        <div className="dashboard">
          <section className="panel" aria-labelledby="stats-title" onKeyDown={(event) => { if (event.key === 'Escape' && selectedWarning) closeWarning() }}>
            <h2 className="visually-hidden" id="stats-title">Состояние Маши</h2>
            <div className="stats">
              {stats.map((stat) => (
                <div className="stat" key={stat.label}>
                  <div className="stat-heading">
                    <label htmlFor={stat.color}><span className={`stat-icon ${stat.color}`} aria-hidden="true">{stat.icon}</span>{stat.label}</label>
                    <span className="stat-value">{warnings.some((warning) => warning.stat === stat.color) && <button type="button" id={`warning-${stat.color}`} className="warning-toggle" aria-label={`Предупреждение: ${stat.label}`} aria-expanded={selectedWarning?.stat === stat.color} aria-controls={selectedWarning?.stat === stat.color ? 'warning-detail' : undefined} onClick={() => setOpenWarning(selectedWarning?.stat === stat.color ? null : stat.color)}>!</button>}{stat.value} <span className="stat-max">/ {STAT_MAX}</span></span>
                  </div>
                  <progress id={stat.color} className={stat.color} value={stat.value} max={STAT_MAX}>{stat.value} из {STAT_MAX}</progress>
                </div>
              ))}
            </div>
            <dl className="resources">
              <div><dt>Деньги</dt><dd>{game.money}</dd></div>
              <div><dt>Незаконченные проекты</dt><dd>{game.unfinishedProjects}</dd></div>
            </dl>
            <div className="visually-hidden" aria-live="polite">{warnings.map((warning) => warning.text).join(' ')}</div>
            {selectedWarning && <div className="warning-detail" id="warning-detail"><p>{selectedWarning.text}</p><button type="button" onClick={closeWarning}>Понятно</button></div>}
          </section>

          {summary ? <DaySummaryPanel summary={summary} focusOnMount={focusSummary.current} onNextDay={nextDay} onShop={() => setShopOpen(true)} /> : <section className="panel actions" aria-labelledby="actions-title">
            <h2 className="visually-hidden" id="actions-title">Чем займёмся?</h2>
            <p className="actions-count">Осталось действий: <strong>{game.actionsRemaining}</strong></p>
            {commonReason && <p className="day-finished" id="common-reason" role="status">{commonReason}</p>}
            <div className="action-grid">
              {actionIds.map((id) => {
                const reason = getActionUnavailableReason(game, id)
                return (
                  <div className="action-item" key={id}>
                    <button type="button" disabled={reason !== null} aria-describedby={commonReason ? 'common-reason' : `${id}-description`} onClick={() => { setOpenWarning(null); handleAction(id) }}><span className="action-icon" aria-hidden="true">{id === 'work' ? '💻' : id === 'eat' ? '🥣' : '☁'}</span>{ACTIONS[id].label}</button>
                    {!commonReason && <p className="action-description" id={`${id}-description`}>{reason ?? getActionDescription(game, id)}</p>}
                  </div>
                )
              })}
              <div className="action-item">
                <button type="button" aria-describedby="end-day-description" onClick={() => { focusSummary.current = true; handleFinishDay() }}>Закончить день</button>
                <p className="action-description" id="end-day-description">Можно закончить день в любой момент.</p>
              </div>
            </div>
          </section>}
        </div>
      </div>
      {shopOpen && <ShopDialog game={game} onPurchase={handlePurchase} onClose={closeShop} onNextDay={nextDay} saveProblem={storage === 'unavailable' || writeFailed} />}
      {events.pending && <EventDialog pending={events.pending} game={game} onChoose={handleEventChoice} onContinue={closeEvent} saveProblem={storage === 'unavailable' || writeFailed} />}
    </main>
  )
}
