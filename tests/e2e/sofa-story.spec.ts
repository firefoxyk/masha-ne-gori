import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('финал проекта показывает диван и сохраняет его вместе с другими вещами', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  const game = { ...createInitialGameState(), day: 10, unfinishedProjects: 1, projectIdeas: { day: 10, ids: [] }, ownedItems: ['plant', 'pillow', 'blanket', 'lamp', 'vine', 'garland', 'bookshelf'], projects: { 'ideal-sofa': { status: 'started', step: 2, story: { edition: 2, scenario: 0, startDay: 1, seen: 4, actual: null, choices: { '1': 'Диван соседа — бесплатно', '2': 'Измерить дверь' } } } } }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 14, game, events })) }, { key: SAVE_KEY, game, events: createEventSession() })
  await page.goto('/')
  await expect(page.getByAltText('Уютный диван в комнате')).toHaveCount(0)
  await page.getByRole('button', { name: /Проекты Маши/ }).click()
  const projects = page.getByRole('dialog', { name: 'Проекты Маши' })
  await projects.locator('summary').filter({ hasText: 'Найти идеальный диван' }).click()
  await projects.getByRole('button', { name: 'Прочитать событие: Найти идеальный диван' }).click()
  await projects.getByRole('button', { name: 'Вернуться в игру' }).click()
  await expect(page.getByAltText('Уютный диван в комнате')).toBeVisible()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').game.projects['ideal-sofa']?.status, SAVE_KEY)).toBe('completed')
  await page.reload()
  await expect(page.getByAltText('Уютный диван в комнате')).toBeVisible()
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  const shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
  await shop.locator('summary').filter({ hasText: 'Уют' }).click()
  await expect(shop.getByRole('button', { name: 'Получено в проекте: Уютный диван' })).toBeDisabled()
  await expect(shop.getByText(/Бонус покупки к отдыху не начисляется/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
