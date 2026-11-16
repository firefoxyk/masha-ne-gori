import { useEffect, useRef, useState } from 'react'
import { CONSUMABLE_LIMIT } from './game/state'
import type { GameState } from './game/state'
import { PRODUCTS, previewPurchaseEffects, purchaseReason } from './game/shop'
import type { ProductId } from './game/shop'
import rockingChairImage from './assets/room-items/rocking-chair.png'

const categories = [
  { name: 'Вкусняшки', icon: '🍪', ids: ['treat', 'dinner', 'drink', 'box'] },
  { name: 'Уют', icon: '🌿', ids: ['plant', 'vine', 'garland', 'pillow', 'blanket', 'egg-pillow', 'pillow-set', 'nightstand', 'crystal-light', 'wall-photos', 'window-plant', 'chair', 'rocking-chair', 'sofa', 'bookshelf'] },
  { name: 'Удобство', icon: '☕', ids: ['mug', 'lamp', 'monitor'] },
] as const satisfies readonly { name: string; icon: string; ids: readonly ProductId[] }[]

const statNames = { satiety: 'Сытость', sanity: 'Кукуха', motivation: 'Мотивация' }

export default function ShopDialog({ game, onPurchase, onClose, onNextDay, saveProblem }: { game: GameState; onPurchase: (id: ProductId) => void; onClose: () => void; onNextDay: () => void; saveProblem: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const previousGame = useRef(game)
  const [chairReaction, setChairReaction] = useState<string | null>(null)
  const chair = PRODUCTS.find((product) => product.id === 'rocking-chair')!
  useEffect(() => {
    const previous = previousGame.current
    if (!previous.ownedItems.includes('rocking-chair') && game.ownedItems.includes('rocking-chair')) {
      setChairReaction(`Маша: «Кажется, у отдыха теперь есть своё место». Кукуха: +${game.sanity - previous.sanity}.`)
    }
    previousGame.current = game
  }, [game])
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    element.showModal()
    title.current?.focus()
    return () => { if (element.open) element.close() }
  }, [])
  return (
    <dialog className="shop-dialog" ref={dialog} aria-labelledby="shop-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
      <header className="shop-header">
        <h2 id="shop-title" ref={title} tabIndex={-1}>Магазин уютных мелочей</h2>
        <div className="shop-balance">
          <p>Игровые монеты: <strong>{game.money}</strong></p>
          <p>Расходуемые покупки: <strong>{game.consumablesBought} из {CONSUMABLE_LIMIT}</strong></p>
        </div>
        <p>Сейчас: сытость {game.satiety}, кукуха {game.sanity}, мотивация {game.motivation}.</p>
        <p>Покупки действуют сразу и не меняют итоги завершённого дня.</p>
        <p>{game.ownedItems.includes('rocking-chair') ? 'Кресло-качалка куплено — можно устраиваться поудобнее.' : `Цель: кресло-качалка — ${chair.price} монет. ${game.money >= chair.price ? 'Уже хватает на покупку.' : `Осталось накопить: ${chair.price - game.money} монет.`}`}</p>
        {chairReaction && <p role="status">{chairReaction}</p>}
        {saveProblem && <p role="alert">Не удалось сохранить прогресс. Покупки могут не сохраниться после закрытия игры.</p>}
      </header>
      <div className="shop-categories">
        {categories.map((category) => <details className="shop-category" key={category.name}>
          <summary><span><span aria-hidden="true">{category.icon} </span>{category.name}</span><span className="category-arrow" aria-hidden="true">⌄</span></summary>
          <div className="shop-items">
        {category.ids.map((id) => {
          const product = PRODUCTS.find((item) => item.id === id)!
          const reason = purchaseReason(game, product.id)
          const received = product.id === 'sofa' && !!reason?.startsWith('Получено в проекте')
          return <article className="shop-item" key={product.id}>
            <div className="shop-item-heading"><h3>{product.name}</h3><span>{product.price} монет</span></div>
            {product.id === 'rocking-chair' && <img className="shop-product-image" src={rockingChairImage} alt="Кресло-качалка с мягкими подушками" />}
            {'description' in product && <p>{product.description}</p>}
            {reason === 'Куплено' || received ? <p>Эффект покупки: {product.immediate}</p> : <p>Сразу сейчас: {previewPurchaseEffects(game, product.id).map(({ stat, amount, actual }) => `${statNames[stat]} +${actual}${actual === 0 ? ' — уже максимум' : actual < amount ? ` (из +${amount})` : ''}`).join(', ')}</p>}
            {product.bonus !== 'Нет' && <p>Постоянно: {product.bonus}</p>}
            {reason && <p id={`reason-${product.id}`} className="shop-reason">{reason}</p>}
            <button type="button" disabled={!!reason} aria-describedby={reason ? `reason-${product.id}` : undefined} onClick={() => onPurchase(product.id)} aria-label={`${reason === 'Куплено' ? 'Куплено' : received ? 'Получено в проекте' : 'Купить'}: ${product.name}`}>{reason === 'Куплено' ? 'Куплено' : received ? 'Получено в проекте' : 'Купить'}</button>
          </article>
        })}
          </div>
        </details>)}
      </div>
      <div className="shop-footer">
        <button type="button" onClick={onClose}>Вернуться к итогам</button>
        <button type="button" onClick={onNextDay}>Начать следующий день</button>
      </div>
    </dialog>
  )
}
