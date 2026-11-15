import { useLayoutEffect, useRef } from 'react'
import type { DaySummary } from './game/day'
import type { ReactNode } from 'react'
import type { GameState } from './game/state'
import { availableEndings, ENDINGS } from './game/endings'
import type { EndingId } from './game/endings'

export default function DaySummaryPanel({ summary, game, seenEndings, onEnding, onNextDay, onShop, focusOnMount, shopTip }: { summary: DaySummary; game: GameState; seenEndings: EndingId[]; onEnding: (id: EndingId) => void; onNextDay: () => void; onShop: () => void; focusOnMount: boolean; shopTip?: ReactNode }) {
  const panelRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    if (!focusOnMount) return
    titleRef.current?.focus({ preventScroll: true })
    const rect = panelRef.current?.getBoundingClientRect()
    if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      panelRef.current?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' })
    }
  }, [focusOnMount])

  const rows = [
    { label: 'Энергия', value: summary.endValues.energy, change: summary.changes.energy },
    { label: 'Сытость', value: summary.endValues.satiety, change: summary.changes.satiety },
    { label: 'Кукуха', value: summary.endValues.sanity, change: summary.changes.sanity },
    { label: 'Мотивация', value: summary.endValues.motivation, change: summary.changes.motivation },
    { label: 'Деньги', value: summary.endValues.money, change: summary.changes.money },
    { label: 'Незаконченные проекты', value: summary.endValues.unfinishedProjects, change: summary.changes.unfinishedProjects },
  ]
  const endings = availableEndings(game)
  return (
    <section className="panel day-summary" ref={panelRef} aria-labelledby="summary-title">
      <p className="eyebrow">МОЖНО ВЫДОХНУТЬ</p>
      <h2 id="summary-title" ref={titleRef} tabIndex={-1}>Итоги дня {summary.day}</h2>
      <p className="summary-actions">Использовано действий: {summary.actionsUsed}</p>
      <p className="summary-note">Состояние на момент завершения дня и изменение за день. Покупки после завершения не меняют эти итоги.</p>
      <dl className="summary-list">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value} <span>({row.change > 0 ? '+' : ''}{row.change})</span></dd>
          </div>
        ))}
      </dl>
      <p className="summary-message">Маша: «День завершён. Мы справились!»</p>
      {endings.some(id => !seenEndings.includes(id)) && <p role="status">Доступна история прохождения — её можно посмотреть ниже или продолжить игру.</p>}
      {shopTip}
      <button className="next-day shop-open" type="button" onClick={onShop}>Заглянуть в магазин</button>
      <button className="next-day" type="button" onClick={onNextDay}>Начать следующий день</button>
      <details className="ending-options">
        <summary>Истории прохождения{endings.length ? ` · доступно ${endings.length}` : ''}</summary>
        <p>Тёплая история: завершите любой проект и купите постоянную вещь. Необычная история: завершите проект «Выяснить, чей это гусь». Смотреть их необязательно; игру можно продолжить.</p>
        {endings.map(id => <button key={id} type="button" onClick={() => onEnding(id)}>{seenEndings.includes(id) ? 'Посмотреть снова' : 'Посмотреть завершение'}: {ENDINGS[id].title}</button>)}
      </details>
    </section>
  )
}
