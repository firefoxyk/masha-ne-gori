import { expect, test } from '@playwright/test'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { withTrainedAssistant } from '../../src/game/assistantFixture.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('два готовых продолжения показываются по очереди с сохранёнными выборами', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const game = { ...createInitialGameState(), day: 4, projectIdeas: { day: 4, ids: [] } }
  const events = { ...createEventSession(), littleStories: { recent: ['little-01', 'little-10'], active: [{ id: 'little-01', choice: 1, dueDay: 3 }, { id: 'little-10', choice: 1, dueDay: 4 }], pending: { id: 'little-01', stage: 'ending' } } }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 14, game, events })) }, { key: SAVE_KEY, game, events })
  await page.goto('/')
  const first = page.getByRole('dialog', { name: 'Чужая посылка' })
  await expect(first).toContainText('Курьер вернулся')
  await first.getByRole('button', { name: 'Продолжить игру' }).click()
  const second = page.getByRole('dialog', { name: 'Праздник у соседей' })
  await expect(second).toContainText('сам замечает, что было шумно')
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').events?.littleStories?.pending?.id, SAVE_KEY)).toBe('little-10')
  await page.reload()
  await expect(second).toContainText('сам замечает, что было шумно')
  await second.getByRole('button', { name: 'Продолжить игру' }).click()
  await expect(second).toHaveCount(0)
})

for (const choice of [0, 1] as const) {
  test(`«Хорошая мысль»: восстановленное продолжение учитывает выбор ${choice + 1}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    const game = { ...withTrainedAssistant(createInitialGameState()), day: 12, projectIdeas: { day: 12, ids: [] } }
    const events = { ...createEventSession(), littleStories: { recent: ['little-48'], active: [{ id: 'little-48', choice, dueDay: 12 }], pending: { id: 'little-48', stage: 'ending' } } }
    await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 14, game, events })) }, { key: SAVE_KEY, game, events })
    await page.goto('/')
    const dialog = page.getByRole('dialog', { name: 'Хорошая мысль' })
    await expect(dialog).toContainText(choice === 0 ? 'первый шаг уже сделан' : 'возвращается к совету')
    await expect(dialog).not.toContainText('адаптируй')
    await page.reload()
    await expect(dialog).toContainText(choice === 0 ? 'первый шаг уже сделан' : 'возвращается к совету')
    await expect(dialog).not.toContainText('адаптируй')
    await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
    await expect(dialog).toHaveCount(0)
  })
}

test('короткая история ждёт выбора и продолжения, сохраняется и не расходует лишние действия', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await page.evaluate(() => { const draws = [0.99, 0.99, 0.05, 0]; Math.random = () => draws.shift() ?? 0.99 })
  await page.getByRole('button', { name: 'Поработать' }).click()
  const dialog = page.getByRole('dialog', { name: 'Чужая посылка' })
  await expect(dialog).toBeVisible()
  await expect.poll(() => page.evaluate(() => !!JSON.parse(localStorage.getItem('masha-ne-gori.save') || '{}').events?.littleStories?.pending)).toBe(true)
  await page.reload()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /Попросить курьера/ }).focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('heading', { name: 'Маша решила' })).toBeFocused()
  await expect(dialog.getByText(/Попросить курьера/)).toBeVisible()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('masha-ne-gori.save') || '{}').events?.littleStories?.active?.[0]?.choice)).toBe(1)
  await page.reload()
  await expect(dialog.getByText(/Попросить курьера/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await expect(page.getByText('Осталось действий: 4')).toBeVisible()
  for (let day = 1; day <= 2; day++) {
    await page.getByRole('button', { name: 'Закончить день' }).click()
    await page.getByRole('button', { name: 'Начать следующий день' }).click()
  }
  await expect(dialog.getByRole('heading', { name: 'Продолжение истории' })).toBeVisible()
  await expect(dialog.getByText(/огромная подушка/)).toBeVisible()
  await expect(dialog.getByText(/Попросить курьера/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
