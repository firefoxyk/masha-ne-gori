import { expect, test } from '@playwright/test'
import { createInitialGameState } from '../../src/game/state.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('событие после последнего действия восстанавливается до и после выбора', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const game = { ...createInitialGameState(), actionsRemaining: 1, ownedItems: ['pillow'] }
  await page.addInitScript(({ key, game }) => {
    Math.random = () => 0
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, game }))
  }, { key: SAVE_KEY, game })
  await page.goto('/')
  await page.getByRole('button', { name: 'Поработать' }).click()
  let dialog = page.getByRole('dialog', { name: 'Отчёт помощника' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Отчёт помощника' })).toBeFocused()
  await expect(dialog.getByText(/Всё готово/)).toBeVisible()
  await page.locator('.action-grid button').filter({ hasText: 'Закончить день' }).evaluate((button: HTMLButtonElement) => button.click())
  await expect(dialog).toBeVisible()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).events?.pending?.eventId, SAVE_KEY)).toBe('assistant-report')
  await page.reload()
  dialog = page.getByRole('dialog', { name: 'Отчёт помощника' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Проверить отчёт' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog.getByText(/нашла опечатку/)).toBeVisible()
  await expect(dialog.getByText(/пока не изменяет показатели/)).toBeVisible()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).events?.pending?.choiceId, SAVE_KEY)).toBe('review')
  await page.reload()
  dialog = page.getByRole('dialog', { name: 'Отчёт помощника' })
  await expect(dialog.getByText(/нашла опечатку/)).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Результат' })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Осталось действий: 0')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
  await expect(page.getByRole('img', { name: 'Купленная подушка на кровати' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Закончить день' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: 'Итоги дня 1' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('уникальный гусь не появляется снова после выбора и обновления', async ({ page }) => {
  const game = { ...createInitialGameState(), day: 2 }
  await page.addInitScript(({ key, game }) => {
    Math.random = () => 0
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 2, game }))
  }, { key: SAVE_KEY, game })
  await page.goto('/')
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  let dialog = page.getByRole('dialog', { name: 'Гусиная записка' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Прочитать записку' }).click()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Начать следующий день' }).click()
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
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
  const dialog = page.getByRole('dialog', { name: 'Отчёт помощника' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('alert')).toContainText('Не удалось сохранить прогресс')
  expect(await dialog.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  const choice = dialog.getByRole('button', { name: 'Вернуться к отчёту позже' })
  await choice.scrollIntoViewIfNeeded()
  await expect(choice).toBeVisible()
  await choice.click()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  await expect(page.getByRole('button', { name: 'Закончить день' })).toBeEnabled()
})
