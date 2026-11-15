import { ACHIEVEMENTS } from './game/achievements'
import AchievementsDialog from './AchievementsDialog'
import roomImage from './assets/starter-room-no-goose.png'
import gooseImage from './assets/room-items/goose.png'
import plantImage from './assets/room-items/plant.png'
import pillowImage from './assets/room-items/pillow.png'
import blanketImage from './assets/room-items/blanket.png'
import lampImage from './assets/room-items/lamp.png'
import vineImage from './assets/room-items/vine.png'
import garlandImage from './assets/room-items/garland.png'
import eggPillowImage from './assets/room-items/egg-pillow.png'
import pillowSetImage from './assets/room-items/pillow-set.png'
import nightstandImage from './assets/room-items/nightstand.png'
import crystalLightImage from './assets/room-items/crystal-light.png'
import wallPhotosImage from './assets/room-items/wall-photos.png'
import windowPlantImage from './assets/room-items/window-plant.png'
import bookshelfImage from './assets/room-items/bookshelf-proposal.png'
import sofaImage from './assets/room-items/sofa.png'
import rockingChairImage from './assets/room-items/rocking-chair.png'
import mugImage from './assets/room-items/favorite-mug.png'
import { useEffect, useRef, useState } from 'react'
import { PROJECT_IDS, STAT_MAX } from './game/state'
import { nextProjectStory } from './game/projects'
import { ACTIONS, getActionDescription, getActionUnavailableReason } from './game/actions'
import type { ActionId } from './game/actions'
import { getDaySummary } from './game/day'
import { bonuses, hasSofa } from './game/shop'
import { getDetailedStateWarnings } from './game/warnings'
import { useGame } from './storage/useGame'
import DaySummaryPanel from './DaySummaryDialog'
import ShopDialog from './ShopDialog'
import EventDialog from './EventDialog'
import RestDialog from './RestDialog'
import MealDialog from './MealDialog'
import LittleStoryDialog from './LittleStoryDialog'
import AssistantDialog from './AssistantDialog'
import { assistantUnlocked } from './game/assistant'
import ProjectsDialog from './ProjectsDialog'
import { useGooseAppearance } from './useGooseAppearance'
import GooseDialog from './GooseDialog'
import { nextTip } from './game/onboarding'
import OnboardingTip from './OnboardingTip'

