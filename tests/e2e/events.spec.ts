import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createInitialGameState } from '../../src/game/state.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'
import { createEventHistory, recordEventShown } from '../../src/game/eventSelection.ts'

async function ordinaryRest(page: Page, selection = 0) {
  await page.evaluate((pick) => { const draws = [0, pick, 0.9, 0.9, 0.9]; Math.random = () => draws.shift() ?? 0.9 }, selection)
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
}

test('событие после последнего действия восстанавливается до и после выбора', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const game = { ...createInitialGameState(), actionsRemaining: 1, ownedItems: ['pillow'] }
  await page.addInitScript(({ key, game }) => {
    Math.random = () => 0
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, game }))
  }, { key: SAVE_KEY, game })
  await page.goto('/')
  await page.evaluate(() => { const draws = [0, 0, 0.9, 0.9]; Math.random = () => draws.shift() ?? 0.9 })
  await page.getByRole('button', { name: 'Поработать' }).click()
  let dialog = page.getByRole('dialog', { name: 'Список дел с характером' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Список дел с характером' })).toBeFocused()
  await expect(dialog.getByText(/Одно дело за раз/)).toBeVisible()
  await page.locator('.action-grid button').filter({ hasText: 'Закончить день' }).evaluate((button: HTMLButtonElement) => button.click())
  await expect(dialog).toBeVisible()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).events?.pending?.eventId, SAVE_KEY)).toBe('work-list')
  await page.reload()
  dialog = page.getByRole('dialog', { name: 'Список дел с характером' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Выбрать главное' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog.getByText(/появился первый пункт/)).toBeVisible()
  await expect(dialog.getByText('Энергия: -3')).toBeVisible()
  await expect(dialog.getByText('Мотивация: +4')).toBeVisible()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).events?.pending?.choiceId, SAVE_KEY)).toBe('prioritize')
  await page.reload()
  dialog = page.getByRole('dialog', { name: 'Список дел с характером' })
  await expect(dialog.getByText(/появился первый пункт/)).toBeVisible()
  await expect(dialog.getByText('Энергия: -3')).toBeVisible()
  await expect(dialog.getByText('Мотивация: +4')).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Результат' })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Осталось действий: 0')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '62')
  await expect(page.getByRole('img', { name: 'Купленная подушка на кровати' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Закончить день' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: 'Итоги дня 1' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Итоги дня 1' }).getByText('Энергия', { exact: true }).locator('..').locator('dd')).toHaveText('62 (-18)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('уникальный гусь не появляется снова после выбора и обновления', async ({ page }) => {
  const game = { ...createInitialGameState(), day: 2 }
  await page.addInitScript(({ key, game }) => {
    Math.random = () => 0
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, game }))
  }, { key: SAVE_KEY, game })
  await page.goto('/')
  await ordinaryRest(page)
  let dialog = page.getByRole('dialog', { name: 'Гусиная записка' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Прочитать записку' }).click()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await page.reload()
  await ordinaryRest(page)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Начать следующий день' }).click()
  await ordinaryRest(page)
  dialog = page.getByRole('dialog', { name: 'Гусиная записка' })
  await expect(dialog).toHaveCount(0)
})

test('карточка прокручивается на очень маленьком экране и сообщает об ошибке записи', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 350 })
  await page.addInitScript(() => {
    Math.random = () => 0
    Storage.prototype.setItem = () => { throw new Error('write denied') }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Поработать' }).click()
  const dialog = page.getByRole('dialog', { name: 'Список дел с характером' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('alert')).toContainText('Не удалось сохранить прогресс')
  expect(await dialog.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  const choice = dialog.getByRole('button', { name: 'Закрыть список до завтра' })
  await choice.scrollIntoViewIfNeeded()
  await expect(choice).toBeVisible()
  await choice.click()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await expect(page.getByRole('button', { name: 'Закончить день' })).toBeEnabled()
})

test('недоступный платный выбор объясняется, а нулевые фактические изменения показаны честно', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const game = { ...createInitialGameState(), money: 0, satiety: 20, sanity: 100 }
  await page.addInitScript(({ key, game }) => {
    Math.random = () => 0
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, game }))
  }, { key: SAVE_KEY, game })
  await page.goto('/')
  await ordinaryRest(page)
  const dialog = page.getByRole('dialog', { name: 'Важное совещание с холодильником' })
  await expect(dialog.getByRole('button', { name: 'Купить перекус' })).toBeDisabled()
  await expect(dialog.getByText(/Нужно не менее 10: денег/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Заварить чай и немного передохнуть' }).click()
  await expect(dialog.getByText('Показатели не изменились.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('dialog').getByText('Показатели не изменились.')).toBeVisible()
})

test('ветка помощника восстанавливается после выбора и на следующем этапе', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const game = { ...createInitialGameState(), day: 2, ownedItems: ['pillow'] }
  const events = { history: recordEventShown(createEventHistory(), 'assistant-help-start', 2), pending: { eventId: 'assistant-help-start', choiceId: null, changes: null } }
  await page.addInitScript(({ key, game, events }) => {
    let draw = 0
    Math.random = () => draw++ % 2 === 0 ? 0 : 0.999
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 5, game, events }))
  }, { key: SAVE_KEY, game, events })
  await page.goto('/')
  let dialog = page.getByRole('dialog', { name: 'Помощник и список' })
  await expect(dialog).toBeVisible()
  await page.reload()
  await dialog.getByRole('button', { name: 'Попросить идею для отдыха' }).click()
  await page.reload()
  await expect(dialog.getByText(/задумался о хорошем отдыхе/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Начать следующий день' }).click()
  await page.reload()
  await ordinaryRest(page, 0.999)
  dialog = page.getByRole('dialog', { name: 'Совет для отдыха' })
  await expect(dialog).toBeVisible()
  await page.reload()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Выбрать простую паузу' }).click()
  await page.reload()
  await expect(dialog.getByText(/короткий план отдыха/)).toBeVisible()
  await expect(dialog.getByText('Мотивация: +3')).toBeVisible()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await expect(page.getByRole('img', { name: 'Купленная подушка на кровати' })).toBeVisible()
})
