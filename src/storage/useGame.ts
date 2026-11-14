import { useEffect, useState } from 'react'
import { performAction } from '../game/actions'
import type { ActionId } from '../game/actions'
import { finishDay, startNextDay } from '../game/day'
import { createInitialGameState } from '../game/state'
import { loadGame, saveGame } from './gameStorage'

const initialMessage = 'Сегодня всё получится. А если нет — сначала поедим.'

export function useGame() {
  const [view, setView] = useState(() => {
    const loaded = loadGame()
    return {
      game: loaded.kind === 'loaded' ? loaded.game : createInitialGameState(),
      message: loaded.kind === 'loaded' && loaded.game.dayStatus === 'finished' ? 'День завершён. Мы справились!' : initialMessage,
      storage: loaded.kind === 'invalid' ? 'invalid' as const : loaded.kind === 'unavailable' ? 'unavailable' as const : 'ready' as const,
      revision: 0,
    }
  })
  const [writeFailed, setWriteFailed] = useState(false)

  useEffect(() => {
    if (view.revision === 0 || view.storage !== 'ready') return
    setWriteFailed(!saveGame(view.game))
  }, [view.game, view.revision, view.storage])

  function handleAction(action: ActionId) {
    setView((current) => {
      const result = performAction(current.game, action)
      return { ...current, game: result.state, message: result.message, revision: current.revision + (result.success ? 1 : 0) }
    })
  }
  function handleFinishDay() {
    setView((current) => current.game.dayStatus !== 'active' ? current : {
      ...current, game: finishDay(current.game), message: 'День завершён. Мы справились!', revision: current.revision + 1,
    })
  }
  function handleNextDay() {
    setView((current) => current.game.dayStatus !== 'finished' ? current : {
      ...current, game: startNextDay(current.game), message: 'Новый день — новая возможность не забыть про обед.', revision: current.revision + 1,
    })
  }
  function startNewGame() {
    setView((current) => ({ ...current, game: createInitialGameState(), message: initialMessage, storage: 'ready', revision: current.revision + 1 }))
  }

  return { ...view, handleAction, handleFinishDay, handleNextDay, startNewGame, writeFailed }
}
