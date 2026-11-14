import { useLayoutEffect, useRef } from 'react'
import type { DaySummary } from './game/day'

export default function DaySummaryPanel({ summary, onNextDay, focusOnMount }: { summary: DaySummary; onNextDay: () => void; focusOnMount: boolean }) {
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
  return (
    <section className="panel day-summary" ref={panelRef} aria-labelledby="summary-title">
      <p className="eyebrow">МОЖНО ВЫДОХНУТЬ</p>
      <h2 id="summary-title" ref={titleRef} tabIndex={-1}>Итоги дня {summary.day}</h2>
      <p className="summary-actions">Использовано действий: {summary.actionsUsed}</p>
      <p className="summary-note">Состояние на конец дня и изменение за день:</p>
      <dl className="summary-list">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value} <span>({row.change > 0 ? '+' : ''}{row.change})</span></dd>
          </div>
        ))}
      </dl>
      <p className="summary-message">Маша: «День завершён. Мы справились!»</p>
      <button className="next-day" type="button" onClick={onNextDay}>Начать следующий день</button>
    </section>
  )
}
