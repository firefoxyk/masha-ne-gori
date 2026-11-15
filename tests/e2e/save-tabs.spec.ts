import { expect, test } from './fixtures.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('вторая вкладка не затирает сохранение первой', async ({ page, context }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  const other = await context.newPage()
  await other.goto('/')
  await other.getByRole('button', { name: 'Проекты Маши' }).click()
  await page.getByRole('button', { name: 'Поработать' }).click()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.money, SAVE_KEY)).toBe(130)
  const projects = other.getByRole('dialog', { name: 'Проекты Маши' })
  await expect(projects.getByRole('alert')).toContainText('не сохраняется')
  await projects.getByRole('button', { name: 'Вернуться в игру' }).click()
  await expect(other.getByRole('alert')).toContainText('другой вкладке')
  await other.getByRole('button', { name: 'Отдохнуть' }).click()
  await expect(other.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '100')
  expect(await other.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.money, SAVE_KEY)).toBe(130)
  await other.reload()
  await expect(other.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
  await expect(other.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await other.close()
})

test('вкладка проверяет данные перед записью, даже без события от браузера', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  const foreign = await page.evaluate(key => {
    const value = JSON.parse(localStorage.getItem(key)!)
    value.game.money = 200
    const raw = JSON.stringify(value)
    localStorage.setItem(key, raw)
    return raw
  }, SAVE_KEY)
  await page.getByRole('button', { name: 'Поработать' }).click()
  await expect(page.getByRole('alert')).toContainText('другой вкладке')
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(foreign)
})
