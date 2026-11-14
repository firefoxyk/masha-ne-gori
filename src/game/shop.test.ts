import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './state'
import { finishDay, getDaySummary, startNextDay } from './day'
import { getActionDescription, performAction } from './actions'
import { PRODUCTS, purchase, purchaseReason } from './shop'
import { loadGame, saveGame } from '../storage/gameStorage'

const richDay = () => finishDay({ ...createInitialGameState(), money: 1000, energy: 40, satiety: 40, sanity: 40, motivation: 40 })

describe('магазин', () => {
  it('сохраняет старые вещи без дубликатов и с исходными характеристиками', () => {
    const expected = [
      ['plant', 45, { sanity: 8, motivation: 5 }, 'Нет'],
      ['pillow', 60, { sanity: 5 }, 'Отдых: +3 энергии'],
      ['blanket', 100, { sanity: 8 }, 'Отдых: +5 энергии'],
      ['lamp', 90, { motivation: 5 }, 'Работа: +3 монеты'],
    ] as const
    for (const [id, price, effects, bonus] of expected) {
      const matches = PRODUCTS.filter((item) => item.id === id)
      expect(matches).toHaveLength(1)
      expect(matches[0]).toMatchObject({ id, price, effects, bonus })
    }
    expect(new Set(PRODUCTS.map((item) => item.id)).size).toBe(PRODUCTS.length)
  })

  it.each([
    ['vine', 70, 8, 3], ['garland', 80, 8, 5], ['sofa', 160, 10, 5], ['bookshelf', 150, 5, 10],
  ] as const)('покупает %s за %i и применяет оговорённые эффекты один раз', (id, price, sanity, motivation) => {
    const start = richDay()
    const bought = purchase(start, id)
    expect(bought.success).toBe(true)
    expect(bought.state.money).toBe(1000 - price)
    expect(bought.state.sanity).toBe(40 + sanity)
    expect(bought.state.motivation).toBe(40 + motivation)
    expect(bought.state.consumablesBought).toBe(0)
    expect(bought.state.ownedItems).toContain(id)
    expect(purchase(bought.state, id)).toEqual({ state: bought.state, success: false })
    const poor = { ...start, money: price - 1 }
    expect(purchaseReason(poor, id)).toContain('Не хватает')
    expect(purchase(poor, id)).toEqual({ state: poor, success: false })
    const capped = purchase({ ...start, sanity: 99, motivation: 99 }, id).state
    expect(capped.sanity).toBe(100)
    expect(capped.motivation).toBe(100)
  })

  it('сохраняет покупки новых вещей и неизменные итоги после восстановления', () => {
    const finished = richDay()
    const summary = getDaySummary(finished)
    let purchased = finished
    for (const id of ['vine', 'garland', 'sofa', 'bookshelf'] as const) purchased = purchase(purchased, id).state
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    expect(saveGame(purchased, () => storage)).toBe(true)
    const loaded = loadGame(() => storage)
    expect(loaded.kind).toBe('loaded')
    if (loaded.kind !== 'loaded') throw new Error('Сохранение не восстановлено')
    expect(loaded.game).toEqual(purchased)
    expect(getDaySummary(loaded.game)).toEqual(summary)
    expect(purchase(loaded.game, 'vine').success).toBe(false)
    expect(loadGame(() => storage)).toEqual(loaded)
  })

  it('складывает бонус дивана с остальными вещами и ограничивает энергию', () => {
    let finished = richDay()
    finished = purchase(finished, 'sofa').state
    const sofaDay = startNextDay(finished)
    expect(getActionDescription(sofaDay, 'rest')).toContain('+25 энергии')
    expect(performAction(sofaDay, 'rest').state.energy).toBe(65)
    for (const id of ['pillow', 'blanket', 'chair'] as const) finished = purchase(finished, id).state
    const all = startNextDay(finished)
    expect(getActionDescription(all, 'rest')).toContain('+40 энергии')
    expect(performAction(all, 'rest').state.energy).toBe(80)
    expect(performAction({ ...all, energy: 90 }, 'rest').state.energy).toBe(100)
  })
  it.each(PRODUCTS)('покупает $name с указанной ценой и эффектом', (product) => {
    const before = richDay()
    const snapshot = structuredClone(before)
    const result = purchase(before, product.id)
    expect(result.success).toBe(true)
    expect(before).toEqual(snapshot)
    expect(result.state.money).toBe(before.money - product.price)
    for (const stat of ['satiety', 'sanity', 'motivation'] as const) {
      const effects: Partial<Record<typeof stat, number>> = product.effects
      expect(result.state[stat]).toBe(Math.min(100, before[stat] + (effects[stat] ?? 0)))
    }
    expect(result.state.actionsRemaining).toBe(before.actionsRemaining)
    if (product.kind === 'item') expect(result.state.ownedItems).toContain(product.id)
    else expect(result.state.consumablesBought).toBe(1)
  })

  it('не списывает деньги при нехватке, повторной покупке и в активном дне', () => {
    const poor = { ...richDay(), money: 0 }
    expect(purchaseReason(poor, 'pillow')).toContain('Не хватает')
    expect(purchase(poor, 'pillow')).toEqual({ state: poor, success: false })
    const owned = purchase(richDay(), 'pillow').state
    expect(purchaseReason(owned, 'pillow')).toBe('Куплено')
    expect(purchase(owned, 'pillow')).toEqual({ state: owned, success: false })
    const active = createInitialGameState()
    expect(purchase(active, 'treat')).toEqual({ state: active, success: false })
  })

  it('ограничивает показатели и две расходуемые покупки, сбрасывает лимит после следующего дня', () => {
    const start = { ...richDay(), satiety: 99, sanity: 99, motivation: 99 }
    const first = purchase(start, 'treat').state
    const second = purchase(first, 'box').state
    expect([second.satiety, second.sanity, second.motivation]).toEqual([100, 100, 100])
    expect(purchaseReason(second, 'treat')).toContain('Лимит')
    expect(purchase(second, 'treat')).toEqual({ state: second, success: false })
    expect(purchase(second, 'plant').success).toBe(true)
    const next = startNextDay(second)
    expect(next.consumablesBought).toBe(2)
    expect(finishDay(next).consumablesBought).toBe(0)
  })

  it('суммирует бонусы вещей и показывает актуальные эффекты', () => {
    let state = richDay()
    for (const id of ['pillow', 'blanket', 'chair', 'mug', 'lamp', 'monitor'] as const) state = purchase(state, id).state
    const day = startNextDay(state)
    expect(getActionDescription(day, 'rest')).toContain('+35 энергии')
    expect(getActionDescription(day, 'work')).toContain('+39 денег')
    expect(getActionDescription(day, 'eat')).toContain('+33 сытости')
    expect(performAction(day, 'rest').state.energy).toBe(75)
    expect(performAction({ ...day, energy: 90 }, 'rest').state.energy).toBe(100)
    expect(performAction(day, 'work').state.money).toBe(day.money + 39)
    expect(performAction(day, 'eat').state.satiety).toBe(73)
    const two = { ...day, ownedItems: day.ownedItems.filter((id) => id === 'pillow' || id === 'blanket') }
    expect(performAction(two, 'rest').state.energy).toBe(68)
  })

  it('не меняет итоги дня покупками, но переносит покупки в начало следующего дня', () => {
    const finished = richDay()
    const summary = getDaySummary(finished)
    const bought = purchase(finished, 'treat').state
    expect(getDaySummary(bought)).toEqual(summary)
    const next = startNextDay(bought)
    expect(next.money).toBe(bought.money)
    expect(next.satiety).toBe(bought.satiety)
    expect(next.dayStart.satiety).toBe(bought.satiety)
  })
})
