import { useLayoutEffect, useRef } from 'react'
import { LITTLE_STORIES } from './content/littleStories'
import { littleStoryEnding } from './content/littleStoryEndings'
import { knowsGooseName } from './game/littleStories'
import type { LittleStorySession } from './game/littleStories'
import type { GameState } from './game/state'

export default function LittleStoryDialog({ session, game, onChoose, onContinue, saveProblem }: { session: LittleStorySession; game: GameState; onChoose: (choice: 0 | 1) => void; onContinue: () => void; saveProblem: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const sectionHeading = useRef<HTMLHeadingElement>(null)
  const pending = session.pending!
  const story = LITTLE_STORIES.find((item) => item.id === pending.id)!
  const active = session.active.find((item) => item.id === pending.id)!
  useLayoutEffect(() => {
    const element = dialog.current
    element?.showModal()
    heading.current?.focus()
    return () => { if (element?.open) element.close() }
  }, [])
  useLayoutEffect(() => { if (pending.stage !== 'start') sectionHeading.current?.focus() }, [pending.stage])
  const named = story.goose && knowsGooseName(game)
  const ending = littleStoryEnding(story.id, active.choice ?? 0)
  return <dialog ref={dialog} className="event-dialog panel" aria-labelledby="little-title" onCancel={(event) => event.preventDefault()}>
    <h2 id="little-title" ref={heading} tabIndex={-1}>{story.title}</h2>
    {saveProblem && <p role="alert">Не удалось сохранить прогресс. После закрытия игры результаты этой сессии могут не сохраниться.</p>}
    {pending.stage === 'start' ? <section aria-label="Ситуация">
      <p>{story.start}</p>{named && <p>Маша знает этого гуся: его зовут Пельмень.</p>}
      {story.choices.map((choice, index) => <button type="button" key={choice} onClick={() => onChoose(index as 0 | 1)}>{choice}</button>)}
    </section> : <section>
      <h3 ref={sectionHeading} tabIndex={-1}>{pending.stage === 'reaction' ? 'Маша решила' : 'Продолжение истории'}</h3>
      {pending.stage === 'reaction' ? <p>{story.choices[active.choice!]} История продолжится позже.</p> : <><p>{ending}</p><p>Ранее Маша решила: {story.choices[active.choice!]}</p>{named && <p>Гуся зовут Пельмень.</p>}</>}
      <button type="button" onClick={onContinue}>Продолжить игру</button>
    </section>}
  </dialog>
}
