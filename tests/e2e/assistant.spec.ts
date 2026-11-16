import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'
import { withTrainedAssistant } from '../../src/game/assistantFixture.ts'

for (const day of [12, 13]) {
  test(`прежнее пробное поручение не теряется на дне ${day}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    const game = { ...withTrainedAssistant(createInitialGameState()), day, projectIdeas: { day, ids: [] } }
    const events = { ...createEventSession(), assistantTask: { submittedDay: 12 } }
    await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 15, game, events })) }, { key: SAVE_KEY, game, events })
    await page.goto('/')
    await page.getByRole('button', { name: /ИИ-помощник/ }).click()
    const panel = page.getByRole('dialog', { name: 'ИИ-помощник' })
    await expect(panel.getByRole('button', { name: /Помоги спланировать день/ })).toHaveCount(0)
    if (day === 12) await expect(panel.getByText(/Задачу принял/)).toBeVisible()
    else {
      await expect(panel.getByText(/Поешь, отдохни/)).toBeVisible()
      await panel.getByRole('button', { name: 'Закрыть прочитанный план' }).click()
      await expect(panel.getByRole('button', { name: /Помоги спланировать день/ })).toBeVisible()
    }
  })
}

test('обучение открывает помощника, поручение и результат сохраняются на телефоне', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  const initial = createInitialGameState()
  const story = { scenario: 0, startDay: 1, seen: 4, actual: null, edition: 2, choices: { '1': 'Попросить спокойный план', '2': 'Проверить рецепт', '3': 'Спокойный' } }
  const game = { ...initial, day: 12, projectIdeas: { day: 12, ids: [] }, unfinishedProjects: 1, projects: { 'train-assistant': { status: 'started', step: 2, story } } }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 14, game, events })) }, { key: SAVE_KEY, game, events: createEventSession() })
  await page.goto('/')
  await expect(page.getByRole('button', { name: /ИИ-помощник/ })).toHaveCount(0)
  await page.getByRole('button', { name: /Проекты Маши/ }).click()
  const projects = page.getByRole('dialog', { name: 'Проекты Маши' })
  await projects.locator('summary').filter({ hasText: 'Обучить домашнего ИИ-помощника' }).click()
  await projects.getByRole('button', { name: 'Прочитать событие: Обучить домашнего ИИ-помощника' }).click()
  await expect(projects.getByText(/Открыта панель ИИ-помощника/)).toBeVisible()
  await projects.getByRole('button', { name: 'Вернуться в игру' }).click()
  const open = page.getByRole('button', { name: 'ИИ-помощник', exact: true })
  await expect(open).toBeVisible()
  const positions = await page.evaluate(() => {
    const a = document.querySelector('.assistant-open')!.getBoundingClientRect()
    const p = document.querySelector('.projects-open:not(.assistant-open)')!.getBoundingClientRect()
    return { separated: a.right <= p.left || p.right <= a.left || a.bottom <= p.top || p.bottom <= a.top }
  })
  expect(positions.separated).toBe(true)
  await open.focus()
  await page.keyboard.press('Enter')
  let panel = page.getByRole('dialog', { name: 'ИИ-помощник' })
  await expect(panel.getByText(/Каждое стоит 1 действие/)).toBeVisible()
  await panel.getByRole('button', { name: /Помоги спланировать день/ }).click()
  await expect(panel.getByText(/готовит ответ/)).toBeVisible()
  await expect(page.getByText('Осталось действий: 4')).toBeVisible()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').events?.assistantJob?.submittedDay, SAVE_KEY)).toBe(12)
  await page.reload()
  await page.getByRole('button', { name: 'ИИ-помощник', exact: true }).click()
  panel = page.getByRole('dialog', { name: 'ИИ-помощник' })
  await expect(panel.getByText(/готовит ответ/)).toBeVisible()
  await expect(panel.getByRole('button', { name: /Помоги с рабочей задачей/ })).toHaveCount(0)
  await panel.getByRole('button', { name: 'Отложить и вернуться в игру' }).click()
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Начать следующий день' }).click()
  await page.getByRole('button', { name: /ИИ-помощник · ответ готов/ }).click()
  await expect(page.getByRole('button', { name: /Открыть отчёт/ })).toBeVisible()
  const reportId = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').events?.assistantJob?.reportId, SAVE_KEY)
  await page.getByRole('button', { name: /Открыть отчёт/ }).click()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').events?.assistantJob?.review, SAVE_KEY)).toBe('review')
  await page.reload()
  await page.getByRole('button', { name: /ИИ-помощник · ответ готов/ }).click()
  await expect(page.getByRole('dialog', { name: 'ИИ-помощник' }).getByText(/Начнём с одного дела/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Принять результат' })).toBeVisible()
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').events?.assistantJob?.reportId, SAVE_KEY)).toBe(reportId)
  await expect(page.getByRole('dialog', { name: 'ИИ-помощник' })).not.toContainText('explanation')
  await expect(page.getByRole('dialog', { name: 'ИИ-помощник' }).getByRole('button', { name: /Помоги с рабочей задачей/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Принять результат' }).click()
  await page.getByRole('button', { name: 'Закрыть отчёт' }).click()
  await expect(page.getByRole('button', { name: /Помоги с рабочей задачей/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
