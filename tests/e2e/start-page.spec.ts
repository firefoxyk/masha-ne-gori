/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createInitialGameState, STAT_MAX } from '../../src/game/state.ts'

const initial = createInitialGameState()

for (const viewport of [{ width: 320, height: 740 }, { width: 1280, height: 800 }]) {
  test(`экран прототипа при ширине ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Маша, не гори' })).toBeVisible()
    await expect(page.getByText(`День ${initial.day}`, { exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Комната Маши: временная иллюстрация' })).toBeVisible()
    for (const [name, value] of [
      ['Энергия', initial.energy],
      ['Сытость', initial.satiety],
      ['Кукуха', initial.sanity],
      ['Мотивация', initial.motivation],
    ] as const) {
      const progress = page.getByRole('progressbar', { name })
      await expect(progress).toBeVisible()
      await expect(progress).toHaveAttribute('value', String(value))
      await expect(progress).toHaveAttribute('max', String(STAT_MAX))
    }
    await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText(String(initial.money))
    await expect(page.getByText('Незаконченные проекты', { exact: true }).locator('..').locator('dd')).toHaveText(String(initial.unfinishedProjects))
    await expect(page.getByText(`Осталось действий: ${initial.actionsRemaining}`)).toBeVisible()
    await expect(page.getByText('Можно закончить день в любой момент.')).toBeVisible()
    for (const name of ['Поработать', 'Поесть', 'Отдохнуть', 'Закончить день']) {
      const button = page.getByRole('button', { name })
      await expect(button).toBeVisible()
      await expect(button).toBeEnabled()
      await button.scrollIntoViewIfNeeded()
      const bounds = await button.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
    }
    await page.getByRole('button', { name: 'Поработать' }).click()
    await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
    await expect(page.getByRole('progressbar', { name: 'Сытость' })).toHaveAttribute('value', '60')
    await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('130')
    await expect(page.getByText('Осталось действий: 4')).toBeVisible()
    await expect(page.getByText('Поработали! Можно и передохнуть.')).toBeVisible()
    await page.getByRole('button', { name: 'Закончить день' }).click()
    const summary = page.getByRole('region', { name: 'Итоги дня 1' })
    await expect(summary).toBeVisible()
    await expect(summary.getByText('Использовано действий: 1')).toBeVisible()
    await expect(summary.getByText('Энергия', { exact: true }).locator('..').locator('dd')).toHaveText('65 (-15)')
    await expect(summary.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('130 (+30)')
    await expect(page.getByRole('button', { name: 'Поработать' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Закончить день' })).toBeDisabled()
    await page.getByRole('button', { name: 'Начать следующий день' }).click()
    await expect(page.getByText('День 2', { exact: true })).toBeVisible()
    await expect(page.getByText('Осталось действий: 5')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
    await page.getByRole('button', { name: 'Отдохнуть' }).click()
    await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '85')
    await page.getByRole('button', { name: 'Закончить день' }).click()
    const secondSummary = page.getByRole('region', { name: 'Итоги дня 2' })
    await expect(secondSummary.getByText('Энергия', { exact: true }).locator('..').locator('dd')).toHaveText('85 (+20)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  })
}

test('нехватка денег и окончание действий объясняются на экране', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  const eat = page.getByRole('button', { name: 'Поесть' })
  for (let i = 0; i < 4; i++) await eat.click()
  await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText('0')
  await expect(eat).toBeDisabled()
  await expect(page.getByText('На еду нужно 25 денег.')).toBeVisible()
  await expect(page.getByText('Осталось действий: 1')).toBeVisible()
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  await expect(page.getByText('Действия на сегодня закончились. Можно завершить день.')).toBeVisible()
  await expect(page.getByText('Осталось действий: 0')).toBeVisible()
  for (const name of ['Поработать', 'Поесть', 'Отдохнуть']) {
    await expect(page.getByRole('button', { name })).toBeDisabled()
  }
  await expect(page.getByRole('button', { name: 'Закончить день' })).toBeEnabled()
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await expect(page.getByText('Использовано действий: 5')).toBeVisible()
  await page.getByRole('button', { name: 'Начать следующий день' }).click()
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await expect(page.getByText('Использовано действий: 0')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('предупреждения меняются после отдыха и сохраняются в новом дне', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  const energyWarning = page.getByText('Энергия на исходе. Пора отдохнуть и набраться сил.')
  const hungerWarning = page.getByText('Маша проголодалась. Пора поесть; если денег мало, можно поработать.')
  await expect(energyWarning).toHaveCount(0)
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Поработать' }).click()
  await expect(energyWarning).toBeVisible()
  await expect(hungerWarning).toBeVisible()
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  await expect(energyWarning).toHaveCount(0)
  await expect(hungerWarning).toBeVisible()
  await page.getByRole('button', { name: 'Закончить день' }).click()
  await page.getByRole('button', { name: 'Начать следующий день' }).click()
  await expect(hungerWarning).toBeVisible()
  await page.getByRole('button', { name: 'Поесть' }).click()
  await expect(hungerWarning).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})
