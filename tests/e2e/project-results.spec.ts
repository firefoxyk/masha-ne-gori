import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { shortProjectChoice } from '../../src/content/shortProjectChoices.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

for (const scenario of [0, 2, 4]) {
  test(`мобильный итог рецептов: сценарий ${scenario}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    const initial = createInitialGameState()
    const game = { ...initial, day: 3, money: scenario === 2 ? 0 : 100, satiety: scenario === 0 ? 99 : 70, unfinishedProjects: 1, projectIdeas: { day: 3, ids: [] }, projects: { 'recipe-book': { status: 'started', step: 2, story: { edition: 3, scenario, startDay: 1, seen: 2, actual: null, choices: { '1': shortProjectChoice('recipe-book', scenario, 1)!.options[0].label } } } } }
    await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 11, game, events })) }, { key: SAVE_KEY, game, events: createEventSession() })
    await page.goto('/')
    await page.getByRole('button', { name: /Проекты Маши/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Проекты Маши' })
    await dialog.locator('#project-group-started').locator('..').locator('summary').filter({ hasText: 'Книга простых рецептов' }).click()
    await dialog.getByRole('button', { name: 'Прочитать событие: Книга простых рецептов' }).click()
    let completed = dialog.locator('#project-group-completed').locator('..')
    if (scenario === 0) await expect(completed.getByText('Изменения: +1 сытости.')).toBeVisible()
    if (scenario === 2) await expect(completed.getByText('Изменения: 0 монет.')).toBeVisible()
    if (scenario === 4) {
      await expect(completed.getByText(/Первый рецепт/)).toBeVisible()
      await expect(completed.getByText(/Изменения:/)).toHaveCount(0)
    }
    await dialog.getByRole('button', { name: 'Вернуться в игру' }).click()
    await page.reload()
    await page.getByRole('button', { name: /Проекты Маши/ }).click()
    completed = dialog.locator('#project-group-completed').locator('..')
    await completed.locator('summary').filter({ hasText: 'Книга простых рецептов' }).click()
    if (scenario === 0) await expect(completed.getByText('Изменения: +1 сытости.')).toBeVisible()
    if (scenario === 2) await expect(completed.getByText('Изменения: 0 монет.')).toBeVisible()
    if (scenario === 4) await expect(completed.getByText(/Изменения:/)).toHaveCount(0)
    const journal = dialog.locator('#project-journal-title').locator('..')
    await journal.locator('summary').filter({ hasText: 'Книга простых рецептов' }).click()
    if (scenario === 4) await expect(journal.getByText(/Изменения:/)).toHaveCount(0)
    else await expect(journal.getByText(scenario === 0 ? 'Изменения: +1 сытости.' : 'Изменения: 0 монет.')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  })
}
