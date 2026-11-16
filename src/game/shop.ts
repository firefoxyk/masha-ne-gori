import { CONSUMABLE_LIMIT, STAT_MAX } from './state.ts'
import type { GameState, ItemId } from './state.ts'

type Effects = { satiety?: number; sanity?: number; motivation?: number }
type Product = { id: string; name: string; price: number; effects: Effects; immediate: string; bonus: string; kind: 'consumable' | 'item'; description?: string }

// Цены и эффекты — временные значения для игровых проб.
export const PRODUCTS = [
  { id: 'treat', name: 'Вкусняшка', price: 15, effects: { satiety: 10, sanity: 3 }, immediate: '+10 сытости, +3 кукухи', bonus: 'Нет', kind: 'consumable' },
  { id: 'dinner', name: 'Готовый ужин', price: 30, effects: { satiety: 25 }, immediate: '+25 сытости', bonus: 'Нет', kind: 'consumable' },
  { id: 'drink', name: 'Необычный напиток', price: 20, effects: { sanity: 6, motivation: 5 }, immediate: '+6 кукухи, +5 мотивации', bonus: 'Нет', kind: 'consumable' },
  { id: 'box', name: 'Коробочка «побаловать себя»', price: 35, effects: { sanity: 10, motivation: 10 }, immediate: '+10 кукухи, +10 мотивации', bonus: 'Нет', kind: 'consumable' },
  { id: 'plant', name: 'Маленькое растение', price: 45, effects: { sanity: 8, motivation: 5 }, immediate: '+8 кукухи, +5 мотивации', bonus: 'Нет', kind: 'item' },
  { id: 'pillow', name: 'Мягкая подушка', price: 60, effects: { sanity: 5 }, immediate: '+5 кукухи', bonus: 'Отдых: +3 энергии', kind: 'item' },
  { id: 'mug', name: 'Любимая кружка', price: 75, effects: { sanity: 5, motivation: 5 }, immediate: '+5 кукухи, +5 мотивации', bonus: 'Еда: +3 сытости', kind: 'item' },
  { id: 'blanket', name: 'Уютный плед', price: 100, effects: { sanity: 8 }, immediate: '+8 кукухи', bonus: 'Отдых: +5 энергии', kind: 'item' },
  { id: 'chair', name: 'Удобное кресло', price: 180, effects: { sanity: 10, motivation: 10 }, immediate: '+10 кукухи, +10 мотивации', bonus: 'Отдых: +7 энергии', kind: 'item' },
  { id: 'rocking-chair', name: 'Кресло-качалка', price: 350, effects: { sanity: 12 }, immediate: '+12 кукухи', bonus: 'Нет', kind: 'item', description: 'Место для уютной паузы без созвонов.' },
  { id: 'lamp', name: 'Настольная лампа', price: 90, effects: { motivation: 5 }, immediate: '+5 мотивации', bonus: 'Работа: +3 монеты', kind: 'item' },
  { id: 'monitor', name: 'Второй монитор', price: 200, effects: { motivation: 10 }, immediate: '+10 мотивации', bonus: 'Работа: +6 монет', kind: 'item' },
  { id: 'vine', name: 'Свисающая лиана', price: 70, effects: { sanity: 8, motivation: 3 }, immediate: '+8 кукухи, +3 мотивации', bonus: 'Нет', kind: 'item' },
  { id: 'garland', name: 'Тёплая гирлянда', price: 80, effects: { sanity: 8, motivation: 5 }, immediate: '+8 кукухи, +5 мотивации', bonus: 'Нет', kind: 'item' },
  { id: 'sofa', name: 'Уютный диван', price: 160, effects: { sanity: 10, motivation: 5 }, immediate: '+10 кукухи, +5 мотивации', bonus: 'Отдых: +5 энергии', kind: 'item' },
  { id: 'bookshelf', name: 'Книжный шкаф', price: 150, effects: { sanity: 5, motivation: 10 }, immediate: '+5 кукухи, +10 мотивации', bonus: 'Нет', kind: 'item' },
  { id: 'egg-pillow', name: 'Подушка-яичница', price: 35, effects: { sanity: 6, motivation: 3 }, immediate: '+6 кукухи, +3 мотивации', bonus: 'Нет', kind: 'item' },
  { id: 'pillow-set', name: 'Набор подушек', price: 65, effects: { sanity: 8 }, immediate: '+8 кукухи', bonus: 'Нет', kind: 'item' },
  { id: 'nightstand', name: 'Прикроватная тумбочка', price: 75, effects: { sanity: 4 }, immediate: '+4 кукухи', bonus: 'Нет', kind: 'item' },
  { id: 'crystal-light', name: 'Ночник-кристалл', price: 55, effects: { sanity: 8, motivation: 3 }, immediate: '+8 кукухи, +3 мотивации', bonus: 'Нет', kind: 'item' },
  { id: 'wall-photos', name: 'Фотографии на стене', price: 50, effects: { sanity: 5, motivation: 5 }, immediate: '+5 кукухи, +5 мотивации', bonus: 'Нет', kind: 'item' },
  { id: 'window-plant', name: 'Растение у окна', price: 60, effects: { sanity: 7, motivation: 3 }, immediate: '+7 кукухи, +3 мотивации', bonus: 'Нет', kind: 'item' },
] as const satisfies readonly Product[]
export type ProductId = typeof PRODUCTS[number]['id']

