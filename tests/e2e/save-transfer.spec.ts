import { expect, test } from './fixtures.ts'
import { readFile } from 'node:fs/promises'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { withTrainedAssistant } from '../../src/game/assistantFixture.ts'
import v1 from '../fixtures/saves/v1.json' with { type: 'json' }
import v6 from '../fixtures/saves/v6.json' with { type: 'json' }
import v19 from '../fixtures/saves/v19.json' with { type: 'json' }

const file = (value: unknown, name = 'masha.json') => ({ name, mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) })
const open = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Сохранение', exact: true }).click()

test('файл текущей игры скачивается, отмена безопасна, импорт восстанавливает состояние', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Поработать' }).click()
  await open(page)
  let dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  await expect(dialog.getByRole('heading')).toBeFocused()
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Скачать сохранение' }).click()])
  expect(download.suggestedFilename()).toMatch(/^masha-ne-gori-save-\d{4}-\d\d-\d\d\.json$/)
  const raw = await readFile(await download.path(), 'utf8')
  expect(JSON.parse(raw).game.money).toBe(130)
  await dialog.getByRole('button', { name: 'Вернуться' }).click()
  await page.getByRole('button', { name: 'Поработать' }).click()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.money, SAVE_KEY)).toBe(160)
  await open(page)
  dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(raw))
  await expect(dialog.getByRole('group', { name: 'Проверенное сохранение' })).toContainText('День 1, монет 130')
  await dialog.getByRole('button', { name: 'Отмена импорта' }).click()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.money, SAVE_KEY)).toBe(160)
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(raw))
  await dialog.getByRole('button', { name: 'Заменить и восстановить' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Сохранение восстановлено' })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
  await page.reload()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.money, SAVE_KEY)).toBe(130)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('старый файл мигрирует вместе с покупкой, проектом и открытым событием', async ({ page }) => {
  await page.goto('/')
  await open(page)
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(v6))
  await expect(dialog.getByRole('group')).toContainText('День 2, монет 65')
  await dialog.getByRole('button', { name: 'Заменить и восстановить' }).click()
  const event = page.getByRole('dialog', { name: 'Отчёт помощника' })
  await expect(event).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).version, SAVE_KEY)).toBe(24)
  await event.getByRole('button', { name: 'Проверить отчёт' }).click()
  await page.reload()
  await expect(event.getByText(/опечатку/)).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Энергия', includeHidden: true })).toHaveAttribute('value', '55')
})

test('файл с помощником переносится без потери поручения', async ({ page }) => {
  await page.goto('/')
  await open(page)
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(v19))
  await dialog.getByRole('button', { name: 'Заменить и восстановить' }).click()
  await page.reload()
  await page.getByRole('button', { name: /ИИ-помощник/ }).click()
  await expect(page.getByRole('dialog', { name: 'ИИ-помощник' }).getByText(/готовит ответ/)).toBeVisible()
})

test('экспорт и импорт сохраняют проект, покупки, очередь, поручение, достижения и концовку', async ({ page }) => {
  const initial = createInitialGameState(() => 0.99)
  const game = { ...withTrainedAssistant(initial), day: 13, projectIdeas: { day: 13, ids: [] }, ownedItems: ['pillow'], achievements: ['care', 'project'] }
  const events = { ...createEventSession(), assistantJob: { id: 'food', submittedDay: 12, actual: null, reportId: 'food-missing', read: false, review: 'waiting' }, storyQueue: [{ type: 'work', id: 'work-01' }], endingsSeen: ['home'] }
  await page.addInitScript(({ key, game, events }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 24, game, events })) }, { key: SAVE_KEY, game, events })
  await page.goto('/')
  await open(page)
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Скачать сохранение' }).click()])
  const raw = await readFile(await download.path(), 'utf8')
  const snapshot = JSON.parse(raw)
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(raw))
  await dialog.getByRole('button', { name: 'Заменить и восстановить' }).click()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY)).toEqual(snapshot)
  await page.reload()
  await expect(page.getByRole('img', { name: 'Купленная подушка на кровати' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Есть история/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /ИИ-помощник/ })).toBeVisible()
  const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY)
  expect(restored.game.achievements).toEqual(['care', 'project'])
  expect(restored.events.endingsSeen).toEqual(['home'])
  expect(restored.events.assistantJob.reportId).toBe('food-missing')
  expect(restored.game.money).toBe(snapshot.game.money)
})

test('неподходящие файлы и ошибка чтения не заменяют данные', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  const before = await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)
  await open(page)
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  const input = dialog.getByLabel('Выбрать файл сохранения')
  await input.setInputFiles(file('{'))
  await expect(dialog.getByRole('alert')).toContainText('повреждён')
  await input.setInputFiles(file({ version: 999, game: {} }))
  await expect(dialog.getByRole('alert')).toContainText('новой версией')
  await page.evaluate(() => { File.prototype.text = async () => { throw new Error('read failed') } })
  await input.setInputFiles(file(v1))
  await expect(dialog.getByRole('alert')).toContainText('Не удалось прочитать')
  await expect(dialog.getByRole('button', { name: 'Заменить и восстановить' })).toHaveCount(0)
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(before)
})

test('ошибка записи не выдаёт ложный успех и не заменяет прежнюю игру', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  const before = await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)
  await open(page)
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(v1))
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('quota') } })
  await dialog.getByRole('button', { name: 'Заменить и восстановить' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Не удалось записать')
  await expect(page.getByText('Сохранение восстановлено.')).toHaveCount(0)
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(before)
})

