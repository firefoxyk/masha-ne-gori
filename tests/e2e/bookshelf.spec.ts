import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('книжный шкаф появляется после покупки и не начисляет эффекты повторно', async ({ page }) => {
  const game = { ...createInitialGameState(), money: 400, sanity: 50, motivation: 50 }
  await page.addInitScript(({ key, game }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, game })) }, { key: SAVE_KEY, game })
  await page.goto('/')
  const shelf = page.getByRole('img', { name: 'Купленный книжный шкаф у стены' })
  await expect(shelf).toHaveCount(0)
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  const shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
  await shop.locator('summary').filter({ hasText: 'Уют' }).click()
  await shop.getByRole('button', { name: 'Купить: Книжный шкаф' }).click()
  await shop.getByRole('button', { name: 'Начать следующий день' }).click()
  await expect(shelf).toBeVisible()
  await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('250')
  await expect(page.getByRole('progressbar', { name: 'Кукуха' })).toHaveAttribute('value', '55')
  await expect(page.getByRole('progressbar', { name: 'Мотивация' })).toHaveAttribute('value', '60')
  await page.reload()
  await expect(shelf).toBeVisible()
  await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('250')
  await expect(page.getByRole('progressbar', { name: 'Кукуха' })).toHaveAttribute('value', '55')
  await expect(page.getByRole('progressbar', { name: 'Мотивация' })).toHaveAttribute('value', '60')
})

test('старое сохранение со шкафом и другими вещами восстанавливается на разных экранах', async ({ page }) => {
  const ownedItems = ['bookshelf', 'plant', 'pillow', 'blanket', 'lamp', 'vine', 'garland', 'egg-pillow', 'pillow-set', 'nightstand', 'crystal-light', 'wall-photos', 'window-plant']
  const game = { ...createInitialGameState(), ownedItems, money: 123 }
  await page.addInitScript(({ key, game }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, game })) }, { key: SAVE_KEY, game })
  await page.goto('/')
  for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport)
    await expect(page.locator('.room-item')).toHaveCount(ownedItems.length)
    await expect(page.getByRole('img', { name: 'Купленный книжный шкаф у стены' })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Купленное растение у стены' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Проекты Маши' })).toBeVisible()
  }
  await page.reload()
  await expect(page.locator('.room-item')).toHaveCount(ownedItems.length)
  await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('123')
  await page.setViewportSize({ width: 320, height: 640 })
  await page.evaluate(() => {
    document.querySelector('.room-art')!.classList.add('room-long-speech')
    document.querySelector('.speech p')!.textContent = 'Маша долго смотрела на свои планы, вздохнула, налила чай и решила, что даже самая большая задача может немного подождать до завтра.'
  })
  const layout = await page.evaluate(() => {
    const art = document.querySelector('.room-art')!.getBoundingClientRect()
    const speech = document.querySelector('.speech')!.getBoundingClientRect()
    const shelf = document.querySelector('.room-item-bookshelf')!.getBoundingClientRect()
    return { speechBottom: speech.bottom, shelfTop: shelf.top, faceTop: art.top + art.height * 0.5, scrollWidth: document.documentElement.scrollWidth }
  })
  expect(layout.speechBottom).toBeLessThanOrEqual(layout.shelfTop)
  expect(layout.speechBottom).toBeLessThan(layout.faceTop)
  expect(layout.scrollWidth).toBeLessThanOrEqual(320)
})
