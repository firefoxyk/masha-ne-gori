import { expect, test } from '@playwright/test'

test('стартовая страница показывает название и статус разработки', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Маша, не гори' })).toBeVisible()
  await expect(page.getByText('Игра находится в разработке.')).toBeVisible()
})
