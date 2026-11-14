import { useEffect, useState } from 'react'
import { performAction } from '../game/actions'
import type { ActionId } from '../game/actions'
import { finishDay, startNextDay } from '../game/day'
import { createInitialGameState } from '../game/state'
import { loadGame, saveGame } from './gameStorage'
import { purchase } from '../game/shop'
import type { ProductId } from '../game/shop'
import { chooseEvent, continueEvent, createEventSession, eventAfterAction } from '../game/eventSession'
import { advanceProject } from '../game/projects'
import type { ProjectCommand } from '../game/projects'
import type { ProjectId } from '../game/state'

const initialMessage = 'Сегодня всё получится. А если нет — сначала поедим.'

export function useGame() {
  const [view, setView] = useState(() => {
    const loaded = loadGame()
    return {
      game: loaded.kind === 'loaded' ? loaded.game : createInitialGameState(),
      events: loaded.kind === 'loaded' ? loaded.events : createEventSession(),
      message: loaded.kind === 'loaded' && loaded.game.dayStatus === 'finished' ? 'День завершён. Мы справились!' : initialMessage,
      storage: loaded.kind === 'invalid' ? 'invalid' as const : loaded.kind === 'unavailable' ? 'unavailable' as const : 'ready' as const,
      revision: 0,
    }
  })
  const [writeFailed, setWriteFailed] = useState(false)

  useEffect(() => {
    if (view.revision === 0 || view.storage !== 'ready') return
    setWriteFailed(!saveGame(view.game, undefined, view.events))
  }, [view.game, view.events, view.revision, view.storage])

  function handleAction(action: ActionId) {
    const randomValues = [Math.random(), Math.random()]
    setView((current) => {
      if (current.events.pending) return current
      const result = performAction(current.game, action)
      let draw = 0
      const events = eventAfterAction(current.events, result, action, () => randomValues[draw++])
      return { ...current, game: result.state, events, message: result.message, revision: current.revision + (result.success ? 1 : 0) }
    })
  }
  function handleFinishDay() {
    setView((current) => current.events.pending || current.game.dayStatus !== 'active' ? current : {
      ...current, game: finishDay(current.game), message: 'День завершён. Мы справились!', revision: current.revision + 1,
    })
  }
  function handleNextDay() {
    setView((current) => current.game.dayStatus !== 'finished' ? current : {
      ...current, game: startNextDay(current.game), message: 'Новый день — новая возможность не забыть про обед.', revision: current.revision + 1,
    })
  }
  function handlePurchase(id: ProductId) {
    setView((current) => {
      const result = purchase(current.game, id)
      return result.success ? { ...current, game: result.state, revision: current.revision + 1 } : current
    })
  }
  function handleProject(id: ProjectId, command: ProjectCommand) {
    setView((current) => {
      if (current.events.pending) return current
      const result = advanceProject(current.game, id, command)
      return result.success ? { ...current, game: result.state, message: result.message, revision: current.revision + 1 } : current
    })
  }
  function handleEventChoice(choiceId: string) {
    setView((current) => {
      const result = chooseEvent(current.events, current.game, choiceId)
      return result.events === current.events ? current : { ...current, ...result, revision: current.revision + 1 }
    })
  }
  function handleEventContinue() {
    setView((current) => {
      const events = continueEvent(current.events)
      return events === current.events ? current : { ...current, events, revision: current.revision + 1 }
    })
  }
  function startNewGame() {
    setView((current) => ({ ...current, game: createInitialGameState(), events: createEventSession(), message: initialMessage, storage: 'ready', revision: current.revision + 1 }))
  }

  return { ...view, handleAction, handleFinishDay, handleNextDay, handlePurchase, handleProject, handleEventChoice, handleEventContinue, startNewGame, writeFailed }
}
