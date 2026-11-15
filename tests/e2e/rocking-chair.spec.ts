import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('причина недоступности кресла видна при недостатке монет', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  const shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
  await shop.locator('summary').filter({ hasText: 'Уют' }).click()
  const card = shop.locator('article').filter({ hasText: 'Кресло-качалка' })
  await expect(card.getByRole('button', { name: 'Купить: Кресло-качалка' })).toBeDisabled()
  await expect(card.getByText('Не хватает монет: нужно 350.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const { name, viewport, furniture } of [
  { name: 'mobile', viewport: { width: 390, height: 844 }, furniture: ['sofa', 'bookshelf', 'plant', 'nightstand', 'crystal-light', 'pillow', 'blanket', 'lamp', 'vine', 'garland', 'egg-pillow', 'pillow-set', 'wall-photos', 'window-plant'] },
  { name: 'desktop', viewport: { width: 1280, height: 800 }, furniture: [] },
] as const) {
  test(`кресло-качалка покупается и восстанавливается: ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const game = { ...createInitialGameState(), money: 500, sanity: 40, ownedItems: furniture }
    await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 19, game, events })) }, { key: SAVE_KEY, game, events: createEventSession() })
    await page.goto('/')
    await expect(page.getByAltText('Купленное кресло-качалка в комнате')).toHaveCount(0)
    await page.getByRole('button', { name: 'Закончить день' }).click()
    await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
    const shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
    await shop.locator('summary').filter({ hasText: 'Уют' }).click()
    await shop.getByRole('button', { name: 'Купить: Кресло-качалка' }).click()
    await expect(shop.getByText('Игровые монеты: 150')).toBeVisible()
    await expect(shop.getByRole('button', { name: 'Куплено: Кресло-качалка' })).toBeDisabled()
    await expect(shop.getByText(/кукуха 52/)).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
    await shop.locator('summary').filter({ hasText: 'Уют' }).click()
    await expect(shop.getByRole('button', { name: 'Куплено: Кресло-качалка' })).toBeDisabled()
    await expect(shop.getByText('Игровые монеты: 150')).toBeVisible()
    await shop.getByRole('button', { name: 'Начать следующий день' }).click()
    await expect(page.getByAltText('Купленное кресло-качалка в комнате')).toBeVisible()
    if (furniture.includes('sofa' as never)) await expect(page.getByAltText('Уютный диван в комнате')).toBeVisible()
    await page.reload()
    await expect(page.getByAltText('Купленное кресло-качалка в комнате')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/rocking-chair-${name}.png`, fullPage: true })
  })
}