test('недоступное хранилище не позволяет подготовить замену', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  const before = await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)
  await open(page)
  await page.evaluate(() => {
    const original = Storage.prototype.getItem
    Object.defineProperty(window, '__restoreStorage', { value: () => { Storage.prototype.getItem = original } })
    Storage.prototype.getItem = () => { throw new Error('read denied') }
  })
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(v1))
  await expect(dialog.getByRole('alert')).toContainText('Не удалось прочитать')
  await expect(dialog.getByRole('button', { name: 'Заменить и восстановить' })).toHaveCount(0)
  await page.evaluate(() => (window as unknown as { __restoreStorage: () => void }).__restoreStorage())
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(before)
})

test('не сообщает об успехе, если запись нельзя проверить', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  await open(page)
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(v1))
  await page.evaluate(() => {
    const read = Storage.prototype.getItem, write = Storage.prototype.setItem
    let written = false
    Object.defineProperty(window, '__restoreStorage', { value: () => { Storage.prototype.getItem = read; Storage.prototype.setItem = write } })
    Storage.prototype.setItem = function (key, value) { write.call(this, key, value); written = true }
    Storage.prototype.getItem = function (key) { if (written) throw new Error('verification failed'); return read.call(this, key) }
  })
  await dialog.getByRole('button', { name: 'Заменить и восстановить' }).click()
  await expect(dialog.getByRole('alert')).toContainText('проверить её не удалось')
  await expect(page.getByText('Сохранение восстановлено.')).toHaveCount(0)
  await page.evaluate(() => (window as unknown as { __restoreStorage: () => void }).__restoreStorage())
  await page.reload()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
})

test('изменение в другой вкладке между выбором и подтверждением блокирует замену', async ({ page, context }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  const other = await context.newPage()
  await other.addInitScript(() => { Math.random = () => 0.99 })
  await other.goto('/')
  await open(page)
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(v1))
  await expect(dialog.getByRole('group')).toBeVisible()
  await other.getByRole('button', { name: 'Поработать' }).click()
  await expect.poll(() => other.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.money, SAVE_KEY)).toBe(130)
  const latest = await other.evaluate(key => localStorage.getItem(key), SAVE_KEY)
  await dialog.getByRole('button', { name: 'Заменить и восстановить' }).click()
  await expect(dialog.getByRole('alert')).toContainText('изменилось после выбора файла')
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(latest)
  await expect(page.getByText('Сохранение восстановлено.')).toHaveCount(0)
  await other.close()
})

test('несохранённую сессию после конфликта можно скачать отдельно', async ({ page, context }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  const other = await context.newPage()
  await other.addInitScript(() => { Math.random = () => 0.99 })
  await other.goto('/')
  await other.getByRole('button', { name: 'Поработать' }).click()
  await expect(page.getByRole('alert')).toContainText('другой вкладке')
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  await open(page)
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Скачать сохранение' }).click()])
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(exported.game.energy).toBe(100)
  expect(exported.game.money).toBe(100)
  expect(await other.evaluate(key => JSON.parse(localStorage.getItem(key)!).game.money, SAVE_KEY)).toBe(130)
  await other.close()
})

test('текущую сессию можно скачать при недоступном чтении хранилища', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('read denied') } })
  await page.goto('/')
  await page.getByRole('button', { name: 'Поработать' }).click()
  await open(page)
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Скачать сохранение' }).click()])
  expect(JSON.parse(await readFile(await download.path(), 'utf8')).game.energy).toBe(65)
})

test('повреждённые исходные данные можно скачать и восстановить игру из файла', async ({ page }) => {
  const corrupt = '{broken-данные'
  await page.addInitScript(({ key, corrupt }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, corrupt) }, { key: SAVE_KEY, corrupt })
  await page.goto('/')
  await page.getByRole('button', { name: 'Перенос сохранения' }).click()
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Скачать исходные данные' }).click()])
  expect(download.suggestedFilename()).toMatch(/^masha-ne-gori-original-\d{4}-\d\d-\d\d\.txt$/)
  expect(await readFile(await download.path(), 'utf8')).toBe(corrupt)
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(corrupt)
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(v1))
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe(corrupt)
  await dialog.getByRole('button', { name: 'Заменить и восстановить' }).click()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
})

test('при повреждённом сохранении неопределённая проверка импорта не скрывает ошибку', async ({ page }) => {
  await page.addInitScript(key => { if (!localStorage.getItem(key)) localStorage.setItem(key, '{broken') }, SAVE_KEY)
  await page.goto('/')
  await page.getByRole('button', { name: 'Перенос сохранения' }).click()
  const dialog = page.getByRole('dialog', { name: 'Перенос сохранения' })
  await dialog.getByLabel('Выбрать файл сохранения').setInputFiles(file(v1))
  await page.evaluate(() => {
    const read = Storage.prototype.getItem, write = Storage.prototype.setItem
    let written = false
    Object.defineProperty(window, '__restoreStorage', { value: () => { Storage.prototype.getItem = read; Storage.prototype.setItem = write } })
    Storage.prototype.setItem = function (key, value) { write.call(this, key, value); written = true }
    Storage.prototype.getItem = function (key) { if (written) throw new Error('verification failed'); return read.call(this, key) }
  })
  await dialog.getByRole('button', { name: 'Заменить и восстановить' }).click()
  await expect(dialog.getByRole('alert')).toContainText('проверить её не удалось')
  await expect(page.getByText('Сохранение восстановлено.')).toHaveCount(0)
  await page.evaluate(() => (window as unknown as { __restoreStorage: () => void }).__restoreStorage())
  await page.reload()
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
})
