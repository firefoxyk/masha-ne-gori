import { useState } from 'react'
import { createInitialGameState, STAT_MAX } from './game/state'
import { ACTIONS, getActionUnavailableReason, performAction } from './game/actions'
import type { ActionId } from './game/actions'
import { finishDay, getDaySummary, startNextDay } from './game/day'
import { getStateWarnings } from './game/warnings'

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
  function handleFinishDay() {
    setView((current) => {
      if (current.game.dayStatus !== 'active') return current
      return { game: finishDay(current.game), message: 'День завершён. Мы справились!' }
    })
  }
  function handleNextDay() {
    setView((current) => {
      if (current.game.dayStatus !== 'finished') return current
      return { game: startNextDay(current.game), message: 'Новый день — новая возможность не забыть про обед.' }
    })
  }
  const summary = game.dayStatus === 'finished' ? getDaySummary(game) : null
  const warnings = getStateWarnings(game)
  const summaryRows = summary && [
    { label: 'Энергия', value: summary.endValues.energy, change: summary.changes.energy },
    { label: 'Сытость', value: summary.endValues.satiety, change: summary.changes.satiety },
    { label: 'Кукуха', value: summary.endValues.sanity, change: summary.changes.sanity },
    { label: 'Мотивация', value: summary.endValues.motivation, change: summary.changes.motivation },
    { label: 'Деньги', value: summary.endValues.money, change: summary.changes.money },
    { label: 'Незаконченные проекты', value: summary.endValues.unfinishedProjects, change: summary.changes.unfinishedProjects },
  ]
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
            <div aria-live="polite" aria-atomic="true">
              {warnings.length > 0 && (
                <div className="state-warnings" aria-label="Предупреждения о состоянии">
                  <p className="warnings-title">Стоит позаботиться о Маше</p>
                  <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </div>
              )}
            </div>
          </section>

          <section className="panel actions" aria-labelledby="actions-title">
            <div className="section-heading"><div><p className="eyebrow">ПЛАН НА ДЕНЬ</p><h2 id="actions-title">Чем займёмся?</h2></div></div>
            <p className="actions-count">Осталось действий: <strong>{game.actionsRemaining}</strong></p>
            {game.actionsRemaining === 0 && game.dayStatus === 'active' && <p className="day-finished" role="status">Действия на сегодня закончились. Можно завершить день.</p>}
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
                <button type="button" disabled={game.dayStatus === 'finished'} aria-describedby="end-day-description" onClick={handleFinishDay}>Закончить день</button>
                <p className="action-description" id="end-day-description">{game.dayStatus === 'finished' ? 'День завершён.' : 'Можно закончить день в любой момент.'}</p>
              </div>
            </div>
          </section>
          {summary && summaryRows && (
            <section className="panel day-summary" aria-labelledby="summary-title">
              <p className="eyebrow">МОЖНО ВЫДОХНУТЬ</p>
              <h2 id="summary-title">Итоги дня {summary.day}</h2>
              <p className="summary-actions">Использовано действий: {summary.actionsUsed}</p>
              <p className="summary-note">Состояние на конец дня и изменение за день:</p>
              <dl className="summary-list">
                {summaryRows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value} <span>({row.change > 0 ? '+' : ''}{row.change})</span></dd>
                  </div>
                ))}
              </dl>
              <p className="summary-message">Маша: «День завершён. Мы справились!»</p>
              <button className="next-day" type="button" onClick={handleNextDay}>Начать следующий день</button>
            </section>
          )}
        </div>
      </div>
      <footer>Пока это первый набросок игры · Продолжение следует</footer>
    </main>
  )
}
