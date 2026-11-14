import { useState } from 'react'
import { createInitialGameState, STAT_MAX } from './game/state'

export default function App() {
  const [game] = useState(createInitialGameState)
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
            <div><p className="speech-name">МАША</p><p>Сегодня всё получится. А если нет — сначала поедим.</p></div>
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
            <div className="action-grid">
              <button type="button" disabled>Поработать</button>
              <button type="button" disabled>Поесть</button>
              <button type="button" disabled>Отдохнуть</button>
              <button type="button" disabled>Закончить день</button>
            </div>
            <p className="actions-note">Действия появятся на следующем шаге.</p>
          </section>
        </div>
      </div>
      <footer>Пока это первый набросок игры · Продолжение следует</footer>
    </main>
  )
}
