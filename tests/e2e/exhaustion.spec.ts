import { expect, test } from '@playwright/test'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('после действия и открытого события передышка сохраняется вместе с очередью', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const initial = createInitialGameState()
  const game = { ...initial, energy: 15, money: 0, dayStart: { ...initial.dayStart, energy: 15, money: 0 }, ownedItems: ['pillow'] }
  const events = { ...createEventSession(), storyQueue: [{ type: 'work', id: 'work-01' }] }
  await page.addInitScript(({ key, game, events }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 24, game, events }))
  }, { key: SAVE_KEY, game, events })
  await page.goto('/')
  await page.evaluate(() => { const draws = [0, 0, 0.9, 0.9]; Math.random = () => draws.shift() ?? 0.9 })
  await page.getByRole('button', { name: 'Поработать' }).click()
  let dialog = page.getByRole('dialog', { name: 'Список дел с характером' })
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Закончить день и передохнуть', includeHidden: true }).evaluate((button: HTMLButtonElement) => button.click())
  await expect(dialog).toBeVisible()
  await page.reload()
  dialog = page.getByRole('dialog', { name: 'Список дел с характером' })
  await dialog.getByRole('button', { name: 'Закрыть список до завтра' }).click()
  await page.reload()
  await expect(dialog.getByText(/Список подождёт/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Продолжить игру' }).click()
  const finish = page.getByRole('button', { name: 'Закончить день и передохнуть' })
  await finish.focus()
  await page.keyboard.press('Enter')
  let summary = page.getByRole('region', { name: 'Итоги дня 1' })
  await expect(summary.getByText('Энергия', { exact: true }).locator('..').locator('dd')).toHaveText('10 (-5)')
  await expect(summary.getByText('Использовано действий: 1')).toBeVisible()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.dayStatus, SAVE_KEY)).toBe('finished')
  await page.reload()
  summary = page.getByRole('region', { name: 'Итоги дня 1' })
  await expect(summary.getByText('Энергия', { exact: true }).locator('..').locator('dd')).toHaveText('10 (-5)')
  await page.getByRole('button', { name: 'Начать следующий день' }).click()
  await expect(page.getByRole('button', { name: /Есть история/ })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '10')
  await expect(page.getByRole('img', { name: 'Купленная подушка на кровати' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
