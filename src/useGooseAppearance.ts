import { useEffect, useRef, useState } from 'react'
import { GOOSE_VISIT_MS, shouldShowGoose } from './game/gooseAppearance'

/** Появление живёт только во вкладке и не влияет на сохранение игры. */
export function useGooseAppearance(signal: number, day: number, active: boolean, paused = false, blocked = false): { visible: boolean; dismiss: () => void } {
  const lastSignal = useRef(signal)
  const lastShownDay = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => { if (!active) setVisible(false) }, [active])
  useEffect(() => {
    if (lastSignal.current === signal) return
    lastSignal.current = signal
    if (!active || blocked || !shouldShowGoose(day, lastShownDay.current)) return
    lastShownDay.current = day
    setVisible(true)
  }, [signal, day, active, blocked])
  useEffect(() => {
    if (!visible || paused) return
    const timer = window.setTimeout(() => setVisible(false), GOOSE_VISIT_MS)
    return () => window.clearTimeout(timer)
  }, [visible, paused])
  return { visible: visible && active, dismiss: () => setVisible(false) }
}
