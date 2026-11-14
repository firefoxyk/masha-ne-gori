import { useState } from 'react'
import { createInitialGameState, STAT_MAX } from './game/state'
import { ACTIONS, getActionUnavailableReason, performAction } from './game/actions'
import type { ActionId } from './game/actions'

export default function App() {
  const [{ game, message }, setView] = useState(() => ({
    game: createInitialGameState(),
    message: 'Сегодня всё получится. А если нет — сначала поедим.',
  }))
  const actionIds: ActionId[] = ['work', 'eat', 'rest']
  function handleAction(action: ActionId) {
    setView((current) => {
      const result = performAction(current.game, action)
      return { game: result.state, message: result.message }
    })
  }
  const stats = [
    { label: 'Энергия', value: game.energy, icon: '✦', color: 'energy' },
    { label: 'Сытость', value: game.satiety, icon: '●', color: 'satiety' },
    { label: 'Кукуха', value: game.sanity, icon: '♥', color: 'sanity' },
    { label: 'Мотивация', value: game.motivation, icon: '✿', color: 'motivation' },
  ]

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">Маленькая игра о больших делах</p>
          <h1>Маша, не гори</h1>
        </div>
        <p className="day-badge">День {game.day}</p>
      </header>

      <div className="game-layout">
        <div className="story-column">
          <section className="room" aria-label="Комната Маши: временная иллюстрация">
            <div className="room-topline"><span>КОМНАТА МАШИ</span><span>✳</span></div>
            <div className="room-scene" aria-hidden="true">
              <div className="window"><span>✳</span></div>
              <div className="picture">♡</div>
              <div className="plant">🌿</div>
              <div className="desk"><span>☕</span><span className="laptop">✦</span></div>
              <div className="masha"><span className="masha-hair">●</span><span className="masha-face">•ᴗ•</span><span className="masha-body" /></div>
              <span className="room-caption">здесь будет комната</span>
            </div>
          </section>

          <section className="speech" aria-label="Реплика Маши">
            <span className="speech-icon" aria-hidden="true">✺</span>
            <div><p className="speech-name">МАША</p><p aria-live="polite">{message}</p></div>
          </section>
        </div>

        <div className="dashboard">
          <section className="panel" aria-labelledby="stats-title">
            <div className="section-heading"><div><p className="eyebrow">КАК ДЕЛА?</p><h2 id="stats-title">Состояние Маши</h2></div><span aria-hidden="true">✳</span></div>
            <div className="stats">
              {stats.map((stat) => (
                <div className="stat" key={stat.label}>
                  <div className="stat-heading"><label htmlFor={stat.color}><span className={`stat-icon ${stat.color}`} aria-hidden="true">{stat.icon}</span>{stat.label}</label><span>{stat.value} <span className="stat-max">/ {STAT_MAX}</span></span></div>
                  <progress id={stat.color} className={stat.color} value={stat.value} max={STAT_MAX}>{stat.value} из {STAT_MAX}</progress>
                </div>
              ))}
            </div>
            <dl className="resources">
              <div><dt>Деньги</dt><dd>{game.money}</dd></div>
              <div><dt>Незаконченные проекты</dt><dd>{game.unfinishedProjects}</dd></div>
            </dl>
          </section>

          <section className="panel actions" aria-labelledby="actions-title">
            <div className="section-heading"><div><p className="eyebrow">ПЛАН НА ДЕНЬ</p><h2 id="actions-title">Чем займёмся?</h2></div></div>
            <p className="actions-count">Осталось действий: <strong>{game.actionsRemaining}</strong></p>
            {game.actionsRemaining === 0 && <p className="day-finished" role="status">Действия на сегодня закончились. День готов к завершению.</p>}
            <div className="action-grid">
              {actionIds.map((id) => {
                const reason = getActionUnavailableReason(game, id)
                return (
                  <div className="action-item" key={id}>
                    <button type="button" disabled={reason !== null} aria-describedby={`${id}-description`} onClick={() => handleAction(id)}>{ACTIONS[id].label}</button>
                    <p className="action-description" id={`${id}-description`}>{reason ?? ACTIONS[id].description}</p>
                  </div>
                )
              })}
              <div className="action-item">
                <button type="button" disabled aria-describedby="end-day-description">Закончить день</button>
                <p className="action-description" id="end-day-description">Итоги и следующий день появятся в пункте 2.4.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <footer>Пока это первый набросок игры · Продолжение следует</footer>
    </main>
  )
}
