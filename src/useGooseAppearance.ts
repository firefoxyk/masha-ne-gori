import { useEffect, useRef, useState } from 'react'
import { GOOSE_VISIT_MS, shouldShowGoose } from './game/gooseAppearance'

/** Появление живёт только во вкладке и не влияет на сохранение игры. */
export function useGooseAppearance(signal: number, day: number, active: boolean, paused = false, blocked = false, onScheduled?: (day: number) => void): { visible: boolean; dismiss: () => void } {
  const lastSignal = useRef(signal)
  const lastShownDay = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [waitingDay, setWaitingDay] = useState<number | null>(null)
  useEffect(() => { if (!active) { setVisible(false); setWaitingDay(null) } }, [active])
  useEffect(() => {
    if (lastSignal.current === signal) return
    lastSignal.current = signal
    if (!active || blocked || !shouldShowGoose(day, lastShownDay.current)) return
    lastShownDay.current = day
    onScheduled?.(day)
    setWaitingDay(day)
  }, [signal, day, active, blocked])
  useEffect(() => {
    if (waitingDay === null || paused || !active) return
    if (waitingDay === day) setVisible(true)
    setWaitingDay(null)
  }, [waitingDay, paused, active, day])
  useEffect(() => {
    if (!visible || paused) return
    const timer = window.setTimeout(() => setVisible(false), GOOSE_VISIT_MS)
    return () => window.clearTimeout(timer)
  }, [visible, paused])
  return { visible: visible && active, dismiss: () => setVisible(false) }
}
