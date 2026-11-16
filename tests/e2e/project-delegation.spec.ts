import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { withTrainedAssistant } from '../../src/game/assistantFixture.ts'
import { advanceProject } from '../../src/game/projects.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('поручение шага, восстановление и проверка отчёта на телефоне', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const initial = withTrainedAssistant(createInitialGameState())
  const game = advanceProject({ ...initial, day: 12, projectIdeas: { day: 12, ids: [] }, money: 100 }, 'balcony-garden', 'start', () => 0).state
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 18, game, events })); Math.random = () => 0 }, { key: SAVE_KEY, game, events: createEventSession() })
  await page.goto('/')
  await page.getByRole('button', { name: 'Проекты Маши' }).click()
  const projects = page.getByRole('dialog', { name: 'Проекты Маши' })
  await projects.getByText(/Зелёный уголок · Новое событие/).first().click()
  const delegate = projects.getByRole('button', { name: 'Поручить помощнику: Зелёный уголок' })
  await delegate.focus()
  await page.keyboard.press('Enter')
  await expect(projects.getByRole('button', { name: 'Подготовить горшок: Зелёный уголок' })).toBeDisabled()
  await expect(projects.getByText(/Шаг поручен; отчёт будет завтра/)).toBeVisible()
  await projects.getByRole('button', { name: 'Вернуться в игру' }).click()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').events?.assistantJob?.project?.id, SAVE_KEY)).toBe('balcony-garden')
  await page.reload()
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Начать следующий день' }).click()
  await page.getByRole('button', { name: /ИИ-помощник/ }).click()
  const assistant = page.getByRole('dialog', { name: 'ИИ-помощник' })
  await assistant.getByRole('button', { name: 'Открыть отчёт' }).click()
  await assistant.getByRole('button', { name: 'Принять результат' }).click()
  await expect(assistant.getByText(/Шаг проекта выполнен/)).toBeVisible()
  await expect(assistant.getByRole('button', { name: 'Закрыть отчёт' })).toBeVisible()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').game?.projects?.['balcony-garden']?.step, SAVE_KEY)).toBe(1)
  await page.reload()
  await page.getByRole('button', { name: /ИИ-помощник/ }).click()
  await expect(assistant.getByText(/Шаг проекта выполнен/)).toBeVisible()
  await assistant.getByRole('button', { name: 'Закрыть отчёт' }).click()
  await expect(assistant.getByRole('button', { name: /Помоги спланировать день/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
