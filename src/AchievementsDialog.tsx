import { useEffect, useRef } from 'react'
import { ACHIEVEMENTS } from './game/achievements'
import type { AchievementId } from './game/state'
import './projects.css'

export default function AchievementsDialog({ unlocked, onClose }: { unlocked: AchievementId[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { const el = dialog.current; el?.showModal(); title.current?.focus(); return () => { if (el?.open) el.close() } }, [])
  return <dialog ref={dialog} className="projects-dialog" aria-labelledby="achievements-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="projects-content">
      <h2 id="achievements-title" ref={title} tabIndex={-1}>Достижения</h2>
      <p>Получено: {unlocked.length} из {ACHIEVEMENTS.length}</p>
      <ul className="achievement-list">{ACHIEVEMENTS.map(item => <li key={item.id}><strong>{item.title}</strong> — {unlocked.includes(item.id) ? 'Получено' : 'Ещё не получено'}<br />{item.description}</li>)}</ul>
      <button type="button" onClick={onClose}>Вернуться к игре</button>
    </div>
  </dialog>
}
