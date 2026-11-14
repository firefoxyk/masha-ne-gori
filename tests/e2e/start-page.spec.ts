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
    await expect(page.getByText('Действия появятся на следующем шаге.')).toBeVisible()
    for (const name of ['Поработать', 'Поесть', 'Отдохнуть', 'Закончить день']) {
      const button = page.getByRole('button', { name })
      await expect(button).toBeVisible()
      await expect(button).toBeDisabled()
      await button.scrollIntoViewIfNeeded()
      const bounds = await button.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  })
}
