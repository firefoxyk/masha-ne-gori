import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

const labels = {
  plant: 'Купленное растение у стены',
  pillow: 'Купленная подушка на кровати',
  blanket: 'Купленный плед на кровати',
  lamp: 'Купленная лампа на рабочем столе',
} as const

for (const ownedItems of [[], ['plant'], ['pillow'], ['blanket'], ['lamp'], ['plant', 'pillow', 'blanket', 'lamp']] as const) {
  test(`восстановление предметов комнаты: ${ownedItems.join(', ') || 'нет'}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    const game = { ...createInitialGameState(), ownedItems }
    await page.addInitScript(({ key, game }) => localStorage.setItem(key, JSON.stringify({ version: 2, game })), { key: SAVE_KEY, game })
    await page.goto('/')
    for (const [id, label] of Object.entries(labels)) {
      const item = page.getByRole('img', { name: label })
      if (ownedItems.includes(id as never)) {
        await expect(item).toBeVisible()
        await expect.poll(() => item.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
      } else await expect(item).toHaveCount(0)
    }
    await page.reload()
    await expect(page.locator('.room-item')).toHaveCount(ownedItems.length)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  })
}

test('покупки отображаются после возвращения из магазина и сохраняются без повторного списания', async ({ page }) => {
  const game = { ...createInitialGameState(), money: 1000 }
  await page.addInitScript(({ key, game }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({ version: 2, game }))
  }, { key: SAVE_KEY, game })
  await page.goto('/')
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  const shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
  await shop.locator('summary').filter({ hasText: 'Уют' }).click()
  for (const name of ['Маленькое растение', 'Мягкая подушка', 'Уютный плед']) await shop.getByRole('button', { name: `Купить: ${name}` }).click()
  await shop.locator('summary').filter({ hasText: 'Удобство' }).click()
  await shop.getByRole('button', { name: 'Купить: Настольная лампа' }).click()
  await expect(shop.getByText('Игровые монеты: 705')).toBeVisible()
  await shop.getByRole('button', { name: 'Начать следующий день' }).click()
  await expect(page.locator('.room-item')).toHaveCount(4)
  await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('705')
  await page.reload()
  await expect(page.locator('.room-item')).toHaveCount(4)
  await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('705')
  await page.setViewportSize({ width: 1280, height: 800 })
  for (const label of Object.values(labels)) await expect(page.getByRole('img', { name: label })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
})
