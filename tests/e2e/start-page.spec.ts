/// <reference lib="dom" />
import { expect, test } from './fixtures.ts'
import { createInitialGameState, STAT_MAX } from '../../src/game/state.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

const initial = createInitialGameState()

for (const viewport of [{ width: 320, height: 740 }, { width: 375, height: 812 }, { width: 1280, height: 800 }]) {
  test(`экран прототипа при ширине ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    // Знакомство намеренно допускает прокрутку; проверяем обычный экран после него.
    await page.getByRole('button', { name: 'Закрыть подсказку: Знакомьтесь: Маша' }).click()

    await expect(page.getByRole('heading', { name: 'Маша, не гори' })).toBeVisible()
    await expect(page.getByText(`День ${initial.day}`, { exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Комната Маши: временная иллюстрация' })).toBeVisible()
    const roomImage = page.getByRole('img', { name: /Маша за рабочим столом/ })
    await expect(roomImage).toBeVisible()
    await expect.poll(() => roomImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height)
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
      const row = progress.locator('..').locator('.stat-heading')
      const label = await row.locator('label').boundingBox()
      const number = await row.locator(':scope > span').boundingBox()
      expect(label).not.toBeNull()
      expect(number).not.toBeNull()
      expect(label!.x + label!.width).toBeLessThanOrEqual(number!.x)
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
    await page.getByRole('button', { name: 'Проекты Маши' }).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Поработать' })).toBeFocused()
    await page.keyboard.press('Enter')
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
    await expect(page.locator('.action-grid')).toHaveCount(0)
    await page.getByRole('button', { name: 'Начать следующий день' }).click()
    await expect(page.getByText('День 2', { exact: true })).toBeVisible()
    await expect(page.getByText('Осталось действий: 5')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Поработать' })).toBeEnabled()
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
  await expect(eat).toBeEnabled()
  await expect(page.getByText('Бесплатный перекус: +15 сытости')).toBeVisible()
  await expect(page.getByText('Осталось действий: 1')).toBeVisible()
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  await expect(page.getByText('Действия на сегодня закончились. Можно завершить день.')).toBeVisible()
  await expect(page.getByText('Действия на сегодня закончились. Можно завершить день.')).toHaveCount(1)
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

for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 700 }, { width: 390, height: 844 }]) {
  test(`несколько предупреждений и размеры ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const game = { ...createInitialGameState(), energy: 10, satiety: 10, sanity: 10 }
    await page.addInitScript(({ key, game }) => localStorage.setItem(key, JSON.stringify({ version: 1, game })), { key: SAVE_KEY, game })
    await page.goto('/')
    for (const [name, text] of [['Энергия', 'Энергия на исходе'], ['Сытость', 'Маша проголодалась'], ['Кукуха', 'Кукуха']] as const) {
      const button = page.getByRole('button', { name: `Предупреждение: ${name}` })
      await expect(button).toBeVisible()
      await button.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('#warning-detail')).toContainText(text, { ignoreCase: true })
      await page.keyboard.press('Escape')
      await expect(button).toBeFocused()
    }
    await expect(page.getByRole('button', { name: 'Поработать' })).toBeDisabled()
    await expect(page.getByText(/Для работы нужно/)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height)
  })
}

test('ранние итоги доступны с клавиатуры и восстанавливаются после обновления', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.addInitScript(() => { history.scrollRestoration = 'manual' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Закончить день' }).focus()
  await page.keyboard.press('Enter')
  let summary = page.getByRole('region', { name: 'Итоги дня 1' })
  await expect(summary).toBeVisible()
  await expect(summary.getByText('Использовано действий: 0')).toBeVisible()
  await expect(summary.getByRole('heading')).toBeFocused()
  await expect(page.locator('.action-grid')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.reload()
  summary = page.getByRole('region', { name: 'Итоги дня 1' })
  await expect(summary).toBeVisible()
  await expect(summary.getByText('Использовано действий: 0')).toBeVisible()
  await expect(page.locator('.action-grid')).toHaveCount(0)
  await expect(summary.getByRole('heading')).not.toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await summary.getByRole('heading').focus()
  await page.keyboard.press('Tab')
  await expect(summary.getByRole('button', { name: 'Заглянуть в магазин' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(summary.getByRole('button', { name: 'Начать следующий день' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText('День 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Поработать' })).toBeFocused()
})

test('реплики и увеличенный текст не обрезаются на маленьком экране', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  const speech = page.locator('.speech')
  for (const action of ['Поесть', 'Отдохнуть']) {
    await page.getByRole('button', { name: action }).click()
    await expect(speech).toBeVisible()
    const boxes = await page.evaluate(() => {
      const bubble = document.querySelector('.speech')!
      const text = bubble.querySelector('p')!
      const room = document.querySelector('.room')!
      const actions = document.querySelector('.actions')!
      return { bubble: bubble.getBoundingClientRect().toJSON(), room: room.getBoundingClientRect().toJSON(), actions: actions.getBoundingClientRect().toJSON(), clipped: text.scrollHeight > text.clientHeight || text.scrollWidth > text.clientWidth }
    })
    expect(boxes.clipped).toBe(false)
    expect(boxes.bubble.bottom).toBeLessThanOrEqual(boxes.room.bottom)
    expect(boxes.bubble.bottom).toBeLessThanOrEqual(boxes.actions.top)
  }
  await page.addStyleTag({ content: 'html { font-size: 24px !important; }' })
  await page.getByRole('button', { name: 'Закончить день' }).click()
  const summary = page.getByRole('region', { name: 'Итоги дня 1' })
  await expect(summary).toBeVisible()
  await summary.getByRole('button', { name: 'Начать следующий день' }).scrollIntoViewIfNeeded()
  await expect(summary.getByRole('button', { name: 'Начать следующий день' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('предупреждения меняются после отдыха и сохраняются в новом дне', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  const energyWarning = page.getByRole('button', { name: 'Предупреждение: Энергия' })
  const hungerWarning = page.getByRole('button', { name: 'Предупреждение: Сытость' })
  await expect(energyWarning).toHaveCount(0)
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Поработать' }).click()
  await expect(energyWarning).toBeVisible()
  await expect(hungerWarning).toBeVisible()
  await energyWarning.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#warning-detail')).toContainText('Энергия на исходе')
  await page.keyboard.press('Escape')
  await expect(energyWarning).toBeFocused()
  await hungerWarning.click()
  await expect(page.locator('#warning-detail')).toContainText('Маша проголодалась')
  await page.getByRole('button', { name: 'Понятно' }).click()
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
