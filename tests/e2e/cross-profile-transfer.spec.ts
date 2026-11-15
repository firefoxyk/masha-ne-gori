import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('перенос между изолированными профилями сохраняет прохождение и не заменяет его при отмене', async ({ browser, baseURL }) => {
  const source = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const target = await browser.newContext({ viewport: { width: 390, height: 844 } })
  try {
    const game = { ...createInitialGameState(), day: 13, money: 77, ownedItems: ['pillow'], projects: { 'balcony-garden': { status: 'completed', step: 2 } } }
    const events = { ...createEventSession(), storyQueue: [{ type: 'work', id: 'work-01' }], endingsSeen: ['home'] }
    await source.addInitScript(({ key, game, events }) => localStorage.setItem(key, JSON.stringify({ version: 6, game, events })), { key: SAVE_KEY, game, events })
    const a = await source.newPage()
    await a.goto(baseURL!)
    await a.getByRole('button', { name: 'Сохранение', exact: true }).click()
    const dialogA = a.getByRole('dialog', { name: 'Перенос сохранения' })
    const [download] = await Promise.all([a.waitForEvent('download'), dialogA.getByRole('button', { name: 'Скачать сохранение' }).click()])
    const raw = await readFile(await download.path(), 'utf8')
    const snapshot = JSON.parse(raw)
    expect(snapshot.game.day).toBe(13)
    expect(snapshot.game.money).toBe(77)
    expect(snapshot.game.ownedItems).toContain('pillow')
    expect(snapshot.game.projects['balcony-garden'].status).toBe('completed')

    const b = await target.newPage()
    await b.goto(baseURL!)
    await expect.poll(() => b.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
    const original = await b.evaluate(key => localStorage.getItem(key), SAVE_KEY)
    await b.getByRole('button', { name: 'Сохранение', exact: true }).click()
    const dialogB = b.getByRole('dialog', { name: 'Перенос сохранения' })
    const input = dialogB.getByLabel('Выбрать файл сохранения')
    await input.setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') })
    await expect(dialogB.getByRole('alert')).toContainText('повреждён')
    expect(await b.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(original)
    const file = { name: 'save.json', mimeType: 'application/json', buffer: Buffer.from(raw) }
    await input.setInputFiles(file)
    await dialogB.getByRole('button', { name: 'Отмена импорта' }).click()
    expect(await b.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(original)
    await input.setInputFiles(file)
    await dialogB.getByRole('button', { name: 'Заменить и восстановить' }).click()
    await expect.poll(() => b.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY)).toEqual(snapshot)
    await b.reload()
    await expect(b.getByRole('img', { name: 'Купленная подушка на кровати' })).toBeVisible()
    await expect(b.getByRole('button', { name: /Есть история/ })).toBeVisible()
    expect(await b.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY)).toEqual(snapshot)
  } finally {
    await source.close()
    await target.close()
  }
})
