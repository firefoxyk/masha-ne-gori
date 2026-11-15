import { useEffect, useRef, useState } from 'react'
import { GOOSE_VISIT_MS, shouldShowGoose } from './game/gooseAppearance'

/** Появление живёт только во вкладке и не влияет на сохранение игры. */
export function useGooseAppearance(signal: number, day: number, active: boolean): boolean {
  const lastSignal = useRef(signal)
  const lastShownDay = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => { if (!active) setVisible(false) }, [active])
  useEffect(() => {
    if (lastSignal.current === signal) return
    lastSignal.current = signal
    if (!active || !shouldShowGoose(day, lastShownDay.current)) return
    lastShownDay.current = day
    setVisible(true)
  }, [signal, day, active])
  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => setVisible(false), GOOSE_VISIT_MS)
    return () => window.clearTimeout(timer)
  }, [visible])
  return visible && active
}
