import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('мобильная история дивана: стоимость, выбор и восстановление', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const initial = createInitialGameState()
  const game = { ...initial, day: 3, money: 5, unfinishedProjects: 1, projectIdeas: { day: 3, ids: [] }, projects: { 'ideal-sofa': { status: 'started', step: 0, story: { edition: 2, scenario: 0, startDay: 1, seen: 1, actual: null } } } }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 10, game, events })) }, { key: SAVE_KEY, game, events: createEventSession() })
  await page.goto('/')
  await page.getByRole('button', { name: /Проекты Маши/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Проекты Маши' })
  await dialog.locator('#project-group-started').locator('..').locator('summary').filter({ hasText: 'Найти идеальный диван' }).click()
  await expect(dialog.getByRole('button', { name: /Красивый диван/ })).toBeDisabled()
  await expect(dialog.getByText('Не хватает монет: нужно 20.')).toBeVisible()
  const free = dialog.getByRole('button', { name: /Диван соседа — бесплатно/ })
  await free.focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByText(/Сосед предлагает диван/).last()).toBeVisible()
  await dialog.getByRole('button', { name: 'Вернуться в игру' }).click()
  await page.reload()
  await page.getByRole('button', { name: /Проекты Маши/ }).click()
  await dialog.locator('#project-group-started').locator('..').locator('summary').filter({ hasText: 'Найти идеальный диван' }).click()
  await expect(dialog.getByText(/Сосед предлагает диван/).last()).toBeVisible()
  await expect(dialog.getByText('Ждём продолжения.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await expect(page.getByRole('dialog')).toHaveCount(1)
})
