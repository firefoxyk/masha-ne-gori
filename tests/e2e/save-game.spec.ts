import { expect, test } from '@playwright/test'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('восстанавливает игру посреди дня и после его завершения', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Поработать' }).click()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  await page.reload()
  await expect(page.getByText('Осталось действий: 4')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
  await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('130')
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').game?.dayStatus, SAVE_KEY)).toBe('finished')
  await page.reload()
  const summary = page.getByRole('region', { name: 'Итоги дня 1' })
  await expect(summary.getByText('Использовано действий: 1')).toBeVisible()
  await expect(summary.getByText('Энергия', { exact: true }).locator('..').locator('dd')).toHaveText('65 (-15)')
  await page.getByRole('button', { name: 'Начать следующий день' }).click()
  await expect(page.getByText('День 2', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').game?.day, SAVE_KEY)).toBe(2)
  await page.reload()
  await expect(page.getByText('День 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Осталось действий: 5')).toBeVisible()
})

for (const raw of ['{', JSON.stringify({ version: 999, game: {} })]) {
  test(`не перезаписывает неподдерживаемое сохранение до выбора: ${raw}`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value: raw })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Не удалось открыть сохранение' })).toBeVisible()
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(raw)
    await page.getByRole('button', { name: 'Начать новую игру' }).click()
    await expect(page.getByText('День 1', { exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').version, SAVE_KEY)).toBe(1)
  })
}

test('позволяет играть при ошибке записи и предупреждает о ней', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('write denied') }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Поработать' }).click()
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить прогресс')
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '85')
})

test('при ошибке чтения не записывает данные и позволяет играть в сессии', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('read denied') }
    Storage.prototype.setItem = () => { throw new Error('unexpected write') }
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Не удалось прочитать сохранение')
  await page.getByRole('button', { name: 'Поработать' }).click()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
})
