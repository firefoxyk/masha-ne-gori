import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('покупки спальни сохраняются, зависят от тумбочки и не меняют итоги', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const initial = createInitialGameState()
  const game = { ...initial, money: 1000, sanity: 40, motivation: 40, dayStart: { ...initial.dayStart, money: 1000, sanity: 40, motivation: 40 } }
  await page.addInitScript(({ key, game }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({ version: 2, game }))
  }, { key: SAVE_KEY, game })
  await page.goto('/')
  await page.getByRole('button', { name: 'Закончить день' }).click()
  const summary = page.getByRole('region', { name: 'Итоги дня 1' })
  await expect(summary.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('1000 (0)')
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  let shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
  const category = shop.locator('summary').filter({ hasText: 'Уют' })
  await category.focus()
  await page.keyboard.press('Enter')
  await expect(category.locator('..')).toHaveAttribute('open', '')
  await expect(shop.getByRole('button', { name: 'Купить: Ночник-кристалл' })).toBeDisabled()
  await expect(shop.getByText('Сначала нужна прикроватная тумбочка')).toBeVisible()
  for (const name of ['Подушка-яичница', 'Набор подушек', 'Прикроватная тумбочка', 'Ночник-кристалл', 'Фотографии на стене', 'Растение у окна']) {
    await shop.getByRole('button', { name: `Купить: ${name}` }).click()
    await expect(shop.getByRole('button', { name: `Куплено: ${name}` })).toBeDisabled()
  }
  await expect(shop.getByText('Игровые монеты: 660')).toBeVisible()
  await expect(shop.getByText('Расходуемые покупки: 0 из 2')).toBeVisible()
  await shop.getByRole('button', { name: 'Вернуться к итогам' }).click()
  await expect(summary.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('1000 (0)')
  await page.reload()
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
  await expect(shop.getByText('Игровые монеты: 660')).toBeVisible()
  await shop.getByRole('button', { name: 'Начать следующий день' }).click()
  for (const label of ['Купленная подушка-яичница на кровати', 'Купленный набор подушек у изголовья', 'Купленная прикроватная тумбочка', 'Купленный ночник-кристалл на тумбочке', 'Купленные фотографии возле кровати', 'Купленное растение у окна']) {
    await expect(page.getByRole('img', { name: label })).toBeVisible()
  }
  await page.reload()
  await expect(page.locator('.room-item')).toHaveCount(6)
  for (const viewport of [{ width: 320, height: 640 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    await expect(page.getByRole('button', { name: 'Закончить день' })).toBeVisible()
  }
})
