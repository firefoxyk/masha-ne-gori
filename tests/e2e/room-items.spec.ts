import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

const labels = {
  plant: 'Купленное растение у стены',
  pillow: 'Купленная подушка на кровати',
  blanket: 'Купленный плед на кровати',
  lamp: 'Купленная лампа на рабочем столе',
  vine: 'Купленная свисающая лиана на стене',
  garland: 'Купленная тёплая гирлянда у окна',
} as const

for (const ownedItems of [[], ['plant'], ['pillow'], ['blanket'], ['lamp'], ['vine'], ['garland'], ['vine', 'garland'], ['plant', 'pillow', 'blanket', 'lamp', 'vine', 'garland']] as const) {
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
  for (const name of ['Маленькое растение', 'Мягкая подушка', 'Уютный плед', 'Свисающая лиана', 'Тёплая гирлянда']) await shop.getByRole('button', { name: `Купить: ${name}` }).click()
  await shop.locator('summary').filter({ hasText: 'Удобство' }).click()
  await shop.getByRole('button', { name: 'Купить: Настольная лампа' }).click()
  await expect(shop.getByText('Игровые монеты: 555')).toBeVisible()
  await shop.getByRole('button', { name: 'Начать следующий день' }).click()
  await expect(page.locator('.room-item')).toHaveCount(6)
  await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('555')
  await page.reload()
  await expect(page.locator('.room-item')).toHaveCount(6)
  await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('555')
  await page.setViewportSize({ width: 1280, height: 800 })
  for (const label of Object.values(labels)) await expect(page.getByRole('img', { name: label })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
})

test('предметы сохраняют положение относительно изображения комнаты при изменении размера окна', async ({ page }) => {
  const ownedItems = ['plant', 'pillow', 'blanket', 'lamp', 'vine', 'garland']
  const game = { ...createInitialGameState(), ownedItems }
  await page.addInitScript(({ key, game }) => localStorage.setItem(key, JSON.stringify({ version: 2, game })), { key: SAVE_KEY, game })
  await page.goto('/')
  await expect.poll(() => page.locator('.room-art img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
  const positions = []
  for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport)
    const snapshot = await page.evaluate(() => {
      const art = document.querySelector('.room-art')!.getBoundingClientRect()
      const picture = document.querySelector<HTMLImageElement>('.room-art > img')!.getBoundingClientRect()
      const ratio = art.width / art.height
      const paintedHeight = Math.min(picture.height, picture.width * 1402 / 1122)
      return {
        ratio,
        paintedHeight,
        artHeight: art.height,
        items: [...document.querySelectorAll('.room-item')].map((item) => {
          const box = item.getBoundingClientRect()
          return [(box.x - art.x) / art.width, (box.y - art.y) / art.height, box.width / art.width, box.height / art.height]
        }),
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }
    })
    expect(snapshot.items).toHaveLength(6)
    expect(snapshot.ratio).toBeCloseTo(1122 / 1402, 2)
    expect(Math.abs(snapshot.artHeight - snapshot.paintedHeight)).toBeLessThan(1)
    expect(snapshot.scrollWidth).toBeLessThanOrEqual(snapshot.viewportWidth)
    positions.push(snapshot.items)
  }
  for (const items of positions.slice(1)) for (let item = 0; item < items.length; item++) for (let axis = 0; axis < 4; axis++) expect(Math.abs(items[item][axis] - positions[0][item][axis])).toBeLessThan(0.015)
})
