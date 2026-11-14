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
    await expect(page.getByText('Итоги и следующий день появятся в пункте 2.4.')).toBeVisible()
    for (const name of ['Поработать', 'Поесть', 'Отдохнуть', 'Закончить день']) {
      const button = page.getByRole('button', { name })
      await expect(button).toBeVisible()
      if (name === 'Закончить день') await expect(button).toBeDisabled()
      else await expect(button).toBeEnabled()
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
  await expect(page.getByText('Действия на сегодня закончились. День готов к завершению.')).toBeVisible()
  await expect(page.getByText('Осталось действий: 0')).toBeVisible()
  for (const name of ['Поработать', 'Поесть', 'Отдохнуть', 'Закончить день']) {
    await expect(page.getByRole('button', { name })).toBeDisabled()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})
