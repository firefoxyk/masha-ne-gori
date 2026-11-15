import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { withTrainedAssistant } from '../../src/game/assistantFixture.ts'
import { advanceProject } from '../../src/game/projects.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

const sizes = [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1280, height: 800 }]

for (const size of sizes) {
  test(`навигация и сцена без пересечений ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size)
    const initial = { ...withTrainedAssistant(createInitialGameState()), day: 12, projectIdeas: { day: 12, ids: [] }, ownedItems: ['sofa', 'rocking-chair', 'bookshelf'] as const }
    const started = advanceProject({ ...initial, ownedItems: [...initial.ownedItems] }, 'balcony-garden', 'start', () => 0).state
    const game = { ...started, day: 13, projectIdeas: { day: 13, ids: [] } }
    await page.addInitScript(({ key, game, events }) => localStorage.setItem(key, JSON.stringify({ version: 22, game, events })), { key: SAVE_KEY, game, events: createEventSession() })
    await page.goto('/')
    const projects = page.getByRole('button', { name: /Проекты Маши · новое событие/ })
    const assistant = page.getByRole('button', { name: /ИИ-помощник/ })
    await expect(projects).toBeVisible()
    await expect(assistant).toBeVisible()
    await expect(page.locator('.room-item-sofa')).toBeVisible()
    await expect(page.locator('.room-item-rocking-chair')).toBeVisible()
    await expect(page.locator('.room-item-bookshelf')).toBeVisible()
    const assertSeparate = async () => {
      const elements = [projects, assistant, page.locator('.speech'), page.getByRole('button', { name: 'Поработать' }), page.getByRole('button', { name: 'Закончить день' })]
      const boxes = await Promise.all(elements.map(element => element.boundingBox()))
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!, b = boxes[j]!
        expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `areas ${i} and ${j} overlap`).toBe(true)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      for (const button of [projects, assistant]) {
        const isVisible = await button.evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)
        expect(isVisible).toBe(true)
      }
    }
    await assertSeparate()
    await projects.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Проекты Маши' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(projects).toBeFocused()
    await assistant.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'ИИ-помощник' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(assistant).toBeFocused()
    // Длинная реплика и увеличение текста проверяют компоновку, не меняя игру или сохранение.
    await page.locator('.speech p').evaluate(el => { el.textContent = 'Очень длинная реплика Маши. '.repeat(8) })
    await page.locator('.room-art').evaluate(el => el.classList.add('room-long-speech'))
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    await assertSeparate()
    if (size.width === 390) {
      await page.evaluate(() => { const style = document.querySelector('style:last-of-type'); style?.remove() })
      await page.locator('.speech p').evaluate(el => { el.textContent = 'Сегодня всё получится!' })
      await page.locator('.room-art').evaluate(el => el.classList.remove('room-long-speech'))
      await page.evaluate(() => { let count = 0; Math.random = () => ++count === 8 ? 0.1 : 0.99 })
      await page.getByRole('button', { name: 'Отдохнуть' }).click()
      const goose = page.getByRole('button', { name: 'Поговорить с гусём' })
      await expect(goose).toBeVisible()
      await assertSeparate()
      const gooseBox = (await goose.boundingBox())!
      for (const button of [projects, assistant]) {
        const b = (await button.boundingBox())!
        expect(gooseBox.x + gooseBox.width <= b.x || b.x + b.width <= gooseBox.x || gooseBox.y + gooseBox.height <= b.y || b.y + b.height <= gooseBox.y).toBe(true)
      }
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image instanceof HTMLImageElement ? image.decode().catch(() => {}) : Promise.resolve())))
      await page.screenshot({ path: '.cache/button-overlap-after.png', fullPage: true })
    }
  })
}

test('когда помощник ещё не открыт, кнопка проектов остаётся доступной', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: /ИИ-помощник/ })).toHaveCount(0)
  const projects = page.getByRole('button', { name: /Проекты Маши/ })
  await projects.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Проекты Маши' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
