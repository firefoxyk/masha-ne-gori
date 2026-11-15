import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

for (const { name, viewport } of [
  { name: 'mobile', viewport: { width: 390, height: 844 } },
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
]) {
  test(`покупки комнаты и старое сохранение: ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const names = { mug: 'Любимая кружка', chair: 'Удобное кресло', monitor: 'Второй монитор' } as const
    const others = ['sofa', 'bookshelf', 'plant', 'nightstand', 'crystal-light', 'pillow', 'blanket', 'lamp', 'vine', 'garland', 'egg-pillow', 'pillow-set', 'wall-photos', 'window-plant', 'rocking-chair']
    for (const scenario of ['before', 'mug', 'chair', 'monitor', 'all'] as const) {
      const selected: Array<keyof typeof names> = scenario === 'all' ? ['mug', 'chair', 'monitor'] : scenario === 'before' ? [] : [scenario]
      const game = { ...createInitialGameState(), money: 1200, ownedItems: scenario === 'all' ? others : [] }
      await page.evaluate(({ key, game, events }) => localStorage.setItem(key, JSON.stringify({ version: 20, game, events })), { key: SAVE_KEY, game, events: createEventSession() })
      await page.reload()
      if (selected.length) {
        await page.getByRole('button', { name: 'Закончить день' }).click()
        await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
        const shop = page.getByRole('dialog', { name: 'Магазин уютных мелочей' })
        if (selected.includes('chair')) await shop.locator('summary').filter({ hasText: 'Уют' }).click()
        if (selected.includes('mug') || selected.includes('monitor')) await shop.locator('summary').filter({ hasText: 'Удобство' }).click()
        for (const id of selected) await shop.getByRole('button', { name: `Купить: ${names[id]}` }).click()
        await shop.getByRole('button', { name: 'Начать следующий день' }).click()
        await page.reload()
      }
      const cup = page.getByAltText('Купленная любимая кружка на рабочем столе')
      await expect(cup).toHaveCount(selected.includes('mug') ? 1 : 0)
      await page.locator('.room-art img').evaluateAll(async (images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())))
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (selected.length) {
        const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY)
        expect(saved.game.money).toBe(1200 - selected.reduce((sum, id) => sum + ({ mug: 75, chair: 180, monitor: 200 }[id]), 0))
        for (const id of selected) expect(saved.game.ownedItems.filter((item: string) => item === id)).toHaveLength(1)
      }
      await page.screenshot({ path: `test-results/room53-${name}-${scenario}.png`, fullPage: true })
    }
  })
}
