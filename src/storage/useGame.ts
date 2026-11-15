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
import { delegateProject, projectStepLocked } from '../game/projectDelegation'
import type { DelegatedProject } from '../game/projectDelegation'
import type { ProjectCommand } from '../game/projects'
import type { ProjectId } from '../game/state'
import { chooseRest, createRestSession, startSpecialRest } from '../game/rest'
import type { RestId } from '../content/rest'
import { chooseMeal, createMealSession, startFreeSnack, startSpecialMeal } from '../game/meals'
import type { MealId } from '../content/meals'
import { chooseLittleStory, continueLittleStory, createLittleStorySession, maybeStartLittleStory, surfaceLittleStory } from '../game/littleStories'
import { sendAssistantTask, sendAssistantJob, claimAssistantJob } from '../game/assistant'
import type { AssistantJobId } from '../game/assistant'
import { noteAssistantReport, openAssistantCorrection, requestAssistantCorrection, resolveAssistantReport } from '../game/assistantReview'
import { chooseWorkEvent, createWorkSession, selectWorkEvent } from '../game/workEvents'

const initialMessage = 'Сегодня всё получится. А если нет — сначала поедим.'

export function useGame() {
  const [view, setView] = useState(() => {
    const loaded = loadGame()
    return {
      game: loaded.kind === 'loaded' ? loaded.game : createInitialGameState(),
      events: loaded.kind === 'loaded' ? loaded.events : createEventSession(),
      message: loaded.kind === 'loaded' && loaded.game.dayStatus === 'finished' ? 'День завершён. Мы справились!' : initialMessage,
      storage: loaded.kind === 'invalid' ? 'invalid' as const : loaded.kind === 'unavailable' ? 'unavailable' as const : 'ready' as const,
      revision: loaded.kind === 'loaded' || loaded.kind === 'empty' ? 1 : 0,
    }
  })
  const [writeFailed, setWriteFailed] = useState(false)

  useEffect(() => {
    if (view.revision === 0 || view.storage !== 'ready') return
    setWriteFailed(!saveGame(view.game, undefined, view.events))
  }, [view.game, view.events, view.revision, view.storage])

  function handleAction(action: ActionId) {
    const randomValues = [Math.random(), Math.random()]
    const specialRoll = action === 'rest' || action === 'eat' ? Math.random() : 1
    const storyRoll = Math.random(), storyPick = Math.random()
    const workRoll = Math.random(), workPick = Math.random()
    setView((current) => {
      if (current.events.pending || current.events.work?.pending || current.events.rest?.pending || current.events.meal?.pending || current.events.littleStories?.pending) return current
      if (action === 'rest') {
        const special = startSpecialRest(current.game, current.events.rest ?? createRestSession(), specialRoll)
        if (special.started) return { ...current, game: special.game, events: { ...current.events, rest: special.rest }, revision: current.revision + 1 }
      }
      if (action === 'eat') {
        const meal = current.events.meal ?? createMealSession()
        const freeSnack = startFreeSnack(current.game, meal)
        if (freeSnack !== meal) return { ...current, events: { ...current.events, meal: freeSnack }, revision: current.revision + 1 }
        const special = startSpecialMeal(current.game, current.events.meal ?? createMealSession(), specialRoll)
        if (special.started) return { ...current, game: special.game, events: { ...current.events, meal: special.meal }, revision: current.revision + 1 }
      }
      const result = performAction(current.game, action)
      let draw = 0
      const selected = eventAfterAction(current.events, result, action, () => randomValues[draw++])
      const previousWork = selected.work ?? createWorkSession()
      const work = action === 'work' ? selectWorkEvent(previousWork, result.state, result.success, workRoll, workPick) : previousWork
      const stories = maybeStartLittleStory(selected.littleStories ?? createLittleStorySession(), result.success && !work.pending, storyRoll, storyPick, result.state)
      let events = stories === selected.littleStories || (!selected.littleStories && !stories.pending) ? selected : { ...selected, littleStories: stories }
      if (work !== previousWork) events = { ...events, work }
      return { ...current, game: result.state, events, message: result.message, revision: current.revision + (result.success ? 1 : 0) }
    })
  }
  function handleFinishDay() {
    setView((current) => current.events.pending || current.events.work?.pending || current.events.rest?.pending || current.events.meal?.pending || current.events.littleStories?.pending || current.game.dayStatus !== 'active' ? current : {
      ...current, game: finishDay(current.game), message: 'День завершён. Мы справились!', revision: current.revision + 1,
    })
  }
  function handleNextDay() {
    const randomValues = Array.from({ length: 6 }, () => Math.random())
    setView((current) => {
      if (current.game.dayStatus !== 'finished') return current
      let draw = 0
      const game = startNextDay(current.game, () => randomValues[draw++] ?? 0)
      const events = current.events.littleStories ? { ...current.events, littleStories: surfaceLittleStory(current.events.littleStories, game.day) } : current.events
      return { ...current, game, events, message: 'Новый день — новая возможность не забыть про обед.', revision: current.revision + 1 }
    })
  }
  function handlePurchase(id: ProductId) {
    setView((current) => {
      const result = purchase(current.game, id)
      return result.success ? { ...current, game: result.state, revision: current.revision + 1 } : current
    })
  }
  function handleProject(id: ProjectId, command: ProjectCommand, choice?: string) {
    const random = Math.random()
    const storyRoll = Math.random(), storyPick = Math.random()
    setView((current) => {
      if (current.events.pending || current.events.work?.pending || current.events.rest?.pending || current.events.meal?.pending || current.events.littleStories?.pending) return current
      if (command === 'step-0' && projectStepLocked(current.events.assistantJob, current.game, id)) return current
      const result = advanceProject(current.game, id, command, () => random, choice)
      if (!result.success) return current
      const stories = maybeStartLittleStory(current.events.littleStories ?? createLittleStorySession(), result.state.actionsRemaining < current.game.actionsRemaining, storyRoll, storyPick, result.state)
      const events = stories === current.events.littleStories || (!current.events.littleStories && !stories.pending) ? current.events : { ...current.events, littleStories: stories }
      return { ...current, events, game: result.state, message: result.message, revision: current.revision + 1 }
    })
  }
  function handleDelegateProject(id: DelegatedProject) {
    const roll = Math.random()
    setView((current) => {
      if (current.events.pending || current.events.work?.pending || current.events.rest?.pending || current.events.meal?.pending || current.events.littleStories?.pending) return current
      const result = delegateProject(current.game, current.events.assistantJob, id, () => roll, !!current.events.assistantTask && !current.events.assistantLegacyRead)
      return result.game === current.game ? current : { ...current, game: result.game, events: { ...current.events, assistantJob: result.job }, message: 'Поручено помощнику. Отчёт будет готов завтра.', revision: current.revision + 1 }
    })
  }
  function handleEventChoice(choiceId: string) {
    const random = Math.random()
    const storyRoll = Math.random(), storyPick = Math.random()
    setView((current) => {
      const result = chooseEvent(current.events, current.game, choiceId, () => random)
      if (result.events === current.events) return current
      const stories = maybeStartLittleStory(result.events.littleStories ?? createLittleStorySession(), !result.events.work?.pending && result.game.actionsRemaining < current.game.actionsRemaining, storyRoll, storyPick, result.game)
      const events = stories === result.events.littleStories || (!result.events.littleStories && !stories.pending) ? result.events : { ...result.events, littleStories: stories }
      return { ...current, ...result, events, revision: current.revision + 1 }
    })
  }
  function handleEventContinue() {
    setView((current) => {
      const events = continueEvent(current.events)
      return events === current.events ? current : { ...current, events, revision: current.revision + 1 }
    })
  }
  function handleWorkChoice(id: string) {
    setView((current) => {
      if (current.events.pending || !current.events.work) return current
      const result = chooseWorkEvent(current.events.work, current.game, id)
      return result.session === current.events.work ? current : { ...current, game: result.game, events: { ...current.events, work: result.session }, revision: current.revision + 1 }
    })
  }
  function handleWorkContinue() {
    setView((current) => {
      const work = current.events.work
      if (current.events.pending || !work?.pending?.choiceId) return current
      return { ...current, events: { ...current.events, work: { ...work, pending: null } }, revision: current.revision + 1 }
    })
  }
  function handleRestChoice(id: RestId) {
    const random = Math.random()
    setView((current) => {
      if (!current.events.rest) return current
      const result = chooseRest(current.game, current.events.rest, id, random)
      return result.game === current.game ? current : { ...current, game: result.game, events: { ...current.events, rest: result.rest }, revision: current.revision + 1 }
    })
  }
  function handleRestContinue() {
    const randomValues = [Math.random(), Math.random()]
    setView((current) => {
      const rest = current.events.rest
      if (!rest?.pending?.result) return current
      const session = { ...current.events, rest: { ...rest, pending: null } }
      let draw = 0
      const events = eventAfterAction(session, { state: current.game, success: true }, 'rest', () => randomValues[draw++])
      return { ...current, events, revision: current.revision + 1 }
    })
  }
  function handleMealChoice(id: MealId) {
    const random = Math.random()
    setView((current) => {
      if (!current.events.meal) return current
      const result = chooseMeal(current.game, current.events.meal, id, random)
      return result.game === current.game ? current : { ...current, game: result.game, events: { ...current.events, meal: result.meal }, revision: current.revision + 1 }
    })
  }
  function handleMealCancel() {
    setView((current) => {
      const meal = current.events.meal
      if (!meal?.pending?.freeSnack || meal.pending.result) return current
      return { ...current, events: { ...current.events, meal: { ...meal, pending: null } }, revision: current.revision + 1 }
    })
  }
  function handleMealContinue() {
    const randomValues = [Math.random(), Math.random()]
    setView((current) => {
      const meal = current.events.meal
      if (!meal?.pending?.result) return current
      const session = { ...current.events, meal: { ...meal, pending: null } }
      let draw = 0
      const events = eventAfterAction(session, { state: current.game, success: true }, 'eat', () => randomValues[draw++])
      return { ...current, events, revision: current.revision + 1 }
    })
  }
  function handleLittleChoice(choice: 0 | 1) {
    setView((current) => {
      const stories = current.events.littleStories
      if (!stories || current.events.pending) return current
      const next = chooseLittleStory(stories, choice, current.game.day)
      return next === stories ? current : { ...current, events: { ...current.events, littleStories: next }, revision: current.revision + 1 }
    })
  }
  function handleLittleContinue() {
    setView((current) => {
      const stories = current.events.littleStories
      if (!stories || current.events.pending) return current
      const next = continueLittleStory(stories, current.game.day)
      return next === stories ? current : { ...current, events: { ...current.events, littleStories: next }, revision: current.revision + 1 }
    })
  }
  function handleAssistantTask() {
    const roll = Math.random(), pick = Math.random()
    setView((current) => {
      if (current.events.pending || current.events.work?.pending || current.events.rest?.pending || current.events.meal?.pending || current.events.littleStories?.pending || (current.events.assistantJob && current.events.assistantJob.actual === null)) return current
      const result = sendAssistantTask(current.game, current.events.assistantTask)
      if (result.game === current.game || !result.task) return current
      const session = current.events.littleStories ?? createLittleStorySession()
      const stories = maybeStartLittleStory(session, true, roll, pick, result.game)
      return { ...current, game: result.game, events: { ...current.events, assistantTask: result.task, ...(stories !== session ? { littleStories: stories } : {}) }, revision: current.revision + 1 }
    })
  }
  function handleAssistantJob(id: AssistantJobId) {
    const roll = Math.random()
    setView((current) => {
      if (current.events.pending || current.events.work?.pending || current.events.rest?.pending || current.events.meal?.pending || current.events.littleStories?.pending || (current.events.assistantTask && !current.events.assistantLegacyRead)) return current
      const result = sendAssistantJob(current.game, current.events.assistantJob, id, () => roll)
      return result.game === current.game ? current : { ...current, game: result.game, events: { ...current.events, assistantJob: result.job }, revision: current.revision + 1 }
    })
  }
  function handleAssistantRead() {
    setView((current) => {
      const job = current.events.assistantJob
      if (!job || job.actual === null || job.read) return current
      return { ...current, events: { ...current.events, assistantJob: { ...job, read: true, ...(job.review === 'resolved' ? { review: 'done' as const } : {}) } }, revision: current.revision + 1 }
    })
  }
  function handleLegacyRead() {
    setView((current) => {
      if (!current.events.assistantTask || current.events.assistantLegacyRead || current.game.day <= current.events.assistantTask.submittedDay) return current
      return { ...current, events: { ...current.events, assistantLegacyRead: true }, revision: current.revision + 1 }
    })
  }
  function handleAssistantClaim() {
    setView((current) => {
      if (current.events.pending || current.events.work?.pending || current.events.rest?.pending || current.events.meal?.pending || current.events.littleStories?.pending) return current
      const result = claimAssistantJob(current.game, current.events.assistantJob)
      return result.game === current.game ? current : { ...current, game: result.game, events: { ...current.events, assistantJob: result.job }, revision: current.revision + 1 }
    })
  }
  function handleAssistantReview(command: 'note' | 'correct' | 'open-correction' | 'accept') {
    setView((current) => {
      const job = current.events.assistantJob
      if (!job || current.events.pending || current.events.work?.pending || current.events.rest?.pending || current.events.meal?.pending || current.events.littleStories?.pending) return current
      const updated = command === 'note' ? { game: current.game, job: noteAssistantReport(job) } : command === 'correct' ? { game: current.game, job: requestAssistantCorrection(current.game, job) } : command === 'open-correction' ? { game: current.game, job: openAssistantCorrection(current.game, job) } : resolveAssistantReport(current.game, job)
      return updated.job === job ? current : { ...current, game: updated.game, events: { ...current.events, assistantJob: updated.job }, revision: current.revision + 1 }
    })
  }
  function startNewGame() {
    setView((current) => ({ ...current, game: createInitialGameState(), events: createEventSession(), message: initialMessage, storage: 'ready', revision: current.revision + 1 }))
  }

  return { ...view, handleAction, handleFinishDay, handleNextDay, handlePurchase, handleProject, handleDelegateProject, handleEventChoice, handleEventContinue, handleWorkChoice, handleWorkContinue, handleRestChoice, handleRestContinue, handleMealChoice, handleMealCancel, handleMealContinue, handleLittleChoice, handleLittleContinue, handleAssistantTask, handleAssistantJob, handleAssistantClaim, handleAssistantRead, handleAssistantReview, handleLegacyRead, startNewGame, writeFailed }
}