// Предварительный эффект использует те же числовые данные и границу, что покупка.
export function previewPurchaseEffects(state: GameState, id: ProductId) {
  const product = PRODUCTS.find((item) => item.id === id)!
  const effects: Effects = product.effects
  return (['satiety', 'sanity', 'motivation'] as const).flatMap((stat) => {
    const amount = effects[stat]
    return amount === undefined ? [] : [{ stat, amount, actual: Math.min(STAT_MAX, state[stat] + amount) - state[stat] }]
  })
}

// Для зависимых покупок можно добавить новые пары ID без изменения логики покупки.
const prerequisites: Partial<Record<ProductId, { item: ItemId; reason: string }>> = {
  'crystal-light': { item: 'nightstand', reason: 'Сначала нужна прикроватная тумбочка' },
}

// Старые завершения проекта тоже подтверждают появление дивана без начисления бонусов покупки.
export function hasProjectSofa(state: GameState): boolean {
  return state.projects['ideal-sofa']?.status === 'completed' || (state.projectCompletions['ideal-sofa'] ?? 0) > 0 || (state.projectJournal['ideal-sofa']?.length ?? 0) > 0
}

export function hasSofa(state: GameState): boolean {
  return state.ownedItems.includes('sofa') || hasProjectSofa(state)
}

export function purchaseReason(state: GameState, id: ProductId): string | null {
  const product = PRODUCTS.find((item) => item.id === id)
  if (!product) return 'Товар не найден.'
  if (state.dayStatus !== 'finished') return 'Магазин доступен после завершения дня.'
  if (product.kind === 'item' && state.ownedItems.includes(product.id as ItemId)) return 'Куплено'
  if (id === 'sofa' && hasProjectSofa(state)) return 'Получено в проекте. Бонус покупки к отдыху не начисляется.'
  const requirement = prerequisites[id]
  if (requirement && !state.ownedItems.includes(requirement.item)) return requirement.reason
  if (product.kind === 'consumable' && state.consumablesBought >= CONSUMABLE_LIMIT) return 'Лимит расходуемых покупок на этот день исчерпан.'
  if (state.money < product.price) return `Не хватает монет: нужно ${product.price}.`
  return null
}

export function purchase(state: GameState, id: ProductId): { state: GameState; success: boolean } {
  const product = PRODUCTS.find((item) => item.id === id)
  if (!product || purchaseReason(state, id)) return { state, success: false }
  const effects: Effects = product.effects
  return { success: true, state: {
    ...state,
    money: state.money - product.price,
    satiety: Math.min(STAT_MAX, state.satiety + (effects.satiety ?? 0)),
    sanity: Math.min(STAT_MAX, state.sanity + (effects.sanity ?? 0)),
    motivation: Math.min(STAT_MAX, state.motivation + (effects.motivation ?? 0)),
    consumablesBought: state.consumablesBought + (product.kind === 'consumable' ? 1 : 0),
    ownedItems: product.kind === 'item' ? [...state.ownedItems, product.id as ItemId] : state.ownedItems,
  } }
}

export function bonuses(state: GameState) {
  const has = (id: ItemId) => state.ownedItems.includes(id)
  return { rest: (has('pillow') ? 3 : 0) + (has('blanket') ? 5 : 0) + (has('chair') ? 7 : 0) + (has('sofa') ? 5 : 0), eat: has('mug') ? 3 : 0, work: (has('lamp') ? 3 : 0) + (has('monitor') ? 6 : 0) }
}
