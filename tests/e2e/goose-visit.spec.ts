import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

for (const { name, viewport } of [
  { name: 'mobile', viewport: { width: 390, height: 844 } },
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
]) for (const furniture of [false, true]) {
  test(`гость не мешает игре и уходит: ${name}, мебель ${furniture}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.clock.install()
    const game = { ...createInitialGameState(), ownedItems: furniture ? ['sofa', 'bookshelf', 'rocking-chair', 'plant', 'lamp', 'mug'] : [] }
    await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 20, game, events })) }, { key: SAVE_KEY, game, events: createEventSession() })
    await page.goto('/')
    const goose = page.locator('.room-item-goose')
    await expect(goose).toHaveCount(0)
    await expect(page.locator('.room-art > img').first()).toHaveAttribute('src', /starter-room-no-goose/)
    await page.locator('.room-art img').evaluateAll(async images => Promise.all(images.map(image => (image as HTMLImageElement).decode())))
    await page.screenshot({ path: `test-results/goose-${name}-${furniture ? 'furniture' : 'empty'}-away.png`, fullPage: true })
    // Обычная работа делает шесть бросков для событий; седьмой — для появления гуся.
    await page.evaluate(() => { let count = 0; Math.random = () => ++count === 7 ? 0.1 : 0.99 })
    const work = page.getByRole('button', { name: 'Поработать' })
    await work.focus()
    await page.keyboard.press('Enter')
    await expect(goose).toBeVisible()
    await expect(page.getByText(furniture ? /Гусь заглянул в комнату и с любопытством смотрит на диван/ : 'Гусь заглянул в комнату.', { exact: !furniture })).toBeAttached()
    expect(await goose.evaluate(node => getComputedStyle(node).pointerEvents)).toBe('none')
    await goose.evaluate(node => (node as HTMLImageElement).decode())
    await page.screenshot({ path: `test-results/goose-${name}-${furniture ? 'furniture' : 'empty'}-present.png`, fullPage: true })
    const rest = page.getByRole('button', { name: 'Отдохнуть' })
    await expect(rest).toBeEnabled()
    await rest.click()
    await expect(page.getByText('Осталось действий: 3')).toBeVisible()
    await expect(goose).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.clock.fastForward(20001)
    await expect(goose).toHaveCount(0)
    await page.reload()
    await expect(goose).toHaveCount(0)
    await expect(page.getByText('Деньги', { exact: true }).locator('..').locator('dd')).toHaveText(furniture ? '133' : '130')
  })
}
