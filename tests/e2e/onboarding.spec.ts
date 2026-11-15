import { expect, test } from './fixtures.ts'
import { createInitialGameState } from '../../src/game/state.ts'
import { createEventSession } from '../../src/game/eventSession.ts'
import { createOnboarding } from '../../src/game/onboarding.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('знакомство, проекты и магазин доступны постепенно на телефоне', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const intro = page.getByRole('complementary', { name: 'Знакомьтесь: Маша' })
  await expect(intro).toBeVisible()
  await expect(page.getByRole('button', { name: 'Поработать' })).toBeEnabled()
  await expect(page.getByRole('complementary')).toHaveCount(1)
  await page.screenshot({ path: '.cache/onboarding-start.png', fullPage: true })
  await page.reload()
  await expect(intro).toBeVisible()
  const close = intro.getByRole('button', { name: /Закрыть подсказку/ })
  await close.focus()
  await page.keyboard.press('Enter')
  await expect(intro).toHaveCount(0)
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).events.onboarding.intro, SAVE_KEY)).toBe(true)
  await page.reload()
  await expect(intro).toHaveCount(0)
  await page.getByRole('button', { name: 'Отдохнуть' }).click()
  const projectsTip = page.getByRole('complementary', { name: 'Идеи Маши' })
  await expect(projectsTip).toBeVisible()
  await page.screenshot({ path: '.cache/onboarding-projects.png', fullPage: true })
  await page.getByRole('button', { name: /Проекты Маши/ }).click()
  await expect(page.getByRole('dialog', { name: 'Проекты Маши' })).toBeVisible()
  await page.keyboard.press('Escape')
  await projectsTip.getByRole('button').click()
  await page.getByRole('button', { name: 'Закончить день' }).click()
  const shopTip = page.getByRole('complementary', { name: 'Немного уюта' })
  await expect(shopTip).toBeVisible()
  await page.screenshot({ path: '.cache/onboarding-shop.png', fullPage: true })
  await page.getByRole('button', { name: 'Заглянуть в магазин' }).click()
  await expect(page.getByRole('dialog', { name: 'Магазин уютных мелочей' })).toBeVisible()
})

for (const action of ['Поработать', 'Поесть'] as const) {
  test(`можно сразу выбрать «${action}», не закрывая знакомство`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/')
    await page.getByRole('button', { name: action, exact: true }).click()
    await expect(page.getByText('Осталось действий: 4')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Знакомьтесь: Маша' })).toBeVisible()
  })
}

test('очередь и крупный текст: подсказка не блокирует историю', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const game = createInitialGameState()
  const events = { ...createEventSession(), storyQueue: [{ type: 'work', id: 'work-01' }], onboarding: { ...createOnboarding(), intro: true } }
  await page.addInitScript(({ game, events }) => { if (!localStorage.getItem('masha-ne-gori.save')) localStorage.setItem('masha-ne-gori.save', JSON.stringify({ version: 24, game, events })) }, { game, events })
  await page.goto('/')
  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  const tip = page.getByRole('complementary', { name: 'История подождёт' })
  await expect(tip).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '.cache/onboarding-queue.png', fullPage: true })
  await page.getByRole('button', { name: /Есть история/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(tip).toHaveCount(0)
})

test('старое сохранение не показывает вступление, новая игра показывает его снова', async ({ page }) => {
  const game = createInitialGameState()
  const events = createEventSession()
  await page.addInitScript(({ game, events }) => { if (!localStorage.getItem('masha-ne-gori.save')) localStorage.setItem('masha-ne-gori.save', JSON.stringify({ version: 23, game, events })) }, { game, events })
  await page.goto('/')
  await expect(page.getByRole('complementary', { name: 'Знакомьтесь: Маша' })).toHaveCount(0)
  await page.evaluate(key => localStorage.setItem(key, '{'), SAVE_KEY)
  await page.reload()
  await page.getByRole('button', { name: 'Начать новую игру' }).click()
  await expect(page.getByRole('complementary', { name: 'Знакомьтесь: Маша' })).toBeVisible()
})
