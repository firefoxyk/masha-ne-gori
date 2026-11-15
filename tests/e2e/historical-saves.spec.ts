import { expect, test } from './fixtures.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'
import v1 from '../fixtures/saves/v1.json' with { type: 'json' }
import v6 from '../fixtures/saves/v6.json' with { type: 'json' }
import v19 from '../fixtures/saves/v19.json' with { type: 'json' }
import v23 from '../fixtures/saves/v23.json' with { type: 'json' }

for (const snapshot of [v1, v6, v19, v23]) {
  test(`историческое сохранение версии ${snapshot.version} открывается без записи`, async ({ page }) => {
    const raw = JSON.stringify(snapshot)
    await page.addInitScript(({ key, raw }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, raw) }, { key: SAVE_KEY, raw })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Маша, не гори' })).toBeVisible()
    expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(raw)
    await expect(page.getByRole('progressbar', { name: 'Энергия', includeHidden: true })).toHaveAttribute('value', String(snapshot.game.energy))
    if (snapshot.version === 6) {
      const event = page.getByRole('dialog', { name: 'Отчёт помощника' })
      await expect(event).toBeVisible()
      await event.getByRole('button', { name: 'Проверить отчёт' }).click()
      await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.energy, SAVE_KEY)).toBe(55)
      await page.reload()
      await expect(event.getByText(/опечатку/)).toBeVisible()
      expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.energy, SAVE_KEY)).toBe(55)
      await event.getByRole('button', { name: 'Продолжить игру' }).click()
      await expect(page.getByRole('img', { name: 'Купленная подушка на кровати' })).toBeVisible()
      await page.getByRole('button', { name: /Проекты Маши/ }).click()
      await expect(page.getByRole('dialog', { name: 'Проекты Маши' }).getByText('В работе (1)')).toBeVisible()
    }
    if (snapshot.version === 19) {
      await page.getByRole('button', { name: /ИИ-помощник/ }).click()
      const assistant = page.getByRole('dialog', { name: 'ИИ-помощник' })
      await expect(assistant.getByText(/готовит ответ/)).toBeVisible()
      await assistant.getByRole('button', { name: 'Отложить и вернуться в игру' }).click()
      await page.getByRole('button', { name: 'Закончить день' }).click()
      await page.getByRole('button', { name: 'Начать следующий день' }).click()
      await page.reload()
      await page.getByRole('button', { name: /ИИ-помощник/ }).click()
      await expect(assistant.getByRole('button', { name: 'Открыть отчёт' })).toBeVisible()
    }
    if (snapshot.version === 23) {
      const event = page.getByRole('dialog', { name: 'Гусиная записка' })
      await event.getByRole('button', { name: 'Прочитать записку' }).click()
      await event.getByRole('button', { name: 'Продолжить игру' }).click()
      await expect(page.getByRole('button', { name: /Есть история/ })).toBeVisible()
      await page.reload()
      await expect(page.getByRole('button', { name: /Есть история/ })).toBeVisible()
      await expect(page.getByRole('img', { name: 'Купленная подушка на кровати' })).toBeVisible()
    }
  })
}
