import { expect, test } from './fixtures.ts'
import { SAVE_KEY } from '../../src/storage/gameStorage.ts'

test('мгновенная перезагрузка в момент нажатия работы', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).not.toBeNull()
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes('Поработать'))!
    button.click()
    location.reload()
  })])
  await expect(page.getByRole('progressbar', { name: 'Энергия' })).toHaveAttribute('value', '65')
})
