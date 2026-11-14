import { expect, test } from './fixtures.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { recordEventShown } from '../../src/game/eventSelection.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('начало идеи в событии сохраняется и появляется среди начатых проектов', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const game = { ...createInitialGameState(), actionsRemaining: 2, unfinishedProjects: 2, ownedItems: ['pillow'] }
  const events = { ...createEventSession(), history: recordEventShown(createEventSession().history, 'idea-garden', 1), pending: { eventId: 'idea-garden', choiceId: null, changes: null } }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 7, game, events })) }, { key: SAVE_KEY, game, events })
  await page.goto('/')
  let dialog = page.getByRole('dialog', { name: 'Зелень с характером' })
  await expect(dialog.getByRole('heading', { name: 'Зелень с характером' })).toBeFocused()
  await page.reload()
  await expect(dialog.getByRole('heading', { name: 'Зелень с характером' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Начать «Зелёный уголок» — 1 действие' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog.getByText('Осталось действий: -1')).toBeVisible()
  await expect(dialog.getByText('Незаконченные проекты: +1')).toBeVisible()
  await page.reload()
  dialog = page.getByRole('dialog', { name: 'Зелень с характером' })
  await expect(dialog.getByText('Осталось действий: -1')).toBeVisible()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await expect(page.getByText('Осталось действий: 1')).toBeVisible()
  await page.getByRole('button', { name: 'Проекты Маши' }).click()
  const projects = page.getByRole('dialog', { name: 'Проекты Маши' })
  await expect(projects.getByText('Незаконченных: 3 — именованных 1, обобщённых 2.')).toBeVisible()
  await expect(projects.getByRole('heading', { name: 'В работе (1)' })).toBeVisible()
  await expect(projects.locator('summary').filter({ hasText: 'Зелёный уголок' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Купленная подушка на кровати' })).toBeAttached()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('после последнего действия можно оставить идею в списке бесплатно', async ({ page }) => {
  const game = { ...createInitialGameState(), actionsRemaining: 0 }
  const events = { ...createEventSession(), history: recordEventShown(createEventSession().history, 'idea-recipes', 1), pending: { eventId: 'idea-recipes', choiceId: null, changes: null } }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 7, game, events })) }, { key: SAVE_KEY, game, events })
  await page.goto('/')
  const dialog = page.getByRole('dialog', { name: 'Рецепт на память' })
  await expect(dialog.getByRole('button', { name: 'Начать «Книгу простых рецептов» — 1 действие' })).toBeDisabled()
  await expect(dialog.getByText('На сегодня действия закончились.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Оставить идею в списке на потом — бесплатно' }).click()
  await page.reload()
  await expect(dialog.getByText('«Книга простых рецептов» остаётся в списке доступных идей.')).toBeVisible()
  await expect(dialog.getByText('Показатели не изменились.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await page.getByRole('button', { name: 'Проекты Маши' }).click()
  const projects = page.getByRole('dialog', { name: 'Проекты Маши' })
  await expect(projects.getByRole('heading', { name: 'Доступные идеи (3)' })).toBeVisible()
  await expect(projects.locator('summary').filter({ hasText: 'Книга простых рецептов' })).toBeVisible()
})
