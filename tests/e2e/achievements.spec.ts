import { expect, test } from './fixtures.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('достижение за отдых, клавиатура и восстановление на телефоне', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  const open = page.getByRole('button', { name: /Достижения/ })
  await open.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Достижения' })
  await expect(dialog.getByText('Получено: 0 из 5')).toBeVisible()
  await dialog.getByRole('button', { name: 'Вернуться к игре' }).click()
  await expect(open).toBeFocused()
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Пауза для себя' })).toBeVisible()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.achievements, SAVE_KEY)).toContain('care')
  await page.reload()
  await open.click()
  await expect(dialog.getByText('Получено: 1 из 5')).toBeVisible()
  await expect(dialog.locator('li').filter({ hasText: 'Пауза для себя' })).toContainText('Получено')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
