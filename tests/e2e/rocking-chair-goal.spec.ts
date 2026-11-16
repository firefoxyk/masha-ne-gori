import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('магазин показывает полный мгновенный эффект при низком показателе', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const game = { ...createInitialGameState(), money: 350, sanity: 20 }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 21, game, events })) }, { key: SAVE_KEY, game, events: createEventSession() })
  await page.goto('/')
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  const shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
  await shop.locator('summary').filter({ hasText: 'Уют' }).focus()
  await page.keyboard.press('Enter')
  await expect(shop.getByRole('button', { name: 'Купить: Кресло-качалка' }).locator('..')).toContainText('Кукуха +12')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('покупка с клавиатуры показывает фактический эффект и не повторяется после обновления', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const game = { ...createInitialGameState(), money: 350, sanity: 98 }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 21, game, events })) }, { key: SAVE_KEY, game, events: createEventSession() })
  await page.goto('/')
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  const shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
  await expect(shop.getByText(/Уже хватает на покупку/)).toBeVisible()
  await shop.locator('summary').filter({ hasText: 'Уют' }).click()
  const button = shop.getByRole('button', { name: 'Купить: Кресло-качалка' })
  await expect(button.locator('..')).toContainText('Сразу сейчас: Кукуха +2 (из +12)')
  const pillow = shop.getByRole('button', { name: 'Купить: Мягкая подушка' }).locator('..')
  await expect(pillow).toContainText('Кукуха +2 (из +5)')
  await expect(pillow).toContainText('Постоянно: Отдых: +3 энергии')
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(shop.getByRole('status')).toContainText('Кукуха: +2')
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.achievements, SAVE_KEY)).toContain('rocking-chair')
  await expect(shop.getByText(/Кресло-качалка куплено/)).toBeVisible()
  await expect(shop.getByText('Игровые монеты: 0')).toBeVisible()
  await expect(pillow).toContainText('Кукуха +0 — уже максимум')
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.ownedItems.includes('rocking-chair'), SAVE_KEY)).toBe(true)
  await page.reload()
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  await expect(shop.getByText(/Кресло-качалка куплено/)).toBeVisible()
  await expect(shop.getByRole('status')).toHaveCount(0)
  await shop.getByRole('button', { name: 'Начать следующий день' }).click()
  await expect(page.getByRole('button', { name: 'Поработать' })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('прежняя покупка открывает историю, результат сохраняется', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const game = { ...createInitialGameState(), ownedItems: ['rocking-chair'], sanity: 40 }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 20, game, events })) }, { key: SAVE_KEY, game, events: createEventSession() })
  await page.goto('/')
  await page.evaluate(() => { const values = [0.01, 0.999, 0.99, 0.99, 0.99, 0.99, 0.99]; Math.random = () => values.shift() ?? 0.99 })
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  const event = page.getByRole('dialog', { name: 'Минутка в кресле' })
  await expect(event).toBeVisible()
  await event.getByRole('button', { name: 'Немного покачаться' }).click()
  await expect(event.getByText(/одобрительно скрипнуло/)).toBeVisible()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).events.pending?.choiceId, SAVE_KEY)).toBe('pause')
  await page.reload()
  await expect(event.getByText(/одобрительно скрипнуло/)).toBeVisible()
  await event.getByRole('button', { name: 'Продолжить игру' }).click()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).events.history.completedEventIds.includes('rocking-chair-first-rest'), SAVE_KEY)).toBe(true)
  await expect(page.getByRole('button', { name: 'Закончить день' })).toBeEnabled()
})