export default function App() {
  const { game, events, message, storage, writeFailed, gooseSignal, handleAction, handleFinishDay, handleNextDay, handlePurchase, handleProject, handleDelegateProject, handleEventChoice, handleEventContinue, handleOpenStory, handleWorkChoice, handleWorkContinue, handleRestChoice, handleRestContinue, handleMealChoice, handleMealCancel, handleMealContinue, handleLittleChoice, handleLittleContinue, handleAssistantJob, handleAssistantClaim, handleAssistantRead, handleAssistantReview, handleLegacyRead, handleGooseOpen, handleGooseScheduled, handleGooseChoice, handleGooseContinue, startNewGame, dismissTip } = useGame()
  const goosePending = events.goose?.pending
  const actionIds: ActionId[] = ['work', 'eat', 'rest']
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [notices, setNotices] = useState<string[]>([])
  const previousAchievements = useRef(game.achievements)
  useEffect(() => {
    const newIds = game.achievements.filter(id => !previousAchievements.current.includes(id))
    previousAchievements.current = game.achievements
    if (newIds.length) setNotices(current => [...current, ...ACHIEVEMENTS.filter(item => newIds.includes(item.id)).map(item => item.title)])
  }, [game.achievements])
  const [openWarning, setOpenWarning] = useState<string | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const modalOpen = !!(goosePending || events.pending || events.work?.pending || events.rest?.pending || events.meal?.pending || events.littleStories?.pending || projectsOpen || assistantOpen || shopOpen || achievementsOpen)
  const tip = modalOpen ? null : nextTip(game, events)
  const goose = useGooseAppearance(gooseSignal, game.day, game.dayStatus === 'active', modalOpen, events.goose?.usedDay === game.day || events.gooseVisitDay === game.day, handleGooseScheduled)
  const gooseVisible = goose.visible || !!goosePending
  const returnFocus = useRef(false)
  const focusSummary = useRef(false)
  function nextDay() { setShopOpen(false); focusSummary.current = false; returnFocus.current = true; handleNextDay() }
  function closeShop() { setShopOpen(false); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.shop-open')?.focus()) }
  function closeEvent() { handleEventContinue(); requestAnimationFrame(() => { if (!document.querySelector('.event-dialog[open]')) document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus() }) }
  useEffect(() => { if (events.littleStories?.pending) { setProjectsOpen(false); setAssistantOpen(false) } }, [events.littleStories?.pending])
  useEffect(() => {
    if (returnFocus.current && game.dayStatus === 'active') {
      returnFocus.current = false
      if (!document.querySelector('.event-dialog[open]')) document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus()
    }
  }, [game.dayStatus])
  const summary = game.dayStatus === 'finished' ? getDaySummary(game) : null
  const warnings = getDetailedStateWarnings(game)
  const selectedWarning = warnings.find((warning) => warning.stat === openWarning)
  function closeWarning() {
    const stat = selectedWarning?.stat
    setOpenWarning(null)
    if (stat) document.getElementById(`warning-${stat}`)?.focus()
  }
  const commonReason = game.actionsRemaining === 0 ? 'Действия на сегодня закончились. Можно завершить день.' : null
  const stats = [
    { label: 'Энергия', value: game.energy, icon: '✦', color: 'energy' },
    { label: 'Сытость', value: game.satiety, icon: '●', color: 'satiety' },
    { label: 'Кукуха', value: game.sanity, icon: '♥', color: 'sanity' },
    { label: 'Мотивация', value: game.motivation, icon: '✿', color: 'motivation' },
  ]

  if (storage === 'invalid') {
    return (
      <main className="game-shell">
        <section className="panel day-summary" aria-labelledby="save-error-title">
          <h1 id="save-error-title">Не удалось открыть сохранение</h1>
          <p>Сохранение повреждено или создано другой версией игры. Оно не будет изменено без вашего решения.</p>
          <p>Можно начать новую игру. При этом старое сохранение будет заменено.</p>
          <button className="next-day" type="button" onClick={startNewGame}>Начать новую игру</button>
        </section>
      </main>
    )
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <h1>Маша, не гори</h1>
        </div>
        <p className="day-badge">День {game.day}</p>
      </header>

      {(storage === 'unavailable' || writeFailed) && (
        <p className="day-finished" role="alert">Не удалось {storage === 'unavailable' ? 'прочитать сохранение' : 'сохранить прогресс'}. Можно играть дальше, но прогресс этой сессии не сохранится.</p>
      )}

      {tip === 'intro' && <OnboardingTip id="intro" onDismiss={dismissTip} />}

      <div className="achievement-bar">
        <button type="button" className="achievements-open" onClick={() => { setAchievementsOpen(true); setNotices([]) }}>Достижения · {game.achievements.length} из {ACHIEVEMENTS.length}</button>
        {notices.length > 0 && <div role="status">Новое достижение: {notices.join(', ')} <button type="button" onClick={() => setNotices([])}>Закрыть</button></div>}
      </div>
      <div className="game-layout">
        <div className="story-column">
          <section className="room" aria-label="Комната Маши: временная иллюстрация">
            <div className={`room-art${game.ownedItems.includes('bookshelf') ? ' room-has-bookshelf' : ''}${message.length > 90 ? ' room-long-speech' : ''}`}>
              <img src={roomImage} alt="Маша за рабочим столом в уютной комнате с кроватью, кухней и растением" />
              {hasSofa(game) && <img className="room-item room-item-sofa" src={sofaImage} alt="Уютный диван в комнате" />}
              {game.ownedItems.includes('rocking-chair') && <img className="room-item room-item-rocking-chair" src={rockingChairImage} alt="Купленное кресло-качалка в комнате" />}
              {game.ownedItems.includes('bookshelf') && <img className="room-item room-item-bookshelf" src={bookshelfImage} alt="Купленный книжный шкаф у стены" />}
              {game.ownedItems.includes('vine') && <img className="room-item room-item-vine" src={vineImage} alt="Купленная свисающая лиана на стене" />}
              {game.ownedItems.includes('garland') && <img className="room-item room-item-garland" src={garlandImage} alt="Купленная тёплая гирлянда у окна" />}
              {game.ownedItems.includes('wall-photos') && <img className="room-item room-item-wall-photos" src={wallPhotosImage} alt="Купленные фотографии возле кровати" />}
              {game.ownedItems.includes('window-plant') && <img className="room-item room-item-window-plant" src={windowPlantImage} alt="Купленное растение у окна" />}
              {game.ownedItems.includes('plant') && <img className="room-item room-item-plant" src={plantImage} alt="Купленное растение у стены" />}
              {game.ownedItems.includes('nightstand') && <img className="room-item room-item-nightstand" src={nightstandImage} alt="Купленная прикроватная тумбочка" />}
              {game.ownedItems.includes('nightstand') && game.ownedItems.includes('crystal-light') && <img className="room-item room-item-crystal-light" src={crystalLightImage} alt="Купленный ночник-кристалл на тумбочке" />}
              {game.ownedItems.includes('blanket') && <img className="room-item room-item-blanket" src={blanketImage} alt="Купленный плед на кровати" />}
              {game.ownedItems.includes('pillow') && <img className="room-item room-item-pillow" src={pillowImage} alt="Купленная подушка на кровати" />}
              {game.ownedItems.includes('pillow-set') && <img className="room-item room-item-pillow-set" src={pillowSetImage} alt="Купленный набор подушек у изголовья" />}
              {game.ownedItems.includes('egg-pillow') && <img className="room-item room-item-egg-pillow" src={eggPillowImage} alt="Купленная подушка-яичница на кровати" />}
              {game.ownedItems.includes('lamp') && <img className="room-item room-item-lamp" src={lampImage} alt="Купленная лампа на рабочем столе" />}
              {game.ownedItems.includes('mug') && <img className="room-item room-item-mug" src={mugImage} alt="Купленная любимая кружка на рабочем столе" />}
              {gooseVisible && <button type="button" className="room-goose" aria-label="Поговорить с гусём" onClick={handleGooseOpen}><img className="room-item-goose" src={gooseImage} alt="" /><span>Гусь!</span></button>}
              <span className="visually-hidden" aria-live="polite">{gooseVisible ? hasSofa(game) ? 'Гусь заглянул в комнату и с любопытством смотрит на диван.' : 'Гусь заглянул в комнату.' : ''}</span>
              <section className="speech" aria-label="Реплика Маши" tabIndex={message.length > 90 ? 0 : undefined}>
                <p aria-live="polite">{message}</p>
              </section>
            </div>
          </section>
        </div>

        <div className="dashboard">
          <section className="panel" aria-labelledby="stats-title" onKeyDown={(event) => { if (event.key === 'Escape' && selectedWarning) closeWarning() }}>
            <h2 className="visually-hidden" id="stats-title">Состояние Маши</h2>
            <div className="stats">
              {stats.map((stat) => (
                <div className="stat" key={stat.label}>
                  <div className="stat-heading">
                    <label htmlFor={stat.color}><span className={`stat-icon ${stat.color}`} aria-hidden="true">{stat.icon}</span>{stat.label}</label>
                    <span className="stat-value">{warnings.some((warning) => warning.stat === stat.color) && <button type="button" id={`warning-${stat.color}`} className="warning-toggle" aria-label={`Предупреждение: ${stat.label}`} aria-expanded={selectedWarning?.stat === stat.color} aria-controls={selectedWarning?.stat === stat.color ? 'warning-detail' : undefined} onClick={() => setOpenWarning(selectedWarning?.stat === stat.color ? null : stat.color)}>!</button>}{stat.value} <span className="stat-max">/ {STAT_MAX}</span></span>
                  </div>
                  <progress id={stat.color} className={stat.color} value={stat.value} max={STAT_MAX}>{stat.value} из {STAT_MAX}</progress>
                </div>
              ))}
            </div>
            <dl className="resources">
              <div><dt>Деньги</dt><dd>{game.money}</dd></div>
              <div><dt>Незаконченные проекты</dt><dd>{game.unfinishedProjects}</dd></div>
            </dl>
            <div className="visually-hidden" aria-live="polite">{warnings.map((warning) => warning.text).join(' ')}</div>
            {selectedWarning && <div className="warning-detail" id="warning-detail"><p>{selectedWarning.text}</p><button type="button" onClick={closeWarning}>Понятно</button></div>}
          </section>

          {summary ? <DaySummaryPanel summary={summary} focusOnMount={focusSummary.current} onNextDay={nextDay} onShop={() => setShopOpen(true)} shopTip={tip === 'shop' ? <OnboardingTip id="shop" onDismiss={dismissTip} /> : null} /> : <section className="panel actions" aria-labelledby="actions-title">
            <h2 className="visually-hidden" id="actions-title">Чем займёмся?</h2>
            <div className="game-navigation">
              <button type="button" className="projects-open" onClick={() => setProjectsOpen(true)}>Проекты Маши{PROJECT_IDS.some((id) => nextProjectStory(game, id)) ? ' · новое событие' : ''}</button>
              {assistantUnlocked(game) && <button type="button" className="projects-open assistant-open" onClick={() => setAssistantOpen(true)}>ИИ-помощник{(events.assistantJob && (events.assistantJob.actual === null || events.assistantJob.read === false || (events.assistantJob.reportId && !events.assistantJob.read)) && game.day > (events.assistantJob.review === 'correcting' ? events.assistantJob.correctionDay! : events.assistantJob.submittedDay)) || (events.assistantTask && !events.assistantLegacyRead && game.day > events.assistantTask.submittedDay) ? ' · ответ готов' : ''}</button>}
              {!!events.storyQueue?.length && <button type="button" className="projects-open" onClick={handleOpenStory}>Есть история · {events.storyQueue.length}</button>}
            </div>
            {(tip === 'projects' || tip === 'queue') && <OnboardingTip id={tip} onDismiss={dismissTip} />}
            <p className="actions-count">Осталось действий: <strong>{game.actionsRemaining}</strong></p>
            {commonReason && <p className="day-finished" id="common-reason" role="status">{commonReason}</p>}
            <div className="action-grid">
              {actionIds.map((id) => {
                const reason = id === 'eat' && game.money < 25 && game.dayStatus === 'active' && game.actionsRemaining > 0 ? null : getActionUnavailableReason(game, id)
                return (
                  <div className="action-item" key={id}>
                    <button type="button" disabled={reason !== null} aria-describedby={commonReason ? 'common-reason' : `${id}-description`} onClick={() => { setOpenWarning(null); handleAction(id) }}><span className="action-icon" aria-hidden="true">{id === 'work' ? '💻' : id === 'eat' ? '🥣' : '☁'}</span>{ACTIONS[id].label}</button>
                    {!commonReason && <p className="action-description" id={`${id}-description`}>{reason ?? (id === 'eat' && game.money < 25 ? `Бесплатный перекус: +${15 + bonuses(game).eat} сытости` : getActionDescription(game, id))}</p>}
                  </div>
                )
              })}
              <div className="action-item">
                <button type="button" aria-describedby="end-day-description" onClick={() => { focusSummary.current = true; handleFinishDay() }}>Закончить день</button>
                <p className="action-description" id="end-day-description">Можно закончить день в любой момент.</p>
              </div>
            </div>
          </section>}
        </div>
      </div>
      {achievementsOpen && <AchievementsDialog unlocked={game.achievements} onClose={() => { setAchievementsOpen(false); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.achievements-open')?.focus()) }} />}
      {shopOpen && <ShopDialog game={game} onPurchase={handlePurchase} onClose={closeShop} onNextDay={nextDay} saveProblem={storage === 'unavailable' || writeFailed} />}
      {goosePending && <GooseDialog game={game} pending={goosePending} onChoose={handleGooseChoice} onContinue={() => { goose.dismiss(); handleGooseContinue(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus()) }} saveProblem={storage === 'unavailable' || writeFailed} />}
      {events.pending && <EventDialog pending={events.pending} game={game} onChoose={handleEventChoice} onContinue={closeEvent} saveProblem={storage === 'unavailable' || writeFailed} />}
      {events.work?.pending && !events.pending && <EventDialog work pending={events.work.pending} game={game} onChoose={handleWorkChoice} onContinue={() => { handleWorkContinue(); requestAnimationFrame(() => { if (!document.querySelector('.event-dialog[open]')) document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus() }) }} saveProblem={storage === 'unavailable' || writeFailed} />}
      {events.rest?.pending && <RestDialog rest={events.rest} game={game} onChoose={handleRestChoice} onContinue={() => { handleRestContinue(); requestAnimationFrame(() => { if (!document.querySelector('.event-dialog[open]')) document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus() }) }} saveProblem={storage === 'unavailable' || writeFailed} />}
      {events.meal?.pending && <MealDialog meal={events.meal} game={game} onChoose={handleMealChoice} onCancel={() => { handleMealCancel(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus()) }} onContinue={() => { handleMealContinue(); requestAnimationFrame(() => { if (!document.querySelector('.event-dialog[open]')) document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus() }) }} saveProblem={storage === 'unavailable' || writeFailed} />}
      {events.littleStories?.pending && !events.pending && !events.work?.pending && !events.rest?.pending && !events.meal?.pending && !projectsOpen && !assistantOpen && !shopOpen && <LittleStoryDialog session={events.littleStories} game={game} onChoose={handleLittleChoice} onContinue={() => { handleLittleContinue(); requestAnimationFrame(() => { if (!document.querySelector('.event-dialog[open]')) document.querySelector<HTMLButtonElement>('.action-grid button:not(:disabled)')?.focus() }) }} saveProblem={storage === 'unavailable' || writeFailed} />}
      {projectsOpen && <ProjectsDialog game={game} message={message} onCommand={handleProject} assistantJob={events.assistantJob} legacyBusy={!!events.assistantTask && !events.assistantLegacyRead} onDelegate={handleDelegateProject} onClose={() => { setProjectsOpen(false); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.projects-open')?.focus()) }} />}
      {assistantOpen && <AssistantDialog game={game} task={events.assistantTask} job={events.assistantJob} legacyRead={events.assistantLegacyRead} onJob={handleAssistantJob} onClaim={handleAssistantClaim} onRead={handleAssistantRead} onReview={handleAssistantReview} onLegacyRead={handleLegacyRead} onClose={() => { setAssistantOpen(false); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.assistant-open')?.focus()) }} saveProblem={storage === 'unavailable' || writeFailed} />}
    </main>
  )
}
