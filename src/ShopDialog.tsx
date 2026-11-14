import { useEffect, useRef } from 'react'
import { CONSUMABLE_LIMIT } from './game/state'
import type { GameState } from './game/state'
import { PRODUCTS, purchaseReason } from './game/shop'
import type { ProductId } from './game/shop'

const categories = [
  { name: 'Вкусняшки', icon: '🍪', ids: ['treat', 'dinner', 'drink', 'box'] },
  { name: 'Уют', icon: '🌿', ids: ['plant', 'vine', 'garland', 'pillow', 'blanket', 'egg-pillow', 'pillow-set', 'nightstand', 'crystal-light', 'wall-photos', 'window-plant', 'chair', 'sofa', 'bookshelf'] },
  { name: 'Удобство', icon: '☕', ids: ['mug', 'lamp', 'monitor'] },
] as const satisfies readonly { name: string; icon: string; ids: readonly ProductId[] }[]

export default function ShopDialog({ game, onPurchase, onClose, onNextDay, saveProblem }: { game: GameState; onPurchase: (id: ProductId) => void; onClose: () => void; onNextDay: () => void; saveProblem: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
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
        {saveProblem && <p role="alert">Не удалось сохранить прогресс. Покупки могут не сохраниться после закрытия игры.</p>}
      </header>
      <div className="shop-categories">
        {categories.map((category) => <details className="shop-category" key={category.name}>
          <summary><span><span aria-hidden="true">{category.icon} </span>{category.name}</span><span className="category-arrow" aria-hidden="true">⌄</span></summary>
          <div className="shop-items">
        {category.ids.map((id) => {
          const product = PRODUCTS.find((item) => item.id === id)!
          const reason = purchaseReason(game, product.id)
          return <article className="shop-item" key={product.id}>
            <div className="shop-item-heading"><h3>{product.name}</h3><span>{product.price} монет</span></div>
            <p>Сразу: {product.immediate}</p>
            {product.bonus !== 'Нет' && <p>Постоянно: {product.bonus}</p>}
            {reason && <p id={`reason-${product.id}`} className="shop-reason">{reason}</p>}
            <button type="button" disabled={!!reason} aria-describedby={reason ? `reason-${product.id}` : undefined} onClick={() => onPurchase(product.id)} aria-label={`${reason === 'Куплено' ? 'Куплено' : 'Купить'}: ${product.name}`}>{reason === 'Куплено' ? 'Куплено' : 'Купить'}</button>
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
